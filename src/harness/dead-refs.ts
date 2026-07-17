/**
 * Dead-reference scan: ids read via warm/hasRep/assets/backers that are never granted.
 * Run: npm run harness:dead-refs
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'src');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) out.push(...walk(p));
    else if (name.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
const corpus = files.map(f => readFileSync(f, 'utf8')).join('\n');

const refPatterns: { kind: string; re: RegExp }[] = [
  { kind: 'ally', re: /warm\s*\(\s*s(?:tate)?\s*,\s*['"]([A-Z0-9_]+)['"]/g },
  { kind: 'rep', re: /hasRep\s*\(\s*s(?:tate)?\s*,\s*['"]([A-Z0-9_]+)['"]/g },
  { kind: 'asset', re: /(?:assets|s\.assets)\.includes\s*\(\s*['"]([A-Z0-9_]+)['"]/g },
  { kind: 'backer', re: /(?:backers|s\.backers)\.includes\s*\(\s*['"]([A-Z0-9_]+)['"]/g }
];

const grantPatterns: { kind: string; re: RegExp }[] = [
  { kind: 'ally', re: /addAlly\s*\(\s*s(?:tate)?\s*,\s*['"]([A-Z0-9_]+)['"]/g },
  { kind: 'rep', re: /addRep\s*\(\s*s(?:tate)?\s*,\s*['"]([A-Z0-9_]+)['"]/g },
  { kind: 'asset', re: /assets\.push\s*\(\s*['"]([A-Z0-9_]+)['"]/g },
  { kind: 'backer', re: /backers\.push\s*\(\s*['"]([A-Z0-9_]+)['"]/g }
];

function collect(re: RegExp, text: string): Set<string> {
  const s = new Set<string>();
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  while ((m = r.exec(text))) s.add(m[1]!);
  return s;
}

console.log('=== CANDIDATE ZERO — Dead Reference Scan ===\n');

let deadCount = 0;
const report: string[] = [];

for (const { kind, re } of refPatterns) {
  const refs = collect(re, corpus);
  const grantRe = grantPatterns.find(g => g.kind === kind)!.re;
  const grants = collect(grantRe, corpus);
  // Also count string literal grants in reputation / setup
  for (const id of refs) {
    if (grants.has(id)) continue;
    // soft: BIO_ / ISSUE_ / REGION_ setup tags are granted via concatenation
    if (id.startsWith('BIO_') || id.startsWith('ISSUE_') || id.startsWith('REGION_')) continue;
    deadCount++;
    report.push(`DEAD ${kind}: ${id} (referenced, never granted via add*/push)`);
  }
}

if (report.length) {
  for (const line of report) console.log(line);
  console.log(`\n${deadCount} dead reference(s). Not a hard fail yet — track in ROADMAP.`);
} else {
  console.log('PASSED: no dead ally/rep/asset/backer references detected.');
}

// Reachability smoke: every PL* card playable in some synthetic state
import { ALL_PLAYS } from '../data/plays.js';
import { createNewState } from '../engine/state.js';
import { isPlayable } from '../engine/play.js';
import { applySetup, HARNESS_DEFAULT_SETUP } from '../data/setup.js';
import { addAlly } from '../engine/reputation.js';

function baseState(): ReturnType<typeof createNewState> {
  const s = createNewState({ seed: 1, ap: 99, money: 99999, volPool: 99, momentum: 99, favors: 99 });
  applySetup(s, HARNESS_DEFAULT_SETUP);
  return s;
}

const unreachable: string[] = [];
for (const card of ALL_PLAYS) {
  let ok = false;
  // Matrix: early (no unlocks), mid (club list, oppo), general, field-ally present
  const probes = [
    () => {
      const s = baseState();
      s.stage = 'primary';
      s.ballot = false;
      s.week = 1;
      s.messageSharp = false; // PL18 show
      return s;
    },
    () => {
      const s = baseState();
      s.stage = 'primary';
      s.ballot = true;
      s.week = 5;
      if (!s.backers.includes('B06')) s.backers.push('B06');
      s.oppoFile = true;
      s.messageSharp = false;
      return s;
    },
    () => {
      const s = baseState();
      s.stage = 'general';
      s.ballot = true;
      s.week = 10;
      s.primaryWon = true;
      s.fieldAp = 1;
      // no AL09 — PL21B/PL39 show/req want !warm AL09
      return s;
    },
    () => {
      const s = baseState();
      s.stage = 'general';
      s.ballot = true;
      s.week = 12;
      s.tier = 2;
      addAlly(s, 'AL01', 2);
      addAlly(s, 'AL09', 2);
      s.fieldAp = 1;
      s.oppoFile = true;
      s.messageSharp = true;
      return s;
    }
  ];
  for (const make of probes) {
    if (isPlayable(make(), card)) {
      ok = true;
      break;
    }
  }
  if (!ok) unreachable.push(card.id);
}

if (unreachable.length) {
  console.log('\nUNREACHABLE (no probe state made playable):');
  for (const id of unreachable) console.log('  ', id);
  // Soft report — PL20 etc. may need obligations
  console.log(`\n${unreachable.length} card(s) need show/req review.`);
} else {
  console.log('PASSED: every catalog card is playable in at least one probe state.');
}

console.log('\nDead-ref / reachability scan complete.');
// Soft exit 0 — informational until ROADMAP promotes to hard fail
