/**
 * Persistent career: session after win, thematic shifts, multi-cycle.
 * Run: npx tsx src/harness/career-persist.ts
 */

import {
  createCampaign,
  runFullCampaign,
  runThroughSession,
  runThroughInterim
} from '../engine/loop.js';
import { laborBallotStrategy } from '../engine/strategies.js';
import { setDefaultSeed, createRng, useRng } from '../engine/rng.js';
import { resolveThematicChoice } from '../engine/identity-shift.js';
import { getIssue, getDistrict } from '../data/setup.js';

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
    throw new Error(msg);
  }
}

console.log('=== CANDIDATE ZERO — Career Persist Harness ===\n');

// Persona locked across cycles
{
  useRng(createRng(42));
  setDefaultSeed(42);
  const c = createCampaign({
    seed: 42,
    setup: { personaId: 'teacher', issueId: 'taxes', districtId: 'open', regionId: 'east' }
  });
  assert(c.state.personaId === 'teacher', 'persona id locked');
  const personaName = c.state.persona;
  runFullCampaign(c, laborBallotStrategy);
  if (c.state.stage === 'session') runThroughSession(c, laborBallotStrategy);
  assert(c.state.stage === 'interim', 'should reach interim');
  runThroughInterim(c, laborBallotStrategy);
  assert(c.state.stage === 'primary', 'next primary opens');
  assert(c.state.personaId === 'teacher', 'persona still locked');
  assert(c.state.persona === personaName, 'persona name unchanged');
  assert((c.state.cycleIndex ?? 0) >= 1, 'cycle advanced');
  console.log('PASSED: multi-cycle persona lock', {
    cycle: c.state.cycleIndex,
    persona: c.state.persona
  });
}

// General win → session → interim
{
  let found = false;
  for (let i = 0; i < 150 && !found; i++) {
    useRng(createRng(5000 + i));
    setDefaultSeed(5000 + i);
    const c = createCampaign({ seed: 5000 + i });
    c.state.nameID = 30;
    c.state.contacts = 400;
    c.state.volPool = 6;
    c.state.endorsePts = 4;
    c.state.ballot = true;
    for (const g of c.state.groundsArr) g.gotv = 2;
    runFullCampaign(c, laborBallotStrategy);
    if (c.state.lastCycleOutcome === 'won_general') {
      assert(c.state.stage === 'session', 'win opens session');
      assert(c.state.inOffice === true, 'in office');
      runThroughSession(c, laborBallotStrategy);
      assert(c.state.stage === 'interim', 'session → interim');
      found = true;
      console.log('PASSED: win path session → interim', { seed: 5000 + i });
    }
  }
  assert(found, 'could not force a general win in sample');
}

// Thematic issue shift
{
  useRng(createRng(11));
  setDefaultSeed(11);
  const c = createCampaign({
    seed: 11,
    setup: { personaId: 'teacher', issueId: 'taxes', districtId: 'open', regionId: 'east' }
  });
  c.state.stage = 'interim';
  c.state.pendingThematic = {
    id: 'test_issue',
    kind: 'issue',
    title: 'Test',
    body: 'Test body',
    options: [
      { id: 'keep', label: 'Keep', effect: { type: 'keep' } },
      { id: 'water', label: 'Water', effect: { type: 'set_issue', issueId: 'water' } }
    ]
  };
  const r = resolveThematicChoice(c.state, 'water');
  assert(r.ok, 'shift ok');
  assert(c.state.issueId === 'water', 'issue id updated');
  assert(c.state.issue === getIssue('water')!.n, 'issue name updated');
  assert(c.state.personaId === 'teacher', 'persona untouched');
  assert(c.state.pendingThematic === null, 'fork cleared');
  console.log('PASSED: thematic issue shift', { issue: c.state.issue });
}

// District shift
{
  useRng(createRng(12));
  setDefaultSeed(12);
  const c = createCampaign({
    seed: 12,
    setup: { personaId: 'teacher', issueId: 'taxes', districtId: 'open', regionId: 'east' }
  });
  c.state.stage = 'interim';
  c.state.pendingThematic = {
    id: 'test_dist',
    kind: 'district',
    title: 'Maps',
    body: 'Maps',
    options: [{ id: 'take', label: 'Take', effect: { type: 'set_district', districtId: 'comp' } }]
  };
  resolveThematicChoice(c.state, 'take');
  assert(c.state.districtId === 'comp', 'district id');
  assert(c.state.district?.name === getDistrict('comp')!.n, 'district name');
  console.log('PASSED: thematic district shift', { district: c.state.district?.name });
}

console.log('\nCareer persist harness complete.');
