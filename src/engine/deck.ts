/**
 * CANDIDATE ZERO — Deck / Hand / Draw (pure, roguelite growth)
 * Enforces 1 new card drawn from the expanding pool every week.
 * Phase turns provide evolution opportunities (add/sharpen/cut).
 */

import type { DeckState, GameState, PlayCard } from './types.js';
import { PLAYS } from '../data/plays.js';
import { random } from './rng.js';
import { warm } from './reputation.js';
import { upgradableCardIds, upgradeOptionId, parseUpgradeOption, applyUpgrade } from './upgrades.js';

// Starter deck (early accessibility + dual ballot paths)
export const STARTER_DECK_IDS: string[] = [
  // Block Walk (PL01) and Phone Bank (PL02) are standing camp actions — always
  // on the strip, not draw-pile density (SRD standing-actions / .10x).
  'PL03',
  'PL04', 'PL04', 'PL04', 'PL04', 'PL04',
  'PL05', 'PL05',
  'PL06',
  'PL10',
  'PL13', 'PL13', 'PL13',
  'PL08',
  // --- Cheap plays, added 2026-07-28 from alpha feedback ---
  // "It's kinda stupid to have 5 AP and no single-AP cards to play." Fair: the
  // catalog has 12 one-AP cards, but this deck had two, and one of those (Yard
  // Signs) also wants $150 against a $200 opening bankroll. Mean cost was
  // 1.83 AP, so a 5-AP week bought 2.7 plays — a "week" was two or three taps.
  // These three are 1 AP, cash-free, phase-1 legal and ungated.
  'PL80', 'PL80',   // Grocery-Store Handshakes
  'PL84', 'PL84',   // Coffee-Shop Sit-Down
  'PL83', 'PL83',   // Letter to the Editor
  // Density compensation, measured not guessed. Adding six cards dropped the
  // money path's ballot rate from 72% to 47% by thinning BOTH the filing fee
  // (PL05) and the fundraiser that pays for it (PL13). ensureBallotAccessInHand
  // is no help there — it prefers PL04, so the labor door gets the net and the
  // money door does not. One more of each restores the ratio.
  //
  // Final measured week-8 ballot rates (400 trials each, SE ~2.4pp) against the
  // pre-change baseline: labor 87 (was 84.5), money 68.5 (was 72), hybrid 94.8
  // (was 94), grind 26.8 (was 31.3). Every path within ~2 SE, and the grind
  // control did not get easier — a second PL13 fixed money outright (85.5%) but
  // pushed grind to 45%, which would have quietly drained what little tension
  // Act I has left. Keeping the deadline's teeth beat closing a 3.5pp gap.
  'PL05',
  'PL13'
  // NOTE: this deck is tuned for ballot-access density (petition / filing-fee
  // draw timing). Adding cards dilutes that and can make the money path miss
  // the ballot — see harness:full "money should usually clear ballot" and the
  // harness:strategies week-8 baselines. The additions above were measured
  // against both, not assumed safe; ensureBallotAccessInHand is the backstop.
];

/** Catalog ids always owned at campaign start even if not in the physical pile. */
export const STANDING_OWNED_IDS: string[] = ['PL01', 'PL02'];

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

// === WEEKLY DRAW ENFORCEMENT (core roguelite growth rule) ===

function getAvailableNewCards(state: GameState): string[] {
  const owned = new Set(state.deck || []);
  const fixedEarly = new Set(['PL01', 'PL04', 'PL05']);
  return PLAYS
    .filter((p: PlayCard) =>
      !owned.has(p.id) &&
      !fixedEarly.has(p.id) &&
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
