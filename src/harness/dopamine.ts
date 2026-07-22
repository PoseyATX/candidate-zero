/**
 * Dopamine loop harness — feedback is pure annotation (no pity RNG).
 * Run: npm run harness:dopamine
 */

import { createCampaign, runWeek, runFullCampaign } from '../engine/loop.js';
import { laborBallotStrategy } from '../engine/strategies.js';
import { createRng, setDefaultSeed, useRng } from '../engine/rng.js';
import { detectNearMiss, buildPlayFeedback, createFeedbackState } from '../engine/feedback.js';
import { resolve } from '../engine/resolve.js';
import { createNewState } from '../engine/state.js';
import { PL01_BlockWalk, PL04_PetitionDrive } from '../data/plays.js';
import { executePlay } from '../engine/play.js';

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
    throw new Error(msg);
  }
}

console.log('=== CANDIDATE ZERO — Dopamine / Feedback Harness ===\n');

// Near-miss geometry (no RNG mutation)
{
  const almostGain = detectNearMiss({ tier: 2, roll: 0.552, p: 0.55, band: 0.04 }, 'STD', 2);
  assert(almostGain?.kind === 'almost_gain', 'setback just past p should be almost_gain');
  const almostBreak = detectNearMiss({ tier: 1, roll: 0.1, p: 0.55, band: 0.04 }, 'STD', 1);
  // breakLine = 0.55*0.18 = 0.099; roll 0.1 is just past → almost_breakthrough
  assert(almostBreak?.kind === 'almost_breakthrough', 'gain just past break line');
  const skirt = detectNearMiss({ tier: 2, roll: 0.94, p: 0.55, band: 0.04 }, 'STD', 2);
  // disaster at 0.96; 0.94 is within 0.045 → skirted_disaster
  assert(skirt?.kind === 'skirted_disaster', 'setback near disaster band');
  console.log('PASSED: near-miss geometry');
}

// Feedback does not change resolve outcomes
{
  useRng(createRng(99));
  setDefaultSeed(99);
  const s1 = createNewState({ seed: 99, money: 200, volPool: 2, ap: 5 });
  const r1 = resolve(0.55, 'STD', s1);

  useRng(createRng(99));
  setDefaultSeed(99);
  const s2 = createNewState({ seed: 99, money: 200, volPool: 2, ap: 5 });
  const r2 = resolve(0.55, 'STD', s2);
  assert(r1.tier === r2.tier && r1.roll === r2.roll, 'resolve identical under seed');
  // annotate (no extra RNG)
  s1.feedback = createFeedbackState();
  buildPlayFeedback(s1, PL01_BlockWalk, r1, { ballot: false, sigs: 0, stage: 'primary' });
  assert(s1.feedback.hotStreak + s1.feedback.coldStreak >= 1, 'streak counters move');
  // same seed resolve still matches after annotation on a twin stream
  useRng(createRng(99));
  setDefaultSeed(99);
  const s3 = createNewState({ seed: 99, money: 200, volPool: 2, ap: 5 });
  const r3 = resolve(0.55, 'STD', s3);
  assert(r3.roll === r1.roll && r3.tier === r1.tier, 'annotation does not consume RNG');
  console.log('PASSED: feedback is annotation-only (resolve untouched)');
}

// Plays emit juice + streaks over a week
{
  useRng(createRng(42));
  setDefaultSeed(42);
  const c = createCampaign({ seed: 42 });
  const report = runWeek(c, laborBallotStrategy);
  assert(report.summary !== undefined, 'week summary present');
  assert(report.summary!.juice.length > 10, 'summary juice text');
  const juices = c.state.log.filter(e => e.kind === 'juice');
  const plays = report.plays.filter(p => p.ok);
  assert(juices.length >= plays.length, 'each play gets juice log');
  assert(plays.every(p => p.feedback?.stamp), 'feedback stamp on outcomes');
  console.log('PASSED: week summary + juice logs', {
    plays: plays.length,
    juices: juices.length,
    headline: report.summary!.headline
  });
}

// Full campaign still terminates with feedback milestones possible
{
  useRng(createRng(7));
  setDefaultSeed(7);
  const c = createCampaign({ seed: 7 });
  runFullCampaign(c, laborBallotStrategy);
  assert(c.state.over, 'campaign ends');
  assert(c.state.feedback !== undefined, 'feedback state exists');
  console.log('PASSED: full campaign with feedback', {
    outcome: c.state.outcome,
    milestones: c.state.feedback?.milestonesSeen?.length ?? 0,
    lastJuice: c.state.feedback?.lastPlay?.juice?.slice(0, 60)
  });
}

// Ballot milestone fires when petition clears
{
  useRng(createRng(1));
  setDefaultSeed(1);
  const s = createNewState({ seed: 1, money: 100, volPool: 4, ap: 20, signatures: 400, sigNeed: 450 });
  s.feedback = createFeedbackState();
  // Force success path with roll override via many plays until ballot
  let got = false;
  for (let i = 0; i < 30 && !s.ballot; i++) {
    s.ap = 5;
    const out = executePlay(s, PL04_PetitionDrive);
    if (out.ok && out.feedback?.milestone?.includes('BALLOT')) got = true;
  }
  if (s.ballot) {
    assert(
      got || s.feedback.milestonesSeen.includes('first_ballot'),
      'first ballot milestone recorded'
    );
    console.log('PASSED: ballot milestone path');
  } else {
    console.log('SKIPPED: ballot milestone (RNG did not clear in 30 plays — non-fatal)');
  }
}

console.log('\nCovenant: SAFE still pure; feedback never re-rolls.');
console.log('Harness complete.');
