/**
 * CANDIDATE ZERO — the table has spaces, not cards.
 *
 * The table was a card display. It is a set of places you can put a card down,
 * and there are three of them. That is the scarce resource in this game — not
 * the action points, not the money. Three things happen this week. Choose.
 *
 * WHY THIS MATTERS, since it is the load-bearing half of the deck-building:
 * a hand full of one-AP cards is a hand that cannot answer anything. Cheap cards
 * are tuned to roughly a quarter of the impact of expensive ones, and they cost
 * the SAME slot, so a deck stuffed with them fills your three spaces with small
 * change and then the week where something real happens arrives and you have
 * nothing to put down. That is intended. It is not softened anywhere and it
 * should not be.
 *
 * Slots are spent by cards played from the hand — the table. Camp and shop
 * actions are not physical cards and do not take a space; they were never on
 * the table.
 */

import type { GameState } from './types.js';

/** Spaces on the table at the shallowest depth. */
export const BASE_SLOTS = 3;

/** The table never grows past this, however deep the run goes. */
export const MAX_SLOTS = 4;

/**
 * How many spaces the table has this week.
 *
 * A fourth space is the single accretion the table ever gets, and it comes from
 * having built something — a real machine and a district that knows you — not
 * from a tier, a level, or an unlock. It is never announced; the week it
 * happens the player simply finds they can put down one more thing.
 */
export function slotsThisWeek(state: GameState): number {
  let slots = BASE_SLOTS;
  const built =
    (state.allies?.length ?? 0) >= 4 &&
    (state.nameID ?? 0) >= 45 &&
    (state.contacts ?? 0) >= 600;
  if (built) slots += 1;
  return Math.min(MAX_SLOTS, slots);
}

export function slotsUsed(state: GameState): number {
  return Number(state.slotsUsed ?? 0);
}

export function slotsLeft(state: GameState): number {
  return Math.max(0, slotsThisWeek(state) - slotsUsed(state));
}

/** Fresh table every week. */
export function resetSlots(state: GameState): void {
  state.slotsUsed = 0;
}

/** Take a space. Callers must have checked slotsLeft first. */
export function useSlot(state: GameState): void {
  state.slotsUsed = slotsUsed(state) + 1;
}

/** Why the table cannot take another card, '' when it can. */
export function slotBlockReason(state: GameState): string {
  if (slotsLeft(state) > 0) return '';
  return 'The table is full. Nothing else goes down this week.';
}
