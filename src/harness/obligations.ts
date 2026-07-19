/**
 * Obligations registry harness — structured OB ids + weekly drag.
 *
 * Run: npm run harness:obligations
 */

import { OBLS, addObl, applyOblDrag, oblName } from '../data/obligations.js';
import { PL20_PacCheck, PL21_SelfFundCredit } from '../data/plays-wave4.js';
import { createNewState } from '../engine/state.js';
import { executePlay } from '../engine/play.js';
import { advanceCampaignWeek } from '../engine/calendar.js';
import { setDefaultSeed } from '../engine/rng.js';
import { shadowCheck } from '../engine/reputation.js';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function main(): void {
  console.log('=== harness:obligations ===');

  // Registry shape OB1–OB8 (+ OB9/OB10 for pledge/flatbed parity)
  for (const id of ['OB1', 'OB2', 'OB3', 'OB4', 'OB5', 'OB6', 'OB7', 'OB8']) {
    assert(!!OBLS[id], `missing ${id}`);
    assert(typeof OBLS[id]!.drag === 'function', `${id}.drag`);
    assert(oblName(id).length > 0, `${id} name`);
  }

  setDefaultSeed(11);
  const s = createNewState({ seed: 11, money: 1000, ap: 2, tier: 1 });
  s.ballot = true; // tier path for PAC

  // PAC check grants OB1 (not free-text)
  const pac = { ...PL20_PacCheck, odds: () => 0.99 };
  s.ap = 2;
  s.tier = 1;
  executePlay(s, pac);
  assert(s.obls.includes('OB1'), 'PL20 should grant OB1, got: ' + JSON.stringify(s.obls));
  assert(!s.obls.some(o => o.includes('association')), 'no free-text PAC obl');

  // Bank note from self-fund
  const bank = { ...PL21_SelfFundCredit, odds: () => 0.99 };
  s.ap = 2;
  executePlay(s, bank);
  assert(s.obls.includes('OB2'), 'PL21 should grant OB2');

  // Weekly drag: OB1 L/exposure, OB2 money
  const L0 = s.faces.L;
  const exp0 = s.exposure;
  const m0 = s.money;
  applyOblDrag(s);
  assert(s.faces.L === L0 - 1, `OB1 should −1 L (was ${L0}, now ${s.faces.L})`);
  assert(s.exposure === exp0 + 0.15, 'OB1 exposure +0.15');
  assert(s.money === m0 - 150, `OB2 −$150 (was ${m0}, now ${s.money})`);

  // addObl is idempotent
  addObl(s, 'OB1');
  assert(s.obls.filter(x => x === 'OB1').length === 1, 'no duplicate OB1');

  // Shadow G2 grants OB8 not free-text
  const s2 = createNewState({ seed: 12 });
  s2.faces.G = -26;
  shadowCheck(s2);
  assert(s2.obls.includes('OB8'), 'G2 shadow should grant OB8');

  // Week advance applies drag (via onWeekAdvance)
  const s3 = createNewState({ seed: 13, money: 500, ballot: true, ap: 0 });
  s3.week = 1;
  s3.stage = 'primary';
  addObl(s3, 'OB2');
  const before = s3.money;
  advanceCampaignWeek(s3);
  assert(s3.money === before - 150, 'week advance should drag OB2');

  console.log('OK — OB1–OB8 registry, PAC/self-fund grants, weekly drag, G2→OB8.');
  process.exit(0);
}

main();
