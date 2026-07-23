/**
 * Goal strip — frozen GoalStripInput + GOAL_COPY matrices (DESIGN rev 3).
 * Leaf: no main/session imports. Presentation only.
 */

import type { GameState } from '../engine/types.js';
import { stageWeek } from '../engine/state.js';
import { snapshot } from '../engine/loop.js';
import { WAITING_WEEKS } from '../engine/waiting.js';

export interface GoalStripInput {
  stage: 'primary' | 'general' | 'session' | 'waiting';
  over: boolean;
  outcome?: string;
  pendingDraft: boolean;
  week: number;
  weeksTotal: number;
  stageWeek: number;
  ap: number;
  fieldAp: number;
  ballot: boolean;
  signatures: number;
  sigNeed: number;
  contacts: number;
  nameID: number;
  totalGotv: number;
  billPipelineStage: number | null;
  billStatus: string | null;
  billHeat: number;
  speakerFreeze: number;
  districtStanding: number;
  waitingPathId: string | null;
  bankContacts: number;
  bankName: number;
  waitingWeeks: number;
  money: number;
  availableCash: number;
  shopAvailable: boolean;
  campPetitionVisible: boolean;
  campFeeVisible: boolean;
}

export type GoalCopyKey =
  | 'over'
  | 'draft'
  | 'primary_pre_ballot'
  | 'primary_pre_ballot_ap0'
  | 'primary_on_ballot'
  | 'primary_on_ballot_ap0'
  | 'general'
  | 'general_ap0'
  | 'session_unfiled'
  | 'session_pipeline'
  | 'session_calendar'
  | 'session_freeze'
  | 'session_ap0'
  | 'waiting';

export interface GoalCopyRow {
  primary: string;
  progress: string;
  next: string;
}

/** Frozen copy table — keys select rows; live numbers interpolate. */
export const GOAL_COPY: Record<GoalCopyKey, GoalCopyRow> = {
  over: {
    primary: 'Campaign over',
    progress: '{outcome}',
    next: 'Start a new run from the masthead'
  },
  draft: {
    primary: 'Phase draft',
    progress: 'Pick one card for your pool',
    next: 'Resolve draft before End Week'
  },
  primary_pre_ballot: {
    primary: 'Make the ballot by end of week 8',
    progress: '{signatures}/{sigNeed} sigs · W{stageWeek}/8',
    next: 'Petition · Filing Fee · or raise cash for the fee'
  },
  primary_pre_ballot_ap0: {
    primary: 'Make the ballot by end of week 8',
    progress: '{signatures}/{sigNeed} sigs · W{stageWeek}/8',
    next: 'Shop (0 AP) still open · or End Week'
  },
  primary_on_ballot: {
    primary: 'Survive the primary',
    progress: 'Contacts {contacts} · Name {nameID} · W{stageWeek}/8',
    next: 'Field · chairs · force · shop'
  },
  primary_on_ballot_ap0: {
    primary: 'Survive the primary',
    progress: 'Contacts {contacts} · Name {nameID} · W{stageWeek}/8',
    next: 'Shop (0 AP) still open · or End Week'
  },
  general: {
    primary: 'Win November — bank GOTV',
    progress: 'GOTV {totalGotv} · W{stageWeek}/6 · cal W{week}/{weeksTotal}',
    next: 'Field → turnout · GOTV Weekend · contrast'
  },
  general_ap0: {
    primary: 'Win November — bank GOTV',
    progress: 'GOTV {totalGotv} · W{stageWeek}/6',
    next: 'Shop if open · or End Week'
  },
  session_unfiled: {
    primary: 'File your signature bill',
    progress: 'Bill unfiled · W{week}/{weeksTotal} sine die',
    next: 'File the Bill (pipeline) · casework holds the seat'
  },
  session_pipeline: {
    primary: 'Advance the bill · hold the seat',
    progress: '{billLabel} · heat {billHeat} · W{week}/{weeksTotal}',
    next: 'One pipeline motion this week · or casework'
  },
  session_calendar: {
    primary: 'Get to the floor before sine die',
    progress: '{billLabel} · heat {billHeat}',
    next: 'Calendar / floor motions · watch Speaker freeze'
  },
  session_freeze: {
    primary: 'Leadership freeze is biting',
    progress: 'Freeze {speakerFreeze} · {billLabel}',
    next: 'Errands / favor · casework · wait out freeze'
  },
  session_ap0: {
    primary: 'End the legislative week',
    progress: '{billLabel}',
    next: 'End Week — free motions only if any remain'
  },
  waiting: {
    primary: 'Bank for the next filing',
    progress:
      'Path {path} · +{bankContacts} contacts · +{bankName} name · W{week}/{waitingWeeks}',
    next: 'One AP · WA kit · then re-file same persona'
  }
};

export function totalGotv(state: GameState): number {
  return state.groundsArr.reduce((s, g) => s + (g.gotv || 0), 0);
}

export function billStageLabelUi(bill: { pipelineStage: number; status: string }): string {
  const labels = [
    'Unfiled',
    'Filed',
    'Referred',
    'Heard',
    'Voted Out',
    'Calendar',
    'Passed House',
    'Through Senate',
    'SIGNED'
  ];
  if (bill.pipelineStage < 0) return 'Dead';
  return labels[Math.min(8, bill.pipelineStage)] ?? bill.status;
}

export function buildGoalStripInput(
  state: GameState,
  opts: {
    shopAvailable: boolean;
    campPetitionVisible: boolean;
    campFeeVisible: boolean;
  }
): GoalStripInput {
  const bank = state.sessionFlags || {};
  return {
    stage: state.stage as GoalStripInput['stage'],
    over: !!state.over,
    outcome: state.outcome,
    pendingDraft: !!(state.pendingDraft?.options?.length),
    week: state.week,
    weeksTotal: state.weeksTotal,
    stageWeek: stageWeek(state),
    ap: state.ap,
    fieldAp: state.fieldAp,
    ballot: state.ballot,
    signatures: state.signatures,
    sigNeed: state.sigNeed,
    contacts: state.contacts,
    nameID: state.nameID,
    totalGotv: totalGotv(state),
    billPipelineStage: state.bill ? state.bill.pipelineStage : null,
    billStatus: state.bill?.status ?? null,
    billHeat: state.bill?.heat ?? 0,
    speakerFreeze: Number(state.sessionFlags?.speakerFreeze || 0),
    districtStanding: state.districtStanding,
    waitingPathId: state.waitingPathId ?? null,
    bankContacts: Number(bank.waitBankContacts || 0),
    bankName: Number(bank.waitBankName || 0),
    waitingWeeks: WAITING_WEEKS,
    money: state.money,
    availableCash: snapshot(state).availableCash,
    ...opts
  };
}

function apExhausted(input: GoalStripInput): boolean {
  return input.ap <= 0 && input.fieldAp <= 0;
}

function billLabel(input: GoalStripInput): string {
  if (input.billPipelineStage === null || !input.billStatus) return 'No bill';
  return billStageLabelUi({
    pipelineStage: input.billPipelineStage,
    status: input.billStatus
  });
}

export function selectGoalKey(input: GoalStripInput): GoalCopyKey {
  if (input.over) return 'over';
  if (input.pendingDraft) return 'draft';
  if (input.stage === 'waiting') return 'waiting';
  if (input.stage === 'session') {
    if (apExhausted(input)) return 'session_ap0';
    const stage = input.billPipelineStage;
    const needsFloor = stage !== null && stage >= 5;
    if (input.speakerFreeze > 0 && needsFloor) return 'session_freeze';
    if (stage === null || stage === 0) return 'session_unfiled';
    if (stage >= 5) return 'session_calendar';
    return 'session_pipeline';
  }
  if (input.stage === 'general') {
    return apExhausted(input) ? 'general_ap0' : 'general';
  }
  // primary
  if (!input.ballot) {
    return apExhausted(input) ? 'primary_pre_ballot_ap0' : 'primary_pre_ballot';
  }
  return apExhausted(input) ? 'primary_on_ballot_ap0' : 'primary_on_ballot';
}

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : ''
  );
}

export function formatGoalStrip(input: GoalStripInput): {
  primary: string;
  progress: string;
  next: string;
  key: GoalCopyKey;
} {
  const key = selectGoalKey(input);
  const row = GOAL_COPY[key];
  const vars: Record<string, string | number> = {
    outcome: input.outcome ?? 'ended',
    signatures: input.signatures,
    sigNeed: input.sigNeed,
    stageWeek: input.stageWeek,
    contacts: input.contacts,
    nameID: input.nameID,
    totalGotv: input.totalGotv,
    week: input.week,
    weeksTotal: input.weeksTotal,
    billHeat: input.billHeat,
    billLabel: billLabel(input),
    speakerFreeze: input.speakerFreeze,
    path: input.waitingPathId ?? 'orbit',
    bankContacts: input.bankContacts,
    bankName: input.bankName,
    waitingWeeks: input.waitingWeeks
  };
  return {
    key,
    primary: fill(row.primary, vars) || '\u00a0',
    progress: fill(row.progress, vars) || '\u00a0',
    next: fill(row.next, vars) || '\u00a0'
  };
}

/** Paint `#goal-strip` three-line contract. Safe if node missing (pre-HTML). */
export function renderGoalStrip(input: GoalStripInput): void {
  const root = document.getElementById('goal-strip');
  if (!root) return;
  const { primary, progress, next, key } = formatGoalStrip(input);
  root.dataset.goalKey = key;
  // Support either bare text children or labeled rows (.goal-primary-text, etc.)
  const setLine = (sel: string, text: string) => {
    const el = root.querySelector(sel);
    if (el) el.textContent = text;
  };
  setLine('.goal-primary-text', primary);
  setLine('.goal-progress-text', progress);
  setLine('.goal-next-text', next);
  // Fallback: legacy three bare divs
  if (!root.querySelector('.goal-primary-text')) {
    const p = root.querySelector('.goal-primary');
    const g = root.querySelector('.goal-progress');
    const n = root.querySelector('.goal-next');
    if (p) p.textContent = primary;
    if (g) g.textContent = progress;
    if (n) n.textContent = next;
  }
}
