/**
 * CANDIDATE ZERO — Pure play execution
 * Affordability, phase legality, cost payment, resolve + run.
 * PR01 promo: prettyFaceCharges forces breakthrough on odds-bearing plays.
 */

import { resolve, STAMPS } from './resolve.js';
import { getPhase } from './state.js';
import { getGroundPenalty, rivalOddsPenalty } from './calendar.js';
import { buildPlayFeedback } from './feedback.js';
import { repCheck, shadowCheck } from './reputation.js';
import { canAffordCash } from './debt.js';
import { syncMovementFlags } from './entities.js';
import type { AttrId, GameState, Ground, PlayCard, PlayOutcome, RollResult } from './types.js';

export function canAfford(state: GameState, card: PlayCard): boolean {
  const c = card.cost;
  const apCost = c.a ?? 0;
  const apCovered = apCost <= state.ap || (apCost > 0 && !!card.field && state.fieldAp > 0);
  if (!apCovered) return false;
  if (!canAffordCash(state, c.$ ?? 0)) return false;
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
  // Promo injectables use show:false so they never enter normal pools.
  // Once in hand / catalog play, PR01 must still be visible.
  if (card.id === 'PR01') return true;
  if (card.show && !card.show(state)) return false;
  if (card.req && !card.req(state)) return false;
  return true;
}

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
  if (c.$) state.money -= c.$;
  if (c.vp) state.volPool -= c.vp;
  if (c.m) state.momentum -= c.m;
  if (c.fav) state.favors -= c.fav;
}

export function pickDefaultGround(state: GameState): Ground | undefined {
  return state.groundsArr.find(g => g.pool > 0) ?? state.groundsArr[0];
}

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

  state.groundRapMult = 1;
  let groundOddsBonus = 0;
  if (card.field && g) {
    if (!state.groundPlays) state.groundPlays = {};
    const priorVisits = state.groundPlays[g.id] ?? 0;
    const pen = getGroundPenalty(state, g, priorVisits);
    groundOddsBonus = pen.oddsBonus;
    state.groundRapMult = pen.rapMult;
    state.groundPlays[g.id] = priorVisits + 1;
    state.lastGround = g.id;
  }

  state.tier = getPhase(state) - 1;

  payCost(state, card);

  const before = {
    ballot: state.ballot,
    sigs: state.signatures,
    stage: state.stage
  };

  let p = card.odds ? card.odds(state, g) : 0.5;
  const attrMod = cardAttrMod(state, card);
  const rivalPen = card.field ? rivalOddsPenalty(g) : 0;
  p = Math.max(0.02, Math.min(0.95, p + attrMod + groundOddsBonus - rivalPen));

  state.sessionFlags = state.sessionFlags || {};
  const charges = Number(state.sessionFlags.prettyFaceCharges || 0);
  let roll: RollResult;
  if (charges > 0 && card.odds && card.id !== 'PR01') {
    roll = { tier: 0, roll: 0, p, band: 0 };
    state.sessionFlags.prettyFaceCharges = charges - 1;
    state.log.push({
      week: state.week,
      kind: 'note',
      text: `Pretty Face — breakthrough forced (${state.sessionFlags.prettyFaceCharges} left).`
    });
  } else {
    roll = resolve(p, card.risk, state);
  }

  if (roll.tier === 3 && state.parlSave && !state.parlUsed && card.id === 'PL04') {
    roll.tier = 2;
    state.parlUsed = true;
    state.log.push({
      week: state.week,
      kind: 'note',
      text: "The Parliamentarian's save: DISASTER read down to SETBACK on procedure."
    });
  }

  const text = card.run ? card.run(state, roll, g) : `${card.n} resolves.`;

  if (roll.tier === 3) {
    state.disasterLog.push(state.week);
  }

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

  shadowCheck(state);
  repCheck(state);
  syncMovementFlags(state);

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
