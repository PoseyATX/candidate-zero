/**
 * CANDIDATE ZERO — Minimal playable campaign loop
 * Hand → choose play → resolve → (repeat while AP) → advance week.
 * Pure engine surface for harnesses and eventual UI/Swift ports.
 */

import { ALL_PLAYS, SHOP_PLAYS } from '../data/plays.js';
import { SESSION_PLAYS } from '../data/session-plays.js';
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
import { applyLegacy } from './legacy.js';
import { availableCash, retireDebtOnWin } from './debt.js';
import { isPilotMovementAvailable, syncMovementFlags } from './entities.js';
import { PILOT_VERB_PLAY_ID } from '../data/starmap/pilot-precinct.js';
import {
  applySetup,
  HARNESS_DEFAULT_SETUP,
  type SetupSelection
} from '../data/setup.js';
import type {
  DeckState,
  GameState,
  Ground,
  LegacyState,
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
  summary?: WeekSummary;
}

export interface LedgerSnapshot {
  week: number;
  ap: number;
  fieldAp: number;
  money: number;
  /** Phase 3: cash after debt service reserve (what $ costs actually see). */
  availableCash: number;
  debt: number;
  contacts: number;
  nameID: number;
  volPool: number;
  signatures: number;
  ballot: boolean;
  momentum: number;
  endorsePts: number;
  hitPieces: number;
  walkCount: number;
  alliesWarm: number;
  assetsOwned: number;
  oblsCount: number;
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
    availableCash: availableCash(state),
    debt: state.debt || 0,
    contacts: state.contacts,
    nameID: state.nameID,
    volPool: state.volPool,
    signatures: state.signatures,
    ballot: state.ballot,
    momentum: state.momentum,
    endorsePts: state.endorsePts,
    hitPieces: state.hitPieces,
    walkCount: state.walkCount,
    alliesWarm: state.allies.filter(a => a.warm > 0).length,
    assetsOwned: state.assets.filter(a => /^A\d+/.test(a)).length,
    oblsCount: state.obls.length
  };
}

/** Full runtime catalog: deck plays + shop BUY* + session SS* actions. */
export function buildCatalog(plays: PlayCard[] = ALL_PLAYS): Map<string, PlayCard> {
  const map = new Map(plays.map(p => [p.id, p]));
  // Shop is always registered (archive assetPlays always available in menu).
  for (const p of SHOP_PLAYS) map.set(p.id, p);
  // Phase 4: session pipeline + survival plays
  for (const p of SESSION_PLAYS) map.set(p.id, p);
  return map;
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
 * "Stand for Reelection" — ported from the archive's startIncumbentRun().
 * A won_general terminal doesn't have to end the ballad: the wheel turns
 * straight into the next filing period with the same persona/issue/region,
 * carrying a discounted share of what the last term built (archive's
 * exact carry-forward formulas below) rather than resetting to zero.
 *
 * Phase 3: win-branch debt retirement runs on the *old* state first
 * (retireDebtOnWin) — self-loan clears cheap; PAC bridge leaves OB1 +
 * sessionFlags.pac_lender_claim on the carried sessionFlags/reps path.
 * Loss-path debt is applied via applyLegacy → applyLegacyDebt, not here.
 */
export function createIncumbentCampaign(old: Campaign, legacy: LegacyState): Campaign {
  // Settle the last race's notes before the wheel turns (win branch).
  const retirement = retireDebtOnWin(old.state);

  const next = createCampaign({ setup: old.setup });
  const s = next.state;
  const o = old.state;

  s.contacts = Math.max(400, Math.round((o.contacts || 0) * 0.6));
  s.nameID = Math.max(45, Math.round((o.nameID || 0) * 0.8) + 30);
  s.money = Math.max(4000, 2500 + Math.round(Math.max(0, o.money) * 0.4));
  s.endorsePts = Math.max(4, o.endorsePts || 0);
  s.ballot = true; // incumbents don't petition
  s.volPool = Math.max(4, Math.round((o.volPool || 0) * 0.6));
  s.termNumber = (o.termNumber || 1) + 1;
  s.reps = [...o.reps];
  s.incumbentRun = true;
  s.tier = 1;
  // Win path: books cleared (debt 0). PAC Session claim may persist.
  s.debt = 0;
  s.pacBridgeDebt = 0;
  s.selfLoanTaken = false;
  s.sessionFlags = { ...(o.sessionFlags || {}) };
  if (retirement.sessionClaim) {
    s.sessionFlags.pac_lender_claim = true;
    // Carry OB1 only (Session leash) — not the full free-text/obls dump.
    if (!s.obls.includes('OB1')) s.obls.push('OB1');
  }

  // Incumbency reads as a favorable seat (few serious primary challengers,
  // a friendlier general) rather than modular's `district.incumbent` flag,
  // which models the OPPOSING side being the entrenched one — setting it
  // true here would incorrectly double-penalize the player's own race.
  if (s.district) {
    s.district = { ...s.district, align: 'safe', incumbent: false, field: 1 };
    s.rivals = [{ id: 'RIV1', n: 'Rival 1' }];
  }

  // Ownership carries forward (ground game already built); physical draw
  // pile rebuilt to include it.
  s.deck = [...new Set([...(o.deck || []), ...(s.deck || [])])];
  next.deck = createDeckState(s.deck);

  applyLegacy(s, legacy);

  s.log.push({
    week: s.week,
    kind: 'note',
    text:
      'THE WHEEL TURNS — filing opens again, and this time the name on the ' +
      'incumbent line is yours. You skip the petition table and begin KNOWN: ' +
      'name recognition, a donor list, a record. That record is also a target.'
  });
  if (retirement.sessionClaim) {
    s.log.push({
      week: s.week,
      kind: 'note',
      text:
        'THE THIRD HOUSE REMEMBERS — notes retired, but OB1 (PAC String) ' +
        'rides into Session. Committee assignment and a future vote are not free.'
    });
  } else if (retirement.selfRetired > 0) {
    s.log.push({
      week: s.week,
      kind: 'note',
      text: `SELF-LOAN CLEARED — paid $${retirement.feePaid} to close the bank note. No Session leash.`
    });
  }
  next.state.lastPhase = getPhase(next.state);
  return next;
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

/**
 * General kit gravity — make Act II play different from Act I.
 * Inject GOTV spine into physical deck + pull key tools into hand when possible.
 */
export function ensureGeneralTools(campaign: Campaign): void {
  if (campaign.state.stage !== 'general') return;
  const { deck, state } = campaign;

  const inPlay = (id: string) =>
    deck.draw.includes(id) || deck.hand.includes(id) || deck.discard.includes(id);

  /** Prefer hand so the lever is usable this week, not buried in a 20-card pile. */
  const ensureInDeckAndPreferHand = (id: string): void => {
    if (!inPlay(id)) {
      injectIntoDrawPile(deck, state, [id]);
    }
    // Pull from draw/discard into hand if room (or always if missing from hand)
    if (deck.hand.includes(id)) return;
    const di = deck.draw.indexOf(id);
    if (di >= 0) {
      deck.draw.splice(di, 1);
      deck.hand.push(id);
      return;
    }
    const ci = deck.discard.indexOf(id);
    if (ci >= 0) {
      deck.discard.splice(ci, 1);
      deck.hand.push(id);
    }
  };

  const hadGotv = inPlay('PL19');
  ensureInDeckAndPreferHand('PL19');
  if (!hadGotv) {
    state.log.push({
      week: state.week,
      kind: 'note',
      text:
        'GENERAL KIT — GOTV Weekend is in your hand. Block walks and phone banks now bank turnout. Kitchen-table club math is closed for November.'
    });
  }

  // Volunteer spine for GOTV cost (vp:1)
  if ((state.volPool ?? 0) < 2 && !inPlay('PL16')) {
    injectIntoDrawPile(deck, state, ['PL16']);
    state.log.push({
      week: state.week,
      kind: 'note',
      text: 'Volunteer starve-out: Recruit Volunteers enters the deck. GOTV costs bodies.'
    });
  }

  // Flatbed doctrine — archive Rides to the Polls when A06 owned
  if (state.assets.includes('A06') && !inPlay('PL23')) {
    ensureInDeckAndPreferHand('PL23');
    state.log.push({
      week: state.week,
      kind: 'note',
      text: 'The Flatbed is gassed: Rides to the Polls available. Low-turnout turf converts hardest.'
    });
  }
}

export const CAMP_PETITION = -101;
export const CAMP_FILING_FEE = -105;
/** Camp-style shop index base: -200 - i for the i-th available BUY* play. */
export const CAMP_SHOP_BASE = -200;
/** Session play synthetic index base: -300 - i. */
export const CAMP_SESSION_BASE = -300;
/** Starmap movement verb camp index. */
export const CAMP_STARMAP_MV01 = -401;

export function listPlayableHand(campaign: Campaign): { index: number; card: PlayCard }[] {
  const out: { index: number; card: PlayCard }[] = [];
  const inHandIds = new Set<string>();

  // Phase 4: session uses always-available SS* plays, not campaign hand/shop.
  if (campaign.state.stage === 'session') {
    let i = 0;
    for (const card of SESSION_PLAYS) {
      if (isPlayable(campaign.state, card)) {
        out.push({ index: CAMP_SESSION_BASE - i, card });
        i++;
      }
    }
    return out;
  }

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
  // Phase 2: asset shop — always-available BUY* plays (archive assetPlays).
  // 0 AP; paid with $ or volunteers. Not drawn into hand.
  let shopI = 0;
  for (const [id, card] of campaign.catalog) {
    if (!id.startsWith('BUY')) continue;
    if (isPlayable(campaign.state, card)) {
      out.push({ index: CAMP_SHOP_BASE - shopI, card });
      shopI++;
    }
  }
  // Starmap pilot: MV01 as camp action when orbit open (not deck-dependent).
  if (isPilotMovementAvailable(campaign.state)) {
    const mv = campaign.catalog.get(PILOT_VERB_PLAY_ID);
    if (mv && isPlayable(campaign.state, mv)) {
      out.push({ index: CAMP_STARMAP_MV01, card: mv });
    }
  }
  return out;
}

/** Resolve a camp / shop / session synthetic index to a catalog card id, or null. */
export function campIndexToCardId(
  campaign: Campaign,
  handIndex: number
): string | null {
  if (handIndex === CAMP_PETITION) return 'PL04';
  if (handIndex === CAMP_FILING_FEE) return 'PL05';
  if (handIndex === CAMP_STARMAP_MV01) return PILOT_VERB_PLAY_ID;
  if (handIndex <= CAMP_SESSION_BASE) {
    const sessionCards = SESSION_PLAYS.filter(c => isPlayable(campaign.state, c));
    const i = CAMP_SESSION_BASE - handIndex;
    return sessionCards[i]?.id ?? null;
  }
  if (handIndex <= CAMP_SHOP_BASE) {
    const shopCards = [...campaign.catalog.entries()]
      .filter(([id, card]) => id.startsWith('BUY') && isPlayable(campaign.state, card))
      .map(([id]) => id);
    const i = CAMP_SHOP_BASE - handIndex;
    return shopCards[i] ?? null;
  }
  return null;
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
  if (campaign.state.stage === 'general') {
    ensureGeneralTools(campaign);
  }
  markWeekStart(campaign.state);

  // Phase 4: session does not grow the campaign deck (archive: capital/writs)
  if (campaign.state.stage === 'session') {
    campaign.state.log.push({
      week: campaign.state.week,
      kind: 'week',
      text: `Session week ${campaign.state.week} — the building moves at the building's pace.`
    });
    return [];
  }

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
  const campId = campIndexToCardId(campaign, handIndex);
  if (campId) {
    const card = campaign.catalog.get(campId);
    if (!card) return { ok: false, reason: `Unknown camp card ${campId}` };
    if ((campId === 'PL04' || campId === 'PL05') && campaign.state.ballot) {
      return { ok: false, reason: 'Already on ballot', cardId: campId, cardName: card.n };
    }
    if (!isPlayable(campaign.state, card)) {
      return { ok: false, reason: 'Not playable', cardId: card.id, cardName: card.n };
    }
    // Shop / camp actions are not physical hand cards — no discard.
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
  const transition = advanceCampaignWeek(campaign.state);
  // Catches week-gated reputation thresholds (e.g. R02) even on a week
  // with no plays; play-triggered thresholds are already checked in
  // executePlay. See src/engine/reputation.ts.
  repCheck(campaign.state);
  syncMovementFlags(campaign.state);
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
  let guard = campaign.state.apMax * 4 + 4;
  while (campaign.state.ap > 0 && !campaign.state.over && guard-- > 0) {
    // Resolve any pending draft before plays (auto for harness path)
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
  const summary = summarizeWeek(campaign, plays);
  const transition = endWeekInPlace(campaign);
  if (transition.kind === 'enter_general') {
    ensureGeneralTools(campaign);
    maybeOfferPhaseDraft(campaign, true);
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
