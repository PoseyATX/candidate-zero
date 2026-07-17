/**
 * CANDIDATE ZERO — Intro / setup content
 * Persona, issue, district, region. Choices bind.
 */

import type { AttrId, Attrs, Faces, GameState } from '../engine/types.js';
import { random } from '../engine/rng.js';

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

export interface DistrictRuntime {
  id: string;
  name: string;
  align: 'safe' | 'competitive' | 'wrong';
  incumbent: boolean;
  field: number;
  trap?: boolean;
}

export const PERSONAS: PersonaDef[] = [
  {
    id: 'veteran', n: 'The Veteran', tag: 'bio armor',
    d: 'Two tours and a flag on the porch. Bio is armor.',
    attrs: { CON: 3, CLO: 2, CHA: 1 },
    apply: s => { s.nameID += 3; s.faces.T += 8; s.assets.push('BIO_VETERAN'); bumpAttrs(s, { CON: 3, CLO: 2, CHA: 1 }); }
  },
  {
    id: 'teacher', n: 'The Teacher', tag: 'the rooms',
    d: 'Twenty years of parent-teacher nights. You know the rooms.',
    attrs: { CHA: 3, DIP: 2, CON: 1 },
    apply: s => { s.contacts += 25; s.faces.G += 8; s.assets.push('BIO_TEACHER'); bumpAttrs(s, { CHA: 3, DIP: 2, CON: 1 }); }
  },
  {
    id: 'preacher', n: 'The Preacher', tag: 'pulpit precinct',
    d: 'A pulpit is a precinct. Sundays are turnout.',
    attrs: { CHA: 3, CLO: 2, DIP: 1 },
    apply: s => { s.volPool += 2; s.faces.F += 8; s.assets.push('BIO_PREACHER'); bumpAttrs(s, { CHA: 3, CLO: 2, DIP: 1 }); }
  },
  {
    id: 'smallbiz', n: 'The Feed-Store Owner', tag: 'credit and favors',
    d: 'Everyone owes you credit or a favor.',
    attrs: { CRA: 3, DIP: 2, CLO: 1 },
    apply: s => { s.money += 1500; s.faces.O += 8; s.assets.push('BIO_FEEDSTORE'); bumpAttrs(s, { CRA: 3, DIP: 2, CLO: 1 }); }
  }
];

export const ISSUES: IssueDef[] = [
  { id: 'taxes', n: 'Property taxes', tag: 'taxes', d: 'Appraisal districts, school M&O, the levy that never sleeps.' },
  { id: 'water', n: 'Water rights', tag: 'water', d: 'Groundwater districts, river authorities, and drought maps.' },
  { id: 'schools', n: 'School finance', tag: 'schools', d: 'Formulas, facilities, and Friday nights.' },
  { id: 'border', n: 'The border', tag: 'border', d: 'Federal failure, local consequence. Easy to shout; hard to govern.' },
  { id: 'hospitals', n: 'Rural hospitals', tag: 'hospitals', d: 'OB deserts, ambulance miles, and the last ER light.' },
  { id: 'land', n: 'Eminent domain', tag: 'land', d: 'Pipelines, corridors, and ranch gates.' }
];

export const DISTRICTS: DistrictDef[] = [
  { id: 'open', n: 'Open seat, safe district', d: 'Incumbent retired. Crowded field.', align: 'safe', incumbent: false, field: rng => 3 + Math.floor(rng() * 3) },
  { id: 'incumb', n: 'Safe district, entrenched incumbent', d: 'Twelve years and a war chest.', align: 'safe', incumbent: true, field: () => 1 },
  { id: 'comp', n: 'Competitive district, open primary', d: 'Primary then general. Two fights.', align: 'competitive', incumbent: false, field: () => 2 },
  { id: 'wrong', n: 'Wrong-party district', d: 'TRAP: bravery is not arithmetic.', align: 'wrong', incumbent: false, trap: true, field: () => 0 }
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
  persona.apply(state);
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
