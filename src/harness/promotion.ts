/**
 * Actor promotion harness — background figures become tracked actors by
 * accretion, silently, at three contacts.
 *
 * Run: npm run harness:promotion
 */

import { buildCatalog } from '../engine/loop.js';
import { createNewState, CAMPAIGN_AP } from '../engine/state.js';
import { executePlay } from '../engine/play.js';
import { setDefaultSeed } from '../engine/rng.js';
import { emptyMachine, findMember, settleMachine } from '../engine/machine.js';
import {
  PROMOTE_AT,
  contactCount,
  isPromoted,
  noteContact,
  promotedIds
} from '../engine/promotion.js';
import { ALLIES } from '../data/allies.js';
import type { GameState, LegacyState, PlayCard } from '../engine/types.js';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const CATALOG = buildCatalog();

function card(id: string): PlayCard {
  const c = CATALOG.get(id);
  if (!c) throw new Error(`missing card ${id}`);
  return c;
}

/** Fresh state with enough AP to keep playing. */
function bench(): GameState {
  const s = createNewState({ seed: 7, money: 5000, ap: CAMPAIGN_AP, tier: 1 });
  s.ballot = true;
  return s;
}

function play(s: GameState, c: PlayCard): void {
  s.ap = CAMPAIGN_AP;
  s.fieldAp = CAMPAIGN_AP;
  executePlay(s, c);
}

function main(): void {
  console.log('=== harness:promotion ===');
  setDefaultSeed(7);

  // --- 1. Threshold is exactly three, and two is a coincidence ------------
  const s1 = bench();
  noteContact(s1, 'AL07');
  noteContact(s1, 'AL07');
  assert(contactCount(s1, 'AL07') === 2, 'two contacts banked');
  assert(!isPromoted(s1, 'AL07'), 'two contacts must NOT promote');
  assert(!s1.allies.some(a => a.id === 'AL07'), 'not an ally at two');

  const promoted = noteContact(s1, 'AL07');
  assert(promoted, 'third contact promotes');
  assert(isPromoted(s1, 'AL07'), 'flagged promoted');
  assert(s1.allies.some(a => a.id === 'AL07'), 'promotion lands in state.allies');
  assert(PROMOTE_AT === 3, 'threshold is three');
  console.log(`PASSED: ${ALLIES.AL07!.n} promote at ${PROMOTE_AT} contacts, not before`);

  // --- 2. Silent. No log line, no notification, no announcement ----------
  const s2 = bench();
  noteContact(s2, 'AL05');
  noteContact(s2, 'AL05');
  const logBefore = s2.log.length;
  noteContact(s2, 'AL05');
  assert(s2.log.length === logBefore, 'promotion must not write a log entry');
  const name = ALLIES.AL05!.n;
  assert(
    !s2.log.some(e => e.text.includes(name) || /promot/i.test(e.text)),
    'promotion must never be announced'
  );
  console.log('PASSED: promotion is silent — no log entry, no announcement');

  // --- 3. Never double-grants, never re-grants an existing ally ----------
  const s3 = bench();
  for (let i = 0; i < 6; i++) noteContact(s3, 'AL07');
  assert(s3.allies.filter(a => a.id === 'AL07').length === 1, 'granted exactly once');

  const s4 = bench();
  s4.allies.push({ id: 'AL07', warm: 3, age: 0 }); // already earned the normal way
  for (let i = 0; i < 5; i++) noteContact(s4, 'AL07');
  assert(s4.allies.filter(a => a.id === 'AL07').length === 1, 'no duplicate ally');
  assert(!isPromoted(s4, 'AL07'), 'already an ally — accretion does not re-grant');
  console.log('PASSED: no double grants, no re-granting an existing ally');

  // --- 4. Unknown ids are ignored (flavour text is not a roster) ---------
  const s5 = bench();
  assert(!noteContact(s5, 'NOT_A_FIGURE'), 'unknown id ignored');
  assert(contactCount(s5, 'NOT_A_FIGURE') === 0, 'unknown id banks nothing');
  console.log('PASSED: unknown figure ids are ignored');

  // --- 5. Real plays bank contacts and promote through the card path -----
  const s6 = bench();
  const coffee = card('PL84'); // Coffee-Shop Sit-Down — the same four regulars
  play(s6, coffee);
  play(s6, coffee);
  assert(contactCount(s6, 'AL07') === 2, 'two sit-downs banked');
  assert(!s6.allies.some(a => a.id === 'AL07'), 'still scenery after two');
  play(s6, coffee);
  assert(
    s6.allies.some(a => a.id === 'AL07'),
    'third sit-down makes the regulars an actor'
  );
  console.log('PASSED: three plays of PL84 promote the Feed-Store Regulars');

  // A failed roll still counts — you stood in front of them either way.
  const s7 = bench();
  const alwaysMiss: PlayCard = { ...coffee, odds: () => 0 };
  play(s7, alwaysMiss);
  play(s7, alwaysMiss);
  play(s7, alwaysMiss);
  assert(s7.allies.some(a => a.id === 'AL07'), 'contacts accrete on misses too');
  console.log('PASSED: contact banks on a miss — the meeting happened');

  // --- 6. Promotion persists into the machine, the existing actor system --
  const legacy: LegacyState = { runs: [], traits: [], carry: {}, machine: emptyMachine() };
  const s8 = bench();
  for (let i = 0; i < PROMOTE_AT; i++) noteContact(s8, 'AL10');
  assert(promotedIds(s8).includes('AL10'), 'AL10 promoted this run');
  settleMachine(legacy, s8, 'lost_primary', 1);
  const member = findMember(legacy.machine!, 'AL10');
  assert(!!member, 'promoted figure banks into the machine at settlement');
  assert(member!.standing > 0, 'and carries standing into the next run');
  console.log(`PASSED: ${ALLIES.AL10!.n} banks into the machine — a tracked actor across runs`);

  // --- 7. Every tagged figure is a real roster entry ---------------------
  const tagged = new Set<string>();
  for (const c of CATALOG.values()) for (const f of c.figures ?? []) tagged.add(f);
  assert(tagged.size > 0, 'some plays carry figures');
  for (const id of tagged) {
    assert(!!ALLIES[id], `figure ${id} must exist in data/allies.ts`);
  }
  console.log(`PASSED: ${tagged.size} tagged figures all resolve to the ally roster`);

  // Figures with a repeatable path can actually reach the threshold. The orbit
  // movement verbs consume their pilot and never come back in a run, so a
  // figure reachable ONLY through one of those could never bank three contacts.
  // (Session cards are all residency 'special' but are freely repeatable — the
  // one-shot marker is the orbit tag, not the residency.)
  const repeatable = new Map<string, number>();
  for (const c of CATALOG.values()) {
    if (c.tag === 'orbit movement') continue;
    for (const f of c.figures ?? []) repeatable.set(f, (repeatable.get(f) ?? 0) + 1);
  }
  for (const id of ['AL05', 'AL07', 'AL10', 'AL13']) {
    assert(
      (repeatable.get(id) ?? 0) > 0,
      `${ALLIES[id]!.n} needs at least one repeatable contact source`
    );
  }
  console.log('PASSED: the four ghosts each have a repeatable road to becoming real');

  console.log('=== harness:promotion OK ===');
}

main();
