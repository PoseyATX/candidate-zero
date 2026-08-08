/**
 * Neighbour density — the edge-count constraint on the starmap graph.
 *
 * The gradient rule (spec §2.1): a node's outbound edge count may exceed its
 * predecessor's by at most 15% (round up, minimum increase of 1 where growth is
 * intended). Shallow nodes offer 2–3 meaningful next-states; deep nodes offer
 * many. A node that would DOUBLE the available options is not allowed to — it
 * gets split into two nodes instead. The count is never shown to the player.
 *
 * `tier` is the depth ordering: tier 0 is the Capitol steps, tier 8 is the
 * people who never have to ask. Predecessor = the tier below.
 *
 * WHAT THIS FOUND, recorded here because it is the actual state of the graph
 * and a later pass should not have to rediscover it: the starmap does not
 * violate the 15% cap. It fails in the opposite direction — it is FLAT. Mean
 * out-degree sits between 0.78 and 1.75 at every single tier and does not grow
 * with depth at all, so a tier-8 lieutenant governor has no more places to go
 * than a block walker. The cap is enforced below; the floor is reported as a
 * measurement rather than asserted, because closing it is a content job
 * (roughly a hundred authored orbits) and not something a test should invent.
 *
 * Run: npm run harness:density
 */

import { ENTITIES } from '../data/starmap/entities.js';
import { ORBITS, orbitsFrom } from '../data/starmap/orbits.js';
import type { EntityDef } from '../engine/types-entities.js';

let failures = 0;
function assert(cond: boolean, msg: string): void {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${msg}`);
  if (!cond) failures++;
}

/** The rule, as a function, so authoring and the test cannot drift. */
export function densityCap(previousDegree: number): number {
  if (previousDegree <= 0) return Infinity;
  // Round up, and always allow a step of at least one where growth is intended.
  return Math.max(previousDegree + 1, Math.ceil(previousDegree * 1.15));
}

console.log('=== CANDIDATE ZERO — neighbour density ===\n');

const all: EntityDef[] = Object.values(ENTITIES);
const outDegree = new Map<string, number>();
for (const e of all) outDegree.set(e.id, orbitsFrom(e.id).length);

const tiers = [...new Set(all.map(e => e.tier))].sort((a, b) => a - b);
const meanByTier = new Map<number, number>();
for (const t of tiers) {
  const ds = all.filter(e => e.tier === t).map(e => outDegree.get(e.id) ?? 0);
  meanByTier.set(t, ds.reduce((s, x) => s + x, 0) / ds.length);
}

console.log(`graph: ${all.length} entities, ${ORBITS.length} orbits\n`);
for (const t of tiers) {
  const ds = all.filter(e => e.tier === t).map(e => outDegree.get(e.id) ?? 0);
  const mean = meanByTier.get(t)!;
  const max = Math.max(...ds);
  console.log(
    `  tier ${t}: n=${ds.length}  mean out=${mean.toFixed(2)}  max=${max}  dead-ends=${ds.filter(x => x === 0).length}`
  );
}
console.log('');

// --- 1. THE CAP. No tier may jump more than 15% over the one below it. ------
{
  const breaches: string[] = [];
  for (let i = 1; i < tiers.length; i++) {
    const prev = meanByTier.get(tiers[i - 1]!)!;
    const here = meanByTier.get(tiers[i]!)!;
    const cap = densityCap(prev);
    if (here > cap) {
      breaches.push(`tier ${tiers[i]} mean ${here.toFixed(2)} > cap ${cap.toFixed(2)}`);
    }
  }
  assert(
    breaches.length === 0,
    `no tier's density jumps more than 15% over the tier below${breaches.length ? ' — ' + breaches.join('; ') : ''}`
  );
}

// --- 2. THE STEP. A node against the predecessors that lead into it. --------
//
// The rule is per-node and relative to its PREDECESSOR — the nodes with an edge
// into it — not to its tier's average. Walking from a node with two ways out
// into one with six is the jump the rule exists to stop; that is where a player
// feels the game get big.
//
// ENT_HOUSE_CANDIDATE is exempt and has to be: it is the player, the origin of
// the whole graph rather than a place the graph sends you. Everything else is
// held to the step.
{
  const PLAYER_NODE = 'ENT_HOUSE_CANDIDATE';
  const predecessors = new Map<string, string[]>();
  for (const orb of ORBITS) {
    const list = predecessors.get(orb.to) ?? [];
    list.push(orb.from);
    predecessors.set(orb.to, list);
  }

  const jumps: string[] = [];
  for (const e of all) {
    if (e.id === PLAYER_NODE) continue;
    const d = outDegree.get(e.id) ?? 0;
    const preds = (predecessors.get(e.id) ?? []).filter(id => id !== PLAYER_NODE);
    if (preds.length === 0) continue; // nothing leads here yet
    const best = Math.max(...preds.map(id => outDegree.get(id) ?? 0));
    const cap = densityCap(best);
    if (d > cap) {
      jumps.push(`${e.id} ${d} > cap ${cap === Infinity ? '-' : cap} (best predecessor ${best})`);
    }
  }
  assert(
    jumps.length === 0,
    `no node jumps more than 15% past the node that leads into it${jumps.length ? ' — ' + jumps.join('; ') : ''}`
  );
}

// --- 3. NO DEAD ENDS. Somewhere you can reach and never leave is a bug. -----
{
  const dead = all.filter(e => (outDegree.get(e.id) ?? 0) === 0);
  assert(
    dead.length === 0,
    `every node has a way out${dead.length ? ' — dead ends: ' + dead.map(e => e.id).join(', ') : ''}`
  );
}

// --- 4. THE COUNT IS NEVER SHOWN TO THE PLAYER -----------------------------
{
  // The rule is an authoring constraint. If a degree ever reached the UI as a
  // number, the gradient would become a progress bar.
  const orbitCopy = ORBITS.map(o => o.flavorText).join(' ');
  assert(
    !/\b\d+\s*(orbits?|connections?|options?|routes?)\b/i.test(orbitCopy),
    'no orbit copy quotes an edge count at the player'
  );
}

// --- 5. THE FLOOR, reported as measurement ---------------------------------
{
  const shallow: number[] = tiers.slice(0, 2);
  const shallowMean =
    shallow.reduce((s: number, t: number) => s + meanByTier.get(t)!, 0) / shallow.length;
  const deep: number[] = tiers.slice(-2);
  const deepMean =
    deep.reduce((s: number, t: number) => s + meanByTier.get(t)!, 0) / deep.length;
  console.log(
    `\n  shallow (tiers ${shallow.join(',')}) mean out = ${shallowMean.toFixed(2)} — design floor is 2–3`
  );
  console.log(
    `  deep    (tiers ${deep.join(',')}) mean out = ${deepMean.toFixed(2)} — design intent is many`
  );
  if (deepMean <= shallowMean) {
    console.log(
      '  NOTE: the graph is flat. Depth buys no additional next-states today.\n' +
        '  The cap above is satisfied trivially because nothing grows. Closing this\n' +
        '  is authored content (~100 orbits), not something this harness invents.'
    );
  }
}

console.log('');
if (failures > 0) {
  console.log(`density: ${failures} failure(s)`);
  process.exit(1);
}
console.log('Density green — cap held, no doublers, no dead ends.');
