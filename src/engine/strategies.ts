/**
 * CANDIDATE ZERO — Scripted early-game strategies for harness work
 * Each chooser returns an absolute hand index from the playable list.
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

export const laborBallotStrategy: Chooser = (playable, state) => {
  if (!state.ballot) {
    return pickByPriority(playable, ['PL04', 'PL01', 'PL02', 'PL06', 'PL10']);
  }
  return pickByPriority(playable, ['PL01', 'PL02', 'PL06', 'PL08', 'PL10', 'PL03']);
};

export const moneyBallotStrategy: Chooser = (playable, state) => {
  if (!state.ballot) {
    if (state.money >= 750) {
      return pickByPriority(playable, ['PL05', 'PL13', 'PL01', 'PL10']);
    }
    return pickByPriority(playable, ['PL13', 'PL01', 'PL02', 'PL10', 'PL03']);
  }
  return pickByPriority(playable, ['PL01', 'PL13', 'PL06', 'PL08', 'PL10']);
};

export const grindFirstStrategy: Chooser = (playable, _state) => {
  return pickByPriority(playable, ['PL01', 'PL02', 'PL06', 'PL10', 'PL08', 'PL03', 'PL13']);
};

export const hybridStrategy: Chooser = (playable, state) => {
  if (!state.ballot) {
    const petition = playable.find(p => p.card.id === 'PL04');
    if (petition) return petition.index;
    if (state.money >= 750) {
      const fee = playable.find(p => p.card.id === 'PL05');
      if (fee) return fee.index;
    }
    return pickByPriority(playable, ['PL13', 'PL01', 'PL02', 'PL06', 'PL10']);
  }
  return pickByPriority(playable, ['PL01', 'PL06', 'PL08', 'PL13', 'PL10']);
};

export const STRATEGIES: Record<string, Chooser> = {
  labor: laborBallotStrategy,
  money: moneyBallotStrategy,
  grind: grindFirstStrategy,
  hybrid: hybridStrategy
};

export function describeStrategy(_name: string, state: GameState): string {
  return `week=${state.week} ballot=${state.ballot} $=${state.money} sigs=${state.signatures} contacts=${state.contacts}`;
}
