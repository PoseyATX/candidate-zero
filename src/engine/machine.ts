/**
 * CANDIDATE ZERO — The Machine: the thing you build and can lose.
 *
 * The complaint this answers: a player holds on to nothing across runs except a
 * persona. Contacts and name ID carry as numbers nobody feels, the Chronicle is
 * a list of epithets, and every relationship you built is wiped at the terminal
 * screen. There was nothing to protect, so there was nothing to be invested in.
 *
 * The Machine is the people who take your call. It is not a new noun — the
 * roster already exists (data/allies.ts: Precinct Chair, County Chairwoman, Beat
 * Reporter, The Old Bull, The Slate-Maker). What was missing is that they died
 * with the run. Here they persist, deepen, cool, and walk.
 *
 * WHY IT HOOKS, stated plainly so a later pass does not sand it off: the pull is
 * loss aversion, not accumulation. A number that only ever rises is wallpaper.
 * What makes a player take the careful line in week 12 is knowing the County
 * Chairwoman he has run with for four cycles is one disaster from gone — and
 * that "gone" is permanent and named.
 *
 * COVENANT 6 (power is never clean): standing is earned by *delivering*, and the
 * people who carry you are the same people you can burn. Winning ugly costs
 * machine; losing well can preserve it. The Machine is deliberately not a pure
 * reward track.
 */

import type { GameState, LegacyState, CampaignOutcome } from './types.js';
import { ALLIES } from '../data/allies.js';
import { askAdjustedIds, pendingAskAdjustment } from './ask.js';
import { random } from './rng.js';

/** Standing bounds. Below WALK_AT they leave for good. */
export const MAX_STANDING = 100;
export const WALK_AT = 0;

/** Standing at which someone starts the next run already warm to you. */
export const WITH_YOU_AT = 45;

/**
 * How many people actually show up for a given cycle, strongest first.
 *
 * Seating everyone was measured at roughly double the week-8 ballot rate with a
 * ten-strong machine (25% -> 53%), which is power creep, not a hook. It is also
 * the wrong fiction: your whole network does not drop everything for one race.
 * Three is a bounded, legible promise — "your closest three are already in" —
 * and it keeps the meta layer a head start rather than a win button.
 */
export const SEATS_PER_RUN = 3;

/** Flag marking someone as seated from the machine this run — see seatMachine. */
export const SEATED_PREFIX = 'machineSeated:';

/** Ids seated from the machine this run. The only people who may ask. */
export function seatedIds(state: GameState): string[] {
  const flags = state.sessionFlags ?? {};
  return Object.keys(flags)
    .filter(k => k.startsWith(SEATED_PREFIX) && flags[k])
    .map(k => k.slice(SEATED_PREFIX.length));
}
/** Below this they are one bad cycle from walking — surfaced as a warning. */
export const COOLING_AT = 20;

/** Chance a departing member with real history joins the opposition instead of
 *  simply going quiet. Attrition needs a face or it is just a number falling. */
export const POACH_CHANCE = 0.5;

/** How much head start each poached member hands the rival on their turf. */
export const POACH_RIVAL_RAP = 8;

/** Everyone the opposition has taken from you, across all runs. */
export function poachedIds(legacy: LegacyState): string[] {
  return getMachine(legacy)
    .departed.filter(d => d.toRival)
    .map(d => d.id);
}

/**
 * The standing cost of what you let go: people now working against you start
 * the rival with rapport on the ground. Applied at run start, next to seating,
 * so the same screen shows what you kept and what is now aimed at you.
 */
export function applyPoachPenalty(state: GameState, legacy: LegacyState): number {
  const taken = poachedIds(legacy);
  if (!taken.length || !state.groundsArr.length) return 0;
  const per = POACH_RIVAL_RAP;
  let applied = 0;
  for (let i = 0; i < taken.length; i++) {
    const g = state.groundsArr[i % state.groundsArr.length]!;
    g.rivalRap = Math.min(100, (g.rivalRap ?? 0) + per);
    applied += per;
  }
  state.log.push({
    week: state.week,
    kind: 'note',
    text:
      `${taken.map(memberName).join(', ')} ${taken.length === 1 ? 'is' : 'are'} working for the ` +
      `other side now. They know your ground as well as you do.`
  });
  return applied;
}

export type MachineTier = 'with' | 'owes' | 'cooling' | 'gone';

export interface MachineMember {
  /** Ally id from data/allies.ts — the machine reuses that roster, not a new one. */
  id: string;
  standing: number;
  /** Cycles this person has been with you. Pure flavour weight, but it is the
   *  number that makes losing one hurt, so it is worth carrying. */
  runs: number;
  /** Run index they first joined, for "since your second filing" copy. */
  since: number;
}

/**
 * People who have walked. Permanent — this is the scar.
 *
 * `toRival` is the difference between "she drifted away" and "she is working
 * for him now". Silent decay is forgettable; a name on the other side is the
 * thing that makes a player protect the roster.
 */
export interface DepartedMember {
  id: string;
  run: number;
  why: string;
  /** They did not just leave — the other campaign picked them up. */
  toRival?: boolean;
}

export type MachineState = {
  members: MachineMember[];
  departed: DepartedMember[];
};

export function emptyMachine(): MachineState {
  return { members: [], departed: [] };
}

export function getMachine(legacy: LegacyState): MachineState {
  if (!legacy.machine) legacy.machine = emptyMachine();
  if (!Array.isArray(legacy.machine.members)) legacy.machine.members = [];
  if (!Array.isArray(legacy.machine.departed)) legacy.machine.departed = [];
  return legacy.machine;
}

export function tierOf(m: MachineMember): MachineTier {
  if (m.standing <= WALK_AT) return 'gone';
  if (m.standing >= WITH_YOU_AT) return 'with';
  if (m.standing < COOLING_AT) return 'cooling';
  return 'owes';
}

export function memberName(id: string): string {
  return ALLIES[id]?.n ?? id;
}

/** Player-facing label for a tier — the UI must not invent its own wording. */
export function tierLabel(t: MachineTier): string {
  switch (t) {
    case 'with': return 'With you';
    case 'owes': return 'Owes you';
    case 'cooling': return 'Cooling';
    default: return 'Gone';
  }
}

export function findMember(machine: MachineState, id: string): MachineMember | undefined {
  return machine.members.find(m => m.id === id);
}

/** Has this person already walked? They never come back. */
export function hasDeparted(machine: MachineState, id: string): boolean {
  return machine.departed.some(d => d.id === id);
}

/**
 * How the run went, as one number in [-1, 1]. Drives what the machine gains or
 * loses. Deliberately not just win/lose: a disciplined loss should keep your
 * people, and a chaotic win should still cost you some.
 */
export function runQuality(state: GameState, kind: CampaignOutcome): number {
  const won = kind === 'won_general' || kind === 'session_law' || kind === 'session_survived';
  const reachedBallot = state.ballot;
  const disasters = state.disasterLog?.length ?? 0;

  let q = won ? 0.6 : reachedBallot ? 0.05 : -0.35;
  // Chaos costs you people whether or not you won. Covenant 6.
  q -= Math.min(0.5, disasters * 0.12);
  // Debt and broken obligations read as "he does not take care of his own".
  if ((state.debt ?? 0) > 0) q -= 0.1;
  q -= Math.min(0.2, (state.obls?.length ?? 0) * 0.05);
  if (kind === 'session_primaried') q -= 0.15;
  return Math.max(-1, Math.min(1, q));
}

export interface MachineOutcome {
  joined: string[];
  deepened: string[];
  cooled: string[];
  walked: string[];
  /** Walked AND recruited by the opposition — a subset of `walked`. */
  poached: string[];
  /** One line per event, already player-facing. */
  lines: string[];
}

/**
 * Settle the machine at the end of a run. The single writer — standing can only
 * move here, so it can never drift from the runs that earned it.
 *
 * `runIndex` is the number of the run just finished (1-based).
 */
export function settleMachine(
  legacy: LegacyState,
  state: GameState,
  kind: CampaignOutcome,
  runIndex: number
): MachineOutcome {
  const machine = getMachine(legacy);
  const q = runQuality(state, kind);
  const out: MachineOutcome = { joined: [], deepened: [], cooled: [], walked: [], poached: [], lines: [] };

  // 1. Anyone you worked with this run banks into the machine.
  for (const ally of state.allies) {
    if (hasDeparted(machine, ally.id)) continue; // burned is burned
    const warmth = Math.max(0, ally.warm);
    if (warmth <= 0) continue;
    const gain = Math.round(8 + warmth * 4 + q * 12);
    const existing = findMember(machine, ally.id);
    if (existing) {
      existing.standing = Math.min(MAX_STANDING, existing.standing + Math.max(2, gain));
      existing.runs += 1;
      out.deepened.push(ally.id);
    } else if (gain > 0) {
      machine.members.push({
        id: ally.id,
        standing: Math.min(MAX_STANDING, Math.max(10, gain)),
        runs: 1,
        since: runIndex
      });
      out.joined.push(ally.id);
      out.lines.push(`${memberName(ally.id)} takes your call now.`);
    }
  }

  // 2. Everyone else drifts by how the cycle went. A good cycle holds the
  //    machine together; a bad one thins it. This is the part that makes the
  //    thing worth protecting rather than merely worth growing.
  const drift = Math.round(q * 10) - 4; // neutral run still costs a little
  for (const m of machine.members) {
    if (out.joined.includes(m.id) || out.deepened.includes(m.id)) continue;
    const before = m.standing;
    m.standing = Math.max(0, Math.min(MAX_STANDING, m.standing + drift));
    if (m.standing < before && tierOf(m) === 'cooling' && before >= COOLING_AT) {
      out.cooled.push(m.id);
      out.lines.push(`${memberName(m.id)} is not returning calls as fast.`);
    }
  }

  // 2b. Favours honoured and refused this run (engine/ask.ts). Settlement is
  //     the single writer for standing, so asks bank an adjustment during the
  //     run and it lands here rather than drifting mid-week.
  for (const id of askAdjustedIds(state)) {
    const adj = pendingAskAdjustment(state, id);
    if (!adj) continue;
    const m = findMember(machine, id);
    if (!m) continue;
    const before = m.standing;
    m.standing = Math.max(0, Math.min(MAX_STANDING, m.standing + adj));
    if (adj < 0 && !out.cooled.includes(id) && tierOf(m) === 'cooling' && before >= COOLING_AT) {
      out.cooled.push(id);
      out.lines.push(`${memberName(id)} asked, and you did not answer.`);
    }
  }

  // 3. Attrition. Permanent, named, and the reason any of this matters.
  const why =
    kind === 'missed_filing'
      ? 'you never made the ballot'
      : kind === 'session_primaried'
        ? 'the seat went to someone younger'
        : (state.disasterLog?.length ?? 0) > 0
          ? 'one too many bad weeks'
          : 'the cycle went cold';
  const survivors: MachineMember[] = [];
  for (const m of machine.members) {
    if (m.standing <= WALK_AT) {
      // Someone who put real cycles in does not simply retire — the other
      // campaign has been waiting for exactly this. Deeper relationships are
      // the ones worth poaching, so the people you invested most in are the
      // ones who hurt most on the way out.
      const poached = m.runs >= 2 && random() < POACH_CHANCE;
      machine.departed.push({ id: m.id, run: runIndex, why, toRival: poached || undefined });
      out.walked.push(m.id);
      if (poached) {
        out.poached.push(m.id);
        out.lines.push(
          `${memberName(m.id)} is gone — and took your playbook across the street. ` +
            `They are working the other side now.`
        );
      } else {
        out.lines.push(`${memberName(m.id)} is gone — ${why}. That door does not reopen.`);
      }
    } else {
      survivors.push(m);
    }
  }
  machine.members = survivors;
  return out;
}

/**
 * Apply the machine at the start of a run: people who are with you start warm,
 * and people who merely owe you are not granted — they have to be worked.
 *
 * Returns the ids seated, for the opening log line.
 */
export function seatMachine(state: GameState, legacy: LegacyState): string[] {
  const machine = getMachine(legacy);
  const seated: string[] = [];
  // Strongest first, so the people you have invested most in are the ones who
  // turn up — and so the cap is a meaningful choice about who you deepen.
  const candidates = [...machine.members].sort(
    (a, b) => b.standing - a.standing || b.runs - a.runs
  );
  for (const m of candidates) {
    if (seated.length >= SEATS_PER_RUN) break;
    if (tierOf(m) !== 'with') continue;
    if (state.allies.some(a => a.id === m.id)) continue;
    // Warmth scales with standing, so a four-cycle relationship is worth more
    // than one that just crossed the line.
    const warmAmt = m.standing >= 80 ? 3 : 2;
    state.allies.push({ id: m.id, warm: warmAmt, age: 0 });
    // Mark them as machine-seated. Only these people can call in a favour —
    // an ally you picked up mid-run has no standing to spend and no claim on
    // you, and letting every warm ally ask made asks fire in runs with no
    // machine at all (measured: money-path ballot 68.5% -> 62%).
    state.sessionFlags = state.sessionFlags || {};
    state.sessionFlags[`${SEATED_PREFIX}${m.id}`] = 1;
    seated.push(m.id);
  }
  return seated;
}

/** Sorted for display: strongest first, then longest-serving. */
export function rosterForDisplay(legacy: LegacyState): MachineMember[] {
  return [...getMachine(legacy).members].sort(
    (a, b) => b.standing - a.standing || b.runs - a.runs
  );
}
