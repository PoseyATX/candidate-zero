/**
 * Promo / supporter cards — not Main Deck density.
 * Injected at 0.1% (not weighted into normal weekly pool).
 */

import type { PlayCard } from '../engine/types.js';

/**
 * MORE THAN JUST A PRETTY FACE
 * Supporter promo. Next three odds-bearing plays are guaranteed breakthroughs.
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
    'A favor from someone who can afford to be kind. The next three real plays you make land as breakthroughs. They asked for nothing on the card.',
  // Visible only after the 0.1% inject puts it on the owned deck list.
  // getAvailableNewCards still won't re-offer it (already owned).
  show: s => !!(s.deck && s.deck.includes('PR01')),
  odds: () => 0.99,
  run: s => {
    s.sessionFlags = s.sessionFlags || {};
    s.sessionFlags.prettyFaceCharges = 3;
    s.sessionFlags.prettyFaceSeen = 1;
    return 'The room softens. Your next three real plays are breakthroughs.';
  }
};

export const PROMO_PLAYS: PlayCard[] = [PR01_PrettyFace];
