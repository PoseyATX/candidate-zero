/**
 * CANDIDATE ZERO — Prototype compatibility layer
 * Frozen extract of CZ.resolve.roll + field name map for AC1.
 */

import type { Faces, GameState, RiskClass } from './types.js';

export const FIELD_MAP = {
  volunteers: 'volPool',
  ballotAccess: 'ballot',
  petitionSigs: 'signatures',
  petitionNeed: 'sigNeed',
  endorsements: 'endorsePts',
  'faces.goodb': 'faces.G',
  'faces.oper': 'faces.O',
  'faces.fire': 'faces.F',
  'faces.true': 'faces.T',
  'faces.lobb': 'faces.L'
} as const;

export interface PrototypeFaceBag {
  goodb?: number;
  oper?: number;
  fire?: number;
  true?: number;
  lobb?: number;
  parl?: number;
}

export interface PrototypeStateBag {
  volunteers?: number;
  ballotAccess?: boolean;
  petitionSigs?: number;
  petitionNeed?: number;
  endorsements?: number;
  money?: number;
  contacts?: number;
  nameID?: number;
  momentum?: number;
  hitPieces?: number;
  debt?: number;
  messageSharp?: boolean;
  tier?: number;
  faces?: PrototypeFaceBag;
  [key: string]: unknown;
}

export interface PrototypeRollResult {
  tier: 0 | 1 | 2 | 3;
  roll: number;
  p: number;
  disasterBand: number;
  stamp: string;
}

const STAMPS = ['BREAKTHROUGH', 'GAIN', 'SETBACK', 'DISASTER'] as const;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Frozen CZ.resolve.roll(p, tier, critShare). */
export function prototypeRoll(
  p: number,
  resistanceTier: number,
  critShare: number | null | undefined,
  next: () => number
): PrototypeRollResult {
  p = clamp(p, 0.02, 0.95);
  const tier = resistanceTier || 0;
  const cs = critShare == null ? 0.18 : critShare;
  const disasterBand = 0.04 + tier * 0.04;
  const r = next();
  let t: 0 | 1 | 2 | 3;
  if (r < p * cs) t = 0;
  else if (r < p) t = 1;
  else if (r > 1 - disasterBand) t = 3;
  else t = 2;
  return { tier: t, roll: r, p, disasterBand, stamp: STAMPS[t] };
}

export function modularToPrototypeParams(
  risk: RiskClass,
  state: GameState
): { critShare: number; resistanceTier: number; notes: string[] } {
  const notes: string[] = [];
  let critShare = 0.18;
  const resistanceTier = state.tier;
  if (risk === 'VOL') {
    critShare = 0.3;
    notes.push('VOL: modular critShare=0.3; disaster band 2× prototype base');
  } else if (risk === 'SAFE') {
    critShare = state.reps.includes('R01') ? 0.15 : 0;
    notes.push('SAFE: modular band forced to 0');
  }
  return { critShare, resistanceTier, notes };
}

export function fromPrototypeBag(bag: PrototypeStateBag): Partial<GameState> {
  const faces: Partial<Faces> = {};
  if (bag.faces) {
    if (bag.faces.goodb !== undefined) faces.G = bag.faces.goodb;
    if (bag.faces.oper !== undefined) faces.O = bag.faces.oper;
    if (bag.faces.fire !== undefined) faces.F = bag.faces.fire;
    if (bag.faces.true !== undefined) faces.T = bag.faces.true;
    if (bag.faces.lobb !== undefined) faces.L = bag.faces.lobb;
  }
  const out: Partial<GameState> = {};
  if (bag.volunteers !== undefined) out.volPool = bag.volunteers;
  if (bag.ballotAccess !== undefined) out.ballot = bag.ballotAccess;
  if (bag.petitionSigs !== undefined) out.signatures = bag.petitionSigs;
  if (bag.petitionNeed !== undefined) out.sigNeed = bag.petitionNeed;
  if (bag.endorsements !== undefined) out.endorsePts = bag.endorsements;
  if (bag.money !== undefined) out.money = bag.money;
  if (bag.contacts !== undefined) out.contacts = bag.contacts;
  if (bag.nameID !== undefined) out.nameID = bag.nameID;
  if (bag.momentum !== undefined) out.momentum = bag.momentum;
  if (bag.hitPieces !== undefined) out.hitPieces = bag.hitPieces;
  if (bag.debt !== undefined) out.debt = bag.debt;
  if (bag.messageSharp !== undefined) out.messageSharp = bag.messageSharp;
  if (bag.tier !== undefined) out.tier = bag.tier;
  if (Object.keys(faces).length) {
    out.faces = { P: 0, O: 0, L: 0, G: 0, T: 0, F: 0, ...faces };
  }
  return out;
}

export function toPrototypeBag(state: GameState): PrototypeStateBag {
  return {
    volunteers: state.volPool,
    ballotAccess: state.ballot,
    petitionSigs: state.signatures,
    petitionNeed: state.sigNeed,
    endorsements: state.endorsePts,
    money: state.money,
    contacts: state.contacts,
    nameID: state.nameID,
    momentum: state.momentum,
    hitPieces: state.hitPieces,
    debt: state.debt,
    messageSharp: state.messageSharp,
    tier: state.tier,
    faces: {
      goodb: state.faces.G,
      oper: state.faces.O,
      fire: state.faces.F,
      true: state.faces.T,
      lobb: state.faces.L
    }
  };
}

export const INTENTIONAL_DELTAS: { id: string; summary: string }[] = [
  { id: 'PL04', summary: 'Petition tuned 2026-07-16; archive HTML pre-tune yields.' },
  { id: 'SAFE', summary: 'Modular SAFE band=0; prototype roll() has no SAFE flag.' },
  { id: 'VOL', summary: 'Modular VOL doubles disaster band + critShare 0.3.' },
  { id: 'faces', summary: 'Modular faces P,O,L,G,T,F map five prototype nicknames.' }
];
