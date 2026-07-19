/**
 * Starmap movement verbs — Special residency entity kits (templates).
 * MV01–03 original pilots · MV04–07 County Party / Club / Editor / Faith.
 */

import type { PlayCard } from '../engine/types.js';
import { isMovementVerbAvailable } from '../engine/entities.js';
import {
  PILOT_CAPTAIN,
  PILOT_CLUB,
  PILOT_EDITOR,
  PILOT_FAITH,
  PILOT_JUDGE,
  PILOT_PARTY,
  PILOT_PRECINCT,
  PILOT_SLATE
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

/**
 * MV04 — Activate the County Party apparatus (AL02).
 */
export const MV04_PartyApparatus: PlayCard = {
  id: PILOT_PARTY.verbPlayId,
  n: 'Activate the party apparatus',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'orbit movement',
  kind: 'ally',
  residency: 'special',
  control: 'player',
  entityScope: [PILOT_PARTY.entityId],
  attrs: ['DIP', 'CLO'],
  d: 'The Chairwoman opens the file and the volunteer list. Special kit — County Party orbit.',
  show: s => isMovementVerbAvailable(s, PILOT_PARTY.verbPlayId),
  odds: () => 0.9,
  run: s => {
    s.endorsePts += 2;
    s.volPool += 2;
    s.contacts += 50;
    s.money += 400;
    markEntity(s, PILOT_PARTY.entityId);
    consumePilot(s, PILOT_PARTY.consumeFlag, PILOT_PARTY.residueFlag);
    return (
      'County HQ moves. +2 endorsement, +2 volunteers, +50 contacts, +$400. ' +
      '(Starmap: ENT_COUNTY_PARTY_EXEC. Residue: orbit_party_apparatus.)'
    );
  }
};

/**
 * MV05 — Pull the club roster (AL03).
 */
export const MV05_ClubRoster: PlayCard = {
  id: PILOT_CLUB.verbPlayId,
  n: 'Pull the club roster',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2],
  tag: 'orbit movement',
  kind: 'ally',
  residency: 'special',
  control: 'player',
  entityScope: [PILOT_CLUB.entityId],
  attrs: ['DIP', 'CHA'],
  d: 'Every name that votes straw. Special kit — Club Leader orbit.',
  show: s => isMovementVerbAvailable(s, PILOT_CLUB.verbPlayId),
  odds: () => 0.92,
  run: s => {
    s.endorsePts += 1;
    s.contacts += 60;
    s.volPool += 1;
    s.momentum += 1;
    markEntity(s, PILOT_CLUB.entityId);
    consumePilot(s, PILOT_CLUB.consumeFlag, PILOT_CLUB.residueFlag);
    return (
      'The roster lands on your kitchen table. +1 endorsement, +60 contacts, +1 volunteer, +1 momentum. ' +
      '(Starmap: ENT_CLUB_LEADER. Residue: orbit_club_roster.)'
    );
  }
};

/**
 * MV06 — Call in the newsroom fair shake (AL04).
 */
export const MV06_NewsroomNod: PlayCard = {
  id: PILOT_EDITOR.verbPlayId,
  n: 'Call in the fair shake',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'orbit movement',
  kind: 'ally',
  residency: 'special',
  control: 'player',
  entityScope: [PILOT_EDITOR.entityId],
  attrs: ['CHA', 'CRA'],
  d: 'Not an endorsement — the benefit of the doubt in print. Special kit — Local Editor orbit.',
  show: s => isMovementVerbAvailable(s, PILOT_EDITOR.verbPlayId),
  odds: () => 0.88,
  run: s => {
    s.nameID += 10;
    s.momentum += 2;
    s.faces.F = Math.min(100, (s.faces.F || 0) + 6);
    markEntity(s, PILOT_EDITOR.entityId);
    consumePilot(s, PILOT_EDITOR.consumeFlag, PILOT_EDITOR.residueFlag);
    return (
      'The weekly gives you the clean write-up. +10 name ID, +2 momentum, Faces F up. ' +
      '(Starmap: ENT_LOCAL_EDITOR. Residue: orbit_newsroom_nod.)'
    );
  }
};

/**
 * MV07 — Corridor blessing (AL08).
 */
export const MV07_CorridorBlessing: PlayCard = {
  id: PILOT_FAITH.verbPlayId,
  n: 'Open the corridor',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'orbit movement',
  kind: 'ally',
  residency: 'special',
  control: 'player',
  entityScope: [PILOT_FAITH.entityId],
  attrs: ['CON', 'DIP'],
  d: 'The Pastor\'s hand on both of yours. Directory and volunteers. Special kit — Faith Leader orbit.',
  show: s => isMovementVerbAvailable(s, PILOT_FAITH.verbPlayId),
  odds: () => 0.9,
  run: s => {
    s.volPool += 3;
    s.faces.T = Math.min(100, (s.faces.T || 0) + 5);
    s.faces.G = Math.min(100, (s.faces.G || 0) + 5);
    s.contacts += 35;
    // Corridor ground
    const g = s.groundsArr.find(x => x.id === 'GR04');
    if (g) {
      g.rapport = Math.min(100, g.rapport + 8);
      g.gated = false;
    }
    if (!s.assets.includes('A13')) s.assets.push('A13');
    markEntity(s, PILOT_FAITH.entityId);
    consumePilot(s, PILOT_FAITH.consumeFlag, PILOT_FAITH.residueFlag);
    return (
      'The Corridor opens. +3 volunteers, +35 contacts, Church Corridor rapport, directory (A13). ' +
      '(Starmap: ENT_FAITH_LEADER. Residue: orbit_corridor_blessing.)'
    );
  }
};

/**
 * MV08 — Run the slate hard (AL16 / printed card).
 * Unlocks after See the Slate-Maker (AL16/OB3) or Chairwoman+cash+endorse path.
 */
export const MV08_SlateCard: PlayCard = {
  id: PILOT_SLATE.verbPlayId,
  n: 'Run the slate hard',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [2, 3],
  tag: 'orbit movement',
  kind: 'ally',
  residency: 'special',
  control: 'player',
  entityScope: [PILOT_SLATE.entityId],
  attrs: ['CRA', 'DIP'],
  d: 'Half the primary votes from a printed card. Special kit — Slate-Maker orbit. His marker was already on it.',
  show: s => isMovementVerbAvailable(s, PILOT_SLATE.verbPlayId),
  odds: () => 0.9,
  run: s => {
    s.slate = true;
    s.endorsePts += 3;
    s.nameID += 12;
    s.momentum += 2;
    s.contacts += 40;
    // Primary heat — the card is the room
    s.faces.F = Math.min(100, (s.faces.F || 0) + 4);
    markEntity(s, PILOT_SLATE.entityId);
    consumePilot(s, PILOT_SLATE.consumeFlag, PILOT_SLATE.residueFlag);
    return (
      'The card hits every kitchen table that votes. +3 endorsement, +12 name ID, +2 momentum, +40 contacts. ' +
      '(Starmap: ENT_SLATE_MAKER. Residue: orbit_slate_card. His marker still rides.)'
    );
  }
};

export const STARMAP_PLAYS: PlayCard[] = [
  MV01_PrecinctNetwork,
  MV02_FieldPlan,
  MV03_CourthouseNod,
  MV04_PartyApparatus,
  MV05_ClubRoster,
  MV06_NewsroomNod,
  MV07_CorridorBlessing,
  MV08_SlateCard
];
