/**
 * CANDIDATE ZERO — Frozen host API (engine binding boundary)
 * =============================================================
 * This is the ONE surface a presentation host (Unity/C#, iOS, a web UI,
 * a bot) binds to. The rules — resolve/odds/yields/RNG — live only in the
 * TypeScript engine behind this boundary; a host NEVER reimplements them.
 * That is the ship-path covenant (docs/ROADMAP.md Phase 8, docs/ENGINE-API.md).
 *
 * Determinism / seed contract
 * ---------------------------
 * The RNG is mulberry32 — its entire internal state is a single uint32
 * counter. So a game is fully, exactly reproducible from plain data:
 *
 *     snapshot = { seed, rng-counter, setup, GameState, DeckState }
 *
 * Everything in a snapshot is JSON-serializable (the card catalog is the
 * only non-data part of a Campaign, and it is rebuilt from static card
 * data on hydrate — never serialized). Two guarantees follow, both proven
 * by src/harness/api.ts:
 *   1. Same seed + same ordered command list  ->  identical final state.
 *   2. serialize() -> deserialize() mid-game   ->  identical state, and
 *      play continues identically (save/load is exact, not approximate).
 *
 * A host therefore needs to persist only a snapshot (or seed + command
 * log) to save a game; it does not need to understand any rule.
 */

import {
  createCampaign,
  buildCatalog,
  snapshot as ledgerSnapshot,
  listPlayableHand,
  playFromHand,
  endWeekInPlace,
  startWeek,
  maybeOfferPhaseDraft,
  pickPhaseDraft,
  campIndexToCardId,
  type Campaign
} from './loop.js';
import { DEFAULT_HAND_SIZE } from './deck.js';
import { PRIMARY_WEEKS } from './calendar.js';
import { getPhase, stageLabel, stageWeek } from './state.js';
import { createRng, getRng, useRng } from './rng.js';
import {
  PERSONAS,
  ISSUES,
  DISTRICTS,
  REGIONS,
  HARNESS_DEFAULT_SETUP,
  type SetupSelection
} from '../data/setup.js';
import type { DeckState, GameState, PlayCard } from './types.js';

export const ENGINE_API_VERSION = '1.0.0';

/** Fully reproducible, JSON-serializable game state. */
export interface EngineSnapshot {
  v: string;
  seed: number;
  /** mulberry32 counter — resumes the exact RNG stream. */
  rng: number;
  setup: SetupSelection;
  state: GameState;
  deck: DeckState;
}

export type Command =
  | { type: 'play'; handIndex: number; groundId?: string }
  | { type: 'endWeek' }
  | { type: 'draft'; option: number };

export interface ActionOption {
  handIndex: number;
  cardId: string;
  name: string;
  risk: string;
  camp: boolean;
  /** true → this play wants a groundId (a field play). */
  field: boolean;
  costLabel: string;
  /** effective success probability given current state, or null if odds-less. */
  approxOdds: number | null;
}

export interface GroundView {
  id: string;
  n: string;
  pool: number;
  rapport: number;
  rivalRap: number;
  gotv: number;
}

export interface RenderView {
  v: string;
  over: boolean;
  outcome: string;
  stage: GameState['stage'];
  phase: number;
  stageLabel: string;
  stageWeek: number;
  calendarWeek: number;
  weeksTotal: number;
  identity: { persona: string | null; issue: string | null; district: string | null };
  ledger: ReturnType<typeof ledgerSnapshot> & {
    momentum: number;
    favors: number;
    debt: number;
    endorsePts: number;
    ballot: boolean;
    signatures: number;
    sigNeed: number;
  };
  grounds: GroundView[];
  actions: ActionOption[];
  pendingDraft: { phase: number; options: { cardId: string; name: string; risk: string }[] } | null;
  /** true when there is nothing left but to end the week. */
  canEndWeek: boolean;
  log: { week: number; kind: string; text: string; tier?: number }[];
}

export interface ApplyResult {
  snapshot: EngineSnapshot;
  ok: boolean;
  reason?: string;
  /** log entries produced by this command (for host toasts/animation). */
  events: { week: number; kind: string; text: string; tier?: number }[];
}

// ---- internal: rebuild a live Campaign from a snapshot (no rule re-run) ----

function hydrate(snap: EngineSnapshot): Campaign {
  // Restore the exact RNG position. mulberry32 state is only the counter,
  // so seeding then setting the counter reproduces the stream precisely.
  useRng(createRng(snap.seed));
  getRng().setSeed(snap.rng);
  return {
    state: snap.state,
    deck: snap.deck,
    catalog: buildCatalog(), // derived from static card data — never serialized
    handSize: DEFAULT_HAND_SIZE,
    filingDeadline: PRIMARY_WEEKS,
    setup: snap.setup
  };
}

function capture(seed: number, setup: SetupSelection, campaign: Campaign): EngineSnapshot {
  return {
    v: ENGINE_API_VERSION,
    seed,
    rng: getRng().getSeed(),
    setup,
    state: campaign.state,
    deck: campaign.deck
  };
}

function costLabel(card: PlayCard): string {
  const c = card.cost;
  const parts: string[] = [];
  if (c.a) parts.push(`${c.a} AP`);
  if (c.$) parts.push(`$${c.$}`);
  if (c.vp) parts.push(`${c.vp} vol`);
  if (c.m) parts.push(`${c.m} mom`);
  if (c.fav) parts.push(`${c.fav} fav`);
  return parts.join(' · ') || 'free';
}

function effectiveOdds(state: GameState, card: PlayCard): number | null {
  if (!card.odds) return null;
  const g = state.groundsArr.find(x => x.pool > 0) ?? state.groundsArr[0];
  const base = card.odds(state, g);
  return Math.max(0.02, Math.min(0.95, base));
}

// ---- public API ----

/** The choices a host presents on the setup screen. */
export function setupOptions() {
  const strip = (arr: { id: string; n: string; d?: string }[]) =>
    arr.map(x => ({ id: x.id, n: x.n, d: x.d ?? '' }));
  return {
    personas: strip(PERSONAS),
    issues: strip(ISSUES),
    districts: strip(DISTRICTS),
    regions: strip(REGIONS),
    default: HARNESS_DEFAULT_SETUP
  };
}

/** Start a new campaign. Deterministic in (seed, setup). */
export function newGame(opts: { seed: number; setup?: Partial<SetupSelection> }): EngineSnapshot {
  const seed = opts.seed >>> 0 || 1;
  const setup: SetupSelection = { ...HARNESS_DEFAULT_SETUP, ...(opts.setup ?? {}) };
  const campaign = createCampaign({ seed, setup });
  startWeek(campaign);
  return capture(seed, setup, campaign);
}

/** Available actions for the current snapshot (drives a host's action UI). */
export function legalActions(snap: EngineSnapshot): ActionOption[] {
  const campaign = hydrate(snap);
  return listPlayableHand(campaign).map(({ index, card }) => ({
    handIndex: index,
    cardId: card.id,
    name: card.n,
    risk: card.risk,
    camp: index < 0,
    field: !!card.field,
    costLabel: costLabel(card),
    approxOdds: effectiveOdds(campaign.state, card)
  }));
}

/** Full render model + actions for the current snapshot. */
export function view(snap: EngineSnapshot): RenderView {
  const campaign = hydrate(snap);
  const s = campaign.state;
  const base = ledgerSnapshot(s);
  const pd = s.pendingDraft;
  return {
    v: ENGINE_API_VERSION,
    over: s.over,
    outcome: s.outcome ?? 'ongoing',
    stage: s.stage,
    phase: getPhase(s),
    stageLabel: stageLabel(s),
    stageWeek: stageWeek(s),
    calendarWeek: s.week,
    weeksTotal: s.weeksTotal,
    identity: { persona: s.persona, issue: s.issue, district: s.district?.name ?? null },
    ledger: {
      ...base,
      momentum: s.momentum,
      favors: s.favors,
      debt: s.debt,
      endorsePts: s.endorsePts,
      ballot: s.ballot,
      signatures: s.signatures,
      sigNeed: s.sigNeed
    },
    grounds: s.groundsArr.map(g => ({
      id: g.id,
      n: g.n,
      pool: g.pool,
      rapport: Math.round(g.rapport || 0),
      rivalRap: Math.round(g.rivalRap || 0),
      gotv: g.gotv || 0
    })),
    actions: legalActions(snap),
    pendingDraft: pd?.options.length
      ? {
          phase: pd.phase,
          options: pd.options.map(id => {
            const c = campaign.catalog.get(id);
            return { cardId: id, name: c?.n ?? id, risk: c?.risk ?? '' };
          })
        }
      : null,
    canEndWeek: !s.over && !(pd?.options.length),
    log: s.log.slice(-40).map(e => ({ week: e.week, kind: e.kind, text: e.text, tier: e.tier }))
  };
}

/** Apply one command, returning the next snapshot + the log it produced. */
export function apply(snap: EngineSnapshot, command: Command): ApplyResult {
  const campaign = hydrate(snap);
  const s = campaign.state;
  const logBefore = s.log.length;
  let ok = true;
  let reason: string | undefined;

  if (s.over) {
    return { snapshot: snap, ok: false, reason: 'campaign is over', events: [] };
  }

  switch (command.type) {
    case 'play': {
      if (s.pendingDraft?.options.length) {
        ok = false;
        reason = 'resolve the phase draft first';
        break;
      }
      const ground = command.groundId
        ? s.groundsArr.find(g => g.id === command.groundId)
        : undefined;
      const wasBallot = s.ballot;
      const outcome = playFromHand(campaign, command.handIndex, ground);
      ok = outcome.ok;
      reason = outcome.reason;
      // Mirror the UI: reaching the ballot opens a phase draft.
      if (ok && !wasBallot && s.ballot) maybeOfferPhaseDraft(campaign, false);
      break;
    }
    case 'draft': {
      const r = pickPhaseDraft(campaign, command.option);
      ok = r.ok;
      reason = r.reason;
      break;
    }
    case 'endWeek': {
      if (s.pendingDraft?.options.length) {
        ok = false;
        reason = 'resolve the phase draft first';
        break;
      }
      const t = endWeekInPlace(campaign);
      if (t.kind === 'enter_general') maybeOfferPhaseDraft(campaign, false);
      if (!s.over && !s.pendingDraft?.options.length) startWeek(campaign);
      break;
    }
    default: {
      ok = false;
      reason = `unknown command`;
    }
  }

  const events = campaign.state.log.slice(logBefore).map(e => ({
    week: e.week,
    kind: e.kind,
    text: e.text,
    tier: e.tier
  }));
  return { snapshot: capture(snap.seed, snap.setup, campaign), ok, reason, events };
}

/** Persist a game to a string (host storage / save file). */
export function serialize(snap: EngineSnapshot): string {
  return JSON.stringify(snap);
}

/** Restore a game from serialize(). Throws on a version it cannot read. */
export function deserialize(text: string): EngineSnapshot {
  const snap = JSON.parse(text) as EngineSnapshot;
  if (!snap || typeof snap.rng !== 'number' || !snap.state) {
    throw new Error('candidate-zero: not a valid engine snapshot');
  }
  return snap;
}

/** Resolve a camp/hand index to its card id (host convenience). */
export function cardIdForIndex(snap: EngineSnapshot, handIndex: number): string | null {
  if (handIndex >= 0) return snap.deck.hand[handIndex] ?? null;
  return campIndexToCardId(hydrate(snap), handIndex);
}
