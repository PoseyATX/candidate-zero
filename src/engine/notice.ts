/**
 * Indifference → notice → targeted resistance.
 *
 * SRD Candidate-Zero node: the system ignores you until you gain traction;
 * then resistance personalizes. Tier alone is a smooth curve. This is the
 * phase-change beat that was missing.
 */

import type { GameState } from './types.js';

export const NOTICE_EVENT = 'EV_YOU_GOT_NOTICED';

export function hasBeenNoticed(state: GameState): boolean {
  return !!(state.eventsFired && state.eventsFired[NOTICE_EVENT]);
}

/**
 * True when the run has crossed from "nobody cares" into "somebody cares".
 * Ballot is the hard door; name and contacts are the soft ones the room feels
 * before the clerk does.
 */
export function noticeThresholdMet(state: GameState): boolean {
  if (state.ballot) return true;
  if (state.nameID >= 12) return true;
  if (state.contacts >= 160) return true;
  if (state.endorsePts >= 3) return true;
  return false;
}

/**
 * Fire once when traction lands. Spikes opposition on the best ground you
 * worked (or the busiest ground if none), drops a hit piece seed, and logs the
 * beat so the player cannot miss the phase change.
 *
 * Returns the log line, or null if already noticed / not yet earned.
 */
export function maybeTriggerNotice(state: GameState): string | null {
  if (hasBeenNoticed(state)) return null;
  if (!noticeThresholdMet(state)) return null;

  state.eventsFired = state.eventsFired || {};
  state.eventsFired[NOTICE_EVENT] = true;
  state.sessionFlags = state.sessionFlags || {};
  state.sessionFlags.noticed = true;
  // Resistance personalizes: tier floor lifts for the rest of the primary.
  state.tier = Math.max(state.tier, 1);
  state.hitPieces = (state.hitPieces || 0) + 1;
  state.exposure = (state.exposure || 0) + 2;

  const grounds = state.groundsArr;
  let target = grounds.find(g => g.id === state.lastGround) ?? null;
  if (!target) {
    target = [...grounds].sort((a, b) => (b.rapport || 0) - (a.rapport || 0))[0] ?? null;
  }
  if (target) {
    target.rivalRap = Math.min(100, (target.rivalRap || 0) + 22);
  }
  // Spill: a second ground so the map is not a single-meter story.
  const second = [...grounds]
    .filter(g => g.id !== target?.id)
    .sort((a, b) => (b.pool || 0) - (a.pool || 0))[0];
  if (second) {
    second.rivalRap = Math.min(100, (second.rivalRap || 0) + 10);
  }

  const where = target?.n ?? 'the district';
  const line =
    `YOU GOT NOTICED — the indifference ends. Money and organizers show up on ${where}, ` +
    `a hit piece is already half-written, and the rooms that used to ignore you start locking the door. ` +
    `What you built is still yours. The climb just got personal.`;
  state.log.push({ week: state.week, kind: 'note', text: line });
  return line;
}
