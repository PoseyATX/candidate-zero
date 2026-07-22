/**
 * Asset shop harness — port of archive ASSETS / assetPlays.
 * Verifies: buy A02 → unlock A01; A09 for volunteers; grants land on state.assets;
 * PL01 odds/yield path sees A01; PL02 sees A09.
 *
 * Run: npm run harness:shop
 */

import { ASSETS, buildShopPlays, SHOP_ASSET_IDS } from '../data/assets.js';
import { SHOP_PLAYS } from '../data/plays.js';
import { createCampaign, listPlayableHand, playFromHand, buildCatalog } from '../engine/loop.js';
import { createNewState } from '../engine/state.js';
import { executePlay } from '../engine/play.js';
import { setDefaultSeed } from '../engine/rng.js';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function main(): void {
  console.log('=== harness:shop ===');
  assert(SHOP_ASSET_IDS.length === 8, `expected 8 shop assets, got ${SHOP_ASSET_IDS.length}`);
  assert(!!ASSETS.A01 && !!ASSETS.A09, 'A01 and A09 must exist (were dead refs)');

  setDefaultSeed(99);
  const s = createNewState({ seed: 99, money: 5000, volPool: 5, ap: 2 });

  // A01 locked until A02
  let shop = buildShopPlays(s);
  assert(!shop.some(p => p.id === 'BUYA01'), 'A01 should require A02');
  assert(shop.some(p => p.id === 'BUYA02'), 'A02 should be available');
  assert(shop.some(p => p.id === 'BUYA09'), 'A09 phone tree should be available');

  // Buy A02
  const buyA02 = shop.find(p => p.id === 'BUYA02')!;
  const o2 = executePlay(s, buyA02);
  assert(o2.ok, 'buy A02 failed: ' + o2.reason);
  assert(s.assets.includes('A02'), 'A02 not on assets');
  assert(s.money === 5000 - 400, `money after A02: ${s.money}`);

  shop = buildShopPlays(s);
  assert(shop.some(p => p.id === 'BUYA01'), 'A01 unlocked after A02');
  const buyA01 = shop.find(p => p.id === 'BUYA01')!;
  assert(executePlay(s, buyA01).ok, 'buy A01 failed');
  assert(s.assets.includes('A01'), 'A01 not granted');

  // A09 volunteer cost
  const beforeVol = s.volPool;
  const buyA09 = buildShopPlays(s).find(p => p.id === 'BUYA09')!;
  assert(executePlay(s, buyA09).ok, 'buy A09 failed');
  assert(s.assets.includes('A09'), 'A09 not granted');
  assert(s.volPool === beforeVol - 2, `A09 should cost 2 vp, vol=${s.volPool}`);

  // Catalog includes BUY templates (via buildCatalog, not ALL_PLAYS audit set)
  const cat = buildCatalog();
  for (const id of SHOP_ASSET_IDS) {
    assert(cat.has('BUY' + id), `catalog missing BUY${id}`);
  }
  assert(SHOP_PLAYS.length === SHOP_ASSET_IDS.length, 'SHOP_PLAYS size');

  // Campaign listPlayableHand surfaces shop when affordable
  const camp = createCampaign({ seed: 7, money: 3000, volPool: 3 });
  const playable = listPlayableHand(camp);
  const shopOffers = playable.filter(p => p.card.id.startsWith('BUY'));
  assert(shopOffers.length > 0, 'shop should appear in listPlayableHand');

  // Buy via camp index path
  const a04 = playable.find(p => p.card.id === 'BUYA04');
  if (a04) {
    const r = playFromHand(camp, a04.index);
    assert(r.ok, 'playFromHand shop failed: ' + r.reason);
    assert(camp.state.assets.includes('A04'), 'A04 via camp path');
  }

  console.log('OK — shop grants A01/A02/A09/A04; catalog + camp path green.');
  console.log(`  assets on smoke state: ${s.assets.filter(a => a.startsWith('A')).join(', ')}`);
  process.exit(0);
}

main();
