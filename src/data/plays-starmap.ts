/**
 * Starmap movement verbs — Special residency entity kits (issues #17/#18).
 * Pilots: MV01 Precinct Chair · MV02 Canvass Captain · MV03 County Judge.
 */

import type { PlayCard } from '../engine/types.js';
import { isMovementVerbAvailable } from '../engine/entities.js';
import {
  PILOT_CAPTAIN,
  PILOT_JUDGE,
  PILOT_PRECINCT
} from './starmap/pilots.js';

function markEntity(s: { entityHistory?: string[] }, entityId: string): void {
  s.entityHistory = s.entityHistory ?? [];
  if (!s.entityHistory.includes(entityId)) s.entityHistory.push(entityId);
}

function consumePilot(
  s: {
    sessionFlags?: Record<string, boolean | number | string>;
    pendingMovement?: unknown;
  },
  consumeFlag: string,
  residueFlag: string
): void {
  s.sessionFlags = s.sessionFlags || {};
  s.sessionFlags[consumeFlag] = true;
  s.sessionFlags[residueFlag] = true;
  s.pendingMovement = undefined;
}

/**
 * MV01 — Call in the Precinct Chair network.
 * Unlocks: 2× warm AL01 or endorse+AL01.
 */
export const MV01_PrecinctNetwork: PlayCard = {
  id: PILOT_PRECINCT.verbPlayId,
  n: 'Call in the Precinct Chair network',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2],
  tag: 'orbit movement',
  kind: 'ally',
  residency: 'special',
  control: 'player',
  entityScope: [PILOT_PRECINCT.entityId],
  attrs: ['DIP'],
  d: 'The chairs you banked open a door: lists, volunteers, a quiet county nod. Special kit — Precinct Chair orbit.',
  show: s => isMovementVerbAvailable(s, PILOT_PRECINCT.verbPlayId),
  odds: () => 0.95,
  run: s => {
    s.endorsePts += 2;
    s.contacts += 40;
    s.volPool += 1;
    markEntity(s, PILOT_PRECINCT.entityId);
    consumePilot(s, PILOT_PRECINCT.consumeFlag, PILOT_PRECINCT.residueFlag);
    return (
      'The precinct network answers. +2 endorsement weight, +40 contacts, +1 volunteer. ' +
      '(Starmap: ENT_PRECINCT_CHAIR orbit exercised. Residue: orbit_precinct_power.)'
    );
  }
};

/**
 * MV02 — Execute the Canvass Captain field plan.
 * Unlocks: warm AL09, or name+vol field pressure path.
 */
export const MV02_FieldPlan: PlayCard = {
  id: PILOT_CAPTAIN.verbPlayId,
  n: 'Execute the field plan',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  field: true,
  tag: 'orbit movement',
  kind: 'ally',
  residency: 'special',
  control: 'player',
  entityScope: [PILOT_CAPTAIN.entityId],
  attrs: ['CLO', 'DIP'],
  d: 'The captain\'s route book becomes the week\'s law. Special kit — Canvass Captain orbit. Field AP and turf GOTV.',
  show: s => isMovementVerbAvailable(s, PILOT_CAPTAIN.verbPlayId),
  odds: () => 0.92,
  run: (s, _o, g) => {
    s.fieldAp = (s.fieldAp || 0) + 1;
    s.volPool += 2;
    s.contacts += 25;
    // Seed GOTV on captain's turf or chosen ground
    const turfIds =
      s.allies.find(a => a.id === 'AL09' && a.grounds?.length)?.grounds ??
      (g ? [g.id] : []);
    let gotvNote = '';
    if (turfIds.length) {
      for (const id of turfIds) {
        const ground = s.groundsArr.find(x => x.id === id);
        if (ground) {
          ground.gotv = (ground.gotv || 0) + 0.15;
          gotvNote = ` +15% GOTV at ${ground.n}.`;
        }
      }
    } else if (g) {
      g.gotv = (g.gotv || 0) + 0.12;
      gotvNote = ` +12% GOTV at ${g.n}.`;
    }
    markEntity(s, PILOT_CAPTAIN.entityId);
    consumePilot(s, PILOT_CAPTAIN.consumeFlag, PILOT_CAPTAIN.residueFlag);
    return (
      `The field plan runs. +1 field AP this week, +2 volunteers, +25 contacts.${gotvNote} ` +
      '(Starmap: ENT_CANVASS_CAPTAIN orbit exercised. Residue: orbit_field_spine.)'
    );
  }
};

/**
 * MV03 — Spend the County Judge courthouse nod.
 * Unlocks: warm AL15, or endorse+name weight path.
 */
export const MV03_CourthouseNod: PlayCard = {
  id: PILOT_JUDGE.verbPlayId,
  n: 'Spend the courthouse nod',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'orbit movement',
  kind: 'ally',
  residency: 'special',
  control: 'player',
  entityScope: [PILOT_JUDGE.entityId],
  attrs: ['DIP', 'CLO'],
  d: 'The heaviest local name spends itself once. Special kit — County Judge orbit. Endorsement gravity and name heat.',
  show: s => isMovementVerbAvailable(s, PILOT_JUDGE.verbPlayId),
  odds: () => 0.9,
  run: s => {
    s.endorsePts += 3;
    s.nameID += 8;
    s.momentum += 2;
    s.contacts += 30;
    // Soft general edge via name — residue flag for future win-math hooks
    markEntity(s, PILOT_JUDGE.entityId);
    consumePilot(s, PILOT_JUDGE.consumeFlag, PILOT_JUDGE.residueFlag);
    return (
      'The County Judge is on the record for you. +3 endorsement, +8 name ID, +2 momentum, +30 contacts. ' +
      '(Starmap: ENT_COUNTY_JUDGE orbit exercised. Residue: orbit_courthouse_nod.)'
    );
  }
};

export const STARMAP_PLAYS: PlayCard[] = [
  MV01_PrecinctNetwork,
  MV02_FieldPlan,
  MV03_CourthouseNod
];
