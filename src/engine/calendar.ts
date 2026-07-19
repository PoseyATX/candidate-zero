/**
 * CANDIDATE ZERO — Campaign calendar (Primary → General)
 * Primary: 8 weeks, filing deadline at end of week 8.
 * General: 6 weeks after winning the primary.
 * Pure transitions; RNG via shared stream.
 */

import { random } from './rng.js';
import { addAlly, warm } from './reputation.js';
import { applyOblDrag } from '../data/obligations.js';
import {
  enterSessionFromGeneral,
  onSessionWeekAdvance,
  resolveSineDie,
  SESSION_WEEKS
} from './session.js';
import type { CampaignOutcome, GameState, Ground } from './types.js';

/** Primary campaign length (includes filing window). */
export const PRIMARY_WEEKS = 8;
/** General election length after primary win. */
export const GENERAL_WEEKS = 6;
/** Must be on the ballot by the end of this primary week. */
export const FILING_DEADLINE_WEEK = PRIMARY_WEEKS;
/** Continuous calendar: primary 1–8, general 9–14. */
export const CAMPAIGN_WEEKS_TOTAL = PRIMARY_WEEKS + GENERAL_WEEKS;
export { SESSION_WEEKS };

export type StageTransitionKind =
  | 'none'
  | 'missed_filing'
  | 'lost_primary'
  | 'enter_general'
  | 'won_general'
  | 'lost_general'
  | 'enter_session'
  | 'session_law'
  | 'session_survived'
  | 'session_primaried';

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
 * Phase legality for cards:
 * - Primary, not on ballot → 1 (petition / fee window)
 * - Primary, on ballot → 2 (late primary / relationship / oppo)
 * - General → 3 (GOTV / contrast / general swing)
 */
export function getPhase(state: GameState): 1 | 2 | 3 {
  if (state.stage === 'general') return 3;
  if (state.stage === 'session') return 3;
  if (!state.ballot) return 1;
  return 2;
}

export function stageLabel(state: GameState): string {
  if (state.stage === 'general') return 'General';
  if (state.stage === 'session') return 'Session';
  return 'Primary';
}

/**
 * Phase 1 ground diminishing returns. Working the same ground repeatedly in
 * one week gets easier (familiarity: a small odds bump) but yields less new
 * rapport each time (you've met the people who were going to come around) —
 * so spreading across grounds is the way to broad rapport, while grinding
 * one ground is a reliable-but-shallow line. Pure: reads playCount, returns
 * modifiers; the caller applies them.
 *
 * @param playCount how many times THIS ground was already worked this week,
 *   BEFORE the current play (0 = first visit this week).
 */
export function getGroundPenalty(
  _state: GameState,
  _ground: Ground,
  playCount: number
): { oddsBonus: number; rapMult: number } {
  if (playCount <= 0) return { oddsBonus: 0, rapMult: 1 };
  // 2nd+ visit this week: familiarity nudge up on odds, half rapport gain.
  return { oddsBonus: 0.05, rapMult: 0.5 };
}

/**
 * Phase 1 opposition presence (COSMETIC — measuring for Phase 2). Once per
 * week the opposition organizes a ground, banking 5–40 rapport there. It
 * renders in the log and the ground picker but does NOT affect the player's
 * odds yet. The harness uses the resulting distribution to ask whether
 * visible opposition would change play if it had teeth (Phase 2).
 */
export function advanceRivalGrounds(state: GameState): void {
  const grounds = state.groundsArr;
  if (!grounds.length) return;
  const g = grounds[Math.floor(random() * grounds.length)]!;
  const amt = 5 + Math.floor(random() * 36); // 5–40
  g.rivalRap = (g.rivalRap ?? 0) + amt;
  state.log.push({
    week: state.week,
    kind: 'note',
    text: `Opposition organizers worked ${g.n} — +${amt} (they hold ${g.rivalRap} there now).`
  });
}

/**
 * Port of archive weekly passive ticks (prototype ~1593–1594): billboard
 * name ID in phase 2+, Finance Chair stipend if AL10 warm.
 * AL10 is an intentional stub (never granted in archive) — effect is ready
 * if a future path warms them.
 */
function applyWeeklyAssetAllyTicks(state: GameState): void {
  // archive:1593 — A12 passive name ID phase II–III
  if (state.assets.includes('A12') && state.tier >= 1) {
    state.nameID += state.billboardHalved ? 1 : 2;
  }
  // archive:1594
  if (warm(state, 'AL10')) state.money += 300;
}

/**
 * Lightweight week-boundary events that grant allies the archive only
 * hands out via vignettes (AL06 funeral unlock, AL12 Old Bull, AL14 staffer).
 * Uses the seeded RNG stream; fires at most one ally-event per advance so
 * campaigns aren't flooded. Gated by eventsFired so each is once per run.
 */
function advanceAllyEvents(state: GameState): void {
  const fired = state.eventsFired;
  const roll = random();

  // archive:883 — funeral available this week (unlocks PL29 / respect path → AL06)
  if (!fired['EV_FUNERAL'] && roll < 0.12) {
    fired['EV_FUNERAL'] = true;
    state.funeralWeek = state.week;
    state.log.push({
      week: state.week,
      kind: 'note',
      text: 'A beloved retired judge has died. The funeral is Saturday. (Attend the Funeral is available this week.)'
    });
    return;
  }

  // archive:893 / 901 — Old Bull holds court → AL12
  if (!fired['EV_OLD_BULL'] && !warm(state, 'AL12') && roll >= 0.12 && roll < 0.22) {
    fired['EV_OLD_BULL'] = true;
    addAlly(state, 'AL12', 2);
    state.log.push({
      week: state.week,
      kind: 'note',
      text: 'The Old Bull holds court at the diner, and there is one seat left. You take it. He talks for an hour about 1987 and it is all useful.'
    });
    return;
  }

  // archive:885 — rival staffer (simplified: no plant choice UI; 80% real → AL14)
  if (!fired['EV_STAFFER'] && !warm(state, 'AL14') && roll >= 0.22 && roll < 0.30) {
    fired['EV_STAFFER'] = true;
    state.shadowPlays++;
    if (random() < 0.2) {
      state.exposure += 2;
      state.hitPieces++;
      state.log.push({
        week: state.week,
        kind: 'note',
        text: 'THE STING — a "disgruntled staffer" was a plant. "CANDIDATE CAUGHT SOLICITING DIRT."'
      });
    } else {
      state.oppoFile = true;
      addAlly(state, 'AL14', 2);
      state.log.push({
        week: state.week,
        kind: 'note',
        text: "A rival's disgruntled staffer talks for two hours. A folder now exists. (Oppo File + ally.)"
      });
    }
  }
}

/** Week-boundary housekeeping: grounds, obligations drag, passive ticks, events. */
function onWeekAdvance(state: GameState): void {
  state.groundPlays = {};
  advanceRivalGrounds(state);
  // Phase 2: structured obligations weekly drag (archive OBLS.drag)
  applyOblDrag(state);
  applyWeeklyAssetAllyTicks(state);
  advanceAllyEvents(state);
}

/** Week within the current stage (1-based). */
export function stageWeek(state: GameState): number {
  if (state.stage === 'general') {
    return Math.max(1, state.week - PRIMARY_WEEKS);
  }
  // Session and primary both use week as stage-local (session resets to 1).
  return state.week;
}

/**
 * Primary win probability — skilled force (name, contacts, chairs, vols)
 * vs damage (hit pieces, exposure). Brutal but not random-walk.
 */
export function primaryWinProbability(state: GameState): number {
  const field =
    typeof state.district?.field === 'number' ? state.district.field : 2;
  const fieldPressure = 0.035 * field;
  // An entrenched incumbent (war chest, name recognition, twelve years of
  // relationships) is harder to unseat than raw rival count implies.
  const incumbentPressure = state.district?.incumbent ? 0.12 : 0;
  // Balloted skilled runs should reach general often enough to teach the loop;
  // unbuilt name/chairs still lose most primaries (souls-like, not free).
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

/**
 * Baseline general-election opponent strength from district partisan lean.
 * `field` (primary rival count) governs the primary only — align governs
 * November. A TRAP district (e.g. wrong-party) can have an empty, easy
 * primary and still be nearly unwinnable in the general.
 */
function genBaseForDistrict(district: GameState['district']): number {
  const align = district?.align as 'safe' | 'competitive' | 'wrong' | undefined;
  const base = align === 'safe' ? 0.28 : align === 'wrong' ? 0.72 : 0.45;
  const trapTax = district?.trap ? 0.08 : 0;
  return base + trapTax;
}

/**
 * General win probability vs genOpp / genBase.
 * GOTV is the lever — without it, skilled primary still can lose November.
 */
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
    gotv * 0.14 + // GOTV is the general dopamine lever
    state.momentum * 0.02 -
    state.hitPieces * 0.05 -
    opp * 0.28;
  return clamp(p, 0.06, 0.92);
}

function setOutcome(state: GameState, outcome: CampaignOutcome, text: string): StageTransition {
  state.over = true;
  state.outcome = outcome;
  state.log.push({ week: state.week, kind: 'note', text });
  return { kind: outcome as StageTransitionKind, text };
}

/**
 * Resolve end of primary week 8 (filing deadline + primary election).
 * Mutates state. Call when completing PRIMARY_WEEKS while still in primary.
 */
export function resolvePrimaryConclusion(state: GameState): StageTransition {
  if (state.stage !== 'primary') {
    return { kind: 'none', text: '' };
  }

  if (!state.ballot) {
    return setOutcome(
      state,
      'missed_filing',
      `Filing deadline (week ${FILING_DEADLINE_WEEK}): not on the ballot. The primary goes on without you.`
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
    onWeekAdvance(state);
    state.townHallThisWeek = false;
    state.outcome = 'ongoing';
    // Opponent strength from district partisan lean (align/trap) + residual primary heat
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
      `You advance to the General — ${GENERAL_WEEKS} weeks. Opponent strength ${state.genBase.toFixed(2)}.`;
    state.log.push({ week: state.week, kind: 'note', text });
    state.log.push({
      week: state.week,
      kind: 'week',
      text: `General week ${stageWeek(state)} begins (phase ${getPhase(state)}). AP refreshed.`
    });
    return { kind: 'enter_general', text, winP, roll };
  }

  return setOutcome(
    state,
    'lost_primary',
    `PRIMARY LOSS (p≈${(winP * 100).toFixed(0)}%, roll ${(roll * 100).toFixed(0)}%). ` +
      `On the ballot, short of the nomination. Run over.`
  );
}

/**
 * Resolve end of general (week CAMPAIGN_WEEKS_TOTAL).
 * Phase 4: a win enters Session immediately (does not terminal the run).
 */
export function resolveGeneralConclusion(state: GameState): StageTransition {
  if (state.stage !== 'general') {
    return { kind: 'none', text: '' };
  }
  const winP = generalWinProbability(state);
  const roll = random();
  if (roll < winP) {
    return enterSessionFromGeneral(state, winP, roll);
  }
  return setOutcome(
    state,
    'lost_general',
    `GENERAL LOSS (p≈${(winP * 100).toFixed(0)}%, roll ${(roll * 100).toFixed(0)}%). ` +
      `Primary glory, November heartbreak.`
  );
}

/**
 * After completing a week of play, advance calendar or resolve elections.
 * Returns transition info for harnesses / UI.
 */
export function advanceCampaignWeek(state: GameState): StageTransition {
  if (state.over) {
    return { kind: 'none', text: '' };
  }

  // Completing final primary week → filing + primary election
  if (state.stage === 'primary' && state.week === PRIMARY_WEEKS) {
    return resolvePrimaryConclusion(state);
  }

  // Completing final general week → general election (win → Session)
  if (state.stage === 'general' && state.week === CAMPAIGN_WEEKS_TOTAL) {
    return resolveGeneralConclusion(state);
  }

  // Completing final session week → sine die
  if (state.stage === 'session' && state.week === SESSION_WEEKS) {
    return resolveSineDie(state);
  }

  state.week += 1;
  state.ap = state.apMax;
  state.fieldAp = state.stage === 'session' ? 0 : warm(state, 'AL09') ? 1 : 0;
  state.momentum = Math.max(0, state.momentum - 1);
  state.townHallThisWeek = false;
  if (state.stage === 'session') {
    onSessionWeekAdvance(state);
    // Rival ground growth is campaign-era; skip in session
    state.groundPlays = {};
    applyOblDrag(state);
  } else {
    onWeekAdvance(state);
  }
  state.log.push({
    week: state.week,
    kind: 'week',
    text:
      state.stage === 'session'
        ? `SESSION WEEK ${state.week} — ${SESSION_WEEKS - state.week} to sine die. AP refreshed.`
        : `${stageLabel(state)} week ${stageWeek(state)} (calendar W${state.week}) begins (phase ${getPhase(state)}). AP refreshed.`
  });
  return { kind: 'none', text: '' };
}
