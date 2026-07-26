/**
 * Promo inject helpers — extreme rarity cards kept out of the normal pool.
 *
 * Adding a new promo card needs no changes here: give the card's data (in
 * data/promo-plays.ts) a `promoRate` (0–1 chance per weekly growth pass) and
 * it's automatically picked up by maybeInjectPromoCards below.
 */

import { random } from './rng.js';
import type { DeckState, GameState } from './types.js';
import { injectIntoDrawPile } from './deck.js';
import { PROMO_PLAYS } from '../data/promo-plays.js';

/** Promo cards that roll for auto-injection each weekly growth pass. */
const INJECTABLE_PROMOS = PROMO_PLAYS.filter(c => typeof c.promoRate === 'number');

function sessionFlagKey(cardId: string): string {
  return `promoSeen:${cardId}`;
}

/** True if this run has already been offered (or owns) the given promo card. */
export function promoAlready(state: GameState, cardId: string): boolean {
  if (Number(state.sessionFlags?.[sessionFlagKey(cardId)] || 0) > 0) return true;
  if (state.deck?.includes(cardId)) return true;
  return false;
}

/** True if this run has already seen / owns PR01 specifically. */
export function prettyFaceAlready(state: GameState): boolean {
  return promoAlready(state, 'PR01');
}

/**
 * Rolls every registered promo card's own promoRate once per weekly growth
 * pass; the first hit is injected into the deck (+ draw pile / hand when a
 * DeckState is given). Each promo can land at most once per run.
 * `forceId` (case-insensitive) bypasses the roll for QA/proof purposes.
 */
export function maybeInjectPromoCards(
  state: GameState,
  deck?: DeckState,
  forceId?: string | null
): string | null {
  const forced = forceId ? forceId.toLowerCase() : null;
  for (const card of INJECTABLE_PROMOS) {
    if (promoAlready(state, card.id)) continue;
    const hit = forced ? card.id.toLowerCase() === forced : random() < (card.promoRate ?? 0);
    if (!hit) continue;
    state.sessionFlags = state.sessionFlags || {};
    state.sessionFlags[sessionFlagKey(card.id)] = 1;
    if (!state.deck) state.deck = [];
    if (deck) {
      injectIntoDrawPile(deck, state, [card.id]);
      // Prefer hand so the player can see it this week
      if (!deck.hand.includes(card.id)) {
        const i = deck.draw.indexOf(card.id);
        if (i >= 0) {
          deck.draw.splice(i, 1);
          deck.hand.push(card.id);
        }
      }
    } else if (!state.deck.includes(card.id)) {
      state.deck.push(card.id);
    }
    state.log.push({
      week: state.week,
      kind: 'note',
      text: `A rare card finds the stack — ${card.n}.`
    });
    return card.id;
  }
  return null;
}
