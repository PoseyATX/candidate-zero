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
import { statuteBookLine } from './laws.js';
import { tickOutsideDeck } from './outside.js';
import {
  seedIssueOpening,
  tickDocket,
  openingAnnounce,
  provisionHeat,
  provisionSwing,
  deliveryStanding,
  seedLawOpenings,
  lawWasDefended
} from './docket.js';
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

/**
 * Bill heat had thirteen writers and one reducer — a conditional gift card that
 * shaves a single point. Nothing else in the game ever cooled a bill, while
 * three separate weekly sources each added +1 across a 14-week session, and
 * `billOdds` charges 5 points per point of heat against a 0.9 ceiling.
 *
 * Measured on the real full-campaign path (n=800): median final bill heat 18.
 * That is −90 points of advance odds and a veto roll pinned to its 0.55 cap, by
 * mid-session, regardless of how well the bill was played. The pipeline was not
 * hard; it was closed. That — not the week gates — is why `session_law` sat at
 * ~22% no matter what strategy drove it.
 *
 * So: one writer, and a ceiling. Measured separately, though, the ceiling is NOT
 * what fixed this — cap alone moved law 23.8% → 27.0% (n=252 sessions, SE ≈3pp,
 * so barely more than noise). COOL_ON_ADVANCE below is the lever that did the
 * work. The cap earns its place as a guardrail on the pathological tail, not as
 * the fix; do not credit it with more than that.
 */
export const MAX_BILL_HEAT = 12;

/**
 * A bill that MOVES is not a bill that is stuck. "This thing is stalled" is the
 * complaint heat models, and it evaporates the week the bill clears a stage —
 * so advancing sheds heat instead of carrying the whole session's grievance
 * forward forever. This is also DEFERRED A4 ("heat persists across stage
 * transitions; nobody decided this, it fell out of one writer"): nobody decided
 * it, and now somebody has.
 *
 * Tuned by sweep, on the full-campaign path (n=800 runs / 252 sessions each):
 *
 *   cool=0  law 27.0%  median heat 12   (pipeline still effectively closed)
 *   cool=1  law 49.6%  median heat  6   ← chosen
 *   cool=2  law 55.6%  median heat  3
 *   cool=3  law 58.7%  median heat  1   (heat stops being a mechanic at all)
 *
 * 1 is the value where heat still HURTS — a median of 6 is −30 points of advance
 * odds and +12 on the veto roll — while leaving a well-played bill somewhere near
 * a coin flip. At 3 the number looks best and the system is dead; passing a law
 * should be an achievement, not a formality.
 */
export const COOL_ON_ADVANCE = 1;

/** The only way heat goes up. Clamped, so no caller can reopen the ratchet. */
export function addBillHeat(state: GameState, n: number): number {
  if (!state.bill) return 0;
  const before = state.bill.heat ?? 0;
  state.bill.heat = clamp(before + n, 0, MAX_BILL_HEAT);
  return state.bill.heat - before;
}

/** The only way heat comes down. Never below zero. */
export function coolBill(state: GameState, n: number): number {
  if (!state.bill) return 0;
  const before = state.bill.heat ?? 0;
  state.bill.heat = clamp(before - n, 0, MAX_BILL_HEAT);
  return before - state.bill.heat;
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
    // Forward progress cools the bill; going backwards does not reward you.
    if (stage > prev) coolBill(state, COOL_ON_ADVANCE);
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
  // Your issue guarantees you one hearing. The world supplies the rest, or does
  // not — but a member who ran on water is never left with an empty docket and
  // no way to put language in their own bill.
  state.docket = [];

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

  // The hearing your issue guarantees you. Announced, because an opening nobody
  // is told about is the same as no opening — that was the whole failure of the
  // outside deck before the docket existed.
  const first = seedIssueOpening(state);
  if (first) {
    state.log.push({ week: state.week, kind: 'note', text: openingAnnounce(first) });
  }
  // Statutes you already passed, coming up for air. A career creates its own
  // opposition: the fights you walk into this session are the ones you won last.
  const book = statuteBookLine(state);
  if (book) state.log.push({ week: state.week, kind: 'note', text: book });
  for (const o of seedLawOpenings(state)) {
    state.log.push({ week: state.week, kind: 'note', text: openingAnnounce(o) });
  }
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
  addBillHeat(state, 2);
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
    // Controversy at the desk = what the bill SAYS (provisions) plus what it
    // cost in time (heat). A clean shell sails; a bill carrying the quarantine
    // indemnity, the curtailment authority and a rural carve-out arrives with
    // three organised enemies who all have the Governor's number.
    const controversy = provisionHeat(state);
    // A margin is a shield. Nobody vetoes a bill that came off the floor 120-25 —
    // the override math is right there in the vote count, and everyone in the
    // building can do it. So language cuts BOTH ways at the desk: what the bill
    // says makes the Governor angrier, and how many members signed onto it makes
    // him careful. Without this second half, amending was strictly a tax.
    const margin = Math.max(0, provisionSwing(state));
    const vetoP =
      0.22 +
      (state.favor < 40 ? 0.12 : 0) +
      (freeze > 0 ? 0.08 : 0) +
      (state.bill.heat || 0) * 0.02 +
      controversy * 0.025 -
      Math.min(0.18, margin * 0.007);
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
  // What you actually delivered. See deliveryStanding() — language in the bill
  // is the only thing in this game a voter can point at.
  const delivered = deliveryStanding(state, passed);
  const standing =
    state.districtStanding +
    (passed ? 15 : nearMiss ? 8 : 0) +
    Math.min(10, state.capital) +
    delivered -
    challenger * 3 -
    freeze * 1.5;
  // Floor so a non-collapse session can still hold the seat; chaos remains.
  //
  // challengerHeat and the fifth-floor freeze used to be *printed* in this
  // verdict and then ignored by the arithmetic — the game told you a younger,
  // funded name was circling and it changed nothing. Session was consequently
  // inert: 83% of members simply "survived", and the primaried-out fail state
  // fired 2% of the time. Both now bite, so neglecting casework or burning your
  // leadership favor actually costs the seat.
  const challengerBite = Math.min(24, challenger * 3.5);
  const freezeBite = Math.min(12, freeze * 3);
  const reelect = clamp(
    22 + standing * 0.55 - challengerBite - freezeBite + (random() - 0.5) * 22,
    5,
    95
  );
  text += ` Interim verdict — district ${Math.round(state.districtStanding)}, capital ${state.capital}, favor ${Math.round(state.favor)}`;
  if (delivered > 0) {
    const n = state.bill?.provisions?.length ?? 0;
    text += `, ${n} thing${n === 1 ? '' : 's'} delivered for home (+${Math.round(delivered)})`;
  }
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
 * Calendars does not meet until week 9 — SS05 ("the narrowest door") is gated on
 * it. Exported so the gate lives in one place: the card's `show` reads it too,
 * and stall heat below must know about it.
 */
/**
 * When Calendars convenes.
 *
 * MEASURED, not guessed. Bills arrive at stage 4 ("voted out, waiting on
 * Calendars") at median week 7, and this gate stood at 9 — so a bill that had
 * done everything right sat two weeks in front of a door that did not exist
 * yet, then faced the narrowest odds in the pipeline with the clock already
 * spent. Across 161 runs that reached stage 4, **531 weeks** were lost to this
 * gate alone; the Speaker freeze, which the design notes called a co-equal
 * lock, cost 9. It was never the freeze.
 *
 * Moving it to 7 aligns the door with when bills actually get there. It buys
 * back structural waste rather than making the roll kinder: SS05's odds are
 * untouched, so the narrowest door is still the narrowest door — you simply
 * get to knock on it.
 */
export const CALENDAR_OPENS_WEEK = 7;

/** Stage 4 is "reported out, waiting on Calendars". */
const CALENDAR_WAIT_STAGE = 4;

/**
 * THE SESSION CALENDAR, in one place: the stage the bill is sitting at, and the
 * earliest week the motion out of it can be attempted.
 *
 * It was scattered across six card `show` gates as 2 / 4 / 6 / 9 / 11 / 13, and
 * the back half was the whole problem. Measured funnel before this (186
 * sessions): 33% of bills died sitting at stage 6 waiting for week 13, and of
 * the 62 that did reach the Governor, 35.5% were VETOED with a median bill heat
 * of 10 — worth +20 points on a veto roll that starts at 22%. The heat was
 * accrued almost entirely while waiting for gates the player could not
 * influence.
 *
 * Two weeks per stage, ending at 11, leaves three weeks to clear the Senate and
 * the desk. The odds on every motion are untouched; this is the schedule, not
 * the difficulty.
 */
export const STAGE_OPENS: Record<number, number> = {
  1: 2,   // Filed        -> Seek Referral   (SS02)
  2: 4,   // Referred     -> Court the Chair (SS03)
  3: 6,   // In committee -> Testimony       (SS04)
  4: 7,   // Voted out    -> Calendars       (SS05)
  5: 9,   // On calendar  -> Floor Fight     (SS06)
  6: 11   // Passed House -> Work the Senate (SS07)
};

/**
 * True when the bill physically cannot move: it is sitting at a stage whose
 * door has not opened yet.
 *
 * Generalised from a Calendars-only check. The original exempted stall heat for
 * the stage-4 wait and nothing else, so a bill cleared Calendars and then sat
 * at stages 5 and 6 accruing the exact penalty the exemption existed to
 * prevent. Punishing a stall the player chose is the mechanic working;
 * punishing one the calendar imposed is not — at ANY stage.
 */
export function billBlockedByRules(state: GameState): boolean {
  const stage = state.bill?.pipelineStage ?? -1;
  const opens = STAGE_OPENS[stage];
  return !!state.bill && opens !== undefined && state.week < opens;
}

/** Back-compat alias — the stage-4 case of billBlockedByRules. */
export function billBlockedByCalendar(state: GameState): boolean {
  return (
    !!state.bill &&
    state.bill.pipelineStage === CALENDAR_WAIT_STAGE &&
    state.week < CALENDAR_OPENS_WEEK
  );
}

/**
 * Stall heat: bill sitting at the same stage burns political oxygen.
 *
 * Except when the rules are what pinned it. SS05 cannot be attempted before
 * week 9, so a bill reported out in week 5 sat four weeks it had no way to
 * avoid — and billOdds charges 5% per point of heat, so the game handed you a
 * penalty for obeying it. Reaching "the narrowest door" at ~10% instead of its
 * 30% base is why a deliberate bill-driving policy passed a law 4.1% of the
 * time (4 of 97 sessions measured; 41 of those died sitting at this exact
 * stage). Punishing a stall the player chose is the mechanic working; punishing
 * one the calendar imposed is not.
 */
export function applyBillStallHeat(state: GameState): string {
  if (!state.bill || state.bill.pipelineStage < 1 || state.bill.pipelineStage >= 8) {
    return '';
  }
  // The clock runs whether or not heat is charged: the counter is "how long has
  // this sat", and a rules-imposed wait is still time passing. Incrementing
  // BEFORE the exemption keeps that true — the first version returned early and
  // silently froze the counter, which harness:session caught.
  const weeks = (state.bill.weeksAtStage ?? 0) + 1;
  state.bill.weeksAtStage = weeks;
  if (billBlockedByRules(state)) {
    // No heat: the player could not have moved it, whatever they did.
    return '';
  }
  if (weeks < 2) return '';
  addBillHeat(state, 1);
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

  // --- Windows that shut this week ---
  for (const l of tickDocket(state)) lines.push(l);

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
    addBillHeat(state, 1);
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
      if (state.bill && state.bill.pipelineStage >= 1) addBillHeat(state, 1);
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
 * Session week advance housekeeping + Session teeth pressure + Outside deck.
 */
export function onSessionWeekAdvance(state: GameState): void {
  state.sessionFlags = state.sessionFlags || {};
  state.sessionFlags.pipelineUsed = false;
  state.sessionFlags.pipelineMotions = 0;

  // Pressure ticks (district drain, stall, challenger, events)
  const lines = tickSessionPressure(state);
  for (const text of lines) {
    state.log.push({ week: state.week, kind: 'note', text });
  }

  // Outside weather during session (special session, challenger ads, …)
  tickOutsideDeck(state);

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
/**
 * AP price of forcing a SECOND pipeline motion in one week.
 *
 * MEASURED. Opening Calendars two weeks earlier cut wasted stage-4 weeks from
 * 531 to 61 and barely moved the clear rate (62% -> 59%) — so the wait was
 * never the binding constraint. One motion per week is. A session is 14 weeks
 * and the bill needs SEVEN successful motions, while the same weeks are being
 * spent on casework (or the seat goes) and errands (or Calendars freezes you
 * out). The bill loses that argument almost every time.
 *
 * This does not relax the rule so much as put a price on it: a second motion
 * needs 3 AP still in hand, which means a week where you did nothing else. It
 * is a trade the player makes, not a difficulty dial I turned down — the odds
 * on every pipeline card are untouched.
 */
export const SECOND_MOTION_AP = 3;

/** Pipeline motions already spent this week. */
export function pipelineMotions(state: GameState): number {
  const v = state.sessionFlags?.pipelineMotions;
  if (typeof v === 'number') return v;
  // Back-compat with saves written while this was a boolean.
  return state.sessionFlags?.pipelineUsed ? 1 : 0;
}

/**
 * Can the bill move this week? First motion is free; a second costs a week
 * you spent on nothing else. Never a third.
 */
export function pipelineMotionAvailable(state: GameState): boolean {
  const used = pipelineMotions(state);
  if (used === 0) return true;
  if (used === 1) return (state.ap ?? 0) >= SECOND_MOTION_AP;
  return false;
}

/** Record a motion. Called by every pipeline card's run(). */
export function notePipelineMotion(state: GameState): void {
  state.sessionFlags = state.sessionFlags || {};
  state.sessionFlags.pipelineMotions = pipelineMotions(state) + 1;
  // Kept in step so anything still reading the old flag stays correct.
  state.sessionFlags.pipelineUsed = true;
}

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
