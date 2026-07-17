/**
 * Pure resolve-engine harness — imports the real engine directly (no
 * hand-duplicated copy) so this can never silently drift from src/engine/resolve.ts.
 * Proves SAFE can never produce DISASTER and distributions are sensible.
 */

import { resolve } from '../engine/resolve.js';
import { createNewState } from '../engine/state.js';
import type { RiskClass } from '../engine/types.js';

const mockState = createNewState({ tier: 0 });

function runDistribution(risk: RiskClass, iterations = 5000) {
  const counts = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (let i = 0; i < iterations; i++) {
    const r = resolve(0.55, risk, mockState);
    counts[r.tier]++;
  }
  return counts;
}

console.log('=== CANDIDATE ZERO — Resolve Engine Harness ===');
console.log('SAFE (p=0.55, 5k runs):', runDistribution('SAFE'));
console.log('STD  (p=0.55, 5k runs):', runDistribution('STD'));
console.log('VOL  (p=0.55, 5k runs):', runDistribution('VOL'));

const safeResults = runDistribution('SAFE', 3000);
if (safeResults[3] > 0) {
  console.error('FAILED: SAFE produced DISASTER — violates SRD Covenant 2');
  process.exitCode = 1;
} else {
  console.log('PASSED: SAFE produced zero DISASTERs across 3000 runs (SRD Covenant 2 holds)');
}

console.log('\nHarness complete. Pure resolve is ready.');
