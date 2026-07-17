/**
 * CANDIDATE ZERO — Pure play execution
 * Affordability, phase legality, cost payment, resolve + run.
 * Now includes cardAttrMod synergy (root attributes affect odds).
 */

import { resolve, STAMPS } from './resolve.js';
import { getPhase } from './state.js';
import type { AttrId, GameState, Ground, PlayCard, PlayOutcome, RollResult } from './types.js';

export function canAfford(state: GameState, card: PlayCard): boolean {
  const c = card.cost;
  if ((c.a ?? 0) > state.ap) return false;
  if ((c.$ ?? 0) > state.money) return false;
  if ((c.vp ?? 0) > state.volPool) return false;
  if ((c.m ?? 0) > state.momentum) return false;
  if ((c.fav ?? 0) > state.favors) return false;
  return true;
}

export function isPhaseLegal(state: GameState, card: PlayCard): boolean {
  const phase = getPhase(state);
  return card.ph.includes(phase);
}

export function isVisible(state: GameState, card: PlayCard): boolean {
  if (card.show && !card.show(state)) return false;
  if (card.req && !card.req(state)) return false;
  return true;
}

/** Card is in phase, visible, and affordable. */
export function isPlayable(state: GameState, card: PlayCard): boolean {
  return isPhaseLegal(state, card) && isVisible(state, card) && canAfford(state, card);
}

export function payCost(state: GameState, card: PlayCard): void {
  const c = card.cost;
  if (c.a) state.ap -= c.a;
  if (c.$) state.money -= c.$;
  if (c.vp) state.volPool -= c.vp;
  if (c.m) state.momentum -= c.m;
  if (c.fav) state.favors -= c.fav;
}

export function pickDefaultGround(state: GameState): Ground | undefined {
  return state.groundsArr.find(g => g.pool > 0) ?? state.groundsArr[0];
}

// === cardAttrMod: Root attributes now affect card power ===
function amod(state: GameState, id: AttrId): number {
  const val = state.attrs?.[id] ?? 10;
  return (val - 10) / 40;
}

export function cardAttrMod(state: GameState, card: PlayCard): number {
  if (!card.attrs || card.attrs.length === 0) return 0;
  let sum = 0;
  for (const id of card.attrs) {
    sum += amod(state, id);
  }
  return sum / card.attrs.length;
}

/**
 * Execute one play: pay costs, resolve RNG, run card effects.
 * Attributes now modify the base probability via cardAttrMod.
 */
export function executePlay(
  state: GameState,
  card: PlayCard,
  ground?: Ground
): PlayOutcome {
  if (!isPhaseLegal(state, card)) {
    return { ok: false, reason: `Not legal in phase ${getPhase(state)}`, cardId: card.id, cardName: card.n };
  }
  if (!isVisible(state, card)) {
    return { ok: false, reason: 'Card not available (show/req)', cardId: card.id, cardName: card.n };
  }
  if (!canAfford(state, card)) {
    return { ok: false, reason: 'Cannot afford cost', cardId: card.id, cardName: card.n };
  }

  const g = ground ?? (card.field ? pickDefaultGround(state) : undefined);
  if (card.field && !g) {
    return { ok: false, reason: 'No ground selected', cardId: card.id, cardName: card.n };
  }

  payCost(state, card);

  // Base odds from card definition
  let p = card.odds ? card.odds(state, g) : 0.5;

  // === ACTIVATE SYNERGY ===
  const attrMod = cardAttrMod(state, card);
  p = Math.max(0.02, Math.min(0.95, p + attrMod));

  const roll: RollResult = resolve(p, card.risk, state);
  const text = card.run ? card.run(state, roll, g) : `${card.n} resolves.`;

  if (roll.tier === 3) {
    state.disasterLog.push(state.week);
  }

  state.log.push({
    week: state.week,
    kind: 'play',
    text,
    cardId: card.id,
    tier: roll.tier
  });

  return {
    ok: true,
    cardId: card.id,
    cardName: card.n,
    tier: roll.tier,
    text,
    stamp: STAMPS[roll.tier]
  };
}
