/**
 * CANDIDATE ZERO — Doors.
 *
 * The Machine gave the player a roster. The Ask gave that roster a claim on
 * them. This is the third leg: a member who is with you opens a door that does
 * not exist otherwise — and losing them closes it, by name, forever.
 *
 * WHY THIS AND NOT MORE STANDING. Standing is a bar. A bar going down is a
 * number, and a number nobody can spend is not a loss anyone protects. A door
 * is a *card you had last cycle and cannot draw this cycle*, which is the only
 * form of loss a deckbuilder player actually feels.
 *
 * The gate is deliberately `seatedIds` (engine/machine.ts) and not `warm()`:
 * these are not favours from someone you met in week 3, they are the standing
 * privileges of a relationship you carried across runs. Making one in a single
 * cycle would collapse the meta layer back into the run.
 *
 * TWO GATES, ON PURPOSE:
 *  - `show` keeps the card out of the weekly draw pool unless that member is
 *    seated, so a door you have not earned never appears.
 *  - `req` blocks *playing* it. Ownership carries across incumbent runs
 *    (loop.ts merges old deck into new), so a card drawn while the Slate-Maker
 *    was with you would otherwise still be playable the cycle after he walked.
 *    That is exactly the door failing to close.
 *
 * Covenant 6: every one of these has a price. Access is not a gift.
 */

import type { PlayCard } from '../engine/types.js';
import { addObl } from './obligations.js';
import { seatedIds, memberName } from '../engine/machine.js';

/** Which members hold a door, and what it is called. */
export const DOOR_BY_ALLY: Record<string, string> = {
  AL16: 'MD_AL16',
  AL02: 'MD_AL02',
  AL12: 'MD_AL12',
  AL09: 'MD_AL09'
};

/** The door card id for a member, if they hold one. */
export function doorCardId(allyId: string): string | undefined {
  return DOOR_BY_ALLY[allyId];
}

/** True when this member is seated from the machine this run. */
function seated(s: Parameters<NonNullable<PlayCard['show']>>[0], allyId: string): boolean {
  return seatedIds(s).includes(allyId);
}

function gate(allyId: string) {
  return (s: Parameters<NonNullable<PlayCard['show']>>[0]) => seated(s, allyId);
}

/**
 * AL16 — The Slate-Maker. The base game's route to the slate is PL22B: 3 AP,
 * $1500, a 75% roll, and it only opens once the Chairwoman is warm. If he is
 * *yours*, the printed card is a phone call. This is the loudest door in the
 * set and the one whose absence should sting most.
 */
const MD_AL16: PlayCard = {
  id: 'MD_AL16',
  n: 'The Card, Direct',
  cost: { a: 2, $: 400 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'he already put you on it',
  kind: 'ally',
  attrs: ['DIP', 'CRA'],
  d:
    'He does not take the meeting. He takes the call, because you have taken his for three cycles. ' +
    'Puts you on the printed slate for 2 AP and $400 — against the open route, which wants 3 AP, ' +
    '$1,500, a warm County Chairwoman and a roll that fails a quarter of the time. ' +
    'Diplomacy and Craft, and it does not miss. ' +
    'He still takes his marker (OB3), and it vanishes the moment you are on the slate — or the ' +
    'moment he leaves your machine.',
  show: gate('AL16'),
  req: s => seated(s, 'AL16') && !s.slate,
  odds: () => 0.95,
  run: s => {
    s.slate = true;
    // Still his marker. Access from the machine is cheaper, never free.
    addObl(s, 'OB3');
    return (
      'Your name goes on the card without a meeting, a check, or a wait. ' +
      "The marker is the same marker — he'll spend it when it costs you most."
    );
  }
};

/**
 * AL02 — County Chairwoman. Her list is the party's actual list: the people
 * who vote in every primary. Nothing in the base game hands you contacts at
 * this rate, and that is the point.
 */
const MD_AL02: PlayCard = {
  id: 'MD_AL02',
  n: "The Chairwoman's List",
  cost: { a: 2 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'the names that vote every time',
  kind: 'ally',
  attrs: ['CRA'],
  d:
    'Not the voter file everyone buys. The other one — who actually shows in March, who answers, ' +
    'who brings four more. She has kept it since 1998. ' +
    '140 contacts AND 40 signatures for 2 AP, with Operator standing on top: no other single card ' +
    'moves both the ballot and the list at once. ' +
    'Craft is the attribute and it does not miss. ' +
    'It exists only while she is with you.',
  show: gate('AL02'),
  req: gate('AL02'),
  odds: () => 0.95,
  run: s => {
    s.contacts += 140;
    s.signatures += 40;
    s.faces.O += 3;
    return 'Two ring binders and a spreadsheet nobody else has. +140 contacts, +40 signatures.';
  }
};

/**
 * AL12 — The Old Bull. A member who has been in the building since before you
 * could vote. He does not knock doors; he moves bills and he knows who owes
 * whom. The session-phase door.
 */
const MD_AL12: PlayCard = {
  id: 'MD_AL12',
  n: 'The Old Bull Makes a Call',
  cost: { a: 2 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'thirty years of owed favours',
  kind: 'ally',
  attrs: ['CON', 'DIP'],
  d:
    'He has been in that building since before you could vote, and he is not spending this on a ' +
    'stranger. He is spending it on you. ' +
    '3 endorsement points for 2 AP with no roll — the cheapest endorsement in the game — plus ' +
    'name ID and lifts to your Parliamentarian and Grandee faces. ' +
    'Conviction and Diplomacy. ' +
    'Endorsement points are what the County Judge and the statewide names count before they will ' +
    'take your call, so this compounds. It exists only while he does.',
  show: gate('AL12'),
  req: gate('AL12'),
  odds: () => 0.95,
  run: s => {
    s.endorsePts += 3;
    s.faces.P += 4;
    s.faces.G += 3;
    s.nameID += 3;
    return 'Three calls, none of them long. Doors that were shut are merely closed now.';
  }
};

/**
 * AL09 — Canvass Captain. Volunteers are the one resource that compounds, and
 * a captain who has run your turf for cycles brings her whole crew with her.
 */
const MD_AL09: PlayCard = {
  id: 'MD_AL09',
  n: "The Captain's Crew",
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'she brings her own people',
  kind: 'ally',
  attrs: ['CLO'],
  d:
    'She does not need to be recruited, briefed, or fed. She has a crew, a route, and a clipboard, ' +
    'and she has been waiting for you to file. ' +
    'Four volunteers and 40 contacts for ONE action, guaranteed — Recruit Volunteers wants two ' +
    'actions and a roll to do less. ' +
    'Close is the attribute. Volunteers widen the odds on Block Walk, Petitions and GOTV, so this ' +
    'is the cheapest week-one card in the game. It exists only while she is with you.',
  show: gate('AL09'),
  req: gate('AL09'),
  odds: () => 0.95,
  run: s => {
    s.volPool += 4;
    s.contacts += 40;
    return 'Nine people and a folding table by Saturday. +4 volunteers.';
  }
};

export const MACHINE_DOOR_PLAYS: PlayCard[] = [MD_AL16, MD_AL02, MD_AL12, MD_AL09];

/**
 * Doors permanently closed: members who hold one and have gone. This is the
 * copy the dossier shows — the whole point of the system is that the loss is
 * legible, so the wording lives here rather than in the UI.
 */
export function closedDoors(departedIds: string[]): { ally: string; card: string }[] {
  const out: { ally: string; card: string }[] = [];
  for (const id of departedIds) {
    const cardId = DOOR_BY_ALLY[id];
    if (!cardId) continue;
    const card = MACHINE_DOOR_PLAYS.find(c => c.id === cardId);
    if (card) out.push({ ally: memberName(id), card: card.n });
  }
  return out;
}
