/**
 * CANDIDATE ZERO — Minimal playable campaign loop
 * Hand → choose play → resolve → (repeat while AP) → advance week.
 * Pure engine surface for harnesses and eventual UI/Swift ports.
 */

import { ALL_PLAYS } from '../data/plays.js';
import {
  createDeckState,
  discardCard,
  discardHand,
  drawCards,
  DEFAULT_HAND_SIZE,
  takeFromHand,
  enforceWeeklyDraw,
  buildPhaseDraft,
  autoResolvePhaseDraft,
  resolvePhaseDraft
} from './deck.js';
import { executePlay, isPlayable } from './play.js';
import { createNewState, getPhase } from './state.js';
import {
  PRIMARY_WEEKS,
  advanceCampaignWeek,
  type StageTransition
} from './calendar.js';
import {
  applySetup,
  HARNESS_DEFAULT_SETUP,
  type SetupSelection
} from '../data/setup.js';
import type {
  DeckState,
  GameState,
  Ground,
  PlayCard,
  PlayOutcome
} from './types.js';

export interface Campaign {
  state: GameState;
  deck: DeckState;
  catalog: Map<string, PlayCard>;
  handSize: number;
  filingDeadline: number;
  setup: SetupSelection;
}

export interface CreateCampaignOptions extends Partial<GameState> {
  setup?: SetupSelection | Partial<SetupSelection>;
  /** When true (default for harnesses), auto-resolve phase drafts. */
  autoDraft?: boolean;
}

export interface WeekReport {
  week: number;
  phase: 1 | 2 | 3;
  stage: GameState['stage'];
  drawn: string[];
  plays: PlayOutcome[];
  endLedger: LedgerSnapshot;
  transition?: StageTransition;
}

export interface LedgerSnapshot {
  week: number;
  ap: number;
  money: number;
  contacts: number;
  nameID: number;
  volPool: number;
  signatures: number;
  ballot: boolean;
  momentum: number;
  endorsePts: number;
  hitPieces: number;
  walkCount: number;
}

export type Chooser = (
  playable: { index: number; card: PlayCard }[],
  state: GameState
) => number | null;

export function snapshot(state: GameState): LedgerSnapshot {
  return {
    week: state.week,
    ap: state.ap,
    money: state.money,
    contacts: state.contacts,
    nameID: state.nameID,
    volPool: state.volPool,
    signatures: state.signatures,
    ballot: state.ballot,
    momentum: state.momentum,
    endorsePts: state.endorsePts,
    hitPieces: state.hitPieces,
    walkCount: state.walkCount
  };
}

export function buildCatalog(plays: PlayCard[] = ALL_PLAYS): Map<string, PlayCard> {
  return new Map(plays.map(p => [p.id, p]));
}

export function createCampaign(overrides: CreateCampaignOptions = {}): Campaign {
  const { setup: setupIn, autoDraft: _autoDraft, ...stateOverrides } = overrides;
  // Seed first so deck shuffle and weekly draws share the stream.
  const state = createNewState({
    money: 200,
    volPool: 1,
    ...stateOverrides
  });
  const setup: SetupSelection = {
    ...HARNESS_DEFAULT_SETUP,
    ...(setupIn ?? {})
  };
  applySetup(state, setup);
  state.lastPhase = getPhase(state);

  // Seed starter deck inventory so weekly growth skips already-owned starters.
  const starter = [
    'PL01', 'PL01', 'PL01', 'PL02', 'PL03',
    'PL04', 'PL04', 'PL04', 'PL04', 'PL04',
    'PL05', 'PL05', 'PL06', 'PL10', 'PL13', 'PL13', 'PL13', 'PL08'
  ];
  state.deck = [...new Set(starter)];
  return {
    state,
    deck: createDeckState(),
    catalog: buildCatalog(),
    handSize: DEFAULT_HAND_SIZE,
    filingDeadline: PRIMARY_WEEKS,
    setup
  };
}

/**
 * If phase increased (ballot → 2, general → 3), open a 3-card draft.
 * Strategies/harnesses pass auto=true to pick option 0 immediately.
 */
export function maybeOfferPhaseDraft(campaign: Campaign, auto = true): string | null {
  const phase = getPhase(campaign.state);
  const prev = campaign.state.lastPhase ?? phase;
  if (phase <= prev) {
    campaign.state.lastPhase = phase;
    return null;
  }
  const draft = buildPhaseDraft(campaign.state, 3);
  draft.phase = phase;
  campaign.state.lastPhase = phase;
  if (!draft.options.length) return null;
  campaign.state.pendingDraft = draft;
  campaign.state.log.push({
    week: campaign.state.week,
    kind: 'note',
    text: `Phase ${phase} turn — draft ${draft.options.join(' / ')} (pick one for the pool).`
  });
  if (auto) {
    return autoResolvePhaseDraft(campaign.state);
  }
  return null;
}

export function pickPhaseDraft(campaign: Campaign, index: number): ReturnType<typeof resolvePhaseDraft> {
  return resolvePhaseDraft(campaign.state, index);
}

export const CAMP_PETITION = -101;
export const CAMP_FILING_FEE = -105;

export function listPlayableHand(campaign: Campaign): { index: number; card: PlayCard }[] {
  const out: { index: number; card: PlayCard }[] = [];
  campaign.deck.hand.forEach((id, index) => {
    const card = campaign.catalog.get(id);
    if (card && isPlayable(campaign.state, card)) {
      out.push({ index, card });
    }
  });
  if (!campaign.state.ballot) {
    const petition = campaign.catalog.get('PL04');
    const fee = campaign.catalog.get('PL05');
    if (petition && isPlayable(campaign.state, petition)) {
      out.push({ index: CAMP_PETITION, card: petition });
    }
    if (fee && isPlayable(campaign.state, fee)) {
      out.push({ index: CAMP_FILING_FEE, card: fee });
    }
  }
  return out;
}

export function ensureBallotAccessInHand(campaign: Campaign): string | null {
  if (campaign.state.ballot) return null;
  const hand = campaign.deck.hand;
  if (hand.includes('PL04') || hand.includes('PL05')) return null;
  const pull = (id: string): boolean => {
    const di = campaign.deck.draw.indexOf(id);
    if (di >= 0) {
      campaign.deck.draw.splice(di, 1);
      hand.push(id);
      return true;
    }
    const ci = campaign.deck.discard.indexOf(id);
    if (ci >= 0) {
      campaign.deck.discard.splice(ci, 1);
      hand.push(id);
      return true;
    }
    return false;
  };
  if (pull('PL04')) return 'PL04';
  if (pull('PL05')) return 'PL05';
  return null;
}

export function startWeek(campaign: Campaign): string[] {
  // === NEW: Enforce mandatory weekly draw from the growing pool ===
  const newCards = enforceWeeklyDraw(campaign.state);
  if (newCards.length > 0) {
    campaign.state.log.push({
      week: campaign.state.week,
      kind: 'draw',
      text: `New card${newCards.length > 1 ? 's' : ''} this week: ${newCards.join(', ')}`
    });
  }
  const need = Math.max(0, campaign.handSize - campaign.deck.hand.length);
  const drawn = drawCards(campaign.deck, need);
  const injected = ensureBallotAccessInHand(campaign);
  const note = injected ? ` [ballot access: ${injected}]` : '';
  campaign.state.log.push({
    week: campaign.state.week,
    kind: 'draw',
    text: `Drew ${drawn.length}: ${drawn.join(', ') || '(empty)'}${note}`
  });
  return [...newCards, ...drawn];
}

export function playFromHand(
  campaign: Campaign,
  handIndex: number,
  ground?: Ground
): PlayOutcome {
  if (handIndex === CAMP_PETITION || handIndex === CAMP_FILING_FEE) {
    const id = handIndex === CAMP_PETITION ? 'PL04' : 'PL05';
    const card = campaign.catalog.get(id);
    if (!card) return { ok: false, reason: `Unknown camp card ${id}` };
    if (campaign.state.ballot) {
      return { ok: false, reason: 'Already on ballot', cardId: id, cardName: card.n };
    }
    if (!isPlayable(campaign.state, card)) {
      return { ok: false, reason: 'Not playable', cardId: card.id, cardName: card.n };
    }
    return executePlay(campaign.state, card, ground);
  }
  const id = campaign.deck.hand[handIndex];
  if (id === undefined) return { ok: false, reason: 'Invalid hand index' };
  const card = campaign.catalog.get(id);
  if (!card) {
    takeFromHand(campaign.deck, handIndex);
    discardCard(campaign.deck, id);
    return { ok: false, reason: `Unknown card ${id}` };
  }
  if (!isPlayable(campaign.state, card)) {
    return { ok: false, reason: 'Not playable', cardId: card.id, cardName: card.n };
  }
  takeFromHand(campaign.deck, handIndex);
  const outcome = executePlay(campaign.state, card, ground);
  discardCard(campaign.deck, id);
  return outcome;
}

export function endWeekInPlace(campaign: Campaign): StageTransition {
  discardHand(campaign.deck);
  return advanceCampaignWeek(campaign.state);
}

export function runWeek(campaign: Campaign, choose: Chooser): WeekReport {
  const weekAtStart = campaign.state.week;
  const phaseAtStart = getPhase(campaign.state);
  const stageAtStart = campaign.state.stage;
  const drawn = startWeek(campaign);
  const plays: PlayOutcome[] = [];
  let guard = campaign.state.apMax * 4 + 4;
  while (campaign.state.ap > 0 && !campaign.state.over && guard-- > 0) {
    // Resolve any pending draft before plays (auto for harness path)
    if (campaign.state.pendingDraft) {
      autoResolvePhaseDraft(campaign.state);
    }
    const playable = listPlayableHand(campaign);
    if (playable.length === 0) break;
    const handIndex = choose(playable, campaign.state);
    if (handIndex === null || handIndex === undefined) break;
    const wasBallot = campaign.state.ballot;
    const outcome = playFromHand(campaign, handIndex);
    plays.push(outcome);
    if (!wasBallot && campaign.state.ballot) {
      maybeOfferPhaseDraft(campaign, true);
    }
    if (!outcome.ok) break;
  }
  const transition = endWeekInPlace(campaign);
  if (transition.kind === 'enter_general') {
    maybeOfferPhaseDraft(campaign, true);
  }
  return {
    week: weekAtStart,
    phase: phaseAtStart,
    stage: stageAtStart,
    drawn,
    plays,
    endLedger: snapshot(campaign.state),
    transition: transition.kind === 'none' ? undefined : transition
  };
}

export function runWeeks(
  campaign: Campaign,
  throughWeek: number,
  choose: Chooser
): WeekReport[] {
  const reports: WeekReport[] = [];
  while (campaign.state.week <= throughWeek && !campaign.state.over) {
    reports.push(runWeek(campaign, choose));
  }
  return reports;
}

/** Run primary + general until the campaign ends or calendar exhausts. */
export function runFullCampaign(campaign: Campaign, choose: Chooser): WeekReport[] {
  const reports: WeekReport[] = [];
  let guard = 40;
  while (!campaign.state.over && guard-- > 0) {
    reports.push(runWeek(campaign, choose));
  }
  return reports;
}
