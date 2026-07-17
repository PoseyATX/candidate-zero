/**
 * Persistent career — cycles never terminate the identity.
 * Win path: Session → Interim → next Primary
 * Loss path: Interim → next Primary
 */

import { injectIntoDrawPile } from './deck.js';
import { warm } from './reputation.js';
import { random } from './rng.js';
import type { CampaignOutcome, CycleResidue, DeckState, GameState } from './types.js';
import { maybeQueueThematicEvent } from './identity-shift.js';
import { grantCycleLoot } from './failure-loot.js';

export const INTERIM_WEEKS = 6;
export const SESSION_WEEKS = 4;
const CYCLE_CAMPAIGN_WEEKS = 14; // primary 8 + general 6

export function enterInterim(state: GameState, outcome: CampaignOutcome, text: string): void {
  state.over = false;
  state.outcome = outcome;
  state.lastCycleOutcome = outcome;
  state.stage = 'interim';
  state.interimWeek = 1;
  state.interimWeeksTotal = INTERIM_WEEKS;
  state.sessionWeek = 0;
  state.ap = state.apMax;
  state.fieldAp = 0;
  state.townHallThisWeek = false;
  state.pendingDraft = undefined;
  state.pendingThematic = null;

  if (outcome === 'won_general') {
    state.inOffice = true;
  } else if (outcome === 'lost_general') {
    state.inOffice = false;
  }

  state.log.push({ week: state.week, kind: 'note', text });

  // Tangible loot — cards + flags in UI (especially after failure)
  if (outcome !== 'ongoing' && outcome !== 'won_general') {
    // won_general loots on enterSession; avoid double oath
    grantCycleLoot(state, outcome);
  }

  state.log.push({
    week: state.week,
    kind: 'week',
    text:
      `OFF-SEASON opens (${INTERIM_WEEKS} months). ` +
      `Persona stays ${state.persona}. Spend money in the Shop. Work the district. ` +
      `What you gained from the last fight is in your Kit / Flags strip.`
  });

  maybeQueueThematicEvent(state);
}

/**
 * After winning the general: short regular session under the dome,
 * then off-season (district), then reelection primary.
 */
export function enterSession(state: GameState, text: string): void {
  state.over = false;
  state.outcome = 'won_general';
  state.lastCycleOutcome = 'won_general';
  state.inOffice = true;
  state.stage = 'session';
  state.sessionWeek = 1;
  state.sessionWeeksTotal = SESSION_WEEKS;
  state.interimWeek = 0;
  state.ap = state.apMax;
  state.fieldAp = 0;
  state.speakerFavor = state.speakerFavor ?? 0;
  state.pendingDraft = undefined;
  state.pendingThematic = null;
  state.townHallThisWeek = false;

  state.log.push({ week: state.week, kind: 'note', text });
  grantCycleLoot(state, 'won_general');
  state.log.push({
    week: state.week,
    kind: 'week',
    text:
      `SESSION opens (${SESSION_WEEKS} legislative weeks). ` +
      `You hold the seat. File, count, call home. Shop stays open — money still matters under the dome.`
  });
}

/** Apply pending interim/session residues at the start of the next primary. */
export function applyPendingResidue(state: GameState): void {
  const list = state.pendingResidue ?? [];
  if (!list.length) return;
  if (!state.activeResidue) state.activeResidue = [];
  for (const r of list) {
    applyOneResidue(state, r);
    state.activeResidue.push(r.id);
    state.log.push({
      week: state.week,
      kind: 'note',
      text: `Residue (${r.kind}): ${r.name} — ${r.text}`
    });
  }
  state.pendingResidue = [];
}

function applyOneResidue(state: GameState, r: CycleResidue): void {
  switch (r.id) {
    case 'RES_CASEWORK':
      state.contacts += 20;
      state.nameID += 1;
      break;
    case 'RES_ISSUE_TOUR':
    case 'RES_ISSUE_HOLD':
      state.messageSharp = true;
      state.endorsePts += 1;
      break;
    case 'RES_REGION_RITUAL':
      state.volPool += 1;
      state.contacts += 10;
      break;
    case 'RES_OPPO_FILE':
      state.oppoFile = true;
      state.globalBand = Math.max(0, (state.globalBand ?? 0) - 0.02);
      break;
    case 'RES_CRISIS_FACE':
      state.nameID += 2;
      state.faces.G += 4;
      break;
    case 'RES_NEGLECT':
    case 'RES_NEW_MAP':
    case 'RES_MAP_ANXIETY':
      if (state.district) state.district.field += 1;
      state.momentum = Math.max(0, state.momentum - 1);
      break;
    case 'RES_ISSUE_STALE':
    case 'RES_ISSUE_PIVOT':
      state.messageSharp = false;
      state.clubOdds = Math.max(0, (state.clubOdds ?? 0) - 0.05);
      break;
    case 'RES_STRINGS':
    case 'RES_MAP_FIGHT':
    case 'RES_GALLERY':
      state.debt += 200;
      state.exposure = (state.exposure || 0) + 1;
      break;
    case 'RES_RELOCATE':
      state.contacts = Math.max(0, state.contacts - 10);
      break;
    default:
      if (r.id.startsWith('RES_PERSONA_')) {
        state.nameID += 1;
        state.contacts += 8;
      } else if (r.kind === 'boon') {
        state.momentum += 1;
      } else {
        state.hitPieces = Math.min(6, state.hitPieces + 1);
      }
  }
}

export function beginNextPrimaryCycle(state: GameState, deck?: DeckState): void {
  state.cycleIndex = (state.cycleIndex ?? 0) + 1;
  state.stage = 'primary';
  state.week = 1;
  state.weeksTotal = CYCLE_CAMPAIGN_WEEKS;
  state.interimWeek = 0;
  state.sessionWeek = 0;
  state.ballot = false;
  state.signatures = 0;
  state.primaryWon = false;
  state.genOpp = null;
  state.genBase = 0;
  state.outcome = 'ongoing';
  state.over = false;
  state.ap = state.apMax;
  state.fieldAp = warm(state, 'AL09') ? 1 : 0;
  state.townHallThisWeek = false;
  state.pendingDraft = undefined;
  state.pendingThematic = null;
  state.lastPhase = 1;
  state.momentum = Math.max(0, Math.min(3, state.momentum));
  if (state.inOffice && state.district) {
    state.district.incumbent = true;
    state.nameID += 2;
  }
  if (state.district) {
    const baseField = Math.max(1, state.district.field);
    state.rivals = Array.from({ length: baseField }, (_, i) => ({
      id: 'RIV' + (i + 1),
      n: 'Rival ' + (i + 1)
    }));
  }
  applyPendingResidue(state);
  state.log.push({
    week: 1,
    kind: 'note',
    text:
      `CYCLE ${(state.cycleIndex ?? 0) + 1} — PRIMARY opens. ` +
      `You are still ${state.persona}. ` +
      `Issue: ${state.issue}. District: ${state.district?.name ?? '—'}` +
      (state.inOffice ? ' (incumbent).' : '.') +
      ` The petition box is empty again.`
  });

  if (deck) {
    deck.hand = [];
    deck.discard = [];
    if (deck.draw.length < 5 && state.deck?.length) {
      injectIntoDrawPile(deck, state, state.deck.slice(0, 8));
    }
  }
}

/** Advance one interim month. Returns true if next primary should open. */
export function advanceInterimMonth(state: GameState): boolean {
  if (state.stage !== 'interim') return false;
  if (state.pendingThematic) {
    state.log.push({
      week: state.week,
      kind: 'note',
      text: 'A thematic fork is open — resolve it before the month turns.'
    });
    return false;
  }
  const total = state.interimWeeksTotal ?? INTERIM_WEEKS;
  const cur = state.interimWeek ?? 1;
  if (cur >= total) {
    return true;
  }
  state.interimWeek = cur + 1;
  state.week += 1;
  state.ap = state.apMax;
  state.momentum = Math.max(0, state.momentum - 1);
  state.log.push({
    week: state.week,
    kind: 'week',
    text: `Off-season month ${state.interimWeek}/${total}. The district does not adjourn.`
  });
  maybeQueueThematicEvent(state);
  return false;
}

/** Advance one session week. Returns true if session ends → interim. */
export function advanceSessionWeek(state: GameState): boolean {
  if (state.stage !== 'session') return false;
  const total = state.sessionWeeksTotal ?? SESSION_WEEKS;
  const cur = state.sessionWeek ?? 1;
  if (random() < 0.45) {
    state.districtStanding = Math.max(0, (state.districtStanding ?? 60) - 1);
  }
  if (cur >= total) {
    return true;
  }
  state.sessionWeek = cur + 1;
  state.week += 1;
  state.ap = state.apMax;
  state.log.push({
    week: state.week,
    kind: 'week',
    text: `Session week ${state.sessionWeek}/${total}. Calendar pressure is weather.`
  });
  return false;
}

export function careerKey(): string {
  return 'cz_career_v1';
}
