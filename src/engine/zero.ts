/**
 * Candidate Zero — start at nothing.
 *
 * The name is the design: you are not a loaded campaign. You have a name you
 * just filed, boots if you earned them, and the two legal doors onto the ballot.
 * Everything else is built in public, across losses.
 */

import type { CampaignOutcome, GameState, LegacyCarry, LegacyState } from './types.js';
import { zeroStarterDeck } from '../data/plays-zero.js';

/** One pair of boots. That is the whole opening kit. */
export const ZERO_BOOTS = 'PL01';

/**
 * Cards that may appear on the camp strip in a Zero campaign before the world
 * has reason to offer you more. Ballot doors only — power is not a menu.
 */
export const ZERO_CAMP_DOORS = new Set(['PL04', 'PL05']);

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

/** Room enough for every growth verb — the harness instruments and old saves. */
export const CAMP_GROWTH_ALL = 99;

/**
 * How many growth verbs the camp strip may show — a slope, not a switch.
 *
 * This used to be `campGrowthUnlocked`, a boolean: the CHOICE forks and the
 * alleyways were all off, and then on the week the world noticed you they were
 * all on at once. That is a system switching on at a threshold, which is the
 * one shape the gradient is not allowed to have. A player could feel the click.
 *
 * Now the strip widens by one option at a time off what the run has actually
 * accumulated — somebody in your corner, a debt, a district that knows your
 * name, trouble following you around. Day one of a first career is still
 * nothing but the ballot doors, because on day one none of those are true. The
 * difference is that week six is two options and week eleven is five, and no
 * week is the week it all arrives.
 *
 * Reads sessionFlags set at createCampaign so listPlayableHand stays pure.
 */
export function campGrowthRoom(state: GameState): number {
  // Harness kit is not Zero — full strip for instruments.
  if (state.sessionFlags?.zeroMode !== 1) return CAMP_GROWTH_ALL;

  let room = 0;
  // A career that has already been somewhere opens wider than a first filing.
  room += Math.min(3, Number(state.sessionFlags?.priorRuns || 0));
  room += Math.min(2, Math.floor(Number(state.sessionFlags?.careerCards || 0) / 8));
  // Being noticed is a real event and still counts — it is just no longer the
  // switch that turns the whole strip on.
  if (state.sessionFlags?.noticed || state.eventsFired?.EV_YOU_GOT_NOTICED) room += 2;
  // And the ordinary accretion of a run: people, debts, reach, trouble.
  if ((state.allies?.length ?? 0) >= 1) room += 1;
  if ((state.allies?.length ?? 0) >= 3) room += 1;
  if ((state.obls?.length ?? 0) >= 1) room += 1;
  if ((state.contacts ?? 0) >= 250) room += 1;
  if ((state.nameID ?? 0) >= 25) room += 1;
  if ((state.hitPieces ?? 0) >= 1) room += 1;
  return room;
}

export function applyZeroStartingLedgers(state: GameState): void {
  // Not broke forever — broke enough that the fee door is a decision.
  if (state.money > 80) state.money = 80;
  if (state.volPool > 0) state.volPool = 0;
  if (state.nameID > 0) state.nameID = 0;
  if (state.contacts > 0) state.contacts = 0;
}

export type StarterKit = 'zero' | 'harness';

/**
 * What you are holding when the week-one screen comes up.
 *
 * Run 1 is the persona and nothing else: the universal six plus that persona's
 * intrinsic four, liability included (data/plays-zero.ts). There is no generic
 * starting deck anywhere any more — two personas do not open on the same ten
 * cards, so two runs do not open the same way.
 *
 * Run 2+ is that same intrinsic ten PLUS whatever the career actually built.
 * The legacy still keeps the deck: a card earned in run 1 is in the pile in
 * run 2. The intrinsic ten is the floor under it, not a replacement for it.
 *
 * `personaId` is optional so every existing caller keeps compiling; without a
 * recognised persona this falls back to the old boots-only opening rather than
 * inventing a deck for somebody who has not filed yet.
 */
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
  const intrinsic = zeroStarterDeck(personaId ?? '');

  if (intrinsic.length === 0) {
    // No recognised persona (older save, harness fixture). Previous behaviour.
    if (career.length > 0) return { physical: [...career], owned: [...career] };
    return { physical: [ZERO_BOOTS], owned: [ZERO_BOOTS] };
  }

  // Duplicates matter in the physical pile — Knock is in there twice on
  // purpose — so the career is appended by id, not merged into a set.
  const inStarter = new Set(intrinsic);
  const carried = career.filter(id => !inStarter.has(id));
  const physical = [...intrinsic, ...carried];
  return { physical, owned: [...new Set(physical)] };
}

/** Type patch helper — carry fields used by Zero. */
export function ensureCarry(legacy: LegacyState): LegacyCarry {
  return legacy.carry ?? (legacy.carry = {});
}
