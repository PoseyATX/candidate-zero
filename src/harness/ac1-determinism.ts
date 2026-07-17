/**
 * AC1 foundation — deterministic replay + seed isolation
 * Run: npm run harness:ac1
 */

import { createCampaign, runWeek, snapshot } from '../engine/loop.js';
import { resolve } from '../engine/resolve.js';
import { createRng, setDefaultSeed, useRng } from '../engine/rng.js';
import { laborBallotStrategy } from '../engine/strategies.js';
import { createNewState } from '../engine/state.js';
import { ALL_PLAYS, PLAY_COUNT } from '../data/plays.js';

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
    throw new Error(msg);
  }
}

function resolveSequence(seed: number, n: number, p = 0.55, risk: 'SAFE' | 'STD' | 'VOL' = 'STD') {
  useRng(createRng(seed));
  setDefaultSeed(seed);
  const state = createNewState({ tier: 0 });
  const tiers: number[] = [];
  const rolls: number[] = [];
  for (let i = 0; i < n; i++) {
    const r = resolve(p, risk, state);
    tiers.push(r.tier);
    rolls.push(+r.roll.toFixed(8));
  }
  return { tiers, rolls };
}

function campaignLedger(seed: number) {
  const campaign = createCampaign({ seed });
  for (let w = 0; w < 8; w++) {
    runWeek(campaign, laborBallotStrategy);
  }
  return {
    ledger: snapshot(campaign.state),
    logLen: campaign.state.log.length,
    plays: campaign.state.log.filter((e: { kind?: string }) => e.kind === 'play').map((e: { cardId?: string; tier?: number; text?: string }) => ({
      cardId: e.cardId,
      tier: e.tier,
      text: e.text
    }))
  };
}

console.log('=== CANDIDATE ZERO — AC1 Determinism Harness ===\n');
console.log(`Play catalog size: ${PLAY_COUNT} (expect ≥ 22)`);
assert(PLAY_COUNT >= 22, `Expected ≥22 plays, got ${PLAY_COUNT}`);
assert(ALL_PLAYS.some(p => p.id === 'PL16'), 'PL16 Recruit Volunteers missing');
assert(ALL_PLAYS.some(p => p.id === 'PL20' && p.trap), 'PL20 PAC trap missing');
assert(ALL_PLAYS.some(p => p.id === 'PL21' && p.trap), 'PL21 Self-Fund trap missing');
assert(ALL_PLAYS.some(p => p.id === 'PL22'), 'PL22 Contrast Mail missing');
console.log('PASSED: Wave 4 cards present in catalog\n');

const a = resolveSequence(0xC0FFEE, 200);
const b = resolveSequence(0xC0FFEE, 200);
const c = resolveSequence(0xBADF00D, 200);
assert(JSON.stringify(a.tiers) === JSON.stringify(b.tiers), 'Same seed must yield same tiers');
assert(JSON.stringify(a.rolls) === JSON.stringify(b.rolls), 'Same seed must yield same rolls');
assert(JSON.stringify(a.tiers) !== JSON.stringify(c.tiers), 'Different seeds should diverge (tiers)');
console.log('PASSED: resolve() seed replay (200 rolls, seed 0xC0FFEE)');

const safe = resolveSequence(12345, 5000, 0.55, 'SAFE');
assert(safe.tiers.every(t => t !== 3), 'SAFE produced DISASTER under seed 12345');
console.log('PASSED: SAFE never DISASTER across 5000 seeded rolls');

{
  const state = createNewState({ tier: 0 });
  const r0 = resolve(0.55, 'STD', state, 0.01);
  const r1 = resolve(0.55, 'STD', state, 0.01);
  assert(r0.tier === r1.tier && r0.tier <= 1, 'rollOverride must be deterministic');
  const disaster = resolve(0.55, 'STD', state, 0.999);
  assert(disaster.tier === 3, `Expected DISASTER at roll 0.999, got ${disaster.tier}`);
  console.log('PASSED: rollOverride injection (AC1 unit path)');
}

const run1 = campaignLedger(42);
const run2 = campaignLedger(42);
const run3 = campaignLedger(99);
assert(JSON.stringify(run1.ledger) === JSON.stringify(run2.ledger), 'Campaign ledger must match under seed 42');
assert(JSON.stringify(run1.plays) === JSON.stringify(run2.plays), 'Play log must match under seed 42');
assert(
  JSON.stringify(run1.ledger) !== JSON.stringify(run3.ledger) ||
    JSON.stringify(run1.plays) !== JSON.stringify(run3.plays),
  'Different seeds should change campaign outcomes'
);
console.log('PASSED: 8-week labor campaign ledger replay (seed 42)');
console.log('  sample ledger (seed 42):', run1.ledger);
console.log('  plays logged:', run1.plays.length);
console.log('\n--- AC1 status ---');
console.log('DONE: seeded RNG + campaign replay');
console.log('OPEN: field-level side-by-side vs archive HTML prototype');
console.log('\nHarness complete.');
