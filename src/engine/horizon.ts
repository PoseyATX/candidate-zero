/**
 * CANDIDATE ZERO — the horizon, which is a consequence and never a grant.
 *
 * How far a player can see is a derived property of who they know. Not a map
 * unlock, not a region flag, not a tier: you can see the courthouse because the
 * county chairwoman takes your call, and if she walks, you cannot see it any
 * more. Nothing here is stored — `visibleScope` is recomputed from the live
 * actor graph every time it is asked, so a save file cannot carry a horizon
 * that the relationships no longer justify.
 *
 * The walk is: your allies → the starmap entities they ARE (data/starmap/
 * bridges.ts) → one orbit out from each. One step, not the transitive closure —
 * knowing the precinct chair puts the county committee in view because she is
 * on it; it does not put the Governor in view because the county chair once met
 * a Senator. The horizon is what the people around you can actually reach.
 *
 * It widens by itself as the machine grows, which is the point: nobody is ever
 * told their scope increased, because nothing increased. More people took the
 * call, and more of the state was visible from where they stand.
 */

import type { GameState } from './types.js';
import { ENTITIES } from '../data/starmap/entities.js';
import { entityIdForAlly } from '../data/starmap/bridges.js';
import { orbitsFrom } from '../data/starmap/orbits.js';
import type { EntityCluster } from './types-entities.js';

/** Where the player themselves stands. Always visible — it is where you are. */
const SELF = 'ENT_HOUSE_CANDIDATE';

/**
 * Entities the player can currently see, derived from the actor graph.
 *
 * Warm allies only: somebody who has gone cold is not showing you anything.
 */
export function visibleScope(state: GameState): Set<string> {
  const seen = new Set<string>([SELF]);

  // 1. Everyone you actually have. An ally IS a node on the map.
  const anchors: string[] = [];
  for (const ally of state.allies ?? []) {
    if (ally.warm <= 0) continue;
    const entId = entityIdForAlly(ally.id);
    if (entId && ENTITIES[entId]) anchors.push(entId);
  }
  // Where you have physically been is also where you can see from.
  if (state.currentEntityId && ENTITIES[state.currentEntityId]) {
    anchors.push(state.currentEntityId);
  }
  for (const id of state.entityHistory ?? []) {
    if (ENTITIES[id]) anchors.push(id);
  }

  // 2. One orbit out from each anchor — the room they can get you into.
  for (const id of anchors) {
    seen.add(id);
    for (const orb of orbitsFrom(id)) seen.add(orb.to);
  }
  // And the rooms you can get yourself into from where you stand.
  for (const orb of orbitsFrom(SELF)) seen.add(orb.to);

  return seen;
}

/** Institutions currently in view, as clusters — courthouse, capitol, statewide. */
export function visibleClusters(state: GameState): Set<EntityCluster> {
  const out = new Set<EntityCluster>();
  for (const id of visibleScope(state)) {
    const ent = ENTITIES[id];
    if (ent) out.add(ent.cluster);
  }
  return out;
}

/** Can the player see this entity at all right now? */
export function canSee(state: GameState, entityId: string): boolean {
  return visibleScope(state).has(entityId);
}

/**
 * How wide the horizon is, as a plain count.
 *
 * For harnesses and for the gradient's own bookkeeping. Deliberately NOT
 * surfaced anywhere in the UI: the moment a player can read "scope 14" the
 * whole thing becomes a progress bar and stops being a district.
 */
export function horizonWidth(state: GameState): number {
  return visibleScope(state).size;
}
