/**
 * CANDIDATE ZERO — Pure play execution
 * Affordability, phase legality, cost payment, resolve + run.
 * Now includes cardAttrMod synergy (root attributes affect odds).
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
  // Phase 3: $ costs use availableCash (debt reserves a service cushion).
  // Never an odds tax — pure affordability gate (src/engine/debt.ts).
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

  // Ground diminishing returns (Phase 1): for a field play, look up how many
  // times this ground was already worked this week, derive the odds bump /
  // rapport multiplier, then tally this visit. groundRapMult is read by
  // rapGain() inside the card's run(); default 1 for non-field plays.
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

  // Resistance tier escalates with the stakes (pre-ballot -> on-ballot -> general):
  // scrutiny/opposition organization grows as the race gets real. This widens
  // resolve()'s disaster band for STD/VOL plays and unlocks PL20 (show: tier>=1).
  state.tier = getPhase(state) - 1;

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
  // Opposition presence on this ground taxes field odds (rivalRap teeth).
  const rivalPen = card.field ? rivalOddsPenalty(g) : 0;
  p = Math.max(0.02, Math.min(0.95, p + attrMod + groundOddsBonus - rivalPen));

  const roll: RollResult = resolve(p, card.risk, state);

  // The Parliamentarian's save (PA_INK persona, T_NERD legacy trait): once
  // per campaign, a procedural DISASTER on the petition reads down to a
  // SETBACK instead. Archive-scoped to PL04 (the only procedural play
  // ported so far this applies to).
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
  // Starmap v0: open pilot movement when advancement conditions met.
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
