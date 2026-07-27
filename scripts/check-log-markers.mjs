#!/usr/bin/env node
/**
 * CANDIDATE ZERO — log-marker drift gate
 *
 * Several harnesses assert on marker strings inside player-facing log/feedback
 * copy, e.g.  assert(s.log.some(l => l.text.includes('ORBIT OPEN')))
 *
 * Nothing outside the harnesses parses those markers, so they are display copy.
 * That means a perfectly reasonable copy edit silently breaks a harness — which
 * is exactly what happened in 7f05cb9: the engine's "WAITING ORBIT —" prefix was
 * rewritten as prose, chronicle-waiting.ts still asserted the old marker, and CI
 * went red for weeks with a cryptic 'FAIL: waiting orbit log'.
 *
 * This gate scans the harnesses for those assertions and checks each marker still
 * exists somewhere in non-harness src/. If you intentionally reword copy, this
 * fails immediately and tells you which harness to update — instead of a cryptic
 * assertion failure buried in a 31-step chain.
 *
 * Run: npm run check:log-markers
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const HARNESS = join(SRC, 'harness');

/** Matches .text.includes('X') / .milestone?.includes('X') / .beat.includes('X') */
const ASSERT_RE =
  /\b(?:text|milestone|beat|summary)\s*\??\.\s*includes\(\s*(['"`])([^'"`]{3,})\1\s*\)/g;

/** Markers that are plain prose fragments, not shouty protocol-ish markers, are
 *  still worth checking — but skip anything too generic to be meaningful. */
const MIN_LEN = 3;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

const harnessFiles = walk(HARNESS);
const sourceFiles = walk(SRC).filter(f => !f.startsWith(HARNESS));
const sourceBlob = sourceFiles.map(f => readFileSync(f, 'utf8')).join('\n');

/** Shortest prefix we'll accept as evidence of a template-built marker. */
const MIN_DYNAMIC_PREFIX = 5;

/**
 * True if the marker is present in source, either verbatim or assembled by a
 * template literal. `summary.includes('stage=primary')` is satisfied by
 * `` `stage=${s.stage}` `` in src/lib/anvil-port/observe.ts — the literal
 * "stage=primary" never appears, but the marker is not stale.
 */
function markerExistsInSource(marker) {
  if (sourceBlob.includes(marker)) return true;
  for (let i = marker.length - 1; i >= MIN_DYNAMIC_PREFIX; i--) {
    if (sourceBlob.includes(marker.slice(0, i) + '${')) return true;
  }
  return false;
}

const failures = [];
let checked = 0;

for (const file of harnessFiles) {
  const body = readFileSync(file, 'utf8');
  const lines = body.split('\n');
  for (const [i, line] of lines.entries()) {
    // Skip commented-out lines
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    ASSERT_RE.lastIndex = 0;
    let m;
    while ((m = ASSERT_RE.exec(line)) !== null) {
      const marker = m[2];
      if (marker.length < MIN_LEN) continue;
      checked++;
      if (!markerExistsInSource(marker)) {
        failures.push({
          file: relative(ROOT, file),
          line: i + 1,
          marker
        });
      }
    }
  }
}

if (failures.length) {
  console.error('check:log-markers FAILED — harness asserts copy that no longer exists in src/:\n');
  for (const f of failures) {
    console.error(`  ${f.file}:${f.line}`);
    console.error(`    asserts marker: ${JSON.stringify(f.marker)}`);
    console.error(`    but that string appears nowhere outside src/harness.\n`);
  }
  console.error(
    'Either the copy was reworded (update the harness, or assert a structural\n' +
      'signal like a sessionFlag / log kind instead), or the behaviour regressed.\n'
  );
  process.exit(1);
}

console.log(
  `check:log-markers OK — ${checked} copy marker(s) asserted by harnesses all present in src/`
);
process.exit(0);
