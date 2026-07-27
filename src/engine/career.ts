/**
 * CANDIDATE ZERO — Career / ground win-condition sketch (Phase 1)
 *
 * A MEASUREMENT-ONLY sketch of the ground-centered win condition, per the
 * Phase 1 order: "implement checkBallotThreshold() but do NOT wire it yet;
 * just the function so we can measure it." Nothing in the engine calls this
 * to decide an election — the live outcome still comes from
 * calendar.ts's primary/general probabilities. This exists so the grounds
 * harness can report how close a given campaign came to the *intended*
 * rapport-distribution win condition, before we commit to replacing the
 * current probability model with it in Phase 2.
 *
 * The condition (design intent, 6 contestable grounds — "can't do all"):
 *   Primary : 60% rapport in the home ground + 40% in any 2 others
 *   General : 40% home + 30% in any 2 others (opponent is entrenched, so
 *             the bar is lower but the opponent's ground presence — see
 *             Ground.rivalRap — will contest it once Phase 2 gives it teeth)
 *
 * "Home ground" is not yet a stored, region-derived assignment (that's a
 * Phase 2 subsystem). Until then the sketch uses the player's current
 * highest-rapport ground as the home proxy, or an explicit id if passed.
 */

import type { GameState } from './types.js';

export interface BallotThresholdResult {
  stage: 'primary' | 'general';
  homeGroundId: string | null;
  homeRapport: number;
  homeThreshold: number;
  homeMet: boolean;
  otherThreshold: number;
  othersNeeded: number;
  othersMet: number;
  /** Grounds with any rapport at all — how broad the campaign actually is. */
  contested: number;
  /** Whether the full intended condition is satisfied. */
  met: boolean;
}

/**
 * Calibrated 2026-07-27 against the real rapport economy (harness:grounds +
 * a distribution probe), replacing the original 60/40 sketch which was written
 * against an economy that was never built and was met 0% of the time in every
 * strategy since Phase 1.
 *
 * Measured medians after the affinity/gating pass, per campaign:
 *   money/spread  home 13 · 2nd 8 · 3rd 5
 *   labor/spread  home  5 · 2nd 2 · 3rd 0
 *   *focus        home 10-28 · 2nd 0 · 3rd 0
 *
 * Focus play banks nothing on a second ground, so a breadth condition is
 * unreachable for it by construction — that is intended. This condition
 * rewards contesting "a few, not all eight", the stated Phase 1 design target.
 * Guardrail: harness:grounds asserts the met-rate band.
 */
const THRESHOLDS = {
  primary: { home: 12, other: 5, othersNeeded: 2 },
  general: { home: 8, other: 4, othersNeeded: 2 }
} as const;

/**
 * Evaluate the sketch condition against current ground rapport. Pure; does
 * not mutate state and is never consulted by the live election path.
 */
export function checkBallotThreshold(
  state: GameState,
  homeGroundId?: string
): BallotThresholdResult {
  const stage: 'primary' | 'general' = state.stage === 'general' ? 'general' : 'primary';
  const t = THRESHOLDS[stage];
  const grounds = state.groundsArr;

  // Home proxy: explicit id, else the current highest-rapport ground.
  let home = homeGroundId
    ? grounds.find(g => g.id === homeGroundId)
    : grounds.slice().sort((a, b) => (b.rapport || 0) - (a.rapport || 0))[0];
  const homeId = home?.id ?? null;
  const homeRapport = home?.rapport ?? 0;
  const homeMet = homeRapport >= t.home;

  const othersMet = grounds.filter(g => g.id !== homeId && (g.rapport || 0) >= t.other).length;
  const contested = grounds.filter(g => (g.rapport || 0) > 0).length;

  return {
    stage,
    homeGroundId: homeId,
    homeRapport,
    homeThreshold: t.home,
    homeMet,
    otherThreshold: t.other,
    othersNeeded: t.othersNeeded,
    othersMet,
    contested,
    met: homeMet && othersMet >= t.othersNeeded
  };
}
