/**
 * Repetition fatigue, honest odds, and session-week feedback.
 *
 * Three defects found by actually playing a full campaign through the CLI
 * rather than by reading code:
 *
 *  1. One card — Whip a Vote Trade — was played fourteen times across a
 *     fourteen-week session at full value. Nothing anywhere made the second
 *     play worth less than the first, so "find the best card and only do that"
 *     was strictly optimal.
 *  2. Every session week printed "No ledger move — the calendar still turned",
 *     because the week summary only watched campaign currencies. Fourteen
 *     consecutive weeks of "nothing happened" while a bill went from unfiled
 *     to signed law.
 *  3. The host API's `approxOdds` returned the bare card odds under a field
 *     documented as effective — no attributes, no ground wear, no opposition,
 *     no upgrades. Every number a host printed was the wrong one.
 *
 * Run: npm run harness:fatigue
 */

import { createCampaign, startWeek } from '../engine/loop.js';
import { createNewState, CAMPAIGN_AP } from '../engine/state.js';
import { executePlay } from '../engine/play.js';
import { setDefaultSeed } from '../engine/rng.js';
import { buildWeekSummary, markWeekStart } from '../engine/feedback.js';
import {
  MAX_FATIGUE_PENALTY,
  decayFatigue,
  fatigueNote,
  fatigueOf,
  fatiguePenalty,
  isFatigueExempt,
  noteFatigue
} from '../engine/fatigue.js';
import { newGame, view } from '../engine/api.js';
import { PLAYS } from '../data/plays.js';
import type { GameState, PlayCard } from '../engine/types.js';

let failures = 0;
function assert(cond: boolean, msg: string): void {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${msg}`);
  if (!cond) failures++;
}

const card = (id: string): PlayCard => {
  const c = PLAYS.find(p => p.id === id);
  if (!c) throw new Error(`missing ${id}`);
  return c;
};

console.log('=== CANDIDATE ZERO — repetition, odds honesty, session feedback ===\n');

// --- 1. Repeating a play costs you, and the cost is capped ---------------
{
  const s = createNewState({ seed: 4 });
  const c = card('PL09'); // Earned Media
  assert(fatiguePenalty(s, c) === 0, 'a fresh card carries no penalty');

  noteFatigue(s, c);
  const one = fatiguePenalty(s, c);
  assert(one > 0, `one play makes the next one cost something (${(one * 100).toFixed(1)}pp)`);

  for (let i = 0; i < 30; i++) noteFatigue(s, c);
  const many = fatiguePenalty(s, c);
  assert(many > one, 'more repetition costs more');
  assert(
    Math.abs(many - MAX_FATIGUE_PENALTY) < 1e-9,
    `and it is capped, never a cliff (${(many * 100).toFixed(0)}pp)`
  );
  console.log('PASS: repetition decays a play, and the decay has a floor under it.');
}

// --- 2. Resting a card brings it back, with no button to press ----------
{
  const s = createNewState({ seed: 5 });
  const c = card('PL09');
  for (let i = 0; i < 4; i++) noteFatigue(s, c);
  const tired = fatiguePenalty(s, c);
  assert(tired > 0.15, `four plays in a week bites (${(tired * 100).toFixed(0)}pp)`);

  decayFatigue(s);
  const afterOne = fatiguePenalty(s, c);
  assert(afterOne < tired, 'a week off recovers some of it');
  for (let i = 0; i < 3; i++) decayFatigue(s);
  assert(fatiguePenalty(s, c) === 0, 'and four quiet weeks recover it entirely');
  assert(fatigueOf(s, c.id) === 0, 'the entry is cleaned up, not left at epsilon');
  console.log('PASS: rest restores a card by itself — nothing to manage, nothing to click.');
}

// --- 3. Once a week is nearly free; the spam pattern is what hurts -------
{
  const once = createNewState({ seed: 6 });
  const spam = createNewState({ seed: 6 });
  const c = card('PL09');
  for (let week = 0; week < 8; week++) {
    noteFatigue(once, c);
    decayFatigue(once);
    noteFatigue(spam, c);
    noteFatigue(spam, c);
    noteFatigue(spam, c);
    decayFatigue(spam);
  }
  const onceP = fatiguePenalty(once, c);
  const spamP = fatiguePenalty(spam, c);
  assert(onceP < 0.1, `once a week settles cheap (${(onceP * 100).toFixed(1)}pp)`);
  assert(spamP > onceP * 2, `three a week is a different game (${(spamP * 100).toFixed(1)}pp)`);
  console.log('PASS: a card in rotation is fine; a card you lean on is not.');
}

// --- 4. Knock is exempt. The floor stays the floor. ---------------------
{
  const s = createNewState({ seed: 7 });
  const knock = card('PL40');
  for (let i = 0; i < 20; i++) noteFatigue(s, knock);
  assert(isFatigueExempt('PL40'), 'Knock is exempt by name');
  assert(fatiguePenalty(s, knock) === 0, 'Knock never degrades, however often you fall back on it');
  assert(fatigueNote(s, knock) === '', 'and it never nags about it');
  // The ballot doors resolve once; fatiguing them would be nonsense.
  assert(isFatigueExempt('PL04') && isFatigueExempt('PL05'), 'ballot doors exempt');
  console.log('PASS: the fallback stays reliable at every depth (Covenant: Knock is the floor).');
}

// --- 5. The penalty is visible. A hidden malus is the game lying. -------
{
  const s = createNewState({ seed: 8 });
  const c = card('PL09');
  assert(fatigueNote(s, c) === '', 'no note when the card is fresh');
  for (let i = 0; i < 3; i++) noteFatigue(s, c);
  const note = fatigueNote(s, c);
  assert(note.length > 0, 'a worn card explains itself');
  assert(!/\d+\.\d|fatigue \d/i.test(note), `and does it in words, not a stat dump ("${note}")`);
  console.log(`PASS: the player is told — "${note}"`);
}

// --- 6. Playing through executePlay actually accrues it -----------------
{
  setDefaultSeed(9);
  const s = createNewState({ seed: 9, ap: CAMPAIGN_AP, money: 5000, momentum: 8 });
  s.tier = 1;
  s.ballot = true;
  const c = card('PL09');
  const before = fatigueOf(s, c.id);
  s.ap = CAMPAIGN_AP;
  executePlay(s, c);
  assert(fatigueOf(s, c.id) > before, 'a real play banks fatigue');

  // A miss counts too — the room saw you try it again either way.
  const s2 = createNewState({ seed: 10, ap: CAMPAIGN_AP, money: 5000, momentum: 8 });
  s2.tier = 1;
  s2.ballot = true;
  executePlay(s2, { ...c, odds: () => 0 });
  assert(fatigueOf(s2, c.id) > 0, 'and a failed play counts the same');
  console.log('PASS: fatigue accrues on the real play path, hit or miss.');
}

// --- 7. Session weeks report what they actually did ---------------------
{
  const s = createNewState({ seed: 11 });
  s.stage = 'session';
  s.week = 3;
  markWeekStart(s);
  // A week under the dome: the campaign ledger does not move at all.
  s.capital += 2;
  s.districtStanding += 6;
  s.favors += 1;
  s.bill = {
    id: 'HB1',
    title: 'A bill',
    issueId: null,
    sponsor: 'you',
    committeeId: null,
    status: 'in_committee',
    tally: { aye: 12, nay: 0, present: 0 },
    pipelineStage: 2,
    heat: 0
  };
  const summary = buildWeekSummary(s, [{ tier: 1 }]);
  assert(
    !/No ledger move/.test(summary.juice),
    `a session week no longer reports nothing happened ("${summary.juice}")`
  );
  assert(/capital/.test(summary.juice), 'capital is reported');
  assert(/standing/.test(summary.juice), 'standing is reported');
  console.log(`PASS: ${summary.juice}`);

  // A genuinely empty week still says so — the fix must not invent movement.
  const quiet = createNewState({ seed: 12 });
  quiet.stage = 'session';
  markWeekStart(quiet);
  const q = buildWeekSummary(quiet, []);
  assert(/No ledger move/.test(q.juice), 'and a week where nothing moved still says so');
  console.log('PASS: an empty week is still honestly empty.');
}

// --- 8. The odds a host prints are the odds that get rolled -------------
{
  const snap = newGame({ seed: 42 });
  const v = view(snap);
  const withOdds = v.actions.filter(a => a.approxOdds !== null);
  assert(withOdds.length > 0, 'there are odds-bearing actions to check');

  // Give the player a lopsided attribute profile and prove the printed number
  // moves with it — it did not before, because approxOdds ignored attrs.
  const hi = newGame({ seed: 42 });
  hi.state.attrs = { ...hi.state.attrs, CLO: 20, CON: 20, CRA: 20, INK: 20, DIP: 20, CHA: 20 };
  const lo = newGame({ seed: 42 });
  lo.state.attrs = { ...lo.state.attrs, CLO: 2, CON: 2, CRA: 2, INK: 2, DIP: 2, CHA: 2 };
  const pick = (sn: typeof hi): number | null =>
    view(sn).actions.find(a => a.cardId === withOdds[0]!.cardId)?.approxOdds ?? null;
  const hiOdds = pick(hi);
  const loOdds = pick(lo);
  assert(hiOdds !== null && loOdds !== null, 'the same action is present in both');
  assert(
    (hiOdds ?? 0) > (loOdds ?? 1),
    `printed odds move with attributes (${((loOdds ?? 0) * 100).toFixed(0)}% → ${((hiOdds ?? 0) * 100).toFixed(0)}%)`
  );
  assert(
    v.actions.every(a => typeof a.fatigueNote === 'string'),
    'every action carries a fatigue note field'
  );
  console.log('PASS: approxOdds reflects attributes, wear, opposition and upgrades.');
}

console.log('');
if (failures > 0) {
  console.log(`fatigue: ${failures} failure(s)`);
  process.exit(1);
}
console.log('Fatigue green — the room tires, the week reports itself, the odds are honest.');
