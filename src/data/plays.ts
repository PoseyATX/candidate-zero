/**
 * CANDIDATE ZERO — Play Card Data (pure, explicit-state)
 * All cards tagged with root attributes for cardAttrMod synergy.
 * CHA = retail/charm/doors
 * CLO = visibility/turnout/muscle
 * CON = discipline/message
 * CRA = maneuver/oppo/fixer
 * INK = procedure/rules
 * DIP = coalitions/gatekeepers
 */

import type { GameState, Ground, RollResult, PlayCard } from '../engine/types.js';
import { random } from '../engine/rng.js';
import { addAlly, warm, allyWarmAtGround } from '../engine/reputation.js';
import { WAVE4_PLAYS } from './plays-wave4.js';
import { allShopPlayTemplates } from './assets.js';
import { STARMAP_PLAYS } from './plays-starmap.js';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function rapGain(g: Ground, amt: number, state: GameState) {
  if (state.rapStall) amt = Math.ceil(amt / 2);
  // Phase 1 diminishing returns: repeat-ground plays this week bank less
  // new rapport (multiplier set by executePlay from getGroundPenalty).
  amt = Math.round(amt * (state.groundRapMult ?? 1));
  g.rapport = clamp(g.rapport + amt, 0, 100);
}

// ===== WAVE 1: Early core + ballot access =====
export const PL01_BlockWalk: PlayCard = {
  id: 'PL01', n: 'Block Walk', cost: { a: 1 }, risk: 'SAFE', ph: [1,2,3], field: true, tag: 'the spine',
  attrs: ['CHA'],
  d: 'Boots and a clipboard. The one play that never turns on you. When in doubt.',
  odds: (s) => clamp(0.62 + s.volPool*0.02 + (s.assets.includes('A01')?0.12:0) + (s.messageSharp?0.05:0), 0, 0.95),
  run: (s, o, g) => {
    if (!g) return 'No ground selected.'; s.walkCount++;
    // Phase 1: the Field Director (AL09) boosts the turf they actually work.
    const mult = (s.assets.includes('A01')?1.5:1) * (allyWarmAtGround(s,'AL09',g.id)?1.2:1);
    // archive:547–548 — A11 Push Cards add +1 name ID on successful walks
    const push = s.assets.includes('A11') ? 1 : 0;
    if (o.tier === 0) { const c = Math.min(g.pool, Math.round((55+random()*30)*mult)); g.pool-=c; s.contacts+=c; rapGain(g,6,s); s.volPool+=1; s.nameID+=2+push; return `A church picnic adopts you whole. +${c} contacts, a volunteer, and rapport at ${g.n}.`; }
    if (o.tier === 1) { const c = Math.min(g.pool, Math.round((22+random()*16)*mult)); g.pool-=c; s.contacts+=c; s.volPool+=1; rapGain(g,3,s); s.nameID+=push; return `Doors open. +${c} contacts, +1 volunteer at ${g.n}`; }
    const c = Math.min(g.pool,6); g.pool-=c; s.contacts+=c; return 'Heat, dogs, closed blinds. +'+c+' contacts and one ruined pair of boots.';
  }
};

export const PL02_PhoneBank: PlayCard = {
  id: 'PL02', n: 'Phone Bank', cost: { a:1, vp:1 }, risk: 'SAFE', ph: [1,2,3], field: true, tag: 'rain-proof',
  attrs: ['CHA'],
  d: 'Half the yield, none of the weather. Grandma\'s kitchen table is HQ.',
  odds: (s) => clamp(0.6 + (s.assets.includes('A09')?0.15:0), 0, 0.95),
  run: (s, o, g) => { if (!g) return 'No ground.'; const mult = s.assets.includes('A09')?2:1; const c = Math.min(g.pool, Math.round((o.tier<=1?14:5)*mult)); g.pool-=c; s.contacts+=c; rapGain(g, o.tier<=1?2:1, s); return `+${c} contacts by wire at ${g.n}.`; }
};

export const PL03_YardSignBlitz: PlayCard = {
  id: 'PL03', n: 'Yard Sign Blitz', cost: { a:1, $:150 }, risk: 'SAFE', ph: [1,2], field: true, tag: 'visibility',
  attrs: ['CLO'],
  d: 'A district that sees your name starts believing it belongs there.',
  odds: () => 0.8,
  run: (s, _o, g) => { if (!g) return 'No ground.'; s.nameID+=2; rapGain(g,1,s); return `Signs up along ${g.n}. The name is out in the weather now.`; }
};

export const PL04_PetitionDrive: PlayCard = {
  id: 'PL04', n: 'Petition Drive', cost: { a:1 }, risk: 'STD', ph: [1], tag: 'the zero-dollar door',
  attrs: ['CLO'],
  d: 'Signatures instead of a fee. Labor is the currency you were born holding.',
  show: (s) => !s.ballot,
  odds: (s) => clamp(0.60 + s.volPool*0.035 + (warm(s,'AL09')?0.08:0), 0, 0.95),
  run: (s, o) => {
    if (o.tier <= 1) {
      // 2026-07-17 re-tune: labor path was costing ~5.5-6 of 8 primary weeks
      // (nearly all AP) to clear sigNeed, starving nameID/contacts/endorsePts
      // versus the money path's ~1.5-2 week fee grind. Raised yields (not
      // odds) so labor stays the zero-dollar door without eating the primary.
      // src/harness/ballot-qualification.ts imports this card directly, so
      // there is nothing to keep in sync by hand anymore.
      const g = o.tier === 0 ? 95 + Math.floor(random()*40) : 55 + Math.floor(random()*30);
      s.signatures += g;
      if (s.signatures >= s.sigNeed && !s.ballot) { s.ballot = true; return `+${g} signatures — threshold cleared. On the ballot, free but not cheap.`; }
      return `+${g} valid signatures (${s.signatures}/${s.sigNeed}).`;
    }
    if (o.tier === 2) { s.signatures += 15; return 'Rainy Saturday. +15, half smudged.'; }
    const l = 50 + Math.floor(random()*45); s.signatures = Math.max(0, s.signatures-l); return `The county chair challenges your sheets — ${l} struck.`;
  }
};

export const PL05_PayFilingFee: PlayCard = {
  id: 'PL05', n: 'Pay the Filing Fee', cost: { $:1250 }, risk: 'SAFE', ph: [1], tag: 'the money door',
  attrs: ['CLO'],
  d: '$1,250 and it\'s done. Shame-free, story-free.', show: (s) => !s.ballot, odds: () => 0.99,
  run: (s) => { s.ballot = true; return 'Receipt in hand. You are on the ballot the expensive way.'; }
};
export const PL06_TownHall: PlayCard = {
  id: 'PL06', n: 'Town Hall', cost: { a:1 }, risk: 'STD', ph: [1,2,3], tag: 'showing up',
  attrs: ['CHA'],
  d: 'Folding chairs, burnt coffee, real questions. The kids notice if you skip these.',
  odds: (s) => clamp(0.55 + (s.messageSharp?0.08:0), 0, 0.9),
  run: (s, o) => { s.townHallThisWeek = true; if (o.tier <= 1) { s.contacts+=15; s.momentum+=1; s.volPool+=1; return 'A fair hearing, two new believers, and one of them signs up to walk.'; } if (o.tier === 2) return 'Six attendees, one of them lost.'; s.momentum = Math.max(0, s.momentum-1); return 'A heckler wins the room. It happens.'; }
};

// ===== WAVE 2 =====
export const PL07_CandidateForum: PlayCard = {
  id: 'PL07', n: 'Candidate Forum', cost: { a:1 }, risk: 'VOL', ph: [2,3], tag: 'bright lights',
  attrs: ['CON', 'CHA'],
  d: 'Sixty seconds and every rival watching for the stumble.',
  odds: (s) => clamp(0.42 + (s.messageSharp?0.12:0) + (s.debatePrepped?0.1:0) + s.faces.F*0.002 + (s.reps.includes('R06')?0.06:0), 0, 0.9),
  run: (s, o) => {
    const prep = s.debatePrepped; s.debatePrepped = false;
    if (o.tier === 0) { s.nameID+=10; s.momentum+=3; s.faces.F+=5; return 'You land a line the parking lot repeats. The clip travels.'; }
    if (o.tier === 1) { s.nameID+=4; s.momentum+=1; return 'Solid. Nobody remembers you badly — at this altitude, a win.'; }
    if (o.tier === 2) return prep ? 'Prep held the floor: dull but unhurt.' : 'You survive; the moderator butchers your name twice.';
    s.hitPieces++; s.momentum = Math.max(0,s.momentum-2); s.faces.F-=3; return 'You misstate the ag exemption on tape. Name ID up — the wrong way.';
  }
};

/**
 * Kitchen-Table Meeting — archive PL08 (lines 581–582).
 *
 * Ally grant: AL01 on tier 0/1; AL02 when chairs(s) >= 3.
 * Archive chairs() = warm AL01 count + chairCount — NOT ground-scoped.
 * Phase 1 considered gating on allyWarmAtGround(AL01, ground); archive
 * allies are roster-wide, so PL08 stays roster-wide (no ground gate).
 * allyWarmAtGround remains the field-ops tool (AL09 on PL01/PL19/PL21B/PL39).
 */
export const PL08_KitchenTable: PlayCard = {
  id: 'PL08', n: 'Kitchen-Table Meeting', cost: { a:1 }, risk: 'STD', ph: [1,2,3], tag: 'pie is not optional',
  attrs: ['DIP'],
  d: "A chair's kitchen, her rules. Bring pie; leave with a precinct or nothing.",
  odds: (s) => {
    const chairs =
      s.allies.filter(a => a.id === 'AL01' && a.warm > 0).length + (s.chairCount || 0);
    return clamp(
      0.4 + chairs * 0.03 + s.faces.O * 0.003 + s.faces.G * 0.003 -
        (s.allyMalus || 0) - (s.estabPenalty ? 0.08 : 0),
      0,
      0.9
    );
  },
  run: (s, o) => {
    // archive chairs helper (line 389)
    const chairsOf = () =>
      s.allies.filter(a => a.id === 'AL01' && a.warm > 0).length + (s.chairCount || 0);
    s.pieCount = (s.pieCount || 0) + 1;
    if (o.tier === 0) {
      // archive:581
      addAlly(s, 'AL01', 3);
      s.chairCount = (s.chairCount || 0) + 1;
      s.endorsePts += 1;
      if (chairsOf() >= 3) addAlly(s, 'AL02', 2);
      return 'She comes over — and brings her club president\'s number.';
    }
    if (o.tier === 1) {
      // archive:582
      addAlly(s, 'AL01', 2);
      s.endorsePts += 1;
      if (chairsOf() >= 3) addAlly(s, 'AL02', 2);
      return 'A handshake on the porch. One chair, quietly banked.';
    }
    if (o.tier === 2) return 'Polite pie, no promises. "Come back after the forum."';
    s.faces.O -= 3;
    return 'You push. Word of the pushing beats you back to your truck.';
  }
};

export const PL09_EarnedMedia: PlayCard = {
  id: 'PL09', n: 'Earned Media Pitch', cost: { a:1, m:1 }, risk: 'VOL', ph: [1,2,3], tag: 'the gallery',
  attrs: ['CHA'],
  d: 'A county weekly, a drive-time host, a stringer if you\'re lucky.',
  odds: (s) => clamp(0.3 + s.momentum*0.02 + s.faces.F*0.004 + (s.mediaBonus||0) + (warm(s,'AL05')?0.1:0) + (s.regionHook==='metro'?0.1:0), 0, 0.9),
  run: (s, o) => {
    let t = o.tier; if (warm(s,'AL04') && t===1) t=0;
    if (t === 0) { s.nameID+=12; s.momentum+=2; s.faces.F+=4; return 'Above the fold. Feed-store gospel by Friday.'; }
    if (t === 1) { s.nameID+=5; return 'Page six. Page six is still the paper.'; }
    if (t === 2) return 'The editor is "holding it for a news peg." There is never a news peg.';
    s.hitPieces++; s.nameID+=3; return 'The reporter finds the 2014 tax lien instead.';
  }
};

export const PL10_PressRelease: PlayCard = {
  id: 'PL10', n: 'Press Release', cost: { a:1 }, risk: 'SAFE', ph: [1,2,3], tag: 'the on-ramp',
  attrs: ['CRA'],
  d: 'Nobody prints it. Everybody files it. The reporter learns your name spelling.', odds: () => 0.85,
  // archive:595 — prCount===2 grants AL04 Beat Reporter
  run: (s) => {
    s.momentum += 1;
    s.nameID += 1;
    s.prCount = (s.prCount || 0) + 1;
    if (s.prCount === 2) {
      addAlly(s, 'AL04', 2);
      return 'The beat reporter calls back to check a quote. That\'s a relationship now.';
    }
    return 'Filed, noted, spelled right.';
  }
};

export const PL13_FishFry: PlayCard = {
  id: 'PL13', n: 'Fish Fry', cost: { a:1, $:150 }, risk: 'SAFE', ph: [1,2,3], field: true, tag: 'clean money',
  attrs: ['CHA'],
  d: 'Five-dollar plates, donation jar, casseroles. Net positive, always.',
  odds: (s) => clamp(0.75 + s.nameID*0.004, 0, 0.95),
  run: (s, o, g) => {
    if (!g) return 'No ground selected.';
    const mult = (g.id==='GR07'?3:1) * (s.backers.includes('B05')?1.4:1) * (s.regionHook==='permian'?1.25:1) * (s.moneyClash?0.8:1);
    if (o.tier === 0) { const m = Math.round((650+random()*350)*mult); s.money+=m; rapGain(g,4,s); s.volPool+=2; if (!s.backers.includes('B05')) s.backers.push('B05'); return `+$${m} and the small-dollar list starts here at ${g.n}. +2 volunteers.`; }
    if (o.tier === 1) { const m = Math.round((380+random()*200)*mult); s.money+=m; rapGain(g,2,s); s.volPool+=1; return `+$${m}, faces and names. +1 volunteer.`; }
    const m = Math.round(200*mult); s.money+=m; return `Even a rainy fish fry clears its cost. +$${m}.`;
  }
};

export const PL14_CourtTheChairs: PlayCard = {
  id: 'PL14', n: 'Court the Chairs (Pie Circuit)', cost: { a:1 }, risk: 'STD', ph: [1,2], tag: 'gatekeepers',
  attrs: ['DIP'],
  d: 'The kitchen-table circuit at scale. Phase III chairs are already spoken for.',
  odds: (s) => clamp(0.34 + s.contacts*0.001 + s.faces.G*0.004 - (s.pieMalus||0) - (s.reps.includes('R07')?0.2:0) + (s.reps.includes('R05')?0.15:0), 0, 0.9),
  run: (s, o) => {
    s.pieCount = (s.pieCount || 0) + 1;
    // archive:619 — tier 0 grants AL01
    if (o.tier === 0) {
      s.endorsePts += 2;
      s.faces.O += 4;
      addAlly(s, 'AL01', 2);
      return 'Two chairs in one week; one brings her whole club.';
    }
    if (o.tier === 1) { s.endorsePts+=1; s.faces.O+=2; return 'One endorsement, quietly banked.'; }
    if (o.tier === 2) return 'Pie eaten, promises deferred.';
    s.faces.O -= 4; return 'Pushy travels fast on the chair circuit.';
  }
};

// ===== WAVE 3 =====
export const PL11_StrawPoll: PlayCard = {
  id: 'PL11', n: 'Straw Poll Push', cost: { a:1, vp:1 }, risk: 'STD', ph: [1,2], tag: 'club math',
  attrs: ['CLO', 'DIP'],
  d: 'Pack the room, count the hands. Clubs remember who wins their straw.',
  req: (s) => s.backers.includes('B06') || warm(s, 'AL03'),
  odds: (s) => clamp(0.45 + (s.clubOdds||0) + (warm(s,'AL03')?0.12:0) + (s.strawBonus||0) + s.volPool*0.015, 0, 0.9),
  run: (s, o) => {
    // archive:599 — win grants AL03 Club President + strawWins
    if (o.tier <= 1) {
      s.strawWins = (s.strawWins || 0) + 1;
      s.endorsePts += o.tier === 0 ? 2 : 1;
      s.momentum += 1;
      addAlly(s, 'AL03', 2);
      return 'You win the straw. The club president wants coffee — and new doors open.';
    }
    if (o.tier === 2) return 'Second place. Nobody remembers second at a straw poll.';
    s.momentum = Math.max(0, s.momentum-1); return 'A rival packed it harder. Their mailer will mention it.';
  }
};

export const PL12_ClubSpeech: PlayCard = {
  id: 'PL12', n: 'Club Speech', cost: { a:1 }, risk: 'STD', ph: [1,2], tag: 'the circuit',
  attrs: ['CON', 'DIP'],
  d: 'Rubber chicken, real gatekeepers. Read the room or the room reads you.',
  odds: (s) => clamp(0.5 + s.faces.T*0.003 + (s.messageSharp?0.06:0), 0, 0.9),
  run: (s, o) => {
    if (o.tier <= 1) { if (!s.backers.includes('B06')) s.backers.push('B06'); s.endorsePts += o.tier===0?1:0; s.contacts+=10; s.volPool+=1; return 'The roster opens to you. Names, numbers, casseroles — and a retiree. +1 volunteer.'; }
    if (o.tier === 2) return 'Polite applause, cold coffee.';
    s.faces.T -= 2; return 'You purity-test the room. The room notices.';
  }
};

export const PL15_OppoResearch: PlayCard = {
  id: 'PL15', n: 'Oppo Research', cost: { a:1, $:500 }, risk: 'STD', ph: [2], tag: 'the file',
  attrs: ['CRA'],
  d: 'A quiet man with a courthouse habit. What he finds becomes yours to spend — or to hold.',
  odds: () => 0.65,
  run: (s, o) => {
    s.shadowPlays++; s.faces.O -= 2;
    if (o.tier <= 1) { s.oppoFile = true; return 'A folder now exists. It hums in the desk drawer. (Oppo File acquired — enables Contrast Mail and Whisper Campaign.)'; }
    if (o.tier === 2) return 'Clean as creek water, or he\'s bad at his job.';
    s.exposure += 1; return 'Your quiet man was seen at the courthouse. Seen matters.';
  }
};

export const PL17_DebatePrep: PlayCard = {
  id: 'PL17', n: 'Debate Prep', cost: { a:1 }, risk: 'SAFE', ph: [2], tag: 'homework',
  attrs: ['INK', 'CON'],
  d: 'The Kitchen Cabinet plays your rival better than your rival does.',
  odds: () => 0.9,
  run: (s) => { s.debatePrepped = true; return warm(s, 'AL11') ? 'The Cabinet grills you past midnight. The next forum\'s bands narrow.' : 'Index cards and a bathroom mirror. It still counts.'; }
};

export const PL19_GOTVWeekend: PlayCard = {
  id: 'PL19', n: 'GOTV Weekend', cost: { a:1, vp:1 }, risk: 'STD', ph: [3], field: true, tag: 'the point of it all',
  attrs: ['CLO'],
  d: 'Rapport is a promise. Turnout is the promise kept. One volunteer and a weekend.',
  odds: (s, g) => clamp(0.58 + s.volPool*0.025 + (allyWarmAtGround(s,'AL09',g?.id)?0.1:0) + s.faces.T*0.002, 0, 0.95),
  run: (s, o, g) => {
    if (!g) return 'No ground selected.';
    // GOTV banks conversion; also a little name heat for the general
    if (o.tier <= 1) {
      const k = o.tier === 0 ? 0.55 : 0.35;
      g.gotv += k;
      s.nameID += o.tier === 0 ? 2 : 1;
      return `Turnout operation locks in at ${g.n} (+${Math.round(k * 100)}% conversion).`;
    }
    if (o.tier === 2) {
      g.gotv += 0.12;
      return 'Half the walk list, half the weekend. Something banked.';
    }
    g.gotv += 0.06;
    s.volPool = Math.max(0, s.volPool - 1);
    return 'A van breaks down; a volunteer quits loudly. A little banked anyway.';
  }
};

/** Wave 1–3 core plays (attr-tagged). */
export const CORE_PLAYS: PlayCard[] = [
  PL01_BlockWalk, PL02_PhoneBank, PL03_YardSignBlitz, PL04_PetitionDrive, PL05_PayFilingFee, PL06_TownHall,
  PL07_CandidateForum, PL08_KitchenTable, PL09_EarnedMedia, PL10_PressRelease, PL13_FishFry, PL14_CourtTheChairs,
  PL11_StrawPoll, PL12_ClubSpeech, PL15_OppoResearch, PL17_DebatePrep, PL19_GOTVWeekend
];

/** Shop BUY* templates (catalog entries; live availability via show()). */
export const SHOP_PLAYS: PlayCard[] = allShopPlayTemplates();

/**
 * Play catalog for SRD audit / draw pool (excludes BUY* shop items —
 * those are camp actions, not deck plays; see SHOP_PLAYS + buildCatalog).
 * Starmap pilot verbs (MV01) included — tightly show-gated.
 */
export const ALL_PLAYS: PlayCard[] = [...CORE_PLAYS, ...WAVE4_PLAYS, ...STARMAP_PLAYS];

/** Alias used by weekly-draw pool filters. */
export const PLAYS = ALL_PLAYS;

export const PLAY_COUNT = ALL_PLAYS.length;
