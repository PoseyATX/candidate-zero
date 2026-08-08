/**
 * ZERO start harness — the opening, the table, and the way out of a card.
 *
 * This is the evidence for the start-at-nothing design: four personas, ten
 * intrinsic cards each, three spaces on the table, opportunities that fire off
 * the run instead of a menu, and no trash button anywhere.
 *
 * Run: npm run harness:zero-start
 */

import { createCampaign, listPlayableHand, playFromHand, startWeek } from '../engine/loop.js';
import { createNewState, CAMPAIGN_AP } from '../engine/state.js';
import { executePlay } from '../engine/play.js';
import { setDefaultSeed } from '../engine/rng.js';
import { resolve } from '../engine/resolve.js';
import { STARTER_DECK_IDS, handSizeFor, DEFAULT_HAND_SIZE, MAX_HAND_SIZE } from '../engine/deck.js';
import { BASE_SLOTS, resetSlots, slotsThisWeek } from '../engine/slots.js';
import { buildOpportunities, themeAllows } from '../engine/opportunity.js';
import { syncHand, liabilityBlockReason, RIGIDITY, NO_STANDING } from '../engine/liabilities.js';
import { STARTING_PERSONAS } from '../data/setup.js';
import {
  PERSONA_INTRINSIC,
  ZERO_LIABILITY_IDS,
  ZERO_UNIVERSAL_IDS,
  zeroStarterDeck
} from '../data/plays-zero.js';
import { PLAYS } from '../data/plays.js';
import { ORIGIN_QUESTIONS } from '../data/origin.js';
import { CLERK_ASKS, CLERK_REPLIES } from '../data/clerk.js';
import type { GameState, PlayCard } from '../engine/types.js';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error('FAIL: ' + msg);
}

const card = (id: string): PlayCard => {
  const c = PLAYS.find(p => p.id === id);
  if (!c) throw new Error(`missing ${id}`);
  return c;
};

function zeroCampaign(personaId: string, seed = 42) {
  return createCampaign({
    seed,
    starterKit: 'zero',
    setup: { personaId, issueId: 'water', districtId: 'open', regionId: 'east' }
  });
}

console.log('=== CANDIDATE ZERO — the start ===\n');

// --- 1. No generic starting deck exists for a player ---------------------
{
  for (const p of STARTING_PERSONAS) {
    const c = zeroCampaign(p.id);
    const pile = [...c.deck.draw, ...c.deck.hand, ...c.deck.discard];
    assert(pile.length === 10, `${p.id}: opens on exactly ten physical cards (${pile.length})`);
    // The harness toolkit must never reach a Zero campaign.
    const harnessOnly = STARTER_DECK_IDS.filter(id => !zeroStarterDeck(p.id).includes(id));
    const leaked = pile.filter(id => harnessOnly.includes(id));
    assert(leaked.length === 0, `${p.id}: no generic starter kit leaked in (${leaked.join(',')})`);
  }
  console.log('PASS: every starting persona opens on its own ten cards — no generic deck.');
}

// --- 2. Two personas produce visibly different early runs ----------------
{
  const a = zeroCampaign('blockwalker');
  const b = zeroCampaign('believer');
  const deckA = [...a.deck.draw, ...a.deck.hand].sort().join(',');
  const deckB = [...b.deck.draw, ...b.deck.hand].sort().join(',');
  assert(deckA !== deckB, 'two personas do not open on the same pile');

  const onlyA = PERSONA_INTRINSIC.blockwalker!.filter(id => !PERSONA_INTRINSIC.believer!.includes(id));
  assert(onlyA.length === 4, 'their intrinsic four share nothing');

  // And the world offers them different things, from the first turn.
  const themeA = PLAYS.filter(p => themeAllows(a.state, p)).map(p => p.id);
  const themeB = PLAYS.filter(p => themeAllows(b.state, p)).map(p => p.id);
  const diff = themeA.filter(id => !themeB.includes(id)).length +
    themeB.filter(id => !themeA.includes(id)).length;
  assert(diff > 0, `persona theme gates differ (${diff} cards differ)`);
  console.log(`PASS: Blockwalker and Believer open differently and see ${diff} different cards.`);
}

// --- 3. Every starting persona carries a liability. No exceptions. -------
{
  for (const p of STARTING_PERSONAS) {
    const ten = zeroStarterDeck(p.id);
    assert(ten.some(id => ZERO_LIABILITY_IDS.has(id)), `${p.id} carries a liability`);
    for (const u of ZERO_UNIVERSAL_IDS) assert(ten.includes(u), `${p.id} has the universal ${u}`);
  }
  console.log('PASS: all four carry a liability, and all four carry the universal six.');
}

// --- 4. Knock stays the floor at every depth ----------------------------
{
  const knock = card('PL40');
  let worstOdds = 1;
  let disasters = 0;
  setDefaultSeed(3);
  for (let week = 1; week <= 20; week++) {
    for (const stage of ['primary', 'general', 'session'] as const) {
      const s = createNewState({ seed: 3 + week, ap: CAMPAIGN_AP });
      s.week = week;
      s.stage = stage;
      s.exposure = week * 0.1; // depth: the world getting heavier
      s.hitPieces = Math.floor(week / 4);
      const p = knock.odds!(s);
      worstOdds = Math.min(worstOdds, p);
      for (let i = 0; i < 40; i++) {
        const r = resolve(p, knock.risk, s);
        if (r.tier === 3) disasters++;
      }
    }
  }
  assert(worstOdds >= 0.95, `Knock never drops below 0.95 at any depth (worst ${worstOdds})`);
  assert(knock.risk === 'SAFE', 'Knock is SAFE — band 0, never DISASTER (covenant 5)');
  assert(disasters === 0, `Knock never disastered in 2400 rolls (${disasters})`);
  console.log(`PASS: Knock holds at ${worstOdds.toFixed(2)} across 20 weeks and 3 stages, 0 disasters.`);
}

// --- 5. The table is three spaces, and cheap decks choke on it ----------
{
  const c = zeroCampaign('blockwalker', 7);
  assert(slotsThisWeek(c.state) === BASE_SLOTS, 'the table opens with three spaces');

  // A hand of cheap cards cannot be converted into a week's work: the table
  // fills at three and the leftover action points have nowhere to go.
  startWeek(c);
  c.state.ap = CAMPAIGN_AP;
  c.state.fieldAp = CAMPAIGN_AP;
  let played = 0;
  for (let guard = 0; guard < 12; guard++) {
    const options = listPlayableHand(c).filter(o => o.index >= 0);
    if (!options.length) break;
    const r = playFromHand(c, options[0]!.index, c.state.groundsArr[0]);
    if (!r.ok) break;
    played++;
  }
  assert(played <= BASE_SLOTS, `no more than three cards hit the table (${played})`);
  assert(c.state.ap > 0, `action points are left stranded by the table (${c.state.ap} AP unspent)`);
  console.log(`PASS: three cards down, ${c.state.ap} AP stranded — the slot is the scarce thing.`);

  // And the cheap card cannot answer anything. Deliberately asserted as a shape
  // rather than as a ratio between currencies: "a quarter of the impact" has no
  // honest exchange rate between contacts and dollars, and inventing one makes
  // a brittle test that measures the weights instead of the game. What is
  // actually true, and what makes a cheap deck lose in a pinch, is that the
  // floor card moves ONE ledger, slightly, and no others — so a hand of them
  // cannot pay a filing fee, cannot qualify a ballot, cannot answer a hit
  // piece, and cannot raise a volunteer.
  const ledger = (id: string): Record<string, number> => {
    const t = { contacts: 0, money: 0, nameID: 0, momentum: 0, signatures: 0, vols: 0 };
    for (let i = 0; i < 80; i++) {
      const s = createNewState({ seed: 100 + i, ap: CAMPAIGN_AP, money: 3000, nameID: 20, volPool: 3 });
      s.tier = 1;
      s.ballot = true;
      const b = { c: s.contacts, m: s.money, n: s.nameID, mo: s.momentum, sg: s.signatures, v: s.volPool };
      executePlay(s, card(id), s.groundsArr[0]);
      t.contacts += s.contacts - b.c;
      t.money += s.money - b.m;
      t.nameID += s.nameID - b.n;
      t.momentum += s.momentum - b.mo;
      t.signatures += s.signatures - b.sg;
      t.vols += s.volPool - b.v;
    }
    for (const k of Object.keys(t)) t[k as keyof typeof t] /= 80;
    return t;
  };

  const knockL = ledger('PL40');
  assert(knockL.money === 0, 'Knock never produces money');
  assert(knockL.nameID === 0, 'Knock never produces name ID');
  assert(knockL.momentum === 0, 'Knock never produces momentum');
  assert(knockL.signatures === 0, 'Knock never produces signatures');
  assert(knockL.vols === 0, 'Knock never produces volunteers');
  assert(knockL.contacts > 0, 'Knock is not nothing');

  // It is the floor even among the cheap cards: half of what an ordinary
  // one-action retail play returns on the same slot.
  const retail = ledger('PL80'); // Grocery-Store Handshakes, also one action
  const ratio = knockL.contacts / retail.contacts;
  assert(ratio < 0.6, `Knock is the floor even among cheap plays (ratio ${ratio.toFixed(2)})`);
  console.log(
    `PASS: Knock returns ${knockL.contacts.toFixed(1)} contacts and nothing else — ` +
      `${ratio.toFixed(2)}x an ordinary retail play, and no money/ballot/momentum answer at all.`
  );
}

// --- 6. The hand widens quietly, and stops at seven ---------------------
{
  const s = createNewState({ seed: 5 });
  assert(handSizeFor(s) === DEFAULT_HAND_SIZE, 'a nobody holds five');
  s.contacts = 350;
  assert(handSizeFor(s) === 6, 'a district that knows you is worth a sixth card');
  s.contacts = 2000;
  s.allies = [
    { id: 'AL01', warm: 2, age: 0 }, { id: 'AL02', warm: 2, age: 0 },
    { id: 'AL03', warm: 2, age: 0 }, { id: 'AL04', warm: 2, age: 0 }
  ];
  assert(handSizeFor(s) === MAX_HAND_SIZE, 'a machine is worth a seventh');
  s.contacts = 999999;
  assert(handSizeFor(s) === MAX_HAND_SIZE, 'and it never goes past seven');
  console.log('PASS: hand 5 → 6 → 7 off what you built, capped at seven.');
}

// --- 7. A stretch with zero opportunities is legal and breaks nothing ---
{
  const s = createNewState({ seed: 9 });
  s.personaId = 'blockwalker';
  s.money = 0;
  s.volPool = 0;
  s.favors = 0;
  s.contacts = 0;
  s.allies = [];
  // Own everything the theme would ever allow, so nothing is left to offer.
  s.deck = PLAYS.filter(p => themeAllows(s, p)).map(p => p.id);
  const none = buildOpportunities(s, 3);
  assert(none.length === 0, `nothing qualifies → nothing is offered (got ${none.join(',')})`);

  // The engine must not top the list up to a count with filler.
  const s2 = createNewState({ seed: 10 });
  s2.personaId = 'believer';
  s2.money = 0;
  let sawShort = false;
  for (let i = 0; i < 40; i++) {
    const opts = buildOpportunities(s2, 3);
    if (opts.length < 3) sawShort = true;
    assert(opts.length <= 3, 'never more than asked for');
  }
  assert(sawShort, 'a thin run offers fewer than three — no filler');
  console.log('PASS: zero opportunities is a legal week; nothing is padded to a count.');
}

// --- 8. Opportunities are gated by theme, not by a schedule -------------
{
  const walker = createNewState({ seed: 11 });
  walker.personaId = 'blockwalker';
  walker.money = 200;
  // A lobbyist-priced ask is not a thing that gets offered to her in week two.
  const dear = PLAYS.filter(p => (p.cost?.$ ?? 0) >= 2000);
  assert(dear.length > 0, 'there are expensive plays to be excluded');
  const offered = dear.filter(p => themeAllows(walker, p));
  assert(offered.length === 0, `Blockwalker is offered no big-money asks (${offered.map(p => p.id).join(',')})`);

  const heir = createNewState({ seed: 11 });
  heir.personaId = 'fadedname';
  heir.money = 3000;
  const heirOffered = dear.filter(p => themeAllows(heir, p));
  assert(heirOffered.length > 0, 'the Faded Name can be offered what money opens');
  console.log('PASS: theme gate separates the Blockwalker from the Faded Name.');
}

// --- 9. Liabilities bite from the hand, not from the deck --------------
{
  const s = createNewState({ seed: 12, ap: CAMPAIGN_AP, favors: 3 });
  const tradey = PLAYS.find(p => (p.cost?.fav ?? 0) > 0);
  assert(!!tradey, 'there is a favor-priced play to block');

  s.deck = [RIGIDITY];
  syncHand(s, []); // owned, not held
  assert(liabilityBlockReason(s, tradey!) === '', 'owning Rigidity blocks nothing');

  syncHand(s, [RIGIDITY]); // now it is in your hand
  assert(liabilityBlockReason(s, tradey!) !== '', 'holding Rigidity refuses the trade');

  // A liability never blocks itself — playing it is the way out.
  syncHand(s, [NO_STANDING]);
  assert(liabilityBlockReason(s, card(NO_STANDING)) === '', 'a liability never blocks itself');
  // Borrowed authority is exempt from No Standing: that is the whole joke.
  assert(liabilityBlockReason(s, card('PL56')) === '', "The Boss's Name works without standing");
  console.log('PASS: liabilities bite from the hand only, and never block their own way out.');
}

// --- 10. Trashing happens by playing, never by a button ----------------
{
  const c = zeroCampaign('believer', 21);
  startWeek(c);
  // Put Rigidity in hand and play it: it must leave the deck for good.
  c.deck.hand.push(RIGIDITY);
  if (!c.state.deck!.includes(RIGIDITY)) c.state.deck!.push(RIGIDITY);
  syncHand(c.state, c.deck.hand);
  resetSlots(c.state);
  c.state.ap = CAMPAIGN_AP;
  c.state.momentum = 3;
  const idx = c.deck.hand.indexOf(RIGIDITY);
  const before = c.state.deck!.filter(x => x === RIGIDITY).length;
  const r = playFromHand(c, idx);
  assert(r.ok, `playing the liability resolves it (${r.reason ?? ''})`);
  const after = c.state.deck!.filter(x => x === RIGIDITY).length;
  assert(before === 1 && after === 0, 'the liability is gone from the deck, not discarded');
  assert(!c.deck.discard.includes(RIGIDITY), 'and it is not sitting in the discard to come back');

  // There is no standing trash verb anywhere in the playable surface.
  const verbs = listPlayableHand(c).map(o => o.card.n.toLowerCase());
  assert(
    !verbs.some(n => n.includes('trash') || n.includes('remove card') || n.includes('delete')),
    'no trash/remove verb is ever offered as an action'
  );
  console.log('PASS: a liability leaves only by being played, and there is no trash button.');
}

// --- 11. The counter: she answers everything you say ---------------------
{
  // Silence is the failure state of a conversation. Every line a player can
  // speak must get something back, or the scene collapses into a form again.
  const spoken: string[] = [
    ...STARTING_PERSONAS.map(p => p.id),
    ...ORIGIN_QUESTIONS.flatMap(q => q.answers.map(a => a.id)),
    ...['safe', 'competitive', 'wrong']
  ];
  const mute = spoken.filter(id => !CLERK_REPLIES[id]);
  assert(mute.length === 0, `she has a reply to every answer (mute: ${mute.join(', ') || 'none'})`);

  // And every line is actually sayable in the first person, not a description
  // of the player in the third.
  const unsaid = [
    ...STARTING_PERSONAS.filter(p => !p.said).map(p => p.id),
    ...ORIGIN_QUESTIONS.flatMap(q => q.answers.filter(a => !a.said).map(a => a.id))
  ];
  assert(unsaid.length === 0, `every answer is a line you speak (missing: ${unsaid.join(', ') || 'none'})`);

  for (const q of ORIGIN_QUESTIONS) {
    assert(!!CLERK_ASKS[q.id], `she has a question for ${q.id}`);
  }
  assert(!!CLERK_ASKS.name && !!CLERK_ASKS.persona, 'and for the name and the occupation');
  console.log(`PASS: ${spoken.length} answers, ${spoken.length} replies — nobody is talked past.`);
}

console.log('\n=== zero-start OK ===');
