/**
 * CANDIDATE ZERO — Deck / Hand / Draw
 * Harness kit may drip a free weekly card for instruments.
 * Zero kit does not — growth is opportunity (phase drafts you may walk past).
 */

import type { DeckState, GameState, PlayCard } from './types.js';
import { PLAYS } from '../data/plays.js';
import { random } from './rng.js';
import { warm } from './reputation.js';
import { upgradableCardIds, upgradeOptionId, parseUpgradeOption, applyUpgrade } from './upgrades.js';
import { generateOpportunities } from './opportunity.js';

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

// === WEEKLY GROWTH (not free power drip) ===

function getAvailableNewCards(state: GameState): string[] {
  const owned = new Set(state.deck || []);
  const fixedEarly = new Set(['PL01', 'PL04', 'PL05']);
  // Cards recently shown as opportunities — do not spam the same 1–3 forever.
  const recent = String(state.sessionFlags?.recentOffers || '')
    .split(',')
    .filter(Boolean);
  const recentSet = new Set(recent);
  return PLAYS
    .filter((p: PlayCard) =>
      !owned.has(p.id) &&
      !fixedEarly.has(p.id) &&
      !recentSet.has(p.id) &&
      (!p.show || p.show(state)) &&
      (!p.req || p.req(state))
    )
    .map((p: PlayCard) => p.id);
}

/** How well a card fits this persona's strengths (attrs above baseline 10). */
function thematicWeight(state: GameState, cardId: string): number {
  const p = PLAYS.find(c => c.id === cardId);
  if (!p) return 1;
  let w = 1;
  const attrs = state.attrs;
  if (attrs && p.attrs?.length) {
    for (const a of p.attrs) {
      const v = attrs[a] ?? 10;
      if (v > 10) w += (v - 10) * 2;
      else if (v < 10) w += 0.25;
    }
  } else {
    w += 0.5;
  }
  return Math.max(0.1, w);
}

function weightedPick(ids: string[], weightOf: (id: string) => number): number {
  if (!ids.length) return -1;
  const total = ids.reduce((s, id) => s + weightOf(id), 0);
  let roll = random() * total;
  for (let i = 0; i < ids.length; i++) {
    roll -= weightOf(ids[i]!);
    if (roll <= 0) return i;
  }
  return ids.length - 1;
}

function rememberOffers(state: GameState, shown: string[]): void {
  const prev = String(state.sessionFlags?.recentOffers || '')
    .split(',')
    .filter(Boolean);
  const next = [...shown, ...prev].slice(0, 12);
  state.sessionFlags = { ...state.sessionFlags, recentOffers: next.join(',') };
}

/**
 * Weekly growth for **harness** kit only: free card drip keeps regression
 * instruments moving. Player Zero does **not** get a free card every week —
 * that is cookie-clicker power, not a campaign. Growth is opportunity
 * (phase drafts you may walk past, paths, events), not entitlement.
 */
export function enforceWeeklyDraw(state: GameState): string[] {
  if (state.sessionFlags?.zeroMode === 1) {
    return [];
  }
  const drawn: string[] = [];
  if (!state.deck) state.deck = [];
  const pool = getAvailableNewCards(state);
  if (pool.length > 0) {
    const idx = weightedPick(pool, id => {
      const r = RARITY_WEIGHT[rarityOf(id)] ?? 6;
      return r * thematicWeight(state, id);
    });
    if (idx >= 0) {
      const newId = pool[idx]!;
      state.deck.push(newId);
      drawn.push(newId);
    }
  }
  // Bonus draws (from allies/perks) — harness / advanced only
  const bonus = warmAllyBonus(state) ? 1 : 0;
  for (let i = 0; i < bonus; i++) {
    const extraPool = getAvailableNewCards(state);
    if (extraPool.length === 0) break;
    const extraIdx = weightedPick(extraPool, id => {
      const r = RARITY_WEIGHT[rarityOf(id)] ?? 6;
      return r * thematicWeight(state, id);
    });
    if (extraIdx < 0) break;
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

/**
 * Build a phase opportunity (0–count options). Not a mall: rarity + persona
 * theme weight the roll so runs do not re-serve the same three commons.
 * Caller may decline — taking zero is legal.
 */
export function buildPhaseDraft(state: GameState, count = 3): { phase: number; options: string[] } {
  // Zero: contextual opportunities only — empty is legal (spec §4).
  if (state.sessionFlags?.zeroMode === 1) {
    return generateOpportunities(state, count);
  }
  const options: string[] = [];
  const owned = upgradableCardIds(state, state.deck ?? []);
  if (owned.length && count > 1 && random() < 0.45) {
    options.push(upgradeOptionId(owned[Math.floor(random() * owned.length)]!));
  }
  const working = getAvailableNewCards(state);
  const weightOf = (id: string) =>
    (RARITY_WEIGHT[rarityOf(id)] ?? 6) * thematicWeight(state, id);

  while (options.length < count && working.length > 0) {
    const idx = weightedPick(working, weightOf);
    if (idx < 0) break;
    const [id] = working.splice(idx, 1);
    if (id) options.push(id);
  }
  rememberOffers(
    state,
    options.map(o => parseUpgradeOption(o) ?? o)
  );
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

/** Walk past a phase opportunity — taking zero is legal. */
export function declinePhaseDraft(state: GameState): { ok: boolean; reason?: string } {
  if (!state.pendingDraft?.options.length) {
    return { ok: false, reason: 'No pending opportunity' };
  }
  const shown = state.pendingDraft.options.join(', ');
  state.pendingDraft = undefined;
  state.log.push({
    week: state.week,
    kind: 'note',
    text: `Walked past the opportunity (${shown}). The deck stays lean on purpose.`
  });
  return { ok: true };
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
