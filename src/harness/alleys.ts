/**
 * The alleyways — Acts I and II can waste your afternoon.
 * Run: npm run harness:alleys
 *
 * The session became a place; the campaign was still a board. Acts I and II had
 * grounds, allies and a shop — every option productive with a known return.
 * There was no way to spend a week badly, and an afternoon you cannot waste is
 * an afternoon you never had to decide about.
 *
 * The design rules these assert, from the owner:
 *
 *   > "The open world of the game means every moving part can be acted upon by
 *   > the player, even if that means taking them down a rabbit hole that uses up
 *   > their cards and actions wastefully. The game should have alleyways, some
 *   > of which are shortcuts, some of which are traps."
 *
 * So: the median outcome must be poor, the top end must be real, and at least
 * one of them must be able to actively hurt you. If a run of this harness starts
 * failing because the alleys got better, the fix is NOT to relax the assertion.
 */

import { createCampaign, listPlayableHand } from '../engine/loop.js';
import { createNewState } from '../engine/state.js';
import { createRng, setDefaultSeed, useRng } from '../engine/rng.js';
import { executePlay } from '../engine/play.js';
import { ALLEY_PLAYS } from '../data/alley-plays.js';
import { MEMBER_BY_ID } from '../data/members.js';
import { chamberSwing } from '../engine/chamber.js';
import { enterSession } from '../engine/session.js';
import type { GameState } from '../engine/types.js';

let failed = 0;
function assert(cond: boolean, msg: string): void {
  if (cond) console.log(`PASS: ${msg}`);
  else {
    console.error(`FAIL: ${msg}`);
    failed++;
  }
}

console.log('=== CANDIDATE ZERO — The alleyways ===\n');

/** A crude "did that week help me" score across the ledger an alley can touch. */
function score(s: GameState): number {
  const rap = s.groundsArr.reduce((t, g) => t + (g.rapport || 0), 0);
  return s.contacts + s.nameID * 10 + s.momentum * 25 + s.endorsePts * 30 + rap * 2 + s.volPool * 15;
}

// --- THEY ARE REACHABLE, AND ONLY IN THE CAMPAIGN ---
{
  useRng(createRng(4));
  setDefaultSeed(4);
  const c = createCampaign({ seed: 4 });
  const ids = listPlayableHand(c).map(p => p.card.id);
  for (const a of ALLEY_PLAYS) {
    assert(ids.includes(a.id), `${a.id} ${a.n} is on the menu in Act I`);
  }

  // Last in the menu, not first. They were first, and every strategy that falls
  // back to "the first playable thing" started spending its week at the domino
  // table — the money strategy's ballot rate fell 70% -> 59.8%.
  const alleyIdx = listPlayableHand(c).findIndex(p => p.card.id === 'AL01');
  assert(
    alleyIdx > 0 && alleyIdx >= listPlayableHand(c).length - ALLEY_PLAYS.length,
    'and they sit at the BOTTOM of the menu — somewhere you choose to go'
  );

  enterSession(c.state);
  const sessionIds = listPlayableHand(c).map(p => p.card.id);
  for (const a of ALLEY_PLAYS) {
    assert(!sessionIds.includes(a.id), `${a.id} is not offered in the chamber — a different building`);
  }
}

// --- EVERY ALLEY IS HONESTLY LABELLED AND WRITTEN AS A PLACE ---
{
  for (const a of ALLEY_PLAYS) {
    assert(!!a.tag && a.d.length > 120, `${a.id} is written as a place, not a stat line`);
    assert(!!a.odds, `${a.id} states odds the player can read`);
    const p = a.odds!(createNewState({ seed: 1 }));
    assert(p < 0.75, `${a.id} does not pretend to be reliable (${p.toFixed(2)})`);
  }
}

// --- THE MEDIAN AFTERNOON IS POOR, AND ONE OF THEM BITES ---
{
  const N = 400;
  let withRealDoors = 0;
  for (const a of ALLEY_PLAYS) {
    let poor = 0;
    let harmed = 0;
    let great = 0;
    for (let i = 0; i < N; i++) {
      const seed = 20_000 + i;
      useRng(createRng(seed));
      setDefaultSeed(seed);
      // Momentum 2, because a realistic mid-campaign week has some to lose.
      // At momentum 0 the −1 penalties clamp to nothing and every alley measured
      // as 0% harmful — the trap was invisible to the instrument, not absent.
      const s = createNewState({ seed, ap: 9, money: 3000, volPool: 5, favors: 2 });
      s.stage = 'primary';
      s.momentum = 2;
      const before = score(s);
      executePlay(s, a);
      const after = score(s);
      if (after < before) harmed++;
      else if (after - before < 40) poor++;
      else great++;
    }
    const pct = (n: number) => `${((100 * n) / N).toFixed(0)}%`;
    console.log(
      `  ${a.id} ${a.n.padEnd(22)} harmful ${pct(harmed).padStart(4)} · thin ${pct(poor).padStart(4)} · worth it ${pct(great).padStart(4)}`
    );
    assert(
      harmed + poor >= N * 0.4,
      `${a.id}: the usual afternoon there is thin or worse (${pct(harmed + poor)})`
    );
    if (great > 0) withRealDoors++;
  }
  // Not every alley needs a big top end — AL03 (the Dairy Queen) is deliberately
  // the safe, low-ceiling one whose entire character is that it FEELS like work.
  // But if none of them ever paid, nobody would walk into any of them, and the
  // whole set would just be a tax.
  assert(
    withRealDoors >= 2,
    `at least two alleyways have a genuine top end (${withRealDoors} of ${ALLEY_PLAYS.length})`
  );
}

// --- AT LEAST ONE ALLEY CAN ACTIVELY COST YOU ---
//
// A trap that only wastes time is a slow ramp. Something has to be able to go
// backwards, or none of these are decisions.
{
  let anyHarm = false;
  for (const a of ALLEY_PLAYS) {
    for (let i = 0; i < 300 && !anyHarm; i++) {
      const seed = 71_000 + i;
      useRng(createRng(seed));
      setDefaultSeed(seed);
      const s = createNewState({ seed, ap: 9 });
      s.stage = 'primary';
      s.momentum = 3;
      const before = score(s);
      executePlay(s, a);
      if (score(s) < before) anyHarm = true;
    }
  }
  assert(anyHarm, 'at least one alleyway can leave you worse off than when you walked in');
}

// --- THEY TOUCH OTHER SYSTEMS, NOT JUST A SCALAR ---
//
// 61% of this game's cards only moved a number. The starmap concept is an
// intricate interconnection between cards; an alley that only bumps `contacts`
// would be more of the exact problem already measured.
{
  let touchedGround = false;
  for (let i = 0; i < 400 && !touchedGround; i++) {
    const seed = 33_000 + i;
    useRng(createRng(seed));
    setDefaultSeed(seed);
    const s = createNewState({ seed, ap: 9 });
    s.stage = 'primary';
    const before = s.groundsArr.map(g => g.rapport || 0).join(',');
    executePlay(s, ALLEY_PLAYS.find(a => a.id === 'AL01')!);
    if (s.groundsArr.map(g => g.rapport || 0).join(',') !== before) touchedGround = true;
  }
  assert(touchedGround, 'the domino table actually moves rapport on the square, not a generic counter');
}

// --- THE TRAIL AND THE CHAMBER ARE ONE BUILDING ---
//
// The starmap concept is an intricate interconnection between every card. The
// clearest possible version of it: members have counties, the campaign is played
// on those same counties, so the man at the domino table on Courthouse Square is
// FROM Courthouse Square. Meet him in October and he is already warm when you
// are sworn in — chamberRoster lives on the run and enterSession does not clear
// it.
{
  let introduced: string | null = null;
  let sVal: GameState | null = null;
  for (let i = 0; i < 600 && !introduced; i++) {
    const seed = 55_000 + i;
    useRng(createRng(seed));
    setDefaultSeed(seed);
    const s = createNewState({ seed, ap: 9 });
    s.stage = 'primary';
    executePlay(s, ALLEY_PLAYS.find(a => a.id === 'AL02')!);
    const met = Object.keys(s.chamberRoster ?? {})[0];
    if (met) {
      introduced = met;
      sVal = s;
    }
  }
  assert(!!introduced, 'an alleyway can introduce you to a named legislator on the trail');
  const m = MEMBER_BY_ID[introduced ?? ''];
  assert(!!m, `and it is a real member (${introduced})`);
  assert(
    m?.ground === 'GR02',
    'from the county you were actually working — the FM route meets FM-route people'
  );

  // The whole point: it survives into Austin.
  const before = sVal!.chamberRoster![introduced!];
  enterSession(sVal!);
  assert(
    sVal!.chamberRoster?.[introduced!] === before,
    'and the acquaintance is still there when you are sworn in months later'
  );
  assert(
    chamberSwing(sVal!) >= 0,
    'an introduction never counts against you on the floor'
  );
}

if (failed) {
  console.error(`\nAlleyways FAILED — ${failed} assertion(s)`);
  process.exit(1);
}
console.log('\nAlleyways green — Acts I and II have somewhere to lose an afternoon.');
