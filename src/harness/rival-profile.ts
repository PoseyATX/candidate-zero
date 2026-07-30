/**
 * Rival profile harness — the head-to-head seam.
 * Run: npm run harness:profile
 *
 * Async head-to-head has exactly two ways to break, and neither is a gameplay
 * bug — they are protocol bugs, and they are silent:
 *
 *  1. DESYNC. Two clients compute different opponent moves from the same
 *     information, and the two players are no longer playing the same match.
 *  2. LEAKAGE. The profile carries something an opposing campaign should not
 *     know — a hand, a deck, a bankroll, a seed — and the game is cheatable
 *     by anyone who reads the wire.
 *
 * So the load-bearing assertions here are a same-input/same-output check across
 * two independent states, and an explicit allow-list on what may cross. The
 * gameplay assertions are in harness:rival; this file is about the wire.
 */

import { createNewState } from '../engine/state.js';
import { emptyLegacy } from '../engine/legacy.js';
import { getRival, applyRival, STRENGTH_TO_RAP } from '../engine/rival.js';
import {
  RIVAL_PROFILE_VERSION,
  profileFromRival,
  profileFromCampaign,
  applyRivalProfile,
  parseRivalProfile,
  isRivalProfile,
  opponentSeed,
  rivalIsHuman,
  type RivalProfile
} from '../engine/rival-profile.js';
import { opponentTurn } from '../engine/opponent.js';
import { createRng, useRng } from '../engine/rng.js';

let failed = 0;
function assert(cond: boolean, msg: string): void {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${msg}`);
  if (!cond) failed++;
}

// --- Single player already runs on the multiplayer pathway ---
{
  const legacy = emptyLegacy();
  const s = createNewState({ seed: 5 });
  applyRival(s, legacy);
  assert(!!s.rivalProfile, 'seating the persistent rival seats a PROFILE, not a private shortcut');
  assert(
    s.rivalProfile!.v === RIVAL_PROFILE_VERSION,
    `and it is versioned (v${s.rivalProfile?.v})`
  );
  assert(!rivalIsHuman(s), 'the synthetic opponent is honestly marked as not human');
  assert(
    Object.keys(s.rivalProfile!.ground).length === s.groundsArr.length,
    'it describes itself as presence on named grounds, the same way a person would'
  );
}

// --- A campaign becomes the profile an opponent faces ---
{
  const mine = createNewState({ seed: 9 });
  mine.nameID = 24;
  mine.momentum = 3;
  mine.endorsePts = 4;
  mine.ballot = true;
  mine.money = 9999;
  mine.deck = ['PL01', 'PL04'];
  mine.groundsArr[0]!.rapport = 40;
  mine.groundsArr[1]!.rapport = 12;

  const p = profileFromCampaign(mine, { id: 'P2', name: 'Wanda Sowell' });
  assert(p.human === true, 'a profile built from a real campaign is marked human');
  assert(p.strength > 0 && p.strength <= 100, `strength lands on the shared 0-100 dial (${p.strength})`);
  assert(p.ground[mine.groundsArr[0]!.id] === 40, 'visible organisation crosses, per ground id');
  assert(
    !(mine.groundsArr[2]!.id in p.ground),
    'a ground they have not worked is simply absent, not zero-filled'
  );

  // LEAKAGE: an explicit allow-list. Adding a field to RivalProfile without
  // thinking about it should fail here rather than ship a cheatable wire.
  const ALLOWED = [
    'v', 'id', 'name', 'archetype', 'strength', 'ground',
    'nameID', 'momentum', 'endorsePts', 'ballot', 'record', 'human'
  ].sort();
  const actual = Object.keys(p).sort();
  assert(
    JSON.stringify(actual) === JSON.stringify(ALLOWED),
    `the profile carries exactly the public fields and nothing else (${actual.join(',')})`
  );
  const wire = JSON.stringify(p);
  for (const secret of ['9999', 'PL01', 'seed', 'hand', 'draw', 'discard']) {
    assert(!wire.includes(secret), `nothing private crosses the wire (${secret})`);
  }
}

// --- Versioning: unreadable is refused, never guessed at ---
{
  const legacy = emptyLegacy();
  const s = createNewState({ seed: 3 });
  const good = profileFromRival(getRival(legacy, s), s, STRENGTH_TO_RAP);
  assert(isRivalProfile(good), 'a current profile validates');
  assert(!isRivalProfile({ ...good, v: 999 }), 'a future version is refused');
  assert(!isRivalProfile({ ...good, ground: undefined }), 'a malformed profile is refused');
  assert(!isRivalProfile(null), 'null is refused');

  const round = parseRivalProfile(JSON.stringify(good));
  assert(round.name === good.name, 'a profile survives the JSON round-trip a transport would do');

  let threw = false;
  try {
    parseRivalProfile(JSON.stringify({ ...good, v: 2 }));
  } catch {
    threw = true;
  }
  assert(threw, 'parsing a version we cannot read throws rather than half-working');

  let threw2 = false;
  try {
    applyRivalProfile(createNewState({ seed: 1 }), { v: 77 } as unknown as RivalProfile);
  } catch {
    threw2 = true;
  }
  assert(threw2, 'and seating an unreadable profile throws rather than seating nothing');
}

// --- THE DESYNC TEST: same profile + same week => same opponent move ---
{
  const mine = createNewState({ seed: 12 });
  mine.nameID = 30;
  mine.momentum = 2;
  mine.endorsePts = 3;
  mine.ballot = true;
  mine.groundsArr[0]!.rapport = 55;
  mine.groundsArr[2]!.rapport = 18;
  const p = profileFromCampaign(mine, { id: 'P2', name: 'Royce Bagwell' });

  /** One client: seat the profile, advance a fixed set of weeks, record. */
  function client(localSeed: number): string[] {
    const s = createNewState({ seed: localSeed });
    // Different clients have DIFFERENT local seeds and different local RNG
    // state — that is the whole point. Nothing about the opponent may depend
    // on either, or the two players diverge.
    useRng(createRng(localSeed * 7919 + 13));
    applyRivalProfile(s, JSON.parse(JSON.stringify(p)) as RivalProfile);
    s.ballot = true;
    s.nameID = 20;
    const out: string[] = [];
    for (let w = 1; w <= 8; w++) {
      s.week = w;
      const before = s.groundsArr.map(g => g.rivalRap ?? 0);
      const action = opponentTurn(s);
      const after = s.groundsArr.map(g => g.rivalRap ?? 0);
      const delta = after.map((v, i) => v - before[i]!).join(',');
      out.push(`w${w}:${action}:${delta}:hp${s.hitPieces}`);
    }
    return out;
  }

  const a = client(1234);
  const b = client(98765);
  assert(
    JSON.stringify(a) === JSON.stringify(b),
    'two clients with different local seeds compute the SAME opponent moves — no desync'
  );
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    console.log('  A:', a.join(' | '));
    console.log('  B:', b.join(' | '));
  }
  assert(a.length === 8 && a.some(x => !x.endsWith(':0,0,0,0,0,0,0,0:hp0')), 'and they actually did something');

  // The stream must move with the week, or every week is identical.
  const seeds = new Set([1, 2, 3, 4, 5].map(w => opponentSeed(p, w)));
  assert(seeds.size === 5, 'the opponent stream advances with the week');

  // And it must move with the profile, or a stronger opponent rolls the same.
  const stronger = { ...p, strength: Math.min(100, p.strength + 20) };
  assert(
    opponentSeed(stronger, 1) !== opponentSeed(p, 1),
    'a changed profile is a changed stream'
  );

  // Ground order must not matter — two clients may serialise keys differently.
  const shuffled: RivalProfile = {
    ...p,
    ground: Object.fromEntries(Object.entries(p.ground).reverse())
  };
  assert(
    opponentSeed(shuffled, 3) === opponentSeed(p, 3),
    'key order in the ground map cannot change the stream (JSON does not promise order)'
  );
}

// --- A human profile must not make the opponent behave differently ---
{
  const mine = createNewState({ seed: 44 });
  mine.nameID = 18;
  mine.ballot = true;
  mine.groundsArr[0]!.rapport = 30;
  const human = profileFromCampaign(mine, { id: 'P2', name: 'Cleve Yeary' });
  const synthetic: RivalProfile = { ...human, human: false };

  function run(p: RivalProfile): string {
    const s = createNewState({ seed: 77 });
    useRng(createRng(5));
    applyRivalProfile(s, p);
    s.ballot = true;
    s.nameID = 20;
    const out: string[] = [];
    for (let w = 1; w <= 6; w++) {
      s.week = w;
      out.push(`${opponentTurn(s)}:${s.groundsArr.map(g => g.rivalRap ?? 0).join(',')}`);
    }
    return out.join('|');
  }
  assert(
    run(human) === run(synthetic),
    'the `human` flag is mechanically inert — single player really is a rehearsal'
  );
}

// --- Seating a profile is idempotent and never lowers held ground ---
{
  const s = createNewState({ seed: 61 });
  const mine = createNewState({ seed: 62 });
  mine.groundsArr[0]!.rapport = 50;
  const p = profileFromCampaign(mine, { id: 'P2', name: 'Odell Cranfill' });
  applyRivalProfile(s, p);
  const once = s.groundsArr.map(g => g.rivalRap ?? 0).join(',');
  applyRivalProfile(s, p);
  assert(s.groundsArr.map(g => g.rivalRap ?? 0).join(',') === once, 'seating twice is idempotent');

  s.groundsArr[0]!.rivalRap = 90;
  applyRivalProfile(s, p);
  assert(
    (s.groundsArr[0]!.rivalRap ?? 0) === 90,
    'and re-seating never rolls back ground they have since taken'
  );
}

// --- Save/load: a paused async match must resume ---
{
  const s = createNewState({ seed: 71 });
  const mine = createNewState({ seed: 72 });
  mine.nameID = 22;
  mine.groundsArr[1]!.rapport = 33;
  applyRivalProfile(s, profileFromCampaign(mine, { id: 'P2', name: 'Hollis Dillard' }));
  const revived = JSON.parse(JSON.stringify(s)) as typeof s;
  assert(!!revived.rivalProfile, 'the seated profile survives save/load');
  assert(
    revived.rivalProfile!.name === 'Hollis Dillard',
    'by name — a paused match resumes against the same person'
  );
  assert(
    opponentSeed(revived.rivalProfile!, 4) === opponentSeed(s.rivalProfile!, 4),
    'and against the same stream, so resuming does not desync'
  );
}

if (failed) {
  console.error(`\nRival profile harness FAILED — ${failed} assertion(s)`);
  process.exit(1);
}
console.log('\nRival profile seam green.');
