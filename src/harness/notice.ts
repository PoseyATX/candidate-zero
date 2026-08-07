/**
 * Notice phase + CHOICE class harness.
 * Run: npx tsx src/harness/notice.ts
 */

import { createCampaign, startWeek, playFromHand, listPlayableHand, CAMP_BLOCK_WALK, CAMP_PHONE_BANK } from '../engine/loop.js';
import { createRng, setDefaultSeed, useRng } from '../engine/rng.js';
import { maybeTriggerNotice, hasBeenNoticed, NOTICE_EVENT } from '../engine/notice.js';
import { resolve } from '../engine/resolve.js';
import { createNewState } from '../engine/state.js';
import { CHOICE_PLAYS } from '../data/choice-plays.js';

let failed = 0;
function assert(cond: boolean, msg: string): void {
  if (cond) console.log(`PASS: ${msg}`);
  else {
    console.error(`FAIL: ${msg}`);
    failed++;
  }
}

console.log('=== CANDIDATE ZERO — Notice + CHOICE ===\n');

{
  useRng(createRng(11));
  setDefaultSeed(11);
  const s = createNewState({ seed: 11 });
  assert(!hasBeenNoticed(s), 'fresh run is unnoticed');
  s.nameID = 12;
  const line = maybeTriggerNotice(s);
  assert(!!line && /NOTICED/i.test(line), 'nameID 12 fires notice');
  assert(hasBeenNoticed(s), 'flag sticks');
  assert(s.eventsFired[NOTICE_EVENT], 'event id recorded');
  assert(s.hitPieces >= 1, 'hit piece seed');
  assert(s.tier >= 1, 'tier floor lifts');
  const again = maybeTriggerNotice(s);
  assert(again === null, 'notice is once');
}

{
  useRng(createRng(12));
  setDefaultSeed(12);
  const s = createNewState({ seed: 12, money: 2000 });
  s.ballot = true;
  maybeTriggerNotice(s);
  assert(hasBeenNoticed(s), 'ballot alone is enough to get noticed');
}

{
  const s = createNewState({ seed: 3 });
  const r = resolve(0.5, 'CHOICE', s);
  assert(r.tier === 1 && r.band === 0 && r.p === 1, 'CHOICE does not roll the dice');
  const r2 = resolve(0.5, 'CHOICE', s);
  assert(r.roll === r2.roll && r.tier === r2.tier, 'CHOICE is deterministic (no RNG)');
}

{
  assert(CHOICE_PLAYS.length >= 5, `at least 5 CHOICE cards (${CHOICE_PLAYS.length})`);
  assert(
    CHOICE_PLAYS.every(c => c.risk === 'CHOICE'),
    'every CHOICE_PLAY is risk CHOICE'
  );
}

{
  useRng(createRng(21));
  setDefaultSeed(21);
  const camp = createCampaign({ seed: 21 });
  startWeek(camp);
  const playable = listPlayableHand(camp);
  assert(
    playable.some(p => p.index === CAMP_BLOCK_WALK && p.card.id === 'PL01'),
    'standing Block Walk offered'
  );
  assert(
    playable.some(p => p.index === CAMP_PHONE_BANK && p.card.id === 'PL02'),
    'standing Phone Bank offered'
  );
  assert(
    playable.some(p => p.card.risk === 'CHOICE'),
    'at least one CHOICE fork offered when gated'
  );
  // Claim Your Door should be available pre-ballot week 1.
  const door = playable.find(p => p.card.id === 'CH01');
  assert(!!door, 'CH01 Claim Your Door on camp pre-ballot');
  if (door) {
    const beforeSig = camp.state.signatures;
    const r = playFromHand(camp, door.index);
    assert(r.ok, 'CH01 plays without a roll path failure');
    assert(
      camp.state.signatures > beforeSig || camp.state.money > 200,
      'CH01 claims labor or money path'
    );
    assert(!!camp.state.sessionFlags?.claimedDoor, 'door claim flags once');
  }
}

if (failed) {
  console.error(`\nNotice/CHOICE harness FAILED — ${failed}`);
  process.exit(1);
}
console.log('\nNotice + CHOICE green.');
