/**
 * CANDIDATE ZERO — The Chronicle (cross-run meta-progression)
 *
 * Ported from archive/prototype-single-file.html's LEGACY/TRAITS/paths/
 * epithet/terminal system. A run ending is not a reset: the archive never
 * had a hard "game over" screen — it has a terminal beat (what happened,
 * what you grew despite losing), then an interim choice (how you spent the
 * two years until the next filing deadline) that grants one permanent
 * trait, then the next run starts already carrying real progress forward.
 *
 * `hasRep`/`warm` checks below only ever see reps this engine can actually
 * grant (see reputation.ts's documented gaps) — traits gated on R08/R09
 * marks in the archive simply won't fire here yet, same scoping as
 * everywhere else this session.
 */

import type { CampaignOutcome, GameState, LegacyState, TraitId } from './types.js';
import { hasRep } from './reputation.js';
import { generalWinProbability, primaryWinProbability } from './calendar.js';
import { applyLegacyDebt, isDebtCrisis, mergeDebtIntoCarry } from './debt.js';

const STORAGE_KEY = 'cz_legacy_v1';

export function emptyLegacy(): LegacyState {
  return { runs: [], traits: [], carry: {} };
}

function storageAvailable(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem('cz_t', '1');
    localStorage.removeItem('cz_t');
    return true;
  } catch {
    return false;
  }
}

export function loadLegacy(): LegacyState {
  if (!storageAvailable()) return emptyLegacy();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyLegacy();
    const parsed = JSON.parse(raw) as Partial<LegacyState>;
    return {
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      traits: Array.isArray(parsed.traits) ? parsed.traits : [],
      carry: parsed.carry ?? {},
      name: parsed.name
    };
  } catch {
    return emptyLegacy();
  }
}

export function saveLegacy(legacy: LegacyState): void {
  if (!storageAvailable()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
  } catch {
    // storage unavailable mid-session: the Chronicle lives for this sitting only
  }
}

export const TRAITS: Record<TraitId, { n: string; d: string }> = {
  T_AUTHOR: { n: 'Bill Author', d: 'You have written law. +4 name ID now; +2 capital in any future Session.' },
  T_LEVERS: { n: 'Knows the Levers', d: 'The building is a machine and you have seen the gears. +8 Parliamentarian, +8 Operator.' },
  T_LIST: { n: 'The Banked List', d: 'Start with 30% of your last run’s contacts.' },
  T_KNOWN: { n: 'Known Quantity', d: 'Start with +6 name ID. They remember the yard signs.' },
  T_CRED: { n: 'Movement Cred', d: 'True-Believer grounds start at 12 rapport.' },
  T_NORTH: { n: 'True North', d: 'The message starts sharp. You never lost the thread.' },
  T_NERD: { n: 'Procedure Nerd', d: '+12 Parliamentarian. Once per campaign, a procedural DISASTER reads down to a SETBACK.' },
  T_WHIP: { n: 'The Whip Count', d: '+12 Operator; start with a favor in your pocket.' },
  T_REST: { n: 'Rested', d: 'Start with +2 volunteers and a clean slate of grudges.' },
  T_PERSP: { n: 'Perspective', d: 'Disaster band permanently narrower. Losing taught you where the holes are.' }
};

export interface InterimPath {
  id: string;
  n: string;
  d: string;
  traits: [TraitId, TraitId];
  interim: string;
}

export function buildPaths(state: GameState, share: number): InterimPath[] {
  const respectable = share > 28 && state.hitPieces < 3;
  const crisis = isDebtCrisis(state);
  const wasSession =
    state.outcome === 'session_law' ||
    state.outcome === 'session_survived' ||
    state.outcome === 'session_primaried' ||
    state.stage === 'session';
  const paths: (InterimPath & { gate: boolean })[] = [
    {
      id: 'perennial',
      n: crisis ? 'The Perennial Candidate (and the Note)' : 'The Perennial Candidate',
      d: crisis
        ? `Keep running with $${state.debt} still on the books. Worse economics next cycle — interest compounds. Or take the PAC Check as relief next time.`
        : 'Keep the list warm. Keep showing up. The county learns your face by the third try.',
      traits: ['T_LIST', 'T_KNOWN'],
      gate: true,
      interim: crisis
        ? 'Two years of fish fries, funerals, and a bank note that does not sleep.'
        : 'Two years of fish fries and funerals, list warm.'
    },
    {
      id: 'advocate',
      n: 'The Advocate',
      d: `The candidate lost; the issue didn’t. Build the organization "${state.issue ?? 'the cause'}" deserved.`,
      traits: ['T_CRED', 'T_NORTH'],
      // Phase 3: crisis debt closes the soft paths — run again or go home.
      gate: !crisis,
      interim: `Two years building the ${state.issue ?? 'issue'} organization.`
    },
    {
      id: 'staffer',
      n: 'The Staffer',
      d: 'Someone in Austin noticed you. Two years inside the building, learning where the levers are.',
      traits: ['T_NERD', 'T_WHIP'],
      gate: !crisis && (respectable || state.endorsePts > 2),
      interim: 'Two years carrying a badge in the Capitol, learning the levers.'
    },
    {
      id: 'home',
      n: 'Go Home a While',
      d: crisis
        ? 'Stop the bleeding. Fix the fence. The note still compounds, but you are not on the trail.'
        : 'Fix the fence. Coach the team. Let the county forget the mailers before it remembers your name.',
      traits: ['T_REST', 'T_PERSP'],
      gate: true,
      interim: crisis
        ? 'Two years of fences, Friday games, and interest.'
        : 'Two years of fences and Friday games.'
    },
    {
      id: 'exmember',
      n: 'The Ex-Member',
      d: 'Two years as a former legislator — half lobbyist-in-waiting, half elder statesman, all rolodex.',
      traits: ['T_AUTHOR', 'T_LEVERS'],
      gate: wasSession,
      interim: 'Two years as a former member — doors still open, title still warm.'
    }
  ];
  return paths.filter(p => p.gate);
}

/** Trait effects on a fresh run — call after applySetup, before the campaign starts. */
export function applyLegacy(state: GameState, legacy: LegacyState): void {
  const has = (t: TraitId) => legacy.traits.includes(t);
  if (has('T_LIST') && legacy.carry.contacts) {
    state.contacts += Math.round(legacy.carry.contacts * 0.3);
  }
  if (has('T_KNOWN')) state.nameID += 6;
  if (has('T_CRED')) {
    for (const g of state.groundsArr) {
      if (g.aff.includes('T')) g.rapport = Math.max(g.rapport, 12);
    }
  }
  if (has('T_NORTH')) state.messageSharp = true;
  if (has('T_NERD')) {
    state.faces.P += 12;
    state.parlSave = true;
  }
  if (has('T_WHIP')) {
    state.faces.O += 12;
    state.favors += 1;
  }
  if (has('T_REST')) state.volPool += 2;
  if (has('T_PERSP')) state.globalBand = (state.globalBand ?? 0) - 0.01;
  if (has('T_AUTHOR')) state.nameID += 4;
  if (has('T_LEVERS')) {
    state.faces.P += 8;
    state.faces.O += 8;
  }
  // Phase 3: loss-branch debt compounds into the next cycle (affordability,
  // not odds). Reuses applyCarriedDebt → addObl OB2 (debt.ts / obligations.ts).
  applyLegacyDebt(state, legacy);

  // Starmap waiting loop from last Chronicle path — residue, not a stage rewrite.
  if (legacy.carry.waitingLoopId) {
    state.sessionFlags = state.sessionFlags || {};
    state.sessionFlags[`waiting_${legacy.carry.waitingLoopId}`] = true;
    state.entityHistory = state.entityHistory ?? [];
    const tag = `WAIT:${legacy.carry.waitingLoopId}`;
    if (!state.entityHistory.includes(tag)) state.entityHistory.push(tag);
    state.log.push({
      week: state.week,
      kind: 'note',
      text: `WAITING ORBIT — last cycle's path still colors this climb (${legacy.carry.waitingLoopId.replace('LOOP_WAITING_', '').toLowerCase()}). No true game over; only redirection.`
    });
  }
}

/**
 * Approximate "how close you were" for the epithet's loss narrative. Modular
 * resolution is probability-threshold based rather than a simulated vote
 * share, so this reuses the same win-probability formulas the calendar
 * already computes at each election, recomputed post-hoc off the state as
 * it stood when the run ended (pure formula, no RNG — safe to call after
 * the outcome is already set).
 */
export function computeShare(state: GameState, kind: CampaignOutcome): number {
  if (kind === 'lost_primary') return primaryWinProbability(state) * 100;
  if (kind === 'lost_general') return generalWinProbability(state) * 100;
  // Session reelection outlook is baked into the outcome text; surface standing.
  if (kind === 'session_law' || kind === 'session_survived') {
    return Math.min(95, 50 + state.districtStanding * 0.4);
  }
  if (kind === 'session_primaried') {
    return Math.max(5, state.districtStanding * 0.35);
  }
  return 0;
}

/** One-line narrative summary of how a run ended, for the Chronicle. */
export function buildEpithet(state: GameState, kind: CampaignOutcome, share: number): string {
  const who = state.persona ? lowerThe(state.persona) : 'The candidate';
  const alignLabel: Record<string, string> = {
    safe: 'a safe seat',
    competitive: 'a competitive district',
    wrong: 'a wrong-party district'
  };
  const d = alignLabel[state.district?.align ?? ''] ?? 'the district';

  let core: string;
  if (kind === 'won_general') {
    core = state.incumbentRun
      ? `defended the seat as the incumbent on ${state.issue ?? 'the issue'}`
      : `won the seat outright on ${state.issue ?? 'the issue'}`;
  } else if (kind === 'session_law') {
    core = `passed a bill into law on ${state.issue ?? 'the issue'} and held the seat`;
  } else if (kind === 'session_survived') {
    core = `survived a first session on ${state.issue ?? 'the issue'} and held the seat`;
  } else if (kind === 'session_primaried') {
    core = `won the seat, fought a session, and was primaried out`;
  } else if (kind === 'missed_filing') {
    core = `never made the ballot — ${state.signatures} signatures and an empty coffee can`;
  } else if (kind === 'lost_general') {
    core = `won the primary on ${state.issue ?? 'the issue'}, then hit the general’s wall at ${share.toFixed(1)}%`;
  } else {
    core = `ran on ${state.issue ?? 'the issue'} and fell at ${share.toFixed(1)}%`;
  }

  const marks: string[] = [];
  if (hasRep(state, 'R11')) marks.push('the county called them snakebit');
  if (hasRep(state, 'R09')) marks.push('the movement’s choice to the end');
  if (hasRep(state, 'R08')) marks.push('the establishment’s pick');
  if (state.shFired.F2 || state.shFired.T2) marks.push('undone partly by their own shadow');
  if (state.obls.length >= 3) marks.push(`carrying ${state.obls.length} obligations like stones`);
  if ((state.debt || 0) > 0) {
    marks.push(
      kind === 'won_general'
        ? `a note on the books ($${state.debt}) heading into Session`
        : `$${state.debt} still owed — the bank does not care who lost`
    );
  }
  if (hasRep(state, 'R01')) marks.push('nobody outworked them');

  return `${who} ${core} in ${d}${marks.length ? ' — ' + marks.join('; ') : ''}.`;
}

function lowerThe(n: string): string {
  return n.startsWith('The ') ? 'the ' + n.slice(4) : n;
}

/** What this run leaves behind even on a loss — the "not empty-handed" beat. */
export function buildGrowthLine(state: GameState): string | null {
  const grew: string[] = [];
  if (state.walkCount > 0) grew.push(`walked ${state.walkCount} blocks`);
  if (state.nameID > 0) grew.push(`built ${state.nameID} name recognition`);
  if (state.reps.length) grew.push(`earned ${state.reps.length} reputation${state.reps.length === 1 ? '' : 's'}`);
  if (!grew.length) return null;
  return `But you did not come away empty. This run, you ${grew.join(' · ')}. The county remembers.`;
}

/** Push this run into the Chronicle and bank its carry-forward stats. */
export function recordRun(legacy: LegacyState, state: GameState, kind: CampaignOutcome, share: number): void {
  legacy.runs.push({ epithet: buildEpithet(state, kind, share), kind });
  const base = { contacts: state.contacts, nameID: state.nameID };
  // Phase 3: loss compounds debt into carry; win zeros debt carry
  // (cash retirement happens in retireDebtOnWin on reelect / Session).
  legacy.carry = mergeDebtIntoCarry(base, state, kind);
}

/**
 * Chronicle interim path id → starmap waiting loop.
 * "No true game over" — loss redirects into a named orbit for the next climb.
 */
export const PATH_TO_WAITING_LOOP: Record<string, string> = {
  perennial: 'LOOP_WAITING_PERENNIAL',
  advocate: 'LOOP_WAITING_ADVOCATE',
  staffer: 'LOOP_WAITING_STAFFER',
  home: 'LOOP_WAITING_HOME',
  exmember: 'LOOP_WAITING_EXMEMBER'
};

/** Record interim flavor + bind waiting loop on carry for the next run. */
export function setInterimPath(legacy: LegacyState, pathId: string, interim: string): void {
  const last = legacy.runs[legacy.runs.length - 1];
  if (last) last.interim = interim;
  const loopId = PATH_TO_WAITING_LOOP[pathId];
  if (loopId) {
    legacy.carry = { ...legacy.carry, waitingLoopId: loopId };
  }
}

export function setInterim(legacy: LegacyState, interim: string): void {
  const last = legacy.runs[legacy.runs.length - 1];
  if (last) last.interim = interim;
}

export function addTrait(legacy: LegacyState, trait: TraitId): void {
  if (!legacy.traits.includes(trait)) legacy.traits.push(trait);
  if (legacy.traits.length > 3) legacy.traits = legacy.traits.slice(-3);
}

export function romanRun(index: number): string {
  const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return numerals[index] ?? String(index + 1);
}
