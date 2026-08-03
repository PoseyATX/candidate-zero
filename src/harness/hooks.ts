/**
 * Hooks — the side-paths back, and the closed loop.
 * Run: npm run harness:hooks
 *
 * The career was a ladder with a memory. The campaign fed the chamber — meet
 * Wendell Cobb on a mail route in October and he is warm when you are sworn in —
 * and nothing came back. A member who takes your call at ten at night could not
 * cut you an ad, work his county, or tell you which ground was about to turn.
 *
 * What this asserts is the LOOP, end to end: deliver in session → the member
 * remembers → next campaign he offers → you can cash it on the trail. Each half
 * of that was already tested; the join was not, and a join nobody tests is
 * exactly where this project's bugs have lived.
 *
 * It also asserts the properties that keep hooks *hooks* rather than chores:
 * optional, sourced, and cashable once.
 */

import { createNewState } from '../engine/state.js';
import { createRng, setDefaultSeed, useRng } from '../engine/rng.js';
import { enterSession } from '../engine/session.js';
import { applyLegacy, emptyLegacy } from '../engine/legacy.js';
import { settleChamber, ALLY_LINE } from '../engine/chamber.js';
import {
  getHooks,
  liveHooks,
  offerHook,
  takeHook,
  hooksOfKind,
  findHook,
  MAX_LIVE_HOOKS
} from '../engine/hooks.js';
import { HOOK_PLAYS } from '../data/hook-plays.js';
import { MEMBER_BY_ID, MEMBERS } from '../data/members.js';
import { createCampaign, listPlayableHand } from '../engine/loop.js';
import { executePlay } from '../engine/play.js';
import type { GameState, LegacyState, Provision } from '../engine/types.js';

let failed = 0;
function assert(cond: boolean, msg: string): void {
  if (cond) console.log(`PASS: ${msg}`);
  else {
    console.error(`FAIL: ${msg}`);
    failed++;
  }
}

console.log('=== CANDIDATE ZERO — Hooks ===\n');

function prov(over: Partial<Provision> = {}): Provision {
  return {
    id: 'PV_X',
    n: 'Indemnity fund for quarantined herds',
    d: 'x',
    fromOpening: 'OP_AG_SCREWWORM',
    ayes: 16,
    nays: 7,
    heat: 2,
    rewards: 'GR02',
    angers: 'the feedlot consolidators',
    ...over
  };
}

/** A career in which you delivered for GR02 twice, so those members are allies. */
function careerWithAllies(): LegacyState {
  useRng(createRng(9));
  setDefaultSeed(9);
  const legacy = emptyLegacy();
  const s = createNewState({ seed: 9 });
  s.issueId = 'ag-subsidies';
  enterSession(s);
  s.bill!.provisions = [prov()];
  settleChamber(legacy, s);
  settleChamber(legacy, s);
  return legacy;
}

// --- THE LOOP CLOSES ---
{
  const legacy = careerWithAllies();
  const allies = MEMBERS.filter(m => (legacy.chamber?.[m.id]?.disposition ?? 0) >= ALLY_LINE);
  assert(allies.length > 0, `a delivered session makes real allies (${allies.length})`);

  const next = createNewState({ seed: 31 });
  applyLegacy(next, legacy);
  const offered = liveHooks(next);
  assert(offered.length > 0, 'and the next CAMPAIGN opens with threads from them');
  assert(
    offered.every(h => h.kind === 'member' && !!MEMBER_BY_ID[h.source]),
    'every thread names the person who offered it'
  );
  assert(
    offered.every(h => h.stages.includes('primary')),
    'and they are cashable on the trail, which is the whole point'
  );
  assert(
    next.log.some(l => /THREADS/.test(l.text)),
    'and the player is told they exist'
  );
}

// --- HOOKS ARE OPTIONAL ---
//
// A hook you must take is a quest. Ignoring every one of them has to remain a
// legitimate way to play, so nothing here may punish you for walking past it.
{
  const legacy = careerWithAllies();
  const a = createNewState({ seed: 41 });
  applyLegacy(a, legacy);
  const b = createNewState({ seed: 41 });
  applyLegacy(b, legacy);
  // Cash nothing in `a`; the ledger must be identical to `b`.
  const ledger = (s: GameState) =>
    [s.contacts, s.nameID, s.momentum, s.endorsePts, s.volPool, s.districtStanding].join(',');
  assert(ledger(a) === ledger(b), 'an unclaimed thread costs nothing and grants nothing');
  assert(liveHooks(a).length > 0, 'and it is simply still there, waiting');
}

// --- CASHED ONCE, BY A CARD, WITH A NAME ---
{
  const legacy = careerWithAllies();
  const s = createNewState({ seed: 51, ap: 9 });
  applyLegacy(s, legacy);
  s.stage = 'primary';

  const playable = HOOK_PLAYS.filter(c => c.show?.(s));
  assert(playable.length > 0, 'a hook card appears once somebody owes you');

  const card = playable[0]!;
  const before = liveHooks(s).length;
  const out = executePlay(s, card);
  assert(out.ok, `${card.id} resolves (${out.reason ?? 'ok'})`);
  assert(liveHooks(s).length === before - 1, 'and consumes exactly one thread');

  const taken = getHooks(s).find(h => h.takenWeek !== undefined)!;
  const m = MEMBER_BY_ID[taken.source]!;
  assert(
    (out.text ?? '').includes(m.name),
    `and the result names them — ${m.name} of ${m.county}, not "an ally"`
  );
  assert(!takeHook(s, taken.id), 'a favour cannot be cashed twice');
}

// --- THE THREE FAVOURS ARE GENUINELY DIFFERENT ---
//
// "An ally gives +N" is the stat-bonus-wearing-a-hat problem this project
// measured at 61% of the corpus. A diplomat spends their name; a charmer works
// their own county; everyone else tells you the truth.
{
  const touched = new Set<string>();
  for (const card of HOOK_PLAYS) {
    const legacy = emptyLegacy();
    // Force one ally of each opensTo flavour so every card has a thread.
    for (const m of MEMBERS) {
      legacy.chamber = legacy.chamber ?? {};
      legacy.chamber[m.id] = { id: m.id, disposition: 60, delivered: 2, burned: 0 };
    }
    const s = createNewState({ seed: 61, ap: 9 });
    applyLegacy(s, legacy);
    s.stage = 'primary';
    if (!card.show?.(s)) continue;
    const before = {
      nameID: s.nameID,
      contacts: s.contacts,
      rap: s.groundsArr.reduce((t, g) => t + (g.rapport || 0), 0),
      sharp: s.messageSharp,
      endorse: s.endorsePts
    };
    executePlay(s, card);
    if (s.nameID > before.nameID || s.endorsePts > before.endorse) touched.add('name');
    if (s.contacts > before.contacts) touched.add('turf');
    if (s.messageSharp && !before.sharp) touched.add('intel');
  }
  assert(
    touched.size >= 3,
    `the favours reach different systems, not one scalar (${[...touched].join(', ')})`
  );
}

// --- THE REGISTRY IS A REGISTRY ---
//
// Members are the first source, not the mechanism. Statutes, rivals, the machine
// and the world are all meant to offer into the same list.
{
  const s = createNewState({ seed: 71 });
  const h = offerHook(s, {
    id: 'HK_TEST',
    n: 'Something a statute dangled',
    d: 'x',
    kind: 'statute',
    source: 'LAW_water_1',
    stages: ['primary']
  });
  assert(!!h, 'a non-member source can offer a thread with no engine change');
  assert(hooksOfKind(s, 'statute').length === 1, 'and it is findable by kind');
  assert(offerHook(s, { ...h!, n: 'dup' }) === null, 'the same thread is never offered twice');

  s.stage = 'session';
  assert(liveHooks(s).length === 0, 'a trail thread is not offered in the chamber');
  s.stage = 'primary';
  assert(liveHooks(s).length === 1, 'and comes back when you are');

  // Perishable where it makes sense.
  const p = offerHook(s, {
    id: 'HK_SHORT', n: 'x', d: 'x', kind: 'world', source: 'w',
    stages: ['primary'], expiresWeek: s.week
  })!;
  assert(liveHooks(s).some(x => x.id === p.id), 'a perishable thread is live inside its window');
  s.week += 1;
  assert(!liveHooks(s).some(x => x.id === p.id), 'and gone after it');
  assert(!!findHook(s, p.id), 'but still on the record — people remember what they offered');
}

// --- THE BOARD DOES NOT FLOOD ---
{
  const s = createNewState({ seed: 81 });
  for (let i = 0; i < MAX_LIVE_HOOKS + 4; i++) {
    offerHook(s, { id: `HK_F${i}`, n: 'x', d: 'x', kind: 'world', source: 'w', stages: ['primary'] });
  }
  s.stage = 'primary';
  assert(
    liveHooks(s).length === MAX_LIVE_HOOKS,
    `no more than ${MAX_LIVE_HOOKS} open threads (${liveHooks(s).length})`
  );
}

// --- A FIRST-TERM CANDIDATE IS OWED NOTHING ---
{
  useRng(createRng(91));
  setDefaultSeed(91);
  const c = createCampaign({ seed: 91 });
  assert(liveHooks(c.state).length === 0, 'nobody owes a first-timer anything');
  const ids = listPlayableHand(c).map(p => p.card.id);
  for (const card of HOOK_PLAYS) {
    assert(!ids.includes(card.id), `${card.id} is not on the menu until it is real`);
  }
}

// --- READS DO NOT MUTATE ---
{
  const s = createNewState({ seed: 95 });
  getHooks(s);
  liveHooks(s);
  hooksOfKind(s, 'member');
  assert(s.hooks === undefined, 'looking at the board does not create it');
}

if (failed) {
  console.error(`\nHooks FAILED — ${failed} assertion(s)`);
  process.exit(1);
}
console.log('\nHooks green — the loop closes, and none of it is obligatory.');
