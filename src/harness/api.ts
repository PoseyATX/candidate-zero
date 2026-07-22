/**
 * CANDIDATE ZERO — host API determinism harness
 * Run: npm run harness:api
 *
 * Proves the engine-binding contract (src/engine/api.ts) that the Unity /
 * iOS ship path depends on:
 *   1. newGame(seed) is deterministic.
 *   2. Same seed + same ordered command log  ->  identical final state.
 *   3. serialize()->deserialize() before EVERY command changes nothing
 *      (save/load is exact, not approximate).
 *   4. A driven game actually reaches a terminal outcome (the loop works
 *      end to end through the public API, not just the internals).
 *
 * The harness talks ONLY to the public API — no engine internals — so it
 * also verifies the boundary is complete enough to play a whole campaign.
 */

import {
  newGame,
  apply,
  view,
  serialize,
  deserialize,
  ENGINE_API_VERSION,
  type Command,
  type EngineSnapshot
} from '../engine/api.js';

const SEEDS = [1, 42, 777, 20260719, 0xc0ffee];

let failures = 0;
function assert(cond: boolean, msg: string): void {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${msg}`);
  if (!cond) failures++;
}

/** Canonical comparison — normalizes undefined/order-independent shape via JSON. */
function stateKey(snap: EngineSnapshot): string {
  return JSON.stringify({ state: snap.state, deck: snap.deck, rng: snap.rng });
}

/** Pure policy: a command is a deterministic function of the snapshot. */
function nextCommand(snap: EngineSnapshot): Command | null {
  const v = view(snap);
  if (v.over) return null;
  if (v.pendingDraft) return { type: 'draft', option: 0 };
  if (v.actions.length) {
    const a = v.actions[0]!;
    const cmd: Command = { type: 'play', handIndex: a.handIndex };
    if (a.field && v.grounds.length) {
      cmd.groundId = v.grounds[v.calendarWeek % v.grounds.length]!.id;
    }
    return cmd;
  }
  if (v.canEndWeek) return { type: 'endWeek' };
  return null;
}

interface RunResult {
  final: EngineSnapshot;
  commands: Command[];
  steps: number;
}

function runToEnd(start: EngineSnapshot, opts: { roundtrip?: boolean } = {}): RunResult {
  let snap = start;
  const commands: Command[] = [];
  let steps = 0;
  for (; steps < 4000; steps++) {
    if (opts.roundtrip) snap = deserialize(serialize(snap)); // save/load every step
    const cmd = nextCommand(snap);
    if (!cmd) break;
    const res = apply(snap, cmd);
    commands.push(cmd);
    snap = res.snapshot;
    if (!res.ok) {
      // An illegal command under our own policy would be a boundary bug.
      console.log('   unexpected illegal command:', JSON.stringify(cmd), '-', res.reason);
      failures++;
      break;
    }
  }
  return { final: snap, commands, steps };
}

/** Replay a fixed command log onto a fresh game (the seed+log save model). */
function replay(seed: number, setup: EngineSnapshot['setup'], commands: Command[]): EngineSnapshot {
  let snap = newGame({ seed, setup });
  for (const cmd of commands) snap = apply(snap, cmd).snapshot;
  return snap;
}

console.log('=== CANDIDATE ZERO — host API determinism ===');
console.log(`engine api v${ENGINE_API_VERSION}\n`);

// 1. Deterministic creation
for (const seed of SEEDS) {
  const a = newGame({ seed });
  const b = newGame({ seed });
  assert(stateKey(a) === stateKey(b), `newGame(${seed}) is deterministic`);
}

// 2/3/4. Drive full campaigns, prove replay + save-load + termination.
let reached = 0;
for (const seed of SEEDS) {
  const start = newGame({ seed });
  const plain = runToEnd(start);
  const roundtripped = runToEnd(newGame({ seed }), { roundtrip: true });
  const replayed = replay(seed, start.setup, plain.commands);

  assert(view(plain.final).over, `seed ${seed}: campaign reaches a terminal (${view(plain.final).outcome})`);
  if (view(plain.final).over) reached++;
  assert(
    stateKey(plain.final) === stateKey(roundtripped.final),
    `seed ${seed}: serialize/deserialize every step is exact (save/load fidelity)`
  );
  assert(
    stateKey(plain.final) === stateKey(replayed),
    `seed ${seed}: same seed + same command log reproduces final state (replay)`
  );
  assert(
    JSON.stringify(plain.commands) === JSON.stringify(roundtripped.commands),
    `seed ${seed}: command sequence is identical with/without round-trips`
  );
}

// 5. Version stamp present on snapshot + view.
{
  const s = newGame({ seed: 5 });
  assert(s.v === ENGINE_API_VERSION, 'snapshot carries api version');
  assert(view(s).v === ENGINE_API_VERSION, 'view carries api version');
}

console.log('');
if (failures) {
  console.error(`API determinism FAILED — ${failures} assertion(s).`);
  process.exit(1);
}
console.log(`All ${SEEDS.length} seeds terminal (${reached}/${SEEDS.length}); replay + save/load exact.`);
console.log('Host API determinism green.');
