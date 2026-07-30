/**
 * CANDIDATE ZERO — Match state: two careers, pointed at each other.
 *
 * engine/rival-profile.ts made an opposing campaign transportable. This is the
 * thing that holds two of them and decides, at any moment, which profile each
 * player is actually facing.
 *
 * THE PROBLEM SLOW ASYNC ACTUALLY HAS. It is not networking. It is that the
 * two players are never on the same week. One plays three weeks on a Tuesday
 * evening; the other opens the game on Sunday. A design that makes you wait for
 * your opponent is a design nobody finishes a match in. So:
 *
 *   YOU ARE NEVER BLOCKED. You face the most recent profile your opponent has
 *   published at or before your current week. If they have not caught up, you
 *   face their last known state — which is exactly what a real campaign does,
 *   because you cannot see what your opponent did this morning either.
 *
 * That single rule is what makes this playable at one-week-per-fortnight pace,
 * and it is why `opponentFor` takes YOUR week rather than reading a shared
 * clock. There is no shared clock.
 *
 * FAIRNESS. Because each side is always facing a published-and-frozen snapshot,
 * neither player's later play can retroactively change a week the other has
 * already resolved. Combined with the deterministic opponent stream
 * (opponentSeed over profile+week), a resolved week is final on both machines.
 *
 * HONEST SCOPE: no transport, no matchmaking, no auth. A MatchState is a plain
 * JSON object; moving it between two people is somebody else's problem, and
 * deliberately so — see docs/DEFERRED.md C5.
 */

import {
  isRivalProfile,
  normaliseRivalProfile,
  type RivalProfile
} from './rival-profile.js';

/** Bump on any change to the shapes below. Old matches are refused, not guessed. */
export const MATCH_VERSION = 1;

/**
 * One published week. Frozen: once a player has posted week N, that is what
 * their opponent faces for week N forever, whatever happens afterwards.
 */
export interface MatchDispatch {
  week: number;
  profile: RivalProfile;
  /** Epoch ms the sender stamped. Advisory only — never trusted for ordering. */
  at: number;
}

export interface MatchSide {
  /** Stable player id. Opaque to the engine. */
  id: string;
  name: string;
  /** Every week this player has published, ascending by week. */
  dispatches: MatchDispatch[];
}

export interface MatchState {
  v: number;
  id: string;
  sides: [MatchSide, MatchSide];
  created: number;
}

export function createMatch(
  id: string,
  a: { id: string; name: string },
  b: { id: string; name: string },
  now = Date.now()
): MatchState {
  if (a.id === b.id) throw new Error('a match needs two different players');
  return {
    v: MATCH_VERSION,
    id,
    sides: [
      { id: a.id, name: a.name, dispatches: [] },
      { id: b.id, name: b.name, dispatches: [] }
    ],
    created: now
  };
}

function sideOf(match: MatchState, playerId: string): MatchSide {
  const s = match.sides.find(x => x.id === playerId);
  if (!s) throw new Error(`no such player in this match: ${playerId}`);
  return s;
}

/** The other player. */
export function opponentSide(match: MatchState, playerId: string): MatchSide {
  const other = match.sides.find(x => x.id !== playerId);
  if (!other) throw new Error(`no such player in this match: ${playerId}`);
  return other;
}

/** Highest week this player has published, or 0. */
export function publishedWeek(match: MatchState, playerId: string): number {
  const d = sideOf(match, playerId).dispatches;
  return d.length ? d[d.length - 1]!.week : 0;
}

/**
 * Publish your week. Idempotent per week, and IMMUTABLE once posted — a
 * resubmission of an already-published week is rejected rather than silently
 * overwriting, because the opponent may already have resolved against it.
 *
 * The profile is normalised on the way in (engine/rival-profile.ts), so a
 * hand-edited strength never enters the match at all.
 */
export function publishWeek(
  match: MatchState,
  playerId: string,
  week: number,
  profile: RivalProfile,
  now = Date.now()
): MatchState {
  if (!Number.isFinite(week) || week < 1) throw new Error(`bad week: ${week}`);
  if (!isRivalProfile(profile)) throw new Error('unreadable profile');
  const side = sideOf(match, playerId);
  if (side.dispatches.some(d => d.week === week)) {
    throw new Error(`week ${week} is already published and cannot be rewritten`);
  }
  side.dispatches.push({ week, profile: normaliseRivalProfile(profile), at: now });
  side.dispatches.sort((x, y) => x.week - y.week);
  return match;
}

/**
 * The opposition YOU face at YOUR week.
 *
 * The most recent thing they published at or before that week. If they are
 * behind, you face their last known state rather than waiting — see the module
 * note. Returns null only when they have published nothing at all yet.
 */
export function opponentFor(
  match: MatchState,
  playerId: string,
  myWeek: number
): RivalProfile | null {
  const them = opponentSide(match, playerId);
  let best: MatchDispatch | null = null;
  for (const d of them.dispatches) {
    if (d.week <= myWeek && (!best || d.week > best.week)) best = d;
  }
  // Before they have posted anything at all there is nothing honest to show.
  // Callers fall back to the synthetic rival, so the race still has an opponent.
  return best ? best.profile : null;
}

export interface MatchStanding {
  /** Weeks each side has published. */
  weeks: [number, number];
  /** How far ahead the leader is, in weeks. */
  gap: number;
  /** Player id of whoever is behind, or null when level. */
  behind: string | null;
  /** True when the trailing side is far enough back to be worth nudging. */
  stalled: boolean;
  /** Epoch ms of the most recent dispatch from either side, or 0. */
  lastActivity: number;
}

/** How many weeks behind counts as stalled — worth a nudge, never a forfeit. */
export const STALL_WEEKS = 3;

/**
 * Where the match stands.
 *
 * Deliberately reports rather than punishes. There is no forfeit and no timer:
 * a slow opponent should cost you nothing, because the whole premise is that
 * this is played across weeks of real life. A caller can use `stalled` to send
 * a reminder; the engine will not end a match over it.
 */
export function matchStanding(match: MatchState): MatchStanding {
  const [a, b] = match.sides;
  const wa = a.dispatches.length ? a.dispatches[a.dispatches.length - 1]!.week : 0;
  const wb = b.dispatches.length ? b.dispatches[b.dispatches.length - 1]!.week : 0;
  const gap = Math.abs(wa - wb);
  const behind = wa === wb ? null : wa < wb ? a.id : b.id;
  const last = Math.max(
    ...a.dispatches.map(d => d.at),
    ...b.dispatches.map(d => d.at),
    0
  );
  return {
    weeks: [wa, wb],
    gap,
    behind,
    stalled: gap >= STALL_WEEKS,
    lastActivity: last
  };
}

/** Structural check for a match that arrived from outside. */
export function isMatchState(x: unknown): x is MatchState {
  if (!x || typeof x !== 'object') return false;
  const m = x as Partial<MatchState>;
  return (
    m.v === MATCH_VERSION &&
    typeof m.id === 'string' &&
    Array.isArray(m.sides) &&
    m.sides.length === 2 &&
    m.sides.every(
      s => !!s && typeof s.id === 'string' && Array.isArray(s.dispatches)
    )
  );
}

/**
 * Read a match from the wire.
 *
 * Every dispatch is re-normalised, so a match file edited between sessions
 * cannot smuggle in a profile that `publishWeek` would have rejected. Duplicate
 * weeks are collapsed to the FIRST one seen — the earliest publication wins,
 * since that is the one an opponent may already have played against.
 */
export function parseMatch(json: string): MatchState {
  const raw: unknown = JSON.parse(json);
  if (!isMatchState(raw)) throw new Error(`unreadable match (want v${MATCH_VERSION})`);
  const m = raw;
  for (const side of m.sides) {
    const seen = new Set<number>();
    const clean: MatchDispatch[] = [];
    for (const d of side.dispatches) {
      if (!d || !Number.isFinite(d.week) || d.week < 1) continue;
      if (seen.has(d.week)) continue;
      if (!isRivalProfile(d.profile)) continue;
      seen.add(d.week);
      clean.push({
        week: Math.round(d.week),
        profile: normaliseRivalProfile(d.profile),
        at: Number.isFinite(d.at) ? d.at : 0
      });
    }
    clean.sort((x, y) => x.week - y.week);
    side.dispatches = clean;
  }
  return m;
}
