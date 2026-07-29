/**
 * Waiting-season Special verbs — path-scoped interim kit.
 * Not Main Deck; residency special; only while stage==='waiting'.
 */

import type { PlayCard } from '../engine/types.js';
import { bankWaiting } from '../engine/waiting.js';

function pathIs(s: { waitingPathId?: string }, ...ids: string[]): boolean {
  return !!s.waitingPathId && ids.includes(s.waitingPathId);
}

function waitingShow(
  s: { stage?: string; waitingPathId?: string },
  paths?: string[]
): boolean {
  if (s.stage !== 'waiting') return false;
  if (!paths || !paths.length) return true;
  return pathIs(s, ...paths);
}

/** Universal — keep the list warm. */
export const WA01_WorkTheList: PlayCard = {
  id: 'WA01',
  n: 'Work the List',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'waiting',
  kind: 'action',
  residency: 'special',
  control: 'player',
  entityScope: ['LOOP_WAITING_PERENNIAL', 'LOOP_WAITING_ADVOCATE', 'LOOP_WAITING_HOME'],
  attrs: ['CHA'],
  d:
    'Call the names that still pick up. The county forgets slower when you dial. ' +
    'Banks up to 35 contacts straight into your NEXT filing — nothing in the interim helps this run, ' +
    'it all carries forward. Charm is the attribute and it almost never fails. ' +
    'Available on every interim path, and the reliable floor when nothing better is showing.',
  show: s => waitingShow(s),
  odds: () => 0.9,
  run: (s, o) => {
    const n = o.tier === 0 ? 35 : o.tier === 1 ? 22 : 10;
    bankWaiting(s, { contacts: n });
    return `List work. +${n} contacts banked for the next filing.`;
  }
};

export const WA02_IssueForum: PlayCard = {
  id: 'WA02',
  n: 'Host an Issue Forum',
  cost: { a: 1 },
  risk: 'STD',
  ph: [1, 2, 3],
  tag: 'waiting',
  residency: 'special',
  control: 'player',
  entityScope: ['LOOP_WAITING_ADVOCATE'],
  attrs: ['CON', 'CHA'],
  d:
    'The candidate lost; the cause did not. Folding chairs and a sharp message. ' +
    'The Advocate path\'s big one: 40 contacts and name ID banked forward, and it leaves your ' +
    'MESSAGE SHARP going into the next filing — a permanent odds bonus you would otherwise have to ' +
    'buy back with an action. Conviction and Charm carry it.',
  show: s => waitingShow(s, ['advocate']),
  odds: () => 0.75,
  run: (s, o) => {
    if (o.tier <= 1) {
      bankWaiting(s, { contacts: 40, nameID: 3 });
      s.messageSharp = true;
      return 'Forum lands. +40 contacts, +3 name, message stays sharp.';
    }
    bankWaiting(s, { contacts: 12 });
    return 'Small room, real believers. +12 contacts.';
  }
};

export const WA03_CarryTheBag: PlayCard = {
  id: 'WA03',
  n: 'Carry the Bag',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'waiting',
  residency: 'special',
  control: 'player',
  entityScope: ['LOOP_WAITING_STAFFER'],
  attrs: ['INK', 'CRA'],
  d:
    'Two years inside. Briefs, desks, and where the levers hide. ' +
    'The Staffer path: raises your Parliamentarian and Operator faces directly — the two that matter ' +
    'most if you ever reach a Session — and a good result banks a favour on top. ' +
    'Ink and Craft. Safe, and the closest thing to a permanent upgrade the interim offers.',
  show: s => waitingShow(s, ['staffer']),
  odds: () => 0.88,
  run: (s, o) => {
    s.faces.P = Math.min(100, (s.faces.P || 0) + (o.tier <= 1 ? 4 : 2));
    s.faces.O = Math.min(100, (s.faces.O || 0) + (o.tier === 0 ? 3 : 1));
    bankWaiting(s, { favors: o.tier === 0 ? 1 : 0, nameID: 1 });
    return 'Capitol days. Faces P/O up; the building teaches whether you listen.';
  }
};

export const WA04_MendFence: PlayCard = {
  id: 'WA04',
  n: 'Mend the Fence',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'waiting',
  residency: 'special',
  control: 'player',
  entityScope: ['LOOP_WAITING_HOME'],
  attrs: ['CHA'],
  d:
    'Fix what broke. Coach the team. Let the mailers fade a little. ' +
    'The only card in the game that HEALS: it banks volunteers and burns off exposure, ' +
    'and a breakthrough erases a hit piece outright. ' +
    'Charm is the attribute and it is about as safe as anything gets. ' +
    'If you came out of a run with scars, this is what the two years are for.',
  show: s => waitingShow(s, ['home', 'perennial']),
  odds: () => 0.92,
  run: (s, o) => {
    bankWaiting(s, { vol: o.tier <= 1 ? 2 : 1 });
    s.exposure = Math.max(0, (s.exposure || 0) - 1);
    s.hitPieces = Math.max(0, s.hitPieces - (o.tier === 0 ? 1 : 0));
    return 'Hands dirty, head clearer. Volunteers banked; scars soften.';
  }
};

export const WA05_LunchLobby: PlayCard = {
  id: 'WA05',
  n: 'Lunch the Lobby',
  cost: { a: 1 },
  risk: 'STD',
  ph: [1, 2, 3],
  tag: 'waiting',
  residency: 'special',
  control: 'player',
  entityScope: ['LOOP_WAITING_EXMEMBER', 'LOOP_ELECTED_HIGHER_SENATE'],
  attrs: ['DIP', 'CRA'],
  d:
    'Title still warm. Doors still open. No vote — only lunch. ' +
    'The richest interim card: a favour, $300, name ID and a point of political capital in one action. ' +
    'Diplomacy and Craft. ' +
    'Ex-member and exploratory paths only — it is the one real dividend of having held the seat.',
  show: s => waitingShow(s, ['exmember', 'senate', 'statewide']),
  odds: () => 0.8,
  run: (s, o) => {
    if (o.tier <= 1) {
      bankWaiting(s, { favors: 1, money: 300, nameID: 2 });
      s.capital = (s.capital || 0) + 1;
      return 'Lunch buys a favor and a check. +favor, +$300, capital +1.';
    }
    bankWaiting(s, { nameID: 1 });
    return 'Polite, noncommittal. Name still circulates.';
  }
};

export const WA06_Rolodex: PlayCard = {
  id: 'WA06',
  n: 'Keep the Rolodex Warm',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'waiting',
  residency: 'special',
  control: 'player',
  attrs: ['DIP'],
  d:
    'Birthdays, funerals, fish fries you are not running. Yet. ' +
    'Name ID and contacts banked forward, safely, on every path — the interim workhorse. ' +
    'Diplomacy is the attribute. ' +
    'Where Work the List banks bulk contacts, this trades some of that volume for name recognition.',
  show: s => waitingShow(s),
  odds: () => 0.9,
  run: (s, o) => {
    const n = o.tier <= 1 ? 4 : 2;
    bankWaiting(s, { nameID: n, contacts: 15 });
    return `Rolodex work. +${n} name ID, +15 contacts for next cycle.`;
  }
};

export const WA07_QuietMoney: PlayCard = {
  id: 'WA07',
  n: 'Quiet Money',
  cost: { a: 1 },
  risk: 'STD',
  ph: [1, 2, 3],
  tag: 'waiting',
  residency: 'special',
  control: 'player',
  kind: 'bargain',
  attrs: ['CRA'],
  d:
    'A retainer, a speech fee, a board. Not a campaign — not yet. ' +
    'The only way to bank real MONEY into the next filing, which is the difference between the ' +
    'filing fee and eight Saturdays of petitions. Up to $900. ' +
    'Craft is the attribute. It costs Loyalist standing every time it pays — ' +
    'the interim has its own version of the PAC check, and this is it.',
  show: s => waitingShow(s, ['perennial', 'exmember', 'senate', 'statewide']),
  odds: () => 0.7,
  run: (s, o) => {
    if (o.tier <= 1) {
      const m = o.tier === 0 ? 900 : 500;
      bankWaiting(s, { money: m });
      s.faces.L = Math.max(-50, (s.faces.L || 0) - 2);
      return `Quiet money +$${m}. Loyalty face softens a hair.`;
    }
    return 'The check does not clear the conversation. Nothing banked.';
  }
};

export const WA08_DraftBrief: PlayCard = {
  id: 'WA08',
  n: 'Draft the Brief',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'waiting',
  residency: 'special',
  control: 'player',
  attrs: ['INK', 'CON'],
  d:
    'White paper, memo, bill draft that waits for a sponsor. ' +
    'Parliamentarian face, name ID banked forward, and — the real prize — your message stays SHARP ' +
    'into the next filing, which widens the odds on half your deck from week one. ' +
    'Ink and Conviction. Safe, and it costs nothing but the hour.',
  show: s => waitingShow(s, ['advocate', 'staffer', 'senate', 'statewide']),
  odds: () => 0.85,
  run: (s, o) => {
    s.faces.P = Math.min(100, (s.faces.P || 0) + 3);
    s.messageSharp = true;
    bankWaiting(s, { nameID: o.tier <= 1 ? 2 : 1 });
    return 'The brief exists. Message sharp; Parliamentarian face +3.';
  }
};

export const WA09_TestWaters: PlayCard = {
  id: 'WA09',
  n: 'Test the Waters',
  cost: { a: 1 },
  risk: 'VOL',
  ph: [1, 2, 3],
  tag: 'waiting',
  residency: 'special',
  control: 'player',
  attrs: ['DIP', 'CLO'],
  d:
    'Quiet calls about a larger map — Senate row or the statewide ballot. ' +
    'The only VOLATILE card in the interim, and the odds are the worst here by a wide margin. ' +
    'A breakthrough banks name ID, a favour and 50 contacts; a disaster is a leak — ' +
    '"EX-MEMBER EYES HIGHER OFFICE" — and a hit piece you carry into the next run. ' +
    'Diplomacy and Close. Play it when the two years are otherwise spent, not first.',
  show: s => waitingShow(s, ['senate', 'statewide', 'exmember']),
  odds: () => 0.55,
  run: (s, o) => {
    if (o.tier === 0) {
      bankWaiting(s, { nameID: 6, favors: 1, contacts: 50 });
      return 'The calls go well. Bigger rooms know your name. (+6 name, +favor, +50 contacts)';
    }
    if (o.tier === 1) {
      bankWaiting(s, { nameID: 3, contacts: 25 });
      return 'Polite interest. Not a draft — not a door slam.';
    }
    if (o.tier === 2) return 'Everyone is "flattered you called." Nobody is free for lunch.';
    s.hitPieces += 1;
    return 'A leak: "EX-MEMBER EYES HIGHER OFFICE." Hit piece. The water was colder than you thought.';
  }
};

// --- Wave: more interim verbs. Bank progress toward the next filing. ---
const WAIT_SCOPE = ['LOOP_WAITING_PERENNIAL', 'LOOP_WAITING_ADVOCATE', 'LOOP_WAITING_HOME'];

export const WA10_NightClass: PlayCard = {
  id: 'WA10', n: 'Teach a Night Class', cost: { a: 1 }, risk: 'SAFE', ph: [1, 2, 3],
  tag: 'waiting', kind: 'action', residency: 'special', control: 'player',
  entityScope: WAIT_SCOPE, attrs: ['CHA'],
  d:
    'Civics at the community college, two evenings a week. Thirty adults who now know your name ' +
    'and your handshake. Banks contacts forward at a rate just under Work the List, safely. ' +
    'Charm is the attribute. ' +
    'A second reliable contact card, so a long interim is not four identical phone calls.',
  show: s => waitingShow(s),
  odds: () => 0.9,
  run: (s, o) => {
    const n = o.tier === 0 ? 28 : o.tier === 1 ? 18 : 9;
    bankWaiting(s, { contacts: n });
    return `Chalkboard and coffee. +${n} contacts banked for the next filing.`;
  }
};
export const WA11_WeeklyColumn: PlayCard = {
  id: 'WA11', n: 'Write the Weekly Column', cost: { a: 1 }, risk: 'STD', ph: [1, 2, 3],
  tag: 'waiting', kind: 'action', residency: 'special', control: 'player',
  entityScope: WAIT_SCOPE, attrs: ['INK'],
  d:
    'A standing byline in the county paper. Slow, unglamorous, and it keeps your name in print ' +
    'between the elections. Pure name ID banked forward — the interim\'s specialist, where the ' +
    'others trade in contacts. Ink is the attribute. ' +
    'The only one of the three cheap interim cards that can whiff, so it is a small gamble for a ' +
    'stat the others barely touch.',
  show: s => waitingShow(s),
  odds: () => 0.7,
  run: (s, o) => {
    const n = o.tier === 0 ? 4 : o.tier === 1 ? 2 : 1;
    bankWaiting(s, { nameID: n });
    return `A column that gets read. +${n} name ID banked for the next filing.`;
  }
};
export const WA12_CharityRun: PlayCard = {
  id: 'WA12', n: 'Run the Charity 5K', cost: { a: 1 }, risk: 'SAFE', ph: [1, 2, 3],
  tag: 'waiting', kind: 'action', residency: 'special', control: 'player',
  entityScope: WAIT_SCOPE, attrs: ['CHA'],
  d:
    'A bib, a starting pistol, and a banner with your name over the finish line. Good works, ' +
    'well photographed. Banks a little of both contacts and name ID, safely, every time. ' +
    'Charm is the attribute. ' +
    'The balanced option when you do not want to commit the whole interim to one column.',
  show: s => waitingShow(s),
  odds: () => 0.9,
  run: (s, o) => {
    bankWaiting(s, { contacts: o.tier <= 1 ? 16 : 8, nameID: o.tier === 0 ? 2 : 1 });
    return 'Sneakers and goodwill. Contacts and a little name ID banked for the next filing.';
  }
};

export const WAITING_PLAYS: PlayCard[] = [
  WA10_NightClass,
  WA11_WeeklyColumn,
  WA12_CharityRun,
  WA01_WorkTheList,
  WA02_IssueForum,
  WA03_CarryTheBag,
  WA04_MendFence,
  WA05_LunchLobby,
  WA06_Rolodex,
  WA07_QuietMoney,
  WA08_DraftBrief,
  WA09_TestWaters
];
