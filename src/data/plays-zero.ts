/**
 * CANDIDATE ZERO — the cards you are, before the world gives you anything.
 *
 * Ten cards. Six that every candidate in Texas has ever had, and four that are
 * the specific fact of who you are. There is no generic starting deck any more
 * and there is no toolkit: you have your legs, your voice, and whatever your
 * persona dragged in with it — including the part of it that is a problem.
 *
 * THE LIABILITY IS NOT A PENALTY. It is the fourth intrinsic card and it is the
 * point. Every persona carries at least one, it sits in your hand taking up a
 * slot you needed, and the only way it leaves the deck for good is to play it —
 * expensively, at a moment you chose badly or well. That is the trashing system
 * (spec §4.3): removal is something that happens to you or something you pay
 * for, never a tidy-up button on a menu.
 *
 * Costs are deliberately small. The scarce thing is not the AP, it is the three
 * spaces on the table (engine/slots.ts) — a hand full of one-AP cards is a hand
 * that cannot answer anything.
 */

import type { GameState, Ground, PlayCard, RollResult } from '../engine/types.js';
import { random } from '../engine/rng.js';
import { bankRapport } from '../engine/reputation.js';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function rapGain(g: Ground, amt: number, state: GameState): void {
  bankRapport(g, amt, state);
}

/* ------------------------------------------------------------------ *
 * THE UNIVERSAL SIX — identical in every starting deck
 * ------------------------------------------------------------------ */

/**
 * KNOCK — the floor of the risk ladder, and a standing design invariant.
 *
 * Near-zero backfire at every depth, forever. This is the card a player can
 * always fall back on when the week has gone wrong and the good options all
 * cost something they do not have. It must never be tuned up into a real play:
 * the moment Knock can fail meaningfully, the game loses its floor.
 */
export const PL40_Knock: PlayCard = {
  id: 'PL40', n: 'Knock', cost: { a: 1 }, risk: 'SAFE', ph: [1, 2, 3], field: true,
  tag: 'the floor', attrs: ['CLO'], kind: 'action', rarity: 'common',
  residency: 'main', control: 'player',
  d:
    'One street, one afternoon, one door at a time. It is the smallest thing you can do and it ' +
    'is never nothing — a handful of contacts and a little rapport where you stood. ' +
    'It cannot go badly. That is the entire reason it exists: when the week has gone wrong and ' +
    'every good card wants money you do not have, this one still works.',
  odds: () => 0.97,
  run: (s, o, g) => {
    const c = 5 + Math.floor(random() * 5);
    s.contacts += c;
    if (g) rapGain(g, o.tier <= 1 ? 2 : 1, s);
    if (o.tier <= 1) return `Twenty-odd doors, four real conversations. +${c} contacts.`;
    return `Nobody home on most of the street. +${c} contacts anyway.`;
  }
};

export const PL41_Ask: PlayCard = {
  id: 'PL41', n: 'Ask', cost: { a: 1 }, risk: 'STD', ph: [1, 2, 3],
  tag: 'no reason to say yes', attrs: ['DIP'], kind: 'action', rarity: 'common',
  residency: 'main', control: 'player',
  d:
    'You want something small from somebody who owes you nothing. A list, an introduction, ' +
    'the loan of a folding table. Sometimes people are kind for no reason. ' +
    'Sometimes they tell the person you were going to ask next.',
  odds: s => clamp(0.42 + s.nameID * 0.004 + s.faces.G * 0.002, 0, 0.8),
  run: (s, o) => {
    if (o.tier === 0) {
      s.favors += 1;
      s.contacts += 12;
      return 'He says yes before you finish the sentence, and hands you a phone number. +1 favor, +12 contacts.';
    }
    if (o.tier === 1) { s.contacts += 8; return 'A qualified yes. +8 contacts.'; }
    if (o.tier === 2) return 'He will "think about it," which is a no with manners.';
    s.faces.O = clamp((s.faces.O || 0) - 2, -50, 100);
    return 'You asked the wrong person, and he tells the right one that you are desperate.';
  }
};

export const PL42_Speak: PlayCard = {
  id: 'PL42', n: 'Speak', cost: { a: 1 }, risk: 'STD', ph: [1, 2, 3],
  tag: 'whoever is in front of you', attrs: ['CHA'], kind: 'action', rarity: 'common',
  residency: 'main', control: 'player',
  d:
    'Not a speech. Eleven people in a fellowship hall, or four at a folding table, or the ' +
    'checkout line if that is what today gave you. You say the thing you came to say. ' +
    'It travels further when you have already said it well somewhere else.',
  odds: s => clamp(0.45 + s.momentum * 0.02 + (s.messageSharp ? 0.12 : 0), 0, 0.85),
  run: (s, o) => {
    if (o.tier === 0) {
      s.nameID += 3; s.momentum += 1; s.contacts += 10;
      return 'You land it. Somebody repeats your line back to you at the door. +3 name ID, momentum, +10 contacts.';
    }
    if (o.tier === 1) { s.nameID += 1; s.contacts += 6; return 'Polite, attentive, forgettable by Thursday. +1 name ID, +6 contacts.'; }
    if (o.tier === 2) return 'You talk for too long about the wrong part of it.';
    s.momentum = Math.max(0, s.momentum - 1);
    return 'You lose the thread in front of people who came to hear you find it. Momentum −1.';
  }
};

export const PL43_ShowUp: PlayCard = {
  id: 'PL43', n: 'Show Up', cost: { a: 1 }, risk: 'STD', ph: [1, 2, 3],
  tag: 'you were not invited', attrs: ['CON'], kind: 'action', rarity: 'common',
  residency: 'main', control: 'player',
  d:
    'A ribbon cutting, a sale barn, a funeral you have no business at, the back of a meeting ' +
    'where the agenda does not have your name on it. Being in the room is not nothing in Texas. ' +
    'Being in the wrong room is also not nothing.',
  odds: s => clamp(0.5 + s.districtStanding * 0.002 + s.faces.O * 0.003, 0, 0.82),
  run: (s, o) => {
    if (o.tier === 0) {
      s.contacts += 14; s.faces.O = clamp((s.faces.O || 0) + 3, -50, 100); s.nameID += 2;
      return 'Somebody who matters notices you stayed to stack chairs. +14 contacts, +2 name ID.';
    }
    if (o.tier === 1) { s.contacts += 7; return 'You shook eleven hands and nobody asked who you were. +7 contacts.'; }
    if (o.tier === 2) return 'You stood at the back for ninety minutes. That is the whole story.';
    s.faces.O = clamp((s.faces.O || 0) - 3, -50, 100);
    return 'You are asked, politely and in front of everyone, who invited you.';
  }
};

export const PL44_Endure: PlayCard = {
  id: 'PL44', n: 'Endure', cost: { a: 1 }, risk: 'SAFE', ph: [1, 2, 3],
  tag: 'take it and keep going', attrs: ['CON'], kind: 'action', rarity: 'common',
  residency: 'main', control: 'player',
  d:
    'You do not answer it. You do not sue. You take the hit and you make it a smaller problem ' +
    'later instead of a big one now. Clears a hit piece and settles exposure, and costs you a ' +
    'little of the momentum you were spending on being liked.',
  odds: () => 0.9,
  run: (s, o) => {
    if (s.hitPieces > 0) {
      s.hitPieces -= 1;
      s.exposure = Math.max(0, s.exposure - 0.1);
      // The hit does not vanish — it becomes a smaller, later problem.
      s.faces.P = clamp((s.faces.P || 0) - 1, -50, 100);
      return 'You let it run without an answer. It dies on page four instead of leading. One hit piece absorbed.';
    }
    if (o.tier <= 1) {
      s.exposure = Math.max(0, s.exposure - 0.15);
      return 'Nothing is coming at you this week. You use the quiet to close a door you left open. Exposure down.';
    }
    return 'You brace for something that does not arrive.';
  }
};

/** The six every starting deck carries. Knock ×2 — the floor is doubled. */
export const ZERO_UNIVERSAL_IDS: string[] = ['PL40', 'PL40', 'PL41', 'PL42', 'PL43', 'PL44'];

/* ------------------------------------------------------------------ *
 * THE BLOCKWALKER — stamina, an authentic voice, ground credibility
 * ------------------------------------------------------------------ */

export const PL45_Legs: PlayCard = {
  id: 'PL45', n: 'Legs', cost: { a: 1 }, risk: 'SAFE', ph: [1, 2, 3],
  tag: 'more afternoons than anyone', attrs: ['CON'], kind: 'action', rarity: 'common',
  residency: 'main', control: 'player',
  d:
    'You can do this all day and the other candidates cannot. Buys turf action back — ' +
    'more of the small stuff, which is the only stuff you have. ' +
    'It does not make any single afternoon better. It makes there be more afternoons.',
  odds: () => 0.93,
  run: (s, o) => {
    const gain = o.tier <= 1 ? 2 : 1;
    s.fieldAp += gain;
    return `You are back out before the shade moves. +${gain} turf action this week.`;
  }
};

export const PL46_DoorstepRead: PlayCard = {
  id: 'PL46', n: 'Doorstep Read', cost: { a: 1 }, risk: 'SAFE', ph: [1, 2, 3], field: true,
  tag: 'what the street is actually saying', attrs: ['CLO'], kind: 'action', rarity: 'common',
  residency: 'main', control: 'player',
  d:
    'Nobody polls this district. You know what is wrong on this street because a woman in a ' +
    'housecoat told you for eleven minutes. Sharpens the message off direct contact — ' +
    'the one kind of information you can afford.',
  odds: () => 0.88,
  run: (s, o, g) => {
    if (o.tier <= 1) {
      s.messageSharp = true;
      if (g) rapGain(g, 2, s);
      return 'Three doors say the same thing about the same road. Now you know what you are running on.';
    }
    s.contacts += 4;
    return 'Everybody is polite and nobody tells you anything. +4 contacts.';
  }
};

export const PL47_NeighborsWord: PlayCard = {
  id: 'PL47', n: "Neighbor's Word", cost: { a: 1 }, risk: 'STD', ph: [1, 2, 3], field: true,
  tag: 'one small credibility token', attrs: ['CLO'], kind: 'action', rarity: 'common',
  residency: 'main', control: 'player',
  d:
    'Somebody on the block will say your name to somebody else on the block. That is the ' +
    'entire asset and it is worth more than a mailer on this street. ' +
    'Real rapport where you are standing, and it does not travel.',
  odds: s => clamp(0.55 + (s.groundRapMult ?? 1) * 0.05, 0, 0.85),
  run: (s, o, g) => {
    if (!g) return 'No ground selected.';
    if (o.tier === 0) { rapGain(g, 6, s); s.contacts += 10; return `She walks you to the next two houses herself. Rapport at ${g.n}, +10 contacts.`; }
    if (o.tier <= 2) { rapGain(g, 3, s); return `"He's all right." Rapport at ${g.n}.`; }
    return 'She says she does not get involved, and she means it.';
  }
};

/**
 * BLISTER — the Blockwalker's liability.
 *
 * The body is the whole campaign, so the body is the whole vulnerability. It
 * costs turf action every week it sits in your hand and it will not leave until
 * you spend a real week off your feet.
 */
export const PL49_Blister: PlayCard = {
  id: 'PL49', n: 'Blister', cost: { a: 2 }, risk: 'SAFE', ph: [1, 2, 3],
  tag: 'liability — the body is the campaign', attrs: ['CON'], kind: 'liability', rarity: 'common',
  residency: 'main', control: 'player',
  d:
    'Two miles of hot asphalt in the wrong boots and now every afternoon costs more than it did. ' +
    'While this is in your hand you have less turf action, every week. ' +
    'Two actions and a week of staying off it and it is gone from the deck for good — ' +
    'which is the only way anything leaves this deck.',
  odds: () => 0.85,
  run: (s, o) => {
    if (o.tier <= 2) {
      s.contacts += 3;
      return 'A week of phone calls with your foot up. It heals. The boots go in the trash, not you.';
    }
    s.fieldAp = Math.max(0, s.fieldAp - 1);
    return 'You go back out too early and set yourself back a week.';
  }
};

/* ------------------------------------------------------------------ *
 * THE BELIEVER — conviction, a cause, volunteers
 * ------------------------------------------------------------------ */

export const PL50_Cause: PlayCard = {
  id: 'PL50', n: 'Cause', cost: { a: 1 }, risk: 'SAFE', ph: [1, 2, 3],
  tag: 'the reason you filed', attrs: ['CON'], kind: 'action', rarity: 'common',
  residency: 'main', control: 'player',
  d:
    'You are not doing this to be a state representative. You are doing it because of a specific ' +
    'thing that happened to a specific person. Recurring conviction: momentum and true-believer ' +
    'ground, every time, because you have not gotten tired of saying it.',
  odds: () => 0.92,
  run: (s, o) => {
    s.momentum += o.tier <= 1 ? 2 : 1;
    s.faces.T = clamp((s.faces.T || 0) + 4, -50, 100);
    if (o.tier <= 1) { s.volPool += 1; return 'You say it plainly and somebody signs up on the spot. Momentum, true believers, +1 volunteer.'; }
    return 'You say it again. The people who already agree agree harder.';
  }
};

export const PL51_TheFaithful: PlayCard = {
  id: 'PL51', n: 'The Faithful', cost: { a: 1 }, risk: 'VOL', ph: [1, 2, 3],
  tag: 'unpaid and unreliable', attrs: ['CHA'], kind: 'ally', rarity: 'common',
  residency: 'main', control: 'player',
  d:
    'Nine people who believe, of whom four will show up, of whom two can be trusted with a list. ' +
    'Free labor is worth exactly what you pay for it and it is still more than your opponent ' +
    'has at this stage. High ceiling, real floor — sometimes nobody comes.',
  odds: s => clamp(0.5 + s.faces.T * 0.004, 0, 0.85),
  run: (s, o) => {
    if (o.tier === 0) { s.volPool += 3; s.contacts += 18; return 'All nine come, and they bring a folding table. +3 volunteers, +18 contacts.'; }
    if (o.tier === 1) { s.volPool += 2; s.contacts += 9; return 'Four show. Four is enough for a Saturday. +2 volunteers, +9 contacts.'; }
    if (o.tier === 2) { s.volPool += 1; return 'One earnest kid with a clipboard. +1 volunteer.'; }
    s.volPool = Math.max(0, s.volPool - 1);
    return 'Nobody comes. The literature sits in your trunk in the heat and you do the street alone.';
  }
};

export const PL52_PlainTruth: PlayCard = {
  id: 'PL52', n: 'Plain Truth', cost: { a: 2 }, risk: 'VOL', ph: [1, 2, 3],
  tag: 'says it, costs it', attrs: ['CON'], kind: 'action', rarity: 'common',
  residency: 'main', control: 'player',
  d:
    'You say the true thing in the room where everyone had agreed not to. It moves people ' +
    'and it ends relationships, both immediately. Large name ID and true-believer ground; ' +
    'it burns the old guard and it will cost you an ally who was on the fence.',
  odds: s => clamp(0.55 + s.faces.T * 0.003, 0, 0.85),
  run: (s, o) => {
    if (o.tier === 0) {
      s.nameID += 8; s.momentum += 2;
      s.faces.T = clamp((s.faces.T || 0) + 8, -50, 100);
      s.faces.O = clamp((s.faces.O || 0) - 6, -50, 100);
      return 'The room goes quiet and then somebody claps. +8 name ID, momentum. The courthouse heard it too.';
    }
    if (o.tier <= 2) {
      s.nameID += 3;
      s.faces.O = clamp((s.faces.O || 0) - 4, -50, 100);
      return 'You say it. It lands about half as well as it did in your head. +3 name ID, and they remember.';
    }
    s.hitPieces += 1;
    s.faces.O = clamp((s.faces.O || 0) - 8, -50, 100);
    return 'It is quoted back to you out of context for the rest of the cycle. A hit piece, and doors close.';
  }
};

/**
 * RIGIDITY — the Believer's liability.
 *
 * You cannot trade while this is in your hand. Bargains, favor-spending and the
 * whole compromise vocabulary are shut off — see engine/liabilities.ts, which
 * reads the hand, not the deck. It leaves only when you play it: an actual,
 * costed act of bending.
 */
export const PL53_Rigidity: PlayCard = {
  id: 'PL53', n: 'Rigidity', cost: { a: 2, m: 1 }, risk: 'STD', ph: [1, 2, 3],
  tag: 'liability — will not bend', attrs: ['CON'], kind: 'liability', rarity: 'common',
  residency: 'main', control: 'player',
  d:
    'The thing that makes people believe you is the thing that makes you impossible to deal with. ' +
    'While this is in your hand you cannot trade: no bargains, no favors spent, no deals. ' +
    'Playing it is the compromise — it costs momentum and the certainty you were running on, ' +
    'and then it is out of the deck for good.',
  odds: () => 0.8,
  run: (s, o) => {
    if (o.tier <= 2) {
      s.faces.T = clamp((s.faces.T || 0) - 4, -50, 100);
      s.faces.O = clamp((s.faces.O || 0) + 4, -50, 100);
      return 'You take the meeting you swore you would not take. The base notices. So does the courthouse.';
    }
    s.momentum = Math.max(0, s.momentum - 2);
    s.faces.T = clamp((s.faces.T || 0) - 6, -50, 100);
    return 'You bend badly and in public, and get nothing for it. Momentum −2.';
  }
};

/* ------------------------------------------------------------------ *
 * THE JUNIOR STAFFER — procedure, and no standing to use it
 * ------------------------------------------------------------------ */

export const PL54_Procedure: PlayCard = {
  id: 'PL54', n: 'Procedure', cost: { a: 1 }, risk: 'SAFE', ph: [1, 2, 3],
  tag: 'you know the rule', attrs: ['INK'], kind: 'action', rarity: 'common',
  residency: 'main', control: 'player',
  d:
    'You have read the filing calendar, the local government code section that applies, and the ' +
    'part everybody skips. Knowing the rule that governs the room is worth an afternoon of ' +
    'charm — signatures move, deadlines stop being a surprise.',
  odds: () => 0.9,
  run: (s, o) => {
    if (o.tier <= 1) {
      if (!s.ballot && s.signatures < s.sigNeed) { s.signatures += 12; return 'You find the provision that lets you gather where you were told you could not. +12 signatures.'; }
      s.parlSave = true;
      return 'You know which rule applies and when to raise it. That keeps for later.';
    }
    s.contacts += 3;
    return 'You are right about the rule and nobody in the room cares. +3 contacts.';
  }
};

export const PL55_BackHallway: PlayCard = {
  id: 'PL55', n: 'Back Hallway', cost: { a: 1 }, risk: 'STD', ph: [1, 2, 3],
  tag: 'access without standing', attrs: ['CRA'], kind: 'action', rarity: 'common',
  residency: 'main', control: 'player',
  d:
    'You know which door is unlocked, which elevator the members use, and what time the staff ' +
    'goes to lunch. You can get in anywhere. Nobody in there has any reason to talk to you, ' +
    'but you will hear things.',
  odds: () => 0.7,
  run: (s, o) => {
    if (o.tier === 0) {
      s.contacts += 15;
      s.faces.O = clamp((s.faces.O || 0) + 4, -50, 100);
      s.oppoFile = true;
      return 'You are standing there when the wrong thing is said out loud. +15 contacts, and you know something now.';
    }
    if (o.tier <= 2) { s.contacts += 8; s.faces.O = clamp((s.faces.O || 0) + 2, -50, 100); return 'Two staffers, a vending machine, and something useful. +8 contacts.'; }
    s.exposure += 0.1;
    return 'Somebody asks whose staff you are, and you do not have a good answer any more.';
  }
};

export const PL56_TheBosssName: PlayCard = {
  id: 'PL56', n: "The Boss's Name", cost: { a: 1 }, risk: 'STD', ph: [1, 2, 3],
  tag: 'borrowed, and spent', attrs: ['DIP'], kind: 'action', rarity: 'common',
  residency: 'main', control: 'player',
  d:
    'You can say whose office you came from and the room re-sorts itself. It is real authority ' +
    'and none of it is yours. CONSUMABLE — it works once and then it is out of the deck, ' +
    'because the second time somebody checks.',
  odds: () => 0.85,
  run: (s, o) => {
    if (o.tier <= 1) {
      s.faces.O = clamp((s.faces.O || 0) + 8, -50, 100);
      s.contacts += 20; s.nameID += 3; s.favors += 1;
      return 'The door opens on a name that is not yours. +20 contacts, +3 name ID, +1 favor. You cannot do that again.';
    }
    if (o.tier === 2) { s.contacts += 8; return 'It gets you a chair and a cup of coffee. +8 contacts. Spent.'; }
    s.faces.O = clamp((s.faces.O || 0) - 6, -50, 100);
    s.exposure += 0.15;
    return 'Somebody picks up the phone and checks. It goes back to the office by Tuesday.';
  }
};

/**
 * NO STANDING — the Junior Staffer's liability.
 *
 * Plays that rest on the player's own credibility fail while this is in hand
 * (engine/liabilities.ts). You know exactly how the building works and the
 * building does not know who you are.
 */
export const PL57_NoStanding: PlayCard = {
  id: 'PL57', n: 'No Standing', cost: { a: 2 }, risk: 'STD', ph: [1, 2, 3],
  tag: 'liability — nobody knows your name', attrs: ['CON'], kind: 'liability', rarity: 'common',
  residency: 'main', control: 'player',
  d:
    'You have been in every one of these rooms and never once as yourself. While this is in your ' +
    'hand, anything that runs on your own credibility fails — you are still staff to them. ' +
    'Playing it is the first time you speak in a room under your own name, and it is expensive ' +
    'and it does not go well. Then it is gone.',
  odds: s => clamp(0.45 + s.nameID * 0.006, 0, 0.8),
  run: (s, o) => {
    if (o.tier <= 1) {
      s.nameID += 5;
      s.faces.O = clamp((s.faces.O || 0) - 2, -50, 100);
      return 'You say it as the candidate, not the staffer. It is awkward and it is yours. +5 name ID.';
    }
    if (o.tier === 2) { s.nameID += 2; return 'Somebody calls you by your old boss\'s name. You correct them. +2 name ID.'; }
    s.faces.O = clamp((s.faces.O || 0) - 4, -50, 100);
    return 'You speak up and the room waits, politely, for the person you work for to finish.';
  }
};

/* ------------------------------------------------------------------ *
 * THE FADED NAME — a surname, a little money, no reason to be taken seriously
 * ------------------------------------------------------------------ */

export const PL58_TheSurname: PlayCard = {
  id: 'PL58', n: 'The Surname', cost: { a: 1 }, risk: 'STD', ph: [1, 2, 3],
  tag: 'opens one door, once', attrs: ['DIP'], kind: 'action', rarity: 'common',
  residency: 'main', control: 'player',
  d:
    'Your father built the hospital wing, or your grandfather had the Ford dealership and two ' +
    'terms in the House. People still know the name. CONSUMABLE — it opens one door and ' +
    'everyone in the room notices you needed to use it.',
  odds: () => 0.8,
  run: (s, o) => {
    if (o.tier <= 1) {
      s.faces.O = clamp((s.faces.O || 0) + 10, -50, 100);
      s.nameID += 8; s.contacts += 15;
      s.faces.T = clamp((s.faces.T || 0) - 3, -50, 100);
      return 'The name still works on the people it was built on. +8 name ID, +15 contacts — and the base saw you spend it.';
    }
    if (o.tier === 2) { s.nameID += 3; return 'They remember the name and not fondly enough to help. +3 name ID.'; }
    s.faces.O = clamp((s.faces.O || 0) - 5, -50, 100);
    return '"You are not your daddy." Said kindly, which is worse.';
  }
};

export const PL59_OldMoney: PlayCard = {
  id: 'PL59', n: 'Old Money', cost: { a: 1 }, risk: 'SAFE', ph: [1, 2, 3],
  tag: 'finite and not coming back', attrs: ['CRA'], kind: 'item', rarity: 'common',
  residency: 'main', control: 'player',
  d:
    'What is left after the land was sold and split three ways. It is real money and there is ' +
    'not much of it and there will never be any more. NON-RENEWING — it pays out smaller every ' +
    'time you go back to it, because that is what a finite thing does.',
  odds: () => 0.95,
  run: (s, o) => {
    s.sessionFlags = s.sessionFlags || {};
    const taken = Number(s.sessionFlags.oldMoneyDraws || 0);
    const amt = Math.max(150, Math.round(1400 / (taken + 1)));
    s.money += amt;
    s.sessionFlags.oldMoneyDraws = taken + 1;
    if (taken === 0) return `You write the first check yourself. +$${amt}.`;
    if (taken < 3) return `Less this time. There is always less. +$${amt}.`;
    return `You are down to what was in the coffee can. +$${amt}.`;
  }
};

export const PL60_SomeoneWhoRemembers: PlayCard = {
  id: 'PL60', n: 'Someone Who Remembers', cost: { a: 1 }, risk: 'STD', ph: [1, 2, 3],
  tag: 'one dormant contact', attrs: ['DIP'], kind: 'ally', rarity: 'common',
  residency: 'main', control: 'player',
  d:
    'An old man who worked a campaign for your family in 1978 and has not been asked for ' +
    'anything since. He is not connected any more. He knows who is, and he will pick up ' +
    'the phone for the name.',
  odds: () => 0.72,
  run: (s, o) => {
    if (o.tier <= 1) {
      s.contacts += 20; s.favors += 1;
      s.faces.O = clamp((s.faces.O || 0) + 5, -50, 100);
      return 'He makes two calls from a kitchen phone and something opens. +20 contacts, +1 favor.';
    }
    if (o.tier === 2) { s.contacts += 8; return 'An hour of stories about 1978 and one usable number. +8 contacts.'; }
    return 'The number is disconnected. You find out why from somebody else.';
  }
};

/**
 * EXPECTATIONS — the Faded Name's liability.
 *
 * The room assumes you are competent because of the surname, and reacts badly
 * to finding out otherwise. Playing it is the public correction.
 */
export const PL61_Expectations: PlayCard = {
  id: 'PL61', n: 'Expectations', cost: { a: 2 }, risk: 'VOL', ph: [1, 2, 3],
  tag: 'liability — they assume you can', attrs: ['CHA'], kind: 'liability', rarity: 'common',
  residency: 'main', control: 'player',
  d:
    'Everybody assumes you know how to do this, because of who you are. You do not. ' +
    'While this is in your hand the room keeps handing you things you cannot carry, and ' +
    'noticing. Playing it is the moment you admit it out loud — badly, and in front of people, ' +
    'and then it is gone from the deck.',
  odds: () => 0.6,
  run: (s, o) => {
    if (o.tier === 0) {
      s.faces.G = clamp((s.faces.G || 0) + 6, -50, 100);
      s.nameID += 3;
      return 'You say you are learning, and mean it, and a room full of people decides to like you. +3 name ID.';
    }
    if (o.tier <= 2) {
      s.faces.O = clamp((s.faces.O || 0) - 3, -50, 100);
      return 'You are asked a question you should be able to answer, and you do not pretend. It costs you the room.';
    }
    s.hitPieces += 1;
    s.faces.O = clamp((s.faces.O || 0) - 6, -50, 100);
    return 'It happens in front of a reporter, and the clip is nineteen seconds long.';
  }
};

/** Every ZERO intrinsic card, for catalog registration. */
export const ZERO_PLAYS: PlayCard[] = [
  PL40_Knock, PL41_Ask, PL42_Speak, PL43_ShowUp, PL44_Endure,
  PL45_Legs, PL46_DoorstepRead, PL47_NeighborsWord, PL49_Blister,
  PL50_Cause, PL51_TheFaithful, PL52_PlainTruth, PL53_Rigidity,
  PL54_Procedure, PL55_BackHallway, PL56_TheBosssName, PL57_NoStanding,
  PL58_TheSurname, PL59_OldMoney, PL60_SomeoneWhoRemembers, PL61_Expectations
];

/**
 * The four intrinsic cards per starting persona. Every list ends in a liability
 * — that is a hard invariant, asserted by harness:zero-start.
 */
export const PERSONA_INTRINSIC: Record<string, string[]> = {
  blockwalker: ['PL45', 'PL46', 'PL47', 'PL49'],
  believer: ['PL50', 'PL51', 'PL52', 'PL53'],
  staffer: ['PL54', 'PL55', 'PL56', 'PL57'],
  fadedname: ['PL58', 'PL59', 'PL60', 'PL61']
};

/** Liability ids — the cards that leave the deck only by being played. */
export const ZERO_LIABILITY_IDS = new Set(['PL49', 'PL53', 'PL57', 'PL61']);

/** Consumable intrinsics — one use, then out of the deck. */
export const ZERO_CONSUMABLE_IDS = new Set(['PL56', 'PL58']);

/** The full starting ten for a persona: the universal six plus their four. */
export function zeroStarterDeck(personaId: string): string[] {
  const intrinsic = PERSONA_INTRINSIC[personaId];
  if (!intrinsic) return [];
  return [...ZERO_UNIVERSAL_IDS, ...intrinsic];
}
