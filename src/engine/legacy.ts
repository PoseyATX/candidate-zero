/**
 * CANDIDATE ZERO — The Chronicle (cross-run meta-progression)
 */

import type {
  CampaignOutcome,
  FiledIdentity,
  GameState,
  LegacyState,
  TraitId
} from './types.js';
import { createRng, random } from './rng.js';
import { hasRep } from './reputation.js';
import { generalWinProbability, primaryWinProbability } from './calendar.js';
import { doorCardId, MACHINE_DOOR_PLAYS } from '../data/machine-doors.js';
import { applyLegacyDebt, isDebtCrisis, mergeDebtIntoCarry } from './debt.js';
import {
  seatMachine,
  settleMachine,
  applyPoachPenalty,
  memberName,
  type MachineOutcome
} from './machine.js';
import {
  applyRival,
  settleRival,
  adoptRepealCampaign,
  repealOdds,
  getRival,
  type RivalOutcome
} from './rival.js';
import {
  recordLaw,
  lawGoodwill,
  servedGrounds,
  standingLaws,
  repealLaw,
  mostExposedLaw,
  type EnactedLaw
} from './laws.js';
import { lawWasDefended } from './docket.js';
import { offerStatuteHooks } from './laws.js';
import { offerMachineHooks } from './machine.js';
import {
  settleChamber,
  carryChamber,
  chamberLine,
  mergeRoomBack,
  offerMemberHooks
} from './chamber.js';
import { takeStripped } from '../data/policy-plays.js';
import type { MemberDef } from '../data/members.js';

const STORAGE_KEY = 'cz_legacy_v1';

export function emptyLegacy(): LegacyState {
  return { runs: [], traits: [], carry: {} };
}

function storageAvailable(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem('cz_t', '1');
    localStorage.removeItem('cz_t');
    return true;
  } catch {
    return false;
  }
}

export function loadLegacy(): LegacyState {
  if (!storageAvailable()) return emptyLegacy();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyLegacy();
    const parsed = JSON.parse(raw) as Partial<LegacyState>;
    return {
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      traits: Array.isArray(parsed.traits) ? parsed.traits : [],
      carry: parsed.carry ?? {},
      name: parsed.name,
      identity: parsed.identity,
      // loadLegacy allow-lists fields, so anything not named here is silently
      // dropped on reload. The machine was invisible for exactly that reason:
      // it settled correctly, saved correctly, and evaporated on next load.
      machine: parsed.machine,
      // Same trap as `machine` above: omit it here and the rival settles
      // correctly, saves correctly, and evaporates on the next load.
      rival: parsed.rival,
      playerId: parsed.playerId
    };
  } catch {
    return emptyLegacy();
  }
}

export function saveLegacy(legacy: LegacyState): void {
  if (!storageAvailable()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
  } catch {
    /* storage unavailable */
  }
}

/**
 * Stable id for this career, minted on first use and then fixed.
 *
 * Persona is not enough on its own: head-to-head needs two distinct players,
 * and two people both running the Teacher would collide.
 *
 * MINTED FROM ITS OWN STREAM, not the campaign's. The first version of this
 * drew from the shared seeded RNG, which meant exporting your campaign
 * mid-run advanced the stream and changed every card resolution afterwards —
 * a seeded replay would diverge purely because the player pressed a button.
 * Identity is not gameplay and must never perturb it.
 */
export function playerId(legacy: LegacyState): string {
  if (!legacy.playerId) {
    const rng = createRng((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);
    let out = 'P_';
    for (let i = 0; i < 8; i++) {
      out += 'abcdefghijkmnpqrstuvwxyz23456789'[Math.floor(rng.next() * 32)];
    }
    legacy.playerId = out;
  }
  return legacy.playerId;
}

export function setIdentity(legacy: LegacyState, id: FiledIdentity): void {
  legacy.identity = { ...id };
}

export function clearIdentity(legacy: LegacyState): void {
  delete legacy.identity;
}

export const TRAITS: Record<TraitId, { n: string; d: string }> = {
  T_AUTHOR: { n: 'Bill Author', d: 'You have written law. +4 name ID now; +2 capital in any future Session.' },
  T_LEVERS: { n: 'Knows the Levers', d: 'The building is a machine and you have seen the gears. +8 Parliamentarian, +8 Operator.' },
  T_LIST: { n: 'The Banked List', d: 'Start with 30% of your last run’s contacts.' },
  T_KNOWN: { n: 'Known Quantity', d: 'Start with +6 name ID. They remember the yard signs.' },
  T_CRED: { n: 'Movement Cred', d: 'True-Believer grounds start at 12 rapport.' },
  T_NORTH: { n: 'True North', d: 'The message starts sharp. You never lost the thread.' },
  T_NERD: { n: 'Procedure Nerd', d: '+12 Parliamentarian. Once per campaign, a procedural DISASTER reads down to a SETBACK.' },
  T_WHIP: { n: 'The Whip Count', d: '+12 Operator; start with a favor in your pocket.' },
  T_REST: { n: 'Rested', d: 'Start with +2 volunteers and a clean slate of grudges.' },
  T_PERSP: { n: 'Perspective', d: 'Disaster band permanently narrower. Losing taught you where the holes are.' }
};

export interface InterimPath {
  id: string;
  n: string;
  d: string;
  traits: [TraitId, TraitId];
  interim: string;
}

export function buildPaths(state: GameState, share: number): InterimPath[] {
  const respectable = share > 28 && state.hitPieces < 3;
  const crisis = isDebtCrisis(state);
  const wasSession =
    state.outcome === 'session_law' ||
    state.outcome === 'session_survived' ||
    state.outcome === 'session_primaried' ||
    state.stage === 'session';
  const issueLabel = (state.issue ?? '').trim();
  const paths: (InterimPath & { gate: boolean })[] = [
    {
      id: 'perennial',
      n: crisis ? 'The Perennial Candidate (and the Note)' : 'The Perennial Candidate',
      d: crisis
        ? `Keep running with $${state.debt} still on the books. Worse economics next cycle — interest compounds. Or take the PAC Check as relief next time.`
        : 'Keep the list warm. Keep showing up. The county learns your face by the third try.',
      traits: ['T_LIST', 'T_KNOWN'],
      gate: true,
      interim: crisis
        ? 'Two years of fish fries, funerals, and a bank note that does not sleep.'
        : 'Two years of fish fries and funerals, list warm.'
    },
    {
      id: 'advocate',
      n: 'The Advocate',
      d: issueLabel
        ? `The race ended. ${issueLabel} did not. Build the organization the fight still needs.`
        : 'The race ended. The issue did not. Build the organization the fight still needs.',
      traits: ['T_CRED', 'T_NORTH'],
      gate: !crisis,
      interim: issueLabel
        ? `Two years building around ${issueLabel}.`
        : 'Two years building the organization.'
    },
    {
      id: 'staffer',
      n: 'The Staffer',
      d: 'Someone in Austin noticed you. Two years inside the building, learning where the levers are.',
      traits: ['T_NERD', 'T_WHIP'],
      gate: !crisis && (respectable || state.endorsePts > 2),
      interim: 'Two years carrying a badge in the Capitol, learning the levers.'
    },
    {
      id: 'home',
      n: 'Go Home a While',
      d: crisis
        ? 'Stop the bleeding. Fix the fence. The note still compounds, but you are not on the trail.'
        : 'Fix the fence. Coach the team. Let the county forget the mailers before it remembers your name.',
      traits: ['T_REST', 'T_PERSP'],
      gate: true,
      interim: crisis
        ? 'Two years of fences, Friday games, and interest.'
        : 'Two years of fences and Friday games.'
    },
    {
      id: 'exmember',
      n: 'The Ex-Member',
      d: 'Two years as a former legislator — half lobbyist-in-waiting, half elder statesman, all rolodex.',
      traits: ['T_AUTHOR', 'T_LEVERS'],
      gate: wasSession,
      interim: 'Two years as a former member — doors still open, title still warm.'
    },
    {
      id: 'senate',
      n: 'Senate Exploratory',
      d: 'Quiet calls about the other chamber. Bigger map, longer odds, same two years.',
      traits: ['T_LEVERS', 'T_WHIP'],
      gate: wasSession && (state.outcome === 'session_law' || (state.capital || 0) >= 6),
      interim: 'Two years testing Senate waters — lunches, briefs, no announcement.'
    },
    {
      id: 'statewide',
      n: 'Statewide Exploratory',
      d: "Governor's row is a different weather system. Test it without filing.",
      traits: ['T_KNOWN', 'T_LEVERS'],
      gate: wasSession && state.outcome === 'session_law' && (state.nameID || 0) >= 25,
      interim: 'Two years on the statewide circuit — airports, rotary, no yard signs yet.'
    }
  ];
  return paths.filter(p => p.gate);
}

export function applyLegacy(state: GameState, legacy: LegacyState): void {
  const has = (t: TraitId) => legacy.traits.includes(t);

  // The record you carry into the district. A statute that served a county is
  // remembered there — that is how members with a real record survive primaries
  // their bills do not. Capped in laws.ts so a long career is hard to beat, not
  // impossible.
  state.carriedLaws = standingLaws(legacy).map(l => ({ ...l }));
  carryChamber(state, legacy);
  // The return path. Three sources offer into ONE registry — members who owe
  // you, statutes still working for somebody, and the machine, which does not
  // offer favours so much as deals. Order matters only for the board cap.
  const fromMembers = offerMemberHooks(state, legacy);
  const fromStatutes = offerStatuteHooks(state, legacy);
  const fromMachine = offerMachineHooks(state, legacy);
  const threads = fromMembers + fromStatutes + fromMachine;
  if (threads > 0) {
    const kinds = [
      fromMembers > 0 ? 'people who owe you' : '',
      fromStatutes > 0 ? 'programs that worked' : '',
      fromMachine > 0 ? 'a deal that is not a favour' : ''
    ].filter(Boolean);
    state.log.push({
      week: state.week,
      kind: 'note',
      text:
        `THREADS — ${threads} open thread${threads === 1 ? '' : 's'} back home: ${kinds.join(', ')}. ` +
        `Check the Dossier. None of it is obligatory, and not all of it is a gift.`
    });
  }
  const room = chamberLine(legacy);
  if (room) state.log.push({ week: state.week, kind: 'note', text: room });
  // The opposition picks its fight before you do. If you have a statute that
  // beat enough people to fund a campaign, your rival is already running on it.
  const target = mostExposedLaw(legacy);
  if (target) {
    // getRival, not legacy.rival: the rival is created lazily and applyRival
    // runs LATER in this function, so reading the raw field here found nothing
    // and every campaign silently failed to be adopted.
    const opp = getRival(legacy, state);
    if (opp.repealTarget !== target.id) {
      const pitch = adoptRepealCampaign(opp, target);
      state.log.push({ week: state.week, kind: 'note', text: `THE OTHER SIDE — ${pitch}` });
    } else if (opp.repealPitch) {
      state.log.push({
        week: state.week,
        kind: 'note',
        text: `THE OTHER SIDE — ${opp.repealPitch} Still.`
      });
    }
  } else if (legacy.rival) {
    // Nothing of yours is exposed enough to run against. They drop it.
    legacy.rival.repealTarget = undefined;
    legacy.rival.repealPitch = undefined;
  }
  const goodwill = lawGoodwill(legacy);
  if (goodwill > 0) {
    state.districtStanding = Math.min(100, state.districtStanding + goodwill);
    for (const id of servedGrounds(legacy)) {
      const g = state.groundsArr.find(x => x.id === id);
      if (g) g.rapport = Math.min(100, (g.rapport || 0) + 6);
    }
    const n = standingLaws(legacy).length;
    state.log.push({
      week: state.week,
      kind: 'note',
      text:
        `YOUR RECORD — ${n} statute${n === 1 ? '' : 's'} of yours still on the books ` +
        `(+${goodwill} standing). The counties they served have not forgotten who carried them.`
    });
  }
  if (has('T_LIST') && legacy.carry.contacts) {
    state.contacts += Math.round(legacy.carry.contacts * 0.3);
  }
  if (has('T_KNOWN')) state.nameID += 6;
  if (has('T_CRED')) {
    for (const g of state.groundsArr) {
      if (g.aff.includes('T')) g.rapport = Math.max(g.rapport, 12);
    }
  }
  if (has('T_NORTH')) state.messageSharp = true;
  if (has('T_NERD')) {
    state.faces.P += 12;
    state.parlSave = true;
  }
  if (has('T_WHIP')) {
    state.faces.O += 12;
    state.favors += 1;
  }
  if (has('T_REST')) state.volPool += 2;
  if (has('T_PERSP')) state.globalBand = (state.globalBand ?? 0) - 0.01;
  if (has('T_AUTHOR')) state.nameID += 4;
  if (has('T_LEVERS')) {
    state.faces.P += 8;
    state.faces.O += 8;
  }
  // The people who are with you are already with you — this is the felt payoff
  // for having built a machine, and it lands in week 1 rather than in a menu.
  const seated = seatMachine(state, legacy);
  if (seated.length) {
    state.log.push({
      week: state.week,
      kind: 'note',
      text: `Your people are already in: ${seated.map(memberName).join(', ')}.`
    });
    // Name the doors they open. A privilege the player cannot see is one they
    // will not miss when it shuts (see data/machine-doors.ts).
    const opened = seated
      .map(id => {
        const cardId = doorCardId(id);
        const card = cardId ? MACHINE_DOOR_PLAYS.find(c => c.id === cardId) : undefined;
        return card ? `${card.n} (${memberName(id)})` : null;
      })
      .filter((x): x is string => !!x);
    if (opened.length) {
      state.log.push({
        week: state.week,
        kind: 'note',
        text: `That opens what nobody else can reach: ${opened.join(', ')}.`
      });
    }
  }

  // ...and the people who are not. Same moment, deliberately: the run opens by
  // showing both what you kept and what is now aimed at you.
  applyPoachPenalty(state, legacy);

  // The other half of the ledger: who is running against you, by name, with
  // whatever they have accumulated across the career (engine/rival.ts).
  applyRival(state, legacy);

  applyLegacyDebt(state, legacy);

  if (legacy.carry.waitingLoopId) {
    state.sessionFlags = state.sessionFlags || {};
    state.sessionFlags[`waiting_${legacy.carry.waitingLoopId}`] = true;
    state.entityHistory = state.entityHistory ?? [];
    const tag = `WAIT:${legacy.carry.waitingLoopId}`;
    if (!state.entityHistory.includes(tag)) state.entityHistory.push(tag);
    state.log.push({
      week: state.week,
      kind: 'note',
      text: `Last cycle's path still colors this climb.`
    });
  }
  if (legacy.carry.waitingContacts) state.contacts += legacy.carry.waitingContacts;
  if (legacy.carry.waitingNameID) state.nameID += legacy.carry.waitingNameID;
  if (legacy.carry.waitingMoney) state.money += legacy.carry.waitingMoney;
  if (legacy.carry.waitingVols) state.volPool += legacy.carry.waitingVols;
  if (legacy.carry.waitingFavors) state.favors += legacy.carry.waitingFavors;
  if (legacy.carry.higherOfficeFork) {
    state.sessionFlags = state.sessionFlags || {};
    state.sessionFlags.higherOfficeFork =
      legacy.carry.higherOfficeFork === 'senate' ? 1 : 2;
    state.log.push({
      week: state.week,
      kind: 'note',
      text: `Last cycle tested larger waters. The map is bigger than one district.`
    });
  }
  if (
    legacy.carry.waitingContacts ||
    legacy.carry.waitingNameID ||
    legacy.carry.waitingMoney ||
    legacy.carry.waitingVols ||
    legacy.carry.waitingFavors
  ) {
    legacy.carry = {
      ...legacy.carry,
      waitingContacts: 0,
      waitingNameID: 0,
      waitingMoney: 0,
      waitingVols: 0,
      waitingFavors: 0
    };
  }
}

export function computeShare(state: GameState, kind: CampaignOutcome): number {
  if (kind === 'lost_primary') return primaryWinProbability(state) * 100;
  if (kind === 'lost_general') return generalWinProbability(state) * 100;
  if (kind === 'session_law' || kind === 'session_survived') {
    return Math.min(95, 50 + state.districtStanding * 0.4);
  }
  if (kind === 'session_primaried') {
    return Math.max(5, state.districtStanding * 0.35);
  }
  return 0;
}

export function buildEpithet(state: GameState, kind: CampaignOutcome, share: number): string {
  const who = state.persona ? lowerThe(state.persona) : 'The candidate';
  const alignLabel: Record<string, string> = {
    safe: 'a safe seat',
    competitive: 'a competitive district',
    wrong: 'a wrong-party district'
  };
  const d = alignLabel[state.district?.align ?? ''] ?? 'the district';

  let core: string;
  if (kind === 'won_general') {
    core = state.incumbentRun
      ? `defended the seat as the incumbent on ${state.issue ?? 'the issue'}`
      : `won the seat outright on ${state.issue ?? 'the issue'}`;
  } else if (kind === 'session_law') {
    core = `passed a bill into law on ${state.issue ?? 'the issue'} and held the seat`;
  } else if (kind === 'session_survived') {
    core = `survived a first session on ${state.issue ?? 'the issue'} and held the seat`;
  } else if (kind === 'session_primaried') {
    core = `won the seat, fought a session, and was primaried out`;
  } else if (kind === 'missed_filing') {
    core = `never made the ballot — ${state.signatures} signatures and an empty coffee can`;
  } else if (kind === 'lost_general') {
    core = `won the primary on ${state.issue ?? 'the issue'}, then hit the general’s wall at ${share.toFixed(1)}%`;
  } else {
    core = `ran on ${state.issue ?? 'the issue'} and fell at ${share.toFixed(1)}%`;
  }

  const marks: string[] = [];
  if (hasRep(state, 'R11')) marks.push('the county called them snakebit');
  if (hasRep(state, 'R09')) marks.push('the movement’s choice to the end');
  if (hasRep(state, 'R08')) marks.push('the establishment’s pick');
  if (state.shFired.F2 || state.shFired.T2) marks.push('undone partly by their own shadow');
  if (state.obls.length >= 3) marks.push(`carrying ${state.obls.length} obligations like stones`);
  if ((state.debt || 0) > 0) {
    marks.push(
      kind === 'won_general'
        ? `a note on the books ($${state.debt}) heading into Session`
        : `$${state.debt} still owed — the bank does not care who lost`
    );
  }
  if (hasRep(state, 'R01')) marks.push('nobody outworked them');

  return `${who} ${core} in ${d}${marks.length ? ' — ' + marks.join('; ') : ''}.`;
}

function lowerThe(n: string): string {
  return n.startsWith('The ') ? 'the ' + n.slice(4) : n;
}

export function buildGrowthLine(state: GameState): string | null {
  const grew: string[] = [];
  if (state.walkCount > 0) grew.push(`walked ${state.walkCount} blocks`);
  if (state.nameID > 0) grew.push(`built ${state.nameID} name recognition`);
  if (state.reps.length) grew.push(`earned ${state.reps.length} reputation${state.reps.length === 1 ? '' : 's'}`);
  if (!grew.length) return null;
  return `But you did not come away empty. This run, you ${grew.join(' · ')}. The county remembers.`;
}

export function recordRun(legacy: LegacyState, state: GameState, kind: CampaignOutcome, share: number): void {
  legacy.runs.push({ epithet: buildEpithet(state, kind, share), kind });
  // A signed bill goes into the book BEFORE anything else settles, so the law
  // exists for the machine and the rival to react to. Until this line, passing
  // a law set an outcome string and the next campaign began in a world where
  // nothing you had ever done existed.
  if (kind === 'session_law') recordLaw(legacy, state, legacy.runs.length);
  // Who you delivered for, and who you pulled the rug from under. Both by name,
  // both remembered — a coalition you cannot betray is not a coalition.
  mergeRoomBack(legacy, state);
  lastChamber = settleChamber(legacy, state, takeStripped());
  // And the other direction: a statute you did not defend this session can be
  // struck. A win you cannot lose is a high score, not a win — the people your
  // language beat are still in the building, and they can count.
  lastRepeal = settleRepeals(legacy, state, legacy.runs.length);
  const base = { contacts: state.contacts, nameID: state.nameID };
  legacy.carry = mergeDebtIntoCarry(base, state, kind);
  // Settle the machine AFTER the run is recorded, so runIndex is the number of
  // the cycle just finished — the departure line reads "since your third".
  lastMachineOutcome = settleMachine(legacy, state, kind, legacy.runs.length);
  // Rival settles AFTER the machine, so a member poached this cycle is already
  // in `departed` and counts toward the strength they gained from taking them.
  lastRivalOutcome = settleRival(legacy, state, kind, legacy.runs.length);
}

/**
 * Strike undefended statutes.
 *
 * A law is exposed when its language made real enemies (nays), and it is safe
 * for a session if you spent the actions to reauthorize it. Losing the seat
 * leaves everything exposed — you are not there to hold the floor.
 */
function settleRepeals(legacy: LegacyState, state: GameState, runIndex: number): EnactedLaw[] {
  const struck: EnactedLaw[] = [];
  const heldSeat = state.outcome === 'session_law' || state.outcome === 'session_survived';
  for (const law of standingLaws(legacy)) {
    if (law.passedRun >= runIndex) continue; // passed this very session
    const enemies = law.provisions.reduce((s, p) => s + p.nays, 0);
    if (enemies <= 0) continue;
    if (heldSeat && lawWasDefended(state, law.id)) continue;
    // Repeal is somebody's campaign, not the weather. Only the statute your
    // rival actually ran on is at risk, and the odds are their strength plus
    // the money of everyone your language beat. A law nobody is campaigning
    // against does not quietly evaporate between runs.
    const rival = legacy.rival;
    if (!rival || rival.repealTarget !== law.id) continue;
    const risk = repealOdds(rival, enemies, heldSeat);
    if (random() < risk) {
      repealLaw(legacy, law.id, runIndex);
      struck.push(law);
    }
  }
  return struck;
}

let lastRepeal: EnactedLaw[] = [];
let lastChamber: { warmed: MemberDef[]; burned: MemberDef[] } = { warmed: [], burned: [] };

/** Who warmed to you and who went cold in the run just ended. */
export function takeChamberChanges(): { warmed: MemberDef[]; burned: MemberDef[] } {
  const c = lastChamber;
  lastChamber = { warmed: [], burned: [] };
  return c;
}

/** Statutes struck during the run that just ended, for the terminal screen. */
export function takeRepeals(): EnactedLaw[] {
  const r = lastRepeal;
  lastRepeal = [];
  return r;
}

/**
 * What the machine did at the end of the last run, for the terminal screen.
 * Held here rather than returned so recordRun's signature stays put for its
 * existing callers.
 */
let lastMachineOutcome: MachineOutcome | null = null;

export function takeMachineOutcome(): MachineOutcome | null {
  const o = lastMachineOutcome;
  lastMachineOutcome = null;
  return o;
}

/** What the rival did at the end of the last run, for the terminal screen. */
let lastRivalOutcome: RivalOutcome | null = null;

export function takeRivalOutcome(): RivalOutcome | null {
  const o = lastRivalOutcome;
  lastRivalOutcome = null;
  return o;
}

export const PATH_TO_WAITING_LOOP: Record<string, string> = {
  perennial: 'LOOP_WAITING_PERENNIAL',
  advocate: 'LOOP_WAITING_ADVOCATE',
  staffer: 'LOOP_WAITING_STAFFER',
  home: 'LOOP_WAITING_HOME',
  exmember: 'LOOP_WAITING_EXMEMBER',
  senate: 'LOOP_ELECTED_HIGHER_SENATE',
  statewide: 'LOOP_ELECTED_HIGHER_STATEWIDE'
};

export function setInterimPath(legacy: LegacyState, pathId: string, interim: string): void {
  const last = legacy.runs[legacy.runs.length - 1];
  if (last) last.interim = interim;
  const loopId = PATH_TO_WAITING_LOOP[pathId];
  if (loopId) {
    legacy.carry = { ...legacy.carry, waitingLoopId: loopId };
  }
}

export function setInterim(legacy: LegacyState, interim: string): void {
  const last = legacy.runs[legacy.runs.length - 1];
  if (last) last.interim = interim;
}

export function addTrait(legacy: LegacyState, trait: TraitId): void {
  if (!legacy.traits.includes(trait)) legacy.traits.push(trait);
  if (legacy.traits.length > 3) legacy.traits = legacy.traits.slice(-3);
}

export function romanRun(index: number): string {
  const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return numerals[index] ?? String(index + 1);
}
