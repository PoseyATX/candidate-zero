/**
 * CANDIDATE ZERO — Rival profiles: the seam head-to-head play runs through.
 *
 * WHAT THIS IS FOR. The intended shape of multiplayer here is slow,
 * asynchronous, head-to-head: two humans each run their own campaign, and each
 * one's opposition IS the other's candidate. That only works if the opponent
 * the engine reasons about can come from SOMEWHERE ELSE — a file, a server, a
 * message — instead of being derived locally from the district.
 *
 * So this module defines one thing: a `RivalProfile`, a plain JSON description
 * of an opposing campaign, plus the three functions that move between it and
 * the engine.
 *
 *     profileFromRival(legacy)        synthetic opponent -> profile
 *     profileFromCampaign(state, …)   YOUR run -> the profile your opponent faces
 *     applyRivalProfile(state, p)     a profile -> this run's opposition
 *
 * engine/opponent.ts then reasons about whatever profile is seated, and neither
 * knows nor cares whether a person or the archetype table produced it. That is
 * the whole trick, and it is why the single-player rival was built on the same
 * pathway rather than beside it.
 *
 * THREE RULES THIS FILE EXISTS TO ENFORCE:
 *
 * 1. PUBLIC INFORMATION ONLY. A profile carries what an opposing campaign could
 *    actually observe — name recognition, momentum, endorsements, ballot status,
 *    visible organisation on each ground. Never a hand, a deck, a bankroll, or
 *    a seed. If it would be cheating to know it, it is not in here.
 *
 * 2. DETERMINISM ACROSS CLIENTS. Async play desyncs the moment two clients
 *    compute different opponent moves from the same information. `opponentSeed`
 *    derives a stream from (profile, week) alone, so both sides get the same
 *    answer without either having to send RNG state.
 *
 * 3. VERSIONED. Profiles cross a wire and outlive the build that wrote them.
 *    Anything unreadable is rejected, never guessed at.
 *
 * HONEST SCOPE: this is the seam and its tests, not a network stack. There is
 * no transport, no matchmaking, and no lobby here. What it buys is that adding
 * those does not require touching the opponent's decision logic.
 */

// Type-only imports on purpose. This module sits UNDER both opponent.ts and
// rival.ts in the dependency order: opponent.ts needs opponentSeed and rival.ts
// needs the profile builders, so any runtime import back into either would
// close a cycle. Types are erased, so these are free.
import type { OpponentArchetype } from './opponent.js';
import type { RivalState } from './rival.js';
import type { GameState } from './types.js';

/** Bump on any change to the shape below. Old profiles are rejected, not guessed. */
export const RIVAL_PROFILE_VERSION = 1;

/** Visible organisation on one ground, keyed by ground id. */
export type GroundPresence = Record<string, number>;

export interface RivalProfile {
  /** Schema version — see RIVAL_PROFILE_VERSION. */
  v: number;
  id: string;
  name: string;
  archetype: OpponentArchetype;
  /** 0–100. How much campaign they bring. */
  strength: number;
  /** What they visibly hold, per ground id. Absent ground = no presence. */
  ground: GroundPresence;
  /** Public campaign facts. An opposing campaign can see all of these. */
  nameID: number;
  momentum: number;
  endorsePts: number;
  ballot: boolean;
  /** Head-to-head record from the perspective of whoever receives this. */
  record: { cycles: number; beatYou: number; youBeatThem: number };
  /**
   * True when a human is behind it. Mechanically inert on purpose — the
   * opponent logic must not behave differently against a person, or the
   * single-player game stops being a rehearsal for the multiplayer one.
   * It is here so the UI can say "Wade Coker (you know him)" honestly.
   */
  human?: boolean;
}

/**
 * Strength from public facts, and the ONLY way a human profile's strength is
 * ever set.
 *
 * CHEAT RESISTANCE. `strength` used to be sent and trusted, so a client could
 * edit one number in the JSON and hand its opponent a maximally hard race — or
 * a trivial one. It is now derived on BOTH sides from facts an opposing
 * campaign could actually observe, and the receive path recomputes it rather
 * than believing what arrived. Editing `strength` on the wire now does nothing.
 *
 * Name recognition, momentum and endorsements are all readable off a newspaper;
 * ballot access is worth a lump on its own.
 *
 * HONEST LIMIT: the underlying facts are still self-reported. A determined
 * cheat can inflate nameID instead, and per-ground presence is likewise taken
 * on trust. Closing that needs the server to derive the profile from an
 * authoritative replay, or the sender to sign it — see docs/DEFERRED.md C7.
 * This removes the one-field edit, which is the cheapest possible attack.
 */
export function deriveStrength(facts: {
  nameID: number;
  momentum: number;
  endorsePts: number;
  ballot: boolean;
}): number {
  const raw =
    Math.max(0, facts.nameID) * 1.1 +
    Math.max(0, facts.momentum) * 3 +
    Math.max(0, facts.endorsePts) * 2.5 +
    (facts.ballot ? 12 : 0);
  return clamp(Math.round(raw), 0, 100);
}

/** Cheap structural check. Anything that fails is refused, not repaired. */
export function isRivalProfile(x: unknown): x is RivalProfile {
  if (!x || typeof x !== 'object') return false;
  const p = x as Partial<RivalProfile>;
  return (
    p.v === RIVAL_PROFILE_VERSION &&
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.strength === 'number' &&
    typeof p.nameID === 'number' &&
    typeof p.ballot === 'boolean' &&
    !!p.ground &&
    typeof p.ground === 'object' &&
    !!p.record &&
    typeof p.record === 'object'
  );
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * The synthetic opponent, as a profile.
 *
 * Single player goes through this deliberately. If the local rival took a
 * private shortcut into the engine, the multiplayer path would be a separate,
 * untested codepath the day it was switched on — and the single-player game
 * would stop being a rehearsal for it.
 *
 * `strengthToRap` converts the 0–100 dial into per-ground presence so the
 * synthetic opponent describes itself in exactly the same terms a human one
 * does: visible organisation on named grounds.
 */
export function profileFromRival(
  r: RivalState,
  state: GameState,
  strengthToRap: number
): RivalProfile {
  const per = Math.round(r.strength * strengthToRap);
  const ground: GroundPresence = {};
  if (per > 0) {
    for (const g of state.groundsArr) ground[g.id] = clamp(per, 0, 100);
  }
  return {
    v: RIVAL_PROFILE_VERSION,
    id: r.id,
    name: r.name,
    archetype: r.archetype,
    strength: clamp(Math.round(r.strength), 0, 100),
    ground,
    nameID: 0,
    momentum: 0,
    endorsePts: 0,
    ballot: false,
    record: { cycles: r.cycles, beatYou: r.beatYou, youBeatThem: r.youBeatThem },
    human: false
  };
}

/**
 * YOUR campaign, described as the opposition your opponent will face.
 *
 * This is the send side of head-to-head: at the end of your week (or your run)
 * this is what crosses to the other player. Note what is NOT read — deck, hand,
 * money, seed, sessionFlags — because none of it is observable from outside.
 *
 * `strength` is derived from public standing rather than copied, so a human
 * opponent and a synthetic one are measured on the same 0–100 dial and the
 * opponent logic needs no special case.
 */
export function profileFromCampaign(
  state: GameState,
  who: { id: string; name: string; archetype?: OpponentArchetype },
  record: RivalProfile['record'] = { cycles: 0, beatYou: 0, youBeatThem: 0 }
): RivalProfile {
  const ground: GroundPresence = {};
  for (const g of state.groundsArr) {
    const held = Math.round(g.rapport || 0);
    if (held > 0) ground[g.id] = clamp(held, 0, 100);
  }
  const derived = deriveStrength({
    nameID: state.nameID || 0,
    momentum: state.momentum || 0,
    endorsePts: state.endorsePts || 0,
    ballot: !!state.ballot
  });
  return {
    v: RIVAL_PROFILE_VERSION,
    id: who.id,
    name: who.name,
    archetype: who.archetype ?? 'insurgent',
    strength: derived,
    ground,
    nameID: Math.round(state.nameID || 0),
    momentum: Math.round(state.momentum || 0),
    endorsePts: Math.round(state.endorsePts || 0),
    ballot: !!state.ballot,
    record,
    human: true
  };
}

/** Flag keys the seated profile lives under, so it survives save/load. */
export const PROFILE_FLAG = 'rivalProfile';
const NAME_FLAG_PREFIX = 'rivalProfileName:';

/**
 * Seat a profile as this run's opposition.
 *
 * The profile itself lives on `state.rivalProfile` — it is campaign state, it
 * is JSON, and it has to survive save/load intact for a paused async match to
 * resume. `sessionFlags` is `Record<string, boolean | number>` and could not
 * hold it anyway; the couple of scalars the weekly logic wants are mirrored
 * into flags for cheap access.
 */
export function applyRivalProfile(state: GameState, p: RivalProfile, asOfWeek = 0): void {
  if (!isRivalProfile(p)) {
    throw new Error(`unreadable rival profile (want v${RIVAL_PROFILE_VERSION})`);
  }
  state.rivals = [{ id: p.id, n: p.name }];
  state.rivalProfile = p;
  state.sessionFlags = state.sessionFlags || {};
  state.sessionFlags.rivalStrength = p.strength;
  state.sessionFlags[PROFILE_FLAG] = 1;
  state.sessionFlags[`${NAME_FLAG_PREFIX}${p.id}`] = 1;
  if (p.human) state.sessionFlags.rivalIsHuman = 1;
  if (asOfWeek > 0) state.sessionFlags.rivalAsOfWeek = asOfWeek;

  // Their visible organisation becomes contested turf on your map. Ground ids
  // are shared content (data/setup.ts), so this transfers across clients.
  for (const g of state.groundsArr) {
    const held = p.ground[g.id];
    if (held) g.rivalRap = clamp(Math.max(g.rivalRap ?? 0, held), 0, 100);
  }
}

/** Is the seated opposition a human being? UI only — never a mechanic. */
export function rivalIsHuman(state: GameState): boolean {
  return !!state.sessionFlags?.rivalIsHuman;
}

/**
 * Which of THEIR weeks the seated profile describes.
 *
 * Deliberately NOT part of RivalProfile: the profile is the opponent's public
 * condition, and the week it was published is match metadata (engine/match.ts).
 * Keeping it out of the schema means a profile stays meaningful on its own and
 * the wire format did not need a version bump to carry it.
 *
 * 0 when unknown — the synthetic opponent has no publication week.
 */
export function rivalAsOfWeek(state: GameState): number {
  const v = state.sessionFlags?.rivalAsOfWeek;
  return typeof v === 'number' ? v : 0;
}

/**
 * Everything you legitimately know about an opposing campaign, ready to render.
 *
 * This is the WHOLE of it — the same fields the wire carries, no more. Keeping
 * the list here rather than in the UI means the display cannot drift into
 * showing something the profile was never allowed to contain.
 */
export function publicFacts(p: RivalProfile): { k: string; v: string }[] {
  const held = Object.values(p.ground).filter(n => n > 0);
  const strongest = held.length ? Math.max(...held) : 0;
  return [
    { k: 'Name ID', v: String(p.nameID) },
    { k: 'Momentum', v: String(p.momentum) },
    { k: 'Endorsements', v: String(p.endorsePts) },
    { k: 'Ballot', v: p.ballot ? 'On' : 'Not yet' },
    {
      k: 'Organised on',
      v: held.length
        ? `${held.length} ${held.length === 1 ? 'ground' : 'grounds'} · strongest ${strongest}`
        : 'nothing visible'
    }
  ];
}

/**
 * What an opposing campaign CANNOT see, named out loud.
 *
 * The point of an asymmetric-information game is that the player understands
 * where the fog is. Listing the fog is more honest than leaving them to guess
 * whether the opponent is reading their hand — and it is the same list the
 * profile harness asserts never crosses the wire.
 */
export const HIDDEN_FROM_OPPONENT = [
  'their hand',
  'their deck',
  'their bankroll',
  'what they will play next'
] as const;

/**
 * The RNG stream for one opponent turn.
 *
 * Async head-to-head desyncs the instant two clients disagree about what the
 * opponent did, so the stream must be derivable from information both sides
 * already hold — the profile and the week — and from nothing else. In
 * particular it must NOT come from the local campaign seed, which the other
 * player does not have and should not be sent.
 *
 * FNV-1a over a canonical string: stable across engines, and cheap.
 */
export function opponentSeed(p: RivalProfile, week: number): number {
  const canon =
    `${p.v}|${p.id}|${p.strength}|${p.nameID}|${p.momentum}|${p.endorsePts}|` +
    `${p.ballot ? 1 : 0}|${Object.keys(p.ground).sort().map(k => `${k}:${p.ground[k]}`).join(',')}|w${week}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < canon.length; i++) {
    h ^= canon.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0 || 1;
}

/** Round-trip through JSON, the way a transport would. Rejects junk. */
export function parseRivalProfile(json: string): RivalProfile {
  const raw: unknown = JSON.parse(json);
  if (!isRivalProfile(raw)) {
    throw new Error(`unreadable rival profile (want v${RIVAL_PROFILE_VERSION})`);
  }
  return normaliseRivalProfile(raw);
}

/**
 * THE TRUST BOUNDARY. Everything that arrives from outside this client passes
 * through here; everything built locally does not.
 *
 * A profile off the wire is a claim, not a fact. This recomputes what can be
 * recomputed and clamps what cannot, so a hand-edited file cannot hand its
 * opponent an unwinnable race:
 *
 *  - `strength` is DISCARDED and re-derived from the public facts.
 *  - facts and per-ground presence are clamped to legal ranges.
 *  - `human` is forced true: it arrived from somewhere, so a person sent it,
 *    and it must not be able to masquerade as the synthetic opponent.
 */
export function normaliseRivalProfile(p: RivalProfile): RivalProfile {
  const nameID = clamp(Math.round(p.nameID || 0), 0, 1000);
  const momentum = clamp(Math.round(p.momentum || 0), 0, 100);
  const endorsePts = clamp(Math.round(p.endorsePts || 0), 0, 100);
  const ballot = !!p.ballot;
  const ground: GroundPresence = {};
  for (const [k, v] of Object.entries(p.ground ?? {})) {
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    const held = clamp(Math.round(v), 0, 100);
    if (held > 0) ground[k] = held;
  }
  const rec = p.record ?? { cycles: 0, beatYou: 0, youBeatThem: 0 };
  return {
    v: RIVAL_PROFILE_VERSION,
    id: String(p.id).slice(0, 64),
    name: String(p.name).slice(0, 64),
    archetype: p.archetype === 'incumbent' || p.archetype === 'insurgent' ? p.archetype : 'machine',
    strength: deriveStrength({ nameID, momentum, endorsePts, ballot }),
    ground,
    nameID,
    momentum,
    endorsePts,
    ballot,
    record: {
      cycles: clamp(Math.round(rec.cycles || 0), 0, 9999),
      beatYou: clamp(Math.round(rec.beatYou || 0), 0, 9999),
      youBeatThem: clamp(Math.round(rec.youBeatThem || 0), 0, 9999)
    },
    human: true
  };
}
