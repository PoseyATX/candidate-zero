/**
 * Starmap integrity + three playable pilot e2e (Precinct / Captain / Judge).
 * Run: npm run harness:starmap
 */

import { ENTITIES, ALL_ENTITY_IDS } from '../data/starmap/entities.js';
import { LOOPS, ALL_LOOP_IDS } from '../data/starmap/loops.js';
import { ORBITS } from '../data/starmap/orbits.js';
import { listBrokenAllyBridges } from '../data/starmap/bridges.js';
import { PLAYABLE_PILOTS } from '../data/starmap/pilots.js';
import {
  checkMovementOptions,
  evaluateCondition,
  getEntity,
  isMovementVerbAvailable,
  starmapCounts,
  syncMovementFlags
} from '../engine/entities.js';
import { createNewState } from '../engine/state.js';
import { addAlly } from '../engine/reputation.js';
import { executePlay } from '../engine/play.js';
import {
  MV01_PrecinctNetwork,
  MV02_FieldPlan,
  MV03_CourthouseNod,
  MV04_PartyApparatus,
  MV05_ClubRoster,
  MV06_NewsroomNod,
  MV07_CorridorBlessing,
  MV08_SlateCard
} from '../data/plays-starmap.js';
import { addObl } from '../data/obligations.js';
import { ALL_PLAYS } from '../data/plays.js';
import type { PlayCard } from '../engine/types.js';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error('FAIL: ' + msg);
}

function playVerb(s: ReturnType<typeof createNewState>, card: PlayCard): void {
  const r = executePlay(s, card, s.groundsArr[0]);
  assert(r.ok, `${card.id} play ok: ${r.reason}`);
}

console.log('=== CANDIDATE ZERO — Starmap (entity templates) ===\n');

const counts = starmapCounts();
console.log('Counts:', counts);
assert(counts.playablePilots >= 8, `need ≥8 playable pilots, got ${counts.playablePilots}`);

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
assert(getEntity('ENT_PRECINCT_CHAIR')?.allyId === 'AL01', 'precinct → AL01');
assert(getEntity('ENT_CANVASS_CAPTAIN')?.allyId === 'AL09', 'captain → AL09');
assert(getEntity('ENT_COUNTY_JUDGE')?.allyId === 'AL15', 'judge → AL15');

// Each playable pilot has real advancement (not only manual_todo)
for (const p of PLAYABLE_PILOTS) {
  const loop = LOOPS[p.loopId];
  assert(!!loop, `pilot loop ${p.loopId}`);
  assert(
    loop.advancement.some(a => a.kind !== 'manual_todo' && a.kind !== 'always_false'),
    `${p.loopId} needs live advancement`
  );
  assert(
    ALL_PLAYS.some(c => c.id === p.verbPlayId),
    `${p.verbPlayId} in ALL_PLAYS`
  );
  const card = ALL_PLAYS.find(c => c.id === p.verbPlayId)!;
  assert(card.residency === 'special', `${p.verbPlayId} special residency`);
  assert(!!card.entityScope?.includes(p.entityId), `${p.verbPlayId} entityScope`);
}

// --- Pilot 1: Precinct Chair e2e ---
{
  const s = createNewState({ seed: 2, endorsePts: 0, contacts: 0, volPool: 0, ap: 2 });
  s.ballot = true;
  s.stage = 'primary';
  s.allies = [
    { id: 'AL01', warm: 2, age: 0 },
    { id: 'AL01', warm: 2, age: 0 }
  ];
  syncMovementFlags(s);
  assert(checkMovementOptions(s).some(o => o.verbPlayId === 'MV01'), 'MV01 open');
  assert(s.log.some(l => l.text.includes('ORBIT OPEN') && l.text.includes('Precinct')), 'MV01 announce');
  assert(isMovementVerbAvailable(s, 'MV01'), 'MV01 available');
  const beforeEnd = s.endorsePts;
  playVerb(s, MV01_PrecinctNetwork);
  assert(s.endorsePts === beforeEnd + 2, 'endorse +2');
  assert(!!s.sessionFlags?.mv01Consumed, 'mv01 consumed');
  assert(!!s.sessionFlags?.orbit_precinct_power, 'precinct residue');
  assert(!isMovementVerbAvailable(s, 'MV01'), 'MV01 closed after');
  console.log('PASSED: MV01 Precinct Chair e2e');
}

// --- Pilot 2: Canvass Captain e2e ---
{
  const s = createNewState({ seed: 3, contacts: 0, volPool: 1, ap: 2, fieldAp: 0 });
  s.ballot = true;
  s.stage = 'primary';
  addAlly(s, 'AL09', 3, 'GR01');
  syncMovementFlags(s);
  assert(checkMovementOptions(s).some(o => o.verbPlayId === 'MV02'), 'MV02 open via AL09');
  assert(s.log.some(l => l.text.includes('Canvass Captain')), 'MV02 announce');
  const g = s.groundsArr.find(x => x.id === 'GR01')!;
  g.gotv = 0;
  playVerb(s, MV02_FieldPlan);
  assert(s.fieldAp >= 1, 'field AP banked');
  assert(s.volPool >= 3, 'vols up');
  assert(g.gotv >= 0.1, 'GOTV on captain turf');
  assert(!!s.sessionFlags?.mv02Consumed, 'mv02 consumed');
  assert(!!s.sessionFlags?.orbit_field_spine, 'field residue');
  assert(!!s.entityHistory?.includes('ENT_CANVASS_CAPTAIN'), 'captain history');
  console.log('PASSED: MV02 Canvass Captain e2e');
}

// --- Pilot 2b: field-pressure path without AL09 ---
{
  const s = createNewState({ seed: 4, nameID: 10, volPool: 3, ap: 2 });
  s.ballot = true;
  s.stage = 'primary';
  syncMovementFlags(s);
  assert(
    checkMovementOptions(s).some(o => o.verbPlayId === 'MV02'),
    'MV02 open via name+vol pressure'
  );
  console.log('PASSED: MV02 alternate advancement (name+vol)');
}

// --- Pilot 3: County Judge e2e ---
{
  const s = createNewState({
    seed: 5,
    endorsePts: 1,
    nameID: 5,
    contacts: 0,
    momentum: 0,
    ap: 2
  });
  s.ballot = true;
  s.stage = 'primary';
  addAlly(s, 'AL15', 3);
  syncMovementFlags(s);
  assert(checkMovementOptions(s).some(o => o.verbPlayId === 'MV03'), 'MV03 open via AL15');
  const beforeE = s.endorsePts;
  const beforeN = s.nameID;
  playVerb(s, MV03_CourthouseNod);
  assert(s.endorsePts === beforeE + 3, 'endorse +3');
  assert(s.nameID === beforeN + 8, 'name +8');
  assert(!!s.sessionFlags?.mv03Consumed, 'mv03 consumed');
  assert(!!s.sessionFlags?.orbit_courthouse_nod, 'judge residue');
  assert(!!s.entityHistory?.includes('ENT_COUNTY_JUDGE'), 'judge history');
  console.log('PASSED: MV03 County Judge e2e');
}

// --- Pilot 3b: weight path without ally ---
{
  const s = createNewState({ seed: 6, endorsePts: 4, nameID: 16, ap: 1 });
  s.ballot = true;
  s.stage = 'general';
  syncMovementFlags(s);
  assert(
    checkMovementOptions(s).some(o => o.verbPlayId === 'MV03'),
    'MV03 open via endorse+name weight'
  );
  console.log('PASSED: MV03 alternate advancement (endorse+name)');
}

// Multi-orbit: captain + precinct both open
{
  const s = createNewState({ seed: 7, nameID: 10, volPool: 3, ap: 2 });
  s.ballot = true;
  s.stage = 'primary';
  s.allies = [
    { id: 'AL01', warm: 2, age: 0 },
    { id: 'AL01', warm: 2, age: 0 },
    { id: 'AL09', warm: 3, age: 0, grounds: ['GR02'] }
  ];
  syncMovementFlags(s);
  const opts = checkMovementOptions(s);
  const verbs = new Set(opts.map(o => o.verbPlayId));
  assert(verbs.has('MV01') && verbs.has('MV02'), 'two orbits open at once');
  console.log('PASSED: multi-orbit simultaneous open');
}

// --- Wave 2 templates MV04–07 ---
{
  const s = createNewState({ seed: 8, endorsePts: 0, contacts: 0, money: 200, ap: 4 });
  s.ballot = true;
  s.stage = 'primary';
  addAlly(s, 'AL02', 2);
  syncMovementFlags(s);
  assert(isMovementVerbAvailable(s, 'MV04'), 'MV04 open');
  playVerb(s, MV04_PartyApparatus);
  assert(!!s.sessionFlags?.mv04Consumed && !!s.sessionFlags?.orbit_party_apparatus, 'MV04 residue');
  console.log('PASSED: MV04 County Party e2e');
}
{
  const s = createNewState({ seed: 9, endorsePts: 0, contacts: 0, ap: 2 });
  s.ballot = true;
  s.stage = 'primary';
  addAlly(s, 'AL03', 2);
  syncMovementFlags(s);
  assert(isMovementVerbAvailable(s, 'MV05'), 'MV05 open');
  playVerb(s, MV05_ClubRoster);
  assert(!!s.sessionFlags?.mv05Consumed, 'MV05 consumed');
  console.log('PASSED: MV05 Club Leader e2e');
}
{
  const s = createNewState({ seed: 10, nameID: 5, momentum: 0, ap: 2 });
  s.ballot = true;
  s.stage = 'primary';
  addAlly(s, 'AL04', 2);
  syncMovementFlags(s);
  assert(isMovementVerbAvailable(s, 'MV06'), 'MV06 open');
  const n0 = s.nameID;
  playVerb(s, MV06_NewsroomNod);
  assert(s.nameID === n0 + 10, 'MV06 name +10');
  assert(!!s.sessionFlags?.orbit_newsroom_nod, 'MV06 residue');
  console.log('PASSED: MV06 Local Editor e2e');
}
{
  const s = createNewState({ seed: 11, volPool: 0, contacts: 0, ap: 2 });
  s.ballot = true;
  s.stage = 'primary';
  s.groundsArr.find(g => g.id === 'GR04')!.gated = true;
  addAlly(s, 'AL08', 3);
  syncMovementFlags(s);
  assert(isMovementVerbAvailable(s, 'MV07'), 'MV07 open');
  playVerb(s, MV07_CorridorBlessing);
  assert(s.volPool >= 3, 'MV07 vols');
  assert(s.assets.includes('A13'), 'MV07 directory A13');
  assert(!s.groundsArr.find(g => g.id === 'GR04')!.gated, 'corridor ungated');
  assert(!!s.sessionFlags?.orbit_corridor_blessing, 'MV07 residue');
  console.log('PASSED: MV07 Faith Leader e2e');
}
// Alternate paths
{
  const s = createNewState({ seed: 12, nameID: 14, ap: 1 });
  s.ballot = true;
  s.stage = 'primary';
  syncMovementFlags(s);
  assert(isMovementVerbAvailable(s, 'MV06'), 'MV06 via name path');
  console.log('PASSED: MV06 alternate (nameID)');
}
{
  const s = createNewState({ seed: 13, nameID: 12, ap: 1 });
  s.ballot = true;
  s.stage = 'primary';
  s.backers = ['B02'];
  syncMovementFlags(s);
  assert(isMovementVerbAvailable(s, 'MV07'), 'MV07 via B02+name');
  console.log('PASSED: MV07 alternate (backer+name)');
}
{
  const s = createNewState({ seed: 14, endorsePts: 3, ap: 1 });
  s.ballot = true;
  s.stage = 'primary';
  syncMovementFlags(s);
  assert(isMovementVerbAvailable(s, 'MV05'), 'MV05 via endorse path');
  console.log('PASSED: MV05 alternate (endorse)');
}

// --- Slate-Maker MV08 ---
{
  const s = createNewState({ seed: 15, endorsePts: 1, nameID: 5, contacts: 0, momentum: 0, ap: 2 });
  s.ballot = true;
  s.stage = 'primary';
  addAlly(s, 'AL16', 2);
  s.slate = true;
  syncMovementFlags(s);
  assert(isMovementVerbAvailable(s, 'MV08'), 'MV08 open via AL16');
  const n0 = s.nameID;
  const e0 = s.endorsePts;
  playVerb(s, MV08_SlateCard);
  assert(s.nameID === n0 + 12, 'MV08 name +12');
  assert(s.endorsePts === e0 + 3, 'MV08 endorse +3');
  assert(!!s.sessionFlags?.mv08Consumed && !!s.sessionFlags?.orbit_slate_card, 'MV08 residue');
  assert(!!s.entityHistory?.includes('ENT_SLATE_MAKER'), 'slate history');
  console.log('PASSED: MV08 Slate-Maker e2e');
}
{
  const s = createNewState({ seed: 16, ap: 1 });
  s.ballot = true;
  s.stage = 'primary';
  addObl(s, 'OB3');
  syncMovementFlags(s);
  assert(isMovementVerbAvailable(s, 'MV08'), 'MV08 open via OB3 price');
  console.log('PASSED: MV08 alternate (OB3)');
}
{
  const s = createNewState({ seed: 17, endorsePts: 2, money: 1500, ap: 1 });
  s.ballot = true;
  s.stage = 'primary';
  addAlly(s, 'AL02', 2);
  syncMovementFlags(s);
  assert(isMovementVerbAvailable(s, 'MV08'), 'MV08 open via Chairwoman+cash+endorse');
  console.log('PASSED: MV08 alternate (AL02+cash+endorse)');
}
assert(getEntity('ENT_SLATE_MAKER')?.allyId === 'AL16', 'slate → AL16');
assert(getEntity('ENT_SLATE_MAKER')?.primaryLoopId === 'LOOP_ENT_SLATE_MAKER', 'slate own loop');

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
}

console.log('Loops:', ALL_LOOP_IDS.length, 'Orbits:', ORBITS.length, 'Pilots:', PLAYABLE_PILOTS.length);
console.log('PASSED: inventory, graph integrity, bridges, 8-template e2e');
console.log('\nStarmap entity templates green.');
process.exit(0);
