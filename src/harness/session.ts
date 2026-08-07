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
import {
  SS05_CalendarSlot,
  SS08_Casework,
  SS09_SpeakerErrand,
  SS12_StudyRules,
  SS27_RibbonCircuit
} from '../data/session-plays.js';
import { selectGoalKey, formatGoalStrip, buildGoalStripInput } from '../ui/goal-strip.js';
import { createNewState } from '../engine/state.js';
import { setDefaultSeed, createRng, useRng } from '../engine/rng.js';
import type { RollResult } from '../engine/types.js';
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
  // SS* is the pipeline and survival kit; PO* is the policy/amendment kit added
  // with the Docket. The guard's job is to keep CAMPAIGN cards (PL*, MV*, WA*)
  // out of the chamber, so it widens to the legitimate session prefixes rather
  // than being deleted.
  const strayIds = playable.map(p => p.card.id).filter(id => !/^(SS|PO|MB)/.test(id));
  assert(
    strayIds.length === 0,
    `session menu is the session catalog only (stray: ${strayIds.join(', ') || 'none'})`
  );
  console.log('PASSED: listPlayableHand in session is SS*/PO* catalog');
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
  // --- THE SEAT MUST BE VISIBLE WHILE IT IS STILL SAVEABLE (DEFERRED A3) ---
  //
  // `districtStanding` was plumbed all the way into the goal strip's input and
  // then consulted by exactly no rule — the same computed-but-never-consulted
  // shape as `state.rivals`. Meanwhile a player who simply followed the odds
  // number printed on the card faces lost the seat in 186 of 186 measured
  // sessions. The advisor talked about the pipeline the whole way down.
  const base = {
    ...buildGoalStripInput(createNewState({ seed: 1 }), {
      shopAvailable: false,
      campPetitionVisible: false,
      campFeeVisible: false
    }),
    stage: 'session' as const,
    ap: 3,
    fieldAp: 0,
    billPipelineStage: 2,
    billStatus: 'in_committee',
    districtStanding: 70,
    challengerHeat: 0
  };

  assert(selectGoalKey(base) !== 'session_seat', 'a healthy seat does not cry wolf');
  assert(
    selectGoalKey({ ...base, districtStanding: 50 }) === 'session_seat',
    'soft standing is surfaced, not left in the log'
  );
  assert(
    selectGoalKey({ ...base, challengerHeat: 1 }) === 'session_seat',
    'a named challenger is surfaced the week it appears'
  );
  // It must outrank the bill copy: losing the seat ends the run, a stalled bill
  // does not.
  assert(
    selectGoalKey({ ...base, districtStanding: 50, billPipelineStage: 6 }) === 'session_seat',
    'the seat outranks the calendar'
  );
  // But not the "you cannot act" copy — a warning you cannot answer is noise.
  assert(
    selectGoalKey({ ...base, districtStanding: 50, ap: 0, fieldAp: 0 }) === 'session_ap0',
    'with no AP left the strip still says end the week'
  );
  // And the copy has to actually name the number and the answer.
  const row = formatGoalStrip({ ...base, districtStanding: 44, challengerHeat: 2 });
  assert(row.progress.includes('44'), `seat copy names the standing (got "${row.progress}")`);
  assert(row.progress.includes('2'), 'seat copy names the challenger heat');
  assert(/casework/i.test(row.next), 'seat copy names the answer');
  console.log('PASSED: a bleeding seat is visible in the goal strip while it can still be saved');
}

{
  // --- THE ODDS ON A CARD FACE MUST NOT LIE (DEFERRED A3) ---
  //
  // SS12 was SAFE, the highest odds in the catalog, repeatable without limit,
  // strictly positive, and its text said "no downside at all". Following the
  // printed signal meant playing it 27 turns out of 28 and losing the seat every
  // time. Diminishing the REWARD alone did not fix it — the bot kept spamming,
  // because the number on the face still said 0.9. The odds have to fall too.
  setDefaultSeed(88);
  const s = createNewState({ seed: 88 });
  enterSession(s);
  const first = SS12_StudyRules.odds!(s);
  s.sessionFlags.studyRulesReads = 3;
  const fourth = SS12_StudyRules.odds!(s);
  assert(first > 0.85, `the first read is still a strong play (${first})`);
  assert(
    fourth < first - 0.3,
    `a book you have read three times is a worse bet (${first} -> ${fourth})`
  );
  assert(fourth >= 0.3, 'but it never becomes a dead card');
  console.log('PASSED: SS12 odds decay with reads — the printed signal tells the truth');
}

{
  // --- DEFERRED B6: SS27 Ribbon-Cutting is not a free turtle ---
  // Same class of lie SS12 used to tell: SAFE, high odds, "never diminishes",
  // and an odds-following bot pinned standing for the whole session while the
  // bill never moved. Reward AND odds fall with circuits.
  setDefaultSeed(89);
  const s = createNewState({ seed: 89, nameID: 10 });
  enterSession(s);
  const firstOdds = SS27_RibbonCircuit.odds!(s);
  const beforeStand = s.districtStanding;
  const beforeName = s.nameID;
  // Force a breakthrough-tier payoff without the dice.
  const bt: RollResult = { tier: 0, p: 1, roll: 0, band: 0 };
  const firstText = SS27_RibbonCircuit.run!(s, bt);
  assert(
    s.districtStanding === beforeStand + 6,
    `first circuit standing +6 (got ${s.districtStanding - beforeStand})`
  );
  assert(s.nameID === beforeName + 2, 'first circuit +2 name ID');
  assert(/scissors/i.test(firstText), 'first circuit reads as the real event');

  s.sessionFlags.ribbonCircuits = 3;
  const lateOdds = SS27_RibbonCircuit.odds!(s);
  assert(firstOdds > 0.8, `first circuit odds are strong (${firstOdds})`);
  assert(
    lateOdds < firstOdds - 0.25,
    `a fourth ribbon is a worse bet (${firstOdds} -> ${lateOdds})`
  );
  assert(lateOdds >= 0.35, 'but the card never becomes dead ink');

  const standAt = s.districtStanding;
  const nameAt = s.nameID;
  SS27_RibbonCircuit.run!(s, bt);
  assert(
    s.districtStanding - standAt === 1,
    `late circuit standing is minimal (got +${s.districtStanding - standAt})`
  );
  assert(s.nameID === nameAt, 'late circuits stop minting name ID');
  console.log('PASSED: SS27 ribbon odds and payoffs decay — Act III is not scissors forever');
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
