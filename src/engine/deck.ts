/**
 * CANDIDATE ZERO — Deck / Hand / Draw (pure, roguelite growth)
 * Enforces 1 new card drawn from the expanding pool every week.
 * Phase turns provide evolution opportunities (add/sharpen/cut).
 */

import type { DeckState, GameState, PlayCard } from './types.js';
import { PLAYS } from '../data/plays.js';
import { random } from './rng.js';

// Starter deck (early accessibility + dual ballot paths)
export const STARTER_DECK_IDS: string[] = [
  'PL01', 'PL01', 'PL01',
  'PL02',
  'PL03',
  'PL04', 'PL04', 'PL04', 'PL04', 'PL04',
  'PL05', 'PL05',
  'PL06',
  'PL10',
  'PL13', 'PL13', 'PL13',
  'PL08'
];

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
 * Bonus draws come from perks/legacy (AL11, handBonus, etc).
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
  // Bonus draws (from allies/perks/legacy)
  const bonus = (state.handBonus || 0) + (warmAllyBonus(state) ? 1 : 0);
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
  // Simple example: AL11 (Kitchen Cabinet) gives extra draw
  return (state.allies || []).some(a => a.id === 'AL11' && a.warm > 0);
}

// === PHASE EVOLUTION (draft offer) ===

/**
 * Build a 3-card draft from the unowned pool for a phase turn.
 * Does not mutate ownership until resolvePhaseDraft.
 */
export function buildPhaseDraft(state: GameState, count = 3): { phase: number; options: string[] } {
  const pool = getAvailableNewCards(state);
  const options: string[] = [];
  const working = [...pool];
  while (options.length < count && working.length > 0) {
    const idx = Math.floor(random() * working.length);
    const [id] = working.splice(idx, 1);
    if (id) options.push(id);
  }
  return { phase: 0, options };
}

/** Commit a draft pick into owned deck (pool for future weekly growth). */
export function resolvePhaseDraft(
  state: GameState,
  pickIndex: number
): { ok: boolean; cardId?: string; reason?: string } {
  const draft = state.pendingDraft;
  if (!draft || !draft.options.length) {
    return { ok: false, reason: 'No pending draft' };
  }
  const cardId = draft.options[pickIndex];
  if (!cardId) return { ok: false, reason: 'Invalid draft index' };
  if (!state.deck) state.deck = [];
  if (!state.deck.includes(cardId)) state.deck.push(cardId);
  state.log.push({
    week: state.week,
    kind: 'note',
    text: `Phase ${draft.phase} draft: added ${cardId} to the campaign pool. (Options were ${draft.options.join(', ')})`
  });
  state.pendingDraft = undefined;
  return { ok: true, cardId };
}

/** Seeded auto-pick (first option) for harnesses / strategies. */
export function autoResolvePhaseDraft(state: GameState): string | null {
  if (!state.pendingDraft?.options.length) return null;
  const r = resolvePhaseDraft(state, 0);
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
