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

export const HOOK_PLAYS: PlayCard[] = [
  HK01_BorrowHisName,
  HK02_WorksHisCounty,
  HK03_TellMeTheTruth
];
