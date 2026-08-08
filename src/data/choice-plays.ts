/**
 * Campaign CHOICE plays — agency over dice.
 *
 * CHOICE means the player picks a path; resolve() does not roll. These are not
 * free power: each fork costs something real (money, standing, a door shut,
 * a favor, a story the opposition will use).
 */

import type { PlayCard } from '../engine/types.js';
import { addAlly, bankRapport } from '../engine/reputation.js';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Once-per-run: plant the flag on labor vs money before the clerk. */
export const CH01_ClaimYourDoor: PlayCard = {
  id: 'CH01',
  n: 'Claim Your Door',
  cost: { a: 1 },
  risk: 'CHOICE',
  ph: [1],
  tag: 'the path you own',
  attrs: ['CON'],
  d:
    'You tell the room which door you are taking onto the ballot — and they remember. ' +
    'This does not roll. Labor: two free signature packs and a volunteer who trusts sweat. ' +
    'Money: three hundred dollars that smell like a fundraiser, and the chairs watch how you spend it. ' +
    'You only get one claim. After that the path is the path.',
  show: s =>
    !s.ballot &&
    s.stage === 'primary' &&
    !s.sessionFlags?.claimedDoor,
  // No odds — CHOICE skips the dice in resolve. The fork is the PLAYER'S: this
  // used to branch on `s.money < 800` while the copy said "you tell the room
  // which door you are taking".
  branches: [
    {
      id: 'labor',
      n: 'Claim the petition door',
      d: '+40 signatures and a volunteer who will not leave early. The money people take notes.',
      run: s => {
        s.sessionFlags = s.sessionFlags || {};
        s.sessionFlags.claimedDoor = 1;
        s.signatures += 40;
        s.volPool += 1;
        s.sessionFlags.doorLabor = 1;
        return (
          'You claim the zero-dollar door in public. Two sheets of petitions and a volunteer ' +
          'who will not leave early. The money people take notes — they prefer candidates who pay.'
        );
      }
    },
    {
      id: 'money',
      n: 'Claim the paid door',
      d: '+$300 and a point of name ID. The labor kids watch to see if you ever walk another Saturday.',
      run: s => {
        s.sessionFlags = s.sessionFlags || {};
        s.sessionFlags.claimedDoor = 1;
        s.money += 300;
        s.nameID += 1;
        s.sessionFlags.doorMoney = 1;
        return (
          'You claim the paid door in public. Three hundred lands in the account like a dare, ' +
          'and the labor kids watch to see if you ever walk another Saturday.'
        );
      }
    }
  ]
};

/**
 * The line that goes on the mailer, and which half of the district it is for.
 *
 * Was "Sharpen or Soften", which is two verbs and no picture — a player reading
 * it had no idea what a mailer, a wing or a group text had to do with any of
 * it, and the card then chose for them anyway off whichever face happened to be
 * larger. Now it is a sentence about a piece of mail, and the player writes it.
 */
export const CH02_TheLineOnTheMailer: PlayCard = {
  id: 'CH02',
  n: 'The Line on the Mailer',
  cost: { a: 2 },
  risk: 'CHOICE',
  ph: [1, 2, 3],
  tag: 'the line you live with',
  attrs: ['CON', 'DIP'],
  d:
    'The printer needs the copy by Thursday and it is going to sixty thousand doors with your ' +
    'face on it. This does not roll — you write the line, and you live with it the rest of the run. ' +
    'Hard copy brings your own people out and makes the country-club wing flinch. ' +
    'Careful copy brings two chairs who want a deal and cools the true believers on you. ' +
    'One mailer. The district hears whichever one you sent.',
  show: s =>
    (s.stage === 'primary' || s.stage === 'general') &&
    !s.sessionFlags?.lineSet,
  branches: [
    {
      id: 'hard',
      n: 'Write it hard',
      d: 'Message stays sharp all run, +2 momentum, your base turns out — moderates flinch.',
      run: s => {
        s.sessionFlags = s.sessionFlags || {};
        s.sessionFlags.lineSet = 1;
        s.messageSharp = true;
        s.momentum += 2;
        s.faces.F = (s.faces.F || 0) + 3;
        s.faces.G = Math.max(0, (s.faces.G || 0) - 2);
        return 'You write it hard. The line will travel. Firebrands lean in; the country-club wing goes quiet on the group text.';
      }
    },
    {
      id: 'careful',
      n: 'Write it careful',
      d: '+2 endorsement points from people who want a deal. The firebrands stop quoting you.',
      run: s => {
        s.sessionFlags = s.sessionFlags || {};
        s.sessionFlags.lineSet = 1;
        s.endorsePts += 2;
        s.faces.G = (s.faces.G || 0) + 3;
        s.faces.F = Math.max(0, (s.faces.F || 0) - 2);
        s.messageSharp = false;
        return 'You write it careful. Two chairs who wanted a deal send word. The true believers keep the program but stop quoting you.';
      }
    }
  ]
};

/** Take dirty early money — or walk. */
export const CH03_TheEnvelope: PlayCard = {
  id: 'CH03',
  n: 'The Envelope',
  cost: { a: 1 },
  risk: 'CHOICE',
  ph: [1, 2],
  tag: 'power is never clean',
  attrs: ['CRA'],
  d:
    'A man you half-know leaves an envelope under a coffee saucer. This does not roll. ' +
    'Take it: +$1,200 and the PAC string (OB1) starts tightening — Session will collect. ' +
    'Leave it: +1 favor with the Old Bulls who watch who refuses, and you stay hungry. ' +
    'Once per run. Either choice is a story someone will tell.',
  show: s =>
    (s.stage === 'primary' || s.stage === 'general') &&
    !s.sessionFlags?.envelopeResolved &&
    s.week >= 2,
  // Was decided by `s.money < 600 || s.debt > 0` — the card said "take it or
  // leave it" and then took it for you whenever you were broke, which is the
  // exact moment a player most wants the decision to be theirs.
  branches: [
    {
      id: 'take',
      n: 'Take it',
      d: '+$1,200 now. The PAC string (OB1) goes on, exposure rises, and Session collects.',
      run: s => {
        s.sessionFlags = s.sessionFlags || {};
        s.sessionFlags.envelopeResolved = 1;
        s.money += 1200;
        if (!s.obls.includes('OB1')) s.obls.push('OB1');
        s.exposure = (s.exposure || 0) + 2;
        s.faces.L = Math.max(0, (s.faces.L || 0) - 4);
        return (
          'You take the envelope. Twelve hundred solves next week. The string is already around your wrist — ' +
          'you will feel it when you seek a referral under the dome.'
        );
      }
    },
    {
      id: 'leave',
      n: 'Leave it on the table',
      d: '+1 favor and the Old Bull warms to you. You stay broke, and you stay clean.',
      run: s => {
        s.sessionFlags = s.sessionFlags || {};
        s.sessionFlags.envelopeResolved = 1;
        s.favors += 1;
        s.faces.G = (s.faces.G || 0) + 2;
        addAlly(s, 'AL12', 1);
        return (
          'You leave it. The Old Bull hears before Friday. One favor, a warmer seat at his table, ' +
          'and the man with the envelope finds someone hungrier.'
        );
      }
    }
  ]
};

/** Spend political capital to freeze a ground or cede it. */
export const CH04_HoldOrCede: PlayCard = {
  id: 'CH04',
  n: 'Hold or Cede the Ground',
  cost: { a: 2, m: 1 },
  risk: 'CHOICE',
  ph: [2, 3],
  tag: 'the map is a choice',
  attrs: ['CLO', 'CRA'],
  d:
    'You pick the turf that will define the photo op. This does not roll. ' +
    'Hold: pour organizers into the ground you last walked — big rapport, and the rival feels it. ' +
    'Cede: pull out, bank the volunteers elsewhere as raw volPool, and let them have the square. ' +
    'Costs momentum either way; the map remembers.',
  show: s =>
    (s.stage === 'primary' || s.stage === 'general') &&
    s.momentum >= 1 &&
    !!s.lastGround,
  // Was `(g.rapport||0) >= (g.rivalRap||0)` — it held wherever you were already
  // ahead, which is the safe play and never the interesting one. Ceding ground
  // you lead in to bank the bodies elsewhere is a real decision and the card
  // was not letting anybody make it.
  branches: [
    {
      id: 'hold',
      n: 'Hold it',
      d: 'Organizers flood the block you last walked: big rapport, their presence thins, +1 name ID.',
      run: s => {
        const g = s.groundsArr.find(x => x.id === s.lastGround);
        if (!g) return 'No ground in mind. The map is blank for a week.';
        bankRapport(g, 8, s);
        g.rivalRap = Math.max(0, (g.rivalRap || 0) - 6);
        s.nameID += 1;
        return (
          `You hold ${g.n}. Organizers flood the block. Rapport banks hard and their presence thins. ` +
          `The photo is you with the county, not them.`
        );
      }
    },
    {
      id: 'cede',
      n: 'Cede it',
      d: 'Pull out and redeploy: +2 volunteers, +10 contacts, and their signs go up where yours were.',
      run: s => {
        const g = s.groundsArr.find(x => x.id === s.lastGround);
        if (!g) return 'No ground in mind. The map is blank for a week.';
        g.rivalRap = Math.min(100, (g.rivalRap || 0) + 4);
        s.volPool += 2;
        s.contacts += 10;
        return (
          `You cede ${g.n}. Their signs go up and yours come down. Two volunteers and ten contacts ` +
          `redeploy to places that still answer the door.`
        );
      }
    }
  ]
};

/** Session CHOICE: protect the seat or push the bill. */
export const CH05_SeatOrStatute: PlayCard = {
  id: 'CH05',
  n: 'Seat or Statute',
  cost: { a: 2 },
  risk: 'CHOICE',
  ph: [1, 2, 3],
  tag: 'the freshman fork',
  attrs: ['CON', 'INK'],
  d:
    'Friday night under the dome. This does not roll. ' +
    'Seat: casework weight — district standing and cooler challenger heat; the bill waits. ' +
    'Statute: capital and a cooled bill stage heat; home bleeds two points while you legislate. ' +
    'Once per session week you can afford to name the priority out loud.',
  show: s =>
    s.stage === 'session' &&
    Number(s.sessionFlags?.seatOrStatuteWeek || 0) !== s.week,
  run: s => {
    s.sessionFlags = s.sessionFlags || {};
    s.sessionFlags.seatOrStatuteWeek = s.week;
    const seatCrisis =
      s.districtStanding < 55 || Number(s.sessionFlags.challengerHeat || 0) > 0;
    if (seatCrisis) {
      s.districtStanding = clamp(s.districtStanding + 8, 0, 100);
      const ch = Number(s.sessionFlags.challengerHeat || 0);
      if (ch > 0) s.sessionFlags.challengerHeat = Math.max(0, ch - 1);
      s.sessionFlags.caseworkThisWeek = true;
      return (
        'You choose the seat. Casework until the lights go out. Standing recovers; the challenger feels the cold. ' +
        'The bill sits on the desk overnight — it will still be there Monday.'
      );
    }
    s.capital += 2;
    if (s.bill) s.bill.heat = Math.max(0, (s.bill.heat || 0) - 2);
    s.districtStanding = clamp(s.districtStanding - 2, 0, 100);
    return (
      'You choose the statute. Two units of capital and the bill cools a notch. ' +
      'Home loses two points of standing — they will hear about the Friday you were not there.'
    );
  }
};

function tag(c: PlayCard): PlayCard {
  return {
    ...c,
    residency: c.residency ?? 'main',
    control: c.control ?? 'player',
    kind: c.kind ?? 'action'
  };
}

export const CHOICE_PLAYS: PlayCard[] = [
  CH01_ClaimYourDoor,
  CH02_TheLineOnTheMailer,
  CH03_TheEnvelope,
  CH04_HoldOrCede,
  CH05_SeatOrStatute
].map(tag);
