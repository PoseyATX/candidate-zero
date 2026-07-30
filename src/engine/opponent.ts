/**
 * CANDIDATE ZERO — The opposition, as an agent.
 *
 * Before this, the entire adversary model was: pick a random ground, add a
 * random 5-40 rapport, log it. That is weather. Nothing in the game ever
 * decided to come after the player — `hitPieces`, the one genuinely painful
 * lever (-0.055 primary odds, -0.05 general, +0.03 opponent baseline), was
 * only ever produced by random events or the player's own shadow plays.
 *
 * This module reads the board and picks one action a week. Everything it uses
 * already existed: Ground.rivalRap, hitPieces, momentum, nameID, exposure.
 *
 * COVENANT NOTE (4 — brutal, impartial RNG): randomness here governs *how
 * much*, never *whether*. The choice of action is deterministic from board
 * state. resolve.ts is untouched — this is an opponent making decisions, not
 * a thumb on the dice.
 *
 * The player must be able to SEE this happening. Every action logs in fiction
 * naming the cause, because an opponent you cannot perceive reacting is
 * indistinguishable from no opponent at all.
 */

import { random } from './rng.js';
import type { GameState, Ground } from './types.js';

export type OpponentArchetype = 'machine' | 'insurgent' | 'incumbent';

export type OpponentAction = 'contest' | 'negative' | 'consolidate' | 'ground_game';

/** Flag key for the archetype, stored on sessionFlags so it survives save/load. */
const ARCHETYPE_FLAG = 'oppArchetype';

const ARCHETYPE_LABEL: Record<OpponentArchetype, string> = {
  machine: 'the county machine',
  insurgent: 'the insurgent',
  incumbent: 'the incumbent'
};

/**
 * Who this week's move came from.
 *
 * These lines used to say "the county machine", every run, forever — which is
 * weather, not an opponent. engine/rival.ts writes the persistent rival's name
 * into `state.rivals` at run start, so the same decision table now reads as a
 * person with a record against you. Falls back to the archetype when there is
 * no career yet (a one-off harness state, or the very first contact).
 */
function opponentName(state: GameState, a: OpponentArchetype): string {
  const named = state.rivals?.[0]?.n;
  return named && named !== 'Rival 1' ? named : ARCHETYPE_LABEL[a];
}

/**
 * Archetype from the district you filed in. A safe seat is held by a machine;
 * a competitive one draws an insurgent; the wrong-party trap is defended by an
 * entrenched incumbent who will go negative early.
 */
export function archetypeForDistrict(state: GameState): OpponentArchetype {
  const align = state.district?.align;
  if (align === 'wrong' || state.district?.trap) return 'incumbent';
  if (align === 'competitive') return 'insurgent';
  return 'machine';
}

export function getArchetype(state: GameState): OpponentArchetype {
  const held = state.sessionFlags?.[ARCHETYPE_FLAG];
  if (typeof held === 'number' && held >= 0 && held <= 2) {
    return (['machine', 'insurgent', 'incumbent'] as const)[held]!;
  }
  return archetypeForDistrict(state);
}

export function setArchetype(state: GameState, a: OpponentArchetype): void {
  state.sessionFlags = state.sessionFlags || {};
  state.sessionFlags[ARCHETYPE_FLAG] = { machine: 0, insurgent: 1, incumbent: 2 }[a];
}

/**
 * rivalOddsPenalty saturates at rivalRap 100, so banking past that is a wasted
 * week. The opposition treats a ground at SATURATED as won and moves on.
 */
export const RIVAL_RAP_CAP = 100;

/**
 * Rival strength (engine/rival.ts) above which they can afford negative mail
 * every second week instead of every third. The sharpest thing accumulated
 * strength buys them — each hit piece is -0.055 primary odds.
 *
 * It lives HERE rather than in rival.ts because it governs opponent behaviour,
 * and rival.ts already imports from this module; the other direction would
 * close an import cycle.
 *
 * A threshold rather than a curve because a cadence must be a whole number of
 * weeks. applyRival announces it in the log and the dossier bar shows the
 * approach, so it reads as a deadline the player let arrive rather than as the
 * difficulty silently changing. Roughly three cycles of losing gets them here.
 */
export const WELL_FUNDED_AT = 55;
const SATURATED = 85;

/**
 * The player's strongest turf that is still worth contesting — a ground the
 * opposition has already saturated is won, and pounding it again buys nothing.
 */
export function playerBestGround(state: GameState): Ground | undefined {
  const held = state.groundsArr.filter(
    g => (g.rapport || 0) > 0 && (g.rivalRap ?? 0) < SATURATED
  );
  if (!held.length) return undefined;
  return held.slice().sort((a, b) => (b.rapport || 0) - (a.rapport || 0))[0];
}

/** Bank opposition presence, capped where the odds penalty stops caring. */
function bankRival(g: Ground, amt: number): number {
  g.rivalRap = Math.min(RIVAL_RAP_CAP, (g.rivalRap ?? 0) + amt);
  return g.rivalRap;
}

/** Where the opposition is already strongest. */
function opponentBestGround(state: GameState): Ground | undefined {
  return state.groundsArr.slice().sort((a, b) => (b.rivalRap || 0) - (a.rivalRap || 0))[0];
}

/**
 * Is the player enough of a threat to be worth attacking?
 *
 * Momentum decays 1/week, so gating on momentum alone made this fire ~1% of
 * the time — the opponent almost never went negative. Being *on the ballot*
 * with a name is the real trigger: that is the moment you stop being noise.
 */
function playerIsAhead(state: GameState): boolean {
  if ((state.exposure || 0) > 0) return true;
  if (state.ballot && (state.nameID >= 8 || state.momentum >= 1)) return true;
  return state.momentum >= 2 || state.nameID >= 14;
}

/**
 * Choose this week's action. Pure and deterministic given board state — no RNG.
 * Exported so the harness can assert the decision table directly.
 */
export function chooseAction(state: GameState, a: OpponentArchetype): OpponentAction {
  const best = playerBestGround(state);
  const bestRap = best?.rapport ?? 0;

  // An entrenched incumbent reaches for the knife first, and early.
  if (a === 'incumbent' && playerIsAhead(state)) return 'negative';

  // Anyone goes negative once you are clearly the story. Alternates with turf
  // work rather than repeating — a campaign that only ever mails is a caricature.
  // A well-funded rival can afford the mail more often: every third week at
  // baseline, every second once they are strong. hitPieces is the sharpest
  // lever in the game (-0.055 primary odds each), so this is where accumulated
  // strength is actually felt.
  const cadence = rivalStrength(state) >= WELL_FUNDED_AT ? 2 : 3;
  if (playerIsAhead(state) && state.week % cadence === 0) return 'negative';

  // A clear strongest turf is a target — the insurgent contests sooner.
  const contestBar = a === 'insurgent' ? 5 : 8;
  if (bestRap >= contestBar) return 'contest';

  // Behind and nothing to contest: shore up your own base.
  const mine = opponentBestGround(state);
  if (a === 'machine' && (mine?.rivalRap ?? 0) > 0 && (mine?.rivalRap ?? 0) < SATURATED) {
    return 'consolidate';
  }

  return 'ground_game';
}

/**
 * How much campaign the persistent rival brings (engine/rival.ts writes it at
 * run start). 0 when there is no career yet — a first-time player faces the
 * baseline opponent exactly as before, so nothing about the first run changes.
 */
function rivalStrength(state: GameState): number {
  const v = state.sessionFlags?.['rivalStrength'];
  return typeof v === 'number' ? Math.max(0, Math.min(100, v)) : 0;
}

/** Magnitude band per action. RNG lives here — in how much, never in whether. */
function amountFor(action: OpponentAction, state: GameState): number {
  const late = state.stage === 'general' ? 1.25 : 1;
  // A rival who has beaten you twice does not merely start ahead — they run a
  // better campaign every week. Up to +60% at full strength.
  const strong = 1 + rivalStrength(state) * 0.006;
  const base =
    action === 'contest' ? 10 + random() * 22
    : action === 'consolidate' ? 8 + random() * 18
    : 5 + random() * 20;
  return Math.round(base * late * strong);
}

/**
 * One opposition move per week. Replaces advanceRivalGrounds' coin-flip.
 * Returns the action taken so callers/harnesses can assert on it.
 */
export function opponentTurn(state: GameState): OpponentAction {
  const grounds = state.groundsArr;
  if (!grounds.length) return 'ground_game';

  const a = getArchetype(state);
  const who = opponentName(state, a);
  const action = chooseAction(state, a);
  const amt = amountFor(action, state);

  const log = (text: string) =>
    state.log.push({ week: state.week, kind: 'note', text });

  switch (action) {
    case 'contest': {
      const target = playerBestGround(state) ?? grounds[0]!;
      const now = bankRival(target, amt);
      log(
        `They saw your numbers on ${target.n} and moved a field team in — ` +
          `+${amt} for ${who} (they hold ${now} there now). Your best turf just got harder.`
      );
      break;
    }
    case 'negative': {
      state.hitPieces += 1;
      log(
        `${who.charAt(0).toUpperCase()}${who.slice(1)} went negative — a mail piece with your name ` +
          `in ugly type. You are the story now, and not the way you wanted.`
      );
      break;
    }
    case 'consolidate': {
      const target = opponentBestGround(state) ?? grounds[0]!;
      const now = bankRival(target, amt);
      log(
        `${who.charAt(0).toUpperCase()}${who.slice(1)} spent the week shoring up ${target.n} — ` +
          `+${amt} (they hold ${now}). They are not conceding their own base.`
      );
      break;
    }
    default: {
      const target = grounds[Math.floor(random() * grounds.length)]!;
      const now = bankRival(target, amt);
      log(
        `Opposition organizers worked ${target.n} — +${amt} (they hold ${now} there now). ` +
          `Contested turf is harder.`
      );
      break;
    }
  }

  return action;
}
