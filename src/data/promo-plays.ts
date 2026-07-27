/**
 * Promo / supporter cards — not Main Deck.
 * Injected at extreme rarity; never in the normal weekly growth pool.
 *
 * ADDING A SPONSOR CARD — full instructions in docs/PROMO-CARDS.md
 *
 *   1. Drop the art at src/assets/full-art/<ID>.jpg  (2:3 portrait, >=600x900;
 *      .png / .webp / .avif / .svg also work). The filename IS the card id.
 *   2. Copy the TEMPLATE block at the bottom of this file, rename it, fill in
 *      the five marked fields.
 *   3. Add your new const to the PROMO_PLAYS array on the last line.
 *   4. Preview: `npm run dev`, then open ?promo=<ID> — forces it into the
 *      opening hand so you don't wait on the odds.
 *
 * Or let the scaffold do steps 1-3:
 *   npm run promo:new -- --id PR02 --name "Card Name" --art ~/sponsor.jpg \
 *     --text "What the card does."
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

/* ---------------------------------------------------------------------------
 * TEMPLATE — copy this block, rename the const, fill in the 5 marked fields.
 * Then add your new const to PROMO_PLAYS at the bottom.
 *
 * export const PR02_SponsorName: PlayCard = {
 *   id: 'PR02',                       // (1) must match the art filename: PR02.jpg
 *   n: 'Card Title',                  // (2) shown in the brief + log
 *   tag: 'a favor',                   // (3) short flavour label
 *   d:                                // (4) the brief text players read
 *     'What this card does, in plain language.',
 *   promoRate: 0.001,                 // (5) 0.001 = 0.1% per week, once per run
 *
 *   // --- leave the rest as-is for a standard sponsor card ---
 *   cost: {},                         // free to play
 *   risk: 'SAFE',
 *   ph: [1, 2, 3],                    // legal in all three phases
 *   kind: 'promo',                    // pink shell + stays visible in hand
 *   rarity: 'rare',
 *   residency: 'special',
 *   control: 'player',
 *   show: () => false,                // keeps it out of normal draft/shop pools
 *   fullBleedArt: true,               // art fills the card, no name/cost chrome
 *   odds: () => 0.99,
 *   run: () => 'Flavour line shown when the card resolves.'
 * };
 * ------------------------------------------------------------------------- */

export const PROMO_PLAYS: PlayCard[] = [PR01_PrettyFace];
