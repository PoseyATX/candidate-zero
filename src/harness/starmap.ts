/**
 * Starmap v0 integrity + Precinct Chair pilot e2e.
 * Run: npm run harness:starmap
 */

import { ENTITIES, ALL_ENTITY_IDS } from '../data/starmap/entities.js';
import { LOOPS, ALL_LOOP_IDS } from '../data/starmap/loops.js';
import { ORBITS } from '../data/starmap/orbits.js';
import { listBrokenAllyBridges } from '../data/starmap/bridges.js';
import {
  checkMovementOptions,
  evaluateCondition,
  getEntity,
  starmapCounts,
  syncMovementFlags
} from '../engine/entities.js';
import { createNewState } from '../engine/state.js';
import { addAlly } from '../engine/reputation.js';
import { executePlay } from '../engine/play.js';
import { MV01_PrecinctNetwork } from '../data/plays-starmap.js';
import { PILOT_ENTITY_ID, PILOT_VERB_PLAY_ID } from '../data/starmap/pilot-precinct.js';
import { ALL_PLAYS } from '../data/plays.js';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error('FAIL: ' + msg);
}

console.log('=== CANDIDATE ZERO — Starmap v0 ===\n');

const counts = starmapCounts();
console.log('Counts:', counts);

// Unique entities
assert(ALL_ENTITY_IDS.length === new Set(ALL_ENTITY_IDS).size, 'duplicate entity ids');
assert(ALL_ENTITY_IDS.length >= 70, `expected full catalog, got ${ALL_ENTITY_IDS.length}`);

// Every primary loop exists
for (const ent of Object.values(ENTITIES)) {
  assert(!!LOOPS[ent.primaryLoopId], `${ent.id} primaryLoop ${ent.primaryLoopId} missing`);
  for (const sub of ent.subloopIds) {
    assert(!!LOOPS[sub], `${ent.id} subloop ${sub} missing`);
  }
}

// Orbit endpoints exist; no orphans
const degree = new Map<string, number>();
for (const id of ALL_ENTITY_IDS) degree.set(id, 0);
for (const orb of ORBITS) {
  assert(!!ENTITIES[orb.from], `orbit ${orb.id} bad from ${orb.from}`);
  assert(!!ENTITIES[orb.to], `orbit ${orb.id} bad to ${orb.to}`);
  degree.set(orb.from, (degree.get(orb.from) ?? 0) + 1);
  degree.set(orb.to, (degree.get(orb.to) ?? 0) + 1);
}
const orphans = ALL_ENTITY_IDS.filter(id => (degree.get(id) ?? 0) === 0);
assert(orphans.length === 0, `orphan entities: ${orphans.join(', ')}`);

// Bridges
const broken = listBrokenAllyBridges();
assert(broken.length === 0, `broken bridges: ${broken.join('; ')}`);
assert(getEntity(PILOT_ENTITY_ID)?.allyId === 'AL01', 'pilot bridges to AL01');

// Condition smoke
{
  const s = createNewState({ seed: 1 });
  assert(
    !evaluateCondition(s, {
      id: 't',
      type: 'advancement',
      description: '',
      kind: 'warm_ally_gte',
      params: { allyId: 'AL01', n: 2 }
    }),
    'warm_ally false without allies'
  );
  addAlly(s, 'AL01', 2);
  addAlly(s, 'AL01', 2); // second grant no-op — need two ally instances
  // addAlly only once — push second instance manually for count
  s.allies.push({ id: 'AL01', warm: 2, age: 0 });
  assert(
    evaluateCondition(s, {
      id: 't',
      type: 'advancement',
      description: '',
      kind: 'warm_ally_gte',
      params: { allyId: 'AL01', n: 2 }
    }),
    'warm_ally true with 2 AL01'
  );
}

// Pilot e2e
{
  const s = createNewState({ seed: 2, endorsePts: 0, contacts: 0, volPool: 0, ap: 2 });
  s.ballot = true;
  s.stage = 'primary';
  s.allies = [
    { id: 'AL01', warm: 2, age: 0 },
    { id: 'AL01', warm: 2, age: 0 }
  ];
  syncMovementFlags(s);
  const opts = checkMovementOptions(s);
  assert(opts.length >= 1, 'movement options open');
  assert(opts[0]!.entityId === PILOT_ENTITY_ID, 'pilot entity');
  assert(!!s.pendingMovement, 'pendingMovement set');
  assert(
    s.log.some(l => l.text.includes('ORBIT OPEN')),
    'orbit open logged'
  );

  const beforeEnd = s.endorsePts;
  const beforeC = s.contacts;
  const card = { ...MV01_PrecinctNetwork };
  const showBefore = card.show ? card.show(s) : false;
  assert(showBefore === true, 'MV01 show true');
  const r = executePlay(s, card);
  assert(r.ok, 'MV01 play ok: ' + r.reason);
  assert(s.endorsePts === beforeEnd + 2, 'endorse +2');
  assert(s.contacts === beforeC + 40, 'contacts +40');
  assert(s.volPool >= 1, 'vol +1');
  assert(!!s.entityHistory && s.entityHistory.includes(PILOT_ENTITY_ID), 'entityHistory');
  assert(!!s.sessionFlags?.mv01Consumed, 'consumed');
  assert(!!s.sessionFlags?.orbit_precinct_power, 'residue flag');
  const showAfter = card.show ? card.show(s) : true;
  assert(showAfter === false, 'MV01 show false after consume');
  assert(checkMovementOptions(s).length === 0, 'no more options');
}

// Catalog includes MV01
assert(
  ALL_PLAYS.some(p => p.id === PILOT_VERB_PLAY_ID),
  'MV01 in ALL_PLAYS'
);

console.log('Loops:', ALL_LOOP_IDS.length, 'Orbits:', ORBITS.length);
console.log('PASSED: inventory, graph integrity, bridges, pilot e2e');
console.log('\nStarmap v0 green.');
process.exit(0);
