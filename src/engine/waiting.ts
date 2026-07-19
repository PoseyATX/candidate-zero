/**
 * Waiting season — compressed interim play between cycles.
 * No true game over: loss/session end redirects into a playable orbit.
 */

import type { GameState, LegacyState } from './types.js';
import type { StageTransition } from './calendar.js';
import { PATH_TO_WAITING_LOOP } from './legacy.js';

/** Compressed "two years" as game weeks. */
export const WAITING_WEEKS = 4;

export function enterWaiting(
  state: GameState,
  pathId: string
): { text: string } {
  const loopId = PATH_TO_WAITING_LOOP[pathId] ?? 'LOOP_WAITING_PERENNIAL';
  state.stage = 'waiting';
  state.over = false;
  // Keep outcome as the campaign result that led here
  state.week = 1;
  state.weeksTotal = WAITING_WEEKS;
  state.apMax = 1;
  state.ap = 1;
  state.fieldAp = 0;
  state.waitingPathId = pathId;
  state.waitingLoopId = loopId;
  state.waitingWeeksLeft = WAITING_WEEKS;
  state.sessionFlags = state.sessionFlags || {};
  state.sessionFlags.waitingSeason = true;
  state.entityHistory = state.entityHistory ?? [];
  const tag = `WAIT:${loopId}`;
  if (!state.entityHistory.includes(tag)) state.entityHistory.push(tag);

  const labels: Record<string, string> = {
    perennial: 'the trail that never cools',
    advocate: 'the organization that outlived the candidacy',
    staffer: 'the badge and the bag',
    home: 'the fence and Friday lights',
    exmember: 'the title without the vote',
    senate: 'Senate exploratory quiet work',
    statewide: 'statewide exploratory quiet work'
  };
  const label = labels[pathId] ?? pathId;
  const text =
    `WAITING SEASON — ${WAITING_WEEKS} compressed weeks as ${label}. ` +
    `One action a week. What you bank rides into the next filing. ` +
    `(Starmap: ${loopId})`;
  state.log.push({ week: 1, kind: 'week', text });
  return { text };
}

/**
 * Higher-office exploratory (thin fork after strong Session).
 * Treated as a waiting path with extra carry flag.
 */
export function enterHigherOfficeWaiting(
  state: GameState,
  fork: 'senate' | 'statewide'
): { text: string } {
  state.sessionFlags = state.sessionFlags || {};
  state.sessionFlags.higherOfficeFork = fork === 'senate' ? 1 : 2;
  enterWaiting(state, fork);
  const t =
    `HIGHER OFFICE — ${fork === 'senate' ? 'Senate' : 'Statewide'} exploratory. ` +
    `Quiet work between cycles. ${WAITING_WEEKS} weeks to test the waters.`;
  state.log.push({ week: 1, kind: 'note', text: t });
  return { text: t };
}

export function isWaitingStage(state: GameState): boolean {
  return state.stage === 'waiting';
}

/** Bank waiting yields into legacy carry, then close the season. */
export function finishWaiting(state: GameState, legacy: LegacyState): StageTransition {
  if (state.stage !== 'waiting') {
    return { kind: 'none', text: '' };
  }

  // Snapshot gains relative to... we bank absolute "extra" held in sessionFlags
  const bankContacts = Number(state.sessionFlags?.waitBankContacts || 0);
  const bankName = Number(state.sessionFlags?.waitBankName || 0);
  const bankMoney = Number(state.sessionFlags?.waitBankMoney || 0);
  const bankVols = Number(state.sessionFlags?.waitBankVols || 0);
  const bankFavors = Number(state.sessionFlags?.waitBankFavors || 0);

  legacy.carry = {
    ...legacy.carry,
    waitingLoopId: state.waitingLoopId,
    waitingContacts: (legacy.carry.waitingContacts || 0) + bankContacts,
    waitingNameID: (legacy.carry.waitingNameID || 0) + bankName,
    waitingMoney: (legacy.carry.waitingMoney || 0) + bankMoney,
    waitingVols: (legacy.carry.waitingVols || 0) + bankVols,
    waitingFavors: (legacy.carry.waitingFavors || 0) + bankFavors
  };

  if (state.waitingPathId === 'senate' || state.sessionFlags?.higherOfficeFork === 1) {
    legacy.carry.higherOfficeFork = 'senate';
  } else if (state.waitingPathId === 'statewide' || state.sessionFlags?.higherOfficeFork === 2) {
    legacy.carry.higherOfficeFork = 'statewide';
  }

  const text =
    `WAITING ENDS — banked for next filing: ` +
    `+${bankContacts} contacts, +${bankName} name, +$${bankMoney}, +${bankVols} vols, +${bankFavors} favors. ` +
    `The climb continues.`;
  state.over = true;
  state.log.push({ week: state.week, kind: 'note', text });
  return { kind: 'none', text };
}

export function onWaitingWeekAdvance(state: GameState): void {
  // Soft decay of momentum; debt still exists but no campaign rival ground
  state.momentum = Math.max(0, state.momentum - 1);
}

/** Add to waiting bank counters (called from WA* plays). */
export function bankWaiting(
  state: GameState,
  amt: {
    contacts?: number;
    nameID?: number;
    money?: number;
    vol?: number;
    favors?: number;
  }
): void {
  state.sessionFlags = state.sessionFlags || {};
  if (amt.contacts) {
    state.contacts += amt.contacts;
    state.sessionFlags.waitBankContacts =
      Number(state.sessionFlags.waitBankContacts || 0) + amt.contacts;
  }
  if (amt.nameID) {
    state.nameID += amt.nameID;
    state.sessionFlags.waitBankName =
      Number(state.sessionFlags.waitBankName || 0) + amt.nameID;
  }
  if (amt.money) {
    state.money += amt.money;
    state.sessionFlags.waitBankMoney =
      Number(state.sessionFlags.waitBankMoney || 0) + amt.money;
  }
  if (amt.vol) {
    state.volPool += amt.vol;
    state.sessionFlags.waitBankVols =
      Number(state.sessionFlags.waitBankVols || 0) + amt.vol;
  }
  if (amt.favors) {
    state.favors += amt.favors;
    state.sessionFlags.waitBankFavors =
      Number(state.sessionFlags.waitBankFavors || 0) + amt.favors;
  }
}
