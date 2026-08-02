/**
 * The Statute Book — laws that outlive the run that passed them.
 * Run: npm run harness:laws
 *
 * The complaint this answers, in the owner's words: "Bill is filed and means
 * nothing." It was true. `session_law` set an outcome string that fed a share
 * number, two trait gates and an epitaph, and then the next campaign began in a
 * world where nothing you had ever done existed.
 *
 * A statute has to do three things or it is still a trophy:
 *   1. persist, with the language that actually made it in
 *   2. pay at home, where delivering is how members survive
 *   3. be losable — a win you cannot lose is a high score, not a win
 */

import { createNewState } from '../engine/state.js';
import { createRng, setDefaultSeed, useRng } from '../engine/rng.js';
import { enterSession } from '../engine/session.js';
import { applyLegacy, recordRun, emptyLegacy } from '../engine/legacy.js';
import {
  recordLaw,
  standingLaws,
  getLaws,
  lawGoodwill,
  servedGrounds,
  repealLaw,
  mostExposedLaw,
  statuteBookLine,
  MAX_GOODWILL,
  GOODWILL_PER_PROVISION,
  type EnactedLaw
} from '../engine/laws.js';
import { liveOpenings, seedLawOpenings, lawWasDefended, takeOpening, provisionFor } from '../engine/docket.js';
import type { GameState, LegacyState, Provision } from '../engine/types.js';

let failed = 0;
function assert(cond: boolean, msg: string): void {
  if (cond) console.log(`PASS: ${msg}`);
  else {
    console.error(`FAIL: ${msg}`);
    failed++;
  }
}

console.log('=== CANDIDATE ZERO — The Statute Book ===\n');

function prov(over: Partial<Provision> = {}): Provision {
  return {
    id: 'PV_X',
    n: 'Indemnity fund for quarantined herds',
    d: 'x',
    fromOpening: 'OP_AG_SCREWWORM',
    ayes: 16,
    nays: 7,
    heat: 2,
    rewards: 'GR02',
    angers: 'the feedlot consolidators',
    ...over
  };
}

function sessionState(seed = 11): GameState {
  useRng(createRng(seed));
  setDefaultSeed(seed);
  const s = createNewState({ seed });
  s.issueId = 'ag-subsidies';
  s.issue = 'Ag subsidies & crop insurance';
  s.persona = 'The Teacher';
  enterSession(s);
  return s;
}

// --- 1. A LAW PERSISTS, WITH ITS LANGUAGE ---
{
  const legacy: LegacyState = emptyLegacy();
  const s = sessionState();
  s.bill!.provisions = [prov()];
  const law = recordLaw(legacy, s, 1);
  assert(!!law, 'a signed bill goes into the book');
  assert(getLaws(legacy).length === 1, 'and the book has it');
  assert(law!.provisions.length === 1, 'with the language that actually made it in');
  assert(law!.serves.includes('GR02'), 'and a record of who it served');
  assert(law!.sponsor === 'The Teacher', 'and who carried it');

  const round = JSON.parse(JSON.stringify(legacy)) as LegacyState;
  assert(getLaws(round).length === 1, 'the book survives a JSON round trip');
}

// --- 2. A SHELL STATUTE IS STILL A STATUTE, AND STILL WORTH NOTHING AT HOME ---
{
  const legacy: LegacyState = emptyLegacy();
  const s = sessionState();
  s.bill!.provisions = [];
  const law = recordLaw(legacy, s, 1);
  assert(!!law, 'passing an empty bill is still a real law with your name on it');
  assert(law!.serves.length === 0, 'but it served nobody in particular');
  assert(lawGoodwill(legacy) === 0, 'and buys nothing at home — a line in an obituary');
}

// --- 3. THE RECORD PAYS AT HOME ---
{
  const legacy: LegacyState = emptyLegacy();
  const s = sessionState();
  s.bill!.provisions = [prov(), prov({ id: 'PV_Y', rewards: 'GR06' })];
  recordLaw(legacy, s, 1);
  assert(
    lawGoodwill(legacy) === 2 * GOODWILL_PER_PROVISION,
    `two provisions are worth ${2 * GOODWILL_PER_PROVISION} standing`
  );
  assert(servedGrounds(legacy).sort().join(',') === 'GR02,GR06', 'and both counties are named');

  // It reaches a NEW run, which is the entire point.
  const next = createNewState({ seed: 99 });
  const before = next.districtStanding;
  const rapBefore = next.groundsArr.find(g => g.id === 'GR02')!.rapport;
  applyLegacy(next, legacy);
  assert(next.districtStanding > before, 'the next campaign starts warmer for it');
  assert(
    (next.groundsArr.find(g => g.id === 'GR02')!.rapport ?? 0) > rapBefore,
    'and the county it served knows you before you knock'
  );
  assert(
    next.log.some(l => /YOUR RECORD/.test(l.text)),
    'and the player is told why — an invisible bonus teaches nothing'
  );
  assert((next.carriedLaws ?? []).length === 1, 'the run carries the book into the session');
}

// --- 4. A LONG CAREER IS HARD TO BEAT, NOT IMPOSSIBLE ---
{
  const legacy: LegacyState = emptyLegacy();
  const s = sessionState();
  s.bill!.provisions = [prov(), prov({ id: 'B' }), prov({ id: 'C' }), prov({ id: 'D' })];
  for (let i = 1; i <= 6; i++) recordLaw(legacy, s, i);
  assert(lawGoodwill(legacy) === MAX_GOODWILL, `goodwill is capped at ${MAX_GOODWILL}`);
}

// --- 5. YOUR OWN LAWS RAISE THIS SESSION'S FIGHTS ---
{
  const legacy: LegacyState = emptyLegacy();
  const past = sessionState();
  past.bill!.provisions = [prov()];
  recordLaw(legacy, past, 1);

  const s = createNewState({ seed: 21 });
  s.issueId = 'ag-subsidies';
  applyLegacy(s, legacy);
  enterSession(s);
  const reauth = liveOpenings(s).filter(o => o.id.startsWith('OP_REAUTH_'));
  assert(reauth.length === 1, 'a statute of yours comes up for renewal');
  assert(
    reauth[0]!.opposition.includes('feedlot'),
    'fought by the people the language beat the first time'
  );
  assert(
    s.log.some(l => /THE BOOK/.test(l.text)),
    'and the chamber log opens with your record'
  );

  // It converts into real language generated from the statute itself.
  const p = provisionFor(reauth[0]!.id, s);
  assert(!!p, 'the reauthorization has language to pass');
  assert((p?.ayes ?? 0) > 0, 'that brings members');
  assert(!lawWasDefended(s, 'LAW_ag-subsidies_1'), 'undefended until you spend the actions');

  s.bill!.pipelineStage = 2;
  s.capital = 10;
  takeOpening(s, reauth[0]!.id, { id: 'PV_R', ...p! });
  assert(lawWasDefended(s, 'LAW_ag-subsidies_1'), 'defending it is a thing you DO, not a thing you have');
}

// --- 6a. REPEAL IS SOMEBODY'S CAMPAIGN, NOT THE WEATHER ---
//
// The first version of this was a flat roll: a statute quietly vanished between
// runs with nothing behind it. Nobody in Texas loses a fight to "circumstances"
// — they lose it to a person who filed against them and said so out loud at
// every Rotary lunch for eighteen months.
{
  useRng(createRng(4141));
  setDefaultSeed(4141);
  const legacy = emptyLegacy();
  const past = sessionState(4141);
  past.bill!.provisions = [prov({ nays: 18 })];
  recordLaw(legacy, past, 1);
  legacy.runs.push({ epithet: 'passed it', kind: 'session_law' });

  const s = createNewState({ seed: 4242 });
  applyLegacy(s, legacy);
  assert(!!legacy.rival, 'a rival exists to run the campaign');
  assert(
    legacy.rival!.repealTarget === 'LAW_ag-subsidies_1',
    'they adopt your most exposed statute as their platform'
  );
  assert(!!legacy.rival!.repealPitch, 'and it reads like a yard sign, not a stat');
  assert(
    legacy.rival!.repealPitch!.includes(legacy.rival!.name),
    'with their NAME on it — the whole point is that it has a face'
  );
  assert(
    s.log.some(l => /THE OTHER SIDE/.test(l.text)),
    'and the player is told before the session, not after the loss'
  );

  // A law nobody is campaigning against does not evaporate.
  const quiet = emptyLegacy();
  const q = sessionState(4343);
  q.bill!.provisions = [prov({ nays: 18 })];
  recordLaw(quiet, q, 1);
  quiet.runs.push({ epithet: 'x', kind: 'session_law' });
  let struckWithoutCampaign = 0;
  for (let i = 0; i < 150; i++) {
    useRng(createRng(6000 + i));
    setDefaultSeed(6000 + i);
    const lg = emptyLegacy();
    const p2 = sessionState(6000 + i);
    p2.bill!.provisions = [prov({ nays: 18 })];
    recordLaw(lg, p2, 1);
    lg.runs.push({ epithet: 'x', kind: 'session_law' });
    // No rival campaign adopted — settle straight away.
    if (lg.rival) lg.rival.repealTarget = undefined;
    const st = sessionState(6500 + i);
    st.outcome = 'session_survived';
    recordRun(lg, st, 'session_survived', 50);
    if (standingLaws(lg).length === 0) struckWithoutCampaign++;
  }
  assert(
    struckWithoutCampaign === 0,
    `no campaign, no repeal — statutes do not evaporate on their own (${struckWithoutCampaign})`
  );
}

// --- 6. A WIN YOU CANNOT LOSE IS A HIGH SCORE ---
{
  // A statute that beat a lot of people, left undefended across many sessions,
  // must sometimes be struck. Measured rather than asserted on one roll.
  let struckAtLeastOnce = 0;
  const TRIALS = 200;
  for (let i = 0; i < TRIALS; i++) {
    useRng(createRng(500 + i));
    setDefaultSeed(500 + i);
    const legacy: LegacyState = emptyLegacy();
    const past = sessionState(500 + i);
    past.bill!.provisions = [prov({ nays: 18 })];
    recordLaw(legacy, past, 1);
    // The cycle that passed it is now history, so the NEXT recordRun is run 2.
    // Without this the law and the run share an index and settleRepeals
    // correctly treats it as "passed this very session" and leaves it alone.
    legacy.runs.push({ epithet: 'passed it', kind: 'session_law' });
    // The rival runs on striking it — repeal is their project now.
    const carrier = createNewState({ seed: 700 + i });
    applyLegacy(carrier, legacy);
    // A later run in which the player never reauthorizes it.
    const s = sessionState(700 + i);
    s.outcome = 'session_survived';
    recordRun(legacy, s, 'session_survived', 50);
    if (standingLaws(legacy).length === 0) struckAtLeastOnce++;
  }
  const rate = (100 * struckAtLeastOnce) / TRIALS;
  console.log(`  repeal probe: an undefended statute with 18 enemies was struck ${rate.toFixed(0)}% of sessions`);
  assert(rate > 5, `an undefended law is genuinely at risk (${rate.toFixed(0)}%)`);
  assert(rate < 95, `but not doomed — defending is a choice, not a formality (${rate.toFixed(0)}%)`);
}

// --- 7. A QUIET STATUTE IS IN NO DANGER ---
{
  let struck = 0;
  for (let i = 0; i < 120; i++) {
    useRng(createRng(900 + i));
    setDefaultSeed(900 + i);
    const legacy: LegacyState = emptyLegacy();
    const past = sessionState(900 + i);
    past.bill!.provisions = [prov({ nays: 0 })];
    recordLaw(legacy, past, 1);
    legacy.runs.push({ epithet: 'passed it', kind: 'session_law' });
    const s = sessionState(950 + i);
    s.outcome = 'session_survived';
    recordRun(legacy, s, 'session_survived', 50);
    if (standingLaws(legacy).length === 0) struck++;
  }
  assert(struck === 0, `language nobody opposed is never repealed (${struck} struck)`);
}

// --- 8. THE BOOK REMEMBERS WHAT WAS STRUCK ---
{
  const legacy: LegacyState = emptyLegacy();
  const s = sessionState();
  s.bill!.provisions = [prov()];
  recordLaw(legacy, s, 1);
  assert(repealLaw(legacy, 'LAW_ag-subsidies_1', 3), 'a law can be struck');
  assert(standingLaws(legacy).length === 0, 'and stops standing');
  assert(getLaws(legacy).length === 1, 'but stays in the book — a repealed law is still history');
  assert(getLaws(legacy)[0]!.repealedRun === 3, 'with the session that struck it recorded');
  assert(!repealLaw(legacy, 'LAW_ag-subsidies_1', 4), 'and cannot be struck twice');
  assert(lawGoodwill(legacy) === 0, 'a struck law stops paying at home');
}

// --- 9. EXPOSURE FOLLOWS THE ENEMIES YOU MADE ---
{
  const legacy: LegacyState = emptyLegacy();
  const s = sessionState();
  s.bill!.provisions = [prov({ nays: 2 })];
  recordLaw(legacy, s, 1);
  s.bill!.provisions = [prov({ id: 'PV_BIG', nays: 20 })];
  recordLaw(legacy, s, 2);
  const worst = mostExposedLaw(legacy);
  assert(worst?.id === 'LAW_ag-subsidies_2', 'the law that beat the most people is the exposed one');

  const quiet: LegacyState = emptyLegacy();
  const q = sessionState();
  q.bill!.provisions = [prov({ nays: 0 })];
  recordLaw(quiet, q, 1);
  assert(mostExposedLaw(quiet) === null, 'a statute nobody minded is exposed to nothing');
}

// --- 10. NO BOOK, NO NOISE ---
{
  const s = createNewState({ seed: 3 });
  assert(statuteBookLine(s) === '', 'a first-term member is told nothing about a record they do not have');
  assert(seedLawOpenings(s).length === 0, 'and raises no reauthorization fights');
}

if (failed) {
  console.error(`\nStatute Book FAILED — ${failed} assertion(s)`);
  process.exit(1);
}
console.log('\nThe Statute Book green — what you passed outlives the run that passed it.');
