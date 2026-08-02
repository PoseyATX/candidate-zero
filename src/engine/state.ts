/**
 * CANDIDATE ZERO — Minimal pure state factory and helpers
 * Foundation for the playable loop and balance harness.
 */

import type { GameState, Ground, Faces, Attrs } from './types.js';
import { setDefaultSeed, random } from './rng.js';
import {
  CAMPAIGN_WEEKS_TOTAL,
  advanceCampaignWeek
} from './calendar.js';

export {
  getPhase,
  stageLabel,
  stageWeek,
  PRIMARY_WEEKS,
  GENERAL_WEEKS,
  FILING_DEADLINE_WEEK,
  CAMPAIGN_WEEKS_TOTAL
} from './calendar.js';

export function createInitialFaces(): Faces {
  return { P: 0, O: 0, L: 0, G: 0, T: 0, F: 0 };
}

/** Baseline 10 on every root attribute (cardAttrMod neutral). */
export function createDefaultAttrs(): Attrs {
  return { CLO: 10, CON: 10, CRA: 10, INK: 10, DIP: 10, CHA: 10 };
}

/**
 * Weekly action budget.
 *
 * Was 2 with 107/117 cards costing exactly 1 AP, which made AP a play counter
 * rather than an economy: two plays a week, no cost tradeoff anywhere. At 5,
 * a week is a turn — five light touches, or a heavy lift plus a light one, or
 * one haymaker. Cards are priced 0-5 against what they actually do.
 */
export const CAMPAIGN_AP = 5;

/**
 * Signatures needed to make the ballot.
 *
 * Was 450, set against the 2-AP economy, where a focused campaign cleared the
 * ballot 99% of the time — no tension at all — and a grinding one still got
 * there by accident. Re-derived at the 5-AP economy against the real path
 * (applySetup adds a region petitionMod on top, so the effective bar varies
 * -80 to +100): at 600 the labor route clears 84.5% and a grinding one misses
 * filing 72.5%. Higher values only punish good play — grind sits flat at ~27%
 * from 550 to 700.
 */
export const BALLOT_SIGNATURES = 600;

/**
 * Turf budget, spent by field cards before campaign AP (see play.ts payCost).
 * Previously a 0/1 bonus from a warm AL09, which meant ground work competed
 * with ballot-making for the same 2 AP — the structural cause of labor banking
 * ~2.5x less rapport than money. Turf now has its own budget.
 */
export const TURF_AP = 2;

/** Waiting season is a quieter cadence than a campaign week. */
export const WAITING_AP = 2;

/**
 * The county as a board, not eight independent counters.
 *
 * Deriving adjacency from shared `aff` codes produced a near-complete graph
 * (5-6 neighbours of a possible 7), which is noise. This map is the fiction:
 * a town core (courthouse, subdivisions, plant gate, southside), a rural belt
 * (FM roads, church corridor, VFW), and lake country bridging the two.
 * Symmetric by construction — see harness:grounds.
 */
export const GROUND_NEIGHBORS: Record<string, string[]> = {
  GR01: ['GR03', 'GR05', 'GR08'], // Courthouse Square — the town core
  GR02: ['GR04', 'GR06', 'GR07'], // The FM Roads — the rural spine
  GR03: ['GR01', 'GR07'],         // New Subdivisions — new money, edge of town
  GR04: ['GR02', 'GR06', 'GR08'], // Church Corridor
  GR05: ['GR01', 'GR08'],         // The Plant Gate
  GR06: ['GR02', 'GR04'],         // VFW & Legion Halls
  GR07: ['GR02', 'GR03'],         // Lake Country
  GR08: ['GR01', 'GR04', 'GR05']  // Southside Blocks
};

/**
 * Share of rapport that carries into a neighbouring ground.
 *
 * Calibrated against harness:grounds. Higher values flood the map: at 0.25 a
 * focused campaign met the ground win-condition 88% of the time and a spread
 * one contested 6.6 of 8 grounds, which breaks the Phase 1 design target of
 * "a few, not all eight". At 0.12 focus contests ~2.9 and spread ~4.1, and the
 * condition sits inside its guarded band.
 */
export const NEIGHBOR_BLEED = 0.12;

export function createDefaultGrounds(): Ground[] {
  // rivalRap starts at 0; advanceRivalGrounds (calendar onWeekAdvance) banks
  // 5–40 cosmetic opposition each week for the ground picker / logs.
  return [
    { id: 'GR01', n: 'Courthouse Square', pool: 120, pool0: 120, prop: 0.9, aff: 'O,G', rapport: 0, gotv: 0, rivalRap: 0 },
    { id: 'GR02', n: 'The FM Roads', pool: 420, pool0: 420, prop: 0.7, aff: 'G,T', rapport: 0, gotv: 0, rivalRap: 0 },
    { id: 'GR03', n: 'The New Subdivisions', pool: 460, pool0: 460, prop: 0.28, aff: 'F,P', rapport: 0, gotv: 0, rivalRap: 0 },
    { id: 'GR04', n: 'Church Corridor', pool: 260, pool0: 260, prop: 0.72, aff: 'T,G', rapport: 0, gotv: 0, gated: true, rivalRap: 0 },
    { id: 'GR05', n: 'The Plant Gate', pool: 240, pool0: 240, prop: 0.5, aff: 'T,O', rapport: 0, gotv: 0, rivalRap: 0 },
    { id: 'GR06', n: 'VFW & Legion Halls', pool: 110, pool0: 110, prop: 0.92, aff: 'G,T', rapport: 0, gotv: 0, rivalRap: 0 },
    { id: 'GR07', n: 'Lake Country', pool: 230, pool0: 230, prop: 0.55, aff: 'L,G', rapport: 0, gotv: 0, rivalRap: 0 },
    { id: 'GR08', n: 'Southside Blocks', pool: 430, pool0: 430, prop: 0.3, aff: 'T,F', rapport: 0, gotv: 0, rivalRap: 0 }
  ];
}

/** Create a fresh primary-campaign state suitable for testing and harness work. */
export function createNewState(overrides: Partial<GameState> = {}): GameState {
  if (overrides.seed !== undefined) {
    setDefaultSeed(overrides.seed);
  }
  const base: GameState = {
    week: 1, weeksTotal: CAMPAIGN_WEEKS_TOTAL, ap: CAMPAIGN_AP, apMax: CAMPAIGN_AP, fieldAp: TURF_AP,
    money: 0, debt: 0, contacts: 0, nameID: 2, volPool: 0, momentum: 0, favors: 0,
    signatures: 0, sigNeed: BALLOT_SIGNATURES, ballot: false, hitPieces: 0, exposure: 0,
    messageSharp: false, clubOdds: 0, walkCount: 0, shadowPlays: 0, disasterLog: [],
    endorsePts: 0, slate: false, absenteeBank: 0, greeters: 0, pledges: 0,
    faces: createInitialFaces(), shFired: {}, groundsArr: createDefaultGrounds(),
    allies: [], backers: [], assets: [], obls: [], reps: [], rivals: [],
    tier: 0, persona: null, personaId: null, issue: null, issueId: null, district: null, eventsFired: {},
    playedCardIds: {}, pathProgress: {}, pathsUnlocked: {},
    stage: 'primary', genOpp: null, genBase: 0, over: false, outcome: 'ongoing',
    primaryWon: false, log: [],
    capital: 0, favor: 50, districtStanding: 60, bill: null, committee: null, sessionFlags: {},
    wave: (random() - 0.5) * 16, skippedTownHall: false, townHallThisWeek: false,
    debatePrepped: false, oppoFile: false, favWitness: 0, globalBand: 0,
    attrs: createDefaultAttrs(),
    deck: []
  };
  return { ...base, ...overrides, attrs: { ...createDefaultAttrs(), ...overrides.attrs } };
}

/**
 * Advance one week on the campaign calendar (may resolve elections).
 * Prefer loop.endWeekInPlace which also discards the hand.
 */
export function advanceWeek(state: GameState): GameState {
  advanceCampaignWeek(state);
  return state;
}
