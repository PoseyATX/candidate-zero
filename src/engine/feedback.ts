/**
 * CANDIDATE ZERO — Dopamine / feedback loop (presentation of truth)
 *
 * Pure. Does NOT alter rolls, bands, or yields.
 * Makes outcomes legible and delicious: stamps, beats, near-misses,
 * streaks, milestones, week summaries.
 */

import { STAMPS } from './resolve.js';
import type { GameState, PlayCard, PlayOutcome, RiskClass, RollResult } from './types.js';

export type Beat = 'whisper' | 'hit' | 'thump' | 'crash' | 'spark';

export type NearMissKind =
  | 'almost_breakthrough'
  | 'almost_gain'
  | 'skirted_disaster'
  | 'brushed_disaster';

export interface PlayFeedback {
  stamp: (typeof STAMPS)[number];
  beat: Beat;
  /** 0–1 how hard the beat hits (UI animation scale). */
  intensity: number;
  /** Distance from tier boundary (0 = on the line). */
  margin: number;
  nearMiss?: NearMissKind;
  streak?: { kind: 'hot' | 'cold'; count: number };
  milestone?: string;
  /** One-line juice — never claims the RNG was soft. */
  juice: string;
}

export interface WeekSummary {
  week: number;
  stage: GameState['stage'];
  plays: number;
  stamps: { breakthrough: number; gain: number; setback: number; disaster: number };
  bestStamp?: (typeof STAMPS)[number];
  deltas: {
    contacts: number;
    money: number;
    signatures: number;
    nameID: number;
    volPool: number;
    gotv: number;
  };
  milestones: string[];
  headline: string;
  juice: string;
}

export interface FeedbackState {
  hotStreak: number;
  coldStreak: number;
  milestonesSeen: string[];
  weekStart?: {
    week: number;
    contacts: number;
    money: number;
    signatures: number;
    nameID: number;
    volPool: number;
    gotv: number;
    ballot: boolean;
  };
  lastPlay?: PlayFeedback;
  lastWeek?: WeekSummary;
}

export function createFeedbackState(): FeedbackState {
  return { hotStreak: 0, coldStreak: 0, milestonesSeen: [] };
}

function ensureFb(state: GameState): FeedbackState {
  if (!state.feedback) state.feedback = createFeedbackState();
  return state.feedback;
}

function totalGotv(state: GameState): number {
  return state.groundsArr.reduce((s, g) => s + (g.gotv || 0), 0);
}

/** Snapshot ledger at week open for delta summaries. */
export function markWeekStart(state: GameState): void {
  const fb = ensureFb(state);
  fb.weekStart = {
    week: state.week,
    contacts: state.contacts,
    money: state.money,
    signatures: state.signatures,
    nameID: state.nameID,
    volPool: state.volPool,
    gotv: totalGotv(state),
    ballot: state.ballot
  };
}

/**
 * Near-miss from geometry of the roll — pure, no re-roll.
 * Boundaries from resolve(): breakthrough < p*crit, gain < p, disaster > 1-band.
 */
export function detectNearMiss(
  roll: RollResult,
  risk: RiskClass,
  tier: 0 | 1 | 2 | 3
): { kind: NearMissKind; margin: number } | null {
  const { roll: r, p, band } = roll;
  // Reconstruct critShare the same way resolve does (approx; SAFE often 0)
  const critShare = risk === 'VOL' ? 0.3 : risk === 'SAFE' ? 0 : 0.18;
  const breakLine = p * critShare;
  const gainLine = p;
  const disasterLine = band > 0 ? 1 - band : 1.01;

  const NEAR = 0.045;

  if (tier === 1 && critShare > 0 && r >= breakLine && r - breakLine < NEAR) {
    return { kind: 'almost_breakthrough', margin: r - breakLine };
  }
  if (tier === 2 && r >= gainLine && r - gainLine < NEAR) {
    return { kind: 'almost_gain', margin: r - gainLine };
  }
  if (tier === 2 && band > 0 && disasterLine - r < NEAR && r <= disasterLine) {
    return { kind: 'skirted_disaster', margin: disasterLine - r };
  }
  if (tier === 3 && band > 0 && r - disasterLine < NEAR) {
    return { kind: 'brushed_disaster', margin: r - disasterLine };
  }
  return null;
}

function beatForTier(tier: 0 | 1 | 2 | 3, near?: NearMissKind): Beat {
  if (tier === 0) return 'spark';
  if (tier === 1) return near === 'almost_breakthrough' ? 'hit' : 'hit';
  if (tier === 3) return 'crash';
  // setback
  if (near === 'almost_gain') return 'thump';
  if (near === 'skirted_disaster') return 'whisper';
  return 'thump';
}

function intensityFor(tier: 0 | 1 | 2 | 3, margin: number, near?: NearMissKind): number {
  const base = tier === 0 ? 1 : tier === 1 ? 0.65 : tier === 3 ? 0.95 : 0.4;
  const nearBoost = near ? 0.15 : 0;
  const tight = Math.max(0, 0.12 - margin) * 2;
  return Math.min(1, base + nearBoost + tight);
}

function juiceLine(
  card: PlayCard,
  stamp: string,
  near?: NearMissKind,
  streak?: { kind: 'hot' | 'cold'; count: number },
  milestone?: string
): string {
  if (milestone) return milestone;
  if (near === 'almost_breakthrough') {
    return `${card.n}: GAIN — a hair from BREAKTHROUGH. The room felt it.`;
  }
  if (near === 'almost_gain') {
    return `${card.n}: SETBACK — you were that close to a win.`;
  }
  if (near === 'skirted_disaster') {
    return `${card.n}: SETBACK — walked the cliff edge; didn't fall.`;
  }
  if (near === 'brushed_disaster') {
    return `${card.n}: DISASTER — one bad inch past the line.`;
  }
  if (streak && streak.kind === 'hot' && streak.count >= 3) {
    return `${stamp} on ${card.n} — hot streak ×${streak.count}. The machine likes you today.`;
  }
  if (streak && streak.kind === 'cold' && streak.count >= 3) {
    return `${stamp} on ${card.n} — cold streak ×${streak.count}. No pity. Keep walking.`;
  }
  if (stamp === 'BREAKTHROUGH') return `${card.n}: BREAKTHROUGH. The kind that makes careers.`;
  if (stamp === 'DISASTER') return `${card.n}: DISASTER. The kind that makes enemies.`;
  if (stamp === 'GAIN') return `${card.n}: GAIN. Bank it.`;
  return `${card.n}: SETBACK. Next play.`;
}

function checkMilestones(
  state: GameState,
  card: PlayCard,
  tier: 0 | 1 | 2 | 3,
  before: { ballot: boolean; sigs: number; stage: GameState['stage'] }
): string | undefined {
  const fb = ensureFb(state);
  const seen = new Set(fb.milestonesSeen);
  const fire = (id: string, text: string): string | undefined => {
    if (seen.has(id)) return undefined;
    fb.milestonesSeen.push(id);
    return text;
  };

  if (!before.ballot && state.ballot) {
    return fire('first_ballot', 'ON THE BALLOT. The filing clerk stamps your name.');
  }
  if (before.sigs < state.sigNeed * 0.5 && state.signatures >= state.sigNeed * 0.5 && !state.ballot) {
    return fire('half_sigs', 'Halfway to the signature threshold. The clipboard is heavier.');
  }
  if (
    !state.ballot &&
    state.signatures >= state.sigNeed - 40 &&
    state.signatures < state.sigNeed
  ) {
    // near ballot — may re-fire as juice not milestone once
    return fire(
      'near_ballot',
      `Almost there — ${state.signatures}/${state.sigNeed} signatures. One more good petition week.`
    );
  }
  if (tier === 0) {
    return fire('first_break', `First BREAKTHROUGH (${card.n}). Remember how this feels.`);
  }
  if (before.stage === 'primary' && state.stage === 'general') {
    return fire('enter_general', 'PRIMARY WON. Six weeks to November. Turnout is the promise.');
  }
  if (state.outcome === 'won_general') {
    return fire('won_general', 'GENERAL WIN. The district is yours. Session waits.');
  }
  return undefined;
}

/**
 * Build feedback for a resolved play. Mutates streak counters on state.feedback only.
 * Call AFTER card.run has applied yields so milestones see new ballot/sigs.
 */
export function buildPlayFeedback(
  state: GameState,
  card: PlayCard,
  roll: RollResult,
  before: { ballot: boolean; sigs: number; stage: GameState['stage'] }
): PlayFeedback {
  const fb = ensureFb(state);
  const stamp = STAMPS[roll.tier];
  const near = detectNearMiss(roll, card.risk, roll.tier);
  const margin = near?.margin ?? 0;

  // Streaks: hot = success tiers, cold = fail tiers
  if (roll.tier <= 1) {
    fb.hotStreak += 1;
    fb.coldStreak = 0;
  } else {
    fb.coldStreak += 1;
    fb.hotStreak = 0;
  }

  let streak: PlayFeedback['streak'];
  if (fb.hotStreak >= 2) streak = { kind: 'hot', count: fb.hotStreak };
  if (fb.coldStreak >= 2) streak = { kind: 'cold', count: fb.coldStreak };

  const milestone = checkMilestones(state, card, roll.tier, before);
  const beat = beatForTier(roll.tier, near?.kind);
  const intensity = intensityFor(roll.tier, margin, near?.kind);
  const juice = juiceLine(card, stamp, near?.kind, streak, milestone);

  const feedback: PlayFeedback = {
    stamp,
    beat,
    intensity,
    margin,
    nearMiss: near?.kind,
    streak,
    milestone,
    juice
  };
  fb.lastPlay = feedback;
  return feedback;
}

export function buildWeekSummary(state: GameState, playLogs: { tier?: number }[]): WeekSummary {
  const fb = ensureFb(state);
  const start = fb.weekStart;
  const stamps = { breakthrough: 0, gain: 0, setback: 0, disaster: 0 };
  for (const p of playLogs) {
    if (p.tier === 0) stamps.breakthrough++;
    else if (p.tier === 1) stamps.gain++;
    else if (p.tier === 3) stamps.disaster++;
    else if (p.tier === 2) stamps.setback++;
  }
  const bestStamp: WeekSummary['bestStamp'] =
    stamps.breakthrough > 0
      ? 'BREAKTHROUGH'
      : stamps.disaster > 0
        ? 'DISASTER'
        : stamps.gain > 0
          ? 'GAIN'
          : playLogs.length
            ? 'SETBACK'
            : undefined;

  const deltas = {
    contacts: start ? state.contacts - start.contacts : 0,
    money: start ? state.money - start.money : 0,
    signatures: start ? state.signatures - start.signatures : 0,
    nameID: start ? state.nameID - start.nameID : 0,
    volPool: start ? state.volPool - start.volPool : 0,
    gotv: start ? totalGotv(state) - start.gotv : 0
  };

  const milestones: string[] = [];
  if (start && !start.ballot && state.ballot) milestones.push('Ballot secured');
  if (deltas.signatures >= 80) milestones.push('Signature haul');
  if (stamps.breakthrough >= 2) milestones.push('Double breakthrough week');
  if (stamps.disaster >= 2) milestones.push('Rough week');
  if (state.stage === 'general' && deltas.gotv > 0) milestones.push('GOTV banked');

  let headline = `Week ${state.week} closed.`;
  if (bestStamp === 'BREAKTHROUGH') headline = `Week ${state.week}: you stole a scene.`;
  else if (bestStamp === 'DISASTER') headline = `Week ${state.week}: the paper will remember.`;
  else if (stamps.gain > stamps.setback) headline = `Week ${state.week}: net forward.`;
  else if (playLogs.length === 0) headline = `Week ${state.week}: empty hands.`;

  const parts: string[] = [];
  if (deltas.contacts) parts.push(`${deltas.contacts >= 0 ? '+' : ''}${deltas.contacts} contacts`);
  if (deltas.money) parts.push(`${deltas.money >= 0 ? '+' : ''}$${deltas.money}`);
  if (deltas.signatures) parts.push(`${deltas.signatures >= 0 ? '+' : ''}${deltas.signatures} sigs`);
  if (deltas.nameID) parts.push(`${deltas.nameID >= 0 ? '+' : ''}${deltas.nameID} name`);
  if (deltas.gotv) parts.push(`+${deltas.gotv.toFixed(2)} GOTV`);
  const juice =
    parts.length > 0
      ? `${headline} ${parts.join(' · ')}.`
      : `${headline} No ledger move — the calendar still turned.`;

  const summary: WeekSummary = {
    week: start?.week ?? state.week,
    stage: state.stage,
    plays: playLogs.length,
    stamps,
    bestStamp,
    deltas,
    milestones,
    headline,
    juice
  };
  fb.lastWeek = summary;
  return summary;
}

/** Format for CLI / log line. */
export function formatPlayJuice(fb: PlayFeedback): string {
  const bits = [`[${fb.stamp}]`, fb.juice];
  if (fb.streak && fb.streak.count >= 2) {
    bits.push(fb.streak.kind === 'hot' ? `🔥×${fb.streak.count}` : `❄×${fb.streak.count}`);
  }
  return bits.join(' ');
}
