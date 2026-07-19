/**
 * Outside event deck — world draws, never player hand.
 * docs/CARD-RESIDENCY.md: residency outside ⇒ control world.
 */

import { random } from './rng.js';
import type { GameState } from './types.js';
import { OUTSIDE_EVENTS, type OutsideEvent } from '../data/outside-events.js';

function stageOk(e: OutsideEvent, state: GameState): boolean {
  if (state.stage === 'primary' || state.stage === 'general' || state.stage === 'session') {
    return e.stages.includes(state.stage);
  }
  return false;
}

/** Eligible Outside events for this state (not yet fired if once). */
export function listEligibleOutside(state: GameState): OutsideEvent[] {
  const fired = state.eventsFired || {};
  return OUTSIDE_EVENTS.filter(e => {
    if (e.residency !== 'outside' || e.control !== 'world') return false;
    if (!stageOk(e, state)) return false;
    if (e.once && fired[e.id]) return false;
    if (e.show && !e.show(state)) return false;
    return true;
  });
}

/**
 * Weighted draw from eligible Outside events.
 * Returns null if none eligible or no draw this tick.
 */
export function drawOutsideEvent(state: GameState): OutsideEvent | null {
  const pool = listEligibleOutside(state);
  if (!pool.length) return null;
  const total = pool.reduce((s, e) => s + Math.max(1, e.w || 1), 0);
  let r = random() * total;
  for (const e of pool) {
    r -= Math.max(1, e.w || 1);
    if (r <= 0) return e;
  }
  return pool[pool.length - 1] ?? null;
}

/**
 * Apply an Outside event: log, mark fired, mutate state via apply().
 * Never adds to hand / deck.
 */
export function resolveOutsideEvent(state: GameState, event: OutsideEvent): string {
  state.eventsFired = state.eventsFired || {};
  if (event.once) state.eventsFired[event.id] = true;
  // Track encounter count for multi-fire events
  const key = `seen_${event.id}`;
  state.eventsFired[key] = true;

  const text = event.apply(state);
  state.log.push({
    week: state.week,
    kind: 'note',
    text
  });
  return text;
}

/**
 * Week-boundary Outside draw.
 * ~28% campaign weeks, ~22% session weeks (session already has teeth ticks).
 * At most one Outside card per advance.
 */
export function tickOutsideDeck(state: GameState): string | null {
  if (state.over) return null;
  const p = state.stage === 'session' ? 0.22 : 0.28;
  if (random() >= p) return null;
  const ev = drawOutsideEvent(state);
  if (!ev) return null;
  return resolveOutsideEvent(state, ev);
}

/** Catalog integrity helpers for harness. */
export function outsideCatalogStats(): {
  count: number;
  allOutside: boolean;
  allWorld: boolean;
  ids: string[];
} {
  const ids = OUTSIDE_EVENTS.map(e => e.id);
  return {
    count: OUTSIDE_EVENTS.length,
    allOutside: OUTSIDE_EVENTS.every(e => e.residency === 'outside'),
    allWorld: OUTSIDE_EVENTS.every(e => e.control === 'world'),
    ids
  };
}
