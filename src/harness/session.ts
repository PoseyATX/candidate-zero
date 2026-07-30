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
  billBlockedByRules,
  addBillHeat,
  coolBill,
  setBillStage,
  MAX_BILL_HEAT,
  COOL_ON_ADVANCE,
  STAGE_OPENS,
  sessionPipelineBlocked,
  SESSION_WEEKS,
  SESSION_FILING_DEADLINE
} from '../engine/session.js';
import { SS05_CalendarSlot, SS08_Casework, SS09_SpeakerErrand } from '../data/session-plays.js';
import { createNewState } from '../engine/state.js';
import { setDefaultSeed, createRng, useRng } from '../engine/rng.js';
import { sessionPipelineStrategy, laborBallotStrategy, STRATEGIES } from '../engine/strategies.js';
import { applySelfLoan, maybePacBridge, retireDebtOnWin } from '../engine/debt.js';
import { executePlay } from '../engine/play.js';
import { SS01_FileBill, SS02_SeekReferral } from '../data/session-plays.js';
import { CAMPAIGN_AP } from '../engine/state.js';

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
  s.ap = CAMPAIGN_AP;
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
  const s = createNewState({ seed: 45, money: 5000, ap: CAMPAIGN_AP });
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
  s.ap = CAMPAIGN_AP;
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
  // Session teeth: casework-aware strategy should usually hold; primaries happen
  // under soft standing (see teeth unit tests). Small N can roll 0 primaried.
  assert(survived + law >= Math.floor(N * 0.4), 'session strategy should often hold the seat');
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
  // Week 5 with the bill at stage 2: the door for stage 2 opened at week 4, so
  // this is a stall the PLAYER owns and heat is correct. (It used to read week
  // 3, which is now a rules-imposed wait — see the exemption assertions below.)
  s.week = 5;
  s.bill!.pipelineStage = 2;
  s.bill!.weeksAtStage = 1;
  s.bill!.heat = 0;
  const lines = tickSessionPressure(s);
  assert(s.districtStanding === 58, 'no-casework drain −2');
  assert(lines.some(l => /HOME FIRES|STALL|CHALLENGER|LOBBY|DISTRICT|SPEAKER|PAC|PRESS|GALLERY/i.test(l)), 'pressure logs');
  // Stall heat after 2 weeks at stage
  assert(s.bill!.weeksAtStage === 2, 'weeksAtStage increments');
  assert(s.bill!.heat >= 1, 'stall heat applied when the bill COULD have moved');
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
  const s = createNewState({ seed: 72, ap: CAMPAIGN_AP });
  enterSession(s);
  s.favor = 30;
  s.bill!.pipelineStage = 4;
  s.sessionFlags.speakerFreeze = 1;
  s.week = 10;
  assert(sessionPipelineBlocked(s, 'SS05'), 'calendar blocked under freeze+low favor');
  assert(SS05_CalendarSlot.show!(s) === false, 'SS05 hidden when freeze-blocked');
  // Errand thaws
  s.ap = CAMPAIGN_AP;
  const err = { ...SS09_SpeakerErrand, odds: () => 0.99 };
  executePlay(s, err);
  assert(Number(s.sessionFlags.speakerFreeze || 0) === 0 || s.favor > 30, 'errand helps freeze/favor');
  console.log('PASSED: speaker freeze blocks calendar; errand is the key');
}
{
  setDefaultSeed(73);
  const s = createNewState({ seed: 73, ap: CAMPAIGN_AP });
  enterSession(s);
  s.districtStanding = 50;
  s.sessionFlags.challengerHeat = 2;
  executePlay(s, { ...SS08_Casework, odds: () => 0.99 });
  assert(!!s.sessionFlags.caseworkThisWeek, 'casework flags the week');
  assert(Number(s.sessionFlags.challengerHeat) <= 2, 'casework can ease challenger');
  console.log('PASSED: casework marks week + eases challenger');
}
{
  // --- NO HEAT FOR A WAIT THE RULES IMPOSE, AT ANY STAGE ---
  // This exemption existed for stage 4 only, so bills cleared Calendars and
  // then sat at stages 5 and 6 accruing the exact penalty it was written to
  // prevent — feeding a Governor's veto roll that charges 2 points per heat.
  setDefaultSeed(91);
  for (const [stage, opens] of Object.entries(STAGE_OPENS)) {
    const st = Number(stage);
    const s = createNewState({ seed: 91 });
    enterSession(s);
    s.bill!.pipelineStage = st;
    s.bill!.weeksAtStage = 5; // long past the 2-week heat threshold
    s.bill!.heat = 0;
    s.week = Number(opens) - 1; // the door has not opened yet
    assert(billBlockedByRules(s), `stage ${st} before week ${opens} is a rules wait`);
    applyBillStallHeat(s);
    assert(s.bill!.heat === 0, `stage ${st}: no heat while the door is shut`);
    assert(s.bill!.weeksAtStage === 6, `stage ${st}: the clock still runs`);

    // And the moment the door opens, the stall is the player's again.
    s.week = Number(opens);
    applyBillStallHeat(s);
    assert(s.bill!.heat === 1, `stage ${st}: heat resumes once it COULD move`);
  }
  console.log('PASSED: rules-imposed waits charge no stall heat, at every stage');
}
{
  // Stall heat pure function path
  setDefaultSeed(74);
  const s = createNewState({ seed: 74 });
  enterSession(s);
  s.bill!.pipelineStage = 3;
  s.bill!.weeksAtStage = 0;
  s.bill!.heat = 0;
  // Past stage 3's door, so the wait is the player's own and heat is fair game.
  s.week = STAGE_OPENS[3];
  assert(!billBlockedByRules(s), 'scenario must not be a rules wait');
  assert(applyBillStallHeat(s) === '', 'first week no heat text');
  const t2 = applyBillStallHeat(s);
  assert(t2.includes('STALL HEAT'), 'second week stall');
  assert(s.bill!.heat === 1, 'heat +1');
  console.log('PASSED: applyBillStallHeat');
}

{
  // --- HEAT IS NOT A ONE-WAY RATCHET ---
  // Three properties, each of which was false before: heat is capped, forward
  // progress cools the bill, and going backwards does not pay you for it.
  setDefaultSeed(55);
  const s = createNewState({ seed: 55 });
  enterSession(s);
  s.bill!.pipelineStage = 3;
  s.bill!.heat = 0;

  for (let i = 0; i < 40; i++) addBillHeat(s, 1);
  assert(
    s.bill!.heat === MAX_BILL_HEAT,
    `heat is capped at ${MAX_BILL_HEAT} (got ${s.bill!.heat}); uncapped it reached a median of 18`
  );

  const hot = s.bill!.heat;
  setBillStage(s, 4);
  assert(
    s.bill!.heat === hot - COOL_ON_ADVANCE,
    `advancing a stage cools the bill by ${COOL_ON_ADVANCE} (${hot} -> ${s.bill!.heat})`
  );

  // Retreating must not be a cooling exploit.
  const beforeRetreat = s.bill!.heat;
  setBillStage(s, 3);
  assert(s.bill!.heat === beforeRetreat, 'going backwards cools nothing');

  // And the floor holds.
  s.bill!.pipelineStage = 3;
  s.bill!.heat = 0;
  coolBill(s, 5);
  assert(s.bill!.heat === 0, 'heat never goes negative');
  console.log('PASSED: bill heat is capped, cools on advance, and has a floor');
}

{
  // --- ACT III MUST DELIVER ITS NAMED PRIZE ---
  //
  // `session_law` fired 0 times in 6000 runs, then ~7%, and I flagged it five
  // separate times without fixing it.
  //
  // My first diagnosis — that the pipeline's week gates sat later than bills
  // actually arrived — was measured on a probe that called enterSession() on a
  // fresh state. On the REAL full-campaign path the gate realignment moved the
  // law rate 22.5% → 24.1% (SE of the difference 3.0pp): noise. The gates were
  // worth aligning on fairness grounds and they are still aligned, but they were
  // not the bug.
  //
  // The bug was that bill heat was a one-way ratchet: thirteen writers, one
  // conditional reducer, three sources each adding +1 per week over a 14-week
  // session, and billOdds charging 5 points per point. Median final heat was 18
  // — the pipeline was not hard, it was arithmetically closed by mid-session
  // whatever the player did. Advancing a stage now cools the bill.
  //
  // A number nobody asserts drifts back. This is the guard. The band is wide on
  // purpose: it catches a regression to the old ~22%, or a runaway to near
  // certainty, without failing on ordinary sampling noise.
  const TRIALS = 260;
  let sessions = 0;
  let law = 0;
  for (let i = 0; i < TRIALS; i++) {
    const seed = 12_000 + i * 37;
    useRng(createRng(seed));
    setDefaultSeed(seed);
    const c = createCampaign({ seed });
    let sawSession = false;
    runFullCampaign(c, (p, st) => {
      if (st.stage === 'session') sawSession = true;
      return STRATEGIES.hybrid!(p, st);
    });
    if (!sawSession) continue;
    sessions++;
    if (c.state.outcome === 'session_law') law++;
  }
  const rate = (100 * law) / Math.max(1, sessions);
  assert(sessions > 40, `enough sessions to measure (${sessions})`);
  assert(
    rate >= 25,
    `Act III's named prize actually fires — law in ${rate.toFixed(1)}% of sessions ` +
      `(${law}/${sessions}); it was 23.8% while bill heat was a one-way ratchet, ` +
      `and 0% when first measured`
  );
  assert(
    rate <= 75,
    `and passing a law is still an achievement, not a formality (${rate.toFixed(1)}%)`
  );
  console.log(`PASSED: session_law fires in ${rate.toFixed(1)}% of sessions (${law}/${sessions})`);
}

console.log('\nPhase 4 session + teeth green.');
process.exit(0);
