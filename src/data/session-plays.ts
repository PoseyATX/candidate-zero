/**
 * Session pipeline + survival plays — port of archive SESSION_PLAYS
 * (prototype-single-file.html ~940–1003 core path + casework/errand/whip).
 *
 * All show-gated on stage==='session'. Pipeline plays (SS02–SS07) are one
 * per week by default; a second costs 3 AP still in hand (engine/session.ts
 * pipelineMotionAvailable), so forcing the bill means a week spent on nothing else.
 */

import type { PlayCard } from '../engine/types.js';
import {
  applyPacClaimOnReferral,
  billOdds,
  CALENDAR_OPENS_WEEK,
  refusePacClaim,
  sessionPipelineBlocked,
  setBillStage,
  pipelineMotionAvailable,
  notePipelineMotion,
  addBillHeat,
  coolBill,
  STAGE_OPENS
} from '../engine/session.js';
import { provisionSwing, coalitionBonus } from '../engine/docket.js';
import { chamberSwing } from '../engine/chamber.js';
import { POLICY_PLAYS } from './policy-plays.js';
import { MEMBER_PLAYS } from './member-plays.js';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** archive SS01 */
export const SS01_FileBill: PlayCard = {
  id: 'SS01',
  n: 'File the Bill',
  cost: { a: 2 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'H.B. ____',
  attrs: ['INK'],
  d:
    'Your name, your issue, a number. It exists now, which is more than most ideas get. ' +
    'Step ONE of the bill pipeline and effectively automatic — but you only get ONE pipeline move ' +
    'per week, so the session is a race against the clock from here. ' +
    'Ink is the attribute. File early; every week you wait is a week the calendar eats at the far end.',
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
  cost: { a: 2 },
  risk: 'STD',
  ph: [1, 2, 3],
  tag: "the Speaker's desk",
  attrs: ['DIP'],
  d:
    'Bills go where the Speaker sends them. Step TWO, and it opens in week 2. ' +
    'Land it and you are in committee; miss and the desk sits on you while the clock runs. ' +
    'Diplomacy is the attribute, and the odds ride on your bill\'s health and heat. ' +
    'If the Third House holds a claim on you, THEY COLLECT HERE — before the desk moves — ' +
    'unless you have already refused them.',
  show: s =>
    s.stage === 'session' &&
    !!s.bill &&
    s.bill.pipelineStage === 1 &&
    s.week >= STAGE_OPENS[1]! &&
    pipelineMotionAvailable(s),
  odds: s => billOdds(s, 0.45),
  run: (s, o) => {
    notePipelineMotion(s);
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
    addBillHeat(s, 1);
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
  d:
    'They want an aye on a quiet association bill, and the check you took in the campaign says you owe it. ' +
    'Costs no action at all — the price is paid in heat and ink, not AP. ' +
    'Refuse and you keep your district clean and your bill takes the damage; ' +
    'stay silent and they simply collect at referral instead. ' +
    'Conviction is the attribute. There is no version of this that is free.',
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
  cost: { a: 2 },
  risk: 'STD',
  ph: [1, 2, 3],
  tag: 'the gatekeeper',
  attrs: ['DIP'],
  d:
    'The chair decides what gets heard — kitchen-table rules, marble floors. ' +
    'Step THREE, open from week 4. Success buys a hearing date and standing with the committee, ' +
    'and a breakthrough banks political capital on top. ' +
    'Diplomacy is the attribute and strong Operator standing gives a real edge. ' +
    'Push the chair on a disaster and the chair remembers.',
  show: s =>
    s.stage === 'session' &&
    !!s.bill &&
    s.bill.pipelineStage === 2 &&
    s.week >= STAGE_OPENS[2]! &&
    pipelineMotionAvailable(s),
  odds: s => billOdds(s, 0.45) + (s.faces.O > 10 ? 0.08 : 0),
  run: (s, o) => {
    notePipelineMotion(s);
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
  cost: { a: 2 },
  risk: 'VOL',
  ph: [1, 2, 3],
  tag: 'on the record',
  attrs: ['CON', 'CHA'],
  d:
    'Witnesses, a timer, members reading their phones. Step FOUR, open from week 6, ' +
    'and the first genuinely dangerous one. ' +
    'A breakthrough votes the bill out unanimously with capital and name ID; a solid result gets it ' +
    'out on party lines. Left pending is committee for quietly bleeding. ' +
    'Conviction and Charm carry the room, and a sharp message widens the odds. ' +
    'A disaster piles heat on the bill, and heat is what kills bills at the far end.',
  show: s =>
    s.stage === 'session' &&
    !!s.bill &&
    s.bill.pipelineStage === 3 &&
    s.week >= STAGE_OPENS[3]! &&
    pipelineMotionAvailable(s),
  odds: s => billOdds(s, 0.45) + (s.messageSharp ? 0.08 : 0),
  run: (s, o) => {
    notePipelineMotion(s);
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
    addBillHeat(s, 2);
    return 'A hostile witness lands. The bill is pending and hemorrhaging.';
  }
};

/** archive SS05 */
export const SS05_CalendarSlot: PlayCard = {
  id: 'SS05',
  n: 'Set on Calendar',
  cost: { a: 2 },
  risk: 'STD',
  ph: [1, 2, 3],
  tag: 'the narrowest door',
  attrs: ['CRA', 'DIP'],
  d:
    'Calendars decides what the House even sees. Step FIVE, open from week 9, and the narrowest ' +
    'door in the building — the base odds here are the worst in the pipeline. ' +
    'Favor is the only currency that helps: above 65 it is a large, direct bonus. ' +
    'Craft and Diplomacy work the room. Spend the session banking favor from errands BEFORE you ' +
    'arrive here, because leaning on Calendars empty-handed costs you what favor you had.',
  show: s =>
    s.stage === 'session' &&
    !!s.bill &&
    s.bill.pipelineStage === 4 &&
    s.week >= STAGE_OPENS[4]! &&
    pipelineMotionAvailable(s) &&
    !sessionPipelineBlocked(s, 'SS05'),
  odds: s => billOdds(s, 0.3) + (s.favor > 65 ? 0.15 : 0),
  run: (s, o) => {
    notePipelineMotion(s);
    if (o.tier <= 1) {
      setBillStage(s, 5);
      return 'A slot. Late in the day, late in the session — but a slot.';
    }
    if (o.tier === 2) {
      addBillHeat(s, 1);
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
  cost: { a: 2 },
  risk: 'VOL',
  ph: [1, 2, 3],
  tag: 'the whole House watching',
  attrs: ['CRA', 'CLO'],
  d:
    'Amendments fly, points of order lurk, the back mic is loaded. Step SIX, open from week 11. ' +
    'Pass clean and you take capital, name ID, and a nod from the Old Bulls; pass ugly and the bill ' +
    'carries hostile amendments like buckshot but survives. ' +
    'Craft and Close carry it, and every point of political capital you have banked raises the odds — ' +
    'this is what Whip a Vote Trade and Study the Rules were FOR. ' +
    'A sustained point of order sends you back to committee with the clock grinning.',
  show: s =>
    s.stage === 'session' &&
    !!s.bill &&
    s.bill.pipelineStage === 5 &&
    s.week >= STAGE_OPENS[5]! &&
    pipelineMotionAvailable(s) &&
    !sessionPipelineBlocked(s, 'SS06'),
  // Language you attached is members you bought. Each net member is worth ~0.4pp
  // on the floor — a well-amended bill genuinely walks in with a coalition, and
  // a bill nobody is owed by walks in alone.
  // Language you attached PLUS the people who already owe you. A member with a
  // record has friends in the room before the bill is filed.
  // billOdds already carries coalitionBonus; adding it again here double-counted it.
  odds: s => billOdds(s, 0.5) + s.capital * 0.02 + chamberSwing(s) * 0.006,
  run: (s, o) => {
    notePipelineMotion(s);
    if (o.tier === 0) {
      setBillStage(s, 6);
      s.capital += 2;
      s.nameID += 5;
      if (s.bill) {
        const sw = provisionSwing(s);
        s.bill.tally = { aye: 92 + sw, nay: 48 - sw, present: 0, need: 76 };
      }
      return 'Passed to third reading clean. The Old Bulls nod from the back row. That nod is currency.';
    }
    if (o.tier === 1) {
      setBillStage(s, 6);
      if (s.bill) {
        addBillHeat(s, 1);
        const sw = provisionSwing(s);
        s.bill.tally = { aye: 78 + sw, nay: 62 - sw, present: 0, need: 76 };
      }
      return 'Passed — wearing two hostile amendments like buckshot. Alive, though.';
    }
    if (o.tier === 2) {
      addBillHeat(s, 1);
      return 'Postponed on a motion. The clock grins.';
    }
    addBillHeat(s, 2);
    s.capital = Math.max(0, s.capital - 1);
    return 'POINT OF ORDER — sustained. Back to committee on a technicality. The author of the point does not look at you.';
  }
};

/** archive SS07 */
export const SS07_WorkSenate: PlayCard = {
  id: 'SS07',
  n: 'Work the Senate',
  cost: { a: 2 },
  risk: 'VOL',
  ph: [1, 2, 3],
  tag: 'the other chamber',
  attrs: ['INK', 'DIP'],
  d:
    'Thirty-one senators, the Lt. Governor, and the Tag lying in wait. Step SEVEN, open from week 13 — ' +
    'the last gate, run at the worst possible moment in the calendar. ' +
    'Ink and Diplomacy carry it. A miss is a TAG: forty-eight hours lost, and a session at week 13 ' +
    'does not have forty-eight hours. A disaster kills it outright at 11:58 on a procedural motion. ' +
    'Arrive here with the bill cool and the clock unspent, or do not arrive here at all.',
  show: s =>
    s.stage === 'session' &&
    !!s.bill &&
    s.bill.pipelineStage === 6 &&
    s.week >= STAGE_OPENS[6]! &&
    pipelineMotionAvailable(s),
  // The House coalition travels. A bill that left the floor 92-48 arrives in the
  // Senate with a number attached to it, and thirty-one senators can all read.
  odds: s => billOdds(s, 0.4),
  run: (s, o) => {
    notePipelineMotion(s);
    if (o.tier <= 1) {
      setBillStage(s, 7);
      return 'A senator adopts it. Through the upper chamber, scarred but breathing.';
    }
    if (o.tier === 2) {
      addBillHeat(s, 1);
      return 'TAGGED. Forty-eight hours lost, and the session has no forty-eight hours to spare.';
    }
    addBillHeat(s, 2);
    return 'It dies in Senate committee at 11:58 on a procedural motion. Revive it — if the clock allows.';
  }
};

/** archive SS08 */
export const SS08_Casework: PlayCard = {
  id: 'SS08',
  n: 'Casework',
  cost: { a: 2 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'the home fires',
  attrs: ['CHA'],
  d:
    "A veteran's benefits, a stop-sign petition, a widow's property line. The seat is kept here, " +
    'not in Austin. The only full answer to the district standing that drains every week you spend ' +
    'in the Capitol — and the only reliable way to cool a primary challenger. ' +
    'Charm is the attribute and it is SAFE. ' +
    'Gains shrink above 75 standing, so play it to hold the floor, not to top off a district ' +
    'that already loves you.',
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
  cost: { a: 2 },
  risk: 'STD',
  ph: [1, 2, 3],
  tag: 'favor for favor',
  attrs: ['DIP'],
  d:
    'Carry a small unpleasant thing for leadership. It costs your name a little; it buys your bill a lot. ' +
    '+8 favor for 2 standing — and favor is the ONLY currency that opens Calendars, ' +
    'the narrowest gate in the session. ' +
    'It also thaws a leadership freeze and clears a standing demand. ' +
    'Diplomacy is the attribute. Run errands early; you cannot buy the calendar slot in the week you need it.',
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
  cost: { a: 2 },
  risk: 'STD',
  ph: [1, 2, 3],
  tag: 'the favor economy',
  attrs: ['CRA'],
  d:
    'Your aye for his, payable when called. The whole building runs on this ledger. ' +
    'Banks political capital, which is what widens the odds on the Floor Fight later — ' +
    'this card is an investment, not a payoff. ' +
    'Craft is the attribute and Operator standing helps. ' +
    'A leak reads as cynical and costs you standing, which it was, but still.',
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
  cost: { a: 2 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'the manual',
  attrs: ['INK'],
  d:
    "Most members never read them. The ones who do own the ones who don't. " +
    'Safe and reliable — the first read is the best two action points in the session. ' +
    'But the manual is finite: each further read teaches less than the last, and the fourth ' +
    'is an evening in a Capitol office while your district notices you are not in it. ' +
    'Ink is the attribute. ' +
    'The capital is what you will spend on the floor; the Parliamentarian face is what survives the run.',
  show: s => s.stage === 'session',
  // The ODDS have to fall too, not just the payoff. A3 is "the card-level
  // signal actively fights the real one", and the signal a player reads off the
  // face is this number. Dropping the reward while leaving 0.9 printed on the
  // card would have kept the lie and merely made it more expensive — the first
  // version of this fix did exactly that, and an odds-following player kept
  // spamming it 27 turns out of 28. "Will I find something new in a book I have
  // already read three times" is honestly a worse bet, so the card now says so.
  odds: s => Math.max(0.35, 0.9 - Number(s.sessionFlags?.studyRulesReads || 0) * 0.18),
  run: s => {
    s.sessionFlags = s.sessionFlags || {};
    const read = Number(s.sessionFlags.studyRulesReads || 0);
    s.sessionFlags.studyRulesReads = read + 1;
    // Covenant 6 — power is never clean. This card was SAFE, the highest odds
    // in the session catalog (0.9), repeatable without limit and strictly
    // positive, and its own text bragged "no downside at all". A player who
    // simply followed the odds number on the card faces played it 27 of 28
    // session turns and lost the seat in 186 of 186 measured sessions. The
    // signal the game printed pointed at a trap.
    const p = Math.max(1, 4 - read);
    s.faces.P += p;
    const cap = read < 2 ? 1 : 0;
    s.capital += cap;
    if (read === 0) {
      return 'An evening with the rulebook. Somewhere in there is the parliamentary trick that will one day save your bill.';
    }
    if (read < 3) {
      return `You go back to the manual. Less new in it this time (Parliamentarian +${p}${cap ? ', capital +1' : ''}).`;
    }
    return `You have read this book. Parliamentarian +${p}, and an evening your district did not see you.`;
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
  d:
    'One procedural miracle, pre-paid. Costs NO action and cannot fail. ' +
    'Jumps your bill a whole pipeline stage and cools it a notch — which, in a session where you ' +
    'get one pipeline move a week, is a week bought back outright. ' +
    'With no bill to move it converts to three ayes\' worth of capital instead. ' +
    'Ink is the attribute. Spend it at the narrowest gate you face, not the first one.',
  show: s => s.stage === 'session' && !!s.sessionFlags?.writ,
  odds: () => 1,
  run: s => {
    s.sessionFlags = s.sessionFlags || {};
    s.sessionFlags.writ = false;
    if (s.bill && s.bill.pipelineStage >= 1 && s.bill.pipelineStage < 8) {
      setBillStage(s, Math.min(8, s.bill.pipelineStage + 1));
      coolBill(s, 1);
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

// --- Wave: more session survival plays (non-pipeline). Match the SS idiom:
//     show gated to stage==='session'; standing / challenger / favors. ---
export const SS27_RibbonCircuit: PlayCard = {
  id: 'SS27', n: 'Ribbon-Cutting Circuit', cost: { a: 2 }, risk: 'SAFE', ph: [1, 2, 3],
  tag: 'the home fires', attrs: ['CHA'],
  d:
    'A new bridge, a clinic wing, a fire truck. You hold the giant scissors and the district sees you deliver. ' +
    'District standing plus name ID, safely, every time. ' +
    'Charm is the attribute. It pays less standing than Casework but adds name ID and never diminishes — ' +
    'the card for a member who is already well liked at home and wants to be well known.',
  show: s => s.stage === 'session',
  odds: () => 0.85,
  run: (s, o) => {
    const g = o.tier === 0 ? 6 : 4;
    s.districtStanding = clamp(s.districtStanding + g, 0, 100);
    s.nameID += 2;
    return `Scissors, cameras, a check with your name near it. Standing +${g}, +2 name ID.`;
  }
};
export const SS28_CharityGala: PlayCard = {
  id: 'SS28', n: 'Interim Charity Gala', cost: { a: 2 }, risk: 'STD', ph: [1, 2, 3],
  tag: 'favor for favor', attrs: ['DIP'],
  d:
    'A good cause, a ballroom, and every lobbyist in town buying a table. ' +
    'One of the few ways to bank an actual FAVOR token — the currency the Union Hall and the ' +
    'statewide endorsements demand — plus a little district standing. ' +
    'Diplomacy is the attribute. ' +
    'A disaster is a donor photo in the paper, and it costs more than the night gave.',
  show: s => s.stage === 'session',
  odds: () => 0.7,
  run: (s, o) => {
    s.sessionFlags = s.sessionFlags || {};
    if (o.tier <= 1) { s.favors += 1; s.districtStanding = clamp(s.districtStanding + 3, 0, 100); return 'The room is generous. +1 favor and the district notices the marquee.'; }
    if (o.tier === 2) { s.districtStanding = clamp(s.districtStanding + 1, 0, 100); return 'A thin crowd, a polite night. Standing +1.'; }
    return 'A donor photo goes sideways in the paper. The gala costs you more than it gave.';
  }
};
export const SS29_FaceThreat: PlayCard = {
  id: 'SS29', n: 'Face Down the Primary Threat', cost: { a: 2 }, risk: 'VOL', ph: [1, 2, 3],
  tag: 'the burned bridge', attrs: ['CON'],
  d:
    'A challenger is testing the waters back home. You can ignore it — or plant your flag and stare them down. ' +
    'Appears only while challenger heat is live. A breakthrough drops that heat two notches and ' +
    'adds momentum; a solid result drops it one. ' +
    'Conviction is the attribute and district standing raises the odds, so face them from strength. ' +
    'VOLATILE, and the failure is the real risk: punch down from a weak position and you LEGITIMIZE ' +
    'them, raising the heat instead. Casework cools them more slowly but never backfires.',
  show: s => s.stage === 'session' && Number((s.sessionFlags?.challengerHeat) || 0) > 0,
  odds: (s) => clamp(0.55 + s.districtStanding * 0.003, 0, 0.9),
  run: (s, o) => {
    s.sessionFlags = s.sessionFlags || {};
    const ch = Number(s.sessionFlags.challengerHeat || 0);
    if (o.tier === 0) { s.sessionFlags.challengerHeat = Math.max(0, ch - 2); s.momentum += 1; return 'You call the bluff in public. The challenger backs off — heat down two, momentum up.'; }
    if (o.tier === 1) { s.sessionFlags.challengerHeat = Math.max(0, ch - 1); return 'A firm word in the right ears. Challenger heat eases one notch.'; }
    if (o.tier === 2) { return 'A standoff. Nothing settled, nothing lost.'; }
    s.sessionFlags.challengerHeat = ch + 1; return 'You punch down and legitimize them. The threat grows.';
  }
};

export const SESSION_PLAYS: PlayCard[] = (() => {
  const cards: PlayCard[] = [
    ...POLICY_PLAYS,
    ...MEMBER_PLAYS,
    SS27_RibbonCircuit,
    SS28_CharityGala,
    SS29_FaceThreat,
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
