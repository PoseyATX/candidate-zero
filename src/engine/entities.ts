/**
 * Starmap query + condition evaluation + movement sync (v0).
 * Issues #17 #18. Pilot: Precinct Chair overlay on campaign.
 */

import type { GameState } from './types.js';
import type {
  ConditionSpec,
  EntityDef,
  MovementOpportunity,
  OrbitDef,
  TimingWindow
} from './types-entities.js';
import { ENTITIES, getEntityDef, listEntitiesByTier } from '../data/starmap/entities.js';
import { LOOPS, getLoop } from '../data/starmap/loops.js';
import { ORBITS, orbitsFrom, orbitsTo } from '../data/starmap/orbits.js';
import { entityIdForAlly, allyIdForEntity } from '../data/starmap/bridges.js';
import {
  PILOT_ENTITY_ID,
  PILOT_MOVEMENT_ID,
  PILOT_VERB_PLAY_ID
} from '../data/starmap/pilot-precinct.js';
import { warm } from './reputation.js';

export {
  ENTITIES,
  getEntityDef,
  listEntitiesByTier,
  LOOPS,
  getLoop,
  ORBITS,
  orbitsFrom,
  orbitsTo,
  entityIdForAlly,
  allyIdForEntity,
  PILOT_ENTITY_ID,
  PILOT_VERB_PLAY_ID
};

export function getEntity(id: string): EntityDef | undefined {
  return getEntityDef(id);
}

function stageToTiming(state: GameState): TimingWindow {
  if (state.over) return 'waiting';
  if (state.stage === 'session') return 'session';
  if (state.stage === 'general') return 'general';
  if (state.stage === 'primary' && !state.ballot) return 'pre-filing';
  if (state.stage === 'primary') return 'primary';
  return 'primary';
}

export function getAvailableOrbits(state: GameState, entityId: string): OrbitDef[] {
  const timing = stageToTiming(state);
  return orbitsFrom(entityId).filter(orb => {
    if (!orb.timingWindows || orb.timingWindows.length === 0) return true;
    return orb.timingWindows.includes(timing);
  });
}

export function evaluateCondition(state: GameState, spec: ConditionSpec): boolean {
  const p = spec.params ?? {};
  switch (spec.kind) {
    case 'always_false':
    case 'manual_todo':
      return false;
    case 'stage_is':
      return state.stage === String(p.stage ?? '');
    case 'has_ally':
      return warm(state, String(p.allyId ?? ''));
    case 'has_rep':
      return state.reps.includes(String(p.repId ?? ''));
    case 'has_obl':
      return state.obls.includes(String(p.oblId ?? ''));
    case 'name_id_gte':
      return state.nameID >= Number(p.n ?? 0);
    case 'endorse_gte': {
      const need = Number(p.n ?? 0);
      if (state.endorsePts < need) return false;
      const reqAlly = p.requireAlly;
      if (reqAlly !== undefined && reqAlly !== '') {
        return warm(state, String(reqAlly));
      }
      return true;
    }
    case 'district_standing_gte':
      return state.districtStanding >= Number(p.n ?? 0);
    case 'warm_ally_gte': {
      const allyId = String(p.allyId ?? '');
      const n = Number(p.n ?? 1);
      const count = state.allies.filter(a => a.id === allyId && a.warm > 0).length;
      return count >= n;
    }
    case 'hit_pieces_gte':
      return state.hitPieces >= Number(p.n ?? 0);
    default:
      return false;
  }
}

/**
 * Movement opportunities for the pilot (Precinct Chair) and later currentEntity.
 * Overlay on campaign — does not require leaving primary/general stage.
 */
export function checkMovementOptions(state: GameState): MovementOpportunity[] {
  if (state.stage === 'session') return [];
  if (state.sessionFlags?.mv01Consumed) return [];

  const out: MovementOpportunity[] = [];
  const loop = getLoop('LOOP_ENT_PRECINCT_CHAIR');
  if (!loop) return out;

  for (const adv of loop.advancement) {
    if (!evaluateCondition(state, adv)) continue;
    out.push({
      id: PILOT_MOVEMENT_ID,
      entityId: PILOT_ENTITY_ID,
      conditionId: adv.id,
      description: adv.description,
      movementTarget: adv.movementTarget,
      verbPlayId: PILOT_VERB_PLAY_ID
    });
    break; // one pilot opportunity at a time
  }
  return out;
}

/**
 * After plays / week advance: open pending movement when conditions met.
 * Logs once when the orbit first opens.
 */
export function syncMovementFlags(state: GameState): void {
  const opts = checkMovementOptions(state);
  if (!opts.length) {
    // Do not clear pending if already set and not consumed — keep MV01 showable
    return;
  }
  const opt = opts[0]!;
  const already = state.pendingMovement?.id === opt.id;
  state.pendingMovement = opt;
  if (!already && !state.sessionFlags?.mv01Announced) {
    state.sessionFlags = state.sessionFlags || {};
    state.sessionFlags.mv01Announced = true;
    state.log.push({
      week: state.week,
      kind: 'note',
      text: `ORBIT OPEN — Precinct Chair network. (${opt.description}) Movement verb available: Call in the Precinct Chair network.`
    });
  }
}

export function isPilotMovementAvailable(state: GameState): boolean {
  if (state.sessionFlags?.mv01Consumed) return false;
  if (state.pendingMovement?.verbPlayId === PILOT_VERB_PLAY_ID) return true;
  return checkMovementOptions(state).some(o => o.verbPlayId === PILOT_VERB_PLAY_ID);
}

export function starmapCounts(): {
  entities: number;
  byTier: Record<number, number>;
  orbits: number;
  loops: number;
} {
  const byTier: Record<number, number> = {};
  for (const e of Object.values(ENTITIES)) {
    byTier[e.tier] = (byTier[e.tier] ?? 0) + 1;
  }
  return {
    entities: Object.keys(ENTITIES).length,
    byTier,
    orbits: ORBITS.length,
    loops: Object.keys(LOOPS).length
  };
}
