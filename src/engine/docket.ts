/**
 * CANDIDATE ZERO — The Docket.
 *
 * The seam between what the world does and what you can do about it.
 *
 * Until this existed the two halves of the game could not talk. Outside events
 * fired, subtracted a couple of points, wrote `eventsFired[id] = true` so they
 * would not repeat, and were forgotten — that flag was read by exactly zero
 * cards. A screw worm crossed the river and the only trace it left was two
 * points of momentum. Meanwhile the bill was `{ pipelineStage, heat }`: a
 * progress bar with your issue's name interpolated into its title. You could
 * not put anything IN it. Eighteen issues existed and precisely one of them
 * appeared in a mechanical condition anywhere in the codebase.
 *
 * The Docket is the hearing calendar. Three rules, and they are the whole
 * design:
 *
 *   1. **The world opens; the player closes.** Openings are written by events,
 *      not by plays. You do not get to summon a drought.
 *   2. **Windows shut.** An opening expires. The Lege meets 140 days every two
 *      years and the difference between a law and a good idea is whether you
 *      were ready the week the room cared.
 *   3. **Taking it costs.** An opening becomes a Provision — real language in
 *      your bill — and language has a constituency and an enemy. Covenant 6:
 *      power is never clean.
 *
 * The historical argument for all of it: the Highland Lakes exist because the
 * 1930s droughts and floods made an opening and Buchanan and Johnson were
 * standing there with a bill. LCRA is not a stat buff. It is language somebody
 * attached to a moment.
 */

import type { GameState, PolicyOpening, Provision } from './types.js';
import { OPENING_SEEDS, issueProfile } from '../data/issue-profiles.js';
import { OUTSIDE_EVENTS } from '../data/outside-events.js';

/** How long a typical window stays open, in weeks, unless the opening says otherwise. */
export const DEFAULT_WINDOW = 4;

/** Nobody can carry the whole session's grief at once. */
export const MAX_LIVE_OPENINGS = 5;

/**
 * Read-only view of the docket.
 *
 * Deliberately does NOT lazily assign `state.docket = []`. It used to, and
 * because `view()` calls liveOpenings() to render, merely LOOKING at the game
 * mutated it — which broke deterministic replay on every seed in
 * harness:ac1-determinism (same seed + same command log no longer reproduced
 * the same final state). A getter that writes is not a getter.
 */
export function getDocket(state: GameState): readonly PolicyOpening[] {
  return state.docket ?? EMPTY;
}

const EMPTY: readonly PolicyOpening[] = Object.freeze([]);

/** The write path — the only place the array is created. */
function mutableDocket(state: GameState): PolicyOpening[] {
  if (!state.docket) state.docket = [];
  return state.docket;
}

/** Openings that are still live at `week`: not expired, not already taken. */
export function liveOpenings(state: GameState, week = state.week): PolicyOpening[] {
  return getDocket(state).filter(o => o.takenWeek === undefined && o.expiresWeek >= week);
}

/** Openings whose window has closed unused — the ones that will haunt a run. */
export function missedOpenings(state: GameState, week = state.week): PolicyOpening[] {
  return getDocket(state).filter(o => o.takenWeek === undefined && o.expiresWeek < week);
}

export function findOpening(state: GameState, id: string): PolicyOpening | undefined {
  return getDocket(state).find(o => o.id === id);
}

/**
 * The world puts something on the calendar.
 *
 * Idempotent by id: a crisis that recurs does not stack a second copy of the
 * same hearing. Returns the opening actually on the docket, or null when it was
 * refused — full docket, or already present.
 */
export function openPolicy(
  state: GameState,
  o: Omit<PolicyOpening, 'openedWeek' | 'expiresWeek'> & {
    openedWeek?: number;
    window?: number;
  }
): PolicyOpening | null {
  const docket = mutableDocket(state);
  if (docket.some(x => x.id === o.id)) return null;
  if (liveOpenings(state).length >= MAX_LIVE_OPENINGS) return null;
  const openedWeek = o.openedWeek ?? state.week;
  const opening: PolicyOpening = {
    id: o.id,
    n: o.n,
    d: o.d,
    issueId: o.issueId,
    openedWeek,
    expiresWeek: openedWeek + (o.window ?? DEFAULT_WINDOW),
    constituency: o.constituency,
    opposition: o.opposition,
    weight: o.weight,
    source: o.source
  };
  docket.push(opening);
  return opening;
}

/**
 * How much language one bill can carry.
 *
 * Texas has a one-subject rule, and every experienced member knows the other
 * half of it: a bill that tries to carry everything anybody asked for becomes a
 * Christmas tree, and Christmas trees die. Before this cap existed there was no
 * limit at all — and the moment campaign grievances started arriving on the
 * docket too, a greedy member could hang five provisions on one bill and reach
 * the Governor carrying ~15 points of controversy. Measured: the law rate for a
 * member who amended at every opportunity fell from 39.4% to 14.1%.
 *
 * That is not difficulty, it is a missing rule. The chamber does not let you do
 * it, so the game should not either.
 */
export const MAX_PROVISIONS = 3;

/** Why an opening cannot be taken right now, '' when it can. */
export function takeBlockedReason(state: GameState, id: string): string {
  const o = findOpening(state, id);
  if (!o) return 'No such opening';
  if (o.takenWeek !== undefined) return 'Already in the bill';
  if (o.expiresWeek < state.week) return 'That window has closed';
  if (!state.bill) return 'You have no bill to put it in';
  if (state.bill.pipelineStage < 1) return 'File the bill first';
  // Once it is out of committee the language is set; you amend on the floor or
  // not at all, and this game does not pretend floor amendments are free.
  if (state.bill.pipelineStage > 4) return 'Too late — the language is set';
  if ((state.bill.provisions?.length ?? 0) >= MAX_PROVISIONS) {
    return 'The bill will not carry more — strip something first';
  }
  if ((state.capital || 0) < o.weight) return `Needs ${o.weight} capital`;
  return '';
}

export function canTake(state: GameState, id: string): boolean {
  return takeBlockedReason(state, id) === '';
}

/**
 * Convert a live opening into language in your bill.
 *
 * This is the amendment. It spends capital, adds members who wanted it, loses
 * members who did not, and draws heat — the same heat that feeds the Governor's
 * veto roll, so a bill stuffed with everything anybody ever asked for arrives at
 * the desk radioactive. That is the trade the whole system exists to offer.
 */
export function takeOpening(
  state: GameState,
  id: string,
  provision: Omit<Provision, 'fromOpening'>
): { ok: boolean; reason?: string; provision?: Provision } {
  const reason = takeBlockedReason(state, id);
  if (reason) return { ok: false, reason };
  const o = findOpening(state, id)!;
  // NOTE: `weight` is a REQUIREMENT, not a spend.
  //
  // It used to be deducted, and that double-charged every amendment: capital is
  // also worth 2.8pp per point in billOdds on every pipeline motion, so hanging
  // language both cost the capital and cost the odds that capital buys. Once
  // campaign grievances started filling the docket — so a member always had
  // something to amend — a sensible amender's law rate fell to 29.6% against a
  // clean bill's 43.7%, dying in committee at mean stage 4.4 rather than being
  // vetoed (21%, no worse than clean).
  //
  // The fiction was wrong too. Capital is what MOVES a bill; the language itself
  // is written by staff. You need standing to hang something on a bill and be
  // taken seriously — you do not burn the standing to do it.
  o.takenWeek = state.week;
  const p: Provision = { ...provision, fromOpening: o.id };
  const bill = state.bill!;
  if (!bill.provisions) bill.provisions = [];
  bill.provisions.push(p);
  // The people who wanted it notice. Rapport is where the district keeps score.
  if (p.rewards) {
    const g = state.groundsArr.find(x => x.id === p.rewards);
    if (g) g.rapport = Math.max(0, Math.min(100, (g.rapport || 0) + 4));
  }
  return { ok: true, provision: p };
}

/** Net members the attached language brings to the floor. Can be negative. */
export function provisionSwing(state: GameState): number {
  const ps = state.bill?.provisions ?? [];
  return ps.reduce((sum, p) => sum + p.ayes - p.nays, 0);
}

/**
 * What the coalition you bought is worth on a vote.
 *
 * Folded into `billOdds`, so it counts wherever the bill has to move — committee
 * members are members, and a chair reads a headcount too.
 *
 * Left at its original value on purpose. When amended bills started dying in the
 * pipeline I swept this constant up to 0.024 chasing the symptom; it bought 12pp
 * and never closed the gap. The actual cause was that taking an opening SPENT
 * capital, which is also worth 2.8pp per point in billOdds — a double charge.
 * With that fixed, 0.009 and 0.016 measure identically (35.2% both), which is
 * the tell that this was never the lever. Do not tune it to fix something else.
 */
export const COALITION_PER_MEMBER = 0.009;

export function coalitionBonus(state: GameState): number {
  return provisionSwing(state) * COALITION_PER_MEMBER;
}

/** Heat the attached language draws. Charged when the bill reaches the floor. */
export function provisionHeat(state: GameState): number {
  const ps = state.bill?.provisions ?? [];
  return ps.reduce((sum, p) => sum + p.heat, 0);
}

/**
 * What the district got out of your session, in points of standing.
 *
 * This is the other half of the amendment trade, and without it language was
 * strictly a tax: it cost action points that would otherwise move the bill, so a
 * member who amended passed fewer laws (measured: 43.0% -> 32.6%) and received
 * nothing for it. That is backwards. Members who deliver something specific for
 * home survive primaries their bills do not — the ward that got its OB grant
 * remembers at the courthouse, and it remembers longer than it remembers a
 * bill number.
 *
 * Paid at sine die, doubled when the bill actually became law, because a
 * provision that died in the Senate is a promise and a provision that was signed
 * is a clinic.
 */
export const DELIVERY_PER_PROVISION = 4;

export function deliveryStanding(state: GameState, passed: boolean): number {
  const ps = state.bill?.provisions ?? [];
  if (!ps.length) return 0;
  return ps.length * DELIVERY_PER_PROVISION * (passed ? 2 : 1);
}

/**
 * A bill with nothing in it is a press release.
 *
 * The floor does not turn out for a title. An empty bill still CAN pass — a
 * clean shell is a real legislative object and sometimes the whole strategy —
 * but it carries none of the coalition that provisions buy.
 */
export function billIsShell(state: GameState): boolean {
  return (state.bill?.provisions?.length ?? 0) === 0;
}

/** Called on every session week advance. Returns log lines for windows that shut. */
export function tickDocket(state: GameState): string[] {
  const lines: string[] = [];
  for (const o of getDocket(state)) {
    if (o.takenWeek !== undefined) continue;
    if (o.expiresWeek === state.week) {
      lines.push(
        `THE WINDOW CLOSES — ${o.n}. ${o.opposition} outlasted it, which is the ` +
          `cheapest way to kill anything in this building. It does not come back this session.`
      );
    }
  }
  return lines;
}

/**
 * Put a seeded opening from the issue tables onto the docket.
 *
 * `source` is who caused it — an event id, or 'session' for the one your own
 * issue guarantees you. Returns null if it was already there or the docket is
 * full, which is not an error: the building only has so many hearings.
 */
export function openFromSeed(
  state: GameState,
  seedId: string,
  source: string
): PolicyOpening | null {
  const seed = OPENING_SEEDS[seedId];
  if (!seed) return null;
  return openPolicy(state, {
    id: seed.id,
    n: seed.n,
    d: seed.d,
    issueId: state.issueId ?? null,
    constituency: seed.constituency,
    opposition: seed.opposition,
    weight: seed.weight,
    window: seed.window,
    source
  });
}

/**
 * The one your issue guarantees. You ran on it; the chamber expects a bill.
 *
 * Without this, an unlucky run could reach sine die with an empty docket and no
 * way to put language in its own bill, which would make the whole system a
 * lottery. The world supplies the crises; your issue supplies the floor.
 */
export function seedIssueOpening(state: GameState): PolicyOpening | null {
  const profile = issueProfile(state.issueId);
  if (!profile || !profile.openings.length) return null;
  return openFromSeed(state, profile.openings[0]!.id, 'session');
}

/**
 * The crises you campaigned through become the bills you file.
 *
 * Most outside events fire during the primary and the general, when no chamber
 * is sitting — so a door opened then has nowhere to go. That is not a reason for
 * the world to be inert during two-thirds of the game; it is the reason the
 * grievance has to travel. You ran the whole autumn on the plant closing, and
 * now you are in Austin and the plant closing is your bill.
 *
 * Reads `eventsFired`, which for the entire life of this project was written
 * once per event to stop it repeating and read by nothing at all.
 */
export function seedCampaignOpenings(state: GameState): PolicyOpening[] {
  const fired = state.eventsFired ?? {};
  const out: PolicyOpening[] = [];
  for (const ev of OUTSIDE_EVENTS) {
    if (!ev.opens?.length) continue;
    if (!fired[ev.id]) continue;
    for (const seedId of ev.opens) {
      const o = openFromSeed(state, seedId, ev.id);
      if (o) out.push(o);
    }
  }
  return out;
}

/**
 * A statute you already passed, coming up for air.
 *
 * This is what makes a law a career rather than a trophy. Money sunsets,
 * authority expires, and the people your language beat are still in the
 * building — so every session you walk into carries a fight you created
 * yourself, two years ago, by winning.
 *
 * Declining is a real option and the game does not scold you for it: the fight
 * costs action points that would otherwise move this session's bill. But a law
 * left undefended is a law that can be struck (see engine/laws.ts).
 */
export function seedLawOpenings(state: GameState): PolicyOpening[] {
  const laws = state.carriedLaws ?? [];
  const out: PolicyOpening[] = [];
  for (const law of laws) {
    const enemies = law.provisions.reduce((s, p) => s + p.nays, 0);
    if (enemies <= 0) continue;
    const opening = openPolicy(state, {
      id: `OP_REAUTH_${law.id}`,
      n: `Reauthorize ${law.title}`,
      d:
        `Your own statute, up for renewal. The people it beat have had two years ` +
        `to count votes and they have used them.`,
      issueId: law.issueId,
      constituency: law.serves,
      opposition: law.provisions.find(p => p.angers)?.angers ?? 'everyone it beat the first time',
      weight: 2,
      window: 5,
      source: law.id
    });
    if (opening) out.push(opening);
  }
  return out;
}

/** Did the player defend a given law this session? */
export function lawWasDefended(state: GameState, lawId: string): boolean {
  const o = findOpening(state, `OP_REAUTH_${lawId}`);
  return !!o && o.takenWeek !== undefined;
}

/** The provision an opening becomes, from the issue tables. */
export function provisionFor(openingId: string, state?: GameState) {
  const seeded = OPENING_SEEDS[openingId]?.provision;
  if (seeded) return seeded;
  // Reauthorizations are generated from the statute itself rather than the issue
  // tables — the language you are re-passing is the language you already wrote.
  if (openingId.startsWith('OP_REAUTH_') && state) {
    const lawId = openingId.slice('OP_REAUTH_'.length);
    const law = (state.carriedLaws ?? []).find(l => l.id === lawId);
    if (law) {
      const ayes = law.provisions.reduce((s, p) => s + p.ayes, 0);
      const nays = law.provisions.reduce((s, p) => s + p.nays, 0);
      return {
        n: `Continuation of ${law.title}`,
        d: 'The same fight, two years older, against people who have had time to prepare.',
        ayes: Math.round(ayes * 0.6),
        nays: Math.round(nays * 0.8),
        heat: 2,
        rewards: law.serves[0],
        angers: law.provisions.find(p => p.angers)?.angers
      };
    }
  }
  return undefined;
}

/** One line for the log when the world opens something. */
export function openingAnnounce(o: PolicyOpening): string {
  return (
    `ON THE DOCKET — ${o.n}. ${o.d} ` +
    `Open through week ${o.expiresWeek}; ${o.opposition} is already working the other side.`
  );
}
