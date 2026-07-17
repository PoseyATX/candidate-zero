/**
 * Obligations weekly drag + debt note.
 * Run: npx tsx src/harness/obligations-tick.ts
 */

import { createNewState } from '../engine/state.js';
import { applySetup, HARNESS_DEFAULT_SETUP } from '../data/setup.js';
import { tickObligations, addObligation, OBLS } from '../engine/obligations.js';
import { setDefaultSeed, createRng, useRng } from '../engine/rng.js';

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
    throw new Error(msg);
  }
}

console.log('=== CANDIDATE ZERO — Obligations Tick ===\n');

{
  useRng(createRng(1));
  setDefaultSeed(1);
  const s = createNewState({ seed: 1, money: 500, debt: 0 });
  applySetup(s, HARNESS_DEFAULT_SETUP);
  addObligation(s, 'OB1');
  const L0 = s.faces.L;
  const exp0 = s.exposure || 0;
  tickObligations(s);
  assert(s.faces.L < L0, 'PAC String thins Lobbyist face');
  assert((s.exposure || 0) > exp0, 'PAC String raises exposure');
  console.log('PASSED: OB1 PAC String drag', { L: s.faces.L, exposure: s.exposure });
}

{
  useRng(createRng(2));
  setDefaultSeed(2);
  const s = createNewState({ seed: 2, money: 400, debt: 4200 });
  applySetup(s, HARNESS_DEFAULT_SETUP);
  addObligation(s, 'OB2');
  const m0 = s.money;
  tickObligations(s);
  assert(s.money < m0, 'Bank Note costs money');
  console.log('PASSED: OB2 Bank Note drag', { money: s.money, debt: s.debt });
}

{
  useRng(createRng(3));
  setDefaultSeed(3);
  const s = createNewState({ seed: 3 });
  applySetup(s, HARNESS_DEFAULT_SETUP);
  // Legacy prose → normalize
  s.obls = ['An association expects a friendly ear on tort matters.'];
  tickObligations(s);
  assert(s.obls.includes('OB1'), 'free-text PAC obligation normalizes to OB1');
  console.log('PASSED: normalize free-text → OB1', s.obls);
}

{
  assert(Object.keys(OBLS).length >= 5, 'registry populated');
  console.log('PASSED: registry size', Object.keys(OBLS).length);
}

console.log('\nObligations harness complete.\n');
