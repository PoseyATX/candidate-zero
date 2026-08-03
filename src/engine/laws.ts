/**
 * CANDIDATE ZERO — The Statute Book.
 *
 * What you passed, still on the books, in every run after the one that passed it.
 *
 * Until now a law was an outcome string. `session_law` fed a share number, two
 * legacy trait gates and an epitaph, and then the next campaign started from a
 * world in which nothing you had ever done existed. The bill was filed and it
 * meant nothing — which is the difference between a scoreboard and a career.
 *
 * A statute is not a trophy. It is a thing that keeps happening to people:
 *
 *   - **It works, and the district remembers.** The counties your provisions
 *     served start you warmer. Delivering is how members survive.
 *   - **It comes up for air.** Money sunsets, authority expires, the program
 *     needs reauthorizing. Every law you pass hands your future self a fight
 *     you would not otherwise have had — that is the reauthorization opening.
 *   - **It can be taken away.** The people it beat did not stop existing when
 *     the Governor signed it, and a rival with a majority can repeal what you
 *     built. Nothing in Texas politics is ever settled; it is only currently
 *     decided.
 *
 * That last one is the whole reason this file exists. A win you cannot lose is
 * not a win, it is a high score. The Highland Lakes are still there because
 * somebody kept defending them for ninety years.
 */

import type { GameState, LegacyState, Provision } from './types.js';
import { offerHook } from './hooks.js';

/** A statute on the books, carried between runs. */
export interface EnactedLaw {
  /** Stable id: issue + the run it passed in. */
  id: string;
  /** How it reads in the book. */
  title: string;
  issueId: string | null;
  /** The run number that passed it. */
  passedRun: number;
  /** Who carried it. */
  sponsor: string;
  /** The language that actually made it in. */
  provisions: Provision[];
  /** Grounds it served — where the goodwill lives. */
  serves: string[];
  /** Set when a later session repealed it. Kept, not deleted: the book records
   *  what was struck as well as what stands. A repealed law is still history. */
  repealedRun?: number;
}

/** Standing a still-standing law is worth at home, per provision it carried. */
export const GOODWILL_PER_PROVISION = 3;
/** Ceiling, so a long career does not make the district unlosable. */
export const MAX_GOODWILL = 12;

export function getLaws(legacy: LegacyState): readonly EnactedLaw[] {
  return legacy.laws ?? EMPTY;
}

const EMPTY: readonly EnactedLaw[] = Object.freeze([]);

/** Laws still on the books — not repealed. */
export function standingLaws(legacy: LegacyState): EnactedLaw[] {
  return getLaws(legacy).filter(l => l.repealedRun === undefined);
}

/**
 * Write the bill into the book. Called once, at sine die, on a signed law.
 *
 * A shell bill that passed still counts — it is a real statute with your name
 * on it — but it carries no provisions, so it serves nobody in particular and
 * earns no goodwill. Passing an empty bill is a line in your obituary rather
 * than a thing anybody's county noticed.
 */
export function recordLaw(
  legacy: LegacyState,
  state: GameState,
  runIndex: number
): EnactedLaw | null {
  if (!state.bill) return null;
  const provisions = [...(state.bill.provisions ?? [])];
  const serves = [...new Set(provisions.map(p => p.rewards).filter((g): g is string => !!g))];
  const law: EnactedLaw = {
    id: `LAW_${state.issueId ?? 'misc'}_${runIndex}`,
    title: state.bill.title,
    issueId: state.issueId ?? null,
    passedRun: runIndex,
    sponsor: state.persona ?? 'The Member',
    provisions,
    serves
  };
  if (!legacy.laws) legacy.laws = [];
  legacy.laws.push(law);
  return law;
}

/**
 * Goodwill a standing law buys at home, in points of district standing.
 *
 * Only counts laws that actually did something for somewhere — `serves` is
 * derived from provisions, so a shell statute is worth nothing here. Capped,
 * because a member with six laws should be hard to beat, not impossible.
 */
export function lawGoodwill(legacy: LegacyState): number {
  const total = standingLaws(legacy).reduce(
    (sum, l) => sum + l.provisions.length * GOODWILL_PER_PROVISION,
    0
  );
  return Math.min(MAX_GOODWILL, total);
}

/** Grounds where your record is known, across every standing law. */
export function servedGrounds(legacy: LegacyState): string[] {
  return [...new Set(standingLaws(legacy).flatMap(l => l.serves))];
}

/**
 * The law most exposed to repeal — the one that beat the most people.
 *
 * Chosen by how much opposition the language drew (nays), because the members
 * a provision cost you are exactly the members who will vote to strike it. The
 * bill that bought you the biggest coalition is also the one with the longest
 * list of people waiting.
 */
export function mostExposedLaw(legacy: LegacyState): EnactedLaw | null {
  const standing = standingLaws(legacy);
  if (!standing.length) return null;
  let worst = standing[0]!;
  const enemies = (l: EnactedLaw) => l.provisions.reduce((s, p) => s + p.nays, 0);
  for (const l of standing) if (enemies(l) > enemies(worst)) worst = l;
  return enemies(worst) > 0 ? worst : null;
}

/** Strike a law from the books. Kept in the list, marked. */
export function repealLaw(legacy: LegacyState, lawId: string, runIndex: number): boolean {
  const law = (legacy.laws ?? []).find(l => l.id === lawId && l.repealedRun === undefined);
  if (!law) return false;
  law.repealedRun = runIndex;
  return true;
}

/**
 * One line for the chamber log when a career's record walks in with you.
 *
 * Takes the RUN state, not LegacyState: the session machinery does not carry
 * legacy, which is why `state.carriedLaws` exists. See applyLegacy().
 */
export function statuteBookLine(state: GameState): string {
  const standing = state.carriedLaws ?? [];
  if (!standing.length) return '';
  const n = standing.length;
  // carriedLaws holds only what still STANDS, so this cannot report strikes.
  // The repeal count belongs on the terminal screen, which does have legacy.
  return (
    `THE BOOK — ${n} statute${n === 1 ? '' : 's'} of yours still stand${n === 1 ? 's' : ''}. ` +
    `The clerks know your name before you say it, and so do the people you beat to pass them.`
  );
}

/**
 * The second hook source: a statute that is still working for somebody.
 *
 * "Bill is filed and means nothing" was the fair complaint. A law that only
 * pays out as a quiet standing bonus is a trophy with a number on it. This is
 * the law reaching back and offering you something specific, on the ground it
 * actually serves, with its own name attached.
 *
 * Only laws that CARRY PROVISIONS offer. A shell bill that passed is a line in
 * your obituary; nobody in Lamesa organizes a phone bank over it.
 *
 * See engine/hooks.ts — this is the registry proving it is a registry. Nothing
 * in hooks.ts changed to admit statutes.
 */
export function offerStatuteHooks(state: GameState, legacy: LegacyState): number {
  let n = 0;
  for (const law of standingLaws(legacy)) {
    if (!law.provisions.length) continue;
    const ground = law.serves[0];
    if (!ground) continue;
    const h = offerHook(state, {
      id: `HK_${law.id}`,
      n: `The people ${law.title} actually helped`,
      d:
        `Somebody who got the money is asking what they can do about it. ` +
        `A statute nobody organizes around is just paper in Austin.`,
      kind: 'statute',
      source: law.id,
      ground,
      stages: ['primary', 'general']
    });
    if (h) n++;
  }
  return n;
}
