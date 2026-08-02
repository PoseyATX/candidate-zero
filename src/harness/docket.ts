/**
 * The Docket — policy openings, provisions, and the floor coalition.
 * Run: npm run harness:docket
 *
 * The system this tests exists because of a measurement: 61% of the card corpus
 * only moved a number, `eventsFired` was read by zero cards, and `state.issue`
 * appeared in exactly ONE mechanical condition in the entire codebase. The world
 * could speak and nothing could hear it; the bill was a progress bar you could
 * not put anything into.
 *
 * So the assertions here are about consequence, not arithmetic:
 *   - a crisis leaves something a card can act on
 *   - the window really shuts, and shutting costs you
 *   - language really is a trade — members for heat and enemies
 *   - what you put in the bill really changes who votes for it
 */

import { createNewState } from '../engine/state.js';
import { createRng, setDefaultSeed, useRng } from '../engine/rng.js';
import { enterSession, tickSessionPressure, MAX_BILL_HEAT } from '../engine/session.js';
import {
  getDocket,
  liveOpenings,
  missedOpenings,
  openPolicy,
  openFromSeed,
  seedIssueOpening,
  takeOpening,
  takeBlockedReason,
  canTake,
  provisionSwing,
  provisionHeat,
  provisionFor,
  billIsShell,
  tickDocket,
  seedCampaignOpenings,
  MAX_LIVE_OPENINGS
} from '../engine/docket.js';
import { ISSUE_PROFILES, OPENING_SEEDS } from '../data/issue-profiles.js';
import { ISSUES } from '../data/setup.js';
import { POLICY_PLAYS } from '../data/policy-plays.js';
import { SESSION_PLAYS } from '../data/session-plays.js';
import { EV_SCREWWORM, OUTSIDE_EVENTS } from '../data/outside-events.js';
import { resolveOutsideEvent } from '../engine/outside.js';
import { executePlay } from '../engine/play.js';
import { createCampaign, runFullCampaign } from '../engine/loop.js';
import { STRATEGIES } from '../engine/strategies.js';
import type { GameState } from '../engine/types.js';

let failed = 0;
function assert(cond: boolean, msg: string): void {
  if (cond) console.log(`PASS: ${msg}`);
  else {
    console.error(`FAIL: ${msg}`);
    failed++;
  }
}

console.log('=== CANDIDATE ZERO — The Docket ===\n');

function session(issue = 'water', seed = 7): GameState {
  useRng(createRng(seed));
  setDefaultSeed(seed);
  const s = createNewState({ seed });
  // issueId is the mechanical key; `issue` is the display name that goes in the
  // epitaph. Setting only `issue` here seeded nothing and the whole docket came
  // back empty — exactly the bug this pass fixed in applySetup.
  s.issueId = issue;
  s.issue = issue;
  enterSession(s);
  return s;
}

// --- EVERY ISSUE IS NOW MECHANICAL ---
//
// Eighteen issues shipped as flavour labels; exactly one of them appeared in a
// mechanical condition anywhere. This asserts the gap is closed for ALL of them,
// not just the one I happened to wire.
{
  const missing = ISSUES.filter(i => !ISSUE_PROFILES[i.id]);
  assert(
    missing.length === 0,
    `every one of the ${ISSUES.length} issues has a mechanical profile (missing: ${missing.map(m => m.id).join(', ') || 'none'})`
  );
  for (const [id, p] of Object.entries(ISSUE_PROFILES)) {
    assert(p.openings.length > 0, `${id} can actually put something on the docket`);
    assert(p.grounds.length > 0 && p.attrs.length > 0, `${id} names turf that cares and work it takes`);
    assert(!!p.opposition && !!p.hard, `${id} names who fights it, by name`);
    for (const o of p.openings) {
      assert(!!o.provision, `${id}/${o.id} converts into real language`);
      assert(
        o.provision.ayes > 0 || o.provision.nays > 0,
        `${id}/${o.id} moves the floor — language nobody votes on is decoration`
      );
    }
  }
}

// --- YOUR ISSUE ALWAYS GIVES YOU A DOOR ---
{
  for (const issue of Object.keys(ISSUE_PROFILES)) {
    const s = session(issue);
    assert(
      liveOpenings(s).length >= 1,
      `${issue}: the session opens with a hearing you can work toward`
    );
  }
}

// --- THE SCREW WORM IS NO LONGER FORGOTTEN ---
//
// The specific failure that started this: the event fired, subtracted momentum,
// and left nothing any card could reach.
{
  const s = session('ag-subsidies');
  s.docket = [];
  const before = liveOpenings(s).length;
  resolveOutsideEvent(s, EV_SCREWWORM);
  const after = liveOpenings(s);
  assert(
    after.length > before,
    'the screw worm leaves a policy opening behind, not just a stat change'
  );
  const op = after.find(o => o.id === 'OP_AG_SCREWWORM');
  assert(!!op, 'and it is the quarantine authority specifically');
  assert(op?.source === EV_SCREWWORM.id, 'the docket records which crisis caused it');
  assert(
    s.log.some(l => /ON THE DOCKET/.test(l.text)),
    'and the player is told — an opening nobody hears about is no opening'
  );
}

// --- WINDOWS SHUT ---
{
  const s = session('water');
  s.docket = [];
  const o = openPolicy(s, {
    id: 'OP_TEST',
    n: 'A hearing',
    d: 'x',
    issueId: 'water',
    constituency: ['GR02'],
    opposition: 'somebody',
    weight: 1,
    source: 'test',
    window: 2
  })!;
  assert(!!o, 'an opening goes onto the docket');
  s.week = o.expiresWeek;
  assert(liveOpenings(s).length === 1, 'live on the last week of its window');
  const lines = tickDocket(s);
  assert(lines.some(l => /WINDOW CLOSES/.test(l)), 'the closing week is announced');
  s.week = o.expiresWeek + 1;
  assert(liveOpenings(s).length === 0, 'and then it is gone');
  assert(missedOpenings(s).length === 1, 'a missed window is remembered, not erased');
  assert(!canTake(s, 'OP_TEST'), 'you cannot take what has closed');
}

// --- THE DOCKET DOES NOT STACK INFINITELY ---
{
  const s = session('water');
  s.docket = [];
  for (let i = 0; i < MAX_LIVE_OPENINGS + 3; i++) {
    openPolicy(s, {
      id: `OP_F${i}`, n: `n${i}`, d: 'x', issueId: null,
      constituency: [], opposition: 'x', weight: 1, source: 'test'
    });
  }
  assert(
    liveOpenings(s).length === MAX_LIVE_OPENINGS,
    `no more than ${MAX_LIVE_OPENINGS} live hearings at once (got ${liveOpenings(s).length})`
  );
  const dup = openPolicy(s, {
    id: 'OP_F0', n: 'dup', d: 'x', issueId: null,
    constituency: [], opposition: 'x', weight: 1, source: 'test'
  });
  assert(dup === null, 'the same crisis does not stack a second copy of its own hearing');
}

// --- TAKING LANGUAGE IS A TRADE, NOT A GIFT ---
{
  const s = session('water');
  s.bill!.pipelineStage = 2;
  s.capital = 10;
  const o = liveOpenings(s)[0]!;
  const prov = provisionFor(o.id)!;
  assert(billIsShell(s), 'a filed bill starts as a shell — nothing in it');

  const capBefore = s.capital;
  const r = takeOpening(s, o.id, { id: 'PV_T', ...prov });
  assert(r.ok, `the amendment lands (${r.reason ?? 'ok'})`);
  // `weight` is a REQUIREMENT, not a spend. Deducting it double-charged every
  // amendment, because capital is also worth 2.8pp per point in billOdds on
  // every pipeline motion — so hanging language cost the capital AND the odds
  // that capital buys. Amended bills died in committee (mean stage 4.4 vs 4.9)
  // rather than at the desk. Capital is what MOVES a bill; the language is
  // written by staff. You need standing to be taken seriously, not to spend it.
  assert(s.capital === capBefore, 'standing is required to hang language, not consumed by it');
  s.capital = 0;
  assert(
    /Needs \d+ capital/.test(takeBlockedReason(s, liveOpenings(s)[0]?.id ?? 'none')) ||
      liveOpenings(s).length === 0,
    'but a member with no standing still cannot hang anything'
  );
  s.capital = capBefore;
  assert(!billIsShell(s), 'the bill now contains language');
  assert(provisionSwing(s) === prov.ayes - prov.nays, 'and brings a net bloc of members');
  assert(prov.nays > 0, 'every provision in the game costs somebody — power is never clean');
  assert(takeBlockedReason(s, o.id) === 'Already in the bill', 'you cannot bank the same language twice');
}

// --- LANGUAGE IS SET ONCE THE BILL IS OUT OF COMMITTEE ---
{
  const s = session('grid');
  s.capital = 10;
  s.bill!.pipelineStage = 6;
  const o = liveOpenings(s)[0]!;
  assert(
    takeBlockedReason(s, o.id) === 'Too late — the language is set',
    'you cannot rewrite the bill from the Senate floor'
  );
  s.bill!.pipelineStage = 0;
  assert(takeBlockedReason(s, o.id) === 'File the bill first', 'and you cannot amend a bill you never filed');
}

// --- CAPITAL IS A REAL GATE ---
{
  const s = session('vouchers');
  s.bill!.pipelineStage = 2;
  s.capital = 0;
  const o = liveOpenings(s)[0]!;
  assert(/Needs \d+ capital/.test(takeBlockedReason(s, o.id)), 'a broke member cannot buy language');
}

// --- THE FIRST CHOICE CARDS IN THE GAME ---
//
// RiskClass has carried 'CHOICE' since the beginning, with player-facing copy,
// against zero cards. A fork with dice attached is not a fork.
{
  const choice = POLICY_PLAYS.filter(c => c.risk === 'CHOICE');
  assert(choice.length > 0, `CHOICE-class cards now exist (${choice.length})`);
  for (const c of choice) {
    assert(c.odds === undefined, `${c.id} does not roll — a decision is not a gamble`);
  }
  assert(
    SESSION_PLAYS.some(c => c.id === 'PO01'),
    'and the amendment card is actually in the session catalog'
  );
}

// --- THE AMENDMENT CARD WORKS END TO END ---
{
  const s = session('hospitals');
  s.bill!.pipelineStage = 2;
  s.capital = 10;
  s.ap = 9;
  const before = provisionSwing(s);
  const controversyBefore = provisionHeat(s);
  const stallBefore = s.bill!.heat;
  const out = executePlay(s, POLICY_PLAYS.find(c => c.id === 'PO01')!);
  assert(out.ok, `PO01 resolves (${out.reason ?? 'ok'})`);
  assert(provisionSwing(s) > before, 'playing it puts real members on the board');
  assert(
    provisionHeat(s) > controversyBefore,
    'and draws controversy — the Governor reads the bill at the desk'
  );
  // Controversy is NOT stall heat. Routing it through bill heat measured mean
  // final heat 11.2 against a cap of 12 — billOdds charges 5pp a point, so
  // amended bills could not move and law fell 43.0% -> 8.7%. Language does not
  // slow a committee down; it makes the Governor angrier.
  assert(
    s.bill!.heat === stallBefore,
    `language does not slow the bill in committee (${stallBefore} -> ${s.bill!.heat})`
  );
}

// --- STRIPPING IS THE OTHER HALF ---
{
  const s = session('land');
  s.bill!.pipelineStage = 2;
  s.capital = 10;
  s.ap = 9;
  executePlay(s, POLICY_PLAYS.find(c => c.id === 'PO01')!);
  const swingHot = provisionSwing(s);
  const controversyHot = provisionHeat(s);
  s.ap = 9;
  const out = executePlay(s, POLICY_PLAYS.find(c => c.id === 'PO04')!);
  assert(out.ok, `PO04 resolves (${out.reason ?? 'ok'})`);
  assert(provisionHeat(s) < controversyHot, 'stripping takes the controversy out with the language');
  assert(provisionSwing(s) < swingHot, 'and gives the members back — no free retreat');
}

// --- HEAT FROM LANGUAGE OBEYS THE CAP ---
{
  const s = session('corruption');
  s.bill!.pipelineStage = 2;
  s.capital = 40;
  for (let i = 0; i < 12; i++) {
    const live = liveOpenings(s);
    if (!live.length) break;
    s.ap = 9;
    executePlay(s, POLICY_PLAYS.find(c => c.id === 'PO01')!);
  }
  assert(s.bill!.heat <= MAX_BILL_HEAT, `stall heat still obeys its cap (${s.bill!.heat})`);
  assert(
    provisionHeat(s) > 0,
    'and a bill full of language carries real controversy to the desk'
  );
}

// --- A MISSED WINDOW COSTS SOMETHING REAL ---
//
// The whole point of a deadline is that it can beat you.
{
  const s = session('broadband');
  s.bill!.pipelineStage = 2;
  s.capital = 10;
  const o = liveOpenings(s)[0]!;
  const couldHave = provisionFor(o.id)!;
  s.week = o.expiresWeek + 1;
  assert(!canTake(s, o.id), 'the window is shut');
  assert(
    couldHave.ayes > 0,
    `and the ${couldHave.ayes} members it would have brought are simply not there`
  );
  assert(provisionSwing(s) === 0, 'the bill goes to the floor with nothing behind it');
}

// --- SAVE SAFETY ---
{
  const s = session('taxes');
  s.bill!.pipelineStage = 2;
  s.capital = 10;
  s.ap = 9;
  executePlay(s, POLICY_PLAYS.find(c => c.id === 'PO01')!);
  const round = JSON.parse(JSON.stringify(s)) as GameState;
  assert(getDocket(round).length === getDocket(s).length, 'the docket survives a JSON round trip');
  assert(
    (round.bill?.provisions?.length ?? 0) === (s.bill?.provisions?.length ?? 0),
    'and so does the language in the bill'
  );
}

// --- WEEKLY PRESSURE ANNOUNCES CLOSURES ---
{
  const s = session('veterans');
  const o = liveOpenings(s)[0]!;
  s.week = o.expiresWeek;
  const lines = tickSessionPressure(s);
  assert(
    lines.some(l => /WINDOW CLOSES/.test(l)),
    'the weekly tick tells you a window shut, in the log the player reads'
  );
}

// --- OPENING SEEDS ARE UNIQUE ---
{
  const ids = Object.values(ISSUE_PROFILES).flatMap(p => p.openings.map(o => o.id));
  assert(new Set(ids).size === ids.length, `every opening id is unique (${ids.length})`);
  assert(
    Object.keys(OPENING_SEEDS).length === ids.length,
    'and the lookup table sees all of them'
  );
}

// --- EVERY OUTSIDE EVENT LEAVES A DOOR ---
//
// "Everywhere that a card could be played, there should be an opportunity to
// play it." Twenty-one outside events existed and exactly ONE named a policy
// opening; the other twenty changed two numbers and vanished. A world that acts
// on you and leaves nothing to act on is weather, not a place.
{
  const missing = OUTSIDE_EVENTS.filter(e => !e.opens?.length);
  assert(
    missing.length === 0,
    `every outside event names a policy opening (missing: ${missing.map(m => m.id).join(', ') || 'none'})`
  );
  const dangling: string[] = [];
  for (const e of OUTSIDE_EVENTS) {
    for (const id of e.opens ?? []) if (!OPENING_SEEDS[id]) dangling.push(`${e.id}->${id}`);
  }
  assert(dangling.length === 0, `and every named door actually exists (${dangling.join(', ') || 'none'})`);
}

// --- WHAT YOU RAN ON ARRIVES WITH YOU ---
//
// Most events fire during the primary and general, when no chamber is sitting.
// The grievance has to travel, or the world is inert for two-thirds of the game.
{
  const s = session('water');
  s.docket = [];
  s.eventsFired = { EV_PLANT_LAYOFF: true, EV_HEAT_DOME: true };
  const opened = seedCampaignOpenings(s);
  assert(opened.length === 2, `campaign crises become session hearings (${opened.length})`);
  assert(
    opened.some(o => o.id === 'OP_LAYOFF_NOTICE'),
    'the plant closing you campaigned through is a bill you can file'
  );
  assert(
    opened.every(o => OUTSIDE_EVENTS.some(e => e.id === o.source)),
    'and the docket records which crisis each door came from'
  );

  // Nothing fired, nothing arrives.
  const quiet = session('water', 33);
  quiet.docket = [];
  quiet.eventsFired = {};
  assert(seedCampaignOpenings(quiet).length === 0, 'a quiet campaign brings no grievances');
}

// --- AMENDING MUST NOT BE A TRAP ---
//
// The first three versions of this system were all traps, each for a different
// reason, and only measurement found them:
//
//   1. Provision heat fed billOdds, which charges 5pp per point against a cap of
//      12. Amended bills reached mean heat 11.2 and physically could not move
//      through committee: law 43.0% -> 8.7%.
//   2. With controversy moved to the Governor's desk, language still cost the
//      action points that move the bill and bought only one roll: 43.0% -> 32.6%.
//   3. Only once a floor margin also SHIELDED against the veto did the trade
//      balance — a governor does not veto a bill that came off the floor 120-25.
//
// Measured at n=800 runs / 253 sessions: base 40.3% law, amending 35.2%
// (difference 5.1pp against 4.3pp of 2 SE — inside noise), veto 23% -> 17%,
// seat held 98.0% -> 99.6%. Language is roughly passage-neutral, buys delivery
// and seat security, and costs tempo. That is a fork, not a tax.
//
// The gate runs small, so it asserts only that the trap has not come back.
{
  const N = 220;
  const PIPELINE = new Set(['SS01', 'SS02', 'SS03', 'SS04', 'SS05', 'SS06', 'SS07']);
  function lawRate(amend: boolean): { law: number; withLanguage: number } {
    let sessions = 0;
    let law = 0;
    let lang = 0;
    for (let i = 0; i < N; i++) {
      const seed = 30_000 + i * 29;
      useRng(createRng(seed));
      setDefaultSeed(seed);
      const c = createCampaign({ seed });
      let saw = false;
      runFullCampaign(c, (playable, st) => {
        const base = STRATEGIES.hybrid!(playable, st);
        if (st.stage !== 'session') return base;
        saw = true;
        if (!amend) return base;
        const idx = typeof base === 'number' ? base : base?.index;
        const card = playable.find(p => p.index === idx)?.card;
        if (card && PIPELINE.has(card.id)) return base;
        const po = playable.find(p => p.card.id === 'PO01');
        return po ? po.index : base;
      });
      if (!saw) continue;
      sessions++;
      if (c.state.outcome === 'session_law') law++;
      if ((c.state.bill?.provisions?.length ?? 0) > 0) lang++;
    }
    return { law: (100 * law) / Math.max(1, sessions), withLanguage: (100 * lang) / Math.max(1, sessions) };
  }
  const plain = lawRate(false);
  const amended = lawRate(true);
  console.log(
    `  amendment EV probe (n=${N}): clean ${plain.law.toFixed(1)}% law · ` +
      `amending ${amended.law.toFixed(1)}% law, ${amended.withLanguage.toFixed(0)}% of bills carried language`
  );
  assert(
    amended.withLanguage > 50,
    `a member who tries to legislate actually gets language into the bill (${amended.withLanguage.toFixed(0)}%)`
  );
  assert(
    amended.law >= plain.law - 15,
    `amending is not a trap — clean ${plain.law.toFixed(1)}% vs amended ${amended.law.toFixed(1)}%; ` +
      `it cost 34pp when provision heat fed billOdds, which is the regression this catches`
  );
}

if (failed) {
  console.error(`\nDocket harness FAILED — ${failed} assertion(s)`);
  process.exit(1);
}
console.log('\nThe Docket green — the world can speak and the bill can listen.');
