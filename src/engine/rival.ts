/**
 * CANDIDATE ZERO — The Rival: the thing that builds against you.
 *
 * THE GAP THIS CLOSES. engine/opponent.ts already reads the board and acts
 * once a week, which is good. But it was anonymous ("the county machine") and
 * amnesiac — the archetype was re-derived from the district every run and
 * nothing carried. So the player built a Machine across cycles and faced a
 * stranger every time. `state.rivals` had been populated at setup and read by
 * nothing since (BALANCE-NOTES.md:441); this finally gives it a job.
 *
 * The Machine is what you build. The Rival is what builds against you, and
 * the two are deliberately symmetrical:
 *
 *   Machine                        Rival
 *   ------------------------------ --------------------------------
 *   named people, kept by name     one named person, kept by name
 *   standing rises on good cycles  strength rises on YOUR bad cycles
 *   members walk, permanently      retires when beaten badly enough
 *   people they poach are lost     those people are what they gained
 *
 * WHY A NAME IS THE WHOLE FEATURE. "The county machine held Piney Flats" is
 * weather. "Wade Coker held Piney Flats, again" is a person, and a person is
 * something a player wants to beat. The opponent's weekly lines already
 * existed; this makes them come from somebody.
 *
 * COVENANT 4 (brutal, impartial RNG): nothing here touches resolve.ts. The
 * rival's head start is banked rapport on real grounds — the same currency the
 * player uses — and it is bounded. RNG picks the name and the amount, never
 * whether the player succeeds.
 *
 * COVENANT 6 (power is never clean): beating a rival does not end the story.
 * A retired rival is replaced by a successor who starts with a share of what
 * the last one built, because the seat is what they want, not you.
 */

import { random } from './rng.js';
import { offerHook } from './hooks.js';
import { memberName, poachedIds } from './machine.js';
import { archetypeForDistrict, WELL_FUNDED_AT, type OpponentArchetype } from './opponent.js';
import { applyRivalProfile, profileFromRival } from './rival-profile.js';
import type { CampaignOutcome, GameState, LegacyState } from './types.js';

/** Strength is a 0–100 dial, like member standing, for the same legibility. */
export const MAX_RIVAL_STRENGTH = 100;

/**
 * Head start per point of strength, spread over the player's grounds. At
 * strength 100 that is 35 rivalRap on each ground — real pressure, but well
 * short of the 85 the opponent treats as saturated, so no ground is ever
 * conceded before week 1.
 */
export const STRENGTH_TO_RAP = 0.35;

/** Beat them this many times in a row and they stop running. */
export const RETIRE_AFTER_LOSSES = 2;

/** A successor inherits this share of the machine the last one built. */
export const SUCCESSOR_INHERITS = 0.45;

/** Strength the first rival opens with. They are not nobody. */
export const OPENING_STRENGTH = 18;


export interface RivalState {
  /** Stable id — `RIV<n>`, incrementing as successors rise. */
  id: string;
  name: string;
  archetype: OpponentArchetype;
  /** Cycles they have run against you. */
  cycles: number;
  /** Cycles they beat you. */
  beatYou: number;
  /** Cycles you beat them. */
  youBeatThem: number;
  /** Consecutive losses — resets on any win. Drives retirement. */
  streak: number;
  strength: number;
  /** Run index they first filed against you. */
  since: number;
  /** Retired predecessors, newest last. The scar on their side. */
  past?: { id: string; name: string; cycles: number; why: string }[];
  /**
   * A law of yours they are running on repealing, by id.
   *
   * Repeal used to be the world's dice: a statute quietly vanished between runs
   * and nothing had a face. But nobody in Texas loses a fight to "circumstances"
   * — they lose it to a person who filed against them and said so out loud at
   * every Rotary lunch for eighteen months. A named campaign you can see coming,
   * and choose to answer or ignore, is a decision; a hidden roll is weather.
   */
  repealTarget?: string;
  /** How it reads on the yard sign. */
  repealPitch?: string;
}

/**
 * Names are Texas-plausible and deliberately unremarkable — a rival called
 * something operatic reads as a videogame boss, and this one is supposed to
 * read as a guy with a war chest and better name ID than you.
 */
const FIRST = [
  'Wade', 'Dale', 'Rhett', 'Curtis', 'Lyle', 'Boyd', 'Marlon', 'Dwayne',
  'Junior', 'Royce', 'Hollis', 'Lamar', 'Cleve', 'Odell', 'Vernon',
  'Darlene', 'Wanda', 'Charlene', 'Roberta', 'Maylene', 'Loretta', 'Jonelle'
];
const LAST = [
  'Coker', 'Pruitt', 'Rakestraw', 'Beaudry', 'Tullos', 'Standifer', 'Yeary',
  'Hollingsworth', 'Kimbrough', 'Threadgill', 'Weatherby', 'Cranfill',
  'Dillard', 'Ratliff', 'Muncy', 'Sowell', 'Bagwell', 'Tatum'
];

/**
 * `taken` are names already used in this career. Without it the successor can
 * roll the name of the person you just beat, which reads as a bug and erases
 * the one trophy the system hands out. The harness caught exactly that.
 */
function rollName(taken: string[] = []): string {
  for (let i = 0; i < 24; i++) {
    const f = FIRST[Math.floor(random() * FIRST.length)]!;
    const l = LAST[Math.floor(random() * LAST.length)]!;
    const name = `${f} ${l}`;
    if (!taken.includes(name)) return name;
  }
  // Pathologically unlucky (or a tiny pool): disambiguate rather than repeat.
  return `${FIRST[Math.floor(random() * FIRST.length)]!} ${LAST[Math.floor(random() * LAST.length)]!} Jr.`;
}

/** How they are described when the fiction needs a role, not a name. */
export function archetypeTitle(a: OpponentArchetype): string {
  switch (a) {
    case 'incumbent': return 'the incumbent';
    case 'insurgent': return 'the insurgent';
    default: return 'the machine candidate';
  }
}

/**
 * They pick a law of yours and run on gutting it.
 *
 * Chosen by exposure — the statute whose language beat the most people, because
 * those are exactly the people who will fund the campaign to strike it. An
 * insurgent runs against the thing itself; a machine candidate runs against the
 * spending; an incumbent runs against the overreach. Same target, three mouths.
 *
 * Announced the moment it is adopted. The whole point is that you can see it
 * coming and decide whether the seat or the statute is worth the session.
 */
export function adoptRepealCampaign(
  r: RivalState,
  law: { id: string; title: string; provisions: { nays: number }[] }
): string {
  r.repealTarget = law.id;
  const short = law.title.replace(/^Signature bill — /, '');
  switch (r.archetype) {
    case 'insurgent':
      r.repealPitch = `${r.name} is running on repealing your ${short} outright. No amendments, no study, repeal.`;
      break;
    case 'machine':
      r.repealPitch = `${r.name} has found the fiscal note on your ${short} and is reading it aloud at every Rotary lunch in the district.`;
      break;
    default:
      r.repealPitch = `${r.name} calls your ${short} government overreach and has promised to strike it in the first thirty days.`;
  }
  return r.repealPitch;
}

/** Odds they actually strike it, given how the cycle went for you. */
export function repealOdds(r: RivalState, enemies: number, heldSeat: boolean): number {
  if (!r.repealTarget) return 0;
  // Their strength is the campaign; the enemies your language made are the
  // money behind it; losing the seat means nobody is on the floor to stop them.
  const base = 0.10 + Math.min(0.30, r.strength * 0.004) + Math.min(0.25, enemies * 0.012);
  return Math.min(0.75, heldSeat ? base : base + 0.25);
}

/** One line of standing, for the dossier. */
export function rivalRecord(r: RivalState): string {
  if (!r.cycles) return 'Has not faced you yet.';
  const parts = [`${r.cycles} ${r.cycles === 1 ? 'cycle' : 'cycles'} against you`];
  if (r.beatYou) parts.push(`beat you ${r.beatYou}`);
  if (r.youBeatThem) parts.push(`you beat them ${r.youBeatThem}`);
  return parts.join(' · ');
}

/**
 * The rival for this career, created on first contact. Archetype comes from
 * the district you filed in the FIRST time you met them and then sticks —
 * a person does not change who they are because you moved race.
 */
export function getRival(legacy: LegacyState, state?: GameState): RivalState {
  if (!legacy.rival) {
    legacy.rival = {
      id: 'RIV1',
      name: rollName(),
      archetype: state ? archetypeForDistrict(state) : 'machine',
      cycles: 0,
      beatYou: 0,
      youBeatThem: 0,
      streak: 0,
      strength: OPENING_STRENGTH,
      since: (legacy.runs?.length ?? 0) + 1,
      past: []
    };
  }
  const r = legacy.rival;
  if (!Array.isArray(r.past)) r.past = [];
  return r;
}

/** Did this outcome go the player's way? */
function playerWon(kind: CampaignOutcome): boolean {
  return kind === 'won_general' || kind === 'session_law' || kind === 'session_survived';
}

/**
 * Apply the rival at the start of a run: they are already on the ground.
 *
 * Also writes `state.rivals`, which the setup screen and the ground picker
 * have been rendering from a placeholder — opponent.ts reads the name from
 * there so its weekly lines come from a person instead of an archetype.
 */
export const STRENGTH_FLAG = 'rivalStrength';

/**
 * Seat the persistent rival for this run.
 *
 * Deliberately routed through engine/rival-profile.ts rather than writing to
 * state directly: the profile pathway is the one head-to-head play will use, so
 * single player exercises it every single run. If this took a shortcut,
 * multiplayer would be a cold, untested codepath on the day it was switched on.
 *
 * (applyRivalProfile also sets state.rivals, the strength flag, and per-ground
 * presence — that is exactly the work a human opponent's profile would do.)
 */
export function applyRival(state: GameState, legacy: LegacyState): RivalState {
  const r = getRival(legacy, state);
  applyRivalProfile(state, profileFromRival(r, state, STRENGTH_TO_RAP));
  // Only used in the log line below; the mechanical effect is the profile's.
  const per = Math.round(r.strength * STRENGTH_TO_RAP);

  const taken = poachedIds(legacy);
  const history =
    r.cycles === 0
      ? `${r.name} files against you — ${archetypeTitle(r.archetype)}, and already ahead of you on name.`
      : r.beatYou > 0
        ? `${r.name} is running again. They have beaten you ${r.beatYou === 1 ? 'once' : `${r.beatYou} times`}, and they start with ${per} on every ground.`
        : `${r.name} is running again, and this time they came ready. +${per} for them on every ground.`;
  state.log.push({ week: state.week, kind: 'note', text: history });

  // Do not make the escalation something the player only feels. Naming it is
  // what turns "the game got harder" into "I let them get here".
  if (r.strength >= WELL_FUNDED_AT) {
    state.log.push({
      week: state.week,
      kind: 'note',
      text:
        `${r.name} has the war chest now — expect mail with your name in ugly type ` +
        `every other week, not every third. That is what the last few cycles bought them.`
    });
  }

  if (taken.length) {
    state.log.push({
      week: state.week,
      kind: 'note',
      text:
        `Working for them: ${taken.map(memberName).join(', ')}. ` +
        `Your people, their doors.`
    });
  }
  return r;
}

export interface RivalOutcome {
  name: string;
  /** True when the player beat them this cycle. */
  beaten: boolean;
  /** They have stopped running; `successor` is who filed instead. */
  retired: boolean;
  successor?: string;
  strengthBefore: number;
  strengthAfter: number;
  lines: string[];
}

/**
 * Settle the rival at the end of a run — the single writer for strength, the
 * same discipline settleMachine uses, so the number can never drift from the
 * cycles that earned it.
 */
export function settleRival(
  legacy: LegacyState,
  state: GameState,
  kind: CampaignOutcome,
  runIndex: number
): RivalOutcome {
  const r = getRival(legacy, state);
  const before = r.strength;
  const won = playerWon(kind);
  const out: RivalOutcome = {
    name: r.name,
    beaten: won,
    retired: false,
    strengthBefore: before,
    strengthAfter: before,
    lines: []
  };

  r.cycles += 1;
  if (won) {
    r.youBeatThem += 1;
    r.streak += 1;
    // Losing costs them, but a machine candidate does not evaporate.
    r.strength = Math.max(0, r.strength - 22);
    out.lines.push(`${r.name} lost. They will not forget who to.`);
  } else {
    r.beatYou += 1;
    r.streak = 0;
    // Every cycle you fail to stop them, they get harder to stop. Missing the
    // ballot entirely is the worst of it — you were not even an obstacle.
    const gain = kind === 'missed_filing' ? 20 : 12;
    r.strength = Math.min(MAX_RIVAL_STRENGTH, r.strength + gain);
    out.lines.push(
      kind === 'missed_filing'
        ? `${r.name} ran unopposed, in effect. They are stronger for it.`
        : `${r.name} won. Two years of incumbency is two years of head start.`
    );
  }

  // Anyone they took from your machine this cycle makes them stronger still.
  const taken = poachedIds(legacy);
  if (taken.length) {
    r.strength = Math.min(MAX_RIVAL_STRENGTH, r.strength + taken.length * 4);
  }

  if (r.streak >= RETIRE_AFTER_LOSSES) {
    // Beaten badly enough to stop running — but the seat is what they wanted,
    // and somebody else wants it too. Covenant 6: winning does not end it.
    const gone = { id: r.id, name: r.name, cycles: r.cycles, why: `beaten ${r.streak} cycles running` };
    const past = [...(r.past ?? []), gone];
    const n = Number(r.id.replace(/\D/g, '')) + 1;
    const successor = rollName([r.name, ...past.map(p => p.name)]);
    legacy.rival = {
      id: `RIV${n}`,
      name: successor,
      archetype: archetypeForDistrict(state),
      cycles: 0,
      beatYou: 0,
      youBeatThem: 0,
      streak: 0,
      /* Never below OPENING_STRENGTH. A rival beaten to 0 would otherwise hand
         you a successor weaker than the one you faced on day one of the
         career — beating somebody would make the game EASIER forever, which
         is the opposite of Covenant 6. The seat is still worth having, so
         whoever files next is at least as serious as the first one was. */
      strength: Math.max(OPENING_STRENGTH, Math.round(r.strength * SUCCESSOR_INHERITS)),
      since: runIndex + 1,
      past
    };
    out.retired = true;
    out.successor = successor;
    out.lines.push(
      `${r.name} is not filing again. ${successor} picks up their donor list and their grudge.`
    );
  }

  out.strengthAfter = legacy.rival!.strength;
  return out;
}

/**
 * The fourth hook source: a file on the rival, and it does not keep.
 *
 * The first three sources are things you EARNED — a member who owes you, a
 * statute that worked, a machine you built. This one you did not earn. It shows
 * up. Somebody who used to work for them, or somebody who just does not like
 * them, puts an envelope in front of you, and the only question is what kind of
 * candidate you are when nobody is looking.
 *
 * COVENANT 6, power is never clean: this is the source that is a genuine WAGER
 * rather than a gift with a price tag. HK05's cost is printed on the card;
 * HK06's cost is that it might not work and you might become the story. Those
 * are different kinds of bad and the game needs both.
 *
 * PERISHABLE, and this is the first source that actually exercises that
 * machinery under a real card rather than a synthetic harness hook. A file is
 * worth something for about a month. After that the news cycle has moved and
 * you are the man dredging up old business, which is worse than nothing.
 *
 * Offered only when they have a RECORD — `cycles > 0`. A first-time filer has
 * not been in public life long enough for anybody to have kept receipts.
 */
export const FILE_KEEPS_WEEKS = 4;

export function offerRivalHooks(state: GameState, legacy: LegacyState): number {
  const r = getRival(legacy, state);
  if (r.cycles < 1) return 0;
  const h = offerHook(state, {
    id: `HK_FILE_${r.id}_${r.cycles}`,
    n: `Somebody sent you a file on ${r.name}`,
    d:
      `No return address. Whether it is true is a separate question from whether it works, ` +
      `and both are separate from whether you are the one who should be holding it. ` +
      `Good for about a month.`,
    kind: 'rival',
    source: r.id,
    stages: ['primary', 'general'],
    expiresWeek: state.week + FILE_KEEPS_WEEKS
  });
  return h ? 1 : 0;
}
