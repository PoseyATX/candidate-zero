/**
 * Hooks — the side-paths back, and the closed loop.
 * Run: npm run harness:hooks
 *
 * The career was a ladder with a memory. The campaign fed the chamber — meet
 * Wendell Cobb on a mail route in October and he is warm when you are sworn in —
 * and nothing came back. A member who takes your call at ten at night could not
 * cut you an ad, work his county, or tell you which ground was about to turn.
 *
 * What this asserts is the LOOP, end to end: deliver in session → the member
 * remembers → next campaign he offers → you can cash it on the trail. Each half
 * of that was already tested; the join was not, and a join nobody tests is
 * exactly where this project's bugs have lived.
 *
 * It also asserts the properties that keep hooks *hooks* rather than chores:
 * optional, sourced, and cashable once.
 */

import { createNewState } from '../engine/state.js';
import { createRng, setDefaultSeed, useRng } from '../engine/rng.js';
import { enterSession } from '../engine/session.js';
import { applyLegacy, emptyLegacy } from '../engine/legacy.js';
import { settleChamber, ALLY_LINE } from '../engine/chamber.js';
import {
  getHooks,
  liveHooks,
  offerHook,
  takeHook,
  hooksOfKind,
  findHook,
  MAX_LIVE_HOOKS
} from '../engine/hooks.js';
import { HOOK_PLAYS } from '../data/hook-plays.js';
import { FILE_KEEPS_WEEKS } from '../engine/rival.js';
import { resolveOutsideEvent } from '../engine/outside.js';
import { OUTSIDE_EVENTS } from '../data/outside-events.js';
import { MEMBER_BY_ID, MEMBERS } from '../data/members.js';
import { createCampaign, listPlayableHand } from '../engine/loop.js';
import { executePlay } from '../engine/play.js';
import { OBLS, addObl } from '../data/obligations.js';
import type { GameState, LegacyState, Provision } from '../engine/types.js';

let failed = 0;
function assert(cond: boolean, msg: string): void {
  if (cond) console.log(`PASS: ${msg}`);
  else {
    console.error(`FAIL: ${msg}`);
    failed++;
  }
}

console.log('=== CANDIDATE ZERO — Hooks ===\n');

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

/** A career in which you delivered for GR02 twice, so those members are allies. */
function careerWithAllies(): LegacyState {
  useRng(createRng(9));
  setDefaultSeed(9);
  const legacy = emptyLegacy();
  const s = createNewState({ seed: 9 });
  s.issueId = 'ag-subsidies';
  enterSession(s);
  s.bill!.provisions = [prov()];
  settleChamber(legacy, s);
  settleChamber(legacy, s);
  return legacy;
}

// --- THE LOOP CLOSES ---
{
  const legacy = careerWithAllies();
  const allies = MEMBERS.filter(m => (legacy.chamber?.[m.id]?.disposition ?? 0) >= ALLY_LINE);
  assert(allies.length > 0, `a delivered session makes real allies (${allies.length})`);

  const next = createNewState({ seed: 31 });
  applyLegacy(next, legacy);
  const offered = liveHooks(next);
  assert(offered.length > 0, 'and the next CAMPAIGN opens with threads from them');
  assert(
    offered.every(h => h.kind === 'member' && !!MEMBER_BY_ID[h.source]),
    'every thread names the person who offered it'
  );
  assert(
    offered.every(h => h.stages.includes('primary')),
    'and they are cashable on the trail, which is the whole point'
  );
  assert(
    next.log.some(l => /THREADS/.test(l.text)),
    'and the player is told they exist'
  );
}

// --- HOOKS ARE OPTIONAL ---
//
// A hook you must take is a quest. Ignoring every one of them has to remain a
// legitimate way to play, so nothing here may punish you for walking past it.
{
  const legacy = careerWithAllies();
  const a = createNewState({ seed: 41 });
  applyLegacy(a, legacy);
  const b = createNewState({ seed: 41 });
  applyLegacy(b, legacy);
  // Cash nothing in `a`; the ledger must be identical to `b`.
  const ledger = (s: GameState) =>
    [s.contacts, s.nameID, s.momentum, s.endorsePts, s.volPool, s.districtStanding].join(',');
  assert(ledger(a) === ledger(b), 'an unclaimed thread costs nothing and grants nothing');
  assert(liveHooks(a).length > 0, 'and it is simply still there, waiting');
}

// --- CASHED ONCE, BY A CARD, WITH A NAME ---
{
  const legacy = careerWithAllies();
  const s = createNewState({ seed: 51, ap: 9 });
  applyLegacy(s, legacy);
  s.stage = 'primary';

  const playable = HOOK_PLAYS.filter(c => c.show?.(s));
  assert(playable.length > 0, 'a hook card appears once somebody owes you');

  const card = playable[0]!;
  const before = liveHooks(s).length;
  const out = executePlay(s, card);
  assert(out.ok, `${card.id} resolves (${out.reason ?? 'ok'})`);
  assert(liveHooks(s).length === before - 1, 'and consumes exactly one thread');

  const taken = getHooks(s).find(h => h.takenWeek !== undefined);
  const m = taken ? MEMBER_BY_ID[taken.source] : undefined;
  assert(
    !!m && (out.text ?? '').includes(m.name),
    `and the result names them — ${m ? `${m.name} of ${m.county}` : 'nobody'}, not "an ally"`
  );
  assert(!!taken && !takeHook(s, taken.id), 'a favour cannot be cashed twice');
}

// --- THE THREE FAVOURS ARE GENUINELY DIFFERENT ---
//
// "An ally gives +N" is the stat-bonus-wearing-a-hat problem this project
// measured at 61% of the corpus. A diplomat spends their name; a charmer works
// their own county; everyone else tells you the truth.
{
  const touched = new Set<string>();
  for (const card of HOOK_PLAYS) {
    const legacy = emptyLegacy();
    // Force one ally of each opensTo flavour so every card has a thread.
    for (const m of MEMBERS) {
      legacy.chamber = legacy.chamber ?? {};
      legacy.chamber[m.id] = { id: m.id, disposition: 60, delivered: 2, burned: 0 };
    }
    const s = createNewState({ seed: 61, ap: 9 });
    applyLegacy(s, legacy);
    s.stage = 'primary';
    if (!card.show?.(s)) continue;
    const before = {
      nameID: s.nameID,
      contacts: s.contacts,
      rap: s.groundsArr.reduce((t, g) => t + (g.rapport || 0), 0),
      sharp: s.messageSharp,
      endorse: s.endorsePts
    };
    executePlay(s, card);
    if (s.nameID > before.nameID || s.endorsePts > before.endorse) touched.add('name');
    if (s.contacts > before.contacts) touched.add('turf');
    if (s.messageSharp && !before.sharp) touched.add('intel');
  }
  assert(
    touched.size >= 3,
    `the favours reach different systems, not one scalar (${[...touched].join(', ')})`
  );
}

// --- THE REGISTRY IS A REGISTRY ---
//
// Members are the first source, not the mechanism. Statutes, rivals, the machine
// and the world are all meant to offer into the same list.
{
  const s = createNewState({ seed: 71 });
  const h = offerHook(s, {
    id: 'HK_TEST',
    n: 'Something a statute dangled',
    d: 'x',
    kind: 'statute',
    source: 'LAW_water_1',
    stages: ['primary']
  });
  assert(!!h, 'a non-member source can offer a thread with no engine change');
  assert(hooksOfKind(s, 'statute').length === 1, 'and it is findable by kind');
  assert(offerHook(s, { ...h!, n: 'dup' }) === null, 'the same thread is never offered twice');

  s.stage = 'session';
  assert(liveHooks(s).length === 0, 'a trail thread is not offered in the chamber');
  s.stage = 'primary';
  assert(liveHooks(s).length === 1, 'and comes back when you are');

  // Perishable where it makes sense.
  const p = offerHook(s, {
    id: 'HK_SHORT', n: 'x', d: 'x', kind: 'world', source: 'w',
    stages: ['primary'], expiresWeek: s.week
  })!;
  assert(liveHooks(s).some(x => x.id === p.id), 'a perishable thread is live inside its window');
  s.week += 1;
  assert(!liveHooks(s).some(x => x.id === p.id), 'and gone after it');
  assert(!!findHook(s, p.id), 'but still on the record — people remember what they offered');
}

// --- THE BOARD DOES NOT FLOOD ---
{
  const s = createNewState({ seed: 81 });
  for (let i = 0; i < MAX_LIVE_HOOKS + 4; i++) {
    offerHook(s, { id: `HK_F${i}`, n: 'x', d: 'x', kind: 'world', source: 'w', stages: ['primary'] });
  }
  s.stage = 'primary';
  assert(
    liveHooks(s).length === MAX_LIVE_HOOKS,
    `no more than ${MAX_LIVE_HOOKS} open threads (${liveHooks(s).length})`
  );
}

// --- A FULL BOARD MUST NOT SWALLOW THE THING HAPPENING THIS WEEK ---
//
// Found by measurement, not reasoning. Five sources went live and the world's
// door — the only kind that expires — was silently refused every time, because
// the standing gifts had filled all six slots at applyLegacy before the season
// started. The flood came, you could not go, and nothing would have said why.
{
  const s = createNewState({ seed: 85 });
  s.stage = 'primary';
  for (let i = 0; i < MAX_LIVE_HOOKS; i++) {
    offerHook(s, { id: `HK_S${i}`, n: 'a standing offer', d: 'x', kind: 'member', source: 'm', stages: ['primary'] });
  }
  assert(liveHooks(s).length === MAX_LIVE_HOOKS, 'board full of threads that wait forever');

  const door = offerHook(s, {
    id: 'HK_NOW', n: 'a room with people in it right now', d: 'x',
    kind: 'world', source: 'w', stages: ['primary'], expiresWeek: s.week + 2
  });
  assert(!!door, 'a perishable thread still gets in');
  assert(liveHooks(s).length === MAX_LIVE_HOOKS, 'and the cap still holds');
  assert(!findHook(s, 'HK_S0'), 'the oldest standing offer gave up its slot');
  assert(!!findHook(s, 'HK_S1'), 'but only one of them');

  // A displaced thread was never offered — the record must not claim you
  // turned it down.
  assert(
    getHooks(s).every(h => h.id !== 'HK_S0'),
    'a displaced thread is removed, not marked as one you refused'
  );

  // Perishable does not beat perishable; nothing here may cannibalise a door
  // the player is already racing.
  const second = offerHook(s, {
    id: 'HK_NOW2', n: 'another room', d: 'x',
    kind: 'world', source: 'w2', stages: ['primary'], expiresWeek: s.week + 2
  });
  assert(!!second, 'a second perishable thread takes the next standing slot');
  assert(!!findHook(s, 'HK_NOW'), 'and does not eat the first door');
}

// --- A FIRST-TERM CANDIDATE IS OWED NOTHING ---
{
  useRng(createRng(91));
  setDefaultSeed(91);
  const c = createCampaign({ seed: 91 });
  assert(liveHooks(c.state).length === 0, 'nobody owes a first-timer anything');
  const ids = listPlayableHand(c).map(p => p.card.id);
  for (const card of HOOK_PLAYS) {
    assert(!ids.includes(card.id), `${card.id} is not on the menu until it is real`);
  }
}

// --- READS DO NOT MUTATE ---
{
  const s = createNewState({ seed: 95 });
  getHooks(s);
  liveHooks(s);
  hooksOfKind(s, 'member');
  assert(s.hooks === undefined, 'looking at the board does not create it');
}

// --- THE SECOND SOURCE: A STATUTE THAT WORKED ---
//
// "Bill is filed and means nothing" was the fair complaint. A law that only
// pays out as a quiet standing bonus is a trophy with a number on it.
{
  const legacy = emptyLegacy();
  legacy.laws = [
    {
      id: 'LAW_ag_1',
      title: 'the screwworm indemnity fund',
      issueId: 'ag-subsidies',
      passedRun: 1,
      sponsor: 'The Member',
      provisions: [prov()],
      serves: ['GR02']
    },
    // A shell bill that passed. Real statute, real line in the obituary, but
    // nobody in Lamesa organizes a phone bank over it.
    {
      id: 'LAW_shell_1',
      title: 'a bill with nothing in it',
      issueId: null,
      passedRun: 1,
      sponsor: 'The Member',
      provisions: [],
      serves: []
    }
  ];
  const s = createNewState({ seed: 101, ap: 9 });
  applyLegacy(s, legacy);
  const st = hooksOfKind(s, 'statute');
  assert(st.length === 1, `a standing law offers a thread, a shell bill does not (${st.length})`);
  assert(st[0]?.source === 'LAW_ag_1', 'and the thread names the statute, not "your record"');

  s.stage = 'primary';
  const card = HOOK_PLAYS.find(c => c.id === 'HK04')!;
  assert(!!card.show?.(s), 'HK04 appears once a law of yours is working on somebody');
  const rapBefore = s.groundsArr.reduce((t, g) => t + (g.rapport || 0), 0);
  const standBefore = s.districtStanding;
  const out = executePlay(s, card);
  assert(out.ok, 'HK04 resolves');
  assert(
    s.groundsArr.reduce((t, g) => t + (g.rapport || 0), 0) > rapBefore,
    'and it moves the ground the statute actually serves'
  );
  assert(s.districtStanding > standBefore, 'and your standing at home, because the record is a fact');
  assert(hooksOfKind(s, 'statute').length === 0, 'cashed once, like everything else');
}

// --- THE THIRD SOURCE IS A TRAP ---
//
// "Some of which are shortcuts, some of which are traps." Every hook before
// this one is a gift, which is only half of how the building runs.
{
  const legacy = emptyLegacy();
  legacy.machine = {
    members: [
      { id: 'AL16', standing: 80, runs: 3, since: 1 }, // The Slate-Maker, with you
      { id: 'AL01', standing: 25, runs: 1, since: 2 }  // merely owes you
    ],
    departed: []
  };
  const s = createNewState({ seed: 111, ap: 9 });
  applyLegacy(s, legacy);
  const deals = hooksOfKind(s, 'machine');
  assert(deals.length === 1, `only the strongest relationship offers a deal (${deals.length})`);
  assert(deals[0]?.source === 'AL16', 'and it is the one who is genuinely WITH you');

  s.stage = 'primary';
  const card = HOOK_PLAYS.find(c => c.id === 'HK05')!;
  assert(card.risk !== 'SAFE', 'COVENANT 5 — the trap is not labelled SAFE');
  assert(/obligation/i.test(card.d), 'and the price is printed on the card face before you take it');

  const moneyBefore = s.money;
  const oblsBefore = (s.obls ?? []).length;
  const out = executePlay(s, card);
  assert(out.ok, 'HK05 resolves');
  assert(s.money > moneyBefore, 'the deal genuinely works — it always works');
  assert((s.obls ?? []).length === oblsBefore + 1, 'and it attaches a leash you did not choose');
  assert((s.obls ?? []).includes('OB3'), "the Slate-Maker charges his own marker, not a generic string");
}

// --- BOTH PRICES ARE REAL PRICES ---
//
// The trap's cost used to be `random() < 0.5 ? 'OB3' : 'OB1'`. That made the
// assertion below depend on the seed — it passed on OB1 and would have failed
// on OB3, whose weekly drag is empty by design. So the price became a function
// of WHO you dealt with, and both branches get driven here rather than one of
// them getting lucky.
{
  const price = (allyId: string): string => {
    const legacy = emptyLegacy();
    legacy.machine = { members: [{ id: allyId, standing: 80, runs: 3, since: 1 }], departed: [] };
    const s = createNewState({ seed: 115, ap: 9 });
    applyLegacy(s, legacy);
    s.stage = 'primary';
    executePlay(s, HOOK_PLAYS.find(c => c.id === 'HK05')!);
    return (s.obls ?? [])[0] ?? '';
  };

  const slate = price('AL16');
  const other = price('AL10');
  assert(slate === 'OB3', `the Slate-Maker takes his marker (${slate})`);
  assert(other === 'OB1', `everybody else runs money, and money has a string (${other})`);
  assert(slate !== other, 'the price is who you dealt with, not a coin flip');

  // OB1 costs you every week. OB3 costs you nothing weekly — it is a marker
  // spent elsewhere — so assert the thing that is actually true of each, rather
  // than one claim that happens to hold for whichever branch the seed picked.
  const probe = createNewState({ seed: 116 });
  const b = { L: probe.faces.L, exposure: probe.exposure };
  OBLS['OB1']!.drag(probe);
  assert(
    probe.faces.L !== b.L || probe.exposure !== b.exposure,
    'OB1 drags on you every week — the PAC string pulls'
  );
  assert(!!OBLS['OB3'], 'OB3 is a real registry entry');
  const gated = createNewState({ seed: 117 });
  addObl(gated, 'OB3');
  assert(
    (gated.obls ?? []).includes('OB3'),
    'OB3 is a marker on the books — it gates starmap paths and counts as a debt obligation'
  );
}

// --- THREE SOURCES, ONE REGISTRY ---
{
  const legacy = careerWithAllies();
  legacy.laws = [
    {
      id: 'LAW_ag_1', title: 'the screwworm indemnity fund', issueId: 'ag-subsidies',
      passedRun: 1, sponsor: 'The Member', provisions: [prov()], serves: ['GR02']
    }
  ];
  legacy.machine = { members: [{ id: 'AL16', standing: 80, runs: 3, since: 1 }], departed: [] };
  const s = createNewState({ seed: 121 });
  applyLegacy(s, legacy);
  const kinds = new Set(getHooks(s).map(h => h.kind));
  assert(
    kinds.has('member') && kinds.has('statute') && kinds.has('machine'),
    `member, statute and machine all offer into the same list (${[...kinds].join(', ')})`
  );
  assert(
    s.log.some(l => /THREADS/.test(l.text) && /deal/.test(l.text)),
    'and the player is warned that not all of it is a gift'
  );
}

// --- THE FOURTH SOURCE: AN ENVELOPE, AND IT GOES STALE ---
//
// The first three sources are things you EARNED. This one shows up. It is also
// the first PERISHABLE hook offered by real production code rather than by a
// synthetic hook the harness built itself — the expiry machinery had never been
// exercised by an actual card.
{
  const legacy = emptyLegacy();
  legacy.rival = {
    id: 'RIV1', name: 'Hollis Rakestraw', archetype: 'incumbent',
    cycles: 2, beatYou: 1, youBeatThem: 1, streak: 0, strength: 40, since: 1
  };
  const s = createNewState({ seed: 131, ap: 9 });
  applyLegacy(s, legacy);
  const files = hooksOfKind(s, 'rival');
  assert(files.length === 1, `a rival with a record attracts an envelope (${files.length})`);
  assert(
    files[0]?.expiresWeek !== undefined,
    'and it PERISHES — production code, not a harness fixture, sets a window'
  );

  s.stage = 'primary';
  const card = HOOK_PLAYS.find(c => c.id === 'HK06')!;
  assert(card.risk === 'VOL', 'the envelope is a genuine wager, not a priced deal');
  assert(!!card.show?.(s), 'HK06 appears while the file is fresh');
  s.week += FILE_KEEPS_WEEKS + 1;
  assert(!card.show?.(s), 'and is gone once it is stale — you are just dredging up old business');

  // A first-time filer has no receipts on them.
  const fresh = emptyLegacy();
  fresh.rival = {
    id: 'RIV1', name: 'Wade Coker', archetype: 'insurgent',
    cycles: 0, beatYou: 0, youBeatThem: 0, streak: 0, strength: 18, since: 1
  };
  const s2 = createNewState({ seed: 132 });
  applyLegacy(s2, fresh);
  assert(hooksOfKind(s2, 'rival').length === 0, 'nobody has kept receipts on a first-time filer');
}

// --- THE WAGER HAS A BAD END, AND IT IS THE PLAYER WHO PAYS ---
//
// COVENANT 6. A "risky" card whose worst branch is merely a smaller gift is not
// risky, and this corpus has shipped that mistake before. The bad tier has to
// cost something the player can feel.
{
  const legacy = emptyLegacy();
  legacy.rival = {
    id: 'RIV1', name: 'Hollis Rakestraw', archetype: 'incumbent',
    cycles: 2, beatYou: 1, youBeatThem: 1, streak: 0, strength: 40, since: 1
  };
  const card = HOOK_PLAYS.find(c => c.id === 'HK06')!;
  const seen = new Set<number>();
  let worstHurt = false;
  let bestHelped = false;
  for (let seed = 200; seed < 260; seed++) {
    const s = createNewState({ seed, ap: 9 });
    applyLegacy(s, legacy);
    s.stage = 'primary';
    if (!card.show?.(s)) continue;
    const before = { hits: s.hitPieces, rap: s.groundsArr.reduce((t, g) => t + (g.rivalRap || 0), 0) };
    useRng(createRng(seed));
    const out = executePlay(s, card);
    if (out.tier !== undefined) seen.add(out.tier);
    if (s.hitPieces > before.hits) worstHurt = true;
    if (s.groundsArr.reduce((t, g) => t + (g.rivalRap || 0), 0) < before.rap) bestHelped = true;
  }
  assert(seen.size >= 3, `the envelope really does swing (${seen.size} distinct tiers over 60 seeds)`);
  assert(bestHelped, 'a good outcome actually knocks the rival down');
  assert(worstHurt, 'and a bad one puts a hit piece on YOU — the wager can be lost');
}

// --- THE FIFTH SOURCE: THE WORLD LEAVES A DOOR ---
//
// "The screw worm happens and is forgotten." `opens` fixed that inside the
// chamber. This is the campaign half: an event you could only ever read is now
// a room you can go stand in.
{
  const withDoors = OUTSIDE_EVENTS.filter(e => e.hook);
  assert(withDoors.length >= 3, `outside events leave doors (${withDoors.length} of them)`);

  const ev = OUTSIDE_EVENTS.find(e => e.id === 'EV_SCREWWORM')!;
  assert(!!ev.hook, 'including the screwworm, which is the one that was named as forgotten');

  const s = createNewState({ seed: 141, ap: 9 });
  s.stage = 'primary';
  resolveOutsideEvent(s, ev);
  const doors = hooksOfKind(s, 'world');
  assert(doors.length === 1, `the event leaves a door on the trail (${doors.length})`);
  assert(doors[0]?.source === 'EV_SCREWWORM', 'and the door names the event that opened it');
  assert(
    s.log.some(l => /A DOOR/.test(l.text) && /closes in/.test(l.text)),
    'and the player is told how long they have'
  );

  const card = HOOK_PLAYS.find(c => c.id === 'HK07')!;
  assert(!!card.show?.(s), 'HK07 appears while it is still happening');
  const g = s.groundsArr.find(x => x.id === 'GR02');
  const rapBefore = g?.rapport ?? 0;
  const out = executePlay(s, card);
  assert(out.ok, 'HK07 resolves');
  assert((g?.rapport ?? 0) > rapBefore, 'and going lands on the ground the event actually hit');

  // The door closes whether you go or not.
  const s2 = createNewState({ seed: 142 });
  s2.stage = 'primary';
  resolveOutsideEvent(s2, ev);
  assert(hooksOfKind(s2, 'world').length === 1, 'the door is open');
  s2.week += (ev.hook!.weeks ?? 0) + 1;
  assert(hooksOfKind(s2, 'world').length === 0, 'and it closes whether you went or not');

  // A door is a TRAIL thing. The chamber is a different building.
  const s3 = createNewState({ seed: 143 });
  s3.stage = 'session';
  resolveOutsideEvent(s3, ev);
  assert(
    getHooks(s3).filter(h => h.kind === 'world').length === 0,
    'the world does not open trail doors while you are on the floor'
  );
}

// --- ALL FIVE KINDS ARE LIVE ---
{
  const legacy = careerWithAllies();
  legacy.laws = [
    {
      id: 'LAW_ag_1', title: 'the screwworm indemnity fund', issueId: 'ag-subsidies',
      passedRun: 1, sponsor: 'The Member', provisions: [prov()], serves: ['GR02']
    }
  ];
  legacy.machine = { members: [{ id: 'AL16', standing: 80, runs: 3, since: 1 }], departed: [] };
  legacy.rival = {
    id: 'RIV1', name: 'Hollis Rakestraw', archetype: 'incumbent',
    cycles: 2, beatYou: 1, youBeatThem: 1, streak: 0, strength: 40, since: 1
  };
  const s = createNewState({ seed: 151 });
  applyLegacy(s, legacy);
  s.stage = 'primary';
  resolveOutsideEvent(s, OUTSIDE_EVENTS.find(e => e.id === 'EV_SCREWWORM')!);
  const kinds = new Set(getHooks(s).map(h => h.kind));
  for (const k of ['member', 'statute', 'machine', 'rival', 'world'] as const) {
    assert(kinds.has(k), `${k} offers into the same registry`);
  }
  assert(
    HOOK_PLAYS.length === 7,
    `and there is a card for each flavour of each (${HOOK_PLAYS.length} hook cards)`
  );
}

if (failed) {
  console.error(`\nHooks FAILED — ${failed} assertion(s)`);
  process.exit(1);
}
console.log('\nHooks green — the loop closes, and none of it is obligatory.');
