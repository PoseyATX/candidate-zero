/**
 * CANDIDATE ZERO — Intro / setup content
 * Persona, issue, district, region. Choices bind.
 */

import type { AttrId, Attrs, Faces, GameState } from '../engine/types.js';
import { random } from '../engine/rng.js';
import { addAlly, addRep } from '../engine/reputation.js';

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
  /**
   * Password-gated debug persona. Not for normal play.
   * UI prompts; never log the password.
   */
  locked?: boolean;
  /** Debug-only overpowered kit for status review / replay. */
  debug?: boolean;
}

/** Debug persona password — checked only in UI; do not surface in blurbs. */
export const DEBUG_PERSONA_PASSWORD = 'MrSp0ck';
export const DEBUG_PERSONA_ID = 'taxman';

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
}

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
}

// Note: `apply` only sets persona-specific starting resources/flavor. Root
// attr bumps come from `attrs` alone (applied once, centrally, in
// applySetup) so the UI's pre-game blurb and the actual campaign grant can
// never drift apart the way two hand-copied literals could.
export const PERSONAS: PersonaDef[] = [
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
    apply: s => { s.volPool += 2; s.faces.F += 8; s.assets.push('BIO_PREACHER'); }
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
  },
  // ——— Debug / review only (password in UI) ———
  {
    id: 'taxman',
    n: 'TAX MAN',
    tag: 'debug · review',
    d:
      'DEBUG PERSONA — locked. God-tier cash, list, name, and kit so you can review ' +
      'systems without replaying an impossible grind. Not a real identity. Password required.',
    attrs: { CLO: 8, CON: 8, CRA: 8, INK: 8, DIP: 8, CHA: 8 },
    locked: true,
    debug: true,
    apply: s => {
      s.money += 50_000;
      s.contacts += 400;
      s.nameID += 35;
      s.volPool += 12;
      s.momentum += 4;
      s.favors += 3;
      s.endorsePts += 4;
      s.messageSharp = true;
      s.oppoFile = true;
      s.fieldAp = 1;
      s.apMax = 4;
      s.ap = 4;
      s.faces.P += 10;
      s.faces.O += 10;
      s.faces.L += 10;
      s.faces.G += 10;
      s.faces.T += 10;
      s.faces.F += 10;
      // Full shop kit for reviewing passives / UI
      for (const id of ['A02', 'A01', 'A09', 'A04', 'A11', 'A03', 'A06', 'A12', 'A07', 'A08']) {
        if (!s.assets.includes(id)) s.assets.push(id);
      }
      if (!s.backers.includes('B05')) s.backers.push('B05');
      if (!s.backers.includes('B06')) s.backers.push('B06');
      s.assets.push('BIO_TAXMAN');
      s.trophies = s.trophies ?? [];
      s.trophies.push({
        id: 'FLAG_DEBUG_TAXMAN',
        name: 'TAX MAN (debug)',
        text: 'Review kit. Password-gated. Not a legitimate candidacy.',
        kind: 'flag',
        cycle: 0
      });
      s.log.push({
        week: 1,
        kind: 'note',
        text: 'DEBUG — TAX MAN unlocked. Systems review mode. Spend money in the Shop is optional; kit is already loaded.'
      });
    }
  }
];

export const ISSUES: IssueDef[] = [
  { id: 'taxes', n: 'Property taxes', tag: 'taxes', d: 'Appraisal districts, school M&O, the levy that never sleeps.' },
  { id: 'water', n: 'Water rights', tag: 'water', d: 'Groundwater districts, river authorities, and drought maps.' },
  { id: 'schools', n: 'School finance', tag: 'schools', d: 'Formulas, facilities, and Friday nights.' },
  { id: 'border', n: 'The border', tag: 'border', d: 'Federal failure, local consequence. Easy to shout; hard to govern.' },
  { id: 'hospitals', n: 'Rural hospitals', tag: 'hospitals', d: 'OB deserts, ambulance miles, and the last ER light.' },
  { id: 'land', n: 'Eminent domain', tag: 'land', d: 'Pipelines, corridors, and ranch gates.' },
  // Ported from archive/prototype-single-file.html (2026-07-17) — see docs/SRD-NOTES.md.
  { id: 'tolls', n: 'Highway tolls', tag: 'tolls', d: 'They promised the tolls would come off when the road was paid. The road is paid.' },
  { id: 'teacherpay', n: 'Teacher pay', tag: 'teacherpay', d: 'Twenty years in a classroom and a second job at the feed store. The room already agrees; make it vote.' },
  { id: 'ag-subsidies', n: 'Ag subsidies & crop insurance', tag: 'ag-subsidies', d: 'One hailstorm from foreclosure, every single year. The FM roads know the arithmetic.' },
  { id: 'corruption', n: 'Courthouse corruption', tag: 'corruption', d: "The commissioners' court has been a family business for forty years. Naming it takes nerve." },
  { id: 'broadband', n: 'Rural broadband', tag: 'broadband', d: 'Kids do homework in the church parking lot for the wifi. The future has a dead zone.' },
  { id: 'bail-reform', n: 'Prison & bail reform', tag: 'bail-reform', d: "The unit is the county's biggest employer and its heaviest silence. Careful, serious ground." },
  { id: 'mental-health', n: 'Mental health funding', tag: 'mental-health', d: 'The sheriff runs the largest psychiatric facility in three counties: his jail. Even he says so.' },
  { id: 'veterans', n: "Veterans' services", tag: 'veterans', d: 'The Legion hall knows every name on the waiting list. Show up and listen first.' },
  { id: 'grid', n: 'Rural grid reliability', tag: 'grid', d: 'Everyone remembers the freeze. Every generator in every barn is a campaign memorial.' },
  { id: 'payday-lending', n: 'Payday lending', tag: 'payday-lending', d: 'Four storefronts by the plant gate, 400% APR. The math preys on shift workers by design.' },
  { id: 'vouchers', n: 'Public school vouchers', tag: 'vouchers', d: 'The church wants them; the small towns fear them — the district IS the school. A knife-edge issue.' },
  { id: 'election-integrity', n: 'Election integrity', tag: 'election-integrity', d: 'The county clerk is tired, honest, and yelled at from both directions. Order-flavored, radioactive, real.' }
];

export const DISTRICTS: DistrictDef[] = [
  { id: 'open', n: 'Open seat, safe district', d: 'Incumbent retired. Crowded field.', align: 'safe', incumbent: false, field: rng => 3 + Math.floor(rng() * 3) },
  { id: 'incumb', n: 'Safe district, entrenched incumbent', d: 'Twelve years and a war chest.', align: 'safe', incumbent: true, field: () => 1 },
  { id: 'comp', n: 'Competitive district, open primary', d: 'Primary then general. Two fights.', align: 'competitive', incumbent: false, field: () => 2 },
  { id: 'wrong', n: 'Wrong-party district', d: 'RISK: bravery is not arithmetic.', align: 'wrong', incumbent: false, trap: true, field: () => 0 }
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
  // Lock identity ids once — persona never changes after this.
  state.personaId = sel.personaId;
  state.issueId = sel.issueId;
  state.districtId = sel.districtId;
  state.regionId = sel.regionId;
  state.regionName = region.n;
  state.cycleIndex = 0;

  persona.apply(state);
  bumpAttrs(state, persona.attrs);
  state.persona = persona.n;
  state.issue = issue.n;
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
  if (region.hook === 'metro') bumpAttrs(state, { CRA: 1, CHA: 1 });
  if (region.hook === 'gulf') bumpAttrs(state, { CLO: 1, DIP: 1 });
  if (region.hook === 'east' || region.hook === 'panhandle') bumpAttrs(state, { CON: 1, CHA: 1 });
  if (region.hook === 'permian') bumpAttrs(state, { CRA: 1, CLO: 1 });
  if (region.hook === 'valley') bumpAttrs(state, { DIP: 1, CLO: 1 });
  if (region.hook === 'hill') bumpAttrs(state, { INK: 1, CON: 1 });

  state.assets.push('REGION_' + region.id.toUpperCase());
  state.sigNeed = Math.max(200, 450 + region.petitionMod);
  const attrSummary = Object.entries(state.attrs)
    .map(([k, v]) => `${k}${v}`)
    .join(' ');
  state.log.push({
    week: 1,
    kind: 'note',
    text:
      `Identity locked: ${persona.n} · ${issue.n} · ${district.n} · ${region.n}. ` +
      `Sigs need ${state.sigNeed}. Attrs [${attrSummary}]. ` +
      `Persona never re-rolls. Issue/district/region shift only for thematic cause. ` +
      `The career does not end when a ballot does.`
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
