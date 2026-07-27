/**
 * Opposition-as-agent harness.
 * Run: npm run harness:opponent
 *
 * The opponent used to be twelve lines of weather (random ground, random
 * 5-40). These assertions pin the thing that makes it an opponent: the choice
 * of action is a deterministic read of the board, not a die roll.
 */

import { createNewState } from '../engine/state.js';
import {
  chooseAction,
  archetypeForDistrict,
  playerBestGround,
  opponentTurn,
  getArchetype,
  setArchetype,
  RIVAL_RAP_CAP
} from '../engine/opponent.js';
import { createRng, setDefaultSeed, useRng } from '../engine/rng.js';
import type { GameState } from '../engine/types.js';

let failed = 0;
function assert(cond: boolean, msg: string): void {
  if (cond) console.log(`PASS: ${msg}`);
  else {
    console.error(`FAIL: ${msg}`);
    failed++;
  }
}

console.log('=== CANDIDATE ZERO — Opposition agent ===\n');

function withDistrict(align: 'safe' | 'competitive' | 'wrong', trap = false): GameState {
  const s = createNewState({ seed: 5 });
  s.district = { id: 'x', name: 'X', align, incumbent: false, field: 2, trap };
  return s;
}

// --- Archetype selection is a read of where you filed ---
{
  assert(archetypeForDistrict(withDistrict('safe')) === 'machine', 'safe seat -> machine');
  assert(
    archetypeForDistrict(withDistrict('competitive')) === 'insurgent',
    'competitive seat -> insurgent'
  );
  assert(archetypeForDistrict(withDistrict('wrong')) === 'incumbent', 'wrong-party -> incumbent');
  assert(
    archetypeForDistrict(withDistrict('safe', true)) === 'incumbent',
    'trap district -> incumbent regardless of align'
  );
}

// --- Archetype persists on state (survives serialize/deserialize) ---
{
  const s = withDistrict('safe');
  setArchetype(s, 'insurgent');
  const round = JSON.parse(JSON.stringify(s)) as GameState;
  assert(getArchetype(round) === 'insurgent', 'archetype survives a JSON round trip');
}

// --- The decision table reads the board ---
{
  // Nothing built yet, no threat: fall back to ordinary ground game.
  const quiet = withDistrict('safe');
  quiet.ballot = false;
  quiet.momentum = 0;
  quiet.nameID = 2;
  assert(chooseAction(quiet, 'machine') === 'ground_game', 'no read yet -> ground game');

  // A clear best turf is a target.
  const turf = withDistrict('competitive');
  turf.ballot = false;
  turf.momentum = 0;
  turf.nameID = 2;
  turf.groundsArr[1]!.rapport = 30;
  assert(chooseAction(turf, 'insurgent') === 'contest', 'clear best turf -> contest');

  // An entrenched incumbent goes for the knife as soon as you are real.
  const threat = withDistrict('wrong');
  threat.ballot = true;
  threat.nameID = 12;
  assert(chooseAction(threat, 'incumbent') === 'negative', 'incumbent attacks a real candidate');

  // A ground the opposition has already saturated is won — stop pounding it.
  const won = withDistrict('competitive');
  won.groundsArr[1]!.rapport = 40;
  won.groundsArr[1]!.rivalRap = 95;
  assert(
    playerBestGround(won)?.id !== won.groundsArr[1]!.id,
    'saturated turf is no longer a contest target'
  );
}

// --- Contest actually targets the player's best ground ---
{
  useRng(createRng(3));
  setDefaultSeed(3);
  const s = withDistrict('competitive');
  s.groundsArr[4]!.rapport = 45; // the player's strongest
  const before = s.groundsArr[4]!.rivalRap ?? 0;
  const action = opponentTurn(s);
  assert(action === 'contest', 'opponent contests when there is a clear target');
  assert(
    (s.groundsArr[4]!.rivalRap ?? 0) > before,
    'contest banks presence on the player\'s best ground, not a random one'
  );
}

// --- Presence is capped where the odds penalty stops caring ---
{
  useRng(createRng(4));
  setDefaultSeed(4);
  const s = withDistrict('competitive');
  s.groundsArr[2]!.rapport = 50;
  s.groundsArr[2]!.rivalRap = RIVAL_RAP_CAP - 2;
  for (let i = 0; i < 6; i++) opponentTurn(s);
  assert(
    (s.groundsArr[2]!.rivalRap ?? 0) <= RIVAL_RAP_CAP,
    `rivalRap never exceeds the cap (${RIVAL_RAP_CAP})`
  );
}

// --- Going negative is a real cost, not flavour ---
{
  useRng(createRng(6));
  setDefaultSeed(6);
  const s = withDistrict('wrong');
  s.ballot = true;
  s.nameID = 14;
  const before = s.hitPieces;
  opponentTurn(s);
  assert(s.hitPieces > before, 'a negative turn actually lands a hit piece');
}

// --- Covenant 4: the CHOICE is deterministic; only magnitude is random ---
{
  const a = withDistrict('competitive');
  a.groundsArr[3]!.rapport = 25;
  const first = chooseAction(a, 'insurgent');
  let stable = true;
  for (let i = 0; i < 50; i++) {
    if (chooseAction(a, 'insurgent') !== first) stable = false;
  }
  assert(stable, 'action choice is deterministic across 50 calls on identical board state');
}

// --- Session: neglect must cost the seat (challengerHeat was printed, never used) ---
{
  const { resolveSineDie } = await import('../engine/session.js');
  function runSineDie(standing: number, heat: number): string {
    useRng(createRng(11));
    setDefaultSeed(11);
    const s = createNewState({ seed: 11 });
    s.stage = 'session';
    s.districtStanding = standing;
    s.sessionFlags = { challengerHeat: heat };
    s.bill = null;
    return resolveSineDie(s).kind;
  }
  // Same standing, same seed — only the accumulated challenger heat differs.
  const calm = runSineDie(50, 0);
  const hounded = runSineDie(50, 7);
  assert(
    calm !== 'session_primaried' && hounded === 'session_primaried',
    `challenger heat decides the seat (calm=${calm}, hounded=${hounded})`
  );
}

if (failed) {
  console.error(`\nOpponent harness FAILED — ${failed} assertion(s)`);
  process.exit(1);
}
console.log('\nOpposition agent green.');
