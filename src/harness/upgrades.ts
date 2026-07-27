/**
 * Card upgrade harness — the deck's second axis.
 * Run: npm run harness:upgrades
 *
 * The load-bearing assertion is the covenant one: an upgrade moves the odds
 * that go INTO resolve, or the cost, and never the roll itself.
 */

import { createNewState } from '../engine/state.js';
import { executePlay } from '../engine/play.js';
import {
  applyUpgrade,
  upgradeTier,
  isUpgraded,
  effectiveApCost,
  upgradeOddsBonus,
  upgradeKindFor,
  upgradableCardIds,
  upgradeOptionId,
  parseUpgradeOption,
  MAX_UPGRADE_TIER
} from '../engine/upgrades.js';
import { resolvePhaseDraft, buildPhaseDraft } from '../engine/deck.js';
import { buildCatalog } from '../engine/loop.js';
import { cardInner, costParts } from '../ui/card-face.js';
import { createRng, setDefaultSeed, useRng } from '../engine/rng.js';
import { ALL_PLAYS, PL01_BlockWalk, PL10_PressRelease } from '../data/plays.js';
import type { GameState } from '../engine/types.js';

let failed = 0;
function assert(cond: boolean, msg: string): void {
  if (cond) console.log(`PASS: ${msg}`);
  else {
    console.error(`FAIL: ${msg}`);
    failed++;
  }
}

console.log('=== CANDIDATE ZERO — Card upgrades ===\n');

// --- Tier bookkeeping ---
{
  const s = createNewState({ seed: 1 });
  assert(upgradeTier(s, 'PL01') === 0, 'cards start unupgraded');
  assert(applyUpgrade(s, 'PL01') === true, 'first upgrade applies');
  assert(upgradeTier(s, 'PL01') === 1, 'tier records');
  assert(isUpgraded(s, 'PL01'), 'isUpgraded reflects the tier');
  assert(!isUpgraded(s, 'PL10'), 'upgrading one card does not touch another');

  // Cap holds — callers must not be able to spend a pick for nothing.
  let capped = true;
  for (let i = 0; i < 5; i++) if (applyUpgrade(s, 'PL01')) capped = false;
  assert(capped, `upgrades never stack past the cap (${MAX_UPGRADE_TIER})`);
  assert(upgradeTier(s, 'PL01') === MAX_UPGRADE_TIER, 'tier clamps at the cap');
}

// --- Save/replay safety ---
{
  const s = createNewState({ seed: 2 });
  applyUpgrade(s, 'PL01');
  const round = JSON.parse(JSON.stringify(s)) as GameState;
  assert(upgradeTier(round, 'PL01') === 1, 'upgrades survive a JSON round trip');
}

// --- The two upgrade kinds do what they claim ---
{
  const s = createNewState({ seed: 3 });
  assert(upgradeKindFor(PL01_BlockWalk) === 'cheaper', 'field work upgrades to cheaper');
  assert(upgradeKindFor(PL10_PressRelease) === 'sharper', 'light non-field upgrades to sharper');

  const baseAp = PL01_BlockWalk.cost.a ?? 0;
  applyUpgrade(s, PL01_BlockWalk.id);
  assert(
    effectiveApCost(s, PL01_BlockWalk) === baseAp - 1,
    `cheaper upgrade drops AP cost (${baseAp} -> ${effectiveApCost(s, PL01_BlockWalk)})`
  );
  assert(
    upgradeOddsBonus(s, PL01_BlockWalk) === 0,
    'a cheaper upgrade gives no odds bonus'
  );

  applyUpgrade(s, PL10_PressRelease.id);
  assert(upgradeOddsBonus(s, PL10_PressRelease) > 0, 'sharper upgrade raises odds');
  assert(
    effectiveApCost(s, PL10_PressRelease) === (PL10_PressRelease.cost.a ?? 0),
    'a sharper upgrade does not change cost'
  );
}

// --- A discount never drives a real cost to zero ---
{
  const s = createNewState({ seed: 4 });
  const oneAp = { ...PL01_BlockWalk, id: 'TEST1', cost: { a: 1 }, field: true };
  applyUpgrade(s, 'TEST1');
  assert(effectiveApCost(s, oneAp) === 1, 'a 1-AP card stays 1 AP — upgrades never make plays free');
}

// --- COVENANT 4: upgrades move p, never the roll ---
{
  function rollFor(upgraded: boolean): { tier: number; roll: number; p: number } {
    useRng(createRng(4242));
    setDefaultSeed(4242);
    const s = createNewState({ seed: 4242, ap: 9, money: 9000, volPool: 9 });
    if (upgraded) applyUpgrade(s, PL10_PressRelease.id);
    const out = executePlay(s, PL10_PressRelease);
    return { tier: out.tier ?? -1, roll: out.roll ?? -1, p: out.p ?? -1 };
  }
  const plain = rollFor(false);
  const sharp = rollFor(true);
  assert(
    plain.roll === sharp.roll,
    `the underlying roll is identical (${plain.roll} vs ${sharp.roll}) — upgrades are not a thumb on the dice`
  );
  assert(
    sharp.p > plain.p,
    `an upgrade raises the odds going in (${plain.p.toFixed(3)} -> ${sharp.p.toFixed(3)})`
  );
}

// --- Draft offer encoding rides the existing channel ---
{
  const s = createNewState({ seed: 5 });
  s.deck = ['PL01', 'PL10'];
  assert(parseUpgradeOption('PL01') === null, 'a plain card id is not an upgrade offer');
  assert(parseUpgradeOption(upgradeOptionId('PL01')) === 'PL01', 'upgrade offers round-trip');

  assert(upgradableCardIds(s, s.deck).length === 2, 'owned cards are upgradable');
  applyUpgrade(s, 'PL01');
  assert(
    upgradableCardIds(s, s.deck).join() === 'PL10',
    'a card at cap is no longer offered for upgrade'
  );
}

// --- Taking the draft offer upgrades rather than adding a card ---
{
  const s = createNewState({ seed: 6 });
  s.deck = ['PL01'];
  s.pendingDraft = { phase: 1, options: [upgradeOptionId('PL01')] };
  const before = s.deck.length;
  const res = resolvePhaseDraft(s, 0);
  assert(res.ok, 'the upgrade draft pick resolves');
  assert(upgradeTier(s, 'PL01') === 1, 'picking the offer applies the upgrade');
  assert(s.deck.length === before, 'an upgrade pick does not add a card to the deck');
  assert(!s.pendingDraft, 'the draft is cleared after picking');
}

// --- GUARD: every emittable draft option renders through the UI's decode path ---
// The bug this exists for: `buildPhaseDraft` learned to emit "UP:<id>", and only
// one of the three readers (renderDraft, openDraftDetail, api.view) was updated.
// The two that were not did a raw catalog.get and got undefined — one stalled the
// campaign, one leaked the raw option string to hosts as a card name. Nothing
// asserted that the readers agreed on the option format. Now something does.
{
  const catalog = buildCatalog();
  let checked = 0;
  let bad: string[] = [];
  for (let seed = 1; seed <= 60; seed++) {
    useRng(createRng(seed));
    setDefaultSeed(seed);
    const s = createNewState({ seed });
    // Vary ownership so upgrade offers, plain offers, and the at-cap case all appear.
    s.deck = ALL_PLAYS.slice(0, seed % 12).map(p => p.id);
    if (seed % 3 === 0) for (const id of s.deck) applyUpgrade(s, id);
    const draft = buildPhaseDraft(s);
    for (const option of draft.options) {
      checked++;
      // This is exactly what paint-play.openDraftDetail and api.view now do.
      const id = parseUpgradeOption(option) ?? option;
      if (!catalog.get(id)) bad.push(option);
    }
  }
  assert(checked > 0, `draft options were actually generated (${checked} checked)`);
  assert(
    bad.length === 0,
    `every emittable draft option decodes to a catalog card (${bad.length ? `bad: ${bad.slice(0, 5).join(', ')}` : 'all clean'})`
  );
}

// --- The card face tells the truth about an upgrade ---
// An invisible upgrade is a purchase the player cannot see they made. The face
// must carry the practised mark, and a "cheaper" upgrade must reprice the seal —
// a stale cost number is the same lie as the AP pips that did not count down.
{
  const s = createNewState({ seed: 8 });
  const plainFace = cardInner(s, PL10_PressRelease);
  const plainCost = costParts(PL01_BlockWalk, s).full;
  applyUpgrade(s, PL10_PressRelease.id);
  applyUpgrade(s, PL01_BlockWalk.id);
  const upFace = cardInner(s, PL10_PressRelease);
  const upCost = costParts(PL01_BlockWalk, s).full;

  assert(!plainFace.includes('up-mark'), 'an unupgraded face carries no practised mark');
  assert(upFace.includes('up-mark'), 'an upgraded face carries the practised mark');
  assert(
    plainCost === '2 AP' && upCost === '1 AP',
    `a cheaper upgrade reprices the cost seal (${plainCost} -> ${upCost})`
  );
}

// --- The host-facing view never leaks the option encoding ---
{
  const s = createNewState({ seed: 7 });
  s.deck = ['PL01'];
  const option = upgradeOptionId('PL01');
  assert(
    parseUpgradeOption(option) === 'PL01' && option !== 'PL01',
    'an upgrade option is distinguishable from the card id it wraps'
  );
  assert(
    !!buildCatalog().get(parseUpgradeOption(option)!),
    'the decoded id resolves in the catalog — hosts can render a real name'
  );
}

if (failed) {
  console.error(`\nUpgrade harness FAILED — ${failed} assertion(s)`);
  process.exit(1);
}
console.log('\nCard upgrades green.');
