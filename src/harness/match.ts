/**
 * Match + trust-boundary harness — the head-to-head protocol.
 * Run: npm run harness:match
 *
 * Two failure modes matter here and neither shows up as a gameplay bug:
 *
 *  1. BLOCKING. A design where you wait for your opponent is a design nobody
 *     finishes a match in. You must always be able to play your next week.
 *  2. CHEATING. A profile off the wire is a claim, not a fact. `strength` used
 *     to be sent and trusted — one edited number handed your opponent an
 *     unwinnable race.
 *
 * So the load-bearing assertions are "you are never blocked" and "a tampered
 * profile is corrected, not believed".
 */

import { createNewState } from '../engine/state.js';
import {
  profileFromCampaign,
  parseRivalProfile,
  normaliseRivalProfile,
  deriveStrength,
  type RivalProfile
} from '../engine/rival-profile.js';
import {
  createMatch,
  publishWeek,
  opponentFor,
  publishedWeek,
  matchStanding,
  parseMatch,
  isMatchState,
  MATCH_VERSION,
  STALL_WEEKS
} from '../engine/match.js';
import { opponentSeed } from '../engine/rival-profile.js';

let failed = 0;
function assert(cond: boolean, msg: string): void {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${msg}`);
  if (!cond) failed++;
}

/** A campaign in some public condition, as a profile. */
function profile(name: string, over: Partial<Record<string, number | boolean>> = {}): RivalProfile {
  const s = createNewState({ seed: 4 });
  s.nameID = (over.nameID as number) ?? 12;
  s.momentum = (over.momentum as number) ?? 1;
  s.endorsePts = (over.endorsePts as number) ?? 1;
  s.ballot = (over.ballot as boolean) ?? false;
  s.groundsArr[0]!.rapport = (over.rapport as number) ?? 20;
  return profileFromCampaign(s, { id: name, name });
}

// --- CHEAT RESISTANCE: a tampered profile is corrected, not believed ---
{
  const honest = profile('P2');
  const derived = deriveStrength({
    nameID: honest.nameID,
    momentum: honest.momentum,
    endorsePts: honest.endorsePts,
    ballot: honest.ballot
  });
  assert(honest.strength === derived, 'an honest profile already carries the derived strength');

  // The cheapest possible attack: edit one number.
  const cheated = { ...honest, strength: 100 };
  const fixed = parseRivalProfile(JSON.stringify(cheated));
  assert(
    fixed.strength === derived,
    `editing strength on the wire does nothing (claimed 100, seated ${fixed.strength})`
  );
  assert(fixed.strength < 100, 'and the claim is not simply passed through');

  // Nonsense values are clamped rather than trusted.
  const junk = parseRivalProfile(
    JSON.stringify({ ...honest, nameID: 99999, momentum: -50, endorsePts: 1e9, ground: { GR01: 5000, GR02: -3 } })
  );
  assert(junk.strength <= 100, `strength stays on the dial (${junk.strength})`);
  assert(junk.momentum >= 0, 'negative momentum is clamped away');
  assert((junk.ground.GR01 ?? 0) <= 100, `ground presence is clamped (${junk.ground.GR01})`);
  assert(!('GR02' in junk.ground), 'a negative ground claim is dropped rather than kept');

  // Anything off the wire is a person, whatever it says about itself.
  const masked = parseRivalProfile(JSON.stringify({ ...honest, human: false }));
  assert(masked.human === true, 'a wire profile cannot masquerade as the synthetic opponent');

  // Same facts in, same strength out — the derivation is the shared contract.
  const a = normaliseRivalProfile(honest);
  const b = normaliseRivalProfile(JSON.parse(JSON.stringify(honest)) as RivalProfile);
  assert(a.strength === b.strength, 'normalisation is deterministic');
}

// --- A match holds two careers ---
{
  const m = createMatch('M1', { id: 'P1', name: 'You' }, { id: 'P2', name: 'Wade Coker' });
  assert(m.v === MATCH_VERSION, 'a match is versioned');
  assert(publishedWeek(m, 'P1') === 0 && publishedWeek(m, 'P2') === 0, 'nobody has published yet');
  assert(opponentFor(m, 'P1', 1) === null, 'and there is nothing honest to show yet');

  let threw = false;
  try {
    createMatch('M2', { id: 'X', name: 'a' }, { id: 'X', name: 'b' });
  } catch {
    threw = true;
  }
  assert(threw, 'a match needs two different players');
}

// --- YOU ARE NEVER BLOCKED: face their last published week ---
{
  const m = createMatch('M1', { id: 'P1', name: 'You' }, { id: 'P2', name: 'Wade' });
  publishWeek(m, 'P2', 1, profile('P2', { nameID: 10 }));
  publishWeek(m, 'P2', 2, profile('P2', { nameID: 20 }));

  assert(opponentFor(m, 'P1', 1)!.nameID === 10, 'at week 1 you face their week 1');
  assert(opponentFor(m, 'P1', 2)!.nameID === 20, 'at week 2 you face their week 2');
  // The whole point: they have gone quiet and you keep playing.
  assert(
    opponentFor(m, 'P1', 9)!.nameID === 20,
    'at week 9 with them stuck on 2, you face their LAST known state — never blocked'
  );

  // And you never see the future, even if they are ahead of you.
  publishWeek(m, 'P2', 7, profile('P2', { nameID: 60 }));
  assert(
    opponentFor(m, 'P1', 3)!.nameID === 20,
    'a week they have not reached in YOUR timeline is invisible — no peeking ahead'
  );
  assert(opponentFor(m, 'P1', 7)!.nameID === 60, 'and it arrives when your week catches up');
}

// --- A published week is frozen ---
{
  const m = createMatch('M1', { id: 'P1', name: 'You' }, { id: 'P2', name: 'Wade' });
  publishWeek(m, 'P2', 1, profile('P2', { nameID: 10 }));
  let threw = false;
  try {
    publishWeek(m, 'P2', 1, profile('P2', { nameID: 90 }));
  } catch {
    threw = true;
  }
  assert(threw, 'a published week cannot be rewritten — the opponent may have played it');
  assert(
    opponentFor(m, 'P1', 1)!.nameID === 10,
    'so what you already resolved against cannot change under you'
  );
}

// --- The match feeds the same deterministic stream both sides use ---
{
  const m = createMatch('M1', { id: 'P1', name: 'You' }, { id: 'P2', name: 'Wade' });
  publishWeek(m, 'P2', 3, profile('P2', { nameID: 30 }));
  const mine = opponentFor(m, 'P1', 3)!;
  // Their client reconstructs the same match from JSON and must agree.
  const theirs = parseMatch(JSON.stringify(m));
  const same = opponentFor(theirs, 'P1', 3)!;
  assert(
    opponentSeed(mine, 3) === opponentSeed(same, 3),
    'both clients derive the same opponent stream from the same match — no desync'
  );
}

// --- Standing: reports, never punishes ---
{
  const m = createMatch('M1', { id: 'P1', name: 'You' }, { id: 'P2', name: 'Wade' });
  for (let w = 1; w <= 5; w++) publishWeek(m, 'P1', w, profile('P1'), 1000 + w);
  publishWeek(m, 'P2', 1, profile('P2'), 1100);

  const st = matchStanding(m);
  assert(st.weeks[0] === 5 && st.weeks[1] === 1, `weeks reported per side (${st.weeks.join(' vs ')})`);
  assert(st.gap === 4, `the gap is measured (${st.gap})`);
  assert(st.behind === 'P2', 'and the trailing player is named');
  assert(st.stalled && STALL_WEEKS === 3, `${STALL_WEEKS}+ weeks behind reads as stalled`);
  assert(st.lastActivity === 1100, `last activity is the most recent dispatch (${st.lastActivity})`);

  // Crucially: being stalled does not end anything.
  assert(
    opponentFor(m, 'P1', 5) !== null,
    'a stalled opponent still fields a campaign — no forfeit, no timer'
  );

  const level = createMatch('M2', { id: 'A', name: 'a' }, { id: 'B', name: 'b' });
  publishWeek(level, 'A', 1, profile('A'));
  publishWeek(level, 'B', 1, profile('B'));
  assert(matchStanding(level).behind === null, 'level pegging names nobody');
}

// --- A match off the wire is scrubbed the same way a profile is ---
{
  const m = createMatch('M1', { id: 'P1', name: 'You' }, { id: 'P2', name: 'Wade' });
  publishWeek(m, 'P2', 1, profile('P2', { nameID: 10 }));
  const wire = JSON.parse(JSON.stringify(m)) as typeof m;
  // Tamper on disk, the way an editor would.
  wire.sides[1]!.dispatches[0]!.profile.strength = 100;
  wire.sides[1]!.dispatches.push({ week: 1, profile: profile('P2', { nameID: 99 }), at: 5 });

  const clean = parseMatch(JSON.stringify(wire));
  const seated = opponentFor(clean, 'P1', 1)!;
  assert(seated.strength < 100, `a tampered strength inside a match is re-derived (${seated.strength})`);
  assert(
    seated.nameID === 10,
    'and a duplicate week cannot overwrite the first publication — earliest wins'
  );
  assert(clean.sides[1]!.dispatches.length === 1, 'the duplicate is dropped');

  assert(!isMatchState({ v: 99 }), 'a future match version is refused');
  let threw = false;
  try {
    parseMatch(JSON.stringify({ v: 99 }));
  } catch {
    threw = true;
  }
  assert(threw, 'and parsing it throws rather than half-working');
}

if (failed) {
  console.error(`\nMatch harness FAILED — ${failed} assertion(s)`);
  process.exit(1);
}
console.log('\nMatch + trust boundary green.');
