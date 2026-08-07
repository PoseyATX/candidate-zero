#!/usr/bin/env node
/**
 * detect.mjs — project sniffer for the run-app skill.
 *
 * Prints a RUN PLAN for whatever project it is pointed at: kind, install/build/
 * test commands, how to launch, and (for web) the URL the driver should open.
 * Every line carries its evidence (`package.json:scripts.dev`), because a plan
 * you cannot audit is just a guess with formatting.
 *
 * This is a heuristic reporter, not an oracle. It never runs anything. When it
 * cannot tell, it says so rather than inventing a command.
 *
 *   node .claude/skills/run-app/detect.mjs [dir]
 *   node .claude/skills/run-app/detect.mjs --json [dir]
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const DIR = resolve(argv.find((a) => !a.startsWith('--')) ?? '.');

const read = (f) => {
  try {
    return readFileSync(join(DIR, f), 'utf8');
  } catch {
    return null;
  }
};
const has = (f) => existsSync(join(DIR, f));

const ev = []; // evidence lines: [claim, source]
const note = (claim, source) => ev.push({ claim, source });

const plan = {
  dir: DIR,
  name: basename(DIR),
  kind: 'unknown',
  runtime: null,
  install: null,
  build: null,
  test: null,
  run: null, // the human/foreground launch
  serve: null, // command the driver can background for a web app
  url: null,
  driver: null, // which harness shape applies
  warnings: []
};

/* ---------------------------------------------------------------- node ---- */

const pkgRaw = read('package.json');
if (pkgRaw) {
  let pkg = {};
  try {
    pkg = JSON.parse(pkgRaw);
  } catch {
    plan.warnings.push('package.json is present but not valid JSON');
  }
  const scripts = pkg.scripts ?? {};
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const dep = (n) => Object.prototype.hasOwnProperty.call(deps, n);
  const script = (n) => (scripts[n] ? n : null);

  plan.runtime = 'node';
  plan.name = pkg.name ?? plan.name;
  // Lockfile picks the package manager — running npm in a pnpm repo half-works
  // and then fails somewhere confusing.
  plan.install = has('pnpm-lock.yaml')
    ? 'pnpm install'
    : has('yarn.lock')
      ? 'yarn install'
      : has('bun.lockb')
        ? 'bun install'
        : 'npm install';
  note(`package manager from lockfile → ${plan.install}`, 'lockfile');

  const runner = plan.install.split(' ')[0];
  const npmRun = (s) => `${runner} run ${s}`;

  if (script('build')) plan.build = npmRun('build');
  if (script('test')) plan.test = npmRun('test');

  // Test command is often not called "test" — take the first thing that smells
  // like the project's own suite before declaring there isn't one.
  if (!plan.test) {
    const alt = ['harness', 'check', 'lint', 'typecheck', 'ci'].find(script);
    if (alt) {
      plan.test = npmRun(alt);
      note(`no "test" script; using "${alt}"`, `package.json:scripts.${alt}`);
    }
  }

  if (dep('electron') || dep('electron-forge') || dep('@electron-forge/cli')) {
    plan.kind = 'desktop-electron';
    plan.driver = 'electron-repl';
    plan.run = script('start') ? npmRun('start') : 'npx electron .';
    note('electron dependency', 'package.json:devDependencies.electron');
    plan.warnings.push(
      'Headless container: launch under xvfb-run, and drive with Playwright _electron, not this skill\'s web driver.'
    );
  } else if (dep('next')) {
    plan.kind = 'web';
    plan.driver = 'browser';
    plan.run = script('dev') ? npmRun('dev') : 'npx next dev';
    plan.serve = plan.run;
    plan.url = 'http://localhost:3000/';
    note('next dependency', 'package.json:dependencies.next');
  } else if (dep('vite')) {
    plan.kind = 'web';
    plan.driver = 'browser';
    plan.run = script('dev') ? npmRun('dev') : 'npx vite';
    // preview serves the built app: closer to what users get, and it does not
    // rebuild under you mid-session the way dev does.
    plan.serve = script('preview') ? npmRun('preview') : plan.run;
    const cfg = read('vite.config.ts') ?? read('vite.config.js') ?? read('vite.config.mjs') ?? '';
    // `server.port` configures dev ONLY. `vite preview` ignores it and serves on
    // 4173 unless a separate `preview.port` is set — reading the first port: in
    // the file sends you to a dead URL whenever the two differ.
    const previewing = plan.serve.includes('preview');
    const devPort = /server:\s*{[^}]*port:\s*(\d+)/s.exec(cfg)?.[1] ?? '5173';
    const previewPort = /preview:\s*{[^}]*port:\s*(\d+)/s.exec(cfg)?.[1] ?? '4173';
    const port = previewing ? previewPort : devPort;
    // `base` is the trap: with a base set, the server root 404s and only
    // <root><base> renders. Every "blank page" report starts here.
    const base = /base:\s*['"]([^'"]+)['"]/.exec(cfg)?.[1] ?? '/';
    plan.url = `http://localhost:${port}${base.endsWith('/') ? base : base + '/'}`;
    note(`vite dependency; port ${port}, base ${base}`, 'vite.config.*');
    if (base !== '/') {
      plan.warnings.push(
        `vite base is "${base}" — the bare server root will 404. Open ${plan.url}, not localhost:${port}/.`
      );
    }
  } else if (['express', 'fastify', 'koa', '@nestjs/core', 'hapi', 'hono'].some(dep)) {
    plan.kind = 'server';
    plan.driver = 'curl';
    plan.run = script('start') ?? script('dev') ? npmRun(script('start') ?? script('dev')) : null;
    plan.serve = plan.run;
    plan.url = 'http://localhost:3000/';
    note('http server framework in dependencies', 'package.json:dependencies');
    plan.warnings.push('Port is a guess — confirm it from the listen() call or startup log.');
  } else if (pkg.bin) {
    plan.kind = 'cli';
    plan.driver = 'stdio';
    const binName = typeof pkg.bin === 'string' ? pkg.name : Object.keys(pkg.bin)[0];
    plan.run = `npx ${binName} --help`;
    note(`bin entry "${binName}"`, 'package.json:bin');
  } else if (script('dev') || script('start')) {
    plan.kind = 'web';
    plan.driver = 'browser';
    plan.run = npmRun(script('dev') ?? script('start'));
    plan.serve = plan.run;
    note('dev/start script with no framework marker — assuming a served app', 'package.json:scripts');
    plan.warnings.push('Framework not identified; confirm the URL from the dev server banner.');
  } else {
    plan.kind = 'library';
    plan.driver = 'import';
    note('no bin, no server, no dev script', 'package.json');
  }

  // A CLI script beats a bare bin guess for "how do I actually poke this".
  for (const s of ['play', 'cli', 'repl', 'console']) {
    if (script(s)) {
      note(`interactive entry point: ${npmRun(s)}`, `package.json:scripts.${s}`);
      break;
    }
  }
}

/* -------------------------------------------------------------- python ---- */

const pyproject = read('pyproject.toml');
if (!pkgRaw && (pyproject || has('requirements.txt') || has('setup.py'))) {
  plan.runtime = 'python';
  plan.install = has('uv.lock')
    ? 'uv sync'
    : has('poetry.lock')
      ? 'poetry install'
      : 'pip install -e .';
  note(`python project → ${plan.install}`, pyproject ? 'pyproject.toml' : 'requirements.txt');
  plan.test = 'pytest';
  const blob = (pyproject ?? '') + (read('requirements.txt') ?? '');
  if (/fastapi|uvicorn/i.test(blob)) {
    plan.kind = 'server';
    plan.driver = 'curl';
    plan.run = 'uvicorn app.main:app --reload';
    plan.serve = plan.run;
    plan.url = 'http://localhost:8000/';
    plan.warnings.push('uvicorn target module is a guess — read it from the project README or Procfile.');
  } else if (/django/i.test(blob)) {
    plan.kind = 'server';
    plan.driver = 'curl';
    plan.run = 'python manage.py runserver';
    plan.serve = plan.run;
    plan.url = 'http://localhost:8000/';
  } else if (/flask/i.test(blob)) {
    plan.kind = 'server';
    plan.driver = 'curl';
    plan.run = 'flask run';
    plan.serve = plan.run;
    plan.url = 'http://localhost:5000/';
  } else if (/click|typer|argparse/i.test(blob)) {
    plan.kind = 'cli';
    plan.driver = 'stdio';
  } else {
    plan.kind = 'library';
    plan.driver = 'import';
  }
}

/* ------------------------------------------------------------ go / rust ---- */

if (!pkgRaw && !plan.runtime && has('go.mod')) {
  plan.runtime = 'go';
  plan.install = 'go mod download';
  plan.build = 'go build ./...';
  plan.test = 'go test ./...';
  plan.run = 'go run .';
  const mains = safeLs('cmd');
  plan.kind = /net\/http|gin-gonic|echo|chi/.test(read('go.mod') ?? '') ? 'server' : 'cli';
  plan.driver = plan.kind === 'server' ? 'curl' : 'stdio';
  if (plan.kind === 'server') {
    plan.serve = plan.run;
    plan.url = 'http://localhost:8080/';
    plan.warnings.push('Port 8080 is the Go convention, not a fact — confirm it from the ListenAndServe call.');
  }
  note(mains.length ? `binaries under cmd/: ${mains.join(', ')}` : 'single module', 'go.mod');
}

if (!pkgRaw && !plan.runtime && has('Cargo.toml')) {
  plan.runtime = 'rust';
  plan.install = 'cargo fetch';
  plan.build = 'cargo build';
  plan.test = 'cargo test';
  plan.run = 'cargo run';
  const cargo = read('Cargo.toml') ?? '';
  plan.kind = /axum|actix|rocket|warp|hyper/.test(cargo) ? 'server' : has('src/main.rs') ? 'cli' : 'library';
  plan.driver = plan.kind === 'server' ? 'curl' : plan.kind === 'cli' ? 'stdio' : 'import';
  if (plan.kind === 'server') {
    plan.serve = `${plan.run} --release`;
    plan.url = 'http://localhost:3000/';
    plan.warnings.push('Port is a guess — confirm it from the bind/listen address in main.rs.');
  }
  note(`Cargo.toml → ${plan.kind}`, 'Cargo.toml');
}

/* ------------------------------------------------------------ extra hints -- */

if (has('Makefile')) {
  const targets = [...(read('Makefile') ?? '').matchAll(/^([a-zA-Z][\w-]*):/gm)].map((m) => m[1]);
  if (targets.length) note(`make targets: ${targets.slice(0, 10).join(', ')}`, 'Makefile');
}
if (has('Dockerfile')) {
  const port = /EXPOSE\s+(\d+)/.exec(read('Dockerfile') ?? '')?.[1];
  if (port) note(`Dockerfile EXPOSE ${port}`, 'Dockerfile');
}
// CI is usually the most honest description of how the project really builds.
for (const wf of safeLs('.github/workflows')) note(`CI workflow: ${wf}`, '.github/workflows');

function safeLs(d) {
  try {
    return readdirSync(join(DIR, d));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ out ---- */

if (asJson) {
  console.log(JSON.stringify({ ...plan, evidence: ev }, null, 2));
} else {
  const row = (k, v) => v && console.log(`  ${k.padEnd(9)} ${v}`);
  console.log(`\nRUN PLAN — ${plan.name}  (${plan.kind}, ${plan.runtime ?? 'runtime unknown'})\n`);
  row('install', plan.install);
  row('build', plan.build);
  row('test', plan.test);
  row('run', plan.run);
  row('serve', plan.serve);
  row('url', plan.url);
  console.log(`\n  driver    ${plan.driver ?? 'none'}`);
  if (plan.driver === 'browser') {
    console.log(
      `            node .claude/skills/run-app/driver.mjs --serve ${JSON.stringify(plan.serve)} --url ${plan.url}`
    );
  }
  console.log('\nEvidence');
  ev.forEach((e) => console.log(`  · ${e.claim}   [${e.source}]`));
  if (plan.warnings.length) {
    console.log('\nWarnings');
    plan.warnings.forEach((w) => console.log(`  ! ${w}`));
  }
  console.log('');
}
