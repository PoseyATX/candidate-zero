/**
 * Promo / supporter cards — not Main Deck.
 * Injected at extreme rarity; never in the normal weekly growth pool.
 *
 * To add a new promo card:
 *   1. Define it below with `kind: 'promo'`, `show: () => false`, and a
 *      `promoRate` (0–1 chance rolled once per weekly growth pass — see
 *      engine/promo.ts, which auto-discovers every card in PROMO_PLAYS
 *      with a promoRate set).
 *   2. Add it to the PROMO_PLAYS array below.
 *   3. For full-bleed art (art fills the whole card, no name/cost chrome),
 *      set `fullBleedArt: true` and drop `<id>.svg` in
 *      src/assets/full-art/ — see card-face.ts. Nothing else changes.
 *   4. Proof/QA: load the game with `?promo=<id>` to force that card into
 *      the opening hand instead of waiting on the roll.
 */

import type { PlayCard } from '../engine/types.js';

/**
 * PR01 — More Than Just a Pretty Face
 * Supporter promo. Free. Next three odds-bearing plays are breakthroughs.
 * Draw: ~0.1% on weekly inject (or ?promo=PR01 for proof).
 * Full-bleed pink face is the only special signal — no badge text.
 */
export const PR01_PrettyFace: PlayCard = {
  id: 'PR01',
  n: 'More Than Just a Pretty Face',
  cost: {},
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'a favor',
  kind: 'promo',
  rarity: 'rare',
  residency: 'special',
  control: 'player',
  attrs: ['CHA'],
  d:
    'A favor from someone who can afford to be kind. The next three real plays you make land as breakthroughs. They asked for nothing on the card. Remember the name.',
  // Never in the normal available pool — inject only.
  show: () => false,
  promoRate: 0.001,
  fullBleedArt: true,
  odds: () => 0.99,
  run: (s) => {
    s.sessionFlags = s.sessionFlags || {};
    s.sessionFlags.prettyFaceCharges = 3;
    return (
      'More Than Just a Pretty Face — the next three real plays break through. ' +
      'Three charges. Use them.'
    );
  }
};

export const PROMO_PLAYS: PlayCard[] = [PR01_PrettyFace];
