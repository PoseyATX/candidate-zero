/**
 * Starmap v0 — Entity / Orbit / Loop types
 * Design law: issues #17 #18. Cartography first; pilot movement overlays campaign.
 */

import type { AttrId } from './types.js';

export type EntityId = string;
export type LoopId = string;
export type OrbitId = string;

export type EntityTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type EntityCluster =
  | 'street'
  | 'grassroots'
  | 'local'
  | 'lege_staff'
  | 'lege'
  | 'leadership'
  | 'statewide'
  | 'federal'
  | 'procedural';

export type OrbitStrength = 'strong' | 'medium' | 'weak';

export type TimingWindow =
  | 'pre-filing'
  | 'primary'
  | 'general'
  | 'session'
  | 'off-season'
  | 'waiting';

export type LoopKind =
  | 'waiting'
  | 'elected'
  | 'entity_primary'
  | 'entity_sub'
  | 'higher_office'
  | 'template';

export type ConditionKind =
  | 'always_false'
  | 'manual_todo'
  | 'stage_is'
  | 'has_ally'
  | 'has_rep'
  | 'has_obl'
  | 'name_id_gte'
  | 'endorse_gte'
  | 'district_standing_gte'
  | 'warm_ally_gte'
  | 'hit_pieces_gte';

export interface ConditionSpec {
  id: string;
  type: 'advancement' | 'setback';
  description: string;
  kind: ConditionKind;
  params?: Record<string, string | number | boolean>;
  movementTarget?: EntityId;
  residue?: string[];
}

export interface EntityDef {
  id: EntityId;
  name: string;
  tier: EntityTier;
  cluster: EntityCluster;
  flavor: string;
  primaryLoopId: LoopId;
  subloopIds: LoopId[];
  /** Bridge to live ally grant system (AL01 etc.) when same fiction. */
  allyId?: string;
  tags?: string[];
}

export interface OrbitDef {
  id: OrbitId;
  from: EntityId;
  to: EntityId;
  strength: OrbitStrength;
  timingWindows?: TimingWindow[];
  requiredAttrs?: Partial<Record<AttrId, number>>;
  requiredCashMin?: number;
  flavorText: string;
}

export interface LoopDef {
  id: LoopId;
  name: string;
  kind: LoopKind;
  description: string;
  entityId?: EntityId;
  parentLoopId?: LoopId;
  advancement: ConditionSpec[];
  setback: ConditionSpec[];
  exampleVerbs: string[];
  exampleNouns: string[];
}

export interface MovementOpportunity {
  id: string;
  entityId: EntityId;
  conditionId: string;
  description: string;
  movementTarget?: EntityId;
  verbPlayId?: string;
}
