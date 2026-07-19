/**
 * Starmap movement verbs — Special residency entity kits (templates).
 * MV01–08 prior packs · MV09–11 Finance / Radio / Lobbyist.
 */

import type { PlayCard } from '../engine/types.js';
import { isMovementVerbAvailable } from '../engine/entities.js';
import {
  PILOT_CAPTAIN,
  PILOT_CHAMBER,
  PILOT_CLUB,
  PILOT_EDITOR,
  PILOT_FAITH,
  PILOT_FEED,
  PILOT_FINANCE,
  PILOT_JUDGE,
  PILOT_LOBBY,
  PILOT_PARTY,
  PILOT_PRECINCT,
  PILOT_RADIO,
  PILOT_SLATE,
  PILOT_UNION
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

/**
 * MV09 — Call the finance book (AL10).
 */
export const MV09_FinanceBook: PlayCard = {
  id: PILOT_FINANCE.verbPlayId,
  n: 'Call the finance book',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'orbit movement',
  kind: 'ally',
  residency: 'special',
  control: 'player',
  entityScope: [PILOT_FINANCE.entityId],
  attrs: ['CRA', 'CLO'],
  d: 'The Finance Chair opens the call sheet. Special kit — money spine, not a free weekly drip forever.',
  show: s => isMovementVerbAvailable(s, PILOT_FINANCE.verbPlayId),
  odds: () => 0.92,
  run: s => {
    s.money += 900;
    s.contacts += 20;
    s.endorsePts += 1;
    markEntity(s, PILOT_FINANCE.entityId);
    consumePilot(s, PILOT_FINANCE.consumeFlag, PILOT_FINANCE.residueFlag);
    return (
      'The book answers. +$900, +20 contacts, +1 endorsement. ' +
      '(Starmap: ENT_FINANCE_CHAIR. Residue: orbit_finance_book.)'
    );
  }
};

/**
 * MV10 — Take the drive-time slot (AL05).
 */
export const MV10_DriveTime: PlayCard = {
  id: PILOT_RADIO.verbPlayId,
  n: 'Take the drive-time slot',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'orbit movement',
  kind: 'ally',
  residency: 'special',
  control: 'player',
  entityScope: [PILOT_RADIO.entityId],
  attrs: ['CHA', 'CRA'],
  d: 'Open mic between farm reports and the noon news. Special kit — Radio Host orbit. Name heat, not an endorsement.',
  show: s => isMovementVerbAvailable(s, PILOT_RADIO.verbPlayId),
  odds: () => 0.9,
  run: s => {
    s.nameID += 9;
    s.momentum += 2;
    s.faces.F = Math.min(100, (s.faces.F || 0) + 5);
    s.contacts += 25;
    markEntity(s, PILOT_RADIO.entityId);
    consumePilot(s, PILOT_RADIO.consumeFlag, PILOT_RADIO.residueFlag);
    return (
      'Drive time says your name clean. +9 name ID, +2 momentum, +25 contacts, Faces F up. ' +
      '(Starmap: ENT_RADIO_HOST. Residue: orbit_drive_time.)'
    );
  }
};

/**
 * MV11 — Spend the lobbyist access map (AL13).
 */
export const MV11_LobbyMap: PlayCard = {
  id: PILOT_LOBBY.verbPlayId,
  n: 'Spend the access map',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [2, 3],
  tag: 'orbit movement',
  kind: 'ally',
  residency: 'special',
  control: 'player',
  entityScope: [PILOT_LOBBY.entityId],
  attrs: ['DIP', 'CRA'],
  d: 'A junior lobbyist with a conscience walks you the side door. Special kit — access, not a vote.',
  show: s => isMovementVerbAvailable(s, PILOT_LOBBY.verbPlayId),
  odds: () => 0.88,
  run: s => {
    s.contacts += 45;
    s.endorsePts += 1;
    s.momentum += 1;
    s.capital = (s.capital || 0) + 1;
    // Soft session seed if ever seated later; harmless on campaign
    s.favor = Math.min(100, (s.favor || 0) + 2);
    markEntity(s, PILOT_LOBBY.entityId);
    consumePilot(s, PILOT_LOBBY.consumeFlag, PILOT_LOBBY.residueFlag);
    return (
      'The map has three names that still take coffee. +45 contacts, +1 endorsement, +1 momentum, +1 capital, favor up. ' +
      '(Starmap: ENT_JUNIOR_LOBBYIST. Residue: orbit_lobby_map.)'
    );
  }
};

/**
 * MV12 — Spend the plant-gate endorsement (union local).
 */
export const MV12_PlantGate: PlayCard = {
  id: PILOT_UNION.verbPlayId,
  n: 'Spend the plant-gate nod',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  field: true,
  tag: 'orbit movement',
  kind: 'ally',
  residency: 'special',
  control: 'player',
  entityScope: [PILOT_UNION.entityId],
  attrs: ['CLO', 'DIP'],
  d: 'The local president puts a hand on your shoulder at shift change. Special kit — Union orbit. Volunteers and doors.',
  show: s => isMovementVerbAvailable(s, PILOT_UNION.verbPlayId),
  odds: () => 0.9,
  run: (s, _o, g) => {
    s.volPool += 3;
    s.endorsePts += 2;
    s.contacts += 35;
    s.faces.G = Math.min(100, (s.faces.G || 0) + 4);
    if (g) {
      g.rapport = Math.min(100, (g.rapport || 0) + 6);
      g.gotv = (g.gotv || 0) + 0.08;
    }
    markEntity(s, PILOT_UNION.entityId);
    consumePilot(s, PILOT_UNION.consumeFlag, PILOT_UNION.residueFlag);
    return (
      'The gate nods. +3 volunteers, +2 endorsement, +35 contacts, Faces G up' +
      (g ? `, rapport/GOTV at ${g.n}` : '') +
      '. (Starmap: ENT_UNION_LOCAL_PRES. Residue: orbit_plant_gate.)'
    );
  }
};

/**
 * MV13 — Work the chamber chicken circuit.
 */
export const MV13_RubberChicken: PlayCard = {
  id: PILOT_CHAMBER.verbPlayId,
  n: 'Work the chicken circuit',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'orbit movement',
  kind: 'ally',
  residency: 'special',
  control: 'player',
  entityScope: [PILOT_CHAMBER.entityId],
  attrs: ['DIP', 'CHA'],
  d: 'Rubber chicken, name tags, reliable voters. Special kit — Chamber orbit. Money and polite weight.',
  show: s => isMovementVerbAvailable(s, PILOT_CHAMBER.verbPlayId),
  odds: () => 0.9,
  run: s => {
    s.money += 500;
    s.endorsePts += 2;
    s.nameID += 5;
    s.contacts += 30;
    markEntity(s, PILOT_CHAMBER.entityId);
    consumePilot(s, PILOT_CHAMBER.consumeFlag, PILOT_CHAMBER.residueFlag);
    return (
      'Main street files you under serious. +$500, +2 endorsement, +5 name ID, +30 contacts. ' +
      '(Starmap: ENT_CHAMBER_EXEC. Residue: orbit_rubber_chicken.)'
    );
  }
};

/**
 * MV14 — Sit the feed-store bench (AL07).
 */
export const MV14_FeedBench: PlayCard = {
  id: PILOT_FEED.verbPlayId,
  n: 'Sit the feed-store bench',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2],
  tag: 'orbit movement',
  kind: 'ally',
  residency: 'special',
  control: 'player',
  entityScope: [PILOT_FEED.entityId],
  attrs: ['CHA', 'CON'],
  d: 'Unofficial senate on the bench out front. Special kit — Feed-Store orbit. Rumor is infrastructure.',
  show: s => isMovementVerbAvailable(s, PILOT_FEED.verbPlayId),
  odds: () => 0.92,
  run: s => {
    s.contacts += 55;
    s.momentum += 1;
    s.nameID += 4;
    s.volPool += 1;
    // Rural grounds soft open if present
    for (const id of ['GR02', 'GR05', 'GR06']) {
      const ground = s.groundsArr.find(x => x.id === id);
      if (ground) ground.rapport = Math.min(100, (ground.rapport || 0) + 4);
    }
    markEntity(s, PILOT_FEED.entityId);
    consumePilot(s, PILOT_FEED.consumeFlag, PILOT_FEED.residueFlag);
    return (
      'The bench remembers your face. +55 contacts, +4 name ID, +1 volunteer, +1 momentum, rural rapport. ' +
      '(Starmap: ENT_FEED_STORE. Residue: orbit_feed_bench.)'
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
  MV08_SlateCard,
  MV09_FinanceBook,
  MV10_DriveTime,
  MV11_LobbyMap,
  MV12_PlantGate,
  MV13_RubberChicken,
  MV14_FeedBench
];
