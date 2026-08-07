#!/usr/bin/env node
/**
 * driver.mjs — project-agnostic browser driver for the run-app skill.
 *
 * A stdin REPL that owns a real headless Chromium on a real running app, so an
 * agent can reach into it: click things, read the DOM, evaluate JS, screenshot.
 * Works on any web app — it knows nothing about the project, you supply the
 * serve command and URL (ask detect.mjs for both).
 *
 *   node driver.mjs --serve "npm run preview" --url http://localhost:4173/
 *   node driver.mjs --url http://localhost:3000/        # server already up
 *
 *   Pipe:  printf 'boot\nss home\nquit\n' | node driver.mjs --url ...
 *   REPL:  run it under tmux and send-keys for interactive poking.
 *
 * Every command prints exactly one `ok <cmd> …` or `err <cmd> …` line, so a
 * caller can `grep '^err'` to detect failure without parsing prose.
 *
 * Requires playwright resolvable from the target project (or globally):
 *   npm i -D playwright   # browsers are usually already on the image
 */

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

/* ----------------------------------------------------------------- args ---- */

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const URL_ = arg('url', process.env.APP_URL ?? 'http://localhost:3000/');
const SERVE = arg('serve', process.env.APP_SERVE ?? null);
const CWD = resolve(arg('cwd', process.cwd()));
const SHOTS = resolve(arg('shots', process.env.APP_SHOTS ?? join(CWD, '.run-shots')));
const [VW, VH] = (arg('viewport', '1280x800').split('x').map(Number));
const TOUCH = argv.includes('--touch');

// playwright is a dependency of the TARGET project far more often than of this
// skill, so resolve it from there first and fall back to our own tree.
const require_ = createRequire(join(CWD, 'noop.js'));
let chromium;
try {
  ({ chromium } = require_('playwright'));
} catch {
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.log('err boot playwright not installed — run: npm i -D playwright');
    process.exit(1);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = (...a) => console.log(a.join(' '));

let server = null;
let browser = null;
let page = null;
const pageErrors = [];

async function waitForServer(url, tries = 120) {
  for (let i = 0; i < tries; i++) {
    try {
      // Any response means something is listening; a 404 on the root is normal
      // for apps served under a base path.
      await fetch(url);
      return true;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  return false;
}

async function boot(target = URL_) {
  if (SERVE && !server) {
    server = spawn(SERVE, { cwd: CWD, shell: true, stdio: 'ignore', detached: false });
    if (!(await waitForServer(target))) throw new Error(`nothing listening at ${target} after 30s`);
  }
  browser = await chromium.launch();
  page = await browser.newPage({
    viewport: { width: VW, height: VH },
    hasTouch: TOUCH,
    isMobile: TOUCH
  });
  // 8s, not Playwright's 30s: when an overlay is eating clicks you want to know
  // in seconds, not after a half-minute stall on every command.
  page.setDefaultTimeout(8000);
  page.on('pageerror', (e) => pageErrors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|ERR_CONNECTION/.test(m.text())) {
      pageErrors.push(`console.error: ${m.text()}`);
    }
  });
  // Navigation gets its own generous budget — first load may compile the app.
  await page.goto(target, { waitUntil: 'networkidle', timeout: 60_000 });
  out('ok boot', target, `title=${JSON.stringify(await page.title())}`);
}

function needPage() {
  if (!page) throw new Error('not booted — run `boot` first');
  return page;
}

/**
 * Rect-based visibility, NOT offsetParent. offsetParent is null for every
 * position:fixed element, so the obvious probe reports modals, drawers and
 * fixed app shells as hidden while they are plainly on screen.
 */
const VISIBLE_FN = `(el) => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const s = getComputedStyle(el);
  return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
}`;

/**
 * What is covering the page. THE debugging command: when a click times out it
 * is almost always a full-screen overlay (result splash, modal, cookie banner,
 * dev-error frame) sitting on top, and nothing else tells you that.
 */
async function overlays() {
  const found = await needPage().evaluate(`(() => {
    const visible = ${VISIBLE_FN};
    return [...document.querySelectorAll('body *')]
      .filter((el) => {
        const s = getComputedStyle(el);
        if (s.position !== 'fixed' && s.position !== 'sticky') return false;
        const r = el.getBoundingClientRect();
        return visible(el) && r.width * r.height > window.innerWidth * window.innerHeight * 0.25;
      })
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        cls: (el.className && String(el.className).split(/\s+/)[0]) || null,
        z: Number(getComputedStyle(el).zIndex) || 0,
        buttons: [...el.querySelectorAll('button, [role=button], a')]
          .filter(visible)
          .slice(0, 6)
          // Labels are wrapped markup — collapse to one line or the report is
          // unreadable for anything content-heavy.
          .map((b) => (b.id ? '#' + b.id : (b.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 24)))
      }))
      // Highest z first: the thing actually eating your clicks is line one.
      .sort((a, b) => b.z - a.z);
  })()`);
  out(`ok overlays ${found.length}`);
  found.forEach((o) =>
    out(`    ${o.tag}${o.id ? '#' + o.id : ''}${o.cls ? '.' + o.cls : ''} z=${o.z} dismiss→ ${o.buttons.join(' | ') || '(no visible button)'}`)
  );
}

/**
 * Click the first visible match of any of the given selectors, repeatedly,
 * until none are left. This is how you clear a QUEUE of overlays — apps stack
 * them (splash → toast → modal) and one click only gets you the top one.
 *
 * The grace wait matters: overlays are frequently painted a beat AFTER the
 * action that triggers them (a result stamp that waits for a sheet to close).
 * Without it the surface looks clear, you move on, and the NEXT command is the
 * one that eats the overlay and times out somewhere confusing.
 */
async function dismiss(sels, waitMs = 2000, rounds = 8) {
  const p = needPage();

  // Find in-page, but CLICK through Playwright. In-page `el.click()` dispatches
  // a bare `click` event and no pointer events at all — so an overlay whose
  // dismissal is bound to `pointerdown` (standard for mobile-first UIs, which
  // want the response to feel instant) ignores it forever. That failure is
  // silent and looks exactly like "the button doesn't work".
  //
  // force:true skips actionability checks: these overlays animate out with
  // pointer-events:none, and a stability check on a fading element just stalls.
  const tryClick = async () => {
    const sel = await p.evaluate(
      `((sels) => {
        const visible = ${VISIBLE_FN};
        for (const s of sels) if (visible(document.querySelector(s))) return s;
        return null;
      })(${JSON.stringify(sels)})`
    );
    if (!sel) return null;
    try {
      await p.locator(sel).first().click({ force: true, timeout: 2000 });
    } catch {
      return null;
    }
    return sel;
  };

  const isVisible = (sel) =>
    p.evaluate(`((s) => (${VISIBLE_FN})(document.querySelector(s)))(${JSON.stringify(sel)})`);

  // Wait for a dismissed overlay to actually LEAVE before looking again.
  // Overlays fade out over a couple hundred ms, and during the fade they are
  // still on screen but already pointer-events:none — so a second click "on the
  // overlay" falls straight through and hits whatever is underneath. That is
  // how a dismiss loop ends up opening a random card it was never asked to.
  const waitGone = async (sel, ms = 1500) => {
    const dl = Date.now() + ms;
    while (Date.now() < dl) {
      if (!(await isVisible(sel))) return true;
      await p.waitForTimeout(100);
    }
    return false;
  };

  // Poll for the FIRST overlay rather than sampling once. A fixed grace is a
  // guess about animation timing and it loses: splashes land several hundred ms
  // after the click that caused them, and a short peek reports "all clear"
  // while the overlay is still on its way in.
  let cleared = 0;
  const deadline = Date.now() + Number(waitMs);
  let sel = null;
  while (Date.now() < deadline && !(sel = await tryClick())) {
    await p.waitForTimeout(150);
  }

  // Drain the queue — apps stack them (splash → toast → modal) and one click
  // only gets you the top one. Stop the moment something refuses to go away,
  // rather than hammering a stuck overlay `rounds` times.
  while (sel && cleared < rounds) {
    cleared++;
    if (!(await waitGone(sel))) break;
    await p.waitForTimeout(150); // let the next one paint
    sel = await tryClick();
  }
  return cleared;
}

async function ss(name = `shot-${Date.now()}`, full = false) {
  mkdirSync(SHOTS, { recursive: true });
  const file = join(SHOTS, `${name.replace(/[^\w.-]/g, '_')}.png`);
  await needPage().screenshot({ path: file, fullPage: full });
  out('ok ss', file);
}

/** Landmark dump: the fastest way to learn an unfamiliar app's DOM handles. */
async function map() {
  const m = await needPage().evaluate(`(() => {
    const visible = ${VISIBLE_FN};
    const pick = (sel, n) => [...document.querySelectorAll(sel)].filter(visible).slice(0, n);
    return {
      headings: pick('h1,h2', 8).map((e) => e.innerText.trim().slice(0, 60)),
      buttons: pick('button,[role=button],input[type=submit]', 20).map(
        (e) => (e.id ? '#' + e.id : '') + ' ' + (e.innerText || e.value || '').trim().slice(0, 32)
      ),
      inputs: pick('input,select,textarea', 12).map(
        (e) => (e.id ? '#' + e.id : e.name ? '[name=' + e.name + ']' : e.tagName.toLowerCase()) + ':' + (e.type || '')
      ),
      links: pick('a[href]', 10).map((e) => (e.innerText || '').trim().slice(0, 28) + ' → ' + e.getAttribute('href'))
    };
  })()`);
  out('ok map');
  for (const [k, v] of Object.entries(m)) {
    if (!v.length) continue;
    out(`    ${k}:`);
    v.forEach((x) => out(`      ${String(x).trim()}`));
  }
}

const COMMANDS = {
  boot: (a) => boot(a[0] ?? URL_),
  goto: async (a) => {
    await needPage().goto(a[0], { waitUntil: 'networkidle', timeout: 60_000 });
    out('ok goto', a[0]);
  },
  ss: (a) => ss(a[0], a[1] === 'full'),
  map: () => map(),
  overlays: () => overlays(),
  // `dismiss [waitMs] <sel...>` — a leading number overrides the 2s budget it
  // spends waiting for a late-painting overlay to show up.
  dismiss: async (a) => {
    const waitMs = /^\d+$/.test(a[0] ?? '') ? Number(a.shift()) : 2000;
    const sels = a.length ? a : ['[aria-label=close]', '.modal-close', '[data-dismiss]'];
    out('ok dismiss cleared=' + (await dismiss(sels, waitMs)));
  },
  click: async (a) => {
    const sel = a.join(' ');
    await needPage().locator(sel).first().click();
    await needPage().waitForTimeout(120);
    out('ok click', sel);
  },
  // Text-targeted click, for apps whose buttons have no stable ids.
  clicktext: async (a) => {
    const t = a.join(' ');
    await needPage().getByText(t, { exact: false }).first().click();
    await needPage().waitForTimeout(120);
    out('ok clicktext', JSON.stringify(t));
  },
  fill: async (a) => {
    const [sel, ...rest] = a;
    await needPage().locator(sel).first().fill(rest.join(' '));
    out('ok fill', sel);
  },
  text: async (a) => {
    const sel = a.join(' ');
    const t = await needPage().locator(sel).first().innerText();
    out('ok text', sel, JSON.stringify(t.replace(/\s+/g, ' ').trim().slice(0, 500)));
  },
  count: async (a) => {
    const sel = a.join(' ');
    out('ok count', sel, await needPage().locator(sel).count());
  },
  visible: async (a) => {
    const sel = a.join(' ');
    const v = await needPage().evaluate(
      `((s) => (${VISIBLE_FN})(document.querySelector(s)))(${JSON.stringify(sel)})`
    );
    out('ok visible', sel, v);
  },
  wait: async (a) => {
    await needPage().locator(a.join(' ')).first().waitFor({ state: 'visible' });
    out('ok wait', a.join(' '));
  },
  waitms: async (a) => {
    await needPage().waitForTimeout(Number(a[0] ?? 500));
    out('ok waitms', a[0] ?? 500);
  },
  eval: async (a) => {
    const v = await needPage().evaluate(`(() => (${a.join(' ')}))()`);
    out('ok eval', JSON.stringify(v ?? null));
  },
  reload: async () => {
    await needPage().reload({ waitUntil: 'networkidle', timeout: 60_000 });
    out('ok reload');
  },
  // Wipe client state — the usual reason an app resumes a stale session instead
  // of showing you a first-run flow.
  reset: async () => {
    await needPage().evaluate('localStorage.clear(); sessionStorage.clear()');
    await needPage().reload({ waitUntil: 'networkidle', timeout: 60_000 });
    out('ok reset');
  },
  errors: async () => {
    out(`ok errors ${pageErrors.length}`);
    pageErrors.forEach((e) => out('   ', e));
  },
  url: async () => out('ok url', needPage().url())
};

async function shutdown(code = 0) {
  try {
    await browser?.close();
  } catch {
    /* already gone */
  }
  server?.kill();
  process.exit(code);
}

const rl = createInterface({ input: process.stdin, terminal: false });
// Serialize: piped stdin delivers every line at once, and two concurrent
// Playwright actions on one page interleave into nonsense.
let queue = Promise.resolve();

rl.on('line', (line) => {
  const raw = line.trim();
  if (!raw || raw.startsWith('#')) return;
  const [cmd, ...args] = raw.split(/\s+/);
  queue = queue.then(async () => {
    if (cmd === 'quit' || cmd === 'exit') return shutdown(0);
    const fn = COMMANDS[cmd];
    if (!fn) return out('err unknown-command', cmd, '— try:', Object.keys(COMMANDS).join(' '));
    try {
      await fn(args);
    } catch (e) {
      out('err', cmd, String(e.message ?? e).split('\n')[0]);
    }
  });
});

rl.on('close', () => queue.then(() => shutdown(0)));
