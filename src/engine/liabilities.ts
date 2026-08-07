/**
 * CANDIDATE ZERO — liabilities, which are cards, and are in your hand.
 *
 * A liability is not a status effect and not a debuff counter. It is one of the
 * ten cards you started with, it occupies a space in a five-card hand, and what
 * makes it hurt is that it is *there* — Rigidity shuts off trading while you are
 * holding it, No Standing fails anything that runs on your own credibility while
 * you are holding it. Not while you own it. While it is in your hand.
 *
 * That distinction is the whole mechanism, and it is why the engine needs to see
 * the hand. `state.handIds` is a mirror of the physical hand, synced by the loop
 * whenever the hand changes, so pure functions in engine/ can read it without
 * threading DeckState through every signature.
 *
 * The way out is to play the card. That costs real actions at a moment you did
 * not choose, and it is the only removal path in the game (spec §4.3) — nothing
 * here is a menu.
 */

import type { GameState, PlayCard } from './types.js';

/** Blocks bargains, favor spending, and anything that trades. */
export const RIGIDITY = 'PL53';
/** Blocks plays that rest on the player's own standing. */
export const NO_STANDING = 'PL57';

/** Cards whose whole point is being stuck in your hand. */
export const HAND_LIABILITIES = new Set([RIGIDITY, NO_STANDING]);

/** Is this liability currently in hand (not merely owned)? */
export function holding(state: GameState, cardId: string): boolean {
  return (state.handIds ?? []).includes(cardId);
}

/**
 * A play "trades" if it spends favors, spends a bargain, or is a bargain kind.
 * Rigidity refuses all of it — you are not able to make deals, which is exactly
 * why people believe you.
 */
function isTrade(card: PlayCard): boolean {
  if (card.kind === 'bargain') return true;
  if ((card.cost?.fav ?? 0) > 0) return true;
  return false;
}

/**
 * A play "rests on standing" if it asks a room to take the player seriously as
 * a principal — bargains, ally recruitment, and anything spending favors.
 * Borrowed authority is exempt: The Boss's Name works precisely because it is
 * not yours.
 */
function needsStanding(card: PlayCard): boolean {
  if (card.id === 'PL56') return false; // borrowed, and that is the point
  if (card.kind === 'bargain' || card.kind === 'ally') return true;
  if ((card.cost?.fav ?? 0) > 0) return true;
  return false;
}

/**
 * Why this card cannot be played right now because of what is in hand.
 * Empty string when nothing is blocking it.
 *
 * A liability never blocks itself — playing it is the way out.
 */
export function liabilityBlockReason(state: GameState, card: PlayCard): string {
  if (HAND_LIABILITIES.has(card.id)) return '';

  if (holding(state, RIGIDITY) && isTrade(card)) {
    return 'You cannot make that trade while you are the person who does not make trades.';
  }
  if (holding(state, NO_STANDING) && needsStanding(card)) {
    return 'They are still hearing you as staff. That needs standing you do not have yet.';
  }
  return '';
}

/** Is any hand liability currently biting? Used by the HUD, never announced. */
export function activeLiabilityIds(state: GameState): string[] {
  return [...HAND_LIABILITIES].filter(id => holding(state, id));
}

/**
 * Mirror the physical hand onto state so pure engine functions can read it.
 * Called by the loop wherever the hand changes.
 */
export function syncHand(state: GameState, hand: string[]): void {
  state.handIds = [...hand];
}
