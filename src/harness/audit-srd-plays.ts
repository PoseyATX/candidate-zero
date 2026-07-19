/**
 * Formal §10 play audit table — every catalog card must have
 * id, name, cost, risk, phases, attr tag(s), and odds/run hooks where required.
 * Run: npm run harness:audit
 */

import { ALL_PLAYS, PLAY_COUNT, SHOP_PLAYS } from '../data/plays.js';
import { SESSION_PLAYS } from '../data/session-plays.js';
import { WAITING_PLAYS } from '../data/waiting-plays.js';
import { OUTSIDE_EVENTS } from '../data/outside-events.js';
import type { AttrId, CardControl, CardResidency, PlayCard, RiskClass } from '../engine/types.js';

const ATTRS = new Set<AttrId>(['CLO', 'CON', 'CRA', 'INK', 'DIP', 'CHA']);
const RISKS = new Set<RiskClass>(['SAFE', 'STD', 'VOL', 'CHOICE']);
const RESIDENCIES = new Set<CardResidency>(['main', 'special', 'outside']);
const CONTROLS = new Set<CardControl>(['player', 'world']);

interface Row {
  id: string;
  n: string;
  risk: string;
  ph: string;
  attrs: string;
  trap: string;
  residency: string;
  control: string;
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

  // Residency law (docs/CARD-RESIDENCY.md)
  const res = card.residency ?? 'main';
  const ctl = card.control ?? 'player';
  if (card.residency !== undefined && !RESIDENCIES.has(card.residency)) {
    issues.push(`bad residency ${card.residency}`);
  }
  if (card.control !== undefined && !CONTROLS.has(card.control)) {
    issues.push(`bad control ${card.control}`);
  }
  if (res === 'outside' && ctl !== 'world') {
    issues.push('outside must be control:world');
  }
  if (ctl === 'world' && res !== 'outside') {
    // world control outside of Outside is a smell — allow but flag
    issues.push('world control without outside residency');
  }
  if (res === 'special' && card.id.startsWith('MV') && !card.entityScope?.length) {
    issues.push('special MV needs entityScope');
  }

  return {
    id: card.id,
    n: card.n,
    risk: card.risk,
    ph: card.ph.join(','),
    attrs: (card.attrs ?? []).join('/'),
    trap: card.trap ? 'Y' : '',
    residency: res,
    control: ctl,
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

// Session SS* / shop BUY* use different id schemes — residency law only
function residencyOk(c: PlayCard, expect: 'main' | 'special'): string[] {
  const issues: string[] = [];
  if ((c.residency ?? 'main') !== expect) issues.push(`want residency ${expect}`);
  if ((c.control ?? 'player') !== 'player') issues.push('want control player');
  if (expect === 'special' && c.id.startsWith('SS') && !c.entityScope?.length) {
    issues.push('session special needs entityScope');
  }
  if ((c.residency ?? '') === 'outside' && (c.control ?? '') !== 'world') {
    issues.push('outside must be world');
  }
  return issues;
}
const sessionIssues = SESSION_PLAYS.flatMap(c =>
  residencyOk(c, 'special').map(i => `${c.id}: ${i}`)
);
const shopIssues = SHOP_PLAYS.flatMap(c =>
  residencyOk(c, 'main').map(i => `${c.id}: ${i}`)
);
if (sessionIssues.length) {
  console.error('FAIL session residency:', sessionIssues);
  process.exitCode = 1;
}
if (shopIssues.length) {
  console.error('FAIL shop residency:', shopIssues);
  process.exitCode = 1;
}

console.log(
  [
    'ID'.padEnd(6),
    'Name'.padEnd(28),
    'Risk'.padEnd(6),
    'Res'.padEnd(8),
    'Ctl'.padEnd(7),
    'Attrs'.padEnd(14),
    'Trap',
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
      r.residency.padEnd(8),
      r.control.padEnd(7),
      r.attrs.padEnd(14),
      (r.trap || '-').padEnd(4),
      r.ok ? 'Y' : `N (${r.issues.join('; ')})`
    ].join(' ')
  );
}

// Residency tallies — full architecture surface
const resTally: Record<string, number> = { main: 0, special: 0, outside: 0 };
for (const c of [...ALL_PLAYS, ...SESSION_PLAYS, ...SHOP_PLAYS, ...WAITING_PLAYS]) {
  const r = c.residency ?? 'main';
  resTally[r] = (resTally[r] ?? 0) + 1;
}
for (const e of OUTSIDE_EVENTS) {
  resTally.outside = (resTally.outside ?? 0) + 1;
  if (e.residency !== 'outside' || e.control !== 'world') {
    console.error(`FAIL outside catalog ${e.id}`);
    process.exitCode = 1;
  }
}
// Waiting kit must be special
for (const w of WAITING_PLAYS) {
  if ((w.residency ?? 'main') !== 'special') {
    console.error(`FAIL waiting ${w.id} not special`);
    process.exitCode = 1;
  }
}
console.log(
  `\nResidency tally (plays+session+shop+waiting+outside): main=${resTally.main} special=${resTally.special} outside=${resTally.outside}`
);
const specials = [...ALL_PLAYS, ...SESSION_PLAYS, ...WAITING_PLAYS].filter(
  c => (c.residency ?? 'main') === 'special'
);
console.log(`Special ids: ${specials.map(c => c.id).join(', ') || '(none)'}`);
console.log(`Outside ids: ${OUTSIDE_EVENTS.map(e => e.id).join(', ')}`);

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
} else if (!sessionIssues.length && !shopIssues.length) {
  console.log(
    `\nPASSED: ${rows.length} plays clean — attrs/ids/risk + residency ` +
      `(session special×${SESSION_PLAYS.length}, shop main×${SHOP_PLAYS.length})`
  );
}

console.log('\nHarness complete.');
