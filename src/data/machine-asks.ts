/**
 * CANDIDATE ZERO — The Ask.
 *
 * A machine member calls in a favour. One card per member, generated from the
 * same roster (data/allies.ts) the machine is built from, so a new ally needs no
 * work here.
 *
 * WHY A CARD AND NOT A DIALOG. Two reasons, both load-bearing:
 *
 *  - Popups were already the loudest complaint on the board. Another modal would
 *    have made it worse, and a dialog you dismiss costs nothing.
 *  - A card costs AP. That is the whole point: your people are an asset that has
 *    a claim on you, so honouring one has to compete with winning the week.
 *    Covenant 6 — power is never clean.
 *
 * Refusing is not a button either. You refuse by *not playing it* — cut it, or
 * let the week end. The cost of saying no is standing, settled in engine/ask.ts.
 */

import type { PlayCard } from '../engine/types.js';
import { ALLIES } from './allies.js';
import { grantAsk, askerId } from '../engine/ask.js';

/** Card id for a given member's ask. Stable, so saves round-trip. */
export function askCardId(allyId: string): string {
  return `MA_${allyId}`;
}

/** Every ask card, one per ally in the roster. */
export const MACHINE_ASK_PLAYS: PlayCard[] = Object.values(ALLIES).map(a => ({
  id: askCardId(a.id),
  n: `${a.n} Calls`,
  cost: { a: 1 },
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: 'a favour, called in',
  kind: 'ally',
  d:
    `${a.n} wants something from you, and wants it now. Honour it and you are ` +
    `owed more than you spend. Ignore it — cut the card, or just let the week ` +
    `close — and they will remember that too.`,
  // Only ever visible when this specific member is the one asking this week.
  show: s => askerId(s) === a.id,
  // SAFE and always lands: the drama is in whether you spend the AP, not in a
  // roll. A favour you agreed to does not fail.
  odds: () => 0.95,
  run: s => grantAsk(s, a.id)
}));

