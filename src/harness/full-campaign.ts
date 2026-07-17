/**
 * Full-campaign multi-strategy balance harness
 * Primary 8 + General 6 through terminal outcomes.
 * Run: npm run harness:full
 *
 * Design targets (souls-like on-ramp):
 * - grind: almost never reaches general (control)
 * - labor/money/hybrid: clear ballot most of the time; primary not free
 * - among generalists: GOTV skill matters; win rate not 0% and not 100%
 * - overall general win << 50% of all starts
 */

import { createCampaign, runFullCampaign } from '../engine/loop.js';
import { STRATEGIES } from '../engine/strategies.js';
import { createRng, setDefaultSeed, useRng } from '../engine/rng.js';
import { generalWinProbability } from '../engine/calendar.js';
import type { CampaignOutcome } from '../engine/types.js';

const TRIALS = Number(process.env.CZ_TRIALS ?? 200);

interface Row {
  strategy: string;
  trials: number;
  missedFilingPct: number;
  lostPrimaryPct: number;
  wonGeneralPct: number;
  lostGeneralPct: number;
  ballotRate: number;
  reachGeneralRate: number;
  primaryWinGivenBallot: number;
  generalWinGivenReach: number;
  overallGeneralWin: number;
  avgGotvIfGeneral: number | null;
  avgNameIfGeneral: number | null;
  avgContactsIfGeneral: number | null;
  avgGenWinPIfReach: number | null;
}

function runStrategy(name: string): Row {
  const choose = STRATEGIES[name];
  if (!choose) throw new Error(name);

  let missedFiling = 0;
  let lostPrimary = 0;
  let wonGeneral = 0;
  let lostGeneral = 0;
  let gotvSum = 0;
  let nameSum = 0;
  let contactSum = 0;
  let genPSum = 0;
  let nGenStats = 0;

  for (let i = 0; i < TRIALS; i++) {
    const seed = 20_000 + i * 17 + name.length * 1000;
    useRng(createRng(seed));
    setDefaultSeed(seed);
    const c = createCampaign({ seed });
    runFullCampaign(c, choose);
    const o = (c.state.outcome ?? 'ongoing') as CampaignOutcome;

    if (o === 'missed_filing') missedFiling++;
    else if (o === 'lost_primary') lostPrimary++;
    else if (o === 'won_general') wonGeneral++;
    else if (o === 'lost_general') lostGeneral++;

    if (o === 'won_general' || o === 'lost_general') {
      nGenStats++;
      const gotv = c.state.groundsArr.reduce((s, g) => s + (g.gotv || 0), 0);
      gotvSum += gotv;
      nameSum += c.state.nameID;
      contactSum += c.state.contacts;
      genPSum += generalWinProbability(c.state);
    }
  }

  const ballotedN = TRIALS - missedFiling;
  const reached = wonGeneral + lostGeneral;
  const primaryWins = reached;

  return {
    strategy: name,
    trials: TRIALS,
    missedFilingPct: +((missedFiling / TRIALS) * 100).toFixed(1),
    lostPrimaryPct: +((lostPrimary / TRIALS) * 100).toFixed(1),
    wonGeneralPct: +((wonGeneral / TRIALS) * 100).toFixed(1),
    lostGeneralPct: +((lostGeneral / TRIALS) * 100).toFixed(1),
    ballotRate: +((ballotedN / TRIALS) * 100).toFixed(1),
    reachGeneralRate: +((reached / TRIALS) * 100).toFixed(1),
    primaryWinGivenBallot:
      ballotedN > 0 ? +((primaryWins / ballotedN) * 100).toFixed(1) : 0,
    generalWinGivenReach:
      reached > 0 ? +((wonGeneral / reached) * 100).toFixed(1) : 0,
    overallGeneralWin: +((wonGeneral / TRIALS) * 100).toFixed(1),
    avgGotvIfGeneral: nGenStats ? +(gotvSum / nGenStats).toFixed(2) : null,
    avgNameIfGeneral: nGenStats ? +(nameSum / nGenStats).toFixed(1) : null,
    avgContactsIfGeneral: nGenStats ? +(contactSum / nGenStats).toFixed(0) : null,
    avgGenWinPIfReach: nGenStats ? +(genPSum / nGenStats).toFixed(3) : null
  };
}

console.log('=== CANDIDATE ZERO — Full Campaign Balance ===');
console.log(`Trials/strategy: ${TRIALS} | Primary 8 + General 6 | seeded pure engine\n`);

const names = ['labor', 'money', 'hybrid', 'grind'] as const;
const rows = names.map(runStrategy);
for (const r of rows) console.log(r);

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
    throw new Error(msg);
  }
}

const labor = rows.find(r => r.strategy === 'labor')!;
const money = rows.find(r => r.strategy === 'money')!;
const grind = rows.find(r => r.strategy === 'grind')!;

assert(grind.missedFilingPct >= 85, 'grind should usually miss filing');
assert(labor.ballotRate >= 70, 'labor should usually clear ballot');
assert(money.ballotRate >= 70, 'money should usually clear ballot');
assert(labor.reachGeneralRate >= 20, 'labor should reach general often enough to teach the loop');
assert(labor.overallGeneralWin >= 8 && labor.overallGeneralWin <= 45, 'labor overall win out of band');
assert(
  labor.avgGotvIfGeneral !== null && labor.avgGotvIfGeneral > 0.05,
  'labor generalists must bank GOTV (deck inject + play path)'
);
assert(
  labor.generalWinGivenReach >= 25 && labor.generalWinGivenReach <= 85,
  'general win given reach should reward skill without free win'
);

console.log('\nDesign read:');
console.log('- Deck growth injects into the physical draw pile (ownership-only bug fixed).');
console.log('- General injects PL19 GOTV; cost 1 vol so the lever is usable.');
console.log('- Primary modestly more winnable when balloted; general still GOTV-gated.');
console.log('- grind remains the control (miss filing).');
console.log('\nHarness complete.');
