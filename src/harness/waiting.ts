/**
 * Waiting season + higher-office path harness.
 * Run: npm run harness:waiting
 */

import { createNewState } from '../engine/state.js';
import {
  enterWaiting,
  finishWaiting,
  WAITING_WEEKS,
  bankWaiting
} from '../engine/waiting.js';
import { WAITING_PLAYS } from '../data/waiting-plays.js';
import { executePlay } from '../engine/play.js';
import { advanceCampaignWeek } from '../engine/calendar.js';
import { emptyLegacy, buildPaths, PATH_TO_WAITING_LOOP } from '../engine/legacy.js';
import { LOOPS } from '../data/starmap/loops.js';
import {
  createCampaign,
  continueAfterWaiting,
  nextCycleSeed,
  listPlayableHand,
  type Campaign
} from '../engine/loop.js';
import { createRng, setDefaultSeed, useRng } from '../engine/rng.js';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error('FAIL: ' + msg);
}

console.log('=== CANDIDATE ZERO — Waiting Season ===\n');

assert(WAITING_PLAYS.length >= 8, 'waiting kit size');
assert(WAITING_WEEKS === 4, 'compressed season');

// Enter waiting
{
  const s = createNewState({ seed: 1, contacts: 50, nameID: 10 });
  s.outcome = 'lost_primary';
  const { text } = enterWaiting(s, 'perennial');
  assert(s.stage === 'waiting', 'stage waiting');
  assert(s.over === false, 'not over during waiting');
  assert(s.apMax === 1 && s.ap === 1, '1 AP');
  assert(s.waitingPathId === 'perennial', 'path');
  assert(s.waitingLoopId === 'LOOP_WAITING_PERENNIAL', 'loop');
  assert(/WAITING SEASON/i.test(text), 'entry text');
  console.log('PASSED: enterWaiting');
}

// Path-scoped plays
{
  const s = createNewState({ seed: 2 });
  enterWaiting(s, 'advocate');
  const vis = WAITING_PLAYS.filter(c => c.show?.(s));
  assert(vis.some(c => c.id === 'WA02'), 'advocate gets forum');
  assert(vis.some(c => c.id === 'WA01'), 'universal list');
  assert(!vis.some(c => c.id === 'WA03'), 'no staffer bag');
  enterWaiting(s, 'staffer');
  const vis2 = WAITING_PLAYS.filter(c => c.show?.(s));
  assert(vis2.some(c => c.id === 'WA03'), 'staffer bag');
  console.log('PASSED: path-scoped WA* visibility');
}

// Play banks
{
  useRng(createRng(3));
  setDefaultSeed(3);
  const s = createNewState({ seed: 3, ap: 1, contacts: 0, nameID: 0 });
  enterWaiting(s, 'perennial');
  const card = WAITING_PLAYS.find(c => c.id === 'WA01')!;
  const r = executePlay(s, { ...card, odds: () => 0.99 });
  assert(r.ok, 'WA01 ok');
  assert(Number(s.sessionFlags.waitBankContacts) > 0, 'bank contacts');
  assert(s.contacts > 0, 'live contacts too');
  console.log('PASSED: bankWaiting via WA01');
}

// Season complete → legacy carry
{
  useRng(createRng(4));
  setDefaultSeed(4);
  const s = createNewState({ seed: 4, ap: 1 });
  enterWaiting(s, 'home');
  bankWaiting(s, { contacts: 20, nameID: 3, vol: 2 });
  s.week = WAITING_WEEKS;
  const leg = emptyLegacy();
  const t = advanceCampaignWeek(s);
  assert(t.kind === 'waiting_complete', 'waiting_complete transition');
  finishWaiting(s, leg);
  assert(s.over === true, 'over after finish');
  assert(leg.carry.waitingContacts === 20, 'carry contacts');
  assert(leg.carry.waitingNameID === 3, 'carry name');
  assert(leg.carry.waitingVols === 2, 'carry vols');
  assert(leg.carry.waitingLoopId === 'LOOP_WAITING_HOME', 'loop on carry');
  console.log('PASSED: finishWaiting banks carry');
}

// Higher-office paths gated
{
  const s = createNewState({ seed: 5, capital: 8, nameID: 30 });
  s.outcome = 'session_law';
  s.stage = 'session';
  const paths = buildPaths(s, 60);
  assert(paths.some(p => p.id === 'senate'), 'senate path after session_law');
  const senateLoop = PATH_TO_WAITING_LOOP.senate;
  assert(!!senateLoop && !!LOOPS[senateLoop], 'senate loop exists');
  console.log('PASSED: higher-office path gates');
}

// listPlayableHand in waiting
{
  useRng(createRng(6));
  setDefaultSeed(6);
  const c = createCampaign({ seed: 6 }) as Campaign;
  enterWaiting(c.state, 'exmember');
  const playable = listPlayableHand(c);
  assert(playable.length > 0, 'waiting plays');
  assert(playable.every(p => p.card.id.startsWith('WA')), 'WA* only');
  console.log('PASSED: listPlayableHand waiting kit');
}

// Re-file after waiting: same persona, banks applied, deterministic seed
{
  useRng(createRng(7));
  setDefaultSeed(7);
  const c0 = createCampaign({
    seed: 7,
    setup: { personaId: 'teacher', issueId: 'taxes', districtId: 'open', regionId: 'east' }
  });
  assert(c0.state.seed === 7, 'seed stored on state');
  assert(c0.state.personaId === 'teacher', 'teacher setup');
  enterWaiting(c0.state, 'perennial');
  bankWaiting(c0.state, { contacts: 40, nameID: 5, money: 100 });
  const leg = emptyLegacy();
  finishWaiting(c0.state, leg);
  assert(leg.carry.waitingContacts === 40, 'banked contacts');
  const nextSeed = nextCycleSeed(7);
  assert(nextSeed !== 7 && nextSeed > 0, 'nextCycleSeed advances');
  assert(nextCycleSeed(7) === nextSeed, 'nextCycleSeed pure');
  const c1 = continueAfterWaiting(c0, leg);
  assert(c1.setup.personaId === 'teacher', 'same persona setup');
  assert(c1.state.personaId === 'teacher', 'same personaId on state');
  assert(c1.state.seed === nextSeed, 'deterministic refile seed');
  assert(c1.state.contacts >= 40, 'waiting contacts applied via applyLegacy');
  assert(c1.state.nameID >= 5 + 2, 'waiting name applied (plus baseline)'); // baseline nameID 2 + bank
  // Same inputs → same next seed / persona
  const c2 = continueAfterWaiting(c0, leg);
  assert(c2.state.seed === c1.state.seed, 'refile seed stable');
  assert(c2.state.personaId === c1.state.personaId, 'refile persona stable');
  console.log('PASSED: continueAfterWaiting re-file (same persona, banks, seed)');
}

console.log('\nWaiting season green.');
process.exit(0);
