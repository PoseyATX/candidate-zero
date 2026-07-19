/**
 * Outside event deck — world pressure the player does not play.
 * Residency: outside · control: world. See docs/CARD-RESIDENCY.md.
 */

import type { GameState } from '../engine/types.js';
import type { CardKind, CardResidency, CardControl } from '../engine/types.js';

export interface OutsideEvent {
  id: string;
  n: string;
  d: string;
  residency: CardResidency; // always 'outside'
  control: CardControl; // always 'world'
  kind?: CardKind;
  /** Stages where this may fire. */
  stages: Array<'primary' | 'general' | 'session'>;
  /** Once per campaign (eventsFired). */
  once?: boolean;
  /** Relative draw weight. */
  w: number;
  /** Extra gate beyond stage. */
  show?: (s: GameState) => boolean;
  apply: (s: GameState) => string;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** New World Screw Worm — ecological crisis (user's example Outside card). */
export const EV_SCREWWORM: OutsideEvent = {
  id: 'EV_SCREWWORM',
  n: 'New World Screw Worm',
  d: 'Livestock panic. Ranchers want answers. You do not play this card — it plays you.',
  residency: 'outside',
  control: 'world',
  kind: 'liability',
  stages: ['primary', 'general', 'session'],
  once: true,
  w: 3,
  show: s =>
    s.regionHook === 'permian' ||
    s.regionHook === 'panhandle' ||
    s.regionHook === 'east' ||
    s.regionHook === 'hill' ||
    !s.regionHook,
  apply: s => {
    s.momentum = Math.max(0, s.momentum - 1);
    // Rural grounds feel it
    for (const g of s.groundsArr) {
      if (g.id === 'GR02' || g.id === 'GR06' || g.id === 'GR07') {
        g.rapport = clamp(g.rapport - 3, 0, 100);
      }
    }
    if (s.stage === 'session') {
      s.districtStanding = clamp(s.districtStanding - 3, 0, 100);
      return (
        'OUTSIDE — NEW WORLD SCREW WORM. The Ag committee lights up; ranchers call the district office first. ' +
        'Standing −3, rural rapport softens. You did not play this. You answer it.'
      );
    }
    s.contacts = Math.max(0, s.contacts - 15);
    return (
      'OUTSIDE — NEW WORLD SCREW WORM. Livestock panic on the FM roads. Contacts scatter (−15); ' +
      'rural rapport dips. You cannot play the worm. You can only show up.'
    );
  }
};

export const EV_REDISTRICT_RUMOR: OutsideEvent = {
  id: 'EV_REDISTRICT',
  n: 'Mid-Decade Map Rumor',
  d: 'Lines on a napkin in Austin. Your district might not exist as drawn.',
  residency: 'outside',
  control: 'world',
  kind: 'liability',
  stages: ['primary', 'general', 'session'],
  once: true,
  w: 2,
  apply: s => {
    s.momentum = Math.max(0, s.momentum - 2);
    s.hitPieces += 1;
    s.faces.P = clamp((s.faces.P || 0) - 3, -50, 100);
    return (
      'OUTSIDE — MAP RUMOR. A mid-decade redraw story hits the blogs. Momentum −2, a hit piece, ' +
      'Parliamentarian face softens. The map is not yours to play.'
    );
  }
};

export const EV_ETHICS_COMPLAINT: OutsideEvent = {
  id: 'EV_ETHICS',
  n: 'Ethics Complaint Filed',
  d: 'Someone with a PAC and a grudge files on you. Process is the punishment.',
  residency: 'outside',
  control: 'world',
  kind: 'blackmail',
  stages: ['primary', 'general', 'session'],
  once: true,
  w: 2,
  show: s => (s.exposure || 0) >= 1 || s.hitPieces >= 1 || (s.shadowPlays || 0) >= 1,
  apply: s => {
    s.exposure = (s.exposure || 0) + 2;
    s.hitPieces += 1;
    s.favor = clamp((s.favor || 50) - 5, 0, 100);
    return (
      'OUTSIDE — ETHICS COMPLAINT. Process is the punishment. Exposure +2, hit piece, favor −5. ' +
      'You do not play this card. You hire a lawyer or you bleed.'
    );
  }
};

export const EV_DROUGHT: OutsideEvent = {
  id: 'EV_DROUGHT',
  n: 'Exceptional Drought',
  d: 'The aquifers drop. Water talk eats every town hall.',
  residency: 'outside',
  control: 'world',
  kind: 'liability',
  stages: ['primary', 'general'],
  once: true,
  w: 2,
  show: s => s.regionHook === 'hill' || s.regionHook === 'permian' || s.regionHook === 'panhandle' || s.issue === 'water',
  apply: s => {
    s.faces.T = clamp((s.faces.T || 0) + 3, -50, 100);
    s.money = Math.max(0, s.money - 200);
    for (const g of s.groundsArr) {
      if (g.id === 'GR02' || g.id === 'GR07') g.rapport = clamp(g.rapport + 2, 0, 100);
    }
    return (
      'OUTSIDE — DROUGHT. Exceptional on the maps. Money −$200 (hauling, generators), Truth face +3; ' +
      'FM roads and lake country listen harder. Weather is not a hand card.'
    );
  }
};

export const EV_ENERGY_BOOM: OutsideEvent = {
  id: 'EV_ENERGY_BOOM',
  n: 'Permian Checkbooks Open',
  d: 'Oil money wants friends. Strings optional until they are not.',
  residency: 'outside',
  control: 'world',
  kind: 'bargain',
  stages: ['primary', 'general'],
  once: true,
  w: 2,
  show: s => s.regionHook === 'permian' || s.regionHook === 'gulf' || s.regionHook === 'west',
  apply: s => {
    s.money += 800;
    s.faces.L = clamp((s.faces.L || 0) - 6, -50, 100);
    s.exposure = (s.exposure || 0) + 1;
    return (
      'OUTSIDE — ENERGY BOOM. A check arrives without a speech. +$800, Loyalty face −6, exposure +1. ' +
      'You did not play the boom. You can refuse the next ask — if you are ready.'
    );
  }
};

export const EV_RIVAL_DUMP: OutsideEvent = {
  id: 'EV_RIVAL_DUMP',
  n: 'Rival Oppo Dump',
  d: 'Their folder becomes Friday\'s mailer. Not your play — their weather.',
  residency: 'outside',
  control: 'world',
  kind: 'blackmail',
  stages: ['primary', 'general'],
  once: false,
  w: 4,
  show: s => s.stage === 'primary' || s.stage === 'general',
  apply: s => {
    s.hitPieces += 1;
    s.momentum = Math.max(0, s.momentum - 1);
    s.nameID = Math.max(0, s.nameID - 1);
    return (
      'OUTSIDE — RIVAL DUMP. A mailer hits the precincts with your worst photograph. ' +
      'Hit piece +1, momentum −1, name ID −1. React with Main cards — you do not "play" the dump.'
    );
  }
};

export const EV_FLOOD_WEEK: OutsideEvent = {
  id: 'EV_FLOOD',
  n: 'Gulf Flood Week',
  d: 'Water in the yards. Doors close. Politics waits on sandbags.',
  residency: 'outside',
  control: 'world',
  kind: 'liability',
  stages: ['primary', 'general'],
  once: true,
  w: 2,
  show: s => s.regionHook === 'gulf' || s.regionHook === 'east' || s.regionHook === 'valley',
  apply: s => {
    s.ap = Math.max(0, s.ap - 1);
    s.volPool = Math.max(0, s.volPool - 1);
    s.faces.G = clamp((s.faces.G || 0) + 2, -50, 100);
    return (
      'OUTSIDE — FLOOD WEEK. Routes wash out. AP −1 this week, volunteer −1, Grit face +2. ' +
      'The storm is not in your hand.'
    );
  }
};

export const EV_SCHOOL_BOARD_WAR: OutsideEvent = {
  id: 'EV_SCHOOL_WAR',
  n: 'School Board Blood Sport',
  d: 'A curriculum fight goes county-wide. Every candidate gets asked.',
  residency: 'outside',
  control: 'world',
  kind: 'liability',
  stages: ['primary', 'general'],
  once: true,
  w: 3,
  show: _s => true,
  apply: s => {
    s.momentum += 1;
    s.exposure = (s.exposure || 0) + 1;
    s.faces.T = clamp((s.faces.T || 0) + 2, -50, 100);
    return (
      'OUTSIDE — SCHOOL BOARD WAR. The county picks a side and wants yours. Momentum +1, exposure +1, Truth +2. ' +
      'Culture weather — not a verb you chose.'
    );
  }
};

export const EV_SPECIAL_SESSION: OutsideEvent = {
  id: 'EV_SPECIAL_SESSION',
  n: 'Special Session Called',
  d: 'The Governor wants another bite. The calendar never sleeps.',
  residency: 'outside',
  control: 'world',
  kind: 'liability',
  stages: ['session'],
  once: true,
  w: 3,
  apply: s => {
    s.favor = clamp(s.favor - 3, 0, 100);
    if (s.bill && s.bill.pipelineStage >= 1 && s.bill.pipelineStage < 8) {
      s.bill.heat += 1;
    }
    s.districtStanding = clamp(s.districtStanding - 1, 0, 100);
    return (
      'OUTSIDE — SPECIAL SESSION. Leadership resets the clock for their priorities. Favor −3, bill heat +1, ' +
      'standing −1. You do not call special sessions as a freshman. You survive them.'
    );
  }
};

export const EV_PRIMARY_CHALLENGER_AD: OutsideEvent = {
  id: 'EV_CHALLENGER_AD',
  n: 'Primary Challenger Airs',
  d: 'A younger, angrier ad buy. The seat was never a gift.',
  residency: 'outside',
  control: 'world',
  kind: 'liability',
  stages: ['session'],
  once: false,
  w: 3,
  show: s => Number(s.sessionFlags?.challengerHeat || 0) >= 1 || s.districtStanding < 55,
  apply: s => {
    s.sessionFlags = s.sessionFlags || {};
    s.sessionFlags.challengerHeat = Number(s.sessionFlags.challengerHeat || 0) + 1;
    s.districtStanding = clamp(s.districtStanding - 2, 0, 100);
    s.hitPieces += 1;
    return (
      'OUTSIDE — CHALLENGER AD. "We can do better." Standing −2, hit piece, challenger heat +1. ' +
      'Casework is your answer. This card was never yours to play.'
    );
  }
};

/** Full Outside catalog. */
export const OUTSIDE_EVENTS: OutsideEvent[] = [
  EV_SCREWWORM,
  EV_REDISTRICT_RUMOR,
  EV_ETHICS_COMPLAINT,
  EV_DROUGHT,
  EV_ENERGY_BOOM,
  EV_RIVAL_DUMP,
  EV_FLOOD_WEEK,
  EV_SCHOOL_BOARD_WAR,
  EV_SPECIAL_SESSION,
  EV_PRIMARY_CHALLENGER_AD
];

export const OUTSIDE_EVENT_IDS = OUTSIDE_EVENTS.map(e => e.id);
