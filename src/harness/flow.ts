/**
 * Deck flow harness — agency over the shuffle.
 * Run: npm run harness:flow
 *
 * Two assertions carry real weight here:
 *
 *   1. The ballot-access guard. `ensureBallotAccessInHand` runs only at week
 *      start, so a mid-week pitch of your last PL04/PL05 is the one way to slip
 *      past the net that exists to stop the shuffle locking you out of the
 *      ballot. Three times this session a contract change quietly broke an
 *      unaudited consumer; this one gets an assertion, not a comment.
 *
 *   2. Cycling never touches heat. This rerolls a *draw*, not a *roll* — it
 *      must not look like a covenant-4 problem, and the only way to know that
 *      is to check rather than assert it in prose.
 */

import { createNewState } from '../engine/state.js';
import { createDeckState, drawCards, DEFAULT_HAND_SIZE } from '../engine/deck.js';
import {
  cycleCard,
  cycleBlockReason,
  cycleCaution,
  canCycle,
  discardsLeft,
  resetDiscards,
  MAX_DISCARDS
} from '../engine/flow.js';
import { applyUpgrade } from '../engine/upgrades.js';
import { heatOf } from '../engine/heat.js';
import { createRng, setDefaultSeed, useRng } from '../engine/rng.js';
import {
  createCampaign,
  listPlayableHand,
  CAMP_BLOCK_WALK,
  CAMP_PHONE_BANK,
  startWeek
} from '../engine/loop.js';
import type { DeckState, GameState } from '../engine/types.js';

let failed = 0;
function assert(cond: boolean, msg: string): void {
  if (cond) console.log(`PASS: ${msg}`);
  else {
    console.error(`FAIL: ${msg}`);
    failed++;
  }
}

console.log('=== CANDIDATE ZERO — Deck flow (hand cuts) ===\n');

/** A state + deck with a known hand, so assertions are about flow not shuffle. */
function fixture(hand: string[], draw: string[], seed = 1): { s: GameState; d: DeckState } {
  useRng(createRng(seed));
  setDefaultSeed(seed);
  const s = createNewState({ seed });
  s.ballot = true; // ballot guard tested separately; keep it out of the way here
  const d: DeckState = { draw: [...draw], hand: [...hand], discard: [] };
  return { s, d };
}

// --- The budget ---
{
  const { s, d } = fixture(['PL01', 'PL10', 'PL13'], ['PL02', 'PL03', 'PL06']);
  assert(discardsLeft(s) === MAX_DISCARDS, `a fresh week starts with ${MAX_DISCARDS} cuts`);

  for (let i = 0; i < MAX_DISCARDS; i++) {
    assert(cycleCard(s, d, 0).ok, `cut ${i + 1} of ${MAX_DISCARDS} is allowed`);
  }
  assert(discardsLeft(s) === 0, 'the budget is spent');
  const over = cycleCard(s, d, 0);
  assert(!over.ok, 'a cut past the limit is refused');
  assert(/no cuts left/i.test(over.reason ?? ''), `and says why (${JSON.stringify(over.reason)})`);

  resetDiscards(s);
  assert(discardsLeft(s) === MAX_DISCARDS, 'the week reset restores the budget');
}

// --- A cut swaps exactly one card ---
{
  const { s, d } = fixture(['PL01', 'PL10', 'PL13'], ['PL02', 'PL03']);
  const before = d.hand.length;
  const res = cycleCard(s, d, 0);
  assert(res.ok, 'the cut resolves');
  assert(res.pitched === 'PL01', 'the pitched card is the one named');
  assert(d.hand.length === before, `hand size is invariant (${before})`);
  assert(d.discard.includes('PL01'), 'the pitched card lands in the discard pile');
  assert(!!res.drew && d.hand.includes(res.drew), 'the replacement is in hand');
}

// --- An empty draw pile reshuffles rather than silently drawing nothing ---
{
  const { s, d } = fixture(['PL01', 'PL10'], []);
  d.discard = ['PL02', 'PL03', 'PL06'];
  const res = cycleCard(s, d, 0);
  assert(res.ok && !!res.drew, `a dry draw pile reshuffles the discard (drew ${res.drew})`);
  assert(d.hand.length === 2, 'and the hand still refills to size');
}

// --- Degenerate cases refuse instead of corrupting the hand ---
{
  const { s, d } = fixture(['PL01'], ['PL02']);
  const res = cycleCard(s, d, 0);
  assert(!res.ok && /last card/i.test(res.reason ?? ''), 'you cannot pitch your last card');
  assert(d.hand.length === 1 && d.hand[0] === 'PL01', 'the refused cut left the hand untouched');
  assert(discardsLeft(s) === MAX_DISCARDS, 'a refused cut costs nothing');

  assert(!canCycle(s, d, -1), 'camp/shop pseudo-cards are not pitchable');
  assert(!canCycle(s, d, 99), 'an out-of-range index is not pitchable');
}

// --- THE BALLOT GUARD ---
// ensureBallotAccessInHand only runs at week start. A mid-week pitch is the one
// path around it, so the refusal has to live in flow.ts and be proven here.
{
  for (const id of ['PL04', 'PL05']) {
    const { s, d } = fixture([id, 'PL01', 'PL10'], ['PL02', 'PL03']);
    s.ballot = false;
    const res = cycleCard(s, d, 0);
    assert(!res.ok, `pre-ballot, your last ${id} cannot be pitched`);
    assert(
      /ballot/i.test(res.reason ?? ''),
      `and the reason says why (${JSON.stringify(res.reason)})`
    );
    assert(d.hand.includes(id), `${id} is still in hand after the refusal`);
  }

  // With a spare, the pitch is fine — the rule protects access, not the card.
  const { s, d } = fixture(['PL04', 'PL04', 'PL01'], ['PL02', 'PL03']);
  s.ballot = false;
  assert(cycleCard(s, d, 0).ok, 'with a spare ballot card in hand, the pitch is allowed');

  // Once on the ballot, the card is just a card.
  const on = fixture(['PL04', 'PL01', 'PL10'], ['PL02', 'PL03']);
  on.s.ballot = true;
  assert(cycleCard(on.s, on.d, 0).ok, 'once on the ballot, PL04 is pitchable like anything else');
}

// --- Cycling is a draw reroll, not a roll reroll: heat is untouched ---
{
  const { s, d } = fixture(['PL01', 'PL10', 'PL13'], ['PL02', 'PL03', 'PL06']);
  s.heat = 3;
  cycleCard(s, d, 0);
  cycleCard(s, d, 0);
  assert(heatOf(s) === 3, 'cutting cards neither banks nor spends heat');
  assert(s.discardsUsed === 2, 'and the cut counter moved instead');
}

// --- Save/replay safety ---
{
  const { s, d } = fixture(['PL01', 'PL10', 'PL13'], ['PL02', 'PL03']);
  cycleCard(s, d, 0);
  const round = JSON.parse(JSON.stringify(s)) as GameState;
  assert(discardsLeft(round) === MAX_DISCARDS - 1, 'the cut counter survives a JSON round trip');
}

// --- Determinism: same seed + same cuts = same hand ---
{
  function run(seed: number): string[] {
    useRng(createRng(seed));
    setDefaultSeed(seed);
    const s = createNewState({ seed });
    s.ballot = true;
    const d = createDeckState();
    drawCards(d, DEFAULT_HAND_SIZE);
    cycleCard(s, d, 0);
    cycleCard(s, d, 1);
    return [...d.hand];
  }
  assert(
    run(1234).join() === run(1234).join(),
    'the same seed and the same cuts produce the same hand'
  );
  assert(run(1234).join() !== run(9999).join(), 'and different seeds do not');
}

// --- The reason string is always player-facing, never a bare code ---
{
  const { s, d } = fixture(['PL04', 'PL01'], ['PL02']);
  s.ballot = false;
  const reasons = [
    cycleBlockReason(s, d, -1),
    cycleBlockReason(s, d, 99),
    cycleBlockReason(s, d, 0)
  ];
  assert(
    reasons.every(r => r.length > 0 && /^[A-Z]/.test(r) && !/[_]/.test(r)),
    `blocked reasons read as sentences (${JSON.stringify(reasons)})`
  );
}

// --- Standing Block Walk: always camp-available without draw luck (SRD) ---
{
  useRng(createRng(7));
  setDefaultSeed(7);
  const d = createDeckState();
  assert(
    !d.draw.includes('PL01') && !d.hand.includes('PL01') && !d.discard.includes('PL01'),
    'starter physical pile has no Block Walk copies'
  );
  const camp = createCampaign({ seed: 7 });
  startWeek(camp);
  assert(
    (camp.state.deck ?? []).includes('PL01'),
    'ownership still includes Block Walk for upgrades/paths'
  );
  assert(
    !camp.deck.hand.includes('PL01'),
    'opening hand is not forced to hold physical Block Walk'
  );
  const playable = listPlayableHand(camp);
  const walk = playable.find(p => p.card.id === 'PL01');
  assert(!!walk, 'Block Walk is offered while playable');
  assert(
    walk!.index === CAMP_BLOCK_WALK,
    `Block Walk is a camp standing index (${walk!.index} vs ${CAMP_BLOCK_WALK})`
  );
  const phone = playable.find(p => p.card.id === 'PL02');
  assert(!!phone && phone.index === CAMP_PHONE_BANK, 'Phone Bank is standing camp');
  assert(
    (camp.state.deck ?? []).includes('PL02'),
    'ownership includes Phone Bank'
  );
}

// --- DEFERRED A5: practised cards warn, they do not refuse ---
// Cutting a practised card is sometimes correct (dead this week; returns to
// the deck). Hard-blocking would be wrong. Silent cutting is also wrong — the
// draft pick that sharpened it must be named on the cut.
{
  const { s, d } = fixture(['PL01', 'PL10', 'PL13'], ['PL02', 'PL03']);
  assert(cycleCaution(s, d, 0) === '', 'an unpractised card carries no caution');
  applyUpgrade(s, 'PL01');
  const caution = cycleCaution(s, d, 0);
  assert(/practised/i.test(caution), `practised caution names the investment (${JSON.stringify(caution)})`);
  assert(canCycle(s, d, 0), 'practised still leaves the cut legal');
  const res = cycleCard(s, d, 0);
  assert(res.ok, 'the practised cut resolves');
  assert(res.pitched === 'PL01', 'the practised card is the one named');
  assert(/practised/i.test(res.caution ?? ''), 'the result carries the caution');
  const logLine = s.log[s.log.length - 1]?.text ?? '';
  assert(/practised/i.test(logLine), `the log names practised (${JSON.stringify(logLine)})`);

  // A blocked cut must not invent a caution that pretends the cut is available.
  const blocked = fixture(['PL04', 'PL01'], ['PL02']);
  blocked.s.ballot = false;
  applyUpgrade(blocked.s, 'PL04');
  assert(
    cycleCaution(blocked.s, blocked.d, 0) === '',
    'ballot-guarded cards get a block, not a soft practised caution'
  );
}

if (failed) {
  console.error(`\nDeck flow harness FAILED — ${failed} assertion(s)`);
  process.exit(1);
}
console.log('\nDeck flow green.');
