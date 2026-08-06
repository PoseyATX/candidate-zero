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
  /**
   * Policy openings this event puts on the Docket when it fires during session.
   *
   * This is the field that ends "the screw worm happens and is forgotten".
   * Before it, `eventsFired` was written to stop the event repeating and read by
   * exactly zero cards — the world could speak and nothing in the game could
   * hear it. An event that names an opening is an event with consequences.
   */
  opens?: string[];
  /**
   * A door this event leaves open ON THE TRAIL, for a few weeks, then closed.
   *
   * `opens` is the same idea pointed at the session Docket — it is what ended
   * "the screw worm happens and is forgotten" inside the chamber. This is the
   * campaign half, and it is the last thing the world could not do: an event
   * could hit you and there was no way to go stand in it.
   *
   * The owner's framing: everywhere a card could be played there should be an
   * opportunity to play it, and every moving part should be actionable. A flood
   * is a moving part. So is a boom. So is a school-board war.
   *
   * PERISHABLE on purpose — `weeks` is how long showing up still reads as
   * showing up rather than as opportunism. Miss the window and it is gone, and
   * that is the whole tension: it lands in a week you already had plans.
   */
  hook?: {
    n: string;
    d: string;
    weeks: number;
    ground?: string;
    /**
     * Which verb this door offers. One card per flavour — see data/hook-plays.ts.
     *
     *   room  — somewhere with people in it. Go be there. Presence, no risk.
     *   fight — pick a side out loud, on the record, with a camera present.
     *   money — money is moving and it will find somebody this week.
     *   map   — a rumour. Go find out what is actually true before anybody else.
     *
     * Defaults to `room`, because showing up is the default thing a candidate
     * can do about anything.
     */
    flavour?: 'room' | 'fight' | 'money' | 'map';
  };
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
  opens: ['OP_AG_SCREWWORM'],
  hook: {
    n: 'The sale barn is holding a meeting about it',
    d:
      'Every rancher inside forty miles, folding chairs, bad coffee, and somebody from the state ' +
      'who will not answer the question. You can be in that room. Three weeks, then they stop meeting.',
    weeks: 3,
    flavour: 'room',
    ground: 'GR02'
  },
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
      'rural rapport dips. You cannot play the worm. You can only show up — and now you can.'
    );
  }
};

export const EV_REDISTRICT_RUMOR: OutsideEvent = {
  id: 'EV_REDISTRICT',
  hook: {
    n: 'Somebody in Austin has seen the actual map',
    d:
      'A staffer who owes somebody who owes you will put the draft on a table for eleven minutes. Knowing where the line goes is worth more than any opinion about where it should go.',
    weeks: 3,
    flavour: 'map'
  },
  opens: ['OP_ELEC_MAPS'],
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
  hook: {
    n: 'The complaint is public and so is the file it came from',
    d:
      'Everything filed is filed somewhere. Go read the whole thing before the people writing about it do.',
    weeks: 3,
    flavour: 'map'
  },
  opens: ['OP_CORR_BID'],
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
  hook: {
    n: 'The water district board meets and nobody ever comes',
    d:
      'Eleven people, a folding table, and the single most consequential body in this county that nobody has ever voted in. They will remember a candidate sat through all of it.',
    weeks: 4,
    flavour: 'room',
    ground: 'GR07'
  },
  opens: ['OP_WATER_DROUGHT'],
  n: 'Exceptional Drought',
  d: 'The aquifers drop. Water talk eats every town hall.',
  residency: 'outside',
  control: 'world',
  kind: 'liability',
  stages: ['primary', 'general'],
  once: true,
  w: 2,
  show: s => s.regionHook === 'hill' || s.regionHook === 'permian' || s.regionHook === 'panhandle' || s.issueId === 'water',
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
  hook: {
    n: 'The money is moving and it will find somebody this week',
    d:
      'Checkbooks are open right now and closing by month end. It will go to whoever asks first. That is the whole mechanism and everybody involved knows it.',
    weeks: 2,
    flavour: 'money'
  },
  opens: ['OP_TAX_SEVERANCE'],
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
  hook: {
    n: 'There is a disclaimer at the bottom of that mailer',
    d:
      'Six point type, a committee name nobody has heard of, and a treasurer who is somebody\'s '
      + 'cousin. It is a public filing. Go pull it and find out who actually paid for your worst photograph.',
    weeks: 3,
    flavour: 'map'
  },
  opens: ['OP_CORR_DISCLOSE'],
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
  opens: ['OP_WATER_FLOOD'],
  n: 'Gulf Flood Week',
  d: 'Water in the yards. Doors close. Politics waits on sandbags.',
  residency: 'outside',
  control: 'world',
  kind: 'liability',
  stages: ['primary', 'general'],
  once: true,
  w: 2,
  show: s => s.regionHook === 'gulf' || s.regionHook === 'east' || s.regionHook === 'valley',
  hook: {
    n: 'They are still pulling carpet out of houses',
    d:
      'The water went down and the cameras left, which is exactly when everybody who lives ' +
      'there finds out who is still around. Two weeks, and then it is somebody else.',
    weeks: 2,
    flavour: 'room'
  },
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
  opens: ['OP_SCHOOL_LIBRARY'],
  n: 'School Board Blood Sport',
  d: 'A curriculum fight goes county-wide. Every candidate gets asked.',
  residency: 'outside',
  control: 'world',
  kind: 'liability',
  stages: ['primary', 'general'],
  once: true,
  w: 3,
  show: _s => true,
  hook: {
    n: 'There is a school board meeting Thursday and it will be packed',
    d:
      'Everybody in the county with an opinion will be in that cafeteria. So will a reporter. ' +
      'Going means picking a side out loud, in a room, with your name on it.',
    weeks: 3,
    flavour: 'fight'
  },
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
  hook: {
    n: 'Everybody who matters is in Austin for three weeks',
    d:
      'The building is full, the bars are fuller, and nobody has anywhere to be at four in the afternoon. This is where the actual work of the next two years gets agreed to.',
    weeks: 3,
    flavour: 'room'
  },
  opens: ['OP_ELEC_MAPS'],
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
  hook: {
    n: 'The station will sell you the slot right after theirs',
    d:
      'Same break, same audience, ninety seconds later. It is not cheap and it is not subtle.',
    weeks: 2,
    flavour: 'money'
  },
  opens: ['OP_CORR_DISCLOSE'],
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

// --- Pack #2: quote-forward topical weather (Stupid Ideas #20 GREAT) ---
// Flavor is original paraphrase / public cadence — not verbatim soundbites.

/** Grid freeze memory — "the lights went out and nobody owned it." */
export const EV_GRID_FREEZE: OutsideEvent = {
  id: 'EV_GRID_FREEZE',
  hook: {
    n: 'The co-op is holding its annual meeting and the agenda is one item',
    d:
      'Everybody in that room lost a week of their lives to it and not one person has apologized to them yet.',
    weeks: 3,
    flavour: 'room'
  },
  opens: ['OP_GRID_WEATHERIZE'],
  n: 'Grid Freeze Hangover',
  d: 'Pipes still burst in the stories people tell. The ERCOT slide deck is a campaign issue whether you like it.',
  residency: 'outside',
  control: 'world',
  kind: 'liability',
  stages: ['primary', 'general', 'session'],
  once: true,
  w: 3,
  show: s =>
    s.regionHook === 'metro' ||
    s.regionHook === 'hill' ||
    s.regionHook === 'east' ||
    s.regionHook === 'gulf' ||
    !s.regionHook,
  apply: s => {
    s.faces.T = clamp((s.faces.T || 0) + 4, -50, 100);
    s.momentum = Math.max(0, s.momentum - 1);
    s.exposure = (s.exposure || 0) + 1;
    if (s.stage === 'session') {
      s.districtStanding = clamp(s.districtStanding - 2, 0, 100);
      return (
        'OUTSIDE — GRID FREEZE. "Keep your family safe" is what every mailer says now. ' +
        'Truth face +4, standing −2, exposure +1. You did not call the blackout. You answer the porch questions.'
      );
    }
    s.contacts = Math.max(0, s.contacts - 10);
    return (
      'OUTSIDE — GRID FREEZE. Somebody on a porch says, "We boiled snow." Momentum −1, contacts −10, Truth +4. ' +
      'Infrastructure weather — not a Main card.'
    );
  }
};

/** Property tax sermon season. */
export const EV_PROPERTY_TAX: OutsideEvent = {
  id: 'EV_PROPERTY_TAX',
  hook: {
    n: 'The HOA wants everybody on a stage on the same night',
    d:
      'Six candidates, one microphone, and a subdivision that has already decided appraisals are theft. Say something specific and you own it. Say nothing and they notice that too.',
    weeks: 3,
    flavour: 'fight',
    ground: 'GR03'
  },
  opens: ['OP_TAX_APPRAISAL'],
  n: 'Property Tax Revival',
  d: 'Every candidate will "fix the appraisal district." The math is harder than the slogan.',
  residency: 'outside',
  control: 'world',
  kind: 'liability',
  stages: ['primary', 'general'],
  once: true,
  w: 3,
  show: _s => true,
  apply: s => {
    s.momentum += 1;
    s.nameID = Math.max(0, s.nameID - 1);
    s.faces.O = clamp((s.faces.O || 0) + 2, -50, 100);
    for (const g of s.groundsArr) {
      if (g.id === 'GR03') g.rapport = clamp(g.rapport + 3, 0, 100);
    }
    return (
      'OUTSIDE — PROPERTY TAX. "Cut the rates" is the only hymn at the subdivision HOA. ' +
      'Momentum +1, name −1 (you are one of a dozen promising the same), Order face +2, New Subdivisions listen. ' +
      'You do not play the tax code. You inherit the sermon.'
    );
  }
};

/** Book / library culture fight. */
export const EV_LIBRARY_FIGHT: OutsideEvent = {
  id: 'EV_LIBRARY_FIGHT',
  hook: {
    n: 'There is a microphone in the stacks and a camera behind it',
    d:
      'Three minutes at the podium, both sides in the same parking lot, and no version of this where you leave without a position.',
    weeks: 2,
    flavour: 'fight'
  },
  opens: ['OP_SCHOOL_LIBRARY'],
  n: 'Library Shelf Fight',
  d: 'A list of titles becomes a county identity test. Cameras love a microphone in the stacks.',
  residency: 'outside',
  control: 'world',
  kind: 'liability',
  stages: ['primary', 'general'],
  once: true,
  w: 3,
  show: _s => true,
  apply: s => {
    s.exposure = (s.exposure || 0) + 1;
    s.hitPieces += 1;
    s.faces.T = clamp((s.faces.T || 0) + 3, -50, 100);
    s.momentum += 1;
    return (
      'OUTSIDE — LIBRARY FIGHT. "Think of the children" and "think of the First Amendment" share a parking lot. ' +
      'Hit piece +1, exposure +1, Truth +3, momentum +1. Culture weather — answer carefully or not at all.'
    );
  }
};

/** Border bus / busing politics as weather (not a player verb). */
export const EV_BORDER_BUSES: OutsideEvent = {
  id: 'EV_BORDER_BUSES',
  hook: {
    n: 'A talk radio host wants you on for a full hour',
    d:
      'Four hundred miles from here and on every screen in the district. An hour is long enough to be honest and long enough to be quoted badly. Both will happen.',
    weeks: 2,
    flavour: 'fight'
  },
  opens: ['OP_BORDER_REIMB'],
  n: 'Buses on the Cable News',
  d: 'Four hundred miles away and on every screen in the district. Heat guaranteed; light optional.',
  residency: 'outside',
  control: 'world',
  kind: 'liability',
  stages: ['primary', 'general', 'session'],
  once: true,
  w: 3,
  show: s =>
    s.regionHook === 'valley' ||
    s.regionHook === 'metro' ||
    s.regionHook === 'gulf' ||
    s.regionHook === 'west' ||
    !s.regionHook,
  apply: s => {
    s.hitPieces += 1;
    s.momentum = Math.max(0, s.momentum - 1);
    s.faces.P = clamp((s.faces.P || 0) - 2, -50, 100);
    if (s.stage === 'session') {
      s.favor = clamp(s.favor - 2, 0, 100);
      return (
        'OUTSIDE — BORDER BUSES. Leadership wants a statement by noon. Favor −2, hit piece, Parliamentarian face dips. ' +
        '"Secure the border" is not a bill you filed. It is the weather on the fifth floor.'
      );
    }
    s.endorsePts = Math.max(0, s.endorsePts - 1);
    return (
      'OUTSIDE — BORDER BUSES. A cable chyron becomes a kitchen-table test. Hit piece +1, momentum −1, endorse −1. ' +
      'You do not drive the buses. You get asked about them at the fish fry.'
    );
  }
};

/** County fair / carnival week — lighter texture. */
export const EV_COUNTY_FAIR: OutsideEvent = {
  id: 'EV_COUNTY_FAIR',
  hook: {
    n: 'A booth at the fair, all week, if you want it',
    d:
      'Corn dogs, livestock, and every candidate in the county at arm\'s length from every voter in it. Presence is free. Absence is noted, out loud, by name.',
    weeks: 2,
    flavour: 'room',
    ground: 'GR01'
  },
  opens: ['OP_AG_FAIRGROUNDS'],
  n: 'County Fair Week',
  d: 'Corn dogs, livestock, and every candidate in a booth. Presence is free; absence is noted.',
  residency: 'outside',
  control: 'world',
  kind: 'ally',
  stages: ['primary', 'general'],
  once: true,
  w: 2,
  show: s => s.stage === 'primary' || s.stage === 'general',
  apply: s => {
    s.contacts += 20;
    s.nameID += 2;
    s.faces.G = clamp((s.faces.G || 0) + 2, -50, 100);
    for (const g of s.groundsArr) {
      if (g.id === 'GR01' || g.id === 'GR06') g.rapport = clamp(g.rapport + 2, 0, 100);
    }
    return (
      'OUTSIDE — COUNTY FAIR. "See you at the fair" is the only polite threat in the county. ' +
      '+20 contacts, +2 name, Grit +2, square and halls warm. You did not schedule the fair. You show up or you do not.'
    );
  }
};

/** Hospital / rural care closure scare. */
export const EV_RURAL_HOSPITAL: OutsideEvent = {
  id: 'EV_RURAL_HOSPITAL',
  hook: {
    n: 'The hospital board is taking public comment Tuesday',
    d:
      'The room will be full of people who already drive an hour and want to know if it becomes two. Nothing you can promise them. You can be the one who was there when they said it.',
    weeks: 3,
    flavour: 'room',
    ground: 'GR07'
  },
  opens: ['OP_HOSP_OB'],
  n: 'Rural Hospital Scare',
  d: 'A closure rumor, a travel distance, a Facebook post with a thousand shares.',
  residency: 'outside',
  control: 'world',
  kind: 'liability',
  stages: ['primary', 'general', 'session'],
  once: true,
  w: 2,
  show: s =>
    s.regionHook === 'east' ||
    s.regionHook === 'panhandle' ||
    s.regionHook === 'west' ||
    s.regionHook === 'hill' ||
    s.regionHook === 'permian',
  apply: s => {
    s.faces.G = clamp((s.faces.G || 0) + 3, -50, 100);
    s.momentum = Math.max(0, s.momentum - 1);
    for (const g of s.groundsArr) {
      if (g.id === 'GR02' || g.id === 'GR07') g.rapport = clamp(g.rapport - 2, 0, 100);
    }
    if (s.stage === 'session') {
      s.districtStanding = clamp(s.districtStanding - 2, 0, 100);
      return (
        'OUTSIDE — RURAL HOSPITAL. "How far to the next ER?" Standing −2, Grit +3. ' +
        'Casework will be full of rides and referrals. Not your card — your office phone.'
      );
    }
    s.contacts = Math.max(0, s.contacts - 12);
    return (
      'OUTSIDE — RURAL HOSPITAL. Somebody says, "We already drive an hour." Contacts −12, momentum −1, Grit +3; ' +
      'FM roads and lake country go cool. Health weather is not a hand verb.'
    );
  }
};

/** Full Outside catalog. */
/** Heat dome — a real Texas summer that keeps people (and canvassers) inside. */
export const EV_HEAT_DOME: OutsideEvent = {
  id: 'EV_HEAT_DOME',
  hook: {
    n: 'The church is running a cooling station and is short of hands',
    d:
      'Fellowship hall, box fans, and a list of people who need checking on. No press, no sign-in sheet, no reason to go except that they are short of hands.',
    weeks: 3,
    flavour: 'room'
  },
n: 'Heat Dome', kind: 'liability',
  opens: ['OP_GRID_COOLING'],
  d: 'A hundred and nine for ten days straight. Nobody answers the door; nobody wants a flyer.',
  residency: 'outside', control: 'world', stages: ['primary', 'general'], w: 3,
  apply: s => {
    s.momentum = Math.max(0, s.momentum - 1);
    for (const g of s.groundsArr) g.rapport = clamp(g.rapport - 2, 0, 100);
    return 'OUTSIDE — HEAT DOME. The doors stay shut and the volunteers wilt. Rapport softens across the map; spend momentum before it evaporates.';
  }
};

/** Plant layoff — sudden economic anxiety reshapes the race's mood. */
export const EV_PLANT_LAYOFF: OutsideEvent = {
  id: 'EV_PLANT_LAYOFF',
  hook: {
    n: 'The union hall is meeting and it is not about you',
    d:
      'Four hundred people finding out on the same Thursday. Nobody there needs a candidate. Somebody will show up anyway and it may as well be you.',
    weeks: 3,
    flavour: 'room'
  },
n: 'The Plant Lays Off', kind: 'liability',
  opens: ['OP_LAYOFF_NOTICE'],
  d: 'Four hundred jobs, gone by Friday. The district wants to know whose side you are on.',
  residency: 'outside', control: 'world', stages: ['primary', 'general'], once: true, w: 2,
  apply: s => {
    s.faces.O += 2;
    if (s.messageSharp) { s.momentum += 1; return 'OUTSIDE — THE PLANT LAYS OFF. Anxiety grips the county — but your message is sharp enough to meet it. Momentum holds.'; }
    s.momentum = Math.max(0, s.momentum - 1);
    return 'OUTSIDE — THE PLANT LAYS OFF. The mood curdles and you have no ready answer. Momentum slips; the pressure is on.';
  }
};

/** Whisper campaign against you — a smear you did not start. */
export const EV_WHISPER_SMEAR: OutsideEvent = {
  id: 'EV_WHISPER_SMEAR',
  hook: {
    n: 'You can find out who started it',
    d:
      'Two phone calls to people who like you more than they like being asked, and you will have a name. What you do with it is a separate problem.',
    weeks: 3,
    flavour: 'map'
  },
n: 'A Whisper Starts', kind: 'blackmail',
  opens: ['OP_CORR_DISCLOSE'],
  d: 'Something ugly and unattributed makes the rounds at the coffee shops. You never said it. It does not matter.',
  residency: 'outside', control: 'world', stages: ['primary', 'general'], once: true, w: 2,
  show: s => s.faces.O >= 2 || s.hitPieces > 0,
  apply: s => {
    s.nameID += 2; s.faces.O += 2; s.momentum = Math.max(0, s.momentum - 1);
    return 'OUTSIDE — A WHISPER STARTS. Name ID up, the wrong way. Someone is working you over in the dark — and the county half-believes it.';
  }
};

/** Spontaneous club endorsement — the rare kind wind. */
export const EV_CLUB_RALLIES: OutsideEvent = {
  id: 'EV_CLUB_RALLIES',
  hook: {
    n: 'They want you at the club\'s Saturday breakfast',
    d:
      'Ninety minutes, forty people, and every one of them makes ten phone calls a week.',
    weeks: 3,
    flavour: 'room'
  },
n: 'A Club Rallies to You', kind: 'ally',
  opens: ['OP_VET_COURT'],
  d: 'Word of your kitchen-table work reaches the right room, and the room decides it likes you.',
  residency: 'outside', control: 'world', stages: ['primary', 'general'], once: true, w: 2,
  show: s => s.endorsePts >= 2 || s.contacts >= 200,
  apply: s => {
    s.endorsePts += 2; s.momentum += 1;
    return 'OUTSIDE — A CLUB RALLIES TO YOU. Unbidden, a club puts its people behind you. +2 endorsement points and a gust of momentum.';
  }
};

/** Early-vote surge — turnout weather in the general's home stretch. */
export const EV_EARLY_VOTE_SURGE: OutsideEvent = {
  id: 'EV_EARLY_VOTE_SURGE',
  hook: {
    n: 'The line at the annex is two hours long right now',
    d:
      'Two hundred people with nothing to do but stand there. You will never again have this many voters trapped and mildly bored in one place.',
    weeks: 1,
    flavour: 'room',
    ground: 'GR01'
  },
n: 'Early Vote Surges', kind: 'location',
  opens: ['OP_ELEC_CLERK'],
  d: 'The lines wrap the courthouse on day one. Whoever banked turnout is about to find out if it was enough.',
  residency: 'outside', control: 'world', stages: ['general'], once: true, w: 3,
  apply: s => {
    const banked = s.groundsArr.reduce((t, g) => t + (g.gotv || 0), 0);
    if (banked > 0.4) { s.momentum += 2; return 'OUTSIDE — EARLY VOTE SURGES. Your banked turnout meets the moment. The lines are full of your people. +2 momentum.'; }
    s.momentum = Math.max(0, s.momentum - 1);
    return 'OUTSIDE — EARLY VOTE SURGES. The lines are long and mostly strangers. You did not bank enough turnout for this. Momentum slips.';
  }
};

export const OUTSIDE_EVENTS: OutsideEvent[] = [
  EV_HEAT_DOME,
  EV_PLANT_LAYOFF,
  EV_WHISPER_SMEAR,
  EV_CLUB_RALLIES,
  EV_EARLY_VOTE_SURGE,
  EV_SCREWWORM,
  EV_REDISTRICT_RUMOR,
  EV_ETHICS_COMPLAINT,
  EV_DROUGHT,
  EV_ENERGY_BOOM,
  EV_RIVAL_DUMP,
  EV_FLOOD_WEEK,
  EV_SCHOOL_BOARD_WAR,
  EV_SPECIAL_SESSION,
  EV_PRIMARY_CHALLENGER_AD,
  EV_GRID_FREEZE,
  EV_PROPERTY_TAX,
  EV_LIBRARY_FIGHT,
  EV_BORDER_BUSES,
  EV_COUNTY_FAIR,
  EV_RURAL_HOSPITAL
];

export const OUTSIDE_EVENT_IDS = OUTSIDE_EVENTS.map(e => e.id);
