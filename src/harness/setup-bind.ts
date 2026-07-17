/**
 * Setup / persona binding harness — choices bind to attrs and sig need.
 * Run: npm run harness:setup
 */

import { createCampaign, runWeek } from '../engine/loop.js';
import { laborBallotStrategy } from '../engine/strategies.js';
import { createRng, setDefaultSeed, useRng } from '../engine/rng.js';
import { cardAttrMod } from '../engine/play.js';
import { ALL_PLAYS } from '../data/plays.js';
import type { SetupSelection } from '../data/setup.js';

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
    throw new Error(msg);
  }
}

console.log('=== CANDIDATE ZERO — Setup Binding Harness ===\n');

// Teacher vs feed-store attrs differ
{
  useRng(createRng(1));
  setDefaultSeed(1);
  const teacher = createCampaign({
    seed: 1,
    setup: { personaId: 'teacher', issueId: 'taxes', districtId: 'open', regionId: 'east' }
  });
  useRng(createRng(1));
  setDefaultSeed(1);
  const biz = createCampaign({
    seed: 1,
    setup: { personaId: 'smallbiz', issueId: 'taxes', districtId: 'open', regionId: 'east' }
  });
  assert(teacher.state.attrs.CHA > biz.state.attrs.CHA, 'teacher should out-CHA feed-store');
  assert(biz.state.attrs.CRA > teacher.state.attrs.CRA, 'feed-store should out-CRA teacher');
  assert(biz.state.money > teacher.state.money, 'feed-store starts richer');
  assert(teacher.state.contacts > biz.state.contacts, 'teacher starts with more contacts');
  console.log('PASSED: persona attrs + starting ledgers bind', {
    teacherCHA: teacher.state.attrs.CHA,
    bizCRA: biz.state.attrs.CRA,
    teacher$: teacher.state.money,
    biz$: biz.state.money
  });
}

// Region petition mod
{
  useRng(createRng(2));
  setDefaultSeed(2);
  const east = createCampaign({
    seed: 2,
    setup: { personaId: 'teacher', issueId: 'taxes', districtId: 'open', regionId: 'east' }
  });
  useRng(createRng(2));
  setDefaultSeed(2);
  const metro = createCampaign({
    seed: 2,
    setup: { personaId: 'teacher', issueId: 'taxes', districtId: 'open', regionId: 'metro' }
  });
  assert(metro.state.sigNeed > east.state.sigNeed, 'metro should need more signatures');
  console.log('PASSED: region petition mods', {
    east: east.state.sigNeed,
    metro: metro.state.sigNeed
  });
}

// Attr synergy moves odds
{
  useRng(createRng(3));
  setDefaultSeed(3);
  const highCha = createCampaign({
    seed: 3,
    setup: { personaId: 'preacher', issueId: 'schools', districtId: 'open', regionId: 'east' }
  });
  useRng(createRng(3));
  setDefaultSeed(3);
  const craft = createCampaign({
    seed: 3,
    setup: { personaId: 'smallbiz', issueId: 'schools', districtId: 'open', regionId: 'east' }
  });
  const blockWalk = ALL_PLAYS.find(p => p.id === 'PL01')!;
  const modHigh = cardAttrMod(highCha.state, blockWalk);
  const modCraft = cardAttrMod(craft.state, blockWalk);
  assert(modHigh > modCraft, 'preacher CHA should beat feed-store on Block Walk mod');
  console.log('PASSED: cardAttrMod reflects persona', { modHigh, modCraft });
}

// Full week still runs with setup
{
  useRng(createRng(9));
  setDefaultSeed(9);
  const setup: SetupSelection = {
    personaId: 'veteran',
    issueId: 'border',
    districtId: 'comp',
    regionId: 'gulf'
  };
  const c = createCampaign({ seed: 9, setup });
  runWeek(c, laborBallotStrategy);
  assert(c.state.week >= 1, 'week advanced or resolved');
  assert(c.state.persona === 'The Veteran', 'persona name stored');
  console.log('PASSED: labor week under veteran/gulf setup');
}

console.log('\nHarness complete.');
