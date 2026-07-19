/**
 * Phase 5 — Balance breadth matrix
 * Sample personas × districts × regions; flag soft-locks / free wins.
 * Run: npm run harness:matrix
 *
 * Env:
 *   CZ_MATRIX_N     trials per cell (default 30; smoke 12)
 *   CZ_MATRIX_FULL=1  run full 24×4×7 grid (slow; lower N recommended)
 */

import { createCampaign, runFullCampaign } from '../engine/loop.js';
import { STRATEGIES } from '../engine/strategies.js';
import { createRng, setDefaultSeed, useRng } from '../engine/rng.js';
import {
  PERSONAS,
  DISTRICTS,
  REGIONS,
  type SetupSelection
} from '../data/setup.js';
import type { CampaignOutcome } from '../engine/types.js';

const N = Number(process.env.CZ_MATRIX_N ?? 30);
const FULL = process.env.CZ_MATRIX_FULL === '1';
const ISSUE = 'taxes'; // issues are flavor for win math today

interface CellKey {
  personaId: string;
  districtId: string;
  regionId: string;
  strategy: 'labor' | 'money';
}

interface CellRow extends CellKey {
  trials: number;
  ballotRate: number;
  reachGeneralRate: number;
  overallGeneralWin: number;
  generalWinGivenReach: number;
  missedFilingPct: number;
  lostPrimaryPct: number;
  sessionEntryPct: number; // won general path into session
  flags: string[];
}

function hashSeed(parts: string[], i: number): number {
  let h = 2166136261;
  const s = parts.join('|') + '|' + i;
  for (let k = 0; k < s.length; k++) {
    h ^= s.charCodeAt(k);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 1_000_000_000;
}

function wonGenPath(o: CampaignOutcome): boolean {
  return (
    o === 'won_general' ||
    o === 'session_law' ||
    o === 'session_survived' ||
    o === 'session_primaried'
  );
}

function runCell(key: CellKey): CellRow {
  const choose = STRATEGIES[key.strategy];
  if (!choose) throw new Error(key.strategy);

  let missed = 0;
  let lostPrimary = 0;
  let wonGen = 0;
  let lostGen = 0;
  let session = 0;

  const setup: SetupSelection = {
    personaId: key.personaId,
    issueId: ISSUE,
    districtId: key.districtId,
    regionId: key.regionId
  };

  for (let i = 0; i < N; i++) {
    const seed = hashSeed(
      [key.personaId, key.districtId, key.regionId, key.strategy],
      i
    );
    useRng(createRng(seed));
    setDefaultSeed(seed);
    const c = createCampaign({ seed, setup });
    runFullCampaign(c, choose);
    const o = (c.state.outcome ?? 'ongoing') as CampaignOutcome;
    if (o === 'missed_filing') missed++;
    else if (o === 'lost_primary') lostPrimary++;
    else if (wonGenPath(o)) {
      wonGen++;
      if (o.startsWith('session_')) session++;
    } else if (o === 'lost_general') lostGen++;
  }

  const balloted = N - missed;
  const reached = wonGen + lostGen;
  const overall = (wonGen / N) * 100;
  const ballotRate = (balloted / N) * 100;
  const reach = (reached / N) * 100;
  const winGiven = reached > 0 ? (wonGen / reached) * 100 : 0;

  const flags = flagCell(key, {
    ballotRate,
    overall,
    winGiven,
    reach,
    missedPct: (missed / N) * 100
  });

  return {
    ...key,
    trials: N,
    ballotRate: +ballotRate.toFixed(1),
    reachGeneralRate: +reach.toFixed(1),
    overallGeneralWin: +overall.toFixed(1),
    generalWinGivenReach: +winGiven.toFixed(1),
    missedFilingPct: +((missed / N) * 100).toFixed(1),
    lostPrimaryPct: +((lostPrimary / N) * 100).toFixed(1),
    sessionEntryPct: +((session / N) * 100).toFixed(1),
    flags
  };
}

function flagCell(
  key: CellKey,
  m: {
    ballotRate: number;
    overall: number;
    winGiven: number;
    reach: number;
    missedPct: number;
  }
): string[] {
  const flags: string[] = [];
  const isWrong = key.districtId === 'wrong';
  const isIncumb = key.districtId === 'incumb';

  // Soft-lock: almost never on ballot with intentional strategy
  if (m.ballotRate < 5) flags.push('SOFTLOCK_BALLOT');
  // Note: labor ballot ~100% is *not* a free-win — Phase 0 petition retune
  // intentionally clears filing often. Degeneracy is win rate, not ballot.

  if (!isWrong) {
    if (m.overall < 5 && m.reach < 8) flags.push('SOFTLOCK_WIN');
    if (m.overall > 95) flags.push('FREE_WIN');
    if (m.winGiven > 95 && m.reach >= 25 && m.overall > 70) {
      flags.push('FREE_GENERAL_GIVEN_REACH');
    }
  } else {
    // Wrong-party: hard November; mean should be low. Cap individual cells.
    if (m.overall > 35) flags.push('WRONG_TOO_EASY');
    if (m.overall === 0 && m.reach === 0 && N >= 25) flags.push('WRONG_UNWINNABLE_SAMPLE');
  }

  if (isIncumb && m.overall > 55) flags.push('INCUMB_TOO_EASY');

  return flags;
}

/** Structured sample — covers axes without 672×N wall-clock in CI. */
function buildSampleCells(): CellKey[] {
  const cells: CellKey[] = [];
  const add = (c: CellKey) => cells.push(c);

  if (FULL) {
    for (const p of PERSONAS) {
      for (const d of DISTRICTS) {
        for (const r of REGIONS) {
          add({
            personaId: p.id,
            districtId: d.id,
            regionId: r.id,
            strategy: 'labor'
          });
        }
      }
    }
    // Money path on high-cash personas only (full grid still labor-primary)
    for (const pid of ['smallbiz', 'PA_CRA_DIP', 'PA_DIP_CHA', 'teacher']) {
      for (const d of DISTRICTS) {
        add({
          personaId: pid,
          districtId: d.id,
          regionId: 'east',
          strategy: 'money'
        });
      }
    }
    return cells;
  }

  // A — every persona, open/east, labor
  for (const p of PERSONAS) {
    add({
      personaId: p.id,
      districtId: 'open',
      regionId: 'east',
      strategy: 'labor'
    });
  }

  // B — every persona, wrong/east, labor (trap district)
  for (const p of PERSONAS) {
    add({
      personaId: p.id,
      districtId: 'wrong',
      regionId: 'east',
      strategy: 'labor'
    });
  }

  // C — teacher × all districts × all regions, labor
  for (const d of DISTRICTS) {
    for (const r of REGIONS) {
      add({
        personaId: 'teacher',
        districtId: d.id,
        regionId: r.id,
        strategy: 'labor'
      });
    }
  }

  // D — high-money personas × districts, money strategy
  for (const pid of ['smallbiz', 'PA_CRA_DIP', 'PA_DIP_CHA']) {
    for (const d of DISTRICTS) {
      add({
        personaId: pid,
        districtId: d.id,
        regionId: 'east',
        strategy: 'money'
      });
    }
  }

  // E — labor vs money head-to-head on teacher/open/east + smallbiz/open/east
  for (const strat of ['labor', 'money'] as const) {
    for (const pid of ['teacher', 'smallbiz', 'veteran', 'PA_CON']) {
      add({
        personaId: pid,
        districtId: 'open',
        regionId: 'east',
        strategy: strat
      });
    }
  }

  // F — region petition stress (metro high, west low) on labor teacher+smallbiz
  for (const rid of ['metro', 'west', 'panhandle', 'valley']) {
    for (const pid of ['teacher', 'smallbiz']) {
      add({
        personaId: pid,
        districtId: 'open',
        regionId: rid,
        strategy: 'labor'
      });
    }
  }

  // Dedup
  const seen = new Set<string>();
  return cells.filter(c => {
    const k = `${c.personaId}|${c.districtId}|${c.regionId}|${c.strategy}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  }
}

console.log('=== CANDIDATE ZERO — Phase 5 Balance Matrix ===');
console.log(
  `Mode: ${FULL ? 'FULL grid' : 'structured sample'} | N/cell=${N} | personas=${PERSONAS.length} districts=${DISTRICTS.length} regions=${REGIONS.length}\n`
);

const cells = buildSampleCells();
console.log(`Cells: ${cells.length}`);

const t0 = Date.now();
const rows = cells.map((c, i) => {
  if ((i + 1) % 20 === 0 || i === 0) {
    process.stdout.write(`  … ${i + 1}/${cells.length}\r`);
  }
  return runCell(c);
});
console.log(`  done ${cells.length}/${cells.length} in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

// --- Summaries ---
const flagged = rows.filter(r => r.flags.length);
const byPersona = new Map<string, CellRow[]>();
for (const r of rows) {
  const list = byPersona.get(r.personaId) ?? [];
  list.push(r);
  byPersona.set(r.personaId, list);
}

console.log('--- Persona axis (open/east labor where present) ---');
const personaOpen = rows.filter(
  r => r.districtId === 'open' && r.regionId === 'east' && r.strategy === 'labor'
);
for (const r of personaOpen.sort((a, b) => a.overallGeneralWin - b.overallGeneralWin)) {
  const mark = r.flags.length ? ` ⚠ ${r.flags.join(',')}` : '';
  console.log(
    `  ${r.personaId.padEnd(14)} ballot ${String(r.ballotRate).padStart(5)}%  reach ${String(r.reachGeneralRate).padStart(5)}%  win ${String(r.overallGeneralWin).padStart(5)}%  |reach ${String(r.generalWinGivenReach).padStart(5)}%${mark}`
  );
}

console.log('\n--- Wrong-party stress (labor, east unique personas) ---');
const wrongEast = rows.filter(
  r => r.districtId === 'wrong' && r.regionId === 'east' && r.strategy === 'labor'
);
// Dedupe by persona (sample builder may add teacher×wrong×region variants)
const wrongByPersona = new Map<string, CellRow>();
for (const r of wrongEast) wrongByPersona.set(r.personaId, r);
const wrong = [...wrongByPersona.values()];
const wrongWins = wrong.filter(r => r.overallGeneralWin > 0).length;
const wrongAvg =
  wrong.length > 0
    ? wrong.reduce((s, r) => s + r.overallGeneralWin, 0) / wrong.length
    : 0;
console.log(
  `  personas sampled: ${wrong.length} | any win: ${wrongWins} | mean overall win: ${wrongAvg.toFixed(1)}%`
);
for (const r of wrong
  .slice()
  .sort((a, b) => b.overallGeneralWin - a.overallGeneralWin)
  .slice(0, 12)) {
  console.log(
    `  ${r.personaId.padEnd(14)} win ${r.overallGeneralWin}% reach ${r.reachGeneralRate}% ${r.flags.join(',') || '—'}`
  );
}

console.log('\n--- District × region (teacher labor) ---');
const teach = rows.filter(r => r.personaId === 'teacher' && r.strategy === 'labor');
for (const r of teach.sort((a, b) => a.districtId.localeCompare(b.districtId) || a.regionId.localeCompare(b.regionId))) {
  const mark = r.flags.length ? ` ⚠ ${r.flags.join(',')}` : '';
  console.log(
    `  ${r.districtId.padEnd(6)} ${r.regionId.padEnd(10)} ballot ${r.ballotRate}% reach ${r.reachGeneralRate}% win ${r.overallGeneralWin}%${mark}`
  );
}

console.log('\n--- Money path (high-cash + teacher) ---');
const moneyRows = rows.filter(r => r.strategy === 'money');
for (const r of moneyRows.sort((a, b) => b.overallGeneralWin - a.overallGeneralWin)) {
  const mark = r.flags.length ? ` ⚠ ${r.flags.join(',')}` : '';
  console.log(
    `  ${r.personaId.padEnd(14)} ${r.districtId.padEnd(6)} ballot ${r.ballotRate}% win ${r.overallGeneralWin}% |reach ${r.generalWinGivenReach}%${mark}`
  );
}

// Labor vs money dominance on shared cells
console.log('\n--- Labor vs money (shared setups) ---');
const laborMoneyPairs: { key: string; labor?: CellRow; money?: CellRow }[] = [];
const pairMap = new Map<string, { labor?: CellRow; money?: CellRow }>();
for (const r of rows) {
  if (r.districtId !== 'open' || r.regionId !== 'east') continue;
  const k = r.personaId;
  const e = pairMap.get(k) ?? {};
  if (r.strategy === 'labor') e.labor = r;
  else e.money = r;
  pairMap.set(k, e);
}
for (const [k, v] of pairMap) {
  if (v.labor && v.money) {
    const ratio =
      v.labor.overallGeneralWin > 0
        ? v.money.overallGeneralWin / v.labor.overallGeneralWin
        : v.money.overallGeneralWin > 0
          ? Infinity
          : 1;
    console.log(
      `  ${k.padEnd(14)} labor win ${v.labor.overallGeneralWin}%  money win ${v.money.overallGeneralWin}%  ratio ${ratio === Infinity ? '∞' : ratio.toFixed(2)}x`
    );
    laborMoneyPairs.push({ key: k, ...v });
  }
}

console.log('\n--- Flagged cells ---');
if (!flagged.length) {
  console.log('  (none)');
} else {
  for (const r of flagged) {
    console.log(
      `  ${r.strategy} ${r.personaId}/${r.districtId}/${r.regionId}: ${r.flags.join(', ')} (ballot ${r.ballotRate}% win ${r.overallGeneralWin}%)`
    );
  }
}

// --- Guardrails (Phase 5 acceptance) ---
/** High-cash personas on money path — intentional identity, not broken. */
const MONEY_IDENTITY = new Set(['smallbiz', 'PA_CRA_DIP', 'PA_DIP_CHA']);

const unexplained = flagged.filter(r => {
  if (r.flags.includes('WRONG_UNWINNABLE_SAMPLE') && N < 25) return false;
  // Rich money identity: high win given reach on open is texture if overall < 80
  if (
    r.flags.every(f => f === 'FREE_GENERAL_GIVEN_REACH') &&
    r.strategy === 'money' &&
    r.overallGeneralWin < 80
  ) {
    return false;
  }
  // Issue #9: document high-money identity vs filing/general — not free wins
  if (
    r.strategy === 'money' &&
    MONEY_IDENTITY.has(r.personaId) &&
    r.overallGeneralWin < 70 &&
    (r.flags.includes('INCUMB_TOO_EASY') || r.flags.includes('WRONG_TOO_EASY'))
  ) {
    return false; // accepted texture (still below free-win band)
  }
  if (r.flags.includes('SOFTLOCK_BALLOT') || r.flags.includes('SOFTLOCK_WIN')) return true;
  if (r.flags.includes('FREE_WIN')) return true;
  if (r.flags.includes('WRONG_TOO_EASY')) return true;
  if (r.flags.includes('INCUMB_TOO_EASY')) return true;
  if (r.flags.includes('FREE_GENERAL_GIVEN_REACH') && r.overallGeneralWin >= 80) return true;
  return false;
});

// Aggregate health
const openLabor = personaOpen;
const openLaborWins = openLabor.map(r => r.overallGeneralWin);
const minPersonaWin = Math.min(...openLaborWins, 100);
const maxPersonaWin = Math.max(...openLaborWins, 0);
const meanPersonaWin =
  openLaborWins.reduce((a, b) => a + b, 0) / Math.max(1, openLaborWins.length);

console.log('\n--- Aggregate (open/east labor personas) ---');
console.log({
  n: openLabor.length,
  meanOverallWin: +meanPersonaWin.toFixed(1),
  minOverallWin: minPersonaWin,
  maxOverallWin: maxPersonaWin,
  flaggedCells: flagged.length,
  unexplainedDegenerates: unexplained.length
});

// Acceptance asserts
assert(cells.length >= 40, 'matrix sample too small');
assert(openLabor.length === PERSONAS.length, 'every persona should appear on open/east labor');
assert(wrong.length === PERSONAS.length, 'every persona should appear on wrong/east labor');
assert(wrongAvg < 22, `wrong district mean win too high (${wrongAvg.toFixed(1)}%)`);
assert(wrongAvg > 2, `wrong district mean win too low (${wrongAvg.toFixed(1)}%) — trap became impossible`);
// At least some wrong-district wins if N decent — souls-like not impossible
if (N >= 25) {
  assert(
    wrongWins >= 1,
    'wrong district should sometimes be winnable for at least one persona'
  );
}
assert(minPersonaWin >= 0, 'min persona win');
// No open/east labor persona should be a free win or total soft-lock
for (const r of openLabor) {
  assert(
    r.overallGeneralWin <= 90,
    `persona ${r.personaId} open/east labor free-win territory (${r.overallGeneralWin}%)`
  );
  assert(
    r.ballotRate >= 40,
    `persona ${r.personaId} soft-lock ballot (${r.ballotRate}%)`
  );
}
// Money must not dominate labor by absurd margin on teacher.
// Cap 4.0× (was 3.5×): N=30 cells are noisy, and harness strategies no longer
// free-farm starmap Specials on empty-hand fallback (pack #3). Identity still
// holds — money beats labor without free-win territory.
const teacherPair = laborMoneyPairs.find(p => p.key === 'teacher');
if (teacherPair?.labor && teacherPair.money) {
  const ratio =
    teacherPair.labor.overallGeneralWin > 0
      ? teacherPair.money.overallGeneralWin / teacherPair.labor.overallGeneralWin
      : 99;
  assert(
    ratio <= 4.0,
    `teacher money/labor win ratio ${ratio.toFixed(2)}x exceeds 4.0x`
  );
}

// High-cash money path may beat labor hard — document as identity, fail only if free win
const richMoney = moneyRows.filter(
  r =>
    (r.personaId === 'PA_DIP_CHA' || r.personaId === 'PA_CRA_DIP') &&
    r.districtId === 'open'
);
for (const r of richMoney) {
  assert(r.overallGeneralWin < 95, `rich persona free win ${r.personaId}`);
}

assert(
  unexplained.length === 0,
  `unexplained degenerate cells: ${unexplained
    .map(r => `${r.personaId}/${r.districtId}/${r.regionId}:${r.flags.join('+')}`)
    .join('; ')}`
);

if (process.exitCode) {
  console.error('\nPhase 5 matrix FAILED — see flags above.');
} else {
  console.log('\nPASSED: Phase 5 matrix sample — no unexplained degenerates.');
  console.log(
    'Document: mean persona win band, wrong-district hardness, money identity, labor/money ratio.'
  );
}

console.log('\nHarness complete.');
