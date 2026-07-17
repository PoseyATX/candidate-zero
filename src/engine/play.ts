/**
 * CANDIDATE ZERO — Pure play execution
 * Affordability, phase legality, cost payment, resolve + run.
 * Now includes cardAttrMod synergy (root attributes affect odds).
 */

import { resolve, STAMPS } from './resolve.js';
import { getPhase } from './state.js';
import { buildPlayFeedback } from './feedback.js';
import { repCheck, shadowCheck } from './reputation.js';
import type { AttrId, GameState, Ground, PlayCard, PlayOutcome, RollResult } from './types.js';

export function canAfford(state: GameState, card: PlayCard): boolean {
  const c = card.cost;
  const apCost = c.a ?? 0;
  const apCovered = apCost <= state.ap || (apCost > 0 && !!card.field && state.fieldAp > 0);
  if (!apCovered) return false;
  // Yard Sign Cache (A08) covers the $ cost of blitzes
  const dollar = card.id === 'PL03' && state.assets.includes('A08') ? 0 : (c.$ ?? 0);
  if (dollar > state.money) return false;
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
  if (c.a) {
    if (card.field && state.fieldAp > 0) {
      state.fieldAp -= 1;
    } else {
      state.ap -= c.a;
    }
  }
  const dollar = card.id === 'PL03' && state.assets.includes('A08') ? 0 : (c.$ ?? 0);
  if (dollar) state.money -= dollar;
  if (c.vp) state.volPool -= c.vp;
  if (c.m) state.momentum -= c.m;
  if (c.fav) state.favors -= c.fav;
}

/**
 * Prefer open grounds whose affinity tags match the player's strongest faces.
 * Gated grounds (e.g. Church Corridor) require True Believer face or preacher bio.
 */
export function pickDefaultGround(state: GameState): Ground | undefined {
  const open = state.groundsArr.filter(g => {
    if (g.pool <= 0) return false;
    if (g.gated) {
      // Un-gate when zeal or pulpit persona is real
      if ((state.faces.T ?? 0) >= 12) return true;
      if (state.personaId === 'preacher' || state.assets.some(a => a.includes('PREACHER') || a.includes('BIO_PREACHER')))
        return true;
      return false;
    }
    return true;
  });
  if (!open.length) return state.groundsArr.find(g => g.pool > 0) ?? state.groundsArr[0];

  const faceScore = (aff: string): number => {
    let score = 0;
    for (const part of aff.split(',')) {
      const f = part.trim() as keyof typeof state.faces;
      if (f && typeof state.faces[f] === 'number') score += Math.max(0, state.faces[f]);
    }
    return score + (open.find(g => g.aff === aff)?.rapport ?? 0) * 0.5;
  };

  open.sort((a, b) => {
    const sa = faceScore(a.aff) + a.rapport * 0.3;
    const sb = faceScore(b.aff) + b.rapport * 0.3;
    return sb - sa;
  });
  return open[0];
}

/** Small odds tilt when ground affinity matches dominant faces. */
export function groundAffinityMod(state: GameState, ground?: Ground): number {
  if (!ground?.aff) return 0;
  let match = 0;
  for (const part of ground.aff.split(',')) {
    const f = part.trim() as keyof typeof state.faces;
    if (f && (state.faces[f] ?? 0) >= 8) match += 1;
  }
  return Math.min(0.08, match * 0.03);
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

  // Resistance tier escalates with the stakes (pre-ballot -> on-ballot -> general):
  // scrutiny/opposition organization grows as the race gets real. This widens
  // resolve()'s disaster band for STD/VOL plays and unlocks PL20 (show: tier>=1).
  // Difficulty tier tracks campaign phase (0 interim / 4 session → clamp)
  const ph = getPhase(state);
  state.tier = ph <= 0 ? 0 : Math.min(2, ph === 4 ? 2 : ph - 1);

  payCost(state, card);

  // Snapshot for milestones (ballot / stage) before run mutates
  const before = {
    ballot: state.ballot,
    sigs: state.signatures,
    stage: state.stage
  };

  // Base odds from card definition
  let p = card.odds ? card.odds(state, g) : 0.5;

  // === ACTIVATE SYNERGY ===
  const attrMod = cardAttrMod(state, card);
  const groundMod = card.field ? groundAffinityMod(state, g) : 0;
  p = Math.max(0.02, Math.min(0.95, p + attrMod + groundMod));

  const roll: RollResult = resolve(p, card.risk, state);
  const text = card.run ? card.run(state, roll, g) : `${card.n} resolves.`;

  if (roll.tier === 3) {
    state.disasterLog.push(state.week);
  }

  // Dopamine annotation — pure, no pity, after yields applied
  const feedback = buildPlayFeedback(state, card, roll, before);

  state.log.push({
    week: state.week,
    kind: 'play',
    text,
    cardId: card.id,
    tier: roll.tier,
    beat: feedback.beat
  });
  state.log.push({
    week: state.week,
    kind: 'juice',
    text: feedback.juice,
    cardId: card.id,
    tier: roll.tier,
    beat: feedback.beat
  });

  // Threshold checks against this play's yields: reputation grants and
  // Shadow consequences on Faces (see src/engine/reputation.ts).
  shadowCheck(state);
  repCheck(state);

  return {
    ok: true,
    cardId: card.id,
    cardName: card.n,
    tier: roll.tier,
    text,
    stamp: STAMPS[roll.tier],
    feedback,
    p: roll.p,
    roll: roll.roll
  };
}
