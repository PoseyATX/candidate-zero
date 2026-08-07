/**
 * Table slots + hand cap (spec §3.3).
 * Slot is the scarce weekly resource. Never announced to the player.
 */

import type { GameState } from './types.js';

export const TABLE_SLOTS_START = 3;
export const HAND_CAP_START = 5;
export const HAND_CAP_MAX = 7;

/** Silent hand growth from accretion (allies + weeks), never announced. */
export function handCap(state: GameState): number {
  const allies = (state.allies || []).filter(a => (a.warm ?? 0) > 0).length;
  const weeks = Math.max(0, (state.week || 1) - 1);
  // Frog boil: +1 at ~4 warm allies or ~6 weeks, +1 again later — never a banner
  let cap = HAND_CAP_START;
  if (allies >= 2 || weeks >= 5) cap += 1;
  if (allies >= 5 || weeks >= 10) cap += 1;
  return Math.min(HAND_CAP_MAX, cap);
}

export function tableSlotsMax(_state: GameState): number {
  return TABLE_SLOTS_START;
}

export function ensureSlots(state: GameState): void {
  if (state.tableSlotsMax == null) state.tableSlotsMax = TABLE_SLOTS_START;
  if (state.tableSlots == null) state.tableSlots = state.tableSlotsMax;
}

export function resetTableSlots(state: GameState): void {
  state.tableSlotsMax = tableSlotsMax(state);
  state.tableSlots = state.tableSlotsMax;
}

export function hasTableSlot(state: GameState): boolean {
  ensureSlots(state);
  return (state.tableSlots ?? 0) > 0;
}

export function spendTableSlot(state: GameState): boolean {
  ensureSlots(state);
  if ((state.tableSlots ?? 0) <= 0) return false;
  state.tableSlots = (state.tableSlots ?? 0) - 1;
  return true;
}
