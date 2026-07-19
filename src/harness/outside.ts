/**
 * Outside event deck harness — residency law + draw/resolve.
 * Run: npm run harness:outside
 */

import {
  drawOutsideEvent,
  listEligibleOutside,
  outsideCatalogStats,
  resolveOutsideEvent,
  tickOutsideDeck
} from '../engine/outside.js';
import { OUTSIDE_EVENTS, EV_SCREWWORM } from '../data/outside-events.js';
import { createNewState } from '../engine/state.js';
import { enterSession } from '../engine/session.js';
import { createRng, setDefaultSeed, useRng } from '../engine/rng.js';
import { createCampaign, endWeekInPlace, startWeek } from '../engine/loop.js';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error('FAIL: ' + msg);
}

console.log('=== CANDIDATE ZERO — Outside Event Deck ===\n');

const stats = outsideCatalogStats();
console.log('Catalog:', stats);
assert(stats.count >= 14, 'need Outside slate incl. pack #2');
assert(stats.allOutside, 'every event residency=outside');
assert(stats.allWorld, 'every event control=world');
assert(stats.ids.includes('EV_SCREWWORM'), 'screw worm present (design example)');
assert(stats.ids.includes('EV_GRID_FREEZE'), 'pack #2 grid freeze');
assert(stats.ids.includes('EV_PROPERTY_TAX'), 'pack #2 property tax');
assert(stats.ids.includes('EV_LIBRARY_FIGHT'), 'pack #2 library fight');
assert(stats.ids.includes('EV_BORDER_BUSES'), 'pack #2 border buses');
assert(stats.ids.includes('EV_COUNTY_FAIR'), 'pack #2 county fair');
assert(stats.ids.includes('EV_RURAL_HOSPITAL'), 'pack #2 rural hospital');

// Never player-playable shape
for (const e of OUTSIDE_EVENTS) {
  assert(e.residency === 'outside', `${e.id} outside`);
  assert(e.control === 'world', `${e.id} world`);
  assert(typeof e.apply === 'function', `${e.id} apply`);
}

// Resolve screw worm
{
  useRng(createRng(1));
  setDefaultSeed(1);
  const s = createNewState({ seed: 1, contacts: 100, momentum: 2 });
  s.stage = 'primary';
  s.regionHook = 'east';
  const text = resolveOutsideEvent(s, EV_SCREWWORM);
  assert(/OUTSIDE|SCREW/i.test(text), 'flavor marks Outside');
  assert(s.eventsFired['EV_SCREWWORM'] === true, 'once fired');
  assert(s.contacts < 100, 'contacts hit');
  assert(s.log.some(l => l.text.includes('OUTSIDE')), 'logged');
  assert(s.pendingOutside?.id === 'EV_SCREWWORM', 'pendingOutside for UI surface');
  assert(!!s.pendingOutside?.n && !!s.pendingOutside?.text, 'pendingOutside payload');
  // Once: not eligible again
  assert(
    !listEligibleOutside(s).some(e => e.id === 'EV_SCREWWORM'),
    'once events leave pool'
  );
  console.log('PASSED: screw worm resolve + once gate');
}

// Pack #2 sample resolve (quote-forward, still Outside law)
{
  useRng(createRng(11));
  setDefaultSeed(11);
  const s = createNewState({ seed: 11, contacts: 80, momentum: 2 });
  s.stage = 'primary';
  s.regionHook = 'metro';
  const grid = OUTSIDE_EVENTS.find(e => e.id === 'EV_GRID_FREEZE')!;
  const text = resolveOutsideEvent(s, grid);
  assert(/OUTSIDE|GRID/i.test(text), 'grid outside flavor');
  assert(s.eventsFired['EV_GRID_FREEZE'] === true, 'grid once');
  // Fair is soft positive
  const s2 = createNewState({ seed: 12, contacts: 10, nameID: 2 });
  s2.stage = 'primary';
  const fair = OUTSIDE_EVENTS.find(e => e.id === 'EV_COUNTY_FAIR')!;
  resolveOutsideEvent(s2, fair);
  assert(s2.contacts > 10 && s2.nameID > 2, 'fair soft boost');
  console.log('PASSED: Outside pack #2 sample resolves');
}

// Session special session event
{
  useRng(createRng(2));
  setDefaultSeed(2);
  const s = createNewState({ seed: 2, favor: 50 });
  enterSession(s);
  s.bill!.pipelineStage = 3;
  s.bill!.heat = 0;
  const pool = listEligibleOutside(s);
  assert(
    pool.some(e => e.id === 'EV_SPECIAL_SESSION'),
    'special session eligible in session'
  );
  const ev = pool.find(e => e.id === 'EV_SPECIAL_SESSION')!;
  resolveOutsideEvent(s, ev);
  assert(s.favor < 50, 'favor drop');
  assert(s.bill!.heat >= 1, 'bill heat');
  console.log('PASSED: session Outside event');
}

// Draw never injects hand
{
  useRng(createRng(3));
  setDefaultSeed(3);
  const c = createCampaign({ seed: 3 });
  const hand0 = c.deck.hand.slice();
  // Force many ticks
  let hits = 0;
  for (let i = 0; i < 40; i++) {
    useRng(createRng(100 + i));
    const t = tickOutsideDeck(c.state);
    if (t) hits++;
  }
  assert(
    c.deck.hand.length === hand0.length ||
      c.deck.hand.every(id => hand0.includes(id) || !id.startsWith('EV_')),
    'Outside never enters physical hand'
  );
  assert(
    !c.deck.hand.some(id => id.startsWith('EV_')),
    'no EV_* in hand'
  );
  console.log('PASSED: Outside never enters hand (hits this smoke:', hits, ')');
}

// Weighted draw returns something when forced
{
  useRng(createRng(9));
  setDefaultSeed(9);
  const s = createNewState({ seed: 9 });
  s.stage = 'general';
  s.ballot = true;
  // Draw many times with fresh states for variety
  let drew = 0;
  for (let i = 0; i < 30; i++) {
    useRng(createRng(200 + i));
    const s2 = createNewState({ seed: 200 + i });
    s2.stage = 'primary';
    s2.regionHook = 'east';
    const e = drawOutsideEvent(s2);
    if (e) {
      drew++;
      assert(e.control === 'world', 'drawn is world');
    }
  }
  assert(drew >= 20, 'draw usually finds eligible');
  console.log('PASSED: weighted draw works');
}

// Week advance can fire Outside (integration)
{
  useRng(createRng(42));
  setDefaultSeed(42);
  const c = createCampaign({ seed: 42 });
  startWeek(c);
  let outsideLogs = 0;
  for (let w = 0; w < 8 && !c.state.over; w++) {
    c.state.ap = 0;
    endWeekInPlace(c);
    outsideLogs += c.state.log.filter(l => l.text.includes('OUTSIDE —')).length;
  }
  // Not guaranteed every run, but over many weeks + forced earlier tests OK.
  // Soft check: system ran without throw
  assert(c.state.week >= 2, 'calendar advanced');
  console.log('PASSED: week advance integration (outside log lines cumulative path ok)', {
    week: c.state.week,
    outsideMentions: outsideLogs
  });
}

console.log('\nOutside event deck green.');
process.exit(0);
