/**
 * CANDIDATE ZERO — Pure play execution
 * Affordability, phase legality, cost payment, resolve + run.
 * PR01 promo: prettyFaceCharges forces breakthrough on odds-bearing plays.
 */

import { resolve, STAMPS } from './resolve.js';
import { getPhase } from './state.js';
import { getGroundPenalty, rivalOddsPenalty } from './calendar.js';
import { buildPlayFeedback, ledgerMark, formatDeltas } from './feedback.js';
import { repCheck, shadowCheck } from './reputation.js';
import { canAffordCash } from './debt.js';
import { syncMovementFlags } from './entities.js';
import { effectiveApCost, upgradeOddsBonus } from './upgrades.js';
import { bankHeat, canPress, quotePress, pressLabel } from './heat.js';
import { maybeTriggerNotice } from './notice.js';
import { noteCardContacts } from './promotion.js';
import { liabilityBlockReason } from './liabilities.js';
import type { AttrId, GameState, Ground, PlayCard, PlayOutcome, RollResult } from './types.js';

/** Turf AP a field card can draw on; non-field cards can never touch it. */
function turfBudget(state: GameState, card: PlayCard): number {
  return card.field ? Math.max(0, state.fieldAp) : 0;
}

export function canAfford(state: GameState, card: PlayCard): boolean {
  const c = card.cost;
  const apCost = effectiveApCost(state, card);
  // Field cards spend turf AP first and campaign AP for the remainder, so a
  // 3-AP field play is affordable on 2 turf + 1 campaign.
  const apCovered = apCost <= state.ap + turfBudget(state, card);
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
  // Promo injectables use show:false so they never enter normal draft/growth
  // pools — but once one lands in hand, it must stay visible there.
  if (card.kind === 'promo') return true;
  if (card.show && !card.show(state)) return false;
  if (card.req && !card.req(state)) return false;
  return true;
}

export function isPlayable(state: GameState, card: PlayCard): boolean {
  return (
    isPhaseLegal(state, card) &&
    isVisible(state, card) &&
    canAfford(state, card) &&
    // What is in your hand can stop what else you may do — Rigidity will not
    // trade, No Standing has no standing. See engine/liabilities.ts.
    liabilityBlockReason(state, card) === ''
  );
}

export function payCost(state: GameState, card: PlayCard): void {
  const c = card.cost;
  const apCost = effectiveApCost(state, card);
  if (apCost) {
    // Turf first, campaign AP for whatever is left. Previously this deducted a
    // flat 1 fieldAp no matter the cost, which was harmless when every card
    // cost 1 and wrong the moment field cards got a real price.
    let owed = apCost;
    const fromTurf = Math.min(owed, turfBudget(state, card));
    state.fieldAp -= fromTurf;
    owed -= fromTurf;
    state.ap -= owed;
  }
  if (c.$) state.money -= c.$;
  if (c.vp) state.volPool -= c.vp;
  if (c.m) state.momentum -= c.m;
  if (c.fav) state.favors -= c.fav;
}

/**
 * Some grounds are closed until you hold the key that opens them (Church
 * Corridor needs the Faith Leader — MV07 / plays-wave4 clear `gated`).
 * `Ground.gated` shipped on GR04 and was cleared by those cards, but nothing
 * ever *read* it, so the corridor was workable from turn 1 and the "corridor
 * open" payoff was a no-op. This is the single reader.
 */
export function isGroundLocked(g: Ground): boolean {
  return g.gated === true;
}

/** Player-facing reason a ground can't be worked yet, or '' when it's open. */
export function groundLockReason(g: Ground): string {
  return isGroundLocked(g) ? 'Closed — you need someone to walk you in' : '';
}

/** Grounds the player may actually work right now. */
export function workableGrounds(state: GameState): Ground[] {
  return state.groundsArr.filter(g => !isGroundLocked(g));
}

export function pickDefaultGround(state: GameState): Ground | undefined {
  const open = workableGrounds(state);
  return open.find(g => g.pool > 0) ?? open[0] ?? undefined;
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

export interface PlayOpts {
  /** Spend banked heat on this play: better odds, wider band. See engine/heat.ts. */
  press?: boolean;
  /** Which arm of a forked card the player took. Required by cards that have
   *  `branches` — the engine will not choose one for them. */
  branch?: string;
}

export function executePlay(
  state: GameState,
  card: PlayCard,
  ground?: Ground,
  opts: PlayOpts = {}
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
  const blocked = liabilityBlockReason(state, card);
  if (blocked) {
    return { ok: false, reason: blocked, cardId: card.id, cardName: card.n };
  }
  // A fork does not resolve until the player says which way. The engine used to
  // decide this off hidden state while the card copy claimed it was a choice.
  if (card.branches?.length && !card.branches.some(b => b.id === opts.branch)) {
    return {
      ok: false,
      reason: `Choose: ${card.branches.map(b => b.n).join(' / ')}`,
      cardId: card.id,
      cardName: card.n
    };
  }

  const g = ground ?? (card.field ? pickDefaultGround(state) : undefined);
  if (card.field && !g) {
    return { ok: false, reason: 'No ground selected', cardId: card.id, cardName: card.n };
  }
  if (card.field && g && isGroundLocked(g)) {
    return { ok: false, reason: groundLockReason(g), cardId: card.id, cardName: card.n };
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

  // The play is committed, so the meeting happened — a figure banks the contact
  // whether the roll lands or not. Standing in front of somebody badly is still
  // standing in front of them. See engine/promotion.ts.
  noteCardContacts(state, card.figures);

  const before = {
    ballot: state.ballot,
    sigs: state.signatures,
    stage: state.stage,
    // Snapshot the ledger so the player can be told what the play actually
    // moved. "GAIN. Bank it." with no number is why alpha players said they
    // were clicking blindly.
    ledger: ledgerMark(state)
  };

  let p = card.odds ? card.odds(state, g) : 0.5;
  const attrMod = cardAttrMod(state, card);
  const rivalPen = card.field ? rivalOddsPenalty(g) : 0;
  // Upgrades shift the odds going INTO resolve; they never touch the roll,
  // the bands, or the tier mapping (Covenant 4).
  const upBonus = upgradeOddsBonus(state, card);

  // Press: the player cashes a landed streak for better odds on this one play,
  // and pays for them with a wider disaster band. Read the wager before the
  // roll and spend it whatever happens — a press you can take back is not one.
  const pressed = !!opts.press && canPress(state);
  const wager = pressed ? quotePress(state, card) : null;
  const pressOdds = wager?.odds ?? 0;
  const pressBand = wager?.band ?? 0;

  p = Math.max(
    0.02,
    Math.min(0.95, p + attrMod + groundOddsBonus - rivalPen + upBonus + pressOdds)
  );

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
    roll = resolve(p, card.risk, state, undefined, pressBand);
  }

  if (wager) {
    state.log.push({
      week: state.week,
      kind: 'note',
      text: `Pressed ${wager.heat}: ${pressLabel(wager)}`
    });
  }

  // Breakthrough refund — the chain seam. A card flagged refundOnBreak buys its
  // AP back on a tier-0 breakthrough, so a hot week can keep going. Capped at
  // apMax so it tops up rather than banking an unbounded turn.
  if (roll.tier === 0 && card.refundOnBreak) {
    const back = effectiveApCost(state, card);
    if (back > 0) {
      state.ap = Math.min(state.apMax, state.ap + back);
      state.log.push({
        week: state.week,
        kind: 'note',
        text: `${card.n} breaks through — the day opens up again (+${back} AP).`
      });
    }
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

  // A press is spent whatever the roll said — that is the wager. Then the final
  // tier (post-parlSave) decides what the meter carries forward: landing builds
  // it, failing wipes it. Order matters, so a pressed win restarts the streak
  // at 1 rather than keeping the stake it just cashed.
  if (pressed) state.heat = 0;
  bankHeat(state, roll.tier);

  // A forked card resolves down the arm the player named, and only that one.
  const branch = card.branches?.find(b => b.id === opts.branch);
  const text = branch
    ? branch.run(state, roll, g)
    : card.run
      ? card.run(state, roll, g)
      : `${card.n} resolves.`;

  if (roll.tier === 3) {
    state.disasterLog.push(state.week);
  }

  // Indifference → notice → targeted resistance (SRD node). Once per run.
  maybeTriggerNotice(state);

  const feedback = buildPlayFeedback(state, card, roll, before);

  state.log.push({
    week: state.week,
    kind: 'play',
    text,
    cardId: card.id,
    tier: roll.tier,
    beat: feedback.beat
  });
  const deltaText = formatDeltas(feedback.deltas);
  state.log.push({
    week: state.week,
    kind: 'juice',
    // Same reason as the toast: a log of "GAIN. Bank it." twenty times over
    // tells a player nothing about whether the week went anywhere.
    text: deltaText ? `${feedback.juice}  ${deltaText}` : feedback.juice,
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
