/**
 * CANDIDATE ZERO — Play cards, Wave 5 (library expansion)
 * =======================================================
 * A richer basic deck plus acquirable uncommon/rare cards. Rarity weights the
 * phase-draft pool (deck.ts buildPhaseDraft): common cards land often, rare
 * cards are a real find. All are residency 'main', control 'player', and obey
 * the normal odds/tier resolution — same covenants as every other play.
 *
 * Attrs: CLO visibility/turnout · CON discipline/message · CRA maneuver/oppo ·
 *        INK procedure/rules · DIP coalitions/gatekeepers · CHA retail/charm.
 */

import type { GameState, RollResult, PlayCard } from '../engine/types.js';
import { random } from '../engine/rng.js';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
/** Nudge the strongest opponent ground down — a clean contrast hit. */
function hitRival(s: GameState, amt: number): void {
  const g = [...s.groundsArr].sort((a, b) => (b.rivalRap || 0) - (a.rivalRap || 0))[0];
  if (g) g.rivalRap = Math.max(0, (g.rivalRap || 0) - amt);
  s.hitPieces = (s.hitPieces || 0) + 1;
}
/** Bank GOTV across the top grounds (general turnout). */
function bankGotv(s: GameState, per: number, n: number): void {
  s.groundsArr.slice(0, n).forEach(g => (g.gotv = (g.gotv || 0) + per));
}

export const WAVE5_PLAYS: PlayCard[] = [
  // ---------------- COMMON — basic-deck breadth ----------------
  {
    id: 'PL80', n: 'Grocery-Store Handshakes', cost: { a: 1 }, risk: 'SAFE', ph: [1, 2, 3],
    tag: 'the parking lot', attrs: ['CHA'], rarity: 'common', residency: 'main', control: 'player',
    d: 'An hour at the exit doors. Cheap, endless, and it actually works.',
    odds: () => 0.8,
    run: (s, o) => {
      if (o.tier <= 1) { const c = 14 + Math.floor(random() * 8); s.contacts += c; s.nameID += 1; return `Carts and small talk. +${c} contacts, +1 name ID.`; }
      s.contacts += 6; return 'A slow hour, but honest. +6 contacts.';
    }
  },
  {
    id: 'PL81', n: 'Church Bulletin Ad', cost: { a: 1, $: 80 }, risk: 'SAFE', ph: [1, 2, 3],
    tag: 'the back page', attrs: ['DIP'], rarity: 'common', residency: 'main', control: 'player',
    d: 'A quarter page next to the potluck schedule. The congregation notices who shows up in print.',
    odds: () => 0.82,
    run: (s, o) => {
      if (o.tier <= 1) { s.nameID += 3; s.endorsePts += 1; return 'Quiet approval from the pews. +3 name ID, +1 endorsement point.'; }
      s.nameID += 1; return 'A small notice, seen by a few. +1 name ID.';
    }
  },
  {
    id: 'PL82', n: 'Little-League Sponsorship', cost: { a: 1, $: 120 }, risk: 'SAFE', ph: [1, 2],
    tag: 'name on the jersey', attrs: ['CLO'], rarity: 'common', residency: 'main', control: 'player',
    d: 'Your name on forty small backs, every Saturday, all season. Turnout starts young — through the parents.',
    odds: () => 0.8,
    run: (s, o) => {
      if (o.tier <= 1) { s.nameID += 4; s.volPool += 1; return 'The bleachers learn your name. +4 name ID and a team-mom volunteer.'; }
      s.nameID += 2; return 'A banner in the outfield. +2 name ID.';
    }
  },
  {
    id: 'PL83', n: 'Letter to the Editor', cost: { a: 1 }, risk: 'STD', ph: [1, 2],
    tag: 'the op-ed page', attrs: ['INK'], rarity: 'common', residency: 'main', control: 'player',
    d: 'Three hundred words, tightly argued. The people who vote in primaries read the paper.',
    odds: (s) => clamp(0.6 + (s.messageSharp ? 0.1 : 0), 0, 0.9),
    run: (s, o) => {
      if (o.tier === 0) { s.nameID += 5; s.messageSharp = true; return 'A letter that gets clipped and mailed around. +5 name ID, message sharp.'; }
      if (o.tier === 1) { s.nameID += 2; return 'Printed, and read by the faithful. +2 name ID.'; }
      if (o.tier === 2) { return 'Buried below the fold. Little effect.'; }
      s.nameID = Math.max(0, s.nameID - 1); return 'A typo makes you look careless. It circulates.';
    }
  },
  {
    id: 'PL84', n: 'Coffee-Shop Sit-Down', cost: { a: 1 }, risk: 'SAFE', ph: [1, 2, 3],
    tag: 'the corner booth', attrs: ['CHA'], rarity: 'common', residency: 'main', control: 'player',
    d: 'One table, four regulars, refills on the house. Retail politics at its most literal.',
    odds: () => 0.82,
    run: (s, o) => {
      if (o.tier <= 1) { const c = 10 + Math.floor(random() * 6); s.contacts += c; s.momentum += 1; return `Real conversation, real converts. +${c} contacts, momentum.`; }
      s.contacts += 5; return 'A quiet morning. +5 contacts.';
    }
  },

  // ---------------- UNCOMMON — acquired, stronger/niche ----------------
  {
    id: 'PL85', n: 'Union Hall Endorsement', cost: { a: 1, fav: 1 }, risk: 'STD', ph: [2, 3],
    tag: 'the locals sign on', attrs: ['DIP'], rarity: 'uncommon', residency: 'main', control: 'player',
    d: 'The business agent likes you enough to put it in writing. Stewards walk turf you never could.',
    odds: (s) => clamp(0.6 + s.volPool * 0.02, 0, 0.9),
    run: (s, o) => {
      if (o.tier <= 1) { s.endorsePts += 3; s.volPool += 2; return 'The locals endorse. +3 endorsement points and two stewards on the doors.'; }
      if (o.tier === 2) { s.endorsePts += 1; return 'A soft nod, no letterhead. +1 endorsement point.'; }
      return 'The rank and file split. The endorsement stalls.';
    }
  },
  {
    id: 'PL86', n: 'Targeted Digital Buy', cost: { a: 1, $: 700 }, risk: 'STD', ph: [2, 3],
    tag: 'the feed', attrs: ['CRA'], rarity: 'uncommon', residency: 'main', control: 'player',
    d: 'Lookalike audiences, dayparted, A/B tested. The consultant swears by the dashboard.',
    odds: (s) => clamp(0.6 + (s.assets.length ? 0.06 : 0), 0, 0.92),
    run: (s, o) => {
      if (o.tier === 0) { s.nameID += 6; s.contacts += 20; return 'The creative pops. +6 name ID, +20 contacts.'; }
      if (o.tier === 1) { s.nameID += 3; s.contacts += 8; return 'Solid reach. +3 name ID, +8 contacts.'; }
      if (o.tier === 2) { s.nameID += 1; return 'Impressions without engagement. +1 name ID.'; }
      return 'The buy funds the wrong district. Money down the well.';
    }
  },
  {
    id: 'PL87', n: 'Charter the Senior Vans', cost: { a: 1, vp: 2 }, risk: 'STD', ph: [3],
    tag: 'the surest voters', attrs: ['CLO'], rarity: 'uncommon', residency: 'main', control: 'player',
    d: 'The seniors vote at ninety percent and love a ride. Turnout you can schedule.',
    odds: () => 0.72,
    run: (s, o) => {
      if (o.tier <= 1) { bankGotv(s, 0.1, 3); s.contacts += 12; return 'The vans run all day. +12 contacts and turnout banked across three grounds.'; }
      bankGotv(s, 0.04, 1); return 'A half-full van, still worth it. A little turnout banked.';
    }
  },
  {
    id: 'PL88', n: 'Opposition Tracker', cost: { a: 1, $: 400 }, risk: 'VOL', ph: [2, 3],
    tag: 'the guy with the camera', attrs: ['CRA'], rarity: 'uncommon', residency: 'main', control: 'player',
    d: 'A kid with a camcorder at every rival event, waiting for the gaffe. Sometimes it comes.',
    odds: (s) => clamp(0.5 + s.faces.O * 0.003, 0, 0.9),
    run: (s, o) => {
      if (o.tier === 0) { hitRival(s, 10); s.nameID += 2; return 'The tracker catches a real one. The rival ground buckles, +2 name ID.'; }
      if (o.tier === 1) { hitRival(s, 4); return 'A minor slip, usefully clipped. The opposition softens.'; }
      if (o.tier === 2) { return 'Hours of nothing. The kid needs paying anyway.'; }
      s.hitPieces += 1; return 'Your tracker gets caught trespassing. The story is you.';
    }
  },
  {
    id: 'PL89', n: 'Megachurch Sunday', cost: { a: 1 }, risk: 'VOL', ph: [1, 2, 3],
    tag: 'the big room', attrs: ['CHA'], rarity: 'uncommon', residency: 'main', control: 'player',
    d: 'Three thousand seats and a pastor who might, or might not, wave you up front.',
    odds: (s) => clamp(0.5 + s.endorsePts * 0.01, 0, 0.9),
    run: (s, o) => {
      if (o.tier === 0) { const c = 40 + Math.floor(random() * 20); s.contacts += c; s.momentum += 2; return `The pastor calls you up. +${c} contacts, +2 momentum.`; }
      if (o.tier === 1) { s.contacts += 18; return 'A friendly mention from the stage. +18 contacts.'; }
      if (o.tier === 2) { s.contacts += 6; return 'You shake hands in the lobby. +6 contacts.'; }
      s.momentum = Math.max(0, s.momentum - 1); return 'The pastor stays neutral, pointedly. Momentum leaks.';
    }
  },

  // ---------------- RARE — acquired, powerful ----------------
  {
    id: 'PL90', n: 'Statewide Figure Endorses', cost: { a: 1, fav: 1 }, risk: 'VOL', ph: [2, 3],
    tag: 'the big name', attrs: ['DIP'], rarity: 'rare', residency: 'main', control: 'player',
    d: 'A name people know from television deigns to say yours. The bump is real; so is the debt.',
    odds: (s) => clamp(0.52 + s.endorsePts * 0.015, 0, 0.9),
    run: (s, o) => {
      if (o.tier === 0) { s.endorsePts += 5; s.nameID += 6; s.momentum += 2; return 'The big name goes all in. +5 endorsement points, +6 name ID, +2 momentum.'; }
      if (o.tier === 1) { s.endorsePts += 3; s.nameID += 3; return 'A solid, quotable endorsement. +3 endorsement points, +3 name ID.'; }
      if (o.tier === 2) { s.endorsePts += 1; return 'A tepid word in a crowded release. +1 endorsement point.'; }
      s.faces.O += 3; return 'The big name has baggage that becomes your baggage. It backfires.';
    }
  },
  {
    id: 'PL91', n: 'The Viral Moment', cost: { a: 1 }, risk: 'VOL', ph: [2, 3],
    tag: 'lightning in a bottle', attrs: ['CHA'], rarity: 'rare', residency: 'main', control: 'player',
    d: 'You say the exact right thing at the exact right second and the internet decides to care.',
    odds: (s) => clamp(0.45 + (s.messageSharp ? 0.12 : 0) + s.momentum * 0.01, 0, 0.9),
    run: (s, o) => {
      if (o.tier === 0) { s.nameID += 12; s.momentum += 4; s.contacts += 25; return 'It explodes. +12 name ID, +4 momentum, +25 contacts. For a week you are the race.'; }
      if (o.tier === 1) { s.nameID += 5; s.momentum += 2; return 'A good day online. +5 name ID, +2 momentum.'; }
      if (o.tier === 2) { s.nameID += 1; return 'A ripple, quickly forgotten. +1 name ID.'; }
      s.momentum = Math.max(0, s.momentum - 2); s.faces.O += 2; return 'It goes viral for the wrong reason. The clip outlives the news cycle.';
    }
  },
  {
    id: 'PL92', n: 'Machine Turnout Blitz', cost: { a: 2, vp: 3 }, risk: 'VOL', ph: [3],
    tag: 'the whole apparatus', attrs: ['CLO'], rarity: 'rare', residency: 'main', control: 'player',
    d: 'Every captain, every van, every list, one weekend. When the machine moves as one, the count moves with it.',
    odds: (s) => clamp(0.55 + s.endorsePts * 0.01 + s.volPool * 0.02, 0, 0.92),
    run: (s, o) => {
      if (o.tier === 0) { bankGotv(s, 0.14, 6); s.contacts += 30; return 'The apparatus turns as one. Heavy turnout banked everywhere, +30 contacts.'; }
      if (o.tier === 1) { bankGotv(s, 0.08, 3); s.contacts += 14; return 'A strong weekend. Turnout up across three grounds, +14 contacts.'; }
      if (o.tier === 2) { bankGotv(s, 0.03, 2); return 'Some captains no-show. Modest turnout banked.'; }
      s.volPool = Math.max(0, s.volPool - 1); return 'Wires crossed; two crews work the same block. A wasted weekend.';
    }
  }
];
