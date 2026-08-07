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
  walkPastPhaseDraft,
  campIndexToCardId,
  cycleFromHand,
  cycleReason,
  cycleCautionReason,
  CAMP_PETITION,
  CAMP_FILING_FEE,
  type Campaign
} from './loop.js';
import { clearPendingOutside } from './outside.js';
import { DEFAULT_HAND_SIZE } from './deck.js';
import { PRIMARY_WEEKS } from './calendar.js';
import {
  liveOpenings,
  missedOpenings,
  provisionSwing,
  takeBlockedReason
} from './docket.js';
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
import { buildGoalStripInput, formatGoalStrip, type GoalCopyKey } from '../ui/goal-strip.js';
import { isGroundLocked, groundLockReason } from './play.js';
import { parseUpgradeOption } from './upgrades.js';
import { heatOf, canPress, quotePress, MAX_HEAT } from './heat.js';
import { discardsLeft, MAX_DISCARDS } from './flow.js';

/** 1.3.0 — added the `cycle` command (pitch a hand card, draw a replacement),
 *  `discards` on the view, and `cycleBlocked` on each action. See engine/flow.ts.
 *  1.2.0 — the view gained `press` (banked press-your-luck stake) and the play
 *  command gained an optional `press` flag. See engine/heat.ts.
 *  1.1.0 — pendingDraft options gained `upgrade`; cardId is now always a real
 *  catalog id (previously it could carry the engine's "UP:" option encoding). */
export const ENGINE_API_VERSION = '1.4.0';

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
  /** `press` spends banked heat on this play: better odds, wider disaster band
   *  (engine/heat.ts). Ignored when no heat is banked. */
  | { type: 'play'; handIndex: number; groundId?: string; press?: boolean }
  /** Pitch a hand card and draw a replacement (engine/flow.ts). Limited per
   *  week; costs no AP. `ok:false` with a reason when the cut is not allowed. */
  | { type: 'cycle'; handIndex: number }
  | { type: 'endWeek' }
  | { type: 'draft'; option: number }
  /** Walk past a phase opportunity without taking a card. */
  | { type: 'draftPass' }
  /** Host dismisses Outside weather chrome (see clearPendingOutside). */
  | { type: 'dismissOutside' };

export interface ActionOption {
  handIndex: number;
  cardId: string;
  name: string;
  /** Card description — revealed on tap/inspect, never drawn on the card face. */
  desc: string;
  tag: string;
  kind: string;
  risk: string;
  camp: boolean;
  /** true → this play wants a groundId (a field play). */
  field: boolean;
  costLabel: string;
  /** '' when this card may be pitched for a fresh draw, else why it may not. */
  cycleBlocked: string;
  /** Soft warning when a cut is allowed but noteworthy (e.g. practised). '' if none. */
  cycleCaution: string;
  /** effective success probability given current state, or null if odds-less. */
  approxOdds: number | null;
  /** Odds this play would gain if the command sets `press`. 0 when no heat. */
  pressOdds: number;
  /** Disaster band it would cost. Always 0 for SAFE — Covenant 5 holds even
   *  when the player is buying risk deliberately. */
  pressBand: number;
}

/**
 * Every card physically in hand — including the ones you cannot play.
 *
 * `actions` is deliberately "what you can do right now" and so lists only
 * playable cards. That left the `cycle` command with no discoverable target: a
 * host could not see the dead card it wanted to pitch. This is the hand as it
 * actually sits on the table.
 *
 * `lockReason` is not exposed yet — the rich version lives in the web UI and is
 * DOM-coupled. A host gets `playable` and can say "unavailable" until that is
 * extracted into the engine.
 */
export interface HandCardView {
  handIndex: number;
  cardId: string;
  name: string;
  risk: string;
  costLabel: string;
  /** true when this card also appears in `actions`. */
  playable: boolean;
  /** '' when this card may be pitched for a fresh draw, else why it may not. */
  cycleBlocked: string;
  /** Soft warning when a cut is allowed but noteworthy (e.g. practised). '' if none. */
  cycleCaution: string;
}

export interface GroundView {
  id: string;
  n: string;
  pool: number;
  rapport: number;
  rivalRap: number;
  gotv: number;
  /** Closed until the player holds the key that opens it (Ground.gated).
   *  A host must not offer a locked ground as a field-play target. */
  locked: boolean;
  /** Player-facing reason, '' when open. */
  lockReason: string;
}

/**
 * The one-glance answer to "what am I supposed to be doing right now" —
 * ported from src/ui/goal-strip.ts (previously web-only) so every host gets
 * it, not just the browser build. Pure derivation of existing GameState; no
 * new rules, no new persisted fields. `key` lets a host branch on visual
 * treatment (e.g. a freeze/urgency color) without parsing the copy text.
 */
export interface GoalView {
  key: GoalCopyKey;
  /** What you're working toward this stage. */
  primary: string;
  /** Live numbers for that goal (sigs/need, GOTV banked, bill stage, …). */
  progress: string;
  /** The concrete next move — what to actually tap. */
  next: string;
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
  /** Banked press-your-luck stake. What spending it buys and costs is
   *  per-card (the band depends on risk class) — see ActionOption.pressOdds /
   *  pressBand. Never applied unless a play command sets `press`. */
  press: { heat: number; max: number; canPress: boolean };
  /** Hand cuts left this week — pitch a card, draw a replacement. */
  discards: { left: number; max: number };
  /** The full hand, playable or not. `actions` is the playable subset. */
  hand: HandCardView[];
  grounds: GroundView[];
  actions: ActionOption[];
  goal: GoalView;
  /** `cardId` is always a real catalog id. `upgrade` marks an offer to improve a
   *  card the player already runs rather than to add a new one — hosts must not
   *  have to know the engine's option encoding to render truthful copy. */
  pendingDraft: {
    phase: number;
    options: { cardId: string; name: string; risk: string; upgrade: boolean }[];
  } | null;
  /** World weather chrome — host shows, then dismissOutside. Never a hand card. */
  pendingOutside: { id: string; n: string; text: string } | null;
  /**
   * The Docket — hearings the world has opened, and the language in your bill.
   *
   * Crosses the host boundary because a host that cannot show the window closing
   * cannot show the decision. The old outside deck failed for exactly this
   * reason: an event that changes two numbers and tells nobody is not an event.
   * `weeksLeft` is precomputed so a host never has to know the calendar, and
   * `blocked` is the engine's own reason string rather than a boolean, so hosts
   * do not reimplement the rules to explain them.
   */
  docket: {
    openings: {
      id: string;
      name: string;
      detail: string;
      opposition: string;
      weeksLeft: number;
      weight: number;
      blocked: string;
    }[];
    provisions: { id: string; name: string; ayes: number; nays: number; heat: number }[];
    /** Net members the attached language brings to a floor vote. */
    swing: number;
    /** Windows that shut unused. The ones that haunt a run. */
    missed: number;
  };
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

function handView(campaign: Campaign, actions: ActionOption[]): HandCardView[] {
  const playable = new Set(actions.map(a => a.handIndex));
  return campaign.deck.hand.map((id, index) => {
    const card = campaign.catalog.get(id);
    return {
      handIndex: index,
      cardId: id,
      name: card?.n ?? id,
      risk: card?.risk ?? '',
      costLabel: card ? costLabel(card) : '',
      playable: playable.has(index),
      cycleBlocked: cycleReason(campaign, index),
      cycleCaution: cycleCautionReason(campaign, index)
    };
  });
}

/** Available actions for the current snapshot (drives a host's action UI). */
export function legalActions(snap: EngineSnapshot): ActionOption[] {
  const campaign = hydrate(snap);
  return listPlayableHand(campaign).map(({ index, card }) => ({
    handIndex: index,
    cardId: card.id,
    name: card.n,
    desc: card.d ?? '',
    tag: card.tag ?? '',
    kind: card.kind ?? 'action',
    risk: card.risk,
    camp: index < 0,
    field: !!card.field,
    costLabel: costLabel(card),
    cycleBlocked: cycleReason(campaign, index),
    cycleCaution: cycleCautionReason(campaign, index),
    approxOdds: effectiveOdds(campaign.state, card),
    pressOdds: quotePress(campaign.state, card).odds,
    pressBand: quotePress(campaign.state, card).band
  }));
}

/** Full render model + actions for the current snapshot. */
export function view(snap: EngineSnapshot): RenderView {
  const campaign = hydrate(snap);
  const s = campaign.state;
  const base = ledgerSnapshot(s);
  const pd = s.pendingDraft;
  const actions = legalActions(snap);
  const goalInput = buildGoalStripInput(s, {
    shopAvailable: actions.some(a => a.cardId.startsWith('BUY')),
    campPetitionVisible: actions.some(a => a.handIndex === CAMP_PETITION),
    campFeeVisible: actions.some(a => a.handIndex === CAMP_FILING_FEE)
  });
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
    press: { heat: heatOf(s), max: MAX_HEAT, canPress: canPress(s) },
    discards: { left: discardsLeft(s), max: MAX_DISCARDS },
    hand: handView(campaign, actions),
    grounds: s.groundsArr.map(g => ({
      id: g.id,
      n: g.n,
      pool: g.pool,
      rapport: Math.round(g.rapport || 0),
      rivalRap: Math.round(g.rivalRap || 0),
      gotv: g.gotv || 0,
      locked: isGroundLocked(g),
      lockReason: groundLockReason(g)
    })),
    actions,
    goal: formatGoalStrip(goalInput),
    pendingDraft: pd?.options.length
      ? {
          phase: pd.phase,
          options: pd.options.map(option => {
            const upId = parseUpgradeOption(option);
            const id = upId ?? option;
            const c = campaign.catalog.get(id);
            return { cardId: id, name: c?.n ?? id, risk: c?.risk ?? '', upgrade: !!upId };
          })
        }
      : null,
    pendingOutside: s.pendingOutside
      ? { id: s.pendingOutside.id, n: s.pendingOutside.n, text: s.pendingOutside.text }
      : null,
    docket: {
      openings: liveOpenings(s).map(o => ({
        id: o.id,
        name: o.n,
        detail: o.d,
        opposition: o.opposition,
        weeksLeft: Math.max(0, o.expiresWeek - s.week),
        weight: o.weight,
        blocked: takeBlockedReason(s, o.id)
      })),
      provisions: (s.bill?.provisions ?? []).map(p => ({
        id: p.id,
        name: p.n,
        ayes: p.ayes,
        nays: p.nays,
        heat: p.heat
      })),
      swing: provisionSwing(s),
      missed: missedOpenings(s).length
    },
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
      const outcome = playFromHand(campaign, command.handIndex, ground, {
        press: command.press
      });
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
    case 'draftPass': {
      const r = walkPastPhaseDraft(campaign);
      ok = r.ok;
      reason = r.reason;
      break;
    }
    case 'cycle': {
      if (s.pendingDraft?.options.length) {
        ok = false;
        reason = 'resolve the phase draft first';
        break;
      }
      const r = cycleFromHand(campaign, command.handIndex);
      ok = r.ok;
      reason = r.reason;
      break;
    }
    case 'dismissOutside': {
      clearPendingOutside(s);
      ok = true;
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
