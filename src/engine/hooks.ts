/**
 * CANDIDATE ZERO — Hooks. The side-paths back.
 *
 * D&D calls these adventure hooks: an optional thread the world dangles, which
 * you may take or ignore, and which leads somewhere the main road does not.
 *
 * This exists because the career had become a ladder with a memory rather than a
 * circle. The campaign fed the chamber — meet Wendell Cobb on a mail route in
 * October and he is warm when you are sworn in — but nothing came back. A member
 * who takes your call at ten at night could not cut you an ad, work his county,
 * or tell you which of your grounds was about to turn. The return path was
 * missing entirely.
 *
 * **This is a REGISTRY, not one feature.** The owner's framing: there should be
 * many, many paths back, and they should come from everywhere — a member who
 * owes you, a statute you passed, a rival's mistake, a machine member's ask, an
 * outside event. `HookSource` is deliberately open-ended and `offerHook` does not
 * care who calls it. Adding a new source means writing the offer and a card that
 * consumes it; nothing here needs to change.
 *
 * Three rules, mirroring the Docket (which is the same shape pointed at policy):
 *
 *   1. **Optional.** A hook you must take is a quest, not a hook. Ignoring every
 *      one of them has to remain a legitimate way to play.
 *   2. **Sourced.** Every hook names who or what offered it, because a favour
 *      from nobody in particular is a stat bonus wearing a hat.
 *   3. **Perishable where it makes sense.** People forget they owe you.
 */

import type { GameState } from './types.js';

/** Where a hook came from. Open-ended on purpose — see the file header. */
export type HookKind = 'member' | 'statute' | 'rival' | 'machine' | 'world';

export interface Hook {
  id: string;
  n: string;
  /** In voice. What the person is actually offering. */
  d: string;
  kind: HookKind;
  /** The id of the member / law / rival that offered it. */
  source: string;
  /** Stages where it can be taken. */
  stages: Array<GameState['stage']>;
  /** Ground it acts on, when it acts on one. */
  ground?: string;
  /** Set when taken; a hook is cashed once. */
  takenWeek?: number;
  /** Optional shelf life. Omitted means it waits for you. */
  expiresWeek?: number;
}

/** Nobody is juggling more than this many open threads. */
export const MAX_LIVE_HOOKS = 6;

const EMPTY: readonly Hook[] = Object.freeze([]);

/**
 * Read-only. Does NOT lazily create the array.
 *
 * `getDocket` used to, and because `view()` calls it to render, merely looking
 * at the game mutated it and broke deterministic replay on every seed. Same
 * shape here, so the same discipline.
 */
export function getHooks(state: GameState): readonly Hook[] {
  return state.hooks ?? EMPTY;
}

function mutableHooks(state: GameState): Hook[] {
  if (!state.hooks) state.hooks = [];
  return state.hooks;
}

/** Hooks you can act on right now, in this stage. */
export function liveHooks(state: GameState): Hook[] {
  return getHooks(state).filter(
    h =>
      h.takenWeek === undefined &&
      h.stages.includes(state.stage) &&
      (h.expiresWeek === undefined || h.expiresWeek >= state.week)
  );
}

export function findHook(state: GameState, id: string): Hook | undefined {
  return getHooks(state).find(h => h.id === id);
}

/**
 * Offer a thread. Idempotent by id.
 *
 * When the board is full, a PERISHABLE thread displaces the oldest one that
 * waits forever. This is not politeness, it is the whole point of the cap: the
 * cap models the player's attention, and a thing happening this week gets your
 * attention over a standing offer that will still be there in October.
 *
 * Found by measurement, not by reasoning. Five sources went live and the world's
 * door — the only kind that expires — was silently refused every time, because
 * three members, a statute, a machine deal and an envelope had already filled
 * the six slots at `applyLegacy` before the season even started. The flood came
 * and you could not go, and nothing anywhere would have told you why.
 *
 * The displaced hook is REMOVED, not marked taken: you never got it, so the
 * record should not claim you turned it down.
 */
export function offerHook(state: GameState, h: Omit<Hook, 'takenWeek'>): Hook | null {
  const hooks = mutableHooks(state);
  if (hooks.some(x => x.id === h.id)) return null;
  if (liveHooks(state).length >= MAX_LIVE_HOOKS) {
    if (h.expiresWeek === undefined) return null;
    const standing = liveHooks(state).filter(x => x.expiresWeek === undefined);
    const evicted = standing[0];
    if (!evicted) return null;
    hooks.splice(hooks.indexOf(evicted), 1);
  }
  const hook: Hook = { ...h };
  hooks.push(hook);
  return hook;
}

/** Cash a hook. Returns false if it was already taken, expired, or wrong stage. */
export function takeHook(state: GameState, id: string): boolean {
  const h = findHook(state, id);
  if (!h) return false;
  if (h.takenWeek !== undefined) return false;
  if (!h.stages.includes(state.stage)) return false;
  if (h.expiresWeek !== undefined && h.expiresWeek < state.week) return false;
  h.takenWeek = state.week;
  return true;
}

/** Live hooks from a given source kind — how a card finds its own thread. */
export function hooksOfKind(state: GameState, kind: HookKind): Hook[] {
  return liveHooks(state).filter(h => h.kind === kind);
}

/** One line announcing a thread, for the log. */
export function hookAnnounce(h: Hook): string {
  return `A THREAD — ${h.n}. ${h.d}`;
}
