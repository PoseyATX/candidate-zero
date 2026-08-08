/**
 * CANDIDATE ZERO — Intro / setup content
 * Persona, issue, district, region. Choices bind.
 */

import type { AttrId, Attrs, Faces, GameState } from '../engine/types.js';
import { random } from '../engine/rng.js';
import { addAlly, addRep } from '../engine/reputation.js';
import { BALLOT_SIGNATURES } from '../engine/state.js';
import { setArchetype, archetypeForDistrict } from '../engine/opponent.js';
import { originAttrDelta, resolveOrigins } from './origin.js';

export type FaceBoost = Partial<Faces>;
export type AttrBoost = Partial<Attrs>;

export interface PersonaDef {
  id: string;
  n: string;
  d: string;
  tag: string;
  /** Root attribute deltas (cardAttrMod). Baseline is 10. */
  attrs: AttrBoost;
  apply: (s: GameState) => void;
  /** Can a career be filed as this persona? Only the starting four. Everyone
   *  else is better-seated and is reached through play, much later. */
  starting?: boolean;
  /**
   * The cold open — the specific Tuesday this person is walking in from.
   *
   * A persona picker that lists adjectives is a menu. A picker that opens on a
   * closed hospital and a ninety-mile drive is a character. Only the startable
   * four carry these, because they are the only ones a player ever meets cold.
   */
  open?: string;
  /** What you actually have, said plainly. No adjectives. */
  has?: string;
  /** What you do not have, said just as plainly. This is the longer list. */
  lacks?: string;
  /** How this person hears whatever issue they pick. `{issue}` is substituted —
   *  the same choice has to land differently depending on who is making it. */
  lens?: string;
  /** The intrinsic card that is going to cost you, named at the filing table. */
  liability?: string;
  /** What you actually SAY when the clerk asks what you do. First person, out
   *  loud, no adjectives about yourself. See data/clerk.ts. */
  said?: string;
}

function bumpAttrs(s: GameState, boost: AttrBoost): void {
  if (!s.attrs) {
    s.attrs = { CLO: 10, CON: 10, CRA: 10, INK: 10, DIP: 10, CHA: 10 };
  }
  for (const [k, v] of Object.entries(boost)) {
    if (typeof v === 'number') {
      const id = k as AttrId;
      s.attrs[id] = (s.attrs[id] ?? 10) + v;
    }
  }
}

export interface IssueDef {
  id: string;
  n: string;
  tag: string;
  d: string;
  /** Constituency affinity, same vocabulary as Ground.aff (see GROUND_AFFINITY).
   *  Where a ground and your issue share a constituency, rapport banks harder —
   *  the fiction was already in the issue copy ("The FM roads know the
   *  arithmetic", "four storefronts by the plant gate"); this makes it real. */
  aff: string;
}

/**
 * Ground / issue constituency codes. `T` is anchored by the shipped trait
 * T_CRED ("True-Believer grounds start at 12 rapport"); the rest follow the
 * ground names and the issue flavor text they were written against.
 */
export const GROUND_AFFINITY: Record<string, string> = {
  T: 'True believers — the base that shows up',
  G: 'General electorate — broad, persuadable',
  O: 'Old guard — courthouse, institutions, incumbent machinery',
  F: 'Families — schools, subdivisions, young households',
  P: 'Professionals — commuters and the new-money class',
  L: 'Leisure — retirees and lake country'
};

export interface DistrictDef {
  id: string;
  n: string;
  d: string;
  align: 'safe' | 'competitive' | 'wrong';
  incumbent: boolean;
  trap?: boolean;
  field: (rng: () => number) => number;
}

export interface RegionDef {
  id: string;
  n: string;
  d: string;
  hook: string;
  flavor: string[];
  places: string[];
  boost: FaceBoost;
  petitionMod: number;
}

export interface SetupSelection {
  personaId: string;
  issueId: string;
  districtId: string;
  regionId: string;
  /** Answer ids from data/origin.ts — the trade, the first time, the skeleton.
   *  Optional so every save and harness fixture written before origins existed
   *  still loads and behaves exactly as it did. */
  originIds?: string[];
}

// Note: `apply` only sets persona-specific starting resources/flavor. Root
// attr bumps come from `attrs` alone (applied once, centrally, in
// applySetup) so the UI's pre-game blurb and the actual campaign grant can
// never drift apart the way two hand-copied literals could.
export const PERSONAS: PersonaDef[] = [
  // ---------------------------------------------------------------------
  // THE STARTING FOUR. None of them is well-seated, well-funded or
  // well-connected, and that is the whole design: you start at nothing and the
  // only things you have are the cards that say who you are (data/plays-zero.ts).
  //
  // Note how little these `apply` blocks do. That is deliberate — a persona is
  // its intrinsic four cards, not a pile of opening resources. The Faded Name's
  // money is the Old Money card; the surname is The Surname card. Nothing is
  // handed to you as a number you did not play for.
  //
  // The other personas below are better-seated and are NOT startable. They are
  // reachable through play, much later. They keep working everywhere they
  // already worked (saved identities, signature cards, harness setups) — they
  // simply do not appear on the filing table.
  // ---------------------------------------------------------------------
  {
    id: 'blockwalker', n: 'The Blockwalker', said: '"I knock doors. Six years of it, mostly for other people."',
    tag: 'legs and a voice', starting: true,
    d: 'You have knocked this district for somebody else for six years. Nobody is going to fund you and everybody on Third Street knows your face.',
    open:
      'Six years of other people\'s yard signs. You have knocked every street in this precinct for men ' +
      'whose names you had to learn off the literature. In March one of them lost by 214 votes and ' +
      'thanked the county chairman from the podium without ever once looking at the back of the room. ' +
      'You drove home and did the arithmetic on your own precinct and it kept coming out the same way.',
    has: 'Legs. A face they recognise at the screen door. Six years of names nobody wrote down but you.',
    lacks: 'Money. A title. One person at the courthouse who returns a call.',
    lens: 'You have heard about {issue} on ninety porches this year. Nobody downtown has heard it from you.',
    liability: 'Blister — the body is the whole campaign, which makes the body the whole vulnerability.',
    attrs: { CON: 3, CLO: 2 },
    apply: s => { s.faces.T += 6; s.faces.G += 4; }
  },
  {
    id: 'believer', n: 'The Believer', said: '"Right now I drive people to Abilene who cannot get there by themselves."',
    tag: 'a cause and no give',  starting: true,
    d: 'Something specific happened to somebody specific and you have not been able to let it go. You cannot trade, because trading is how it happened.',
    open:
      'The hospital closed on a Tuesday in February. Eleven days later you drove a neighbour ninety ' +
      'miles toward Abilene in the front seat of a pickup and she did not make it past Baird. ' +
      'You have said her name at four commissioners\' court meetings. The third time, a man you have ' +
      'known since school asked you to be reasonable about it.',
    has: 'A cause with a date on it. Nine people who believe you. No capacity whatsoever for doubt.',
    lacks: 'Give. Discretion. Any ability to sit down and make a deal.',
    lens: '{issue} is not a position you hold. It is the reason you are standing here.',
    liability: 'Rigidity — the thing that makes people believe you is the thing that makes you impossible to deal with.',
    attrs: { CON: 3, CHA: 2 },
    apply: s => { s.faces.T += 10; s.volPool += 1; }
  },
  {
    id: 'staffer', n: 'The Junior Staffer', said: '"I carry a binder for a member. Four sessions."',
    tag: 'knows where the rooms are', starting: true,
    d: 'Four sessions carrying somebody else\'s binder. You know the building, the calendar and the rule that applies. Nobody in it knows your name.',
    open:
      'Four sessions carrying a binder for a member who never learned your first name. You know which ' +
      'elevator the members use, which clerk will take a late filing and which point of order kills ' +
      'a bill on a Thursday afternoon. You have written applause lines and listened to them land ' +
      'from the back wall. In May you watched a bill you drafted get signed under somebody else\'s name.',
    has: 'The building. The calendar. The rule that applies, and the timing to raise it.',
    lacks: 'Standing to be in any of those rooms as yourself. A constituency. A single person who thinks of you as a principal.',
    lens: 'You know exactly which committee {issue} dies in. You have watched it happen twice from the back wall.',
    liability: 'No Standing — you have been in every one of these rooms and never once as yourself.',
    attrs: { INK: 3, CRA: 2 },
    apply: s => { s.faces.O += 8; }
  },
  {
    id: 'fadedname', n: 'The Faded Name', said: '"Nothing, currently. My family had the dealership."',
    tag: 'a surname and a little money', starting: true,
    d: 'Your grandfather had the dealership and two terms in the House. People still know the name and nobody currently owes it anything.',
    open:
      'Your grandfather had the Ford dealership and two terms in the House. There is a wing of the ' +
      'hospital with your surname over the door and a portrait in the county museum that nobody has ' +
      'dusted since the bicentennial. The land went three ways in 1994. You have never in your life ' +
      'held a position the name did not get you, and everybody at the Rotary lunch knows it.',
    has: 'A surname the old guard still half stands up for. What is left of the land money.',
    lacks: 'Competence. Relevance. One living person who owes you anything at all.',
    lens: 'Your grandfather had a position on {issue}. The room will assume you inherited it, and ask you about it.',
    liability: 'Expectations — they assume you can do this, because of who you are, and they are wrong.',
    attrs: { DIP: 2, CHA: 1 },
    apply: s => { s.faces.O += 6; s.faces.L += 4; }
  },
  {
    id: 'veteran', n: 'The Veteran', tag: 'bio armor',
    d: 'Two tours and a flag on the porch. Bio is armor.',
    attrs: { CON: 3, CLO: 2, CHA: 1 },
    apply: s => { s.nameID += 3; s.faces.T += 8; s.assets.push('BIO_VETERAN'); }
  },
  {
    id: 'teacher', n: 'The Teacher', tag: 'the rooms',
    d: 'Twenty years of parent-teacher nights. You know the rooms.',
    attrs: { CHA: 3, DIP: 2, CON: 1 },
    apply: s => { s.contacts += 25; s.faces.G += 8; s.assets.push('BIO_TEACHER'); }
  },
  {
    id: 'preacher', n: 'The Preacher', tag: 'pulpit precinct',
    d: 'A pulpit is a precinct. Sundays are turnout.',
    attrs: { CHA: 3, CLO: 2, DIP: 1 },
    // archive PA_CON_CHA (line 357) pushed B02 Sunday Congregation — same intent
    apply: s => {
      s.volPool += 2;
      s.faces.F += 8;
      s.faces.T += 6;
      s.assets.push('BIO_PREACHER');
      if (!s.backers.includes('B02')) s.backers.push('B02');
    }
  },
  {
    id: 'smallbiz', n: 'The Feed-Store Owner', tag: 'credit and favors',
    d: 'Everyone owes you credit or a favor.',
    attrs: { CRA: 3, DIP: 2, CLO: 1 },
    apply: s => { s.money += 1500; s.faces.O += 8; s.assets.push('BIO_FEEDSTORE'); }
  },
  // Ported from archive/prototype-single-file.html's 21-persona archetype
  // roster (2026-07-17) — see docs/SRD-NOTES.md. PA_CON_CHA ("The Preacher")
  // skipped: name collision with the hand-authored 'preacher' persona above.
  {
    id: 'PA_CLO', n: 'The Powerhouse', tag: 'fills the room',
    d: 'A presence that fills a room and a turnout operation to match. You win by showing up bigger than anyone.',
    attrs: { CLO: 5 },
    apply: s => { s.faces.G += 20; s.volPool += 1; }
  },
  {
    id: 'PA_CON', n: 'The True Believer', tag: 'message discipline',
    d: 'The message arrives pre-sharpened and never wavers. Discipline is your whole discipline.',
    attrs: { CON: 5 },
    apply: s => { s.faces.T += 24; s.messageSharp = true; s.estabPenalty = true; }
  },
  {
    id: 'PA_CRA', n: 'The Operator', tag: 'knows an angle',
    d: 'You know whose cousin owes whom, and when to move. The angle is always there if you look.',
    attrs: { CRA: 5 },
    apply: s => { s.faces.O += 24; s.favors = 1; addAlly(s, 'AL11', 3); }
  },
  {
    id: 'PA_INK', n: 'The Parliamentarian', tag: 'reads the rules twice',
    d: 'You read the rules twice. Process is a weapon that never jams.',
    attrs: { INK: 5 },
    apply: s => { s.faces.P += 24; s.parlSave = true; }
  },
  {
    id: 'PA_DIP', n: 'The Coalition-Builder', tag: 'rooms open for you',
    d: 'You can seat the rancher next to the union man and make them both feel heard. Rooms open for you.',
    attrs: { DIP: 5 },
    apply: s => { s.faces.O += 12; addAlly(s, 'AL01', 2); }
  },
  {
    id: 'PA_CHA', n: 'The Natural', tag: 'doors open wider',
    d: 'Every door opens a little wider. People just take to you, and you know exactly what to do with that.',
    attrs: { CHA: 5 },
    apply: s => { s.faces.F += 18; s.nameID += 4; }
  },
  {
    id: 'PA_CLO_CON', n: 'The Movement Champion', tag: 'crowd and discipline',
    d: 'Conviction with muscle behind it. You bring the crowd and you keep them in line.',
    attrs: { CLO: 3, CON: 3 },
    apply: s => { s.faces.T += 14; s.faces.F += 8; s.momentum += 2; }
  },
  {
    id: 'PA_CLO_CRA', n: 'The Bare-Knuckle Populist', tag: 'fights dirty when it must',
    d: 'You go out loud and you fight dirty when you must. The establishment never sees the elbow coming.',
    attrs: { CLO: 3, CRA: 3 },
    apply: s => { s.faces.F += 14; s.faces.O -= 4; s.nameID += 3; }
  },
  {
    id: 'PA_CLO_INK', n: 'The Workhorse', tag: 'grind plus rules',
    d: 'You outwork everyone and you know the process cold. Grind plus rules is a hard thing to beat.',
    attrs: { CLO: 3, INK: 3 },
    apply: s => { s.faces.P += 10; s.faces.G += 10; }
  },
  {
    id: 'PA_CLO_DIP', n: 'The Rural Patriarch', tag: 'two grounds start warm',
    d: 'Your name means something here, and the chairs already wave. Two grounds start warm.',
    attrs: { CLO: 3, DIP: 3 },
    apply: s => {
      s.faces.G += 18;
      const g1 = s.groundsArr.find(g => g.id === 'GR02');
      if (g1) g1.rapport = 20;
      const g2 = s.groundsArr.find(g => g.id === 'GR06');
      if (g2) g2.rapport = 20;
    }
  },
  {
    id: 'PA_CLO_CHA', n: 'The Local Legend', tag: "the county's been rooting for you",
    d: 'Star quarterback, then feed-store owner, now this. The county has been rooting for you for decades.',
    attrs: { CLO: 3, CHA: 3 },
    apply: s => { s.faces.G += 10; s.faces.F += 8; s.nameID += 8; }
  },
  {
    id: 'PA_CON_CRA', n: 'The Insurgent', tag: 'a knife for the primary',
    d: 'A disciplined message and a knife for the primary. You are exactly as angry as you choose to be.',
    attrs: { CON: 3, CRA: 3 },
    apply: s => { s.faces.T += 12; s.faces.O -= 6; s.messageSharp = true; }
  },
  {
    id: 'PA_CON_INK', n: 'The Reform Crusader', tag: 'straight shooter, week one',
    d: 'A cause and the rulebook to advance it. Straight Shooter before week one.',
    attrs: { CON: 3, INK: 3 },
    apply: s => { s.faces.P += 12; s.faces.F += 8; addRep(s, 'R02'); }
  },
  {
    id: 'PA_CON_DIP', n: 'The Statesman', tag: 'trusted across the aisle',
    d: 'Steady, principled, trusted across the aisle. The kind they call "serious."',
    attrs: { CON: 3, DIP: 3 },
    apply: s => { s.faces.P += 8; s.faces.G += 8; s.endorsePts += 1; }
  },
  {
    id: 'PA_CRA_INK', n: 'The Fixer', tag: 'bends the rules cleanly',
    d: 'You know the rules AND how to bend them. Dangerous in a committee, deadly near a deadline.',
    attrs: { CRA: 3, INK: 3 },
    apply: s => { s.faces.O += 10; s.faces.P += 8; s.favors = 1; }
  },
  {
    id: 'PA_CRA_DIP', n: 'The Wheeler-Dealer', tag: 'a price on everything',
    d: 'Two of everything and a price on each. You can trade your way out of almost anything.',
    attrs: { CRA: 3, DIP: 3 },
    apply: s => { s.faces.O += 12; s.faces.L += 8; s.money += 1500; s.favors = 1; }
  },
  {
    id: 'PA_CRA_CHA', n: 'The Showman', tag: 'made for the cameras',
    d: 'Timing and charm: you know the line AND the moment to land it. Made for the cameras.',
    attrs: { CRA: 3, CHA: 3 },
    apply: s => { s.faces.F += 16; s.backers.push('B07'); s.mediaBonus = 0.15; }
  },
  {
    id: 'PA_INK_DIP', n: 'The Committee Chair-in-Waiting', tag: 'leadership is watching this profile',
    d: 'Process mastery and the relationships to use it. Leadership is watching this profile.',
    attrs: { INK: 3, DIP: 3 },
    apply: s => { s.faces.O += 8; s.faces.P += 8; addAlly(s, 'AL01', 2); }
  },
  {
    id: 'PA_INK_CHA', n: 'The Homegrown Wonk', tag: 'smart and likeable is rare',
    d: 'You explain the water district budget so plainly people thank you for it. Smart and likeable is rare.',
    attrs: { INK: 3, CHA: 3 },
    apply: s => { s.faces.P += 10; s.assets.push('A02'); }
  },
  {
    id: 'PA_DIP_CHA', n: "The Dealmaker's Heir", tag: 'the family reputation opens doors',
    d: "A known name and a gift for people. Doors open on the family reputation; you keep them open on your own.",
    attrs: { DIP: 3, CHA: 3 },
    apply: s => { s.faces.G += 10; s.faces.L += 6; s.money += 2500; s.nameID += 6; }
  }
];

export const ISSUES: IssueDef[] = [
  { id: 'taxes', n: 'Property taxes', tag: 'taxes', d: 'Appraisal districts, school M&O, the levy that never sleeps.', aff: 'O,P' },
  { id: 'water', n: 'Water rights', tag: 'water', d: 'Groundwater districts, river authorities, and drought maps.', aff: 'T,G' },
  { id: 'schools', n: 'School finance', tag: 'schools', d: 'Formulas, facilities, and Friday nights.', aff: 'F,G' },
  { id: 'border', n: 'The border', tag: 'border', d: 'Federal failure, local consequence. Easy to shout; hard to govern.', aff: 'T,G' },
  { id: 'hospitals', n: 'Rural hospitals', tag: 'hospitals', d: 'OB deserts, ambulance miles, and the last ER light.', aff: 'T,G' },
  { id: 'land', n: 'Eminent domain', tag: 'land', d: 'Pipelines, corridors, and ranch gates.', aff: 'T,G' },
  // Ported from archive/prototype-single-file.html (2026-07-17) — see docs/SRD-NOTES.md.
  { id: 'tolls', n: 'Highway tolls', tag: 'tolls', d: 'They promised the tolls would come off when the road was paid. The road is paid.', aff: 'P,F' },
  { id: 'teacherpay', n: 'Teacher pay', tag: 'teacherpay', d: 'Twenty years in a classroom and a second job at the feed store. The room already agrees; make it vote.', aff: 'F,G' },
  { id: 'ag-subsidies', n: 'Ag subsidies & crop insurance', tag: 'ag-subsidies', d: 'One hailstorm from foreclosure, every single year. The FM roads know the arithmetic.', aff: 'T,G' },
  { id: 'corruption', n: 'Courthouse corruption', tag: 'corruption', d: "The commissioners' court has been a family business for forty years. Naming it takes nerve.", aff: 'O,G' },
  { id: 'broadband', n: 'Rural broadband', tag: 'broadband', d: 'Kids do homework in the church parking lot for the wifi. The future has a dead zone.', aff: 'T,G' },
  { id: 'bail-reform', n: 'Prison & bail reform', tag: 'bail-reform', d: "The unit is the county's biggest employer and its heaviest silence. Careful, serious ground.", aff: 'O,T' },
  { id: 'mental-health', n: 'Mental health funding', tag: 'mental-health', d: 'The sheriff runs the largest psychiatric facility in three counties: his jail. Even he says so.', aff: 'O,T' },
  { id: 'veterans', n: "Veterans' services", tag: 'veterans', d: 'The Legion hall knows every name on the waiting list. Show up and listen first.', aff: 'G,T' },
  { id: 'grid', n: 'Rural grid reliability', tag: 'grid', d: 'Everyone remembers the freeze. Every generator in every barn is a campaign memorial.', aff: 'T,G' },
  { id: 'payday-lending', n: 'Payday lending', tag: 'payday-lending', d: 'Four storefronts by the plant gate, 400% APR. The math preys on shift workers by design.', aff: 'T,O' },
  { id: 'vouchers', n: 'Public school vouchers', tag: 'vouchers', d: 'The church wants them; the small towns fear them — the district IS the school. A knife-edge issue.', aff: 'T,G' },
  { id: 'election-integrity', n: 'Election integrity', tag: 'election-integrity', d: 'The county clerk is tired, honest, and yelled at from both directions. Order-flavored, radioactive, real.', aff: 'O,G' }
];

export const DISTRICTS: DistrictDef[] = [
  { id: 'open', n: 'Open seat, safe district', d: 'Incumbent retired. Crowded field.', align: 'safe', incumbent: false, field: rng => 3 + Math.floor(rng() * 3) },
  { id: 'incumb', n: 'Safe district, entrenched incumbent', d: 'Twelve years and a war chest.', align: 'safe', incumbent: true, field: () => 1 },
  { id: 'comp', n: 'Competitive district, open primary', d: 'Primary then general. Two fights.', align: 'competitive', incumbent: false, field: () => 2 },
  { id: 'wrong', n: 'Wrong-party district', d: 'Bravery is not arithmetic.', align: 'wrong', incumbent: false, trap: true, field: () => 0 }
];

export const REGIONS: RegionDef[] = [
  { id: 'east', n: 'East Texas pine belt', d: 'Church calendars run the week.', hook: 'east', flavor: ['pine pollen'], places: ['VFW'], boost: { G: 4, T: 2 }, petitionMod: 0 },
  { id: 'valley', n: 'Rio Grande Valley', d: 'Colonias, citrus, late turnout machines.', hook: 'valley', flavor: ['resaca at dusk'], places: ['parish hall'], boost: { O: 4, F: 2 }, petitionMod: 50 },
  { id: 'hill', n: 'Hill Country', d: 'Property taxes and water wars.', hook: 'hill', flavor: ['limestone dust'], places: ['co-op board'], boost: { P: 3, T: 3 }, petitionMod: 0 },
  { id: 'panhandle', n: 'Panhandle / High Plains', d: 'Wind, feedlots, long miles.', hook: 'panhandle', flavor: ['dust devil'], places: ['grain elevator'], boost: { G: 5, T: 2 }, petitionMod: -50 },
  { id: 'metro', n: 'Metro suburban ring', d: 'HOAs, new money, endless mail.', hook: 'metro', flavor: ['school board blood sport'], places: ['HOA clubhouse'], boost: { F: 3, L: 2, O: 2 }, petitionMod: 100 },
  { id: 'gulf', n: 'Gulf Coast', d: 'Refineries, ports, unions.', hook: 'gulf', flavor: ['plant flare'], places: ['union hall'], boost: { O: 3, L: 3, F: 2 }, petitionMod: 0 },
  { id: 'west', n: 'West Texas oil & ranch', d: 'Permian money and nameless gates.', hook: 'permian', flavor: ['pumpjack'], places: ['ranch gate'], boost: { L: 3, G: 3, O: 2 }, petitionMod: -80 }
];

/**
 * The personas a new career may actually be filed as.
 *
 * Four, none of them seated. The rest of PERSONAS stays exactly where it is and
 * keeps working — signature cards, saved identities and harness setups all
 * resolve through getPersona() unchanged — they are simply not on the table
 * when you file.
 */
export const STARTING_PERSONAS: PersonaDef[] = PERSONAS.filter(p => p.starting);

export function isStartingPersona(id: string): boolean {
  return STARTING_PERSONAS.some(p => p.id === id);
}

/** Region temperament, as data rather than a chain of ifs the UI cannot read. */
const REGION_ATTRS: Record<string, AttrBoost> = {
  metro: { CRA: 1, CHA: 1 },
  gulf: { CLO: 1, DIP: 1 },
  east: { CON: 1, CHA: 1 },
  panhandle: { CON: 1, CHA: 1 },
  permian: { CRA: 1, CLO: 1 },
  valley: { DIP: 1, CLO: 1 },
  hill: { INK: 1, CON: 1 }
};

/**
 * What this filing would actually make you, before you sign it.
 *
 * Pure: takes ids, touches no GameState. The filing screen shows the resulting
 * root attributes so a player can see that eleven years on a delivery route is
 * the reason doors work for them — the arithmetic that was always running and
 * was never once shown at the moment it was being decided.
 *
 * Must stay in step with applySetup: persona + origin + region, all through
 * the same three sources.
 */
export function previewAttrs(sel: Partial<SetupSelection>): Attrs {
  const base: Attrs = { CLO: 10, CON: 10, CRA: 10, INK: 10, DIP: 10, CHA: 10 };
  const add = (boost: AttrBoost | undefined): void => {
    if (!boost) return;
    for (const [k, v] of Object.entries(boost)) {
      if (typeof v === 'number') base[k as AttrId] += v;
    }
  };
  add(getPersona(sel.personaId ?? '')?.attrs);
  add(originAttrDelta(sel.originIds));
  const region = getRegion(sel.regionId ?? '');
  if (region) add(REGION_ATTRS[region.hook]);
  return base;
}

export function getPersona(id: string) { return PERSONAS.find(p => p.id === id); }
export function getIssue(id: string) { return ISSUES.find(i => i.id === id); }
export function getDistrict(id: string) { return DISTRICTS.find(d => d.id === id); }
export function getRegion(id: string) { return REGIONS.find(r => r.id === id); }

export function applySetup(state: GameState, sel: SetupSelection): GameState {
  const persona = getPersona(sel.personaId);
  const issue = getIssue(sel.issueId);
  const district = getDistrict(sel.districtId);
  const region = getRegion(sel.regionId);
  if (!persona || !issue || !district || !region) {
    throw new Error(`Invalid setup: ${JSON.stringify(sel)}`);
  }
  persona.apply(state);
  bumpAttrs(state, persona.attrs);
  state.persona = persona.n;
  state.personaId = sel.personaId;
  state.issue = issue.n;
  state.issueId = issue.id;
  state.assets.push('ISSUE_' + issue.tag);
  const field = district.field(random);
  state.district = {
    id: district.id,
    name: district.n,
    align: district.align,
    incumbent: district.incumbent,
    field,
    trap: district.trap
  };
  state.rivals = Array.from({ length: field }, (_, i) => ({
    id: 'RIV' + (i + 1),
    n: 'Rival ' + (i + 1)
  }));
  state.regionHook = region.hook;
  for (const [k, v] of Object.entries(region.boost)) {
    const key = k as keyof Faces;
    if (typeof v === 'number') state.faces[key] = (state.faces[key] || 0) + v;
  }
  // Region also nudges attrs lightly (geography as temperament)
  // Same table the filing screen previews from, so what the player was shown
  // and what they got can never drift.
  bumpAttrs(state, REGION_ATTRS[region.hook] ?? {});

  // Where you came from — the trade, the first room, and the thing in your past
  // somebody is going to find. This is the part that makes two Blockwalkers
  // different people. See data/origin.ts.
  for (const answer of resolveOrigins(sel.originIds)) {
    bumpAttrs(state, answer.attrs);
    answer.apply?.(state);
    state.assets.push('ORIGIN_' + answer.id.toUpperCase());
  }

  state.assets.push('REGION_' + region.id.toUpperCase());
  state.sigNeed = Math.max(200, BALLOT_SIGNATURES + region.petitionMod);
  // Who you are running against is decided by where you filed: a safe seat is
  // held by a machine, a competitive one draws an insurgent, the wrong-party
  // trap is defended by an incumbent who goes negative early.
  setArchetype(state, archetypeForDistrict(state));
  const attrSummary = Object.entries(state.attrs)
    .map(([k, v]) => `${k}${v}`)
    .join(' ');
  state.log.push({
    week: 1,
    kind: 'note',
    text:
      `Identity: ${persona.n} · ${issue.n} · ${district.n} · ${region.n}. ` +
      `Sigs need ${state.sigNeed}. Attrs [${attrSummary}]. Choices bind.`
  });
  return state;
}

export const HARNESS_DEFAULT_SETUP: SetupSelection = {
  personaId: 'teacher',
  issueId: 'taxes',
  districtId: 'open',
  regionId: 'east'
};

/** Parse setup ids from CLI flags; falls back to harness default per field. */
export function setupFromPartial(partial: Partial<SetupSelection>): SetupSelection {
  return {
    personaId: partial.personaId ?? HARNESS_DEFAULT_SETUP.personaId,
    issueId: partial.issueId ?? HARNESS_DEFAULT_SETUP.issueId,
    districtId: partial.districtId ?? HARNESS_DEFAULT_SETUP.districtId,
    regionId: partial.regionId ?? HARNESS_DEFAULT_SETUP.regionId
  };
}

/** Affinity codes for the player's chosen issue, from the ISSUE_<tag> asset. */
export function issueAffinity(assets: string[]): string[] {
  const tag = assets.find(a => a.startsWith('ISSUE_'))?.slice('ISSUE_'.length);
  if (!tag) return [];
  const issue = ISSUES.find(i => i.tag === tag);
  return issue ? issue.aff.split(',').map(c => c.trim()).filter(Boolean) : [];
}

/**
 * Rapport multiplier for working `groundAff` while running on your issue.
 * One shared constituency is a good fit, two is your turf. Returns 1 when the
 * player has no issue or nothing overlaps.
 */
export function groundAffinityMult(assets: string[], groundAff: string): number {
  const mine = issueAffinity(assets);
  if (!mine.length) return 1;
  const theirs = groundAff.split(',').map(c => c.trim()).filter(Boolean);
  const shared = theirs.filter(c => mine.includes(c)).length;
  if (shared >= 2) return 2;
  if (shared === 1) return 1.5;
  return 1;
}
