/**
 * Primary (8) + General (6) structure harness
 * Run: npm run harness:calendar
 */

import {
  createCampaign,
  endWeekInPlace,
  ensureGeneralTools,
  listPlayableHand,
  runFullCampaign,
  runWeeks
} from '../engine/loop.js';
import {
  PRIMARY_WEEKS,
  GENERAL_WEEKS,
  CAMPAIGN_WEEKS_TOTAL,
  getPhase,
  primaryWinProbability,
  seedGeneralGotvFromRapport,
  generalWinProbability
} from '../engine/calendar.js';
import { laborBallotStrategy, grindFirstStrategy } from '../engine/strategies.js';
import { setDefaultSeed, createRng, useRng } from '../engine/rng.js';
import { isPhaseLegal } from '../engine/play.js';
import { PL08_KitchenTable, PL19_GOTVWeekend, PL01_BlockWalk } from '../data/plays.js';

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
    throw new Error(msg);
  }
}

console.log('=== CANDIDATE ZERO — Primary / General Calendar ===\n');
console.log(`Primary ${PRIMARY_WEEKS}w · General ${GENERAL_WEEKS}w · Total ${CAMPAIGN_WEEKS_TOTAL}w\n`);

// Phase rules
{
  useRng(createRng(1));
  setDefaultSeed(1);
  const c = createCampaign({ seed: 1 });
  assert(getPhase(c.state) === 1, 'pre-ballot primary should be phase 1');
  c.state.ballot = true;
  assert(getPhase(c.state) === 2, 'on-ballot primary should be phase 2');
  c.state.stage = 'general';
  c.state.week = 9;
  assert(getPhase(c.state) === 3, 'general should be phase 3');
  console.log('PASSED: phase map (pre-ballot=1, ballot primary=2, general=3)');
}

// Filing miss under grind
{
  useRng(createRng(7));
  setDefaultSeed(7);
  const c = createCampaign({ seed: 7 });
  runWeeks(c, PRIMARY_WEEKS, grindFirstStrategy);
  assert(c.state.over === true, 'grind should end at filing');
  assert(c.state.outcome === 'missed_filing', `expected missed_filing, got ${c.state.outcome}`);
  assert(c.state.stage === 'primary', 'should still be primary stage on miss');
  console.log('PASSED: grind misses filing → missed_filing');
}

// Labor path full campaigns terminate coherently
{
  const N = 80;
  let missed = 0;
  let lostPrimary = 0;
  let reachedGeneral = 0;
  let generalDecided = 0;
  for (let i = 0; i < N; i++) {
    useRng(createRng(1000 + i));
    setDefaultSeed(1000 + i);
    const c = createCampaign({ seed: 1000 + i });
    runFullCampaign(c, laborBallotStrategy);
    assert(c.state.over, `seed ${1000 + i} should end`);
    assert(
      c.state.outcome === 'missed_filing' ||
        c.state.outcome === 'lost_primary' ||
        c.state.outcome === 'won_general' ||
        c.state.outcome === 'lost_general' ||
        c.state.outcome === 'session_law' ||
        c.state.outcome === 'session_survived' ||
        c.state.outcome === 'session_primaried',
      `seed ${1000 + i} bad outcome ${c.state.outcome}`
    );
    if (c.state.outcome === 'missed_filing') missed++;
    if (c.state.outcome === 'lost_primary') lostPrimary++;
    if (c.state.primaryWon) reachedGeneral++;
    const genDecided =
      c.state.outcome === 'won_general' ||
      c.state.outcome === 'lost_general' ||
      c.state.outcome === 'session_law' ||
      c.state.outcome === 'session_survived' ||
      c.state.outcome === 'session_primaried';
    if (genDecided) generalDecided++;
  }
  console.log('Labor full-campaign sample (n=%d):', N, {
    missedFilingRate: +((missed / N) * 100).toFixed(1),
    lostPrimaryRate: +((lostPrimary / N) * 100).toFixed(1),
    reachedGeneralRate: +((reachedGeneral / N) * 100).toFixed(1),
    generalDecidedRate: +((generalDecided / N) * 100).toFixed(1)
  });
  assert(missed < N * 0.35, 'labor should usually clear filing');
  assert(missed + lostPrimary + generalDecided === N, 'outcomes should partition');
  console.log('PASSED: labor full campaigns terminate with coherent outcomes');
}

// Seeded primary transition replay
{
  function transitionOnce(seed: number) {
    useRng(createRng(seed));
    setDefaultSeed(seed);
    const c = createCampaign({ seed });
    c.state.ballot = true;
    c.state.nameID = 20;
    c.state.contacts = 200;
    c.state.endorsePts = 2;
    c.state.volPool = 3;
    c.state.week = PRIMARY_WEEKS;
    c.state.ap = 0;
    const t = endWeekInPlace(c);
    return {
      kind: t.kind,
      outcome: c.state.outcome,
      stage: c.state.stage,
      week: c.state.week,
      over: c.state.over,
      primaryWon: c.state.primaryWon
    };
  }
  useRng(createRng(0));
  setDefaultSeed(0);
  const stackedCamp = createCampaign({ seed: 0 });
  stackedCamp.state.nameID = 20;
  stackedCamp.state.contacts = 200;
  stackedCamp.state.endorsePts = 2;
  stackedCamp.state.volPool = 3;
  stackedCamp.state.momentum = 0;
  stackedCamp.state.hitPieces = 0;
  stackedCamp.state.exposure = 0;
  stackedCamp.state.district = { id: 'open', name: 'Open', align: 'safe', incumbent: false, field: 2 };
  const stacked = primaryWinProbability(stackedCamp.state);
  assert(stacked > 0.4, 'stacked primary should be favored');
  const r1 = transitionOnce(42);
  const r2 = transitionOnce(42);
  assert(JSON.stringify(r1) === JSON.stringify(r2), 'primary transition must replay under seed');
  console.log('PASSED: primary transition seed replay', r1.kind, r1.stage, `W${r1.week}`);
}

// Kit gravity (2026-07-19): general is not primary-with-blue-chrome
{
  useRng(createRng(9));
  setDefaultSeed(9);
  const c = createCampaign({ seed: 9 });
  // Phase legality: kitchen table primary-only; GOTV general-only
  c.state.stage = 'primary';
  c.state.ballot = true;
  assert(isPhaseLegal(c.state, PL08_KitchenTable), 'PL08 legal in primary phase 2');
  assert(!isPhaseLegal(c.state, PL19_GOTVWeekend), 'PL19 not legal in primary');
  c.state.stage = 'general';
  c.state.week = 9;
  assert(!isPhaseLegal(c.state, PL08_KitchenTable), 'PL08 illegal in general (kit gravity)');
  assert(isPhaseLegal(c.state, PL19_GOTVWeekend), 'PL19 legal in general');
  assert(isPhaseLegal(c.state, PL01_BlockWalk), 'PL01 still legal (converts to GOTV)');

  // Rapport seed
  c.state.groundsArr[0]!.rapport = 55;
  c.state.groundsArr[1]!.rapport = 20;
  c.state.groundsArr[0]!.gotv = 0;
  c.state.groundsArr[1]!.gotv = 0;
  const seed = seedGeneralGotvFromRapport(c.state);
  assert(seed.grounds === 2, 'two grounds should seed');
  assert(c.state.groundsArr[0]!.gotv >= 0.12, 'high rapport seeds ≥0.12 GOTV');
  assert(c.state.groundsArr[1]!.gotv >= 0.03, 'mid rapport seeds ≥0.03 GOTV');

  // GOTV weight: more GOTV raises win p more than raw contacts
  c.state.genBase = 0.45;
  c.state.nameID = 20;
  c.state.contacts = 100;
  c.state.volPool = 2;
  c.state.momentum = 0;
  c.state.hitPieces = 0;
  for (const g of c.state.groundsArr) g.gotv = 0;
  const p0 = generalWinProbability(c.state);
  c.state.contacts = 400;
  const pContacts = generalWinProbability(c.state);
  c.state.contacts = 100;
  for (const g of c.state.groundsArr) g.gotv = 0.2;
  const pGotv = generalWinProbability(c.state);
  assert(pGotv > pContacts, 'GOTV should outpace contact padding for November win p');
  assert(pGotv > p0, 'GOTV raises general win p');

  // ensureGeneralTools puts PL19 in hand
  c.state.stage = 'general';
  c.state.volPool = 1;
  ensureGeneralTools(c);
  assert(
    c.deck.hand.includes('PL19') || c.deck.draw.includes('PL19'),
    'PL19 must be in physical deck after ensureGeneralTools'
  );
  assert(c.deck.hand.includes('PL19'), 'PL19 preferred into hand for kit gravity');
  const playable = listPlayableHand(c);
  assert(
    playable.some(p => p.card.id === 'PL19'),
    'PL19 should be listPlayable when vol allows'
  );
  console.log('PASSED: general kit gravity (phase gates, seed, GOTV weight, PL19 hand)');
}

console.log('\nHarness complete.');
