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
import { hooksOfKind, takeHook, withdrawHook } from '../engine/hooks.js';
import { MEMBER_BY_ID, MEMBERS } from './members.js';
import { addObl, oblName } from './obligations.js';
import { memberName } from '../engine/machine.js';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Disposition a member gains for watching you defend, unasked, the statute that
 * pays their own county. The single thing a member most wants from somebody they
 * carried a bill with.
 */
export const DEFEND_SEEN_WARMTH = 12;

/**
 * Disposition a member loses for having spent his name on you.
 *
 * Deliberately smaller than what it buys. This is not a punishment for using the
 * card, it is the reason the card is a decision: cash the favour on the trail,
 * or keep him warm for the floor. You cannot have both, because he only had the
 * one thing to spend.
 */
export const NAME_SPENT_CHILL = 8;

/**
 * The member hook this card would cash, matched by the favour they offered.
 *
 * Matches on the hook's own `flavour`, set at the offer in chamber.ts. This used
 * to reach back into MEMBER_BY_ID and re-derive it from `opensTo`, which worked
 * and was one rename away from silently matching nothing forever.
 */
function hookFor(
  s: Parameters<NonNullable<PlayCard['show']>>[0],
  flavour: 'name' | 'turf' | 'truth'
) {
  return hooksOfKind(s, 'member').find(h => h.flavour === flavour);
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
  show: s => !!hookFor(s, 'name'),
  odds: () => 0.95,
  run: s => {
    const h = hookFor(s, 'name');
    if (!h) return 'Nobody owes you that particular favour.';
    takeHook(s, h.id);
    const m = MEMBER_BY_ID[h.source]!;
    s.nameID += 8;
    s.endorsePts += 2;
    s.momentum += 1;
    // COVENANT 6 — power is never clean, and this is the favour economy running
    // backwards, which means somebody is spending. A member who puts his name on
    // you has spent capital he does not get back, and he is a little cooler in
    // the chamber next session for it. The ledger being "even" is the point:
    // even is not warm.
    s.chamberRoster = s.chamberRoster ?? {};
    s.chamberRoster[m.id] = (s.chamberRoster[m.id] ?? 0) - NAME_SPENT_CHILL;
    return (
      `${m.name} of ${m.county} makes three calls and mentions you in each one. ` +
      `+8 name ID, +2 endorsement points, momentum. ` +
      `He does not ask for anything, which is how you know the ledger is now even — ` +
      `and even is not warm. He spent something he does not get back, and the floor is a long game.`
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
  show: s => !!hookFor(s, 'turf'),
  odds: () => 0.95,
  run: s => {
    const h = hookFor(s, 'turf');
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
  show: s => !!hookFor(s, 'truth'),
  odds: () => 0.95,
  run: s => {
    const h = hookFor(s, 'truth');
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

/** A statute thread in a given state. See engine/laws.ts for the three states. */
function statuteHook(
  s: Parameters<NonNullable<PlayCard['show']>>[0],
  flavour: 'working' | 'sunset' | 'attacked'
) {
  return hooksOfKind(s, 'statute').find(h => h.flavour === flavour);
}

/** A machine relationship of a given kind. See engine/machine.ts. */
function machineHook(
  s: Parameters<NonNullable<PlayCard['show']>>[0],
  flavour: 'slate' | 'money' | 'press' | 'counsel'
) {
  return hooksOfKind(s, 'machine').find(h => h.flavour === flavour);
}

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
  show: s => !!statuteHook(s, 'working'),
  odds: () => 0.95,
  run: s => {
    const h = statuteHook(s, 'working');
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
  show: s => !!machineHook(s, 'slate') || !!machineHook(s, 'money'),
  odds: () => 1,
  run: s => {
    const h = machineHook(s, 'slate') ?? machineHook(s, 'money');
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
    // The building is small and everybody watches. Somebody who has spent forty
    // years watching people take exactly this deal stops offering to talk you
    // out of things once you have taken it.
    // ONLY the slate. Raising money in a room on a Tuesday is ordinary politics
    // and the Old Bull has done it himself. Letting somebody else decide which
    // list your name goes on is the specific thing he has watched end careers.
    const bull =
      h.flavour === 'slate'
        ? hooksOfKind(s, 'machine').find(x => x.flavour === 'counsel')
        : undefined;
    if (bull) {
      withdrawHook(
        s,
        bull.id,
        `${memberName(bull.source)} hears what you took by Thursday and stops returning the call. ` +
          `He has watched people take that deal since before you were born and he has given up ` +
          `having the conversation twice.`
      );
    }
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
    // The one person in this district who was calling you before the story ran
    // is the same person who now knows where the envelope went. Nobody who
    // would rather be right than first wants to be your laundry.
    const press = hooksOfKind(s, 'machine').find(x => x.flavour === 'press');
    if (press) {
      withdrawHook(
        s,
        press.id,
        `${memberName(press.source)} works out where it came from about a day after everybody else ` +
          `does, and stops calling first. They would rather be right than useful to you.`
      );
    }
    return (
      `It gets traced back to your side inside a week, and the story stops being about ${them} ` +
      `and starts being about you. Hit piece +1, exposure +1, momentum −1. ` +
      `The file was probably true. That turns out not to be the part anybody cares about.`
    );
  }
};

/**
 * The world door this card would walk through, matched by verb.
 *
 * One `Show Up` card was resolving a flood, an oil boom, a redistricting rumour
 * and a library fight identically. That is the stat-bonus-wearing-a-hat problem
 * raised to the level of a whole source, and it is exactly the thing this
 * project measured at 61% of the corpus. A room you stand in, a fight you take
 * a side in, money that is moving, and a rumour you go verify are four
 * different verbs.
 */
function doorFor(
  s: Parameters<NonNullable<PlayCard['show']>>[0],
  flavour: 'room' | 'fight' | 'money' | 'map'
) {
  return hooksOfKind(s, 'world').find(h => (h.flavour ?? 'room') === flavour);
}

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
  show: s => !!doorFor(s, 'room'),
  odds: () => 0.95,
  run: s => {
    const h = doorFor(s, 'room');
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

/**
 * HK08 — Say It With the Camera On.
 *
 * The `fight` door. Some rooms are not rooms you stand in, they are rooms where
 * somebody hands you a microphone and everybody in the county finds out what you
 * think. The HOA stage, the library podium, the hour of talk radio.
 *
 * VOLATILE, and the good outcome is not "everybody agreed with you" — it is that
 * you sounded like a person instead of a candidate. The bad outcome is a clip.
 *
 * COVENANT 6. There is no tier here where you take a public side and nothing
 * happens; even the middle costs you somebody.
 */
export const HK08_SayItWithTheCameraOn: PlayCard = {
  id: 'HK08',
  n: 'Say It With the Camera On',
  cost: { a: 2 },
  risk: 'VOL',
  ph: [1, 2, 3],
  tag: 'a microphone and no way back',
  attrs: ['INK'],
  d:
    'Somewhere in this district there is a podium and a camera and a fight already in progress. ' +
    'Go take a side out loud, on the record, with your name on it. ' +
    'VOLATILE. It can make you the only candidate anybody can quote, or it can make ninety seconds ' +
    'of you that runs for the rest of the cycle. ' +
    'Ink is the attribute. ' +
    'There is no version where you say something real and nobody minds.',
  show: s => !!doorFor(s, 'fight'),
  odds: () => 0.45,
  run: (s, o) => {
    const h = doorFor(s, 'fight');
    if (!h) return 'Nobody is offering you a microphone.';
    takeHook(s, h.id);
    if (o.tier === 0) {
      s.messageSharp = true;
      s.nameID += 7;
      s.momentum += 1;
      s.faces.T = clamp((s.faces.T || 0) + 4, -50, 100);
      s.exposure = (s.exposure || 0) + 1;
      return (
        `You answer the actual question, which nobody on that stage was doing, and the room goes ` +
        `quiet in the good way. +7 name ID, message sharpens, momentum, Truth +4. ` +
        `Exposure +1, because now they know where you are. That was always the price of being findable.`
      );
    }
    if (o.tier === 1) {
      s.nameID += 3;
      s.exposure = (s.exposure || 0) + 1;
      return (
        `You say a true thing carefully and half the room nods. +3 name ID, exposure +1. ` +
        `Nobody writes it down, which is neither the best nor the worst outcome available.`
      );
    }
    if (o.tier === 2) {
      s.exposure = (s.exposure || 0) + 1;
      s.faces.O = clamp((s.faces.O || 0) + 1, -50, 100);
      return (
        `You give the answer that offends nobody, and everybody in the room recognises it as ` +
        `the answer that offends nobody. Exposure +1 and a small credit for keeping order. ` +
        `You drive home knowing exactly what you did.`
      );
    }
    s.hitPieces += 1;
    s.exposure = (s.exposure || 0) + 2;
    s.momentum = Math.max(0, s.momentum - 1);
    return (
      `Eleven seconds of it get cut out and put on the internet without the question attached. ` +
      `Hit piece +1, exposure +2, momentum −1. ` +
      `You said what you meant. That is not the same as it being what they heard.`
    );
  }
};

/**
 * HK09 — Ask While the Checkbook Is Open.
 *
 * The `money` door. Money moves in windows and the window is the whole point:
 * it is open right now, it closes at the end of the month, and it goes to
 * whoever asks first. Everybody involved knows this and nobody says it.
 *
 * SAFE because asking is safe. What it costs you is a face — you are now
 * somebody who asks — and the exposure that comes with taking it.
 */
export const HK09_AskWhileOpen: PlayCard = {
  id: 'HK09',
  n: 'Ask While the Checkbook Is Open',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'the window is open right now',
  attrs: ['CLO'],
  d:
    'Money is moving in this district this month and it will go to whoever asks first. ' +
    'That is the entire mechanism and everybody involved knows it. ' +
    'One action. Real money and a volunteer or two, reliably. ' +
    'Closing is the attribute and it is SAFE. ' +
    'It costs you Loyalty and a point of exposure, because you are now somebody who asked, ' +
    'and the window closes whether you ask or not.',
  show: s => !!doorFor(s, 'money'),
  odds: () => 0.9,
  run: s => {
    const h = doorFor(s, 'money');
    if (!h) return 'No money is moving that you can get in front of.';
    takeHook(s, h.id);
    s.money += 1100;
    s.volPool += 1;
    s.faces.L = clamp((s.faces.L || 0) - 4, -50, 100);
    s.exposure = (s.exposure || 0) + 1;
    return (
      `You ask, early, before the people who will spend two weeks deciding whether asking is beneath them. ` +
      `+$1,100 and a volunteer. Loyalty −4, exposure +1. ` +
      `Nobody says thank you and nobody says no. It is a transaction and it was always going to be.`
    );
  }
};

/**
 * HK10 — Go Find Out What Is True.
 *
 * The `map` door. A rumour is not information. Somebody in Austin has seen the
 * actual draft; the complaint is public and so is the file it came from; two
 * phone calls will tell you who started the whisper.
 *
 * The rarest verb in the game and the one nobody does, because it produces no
 * photograph and cannot be posted. It sharpens your message and it warns you.
 */
export const HK10_GoFindOut: PlayCard = {
  id: 'HK10',
  n: 'Go Find Out What Is True',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'a rumour is not information',
  attrs: ['CRA'],
  d:
    'Something is going around and nobody has checked it. Go check it. ' +
    'One action, no money, no risk, and no photograph at the end of it — which is why almost ' +
    'nobody in this building ever does it. ' +
    'Craft is the attribute. ' +
    'Sharpens your message, steadies you against the next hit, and tells you which ground is ' +
    'already gone so you stop paying for it.',
  show: s => !!doorFor(s, 'map'),
  odds: () => 0.92,
  run: s => {
    const h = doorFor(s, 'map');
    if (!h) return 'Nothing is going around that is worth verifying.';
    takeHook(s, h.id);
    s.messageSharp = true;
    s.faces.P = clamp((s.faces.P || 0) + 3, -50, 100);
    // Knowing what is coming is worth a hit piece you would otherwise have eaten.
    s.hitPieces = Math.max(0, s.hitPieces - 1);
    const worst = s.groundsArr.slice().sort((a, b) => (b.rivalRap || 0) - (a.rivalRap || 0))[0];
    return (
      `${h.n} — and you go, and you read the whole thing, and now you know. ` +
      `Message sharpens, Parliamentarian +3, and one line of attack lands on somebody who was ready for it ` +
      `(hit piece −1)` +
      `${worst && (worst.rivalRap || 0) > 0 ? `. You also learn that ${worst.n} was decided months ago` : ''}. ` +
      `There is no picture of this and you cannot post it. It is worth more than the week you spent on signs.`
    );
  }
};

/**
 * HK11 — Promise to Carry the Renewal.
 *
 * The `sunset` statute. Money runs out, authority expires, and somebody has to
 * file the continuation. The people it pays will work for you right now on the
 * strength of a promise — which is the trade, and it is a real one: you are
 * spending a session you have not been elected to yet.
 *
 * Not SAFE. What it costs is not money or a roll, it is that the next chamber
 * you walk into already has a bill in your name on it, whether that is the fight
 * you would have chosen or not.
 */
export const HK11_CarryTheRenewal: PlayCard = {
  id: 'HK11',
  n: 'Promise to Carry the Renewal',
  cost: { a: 1 },
  risk: 'STD',
  ph: [1, 2, 3],
  tag: 'a session you have not won yet',
  attrs: ['CON'],
  d:
    'A statute of yours runs out of money next biennium. Tell the people it pays that you will ' +
    'carry the renewal, and they will work for you starting today. ' +
    'Strong rapport and volunteers where the program lives, plus standing. ' +
    'NOT SAFE, and the cost is not a roll: you are spending a session you have not been elected ' +
    'to yet, and the next chamber you walk into has a bill in your name on it already. ' +
    'Constituency is the attribute. ' +
    'Every promise a member makes at home is a bill somebody in Austin has to eat.',
  show: s => !!statuteHook(s, 'sunset'),
  odds: () => 0.92,
  run: s => {
    const h = statuteHook(s, 'sunset');
    if (!h) return 'Nothing of yours is running out of money.';
    takeHook(s, h.id);
    const g = s.groundsArr.find(x => x.id === h.ground);
    if (g) {
      g.rapport = clamp((g.rapport || 0) + 16, 0, 100);
      g.gotv = (g.gotv || 0) + 0.07;
    }
    s.volPool += 2;
    s.contacts += 40;
    s.districtStanding += 3;
    // The leash: you have committed the next session before you have won it.
    addObl(s, 'OB11');
    return (
      `You say it out loud, in a room, to people who will remember the sentence: the renewal gets ` +
      `carried. +16 rapport and turnout on ${g?.n ?? 'the ground it pays'}, two volunteers, +40 contacts, ` +
      `+3 standing. You are now carrying ${oblName('OB11')}. ` +
      `That is a session of your life, promised to a room, before anybody voted.`
    );
  }
};

/**
 * HK12 — Defend It Where It Lives.
 *
 * The `attacked` statute — the one your opponent is campaigning to repeal.
 *
 * This is the join between three systems that were each real and never touched:
 * the rival picks a repeal target, the statute book knows which grounds that law
 * serves, and until now the fight happened entirely in Austin. It should happen
 * in the county that gets the money, where the people who lose it live and vote.
 *
 * A repeal campaign you answer at home is much harder to run than one you ignore.
 */
export const HK12_DefendItWhereItLives: PlayCard = {
  id: 'HK12',
  n: 'Defend It Where It Lives',
  cost: { a: 2 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'the county that gets the money',
  attrs: ['CON'],
  d:
    'Your opponent is running on repealing a statute of yours. Go answer it in the county that ' +
    'gets the money, in front of the people who lose it. ' +
    'Two actions, no risk. Big rapport where the law lives, and it takes the ground out from ' +
    'under the repeal pitch everywhere. ' +
    'Constituency is the attribute. ' +
    'A repeal campaign nobody answers at home is the easiest campaign in Texas to run. ' +
    'Make him explain to their faces which part he is taking away.',
  show: s => !!statuteHook(s, 'attacked'),
  odds: () => 0.95,
  run: s => {
    const h = statuteHook(s, 'attacked');
    if (!h) return 'Nobody is running against anything you passed.';
    takeHook(s, h.id);
    const g = s.groundsArr.find(x => x.id === h.ground);
    if (g) {
      g.rapport = clamp((g.rapport || 0) + 20, 0, 100);
      g.rivalRap = Math.max(0, (g.rivalRap || 0) - 10);
    }
    // The pitch gets harder everywhere once he has had to answer it once.
    for (const x of s.groundsArr) x.rivalRap = Math.max(0, (x.rivalRap || 0) - 3);
    s.messageSharp = true;
    s.districtStanding += 2;
    // Austin notices. The members whose own ground that law pays watched you
    // defend it in public without being asked, which is the single thing a
    // member most wants from somebody they carried a bill with.
    //
    // Written into chamberRoster, which mergeRoomBack carries into legacy at
    // recordRun — so the trail really does feed the floor, not just the reverse.
    const watching = MEMBERS.filter(m => m.ground === h.ground);
    s.chamberRoster = s.chamberRoster ?? {};
    for (const m of watching) {
      s.chamberRoster[m.id] = (s.chamberRoster[m.id] ?? 0) + DEFEND_SEEN_WARMTH;
    }
    const named = watching[0];
    return (
      `You hold it in the county that gets the money and you make him say out loud, to those people, ` +
      `which part he is taking away. He does not have a good version of that sentence. ` +
      `+20 rapport and −10 for him on ${g?.n ?? 'the ground it serves'}, −3 for him everywhere else, ` +
      `message sharpens, +2 standing.` +
      (named
        ? ` And it gets back to Austin: ${named.name} of ${named.county} did not have to ask you ` +
          `to defend it, which they will remember on the floor.`
        : '')
    );
  }
};

/**
 * HK13 — They Will Call You First.
 *
 * The `press` machine relationship. Not coverage — coverage is a lottery. This
 * is somebody who calls you BEFORE the story is shaped and lets you answer while
 * it is still a question rather than after it is a headline.
 *
 * Worth more than an ad and it cannot be bought, only carried for a few cycles.
 */
export const HK13_TheyWillCallYouFirst: PlayCard = {
  id: 'HK13',
  n: 'They Will Call You First',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'before the story is shaped',
  attrs: ['INK'],
  d:
    'Somebody who writes in this district will call you before the story is shaped, print what ' +
    'you actually say, and let you answer while it is still a question. ' +
    'One action. Name ID, a sharper message, and it takes a hit piece off you — you got to ' +
    'respond before it ran. ' +
    'Ink is the attribute and it is SAFE. ' +
    'This is not coverage. Coverage is a lottery. This is a phone call, and you cannot buy it.',
  show: s => !!machineHook(s, 'press'),
  odds: () => 0.93,
  run: s => {
    const h = machineHook(s, 'press');
    if (!h) return 'Nobody who writes in this district owes you a phone call.';
    takeHook(s, h.id);
    s.nameID += 5;
    s.messageSharp = true;
    s.hitPieces = Math.max(0, s.hitPieces - 1);
    s.faces.T = clamp((s.faces.T || 0) + 2, -50, 100);
    return (
      `The phone rings before the piece runs, which is the entire difference between being ` +
      `covered and being quoted. +5 name ID, message sharpens, one line of attack lands soft ` +
      `(hit piece −1), Truth +2. ` +
      `They are not doing you a favour. They would rather be right than first, and almost nobody ` +
      `in this business still is.`
    );
  }
};

/**
 * HK14 — Let the Old Bull Talk.
 *
 * The `counsel` machine relationship, and the only completely free thing in the
 * hook set. Forty years of watching people lose this exact seat, offered to
 * somebody who probably will not listen.
 *
 * It costs an action and gives no money, no contacts and no name ID. What it
 * gives is that you stop making the mistake you were about to make.
 */
export const HK14_LetTheOldBullTalk: PlayCard = {
  id: 'HK14',
  n: 'Let the Old Bull Talk',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'forty years of watching people lose',
  attrs: ['CRA'],
  d:
    'Somebody who has watched people lose this exact seat for forty years will tell you what you ' +
    'are doing wrong, for free, over coffee, at length. ' +
    'One action. No money, no contacts, no name ID, nothing you can post. ' +
    'A sharper message, steadier hands, and one mistake you do not make. ' +
    'Craft is the attribute. ' +
    'They have made this offer to every candidate in this county and almost none of them sat down.',
  show: s => !!machineHook(s, 'counsel'),
  odds: () => 0.95,
  run: s => {
    const h = machineHook(s, 'counsel');
    if (!h) return 'Nobody is offering to tell you what you are doing wrong.';
    takeHook(s, h.id);
    s.messageSharp = true;
    s.faces.P = clamp((s.faces.P || 0) + 4, -50, 100);
    s.faces.O = clamp((s.faces.O || 0) + 2, -50, 100);
    s.exposure = Math.max(0, (s.exposure || 0) - 1);
    return (
      `Two hours, most of it about a race in 1988 that you did not ask about, and about forty ` +
      `seconds of it is the most useful thing anybody will say to you this cycle. ` +
      `Message sharpens, Parliamentarian +4, Order +2, exposure −1. ` +
      `You will not know which forty seconds until November.`
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
  HK07_ShowUpWhereItHappened,
  HK08_SayItWithTheCameraOn,
  HK09_AskWhileOpen,
  HK10_GoFindOut,
  HK11_CarryTheRenewal,
  HK12_DefendItWhereItLives,
  HK13_TheyWillCallYouFirst,
  HK14_LetTheOldBullTalk
];
