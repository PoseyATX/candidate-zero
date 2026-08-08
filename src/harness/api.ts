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

/**
 * Canonical comparison key.
 * Live engine objects can carry own-props set to `undefined` (JSON omits them)
 * and key insertion order that differs from a post-deserialize tree. Value
 * equality is what save/load fidelity means; sort keys so order is not a fail.
 */
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(v as object).sort()) {
        sorted[k] = (v as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return v;
  });
}

function stateKey(snap: EngineSnapshot): string {
  return stableStringify({ state: snap.state, deck: snap.deck, rng: snap.rng });
}

/** Pure policy: a command is a deterministic function of the snapshot. */
function nextCommand(snap: EngineSnapshot): Command | null {
  const v = view(snap);
  if (v.over) return null;
  if (v.pendingOutside) return { type: 'dismissOutside' };
  if (v.pendingDraft) return { type: 'draft', option: 0 };
  if (v.actions.length) {
    const a = v.actions[0]!;
    const cmd: Command = { type: 'play', handIndex: a.handIndex };
    // A fork will not resolve until an arm is named. Deterministic policy:
    // always take the first. See engine/play.ts.
    if (a.branches.length) cmd.branch = a.branches[0]!.id;
    if (a.field && v.grounds.length) {
      // Only open grounds are valid field targets (GroundView.locked).
      const open = v.grounds.filter(g => !g.locked);
      if (open.length) cmd.groundId = open[v.calendarWeek % open.length]!.id;
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

// 6. The draft view never leaks the engine's internal option encoding.
// A host cannot be asked to know that "UP:PL01" means "sharpen PL01" — the view
// owes it a real card id, a real name, and an explicit `upgrade` flag.
{
  let seen = 0;
  let leaked: string[] = [];
  let unnamed: string[] = [];
  for (const seed of SEEDS) {
    let snap = newGame({ seed });
    for (let i = 0; i < 4000; i++) {
      const v = view(snap);
      if (v.pendingDraft) {
        for (const o of v.pendingDraft.options) {
          seen++;
          if (o.cardId.includes(':')) leaked.push(o.cardId);
          // name falling back to the id is how the old bug surfaced to a host.
          if (!o.name || o.name === o.cardId) unnamed.push(o.cardId);
          if (typeof o.upgrade !== 'boolean') unnamed.push(`${o.cardId}(no flag)`);
          // An opportunity is not always a card — it may be an upgrade, or
          // somebody taking a debt off you. The host is told which, rather than
          // being left to parse the id. See engine/opportunity.ts.
          if (!['card', 'upgrade', 'shed'].includes(o.kind)) {
            unnamed.push(`${o.cardId}(bad kind ${o.kind})`);
          }
        }
      }
      const cmd = nextCommand(snap);
      if (!cmd) break;
      snap = apply(snap, cmd).snapshot;
    }
  }
  assert(seen > 0, `draft options appeared in the host view (${seen} observed)`);
  assert(
    leaked.length === 0,
    `draft cardIds are real catalog ids, never option encodings (${leaked.slice(0, 3).join(', ') || 'clean'})`
  );
  assert(
    unnamed.length === 0,
    `every draft option carries a real name and an upgrade flag (${unnamed.slice(0, 3).join(', ') || 'clean'})`
  );
}

console.log('');
if (failures) {
  console.error(`API determinism FAILED — ${failures} assertion(s).`);
  process.exit(1);
}
console.log(`All ${SEEDS.length} seeds terminal (${reached}/${SEEDS.length}); replay + save/load exact.`);
console.log('Host API determinism green.');
