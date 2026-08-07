/**
 * Horizon creep (spec §2.4): visible scope is derived from relationships.
 * Never stored as an unlock flag. Never granted by level.
 */

import type { GameState } from './types.js';
import { ALLIES } from '../data/allies.js';
import { entityIdForAlly } from '../data/starmap/bridges.js';
import { getEntityDef } from '../data/starmap/entities.js';

/**
 * Ground / institution ids the player can "feel" this turn.
 * Always includes the local fight (all primary grounds stay on the board for
 * rules math) — horizon widens *presentation and opportunity context* via
 * extra tags, not by locking GR01.
 *
 * Returns a list of scope tags: 'local' always; ally-linked entity ids and
 * any region hooks from warm relationships.
 */
export function visibleScopeTags(state: GameState): string[] {
  const tags = new Set<string>(['local']);
  for (const a of state.allies || []) {
    if ((a.warm ?? 0) <= 0) continue;
    tags.add(`ally:${a.id}`);
    const entId = entityIdForAlly(a.id);
    if (entId) {
      tags.add(`entity:${entId}`);
      const ent = getEntityDef(entId);
      if (ent?.id) tags.add(`entity:${ent.id}`);
    }
    const def = ALLIES[a.id];
    if (def?.n) tags.add(`ally-name:${def.n}`);
  }
  // Machine / chamber roster contact also widens the building
  if (state.chamberRoster && Object.keys(state.chamberRoster).length) {
    tags.add('chamber');
  }
  if ((state.backers?.length ?? 0) > 0) tags.add('money-room');
  return [...tags];
}

/** How wide the horizon is — used only by opportunity density, never shown. */
export function horizonBreadth(state: GameState): number {
  return visibleScopeTags(state).length;
}
