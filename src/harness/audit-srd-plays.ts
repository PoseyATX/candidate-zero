/**
 * Formal §10 play audit table — every catalog card must have
 * id, name, cost, risk, phases, attr tag(s), and odds/run hooks where required.
 * Run: npm run harness:audit
 */

import { ALL_PLAYS, PLAY_COUNT } from '../data/plays.js';
import type { AttrId, PlayCard, RiskClass } from '../engine/types.js';

const ATTRS = new Set<AttrId>(['CLO', 'CON', 'CRA', 'INK', 'DIP', 'CHA']);
const RISKS = new Set<RiskClass>(['SAFE', 'STD', 'VOL', 'CHOICE']);

interface Row {
  id: string;
  n: string;
  risk: string;
  ph: string;
  attrs: string;
  trap: string;
  hasOdds: string;
  hasRun: string;
  ok: boolean;
  issues: string[];
}

function audit(card: PlayCard): Row {
  const issues: string[] = [];
  // PL## campaign, MV## starmap movement verbs
  if (!card.id || !(/^(PL\d{2}[A-Z]?|MV\d{2})$/.test(card.id))) issues.push('bad id');
  if (!card.n) issues.push('missing name');
  if (!RISKS.has(card.risk)) issues.push(`bad risk ${card.risk}`);
  if (!card.ph?.length) issues.push('no phases');
  if (!card.attrs?.length) issues.push('untagged attrs');
  else {
    for (const a of card.attrs) {
      if (!ATTRS.has(a)) issues.push(`unknown attr ${a}`);
    }
  }
  if (card.cost.a === undefined && card.cost.$ === undefined && !card.cost.vp) {
    // free is ok for some; Filing Fee is $ only — fine
  }
  if (!card.run) issues.push('missing run');
  // SAFE cards with show/req still need odds or implicit
  if (card.risk !== 'SAFE' && !card.odds) issues.push('missing odds');
  // 2026-07-17 design decision: trap cards are no longer labeled — the
  // "honestly labeled" covenant was retired by the project owner (alpha).
  // The engine-side trap flag stays (it drives balance/audit tooling);
  // the *absence* of a player-facing tell is now intentional, so the old
  // "trap flag without trap tag" check is gone.

  return {
    id: card.id,
    n: card.n,
    risk: card.risk,
    ph: card.ph.join(','),
    attrs: (card.attrs ?? []).join('/'),
    trap: card.trap ? 'Y' : '',
    hasOdds: card.odds ? 'Y' : '',
    hasRun: card.run ? 'Y' : '',
    ok: issues.length === 0,
    issues
  };
}

console.log('=== CANDIDATE ZERO — SRD §10 Play Audit ===\n');
console.log(`Catalog size: ${PLAY_COUNT}`);

const rows = ALL_PLAYS.map(audit);
const failed = rows.filter(r => !r.ok);

console.log(
  [
    'ID'.padEnd(6),
    'Name'.padEnd(28),
    'Risk'.padEnd(6),
    'Ph'.padEnd(8),
    'Attrs'.padEnd(14),
    'Trap',
    'Odds',
    'Run',
    'OK'
  ].join(' ')
);
console.log('-'.repeat(100));
for (const r of rows) {
  console.log(
    [
      r.id.padEnd(6),
      r.n.slice(0, 28).padEnd(28),
      r.risk.padEnd(6),
      r.ph.padEnd(8),
      r.attrs.padEnd(14),
      (r.trap || '-').padEnd(4),
      (r.hasOdds || '-').padEnd(4),
      (r.hasRun || '-').padEnd(3),
      r.ok ? 'Y' : `N (${r.issues.join('; ')})`
    ].join(' ')
  );
}

// Uniqueness
const ids = ALL_PLAYS.map(p => p.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length) {
  console.error('FAIL: duplicate play ids', [...new Set(dupes)]);
  process.exitCode = 1;
}

// Coverage expectations
if (PLAY_COUNT < 22) {
  console.error(`FAIL: expected ≥22 plays, got ${PLAY_COUNT}`);
  process.exitCode = 1;
}

const attrCoverage = new Set(ALL_PLAYS.flatMap(p => p.attrs ?? []));
for (const a of ATTRS) {
  if (!attrCoverage.has(a)) {
    console.error(`FAIL: no play tagged with ${a}`);
    process.exitCode = 1;
  }
}

if (failed.length) {
  console.error(`\nFAILED: ${failed.length} card(s) have issues`);
  process.exitCode = 1;
} else {
  console.log(`\nPASSED: ${rows.length} plays clean — all attr-tagged, unique ids, risk/phase present`);
}

console.log('\nHarness complete.');
