/**
 * CANDIDATE ZERO — Heat: the press-your-luck seam.
 *
 * The complaint this answers (DESIGN-DIRECTIONS #4): resolve() is a slot
 * machine. Every interesting decision happened *before* the dice and the dice
 * decided; the player's skill expressed itself in card selection, then watched.
 * Sequencing carried no weight, because nothing a play did changed what the
 * next play was worth.
 *
 * Heat is earned by landing plays and is worth nothing until you spend it.
 * Spending it — "pressing" — buys better odds on one play and a wider disaster
 * band to pay for them, then zeroes the meter. A failure at any point wipes the
 * meter for free. So the live question stops being "which card" and becomes
 * "which card, in what order, and when do I cash in" — which is where skill
 * lives.
 *
 * COVENANT 4 (brutal, impartial RNG — no pity). Heat is not pity and the
 * difference is exact:
 *   - it is earned by *results*, never by failures. A cold streak grants zero.
 *   - it does nothing at all unless the player chooses to spend it.
 *   - it moves the odds and the band that go INTO resolve(). The roll is still
 *     one honest uniform draw, and the tier mapping is untouched.
 * A system that quietly helped you after losses would be pity. This charges you
 * for help you asked for, out loud, and takes the same wager in the other
 * direction. harness/heat.ts asserts all four of those properties.
 *
 * COVENANT 5 (SAFE means safe): pressing a SAFE card buys odds only. Its band
 * stays 0 — see resolve(), which refuses the band bonus for SAFE.
 */

import type { GameState, PlayCard, RiskClass } from './types.js';

/** Ceiling on banked heat, so a long run cannot bank an unbounded wager. */
export const MAX_HEAT = 4;

/**
 * What a press buys and costs, indexed by heat spent. Deliberately NOT linear.
 *
 * A flat per-point rate made the meter boring in exactly the way that matters:
 * pressing at 1 was nearly free and nearly pointless, so there was no reason to
 * hold, and a measured comparison across 1200 seeds put every press policy
 * inside one standard error of never pressing. Superlinear payout makes holding
 * the real play — the stake is only worth cashing near the top, and any failure
 * on the way there wipes it. That is the tension the mechanic exists for.
 */
export const PRESS_ODDS = [0, 0.03, 0.08, 0.15, 0.24] as const;
export const PRESS_BAND = [0, 0.02, 0.05, 0.09, 0.14] as const;

export function heatOf(state: GameState): number {
  return Math.max(0, Math.min(MAX_HEAT, state.heat ?? 0));
}

/** True when the player has something to wager. */
export function canPress(state: GameState): boolean {
  return heatOf(state) > 0;
}

/**
 * Bookkeeping after a play resolves. Landing builds the meter; failing wipes it.
 * Called by executePlay — the single writer, so heat can never drift from the
 * outcomes that earned it.
 */
export function bankHeat(state: GameState, tier: 0 | 1 | 2 | 3): void {
  if (tier <= 1) state.heat = Math.min(MAX_HEAT, heatOf(state) + 1);
  else state.heat = 0;
}

function tier(heat: number): number {
  return Math.max(0, Math.min(MAX_HEAT, Math.floor(heat)));
}

/** Odds bonus bought by spending `heat`. */
export function pressOddsBonus(heat: number): number {
  return PRESS_ODDS[tier(heat)] ?? 0;
}

/** Band widening paid for the odds above. SAFE cards never take it — see resolve(). */
export function pressBandPenalty(heat: number, risk: RiskClass): number {
  if (risk === 'SAFE') return 0;
  return PRESS_BAND[tier(heat)] ?? 0;
}

/** What a press would cost and buy right now — the copy the UI shows. */
export interface PressQuote {
  heat: number;
  odds: number;
  band: number;
  safe: boolean;
}

export function quotePress(state: GameState, card: PlayCard): PressQuote {
  const heat = heatOf(state);
  return {
    heat,
    odds: pressOddsBonus(heat),
    band: pressBandPenalty(heat, card.risk),
    safe: card.risk === 'SAFE'
  };
}

/**
 * What the wager does, as one honest phrase. Never claims a soft roll.
 *
 * Deliberately carries no "Press N:" prefix — callers supply their own framing
 * (a button says "Press 3", the log says "Pressed 3"), and baking one in here
 * produced "Press 1: Press 1: …" everywhere it was used.
 */
export function pressLabel(q: PressQuote): string {
  if (q.heat <= 0) return 'No heat banked — land a play first.';
  const odds = `+${Math.round(q.odds * 100)}% odds`;
  return q.safe
    ? `${odds}. Safe work stays safe.`
    : `${odds}, +${Math.round(q.band * 100)}% disaster. Spends the streak.`;
}
