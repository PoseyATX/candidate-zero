/**
 * Chronicle → waiting-loop bridge harness.
 * Run: npm run harness:chronicle
 */

import {
  emptyLegacy,
  setInterimPath,
  applyLegacy,
  PATH_TO_WAITING_LOOP,
  buildPaths
} from '../engine/legacy.js';
import { LOOPS } from '../data/starmap/loops.js';
import { createNewState } from '../engine/state.js';
import { recordRun } from '../engine/legacy.js';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error('FAIL: ' + msg);
}

console.log('=== CANDIDATE ZERO — Chronicle / Waiting Loop Bridge ===\n');

// Every path maps to a real starmap loop (waiting or higher_office exploratory)
for (const [pathId, loopId] of Object.entries(PATH_TO_WAITING_LOOP)) {
  assert(!!LOOPS[loopId], `${pathId} → missing ${loopId}`);
  const kind = LOOPS[loopId]!.kind;
  assert(
    kind === 'waiting' || kind === 'higher_office',
    `${loopId} kind waiting|higher_office (got ${kind})`
  );
  console.log(`  ${pathId} → ${loopId} (${kind})`);
}

// setInterimPath banks waitingLoopId
{
  const leg = emptyLegacy();
  leg.runs.push({ epithet: 'test', kind: 'lost_primary' });
  setInterimPath(leg, 'staffer', 'Two years in the building.');
  assert(leg.carry.waitingLoopId === 'LOOP_WAITING_STAFFER', 'carry waiting loop');
  assert(!!leg.runs[0]!.interim?.includes('building'), 'interim text');
}

// applyLegacy logs waiting orbit residue
{
  const leg = emptyLegacy();
  leg.carry.waitingLoopId = 'LOOP_WAITING_PERENNIAL';
  leg.traits = ['T_KNOWN'];
  const s = createNewState({ seed: 1 });
  applyLegacy(s, leg);
  assert(s.nameID >= 6, 'trait still applies');
  assert(
    !!s.entityHistory?.some(h => h.includes('LOOP_WAITING_PERENNIAL')),
    'entityHistory waiting tag'
  );
  // Assert the contract, not the wording. This previously pinned the literal
  // "WAITING ORBIT" marker, which 7f05cb9 deliberately removed when the line was
  // rewritten as player-facing prose — leaving CI red. The flag + a surfaced
  // note are the stable signals; copy edits must not break this.
  assert(
    s.sessionFlags?.['waiting_LOOP_WAITING_PERENNIAL'] === true,
    'waiting loop session flag'
  );
  assert(
    s.log.some(l => l.kind === 'note'),
    'waiting residue surfaced in the log'
  );
  console.log('PASSED: applyLegacy waiting residue');
}

// buildPaths still offers gates
{
  const s = createNewState({ seed: 2, hitPieces: 0, endorsePts: 3 });
  s.outcome = 'lost_primary';
  const paths = buildPaths(s, 40);
  assert(paths.some(p => p.id === 'perennial'), 'perennial');
  assert(paths.some(p => p.id === 'staffer'), 'staffer gated open');
  assert(paths.every(p => PATH_TO_WAITING_LOOP[p.id]), 'all paths mapped');
  console.log('PASSED: paths map to waiting loops');
}

// recordRun + path round-trip
{
  const leg = emptyLegacy();
  const s = createNewState({ seed: 3, contacts: 100, nameID: 20 });
  s.outcome = 'lost_general';
  recordRun(leg, s, 'lost_general', 35);
  setInterimPath(leg, 'advocate', 'Building the org.');
  assert(leg.carry.waitingLoopId === 'LOOP_WAITING_ADVOCATE', 'advocate loop');
  console.log('PASSED: recordRun + interim path');
}

console.log('\nChronicle waiting-loop bridge green.');
process.exit(0);
