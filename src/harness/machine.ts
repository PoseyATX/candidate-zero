/**
 * The Machine harness — the thing the player builds and can lose.
 * Run: npm run harness:machine
 *
 * The load-bearing assertions are the ones about LOSS. A meta-layer that only
 * ever accumulates is wallpaper; what makes a player take the careful line in
 * week 12 is that the County Chairwoman can be gone, permanently, by name. So:
 * standing must be able to fall, people must be able to walk, and a walked
 * member must never come back.
 */

import { createNewState } from '../engine/state.js';
import { emptyLegacy } from '../engine/legacy.js';
import {
  settleMachine,
  seatMachine,
  getMachine,
  findMember,
  tierOf,
  hasDeparted,
  runQuality,
  memberName,
  rosterForDisplay,
  poachedIds,
  applyPoachPenalty,
  WITH_YOU_AT,
  MAX_STANDING
} from '../engine/machine.js';
import {
  askerId,
  maybeOpenAsk,
  grantAsk,
  settleUnansweredAsk,
  pendingAskAdjustment,
  ASK_GRANT_STANDING,
  ASK_REFUSE_STANDING
} from '../engine/ask.js';
import { MACHINE_ASK_PLAYS, askCardId } from '../data/machine-asks.js';
import { ALLIES } from '../data/allies.js';
import { createRng, useRng } from '../engine/rng.js';
import type { CampaignOutcome, GameState, LegacyState } from '../engine/types.js';

let failed = 0;
function assert(cond: boolean, msg: string): void {
  if (cond) console.log(`PASS: ${msg}`);
  else {
    console.error(`FAIL: ${msg}`);
    failed++;
  }
}

console.log('=== CANDIDATE ZERO — The Machine ===\n');

function stateWith(allies: { id: string; warm: number }[], over: Partial<GameState> = {}): GameState {
  const s = createNewState({ seed: 1 });
  s.allies = allies.map(a => ({ id: a.id, warm: a.warm, age: 0 }));
  Object.assign(s, over);
  return s;
}

/** Run a whole cycle: settle, then start the next run and seat. */
function cycle(
  legacy: LegacyState,
  allies: { id: string; warm: number }[],
  kind: CampaignOutcome,
  over: Partial<GameState> = {}
): void {
  const s = stateWith(allies, over);
  legacy.runs.push({ epithet: 'test', kind });
  settleMachine(legacy, s, kind, legacy.runs.length);
}

// --- Building it ---
{
  const legacy = emptyLegacy();
  assert(getMachine(legacy).members.length === 0, 'a first-time player has no machine');

  cycle(legacy, [{ id: 'AL02', warm: 2 }], 'won_general');
  const m = findMember(getMachine(legacy), 'AL02');
  assert(!!m, `working with someone banks them (${memberName('AL02')})`);
  assert((m?.runs ?? 0) === 1, 'the cycle count starts at one');
  assert((m?.standing ?? 0) > 0, 'they arrive with standing');
}

// --- It deepens across runs, and that is what makes losing one hurt ---
{
  const legacy = emptyLegacy();
  for (let i = 0; i < 4; i++) cycle(legacy, [{ id: 'AL02', warm: 2 }], 'won_general');
  const m = findMember(getMachine(legacy), 'AL02')!;
  assert(m.runs === 4, 'four cycles together are counted');
  assert(m.standing >= WITH_YOU_AT, `four good cycles puts them with you (${m.standing})`);
  assert(m.standing <= MAX_STANDING, 'standing is capped');
}

// --- The payoff lands in week 1, not in a menu ---
{
  const legacy = emptyLegacy();
  for (let i = 0; i < 3; i++) cycle(legacy, [{ id: 'AL02', warm: 2 }], 'won_general');
  const next = createNewState({ seed: 2 });
  assert(next.allies.length === 0, 'a fresh run starts with nobody');
  const seated = seatMachine(next, legacy);
  assert(seated.includes('AL02'), 'someone who is with you is seated at run start');
  assert(next.allies.some(a => a.id === 'AL02' && a.warm > 0), 'and they are actually warm');

  // Seating twice must not double them up.
  const again = seatMachine(next, legacy);
  assert(again.length === 0 && next.allies.filter(a => a.id === 'AL02').length === 1,
    'seating is idempotent — no duplicate allies');
}

// --- Someone who merely OWES you is not a free head start ---
{
  const legacy = emptyLegacy();
  cycle(legacy, [{ id: 'AL04', warm: 1 }], 'lost_primary');
  const m = findMember(getMachine(legacy), 'AL04')!;
  assert(tierOf(m) !== 'with', `one thin cycle leaves them owing, not with you (${m.standing})`);
  const next = createNewState({ seed: 3 });
  assert(!seatMachine(next, legacy).includes('AL04'), 'owed favours are not seated — they must be worked');
}

// --- LOSS: a bad cycle costs standing ---
{
  const legacy = emptyLegacy();
  for (let i = 0; i < 4; i++) cycle(legacy, [{ id: 'AL02', warm: 2 }], 'won_general');
  const peak = findMember(getMachine(legacy), 'AL02')!.standing;
  // Now several cycles where this person is NOT worked and the runs go badly.
  for (let i = 0; i < 3; i++) cycle(legacy, [], 'missed_filing', { disasterLog: [3, 6] });
  const after = findMember(getMachine(legacy), 'AL02');
  assert(
    !after || after.standing < peak,
    `neglect plus bad cycles costs standing (${peak} -> ${after ? after.standing : 'gone'})`
  );
}

// --- LOSS: they walk, and it is permanent ---
{
  const legacy = emptyLegacy();
  cycle(legacy, [{ id: 'AL02', warm: 1 }], 'lost_primary');
  let walked = false;
  for (let i = 0; i < 12 && !walked; i++) {
    const out = cycle2(legacy);
    if (out.walked.includes('AL02')) walked = true;
  }
  function cycle2(l: LegacyState) {
    const s = stateWith([], { disasterLog: [1, 2, 3], debt: 500 });
    l.runs.push({ epithet: 'test', kind: 'missed_filing' });
    return settleMachine(l, s, 'missed_filing', l.runs.length);
  }
  assert(walked, 'a long enough cold streak makes someone walk');
  assert(hasDeparted(getMachine(legacy), 'AL02'), 'the departure is recorded by name');
  assert(!findMember(getMachine(legacy), 'AL02'), 'and they are off the roster');

  // The scar is permanent: working with them again must not re-add them.
  cycle(legacy, [{ id: 'AL02', warm: 3 }], 'won_general');
  assert(
    !findMember(getMachine(legacy), 'AL02'),
    'someone who walked never rejoins — that door does not reopen'
  );
}

// --- Run quality: losing well beats winning ugly ---
{
  // A disciplined loss means you MADE the ballot and then lost the race —
  // ballot:false is the missed-filing path, which is a different (worse) story.
  const clean = runQuality(stateWith([], { ballot: true }), 'lost_primary');
  const ugly = runQuality(
    stateWith([], { ballot: true, disasterLog: [1, 2, 3, 4], debt: 900, obls: ['O1', 'O2'] }),
    'won_general'
  );
  assert(
    clean > ugly,
    `a disciplined loss keeps your people better than a chaotic win (${clean.toFixed(2)} vs ${ugly.toFixed(2)}) — Covenant 6`
  );
  const best = runQuality(stateWith([], { ballot: true }), 'won_general');
  assert(best > clean, 'and a clean win is still the best outcome');
  const missed = runQuality(stateWith([], {}), 'missed_filing');
  assert(missed < clean, `never reaching the ballot is worse than losing the race (${missed.toFixed(2)} vs ${clean.toFixed(2)})`);
}

// --- Save/replay safety ---
{
  const legacy = emptyLegacy();
  cycle(legacy, [{ id: 'AL02', warm: 2 }], 'won_general');
  const round = JSON.parse(JSON.stringify(legacy)) as LegacyState;
  assert(!!findMember(getMachine(round), 'AL02'), 'the machine survives a JSON round trip');
  const old = { runs: [], traits: [], carry: {} } as LegacyState;
  assert(getMachine(old).members.length === 0, 'a save written before the machine existed still loads');
}

// --- Display ordering is stable and player-facing ---
{
  const legacy = emptyLegacy();
  cycle(legacy, [{ id: 'AL04', warm: 1 }], 'lost_primary');
  for (let i = 0; i < 3; i++) cycle(legacy, [{ id: 'AL02', warm: 2 }], 'won_general');
  const roster = rosterForDisplay(legacy);
  assert(roster.length >= 2, 'the roster lists everyone');
  assert(
    roster[0]!.standing >= roster[roster.length - 1]!.standing,
    'strongest relationship first'
  );
  assert(
    roster.every(r => memberName(r.id) !== r.id),
    'every member renders as a person, not an id'
  );
}

// --- THE ASK: what the machine costs you (Covenant 6) ---
{
  const s0 = createNewState({ seed: 40 });
  assert(askerId(s0) === null, 'nobody is asking on a fresh week');
  assert(maybeOpenAsk(s0, []) === null, 'with nobody seated, nobody can ask — a stranger has no claim');

  // Force an ask, then honour it.
  useRng(createRng(7));
  const s1 = createNewState({ seed: 41 });
  let opened: string | null = null;
  for (let i = 0; i < 200 && !opened; i++) opened = maybeOpenAsk(s1, ['AL02']);
  assert(opened === 'AL02', 'someone seated can call in a favour');
  assert(askerId(s1) === 'AL02', 'and the asker is readable for the card gate');

  // One at a time — a second roll must not stack a rival claim.
  const second = maybeOpenAsk(s1, ['AL04']);
  assert(second === null && askerId(s1) === 'AL02', 'only one favour is open at a time');

  grantAsk(s1, 'AL02');
  assert(askerId(s1) === null, 'honouring closes the ask');
  assert(pendingAskAdjustment(s1, 'AL02') > 0, 'honouring earns standing');
  assert(settleUnansweredAsk(s1) === null, 'a closed ask cannot also be refused');
}

// --- Refusing is the clock running out, and it costs more than a grant earns ---
{
  useRng(createRng(9));
  const s = createNewState({ seed: 42 });
  let opened: string | null = null;
  for (let i = 0; i < 200 && !opened; i++) opened = maybeOpenAsk(s, ['AL02']);
  assert(!!opened, 'an ask opened for the refusal case');
  const line = settleUnansweredAsk(s);
  assert(!!line, 'closing the week on an open favour is itself an answer');
  assert(pendingAskAdjustment(s, 'AL02') < 0, 'refusing costs standing');
  assert(
    Math.abs(ASK_REFUSE_STANDING) > ASK_GRANT_STANDING,
    `a favour refused is remembered harder than one honoured (${ASK_REFUSE_STANDING} vs +${ASK_GRANT_STANDING})`
  );
}

// --- Ask adjustments land through settlement, the single writer for standing ---
{
  const legacy = emptyLegacy();
  for (let i = 0; i < 4; i++) cycle(legacy, [{ id: 'AL02', warm: 2 }], 'won_general');
  const before = findMember(getMachine(legacy), 'AL02')!.standing;

  const s = stateWith([{ id: 'AL02', warm: 2 }], { ballot: true });
  // Two refusals in one run.
  for (let k = 0; k < 2; k++) {
    useRng(createRng(100 + k));
    let opened: string | null = null;
    for (let i = 0; i < 200 && !opened; i++) opened = maybeOpenAsk(s, ['AL02']);
    settleUnansweredAsk(s);
  }
  legacy.runs.push({ epithet: 'test', kind: 'lost_primary' });
  settleMachine(legacy, s, 'lost_primary', legacy.runs.length);
  const after = findMember(getMachine(legacy), 'AL02')!.standing;
  assert(
    after < before + 20,
    `refused favours drag standing at settlement (${before} -> ${after})`
  );
}

// --- The ask card exists for every member and is gated to the asker ---
{
  assert(MACHINE_ASK_PLAYS.length === Object.keys(ALLIES).length,
    `one ask card per member (${MACHINE_ASK_PLAYS.length})`);
  const card = MACHINE_ASK_PLAYS.find(c => c.id === askCardId('AL02'))!;
  assert(!!card, 'the ask card id is derivable from the member id');
  assert(card.n.includes(memberName('AL02')), `the card is named for the person (${card.n})`);
  assert((card.cost.a ?? 0) > 0, 'honouring costs AP — a dialog would have cost nothing');

  const idle = createNewState({ seed: 43 });
  assert(!card.show!(idle), 'the card is invisible when nobody is asking');
  useRng(createRng(11));
  let opened: string | null = null;
  for (let i = 0; i < 200 && !opened; i++) opened = maybeOpenAsk(idle, ['AL02']);
  assert(card.show!(idle), 'and visible exactly when that member calls');
  const other = MACHINE_ASK_PLAYS.find(c => c.id === askCardId('AL04'))!;
  assert(!other.show!(idle), 'only the asker\'s card appears, not the whole roster');
}

// --- The poach: attrition with a face on it ---
{
  /**
   * Build someone up over `warmRuns` good cycles, then freeze them out.
   *
   * The re-seed has to happen AFTER stateWith — createNewState seeds the global
   * RNG itself, so seeding before it is silently overwritten and every trial
   * rolls the identical number. (It did: the first version of this test
   * reported 60/60 poached, which is what tipped me off.)
   */
  function burnOut(seed: number, warmRuns: number): LegacyState {
    const legacy = emptyLegacy();
    for (let i = 0; i < warmRuns; i++) cycle(legacy, [{ id: 'AL02', warm: 3 }], 'won_general');
    for (let i = 0; i < 30 && findMember(getMachine(legacy), 'AL02'); i++) {
      const s = stateWith([], { disasterLog: [1, 2, 3], ballot: false });
      useRng(createRng(seed * 977 + i));
      legacy.runs.push({ epithet: 'test', kind: 'missed_filing' });
      settleMachine(legacy, s, 'missed_filing', legacy.runs.length);
    }
    return legacy;
  }

  // Over many seeds, some of the deep relationships go to the opposition.
  let poachedRuns = 0;
  const trials = 60;
  for (let seed = 0; seed < trials; seed++) {
    if (poachedIds(burnOut(seed, 3)).length) poachedRuns++;
  }
  assert(poachedRuns > 0, `people with real history get poached (${poachedRuns}/${trials} seeds)`);
  assert(
    poachedRuns < trials,
    `and some just go quiet — the poach is a roll, not a rule (${poachedRuns}/${trials})`
  );

  // A one-cycle acquaintance is not worth the other campaign's trouble.
  let shallowPoached = 0;
  for (let seed = 0; seed < trials; seed++) {
    if (poachedIds(burnOut(seed, 1)).length) shallowPoached++;
  }
  assert(
    shallowPoached === 0,
    `a single-cycle contact is never poached — only what you invested in (${shallowPoached})`
  );

  // The scar is still permanent for the poached, same as anyone who walked.
  const bitten = (() => {
    for (let seed = 0; seed < 400; seed++) {
      const l = burnOut(seed, 3);
      if (poachedIds(l).length) return l;
    }
    return null;
  })();
  assert(!!bitten, 'found a poached departure to inspect');
  if (bitten) {
    const rec = getMachine(bitten).departed.find(d => d.id === 'AL02');
    assert(rec?.toRival === true, 'the departure is recorded as going to the rival, not just gone');
    cycle(bitten, [{ id: 'AL02', warm: 3 }], 'won_general');
    assert(
      !findMember(getMachine(bitten), 'AL02'),
      'somebody working the other side does not come back either'
    );

    // And it costs you on the ground next run.
    const s = createNewState({ seed: 7 });
    const before = s.groundsArr.reduce((n, g) => n + (g.rivalRap ?? 0), 0);
    const applied = applyPoachPenalty(s, bitten);
    const after = s.groundsArr.reduce((n, g) => n + (g.rivalRap ?? 0), 0);
    assert(applied > 0, `the poach hands the rival a head start (${applied})`);
    assert(after > before, `and it lands on real ground (${before} -> ${after})`);
    assert(
      s.log.some(l => /other side/.test(l.text)),
      'the player is told, by name, who is working against them'
    );
  }

  // No poached members, no penalty — a clean roster costs nothing.
  const clean = emptyLegacy();
  const cs = createNewState({ seed: 8 });
  assert(applyPoachPenalty(cs, clean) === 0, 'nothing lost, nothing owed');
}

if (failed) {
  console.error(`\nMachine harness FAILED — ${failed} assertion(s)`);
  process.exit(1);
}
console.log('\nThe Machine green.');
