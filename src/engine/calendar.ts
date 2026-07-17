/**
 * CANDIDATE ZERO — Campaign calendar
 * Primary → General → (Session if win) → Interim → next Primary …
 */

import { random } from './rng.js';
import { warm } from './reputation.js';
import {
  enterInterim,
  enterSession,
  advanceInterimMonth,
  advanceSessionWeek,
  beginNextPrimaryCycle,
  INTERIM_WEEKS,
  SESSION_WEEKS
} from './career.js';
import type { CampaignOutcome, GameState } from './types.js';

export const PRIMARY_WEEKS = 8;
export const GENERAL_WEEKS = 6;
export const FILING_DEADLINE_WEEK = PRIMARY_WEEKS;
export const CAMPAIGN_WEEKS_TOTAL = PRIMARY_WEEKS + GENERAL_WEEKS;

export type StageTransitionKind =
  | 'none'
  | 'missed_filing'
  | 'lost_primary'
  | 'enter_general'
  | 'won_general'
  | 'lost_general'
  | 'enter_session'
  | 'enter_interim'
  | 'enter_next_primary';

export interface StageTransition {
  kind: StageTransitionKind;
  text: string;
  winP?: number;
  roll?: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Phase legality:
 * - Interim → 0
 * - Session → 4 (session menu, not campaign ph arrays)
 * - Primary pre-ballot → 1, on ballot → 2, general → 3
 */
export function getPhase(state: GameState): 0 | 1 | 2 | 3 | 4 {
  if (state.stage === 'interim') return 0;
  if (state.stage === 'session') return 4;
  if (state.stage === 'general') return 3;
  if (!state.ballot) return 1;
  return 2;
}

export function stageLabel(state: GameState): string {
  if (state.stage === 'general') return 'General';
  if (state.stage === 'session') return 'Session';
  if (state.stage === 'interim') return 'Off-season';
  return 'Primary';
}

export function stageWeek(state: GameState): number {
  if (state.stage === 'general') {
    return Math.max(1, state.week - PRIMARY_WEEKS);
  }
  if (state.stage === 'interim') {
    return state.interimWeek ?? 1;
  }
  if (state.stage === 'session') {
    return state.sessionWeek ?? 1;
  }
  return state.week;
}

export function primaryWinProbability(state: GameState): number {
  const field =
    typeof state.district?.field === 'number' ? state.district.field : 2;
  const fieldPressure = 0.035 * field;
  const incumbentPressure = state.district?.incumbent ? 0.12 : 0;
  const p =
    0.36 +
    state.nameID * 0.014 +
    state.contacts * 0.0005 +
    state.endorsePts * 0.04 +
    state.volPool * 0.02 +
    state.momentum * 0.018 -
    state.hitPieces * 0.055 -
    (state.exposure || 0) * 0.04 -
    fieldPressure -
    incumbentPressure;
  return clamp(p, 0.1, 0.9);
}

function genBaseForDistrict(district: GameState['district']): number {
  const align = district?.align as 'safe' | 'competitive' | 'wrong' | undefined;
  const base = align === 'safe' ? 0.28 : align === 'wrong' ? 0.72 : 0.45;
  const trapTax = district?.trap ? 0.08 : 0;
  return base + trapTax;
}

export function generalWinProbability(state: GameState): number {
  const rapport =
    state.groundsArr.reduce((s, g) => s + (g.rapport || 0), 0) /
    Math.max(1, state.groundsArr.length);
  const gotv = state.groundsArr.reduce((s, g) => s + (g.gotv || 0), 0);
  const opp = state.genBase || 0.45;
  const p =
    0.18 +
    state.nameID * 0.011 +
    state.contacts * 0.00035 +
    state.volPool * 0.018 +
    rapport * 0.0025 +
    gotv * 0.14 +
    state.momentum * 0.02 -
    state.hitPieces * 0.05 -
    opp * 0.28;
  return clamp(p, 0.06, 0.92);
}

function closeToInterim(
  state: GameState,
  outcome: Exclude<CampaignOutcome, 'ongoing' | 'ruin'>,
  text: string
): StageTransition {
  enterInterim(state, outcome, text);
  return { kind: outcome, text };
}

export function resolvePrimaryConclusion(state: GameState): StageTransition {
  if (state.stage !== 'primary') {
    return { kind: 'none', text: '' };
  }

  if (!state.ballot) {
    return closeToInterim(
      state,
      'missed_filing',
      `Filing deadline (week ${FILING_DEADLINE_WEEK}): not on the ballot. ` +
        `Off-season begins — the district still exists.`
    );
  }

  const winP = primaryWinProbability(state);
  const roll = random();
  if (roll < winP) {
    state.primaryWon = true;
    state.stage = 'general';
    state.week = PRIMARY_WEEKS + 1;
    state.ap = state.apMax;
    state.fieldAp = warm(state, 'AL09') ? 1 : 0;
    state.momentum = Math.max(0, state.momentum - 1);
    state.townHallThisWeek = false;
    state.outcome = 'ongoing';
    state.genBase = clamp(
      genBaseForDistrict(state.district) + state.hitPieces * 0.03,
      0.2,
      0.9
    );
    state.genOpp = {
      n: 'General election opponent',
      strength: state.genBase
    };
    const text =
      `PRIMARY WIN (p≈${(winP * 100).toFixed(0)}%, roll ${(roll * 100).toFixed(0)}%). ` +
      `General — ${GENERAL_WEEKS} weeks. Opponent strength ${state.genBase.toFixed(2)}.`;
    state.log.push({ week: state.week, kind: 'note', text });
    state.log.push({
      week: state.week,
      kind: 'week',
      text: `General week ${stageWeek(state)} begins (phase ${getPhase(state)}). AP refreshed.`
    });
    return { kind: 'enter_general', text, winP, roll };
  }

  return closeToInterim(
    state,
    'lost_primary',
    `PRIMARY LOSS (p≈${(winP * 100).toFixed(0)}%, roll ${(roll * 100).toFixed(0)}%). ` +
      `Off-season — tend the list or lose it.`
  );
}

export function resolveGeneralConclusion(state: GameState): StageTransition {
  if (state.stage !== 'general') {
    return { kind: 'none', text: '' };
  }
  const winP = generalWinProbability(state);
  const roll = random();
  if (roll < winP) {
    const text =
      `GENERAL WIN (p≈${(winP * 100).toFixed(0)}%, roll ${(roll * 100).toFixed(0)}%). ` +
      `The oath is short. Session opens.`;
    enterSession(state, text);
    return { kind: 'enter_session', text, winP, roll };
  }
  return closeToInterim(
    state,
    'lost_general',
    `GENERAL LOSS (p≈${(winP * 100).toFixed(0)}%, roll ${(roll * 100).toFixed(0)}%). ` +
      `November heartbreak. Off-season still answers the phone.`
  );
}

export function advanceCampaignWeek(state: GameState): StageTransition {
  if (state.over) {
    return { kind: 'none', text: '' };
  }

  // Session → interim when sine-die of our thin session hits
  if (state.stage === 'session') {
    const done = advanceSessionWeek(state);
    if (done) {
      enterInterim(
        state,
        'won_general',
        `Sine die on a short session. Bills filed: ${
          state.billsFiledSession ?? 0
        }. Homestead work begins — seats are lost in the quiet.`
      );
      return {
        kind: 'enter_interim',
        text: 'Session ends. Off-season opens for the seated.'
      };
    }
    return { kind: 'none', text: '' };
  }

  if (state.stage === 'interim') {
    const openNext = advanceInterimMonth(state);
    if (openNext) {
      beginNextPrimaryCycle(state);
      return {
        kind: 'enter_next_primary',
        text: 'Off-season ends. Another primary. Same name on the door.'
      };
    }
    return { kind: 'none', text: '' };
  }

  if (state.stage === 'primary' && state.week === PRIMARY_WEEKS) {
    return resolvePrimaryConclusion(state);
  }

  if (state.stage === 'general' && state.week === CAMPAIGN_WEEKS_TOTAL) {
    return resolveGeneralConclusion(state);
  }

  state.week += 1;
  state.ap = state.apMax;
  state.fieldAp = warm(state, 'AL09') ? 1 : 0;
  state.momentum = Math.max(0, state.momentum - 1);
  state.townHallThisWeek = false;
  state.log.push({
    week: state.week,
    kind: 'week',
    text: `${stageLabel(state)} week ${stageWeek(state)} (calendar W${state.week}) begins (phase ${getPhase(state)}). AP refreshed.`
  });
  return { kind: 'none', text: '' };
}

export { INTERIM_WEEKS, SESSION_WEEKS };
