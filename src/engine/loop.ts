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
  STARTER_DECK_IDS,
  takeFromHand,
  enforceWeeklyDraw,
  buildPhaseDraft,
  autoResolvePhaseDraft,
  resolvePhaseDraft,
  injectIntoDrawPile
} from './deck.js';
import { executePlay, isPlayable } from './play.js';
import { createNewState, getPhase } from './state.js';
import {
  PRIMARY_WEEKS,
  advanceCampaignWeek,
  type StageTransition
} from './calendar.js';
import { markWeekStart, buildWeekSummary, type WeekSummary } from './feedback.js';
import { repCheck } from './reputation.js';
import {
  applySetup,
  HARNESS_DEFAULT_SETUP,
  type SetupSelection
} from '../data/setup.js';
import { pickInterimMenu, runInterimPlay } from '../data/interim-plays.js';
import { pickSessionMenu, runSessionPlay } from '../data/session-plays.js';
import { autoResolveThematic } from './identity-shift.js';
import { tickObligations } from './obligations.js';
import { flushCycleLootToDeck } from './failure-loot.js';
import { tickAssetPassives } from '../data/assets.js';
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
  phase: 0 | 1 | 2 | 3 | 4;
  stage: GameState['stage'];
  drawn: string[];
  plays: PlayOutcome[];
  endLedger: LedgerSnapshot;
  transition?: StageTransition;
  summary?: WeekSummary;
}

export interface LedgerSnapshot {
  week: number;
  ap: number;
  fieldAp: number;
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
    fieldAp: state.fieldAp,
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

  // Seed starter deck inventory (ownership) from the same list that seeds the
  // physical draw pile (createDeckState's default), so the two can't drift.
  state.deck = [...new Set(STARTER_DECK_IDS)];
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
    return autoResolvePhaseDraft(campaign.state, campaign.deck);
  }
  return null;
}

export function pickPhaseDraft(campaign: Campaign, index: number): ReturnType<typeof resolvePhaseDraft> {
  return resolvePhaseDraft(campaign.state, index, campaign.deck);
}

/** On entering general, ensure a GOTV card is in the physical deck (phase-3 spine). */
export function ensureGeneralTools(campaign: Campaign): void {
  if (campaign.state.stage !== 'general') return;
  const hasGotv =
    campaign.deck.draw.includes('PL19') ||
    campaign.deck.hand.includes('PL19') ||
    campaign.deck.discard.includes('PL19');
  if (!hasGotv) {
    injectIntoDrawPile(campaign.deck, campaign.state, ['PL19']);
    campaign.state.log.push({
      week: campaign.state.week,
      kind: 'note',
      text: 'General tools: GOTV Weekend enters the deck. Turnout is the promise kept.'
    });
  }
  // Recruit path if still vol-starved
  const hasRecruit =
    campaign.deck.draw.includes('PL16') ||
    campaign.deck.hand.includes('PL16') ||
    campaign.deck.discard.includes('PL16');
  if (!hasRecruit && (campaign.state.volPool ?? 0) < 2) {
    injectIntoDrawPile(campaign.deck, campaign.state, ['PL16']);
  }
}

export const CAMP_PETITION = -101;
export const CAMP_FILING_FEE = -105;

export function listPlayableHand(campaign: Campaign): { index: number; card: PlayCard }[] {
  const out: { index: number; card: PlayCard }[] = [];
  const inHandIds = new Set<string>();
  campaign.deck.hand.forEach((id, index) => {
    const card = campaign.catalog.get(id);
    if (card && isPlayable(campaign.state, card)) {
      out.push({ index, card });
      inHandIds.add(id);
    }
  });
  if (!campaign.state.ballot) {
    // Only offer the camp-action fallback when the real card isn't already
    // sitting in hand — otherwise Petition Drive / Filing Fee show up twice
    // in the same menu (harmless but confusing: two entries, two mechanics
    // for discarding the physical copy vs. leaving it inert).
    const petition = campaign.catalog.get('PL04');
    const fee = campaign.catalog.get('PL05');
    if (petition && !inHandIds.has('PL04') && isPlayable(campaign.state, petition)) {
      out.push({ index: CAMP_PETITION, card: petition });
    }
    if (fee && !inHandIds.has('PL05') && isPlayable(campaign.state, fee)) {
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
  // Flush failure/win card loot into the physical deck
  const flushed = flushCycleLootToDeck(campaign.state, campaign.deck);
  if (flushed.length) {
    campaign.state.log.push({
      week: campaign.state.week,
      kind: 'draw',
      text: `Loot cards enter the deck: ${flushed.join(', ')}`
    });
  }
  for (const note of tickAssetPassives(campaign.state)) {
    campaign.state.log.push({ week: campaign.state.week, kind: 'note', text: `KIT — ${note}` });
  }

  // Off-season / session use separate menus — no campaign deck draw spam
  if (campaign.state.stage === 'interim') {
    markWeekStart(campaign.state);
    campaign.state.ap = campaign.state.apMax;
    if (campaign.state.pendingThematic) {
      campaign.state.log.push({
        week: campaign.state.week,
        kind: 'note',
        text: `Thematic fork open: ${campaign.state.pendingThematic.title}`
      });
    }
    return flushed;
  }
  if (campaign.state.stage === 'session') {
    markWeekStart(campaign.state);
    campaign.state.ap = campaign.state.apMax;
    return flushed;
  }
  if (campaign.state.stage === 'general') {
    ensureGeneralTools(campaign);
  }
  markWeekStart(campaign.state);
  // Mandatory weekly growth: own new cards AND put them in the draw pile
  const newCards = enforceWeeklyDraw(campaign.state);
  if (newCards.length > 0) {
    // enforceWeeklyDraw already pushed ownership; inject physical copies
    // (ownership may already include them — push to draw only)
    for (const id of newCards) {
      campaign.deck.draw.push(id);
    }
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

export function endWeekInPlace(
  campaign: Campaign,
  opts: { autoThematic?: boolean } = {}
): StageTransition {
  const autoThematic = opts.autoThematic !== false; // default true for harnesses
  if (campaign.state.stage === 'primary' || campaign.state.stage === 'general') {
    discardHand(campaign.deck);
  }
  if (autoThematic && campaign.state.pendingThematic) {
    autoResolveThematic(campaign.state);
  }
  // Obligations drag every week/month before calendar advances
  tickObligations(campaign.state);
  const transition = advanceCampaignWeek(campaign.state);
  if (campaign.state.stage === 'primary' || campaign.state.stage === 'general') {
    repCheck(campaign.state);
  }
  if (transition.kind === 'enter_next_primary') {
    discardHand(campaign.deck);
  }
  return transition;
}

/** Close the week feedback summary (call before calendar advance). */
export function summarizeWeek(campaign: Campaign, plays: PlayOutcome[]): WeekSummary {
  const summary = buildWeekSummary(
    campaign.state,
    plays.filter(p => p.ok)
  );
  campaign.state.log.push({
    week: campaign.state.week,
    kind: 'summary',
    text: summary.juice
  });
  return summary;
}

export function runWeek(campaign: Campaign, choose: Chooser): WeekReport {
  const weekAtStart = campaign.state.week;
  const phaseAtStart = getPhase(campaign.state);
  const stageAtStart = campaign.state.stage;
  const drawn = startWeek(campaign);
  const plays: PlayOutcome[] = [];

  if (campaign.state.stage === 'interim') {
    if (campaign.state.pendingThematic) autoResolveThematic(campaign.state);
    let guard = campaign.state.apMax * 3 + 2;
    while (campaign.state.ap > 0 && guard-- > 0) {
      const menu = pickInterimMenu(campaign.state, 4);
      if (!menu.length) break;
      const pick = menu[0]!;
      const r = runInterimPlay(campaign.state, pick.id);
      plays.push({
        ok: r.ok,
        text: r.text,
        cardId: pick.id,
        cardName: pick.n,
        stamp: 'GAIN',
        tier: 1
      });
      if (!r.ok) break;
    }
  } else if (campaign.state.stage === 'session') {
    let guard = campaign.state.apMax * 3 + 2;
    while (campaign.state.ap > 0 && guard-- > 0) {
      const menu = pickSessionMenu(campaign.state, 4);
      if (!menu.length) break;
      const pick = menu[0]!;
      const r = runSessionPlay(campaign.state, pick.id);
      plays.push({
        ok: r.ok,
        text: r.text,
        cardId: pick.id,
        cardName: pick.n,
        stamp: 'GAIN',
        tier: 1
      });
      if (!r.ok) break;
    }
  } else {
    let guard = campaign.state.apMax * 4 + 4;
    while (campaign.state.ap > 0 && !campaign.state.over && guard-- > 0) {
      if (campaign.state.pendingDraft) {
        autoResolvePhaseDraft(campaign.state, campaign.deck);
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
  }
  const summary = summarizeWeek(campaign, plays);
  const transition = endWeekInPlace(campaign);
  if (transition.kind === 'enter_general') {
    ensureGeneralTools(campaign);
    maybeOfferPhaseDraft(campaign, true);
  }
  if (transition.kind === 'enter_next_primary') {
    startWeek(campaign);
  }
  return {
    week: weekAtStart,
    phase: phaseAtStart,
    stage: stageAtStart,
    drawn,
    plays,
    endLedger: snapshot(campaign.state),
    transition: transition.kind === 'none' ? undefined : transition,
    summary
  };
}

export function runWeeks(
  campaign: Campaign,
  throughWeek: number,
  choose: Chooser
): WeekReport[] {
  const reports: WeekReport[] = [];
  while (campaign.state.week <= throughWeek && !campaign.state.over && campaign.state.stage !== 'interim') {
    reports.push(runWeek(campaign, choose));
  }
  // Allow the week that transitions into interim to complete
  if (campaign.state.stage === 'primary' || campaign.state.stage === 'general') {
    // already stopped without interim
  }
  return reports;
}

/**
 * Run one election cycle until post-election parking:
 * - losses → interim
 * - general win → session (not yet interim)
 * Harnesses read lastCycleOutcome; career never ends.
 */
export function runFullCampaign(campaign: Campaign, choose: Chooser): WeekReport[] {
  const reports: WeekReport[] = [];
  let guard = 40;
  while (
    !campaign.state.over &&
    campaign.state.stage !== 'interim' &&
    campaign.state.stage !== 'session' &&
    guard-- > 0
  ) {
    reports.push(runWeek(campaign, choose));
  }
  return reports;
}

/** Auto-play through session weeks into interim. */
export function runThroughSession(campaign: Campaign, choose: Chooser): WeekReport[] {
  const reports: WeekReport[] = [];
  let guard = 12;
  while (campaign.state.stage === 'session' && !campaign.state.over && guard-- > 0) {
    reports.push(runWeek(campaign, choose));
  }
  return reports;
}

/** Keep auto-playing through interim months into the next primary (multi-cycle). */
export function runThroughInterim(campaign: Campaign, choose: Chooser): WeekReport[] {
  const reports: WeekReport[] = [];
  let guard = 20;
  while (campaign.state.stage === 'interim' && !campaign.state.over && guard-- > 0) {
    reports.push(runWeek(campaign, choose));
  }
  return reports;
}
