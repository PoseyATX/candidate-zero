/**
 * AC1 prototype parity — modular resolve ≡ frozen prototypeRoll for STD path.
 * Documents intentional deltas (SAFE, VOL, PL04 tune).
 * Run: npm run harness:ac1-parity
 */

import { createNewState } from '../engine/state.js';
import { resolve } from '../engine/resolve.js';
import { createRng, useRng, setDefaultSeed } from '../engine/rng.js';
import {
  prototypeRoll,
  modularToPrototypeParams,
  INTENTIONAL_DELTAS
} from '../engine/prototype-compat.js';

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
    throw new Error(msg);
  }
}

console.log('=== CANDIDATE ZERO — AC1 Prototype Parity ===\n');

const N = 2000;
const seed = 0xA11ce;
useRng(createRng(seed));
setDefaultSeed(seed);
const state = createNewState({ tier: 0, seed });

let match = 0;
for (let i = 0; i < N; i++) {
  const p = 0.55;
  // Consume one shared roll so both paths see identical r
  const r = createRng(seed + i + 1).next();
  const mod = resolve(p, 'STD', state, r);
  const proto = prototypeRoll(p, state.tier, 0.18, () => r);
  if (mod.tier === proto.tier) match++;
  else {
    console.error('Mismatch at i=', i, { mod, proto });
    process.exitCode = 1;
    throw new Error('STD tier mismatch');
  }
}
assert(match === N, `Expected ${N}/${N} STD matches, got ${match}`);
console.log(`PASSED: modular STD ≡ prototypeRoll (${N}/${N}) under injected rolls`);

// SAFE never disasters under modular
{
  useRng(createRng(99));
  setDefaultSeed(99);
  const s = createNewState({ tier: 2, seed: 99 });
  for (let i = 0; i < 5000; i++) {
    const r = resolve(0.55, 'SAFE', s);
    assert(r.tier !== 3, 'SAFE produced DISASTER');
    assert(r.band === 0, 'SAFE band must be 0');
  }
  console.log('PASSED: SAFE band=0, zero DISASTER across 5000 seeded rolls');
}

// VOL intentional wider band
{
  const s = createNewState({ tier: 0 });
  const params = modularToPrototypeParams('VOL', s);
  assert(params.critShare === 0.3, 'VOL critShare should be 0.3');
  console.log('PASSED: VOL modular params:', params.notes.join('; '));
}

console.log('\nIntentional deltas (not bugs):');
for (const d of INTENTIONAL_DELTAS) {
  console.log(`  - ${d.id}: ${d.summary}`);
}
console.log('\nHarness complete.');
