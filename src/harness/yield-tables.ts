/**
 * Yield-table evidence for core early actions (AC1 open note).
 * Measures distribution of net contacts / $ / sigs under seeded pure engine.
 * Run: npm run harness:yields
 *
 * Intentional: modular is source of truth where tuned (PL04 petition).
 * Archive HTML prototype yields are historical; we record modular envelopes here.
 */

import { createNewState } from '../engine/state.js';
import { executePlay } from '../engine/play.js';
import { createRng, setDefaultSeed, useRng } from '../engine/rng.js';
import {
  PL01_BlockWalk,
  PL04_PetitionDrive,
  PL13_FishFry
} from '../data/plays.js';
import type { GameState, PlayCard } from '../engine/types.js';

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
    throw new Error(msg);
  }
}

interface YieldStats {
  n: number;
  mean: number;
  p10: number;
  p50: number;
  p90: number;
  min: number;
  max: number;
  disasters: number;
  breakthroughs: number;
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i]!;
}

function stats(values: number[], tiers: number[]): YieldStats {
  const sorted = [...values].sort((a, b) => a - b);
  const n = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / Math.max(1, n);
  return {
    n,
    mean: +mean.toFixed(2),
    p10: percentile(sorted, 10),
    p50: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    disasters: tiers.filter(t => t === 3).length,
    breakthroughs: tiers.filter(t => t === 0).length
  };
}

function freshState(seed: number): GameState {
  useRng(createRng(seed));
  setDefaultSeed(seed);
  const s = createNewState({
    seed,
    money: 500,
    volPool: 2,
    ap: 10,
    apMax: 10
  });
  return s;
}

/** Run one pure play N times from a fresh state each trial; measure metric delta. */
function monteCarlo(
  card: PlayCard,
  metric: (before: GameState, after: GameState) => number,
  trials: number,
  seedBase: number
): YieldStats {
  const values: number[] = [];
  const tiers: number[] = [];
  for (let i = 0; i < trials; i++) {
    const s = freshState(seedBase + i);
    // afford
    s.ap = 10;
    s.money = Math.max(s.money, (card.cost.$ ?? 0) + 100);
    s.volPool = Math.max(s.volPool, card.cost.vp ?? 0);
    const before = {
      contacts: s.contacts,
      money: s.money,
      signatures: s.signatures,
      volPool: s.volPool
    };
    const g = s.groundsArr[0];
    const out = executePlay(s, card, g);
    assert(out.ok, `play failed ${card.id}: ${out.reason}`);
    tiers.push(out.tier ?? 2);
    // rebuild metric from snapshots stored on before
    const afterProxy = {
      contacts: s.contacts,
      money: s.money,
      signatures: s.signatures,
      volPool: s.volPool
    } as GameState;
    const beforeProxy = before as unknown as GameState;
    values.push(metric(beforeProxy, afterProxy));
  }
  return stats(values, tiers);
}

const TRIALS = 2000;

console.log('=== CANDIDATE ZERO — Yield Tables (modular pure engine) ===\n');
console.log(`Trials per card: ${TRIALS} (seeded, fresh state each)\n`);

const walkContacts = monteCarlo(
  PL01_BlockWalk,
  (b, a) => a.contacts - b.contacts,
  TRIALS,
  10_000
);
console.log('PL01 Block Walk — Δcontacts', walkContacts);
assert(walkContacts.disasters === 0, 'SAFE walk must never disaster');
assert(walkContacts.mean > 5 && walkContacts.mean < 80, 'walk mean contacts out of band');

const fryNet = monteCarlo(
  PL13_FishFry,
  (b, a) => a.money - b.money, // net after $150 cost already paid inside executePlay
  TRIALS,
  20_000
);
console.log('PL13 Fish Fry — Δmoney (after $150 cost)', fryNet);
assert(fryNet.disasters === 0, 'SAFE fry must never disaster');
assert(fryNet.mean > 0, 'fish fry should be net positive on average');

const petition = monteCarlo(
  PL04_PetitionDrive,
  (b, a) => a.signatures - b.signatures,
  TRIALS,
  30_000
);
console.log('PL04 Petition Drive — Δsignatures (vol=2 baseline state)', petition);
assert(petition.disasters > 0, 'STD petition should see some disasters in 2k trials');
assert(petition.mean > 10 && petition.mean < 120, 'petition mean sigs out of expected band');

// vol=0 petition for envelope comparison
function petitionAtVol(vol: number, trials: number, seedBase: number): YieldStats {
  const values: number[] = [];
  const tiers: number[] = [];
  for (let i = 0; i < trials; i++) {
    const s = freshState(seedBase + i);
    s.volPool = vol;
    s.ap = 10;
    const before = s.signatures;
    const out = executePlay(s, PL04_PetitionDrive);
    assert(out.ok, out.reason ?? 'petition fail');
    tiers.push(out.tier ?? 2);
    values.push(s.signatures - before);
  }
  return stats(values, tiers);
}

console.log('\nPL04 by volunteer level (Δsigs / play):');
for (const vol of [0, 2, 4, 6]) {
  const row = petitionAtVol(vol, 1500, 40_000 + vol * 10_000);
  console.log(`  vol=${vol}`, row);
}

console.log('\nDesign notes:');
console.log('- Block Walk SAFE envelope is the grind floor (never disaster).');
console.log('- Fish Fry funds the money ballot path; mean net should stay > 0.');
console.log('- Petition tuned 2026-07-16 then 2026-07-17; positive tails no longer auto-clear 450 by W2,');
console.log('  and labor no longer needs ~6 of 8 primary weeks to reach ballot (see BALANCE-NOTES.md).');
console.log('- Full archive ACTION table compare remains open for walk/fund/chairs narrative text.');

console.log('\nHarness complete.');
