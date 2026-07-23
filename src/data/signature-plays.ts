/**
 * CANDIDATE ZERO — Signature plays (persona-exclusive "special rare" cards)
 * ========================================================================
 * One per persona. Each is gated to its signature persona (`req`/`show`
 * check `s.persona`) AND is only ever injected into that persona's draw pile
 * (see createCampaign in loop.ts) — so no other persona can draw or play it.
 * One copy per run, so these read as a rare high point, not a staple; balance
 * risk is bounded (harness:matrix keeps win rates in band).
 *
 * Effects use the normal resolution engine (odds + tiered run), so signature
 * cards obey the same RNG covenants as every other play. They are non-field
 * (resolve immediately, no ground pick) to keep the special moment clean.
 *
 * Attrs / risk / cost / phase / flavor follow the uploaded card list; the IDs
 * are assigned here (SIG01–SIG24) rather than the list's PL57–PL77.
 * Hand-authored classics teacher / veteran / smallbiz are SIG22–24.
 */

import type { GameState, RollResult, PlayCard, AttrId } from '../engine/types.js';
import { random } from '../engine/rng.js';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Nudge the strongest opponent ground down — a clean "contrast landed" hit. */
function hitRival(s: GameState, amt: number): void {
  const g = [...s.groundsArr].sort((a, b) => (b.rivalRap || 0) - (a.rivalRap || 0))[0];
  if (g) g.rivalRap = Math.max(0, (g.rivalRap || 0) - amt);
  s.hitPieces = (s.hitPieces || 0) + 1;
}

interface SigDef {
  id: string;
  persona: string;
  n: string;
  attrs: AttrId[];
  risk: PlayCard['risk'];
  cost: PlayCard['cost'];
  ph: number[];
  tag: string;
  d: string;
  odds: (s: GameState) => number;
  run: (s: GameState, o: RollResult) => string;
}

/** persona id → signature card id (used to inject into that persona's deck). */
export const SIGNATURE_BY_PERSONA: Record<string, string> = {};

function mk(def: SigDef): PlayCard {
  SIGNATURE_BY_PERSONA[def.persona] = def.id;
  const gate = (s: GameState) => s.personaId === def.persona;
  return {
    id: def.id,
    n: def.n,
    cost: def.cost,
    risk: def.risk,
    ph: def.ph,
    tag: def.tag,
    d: def.d,
    attrs: def.attrs,
    kind: 'action',
    residency: 'main',
    control: 'player',
    req: gate,
    show: gate,
    odds: def.odds,
    run: def.run
  };
}

// Signature odds run a touch above a comparable common card — this is the
// persona's best move — but still bounded by risk band.
const O = (base: number) => (s: GameState) => clamp(base + (s.messageSharp ? 0.05 : 0), 0.05, 0.95);

export const SIGNATURE_PLAYS: PlayCard[] = [
  // ---- Pure personas ----
  mk({
    id: 'SIG01', persona: 'PA_CLO', n: 'Fill the Square', attrs: ['CLO'], risk: 'VOL',
    cost: { a: 2, vp: 3 }, ph: [2, 3], tag: 'signature — The Powerhouse',
    d: 'You do not ask for the room. You fill it, and the turnout operation fills the rest.',
    odds: O(0.58),
    run: (s, o) => {
      if (o.tier === 0) { const c = 60 + Math.floor(random() * 30); s.contacts += c; s.nameID += 5; s.momentum += 2; s.groundsArr.forEach(g => (g.gotv += 0.06)); return `The square overflows. +${c} contacts, +5 name ID, momentum, and turnout banked everywhere.`; }
      if (o.tier === 1) { s.contacts += 30; s.nameID += 3; s.momentum += 1; return 'A real crowd. +30 contacts, +3 name ID, momentum.'; }
      if (o.tier === 2) { s.contacts += 8; return 'Half the folding chairs stay empty. +8 contacts.'; }
      s.momentum = Math.max(0, s.momentum - 1); return 'Rain, and a rival counter-rally across the street. Momentum leaks.';
    }
  }),
  mk({
    id: 'SIG02', persona: 'PA_CON', n: 'The Unbending Line', attrs: ['CON'], risk: 'STD',
    cost: { a: 1 }, ph: [2, 3], tag: 'signature — The True Believer',
    d: 'The message arrives pre-sharpened and never wavers. You say the same true thing until it is the only thing.',
    odds: O(0.62),
    run: (s, o) => {
      if (o.tier <= 1) { s.messageSharp = true; s.momentum += 2; s.nameID += 2; return 'The line holds and travels. Message sharp, +2 momentum, +2 name ID.'; }
      if (o.tier === 2) { s.messageSharp = true; return 'Preaching to the choir, but the choir is real. Message sharp.'; }
      s.momentum = Math.max(0, s.momentum - 1); return 'Rigid reads as brittle tonight. A little momentum lost.';
    }
  }),
  mk({
    id: 'SIG03', persona: 'PA_CRA', n: 'Call In a Marker', attrs: ['CRA'], risk: 'STD',
    cost: { a: 1, fav: 1 }, ph: [1, 2, 3], tag: 'signature — The Operator',
    d: 'Someone owes you, and today is the day. The angle was always there.',
    odds: O(0.68),
    run: (s, o) => {
      if (o.tier <= 1) { s.endorsePts += 3; hitRival(s, 6); return "A marker called: +3 endorsement points and the rival's best ground softens."; }
      if (o.tier === 2) { s.endorsePts += 1; return 'The favor was smaller than remembered. +1 endorsement point.'; }
      s.favors = Math.max(0, s.favors - 0); return 'The debt is disputed. Nothing moves — and now they know you asked.';
    }
  }),
  mk({
    id: 'SIG04', persona: 'PA_INK', n: 'The Airtight Filing', attrs: ['INK'], risk: 'SAFE',
    cost: { a: 1 }, ph: [1], tag: 'signature — The Parliamentarian',
    d: 'Every box checked, every deadline beaten. The clerk finds nothing because there is nothing to find.',
    odds: O(0.8),
    run: (s, o) => {
      if (o.tier <= 1) { s.signatures += 40; if (s.signatures >= s.sigNeed && !s.ballot) { s.ballot = true; return 'Filing airtight — the threshold clears itself. On the ballot.'; } s.nameID += 1; return `The paperwork does the walking. +40 toward the ballot (${s.signatures}/${s.sigNeed}).`; }
      s.signatures += 15; return 'A tidy filing. +15 toward the ballot.';
    }
  }),
  mk({
    id: 'SIG05', persona: 'PA_DIP', n: 'Broker the Grand Bargain', attrs: ['DIP'], risk: 'STD',
    cost: { a: 1 }, ph: [2, 3], tag: 'signature — The Coalition-Builder',
    d: 'You seat the rancher next to the union man and both leave thinking they won.',
    odds: O(0.66),
    run: (s, o) => {
      if (o.tier <= 1) { s.endorsePts += 3; s.favors += 1; return 'A bargain everyone can sell at home. +3 endorsement points, +1 favor.'; }
      if (o.tier === 2) { s.endorsePts += 1; return 'A handshake, provisional. +1 endorsement point.'; }
      return 'The table walks. No deal, and a bruised ego to mend.';
    }
  }),
  mk({
    id: 'SIG06', persona: 'PA_CHA', n: 'Remember Every Name', attrs: ['CHA'], risk: 'VOL',
    cost: { a: 1, vp: 1 }, ph: [1, 2, 3], tag: 'signature — The Natural',
    d: 'The kid, the dog, the surgery last spring. You remember, and they never forget that you did.',
    odds: O(0.6),
    run: (s, o) => {
      if (o.tier === 0) { const c = 40 + Math.floor(random() * 20); s.contacts += c; s.nameID += 4; s.momentum += 1; return `Every name lands. +${c} contacts, +4 name ID, momentum.`; }
      if (o.tier === 1) { s.contacts += 22; s.nameID += 2; return '+22 contacts and +2 name ID. They tell their neighbors.'; }
      if (o.tier === 2) { s.contacts += 6; return 'An off night for faces. +6 contacts.'; }
      return 'You blank on the mayor’s wife. It travels. Nothing gained.';
    }
  }),

  // ---- Pair personas ----
  mk({
    id: 'SIG07', persona: 'PA_CLO_CON', n: 'March on the Capitol Steps', attrs: ['CLO', 'CON'], risk: 'VOL',
    cost: { a: 2, vp: 2 }, ph: [2, 3], tag: 'signature — The Movement Champion',
    d: 'Conviction with muscle behind it — a crowd that showed up angry and organized.',
    odds: O(0.57),
    run: (s, o) => {
      if (o.tier === 0) { s.momentum += 3; s.nameID += 4; s.contacts += 25; s.messageSharp = true; return 'The steps fill and the cameras come. +3 momentum, +4 name ID, +25 contacts, message sharp.'; }
      if (o.tier === 1) { s.momentum += 1; s.nameID += 2; s.contacts += 12; return 'A respectable showing. +1 momentum, +2 name ID, +12 contacts.'; }
      if (o.tier === 2) { s.contacts += 5; return 'Smaller than promised. +5 contacts.'; }
      s.momentum = Math.max(0, s.momentum - 1); return 'A bad sign steals the photo. Momentum lost.';
    }
  }),
  mk({
    id: 'SIG08', persona: 'PA_CLO_CRA', n: 'The Elbow', attrs: ['CLO', 'CRA'], risk: 'VOL',
    cost: { a: 1 }, ph: [2, 3], tag: 'signature — The Bare-Knuckle Populist',
    d: 'Loud out front, and an elbow the establishment never sees coming.',
    odds: O(0.58),
    run: (s, o) => {
      if (o.tier === 0) { hitRival(s, 12); s.momentum += 2; s.nameID += 2; return "The elbow lands clean. The rival's ground buckles, +2 momentum, +2 name ID."; }
      if (o.tier === 1) { hitRival(s, 6); s.momentum += 1; return 'A solid shot. The opposition gives ground, +1 momentum.'; }
      if (o.tier === 2) { return 'A glancing blow. Nothing much moves.'; }
      s.hitPieces += 1; s.momentum = Math.max(0, s.momentum - 1); return 'You swing and miss, and the miss is the story. Momentum lost.';
    }
  }),
  mk({
    id: 'SIG09', persona: 'PA_CLO_INK', n: 'Outwork the Field', attrs: ['CLO', 'INK'], risk: 'SAFE',
    cost: { a: 2 }, ph: [1, 2, 3], tag: 'signature — The Workhorse',
    d: 'Grind plus the rulebook. You are still knocking when the others go home.',
    odds: O(0.82),
    run: (s, o) => {
      if (o.tier <= 1) { const c = 34 + Math.floor(random() * 14); s.contacts += c; s.volPool += 1; s.nameID += 2; if (s.stage !== 'general' && !s.ballot) s.signatures += 20; return `Nobody outworks you. +${c} contacts, a volunteer, +2 name ID${s.stage !== 'general' && !s.ballot ? ', +20 toward the ballot' : ''}.`; }
      s.contacts += 14; return 'A long, ordinary, productive day. +14 contacts.';
    }
  }),
  mk({
    id: 'SIG10', persona: 'PA_CLO_DIP', n: 'The Family Name Opens the Gate', attrs: ['CLO', 'DIP'], risk: 'STD',
    cost: { a: 1 }, ph: [1, 2], tag: 'signature — The Rural Patriarch',
    d: 'Your name means something here. The chairs already wave you through.',
    odds: O(0.66),
    run: (s, o) => {
      if (o.tier <= 1) { s.endorsePts += 3; s.contacts += 14; s.groundsArr.slice(0, 2).forEach(g => (g.rapport = (g.rapport || 0) + 4)); return 'The gate opens on the name. +3 endorsement points, +14 contacts, two grounds warm.'; }
      if (o.tier === 2) { s.endorsePts += 1; return 'Polite nods, little more. +1 endorsement point.'; }
      return 'The name cuts both ways today. Nothing gained.';
    }
  }),
  mk({
    id: 'SIG11', persona: 'PA_CLO_CHA', n: 'The Homecoming', attrs: ['CLO', 'CHA'], risk: 'STD',
    cost: { a: 1 }, ph: [1, 2], tag: 'signature — The Local Legend',
    d: 'Star quarterback, then feed-store owner, now this. The county has rooted for you for decades.',
    odds: O(0.68),
    run: (s, o) => {
      if (o.tier <= 1) { const c = 26 + Math.floor(random() * 12); s.contacts += c; s.nameID += 4; s.momentum += 1; return `The whole town turns out. +${c} contacts, +4 name ID, momentum.`; }
      if (o.tier === 2) { s.contacts += 8; return 'A warm but small welcome. +8 contacts.'; }
      return 'The legend feels dated tonight. Nothing gained.';
    }
  }),
  mk({
    id: 'SIG12', persona: 'PA_CON_CRA', n: 'Burn It Down to Build It Up', attrs: ['CON', 'CRA'], risk: 'VOL',
    cost: { a: 1 }, ph: [2, 3], tag: 'signature — The Insurgent',
    d: 'A disciplined message and a knife for the primary. You are exactly as angry as you choose to be.',
    odds: O(0.56),
    run: (s, o) => {
      if (o.tier === 0) { hitRival(s, 8); s.momentum += 3; s.messageSharp = true; return 'The insurgency catches fire. Rival ground burns, +3 momentum, message sharp.'; }
      if (o.tier === 1) { hitRival(s, 4); s.momentum += 1; return 'The base roars. +1 momentum and a dent in the opposition.'; }
      if (o.tier === 2) { s.momentum += 1; return 'Heat without light. +1 momentum.'; }
      s.momentum = Math.max(0, s.momentum - 2); return 'The fire jumps the line and singes you. Momentum lost.';
    }
  }),
  mk({
    id: 'SIG13', persona: 'PA_CON_INK', n: 'File the Whistleblower Complaint', attrs: ['CON', 'INK'], risk: 'VOL',
    cost: { a: 1 }, ph: [2, 3], tag: 'signature — The Reform Crusader',
    d: 'A cause and the rulebook to advance it. You file, and the file has teeth.',
    odds: O(0.58),
    run: (s, o) => {
      if (o.tier === 0) { hitRival(s, 10); s.nameID += 4; s.messageSharp = true; return 'The complaint sticks and leads the news. Rival ground caves, +4 name ID, message sharp.'; }
      if (o.tier === 1) { hitRival(s, 5); s.nameID += 2; return 'A credible filing. +2 name ID and the opposition on defense.'; }
      if (o.tier === 2) { s.nameID += 1; return 'Filed and noted, quietly. +1 name ID.'; }
      s.hitPieces += 1; return 'It reads as a stunt. It rebounds. Nothing gained.';
    }
  }),
  mk({
    id: 'SIG14', persona: 'PA_CON_DIP', n: 'Cross the Aisle', attrs: ['CON', 'DIP'], risk: 'STD',
    cost: { a: 1 }, ph: [2, 3], tag: 'signature — The Statesman',
    d: 'Steady, principled, trusted across the aisle — the kind they call "serious."',
    odds: O(0.65),
    run: (s, o) => {
      if (o.tier <= 1) { s.endorsePts += 2; s.momentum += 1; s.nameID += 2; return 'A serious figure, seriously received. +2 endorsement points, +1 momentum, +2 name ID.'; }
      if (o.tier === 2) { s.endorsePts += 1; return 'Respect, if not yet a rush. +1 endorsement point.'; }
      return 'The base grumbles about the reach-across. Nothing gained.';
    }
  }),
  mk({
    id: 'SIG15', persona: 'preacher', n: 'Revival Weekend', attrs: ['CON', 'CHA'], risk: 'STD',
    cost: { a: 2, vp: 1 }, ph: [2, 3], tag: 'signature — The Preacher',
    d: 'A pulpit is a precinct and Sundays are turnout. You move people, and you mean it.',
    odds: O(0.64),
    run: (s, o) => {
      if (o.tier <= 1) { const c = 30 + Math.floor(random() * 16); s.contacts += c; s.volPool += 2; s.momentum += 2; return `The tent fills three nights running. +${c} contacts, +2 volunteers, +2 momentum.`; }
      if (o.tier === 2) { s.contacts += 10; s.volPool += 1; return 'A modest revival. +10 contacts, +1 volunteer.'; }
      return 'Empty pews and a long drive home. Nothing gained.';
    }
  }),
  mk({
    id: 'SIG16', persona: 'PA_CRA_INK', n: 'Work the System', attrs: ['CRA', 'INK'], risk: 'STD',
    cost: { a: 1 }, ph: [1, 2, 3], tag: 'signature — The Fixer',
    d: 'You know the rules AND how to bend them. Dangerous in a committee, deadly near a deadline.',
    odds: O(0.67),
    run: (s, o) => {
      if (o.tier <= 1) { s.favors += 1; s.endorsePts += 2; hitRival(s, 4); return 'The machinery turns your way. +1 favor, +2 endorsement points, and the rival slips.'; }
      if (o.tier === 2) { s.favors += 1; return 'A small lever, quietly pulled. +1 favor.'; }
      return 'You over-reach and someone notices. Nothing gained.';
    }
  }),
  mk({
    id: 'SIG17', persona: 'PA_CRA_DIP', n: 'The Grand Trade', attrs: ['CRA', 'DIP'], risk: 'STD',
    cost: { a: 1 }, ph: [2, 3], tag: 'signature — The Wheeler-Dealer',
    d: 'Two of everything and a price on each. You can trade your way out of almost anything.',
    odds: O(0.66),
    run: (s, o) => {
      if (o.tier <= 1) { s.favors += 2; s.endorsePts += 2; return 'Everything for something. +2 favors, +2 endorsement points.'; }
      if (o.tier === 2) { s.favors += 1; return 'A modest swap. +1 favor.'; }
      return 'The trade collapses and both sides blame you. Nothing gained.';
    }
  }),
  mk({
    id: 'SIG18', persona: 'PA_CRA_CHA', n: 'Steal the Cycle', attrs: ['CRA', 'CHA'], risk: 'VOL',
    cost: { a: 1, $: 400 }, ph: [2, 3], tag: 'signature — The Showman',
    d: 'Timing and charm: you know the line AND the moment to land it. Made for the cameras.',
    odds: O(0.59),
    run: (s, o) => {
      if (o.tier === 0) { s.nameID += 6; s.momentum += 3; return 'You own the news for a week. +6 name ID, +3 momentum.'; }
      if (o.tier === 1) { s.nameID += 3; s.momentum += 1; return 'A clip that travels. +3 name ID, +1 momentum.'; }
      if (o.tier === 2) { s.nameID += 1; return 'A minor segment. +1 name ID.'; }
      s.momentum = Math.max(0, s.momentum - 1); return 'The bit falls flat on camera. Momentum lost.';
    }
  }),
  mk({
    id: 'SIG19', persona: 'PA_INK_DIP', n: "The Speaker's Ear", attrs: ['INK', 'DIP'], risk: 'STD',
    cost: { a: 1 }, ph: [2, 3], tag: 'signature — The Committee Chair-in-Waiting',
    d: 'Process mastery and the relationships to use it. Leadership is watching this profile.',
    odds: O(0.66),
    run: (s, o) => {
      if (o.tier <= 1) { s.endorsePts += 3; s.favors += 1; return 'Leadership takes the meeting. +3 endorsement points, +1 favor.'; }
      if (o.tier === 2) { s.endorsePts += 1; return 'A brief audience. +1 endorsement point.'; }
      return 'The ear is elsewhere today. Nothing gained.';
    }
  }),
  mk({
    id: 'SIG20', persona: 'PA_INK_CHA', n: "Explain It Like It's Simple", attrs: ['INK', 'CHA'], risk: 'SAFE',
    cost: { a: 2 }, ph: [1, 2, 3], tag: 'signature — The Homegrown Wonk',
    d: 'You explain the water-district budget so plainly people thank you for it.',
    odds: O(0.8),
    run: (s, o) => {
      if (o.tier <= 1) { const c = 24 + Math.floor(random() * 12); s.contacts += c; s.nameID += 3; s.messageSharp = true; return `Clarity is charisma here. +${c} contacts, +3 name ID, message sharp.`; }
      s.contacts += 10; s.nameID += 1; return 'A patient, useful hour. +10 contacts, +1 name ID.';
    }
  }),
  mk({
    id: 'SIG21', persona: 'PA_DIP_CHA', n: 'Call In the Family Rolodex', attrs: ['DIP', 'CHA'], risk: 'STD',
    cost: { a: 1 }, ph: [1, 2], tag: "signature — The Dealmaker's Heir",
    d: 'A known name and a gift for people. Doors open on the family reputation; you keep them open on your own.',
    odds: O(0.67),
    run: (s, o) => {
      if (o.tier <= 1) { s.endorsePts += 2; s.contacts += 14; s.favors += 1; return 'The old Rolodex still dials out. +2 endorsement points, +14 contacts, +1 favor.'; }
      if (o.tier === 2) { s.contacts += 8; return 'A few old friends answer. +8 contacts.'; }
      return 'The name is spent capital tonight. Nothing gained.';
    }
  }),
  // ---- Hand-authored classics (must not lack a signature vs PA_* roster) ----
  mk({
    id: 'SIG22', persona: 'teacher', n: 'Parent-Teacher Circuit', attrs: ['CHA', 'DIP'], risk: 'SAFE',
    cost: { a: 1 }, ph: [1, 2, 3], tag: 'signature — The Teacher',
    d: 'Twenty years of cafeteria nights. You work the rooms that already know your name.',
    odds: O(0.78),
    run: (s, o) => {
      if (o.tier <= 1) {
        const c = 28 + Math.floor(random() * 14);
        s.contacts += c;
        s.nameID += 2;
        s.volPool += 1;
        return `The gym fills with familiar faces. +${c} contacts, +2 name ID, +1 volunteer.`;
      }
      s.contacts += 12;
      return 'A solid night of handshakes. +12 contacts.';
    }
  }),
  mk({
    id: 'SIG23', persona: 'veteran', n: 'Halls of Honor', attrs: ['CON', 'CLO'], risk: 'STD',
    cost: { a: 1 }, ph: [1, 2, 3], tag: 'signature — The Veteran',
    d: 'The VFW and Legion still stand when the cameras leave. Bio is armor; the halls are turnout.',
    odds: O(0.66),
    run: (s, o) => {
      if (o.tier <= 1) {
        s.endorsePts += 1;
        s.volPool += 2;
        s.nameID += 2;
        s.contacts += 16;
        const hall = s.groundsArr.find(g => g.id === 'GR06');
        if (hall) hall.rapport = Math.min(100, (hall.rapport || 0) + 8);
        return 'The halls turn out. +1 endorsement, +2 volunteers, +2 name ID, +16 contacts, Legion rapport.';
      }
      if (o.tier === 2) {
        s.volPool += 1;
        s.contacts += 8;
        return 'A respectful room. +1 volunteer, +8 contacts.';
      }
      return 'Empty chairs and old coffee. Nothing gained.';
    }
  }),
  mk({
    id: 'SIG24', persona: 'smallbiz', n: 'Call In the Store Credit', attrs: ['CRA', 'DIP'], risk: 'STD',
    cost: { a: 1 }, ph: [1, 2], tag: 'signature — The Feed-Store Owner',
    d: 'Everyone still owes you a favor or a bag of feed. You cash favors before cash.',
    odds: O(0.68),
    run: (s, o) => {
      if (o.tier <= 1) {
        s.money += 600;
        s.favors += 1;
        s.contacts += 12;
        s.endorsePts += 1;
        return 'The ledger of favors pays. +$600, +1 favor, +12 contacts, +1 endorsement.';
      }
      if (o.tier === 2) {
        s.money += 250;
        s.contacts += 6;
        return 'A few tabs settled. +$250, +6 contacts.';
      }
      return 'They smile and change the subject. Nothing gained.';
    }
  })
];
