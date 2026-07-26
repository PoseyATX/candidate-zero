/**
 * Promo inject helpers — extreme rarity cards kept out of the normal pool.
 */

import { random } from './rng.js';
import type { DeckState, GameState } from './types.js';
import { injectIntoDrawPile } from './deck.js';

const PROMO_RATE = 0.001; // 0.1%

/** True if this run has already seen / owns PR01. */
export function prettyFaceAlready(state: GameState): boolean {
  if (Number(state.sessionFlags?.prettyFaceSeen || 0) > 0) return true;
  if (state.deck?.includes('PR01')) return true;
  return false;
}

/**
 * ~0.1% chance per weekly growth pass to inject PR01 into the deck + draw pile.
 * Once per run max. Does not go through getAvailableNewCards (show:false).
 */
export function maybeInjectPrettyFace(
  state: GameState,
  deck?: DeckState,
  force = false
): string | null {
  if (prettyFaceAlready(state)) return null;
  if (!force && random() >= PROMO_RATE) return null;
  state.sessionFlags = state.sessionFlags || {};
  state.sessionFlags.prettyFaceSeen = 1;
  if (!state.deck) state.deck = [];
  if (deck) {
    injectIntoDrawPile(deck, state, ['PR01']);
    // Prefer hand so the player can see it this week
    if (!deck.hand.includes('PR01')) {
      const i = deck.draw.indexOf('PR01');
      if (i >= 0) {
        deck.draw.splice(i, 1);
        deck.hand.push('PR01');
      }
    }
  } else if (!state.deck.includes('PR01')) {
    state.deck.push('PR01');
  }
  state.log.push({
    week: state.week,
    kind: 'note',
    text: 'A pink card finds the stack — More Than Just a Pretty Face.'
  });
  return 'PR01';
}
