/**
 * CANDIDATE ZERO — Policy plays. The work of actually legislating.
 *
 * These are the first cards in the game that read the world instead of only
 * writing to it. Every one of them is gated on what is live on the Docket, so
 * they appear because something happened, not because a phase counter ticked.
 *
 * They are also the first CHOICE-class cards ever instantiated. `RiskClass`
 * has carried a `'CHOICE'` variant since the beginning, and the dossier has
 * shipped copy describing it — *"The card opens a fork — you pick the path, not
 * the dice alone"* — against exactly zero cards. The one class in the game whose
 * entire purpose is agency over dice had never been used. Amendment is where it
 * belongs: whether to hang language on your bill is a decision, and dice have no
 * business in it.
 *
 * Voice note, since it is load-bearing here: nobody in this building speaks in
 * abstractions. It is never "stakeholders", it is the right-of-way man with a
 * number and a deadline. It is never "rural healthcare access", it is a hundred
 * and sixty miles to deliver a baby. Burka's Best & Worst lists worked for
 * thirty years because they named people and what they actually did on a
 * specific Tuesday. Write like that or do not write.
 */

import type { PlayCard } from '../engine/types.js';
import {
  liveOpenings,
  takeOpening,
  provisionFor,
  canTake,
  takeBlockedReason,
  billIsShell,
  provisionSwing,
  missedOpenings
} from '../engine/docket.js';
import { issueProfile } from './issue-profiles.js';
import { recruitsFor, recruitLine } from '../engine/chamber.js';
import type { Provision } from '../engine/types.js';

/**
 * Language pulled back out this session, so sine die knows who to chill.
 *
 * Module-level because the stripped provision is spliced out of the bill and
 * would otherwise be unrecoverable — and the whole point of named members is
 * that betrayal has to be rememberable. Cleared by clearStripped() at session
 * entry so it never leaks between runs.
 */
const strippedThisSession: Provision[] = [];
export function takeStripped(): Provision[] {
  return strippedThisSession.splice(0, strippedThisSession.length);
}
export function clearStripped(): void {
  strippedThisSession.length = 0;
}

/** The opening this card would act on: the one closing soonest you can afford. */
function urgentOpening(s: Parameters<NonNullable<PlayCard['show']>>[0]) {
  const live = liveOpenings(s).slice().sort((a, b) => a.expiresWeek - b.expiresWeek);
  return live.find(o => canTake(s, o.id)) ?? live[0];
}

/**
 * PO01 — Hang It On The Bill.
 *
 * The core amendment verb. A CHOICE: no roll, no odds, just the trade. You are
 * buying a bloc and paying in capital, heat, and whoever the language offends.
 */
export const PO01_HangItOn: PlayCard = {
  id: 'PO01',
  n: 'Hang It On The Bill',
  cost: { a: 2 },
  risk: 'CHOICE',
  ph: [1, 2, 3],
  tag: 'the amendment',
  attrs: ['INK'],
  d:
    'Take what the week has put in front of you and write it into your bill. ' +
    'This does not roll — an amendment is a decision, not a gamble. ' +
    'The language brings the members who wanted it and costs you the ones it offends, ' +
    'draws heat that the Governor will read at the desk, and lifts the turf that asked for it. ' +
    'Ink is the attribute. ' +
    'A bill with nothing in it is a press release; a bill with everything in it never leaves the floor.',
  // Only when there is language you can ACTUALLY hang right now — filed bill,
  // still amendable, capital in hand. Showing it otherwise makes a card that
  // looks playable, costs 2 AP and does nothing, which is precisely the failure
  // this whole pass exists to stop shipping.
  show: s => s.stage === 'session' && liveOpenings(s).some(o => canTake(s, o.id)),
  run: s => {
    const o = urgentOpening(s);
    if (!o) return 'Nothing live on the docket. The week is quiet, which is its own warning.';
    const blocked = takeBlockedReason(s, o.id);
    if (blocked) return `${o.n} — ${blocked}.`;
    const prov = provisionFor(o.id);
    if (!prov) return `${o.n} — no language drafted for that yet.`;
    const r = takeOpening(s, o.id, { id: `PV_${o.id}`, ...prov });
    if (!r.ok) return `${o.n} — ${r.reason}.`;
    const p = r.provision!;
    // NOTE: provision heat is deliberately NOT added to bill heat.
    //
    // Bill heat models TIME — a bill sitting still burns political oxygen, and
    // billOdds charges 5 points of advance odds per point of it. Controversy is
    // a different thing: language does not make a committee slower, it makes the
    // Governor angrier. Routing provisions through bill heat measured at 11.2
    // mean final heat against a cap of 12, which is −55pp on every pipeline
    // motion — amended bills physically could not move, and the law rate fell
    // from 40.3% to 8.7%. Controversy is charged where it belongs: at the desk.
    // See provisionHeat() in engine/docket.ts and the veto roll in session.ts.
    const who = recruitLine(recruitsFor(p, s.issueId ?? null));
    return (
      `AMENDED — "${p.n}" goes into the bill. ${p.d} ` +
      `+${p.ayes} ayes, −${p.nays} nays, heat +${p.heat}. ` +
      `${who ? `${who} ` : ''}` +
      `${p.angers ? `${p.angers} will remember this one.` : 'Nobody objected out loud, which is not the same as nobody objecting.'}`
    );
  }
};

/**
 * PO02 — Work the Window.
 *
 * Buys time. The most under-modelled resource in every legislature: an opening
 * that closes on Thursday is worth nothing on Friday, and a member who can hold
 * a hearing date open for two more weeks has real power.
 */
export const PO02_WorkTheWindow: PlayCard = {
  id: 'PO02',
  n: 'Work the Window',
  cost: { a: 1 },
  risk: 'STD',
  ph: [1, 2, 3],
  tag: 'the calendar is a weapon',
  attrs: ['DIP'],
  d:
    'Ask the chair to hold the hearing date open. Two more weeks on the oldest live item on your docket. ' +
    'Diplomacy is the attribute, and this is the cheapest real power in the building: ' +
    'the difference between a law and a good idea is usually whether you were ready the week the room cared. ' +
    'Fails politely — a chair who says no has still told you where you stand.',
  show: s => s.stage === 'session' && liveOpenings(s).length > 0,
  odds: s => 0.55 + Math.min(0.25, (s.favor - 50) * 0.006),
  run: (s, o) => {
    const live = liveOpenings(s).slice().sort((a, b) => a.expiresWeek - b.expiresWeek);
    const target = live[0];
    if (!target) return 'Nothing left to hold open.';
    if (o.tier <= 1) {
      target.expiresWeek += 2;
      return (
        `The chair pencils it forward. "${target.n}" stays live through week ${target.expiresWeek}. ` +
        `${target.opposition} now has to keep paying attention, which costs them more than it costs you.`
      );
    }
    target.expiresWeek = Math.max(s.week, target.expiresWeek - 1);
    return (
      `The chair is sympathetic and busy, which in this building are the same answer. ` +
      `"${target.n}" loses a week instead of gaining two.`
    );
  }
};

/**
 * PO03 — Read the Room on It.
 *
 * Intelligence. Fenstemaker's actual power in *The Gay Place* was never the
 * gavel; it was knowing precisely what each member needed and what each one was
 * frightened of. This is that, priced at one action.
 */
export const PO03_ReadTheRoom: PlayCard = {
  id: 'PO03',
  n: 'Read the Room on It',
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'the count before the vote',
  attrs: ['DIP'],
  d:
    'Walk the back rail and take an honest count on your own bill. ' +
    'Tells you where the tally actually stands with the language you have attached, ' +
    'what it has cost you in heat, and which windows are about to shut. ' +
    'Safe, cheap, and the single most valuable thing a freshman can do — ' +
    'the members who last are the ones who never get surprised on the floor.',
  show: s => s.stage === 'session' && !!s.bill,
  odds: () => 0.95,
  run: s => {
    const swing = provisionSwing(s);
    const ps = s.bill?.provisions ?? [];
    const live = liveOpenings(s);
    const missed = missedOpenings(s);
    const prof = issueProfile(s.issueId);
    const parts: string[] = [];
    parts.push(
      ps.length
        ? `${ps.length} provision${ps.length === 1 ? '' : 's'} on the bill, net ${swing >= 0 ? '+' : ''}${swing} members.`
        : 'The bill is a clean shell. Nothing in it, nobody owed by it, nobody angered by it.'
    );
    if (live.length) {
      const soonest = live.slice().sort((a, b) => a.expiresWeek - b.expiresWeek)[0]!;
      parts.push(`"${soonest.n}" closes week ${soonest.expiresWeek}.`);
    }
    if (missed.length) {
      parts.push(`${missed.length} window${missed.length === 1 ? '' : 's'} already shut behind you.`);
    }
    if (prof) parts.push(prof.hard);
    return `THE COUNT — ${parts.join(' ')}`;
  }
};

/**
 * PO04 — Strip the Language.
 *
 * The other half of amendment, and the half games always forget. Sometimes the
 * provision that bought you eleven members is the exact reason the Governor
 * reaches for the veto, and a member who cannot count backwards dies on the
 * desk with a bill full of friends.
 */
export const PO04_StripLanguage: PlayCard = {
  id: 'PO04',
  n: 'Strip the Language',
  cost: { a: 2 },
  risk: 'CHOICE',
  ph: [1, 2, 3],
  tag: 'the retreat that saves it',
  attrs: ['CRA'],
  d:
    'Pull your most inflammatory provision back out of the bill. ' +
    'You lose the members it bought and the turf that wanted it, and you cool the bill ' +
    'by everything that language was drawing. ' +
    'This does not roll. Craft is the attribute. ' +
    'A bill that reaches the desk radioactive gets vetoed with a statement about unintended consequences — ' +
    'knowing when to give something back is the difference between a member and a martyr.',
  show: s => s.stage === 'session' && (s.bill?.provisions?.length ?? 0) > 0,
  run: s => {
    const ps = s.bill?.provisions ?? [];
    if (!ps.length) return 'Nothing attached to strip.';
    let worstIdx = 0;
    for (let i = 1; i < ps.length; i++) if (ps[i]!.heat > ps[worstIdx]!.heat) worstIdx = i;
    const [gone] = ps.splice(worstIdx, 1);
    if (!gone) return 'Nothing attached to strip.';
    // Stripping removes the language, and the controversy goes with it —
    // provisionHeat() is computed from what is still attached.
    if (gone.rewards) {
      const g = s.groundsArr.find(x => x.id === gone.rewards);
      if (g) g.rapport = Math.max(0, (g.rapport || 0) - 3);
    }
    const lost = recruitsFor(gone, s.issueId ?? null);
    const lostLine = lost.length
      ? `${lost.slice(0, 3).map(m => m.name).join(', ')} will hear about it from their county first. `
      : '';
    // Remember what was pulled, so sine die can chill the people it burned.
    s.sessionFlags = s.sessionFlags || {};
    s.sessionFlags.strippedCount = Number(s.sessionFlags.strippedCount || 0) + 1;
    strippedThisSession.push(gone);
    return (
      `STRIPPED — "${gone.n}" comes out. You give back ${gone.ayes} ayes and ${gone.heat} points of heat. ` +
      lostLine +
      `${gone.angers ? `${gone.angers} stops working the halls against you.` : 'The room relaxes a degree.'} ` +
      `The people who wanted it will read about it.`
    );
  }
};

export const POLICY_PLAYS: PlayCard[] = [
  PO01_HangItOn,
  PO02_WorkTheWindow,
  PO03_ReadTheRoom,
  PO04_StripLanguage
];
