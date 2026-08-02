/**
 * Heat / press-your-luck harness.
 * Run: npm run harness:heat
 *
 * The load-bearing assertions are the covenant ones. Heat is the first system
 * in this engine that lets a player's past results change a future roll's odds,
 * which is exactly the shape pity takes — so the difference has to be proven,
 * not asserted in a comment:
 *
 *   4. Brutal, impartial RNG (no pity)
 *      - failures grant nothing (a cold streak banks zero heat)
 *      - banked heat changes nothing unless deliberately spent
 *      - pressing moves p and band going INTO resolve, never the roll itself
 *   5. SAFE means safe
 *      - a pressed SAFE card gains odds and still cannot produce DISASTER
 */

import { createNewState } from '../engine/state.js';
import { executePlay } from '../engine/play.js';
import { resolve } from '../engine/resolve.js';
import {
  heatOf,
  canPress,
  bankHeat,
  quotePress,
  pressLabel,
  pressOddsBonus,
  pressBandPenalty,
  MAX_HEAT
} from '../engine/heat.js';
import { createRng, setDefaultSeed, useRng } from '../engine/rng.js';
import { PL10_PressRelease } from '../data/plays.js';
import { createCampaign, runFullCampaign } from '../engine/loop.js';
import { STRATEGIES } from '../engine/strategies.js';
import { pressOffered } from '../ui/paint-play.js';
import type { GameState, PlayCard } from '../engine/types.js';

let failed = 0;
function assert(cond: boolean, msg: string): void {
  if (cond) console.log(`PASS: ${msg}`);
  else {
    console.error(`FAIL: ${msg}`);
    failed++;
  }
}

console.log('=== CANDIDATE ZERO — Heat / press-your-luck ===\n');

// PL10 is itself SAFE, so the non-SAFE assertions below need a card that is
// genuinely STD — testing "a press costs band" against a SAFE card proves
// nothing, which is exactly what the first draft of this harness did.
const SAFE_CARD: PlayCard = {
  ...PL10_PressRelease,
  id: 'TESTSAFE',
  risk: 'SAFE',
  odds: () => 0.5
};
const STD_CARD: PlayCard = {
  ...PL10_PressRelease,
  id: 'TESTSTD',
  risk: 'STD',
  odds: () => 0.5
};
const LONGSHOT: PlayCard = {
  ...PL10_PressRelease,
  id: 'TESTLONG',
  risk: 'STD',
  odds: () => 0.05
};

// --- Banking: landing builds, failing wipes ---
{
  const s = createNewState({ seed: 1 });
  assert(heatOf(s) === 0, 'a run starts with no heat banked');
  assert(!canPress(s), 'nothing to press before you have landed anything');

  bankHeat(s, 1);
  assert(heatOf(s) === 1, 'a GAIN banks heat');
  bankHeat(s, 0);
  assert(heatOf(s) === 2, 'a BREAKTHROUGH banks heat');
  bankHeat(s, 2);
  assert(heatOf(s) === 0, 'a SETBACK wipes the meter');

  for (let i = 0; i < 10; i++) bankHeat(s, 1);
  assert(heatOf(s) === MAX_HEAT, `heat is capped (${MAX_HEAT}) — no unbounded wager`);
  bankHeat(s, 3);
  assert(heatOf(s) === 0, 'a DISASTER wipes the meter');
}

// --- COVENANT 4a: failures grant nothing. This is the whole no-pity clause. ---
{
  const s = createNewState({ seed: 2 });
  let everPositive = false;
  for (let i = 0; i < 25; i++) {
    bankHeat(s, i % 2 === 0 ? 2 : 3); // nothing but setbacks and disasters
    if (heatOf(s) > 0) everPositive = true;
  }
  assert(
    !everPositive && heatOf(s) === 0,
    'a losing streak banks exactly zero — the system never pays you for failing'
  );
  assert(
    pressOddsBonus(0) === 0 && pressBandPenalty(0, 'STD') === 0,
    'zero heat buys zero — there is no floor of free help'
  );
}

// --- Save/replay safety ---
{
  const s = createNewState({ seed: 3 });
  bankHeat(s, 1);
  bankHeat(s, 1);
  const round = JSON.parse(JSON.stringify(s)) as GameState;
  assert(heatOf(round) === 2, 'heat survives a JSON round trip');
}

// --- COVENANT 4b: banked heat is inert until spent ---
{
  function playWith(heat: number, press: boolean): { p: number; roll: number; band: number } {
    useRng(createRng(9090));
    setDefaultSeed(9090);
    const s = createNewState({ seed: 9090, ap: 9, money: 9000, volPool: 9 });
    s.heat = heat;
    const out = executePlay(s, PL10_PressRelease, undefined, { press });
    return { p: out.p ?? -1, roll: out.roll ?? -1, band: -1 };
  }
  const cold = playWith(0, false);
  const banked = playWith(MAX_HEAT, false);
  const spent = playWith(MAX_HEAT, true);

  assert(
    cold.p === banked.p,
    `heat sitting in the bank changes nothing (p ${cold.p.toFixed(3)} vs ${banked.p.toFixed(3)}) — it is a choice, not a drift`
  );
  assert(
    spent.p > banked.p,
    `spending it moves the odds going in (${banked.p.toFixed(3)} -> ${spent.p.toFixed(3)})`
  );
  // COVENANT 4c: the roll is one honest uniform draw either way.
  assert(
    cold.roll === banked.roll && banked.roll === spent.roll,
    `the underlying roll is identical pressed or not (${spent.roll}) — no thumb on the dice`
  );
}

// --- Pressing spends the stake, win or lose ---
{
  for (const seed of [11, 12, 13, 14, 15]) {
    useRng(createRng(seed));
    setDefaultSeed(seed);
    const s = createNewState({ seed, ap: 9, money: 9000, volPool: 9 });
    s.heat = 3;
    const out = executePlay(s, LONGSHOT, undefined, { press: true });
    const landed = (out.tier ?? 9) <= 1;
    // Spent to 0, then the outcome re-banks: 1 on a landing, 0 on a failure.
    assert(
      heatOf(s) === (landed ? 1 : 0),
      `seed ${seed}: a press is spent whatever the roll said (tier ${out.tier}, heat now ${heatOf(s)})`
    );
  }
}

// --- Pressing with nothing banked is a no-op, not a free win ---
{
  useRng(createRng(77));
  setDefaultSeed(77);
  const a = createNewState({ seed: 77, ap: 9, money: 9000, volPool: 9 });
  const outA = executePlay(a, PL10_PressRelease, undefined, { press: true });
  useRng(createRng(77));
  setDefaultSeed(77);
  const b = createNewState({ seed: 77, ap: 9, money: 9000, volPool: 9 });
  const outB = executePlay(b, PL10_PressRelease, undefined, { press: false });
  assert(outA.p === outB.p, 'pressing on an empty meter buys nothing');
}

// --- COVENANT 5: a pressed SAFE card is still safe ---
{
  const s = createNewState({ seed: 4 });
  s.heat = MAX_HEAT;
  const q = quotePress(s, SAFE_CARD);
  assert(q.odds > 0, 'pressing a SAFE card still buys odds');
  assert(q.band === 0, 'pressing a SAFE card buys no disaster band');

  // Prove it at the only place band is decided, across the whole roll space.
  let safeDisasters = 0;
  for (let i = 0; i <= 100; i++) {
    const r = resolve(0.5, 'SAFE', s, i / 100, pressBandPenalty(MAX_HEAT, 'STD'));
    if (r.tier === 3) safeDisasters++;
  }
  assert(
    safeDisasters === 0,
    'resolve() refuses a press band on SAFE — no roll in [0,1] produces DISASTER'
  );

  // And that the band it refuses is real for a non-SAFE class.
  let stdDisasters = 0;
  for (let i = 0; i <= 100; i++) {
    const r = resolve(0.5, 'STD', s, i / 100, pressBandPenalty(MAX_HEAT, 'STD'));
    if (r.tier === 3) stdDisasters++;
  }
  assert(stdDisasters > 0, 'the same press band does widen DISASTER for STD — the guard is real, not vacuous');
}

// --- The wager is symmetric: it buys risk as well as odds ---
{
  const s = createNewState({ seed: 5 });
  s.heat = MAX_HEAT;
  const q = quotePress(s, STD_CARD);
  assert(q.band > 0, 'a non-SAFE press costs disaster band');
  // Find the rolls the wager actually moved rather than guessing one: a roll
  // high enough to fall in the widened band but not the base one.
  let flipped = 0;
  let plainDisasters = 0;
  let pressedDisasters = 0;
  for (let i = 0; i <= 1000; i++) {
    const r = i / 1000;
    const plain = resolve(0.5, 'STD', s, r, 0);
    const pressed = resolve(0.5, 'STD', s, r, q.band);
    if (plain.tier === 3) plainDisasters++;
    if (pressed.tier === 3) pressedDisasters++;
    if (plain.tier !== 3 && pressed.tier === 3) flipped++;
  }
  assert(
    flipped > 0,
    `pressing turns rolls that were SETBACKs into DISASTERs (${flipped}/1001 of the roll space)`
  );
  assert(
    pressedDisasters > plainDisasters,
    `the pressed disaster band is strictly wider (${plainDisasters} -> ${pressedDisasters} of 1001 rolls)`
  );
}

// --- The payout curve is superlinear, which is the whole reason to hold ---
// A flat per-point rate makes pressing at 1 nearly free and nearly pointless,
// so there is never a reason to bank — measured across 1200 seeds, every press
// policy landed inside one standard error of never pressing. The curve has to
// reward patience or the meter is decoration.
{
  const odds = [0, 1, 2, 3, 4].map(h => pressOddsBonus(h));
  const band = [0, 1, 2, 3, 4].map(h => pressBandPenalty(h, 'STD'));
  let monotonic = true;
  let accelerating = true;
  for (let h = 1; h <= MAX_HEAT; h++) {
    if (odds[h]! <= odds[h - 1]!) monotonic = false;
    if (band[h]! <= band[h - 1]!) monotonic = false;
    // Each step must buy strictly more than the one before it.
    if (h >= 2 && odds[h]! - odds[h - 1]! <= odds[h - 1]! - odds[h - 2]!) accelerating = false;
  }
  assert(monotonic, `more heat always buys more, and costs more (${odds.join(', ')})`);
  assert(
    accelerating,
    `the payout accelerates, so holding beats spending early (${odds.map(o => o.toFixed(2)).join(' -> ')})`
  );
  assert(
    odds[MAX_HEAT]! > odds[1]! * MAX_HEAT,
    `a full stake beats ${MAX_HEAT} small ones (${odds[MAX_HEAT]} vs ${(odds[1]! * MAX_HEAT).toFixed(2)})`
  );
}

// --- Copy never claims a soft roll ---
{
  const s = createNewState({ seed: 6 });
  assert(/land a play/i.test(pressLabel(quotePress(s, PL10_PressRelease))), 'empty-meter copy explains how to earn it');
  s.heat = 3;
  const std = pressLabel(quotePress(s, STD_CARD));
  const safe = pressLabel(quotePress(s, SAFE_CARD));
  assert(/disaster/i.test(std), `non-SAFE press copy states the downside (${JSON.stringify(std)})`);
  assert(!/disaster/i.test(safe) && /safe/i.test(safe), `SAFE press copy promises no downside (${JSON.stringify(safe)})`);
  assert(
    !/guarantee|sure thing|can't lose|cannot lose/i.test(`${std} ${safe}`),
    'press copy never promises a soft roll'
  );
}

// --- THE WAGER IS NOT OFFERED ON A CARD YOU CANNOT PLAY (DEFERRED A7) ---
//
// I previously "verified" this by reading the condition and then wrote it down
// as an honest gap rather than constructing the case. The reason it was awkward
// to construct is that the rule was an inline expression inside a DOM painter;
// it is now `pressOffered`, so it is just a table.
//
// The locked clause matters because a locked card renders with a DISABLED Play
// button. A live press control beside it invites the player to arm a wager on a
// play that can never resolve.
{
  const base = { locked: false, isDraftOption: false, hasOdds: true, heat: 2 };
  assert(pressOffered(base), 'a playable, odds-bearing card with heat offers the wager');
  assert(!pressOffered({ ...base, locked: true }), 'a LOCKED card never offers the wager');
  assert(
    !pressOffered({ ...base, locked: true, heat: MAX_HEAT }),
    'not even at full heat — the lock outranks the stake'
  );
  assert(!pressOffered({ ...base, heat: 0 }), 'no heat banked, nothing to wager');
  assert(!pressOffered({ ...base, hasOdds: false }), 'a card with no odds of its own is not a wager');
  assert(
    !pressOffered({ ...base, isDraftOption: true }),
    'a draft option is a choice about the deck, not a play to press'
  );
}

// --- THE WAGER MUST BE REACHABLE FROM A PLAY LOOP (DEFERRED A1) ---
//
// `runWeek` called `playFromHand` with no opts, so NO automated path could
// press. Press existed only for the UI. Every measurement behind A1's "pressing
// buys drama, not advantage" was therefore comparing two identical runs, and
// two independent measurements of nothing agreed with each other.
//
// This is the cheap deterministic guard against that returning: same seed, one
// chooser that presses and one that does not, and the pressing run must
// actually log presses.
{
  function pressedLines(press: boolean): number {
    useRng(createRng(4242));
    setDefaultSeed(4242);
    const c = createCampaign({ seed: 4242 });
    runFullCampaign(c, (playable, state) => {
      const pick = STRATEGIES.hybrid!(playable, state);
      if (pick === null || pick === undefined) return pick;
      const idx = typeof pick === 'number' ? pick : pick.index;
      return { index: idx, press: press && heatOf(state) >= 1 };
    });
    return c.state.log.filter(l => /Pressed \d/.test(l.text)).length;
  }
  const withPress = pressedLines(true);
  const without = pressedLines(false);
  assert(withPress > 0, `a pressing chooser actually presses through runWeek (${withPress} presses)`);
  assert(without === 0, `and a non-pressing chooser never does (${without})`);
}

// --- AND IT MUST BE WORTH SOMETHING (DEFERRED A1) ---
//
// Measured at n=5000 per arm on the hybrid strategy: never press 33.6% wins,
// hold-to-4-and-cash 36.2% (+2.6pp, outside 2 SE). Every press policy tested
// came out positive, and "press only at 4" was the best of them — which is
// exactly what the superlinear PRESS_ODDS curve was designed to produce.
//
// Raising the payout 40% (0.24 -> 0.34 at full heat) did NOT increase that
// edge; it stayed ~+3pp. The ceiling is structural, not a tuning knob, so the
// curve was left where it is rather than inflated for a number that does not
// move.
//
// n here is small enough to run in a gate, so the assertion is deliberately
// weak: it catches "pressing became a trap", not a one-point drift.
{
  function winRate(policy: (h: number) => boolean, trials: number): number {
    let won = 0;
    for (let i = 0; i < trials; i++) {
      const seed = 20_000 + i * 31;
      useRng(createRng(seed));
      setDefaultSeed(seed);
      const c = createCampaign({ seed });
      runFullCampaign(c, (playable, state) => {
        const pick = STRATEGIES.hybrid!(playable, state);
        if (pick === null || pick === undefined) return pick;
        const idx = typeof pick === 'number' ? pick : pick.index;
        return { index: idx, press: policy(heatOf(state)) };
      });
      const o = c.state.outcome ?? '';
      if (o === 'won_general' || o.startsWith('session_')) won++;
    }
    return (100 * won) / trials;
  }
  const N = 400;
  const never = winRate(() => false, N);
  const holdToMax = winRate(h => h >= MAX_HEAT, N);
  console.log(`  press EV probe (n=${N}/arm): never ${never.toFixed(1)}% · hold-to-${MAX_HEAT} ${holdToMax.toFixed(1)}%`);
  assert(
    holdToMax >= never - 5,
    `holding to full heat and cashing in is not a trap — never ${never.toFixed(1)}% vs ` +
      `hold ${holdToMax.toFixed(1)}% (measured +2.6pp at n=5000; this gate only catches a real inversion)`
  );
}

if (failed) {
  console.error(`\nHeat harness FAILED — ${failed} assertion(s)`);
  process.exit(1);
}
console.log('\nHeat / press-your-luck green.');
