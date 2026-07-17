/**
 * Asset shop + failure loot tangibility.
 * Run: npx tsx src/harness/shop-loot.ts
 */

import { createCampaign, runFullCampaign, startWeek } from '../engine/loop.js';
import { laborBallotStrategy, grindFirstStrategy } from '../engine/strategies.js';
import { buyAsset, listShopOffers, kitChips } from '../data/assets.js';
import { setDefaultSeed, createRng, useRng } from '../engine/rng.js';

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
    throw new Error(msg);
  }
}

console.log('=== CANDIDATE ZERO — Shop + Failure Loot ===\n');

// Buy website
{
  useRng(createRng(1));
  setDefaultSeed(1);
  const c = createCampaign({ seed: 1 });
  c.state.money = 5000;
  const offers = listShopOffers(c.state);
  assert(offers.some(o => o.id === 'A04'), 'website in shop');
  const r = buyAsset(c.state, 'A04');
  assert(r.ok, 'buy ok');
  assert(c.state.assets.includes('A04'), 'owned');
  assert(c.state.money < 5000, 'money spent');
  assert(kitChips(c.state).some(k => k.id === 'A04'), 'kit chip');
  assert((c.state.trophies ?? []).some(t => t.name.includes('Website')), 'trophy loot on buy');
  console.log('PASSED: shop purchase', { money: c.state.money, kit: kitChips(c.state).map(k => k.n) });
}

// Failure loot on miss filing
{
  useRng(createRng(7));
  setDefaultSeed(7);
  const c = createCampaign({ seed: 7 });
  runFullCampaign(c, grindFirstStrategy);
  assert(c.state.stage === 'interim', 'interim after miss');
  assert((c.state.trophies ?? []).some(t => t.kind === 'scar'), 'scar trophy');
  assert((c.state.deck ?? []).includes('PL04') || (c.state.cycleLoot ?? []).includes('PL04'), 'petition card minted');
  assert(!!c.state.lastLootJuice?.includes('LOOT'), 'loot juice line');
  startWeek(c);
  assert(
    c.deck.draw.includes('PL04') || c.deck.hand.includes('PL04') || c.deck.discard.includes('PL04'),
    'loot card in physical deck after flush'
  );
  console.log('PASSED: failure loot', {
    trophies: (c.state.trophies ?? []).map(t => t.name),
    juice: c.state.lastLootJuice
  });
}

// Labor path also leaves trophies on loss
{
  useRng(createRng(1003));
  setDefaultSeed(1003);
  const c = createCampaign({ seed: 1003 });
  runFullCampaign(c, laborBallotStrategy);
  const o = c.state.lastCycleOutcome;
  assert(!!o && o !== 'ongoing', 'cycle decided');
  assert((c.state.trophies ?? []).length > 0, 'some trophy after cycle');
  console.log('PASSED: labor cycle trophies', {
    outcome: o,
    trophies: (c.state.trophies ?? []).map(t => t.name)
  });
}

console.log('\nShop + loot harness complete.');
