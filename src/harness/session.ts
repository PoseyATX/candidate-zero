/**
 * Phase 4 — Session stage harness.
 * Run: npm run harness:session
 */

import {
  createCampaign,
  listPlayableHand,
  runFullCampaign,
  runWeek
} from '../engine/loop.js';
import {
  enterSession,
  billStageLabel,
  onSessionWeekAdvance,
  tickSessionPressure,
  applyBillStallHeat,
  sessionPipelineBlocked,
  SESSION_WEEKS,
  SESSION_FILING_DEADLINE
} from '../engine/session.js';
import { SS05_CalendarSlot, SS08_Casework, SS09_SpeakerErrand } from '../data/session-plays.js';
import { createNewState } from '../engine/state.js';
import { setDefaultSeed, createRng, useRng } from '../engine/rng.js';
import { sessionPipelineStrategy, laborBallotStrategy } from '../engine/strategies.js';
import { applySelfLoan, maybePacBridge, retireDebtOnWin } from '../engine/debt.js';
import { executePlay } from '../engine/play.js';
import { SS01_FileBill, SS02_SeekReferral } from '../data/session-plays.js';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error('FAIL: ' + msg);
}

console.log('=== CANDIDATE ZERO — Phase 4 Session Harness ===\n');

// Enter session from post-general state
{
  setDefaultSeed(42);
  const s = createNewState({ seed: 42, nameID: 30, money: 2000 });
  s.issue = 'water';
  s.persona = 'The Teacher';
  const { text } = enterSession(s);
  assert(s.stage === 'session', 'stage session');
  assert(s.week === 1 && s.weeksTotal === SESSION_WEEKS, 'session calendar');
  assert(s.bill !== null && s.bill.pipelineStage === 0, 'draft bill');
  assert(s.bill!.issueId === 'water', 'issue-linked bill');
  assert(s.committee !== null, 'committee assigned');
  assert(s.over === false, 'not over on entry');
  assert(/SESSION|sworn/i.test(text), 'entry text');
  console.log('PASSED: enterSession assigns committee + unfiled issue bill');
}

// Filing deadline kills unfiled bill
{
  setDefaultSeed(43);
  const s = createNewState({ seed: 43 });
  enterSession(s);
  s.week = SESSION_FILING_DEADLINE;
  onSessionWeekAdvance(s);
  assert(s.bill!.pipelineStage === -1, 'unfiled dies at deadline');
  assert(s.bill!.status === 'dead', 'status dead');
  console.log('PASSED: filing deadline kills unfiled signature bill');
}

// File the bill via play
{
  setDefaultSeed(44);
  useRng(createRng(44));
  const s = createNewState({ seed: 44 });
  enterSession(s);
  s.ap = 2;
  const file = { ...SS01_FileBill, odds: () => 0.99 };
  const r = executePlay(s, file);
  assert(r.ok, 'file play ok: ' + r.reason);
  assert(s.bill!.pipelineStage === 1, 'filed stage 1');
  assert(s.bill!.status === 'filed', 'status filed');
  console.log('PASSED: SS01 File the Bill advances pipeline');
}

// PAC claim bites on referral
{
  setDefaultSeed(45);
  const s = createNewState({ seed: 45, money: 5000, ap: 4 });
  applySelfLoan(s, 3000);
  maybePacBridge(s, 3000);
  retireDebtOnWin(s);
  enterSession(s);
  assert(
    !!(s.sessionFlags.pac_lender_claim || s.obls.includes('OB1')),
    'PAC claim on entry'
  );
  s.bill!.pipelineStage = 1;
  s.bill!.status = 'filed';
  s.week = 2;
  s.ap = 2;
  const standing0 = s.districtStanding;
  const ref = { ...SS02_SeekReferral, odds: () => 0.99 };
  executePlay(s, ref);
  assert(
    s.districtStanding < standing0 || !!s.sessionFlags.pac_claim_paid,
    'PAC collected or paid'
  );
  console.log('PASSED: PAC claim bites on Seek Referral (district / discharge)');
}

// Session playable list is SS* only
{
  setDefaultSeed(46);
  const c = createCampaign({ seed: 46 });
  enterSession(c.state);
  const playable = listPlayableHand(c);
  assert(playable.length > 0, 'session has plays');
  assert(
    playable.every(p => p.card.id.startsWith('SS')),
    'session menu is SS* only'
  );
  console.log('PASSED: listPlayableHand in session is SS* catalog');
}

// Pipeline strategy reaches sine die with a terminal session outcome
{
  const N = 12;
  let law = 0;
  let survived = 0;
  let primaried = 0;
  for (let i = 0; i < N; i++) {
    const seed = 5000 + i * 3;
    useRng(createRng(seed));
    setDefaultSeed(seed);
    const c = createCampaign({ seed });
    enterSession(c.state);
    c.state.ap = c.state.apMax;
    let guard = 40;
    while (!c.state.over && guard-- > 0) {
      runWeek(c, sessionPipelineStrategy);
    }
    assert(c.state.over, `seed ${seed} should end`);
    const o = c.state.outcome;
    if (o === 'session_law') law++;
    else if (o === 'session_survived') survived++;
    else if (o === 'session_primaried') primaried++;
    else throw new Error(`unexpected outcome ${o} seed ${seed}`);
  }
  console.log('Session pipeline (n=%d):', N, { law, survived, primaried });
  assert(law + survived + primaried === N, 'session outcomes partition');
  // Session teeth: pure bill-grind without casework used to free-win the seat;
  // with casework in the strategy, some holds must remain possible.
  assert(survived + law >= 1, 'session strategy with casework should sometimes hold the seat');
  assert(primaried >= 1, 'session teeth should still primary someone');
  console.log('PASSED: sine die produces session_law | session_survived | session_primaried');
}

// Full labor campaign can reach session outcomes (smoke)
{
  useRng(createRng(9001));
  setDefaultSeed(9001);
  const c = createCampaign({ seed: 9001 });
  c.state.nameID = 40;
  c.state.contacts = 400;
  c.state.endorsePts = 5;
  c.state.volPool = 6;
  c.state.ballot = true;
  runFullCampaign(c, laborBallotStrategy);
  assert(c.state.over, 'full campaign ends');
  console.log('Sample full labor outcome:', c.state.outcome, 'bill:', billStageLabel(c.state.bill));
  console.log('PASSED: full campaign terminates after session path exists');
}

// --- Session teeth ---
{
  setDefaultSeed(70);
  useRng(createRng(70));
  const s = createNewState({ seed: 70 });
  enterSession(s);
  s.districtStanding = 60;
  s.sessionFlags.caseworkThisWeek = false;
  s.week = 3;
  s.bill!.pipelineStage = 2;
  s.bill!.weeksAtStage = 1;
  s.bill!.heat = 0;
  const lines = tickSessionPressure(s);
  assert(s.districtStanding === 58, 'no-casework drain −2');
  assert(lines.some(l => /HOME FIRES|STALL|CHALLENGER|LOBBY|DISTRICT|SPEAKER|PAC|PRESS|GALLERY/i.test(l)), 'pressure logs');
  // Stall heat after 2 weeks at stage
  assert(s.bill!.weeksAtStage === 2, 'weeksAtStage increments');
  assert(s.bill!.heat >= 1, 'stall heat applied');
  console.log('PASSED: casework-or-bleed + stall heat');
}
{
  setDefaultSeed(71);
  const s = createNewState({ seed: 71 });
  enterSession(s);
  s.districtStanding = 48;
  s.sessionFlags.caseworkThisWeek = true;
  s.week = 4;
  tickSessionPressure(s);
  assert(s.districtStanding === 47, 'casework week only −1');
  assert(Number(s.sessionFlags.challengerHeat || 0) >= 1, 'challenger heat when soft standing');
  console.log('PASSED: challenger heat on soft standing');
}
{
  setDefaultSeed(72);
  useRng(createRng(72));
  const s = createNewState({ seed: 72, ap: 2 });
  enterSession(s);
  s.favor = 30;
  s.bill!.pipelineStage = 4;
  s.sessionFlags.speakerFreeze = 1;
  s.week = 10;
  assert(sessionPipelineBlocked(s, 'SS05'), 'calendar blocked under freeze+low favor');
  assert(SS05_CalendarSlot.show!(s) === false, 'SS05 hidden when freeze-blocked');
  // Errand thaws
  s.ap = 2;
  const err = { ...SS09_SpeakerErrand, odds: () => 0.99 };
  executePlay(s, err);
  assert(Number(s.sessionFlags.speakerFreeze || 0) === 0 || s.favor > 30, 'errand helps freeze/favor');
  console.log('PASSED: speaker freeze blocks calendar; errand is the key');
}
{
  setDefaultSeed(73);
  const s = createNewState({ seed: 73, ap: 2 });
  enterSession(s);
  s.districtStanding = 50;
  s.sessionFlags.challengerHeat = 2;
  executePlay(s, { ...SS08_Casework, odds: () => 0.99 });
  assert(!!s.sessionFlags.caseworkThisWeek, 'casework flags the week');
  assert(Number(s.sessionFlags.challengerHeat) <= 2, 'casework can ease challenger');
  console.log('PASSED: casework marks week + eases challenger');
}
{
  // Stall heat pure function path
  setDefaultSeed(74);
  const s = createNewState({ seed: 74 });
  enterSession(s);
  s.bill!.pipelineStage = 3;
  s.bill!.weeksAtStage = 0;
  s.bill!.heat = 0;
  assert(applyBillStallHeat(s) === '', 'first week no heat text');
  const t2 = applyBillStallHeat(s);
  assert(t2.includes('STALL HEAT'), 'second week stall');
  assert(s.bill!.heat === 1, 'heat +1');
  console.log('PASSED: applyBillStallHeat');
}

console.log('\nPhase 4 session + teeth green.');
process.exit(0);
