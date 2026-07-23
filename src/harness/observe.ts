/**
 * Campaign observe / diff (Anvil-inspired ACI).
 * Run: npm run harness:observe
 */

import { createCampaign, playFromHand, endWeekInPlace, startWeek } from '../engine/loop.js';
import {
  observeCampaign,
  observeCampaignDiff
} from '../lib/anvil-port/observe.js';
import {
  colorFromPath,
  greyboxSvg,
  cardArtPlateHtml,
  missingCardArt,
  clearMissingCardArt
} from '../lib/anvil-port/index.js';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error('FAIL: ' + msg);
}

console.log('=== CANDIDATE ZERO — Anvil-port observe + greybox ===\n');

// Greybox deterministic
{
  const a = colorFromPath('assets/cards/PL01.png');
  const b = colorFromPath('assets/cards/PL01.png');
  const c = colorFromPath('assets/cards/PL02.png');
  assert(a === b, 'colorFromPath stable');
  assert(a !== c, 'colorFromPath differs by path');
  const svg = greyboxSvg('assets/cards/PL01.png');
  assert(svg.includes('<svg'), 'greybox svg');
  assert(svg.includes('PL01'), 'greybox label');
  console.log('PASSED: greybox deterministic');
}

// Card art plate HTML (greybox default — no CARD_ART_PATH)
{
  clearMissingCardArt();
  const html = cardArtPlateHtml('PL01');
  assert(html.includes('art-plate'), 'plate wrapper');
  assert(html.includes('art-greybox') || html.includes('<svg'), 'greybox present');
  console.log('PASSED: cardArtPlateHtml greybox default');
}

// Observe campaign
{
  const c = createCampaign({
    seed: 99,
    setup: { personaId: 'teacher', issueId: 'taxes', districtId: 'open', regionId: 'east' }
  });
  startWeek(c);
  const o1 = observeCampaign(c);
  assert(o1.v === 1, 'observe v1');
  assert(o1.stage === 'primary', 'primary stage');
  assert(o1.personaId === 'teacher', 'persona');
  assert(o1.summary.includes('stage=primary'), 'summary');
  assert(o1.hand.length > 0, 'hand rows');
  assert(typeof o1.ledger.money === 'number', 'ledger');

  // Play something if possible
  if (o1.hand[0]) {
    playFromHand(c, o1.hand[0].handIndex);
  }
  const o2 = observeCampaign(c);
  const d = observeCampaignDiff(o1, o2);
  assert(typeof d.summary === 'string' && d.summary.length > 0, 'diff summary');
  console.log('PASSED: observeCampaign + diff', d.summary.slice(0, 80));
}

// end week observe
{
  const c = createCampaign({ seed: 100 });
  startWeek(c);
  while (c.state.ap > 0 && !c.state.over) {
    const o = observeCampaign(c);
    if (!o.hand.length) break;
    const r = playFromHand(c, o.hand[0]!.handIndex);
    if (!r.ok) break;
  }
  const before = observeCampaign(c);
  endWeekInPlace(c);
  const after = observeCampaign(c);
  const d = observeCampaignDiff(before, after);
  assert(d.summary.length > 0, 'week advance diff');
  console.log('PASSED: endWeek observeDiff');
}

console.log('\nAnvil-port observe green.');
process.exit(0);
