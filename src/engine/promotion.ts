/**
 * CANDIDATE ZERO — Actor promotion: the people you keep running into.
 *
 * The roster has always had ghosts. AL05 the Drive-Time Host, AL07 the
 * Feed-Store Regulars, AL10 the Finance Chair, AL13 the lobbyist with a
 * conscience — all of them named, all of them written into plays and flavour,
 * none of them ever granted. `harness:dead-refs` calls them INTENTIONAL_STUBS,
 * which is an honest label for a man who has poured your coffee four times and
 * still does not exist.
 *
 * This is the accretion answer: contact counts. Sit the feed-store bench often
 * enough and the regulars stop being scenery. Nothing is announced, nothing
 * unlocks, no threshold is ever shown — the third time you take the drive-time
 * slot the host simply starts behaving like somebody who knows you, because he
 * does.
 *
 * Reuses the actor structures wholesale: promotion pushes onto `state.allies`,
 * which `settleMachine` already banks into the persistent machine at the end of
 * the run (engine/machine.ts step 1). There is no second roster, no parallel
 * bookkeeping, and nothing here the Chronicle has to learn to read.
 */

import type { GameState } from './types.js';
import { ALLIES } from '../data/allies.js';

/**
 * Contacts before a background figure becomes a tracked actor.
 *
 * Three is the number because two is a coincidence. It is never surfaced, never
 * hinted at, and must not be: the moment a player can see "2/3 — one more visit"
 * this stops being a world that noticed them and becomes a progress bar.
 */
export const PROMOTE_AT = 3;

/** Marks a figure promoted this run, so we never double-grant. */
export const PROMOTED_PREFIX = 'promoted:';

/** How warm somebody is when they first start taking your call. Cold, but real. */
const PROMOTED_WARMTH = 1;

function log(state: GameState): Record<string, number> {
  if (!state.contactLog) state.contactLog = {};
  return state.contactLog;
}

/** How many times this figure has crossed the player's path. */
export function contactCount(state: GameState, figureId: string): number {
  return state.contactLog?.[figureId] ?? 0;
}

/** Has this figure already been promoted into the actor system this run? */
export function isPromoted(state: GameState, figureId: string): boolean {
  return !!state.sessionFlags?.[`${PROMOTED_PREFIX}${figureId}`];
}

/** Everyone promoted by accretion this run. */
export function promotedIds(state: GameState): string[] {
  const flags = state.sessionFlags ?? {};
  return Object.keys(flags)
    .filter(k => k.startsWith(PROMOTED_PREFIX) && flags[k])
    .map(k => k.slice(PROMOTED_PREFIX.length));
}

/**
 * Record one brush with a named figure, and promote them if that was the third.
 *
 * Silent by contract. Returns true only so callers and the harness can observe
 * the transition — nothing in the UI may read this to announce anything.
 */
export function noteContact(state: GameState, figureId: string): boolean {
  if (!figureId || !ALLIES[figureId]) return false;

  const counts = log(state);
  counts[figureId] = (counts[figureId] ?? 0) + 1;

  if (counts[figureId] < PROMOTE_AT) return false;
  if (isPromoted(state, figureId)) return false;
  // Already an ally by the ordinary routes (a play granted them, or the machine
  // seated them). Contact accretion is the path for people the game never had
  // a door for — it does not re-grant anyone who already walked through one.
  if (state.allies.some(a => a.id === figureId)) return false;

  state.allies.push({ id: figureId, warm: PROMOTED_WARMTH, age: 0 });
  state.sessionFlags = state.sessionFlags || {};
  state.sessionFlags[`${PROMOTED_PREFIX}${figureId}`] = 1;
  // No log entry. No note, no juice, no banner. The player finds out because
  // the man behind the counter starts answering.
  return true;
}

/** Record every figure a play puts the player in front of. */
export function noteCardContacts(state: GameState, figures?: string[]): void {
  if (!figures?.length) return;
  for (const id of figures) noteContact(state, id);
}
