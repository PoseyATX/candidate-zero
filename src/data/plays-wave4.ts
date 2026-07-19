/**
 * Wave 4 Plays — force multipliers + honest traps + Phase 2 ally grants
 * Grounded in archive prototype ACTIONS (volun, message, pac, selffund)
 * plus Contrast Mail, ally-grant ports (PL22B/PL30/PL32/PL48/PL29).
 */

import { random } from '../engine/rng.js';
import { addAlly, findAlly, warm } from '../engine/reputation.js';
import { addObl } from './obligations.js';
import { applySelfLoan, maybePacBridge, pacCheckAvailable } from '../engine/debt.js';
import type { PlayCard } from '../engine/types.js';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function R(n: number): number {
  return random() * n;
}
export const PL16_RecruitVolunteers: PlayCard = {
  id: 'PL16', n: 'Recruit Volunteers', cost: { a: 1 }, risk: 'STD', ph: [1, 2, 3], tag: 'force multiplier',
  attrs: ['CLO', 'CHA'],
  d: 'An army marches on casseroles. Every volunteer makes every other card better.',
  odds: (s) => clamp(0.5 + s.faces.T * 0.004 + s.nameID * 0.003, 0, 0.95),
  run: (s, o) => {
    if (o.tier <= 1) {
      const v = o.tier === 0 ? 4 : 2;
      s.volPool += v;
      return `+${v} volunteers. One owns a truck with a flatbed. This matters.`;
    }
    if (o.tier === 2) {
      s.volPool += 1;
      return '+1 volunteer, your cousin, under protest.';
    }
    s.volPool = Math.max(0, s.volPool - 1);
    return 'A volunteer quits loudly on Facebook. It stings more than it should.';
  }
};

export const PL18_SharpenMessage: PlayCard = {
  id: 'PL18', n: 'Sharpen the Message', cost: { a: 1 }, risk: 'STD', ph: [1, 2], tag: 'one issue, said right',
  attrs: ['CON'],
  d: 'You are not running on nine things. You are running on one thing, said so it stays said.',
  show: (s) => !s.messageSharp,
  odds: (s) => clamp(0.6 + s.faces.T * 0.003, 0, 0.95),
  run: (s, o) => {
    if (o.tier <= 1) {
      s.messageSharp = true;
      s.faces.T += 5;
      return 'Five words now, and they land. Permanent bonus to persuasion work.';
    }
    if (o.tier === 2) return 'Drafts, drafts, drafts. Nothing sings yet.';
    s.faces.T -= 3;
    return 'You test a clever line and it curdles. The consultant word for this is "pivot."';
  }
};

export const PL20_PacCheck: PlayCard = {
  id: 'PL20', n: 'Take the PAC Check', cost: { a: 1 }, risk: 'STD', ph: [1, 2, 3], tag: 'the Third House pays well',
  attrs: ['CRA', 'DIP'],
  kind: 'bargain',
  trap: true,
  d: 'A man in a good suit admires your race. The check is real. So is the string tied to it. Once. Session will collect.',
  // Once per campaign — never a free-money ATM. Crisis may open early (debt.ts).
  show: (s) =>
    pacCheckAvailable(s) &&
    !s.sessionFlags?.pacCheckTaken &&
    !s.obls.includes('OB1'),
  odds: () => 0.9,
  run: (s, o) => {
    s.sessionFlags = s.sessionFlags || {};
    s.sessionFlags.pacCheckTaken = true;
    if (o.tier === 3) {
      s.hitPieces++;
      return 'The check bounces into the news instead of your account. "WHO IS FUNDING CANDIDATE?" (The Third House will not offer again.)';
    }
    // Tuned down from 2500–4500 — still real money, not a landslide
    const m = 1400 + Math.floor(R(900));
    s.money += m;
    s.faces.L -= 12;
    addObl(s, 'OB1');
    const bridge = maybePacBridge(s, m);
    return (
      `+$${m}. The Third House has opened an account in your name. ` +
      `(PAC String OB1 — L and exposure drag every week. Session referral will not be free.)${bridge}`
    );
  }
};

export const PL21_SelfFundCredit: PlayCard = {
  id: 'PL21', n: 'Self-Fund on Credit', cost: { a: 1 }, risk: 'SAFE', ph: [1, 2], tag: 'the bank believes in you',
  attrs: ['CRA'],
  kind: 'bargain',
  trap: true,
  d: "The bank will lend against the homestead. Campaigns have eaten better men's farms. Spend it now — the bill lands on the win/loss branch, not your odds.",
  // Phase 3: once-per-run spend-now lever (debt.ts applySelfLoan)
  show: (s) => !s.selfLoanTaken,
  odds: () => 0.95,
  run: (s) => applySelfLoan(s, 3000)
};

export const PL22_ContrastMail: PlayCard = {
  id: 'PL22', n: 'Contrast Mail', cost: { a: 1, $: 800 }, risk: 'VOL', ph: [2, 3], tag: 'the folder spent',
  attrs: ['CRA', 'INK'],
  d: 'What the quiet man found, printed on cheap stock and mailed to every primary voter who votes.',
  // archive:639 also requires A03 Mail Program — keep modular oppoFile primary;
  // A03 is still a real shop unlock for parity / future tightening.
  req: (s) => s.oppoFile,
  odds: (s) => clamp(0.48 + s.faces.O * 0.003 - s.exposure * 0.04, 0, 0.9),
  run: (s, o) => {
    s.shadowPlays++;
    s.faces.O -= 3;
    if (o.tier === 0) {
      s.momentum += 3;
      s.nameID += 6;
      return 'The piece lands. Rivals scramble. Your name is in every kitchen — and not only for the right reasons.';
    }
    if (o.tier === 1) {
      s.momentum += 1;
      s.nameID += 3;
      return 'A solid hit. Half the district shrugs; the half that votes primary does not.';
    }
    if (o.tier === 2) return 'It reads mean. The chairs notice. No bounce.';
    s.hitPieces += 2;
    s.exposure += 1;
    s.momentum = Math.max(0, s.momentum - 2);
    return 'They reverse the attack. Your file is now their mailer. Exposure up.';
  }
};

export const PL21B_PromoteCanvassCaptain: PlayCard = {
  id: 'PL21B', n: 'Promote a Canvass Captain', cost: { a: 1, vp: 3 }, risk: 'SAFE', ph: [1, 2, 3], field: true, tag: 'the field gets a spine',
  attrs: ['DIP'],
  d: 'One volunteer stops showing up as a volunteer and starts showing up as staff.',
  show: (s) => !findAlly(s, 'AL09'),
  odds: () => 0.95,
  run: (s, _o, g) => {
    // Phase 1: the captain is localized to the ground she's promoted at.
    addAlly(s, 'AL09', 3, g?.id);
    s.fieldAp = 1;
    const where = g ? ` at ${g.n}` : '';
    return `She has a route book, a phone tree, and opinions about your map. The field has a spine now${where}.`;
  }
};

export const PL39_HireFieldDirector: PlayCard = {
  id: 'PL39', n: 'Hire a Field Director', cost: { a: 1, $: 2200 }, risk: 'STD', ph: [1, 2], field: true, tag: 'professionalize',
  attrs: ['DIP'], w: 1,
  d: "A professional who has run four of these before. Money buys what volunteers can't always deliver on schedule.",
  req: (s) => !warm(s, 'AL09'),
  odds: () => 0.8,
  run: (s, o, g) => {
    if (o.tier <= 1) {
      // Phase 1: hired onto a specific ground; that's the turf she runs.
      addAlly(s, 'AL09', 3, g?.id);
      s.fieldAp = 1;
      const where = g ? ` at ${g.n}` : '';
      return `She has run four of these and lost only one. The field has a professional now${where}.`;
    }
    return 'The good ones are all hired. You get a resume stack and a headache.';
  }
};

/** archive:671–673 — See the Slate-Maker → AL16 + OB3 */
export const PL22B_SeeSlateMaker: PlayCard = {
  id: 'PL22B', n: 'See the Slate-Maker', cost: { a: 1, $: 1500 }, risk: 'STD', ph: [2, 3], tag: 'the printed word',
  attrs: ['DIP', 'CRA'],
  d: 'One man prints the card half the primary votes from. His price is never only money.',
  show: (s) => warm(s, 'AL02') && !s.slate,
  odds: () => 0.75,
  run: (s, o) => {
    if (o.tier <= 1) {
      s.slate = true;
      addAlly(s, 'AL16', 2);
      addObl(s, 'OB3');
      return "Your name goes on the card. So does his marker. (Slate-Maker's Price recorded — one future endorsement is his to spend.)";
    }
    return 'He takes the meeting, keeps the check in your hand. "Come back when the Chairwoman calls me herself."';
  }
};

/** archive:712–715 — Prayer Breakfast → AL08 at threshold */
export const PL30_PrayerBreakfast: PlayCard = {
  id: 'PL30', n: 'Prayer Breakfast', cost: { a: 1 }, risk: 'SAFE', ph: [1, 2, 3], tag: 'the corridor opens',
  attrs: ['CON', 'DIP'],
  d: 'Biscuits at six-thirty. The Corridor watches who shows before sunrise.',
  req: (s) => s.backers.includes('B02'),
  odds: () => 0.85,
  run: (s, o) => {
    s.faces.T += 2;
    s.faces.G += 2;
    const g = s.groundsArr.find(x => x.id === 'GR04');
    if (g) {
      if (s.rapStall) {
        g.rapport = Math.min(100, g.rapport + Math.ceil(4 / 2));
      } else {
        g.rapport = Math.min(100, g.rapport + Math.round(4 * (s.groundRapMult ?? 1)));
      }
    }
    s.pbCount = (s.pbCount || 0) + 1;
    // archive:715
    if (s.pbCount >= 2 && (g?.rapport ?? 0) >= 30) {
      addAlly(s, 'AL08', 3);
      if (g) g.gated = false;
      s.volPool += 2;
      if (!s.assets.includes('A13')) s.assets.push('A13');
      return 'The Pastor takes your hand in both of his. The Corridor — and its directory — open. +2 volunteers.';
    }
    void o;
    return 'Biscuits, gravy, standing. The Corridor notes attendance.';
  }
};

/** archive:720–723 — Coffee with the Editor → AL04 on tier 0 if not already */
export const PL32_CoffeeEditor: PlayCard = {
  id: 'PL32', n: 'Coffee with the Editor', cost: { a: 1 }, risk: 'STD', ph: [1, 2], tag: 'earned goodwill',
  attrs: ['DIP'], w: 2,
  d: 'Not for an endorsement — for a fair shake. The weekly decides who\'s "serious" long before the voters do.',
  odds: (s) => clamp(0.5 + (warm(s, 'AL04') ? 0.15 : 0), 0, 0.9),
  run: (s, o) => {
    if (o.tier <= 1) {
      s.nameID += 3;
      if (!findAlly(s, 'AL04') && o.tier === 0) addAlly(s, 'AL04', 2);
      return 'A cordial hour. You get the benefit of the doubt in print for a while.';
    }
    return "He's polite and noncommittal. Reporters usually are.";
  }
};

/** archive:776–779 — Court the County Judge → AL15 on tier 0 */
export const PL48_CourtCountyJudge: PlayCard = {
  id: 'PL48', n: 'Court the County Judge', cost: { a: 1 }, risk: 'VOL', ph: [2, 3], tag: 'the heaviest name',
  attrs: ['DIP'], w: 1,
  d: 'The one endorsement that moves a whole county. He gives it to winners, so look like one.',
  req: (s) => s.endorsePts >= 3,
  odds: (s) => clamp(0.35 + s.endorsePts * 0.02 + s.faces.G * 0.003, 0, 0.8),
  run: (s, o) => {
    if (o.tier === 0) {
      addAlly(s, 'AL15', 3);
      s.endorsePts += 2;
      s.nameID += 4;
      return 'The County Judge is with you. In this county, that is very nearly the ballgame.';
    }
    if (o.tier === 1) {
      s.endorsePts += 1;
      return 'A warm word, short of a formal nod. Still worth having.';
    }
    if (o.tier === 2) return '"Let\'s talk after the primary." He backs winners, and isn\'t sure yet.';
    s.faces.O -= 2;
    return 'You overplayed it. He values his independence and just reasserted it.';
  }
};

/**
 * archive:708–711 / 1547 — Attend the Funeral (CHOICE simplified to SAFE respect path).
 * Archive has a UI choice; modular grants AL06 on success (the respect path).
 * show: funeralWeek === week (set by calendar advanceAllyEvents).
 */
export const PL29_AttendFuneral: PlayCard = {
  id: 'PL29', n: 'Attend the Funeral', cost: { a: 1 }, risk: 'SAFE', ph: [1, 2, 3], tag: 'the morality lesson',
  attrs: ['CHA'],
  d: 'A beloved judge has died. You can be present, or you can be seen. Presence earns the living.',
  show: (s) => s.funeralWeek === s.week,
  odds: () => 0.95,
  run: (s) => {
    // archive fRespect path:1547 — G+=5, addAlly AL06
    s.faces.G += 5;
    addAlly(s, 'AL06', 2);
    s.funeralWeek = -1;
    return 'You sit in the back, sign the book, leave before the cameras. The living notice. (Retired Judge is with you.)';
  }
};

export const WAVE4_PLAYS: PlayCard[] = [
  PL16_RecruitVolunteers,
  PL18_SharpenMessage,
  PL20_PacCheck,
  PL21_SelfFundCredit,
  PL22_ContrastMail,
  PL21B_PromoteCanvassCaptain,
  PL39_HireFieldDirector,
  PL22B_SeeSlateMaker,
  PL30_PrayerBreakfast,
  PL32_CoffeeEditor,
  PL48_CourtCountyJudge,
  PL29_AttendFuneral
];
