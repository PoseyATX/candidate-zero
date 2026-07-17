/**
 * CANDIDATE ZERO — Minimal pure state factory and helpers
 * Foundation for the playable loop and balance harness.
 */

import type { GameState, Ground, Faces, Attrs } from './types.js';
import { setDefaultSeed, random } from './rng.js';

export function createInitialFaces(): Faces {
  return { P: 0, O: 0, L: 0, G: 0, T: 0, F: 0 };
}

/** Baseline 10 on every root attribute (cardAttrMod neutral). */
export function createDefaultAttrs(): Attrs {
  return { CLO: 10, CON: 10, CRA: 10, INK: 10, DIP: 10, CHA: 10 };
}

export function createDefaultGrounds(): Ground[] {
  return [
    { id: 'GR01', n: 'Courthouse Square', pool: 120, pool0: 120, prop: 0.9, aff: 'O,G', rapport: 0, gotv: 0 },
    { id: 'GR02', n: 'The FM Roads', pool: 420, pool0: 420, prop: 0.7, aff: 'G,T', rapport: 0, gotv: 0 },
    { id: 'GR03', n: 'The New Subdivisions', pool: 460, pool0: 460, prop: 0.28, aff: 'F,P', rapport: 0, gotv: 0 },
    { id: 'GR04', n: 'Church Corridor', pool: 260, pool0: 260, prop: 0.72, aff: 'T,G', rapport: 0, gotv: 0, gated: true },
    { id: 'GR05', n: 'The Plant Gate', pool: 240, pool0: 240, prop: 0.5, aff: 'T,O', rapport: 0, gotv: 0 },
    { id: 'GR06', n: 'VFW & Legion Halls', pool: 110, pool0: 110, prop: 0.92, aff: 'G,T', rapport: 0, gotv: 0 },
    { id: 'GR07', n: 'Lake Country', pool: 230, pool0: 230, prop: 0.55, aff: 'L,G', rapport: 0, gotv: 0 },
    { id: 'GR08', n: 'The Barrio Blocks', pool: 430, pool0: 430, prop: 0.3, aff: 'T,F', rapport: 0, gotv: 0 }
  ];
}

/** Create a fresh primary-campaign state suitable for testing and harness work. */
export function createNewState(overrides: Partial<GameState> = {}): GameState {
  if (overrides.seed !== undefined) {
    setDefaultSeed(overrides.seed);
  }
  const base: GameState = {
    week: 1, weeksTotal: 24, ap: 2, apMax: 2, fieldAp: 0,
    money: 0, debt: 0, contacts: 0, nameID: 2, volPool: 0, momentum: 0, favors: 0,
    signatures: 0, sigNeed: 450, ballot: false, hitPieces: 0, exposure: 0,
    messageSharp: false, clubOdds: 0, walkCount: 0, shadowPlays: 0, disasterLog: [],
    endorsePts: 0, slate: false, absenteeBank: 0, greeters: 0, pledges: 0,
    faces: createInitialFaces(), shFired: {}, groundsArr: createDefaultGrounds(),
    allies: [], backers: [], assets: [], obls: [], reps: [], rivals: [],
    tier: 0, persona: null, issue: null, district: null, eventsFired: {},
    stage: 'primary', genOpp: null, genBase: 0, over: false, log: [],
    capital: 0, favor: 50, districtStanding: 60, bill: null, committee: null, sessionFlags: {},
    wave: (random() - 0.5) * 16, skippedTownHall: false, townHallThisWeek: false,
    debatePrepped: false, oppoFile: false, favWitness: 0, globalBand: 0,
    attrs: createDefaultAttrs(),
    deck: []
  };
  return { ...base, ...overrides, attrs: { ...createDefaultAttrs(), ...overrides.attrs } };
}

export function getPhase(state: GameState): 1 | 2 | 3 {
  if (state.stage === 'general') return 3;
  if (state.week <= 8) return 1;
  if (state.week <= 16) return 2;
  return 3;
}

/** Advance one week: refresh AP, decay momentum, clear per-week flags. Pure. */
export function advanceWeek(state: GameState): GameState {
  return {
    ...state,
    week: state.week + 1,
    ap: state.apMax,
    momentum: Math.max(0, state.momentum - 1),
    townHallThisWeek: false
  };
}
