/**
 * Zero kit — start at nothing.
 * Run: npx tsx src/harness/zero.ts
 */

import { createCampaign, listPlayableHand, startWeek } from '../engine/loop.js';
import { createRng, setDefaultSeed, useRng } from '../engine/rng.js';
import { emptyLegacy, recordRun } from '../engine/legacy.js';
import { careerDeckOf, isFirstRun, ZERO_BOOTS } from '../engine/zero.js';
import { createNewState } from '../engine/state.js';

let failed = 0;
function assert(cond: boolean, msg: string): void {
  if (cond) console.log(`PASS: ${msg}`);
  else {
    console.error(`FAIL: ${msg}`);
    failed++;
  }
}

console.log('=== CANDIDATE ZERO — Zero kit ===\n');

{
  useRng(createRng(1));
  setDefaultSeed(1);
  const c = createCampaign({ seed: 1, starterKit: 'zero' });
  assert(c.state.sessionFlags?.zeroMode === 1, 'zeroMode flagged');
  assert(c.state.money <= 80, `broke enough (${c.state.money})`);
  assert(c.state.nameID === 0, 'no free name');
  assert(
    (c.state.deck ?? []).length === 1 && (c.state.deck ?? [])[0] === ZERO_BOOTS,
    `owned boots only before week start (${c.state.deck?.join(',')})`
  );
  const pile0 = [...c.deck.draw, ...c.deck.hand, ...c.deck.discard];
  assert(
    pile0.length === 1 && pile0[0] === ZERO_BOOTS,
    'physical pile is only boots before growth'
  );
  startWeek(c);
  // Weekly growth may add one card — that is the builder loop, not a free kit.
  assert(
    (c.state.deck ?? []).includes(ZERO_BOOTS),
    'boots remain after week start'
  );
  assert(
    (c.state.deck?.length ?? 0) <= 3,
    `Zero growth stays thin early (${c.state.deck?.length})`
  );
  const playable = listPlayableHand(c);
  const ids = playable.map(p => p.card.id);
  assert(ids.includes('PL04') || ids.includes('PL05'), 'ballot door on camp');
  assert(!ids.some(id => id.startsWith('CH')), 'no CHOICE mall on day one');
  assert(!ids.some(id => id.startsWith('AL')), 'no alley mall on day one');
}

{
  useRng(createRng(2));
  setDefaultSeed(2);
  const legacy = emptyLegacy();
  const s = createNewState({
    seed: 2,
    persona: 'The Teacher',
    deck: ['PL01', 'PL10', 'PL06'],
    district: {
      id: 'open',
      name: 'HD-Fake',
      field: 2,
      align: 'competitive',
      trap: false,
      incumbent: false
    }
  });
  recordRun(legacy, s, 'missed_filing', 0.1);
  assert(!!legacy.runs[0]?.scar, 'loss writes a scar');
  assert(
    careerDeckOf(legacy).includes('PL10'),
    `career deck banks cards (${careerDeckOf(legacy).join(',')})`
  );
  assert(!isFirstRun(legacy), 'after a run, career is not first');

  const c2 = createCampaign({ seed: 3, starterKit: 'zero', legacy });
  assert(
    (c2.state.deck ?? []).includes('PL10'),
    `next Zero campaign opens with the career deck (${c2.state.deck?.join(',')})`
  );
}

{
  useRng(createRng(9));
  setDefaultSeed(9);
  const h = createCampaign({ seed: 9, starterKit: 'harness' });
  assert((h.state.deck?.length ?? 0) > 5, 'harness kit stays fat for instruments');
}

if (failed) {
  console.error(`\nZero harness FAILED — ${failed}`);
  process.exit(1);
}
console.log('\nZero kit green.');
