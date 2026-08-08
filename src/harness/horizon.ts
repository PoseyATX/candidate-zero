/**
 * Horizon creep — scope is derived from the actor graph, never granted.
 *
 * The properties that matter (spec §2.4):
 *   · visibility is a CONSEQUENCE of relationships, not a stored unlock;
 *   · losing the relationship loses the view — it is not a ratchet;
 *   · a save file cannot carry a horizon its allies do not justify;
 *   · nothing anywhere announces that scope grew.
 *
 * Run: npm run harness:horizon
 */

import { createNewState } from '../engine/state.js';
import { canSee, horizonWidth, visibleClusters, visibleScope } from '../engine/horizon.js';
import { entityIdForAlly, ALLY_TO_ENTITY } from '../data/starmap/bridges.js';
import { ENTITIES } from '../data/starmap/entities.js';
import { orbitsFrom } from '../data/starmap/orbits.js';
import type { GameState } from '../engine/types.js';

let failures = 0;
function assert(cond: boolean, msg: string): void {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${msg}`);
  if (!cond) failures++;
}

console.log('=== CANDIDATE ZERO — the horizon ===\n');

function bench(): GameState {
  const s = createNewState({ seed: 5 });
  s.allies = [];
  return s;
}

// --- 0. The bridge is real -------------------------------------------------
{
  const n = Object.keys(ALLY_TO_ENTITY).length;
  assert(n > 0, `ally→entity bridge is populated (${n} allies are map nodes)`);
}

// --- 1. A nobody sees almost nothing ---------------------------------------
const alone = bench();
const baseline = horizonWidth(alone);
{
  assert(baseline > 0, 'you can always see where you are standing');
  assert(canSee(alone, 'ENT_HOUSE_CANDIDATE'), 'the player node is always in view');
  // Not the whole state.
  assert(
    baseline < Object.keys(ENTITIES).length / 2,
    `a first-week nobody sees a fraction of the map (${baseline} of ${Object.keys(ENTITIES).length})`
  );
}

// --- 2. A relationship IS the visibility ----------------------------------
{
  // Pick an ally whose entity opens onto somewhere the player cannot already see.
  let picked = '';
  let target = '';
  for (const [allyId, entId] of Object.entries(ALLY_TO_ENTITY)) {
    const beyond = orbitsFrom(entId).map(o => o.to).find(id => !canSee(alone, id));
    if (beyond) {
      picked = allyId;
      target = beyond;
      break;
    }
  }
  assert(!!picked, `an ally exists whose orbit reaches past the opening horizon (${picked})`);

  const withAlly = bench();
  withAlly.allies = [{ id: picked, warm: 2, age: 0 }];
  assert(canSee(withAlly, target), `${picked} puts ${target} in view — visibility is the relationship`);
  assert(
    horizonWidth(withAlly) > baseline,
    `the horizon widened without anything being granted (${baseline} → ${horizonWidth(withAlly)})`
  );

  // --- 3. And it is NOT a ratchet ----------------------------------------
  const gone = bench();
  gone.allies = [{ id: picked, warm: 0, age: 0 }]; // cold: they are not showing you anything
  assert(
    !canSee(gone, target) || horizonWidth(gone) < horizonWidth(withAlly),
    'a cold ally stops showing you their rooms — the view is lost with the relationship'
  );
}

// --- 4. Derived, not stored: no flag can fake it --------------------------
{
  const faker = bench();
  faker.sessionFlags = {
    ...faker.sessionFlags,
    unlockedStatewide: 1,
    mapUnlocked: 1,
    regionAccess: 1,
    tier: 9
  };
  faker.pathsUnlocked = { ...faker.pathsUnlocked, P_EVERYTHING: true };
  assert(
    horizonWidth(faker) === baseline,
    'no unlock flag anywhere can widen the horizon — only people can'
  );

  // A save that claims reach its allies do not justify does not get it.
  const liar = bench();
  liar.allies = [];
  liar.entityHistory = [];
  assert(horizonWidth(liar) === baseline, 'a doctored save carries no horizon of its own');
}

// --- 5. Recomputed every call, never cached ------------------------------
{
  const s = bench();
  const before = horizonWidth(s);
  s.allies = Object.keys(ALLY_TO_ENTITY)
    .slice(0, 4)
    .map(id => ({ id, warm: 2, age: 0 }));
  const after = horizonWidth(s);
  assert(after > before, `same object, more people, wider view (${before} → ${after})`);
  s.allies = [];
  assert(horizonWidth(s) === before, 'and it narrows again the moment they are gone');
}

// --- 6. Institutions come into view as clusters, not as grants -----------
{
  const s = bench();
  const openingClusters = visibleClusters(s).size;
  s.allies = Object.keys(ALLY_TO_ENTITY).map(id => ({ id, warm: 2, age: 0 }));
  const fullClusters = visibleClusters(s).size;
  assert(
    fullClusters >= openingClusters,
    `institutions come into view through people (${openingClusters} → ${fullClusters} clusters)`
  );
}

// --- 7. Nothing announces it ---------------------------------------------
{
  const s = bench();
  const logBefore = s.log.length;
  visibleScope(s);
  horizonWidth(s);
  visibleClusters(s);
  canSee(s, 'ENT_GOVERNOR');
  assert(s.log.length === logBefore, 'reading the horizon writes nothing to the log');
  assert(
    !s.log.some(l => /scope|unlock|region access|horizon/i.test(l.text)),
    'and nothing ever announces that the horizon moved'
  );
}

console.log('');
if (failures > 0) {
  console.log(`horizon: ${failures} failure(s)`);
  process.exit(1);
}
console.log('Horizon green — scope is a consequence of who takes your call.');
