/**
 * CANDIDATE ZERO — Unlock paths (docs/PATHS.md)
 * =============================================
 * The balanced-expandability engine: cards you EARN by performing prerequisite
 * plays. A "path" names a combo of required card ids; playing each required
 * card the first time advances the path (a lore toast fires), and completing
 * the combo unlocks a reward card — injected into your draw pile with a lore
 * toast announcing it.
 *
 * This is pure data + a tiny reducer (engine/paths.ts). Reward cards live only
 * here (never in ALL_PLAYS/drafts), gated so they surface only once unlocked —
 * so the catalog grows through play without polluting the base deck.
 *
 * Adding a pathway = one PATH entry + one reward PlayCard. That is the whole
 * extensibility contract; see docs/PATHS.md.
 */

import type { GameState, RollResult, PlayCard, AttrId } from '../engine/types.js';
import { random } from '../engine/rng.js';

export interface PathDef {
  id: string;
  name: string;
  /** Card ids whose first play advances this path; all → unlock. */
  requires: string[];
  /** Reward card id unlocked when every required card has been played. */
  reward: string;
  /** Toast when a NEW required step is met (index-matched, best-effort). */
  stepToasts: string[];
  /** Toast fired when the path completes and the reward is granted. */
  unlockToast: string;
}

/** The pathways. Trigger ids are verified to exist in the live catalog. */
export const PATHS: PathDef[] = [
  {
    id: 'P_CAMPUS',
    name: 'The Campus Machine',
    requires: ['PL01', 'PL02', 'PL06'], // Block Walk + Phone Bank + Town Hall
    reward: 'RW_INTERNS',
    stepToasts: [
      'A grad student takes a flyer and asks how to actually help.',
      'The campus chapter is passing your number around.',
      'A professor offers her seminar for a voter drive.'
    ],
    unlockToast:
      'The university chapter signs on — interns will carry your clipboards. New play unlocked: Outsource Petition Drive to University Interns.'
  },
  {
    id: 'P_ROLODEX',
    name: "The Bundler's Rolodex",
    requires: ['PL05', 'PL13', 'PL03'], // Filing Fee + Fish Fry + Yard Signs
    reward: 'RW_BUNDLER',
    stepToasts: [
      'A donor notices you can actually close. He mentions his list.',
      'The fish-fry crowd has money and opinions about spending it.',
      'A finance guy likes your signs. He likes his cut better.'
    ],
    unlockToast:
      "A bundler adopts your race — the checks come pre-sorted now. New play unlocked: Work the Bundler's List."
  },
  {
    id: 'P_MACHINE',
    name: 'The County Machine',
    requires: ['PL08', 'PL14', 'PL11'], // Kitchen-Table + Court the Chairs + Straw Poll
    reward: 'RW_PRECINCT',
    stepToasts: [
      'A precinct chair remembers your name at the coffee.',
      'The county chairs stop testing you and start counting you.',
      'The straw poll makes the machine take you seriously.'
    ],
    unlockToast:
      'The precinct captains fall in line — the machine turns for you now. New play unlocked: Turn Out the Precinct Captains.'
  }
];

// --------------------------- reward cards ---------------------------
// Gated to only appear once their path is unlocked (belt) and only ever
// injected on unlock (suspenders). Normal odds/tier resolution.

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

interface RewardDef {
  id: string;
  pathId: string;
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

function reward(def: RewardDef): PlayCard {
  const gate = (s: GameState) => !!s.pathsUnlocked?.[def.pathId];
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

export const PATH_REWARDS: PlayCard[] = [
  reward({
    id: 'RW_INTERNS',
    pathId: 'P_CAMPUS',
    n: 'Outsource Petition Drive to University Interns',
    attrs: ['INK', 'CLO'],
    risk: 'STD',
    cost: { a: 1 },
    ph: [1],
    tag: 'the intern army',
    d: 'A hundred students, one afternoon, clipboards everywhere. Signatures at scale — the labor door, staffed by the young.',
    odds: (s) => clamp(0.66 + s.volPool * 0.02, 0.05, 0.95),
    run: (s, o) => {
      if (o.tier === 0) {
        const g = 70 + Math.floor(random() * 30);
        s.signatures += g;
        if (s.signatures >= s.sigNeed && !s.ballot) { s.ballot = true; return `The interns swarm campus — the threshold clears in a day. On the ballot.`; }
        return `The interns swarm campus. +${g} signatures (${s.signatures}/${s.sigNeed}).`;
      }
      if (o.tier === 1) { s.signatures += 40; return `Steady sheets from the quad. +40 signatures (${s.signatures}/${s.sigNeed}).`; }
      if (o.tier === 2) { s.signatures += 15; return 'Half the interns overslept. +15 signatures.'; }
      const lost = 20 + Math.floor(random() * 20); s.signatures = Math.max(0, s.signatures - lost);
      return `An intern forged names to hit quota — the chair strikes ${lost} sheets.`;
    }
  }),
  reward({
    id: 'RW_BUNDLER',
    pathId: 'P_ROLODEX',
    n: "Work the Bundler's List",
    attrs: ['CRA', 'DIP'],
    risk: 'STD',
    cost: { a: 1 },
    ph: [1, 2, 3],
    tag: 'pre-sorted checks',
    d: "Someone else's rolodex, dialing for you. The money arrives bundled, with strings you can mostly ignore.",
    odds: (s) => clamp(0.64 + (s.assets.length ? 0.05 : 0), 0.05, 0.95),
    run: (s, o) => {
      if (o.tier === 0) { const m = 1400 + Math.floor(random() * 700); s.money += m; return `The bundler delivers. +$${m.toLocaleString()} in one packet.`; }
      if (o.tier === 1) { const m = 700 + Math.floor(random() * 300); s.money += m; return `A solid haul. +$${m.toLocaleString()}.`; }
      if (o.tier === 2) { s.money += 250; return 'A thin week for the list. +$250.'; }
      s.exposure = (s.exposure || 0) + 1; return 'A bundled check bounces back tainted. The story is the strings, not the sum.';
    }
  }),
  reward({
    id: 'RW_PRECINCT',
    pathId: 'P_MACHINE',
    n: 'Turn Out the Precinct Captains',
    attrs: ['DIP', 'CLO'],
    risk: 'STD',
    cost: { a: 1, vp: 1 },
    ph: [2, 3],
    tag: 'the machine turns',
    d: 'Every captain a small turnout operation. When they move together, the count moves with them.',
    odds: (s) => clamp(0.66 + s.endorsePts * 0.01, 0.05, 0.95),
    run: (s, o) => {
      if (o.tier === 0) { s.endorsePts += 3; s.groundsArr.forEach(g => (g.gotv += 0.08)); return 'The captains march in lockstep. +3 endorsement points and turnout banked across every ground.'; }
      if (o.tier === 1) { s.endorsePts += 2; s.groundsArr.slice(0, 2).forEach(g => (g.gotv += 0.06)); return '+2 endorsement points and turnout up where it counts.'; }
      if (o.tier === 2) { s.endorsePts += 1; return 'A few captains hang back. +1 endorsement point.'; }
      return 'A captain plays both sides. Nothing moves this week.';
    }
  })
];

/** path id → reward card id (engine/paths.ts consults this on unlock). */
export const REWARD_BY_PATH: Record<string, string> = Object.fromEntries(
  PATHS.map(p => [p.id, p.reward])
);
