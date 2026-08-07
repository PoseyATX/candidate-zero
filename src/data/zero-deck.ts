/**
 * Zero starting kit — 6 universal + 4 persona-intrinsic (spec §3.2).
 * No generic STARTER_DECK. Knock stays near-zero backfire forever.
 */

import type { GameState, PlayCard, RollResult } from '../engine/types.js';
import { random } from '../engine/rng.js';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Universal six — every starting pile. Knock is the safety valve. */
export const UNIVERSAL_ZERO_IDS = [
  'ZN_KNOCK',
  'ZN_KNOCK',
  'ZN_ASK',
  'ZN_SPEAK',
  'ZN_SHOW',
  'ZN_ENDURE'
] as const;

export type ZeroPersonaId = 'blockwalker' | 'believer' | 'staffer' | 'faded';

export const ZERO_PERSONA_IDS: ZeroPersonaId[] = [
  'blockwalker',
  'believer',
  'staffer',
  'faded'
];

/** Persona-intrinsic four (last is always a liability). */
export const PERSONA_INTRINSIC: Record<ZeroPersonaId, string[]> = {
  blockwalker: ['ZB_LEGS', 'ZB_DOORSTEP', 'ZB_NEIGHBOR', 'ZB_BLISTER'],
  believer: ['ZL_CAUSE', 'ZL_FAITHFUL', 'ZL_PLAIN', 'ZL_RIGIDITY'],
  staffer: ['ZS_PROCEDURE', 'ZS_HALLWAY', 'ZS_BOSS', 'ZS_NOSTANDING'],
  faded: ['ZF_SURNAME', 'ZF_OLDMONEY', 'ZF_REMEMBERS', 'ZF_EXPECTATIONS']
};

export const LIABILITY_IDS = new Set([
  'ZB_BLISTER',
  'ZL_RIGIDITY',
  'ZS_NOSTANDING',
  'ZF_EXPECTATIONS'
]);

export function starterDeckFor(personaId: string | null | undefined): string[] {
  const pid = (ZERO_PERSONA_IDS.includes(personaId as ZeroPersonaId)
    ? personaId
    : 'blockwalker') as ZeroPersonaId;
  return [...UNIVERSAL_ZERO_IDS, ...PERSONA_INTRINSIC[pid]];
}

export function isLiabilityInHand(state: GameState, id: string): boolean {
  return LIABILITY_IDS.has(id) && (state.deck ?? []).includes(id);
}

/** Rigidity / No Standing active while liability is still in the owned pile. */
export function liabilityBlocksTrade(state: GameState): boolean {
  return (state.deck ?? []).some(id => id === 'ZL_RIGIDITY');
}

export function liabilityBlocksStanding(state: GameState): boolean {
  return (state.deck ?? []).some(id => id === 'ZS_NOSTANDING');
}

const O_SAFE = (base: number) => (_s: GameState) => clamp(base, 0.05, 0.99);

function mk(
  partial: Omit<PlayCard, 'residency' | 'control' | 'kind'> & {
    liability?: boolean;
  }
): PlayCard {
  const { liability, ...rest } = partial;
  return {
    ...rest,
    kind: 'action',
    residency: 'main',
    control: 'player',
    rarity: liability ? 'common' : 'common',
    // Liability flag rides session via id set; tag carries fiction
    tag: liability ? `${rest.tag} · liability` : rest.tag
  };
}

export const ZERO_UNIVERSAL_PLAYS: PlayCard[] = [
  mk({
    id: 'ZN_KNOCK',
    n: 'Knock',
    cost: { a: 1 },
    risk: 'SAFE',
    ph: [1, 2, 3],
    field: true,
    tag: 'door to door',
    d:
      'Block walking. Floor of the risk ladder. Low reward, almost nothing can go wrong, ' +
      'always playable. The safety valve stays open at every depth.',
    attrs: ['CLO', 'CHA'],
    refundOnBreak: true,
    odds: O_SAFE(0.97),
    run: (s, o, g) => {
      if (o.tier <= 1) {
        const c = 4 + Math.floor(random() * 4);
        s.contacts += c;
        if (g) g.rapport = Math.min(100, (g.rapport || 0) + 2);
        return `A porch, a name, a nod. +${c} contacts.`;
      }
      s.contacts += 1;
      return 'Nobody home. You leave a card. +1 contact.';
    }
  }),
  mk({
    id: 'ZN_ASK',
    n: 'Ask',
    cost: { a: 1 },
    risk: 'STD',
    ph: [1, 2, 3],
    tag: 'no reason to say yes',
    d: 'Request something small from someone with no reason to say yes.',
    attrs: ['DIP', 'CHA'],
    odds: O_SAFE(0.55),
    run: (s, o) => {
      if (o.tier === 0) {
        s.favors += 1;
        s.contacts += 6;
        return 'They surprise you. +1 favor, +6 contacts.';
      }
      if (o.tier === 1) {
        s.contacts += 3;
        return 'A maybe that is almost a yes. +3 contacts.';
      }
      if (o.tier === 2) return 'They smile and do not mean it.';
      s.exposure = Math.min(1, (s.exposure || 0) + 0.05);
      return 'You asked the wrong person. Exposure ticks up.';
    }
  }),
  mk({
    id: 'ZN_SPEAK',
    n: 'Speak',
    cost: { a: 1 },
    risk: 'STD',
    ph: [1, 2, 3],
    tag: 'whoever is in front of you',
    d: 'Address whoever is in front of you. Not a stage. A conversation.',
    attrs: ['CHA', 'CON'],
    odds: O_SAFE(0.6),
    run: (s, o) => {
      if (o.tier <= 1) {
        s.nameID += 1;
        s.contacts += 5;
        return 'They hear you. +1 name ID, +5 contacts.';
      }
      if (o.tier === 2) {
        s.contacts += 2;
        return 'Polite attention. +2 contacts.';
      }
      return 'You talk past them. Nothing banks.';
    }
  }),
  mk({
    id: 'ZN_SHOW',
    n: 'Show Up',
    cost: { a: 2 },
    risk: 'STD',
    ph: [1, 2, 3],
    tag: 'not invited',
    d: 'Physical presence somewhere you were not invited.',
    attrs: ['CLO', 'CON'],
    odds: O_SAFE(0.58),
    run: (s, o) => {
      if (o.tier <= 1) {
        s.contacts += 8;
        s.momentum += 1;
        return 'They cannot pretend you are not there. +8 contacts, momentum.';
      }
      if (o.tier === 2) {
        s.contacts += 3;
        return 'You stand in the back. +3 contacts.';
      }
      s.hitPieces = (s.hitPieces || 0) + 1;
      return 'Security walks you out. A hit piece starts writing itself.';
    }
  }),
  mk({
    id: 'ZN_ENDURE',
    n: 'Endure',
    cost: { a: 1 },
    risk: 'SAFE',
    ph: [1, 2, 3],
    tag: 'convert the hit',
    d: 'Absorb a hit; convert damage into a smaller, later problem.',
    attrs: ['CON'],
    odds: O_SAFE(0.9),
    run: (s, o) => {
      if ((s.hitPieces || 0) > 0) {
        s.hitPieces = Math.max(0, s.hitPieces - 1);
        s.exposure = Math.min(1, (s.exposure || 0) + 0.03);
        return 'You take the blow. One hit piece cools; exposure lingers small.';
      }
      if (o.tier <= 1) {
        s.momentum = Math.max(0, s.momentum);
        return 'You hold. Nothing pretty. Nothing broken.';
      }
      return 'You hold.';
    }
  })
];

export const ZERO_PERSONA_PLAYS: PlayCard[] = [
  // Blockwalker
  mk({
    id: 'ZB_LEGS',
    n: 'Legs',
    cost: { a: 0 },
    risk: 'SAFE',
    ph: [1, 2, 3],
    field: true,
    tag: 'extra miles',
    d: 'Extra low-value actions. You can always walk one more block.',
    attrs: ['CLO'],
    odds: O_SAFE(0.95),
    run: (s, o, g) => {
      s.contacts += 2;
      if (g) g.rapport = Math.min(100, (g.rapport || 0) + 1);
      s.ap = Math.min(s.apMax, s.ap + (o.tier <= 1 ? 1 : 0));
      return o.tier <= 1
        ? 'Another porch. +2 contacts, the day opens a crack (+1 AP).'
        : 'Another porch. +2 contacts.';
    }
  }),
  mk({
    id: 'ZB_DOORSTEP',
    n: "Doorstep Read",
    cost: { a: 1 },
    risk: 'SAFE',
    ph: [1, 2],
    field: true,
    tag: 'info from contact',
    d: 'You learn who is home, who is angry, who will never open.',
    attrs: ['CHA', 'CRA'],
    odds: O_SAFE(0.85),
    run: (s, o, g) => {
      if (g) g.rapport = Math.min(100, (g.rapport || 0) + 3);
      s.contacts += o.tier <= 1 ? 4 : 1;
      return 'The porch tells you more than the poll. Rapport banks.';
    }
  }),
  mk({
    id: 'ZB_NEIGHBOR',
    n: "Neighbor's Word",
    cost: { a: 1 },
    risk: 'STD',
    ph: [1, 2],
    tag: 'one small credibility token',
    d: 'Someone on the block will vouch — once, quietly.',
    attrs: ['DIP', 'CHA'],
    odds: O_SAFE(0.65),
    run: (s, o) => {
      if (o.tier <= 1) {
        s.endorsePts += 1;
        s.contacts += 4;
        return 'A name attached to yours. +1 endorsement point, +4 contacts.';
      }
      return 'They hesitate. The word stays in their mouth.';
    }
  }),
  mk({
    id: 'ZB_BLISTER',
    n: 'Blister',
    cost: { a: 0 },
    risk: 'SAFE',
    ph: [1, 2, 3],
    tag: 'body keeps score',
    liability: true,
    d:
      'Liability. While this is still in your kit, long field days cost more. ' +
      'You do not trash it from a menu — you heal it the hard way or it heals you into a smaller problem.',
    attrs: ['CLO'],
    odds: O_SAFE(0.99),
    run: s => {
      s.fieldAp = Math.max(0, s.fieldAp - 1);
      return 'The blister talks. Turf budget thins for the day.';
    }
  }),
  // Believer
  mk({
    id: 'ZL_CAUSE',
    n: 'Cause',
    cost: { a: 1 },
    risk: 'SAFE',
    ph: [1, 2, 3],
    tag: 'recurring conviction',
    d: 'The reason you filed. It does not pay rent. It pays spine.',
    attrs: ['CON'],
    odds: O_SAFE(0.8),
    run: (s, o) => {
      s.faces.T = (s.faces.T || 0) + (o.tier <= 1 ? 4 : 1);
      s.momentum += o.tier === 0 ? 1 : 0;
      return 'The base hears its own language. True-believer face banks.';
    }
  }),
  mk({
    id: 'ZL_FAITHFUL',
    n: 'The Faithful',
    cost: { a: 1 },
    risk: 'VOL',
    ph: [1, 2, 3],
    tag: 'unreliable labor',
    d: 'Volunteer labor that believes harder than it shows up.',
    attrs: ['CLO', 'CON'],
    odds: O_SAFE(0.5),
    run: (s, o) => {
      if (o.tier <= 1) {
        s.volPool += o.tier === 0 ? 2 : 1;
        return `They show. +${o.tier === 0 ? 2 : 1} volunteers.`;
      }
      return 'Three texts. One maybe. Zero bodies.';
    }
  }),
  mk({
    id: 'ZL_PLAIN',
    n: 'Plain Truth',
    cost: { a: 2 },
    risk: 'VOL',
    ph: [1, 2, 3],
    tag: 'burns relationships',
    d: 'High-impact honesty. People remember. Some stop taking the call.',
    attrs: ['CON', 'CHA'],
    odds: O_SAFE(0.55),
    run: (s, o) => {
      if (o.tier <= 1) {
        s.nameID += 3;
        s.hitPieces = (s.hitPieces || 0) + 1;
        s.faces.O = Math.max(0, (s.faces.O || 0) - 2);
        return 'The clip travels. +3 name ID. Old guard cools. A hit piece wakes up.';
      }
      s.faces.O = Math.max(0, (s.faces.O || 0) - 1);
      return 'You said it. The room went quiet.';
    }
  }),
  mk({
    id: 'ZL_RIGIDITY',
    n: 'Rigidity',
    cost: { a: 0 },
    risk: 'SAFE',
    ph: [1, 2, 3],
    tag: 'cannot trade',
    liability: true,
    d:
      'Liability. While this sits in your kit you cannot take compromise plays cleanly. ' +
      'The machine smells it.',
    attrs: ['CON'],
    odds: O_SAFE(0.99),
    run: s => {
      s.sessionFlags = s.sessionFlags || {};
      s.sessionFlags.rigidityPulse = 1;
      return 'You will not bend today. Neither will the room.';
    }
  }),
  // Staffer
  mk({
    id: 'ZS_PROCEDURE',
    n: 'Procedure',
    cost: { a: 1 },
    risk: 'SAFE',
    ph: [1, 2, 3],
    tag: 'the rule that applies',
    d: 'You know which form, which window, which clerk.',
    attrs: ['INK'],
    odds: O_SAFE(0.88),
    run: (s, o) => {
      s.signatures += o.tier <= 1 ? 25 : 8;
      return o.tier <= 1
        ? 'The packet is right. +25 signatures toward the door.'
        : 'Almost right. +8 signatures.';
    }
  }),
  mk({
    id: 'ZS_HALLWAY',
    n: 'Back Hallway',
    cost: { a: 1 },
    risk: 'STD',
    ph: [1, 2, 3],
    tag: 'access without standing',
    d: 'You know the route. You do not have the right to use it — yet you do.',
    attrs: ['CRA', 'INK'],
    odds: O_SAFE(0.62),
    run: (s, o) => {
      if (o.tier <= 1) {
        s.contacts += 6;
        s.favors += o.tier === 0 ? 1 : 0;
        return o.tier === 0
          ? 'A door that was not on the map. +6 contacts, +1 favor.'
          : 'A door that was not on the map. +6 contacts.';
      }
      return 'Badge check. Not today.';
    }
  }),
  mk({
    id: 'ZS_BOSS',
    n: "The Boss's Name",
    cost: { a: 1 },
    risk: 'VOL',
    ph: [1, 2],
    tag: 'borrowed authority',
    d: 'Consumable borrowed weight. Spend it and it is gone from the pile.',
    attrs: ['DIP', 'CRA'],
    odds: O_SAFE(0.7),
    run: (s, o) => {
      // Remove one copy from ownership after play — consumable authority.
      const i = (s.deck ?? []).indexOf('ZS_BOSS');
      if (i >= 0) s.deck!.splice(i, 1);
      if (o.tier <= 1) {
        s.endorsePts += 1;
        s.contacts += 5;
        return "Their name opens the room. Yours does not keep it. +1 endorsement, +5 contacts.";
      }
      return 'They know you are not the boss. The name still got you in the door.';
    }
  }),
  mk({
    id: 'ZS_NOSTANDING',
    n: 'No Standing',
    cost: { a: 0 },
    risk: 'SAFE',
    ph: [1, 2, 3],
    tag: 'not yet a person',
    liability: true,
    d:
      'Liability. Plays that need personal credibility fail more while this is in your kit. ' +
      'You are staff until the district decides otherwise.',
    attrs: ['INK'],
    odds: O_SAFE(0.99),
    run: s => {
      s.sessionFlags = s.sessionFlags || {};
      s.sessionFlags.noStandingPulse = 1;
      return 'Nobody owes the staffer a return call.';
    }
  }),
  // Faded Name
  mk({
    id: 'ZF_SURNAME',
    n: 'The Surname',
    cost: { a: 1 },
    risk: 'STD',
    ph: [1, 2],
    tag: 'opens one door once',
    d: 'People notice when you use it. The second time it costs more.',
    attrs: ['DIP', 'CHA'],
    odds: O_SAFE(0.72),
    run: (s, o) => {
      s.sessionFlags = s.sessionFlags || {};
      const used = Number(s.sessionFlags.surnameUsed || 0);
      s.sessionFlags.surnameUsed = used + 1;
      if (o.tier <= 1) {
        s.nameID += used ? 1 : 3;
        s.contacts += 6;
        return used
          ? 'They have heard the name too often. Smaller lift.'
          : 'The name still works. +3 name ID, +6 contacts.';
      }
      return 'The name is a museum piece today.';
    }
  }),
  mk({
    id: 'ZF_OLDMONEY',
    n: 'Old Money',
    cost: { a: 0 },
    risk: 'SAFE',
    ph: [1, 2, 3],
    tag: 'finite, non-renewing',
    d: 'A little cash that does not grow back. Spend it knowing the well is shallow.',
    attrs: ['CRA'],
    odds: O_SAFE(0.99),
    run: s => {
      const left = Number(s.sessionFlags?.oldMoneyLeft ?? 400);
      const take = Math.min(200, left);
      s.sessionFlags = s.sessionFlags || {};
      s.sessionFlags.oldMoneyLeft = left - take;
      s.money += take;
      // Remove card when dry
      if (left - take <= 0) {
        const i = (s.deck ?? []).indexOf('ZF_OLDMONEY');
        if (i >= 0) s.deck!.splice(i, 1);
        return `The last of the account. +$${take}. The well is dry.`;
      }
      return `You write a check that still clears. +$${take}.`;
    }
  }),
  mk({
    id: 'ZF_REMEMBERS',
    n: 'Someone Who Remembers',
    cost: { a: 1 },
    risk: 'STD',
    ph: [1, 2],
    tag: 'dormant contact',
    d: 'One person who still picks up when the old name rings.',
    attrs: ['DIP'],
    figures: ['AL07'],
    odds: O_SAFE(0.68),
    run: (s, o) => {
      if (o.tier <= 1) {
        s.contacts += 10;
        s.favors += 1;
        return 'They remember your people. +10 contacts, +1 favor.';
      }
      return 'Voicemail. The number still works. The will does not.';
    }
  }),
  mk({
    id: 'ZF_EXPECTATIONS',
    n: 'Expectations',
    cost: { a: 0 },
    risk: 'SAFE',
    ph: [1, 2, 3],
    tag: 'assumed competence',
    liability: true,
    d:
      'Liability. Others assume competence you lack. Misses land harder while this stays in the kit.',
    attrs: ['CHA'],
    odds: O_SAFE(0.99),
    run: s => {
      s.sessionFlags = s.sessionFlags || {};
      s.sessionFlags.expectationsPulse = 1;
      s.exposure = Math.min(1, (s.exposure || 0) + 0.02);
      return 'They expected more. Exposure notices.';
    }
  })
];

export const ZERO_KIT_PLAYS: PlayCard[] = [
  ...ZERO_UNIVERSAL_PLAYS,
  ...ZERO_PERSONA_PLAYS
];

/** All Zero kit card ids (unique). */
export const ZERO_KIT_IDS = [...new Set(ZERO_KIT_PLAYS.map(p => p.id))];
