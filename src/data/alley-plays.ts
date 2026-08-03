/**
 * CANDIDATE ZERO — The alleyways. Act I and II.
 *
 * The session became a place; the campaign was still a board. Acts I and II had
 * grounds, allies and a shop — every one of them a productive option with a
 * known return. There was no way to spend an afternoon badly, and therefore no
 * afternoon you had to *decide* about.
 *
 * > *"The open world of the game means every moving part can be acted upon by
 * > the player, even if that means taking them down a rabbit hole that uses up
 * > their cards and actions wastefully. The game should have alleyways, some of
 * > which are shortcuts, some of which are traps."*
 *
 * These are the alleyways. Each is a real place a Texas candidate actually goes,
 * each is mostly unproductive, and each has a genuine top end — because that is
 * the only reason anyone stands in one.
 *
 * Design rules for anything added here:
 *
 *   1. **The median outcome must be poor.** If the expected value is good it is
 *      not an alleyway, it is a ramp with flavour text.
 *   2. **The top end must be real.** A door nobody has ever walked through is
 *      not a door.
 *   3. **At least one must be able to hurt you.** A trap that only wastes time
 *      is a slow ramp.
 *   4. **They must touch other systems.** The starmap concept is an intricate
 *      interconnection between every card — an alley that only moves a scalar
 *      is exactly the 61%-of-the-corpus problem this project already measured.
 */

import type { PlayCard } from '../engine/types.js';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

const CAMPAIGN = (s: { stage: string }) => s.stage === 'primary' || s.stage === 'general';

/**
 * AL01 — The Domino Table.
 *
 * Courthouse Square, four men, one table, and a game that has been running since
 * before you were born. They know every ballot in the county and they are not in
 * a hurry to tell you anything.
 */
export const AL01_DominoTable: PlayCard = {
  id: 'AL01',
  n: 'The Domino Table',
  cost: { a: 1 },
  risk: 'VOL',
  ph: [1, 2, 3],
  tag: 'four men and a game older than you',
  attrs: ['CHA'],
  d:
    'Sit down at the table on the square. Four men who have played the same game since ' +
    'before you were born, who know every ballot in this county, and who are in no hurry at all. ' +
    'Mostly you lose an hour and learn who died. ' +
    'Charm is the attribute, and this is VOLATILE in the honest sense — the usual outcome is nothing. ' +
    'But the courthouse crowd talks to each other, and once in a while one of them decides you will do.',
  show: s => CAMPAIGN(s),
  odds: () => 0.33,
  run: (s, o) => {
    const sq = s.groundsArr.find(g => g.id === 'GR01');
    if (o.tier === 0) {
      if (sq) sq.rapport = clamp((sq.rapport || 0) + 14, 0, 100);
      s.contacts += 30;
      s.faces.O += 3;
      return (
        'Two hours in, the oldest one says your daddy hauled his hay in 1974 and he had wondered ' +
        'when you would come by. The square is yours in a way no mailer buys. ' +
        'Rapport +14 on Courthouse Square, +30 contacts, and the Operator face notices.'
      );
    }
    if (o.tier === 1) {
      if (sq) sq.rapport = clamp((sq.rapport || 0) + 5, 0, 100);
      s.contacts += 8;
      return 'You lose two games and learn who died. Small rapport on the square. It is not nothing.';
    }
    if (o.tier === 2) {
      return 'An hour of dominoes and county obituaries. Nobody asks what you are running for. You do not tell them.';
    }
    s.momentum = Math.max(0, s.momentum - 1);
    return (
      'You try to steer it to the race and the table goes quiet in the particular way that means ' +
      'you have been filed under "pushy." Momentum −1. They will mention it.'
    );
  }
};

/**
 * AL02 — Ride the FM Route.
 *
 * A day in the truck with somebody who drives the whole county for a living. The
 * highest-variance day in the game: you either meet everyone or you meet a dog.
 */
export const AL02_RideTheRoute: PlayCard = {
  id: 'AL02',
  n: 'Ride the FM Route',
  cost: { a: 2 },
  risk: 'VOL',
  ph: [1, 2, 3],
  tag: 'a whole day in somebody else\'s truck',
  attrs: ['CLO'],
  d:
    'Two action points and a whole day in the truck with somebody who drives these roads for a living — ' +
    'a mail route, a feed run, a school bus in the afternoon. ' +
    'Close is the attribute. The most volatile day available to you: ' +
    'you either meet half the FM roads at their own gates, or you spend nine hours ' +
    'watching caliche and get barked at. ' +
    'Expensive to waste and the only thing that reaches those gates at all.',
  show: s => CAMPAIGN(s),
  odds: () => 0.38,
  run: (s, o) => {
    const fm = s.groundsArr.find(g => g.id === 'GR02');
    if (o.tier === 0) {
      if (fm) fm.rapport = clamp((fm.rapport || 0) + 18, 0, 100);
      s.contacts += 70;
      s.volPool += 1;
      return (
        'He knows which gates to honk at and which to walk up to, and by four o\'clock you have ' +
        'shaken sixty hands nobody in this race will ever reach. ' +
        'Rapport +18 on the FM Roads, +70 contacts, and one of them offers to drive people on election day.'
      );
    }
    if (o.tier === 1) {
      if (fm) fm.rapport = clamp((fm.rapport || 0) + 7, 0, 100);
      s.contacts += 22;
      return 'A long day, a decent haul, and three people who will remember the truck if not your name.';
    }
    if (o.tier === 2) {
      return 'Nine hours, forty miles of caliche, two people home. You have seen the county. The county has not seen you.';
    }
    s.momentum = Math.max(0, s.momentum - 1);
    s.contacts += 2;
    return (
      'The truck throws a belt outside Nolanville and the day is gone before noon. ' +
      'Two contacts and a story you will not tell. Momentum −1.'
    );
  }
};

/**
 * AL03 — Sit at the Dairy Queen.
 *
 * The actual civic centre of small-town Texas. The trap here is that it feels
 * like work while being, statistically, sitting down.
 */
export const AL03_DairyQueen: PlayCard = {
  id: 'AL03',
  n: 'Sit at the Dairy Queen',
  cost: { a: 1 },
  risk: 'STD',
  ph: [1, 2, 3],
  tag: 'the actual civic center',
  attrs: ['CHA'],
  d:
    'In a lot of these towns the DQ is the only room where the whole county sits down together. ' +
    'Take a booth, buy a Blizzard, and let people come to you. ' +
    'Charm is the attribute. Cheap and reliable in small amounts — this is the safest of the ' +
    'alleyways and the least likely to change anything. ' +
    'It feels like work. That is precisely the trap.',
  show: s => CAMPAIGN(s),
  odds: () => 0.6,
  run: (s, o) => {
    if (o.tier <= 1) {
      s.contacts += o.tier === 0 ? 26 : 12;
      s.nameID += 1;
      return o.tier === 0
        ? 'Three tables come to you, including a woman who runs the biggest church kitchen in the county. +26 contacts.'
        : 'A steady trickle. Twelve conversations and a name people half-recognise now. +12 contacts.';
    }
    return 'You eat a Blizzard alone for forty minutes. It was pleasant. That is the whole report.';
  }
};

/**
 * AL04 — Chase the Endorsement.
 *
 * The trap. A body that takes three meetings and endorses whoever it was always
 * going to endorse. Deliberately the worst expected value in the game, with a
 * genuine payoff at the very top so the mistake is a real decision rather than a
 * label.
 */
export const AL04_ChaseEndorsement: PlayCard = {
  id: 'AL04',
  n: 'Chase the Endorsement',
  cost: { a: 2 },
  risk: 'VOL',
  ph: [1, 2, 3],
  tag: 'the third meeting',
  attrs: ['DIP'],
  d:
    'A body with letterhead, a screening committee, and a questionnaire. Two action points a go, ' +
    'and they will take three meetings before telling you what everyone already knew. ' +
    'Diplomacy is the attribute. The worst odds on the board and the deepest rabbit hole in the game — ' +
    'the classic way a first-time candidate burns a September. ' +
    'When it does land it lands big, which is exactly why people keep going back.',
  show: s => CAMPAIGN(s),
  odds: () => 0.26,
  run: (s, o) => {
    if (o.tier === 0) {
      s.endorsePts += 3;
      s.momentum += 1;
      return (
        'The screening committee splits and the chair breaks it your way, for reasons that will ' +
        'never be written down. +3 endorsement points and a real gust of momentum. ' +
        'You will be asked to explain this for years.'
      );
    }
    if (o.tier === 1) {
      s.endorsePts += 1;
      return 'A dual endorsement, which is letterhead for "we could not decide." +1 endorsement point.';
    }
    if (o.tier === 2) {
      return 'Meeting two of three. They ask you the questionnaire questions again, in a different order.';
    }
    s.momentum = Math.max(0, s.momentum - 1);
    return (
      'They endorse the person they were always going to endorse, and the minutes note that you ' +
      'were "engaged and enthusiastic." An afternoon and two action points, gone. Momentum −1.'
    );
  }
};

export const ALLEY_PLAYS: PlayCard[] = [
  AL01_DominoTable,
  AL02_RideTheRoute,
  AL03_DairyQueen,
  AL04_ChaseEndorsement
];
