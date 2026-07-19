/**
 * Starmap query + condition evaluation + multi-pilot movement sync.
 * Issues #17 #18. Playable pilots: Precinct Chair, Canvass Captain, County Judge.
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
  PLAYABLE_PILOTS,
  PILOT_ENTITY_ID,
  PILOT_VERB_PLAY_ID,
  pilotByVerb,
  type PilotDef
} from '../data/starmap/pilots.js';
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
  PILOT_VERB_PLAY_ID,
  PLAYABLE_PILOTS,
  pilotByVerb
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
    case 'name_id_gte': {
      if (state.nameID < Number(p.n ?? 0)) return false;
      // Optional compounds for template paths
      if (p.requireVol !== undefined && (state.volPool ?? 0) < Number(p.requireVol)) {
        return false;
      }
      if (p.requireBacker !== undefined) {
        const b = String(p.requireBacker);
        if (!state.backers?.includes(b)) return false;
      }
      return true;
    }
    case 'endorse_gte': {
      const need = Number(p.n ?? 0);
      if (state.endorsePts < need) return false;
      const reqAlly = p.requireAlly;
      if (reqAlly !== undefined && reqAlly !== '') {
        if (!warm(state, String(reqAlly))) return false;
      }
      // Optional name floor (judge weight path)
      if (p.requireName !== undefined && state.nameID < Number(p.requireName)) {
        return false;
      }
      // Optional cash floor (slate-ready path)
      if (p.requireCash !== undefined && state.money < Number(p.requireCash)) {
        return false;
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

function pilotConsumed(state: GameState, pilot: PilotDef): boolean {
  return !!state.sessionFlags?.[pilot.consumeFlag];
}

/**
 * All open movement opportunities across playable pilots.
 * Overlay on campaign — does not leave primary/general.
 */
export function checkMovementOptions(state: GameState): MovementOpportunity[] {
  if (state.stage === 'session' || state.stage === 'waiting') return [];
  const out: MovementOpportunity[] = [];

  for (const pilot of PLAYABLE_PILOTS) {
    if (pilotConsumed(state, pilot)) continue;
    const loop = getLoop(pilot.loopId);
    if (!loop) continue;
    for (const adv of loop.advancement) {
      if (!evaluateCondition(state, adv)) continue;
      out.push({
        id: pilot.movementId,
        entityId: pilot.entityId,
        conditionId: adv.id,
        description: adv.description,
        movementTarget: adv.movementTarget,
        verbPlayId: pilot.verbPlayId
      });
      break; // one opportunity per pilot
    }
  }
  return out;
}

/**
 * After plays / week advance: open pending movements; log ORBIT OPEN once each.
 * pendingMovement holds the first open orbit (UI hint); all verbs still show via camp.
 */
export function syncMovementFlags(state: GameState): void {
  const opts = checkMovementOptions(state);
  if (!opts.length) {
    // Keep last pending if still valid for its verb
    if (state.pendingMovement?.verbPlayId) {
      const still = opts.some(o => o.verbPlayId === state.pendingMovement!.verbPlayId);
      if (!still && !isMovementVerbAvailable(state, state.pendingMovement.verbPlayId)) {
        // re-check without clearing if consumed handled by show()
      }
    }
    return;
  }

  state.sessionFlags = state.sessionFlags || {};
  for (const opt of opts) {
    const pilot = pilotByVerb(opt.verbPlayId ?? '');
    if (!pilot) continue;
    if (!state.sessionFlags[pilot.announceFlag]) {
      state.sessionFlags[pilot.announceFlag] = true;
      state.log.push({
        week: state.week,
        kind: 'note',
        text: `ORBIT OPEN — ${pilot.logLabel}. (${opt.description}) Movement verb available.`
      });
    }
  }
  // Prefer higher MV numbers (heavier orbits) for pending hint
  const rank = (id: string) => {
    const m = /^MV(\d+)$/.exec(id);
    return m ? Number(m[1]) : 0;
  };
  const best = [...opts].sort(
    (a, b) => rank(b.verbPlayId ?? '') - rank(a.verbPlayId ?? '')
  )[0]!;
  state.pendingMovement = best;
}

export function isMovementVerbAvailable(state: GameState, verbPlayId: string): boolean {
  const pilot = pilotByVerb(verbPlayId);
  if (!pilot) return false;
  if (pilotConsumed(state, pilot)) return false;
  if (state.pendingMovement?.verbPlayId === verbPlayId) return true;
  return checkMovementOptions(state).some(o => o.verbPlayId === verbPlayId);
}

/** @deprecated use isMovementVerbAvailable(state, 'MV01') */
export function isPilotMovementAvailable(state: GameState): boolean {
  return isMovementVerbAvailable(state, PILOT_VERB_PLAY_ID);
}

/** All starmap Special verbs currently legal as camp offers. */
export function listAvailableMovementVerbIds(state: GameState): string[] {
  return checkMovementOptions(state)
    .map(o => o.verbPlayId)
    .filter((id): id is string => !!id);
}

export function starmapCounts(): {
  entities: number;
  byTier: Record<number, number>;
  orbits: number;
  loops: number;
  playablePilots: number;
} {
  const byTier: Record<number, number> = {};
  for (const e of Object.values(ENTITIES)) {
    byTier[e.tier] = (byTier[e.tier] ?? 0) + 1;
  }
  return {
    entities: Object.keys(ENTITIES).length,
    byTier,
    orbits: ORBITS.length,
    loops: Object.keys(LOOPS).length,
    playablePilots: PLAYABLE_PILOTS.length
  };
}
