/**
 * Promo / supporter cards — not Main Deck.
 * Injected at extreme rarity; never in the normal weekly growth pool.
 */

import type { PlayCard } from '../engine/types.js';

/**
 * PR01 — More Than Just a Pretty Face
 * Supporter promo. Free. Next three odds-bearing plays are breakthroughs.
 * Draw: ~0.1% on weekly inject (or ?pr01=1 for proof).
 * No "ultra promo" chrome — pink face is the only signal.
 */
export const PR01_PrettyFace: PlayCard = {
  id: 'PR01',
  n: 'More Than Just a Pretty Face',
  cost: {},
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'a favor',
  kind: 'action',
  rarity: 'rare',
  residency: 'special',
  control: 'player',
  attrs: ['CHA'],
  d:
    'A favor from someone who can afford to be kind. The next three real plays you make land as breakthroughs. They asked for nothing on the card. Remember the name.',
  // Never in the normal available pool — inject only.
  show: () => false,
  odds: () => 0.99,
  run: (s) => {
    s.sessionFlags = s.sessionFlags || {};
    s.sessionFlags.prettyFaceCharges = 3;
    s.sessionFlags.prettyFaceSeen = 1;
    return (
      'MORE THAN JUST A PRETTY FACE — the next three real plays break through. ' +
      'Three charges. Use them.'
    );
  }
};

export const PROMO_PLAYS: PlayCard[] = [PR01_PrettyFace];
