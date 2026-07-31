/**
 * Promo / sponsor card harness.
 * Run: npm run harness:promo
 *
 * PR01 is paid sponsor art and had NO engine test of any kind. The only gate
 * touching it was `check:card-art`, which asks whether the file exists and is
 * under 500KB — never whether the card reaches a player. It shipped rendering
 * at 366x7px (both the art plate and the raster were absolutely positioned
 * inside a row that no longer had a fixed box) and nothing noticed.
 *
 * These are the engine-side properties. The rendered box is asserted in
 * `smoke:ui`, because that is the only place it can honestly be measured.
 */

import { createNewState } from '../engine/state.js';
import { createRng, setDefaultSeed, useRng } from '../engine/rng.js';
import { maybeInjectPromoCards, promoAlready } from '../engine/promo.js';
import { PROMO_PLAYS } from '../data/promo-plays.js';
import { isVisible, isPlayable } from '../engine/play.js';
import type { GameState } from '../engine/types.js';

let failed = 0;
function assert(cond: boolean, msg: string): void {
  if (cond) console.log(`PASS: ${msg}`);
  else {
    console.error(`FAIL: ${msg}`);
    failed++;
  }
}

console.log('=== CANDIDATE ZERO — Promo / sponsor cards ===\n');

function fresh(seed = 5): GameState {
  useRng(createRng(seed));
  setDefaultSeed(seed);
  const s = createNewState({ seed });
  s.stage = 'primary';
  return s;
}

// --- Every registered promo is reachable once forced ---
{
  for (const card of PROMO_PLAYS) {
    const s = fresh();
    const got = maybeInjectPromoCards(s, undefined, card.id);
    assert(got === card.id, `${card.id} can be forced in (QA/proof path works)`);
    assert(!!s.deck?.includes(card.id), `${card.id} actually lands in the deck`);
  }
}

// --- Once per run, and never twice ---
{
  const s = fresh();
  const first = maybeInjectPromoCards(s, undefined, 'PR01');
  const second = maybeInjectPromoCards(s, undefined, 'PR01');
  assert(first === 'PR01' && second === null, 'a promo lands at most once per run');
  assert(promoAlready(s, 'PR01'), 'and the run remembers it');
}

// --- show:false must not hide it once it is in your hand ---
//
// Promo cards use show:() => false to stay out of draft/growth pools. If that
// also hid them in hand, the card would be permanently unplayable — which is
// indistinguishable from "it never showed up".
{
  const s = fresh();
  for (const card of PROMO_PLAYS) {
    assert(card.show?.(s) === false, `${card.id} stays out of the normal pool (show:false)`);
    assert(isVisible(s, card), `${card.id} is still VISIBLE once held — kind:'promo' overrides show`);
    assert(isPlayable(s, card), `${card.id} is playable when held`);
  }
}

// --- A rarity roll is never spent where the card cannot be played ---
//
// Session and waiting use their own always-available card sets, so a promo won
// during those weeks is injected somewhere the player can never reach it, and
// is then marked seen for the rest of the run. A full run spends more weeks in
// session (14) than in the whole campaign (8 + 6), so this was over half of
// every sponsor card's lifetime odds.
{
  for (const stage of ['session', 'waiting'] as const) {
    const s = fresh();
    s.stage = stage;
    const got = maybeInjectPromoCards(s, undefined, 'PR01');
    assert(got === null, `no promo roll during ${stage} — the hand is not in play there`);
    assert(!promoAlready(s, 'PR01'), `and the run's one chance is NOT burned during ${stage}`);
  }
  // The campaign stages still roll.
  for (const stage of ['primary', 'general'] as const) {
    const s = fresh();
    s.stage = stage;
    assert(
      maybeInjectPromoCards(s, undefined, 'PR01') === 'PR01',
      `${stage} still offers the card`
    );
  }
}

// --- The advertised rarity is the real rarity ---
{
  for (const card of PROMO_PLAYS) {
    if (typeof card.promoRate !== 'number') continue;
    let hits = 0;
    const TRIALS = 20_000;
    for (let i = 0; i < TRIALS; i++) {
      const s = fresh(1000 + i);
      if (maybeInjectPromoCards(s, undefined, null) === card.id) hits++;
    }
    const rate = hits / TRIALS;
    const se = Math.sqrt((card.promoRate * (1 - card.promoRate)) / TRIALS);
    console.log(
      `  ${card.id}: measured ${(100 * rate).toFixed(3)}% per roll vs advertised ` +
        `${(100 * card.promoRate).toFixed(3)}% (SE ${(100 * se).toFixed(3)}pp)`
    );
    assert(
      Math.abs(rate - card.promoRate) < 4 * se + 0.0005,
      `${card.id} fires at its stated rate — the number in the data file is the truth`
    );
  }
}

if (failed) {
  console.error(`\nPromo harness FAILED — ${failed} assertion(s)`);
  process.exit(1);
}
console.log('\nPromo / sponsor cards green.');
