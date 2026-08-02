/**
 * CANDIDATE ZERO — The Chamber. Who is with you, by name, and why.
 *
 * A provision used to buy "+16 ayes". Sixteen of what? The number WAS the
 * representation — no names, no counties, nobody who wanted the thing, and
 * therefore nobody who could remember afterwards that you delivered it or took
 * it back. A coalition you cannot name is a coalition you cannot betray, and a
 * legislature where you cannot betray anybody is not a legislature.
 *
 * This layer sits on top of the existing floor arithmetic rather than replacing
 * it: `provisionSwing` still returns the same ayes-minus-nays it always did, and
 * the balance measured in docs/THE-DOCKET.md is untouched. What is new is that
 * every one of those votes now has a person attached, and the person keeps a
 * memory across runs.
 *
 * Memory is the whole point. Deliver for Nacogdoches and Wendell Cobb takes your
 * call at ten at night for the rest of your career. Strip the language that
 * bought him and he remembers that too, and the next time you need him the price
 * has gone up.
 */

import type { GameState, LegacyState, Provision } from './types.js';
import { MEMBERS, MEMBER_BY_ID, membersReachedBy, type MemberDef } from '../data/members.js';

/** How a member currently feels about you. Persisted between runs. */
export interface MemberStanding {
  id: string;
  /** −100 hostile … +100 they answer at ten at night. */
  disposition: number;
  /** Times you put something in a bill that served their county. */
  delivered: number;
  /** Times you pulled something back out that they were promised. */
  burned: number;
}

/** Delivering a provision that reaches a member. */
export const DELIVER_WARMTH = 18;
/** Stripping language they were counted on for. */
export const BURN_CHILL = 26;
/** Above this, they are yours without asking. */
export const ALLY_LINE = 30;
/** Below this, they will work against you. */
export const HOSTILE_LINE = -25;

function book(legacy: LegacyState): Record<string, MemberStanding> {
  if (!legacy.chamber) legacy.chamber = {};
  return legacy.chamber;
}

export function standingOf(legacy: LegacyState, id: string): MemberStanding {
  const b = book(legacy);
  if (!b[id]) b[id] = { id, disposition: 0, delivered: 0, burned: 0 };
  return b[id]!;
}

/** Read-only: does not create the record. Safe on a render path. */
export function peekStanding(
  legacy: LegacyState,
  id: string
): MemberStanding | undefined {
  return legacy.chamber?.[id];
}

export function alliesOf(legacy: LegacyState): MemberDef[] {
  return MEMBERS.filter(m => (peekStanding(legacy, m.id)?.disposition ?? 0) >= ALLY_LINE);
}

export function enemiesOf(legacy: LegacyState): MemberDef[] {
  return MEMBERS.filter(m => (peekStanding(legacy, m.id)?.disposition ?? 0) <= HOSTILE_LINE);
}

/**
 * Who a provision actually brings with it.
 *
 * Reached by county (the language serves their ground) or by want (it is their
 * issue). Ordered so the heaviest — chairs, deans — read first, because those
 * are the names that matter in a count.
 */
export function recruitsFor(p: Provision, issueId: string | null): MemberDef[] {
  return membersReachedBy({ serves: p.rewards ? [p.rewards] : [], issueId })
    .slice()
    .sort((a, b) => b.weight - a.weight);
}

/** The line the log prints when language brings people with it. */
export function recruitLine(members: MemberDef[]): string {
  if (!members.length) return '';
  const named = members.slice(0, 3);
  const rest = members.length - named.length;
  const list = named.map(m => `${m.name} of ${m.county}`).join(', ');
  return `WITH YOU — ${list}${rest > 0 ? `, and ${rest} more` : ''}.`;
}

/**
 * Record what the session did to your relationships.
 *
 * Called at sine die with the bill's final language. Members reached by
 * provisions that SURVIVED warm to you; members who were reached by language you
 * stripped go cold. Both are remembered by name.
 */
export function settleChamber(
  legacy: LegacyState,
  state: GameState,
  strippedProvisions: Provision[] = []
): { warmed: MemberDef[]; burned: MemberDef[] } {
  const issueId = state.issueId ?? null;
  const warmed: MemberDef[] = [];
  const burned: MemberDef[] = [];

  for (const p of state.bill?.provisions ?? []) {
    for (const m of recruitsFor(p, issueId)) {
      const st = standingOf(legacy, m.id);
      st.disposition = Math.min(100, st.disposition + DELIVER_WARMTH);
      st.delivered += 1;
      warmed.push(m);
    }
  }
  for (const p of strippedProvisions) {
    for (const m of recruitsFor(p, issueId)) {
      const st = standingOf(legacy, m.id);
      st.disposition = Math.max(-100, st.disposition - BURN_CHILL);
      st.burned += 1;
      burned.push(m);
    }
  }
  return { warmed, burned };
}

/**
 * What your standing relationships are worth on a floor count, in members.
 *
 * Deliberately small per head and weighted by who they are — a dean with eleven
 * years on the same subcommittee brings people, a frightened freshman brings
 * herself. This is a career bonus, not a replacement for doing the work this
 * session.
 */
export function chamberSwing(state: GameState): number {
  const roster = state.chamberRoster ?? {};
  let n = 0;
  for (const [id, disp] of Object.entries(roster)) {
    const m = MEMBER_BY_ID[id];
    if (!m) continue;
    if (disp >= ALLY_LINE) n += m.weight;
    else if (disp <= HOSTILE_LINE) n -= m.weight;
  }
  return n;
}

/** Copy the memory onto the run, so the session never needs LegacyState. */
export function carryChamber(state: GameState, legacy: LegacyState): void {
  const out: Record<string, number> = {};
  for (const [id, st] of Object.entries(legacy.chamber ?? {})) {
    if (st.disposition !== 0) out[id] = st.disposition;
  }
  state.chamberRoster = out;
}

/** One line for the chamber log when people already owe you. */
export function chamberLine(legacy: LegacyState): string {
  const allies = alliesOf(legacy);
  const foes = enemiesOf(legacy);
  if (!allies.length && !foes.length) return '';
  const bits: string[] = [];
  if (allies.length) {
    bits.push(
      `${allies
        .slice(0, 2)
        .map(m => m.name)
        .join(' and ')}${allies.length > 2 ? ` and ${allies.length - 2} others` : ''} take your call`
    );
  }
  if (foes.length) {
    bits.push(
      `${foes
        .slice(0, 2)
        .map(m => m.name)
        .join(' and ')}${foes.length > 2 ? ` and ${foes.length - 2} others` : ''} will not`
    );
  }
  return `THE ROOM — ${bits.join('; ')}.`;
}
