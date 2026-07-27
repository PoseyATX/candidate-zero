/**
 * CANDIDATE ZERO — Deck flow: agency over the shuffle.
 *
 * The complaint this answers (DESIGN-DIRECTIONS #6): the deck functioned as a
 * menu. Five cards arrived at week start, you played what you could afford, the
 * rest were discarded. There was no draw, cycle, retain, or tutor, so the deck's
 * only job was to randomise which five — and the player had no say in it.
 *
 * That mattered more once two other systems shipped. Upgrades give you a reason
 * to want one *specific* card, and heat rewards chaining landings; both are
 * hostage to the shuffle if you cannot dig. This is the missing piece.
 *
 * The mechanic: a small number of discards per week. Pitch a card, it goes to
 * the discard pile, you draw one replacement. Free in AP — the per-week limit is
 * the whole cost, which makes it a question of *when*, not *whether*.
 *
 * NOT A COVENANT PROBLEM, and the distinction is worth stating because it looks
 * adjacent to one: this rerolls a *draw*, never a *roll*. Nothing here touches
 * resolve(), p, the bands, or heat. Covenant 4 is about the dice being honest;
 * shuffling your own hand is not the dice.
 */

import type { DeckState, GameState } from './types.js';
import { drawCards, discardCard } from './deck.js';

/** Discards per week. The limit is the cost — cycling never spends AP. */
export const MAX_DISCARDS = 2;

/**
 * Ballot-access cards. `ensureBallotAccessInHand` (loop.ts) quietly guarantees
 * the shuffle cannot lock you out of the ballot, but it only runs at week start
 * — so a mid-week pitch of your last one would slip straight past it.
 */
const BALLOT_ACCESS = new Set(['PL04', 'PL05']);

export function discardsUsed(state: GameState): number {
  return Math.max(0, state.discardsUsed ?? 0);
}

export function discardsLeft(state: GameState): number {
  return Math.max(0, MAX_DISCARDS - discardsUsed(state));
}

/** Called at week start — the single reset point. */
export function resetDiscards(state: GameState): void {
  state.discardsUsed = 0;
}

/**
 * Why this card cannot be pitched right now, or '' when it can.
 *
 * Returns a player-facing reason rather than a bare boolean so the UI never has
 * to invent copy for a rule it does not own — same pattern as groundLockReason.
 */
export function cycleBlockReason(
  state: GameState,
  deck: DeckState,
  handIndex: number
): string {
  if (handIndex < 0) return 'Camp and shop actions are not cards you can pitch';
  const id = deck.hand[handIndex];
  if (id === undefined) return 'No such card in hand';
  if (discardsLeft(state) <= 0) return 'No cuts left this week';
  if (deck.hand.length <= 1) return 'You cannot pitch your last card';
  // The safety net above, enforced at the one place it can be circumvented.
  // Re-running ensureBallotAccessInHand after a pitch would be worse: there are
  // five PL04s, so it would haul another one straight back and the pitch would
  // be a confusing no-op that still burned a cut.
  if (!state.ballot && BALLOT_ACCESS.has(id)) {
    const others = deck.hand.filter((h, i) => i !== handIndex && BALLOT_ACCESS.has(h));
    if (others.length === 0) return 'This is your way onto the ballot — keep it';
  }
  return '';
}

export function canCycle(state: GameState, deck: DeckState, handIndex: number): boolean {
  return cycleBlockReason(state, deck, handIndex) === '';
}

export interface CycleResult {
  ok: boolean;
  reason?: string;
  /** The card pitched. */
  pitched?: string;
  /** The card drawn to replace it, or undefined when the deck had nothing left. */
  drew?: string;
}

/**
 * Pitch one card and draw one replacement. The single writer for discardsUsed,
 * so the counter can never drift from the cuts that were actually taken.
 */
export function cycleCard(
  state: GameState,
  deck: DeckState,
  handIndex: number,
  /** Card id -> display name. The catalog lives a layer up (loop.ts), and a log
   *  line that reads "Cut PL06, drew PL01" is not written for a player. */
  nameOf: (id: string) => string = id => id
): CycleResult {
  const reason = cycleBlockReason(state, deck, handIndex);
  if (reason) return { ok: false, reason };

  const [pitched] = deck.hand.splice(handIndex, 1);
  if (pitched === undefined) return { ok: false, reason: 'No such card in hand' };
  discardCard(deck, pitched);
  state.discardsUsed = discardsUsed(state) + 1;

  // drawCards reshuffles the discard pile when the draw pile runs dry, so the
  // card just pitched can legitimately come back — that is the deck being a
  // deck, not a bug. It can also draw nothing if the whole deck is in hand.
  const [drew] = drawCards(deck, 1);

  state.log.push({
    week: state.week,
    kind: 'draw',
    text: drew
      ? `Cut ${nameOf(pitched)}, drew ${nameOf(drew)}. ${discardsLeft(state)} cut${discardsLeft(state) === 1 ? '' : 's'} left this week.`
      : `Cut ${nameOf(pitched)} — nothing left to draw. ${discardsLeft(state)} cut${discardsLeft(state) === 1 ? '' : 's'} left this week.`
  });

  return { ok: true, pitched, drew };
}
