/**
 * Candidate Zero — start at nothing.
 *
 * The name is the design: you are not a loaded campaign. You have legs, a
 * voice, and what your persona is — then you lose, and the deck you built is
 * the only legacy that matters.
 */

import { SIGNATURE_BY_PERSONA } from '../data/signature-plays.js';
import type { CampaignOutcome, GameState, LegacyCarry, LegacyState } from './types.js';

/** Legs — the only free verb every nobody starts with. */
export const ZERO_BOOTS = 'PL01';

/**
 * Day-one identity cast. Not well-seated, not PA_* empire archetypes.
 * Powerhouse / Operator / Local Legend etc. unlock much later.
 */
export const DAY_ONE_PERSONA_IDS = ['teacher', 'veteran', 'preacher', 'smallbiz'] as const;
export type DayOnePersonaId = (typeof DAY_ONE_PERSONA_IDS)[number];

export function isDayOnePersona(id: string | null | undefined): boolean {
  return !!id && (DAY_ONE_PERSONA_IDS as readonly string[]).includes(id);
}

/**
 * Cards that may appear on the camp strip in a Zero campaign before the world
 * has reason to open more doors. Ballot doors only — power is not a menu.
 */
export const ZERO_CAMP_DOORS = new Set(['PL04', 'PL05']);

/**
 * First-run physical pile: legs + voice (persona signature).
 * Not a toolbox. Not free money. Not a list.
 */
export function personaBoots(personaId: string | null | undefined): string[] {
  const ids = [ZERO_BOOTS];
  if (personaId) {
    const sig = SIGNATURE_BY_PERSONA[personaId];
    if (sig) ids.push(sig);
  }
  return ids;
}

export function isLossOutcome(kind: CampaignOutcome): boolean {
  return (
    kind === 'missed_filing' ||
    kind === 'lost_primary' ||
    kind === 'lost_general' ||
    kind === 'session_primaried'
  );
}

export function isWinOutcome(kind: CampaignOutcome): boolean {
  return (
    kind === 'won_general' ||
    kind === 'session_law' ||
    kind === 'session_survived'
  );
}

/** Unique card ids the player has built into their career deck. */
export function careerDeckOf(legacy: LegacyState | null | undefined): string[] {
  const d = legacy?.carry?.careerDeck;
  return Array.isArray(d) ? [...new Set(d.filter(id => typeof id === 'string' && id.length > 0))] : [];
}

/** Merge this run's ownership into the career deck (the legacy is the deck). */
export function mergeCareerDeck(legacy: LegacyState, state: GameState): string[] {
  const prev = careerDeckOf(legacy);
  const fromRun = Array.isArray(state.deck) ? state.deck : [];
  const next = [...new Set([...prev, ...fromRun, ...Object.keys(state.playedCardIds || {})])];
  legacy.carry = { ...legacy.carry, careerDeck: next };
  return next;
}

/**
 * Felt scar from a loss — short, personal, Texas. Not a system dump.
 * Shown on the terminal and banked so the Chronicle can list them.
 */
export function buildLossScar(state: GameState, kind: CampaignOutcome): string {
  const who = state.persona?.replace(/^The\s+/i, '') || 'a nobody';
  const place = state.district?.name || 'the district';
  switch (kind) {
    case 'missed_filing':
      return `${who} never made the ballot in ${place}. The clerk closed the window. The name stayed a rumor.`;
    case 'lost_primary':
      return `${who} lost the primary in ${place}. The room chose someone else. The list of people who still take the call is shorter now.`;
    case 'lost_general':
      return `${who} hit the general wall in ${place}. November does not care how hard the primary was.`;
    case 'session_primaried':
      return `${who} lost the seat from the inside. The district sent a message. It was not subtle.`;
    default:
      return `${who} left ${place} with less than they arrived with.`;
  }
}

export function bankScar(legacy: LegacyState, scar: string): void {
  const scars = Array.isArray(legacy.carry.scars) ? [...legacy.carry.scars] : [];
  scars.push(scar);
  // Keep the last dozen — a life, not an encyclopedia.
  legacy.carry = { ...legacy.carry, scars: scars.slice(-12) };
  const last = legacy.runs[legacy.runs.length - 1];
  if (last) last.scar = scar;
}

export function scarsOf(legacy: LegacyState | null | undefined): string[] {
  const s = legacy?.carry?.scars;
  return Array.isArray(s) ? s : [];
}

/** First run of a career (no prior epitaphs). */
export function isFirstRun(legacy: LegacyState | null | undefined): boolean {
  return !legacy || !legacy.runs || legacy.runs.length === 0;
}

/**
 * Whether the camp strip may show growth verbs beyond ballot doors.
 * First run, unnoticed: no. After the world notices you, or you have a past: yes.
 */
export function campGrowthUnlocked(state: GameState, _legacy?: LegacyState | null): boolean {
  if (state.sessionFlags?.noticed) return true;
  if (state.eventsFired?.EV_YOU_GOT_NOTICED) return true;
  if (Number(state.sessionFlags?.priorRuns || 0) > 0) return true;
  if (Number(state.sessionFlags?.careerCards || 0) > 2) return true;
  // Harness kit is not Zero — full strip allowed for instruments.
  if (state.sessionFlags?.zeroMode !== 1) return true;
  return false;
}

export function applyZeroStartingLedgers(state: GameState): void {
  // Not broke forever — broke enough that the fee door is a decision.
  if (state.money > 80) state.money = 80;
  if (state.volPool > 0) state.volPool = 0;
  if (state.nameID > 0) state.nameID = 0;
  if (state.contacts > 0) state.contacts = 0;
  // Day-one is not well-seated: strip free backers / favor dumps personas may add.
  if (isDayOnePersona(state.personaId) && isFirstRunFromFlags(state)) {
    state.backers = [];
    state.favors = 0;
  }
}

function isFirstRunFromFlags(state: GameState): boolean {
  return Number(state.sessionFlags?.priorRuns || 0) === 0;
}

export type StarterKit = 'zero' | 'harness';

export function resolveStarterIds(
  kit: StarterKit,
  legacy: LegacyState | null | undefined,
  harnessIds: string[],
  personaId?: string | null
): { physical: string[]; owned: string[] } {
  if (kit === 'harness') {
    return { physical: [...harnessIds], owned: [...harnessIds] };
  }
  const career = careerDeckOf(legacy);
  if (career.length > 0) {
    // What you built (and kept) is the legacy. Physical pile = what you carry.
    return { physical: [...career], owned: [...career] };
  }
  // First run: legs + voice. Ballot doors live on camp, not in the pile.
  const boots = personaBoots(personaId);
  return { physical: [...boots], owned: [...boots] };
}

/** Type patch helper — carry fields used by Zero. */
export function ensureCarry(legacy: LegacyState): LegacyCarry {
  return legacy.carry ?? (legacy.carry = {});
}
