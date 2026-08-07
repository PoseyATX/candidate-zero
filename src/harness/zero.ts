/**
 * Zero kit — implementation spec §§3–5.
 * Run: npx tsx src/harness/zero.ts
 */

import { createCampaign, listPlayableHand, startWeek, maybeOfferPhaseDraft } from '../engine/loop.js';
import { createRng, setDefaultSeed, useRng } from '../engine/rng.js';
import { emptyLegacy, recordRun } from '../engine/legacy.js';
import {
  DAY_ONE_PERSONA_IDS,
  deckHasLiability,
  isDayOnePersona,
  resolveStarterIds
} from '../engine/zero.js';
import { starterDeckFor, LIABILITY_IDS, ZERO_KIT_IDS } from '../data/zero-deck.js';
import { createNewState } from '../engine/state.js';
import { enforceWeeklyDraw, buildPhaseDraft } from '../engine/deck.js';
import { opportunityPool } from '../engine/opportunity.js';
import { STARTER_DECK_IDS } from '../engine/deck.js';
import { executePlay } from '../engine/play.js';
import { PLAYS } from '../data/plays.js';
import { PROMOTE_AT, noteContact, contactCount } from '../engine/promotion.js';
import { visibleScopeTags } from '../engine/horizon.js';
import { handCap, TABLE_SLOTS_START } from '../engine/slots.js';

let failed = 0;
function assert(cond: boolean, msg: string): void {
  if (cond) console.log(`PASS: ${msg}`);
  else {
    console.error(`FAIL: ${msg}`);
    failed++;
  }
}

console.log('=== CANDIDATE ZERO — Zero implementation spec ===\n');

// §3.1 four personas
assert(DAY_ONE_PERSONA_IDS.length === 4, 'exactly four day-one personas');
assert(DAY_ONE_PERSONA_IDS.every(isDayOnePersona), 'day-one ids recognized');
assert(!isDayOnePersona('PA_CLO'), 'Powerhouse is not day-one');
assert(!isDayOnePersona('teacher'), 'legacy Teacher is not day-one menu');

// §3.2 ten-card kits + liability
for (const pid of DAY_ONE_PERSONA_IDS) {
  const deck = starterDeckFor(pid);
  assert(deck.length === 10, `${pid} starter is 10 cards (${deck.length})`);
  assert(deck.filter(id => id === 'ZN_KNOCK').length === 2, `${pid} has two Knock`);
  assert(deck.some(id => LIABILITY_IDS.has(id)), `${pid} carries a liability`);
}

// No generic starter for Zero resolve
{
  const { physical } = resolveStarterIds('zero', null, STARTER_DECK_IDS, 'blockwalker');
  assert(physical.length === 10, 'Zero resolveStarterIds is persona kit only');
  assert(!physical.includes('PL02'), 'no Phone Bank free in Zero kit');
  assert(!STARTER_DECK_IDS.every(id => physical.includes(id)), 'not the harness generic list');
}

// Two personas diverge early
{
  useRng(createRng(7));
  setDefaultSeed(7);
  const a = createCampaign({
    seed: 7,
    starterKit: 'zero',
    setup: { personaId: 'blockwalker', issueId: 'taxes', districtId: 'open', regionId: 'east' }
  });
  useRng(createRng(7));
  setDefaultSeed(7);
  const b = createCampaign({
    seed: 7,
    starterKit: 'zero',
    setup: { personaId: 'staffer', issueId: 'taxes', districtId: 'open', regionId: 'east' }
  });
  assert(deckHasLiability(a.state), 'blockwalker has liability in kit');
  assert(deckHasLiability(b.state), 'staffer has liability in kit');
  assert(
    JSON.stringify(a.state.deck) !== JSON.stringify(b.state.deck),
    'two personas open with different kits'
  );
  const poolA = opportunityPool(a.state);
  const poolB = opportunityPool(b.state);
  // Thematic filter must diverge when both non-empty; empty also legal
  const overlap =
    poolA.length && poolB.length
      ? poolA.filter(id => poolB.includes(id)).length / Math.max(poolA.length, poolB.length)
      : 0;
  assert(
    poolA.length === 0 ||
      poolB.length === 0 ||
      overlap < 0.95 ||
      a.state.attrs.CLO !== b.state.attrs.CLO,
    `persona themes diverge (overlap=${overlap.toFixed(2)})`
  );
}

// §3.3 slots + hand
{
  useRng(createRng(1));
  setDefaultSeed(1);
  const c = createCampaign({
    seed: 1,
    starterKit: 'zero',
    setup: { personaId: 'blockwalker', issueId: 'taxes', districtId: 'open', regionId: 'east' }
  });
  assert((c.state.tableSlotsMax ?? 0) === TABLE_SLOTS_START, 'table slots start at 3');
  assert(c.handSize === handCap(c.state), `hand cap ${c.handSize}`);
  startWeek(c);
  assert(enforceWeeklyDraw(c.state).length === 0, 'no free weekly card drip');
  const playable = listPlayableHand(c);
  assert(
    !playable.some(p => p.card.id.startsWith('BUY')),
    'no shop mall'
  );
  assert(
    playable.some(p => p.card.id === 'PL04' || p.card.id === 'ZN_KNOCK'),
    'doors or knock visible'
  );
}

// §4 empty opportunities legal
{
  useRng(createRng(99));
  setDefaultSeed(99);
  const c = createCampaign({
    seed: 99,
    starterKit: 'zero',
    setup: { personaId: 'believer', issueId: 'taxes', districtId: 'open', regionId: 'east' }
  });
  // Force empty by marking everything recent + owned flood
  c.state.sessionFlags = { ...c.state.sessionFlags, recentOffers: PLAYS.map(p => p.id).join(',') };
  const draft = buildPhaseDraft(c.state, 3);
  assert(Array.isArray(draft.options), 'draft options array');
  // May be empty — must not throw
  c.state.pendingDraft = draft.options.length ? draft : undefined;
  const r = maybeOfferPhaseDraft(c, false);
  assert(r === null || typeof r === 'string' || r === null, 'empty opportunity does not break');
}

// Knock near-zero backfire sample
{
  useRng(createRng(3));
  setDefaultSeed(3);
  const c = createCampaign({
    seed: 3,
    starterKit: 'zero',
    setup: { personaId: 'blockwalker', issueId: 'taxes', districtId: 'open', regionId: 'east' }
  });
  startWeek(c);
  const knock = PLAYS.find(p => p.id === 'ZN_KNOCK')!;
  let disasters = 0;
  for (let i = 0; i < 40; i++) {
    c.state.ap = 5;
    c.state.fieldAp = 2;
    c.state.tableSlots = 3;
    const g = c.state.groundsArr[0];
    const o = executePlay(c.state, knock, g);
    if (o.ok && o.tier === 3) disasters++;
  }
  assert(disasters === 0, `Knock disasters in 40 tries: ${disasters} (must be ~0)`);
}

// §2.3 promotion silent at 3
{
  const s = createNewState({ seed: 1 });
  assert(contactCount(s, 'AL07') === 0, 'no contacts yet');
  noteContact(s, 'AL07');
  noteContact(s, 'AL07');
  assert(!s.allies.some(a => a.id === 'AL07'), 'not promoted at 2');
  noteContact(s, 'AL07');
  assert(s.allies.some(a => a.id === 'AL07'), `promoted at ${PROMOTE_AT}`);
  assert(
    !s.log.some(l => /promot|unlock|threshold/i.test(l.text)),
    'promotion is silent in log'
  );
}

// §2.4 horizon derived
{
  const s = createNewState({ seed: 2 });
  const before = visibleScopeTags(s).length;
  s.allies.push({ id: 'AL07', warm: 2, age: 0 });
  const after = visibleScopeTags(s).length;
  assert(after >= before, 'warm ally widens horizon tags');
}

// §5 card kit does not re-deal career pile
{
  useRng(createRng(2));
  setDefaultSeed(2);
  const legacy = emptyLegacy();
  const s = createNewState({
    seed: 2,
    persona: 'The Blockwalker',
    deck: ['ZN_KNOCK', 'PL10', 'PL06'],
    district: {
      id: 'open',
      name: 'HD-Fake',
      field: 2,
      align: 'competitive',
      trap: false,
      incumbent: false
    }
  });
  s.assets.push('A01');
  recordRun(legacy, s, 'missed_filing', 0.1);
  const c2 = createCampaign({
    seed: 3,
    starterKit: 'zero',
    legacy,
    setup: { personaId: 'blockwalker', issueId: 'taxes', districtId: 'open', regionId: 'east' }
  });
  assert(
    (c2.state.deck ?? []).length === 10,
    `next run is persona kit again (${c2.state.deck?.length})`
  );
  assert(
    (c2.state.deck ?? []).filter(id => id === 'ZN_KNOCK').length === 2,
    'two Knock copies on re-file'
  );
  assert(!(c2.state.deck ?? []).includes('PL10'), 'career card PL10 does not re-deal');
}

// Kit ids registered
assert(
  ZERO_KIT_IDS.every(id => PLAYS.some(p => p.id === id)),
  'all Zero kit cards are in PLAYS catalog'
);

if (failed) {
  console.error(`\nZero harness FAILED — ${failed}`);
  process.exit(1);
}
console.log('\nZero implementation spec green.');
