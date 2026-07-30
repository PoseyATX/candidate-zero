/**
 * CANDIDATE ZERO — The Ask: what your machine costs you.
 *
 * The Machine (engine/machine.ts) gave the player something to build and lose.
 * On its own that is still a one-way asset: it helps you and never asks
 * anything back, which is not how a political machine works and is not
 * Covenant 6 ("power is never clean").
 *
 * So: a member who is with you occasionally calls in a favour. Honouring it
 * costs AP in the week you can least spare it and deepens the relationship;
 * refusing costs standing and can start them cooling. There is no third option
 * and no free dismissal — refusing is simply not playing the card, which means
 * the decision is made with the same currency as everything else.
 *
 * DELIBERATELY NOT A DIALOG. Popups were the loudest complaint on the board, a
 * modal you dismiss costs nothing, and the whole point is that the favour has a
 * price. It is a card (data/machine-asks.ts) that competes for the week's AP.
 */

import { random } from './rng.js';
import type { GameState } from './types.js';

/** Chance per week that someone with you calls, once the machine is seated. */
export const ASK_CHANCE = 0.22;

/** Standing swing for honouring vs refusing. Refusal bites harder than a
 *  grant rewards — a favour remembered is worth less than a favour refused. */
export const ASK_GRANT_STANDING = 12;
export const ASK_REFUSE_STANDING = -18;

/**
 * GameState.sessionFlags is Record<string, boolean | number>, so the asker is
 * stored as a keyed flag (`machineAsker:AL02 = 1`) rather than as a string
 * value. Widening that record would ripple into the Unity codegen for no gain.
 */
const ASKER_PREFIX = 'machineAsker:';
const ASK_WEEK_KEY = 'machineAskWeek';

/** Who is asking this week, or null. */
export function askerId(state: GameState): string | null {
  const flags = state.sessionFlags;
  if (!flags) return null;
  for (const k of Object.keys(flags)) {
    if (k.startsWith(ASKER_PREFIX) && flags[k]) return k.slice(ASKER_PREFIX.length);
  }
  return null;
}

function clearAskerOnly(state: GameState): void {
  const flags = state.sessionFlags;
  if (!flags) return;
  for (const k of Object.keys(flags)) {
    if (k.startsWith(ASKER_PREFIX)) delete flags[k];
  }
}

export function clearAsk(state: GameState): void {
  clearAskerOnly(state);
}

/**
 * Open an ask for the week. `candidates` are the ids seated this run — only
 * people actually with you can call, since a stranger has no claim.
 * Returns the id chosen, or null.
 */
export function maybeOpenAsk(state: GameState, candidates: string[]): string | null {
  if (!candidates.length) return null;
  state.sessionFlags = state.sessionFlags || {};
  // One ask at a time. An unresolved one rides into the next week rather than
  // stacking, so the player is never handed two claims at once.
  if (askerId(state)) return null;
  if (random() >= ASK_CHANCE) return null;
  const id = candidates[Math.floor(random() * candidates.length)]!;
  state.sessionFlags[`${ASKER_PREFIX}${id}`] = 1;
  state.sessionFlags[ASK_WEEK_KEY] = state.week;
  state.log.push({
    week: state.week,
    kind: 'note',
    text: `A favour is called in this week. Honour it or don't — both are answers.`
  });
  return id;
}

/**
 * Player honoured the ask (played the card). Records it for settlement and
 * returns the play's result text.
 */
export function grantAsk(state: GameState, allyId: string): string {
  state.sessionFlags = state.sessionFlags || {};
  clearAskerOnly(state);
  // A favour honoured is worth more than the hour it cost.
  bumpPendingStanding(state, allyId, ASK_GRANT_STANDING);
  return 'You made the call, moved the meeting, showed up. It is remembered.';
}

/**
 * Week closed with an ask still open — that is a refusal. Called from the
 * weekly close, so letting the clock run out is a real answer with a real cost.
 */
export function settleUnansweredAsk(state: GameState): string | null {
  const id = askerId(state);
  if (!id) return null;
  clearAskerOnly(state);
  bumpPendingStanding(state, id, ASK_REFUSE_STANDING);
  return `The favour went unanswered. That is remembered too.`;
}

/**
 * Standing changes cannot be written here — settleMachine (engine/machine.ts)
 * is the single writer, and it runs at the end of the RUN, not the week. So
 * asks accumulate a per-run adjustment that settlement folds in.
 */
const PENDING_KEY = 'machineAskAdj';

function bumpPendingStanding(state: GameState, allyId: string, delta: number): void {
  state.sessionFlags = state.sessionFlags || {};
  const key = `${PENDING_KEY}:${allyId}`;
  const cur = Number(state.sessionFlags[key] || 0);
  state.sessionFlags[key] = cur + delta;
}

/** Net standing adjustment this run has earned for one member. */
export function pendingAskAdjustment(state: GameState, allyId: string): number {
  return Number(state.sessionFlags?.[`${PENDING_KEY}:${allyId}`] || 0);
}

/** Every member with a pending adjustment this run. */
export function askAdjustedIds(state: GameState): string[] {
  const out: string[] = [];
  for (const k of Object.keys(state.sessionFlags ?? {})) {
    if (k.startsWith(`${PENDING_KEY}:`)) out.push(k.slice(PENDING_KEY.length + 1));
  }
  return out;
}
