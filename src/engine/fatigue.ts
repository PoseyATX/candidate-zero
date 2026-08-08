/**
 * CANDIDATE ZERO — the room gets tired of the same move.
 *
 * A fourteen-week session played through the harness reads like this:
 *
 *     W2  Whip a Vote Trade   W3  Whip a Vote Trade ×2
 *     W8  Whip a Vote Trade ×2   W9  Whip a Vote Trade
 *     W13 Whip a Vote Trade ×2   W14 Whip a Vote Trade ×2
 *
 * Fourteen plays of one card at full value, because nothing in the game made
 * the second one worth less than the first. Field work already had an answer —
 * `getGroundPenalty` halves rapport when you work the same ground twice in a
 * week — but it is scoped to ground, so every card played from camp or under
 * the dome could be run forever. When a play never degrades, the optimal line
 * is always "find the best card, do only that", and a deckbuilder whose optimal
 * line is a single card is not a deckbuilder.
 *
 * The model is a tired room, not a cooldown. Nothing is ever blocked:
 *
 *   · each play of a card adds a point of fatigue;
 *   · every week start, half the fatigue sheds;
 *   · odds take a penalty proportional to fatigue, capped.
 *
 * So once a week is nearly free (fatigue settles at exactly 1, −6pp), three
 * times a week settles at 3 (−18pp), and four quiet weeks bring a card all the
 * way back to clean. That is the actual Texas fact underneath it: you can whip
 * the same trade every week of the session, and by May people stop picking up.
 */

import type { GameState, PlayCard } from './types.js';

/** Odds cost per point of accumulated fatigue. */
const PER_POINT = 0.06;

/** However tired the room is, a play never falls off a cliff. */
export const MAX_FATIGUE_PENALTY = 0.3;

/**
 * Fraction of fatigue carried into the next week — half of it sheds.
 *
 * Half, not 40%, because the arithmetic has to actually deliver the design the
 * comment above promises. At 0.6 a card played four times took SEVEN quiet
 * weeks to come back, which in a fourteen-week session means it never does.
 * At 0.5 the steady state for a once-a-week card is exactly 1 point (f =
 * (f+1)/2), so leaning on something weekly costs a flat ~6pp, three times a
 * week settles at 3 points (~18pp), and a rested card is clean in four weeks.
 */
const WEEKLY_DECAY = 0.5;

/**
 * Cards exempt from fatigue.
 *
 * Knock is the floor of the risk ladder and a standing invariant: it must stay
 * reliable at every depth, including the depth where you have played it nine
 * times because nothing else was affordable. Fatiguing the fallback would take
 * away the one thing a player can always do.
 *
 * The ballot doors are exempt because they are not repeatable plays at all —
 * they resolve once and the run moves on.
 */
const EXEMPT = new Set(['PL40', 'PL04', 'PL05']);

export function isFatigueExempt(cardId: string): boolean {
  return EXEMPT.has(cardId);
}

function log(state: GameState): Record<string, number> {
  if (!state.cardFatigue) state.cardFatigue = {};
  return state.cardFatigue;
}

export function fatigueOf(state: GameState, cardId: string): number {
  return state.cardFatigue?.[cardId] ?? 0;
}

/** The odds this card has lost to repetition. Always ≥ 0. */
export function fatiguePenalty(state: GameState, card: PlayCard): number {
  if (isFatigueExempt(card.id)) return 0;
  const f = fatigueOf(state, card.id);
  if (f <= 0) return 0;
  return Math.min(MAX_FATIGUE_PENALTY, f * PER_POINT);
}

/** Record a play. Called after the play commits, win or lose. */
export function noteFatigue(state: GameState, card: PlayCard): void {
  if (isFatigueExempt(card.id)) return;
  const l = log(state);
  l[card.id] = (l[card.id] ?? 0) + 1;
}

/**
 * Week turns over: the room forgets a little. Cards rested for a couple of
 * weeks come back to full strength on their own — there is nothing to manage
 * and nothing to click.
 */
export function decayFatigue(state: GameState): void {
  const l = state.cardFatigue;
  if (!l) return;
  for (const id of Object.keys(l)) {
    const next = (l[id] ?? 0) * WEEKLY_DECAY;
    // Below this the penalty is under two points — not "almost
    // recovered", recovered. Leaving epsilons around means a card is quietly
    // never clean again.
    if (next < 0.3) delete l[id];
    else l[id] = next;
  }
}

/**
 * Player-facing reason, '' when the card is fresh.
 *
 * This must be readable copy, not a number: the point is that the room is tired
 * of you, and "−12pp (fatigue 2.0)" is a spreadsheet saying so.
 */
export function fatigueNote(state: GameState, card: PlayCard): string {
  const pen = fatiguePenalty(state, card);
  if (pen <= 0.02) return '';
  const pp = Math.round(pen * 100);
  if (pen >= MAX_FATIGUE_PENALTY - 0.001) {
    return `They have heard this one. Worth ${pp} points less until you leave it alone for a while.`;
  }
  if (pen >= 0.15) {
    return `You have run this a lot lately — ${pp} points off while it is this familiar.`;
  }
  return `Slightly stale — ${pp} points off. A quiet week brings it back.`;
}
