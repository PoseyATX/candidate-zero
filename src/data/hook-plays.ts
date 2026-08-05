/**
 * CANDIDATE ZERO — Calling in what you are owed.
 *
 * The cards that cash a Hook. See engine/hooks.ts for why the registry exists;
 * the short version is that the career was a ladder with a memory. The campaign
 * fed the chamber and nothing came back.
 *
 * **These are the first of many.** The hook registry does not care who offers —
 * members do today; statutes, rivals, the machine and the world are all meant to
 * offer into the same list. Adding a source means writing the offer and a card
 * that consumes it, and nothing in the engine changes.
 *
 * The favour a member does you depends on who they are, because "an ally gives
 * +N" is the stat-bonus-wearing-a-hat problem this project has already measured
 * at 61% of the corpus. A diplomat spends their name. A charmer works their own
 * county. Everybody else tells you the truth, which is rarer than either.
 */

import type { PlayCard } from '../engine/types.js';
import { hooksOfKind, takeHook } from '../engine/hooks.js';
import { MEMBER_BY_ID } from './members.js';
import { addObl, oblName } from './obligations.js';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** The member hook this card would cash, matched by the favour they offered. */
function hookFor(
  s: Parameters<NonNullable<PlayCard['show']>>[0],
  opensTo: 'DIP' | 'CHA' | 'other'
) {
  return hooksOfKind(s, 'member').find(h => {
    const m = MEMBER_BY_ID[h.source];
    if (!m) return false;
    return opensTo === 'other' ? m.opensTo !== 'DIP' && m.opensTo !== 'CHA' : m.opensTo === opensTo;
  });
}

/**
 * HK01 — Borrow His Name.
 *
 * The endorsement economy, but from somebody who owes you personally rather than
 * a body with letterhead. Free, because the cost was paid two years ago in a
 * bill you did not strip.
 */
export const HK01_BorrowHisName: PlayCard = {
  id: 'HK01',
  n: 'Borrow His Name',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'a debt from the last session',
  attrs: ['DIP'],
  d:
    'A member who owes you says your name in rooms you are not in. ' +
    'Costs one action and nothing else — the price was paid two years ago, in a bill you did not strip. ' +
    'Name ID, endorsement weight, and a gust of momentum, safely. ' +
    'Diplomacy is the attribute. ' +
    'This is what a record is FOR: the favour economy runs backwards as well as forwards.',
  show: s => !!hookFor(s, 'DIP'),
  odds: () => 0.95,
  run: s => {
    const h = hookFor(s, 'DIP');
    if (!h) return 'Nobody owes you that particular favour.';
    takeHook(s, h.id);
    const m = MEMBER_BY_ID[h.source]!;
    s.nameID += 8;
    s.endorsePts += 2;
    s.momentum += 1;
    return (
      `${m.name} of ${m.county} makes three calls and mentions you in each one. ` +
      `+8 name ID, +2 endorsement points, momentum. ` +
      `He does not ask for anything, which is how you know the ledger is now even.`
    );
  }
};

/**
 * HK02 — He Works His Own County.
 *
 * The most valuable thing a sitting member has is not their vote, it is the list
 * from their own first race and the people on it who still answer.
 */
export const HK02_WorksHisCounty: PlayCard = {
  id: 'HK02',
  n: 'She Works Her Own County',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'the list from her first race',
  attrs: ['CHA'],
  d:
    'A member who owes you turns out their own county on your behalf — the list from their ' +
    'first race, and the people on it who still answer the phone. ' +
    'One action, no money. Big rapport and contacts on THEIR ground specifically, ' +
    'not spread thinly across the map. ' +
    'Charm is the attribute and it is SAFE. ' +
    'The single most efficient turf play in the game, and you cannot buy it — only earn it.',
  show: s => !!hookFor(s, 'CHA'),
  odds: () => 0.95,
  run: s => {
    const h = hookFor(s, 'CHA');
    if (!h) return 'Nobody owes you that particular favour.';
    takeHook(s, h.id);
    const m = MEMBER_BY_ID[h.source]!;
    const g = s.groundsArr.find(x => x.id === h.ground);
    if (g) {
      g.rapport = clamp((g.rapport || 0) + 20, 0, 100);
      g.gotv = (g.gotv || 0) + 0.08;
    }
    s.contacts += 60;
    s.volPool += 1;
    return (
      `${m.name} spends a Saturday on the phone for you in ${m.county}. ` +
      `Rapport +20 and turnout banked on ${g?.n ?? 'her ground'}, +60 contacts, and a volunteer ` +
      `who has done this before. Her people, lent to you.`
    );
  }
};

/**
 * HK03 — Tell Me the Truth About a County.
 *
 * Intelligence, which is the rarest favour. A member who has counted this
 * district for years telling you where you actually stand — including when the
 * answer is that you are wasting your time.
 */
export const HK03_TellMeTheTruth: PlayCard = {
  id: 'HK03',
  n: 'Tell Me the Truth About a County',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'a real count, honestly given',
  attrs: ['CRA'],
  d:
    'A member who owes you sits down and tells you where you actually stand in a county — ' +
    'including, if it is true, that you are wasting your time there. ' +
    'One action. Sharpens your message and marks the ground so your next field play there lands harder. ' +
    'Craft is the attribute. ' +
    'The rarest favour in the building: everybody will tell you what they think you want to hear, ' +
    'and almost nobody will do this.',
  show: s => !!hookFor(s, 'other'),
  odds: () => 0.95,
  run: s => {
    const h = hookFor(s, 'other');
    if (!h) return 'Nobody owes you that particular favour.';
    takeHook(s, h.id);
    const m = MEMBER_BY_ID[h.source]!;
    s.messageSharp = true;
    const g = s.groundsArr.find(x => x.id === h.ground);
    if (g) g.rapport = clamp((g.rapport || 0) + 8, 0, 100);
    // A real count also tells you where NOT to go — the rival's turf, named.
    const worst = s.groundsArr.slice().sort((a, b) => (b.rivalRap || 0) - (a.rivalRap || 0))[0];
    return (
      `${m.name} of ${m.county} takes forty minutes and a napkin and tells you the truth. ` +
      `Your message sharpens${g ? `, ${g.n} warms` : ''}` +
      `${worst && (worst.rivalRap || 0) > 0 ? `, and he says plainly that ${worst.n} is gone and you should stop paying for it` : ''}. ` +
      `Nobody else in this race is getting this conversation.`
    );
  }
};

/**
 * HK04 — The Program Works.
 *
 * The statute source. "Bill is filed and means nothing" was the fair complaint;
 * a law that only pays out as a quiet standing bonus is a trophy with a number
 * on it. This is the people it actually helped, organizing, on the ground it
 * actually serves — and they do it because of a specific thing you passed,
 * which the card names.
 */
export const HK04_TheProgramWorks: PlayCard = {
  id: 'HK04',
  n: 'The Program Works',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'something you passed, still working',
  attrs: ['CRA'],
  d:
    'The people a statute of yours actually helped turn out for you, on the ground it serves. ' +
    'One action, no money, no risk. Rapport, turnout and contacts where your record is a fact ' +
    'rather than a claim. ' +
    'Craft is the attribute. ' +
    'This is what a law is FOR beyond the standing bonus: a program with nobody organized around it ' +
    'is just paper in Austin, and a program with people around it is a firewall.',
  show: s => hooksOfKind(s, 'statute').length > 0,
  odds: () => 0.95,
  run: s => {
    const h = hooksOfKind(s, 'statute')[0];
    if (!h) return 'No statute of yours is working on anybody right now.';
    takeHook(s, h.id);
    const g = s.groundsArr.find(x => x.id === h.ground);
    if (g) {
      g.rapport = clamp((g.rapport || 0) + 14, 0, 100);
      g.gotv = (g.gotv || 0) + 0.05;
    }
    s.contacts += 35;
    s.districtStanding += 2;
    return (
      `${h.n} show up without being asked. ` +
      `+14 rapport and turnout banked on ${g?.n ?? 'the ground it serves'}, +35 contacts, +2 district standing. ` +
      `Nobody had to be persuaded of anything. They already got the money.`
    );
  }
};

/**
 * HK05 — The Ask Behind the Ask.
 *
 * The trap. Every hook before this one is a gift; that is only half of how the
 * building runs. A machine member who is genuinely with you does not offer a
 * favour, they offer a deal.
 *
 * COVENANT 5 — this is not SAFE, and the price is on the card face before you
 * take it. What you do not know is WHICH price. A trap you can read and walk
 * into anyway is a decision; a hidden one is a cheat.
 */
export const HK05_AskBehindTheAsk: PlayCard = {
  id: 'HK05',
  n: 'The Ask Behind the Ask',
  cost: { a: 1 },
  risk: 'STD',
  ph: [1, 2, 3],
  tag: 'a deal, not a favour',
  attrs: ['DIP'],
  d:
    'Somebody in your machine who is genuinely WITH you moves real money and real people this week. ' +
    'It works. It always works. ' +
    'It also attaches an obligation you do not get to choose and cannot hand back. ' +
    'NOT SAFE, and the price is printed here on purpose. ' +
    'The price is whoever you dealt with: the Slate-Maker takes his marker, everybody else ' +
    'runs money and money comes with a string. ' +
    'Everybody at the capitol knows exactly what the slate-maker wants; the only question ' +
    'has ever been whether you are far enough behind to pay it.',
  show: s => hooksOfKind(s, 'machine').length > 0,
  odds: () => 1,
  run: s => {
    const h = hooksOfKind(s, 'machine')[0];
    if (!h) return 'Nobody in your machine is offering a deal right now.';
    takeHook(s, h.id);
    s.money += 900;
    s.contacts += 70;
    s.volPool += 2;
    s.momentum += 1;
    // The price is WHO you dealt with, not a coin flip. The Slate-Maker charges
    // his own marker — OB3 has been in the registry since Phase 2 and gates real
    // starmap paths downstream. Everybody else runs money, and money comes with
    // a string that pulls on you every single week (OB1).
    //
    // This was a `random() < 0.5` for about ten minutes. It made the trap
    // uneven for no reason — one branch a heavy weekly drag, the other a purely
    // narrative marker — and it made the harness assertion depend on the seed,
    // which is the exact "my instrument measures nothing and passes" shape this
    // project keeps stepping in.
    const price = h.source === 'AL16' ? 'OB3' : 'OB1';
    addObl(s, price);
    return (
      `It works exactly as advertised: +$900, +70 contacts, two volunteers who have done this before, ` +
      `and the room tilts. Then, on the way out, the ask behind the ask — ` +
      `${oblName(price)}. You are carrying it now, every week, until this is over.`
    );
  }
};

/**
 * HK06 — Somebody Sent You a File.
 *
 * The rival source, and the one that is a genuine WAGER rather than a gift with
 * a price tag. HK05's cost is printed on the card; this one's cost is that it
 * might not work and you might become the story. Those are different kinds of
 * bad and the game needs both.
 *
 * The file also PERISHES — four weeks, then the news cycle has moved and you are
 * the man dredging up old business, which is worse than nothing.
 *
 * COVENANT 6: power is never clean. There is no version of this where you use
 * it and stay the person who did not.
 */
export const HK06_SomebodySentYouAFile: PlayCard = {
  id: 'HK06',
  n: 'Somebody Sent You a File',
  cost: { a: 2 },
  risk: 'VOL',
  ph: [1, 2, 3],
  tag: 'no return address',
  attrs: ['CRA'],
  d:
    'An envelope with no return address and your opponent inside it. ' +
    'Whether it is true is a separate question from whether it works, and both are separate from ' +
    'whether you are the one who should be holding it. ' +
    'VOLATILE, genuinely: it can knock them down a peg, do nothing, or come back with your ' +
    'fingerprints on it and make YOU the story. ' +
    'Craft is the attribute. ' +
    'The file goes stale in about a month — after that you are just the man dredging up old business.',
  show: s => hooksOfKind(s, 'rival').length > 0,
  odds: () => 0.4,
  run: (s, o) => {
    const h = hooksOfKind(s, 'rival')[0];
    if (!h) return 'Nobody has put anything in front of you.';
    takeHook(s, h.id);
    const them = s.rivals?.[0]?.n ?? 'your opponent';
    if (o.tier === 0) {
      // It lands, and it lands on somebody else's byline, which is the only
      // way this ever works cleanly. It is still not clean.
      for (const g of s.groundsArr) g.rivalRap = Math.max(0, (g.rivalRap || 0) - 6);
      s.momentum += 1;
      s.nameID += 3;
      return (
        `It goes to a reporter who has been waiting two years for somebody to hand her exactly this, ` +
        `and it runs under her name instead of yours. ${them} loses ground everywhere (−6), momentum, ` +
        `+3 name ID. Nobody can prove where it came from. You know where it came from.`
      );
    }
    if (o.tier === 1) {
      for (const g of s.groundsArr) g.rivalRap = Math.max(0, (g.rivalRap || 0) - 2);
      return (
        `It gets three paragraphs on page six and a shrug. ${them} softens slightly. ` +
        `You spent two days of your life on it.`
      );
    }
    if (o.tier === 2) {
      return (
        `You read it four times and cannot make yourself do anything with it, which is either ` +
        `character or cowardice and you will not know which for about twenty years. Nothing happens.`
      );
    }
    // It comes back on you. This is the reason the card is VOL and not STD.
    s.hitPieces += 1;
    s.exposure = (s.exposure || 0) + 1;
    s.momentum = Math.max(0, s.momentum - 1);
    return (
      `It gets traced back to your side inside a week, and the story stops being about ${them} ` +
      `and starts being about you. Hit piece +1, exposure +1, momentum −1. ` +
      `The file was probably true. That turns out not to be the part anybody cares about.`
    );
  }
};

/**
 * HK07 — Show Up Where It Happened.
 *
 * The world source, and the last of the five. An outside event could hit you and
 * there was nothing to do but read the line — the worm happened, the water came
 * up, and it was forgotten. `opens` fixed that inside the chamber. This is the
 * campaign half.
 *
 * The cost is not money and not risk. The cost is that it lands in a week you
 * already had plans, and it closes whether you go or not.
 */
export const HK07_ShowUpWhereItHappened: PlayCard = {
  id: 'HK07',
  n: 'Show Up Where It Happened',
  cost: { a: 2 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'while it is still happening',
  attrs: ['CON'],
  d:
    'Something happened to this district and there is a room where people are dealing with it. ' +
    'Go stand in it. Two actions, no money, no risk, and no way to buy it back later — ' +
    'the door closes in a few weeks whether you walk through it or not. ' +
    'Constituency is the attribute. ' +
    'Big rapport and standing, because showing up while it is still happening is the whole thing. ' +
    'Showing up a month late is a photo opportunity, and the district can tell the difference.',
  show: s => hooksOfKind(s, 'world').length > 0,
  odds: () => 0.95,
  run: s => {
    const h = hooksOfKind(s, 'world')[0];
    if (!h) return 'Nothing is happening that you can go stand in.';
    takeHook(s, h.id);
    const g = h.ground ? s.groundsArr.find(x => x.id === h.ground) : undefined;
    if (g) {
      g.rapport = clamp((g.rapport || 0) + 18, 0, 100);
      g.gotv = (g.gotv || 0) + 0.06;
    } else {
      // No named ground: it was county-wide, so it lands thinly everywhere.
      for (const x of s.groundsArr) x.rapport = clamp((x.rapport || 0) + 5, 0, 100);
    }
    s.districtStanding += 3;
    s.faces.G += 3;
    s.contacts += 25;
    return (
      `You go. ${h.n} — and you are there in the folding chair like everybody else, for the whole thing. ` +
      `${g ? `Rapport +18 and turnout banked on ${g.n}` : 'Rapport +5 across the district'}, ` +
      `+3 standing, +3 Grit, +25 contacts. ` +
      `Nobody thanks you for it. Two years from now four of them will still remember you were there.`
    );
  }
};

export const HOOK_PLAYS: PlayCard[] = [
  HK01_BorrowHisName,
  HK02_WorksHisCounty,
  HK03_TellMeTheTruth,
  HK04_TheProgramWorks,
  HK05_AskBehindTheAsk,
  HK06_SomebodySentYouAFile,
  HK07_ShowUpWhereItHappened
];
