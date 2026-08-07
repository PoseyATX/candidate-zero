/**
 * Zero kit — start at nothing.
 * Run: npx tsx src/harness/zero.ts
 */

import { createCampaign, listPlayableHand, startWeek } from '../engine/loop.js';
import { createRng, setDefaultSeed, useRng } from '../engine/rng.js';
import { emptyLegacy, recordRun } from '../engine/legacy.js';
import {
  careerDeckOf,
  DAY_ONE_PERSONA_IDS,
  isDayOnePersona,
  isFirstRun,
  personaBoots,
  ZERO_BOOTS
} from '../engine/zero.js';
import { createNewState } from '../engine/state.js';
import { PERSONAS } from '../data/setup.js';
import { SIGNATURE_BY_PERSONA } from '../data/signature-plays.js';
import { enforceWeeklyDraw } from '../engine/deck.js';

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
  assert(DAY_ONE_PERSONA_IDS.length === 4, `day-one cast is 4 (${DAY_ONE_PERSONA_IDS.length})`);
  assert(DAY_ONE_PERSONA_IDS.every(isDayOnePersona), 'day-one ids recognized');
  assert(!isDayOnePersona('PA_CLO'), 'Powerhouse is not day-one');
  assert(
    PERSONAS.filter(p => isDayOnePersona(p.id)).length === 4,
    'exactly four personas are day-one'
  );
}

{
  useRng(createRng(1));
  setDefaultSeed(1);
  const c = createCampaign({
    seed: 1,
    starterKit: 'zero',
    setup: { personaId: 'teacher', issueId: 'taxes', districtId: 'open', regionId: 'east' }
  });
  assert(c.state.sessionFlags?.zeroMode === 1, 'zeroMode flagged');
  assert(c.state.money <= 80, `broke enough (${c.state.money})`);
  assert(c.state.nameID === 0, 'no free name from persona dump');
  assert(c.state.contacts === 0, 'no free contacts from Teacher');
  assert((c.state.backers?.length ?? 0) === 0, 'no free backers day one');

  const boots = personaBoots('teacher');
  assert(boots.includes(ZERO_BOOTS), 'boots include legs');
  assert(boots.includes(SIGNATURE_BY_PERSONA.teacher!), 'boots include Teacher voice');
  assert(
    (c.state.deck ?? []).length === boots.length &&
      boots.every(id => (c.state.deck ?? []).includes(id)),
    `owned legs+voice only (${c.state.deck?.join(',')})`
  );
  const pile0 = [...c.deck.draw, ...c.deck.hand, ...c.deck.discard];
  assert(
    pile0.length === boots.length && boots.every(id => pile0.includes(id)),
    'physical pile is legs+voice before week start'
  );

  startWeek(c);
  // Zero: no free weekly card drip
  const after = (c.state.deck ?? []).length;
  assert(after === boots.length, `no free weekly card drip (${after} owned)`);
  assert((c.state.deck ?? []).includes(ZERO_BOOTS), 'boots remain after week start');

  const playable = listPlayableHand(c);
  const ids = playable.map(p => p.card.id);
  assert(ids.includes('PL04') || ids.includes('PL05'), 'ballot door on camp');
  assert(!ids.some(id => id.startsWith('CH')), 'no CHOICE mall on day one');
  assert(!ids.some(id => id.startsWith('AL')), 'no alley mall on day one');
}

{
  useRng(createRng(2));
  setDefaultSeed(2);
  const z = createCampaign({
    seed: 2,
    starterKit: 'zero',
    setup: { personaId: 'teacher', issueId: 'taxes', districtId: 'open', regionId: 'east' }
  });
  const before = (z.state.deck ?? []).length;
  const dripped = enforceWeeklyDraw(z.state);
  assert(dripped.length === 0, 'enforceWeeklyDraw is a no-op in zeroMode');
  assert((z.state.deck ?? []).length === before, 'ownership unchanged by weekly pass');
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

  const c2 = createCampaign({
    seed: 3,
    starterKit: 'zero',
    legacy,
    setup: { personaId: 'teacher', issueId: 'taxes', districtId: 'open', regionId: 'east' }
  });
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
