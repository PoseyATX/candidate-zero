/**
 * CANDIDATE ZERO — Card upgrades: the deck's second axis.
 *
 * Every copy of a card was identical forever, so the draft only ever asked
 * *which* card — never whether to invest in one you already run. An upgrade is
 * a tier held against a card id, not a second card definition: 117 cards do not
 * each need a bespoke `+` twin, which was the real objection to StS-style
 * upgrades and is avoidable.
 *
 * State lives in `GameState.cardUpgrades` — a plain Record, same shape as the
 * existing pathProgress / pathsUnlocked maps, so it is save/replay safe.
 *
 * COVENANT NOTE (4 — brutal, impartial RNG): an upgrade shifts the odds `p`
 * that goes *into* resolve(), or lowers a cost. It never touches the roll,
 * the bands, or the tier mapping. resolve.ts is untouched.
 */

import type { GameState, PlayCard } from './types.js';

/** One tier only, for now — prove the axis before growing a tree. */
export const MAX_UPGRADE_TIER = 1;

/** Odds added per tier for cards whose upgrade is "sharper". */
const ODDS_PER_TIER = 0.08;

export type UpgradeKind = 'sharper' | 'cheaper';

/**
 * What an upgrade does is chosen per card *family*, not per card, so this
 * stays tunable without 117 hand-written cases.
 *
 * Field work gets cheaper — the payoff of a turf card is the rapport and the
 * ground, so more reps beats a better roll. Everything else gets sharper.
 */
export function upgradeKindFor(card: PlayCard): UpgradeKind {
  if (card.field) return 'cheaper';
  if ((card.cost.a ?? 0) >= 3) return 'cheaper';
  return 'sharper';
}

export function upgradeTier(state: GameState, cardId: string): number {
  const t = state.cardUpgrades?.[cardId] ?? 0;
  return Math.max(0, Math.min(MAX_UPGRADE_TIER, t));
}

export function isUpgraded(state: GameState, cardId: string): boolean {
  return upgradeTier(state, cardId) > 0;
}

/** Cards the player owns that still have room to improve. */
export function upgradableCardIds(state: GameState, owned: string[]): string[] {
  return owned.filter(id => upgradeTier(state, id) < MAX_UPGRADE_TIER);
}

/** Apply one tier. Returns false when already at cap (callers must not spend). */
export function applyUpgrade(state: GameState, cardId: string): boolean {
  if (!state.cardUpgrades) state.cardUpgrades = {};
  const cur = upgradeTier(state, cardId);
  if (cur >= MAX_UPGRADE_TIER) return false;
  state.cardUpgrades[cardId] = cur + 1;
  return true;
}

/** Odds delta folded into `p` before resolve(). Never touches the roll. */
export function upgradeOddsBonus(state: GameState, card: PlayCard): number {
  const tier = upgradeTier(state, card.id);
  if (tier <= 0) return 0;
  return upgradeKindFor(card) === 'sharper' ? ODDS_PER_TIER * tier : 0;
}

/** AP discount from upgrades. Never takes a card below 1 AP if it cost any. */
export function upgradeApDiscount(state: GameState, card: PlayCard): number {
  const tier = upgradeTier(state, card.id);
  if (tier <= 0 || upgradeKindFor(card) !== 'cheaper') return 0;
  const base = card.cost.a ?? 0;
  if (base <= 1) return 0;
  return Math.min(tier, base - 1);
}

/** Effective AP cost after upgrades — the single reader for cost math. */
export function effectiveApCost(state: GameState, card: PlayCard): number {
  return Math.max(0, (card.cost.a ?? 0) - upgradeApDiscount(state, card));
}

/** Player-facing description of what this card's upgrade does. */
export function upgradeLabel(card: PlayCard): string {
  return upgradeKindFor(card) === 'cheaper'
    ? 'Practised — costs 1 less AP'
    : 'Practised — better odds';
}

/** Two words, for the banner on a 100px-wide card face. */
export function upgradeShortLabel(card: PlayCard): string {
  return upgradeKindFor(card) === 'cheaper' ? 'Practised · −1 AP' : 'Practised · odds';
}

/**
 * Draft options are card ids. An upgrade offer is encoded as a prefixed id so
 * it rides the existing draft channel — no parallel offer system, and
 * breadth-vs-depth is asked at a moment the player already understands.
 */
export const UPGRADE_PREFIX = 'UP:';

export function upgradeOptionId(cardId: string): string {
  return `${UPGRADE_PREFIX}${cardId}`;
}

/** Returns the card id when `option` is an upgrade offer, else null. */
export function parseUpgradeOption(option: string): string | null {
  return option.startsWith(UPGRADE_PREFIX) ? option.slice(UPGRADE_PREFIX.length) : null;
}
