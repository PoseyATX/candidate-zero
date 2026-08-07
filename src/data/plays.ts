/**
 * CANDIDATE ZERO — Play Card Data (pure, explicit-state)
 * All cards tagged with root attributes for cardAttrMod synergy.
 */

import type { GameState, Ground, RollResult, PlayCard } from '../engine/types.js';
import { random } from '../engine/rng.js';
import { addAlly, warm, allyWarmAtGround, bankRapport } from '../engine/reputation.js';
import { WAVE4_PLAYS } from './plays-wave4.js';
import { allShopPlayTemplates } from './assets.js';
import { STARMAP_PLAYS } from './plays-starmap.js';
import { WAVE5_PLAYS } from './plays-wave5.js';
import { PROMO_PLAYS } from './promo-plays.js';
import { MACHINE_DOOR_PLAYS } from './machine-doors.js';
import { CHOICE_PLAYS } from './choice-plays.js';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
/** Thin alias — all rapport routes through engine/reputation.bankRapport. */
function rapGain(g: Ground, amt: number, state: GameState) {
  bankRapport(g, amt, state);
}

export const PL01_BlockWalk: PlayCard = {
  id: 'PL01', n: 'Block Walk', cost: { a: 2 }, risk: 'SAFE', refundOnBreak: true, ph: [1,2,3], field: true, tag: 'the spine',
  attrs: ['CHA'],
  d:
    'Boots and a clipboard — the spine of the operation, and it is always available: you do not wait for the ' +
    'shuffle to go walk. Pick a ground. You take that ground\'s pool into contacts, bank rapport, and usually ' +
    'pick up a volunteer; in the general the same walk banks turnout conversion instead of introductions. ' +
    'Volunteers, a sharp message, and the Van (A01) make the doors open easier. A breakthrough refunds the ' +
    'AP — the week you chain walks is the week the list starts to look like a district.',
  odds: (s) => clamp(0.62 + s.volPool*0.02 + (s.assets.includes('A01')?0.12:0) + (s.messageSharp?0.05:0), 0, 0.95),
  run: (s, o, g) => {
    if (!g) return 'No ground selected.'; s.walkCount++;
    const mult = (s.assets.includes('A01')?1.5:1) * (allyWarmAtGround(s,'AL09',g.id)?1.2:1);
    const push = s.assets.includes('A11') ? 1 : 0;
    const gen = s.stage === 'general';
    if (o.tier === 0) {
      const c = Math.min(g.pool, Math.round((55+random()*30)*mult));
      g.pool-=c; s.contacts+=c; rapGain(g, gen ? 2 : 6, s); s.volPool+=1; s.nameID+=2+push;
      if (gen) { g.gotv += 0.18; return `General doors: +${c} contacts and +18% GOTV banked at ${g.n}. Turnout, not introductions.`; }
      return `A church picnic adopts you whole. +${c} contacts, a volunteer, and rapport at ${g.n}.`;
    }
    if (o.tier === 1) {
      const c = Math.min(g.pool, Math.round((22+random()*16)*mult));
      g.pool-=c; s.contacts+=c; s.volPool+=1; rapGain(g, gen ? 1 : 3, s);
      s.nameID += 1 + push;
      if (gen) { g.gotv += 0.1; return `Turnout walk at ${g.n}: +${c} contacts, +10% GOTV. The list is a vote plan now.`; }
      return `Doors open. +${c} contacts, +1 volunteer at ${g.n}`;
    }
    const c = Math.min(g.pool,6); g.pool-=c; s.contacts+=c;
    if (gen) { g.gotv += 0.03; return `Heat and closed blinds — still +${c} contacts and a thin +3% GOTV at ${g.n}.`; }
    return 'Heat, dogs, closed blinds. +'+c+' contacts and one ruined pair of boots.';
  }
};

export const PL02_PhoneBank: PlayCard = {
  id: 'PL02', n: 'Phone Bank', cost: { a:2, vp:1 }, risk: 'SAFE', refundOnBreak: true, ph: [1,2,3], field: true, tag: 'rain-proof',
  attrs: ['CHA'],
  d:
    'Half a walk\'s haul, none of the weather — and always on the camp strip next to Block Walk. ' +
    'Spend a volunteer instead of your boots when the ground is far or the day is ugly. ' +
    'The Phone Room (A09) doubles the take. In the general it becomes turnout conversion, not introductions.',
  odds: (s) => clamp(0.6 + (s.assets.includes('A09')?0.15:0), 0, 0.95),
  run: (s, o, g) => {
    if (!g) return 'No ground.';
    const mult = s.assets.includes('A09')?2:1;
    const gen = s.stage === 'general';
    const c = Math.min(g.pool, Math.round((o.tier<=1?14:5)*mult));
    g.pool-=c; s.contacts+=c;
    rapGain(g, o.tier<=1 ? (gen ? 1 : 2) : (gen ? 0 : 1), s);
    if (gen) {
      const k = o.tier === 0 ? 0.12 : o.tier === 1 ? 0.07 : 0.02;
      g.gotv += k;
      return `Phone GOTV at ${g.n}: +${c} contacts, +${Math.round(k * 100)}% conversion banked.`;
    }
    return `+${c} contacts by wire at ${g.n}.`;
  }
};

export const PL03_YardSignBlitz: PlayCard = {
  id: 'PL03', n: 'Yard Signs', cost: { a:1, $:150 }, risk: 'SAFE', ph: [1,2], field: true, tag: 'visibility',
  attrs: ['CLO'],
  d:
    'A district that sees your name starts believing it belongs there. ' +
    'One action and $150: name ID and a point of rapport on the ground you plant. ' +
    'Near-certain. The play for a leftover action when you will not gamble the week.',
  odds: () => 0.8,
  run: (s, _o, g) => { if (!g) return 'No ground.'; s.nameID+=2; rapGain(g,1,s); return `Signs up along ${g.n}. The name is out in the weather now.`; }
};

export const PL04_PetitionDrive: PlayCard = {
  id: 'PL04', n: 'Petitions', cost: { a:2 }, risk: 'STD', ph: [1], tag: 'the zero-dollar door',
  attrs: ['CLO'],
  d:
    'Signatures instead of a fee — labor is the currency you were born holding. ' +
    'Land it and you bank fifty to a hundred-twenty valid names against the threshold. ' +
    'Volunteers and a warm Canvass Captain make the sheets cleaner. ' +
    'It is not safe: a disaster is the county chair striking names you already had. ' +
    'Do not leave the whole ballot on one late Saturday.',
  show: (s) => !s.ballot,
  odds: (s) => clamp(0.57 + s.volPool * 0.033 + (warm(s, 'AL09') ? 0.08 : 0), 0, 0.95),
  run: (s, o) => {
    if (o.tier <= 1) {
      const g = o.tier === 0 ? 85 + Math.floor(random() * 36) : 50 + Math.floor(random() * 26);
      s.signatures += g;
      if (s.signatures >= s.sigNeed && !s.ballot) { s.ballot = true; return `+${g} signatures — threshold cleared. On the ballot, free but not cheap.`; }
      return `+${g} valid signatures (${s.signatures}/${s.sigNeed}).`;
    }
    if (o.tier === 2) { s.signatures += 15; return 'Rainy Saturday. +15, half smudged.'; }
    const l = 50 + Math.floor(random()*45); s.signatures = Math.max(0, s.signatures-l); return `The county chair challenges your sheets — ${l} struck.`;
  }
};

export const PL05_PayFilingFee: PlayCard = {
  id: 'PL05', n: 'Filing Fee', cost: { $:1250 }, risk: 'SAFE', ph: [1], tag: 'the money door',
  attrs: ['CLO'],
  d:
    '$1,250 and it is done — shame-free, story-free, and it costs no action at all. ' +
    'The money road onto the ballot: no roll worth worrying about, no signatures, no weeks of Saturdays. ' +
    'The whole difficulty is having the cash in hand before filing closes, which is what the Fish Fry is for.',
  show: (s) => !s.ballot,
  odds: () => 0.99,
  run: (s) => { s.ballot = true; return 'Receipt in hand. You are on the ballot the expensive way.'; }
};
export const PL06_TownHall: PlayCard = {
  id: 'PL06', n: 'Town Hall', cost: { a:2 }, risk: 'STD', refundOnBreak: true, ph: [1,2,3], tag: 'showing up',
  attrs: ['CHA'],
  d:
    'Folding chairs, burnt coffee, real questions. The kids notice if you skip these. ' +
    'Contacts, a point of momentum, and a volunteer when it lands — the cheapest momentum in the primary. ' +
    'A sharp message helps. A disaster hands the night to a heckler and costs momentum; ' +
    'do not walk in already wobbling.',
  odds: (s) => clamp(0.55 + (s.messageSharp?0.08:0), 0, 0.9),
  run: (s, o) => { s.townHallThisWeek = true; if (o.tier <= 1) { s.contacts+=15; s.momentum+=1; s.volPool+=1; return 'A fair hearing, two new believers, and one of them signs up to walk.'; } if (o.tier === 2) return 'Six attendees, one of them lost.'; s.momentum = Math.max(0, s.momentum-1); return 'A heckler wins the room. It happens.'; }
};

export const PL07_CandidateForum: PlayCard = {
  id: 'PL07', n: 'Candidate Forum', cost: { a:2 }, risk: 'VOL', ph: [2,3], tag: 'bright lights',
  attrs: ['CON', 'CHA'],
  d:
    'Sixty seconds and every rival watching for the stumble. ' +
    'Biggest name-ID swing in the deck when it lands — a clip that travels, momentum, and a room that remembers. ' +
    'Debate Prep and a sharp message matter. VOLATILE: a disaster is a hit piece on tape and name ID the wrong way. ' +
    'Do not walk in cold.',
  odds: (s) => clamp(0.42 + (s.messageSharp?0.12:0) + (s.debatePrepped?0.1:0) + s.faces.F*0.002 + (s.reps.includes('R06')?0.06:0), 0, 0.9),
  run: (s, o) => {
    const prep = s.debatePrepped; s.debatePrepped = false;
    if (o.tier === 0) { s.nameID+=10; s.momentum+=3; s.faces.F+=5; return 'You land a line the parking lot repeats. The clip travels.'; }
    if (o.tier === 1) { s.nameID+=4; s.momentum+=1; return 'Solid. Nobody remembers you badly — at this altitude, a win.'; }
    if (o.tier === 2) return prep ? 'Prep held the floor: dull but unhurt.' : 'You survive; the moderator butchers your name twice.';
    s.hitPieces++; s.momentum = Math.max(0,s.momentum-2); s.faces.F-=3; return 'You misstate the ag exemption on tape. Name ID up — the wrong way.';
  }
};

export const PL08_KitchenTable: PlayCard = {
  id: 'PL08', n: 'Kitchen Table', cost: { a:2 }, risk: 'STD', refundOnBreak: true, ph: [1,2], tag: 'pie is not optional',
  attrs: ['DIP'],
  d:
    "A chair's kitchen, her rules. Bring pie; leave with a precinct or nothing. " +
    'Bank chairs and endorsement points one porch at a time — at three chairs the County Chairwoman ' +
    'starts taking your call. Every chair you already hold opens the next door. ' +
    'Push too hard on a disaster and word of the pushing beats you home. Primary only.',
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
    const chairsOf = () =>
      s.allies.filter(a => a.id === 'AL01' && a.warm > 0).length + (s.chairCount || 0);
    s.pieCount = (s.pieCount || 0) + 1;
    if (o.tier === 0) {
      addAlly(s, 'AL01', 3);
      s.chairCount = (s.chairCount || 0) + 1;
      s.endorsePts += 1;
      if (chairsOf() >= 3) addAlly(s, 'AL02', 2);
      return 'She comes over — and brings her club president\'s number.';
    }
    if (o.tier === 1) {
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
  id: 'PL09', n: 'Earned Media', cost: { a:2, m:1 }, risk: 'VOL', refundOnBreak: true, ph: [1,2,3], tag: 'the gallery',
  attrs: ['CHA'],
  d:
    'A county weekly, a drive-time host, a stringer if you are lucky. Costs a point of momentum to spend. ' +
    'Cheapest large name-ID gain when it lands — and the play most likely to hand you a hit piece, ' +
    'because the reporter goes looking either way. Momentum and a warm Beat Reporter matter. ' +
    'Metro districts open more doors.',
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
  d:
    'Nobody prints it. Everybody files it. The reporter learns how your name is spelled. ' +
    'One action: a point of momentum and a point of name ID. Fuel for Earned Media, which spends momentum. ' +
    'File the second one and the beat reporter starts calling you back.',
  odds: () => 0.85,
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
  id: 'PL13', n: 'Fish Fry', cost: { a:3, $:150 }, risk: 'SAFE', ph: [1,2,3], field: true, tag: 'clean money',
  attrs: ['CHA'],
  d:
    'Five-dollar plates, a donation jar, and more casseroles than anyone can eat. Net positive always — ' +
    'even a rainy night clears the $150 cost. A good night is hundreds of dollars, rapport, and volunteers. ' +
    'Name ID raises the take; friendly ground multiplies it. The small-dollar list it starts keeps paying after. ' +
    'This is how the money door onto the ballot gets paid for.',
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
  id: 'PL14', n: 'Court the Chairs (Pie Circuit)', cost: { a:3 }, risk: 'STD', ph: [1,2], tag: 'gatekeepers',
  attrs: ['DIP'],
  d:
    'The kitchen-table circuit at scale — three actions, several kitchens, one long Saturday. ' +
    'Where Kitchen Table banks one chair, this banks endorsement points and Operator standing in bulk. ' +
    'Contacts help. Working the same circuit too often sours it; a disaster costs Operator standing. ' +
    'By the late primary the chairs are already spoken for.',
  odds: (s) => clamp(0.34 + s.contacts*0.001 + s.faces.G*0.004 - (s.pieMalus||0) - (s.reps.includes('R07')?0.2:0) + (s.reps.includes('R05')?0.15:0), 0, 0.9),
  run: (s, o) => {
    s.pieCount = (s.pieCount || 0) + 1;
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

export const PL11_StrawPoll: PlayCard = {
  id: 'PL11', n: 'Straw Poll Push', cost: { a:2, vp:1 }, risk: 'STD', ph: [1,2], tag: 'club math',
  attrs: ['CLO', 'DIP'],
  d:
    'Pack the room, count the hands. Clubs remember who wins their straw — and who packed it harder. ' +
    'Endorsement points, momentum, and a deepening friendship with the club president. ' +
    'Close and Diplomacy carry it and volunteers are the real lever: this is a card that rewards a crowd. ' +
    'Needs a club behind you first — the Club Speech or a warm club president opens it. ' +
    'Lose it and a rival puts it in their mailer.',
  req: (s) => s.backers.includes('B06') || warm(s, 'AL03'),
  odds: (s) => clamp(0.45 + (s.clubOdds||0) + (warm(s,'AL03')?0.12:0) + (s.strawBonus||0) + s.volPool*0.015, 0, 0.9),
  run: (s, o) => {
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
  id: 'PL12', n: 'Club Speech', cost: { a:2 }, risk: 'STD', refundOnBreak: true, ph: [1,2], tag: 'the circuit',
  attrs: ['CON', 'DIP'],
  d:
    'Rubber chicken, real gatekeepers. Read the room or the room reads you. ' +
    'The way into the club circuit: it opens the roster, banks contacts and a volunteer, and is the ' +
    'prerequisite most players want before a Straw Poll Push. ' +
    'Conviction and Diplomacy carry it, helped by your True-Believer face and a sharp message. ' +
    'Purity-test the room on a disaster and it costs you standing with exactly the people you came for.',
  odds: (s) => clamp(0.5 + s.faces.T*0.003 + (s.messageSharp?0.06:0), 0, 0.9),
  run: (s, o) => {
    if (o.tier <= 1) { if (!s.backers.includes('B06')) s.backers.push('B06'); s.endorsePts += o.tier===0?1:0; s.contacts+=10; s.volPool+=1; return 'The roster opens to you. Names, numbers, casseroles — and a retiree. +1 volunteer.'; }
    if (o.tier === 2) return 'Polite applause, cold coffee.';
    s.faces.T -= 2; return 'You purity-test the room. The room notices.';
  }
};

export const PL15_OppoResearch: PlayCard = {
  id: 'PL15', n: 'Oppo Research', cost: { a:2, $:500 }, risk: 'STD', ph: [2], tag: 'the file',
  attrs: ['CRA'],
  d:
    'A quiet man with a courthouse habit. What he finds becomes yours to spend — or to hold. ' +
    'Buys the Oppo File, which is a key rather than a payoff: it unlocks Contrast Mail and the ' +
    'Whisper Campaign and does nothing at all on its own. ' +
    'Craft is the attribute. General only, and it is never clean — playing it costs Operator standing ' +
    'the moment you commit, and a disaster means your quiet man was SEEN. Seen matters.',
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
  d:
    'The Kitchen Cabinet plays your rival better than your rival does. ' +
    'One AP, near-certain, and it does nothing by itself — it arms the NEXT Candidate Forum, ' +
    'widening its odds and softening what a bad night costs you. ' +
    'Ink and Conviction do the homework. A warm Kitchen Cabinet makes the session brutal and the payoff bigger. ' +
    'Play it the week before the lights, not the week of.',
  odds: () => 0.9,
  run: (s) => { s.debatePrepped = true; return warm(s, 'AL11') ? 'The Cabinet grills you past midnight. The next forum\'s bands narrow.' : 'Index cards and a bathroom mirror. It still counts.'; }
};

export const PL19_GOTVWeekend: PlayCard = {
  id: 'PL19', n: 'Get Out the Vote', cost: { a:2, vp:1 }, risk: 'STD', ph: [3], field: true, tag: 'the point of it all',
  attrs: ['CLO'],
  d:
    'Rapport is a promise; turnout is the promise kept. One volunteer and a weekend. ' +
    'The turnout spine: it converts a ground\'s banked rapport into actual votes, ' +
    'and a breakthrough locks in more than half that ground\'s conversion in one go. ' +
    'Close is the attribute, volunteers are the lever, and a Canvass Captain warm ON THAT GROUND ' +
    'is worth more than anything else you can bring.',
  odds: (s, g) => clamp(0.58 + s.volPool*0.025 + (allyWarmAtGround(s,'AL09',g?.id)?0.1:0) + s.faces.T*0.002, 0, 0.95),
  run: (s, o, g) => {
    if (!g) return 'No ground selected.';
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

export const PL23_RidesToPolls: PlayCard = {
  id: 'PL23',
  n: 'Rides to the Polls',
  cost: { a: 2, vp: 1 },
  risk: 'SAFE',
  ph: [3],
  field: true,
  tag: 'the flatbed doctrine',
  attrs: ['CLO'],
  d:
    'The truck runs routes all day and the routes are the whole strategy. ' +
    'Conversion is steepest exactly where turnout is LOWEST — on a ground nobody else bothers with ' +
    'it is worth nearly three times what it pays on a reliable one. ' +
    'Close is the attribute, the odds are kind, and it needs the Flatbed (shop A06) in your assets first. ' +
    'Aim it at the neglected ground, not the friendly one.',
  req: s => s.assets.includes('A06'),
  odds: () => 0.8,
  run: (s, o, g) => {
    if (!g) return 'No ground.';
    const base = (g.prop ?? 0.5) < 0.4 ? 0.4 : 0.15;
    const k = o.tier === 0 ? base : o.tier === 1 ? base * 0.75 : base * 0.4;
    g.gotv += k;
    return `The flatbed runs routes through ${g.n}. (+${Math.round(k * 100)}% conversion — steepest where turnout is lowest.)`;
  }
};

function tagMainPlayer(cards: PlayCard[]): PlayCard[] {
  for (const c of cards) {
    if (c.residency === undefined) c.residency = 'main';
    if (c.control === undefined) c.control = 'player';
  }
  return cards;
}

export const CORE_PLAYS: PlayCard[] = tagMainPlayer([
  PL01_BlockWalk, PL02_PhoneBank, PL03_YardSignBlitz, PL04_PetitionDrive, PL05_PayFilingFee, PL06_TownHall,
  PL07_CandidateForum, PL08_KitchenTable, PL09_EarnedMedia, PL10_PressRelease, PL13_FishFry, PL14_CourtTheChairs,
  PL11_StrawPoll, PL12_ClubSpeech, PL15_OppoResearch, PL17_DebatePrep, PL19_GOTVWeekend, PL23_RidesToPolls
]);

export const SHOP_PLAYS: PlayCard[] = tagMainPlayer(allShopPlayTemplates());

/** Includes promo injectables (PR01) — show:false keeps them out of normal pools. */
export const ALL_PLAYS: PlayCard[] = [
  ...CORE_PLAYS,
  ...CHOICE_PLAYS,
  ...WAVE4_PLAYS,
  ...STARMAP_PLAYS,
  ...WAVE5_PLAYS,
  ...PROMO_PLAYS,
  // Machine doors: in the pool, but `show` keeps them invisible unless the
  // member who holds the door is seated this run (see data/machine-doors.ts).
  ...MACHINE_DOOR_PLAYS
];

export const PLAYS = ALL_PLAYS;

export const PLAY_COUNT = ALL_PLAYS.length;
