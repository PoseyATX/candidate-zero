/**
 * Session pipeline + survival plays — port of archive SESSION_PLAYS
 * (prototype-single-file.html ~940–1003 core path + casework/errand/whip).
 *
 * All show-gated on stage==='session'. Pipeline plays (SS02–SS07) are one
 * per week (sessionFlags.pipelineUsed), matching archive pace.
 */

import type { PlayCard } from '../engine/types.js';
import {
  applyPacClaimOnReferral,
  billOdds,
  refusePacClaim,
  sessionPipelineBlocked,
  setBillStage
} from '../engine/session.js';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** archive SS01 */
export const SS01_FileBill: PlayCard = {
  id: 'SS01',
  n: 'File the Bill',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'H.B. ____',
  attrs: ['INK'],
  d: 'Your name, your issue, a number. It exists now, which is more than most ideas get.',
  show: s => s.stage === 'session' && !!s.bill && s.bill.pipelineStage === 0,
  odds: () => 0.95,
  run: s => {
    setBillStage(s, 1);
    if (s.bill) s.bill.filedWeek = s.week;
    return `H.B. filed on ${s.issue ?? 'your issue'}. The clerk stamps it without looking up. Referral is the Speaker's to give.`;
  }
};

/** archive SS02 — PAC claim bites here (Phase 3 hook) */
export const SS02_SeekReferral: PlayCard = {
  id: 'SS02',
  n: 'Seek Referral',
  cost: { a: 1 },
  risk: 'STD',
  ph: [1, 2, 3],
  tag: "the Speaker's desk",
  attrs: ['DIP'],
  d: "Bills go where the Speaker sends them. (Opens wk 2.) If the PAC holds a claim, they collect before the desk moves.",
  show: s =>
    s.stage === 'session' &&
    !!s.bill &&
    s.bill.pipelineStage === 1 &&
    s.week >= 2 &&
    !s.sessionFlags?.pipelineUsed,
  odds: s => billOdds(s, 0.45),
  run: (s, o) => {
    s.sessionFlags = s.sessionFlags || {};
    s.sessionFlags.pipelineUsed = true;
    let pac = '';
    if (s.sessionFlags.pac_lender_claim || s.obls.includes('OB1')) {
      if (!s.sessionFlags.pac_claim_refused) {
        pac = applyPacClaimOnReferral(s);
      }
    }
    if (o.tier <= 1) {
      setBillStage(s, 2);
      if (s.committee && s.bill) s.bill.committeeId = s.committee.id;
      return (
        (o.tier === 0
          ? 'Referred to a friendly committee. Someone up there is smiling on you.'
          : 'Referred. Not the graveyard. That is a start.') + pac
      );
    }
    if (o.tier === 2) {
      return 'Sitting on the desk. The Speaker\'s office says "soon." Soon is a place bills die.' + pac;
    }
    if (s.bill) s.bill.heat += 1;
    return 'Referred to a hostile committee. Someone up there is not smiling.' + pac;
  }
};

/** Explicit PAC refuse — optional before referral if claim held */
export const SS_PAC_Refuse: PlayCard = {
  id: 'SS_PAC',
  n: 'Refuse the PAC Call',
  cost: { a: 0 },
  risk: 'VOL',
  ph: [1, 2, 3],
  tag: 'the string pulls',
  kind: 'bargain',
  attrs: ['CON'],
  d: 'They want an aye on a quiet association bill. Refuse and keep your district — pay in heat and ink.',
  show: s =>
    s.stage === 'session' &&
    !!(s.sessionFlags?.pac_lender_claim || s.obls.includes('OB1')) &&
    !s.sessionFlags?.pac_claim_paid &&
    !s.sessionFlags?.pac_claim_refused,
  odds: () => 0.99,
  run: s => refusePacClaim(s)
};

/** archive SS03 */
export const SS03_CourtChair: PlayCard = {
  id: 'SS03',
  n: 'Court the Chair',
  cost: { a: 1 },
  risk: 'STD',
  ph: [1, 2, 3],
  tag: 'the gatekeeper',
  attrs: ['DIP'],
  d: 'The chair decides what gets heard. (Hearings open wk 4.) Kitchen-table rules, marble floors.',
  show: s =>
    s.stage === 'session' &&
    !!s.bill &&
    s.bill.pipelineStage === 2 &&
    s.week >= 4 &&
    !s.sessionFlags?.pipelineUsed,
  odds: s => billOdds(s, 0.45) + (s.faces.O > 10 ? 0.08 : 0),
  run: (s, o) => {
    s.sessionFlags = s.sessionFlags || {};
    s.sessionFlags.pipelineUsed = true;
    if (o.tier <= 1) {
      setBillStage(s, 3);
      if (s.committee) s.committee.standing = Math.min(100, s.committee.standing + 8);
      if (o.tier === 0) s.capital += 1;
      return 'A hearing date. The chair pencils you in — pencils being the operative word.';
    }
    if (o.tier === 2) return '"We\'ll see what the calendar allows." The calendar allows what the chair allows.';
    s.faces.O -= 2;
    return 'You push the chair. The chair does not care for pushing.';
  }
};

/** archive SS04 */
export const SS04_Testimony: PlayCard = {
  id: 'SS04',
  n: 'Committee Testimony',
  cost: { a: 1 },
  risk: 'VOL',
  ph: [1, 2, 3],
  tag: 'on the record',
  attrs: ['CON', 'CHA'],
  d: 'Witnesses, a timer, members reading their phones. (Votes-out open wk 6.)',
  show: s =>
    s.stage === 'session' &&
    !!s.bill &&
    s.bill.pipelineStage === 3 &&
    s.week >= 6 &&
    !s.sessionFlags?.pipelineUsed,
  odds: s => billOdds(s, 0.45) + (s.messageSharp ? 0.08 : 0),
  run: (s, o) => {
    s.sessionFlags = s.sessionFlags || {};
    s.sessionFlags.pipelineUsed = true;
    if (o.tier === 0) {
      setBillStage(s, 4);
      s.capital += 1;
      s.nameID += 3;
      if (s.bill) s.bill.tally = { aye: 9, nay: 0, present: 0, need: 5 };
      return 'Your witness makes a member look up from his phone. Voted out with a rare unanimous nod.';
    }
    if (o.tier === 1) {
      setBillStage(s, 4);
      if (s.bill) s.bill.tally = { aye: 5, nay: 4, present: 0, need: 5 };
      return 'Voted out on party lines. Forward is forward.';
    }
    if (o.tier === 2) return 'Left pending. "Pending" is committee for "quietly bleeding."';
    if (s.bill) s.bill.heat += 2;
    return 'A hostile witness lands. The bill is pending and hemorrhaging.';
  }
};

/** archive SS05 */
export const SS05_CalendarSlot: PlayCard = {
  id: 'SS05',
  n: 'Beg a Calendar Slot',
  cost: { a: 1 },
  risk: 'STD',
  ph: [1, 2, 3],
  tag: 'the narrowest door',
  attrs: ['CRA', 'DIP'],
  d: 'Calendars decides what the House even sees. (Opens wk 9.) Favor is the only currency here.',
  show: s =>
    s.stage === 'session' &&
    !!s.bill &&
    s.bill.pipelineStage === 4 &&
    s.week >= 9 &&
    !s.sessionFlags?.pipelineUsed &&
    !sessionPipelineBlocked(s, 'SS05'),
  odds: s => billOdds(s, 0.3) + (s.favor > 65 ? 0.15 : 0),
  run: (s, o) => {
    s.sessionFlags = s.sessionFlags || {};
    s.sessionFlags.pipelineUsed = true;
    if (o.tier <= 1) {
      setBillStage(s, 5);
      return 'A slot. Late in the day, late in the session — but a slot.';
    }
    if (o.tier === 2) {
      if (s.bill) s.bill.heat += 1;
      return 'Below the line again. The clock eats another week, and the line gets longer.';
    }
    s.favor -= 5;
    return 'You lean on Calendars and Calendars leans back. Favor slips.';
  }
};

/** archive SS06 */
export const SS06_FloorFight: PlayCard = {
  id: 'SS06',
  n: 'Floor Fight',
  cost: { a: 1 },
  risk: 'VOL',
  ph: [1, 2, 3],
  tag: 'the whole House watching',
  attrs: ['CRA', 'CLO'],
  d: 'Amendments fly, points of order lurk, the back mic is loaded. (Floor opens wk 11.)',
  show: s =>
    s.stage === 'session' &&
    !!s.bill &&
    s.bill.pipelineStage === 5 &&
    s.week >= 11 &&
    !s.sessionFlags?.pipelineUsed &&
    !sessionPipelineBlocked(s, 'SS06'),
  odds: s => billOdds(s, 0.5) + s.capital * 0.02,
  run: (s, o) => {
    s.sessionFlags = s.sessionFlags || {};
    s.sessionFlags.pipelineUsed = true;
    if (o.tier === 0) {
      setBillStage(s, 6);
      s.capital += 2;
      s.nameID += 5;
      if (s.bill) s.bill.tally = { aye: 92, nay: 48, present: 0, need: 76 };
      return 'Passed to third reading clean. The Old Bulls nod from the back row. That nod is currency.';
    }
    if (o.tier === 1) {
      setBillStage(s, 6);
      if (s.bill) {
        s.bill.heat += 1;
        s.bill.tally = { aye: 78, nay: 62, present: 0, need: 76 };
      }
      return 'Passed — wearing two hostile amendments like buckshot. Alive, though.';
    }
    if (o.tier === 2) {
      if (s.bill) s.bill.heat += 1;
      return 'Postponed on a motion. The clock grins.';
    }
    if (s.bill) s.bill.heat += 2;
    s.capital = Math.max(0, s.capital - 1);
    return 'POINT OF ORDER — sustained. Back to committee on a technicality. The author of the point does not look at you.';
  }
};

/** archive SS07 */
export const SS07_WorkSenate: PlayCard = {
  id: 'SS07',
  n: 'Work the Senate',
  cost: { a: 1 },
  risk: 'VOL',
  ph: [1, 2, 3],
  tag: 'the other chamber',
  attrs: ['INK', 'DIP'],
  d: 'Thirty-one senators, the Lt. Governor, and the Tag in wait. (Opens wk 13.)',
  show: s =>
    s.stage === 'session' &&
    !!s.bill &&
    s.bill.pipelineStage === 6 &&
    s.week >= 13 &&
    !s.sessionFlags?.pipelineUsed,
  odds: s => billOdds(s, 0.4),
  run: (s, o) => {
    s.sessionFlags = s.sessionFlags || {};
    s.sessionFlags.pipelineUsed = true;
    if (o.tier <= 1) {
      setBillStage(s, 7);
      return 'A senator adopts it. Through the upper chamber, scarred but breathing.';
    }
    if (o.tier === 2) {
      if (s.bill) s.bill.heat += 1;
      return 'TAGGED. Forty-eight hours lost, and the session has no forty-eight hours to spare.';
    }
    if (s.bill) s.bill.heat += 2;
    return 'It dies in Senate committee at 11:58 on a procedural motion. Revive it — if the clock allows.';
  }
};

/** archive SS08 */
export const SS08_Casework: PlayCard = {
  id: 'SS08',
  n: 'District Casework',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'the home fires',
  attrs: ['CHA'],
  d: "A veteran's benefits, a stop-sign petition, a widow's property line. The seat is kept here, not in Austin.",
  show: s => s.stage === 'session',
  odds: () => 0.85,
  run: (s, o) => {
    s.sessionFlags = s.sessionFlags || {};
    s.sessionFlags.caseworkThisWeek = true;
    const bonus = s.sessionFlags?.caseworkBonus ? 1 : 0;
    // Session teeth: casework is the only full answer to weekly home-fire drain
    const g =
      (s.districtStanding > 75 ? (o.tier === 0 ? 4 : 3) : o.tier === 0 ? 7 : 5) + bonus;
    s.districtStanding = clamp(s.districtStanding + g, 0, 100);
    // Soften challenger if you show up at home
    const ch = Number(s.sessionFlags.challengerHeat || 0);
    if (ch > 0 && o.tier <= 1) {
      s.sessionFlags.challengerHeat = Math.max(0, ch - 1);
    }
    return (
      'Calls returned, problems chased. The district remembers who answers.' +
      (s.districtStanding > 75 ? ' (High standing: gains diminish.)' : '') +
      (ch > 0 && o.tier <= 1 ? ' Challenger heat eases one notch.' : '')
    );
  }
};

/** archive SS09 */
export const SS09_SpeakerErrand: PlayCard = {
  id: 'SS09',
  n: "The Speaker's Errand",
  cost: { a: 1 },
  risk: 'STD',
  ph: [1, 2, 3],
  tag: 'favor for favor',
  attrs: ['DIP'],
  d: 'Carry a small unpleasant thing for leadership. It costs your name a little; it buys your bill a lot.',
  show: s => s.stage === 'session',
  odds: () => 0.75,
  run: (s, o) => {
    s.sessionFlags = s.sessionFlags || {};
    if (o.tier <= 1) {
      s.favor += 8;
      s.districtStanding = clamp(s.districtStanding - 2, 0, 100);
      // Session teeth: errands thaw freeze / clear demand
      const fz = Number(s.sessionFlags.speakerFreeze || 0);
      if (fz > 0) s.sessionFlags.speakerFreeze = Math.max(0, fz - 1);
      s.sessionFlags.errandDemand = false;
      return (
        'Done quietly. The fifth floor notes it. The district would not love the details.' +
        (fz > 0 ? ' (Leadership freeze eases.)' : '')
      );
    }
    return 'The errand goes sideways and you own a little of it. Nothing gained.';
  }
};

/** archive SS10 */
export const SS10_WhipTrade: PlayCard = {
  id: 'SS10',
  n: 'Whip a Vote Trade',
  cost: { a: 1 },
  risk: 'STD',
  ph: [1, 2, 3],
  tag: 'the favor economy',
  attrs: ['CRA'],
  d: 'Your aye for his, payable when called. The whole building runs on this ledger.',
  show: s => s.stage === 'session',
  odds: s => 0.65 + s.faces.O * 0.004,
  run: (s, o) => {
    if (o.tier <= 1) {
      s.capital += o.tier === 0 ? 2 : 1;
      return 'Traded. Your little bank of ayes grows.';
    }
    if (o.tier === 2) return "No takers this week. Everyone's ledger is full.";
    s.faces.O -= 2;
    return 'A trade leaks and reads as cynical. It was, but still.';
  }
};

/** archive SS12 */
export const SS12_StudyRules: PlayCard = {
  id: 'SS12',
  n: 'Study the Rules',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'the manual',
  attrs: ['INK'],
  d: "Most members never read them. The ones who do own the ones who don't.",
  show: s => s.stage === 'session',
  odds: () => 0.9,
  run: s => {
    s.faces.P += 4;
    s.capital += 1;
    return 'An evening with the rulebook. Somewhere in there is the parliamentary trick that will one day save your bill.';
  }
};

/** archive SS13 — Old Bull writ */
export const SS13_PlayWrit: PlayCard = {
  id: 'SS13',
  n: 'Play the Writ',
  cost: { a: 0 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: "the Old Bull's gift",
  attrs: ['INK'],
  d: 'One procedural miracle, pre-paid. Spend it where the session bends.',
  show: s => s.stage === 'session' && !!s.sessionFlags?.writ,
  odds: () => 1,
  run: s => {
    s.sessionFlags = s.sessionFlags || {};
    s.sessionFlags.writ = false;
    if (s.bill && s.bill.pipelineStage >= 1 && s.bill.pipelineStage < 8) {
      setBillStage(s, Math.min(8, s.bill.pipelineStage + 1));
      s.bill.heat = Math.max(0, s.bill.heat - 1);
      return "The Writ spends itself: a motion nobody saw coming, and your bill jumps a stage. The Old Bull, watching from the gallery, tips two fingers.";
    }
    s.capital += 3;
    return 'No bill to move — the Writ converts to raw capital. Three ayes\' worth.';
  }
};

/**
 * Session loop package — Special residency (not Main Deck).
 * Scoped to freshman / state-rep family; departs kit on sine die (future wire).
 * See docs/CARD-RESIDENCY.md.
 */
const SESSION_ENTITY_SCOPE = ['ENT_FRESHMAN_MEMBER', 'ENT_STATE_REP'] as const;

export const SESSION_PLAYS: PlayCard[] = (() => {
  const cards: PlayCard[] = [
    SS01_FileBill,
    SS02_SeekReferral,
    SS_PAC_Refuse,
    SS03_CourtChair,
    SS04_Testimony,
    SS05_CalendarSlot,
    SS06_FloorFight,
    SS07_WorkSenate,
    SS08_Casework,
    SS09_SpeakerErrand,
    SS10_WhipTrade,
    SS12_StudyRules,
    SS13_PlayWrit
  ];
  for (const c of cards) {
    c.residency = 'special';
    c.control = 'player';
    c.entityScope = [...SESSION_ENTITY_SCOPE];
  }
  return cards;
})();
