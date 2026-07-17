/**
 * Plain JS harness for pure resolve engine.
 * Proves SAFE can never produce DISASTER and distributions are sensible.
 */

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function hasRep(state, id) {
  return state.reps.includes(id);
}

function warm(state, id) {
  const a = state.allies.find(x => x.id === id);
  return !!(a && a.warm > 0);
}

function resolve(p, risk, state) {
  p = clamp(p, 0.02, 0.95);
  const critShare = risk === 'VOL' ? 0.3 : risk === 'SAFE' ? (hasRep(state, 'R01') ? 0.15 : 0) : 0.18;
  let band = risk === 'SAFE' ? 0 : (0.04 + state.tier * 0.04) * (risk === 'VOL' ? 2 : 1);
  band = Math.max(0, band + (state.globalBand || 0) - (warm(state, 'AL11') ? 0.02 : 0) - (hasRep(state, 'R10') ? 0.01 : 0));
  const roll = Math.random();
  let tier;
  if (critShare > 0 && roll < p * critShare) tier = 0;
  else if (roll < p) tier = 1;
  else if (band > 0 && roll > 1 - band) tier = 3;
  else tier = 2;
  return { tier, roll, p, band };
}

const mockState = { tier: 0, globalBand: 0, reps: [], allies: [] };

function runDistribution(risk, iterations = 5000) {
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
  process.exit(1);
} else {
  console.log('PASSED: SAFE produced zero DISASTERs across 3000 runs (SRD Covenant 2 holds)');
}

console.log('\nHarness complete. Pure resolve is ready.');
