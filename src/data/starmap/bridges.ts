/**
 * Bridges between starmap ENT_* and live ally IDs (AL*).
 * warm() / addAlly stay on AL*; starmap is cartography + pilot overlay.
 */

import { ALLIES } from '../allies.js';
import { ENTITIES } from './entities.js';

/** allyId → entityId */
export const ALLY_TO_ENTITY: Record<string, string> = {};
/** entityId → allyId */
export const ENTITY_TO_ALLY: Record<string, string> = {};

for (const ent of Object.values(ENTITIES)) {
  if (!ent.allyId) continue;
  ALLY_TO_ENTITY[ent.allyId] = ent.id;
  ENTITY_TO_ALLY[ent.id] = ent.allyId;
}

export function entityIdForAlly(allyId: string): string | undefined {
  return ALLY_TO_ENTITY[allyId];
}

export function allyIdForEntity(entityId: string): string | undefined {
  return ENTITY_TO_ALLY[entityId];
}

/** Validate bridges against ALLIES registry (for harness). */
export function listBrokenAllyBridges(): string[] {
  const broken: string[] = [];
  for (const [allyId, entId] of Object.entries(ALLY_TO_ENTITY)) {
    if (!ALLIES[allyId]) broken.push(`${entId} → missing ally ${allyId}`);
  }
  return broken;
}
