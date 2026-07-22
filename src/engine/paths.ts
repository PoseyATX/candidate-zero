/**
 * CANDIDATE ZERO — Unlock-path reducer
 * ====================================
 * Called after every successful play (playFromHand). Records the played card,
 * advances any path it is a required step of (firing a lore toast the first
 * time each step is met), and when a path's full combo is complete, unlocks it
 * — injecting the reward card into the draw pile and firing a lore toast.
 *
 * Pure and deterministic: only reads/writes GameState + DeckState and pushes
 * log entries. No RNG, no rule math.
 */

import type { GameState, DeckState } from './types.js';
import { PATHS, REWARD_BY_PATH } from '../data/paths.js';
import { injectIntoDrawPile } from './deck.js';

function toast(state: GameState, text: string): void {
  state.log.push({ week: state.week, kind: 'note', text });
}

/**
 * @param cardId the card that was just successfully played.
 * @param deck   draw pile to inject a reward into (omit in contexts without a
 *               physical deck; the reward is still marked owned on state.deck).
 */
export function advancePaths(state: GameState, cardId: string, deck?: DeckState): void {
  if (!state.playedCardIds) state.playedCardIds = {};
  if (!state.pathProgress) state.pathProgress = {};
  if (!state.pathsUnlocked) state.pathsUnlocked = {};

  const prevCount = state.playedCardIds[cardId] ?? 0;
  state.playedCardIds[cardId] = prevCount + 1;
  const firstTimePlayed = prevCount === 0;
  if (!firstTimePlayed) return; // paths only care about the FIRST play of a card

  for (const path of PATHS) {
    if (state.pathsUnlocked[path.id]) continue;
    const stepIndex = path.requires.indexOf(cardId);
    if (stepIndex < 0) continue; // this card isn't a step of this path

    const met = path.requires.filter(id => state.playedCardIds[id]).length;
    state.pathProgress[path.id] = met;

    if (met === path.requires.length) {
      // Complete → unlock + grant the reward.
      state.pathsUnlocked[path.id] = true;
      const rewardId = REWARD_BY_PATH[path.id];
      if (rewardId) {
        if (!state.deck) state.deck = [];
        if (deck) injectIntoDrawPile(deck, state, [rewardId]);
        else if (!state.deck.includes(rewardId)) state.deck.push(rewardId);
      }
      toast(state, path.unlockToast);
    } else {
      // Progress step → the flavor toast for this step.
      toast(state, path.stepToasts[stepIndex] ?? `${path.name}: progress.`);
    }
  }
}
