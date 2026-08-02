/**
 * Honest versioning gate — Covenant 8.
 *
 * The title screen has said "Alpha · v0.1" since it was created, and three
 * hand-typed mirrors (index.html masthead, index.html build tag, package.json)
 * drifted apart while README.md's status heading insisted "v0.0.x — not v0.1".
 * Nothing checked, so nothing agreed.
 *
 * The label itself turned out to be EARNED: docs/ROADMAP.md records
 * "Phase 7 — v0.1 label (DONE 2026-07-22)" with an AC1–AC5 evidence bundle in
 * docs/V0.1-EVIDENCE.md, explicitly satisfying Covenant 8. The stale artifacts
 * were the README heading and the roadmap's own summary line, both of which
 * predated the phase they described. Worth recording, because the first pass at
 * this gate read those stale lines, concluded the version was a lie, and was
 * about to DEMOTE a number the project had legitimately earned.
 *
 * Two rules:
 *
 *   1. No version string may be hand-typed into HTML. package.json is the
 *      source; Vite injects it. A number in markup is a number that will drift.
 *   2. A minor version must be earned by a phase the roadmap records as DONE:
 *      v0.1 by Phase 7, v0.2 by Phase 8, and so on. Patch increments are free —
 *      they track shipped systems inside the current label.
 *
 * Run: npm run check:version   (part of `npm run harness`)
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fail = [];

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const version = pkg.version;

// --- 1. No hand-typed versions in markup ---
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const stray = [...html.matchAll(/v\d+\.\d+(\.\d+)?/g)].map(m => m[0]);
if (stray.length) {
  fail.push(
    `index.html hand-types ${stray.length} version string(s): ${[...new Set(stray)].join(', ')}. ` +
      `Use the injected value (src/ui/version.ts) — markup that states a version will drift from package.json.`
  );
}

// --- 2. The minor version must be earned by a completed phase ---
//
// v0.1 is earned by Phase 7, v0.2 by Phase 8, v0.N by Phase N+6. The roadmap has
// to actually record that phase DONE before the number may claim it.
const [major, minor] = version.split('.').map(Number);
if (major === 0 && minor >= 1) {
  const roadmap = readFileSync(join(ROOT, 'docs', 'ROADMAP.md'), 'utf8');
  const done = new Set();
  for (const m of roadmap.matchAll(/Phase\s+(\d+)[^\n]*?\bDONE\b/gi)) done.add(Number(m[1]));
  for (const m of roadmap.matchAll(/Phases?\s+(\d+)\s*[–-]\s*(\d+)\s+done/gi)) {
    for (let i = Number(m[1]); i <= Number(m[2]); i++) done.add(i);
  }
  const required = minor + 6;
  if (!done.has(required)) {
    fail.push(
      `version claims v0.${minor}, which is earned by Phase ${required}, and docs/ROADMAP.md ` +
        `does not record Phase ${required} as DONE (phases evidenced: ${[...done].sort((a, b) => a - b).join(', ') || 'none'}). ` +
        `Covenant 8: no marketing labels without evidence. Ship the phase and record it, then claim the number.`
    );
  }
}

if (fail.length) {
  console.error('check:version FAILED');
  for (const f of fail) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `check:version OK — v${version}, no hand-typed versions in markup, number matches roadmap evidence.`
);
