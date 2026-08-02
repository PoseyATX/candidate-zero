/**
 * The Chamber — the floor is people, and people remember.
 * Run: npm run harness:chamber
 *
 * A provision used to buy "+16 ayes". Sixteen of what? The number WAS the
 * representation: no names, no counties, nobody who wanted the thing, and so
 * nobody who could remember afterwards that you delivered it or took it back.
 * A coalition you cannot name is a coalition you cannot betray, and a
 * legislature where nobody can be betrayed is a meter with a flag on it.
 *
 * The aggregate floor arithmetic is deliberately unchanged — provisionSwing
 * still returns the same ayes-minus-nays, so the balance measured in
 * docs/THE-DOCKET.md holds. What is asserted here is that every vote now has a
 * person attached and the person keeps a memory across runs.
 */

import { createNewState } from '../engine/state.js';
import { createRng, setDefaultSeed, useRng } from '../engine/rng.js';
import { enterSession } from '../engine/session.js';
import { applyLegacy, recordRun, emptyLegacy } from '../engine/legacy.js';
import {
  recruitsFor,
  recruitLine,
  settleChamber,
  standingOf,
  peekStanding,
  alliesOf,
  enemiesOf,
  carryChamber,
  chamberSwing,
  chamberLine,
  DELIVER_WARMTH,
  BURN_CHILL,
  ALLY_LINE,
  HOSTILE_LINE
} from '../engine/chamber.js';
import { MEMBERS, MEMBER_BY_ID, membersReachedBy } from '../data/members.js';
import { ISSUE_PROFILES } from '../data/issue-profiles.js';
import type { GameState, LegacyState, Provision } from '../engine/types.js';

let failed = 0;
function assert(cond: boolean, msg: string): void {
  if (cond) console.log(`PASS: ${msg}`);
  else {
    console.error(`FAIL: ${msg}`);
    failed++;
  }
}

console.log('=== CANDIDATE ZERO — The Chamber ===\n');

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

function session(issueId = 'ag-subsidies', seed = 11): GameState {
  useRng(createRng(seed));
  setDefaultSeed(seed);
  const s = createNewState({ seed });
  s.issueId = issueId;
  s.persona = 'The Teacher';
  enterSession(s);
  return s;
}

// --- EVERY MEMBER IS A PERSON, NOT A DEMOGRAPHIC ---
{
  assert(MEMBERS.length >= 12, `the chamber has a population (${MEMBERS.length})`);
  const ids = MEMBERS.map(m => m.id);
  assert(new Set(ids).size === ids.length, 'every member id is unique');
  for (const m of MEMBERS) {
    assert(!!m.name && !!m.county, `${m.id} has a name and a county`);
    assert(!!m.d && m.d.length > 40, `${m.id} is written as a person, not a label`);
    assert(!!ISSUE_PROFILES[m.wants], `${m.id} wants an issue the game actually has (${m.wants})`);
    assert(m.weight >= 1, `${m.id} carries at least their own vote`);
  }
  // Coverage: every ground has somebody who speaks for it.
  const grounds = new Set(MEMBERS.map(m => m.ground));
  assert(grounds.size >= 6, `members are spread across the map (${grounds.size} grounds)`);
}

// --- LANGUAGE BRINGS NAMED PEOPLE ---
{
  const p = prov({ rewards: 'GR02' });
  const who = recruitsFor(p, 'ag-subsidies');
  assert(who.length > 0, 'a provision recruits actual members');
  assert(
    who.some(m => m.ground === 'GR02'),
    'including the ones whose county it serves'
  );
  assert(
    who.some(m => m.wants === 'ag-subsidies'),
    'and the ones whose issue it is'
  );
  // Heaviest first — a count is read by who matters, not alphabetically.
  for (let i = 1; i < who.length; i++) {
    assert(who[i - 1]!.weight >= who[i]!.weight, 'the room is ordered by who carries weight');
    break;
  }
  const line = recruitLine(who);
  assert(/WITH YOU/.test(line), 'and the log says who came with it');
  assert(line.includes(who[0]!.name) && line.includes(who[0]!.county), 'by name and county');
}

// --- DELIVERING IS REMEMBERED ---
{
  const legacy: LegacyState = emptyLegacy();
  const s = session();
  s.bill!.provisions = [prov()];
  const { warmed } = settleChamber(legacy, s);
  assert(warmed.length > 0, 'delivering warms the people it reached');
  const first = warmed[0]!;
  const st = peekStanding(legacy, first.id)!;
  assert(st.disposition === DELIVER_WARMTH, `by ${DELIVER_WARMTH} points`);
  assert(st.delivered === 1, 'and the count is kept');

  // Repeat delivery makes a genuine ally.
  for (let i = 0; i < 2; i++) settleChamber(legacy, s);
  assert(
    peekStanding(legacy, first.id)!.disposition >= ALLY_LINE,
    'deliver for a county twice and that member takes your call'
  );
  assert(alliesOf(legacy).some(m => m.id === first.id), 'and appears in your allies');
}

// --- BETRAYAL IS REMEMBERED HARDER ---
{
  const legacy: LegacyState = emptyLegacy();
  const s = session();
  const p = prov();
  s.bill!.provisions = [];
  const { burned } = settleChamber(legacy, s, [p]);
  assert(burned.length > 0, 'stripping language burns the people it was promised to');
  const first = burned[0]!;
  assert(
    peekStanding(legacy, first.id)!.disposition === -BURN_CHILL,
    `by ${BURN_CHILL} points — more than delivering earns, because that is how it works`
  );
  assert(BURN_CHILL > DELIVER_WARMTH, 'a betrayal outweighs a favour');
  for (let i = 0; i < 1; i++) settleChamber(legacy, s, [p]);
  assert(
    peekStanding(legacy, first.id)!.disposition <= HOSTILE_LINE,
    'do it twice and they will not take your call at all'
  );
  assert(enemiesOf(legacy).some(m => m.id === first.id), 'and they are on the other list');
}

// --- THE ROOM CARRIES INTO THE NEXT RUN ---
{
  const legacy: LegacyState = emptyLegacy();
  const s = session();
  s.bill!.provisions = [prov()];
  settleChamber(legacy, s);
  settleChamber(legacy, s);

  const next = createNewState({ seed: 77 });
  applyLegacy(next, legacy);
  assert(
    Object.keys(next.chamberRoster ?? {}).length > 0,
    'the next campaign knows who owes you'
  );
  assert(chamberSwing(next) > 0, 'and it is worth something on a floor count');
  assert(
    next.log.some(l => /THE ROOM/.test(l.text)),
    'and the player is told who takes their call'
  );

  const round = JSON.parse(JSON.stringify(legacy)) as LegacyState;
  assert(
    Object.keys(round.chamber ?? {}).length > 0,
    'the memory survives a JSON round trip'
  );
}

// --- ENEMIES COUNT AGAINST YOU ---
{
  const legacy: LegacyState = emptyLegacy();
  const s = session();
  const p = prov();
  settleChamber(legacy, s, [p]);
  settleChamber(legacy, s, [p]);
  const next = createNewState({ seed: 78 });
  applyLegacy(next, legacy);
  assert(chamberSwing(next) < 0, 'a room you have burned counts against you on the floor');
}

// --- NEUTRALS ARE NEITHER ---
{
  const st = createNewState({ seed: 5 });
  st.chamberRoster = { M_COBB: 10 };
  assert(chamberSwing(st) === 0, 'a member who merely knows your name is worth nothing yet');
  st.chamberRoster = { M_COBB: ALLY_LINE };
  assert(
    chamberSwing(st) === MEMBER_BY_ID.M_COBB!.weight,
    'an ally is worth exactly their weight — a dean brings more than a freshman'
  );
}

// --- A FIRST-TERM MEMBER KNOWS NOBODY ---
{
  const legacy: LegacyState = emptyLegacy();
  assert(chamberLine(legacy) === '', 'no relationships, no noise');
  const s = createNewState({ seed: 9 });
  carryChamber(s, legacy);
  assert(Object.keys(s.chamberRoster ?? {}).length === 0, 'and an empty room');
  assert(chamberSwing(s) === 0, 'worth nothing on a count');
}

// --- READS DO NOT MUTATE ---
//
// getDocket() lazily assigned state.docket and broke deterministic replay on
// every seed, because view() calls it to render. Same shape, same trap.
{
  const legacy: LegacyState = emptyLegacy();
  peekStanding(legacy, 'M_COBB');
  alliesOf(legacy);
  enemiesOf(legacy);
  chamberLine(legacy);
  assert(
    legacy.chamber === undefined || Object.keys(legacy.chamber).length === 0,
    'looking at the room does not create records in it'
  );
}

if (failed) {
  console.error(`\nChamber FAILED — ${failed} assertion(s)`);
  process.exit(1);
}
console.log('\nThe Chamber green — the floor is people, and people remember.');
