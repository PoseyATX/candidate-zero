/**
 * CANDIDATE ZERO — Pure Resolution Engine (SRD §1)
 * Side-effect free aside from RNG stream. Takes explicit state.
 * SAFE cards can never produce DISASTER. Brutal impartial RNG preserved.
 */

import { random } from './rng.js';
import type { GameState, RollResult, RiskClass } from './types.js';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function hasRep(state: GameState, id: string): boolean {
  return state.reps.includes(id);
}

function warm(state: GameState, id: string): boolean {
  const a = state.allies.find(x => x.id === id);
  return !!(a && a.warm > 0);
}

export function resolve(
  p: number,
  risk: RiskClass,
  state: GameState,
  rollOverride?: number
): RollResult {
  p = clamp(p, 0.02, 0.95);

  const critShare =
    risk === 'VOL'
      ? 0.3
      : risk === 'SAFE'
        ? (hasRep(state, 'R01') ? 0.15 : 0)
        : 0.18;

  let band =
    risk === 'SAFE'
      ? 0
      : (0.04 + state.tier * 0.04) * (risk === 'VOL' ? 2 : 1);

  band = Math.max(
    0,
    band +
      (state.globalBand || 0) -
      (warm(state, 'AL11') ? 0.02 : 0) -
      (hasRep(state, 'R10') ? 0.01 : 0)
  );

  const roll = rollOverride !== undefined ? rollOverride : random();
  let tier: 0 | 1 | 2 | 3;

  if (critShare > 0 && roll < p * critShare) {
    tier = 0;
  } else if (roll < p) {
    tier = 1;
  } else if (band > 0 && roll > 1 - band) {
    tier = 3;
  } else {
    tier = 2;
  }

  return { tier, roll, p, band };
}

export const STAMPS = ['BREAKTHROUGH', 'GAIN', 'SETBACK', 'DISASTER'] as const;
