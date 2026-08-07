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
  // No odds — CHOICE skips the dice in resolve.
  run: s => {
    s.sessionFlags = s.sessionFlags || {};
    s.sessionFlags.claimedDoor = 1;
    // Bias by current resources: broke → labor; cash-heavy → money.
    if (s.money < 800) {
      s.signatures += 40;
      s.volPool += 1;
      s.sessionFlags.doorLabor = 1;
      return (
        'You claim the zero-dollar door in public. Two sheets of petitions and a volunteer ' +
        'who will not leave early. The money people take notes — they prefer candidates who pay.'
      );
    }
    s.money += 300;
    s.nameID += 1;
    s.sessionFlags.doorMoney = 1;
    return (
      'You claim the paid door in public. Three hundred lands in the account like a dare, ' +
      'and the labor kids watch to see if you ever walk another Saturday.'
    );
  }
};

/** Burn a week of soft targets for a sharp message — or keep the soft edge. */
export const CH02_SharpenOrSoften: PlayCard = {
  id: 'CH02',
  n: 'Sharpen or Soften',
  cost: { a: 2 },
  risk: 'CHOICE',
  ph: [1, 2, 3],
  tag: 'the line you live with',
  attrs: ['CON', 'DIP'],
  d:
    'Write the line that will be on the mailer. This does not roll. ' +
    'Sharpen: message stays hard for the rest of the run, and the base shows up — but moderates flinch. ' +
    'Soften: +2 endorsement points from people who want a deal, and the firebrands cool on you. ' +
    'You can only set this once. The district hears either way.',
  show: s =>
    (s.stage === 'primary' || s.stage === 'general') &&
    !s.sessionFlags?.lineSet,
  run: s => {
    s.sessionFlags = s.sessionFlags || {};
    s.sessionFlags.lineSet = 1;
    if ((s.faces?.F || 0) >= (s.faces?.G || 0)) {
      s.messageSharp = true;
      s.momentum += 2;
      s.faces.F = (s.faces.F || 0) + 3;
      s.faces.G = Math.max(0, (s.faces.G || 0) - 2);
      return (
        'You sharpen. The line will travel. Firebrands lean in; the country-club wing goes quiet on the group text.'
      );
    }
    s.endorsePts += 2;
    s.faces.G = (s.faces.G || 0) + 3;
    s.faces.F = Math.max(0, (s.faces.F || 0) - 2);
    s.messageSharp = false;
    return (
      'You soften. Two chairs who wanted a deal send word. The true believers keep the program but stop quoting you.'
    );
  }
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
  run: s => {
    s.sessionFlags = s.sessionFlags || {};
    s.sessionFlags.envelopeResolved = 1;
    const broke = s.money < 600 || s.debt > 0;
    if (broke) {
      s.money += 1200;
      if (!s.obls.includes('OB1')) s.obls.push('OB1');
      s.exposure = (s.exposure || 0) + 2;
      s.faces.L = Math.max(0, (s.faces.L || 0) - 4);
      return (
        'You take the envelope. Twelve hundred solves next week. The string is already around your wrist — ' +
        'you will feel it when you seek a referral under the dome.'
      );
    }
    s.favors += 1;
    s.faces.G = (s.faces.G || 0) + 2;
    addAlly(s, 'AL12', 1);
    return (
      'You leave it. The Old Bull hears before Friday. One favor, a warmer seat at his table, ' +
      'and the man with the envelope finds someone hungrier.'
    );
  }
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
  run: s => {
    const g = s.groundsArr.find(x => x.id === s.lastGround);
    if (!g) return 'No ground in mind. The map is blank for a week.';
    s.sessionFlags = s.sessionFlags || {};
    // Prefer hold if we already lead; cede if rival owns it.
    const hold = (g.rapport || 0) >= (g.rivalRap || 0);
    if (hold) {
      bankRapport(g, 8, s);
      g.rivalRap = Math.max(0, (g.rivalRap || 0) - 6);
      s.nameID += 1;
      return (
        `You hold ${g.n}. Organizers flood the block. Rapport banks hard and their presence thins. ` +
        `The photo is you with the county, not them.`
      );
    }
    g.rivalRap = Math.min(100, (g.rivalRap || 0) + 4);
    s.volPool += 2;
    s.contacts += 10;
    return (
      `You cede ${g.n}. Their signs go up and yours come down. Two volunteers and ten contacts ` +
      `redeploy to places that still answer the door.`
    );
  }
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
  CH02_SharpenOrSoften,
  CH03_TheEnvelope,
  CH04_HoldOrCede,
  CH05_SeatOrStatute
].map(tag);
