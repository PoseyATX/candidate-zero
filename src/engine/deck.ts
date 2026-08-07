/**
 * CANDIDATE ZERO — Deck / Hand / Draw (pure, roguelite growth)
 * Enforces 1 new card drawn from the expanding pool every week.
 * Phase turns provide evolution opportunities (add/sharpen/cut).
 */

import type { DeckState, GameState, PlayCard } from './types.js';
import { PLAYS } from '../data/plays.js';
import { ZERO_PLAYS } from '../data/plays-zero.js';
import { oblName } from '../data/obligations.js';
import { SHED_PREFIX } from './opportunity.js';
import { random } from './rng.js';
import { warm } from './reputation.js';
import { upgradableCardIds, upgradeOptionId, parseUpgradeOption, applyUpgrade } from './upgrades.js';

/**
 * Full toolkit for **harness** instruments only (`starterKit: 'harness'`).
 * Player Zero campaigns ignore this list — see engine/zero.ts.
 */
export const STARTER_DECK_IDS: string[] = [
  'PL01', 'PL01', 'PL01',
  'PL02',
  'PL03',
  'PL04', 'PL04', 'PL04', 'PL04', 'PL04',
  'PL05', 'PL05',
  'PL06',
  'PL10',
  'PL13', 'PL13', 'PL13',
  'PL08',
  'PL80', 'PL80',
  'PL84', 'PL84',
  'PL83', 'PL83',
  'PL05',
  'PL13'
];

/** @deprecated Zero law: no free standing ownership. Kept empty for imports. */
export const STANDING_OWNED_IDS: string[] = [];

/** The intrinsic ten (all personas). Never drafted, never offered, never grown into. */
export const ZERO_INTRINSIC_IDS = new Set(ZERO_PLAYS.map(p => p.id));

export function createDeckState(cardIds: string[] = STARTER_DECK_IDS): DeckState {
  return {
    draw: shuffle([...cardIds]),
    hand: [],
    discard: []
  };
}

/** Fisher–Yates using the shared seeded RNG stream. */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function refillDraw(deck: DeckState): void {
  if (deck.draw.length > 0) return;
  if (deck.discard.length === 0) return;
  deck.draw = shuffle(deck.discard);
  deck.discard = [];
}

export function drawCards(deck: DeckState, n: number): string[] {
  const drawn: string[] = [];
  for (let i = 0; i < n; i++) {
    refillDraw(deck);
    if (deck.draw.length === 0) break;
    const id = deck.draw.shift()!;
    deck.hand.push(id);
    drawn.push(id);
  }
  return drawn;
}

export function discardHand(deck: DeckState): void {
  deck.discard.push(...deck.hand);
  deck.hand = [];
}

export function takeFromHand(deck: DeckState, handIndex: number): string | null {
  if (handIndex < 0 || handIndex >= deck.hand.length) return null;
  const [id] = deck.hand.splice(handIndex, 1);
  return id ?? null;
}

export function discardCard(deck: DeckState, cardId: string): void {
  deck.discard.push(cardId);
}

export const DEFAULT_HAND_SIZE = 5;

/** The hand never grows past seven, however deep the run goes. */
export const MAX_HAND_SIZE = 7;

/**
 * How many cards you are holding this week.
 *
 * Five at the shallowest depth, seven once you have actually built something.
 * It grows off the network you have — people who take the call, names in the
 * book — and never off a tier, a level, or a threshold the player is shown.
 * Nothing announces it. One week you are simply holding six.
 */
export function handSizeFor(state: GameState): number {
  let n = DEFAULT_HAND_SIZE;
  const allies = state.allies?.length ?? 0;
  const contacts = state.contacts ?? 0;
  if (allies >= 2 || contacts >= 300) n += 1;
  if (allies >= 4 && contacts >= 800) n += 1;
  return Math.min(MAX_HAND_SIZE, n);
}

// === WEEKLY DRAW ENFORCEMENT (core roguelite growth rule) ===

function getAvailableNewCards(state: GameState): string[] {
  const owned = new Set(state.deck || []);
  const fixedEarly = new Set(['PL01', 'PL04', 'PL05']);
  return PLAYS
    .filter((p: PlayCard) =>
      !owned.has(p.id) &&
      !fixedEarly.has(p.id) &&
      // You are never offered your own legs. The intrinsic ten are who you are,
      // not something the world can hand you. See data/plays-zero.ts.
      !ZERO_INTRINSIC_IDS.has(p.id) &&
      (!p.show || p.show(state)) &&
      (!p.req || p.req(state))
    )
    .map((p: PlayCard) => p.id);
}

/**
 * Mandatory weekly draw: always add 1 new card from the growing pool.
 * Called at the start of every week (or end of previous).
 * Bonus draws come from perks (AL11).
 */
export function enforceWeeklyDraw(state: GameState): string[] {
  const drawn: string[] = [];
  if (!state.deck) state.deck = [];
  const pool = getAvailableNewCards(state);
  if (pool.length > 0) {
    const idx = Math.floor(random() * pool.length);
    const newId = pool[idx]!;
    state.deck.push(newId);
    drawn.push(newId);
  }
  // Bonus draws (from allies/perks)
  const bonus = warmAllyBonus(state) ? 1 : 0;
  for (let i = 0; i < bonus; i++) {
    const extraPool = getAvailableNewCards(state);
    if (extraPool.length === 0) break;
    const extraIdx = Math.floor(random() * extraPool.length);
    const extraId = extraPool[extraIdx]!;
    state.deck.push(extraId);
    drawn.push(extraId);
  }
  return drawn;
}

function warmAllyBonus(state: GameState): boolean {
  // AL11 (Kitchen Cabinet) gives an extra draw
  return warm(state, 'AL11');
}

// === PHASE EVOLUTION (draft offer) ===

/**
 * Build a 3-card draft from the unowned pool for a phase turn.
 * Does not mutate ownership until resolvePhaseDraft.
 */
/** Draft draw-weight by rarity — uncommon/rare are genuinely harder to land. */
const RARITY_WEIGHT: Record<string, number> = { common: 6, uncommon: 2, rare: 1 };
const rarityOf = (id: string): string => PLAYS.find(p => p.id === id)?.rarity ?? 'common';

export function buildPhaseDraft(state: GameState, count = 3): { phase: number; options: string[] } {
  const options: string[] = [];
  // Depth as an alternative to breadth: one slot may offer to sharpen a card
  // you already run. Rides the existing draft channel rather than inventing a
  // second offer system. See engine/upgrades.ts.
  const owned = upgradableCardIds(state, state.deck ?? []);
  if (owned.length && count > 1) {
    options.push(upgradeOptionId(owned[Math.floor(random() * owned.length)]!));
  }
  const working = getAvailableNewCards(state);
  while (options.length < count && working.length > 0) {
    // Weighted pick: sum weights, roll, walk. Keeps rares rare in the draft.
    const total = working.reduce((s, id) => s + (RARITY_WEIGHT[rarityOf(id)] ?? 6), 0);
    let roll = random() * total;
    let idx = 0;
    for (; idx < working.length; idx++) {
      roll -= RARITY_WEIGHT[rarityOf(working[idx])] ?? 6;
      if (roll <= 0) break;
    }
    const [id] = working.splice(Math.min(idx, working.length - 1), 1);
    if (id) options.push(id);
  }
  return { phase: 0, options };
}

/**
 * Put card ids into the physical draw pile (and mark owned).
 * Weekly growth + drafts must call this or cards never become playable.
 */
export function injectIntoDrawPile(deck: DeckState, state: GameState, cardIds: string[]): void {
  if (!state.deck) state.deck = [];
  for (const id of cardIds) {
    if (!state.deck.includes(id)) state.deck.push(id);
    deck.draw.push(id);
  }
}

/**
 * Inject near the TOP of the draw pile, so the card is felt early.
 *
 * `injectIntoDrawPile` pushes to the end, which is right for a mid-run reward
 * but wrong for anything that is meant to be part of who you are on day one.
 * The persona signature card was landing at position 26 of 27 — median week 6
 * of an 8-week primary, by which point the ballot fight is largely decided. It
 * was drawn every single run and still read as "never implemented", because it
 * arrived after it could matter.
 *
 * Placed at a seeded random position in the first `window` cards rather than
 * always first: it should feel like part of the opening hand, not like a
 * scripted tutorial beat.
 */
export function injectNearTop(
  deck: DeckState,
  state: GameState,
  cardIds: string[],
  window = 5
): void {
  if (!state.deck) state.deck = [];
  for (const id of cardIds) {
    if (!state.deck.includes(id)) state.deck.push(id);
    const span = Math.min(window, deck.draw.length);
    const at = span > 0 ? Math.floor(random() * span) : 0;
    deck.draw.splice(at, 0, id);
  }
}

/** Commit a draft pick into owned + physical draw pile (when deck provided). */
export function resolvePhaseDraft(
  state: GameState,
  pickIndex: number,
  deck?: DeckState
): { ok: boolean; cardId?: string; reason?: string } {
  const draft = state.pendingDraft;
  if (!draft || !draft.options.length) {
    return { ok: false, reason: 'No pending draft' };
  }
  const cardId = draft.options[pickIndex];
  if (!cardId) return { ok: false, reason: 'Invalid draft index' };

  // Somebody takes a debt off you. This is a real removal path (spec §4.3) —
  // a relationship retiring an obligation — and it costs the standing of having
  // asked, which settlement will read.
  if (cardId.startsWith(SHED_PREFIX)) {
    const oblId = cardId.slice(SHED_PREFIX.length);
    const had = state.obls.includes(oblId);
    state.obls = state.obls.filter(x => x !== oblId);
    state.pendingDraft = undefined;
    state.lastPhase = draft.phase as 1 | 2 | 3;
    if (had) {
      state.log.push({
        week: state.week,
        kind: 'note',
        text: `${oblName(oblId)} is somebody else's problem now. They will remember doing it.`
      });
    }
    return { ok: had, cardId: oblId, reason: had ? undefined : 'That debt is already settled' };
  }

  // Upgrade offer: sharpen a card already owned rather than adding a new one.
  const upId = parseUpgradeOption(cardId);
  if (upId) {
    const ok = applyUpgrade(state, upId);
    state.pendingDraft = undefined;
    state.lastPhase = draft.phase as 1 | 2 | 3;
    if (ok) {
      state.log.push({
        week: state.week,
        kind: 'note',
        text: `Practised: ${upId}. You have run this play enough times to be good at it.`
      });
    }
    return { ok, cardId: upId, reason: ok ? undefined : 'Already at upgrade cap' };
  }

  if (!state.deck) state.deck = [];
  if (deck) {
    injectIntoDrawPile(deck, state, [cardId]);
  } else if (!state.deck.includes(cardId)) {
    state.deck.push(cardId);
  }
  state.log.push({
    week: state.week,
    kind: 'note',
    text: `Phase ${draft.phase} draft: added ${cardId} to the deck. (Options were ${draft.options.join(', ')})`
  });
  state.pendingDraft = undefined;
  return { ok: true, cardId };
}

/** Seeded auto-pick (first option) for harnesses / strategies. */
export function autoResolvePhaseDraft(state: GameState, deck?: DeckState): string | null {
  if (!state.pendingDraft?.options.length) return null;
  const r = resolvePhaseDraft(state, 0, deck);
  return r.cardId ?? null;
}

/**
 * Legacy hook: extra weekly draw + open a draft offer.
 * Prefer loop.maybeOfferPhaseDraft for phase-change detection.
 */
export function phaseTurnDeckEvolution(state: GameState, newPhase: number): void {
  const extra = enforceWeeklyDraw(state);
  if (extra.length > 0) {
    state.log.push({
      week: state.week,
      kind: 'draw',
      text: `Phase ${newPhase} evolution: extra card(s) — ${extra.join(', ')}`
    });
  }
  const draft = buildPhaseDraft(state, 3);
  draft.phase = newPhase;
  if (draft.options.length) {
    state.pendingDraft = draft;
  }
}
