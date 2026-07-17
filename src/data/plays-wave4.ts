/**
 * Wave 4 Plays — force multipliers + honest traps
 * Grounded in archive prototype ACTIONS (volun, message, pac, selffund)
 * plus Contrast Mail (spends Oppo File).
 */

import { random } from '../engine/rng.js';
import { addAlly, findAlly, warm } from '../engine/reputation.js';
import type { PlayCard } from '../engine/types.js';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function R(n: number): number {
  return random() * n;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)]!;
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
  id: 'PL20', n: 'Take the PAC Check', cost: { a: 1 }, risk: 'STD', ph: [1, 2, 3], tag: 'RISK — the string is real',
  attrs: ['CRA', 'DIP'],
  trap: true,
  d: 'A man in a good suit admires your race. The check is real. So is the string tied to it.',
  show: (s) => s.tier >= 1,
  odds: () => 0.9,
  run: (s, o) => {
    if (o.tier === 3) {
      s.hitPieces++;
      return 'The check bounces into the news instead of your account. "WHO IS FUNDING CANDIDATE?"';
    }
    const m = 2500 + Math.floor(R(2000));
    s.money += m;
    s.faces.L -= 12;
    const topic = pick(['tort matters', 'land use', 'rate regulation', 'licensing']);
    if (!s.obls.includes('OB1')) s.obls.push('OB1');
    return `+$${m}. The Third House has opened an account in your name. (PAC String OB1 — weekly drag. Topic: ${topic}.)`;
  }
};

export const PL21_SelfFundCredit: PlayCard = {
  id: 'PL21', n: 'Self-Fund on Credit', cost: { a: 1 }, risk: 'SAFE', ph: [1, 2], tag: 'RISK — the note remembers',
  attrs: ['CRA'],
  trap: true,
  d: "The bank will lend against the homestead. Campaigns have eaten better men's farms.",
  odds: () => 0.95,
  run: (s) => {
    const m = 3000;
    s.money += m;
    s.debt += Math.floor(m * 1.4);
    s.faces.G -= 8;
    if (!s.obls.includes('OB2')) s.obls.push('OB2');
    return `+$${m} now; $${Math.floor(m * 1.4)} owed later, win or lose. (Bank Note OB2 — weekly drag. Homestead is leverage.)`;
  }
};

export const PL22_ContrastMail: PlayCard = {
  id: 'PL22', n: 'Contrast Mail', cost: { a: 1, $: 800 }, risk: 'VOL', ph: [2, 3], tag: 'the folder spent',
  attrs: ['CRA', 'INK'],
  d: 'What the quiet man found, printed on cheap stock and mailed to every primary voter who votes.',
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
  run: (s) => {
    addAlly(s, 'AL09', 3);
    s.fieldAp = 1;
    return 'She has a route book, a phone tree, and opinions about your map. The field has a spine now.';
  }
};

export const PL39_HireFieldDirector: PlayCard = {
  id: 'PL39', n: 'Hire a Field Director', cost: { a: 1, $: 2200 }, risk: 'STD', ph: [1, 2], field: true, tag: 'professionalize',
  attrs: ['DIP'], w: 1,
  d: "A professional who has run four of these before. Money buys what volunteers can't always deliver on schedule.",
  req: (s) => !warm(s, 'AL09'),
  odds: () => 0.8,
  run: (s, o) => {
    if (o.tier <= 1) {
      addAlly(s, 'AL09', 3);
      s.fieldAp = 1;
      return 'She has run four of these and lost only one. The field has a professional now.';
    }
    return 'The good ones are all hired. You get a resume stack and a headache.';
  }
};

export const WAVE4_PLAYS: PlayCard[] = [
  PL16_RecruitVolunteers,
  PL18_SharpenMessage,
  PL20_PacCheck,
  PL21_SelfFundCredit,
  PL22_ContrastMail,
  PL21B_PromoteCanvassCaptain,
  PL39_HireFieldDirector
];
