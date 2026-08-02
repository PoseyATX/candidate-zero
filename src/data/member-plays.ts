/**
 * CANDIDATE ZERO — Working the members.
 *
 * The eighteen names in `data/members.ts` each carry a `price` — favor, capital,
 * casework, or nothing — and until now that field was authored and unspendable.
 * You could read that Wendell Cobb expects to be asked properly, in person,
 * before the hearing and not during it, and there was no way in the game to ask
 * him. A person you cannot approach is set dressing.
 *
 * Two design laws from the owner drive this file:
 *
 * 1. **"Everywhere that a card could be played, there should be an opportunity
 *    to play it."** Every moving part is actionable. Each price now has a card
 *    that pays it, and each card names the specific member it reaches.
 *
 * 2. **"The game should have alleyways, some of which are shortcuts, some of
 *    which are traps."** A menu of only-good options is a spreadsheet. So THE
 *    BACK RAIL exists: hours in the members' lounge, which is mostly nothing and
 *    occasionally everything. It can waste your afternoon. That is the feature.
 *
 *    > *"One of the most odd things about the capitol is, among the overwhelming
 *    > spirit of action and controversy and debate and victory and defeat, is
 *    > HOURS of boredom and minutiae that allow for the infamous
 *    > extracurriculars."*
 *
 *    The boredom is the medium the extracurriculars happen in. Design it out and
 *    the building stops being a character.
 */

import type { PlayCard } from '../engine/types.js';
import {
  workMember,
  nextWorthWorking,
  ALLY_LINE
} from '../engine/chamber.js';
import { MEMBER_BY_ID, MEMBERS } from './members.js';

/** The member a given price-card would approach, or undefined. */
function targetFor(
  s: Parameters<NonNullable<PlayCard['show']>>[0],
  price: 'favor' | 'capital' | 'casework'
) {
  const roster = s.chamberRoster ?? {};
  const issue = s.issueId ?? null;
  return MEMBERS.slice()
    .filter(m => m.price === price && (roster[m.id] ?? 0) < ALLY_LINE)
    .sort((a, b) => {
      const aw = (a.wants === issue ? 10 : 0) + a.weight;
      const bw = (b.wants === issue ? 10 : 0) + b.weight;
      return bw - aw;
    })[0];
}

/**
 * MB01 — Ask Him Properly.
 *
 * The favour economy, pointed at a person instead of a counter. Costs a favour
 * token, which is the scarcest thing in the game, and buys a member outright.
 */
export const MB01_AskProperly: PlayCard = {
  id: 'MB01',
  n: 'Ask Him Properly',
  cost: { a: 1, fav: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'in person, before the hearing',
  attrs: ['DIP'],
  d:
    'Some members do not want to be traded with. They want to be asked, face to face, ' +
    'before the hearing and not during it, by somebody who came to their office to do it. ' +
    'Spends a favour and brings that member the whole way over. ' +
    'Diplomacy is the attribute, and it is SAFE — the only thing this can cost you is the favour, ' +
    'which you were never getting back anyway.',
  show: s => s.stage === 'session' && !!targetFor(s, 'favor'),
  odds: () => 0.95,
  run: s => {
    const m = targetFor(s, 'favor');
    if (!m) return 'Nobody left who wants to be asked.';
    workMember(s, m.id, 40);
    return (
      `${m.name} of ${m.county} hears you out with the door shut. ${m.d} ` +
      `He is with you, and he will expect the same courtesy next session.`
    );
  }
};

/**
 * MB02 — Buy the Vote.
 *
 * The transactional one. Cheaper in relationship terms, but capital is the same
 * currency the pipeline runs on, so it competes directly with moving your bill.
 */
export const MB02_BuyTheVote: PlayCard = {
  id: 'MB02',
  n: 'Trade for the Vote',
  cost: { a: 1 },
  risk: 'STD',
  ph: [1, 2, 3],
  tag: 'two capital and a handshake',
  attrs: ['CRA'],
  d:
    'A straight trade: your capital for their aye. Spends 2 political capital — the same ' +
    'capital that moves your bill through the pipeline — so this competes with your own ' +
    'legislation for the only resource that does both. ' +
    'Craft is the attribute. Cheaper than a favour, and it buys a vote rather than a friend: ' +
    'they will be with you on this, and no warmer than that afterwards.',
  show: s => s.stage === 'session' && s.capital >= 2 && !!targetFor(s, 'capital'),
  odds: s => 0.62 + Math.min(0.2, s.capital * 0.02),
  run: (s, o) => {
    const m = targetFor(s, 'capital');
    if (!m) return 'Nobody in the market today.';
    s.capital = Math.max(0, s.capital - 2);
    if (o.tier <= 1) {
      workMember(s, m.id, 26);
      return `${m.name} of ${m.county} takes the trade. Not a friendship — an arrangement, priced and closed.`;
    }
    workMember(s, m.id, -8);
    return (
      `${m.name} lets you finish, then explains that they are not for sale in the way you just implied. ` +
      `The capital is spent and the room is a degree colder.`
    );
  }
};

/**
 * MB03 — Run Their Casework.
 *
 * The one that costs time rather than currency: you do another member's district
 * work for them. Slow, unglamorous, and it makes the most durable allies in the
 * building.
 */
export const MB03_RunTheirCasework: PlayCard = {
  id: 'MB03',
  n: "Run Their Casework",
  cost: { a: 2 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'somebody else\'s constituent',
  attrs: ['CHA'],
  d:
    "Take a case out of another member's district office and actually close it. " +
    'Two action points, no money, no favours — the expensive part is the afternoon. ' +
    'Charm is the attribute and it is SAFE. ' +
    'The slowest way to make an ally and the one that lasts: a member who watched you fix ' +
    'something for their constituent does not forget it the way they forget a trade.',
  show: s => s.stage === 'session' && !!targetFor(s, 'casework'),
  odds: () => 0.9,
  run: s => {
    const m = targetFor(s, 'casework');
    if (!m) return 'No cases going begging.';
    workMember(s, m.id, 34);
    // Doing constituent work is constituent work, whoever's district it is.
    s.districtStanding = Math.min(100, s.districtStanding + 1);
    return (
      `${m.name} of ${m.county} finds out you closed it and calls to say so. ${m.d} ` +
      `That is the kind of debt that gets paid on a bad Thursday.`
    );
  }
};

/**
 * MB04 — The Back Rail. The alleyway.
 *
 * This card is mostly a waste of an action, and that is deliberate. The Capitol
 * is hours of nothing punctuated by the thing that only happens because you were
 * standing there when it did. A game where every option is productive is a
 * spreadsheet with a theme; a building where you can lose an afternoon is a
 * place.
 *
 * Weighted so the median outcome is genuinely poor. Do not "fix" this by raising
 * the floor — the floor IS the mechanic.
 */
export const MB04_BackRail: PlayCard = {
  id: 'MB04',
  n: 'The Back Rail',
  cost: { a: 1 },
  risk: 'VOL',
  ph: [1, 2, 3],
  tag: 'hours of nothing, and then',
  attrs: ['CHA'],
  d:
    'Stand at the back rail through a quorum call and two hours of local bills. ' +
    'Most of the time this is exactly what it sounds like: an afternoon you do not get back. ' +
    'Sometimes the right person is bored next to you and says the thing they would never say ' +
    'in a meeting. ' +
    'Charm is the attribute, and this is VOLATILE in the honest sense — the usual result is ' +
    'nothing at all. Play it when you can afford to lose the hour, which is not most weeks.',
  show: s => s.stage === 'session',
  odds: () => 0.34,
  run: (s, o) => {
    const m = nextWorthWorking(s);
    if (o.tier === 0 && m) {
      workMember(s, m.id, 30);
      s.capital += 1;
      return (
        `Four hours of local bills, and then ${m.name} of ${m.county} is bored beside you and ` +
        `says the thing they would never say in a meeting. ${m.d} You did not schedule this. ` +
        `You were just there.`
      );
    }
    if (o.tier === 1 && m) {
      workMember(s, m.id, 12);
      return `A long afternoon. ${m.name} learns your name properly, which is not nothing, but it is close.`;
    }
    if (o.tier === 2) {
      return 'Two hours of local bills and a quorum call. Nobody says anything. You have an afternoon less than you did.';
    }
    // The trap end of the alleyway: you were seen not working.
    s.districtStanding = Math.max(0, s.districtStanding - 2);
    return (
      'A reporter notes which members spent the afternoon at the back rail while the ' +
      'appropriations subcommittee met down the hall. Your district reads it Sunday. Standing −2.'
    );
  }
};

export const MEMBER_PLAYS: PlayCard[] = [
  MB01_AskProperly,
  MB02_BuyTheVote,
  MB03_RunTheirCasework,
  MB04_BackRail
];
