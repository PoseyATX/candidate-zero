/**
 * Playable starmap pilots — template registry (not 93 unique decks).
 * Each row: entity + loop advancement → Special verb (MV##) once per campaign.
 */

export interface PilotDef {
  entityId: string;
  loopId: string;
  verbPlayId: string;
  movementId: string;
  /** sessionFlags key — orbit spent */
  consumeFlag: string;
  /** sessionFlags key — ORBIT OPEN logged once */
  announceFlag: string;
  /** sessionFlags residue after verb */
  residueFlag: string;
  logLabel: string;
}

/** Precinct Chair — original pilot (AL01 / MV01). */
export const PILOT_PRECINCT: PilotDef = {
  entityId: 'ENT_PRECINCT_CHAIR',
  loopId: 'LOOP_ENT_PRECINCT_CHAIR',
  verbPlayId: 'MV01',
  movementId: 'MOVE_PRECINCT_NETWORK',
  consumeFlag: 'mv01Consumed',
  announceFlag: 'mv01Announced',
  residueFlag: 'orbit_precinct_power',
  logLabel: 'Precinct Chair network'
};

/** Canvass Captain — field spine (AL09 / MV02). */
export const PILOT_CAPTAIN: PilotDef = {
  entityId: 'ENT_CANVASS_CAPTAIN',
  loopId: 'LOOP_ENT_CANVASS_CAPTAIN',
  verbPlayId: 'MV02',
  movementId: 'MOVE_FIELD_PLAN',
  consumeFlag: 'mv02Consumed',
  announceFlag: 'mv02Announced',
  residueFlag: 'orbit_field_spine',
  logLabel: 'Canvass Captain field plan'
};

/** County Judge — heaviest local nod (AL15 / MV03). */
export const PILOT_JUDGE: PilotDef = {
  entityId: 'ENT_COUNTY_JUDGE',
  loopId: 'LOOP_ENT_COUNTY_JUDGE',
  verbPlayId: 'MV03',
  movementId: 'MOVE_COURTHOUSE_NOD',
  consumeFlag: 'mv03Consumed',
  announceFlag: 'mv03Announced',
  residueFlag: 'orbit_courthouse_nod',
  logLabel: 'County Judge courthouse nod'
};

/** All playable entity loops (acceptance: ≥3). */
export const PLAYABLE_PILOTS: PilotDef[] = [PILOT_PRECINCT, PILOT_CAPTAIN, PILOT_JUDGE];

export function pilotByVerb(verbPlayId: string): PilotDef | undefined {
  return PLAYABLE_PILOTS.find(p => p.verbPlayId === verbPlayId);
}

export function pilotByEntity(entityId: string): PilotDef | undefined {
  return PLAYABLE_PILOTS.find(p => p.entityId === entityId);
}

// Back-compat aliases used by older imports
export const PILOT_ENTITY_ID = PILOT_PRECINCT.entityId;
export const PILOT_LOOP_ID = PILOT_PRECINCT.loopId;
export const PILOT_VERB_PLAY_ID = PILOT_PRECINCT.verbPlayId;
export const PILOT_MOVEMENT_ID = PILOT_PRECINCT.movementId;
