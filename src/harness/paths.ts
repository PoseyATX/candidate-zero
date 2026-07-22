/**
 * CANDIDATE ZERO — unlock-paths harness
 * Proves: paths advance on the first play of each required card, fire lore
 * toasts, and on combo completion unlock + grant the reward card (owned +
 * in the draw pile), which is then visible/playable — and NOT before.
 */

import { createNewState } from '../engine/state.js';
import { createDeckState } from '../engine/deck.js';
import { buildCatalog } from '../engine/loop.js';
import { advancePaths } from '../engine/paths.js';
import { isVisible } from '../engine/play.js';
import { PATHS } from '../data/paths.js';

let failures = 0;
function assert(cond: boolean, msg: string): void {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${msg}`);
  if (!cond) failures++;
}

console.log('=== CANDIDATE ZERO — unlock paths ===\n');

const catalog = buildCatalog();
const campus = PATHS.find(p => p.id === 'P_CAMPUS')!;
const [a, b, c] = campus.requires;

// Reward hidden before unlock.
const fresh = createNewState({});
const rewardCard = catalog.get(campus.reward)!;
assert(!!rewardCard, `reward card ${campus.reward} exists in catalog`);
assert(!isVisible(fresh, rewardCard), 'reward is hidden before its path is unlocked');

// Drive the combo.
const state = createNewState({});
const deck = createDeckState();
const logBefore = state.log.length;

advancePaths(state, a, deck);
assert(state.pathProgress['P_CAMPUS'] === 1, `first step advances progress to 1 (${state.pathProgress['P_CAMPUS']})`);
assert(!state.pathsUnlocked['P_CAMPUS'], 'not unlocked after one step');

advancePaths(state, b, deck);
advancePaths(state, a, deck); // replay a — must NOT double-count
assert(state.pathProgress['P_CAMPUS'] === 2, `replaying a step does not advance (still 2: ${state.pathProgress['P_CAMPUS']})`);

advancePaths(state, c, deck);
assert(state.pathsUnlocked['P_CAMPUS'] === true, 'combo complete → path unlocked');
assert((state.deck ?? []).includes(campus.reward), 'reward card is now owned (state.deck)');
assert(deck.draw.includes(campus.reward), 'reward card injected into the draw pile');
assert(isVisible(state, rewardCard), 'reward is visible/playable once unlocked');

// Lore toasts fired (>= 3 steps + 1 unlock line).
// A 3-card combo fires 2 step toasts + 1 unlock toast (the final card unlocks).
const toasts = state.log.slice(logBefore).filter(e => e.kind === 'note');
assert(toasts.length === 3, `lore toasts fired for steps + unlock (${toasts.length})`);
assert(toasts.some(t => /interns/i.test(t.text)), 'unlock toast names the reward');

// Determinism: identical sequence on a fresh state → identical unlock outcome.
const s2 = createNewState({});
const d2 = createDeckState();
[a, b, c].forEach(id => advancePaths(s2, id, d2));
assert(
  s2.pathsUnlocked['P_CAMPUS'] === true && (s2.deck ?? []).includes(campus.reward),
  'same sequence → same unlock (deterministic)'
);

// Every path's reward resolves to a real catalog card.
for (const p of PATHS) {
  assert(!!catalog.get(p.reward), `path ${p.id} reward ${p.reward} is a real card`);
}

console.log('');
if (failures) {
  console.error(`unlock paths FAILED — ${failures} assertion(s).`);
  process.exit(1);
}
console.log(`Unlock paths green — ${PATHS.length} pathways, ${PATHS.length} reward cards.`);
