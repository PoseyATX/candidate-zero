/**
 * Single-run demo of the minimal hand + draw + play loop.
 * Prints week-by-week ledger for a labor strategy through week 8.
 */

import { createCampaign, listPlayableHand, runWeek, snapshot } from '../engine/loop.js';
import { laborBallotStrategy } from '../engine/strategies.js';
import { STAMPS } from '../engine/resolve.js';

const campaign = createCampaign();
console.log('=== CANDIDATE ZERO — Play Loop Demo (labor strategy) ===');
console.log('Start:', snapshot(campaign.state));
console.log('Starter deck size:', campaign.deck.draw.length);

for (let w = 1; w <= 8; w++) {
  console.log(`\n--- Week ${w} (phase ${w <= 8 ? 1 : 2}) ---`);
  const report = runWeek(campaign, laborBallotStrategy);
  console.log('Drew:', report.drawn.join(', ') || '(none)');
  for (const p of report.plays) {
    if (p.ok) {
      console.log(`  [${p.stamp ?? STAMPS[p.tier ?? 2]}] ${p.cardName}: ${p.text}`);
    } else {
      console.log(`  (skip) ${p.cardName ?? '?'}: ${p.reason}`);
    }
  }
  console.log('Ledger:', report.endLedger);
  console.log('Hand after week (should be empty):', campaign.deck.hand.length);
  console.log(
    `Deck zones — draw:${campaign.deck.draw.length} discard:${campaign.deck.discard.length}`
  );
}

console.log('\n=== Final ===');
console.log(snapshot(campaign.state));
console.log(
  campaign.state.ballot
    ? 'On the ballot by week 8 — labor path worked this run.'
    : `Not on ballot (sigs ${campaign.state.signatures}/${campaign.state.sigNeed}) — deadline tension visible.`
);
console.log('\nPlayable hand helper at end (should be empty hand):', listPlayableHand(campaign));
console.log('Demo complete. Pure loop is alive.');
