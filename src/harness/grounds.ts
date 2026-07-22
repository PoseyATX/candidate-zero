/**
 * CANDIDATE ZERO — Ground distribution harness (Phase 1)
 * Run: npm run harness:grounds
 *
 * Measures whether the ground layer makes the "where do I work?" choice
 * visible and consequential. Runs labor/money card strategies crossed with
 * two ground strategies (focus one turf vs. spread across a few), plus a
 * rival-avoidance probe, and reports:
 *   - win rate per combo
 *   - how many grounds the player actually contests (design target ~3, not 6)
 *   - how often the (unwired) ground win-condition sketch is met
 *   - rivalRap teeth: field odds + win math; avoid-rival probe
 *
 * Drives its own play loop (not runWeek) so it can choose a ground per
 * field play and spend fieldAp.
 */

import { createCampaign, listPlayableHand, playFromHand, startWeek, endWeekInPlace, maybeOfferPhaseDraft } from '../engine/loop.js';
import { autoResolvePhaseDraft } from '../engine/deck.js';
import { STRATEGIES } from '../engine/strategies.js';
import { checkBallotThreshold } from '../engine/career.js';
import {
  rivalOddsPenalty,
  meanRivalRapport,
  primaryWinProbability
} from '../engine/calendar.js';
import { createNewState } from '../engine/state.js';
import { createRng, setDefaultSeed, useRng } from '../engine/rng.js';
import type { GameState, Ground } from '../engine/types.js';

const TRIALS = Number(process.env.CZ_TRIALS ?? 50);

type GroundStrat = 'focus' | 'spread' | 'avoid-rival' | 'ignore-rival';

/** Grounds sorted by initial size — a stable "home / top turfs" ordering. */
function topGrounds(state: GameState): Ground[] {
  return state.groundsArr.slice().sort((a, b) => b.pool0 - a.pool0);
}

function pickGround(state: GameState, strat: GroundStrat, rot: number): Ground {
  const top = topGrounds(state);
  switch (strat) {
    case 'focus':
      return top[0]!;
    case 'spread':
      // round-robin across the three biggest turfs → naturally contests ~3
      return top[rot % 3]!;
    case 'avoid-rival':
      return state.groundsArr.slice().sort((a, b) => (a.rivalRap || 0) - (b.rivalRap || 0))[0]!;
    case 'ignore-rival':
    default:
      return top[0]!;
  }
}

interface Result {
  won: boolean;
  reachedGeneral: boolean;
  contested: number;
  groundsGE40: number;
  topRapport: number;
  sketchMet: boolean;
}

function runGroundCampaign(seed: number, cardStrat: string, groundStrat: GroundStrat): Result {
  useRng(createRng(seed));
  setDefaultSeed(seed);
  const c = createCampaign({ seed });
  const choose = STRATEGIES[cardStrat]!;
  let rot = 0;
  let weekGuard = 40;

  while (!c.state.over && weekGuard-- > 0) {
    startWeek(c);
    let guard = c.state.apMax * 4 + 6;
    while ((c.state.ap > 0 || c.state.fieldAp > 0) && !c.state.over && guard-- > 0) {
      if (c.state.pendingDraft) autoResolvePhaseDraft(c.state, c.deck);
      const playable = listPlayableHand(c);
      if (!playable.length) break;
      const handIndex = choose(playable, c.state);
      if (handIndex === null || handIndex === undefined) break;
      const entry = playable.find(p => p.index === handIndex) ?? playable[0]!;
      const wasBallot = c.state.ballot;
      const ground = entry.card.field ? pickGround(c.state, groundStrat, rot++) : undefined;
      const out = playFromHand(c, handIndex, ground);
      if (!wasBallot && c.state.ballot) maybeOfferPhaseDraft(c, true);
      if (!out.ok) break;
    }
    const t = endWeekInPlace(c);
    if (t.kind === 'enter_general') maybeOfferPhaseDraft(c, true);
  }

  const outcome = c.state.outcome ?? 'ongoing';
  const contested = c.state.groundsArr.filter(g => (g.rapport || 0) > 0).length;
  const groundsGE40 = c.state.groundsArr.filter(g => (g.rapport || 0) >= 40).length;
  const topRapport = Math.max(0, ...c.state.groundsArr.map(g => g.rapport || 0));
  return {
    won:
      outcome === 'won_general' ||
      outcome === 'session_law' ||
      outcome === 'session_survived',
    reachedGeneral:
      outcome === 'won_general' ||
      outcome === 'lost_general' ||
      outcome === 'session_law' ||
      outcome === 'session_survived' ||
      outcome === 'session_primaried',
    contested,
    groundsGE40,
    topRapport,
    sketchMet: checkBallotThreshold(c.state).met
  };
}

function summarize(cardStrat: string, groundStrat: GroundStrat) {
  let won = 0, reached = 0, contested = 0, ge40 = 0, top = 0, sketch = 0;
  for (let i = 0; i < TRIALS; i++) {
    const r = runGroundCampaign(9000 + i * 13 + cardStrat.length * 100, cardStrat, groundStrat);
    won += r.won ? 1 : 0;
    reached += r.reachedGeneral ? 1 : 0;
    contested += r.contested;
    ge40 += r.groundsGE40;
    top += r.topRapport;
    sketch += r.sketchMet ? 1 : 0;
  }
  return {
    combo: `${cardStrat}/${groundStrat}`,
    winPct: +((won / TRIALS) * 100).toFixed(1),
    reachGenPct: +((reached / TRIALS) * 100).toFixed(1),
    avgContested: +(contested / TRIALS).toFixed(2),
    avgGroundsGE40: +(ge40 / TRIALS).toFixed(2),
    avgTopRapport: +(top / TRIALS).toFixed(1),
    sketchMetPct: +((sketch / TRIALS) * 100).toFixed(1)
  };
}

console.log('=== CANDIDATE ZERO — Ground Distribution (Phase 1) ===');
console.log(`Trials/combo: ${TRIALS}\n`);

const combos: [string, GroundStrat][] = [
  ['labor', 'focus'],
  ['labor', 'spread'],
  ['money', 'focus'],
  ['money', 'spread']
];
const rows = combos.map(([c, g]) => summarize(c, g));
for (const r of rows) console.log(r);

// Rival-avoidance probe — rivalRap has teeth; avoid should not be worse by a landslide.
console.log('\n--- Rival-avoidance probe (money) ---');
const avoid = summarize('money', 'avoid-rival');
const ignore = summarize('money', 'ignore-rival');
const deltaPP = +(avoid.winPct - ignore.winPct).toFixed(1);
console.log({ 'avoid-rival': avoid.winPct, 'ignore-rival': ignore.winPct, deltaPP });

console.log('\nDesign read:');
const laborSpread = rows.find(r => r.combo === 'labor/spread')!;
const laborFocus = rows.find(r => r.combo === 'labor/focus')!;
console.log(`- spread contests more ground than focus: ${laborSpread.avgContested} vs ${laborFocus.avgContested}`);
console.log(`- players contest ~${laborSpread.avgContested} grounds under spread (target: a few, not all 8)`);
console.log(`- rival-avoidance deltaPP=${deltaPP} (teeth: contested turf is harder)`);

// --- Assertions (robust across brutal RNG) ---
function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
    throw new Error(msg);
  }
}
for (const r of rows) {
  assert(Number.isFinite(r.avgContested) && r.avgContested >= 0 && r.avgContested <= 8, `${r.combo}: contested in range`);
  assert(Number.isFinite(r.winPct), `${r.combo}: winPct finite`);
}
// Spread should touch at least as many grounds as focus (focus can starve under rival teeth)
assert(laborSpread.avgContested + 0.01 >= laborFocus.avgContested, 'spread should contest >= focus');
// Teeth unit tests (not smoke-win-rate — N=50 is noisy)
{
  const g = { id: 'x', n: 't', pool: 1, pool0: 1, prop: 0.5, aff: 'G', rapport: 0, gotv: 0, rivalRap: 50 };
  assert(rivalOddsPenalty(g) >= 0.08 && rivalOddsPenalty(g) <= 0.18, 'rival odds penalty mid band');
  assert(rivalOddsPenalty({ ...g, rivalRap: 0 }) === 0, 'no rival no penalty');
  const s = createNewState({ seed: 1 });
  for (const gr of s.groundsArr) gr.rivalRap = 0;
  const p0 = primaryWinProbability(s);
  for (const gr of s.groundsArr) gr.rivalRap = 40;
  const p1 = primaryWinProbability(s);
  assert(p1 < p0, 'mean rivalRap depresses primary win p');
  assert(meanRivalRapport(s) === 40, 'mean rival');
  console.log('PASSED: rivalRap teeth (odds penalty + primary win pressure)');
}
// Avoidance should not catastrophically underperform (noise band)
assert(avoid.winPct + 25 >= ignore.winPct, 'avoid-rival should not crater vs ignore');

console.log('\nHarness complete.');
