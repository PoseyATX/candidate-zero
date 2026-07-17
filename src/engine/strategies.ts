/**
 * CANDIDATE ZERO — Scripted strategies for harness work
 * Stage-aware: primary ballot race vs general GOTV.
 */

import type { Chooser } from './loop.js';
import type { GameState, PlayCard } from './types.js';

function pickByPriority(
  playable: { index: number; card: PlayCard }[],
  priority: string[]
): number | null {
  for (const id of priority) {
    const hit = playable.find(p => p.card.id === id);
    if (hit) return hit.index;
  }
  return playable[0]?.index ?? null;
}

/** Primary labor path → general GOTV/name push. */
export const laborBallotStrategy: Chooser = (playable, state) => {
  if (state.stage === 'general') {
    return pickByPriority(playable, [
      'PL19', 'PL01', 'PL02', 'PL16', 'PL06', 'PL09', 'PL22', 'PL08', 'PL10'
    ]);
  }
  if (!state.ballot) {
    return pickByPriority(playable, ['PL04', 'PL01', 'PL02', 'PL06', 'PL10']);
  }
  return pickByPriority(playable, ['PL01', 'PL02', 'PL06', 'PL08', 'PL16', 'PL10', 'PL03']);
};

/** Bank fee early, then paid media / fish fry texture into general. */
export const moneyBallotStrategy: Chooser = (playable, state) => {
  if (state.stage === 'general') {
    return pickByPriority(playable, [
      'PL19', 'PL13', 'PL09', 'PL01', 'PL22', 'PL07', 'PL10', 'PL16'
    ]);
  }
  if (!state.ballot) {
    if (state.money >= 1250) {
      return pickByPriority(playable, ['PL05', 'PL13', 'PL01', 'PL10']);
    }
    return pickByPriority(playable, ['PL13', 'PL01', 'PL02', 'PL10', 'PL03']);
  }
  return pickByPriority(playable, ['PL01', 'PL13', 'PL06', 'PL08', 'PL10', 'PL16']);
};

/** Control: ignore ballot access. */
export const grindFirstStrategy: Chooser = (playable, state) => {
  if (state.stage === 'general') {
    return pickByPriority(playable, ['PL01', 'PL02', 'PL19', 'PL10', 'PL06']);
  }
  return pickByPriority(playable, ['PL01', 'PL02', 'PL06', 'PL10', 'PL08', 'PL03', 'PL13']);
};

export const hybridStrategy: Chooser = (playable, state) => {
  if (state.stage === 'general') {
    return pickByPriority(playable, [
      'PL19', 'PL01', 'PL13', 'PL06', 'PL08', 'PL16', 'PL10', 'PL22'
    ]);
  }
  if (!state.ballot) {
    // Genuine hybrid: race both ballot doors instead of defaulting to
    // labor-only (petition was always legal as a camp action, so a naive
    // "try petition first" check never fell through to the fee branch).
    // Alternate weeks between the two paths so both accrue.
    if (state.money >= 1250) {
      const fee = playable.find(p => p.card.id === 'PL05');
      if (fee) return fee.index;
    }
    const wantFish = state.week % 2 === 0;
    if (wantFish) {
      const fish = playable.find(p => p.card.id === 'PL13');
      if (fish) return fish.index;
    }
    const petition = playable.find(p => p.card.id === 'PL04');
    if (petition) return petition.index;
    return pickByPriority(playable, ['PL13', 'PL01', 'PL02', 'PL06', 'PL10']);
  }
  return pickByPriority(playable, ['PL01', 'PL06', 'PL08', 'PL13', 'PL16', 'PL10']);
};

export const STRATEGIES: Record<string, Chooser> = {
  labor: laborBallotStrategy,
  money: moneyBallotStrategy,
  grind: grindFirstStrategy,
  hybrid: hybridStrategy
};

export function describeStrategy(_name: string, state: GameState): string {
  return (
    `stage=${state.stage} week=${state.week} ballot=${state.ballot} ` +
    `$${state.money} sigs=${state.signatures} contacts=${state.contacts} ` +
    `outcome=${state.outcome ?? 'ongoing'}`
  );
}
