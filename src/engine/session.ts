/**
 * CANDIDATE ZERO — Legislative Session (Phase 4)
 *
 * Ported from archive/prototype-single-file.html startSession / SESSION_PLAYS /
 * sessionEnd (lines ~917–1075, weekly ticks ~1576–1585).
 *
 * After a general win the player is sworn in: committee assignment (Speaker's
 * choice), unfiled signature bill on `state.issue`, 14 compressed weeks to
 * sine die. Bill advances through a pipeline (file → referral → chair →
 * testimony → calendar → floor → senate → law). PAC lender claim (Phase 3
 * debt) gates referral. Resolve() odds bands are untouched — only card odds
 * formulas use capital/favor/heat.
 */

import { random } from './rng.js';
import { hasRep } from './reputation.js';
import { retireDebtOnWin } from './debt.js';
import type { Bill, BillStatus, CampaignOutcome, Committee, GameState } from './types.js';
import type { StageTransition } from './calendar.js';

/** Compressed session length (archive flavor: 140 days → ~14 game weeks). */
export const SESSION_WEEKS = 14;
/** Signature bill must be filed by end of this session week (archive: 6). */
export const SESSION_FILING_DEADLINE = 6;

/** Archive BILLSTAGES labels (prototype line 926). */
export const BILL_STAGE_LABELS = [
  'Unfiled',
  'Filed',
  'Referred',
  'Heard in Committee',
  'Voted Out',
  'On the Calendar',
  'Passed the House',
  'Through the Senate',
  'SIGNED INTO LAW'
] as const;

const COMMITTEES: { id: string; n: string; d: string; apply: (s: GameState) => void }[] = [
  // archive:919–924
  {
    id: 'CA',
    n: 'County Affairs',
    d: 'Unglamorous, close to home. Casework lands harder.',
    apply: s => {
      s.sessionFlags = s.sessionFlags || {};
      s.sessionFlags.caseworkBonus = true;
    }
  },
  {
    id: 'AG',
    n: 'Agriculture & Livestock',
    d: 'The FM roads approve. District starts warmer; +1 capital.',
    apply: s => {
      s.districtStanding += 4;
      s.capital += 1;
    }
  },
  {
    id: 'CR',
    n: 'Corrections',
    d: 'Grim, dutiful, respected. +2 capital from work nobody wants.',
    apply: s => {
      s.capital += 2;
    }
  },
  {
    id: 'UA',
    n: 'Urban Affairs',
    d: 'Wrong rooms for your district, right rooms for the cameras. +3 name ID.',
    apply: s => {
      s.nameID += 3;
    }
  },
  {
    id: 'EL',
    n: 'Elections',
    d: 'Procedure-dense and radioactive. +4 Parliamentarian, +3 favor.',
    apply: s => {
      s.faces.P += 4;
      s.favor += 3;
    }
  }
];

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function statusFromPipeline(stage: number): BillStatus {
  if (stage < 0) return 'dead';
  if (stage === 0) return 'draft';
  if (stage === 1) return 'filed';
  if (stage === 2 || stage === 3) return 'in_committee';
  if (stage === 4) return 'reported';
  if (stage >= 5 && stage <= 7) return 'on_calendar';
  if (stage >= 8) return 'passed';
  return 'dead';
}

export function syncBillStatus(bill: Bill): void {
  bill.status = statusFromPipeline(bill.pipelineStage);
}

export function billStageLabel(bill: Bill | null | undefined): string {
  if (!bill) return 'No bill';
  if (bill.pipelineStage < 0) return 'Dead / never filed';
  return BILL_STAGE_LABELS[Math.min(8, Math.max(0, bill.pipelineStage))] ?? 'Unknown';
}

/** Archive billOdds(base) — capital, favor, heat. Never touches resolve bands. */
export function billOdds(state: GameState, base: number): number {
  const heat = state.bill?.heat ?? 0;
  const freeze = Number(state.sessionFlags?.speakerFreeze || 0);
  return clamp(
    base +
      state.capital * 0.028 +
      (state.favor - 50) * 0.005 -
      heat * 0.05 -
      freeze * 0.04,
    0.05,
    0.9
  );
}

export function createDraftBill(state: GameState): Bill {
  const issue = state.issue ?? 'the issue';
  return {
    id: 'HB_SIG',
    title: `Signature bill — ${issue}`,
    issueId: state.issue,
    sponsor: state.persona ?? 'The Member',
    committeeId: null,
    status: 'draft',
    tally: { aye: 0, nay: 0, present: 0, need: 76 },
    pipelineStage: 0,
    heat: 0
  };
}

/**
 * Advance bill pipeline stage (archive stage++). Clamps 0–8; negative = dead.
 */
export function setBillStage(state: GameState, stage: number): void {
  if (!state.bill) return;
  const prev = state.bill.pipelineStage;
  state.bill.pipelineStage = stage;
  if (stage >= 2 && state.committee) {
    state.bill.committeeId = state.committee.id;
  }
  if (stage !== prev && stage >= 0) {
    state.bill.weeksAtStage = 0;
  }
  syncBillStatus(state.bill);
}

/**
 * Port of archive startSession() (lines 927–936), after general win.
 * Retires campaign debt (Phase 3 win branch) then opens the chamber.
 */
export function enterSession(state: GameState): { text: string } {
  const retirement = retireDebtOnWin(state);

  state.stage = 'session';
  state.over = false;
  state.outcome = 'ongoing';
  state.week = 1;
  state.weeksTotal = SESSION_WEEKS;
  state.tier = 0;
  state.ap = state.apMax;
  state.fieldAp = 0;
  state.momentum = 0;
  state.groundPlays = {};

  // Preserve PAC claim across the reset of incidental flags
  const pacClaim = !!(state.sessionFlags?.pac_lender_claim || state.obls.includes('OB1'));
  state.sessionFlags = {};
  if (pacClaim) {
    state.sessionFlags.pac_lender_claim = true;
    if (!state.obls.includes('OB1')) state.obls.push('OB1');
  }

  // archive:928–929
  state.capital = 3 + (hasRep(state, 'R06') ? 2 : 0);
  state.favor = 50 + (hasRep(state, 'R08') ? 10 : 0) + (hasRep(state, 'R09') ? -10 : 0);
  state.districtStanding = 60 + Math.min(10, Math.round((state.nameID || 0) * 0.2));

  const pick = COMMITTEES[Math.floor(random() * COMMITTEES.length)]!;
  const committee: Committee = {
    id: pick.id,
    n: pick.n,
    member: true,
    chair: false,
    standing: 40
  };
  state.committee = committee;
  pick.apply(state);

  state.bill = createDraftBill(state);
  state.bill.committeeId = null;

  if (hasRep(state, 'R12')) {
    state.sessionFlags.writ = true;
    state.log.push({
      week: state.week,
      kind: 'note',
      text: "The Old Bull's Blessing: you carry one Writ — a free procedural power, once, when it matters."
    });
  }

  if (pacClaim) {
    state.log.push({
      week: state.week,
      kind: 'note',
      text: 'The PAC String rides with you. Somewhere in this building, a vote will be asked for. (Referral is not free.)'
    });
  }

  if (retirement.sessionClaim || retirement.selfRetired > 0) {
    state.log.push({
      week: state.week,
      kind: 'note',
      text: `DEBT ON ENTRY — ${retirement.text}`
    });
  }

  const text =
    `THE SESSION — sworn in. Committee: ${committee.n} — ${pick.d} ` +
    `(The Speaker's choice, not yours.) Signature bill on ${state.issue ?? 'your issue'} is unfiled. ` +
    `Filing deadline: week ${SESSION_FILING_DEADLINE}. Sine die: week ${SESSION_WEEKS}.`;
  state.log.push({ week: state.week, kind: 'week', text });
  return { text };
}

/**
 * Called from resolveGeneralConclusion on a win — enters session instead of
 * ending the run at the general.
 */
export function enterSessionFromGeneral(
  state: GameState,
  winP: number,
  roll: number
): StageTransition {
  const genText =
    `GENERAL WIN (p≈${(winP * 100).toFixed(0)}%, roll ${(roll * 100).toFixed(0)}%). ` +
    `The district is yours.`;
  state.log.push({ week: state.week, kind: 'note', text: genText });
  const { text } = enterSession(state);
  return {
    kind: 'enter_session',
    text: genText + ' ' + text,
    winP,
    roll
  };
}

/**
 * PAC claim bite on referral (Phase 3 hook). Returns flavor + whether claim
 * was discharged. Call from SS02 Seek Referral before/after roll.
 *
 * - If claim held: auto-pay district standing for discharge (string pulls),
 *   or player already played SS_PAC_CLAIM. If still held at referral success,
 *   heat +1 and claim remains until paid.
 */
export function applyPacClaimOnReferral(state: GameState): string {
  if (!state.sessionFlags?.pac_lender_claim && !state.obls.includes('OB1')) {
    return '';
  }
  if (state.sessionFlags?.pac_claim_paid) return '';

  // Default: the association extracts their aye as the price of motion
  // (archive OB1 event: vote their way, district −6, discharge OB1).
  state.districtStanding = clamp(state.districtStanding - 6, 0, 100);
  state.obls = state.obls.filter(x => x !== 'OB1');
  state.sessionFlags = state.sessionFlags || {};
  state.sessionFlags.pac_lender_claim = false;
  state.sessionFlags.pac_claim_paid = true;
  return (
    ' THE STRING PULLS — the association behind your PAC money extracts an aye on a quiet vote. ' +
    'District standing −6. (OB1 discharged; referral may proceed.)'
  );
}

/** Explicit refuse path (SS_PAC_REFUSE) — keep claim, take heat. */
export function refusePacClaim(state: GameState): string {
  state.sessionFlags = state.sessionFlags || {};
  state.exposure += 2;
  state.hitPieces += 1;
  if (state.bill) state.bill.heat += 2;
  state.sessionFlags.pac_claim_refused = true;
  // Claim still held — referral odds suffer via heat
  return (
    'Refused. Their newsletter names you an ingrate; their next check names your challenger. ' +
    '(Exposure +2, hit piece, bill heat +2. OB1 still rides.)'
  );
}

/**
 * Port of archive sessionEnd (1057–1074) — governor desk, reelection roll.
 * Session teeth: challenger heat and leadership freeze bite the reelect roll.
 */
export function resolveSineDie(state: GameState): StageTransition {
  if (state.stage !== 'session') {
    return { kind: 'none', text: '' };
  }

  // Governor desk if through senate (stage 7)
  if (state.bill && state.bill.pipelineStage === 7) {
    const freeze = Number(state.sessionFlags?.speakerFreeze || 0);
    const vetoP =
      0.22 + (state.favor < 40 ? 0.12 : 0) + (freeze > 0 ? 0.08 : 0) + (state.bill.heat || 0) * 0.02;
    if (random() < clamp(vetoP, 0.1, 0.55)) {
      state.bill.pipelineStage = -1;
      syncBillStatus(state.bill);
      state.bill.status = 'failed';
      state.log.push({
        week: state.week,
        kind: 'note',
        text: 'THE GOVERNOR\'S DESK — VETOED. A statement citing "unintended consequences."'
      });
    } else {
      setBillStage(state, 8);
      state.log.push({
        week: state.week,
        kind: 'note',
        text: "THE GOVERNOR'S DESK — SIGNED. A pen you will frame. Law, with your name inside it."
      });
    }
  }

  const stage = state.bill?.pipelineStage ?? -1;
  const passed = stage >= 8;
  const nearMiss = stage >= 6 && stage < 8;

  let text = 'SINE DIE. The gavel falls. ';
  if (passed) {
    text +=
      'Your bill is law. A freshman author with a signed bill — the building will remember your name next session.';
  } else if (nearMiss) {
    text +=
      'Your bill died between the chambers — agonizingly close. Half the building considers that a rookie triumph anyway.';
  } else if (stage >= 4) {
    text +=
      'Your bill died in the calendar crush with hundreds of better-connected corpses. No shame in the pile, no law either.';
  } else if (stage < 0) {
    text += 'Your signature bill never truly left the ground — or died on a veto.';
  } else {
    text += 'Your bill never truly left the ground. The first session teaches; it rarely gives.';
  }

  const challenger = Number(state.sessionFlags?.challengerHeat || 0);
  const freeze = Number(state.sessionFlags?.speakerFreeze || 0);
  const standing =
    state.districtStanding +
    (passed ? 15 : nearMiss ? 8 : 0) +
    Math.min(10, state.capital) -
    challenger * 3 -
    freeze * 1.5;
  // Floor so a non-collapse session can still hold the seat; chaos remains.
  const reelect = clamp(22 + standing * 0.55 + (random() - 0.5) * 22, 5, 95);
  text += ` Interim verdict — district ${Math.round(state.districtStanding)}, capital ${state.capital}, favor ${Math.round(state.favor)}`;
  if (challenger > 0) text += `, challenger heat ${challenger}`;
  if (freeze > 0) text += `, fifth-floor freeze ${freeze}`;
  text += `. Reelection outlook ${reelect.toFixed(0)}%… `;

  let outcome: CampaignOutcome;
  if (reelect > 50) {
    text += passed
      ? 'and holds. The seat is yours again — with a law under your name.'
      : 'and holds. The seat is yours again.';
    outcome = passed ? 'session_law' : 'session_survived';
  } else {
    text +=
      'and breaks. A primary challenger — younger, angrier, funded — takes the seat you bled for.';
    outcome = 'session_primaried';
  }

  state.over = true;
  state.outcome = outcome;
  state.log.push({ week: state.week, kind: 'note', text });
  return { kind: outcome as StageTransition['kind'], text, winP: reelect / 100 };
}

/**
 * Stall heat: bill sitting at the same stage burns political oxygen.
 */
export function applyBillStallHeat(state: GameState): string {
  if (!state.bill || state.bill.pipelineStage < 1 || state.bill.pipelineStage >= 8) {
    return '';
  }
  const weeks = (state.bill.weeksAtStage ?? 0) + 1;
  state.bill.weeksAtStage = weeks;
  if (weeks < 2) return '';
  state.bill.heat += 1;
  return `STALL HEAT — bill sits at stage ${state.bill.pipelineStage} for ${weeks} weeks. Heat +1 (now ${state.bill.heat}). Move it or bleed.`;
}

/**
 * Call when pipeline stage advances — resets stall clock.
 */
export function noteBillStageAdvance(state: GameState): void {
  if (state.bill) state.bill.weeksAtStage = 0;
}

/**
 * Weekly chamber pressure (Session teeth). One bite, not a second game.
 * Returns log lines applied.
 */
export function tickSessionPressure(state: GameState): string[] {
  const lines: string[] = [];
  state.sessionFlags = state.sessionFlags || {};

  // --- District: casework or bleed (teeth) ---
  const didCasework = !!state.sessionFlags.caseworkThisWeek;
  const drain = didCasework ? 1 : 2;
  state.districtStanding = clamp(state.districtStanding - drain, 0, 100);
  if (!didCasework) {
    lines.push(
      'HOME FIRES — no casework this week. District standing −2. The seat is kept at home, not only in Austin.'
    );
  }
  state.sessionFlags.caseworkThisWeek = false;

  // --- Stall heat ---
  const stall = applyBillStallHeat(state);
  if (stall) lines.push(stall);

  // --- Challenger heat when standing soft ---
  if (state.districtStanding < 52) {
    const ch = Number(state.sessionFlags.challengerHeat || 0) + 1;
    state.sessionFlags.challengerHeat = ch;
    lines.push(
      `CHALLENGER WATCH — standing ${Math.round(state.districtStanding)}. A younger name is fundraising (heat ${ch}). Casework is not optional.`
    );
  }

  // --- Leadership freeze when favor low and bill is real ---
  const stage = state.bill?.pipelineStage ?? 0;
  if (state.favor < 38 && stage >= 4) {
    const fz = Number(state.sessionFlags.speakerFreeze || 0) + 1;
    state.sessionFlags.speakerFreeze = fz;
    if (state.bill) state.bill.heat += 1;
    lines.push(
      `FIFTH FLOOR FREEZE — favor ${Math.round(state.favor)}. Calendar motions tighten; bill heat +1. Run an errand or trade before the crush.`
    );
  } else if (state.favor >= 45 && Number(state.sessionFlags.speakerFreeze || 0) > 0) {
    // Thaw one point if you recovered favor
    state.sessionFlags.speakerFreeze = Math.max(0, Number(state.sessionFlags.speakerFreeze) - 1);
  }

  // --- Random chamber event (~45% of weeks after W1) ---
  if (state.week > 1 && random() < 0.45) {
    const roll = random();
    if (roll < 0.2) {
      state.favor = clamp(state.favor - 3, 0, 100);
      if (state.bill && state.bill.pipelineStage >= 1) state.bill.heat += 1;
      lines.push(
        'LOBBY STACK — association dinners and "helpful" amendments. Favor −3' +
          (state.bill && state.bill.pipelineStage >= 1 ? '; bill heat +1.' : '.')
      );
    } else if (roll < 0.38) {
      state.districtStanding = clamp(state.districtStanding - 2, 0, 100);
      lines.push(
        'DISTRICT EMERGENCY — a plant layoff / flood / viral clip back home. Standing −2. Casework is the only apology that works.'
      );
    } else if (roll < 0.55) {
      state.sessionFlags.errandDemand = true;
      lines.push(
        "SPEAKER'S MARK — leadership has a small unpleasant errand. Take The Speaker's Errand this week for favor, or the freeze deepens later."
      );
    } else if (roll < 0.68 && state.sessionFlags.pac_lender_claim && !state.sessionFlags.pac_claim_paid) {
      state.districtStanding = clamp(state.districtStanding - 2, 0, 100);
      state.exposure = (state.exposure || 0) + 1;
      lines.push(
        'PAC REMINDER — the association still holds your string. Standing −2, exposure +1 until referral pays or you refuse publicly.'
      );
    } else if (roll < 0.82) {
      state.hitPieces += 1;
      state.favor = clamp(state.favor - 2, 0, 100);
      lines.push(
        'CAPITOL PRESS — a hit piece on freshman ambition. Hit piece +1, favor −2. Quiet competence is a strategy; so is casework.'
      );
    } else {
      state.capital += 1;
      lines.push(
        'GALLERY NOD — an old bull tips two fingers after a rules point. Capital +1. The building is not only teeth.'
      );
    }
  }

  return lines;
}

/**
 * Session week advance housekeeping + Session teeth pressure.
 */
export function onSessionWeekAdvance(state: GameState): void {
  state.sessionFlags = state.sessionFlags || {};
  state.sessionFlags.pipelineUsed = false;

  // Pressure ticks (district drain, stall, challenger, events)
  const lines = tickSessionPressure(state);
  for (const text of lines) {
    state.log.push({ week: state.week, kind: 'note', text });
  }

  // Filing deadline: unfiled signature bill dies (archive 1581)
  if (
    state.week === SESSION_FILING_DEADLINE &&
    state.bill &&
    state.bill.pipelineStage === 0
  ) {
    state.bill.pipelineStage = -1;
    state.bill.status = 'dead';
    state.log.push({
      week: state.week,
      kind: 'note',
      text:
        'FILING DEADLINE PASSES — your signature bill was never filed. The session will now be about survival and next time.'
    });
  }
}

/** Leadership freeze blocks calendar/floor pipeline until favor recovers or errand. */
export function sessionPipelineBlocked(state: GameState, cardId: string): boolean {
  if (state.stage !== 'session') return false;
  const freeze = Number(state.sessionFlags?.speakerFreeze || 0);
  if (freeze < 1) return false;
  // Calendar + floor need fifth-floor oxygen
  if (cardId === 'SS05' || cardId === 'SS06') {
    return state.favor < 40;
  }
  return false;
}

export function isSessionPipelinePlay(cardId: string): boolean {
  return (
    cardId === 'SS02' ||
    cardId === 'SS03' ||
    cardId === 'SS04' ||
    cardId === 'SS05' ||
    cardId === 'SS06' ||
    cardId === 'SS07'
  );
}
