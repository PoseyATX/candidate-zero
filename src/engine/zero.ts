/**
 * Candidate Zero — start at nothing (spec §§3–5).
 *
 * Starting deck is persona-intrinsic only (10 cards). Opportunities, not
 * offer menus. Assets/allies carry across runs; deck composition beyond
 * the persona kit does not.
 */

import {
  starterDeckFor,
  ZERO_PERSONA_IDS,
  type ZeroPersonaId,
  LIABILITY_IDS
} from '../data/zero-deck.js';
import type { CampaignOutcome, GameState, LegacyCarry, LegacyState } from './types.js';

/** @deprecated Prefer starterDeckFor — kept so old harness strings do not crash imports. */
export const ZERO_BOOTS = 'ZN_KNOCK';

/** Spec §3.1 — exactly four day-one personas. */
export const DAY_ONE_PERSONA_IDS = ZERO_PERSONA_IDS;
export type DayOnePersonaId = ZeroPersonaId;

export function isDayOnePersona(id: string | null | undefined): boolean {
  return !!id && (DAY_ONE_PERSONA_IDS as readonly string[]).includes(id);
}

/** Ballot doors — camp only, not in the pile. */
export const ZERO_CAMP_DOORS = new Set(['PL04', 'PL05']);

/** First-run / every Zero run physical pile = persona kit (10 cards). */
export function personaBoots(personaId: string | null | undefined): string[] {
  return starterDeckFor(personaId);
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

/**
 * §5: career deck of *cards* no longer carries power. Kept readable for old
 * saves but resolveStarterIds ignores it for Zero kits.
 */
export function careerDeckOf(legacy: LegacyState | null | undefined): string[] {
  const d = legacy?.carry?.careerDeck;
  return Array.isArray(d) ? [...new Set(d.filter(id => typeof id === 'string' && id.length > 0))] : [];
}

/**
 * §5: bank assets + allies only. Card piles reset to persona kit next run.
 * Anti-creep: carried assets shift odds elsewhere; they never set tier by fiat.
 */
export function mergeCareerDeck(legacy: LegacyState, state: GameState): string[] {
  // Preserve last-run ownership in carry for chronicle flavor only — not re-dealt.
  const fromRun = Array.isArray(state.deck) ? state.deck : [];
  legacy.carry = {
    ...legacy.carry,
    careerDeck: [...new Set(fromRun)].slice(0, 40),
    scars: legacy.carry?.scars
  };
  // Assets already on state; allies banked via machine settle. Mark run density.
  const allyIds = (state.allies || []).map(a => a.id);
  const assets = [...(state.assets || [])];
  legacy.carry = {
    ...legacy.carry,
    // Lightweight carry lists for next applyLegacy consumers
    bankedAllyIds: allyIds,
    bankedAssets: assets
  } as LegacyCarry;
  return careerDeckOf(legacy);
}

export function buildLossScar(state: GameState, kind: CampaignOutcome): string {
  const who = state.persona?.replace(/^The\s+/i, '') || 'a nobody';
  const place = state.district?.name || 'the district';
  switch (kind) {
    case 'missed_filing':
      return `${who} never made the ballot in ${place}. The clerk closed the window. The name stayed a rumor.`;
    case 'lost_primary':
      return `${who} lost the primary in ${place}. The room chose someone else.`;
    case 'lost_general':
      return `${who} hit the general wall in ${place}. November does not care how hard the primary was.`;
    case 'session_primaried':
      return `${who} lost the seat from the inside. The district sent a message.`;
    default:
      return `${who} left ${place} with less than they arrived with.`;
  }
}

export function bankScar(legacy: LegacyState, scar: string): void {
  const scars = Array.isArray(legacy.carry.scars) ? [...legacy.carry.scars] : [];
  scars.push(scar);
  legacy.carry = { ...legacy.carry, scars: scars.slice(-12) };
  const last = legacy.runs[legacy.runs.length - 1];
  if (last) last.scar = scar;
}

export function scarsOf(legacy: LegacyState | null | undefined): string[] {
  const s = legacy?.carry?.scars;
  return Array.isArray(s) ? s : [];
}

export function isFirstRun(legacy: LegacyState | null | undefined): boolean {
  return !legacy || !legacy.runs || legacy.runs.length === 0;
}

/**
 * Camp growth strip — Zero: doors only, never a mall unlock banner.
 * Harness keeps full strip for instruments.
 */
export function campGrowthUnlocked(state: GameState, _legacy?: LegacyState | null): boolean {
  if (state.sessionFlags?.zeroMode !== 1) return true;
  return false;
}

export function applyZeroStartingLedgers(state: GameState): void {
  if (state.money > 120) state.money = 120;
  // Faded Name old money is on the card, not the ledger dump
  if (state.personaId !== 'faded' && state.money > 80) state.money = 80;
  if (state.volPool > 1) state.volPool = 1;
  if (state.nameID > 2) state.nameID = Math.min(state.nameID, 2);
  if (state.personaId === 'blockwalker' && state.nameID > 0) state.nameID = 0;
  if (state.contacts > 5) state.contacts = 5;
  if (isDayOnePersona(state.personaId)) {
    state.backers = [];
    if (state.personaId !== 'faded') state.favors = 0;
  }
  // Faded: a little money
  if (state.personaId === 'faded') {
    state.money = Math.max(state.money, 350);
    state.nameID = Math.max(state.nameID, 2);
    state.sessionFlags = state.sessionFlags || {};
    state.sessionFlags.oldMoneyLeft = 400;
  }
  if (state.personaId === 'believer') {
    state.volPool = Math.max(state.volPool, 1);
    state.faces.T = Math.max(state.faces.T || 0, 4);
  }
  if (state.personaId === 'blockwalker') {
    state.faces.G = Math.max(state.faces.G || 0, 4);
  }
  if (state.personaId === 'staffer') {
    state.faces.P = Math.max(state.faces.P || 0, 4);
  }
}

export type StarterKit = 'zero' | 'harness';

export function resolveStarterIds(
  kit: StarterKit,
  _legacy: LegacyState | null | undefined,
  harnessIds: string[],
  personaId?: string | null
): { physical: string[]; owned: string[] } {
  if (kit === 'harness') {
    return { physical: [...harnessIds], owned: [...harnessIds] };
  }
  // §3.2 / §5: every Zero run opens on the persona kit. No generic deck.
  // No career card re-deal — assets/allies carry via legacy machine/applyLegacy.
  const boots = starterDeckFor(personaId);
  return { physical: [...boots], owned: [...boots] };
}

export function ensureCarry(legacy: LegacyState): LegacyCarry {
  return legacy.carry ?? (legacy.carry = {});
}

export function deckHasLiability(state: GameState): boolean {
  return (state.deck ?? []).some(id => LIABILITY_IDS.has(id));
}
