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
  enforceWeeklyDraw
} from './deck.js';
import { executePlay, isPlayable } from './play.js';
import { createNewState, getPhase } from './state.js';
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
}

export interface WeekReport {
  week: number;
  phase: 1 | 2 | 3;
  drawn: string[];
  plays: PlayOutcome[];
  endLedger: LedgerSnapshot;
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

export function createCampaign(overrides: Partial<GameState> = {}): Campaign {
  // Seed first so deck shuffle and weekly draws share the stream.
  const state = createNewState({
    money: 200,
    volPool: 1,
    ...overrides
  });
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
    filingDeadline: 8
  };
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

export function endWeekInPlace(campaign: Campaign): void {
  discardHand(campaign.deck);
  const s = campaign.state;
  s.week += 1;
  s.ap = s.apMax;
  s.momentum = Math.max(0, s.momentum - 1);
  s.townHallThisWeek = false;
  s.log.push({
    week: s.week,
    kind: 'week',
    text: `Week ${s.week} begins (phase ${getPhase(s)}). AP refreshed.`
  });
}

export function runWeek(campaign: Campaign, choose: Chooser): WeekReport {
  const weekAtStart = campaign.state.week;
  const phaseAtStart = getPhase(campaign.state);
  const drawn = startWeek(campaign);
  const plays: PlayOutcome[] = [];
  let guard = campaign.state.apMax * 4 + 4;
  while (campaign.state.ap > 0 && guard-- > 0) {
    const playable = listPlayableHand(campaign);
    if (playable.length === 0) break;
    const handIndex = choose(playable, campaign.state);
    if (handIndex === null || handIndex === undefined) break;
    const outcome = playFromHand(campaign, handIndex);
    plays.push(outcome);
    if (!outcome.ok) break;
  }
  endWeekInPlace(campaign);
  return {
    week: weekAtStart,
    phase: phaseAtStart,
    drawn,
    plays,
    endLedger: snapshot(campaign.state)
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
