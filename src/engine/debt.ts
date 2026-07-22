/**
 * CANDIDATE ZERO — Debt as leveraged optionality (Phase 3)
 *
 * Design correction: debt does NOT tax resolve() odds or bands. Real
 * campaigns don't mark down win probability for a bank note mid-race.
 * Consequence is deferred and asymmetric:
 *
 *   SPEND-NOW: PL21 self-loan (and PAC bridge via PL20) unlock cash beyond
 *   current liquid — real optionality (assets, filing fee, field director).
 *
 *   WIN: retire principal cheaply. Pure self-loan leaves no Session gate.
 *   PAC-bridged debt retires cash too but keeps/grants a Session obligation
 *   (reuse obligations.ts + sessionFlags — not a parallel system).
 *
 *   LOSS: debt compounds into the next cycle (legacy.carry), re-applies
 *   OB2 drag, and tightens *affordability* (availableCash), never odds.
 *   Past a crisis threshold: interim path pressure + PAC Check as relief.
 *
 * Hooks reused (do not invent parallels):
 *   - addObl / applyOblDrag / OB2 Bank Note (src/data/obligations.ts)
 *   - OB1 PAC String (same registry) for Session-lender claim
 *   - sessionFlags for Phase 4 committee/vote gates
 *   - LegacyCarry + applyLegacy (src/engine/legacy.ts)
 *   - canAfford (src/engine/play.ts) reads availableCash only
 */

import type { CampaignOutcome, GameState, LegacyCarry, LegacyState } from './types.js';
import { addObl, OBLS } from '../data/obligations.js';

/** Above this carried debt, next-cycle cash is partially reserved for service. */
export const DEBT_AFFORD_THRESHOLD = 2000;

/**
 * Crisis line: loss-branch interim paths narrow; in-campaign PAC Check
 * becomes the structured relief valve (no new desperate-fund card).
 */
export const DEBT_CRISIS_THRESHOLD = 5000;

/** Between-cycle interest on unretired principal (loss branch only). */
export const DEBT_CYCLE_COMPOUND = 1.15;

/** Cheap win-branch retirement fee as a fraction of self-loan principal. */
export const DEBT_WIN_SELF_FEE_FRAC = 0.05;

/** Max token fee when settling self-loan on a win (cents of campaign cash). */
export const DEBT_WIN_SELF_FEE_CAP = 200;

export function isDebtCrisis(state: GameState): boolean {
  return (state.debt || 0) >= DEBT_CRISIS_THRESHOLD;
}

/**
 * Cash the player may actually spend. Elevated debt reserves a service
 * cushion so big buys (assets, field director, contrast mail) get harder
 * without touching resolve() odds.
 *
 * Below DEBT_AFFORD_THRESHOLD: full money (leverage still pure upside).
 */
export function availableCash(state: GameState): number {
  const money = state.money || 0;
  const debt = state.debt || 0;
  if (debt <= DEBT_AFFORD_THRESHOLD) return money;
  const over = debt - DEBT_AFFORD_THRESHOLD;
  // 8¢ per dollar over the line reserved — bites affordability, not RNG.
  const reserve = Math.min(money, Math.floor(over * 0.08));
  return Math.max(0, money - reserve);
}

/** True if the card's $ cost is covered by availableCash (not raw money). */
export function canAffordCash(state: GameState, dollarCost: number): boolean {
  if (dollarCost <= 0) return true;
  return availableCash(state) >= dollarCost;
}

/**
 * Take a self-loan (PL21). Spend-now lever: +cash immediately, principal
 * on the books, OB2 weekly interest. Marks selfLoanTaken.
 * Does not touch odds.
 */
export function applySelfLoan(state: GameState, principal = 3000): string {
  const owed = Math.floor(principal * 1.4);
  state.money += principal;
  state.debt = (state.debt || 0) + owed;
  state.selfLoanTaken = true;
  state.faces.G -= 8;
  addObl(state, 'OB2');
  return (
    `+$${principal} now; $${owed} owed later, win or lose. ` +
    `(Self-loan — Bank Note OB2 interest weekly. Win retires cheap; loss compounds.)`
  );
}

/**
 * PAC Check under debt pressure can *bridge* the bank note: principal stays
 * until win/loss branch, but ownership shifts to the PAC lender. On win,
 * cash retires cheaply and the lender keeps a Session claim (OB1 + flag).
 *
 * Reuses addObl('OB1') — same PAC String registry entry as a normal check.
 * Returns flavor; mutates state. Call from PL20 after base money grant.
 */
export function maybePacBridge(state: GameState, pacMoney: number): string {
  const debt = state.debt || 0;
  if (debt <= 0) return '';

  // Bridge the lesser of outstanding debt and ~half the PAC check.
  const bridged = Math.min(debt, Math.floor(pacMoney * 0.5) + Math.min(debt, 1500));
  if (bridged <= 0) return '';

  state.pacBridgeDebt = (state.pacBridgeDebt || 0) + bridged;
  // Bank note interest eases once the PAC holds the paper — remove OB2 if
  // the whole principal is bridged; otherwise keep dragging the remainder.
  const selfLeft = Math.max(0, debt - (state.pacBridgeDebt || 0));
  // Keep debt total for loss-compound; track pac share separately.
  if (selfLeft <= 0 || (state.pacBridgeDebt || 0) >= debt) {
    state.obls = state.obls.filter(id => id !== 'OB2');
  }
  // PAC always holds a string when they bridge (registry, not free-text).
  addObl(state, 'OB1');
  state.sessionFlags = state.sessionFlags || {};
  state.sessionFlags.pac_bridge_pending = true;

  if (isDebtCrisis(state)) {
    // Crisis relief: principal pay-down with the other half of the check.
    const pay = Math.min(state.debt, Math.floor(pacMoney * 0.35));
    state.debt = Math.max(0, state.debt - pay);
    state.pacBridgeDebt = Math.min(state.pacBridgeDebt || 0, state.debt);
    return (
      ` PAC bridge: $${bridged} of the note is their paper now; $${pay} paid down. ` +
      `(Crisis relief — Session will still hear from them.)`
    );
  }
  return (
    ` PAC bridge: $${bridged} of your note is now their paper. ` +
    `(Win retires the cash cheap; they keep a Session claim.)`
  );
}

export interface DebtRetirementResult {
  selfRetired: number;
  pacRetired: number;
  feePaid: number;
  sessionClaim: boolean;
  text: string;
}

/**
 * Win-branch debt retirement — call on won_general (reelection handoff or
 * Session entry stub). Cheap for self-loan; PAC bridge clears cash but
 * leaves Session gate via OB1 + sessionFlags.pac_lender_claim.
 *
 * No resolve() side effects.
 */
export function retireDebtOnWin(state: GameState): DebtRetirementResult {
  const debt = state.debt || 0;
  const pacShare = Math.min(debt, state.pacBridgeDebt || 0);
  const selfShare = Math.max(0, debt - pacShare);

  let feePaid = 0;
  if (selfShare > 0) {
    feePaid = Math.min(
      state.money,
      Math.min(DEBT_WIN_SELF_FEE_CAP, Math.ceil(selfShare * DEBT_WIN_SELF_FEE_FRAC))
    );
    state.money -= feePaid;
  }

  state.debt = 0;
  state.pacBridgeDebt = 0;
  state.selfLoanTaken = false;
  // Bank note done either way on a win.
  state.obls = state.obls.filter(id => id !== 'OB2');

  let sessionClaim = false;
  if (pacShare > 0 || state.sessionFlags?.pac_bridge_pending || state.obls.includes('OB1')) {
    sessionClaim = true;
    state.sessionFlags = state.sessionFlags || {};
    state.sessionFlags.pac_lender_claim = true;
    delete state.sessionFlags.pac_bridge_pending;
    // Keep OB1 as the Session leash (gates committee/vote in Phase 4).
    addObl(state, 'OB1');
  }

  const text =
    debt <= 0
      ? 'No notes on the books.'
      : sessionClaim
        ? `Notes retired for $${feePaid} (self) + PAC bridge cleared. ` +
          `The Third House still holds a claim — Session committee work is not free. (OB1 kept.)`
        : `Self-loan retired for $${feePaid}. Homestead risk is paid; no Session leash.`;

  if (debt > 0) {
    state.log.push({ week: state.week, kind: 'note', text: `DEBT SETTLED — ${text}` });
  }

  return {
    selfRetired: selfShare,
    pacRetired: pacShare,
    feePaid,
    sessionClaim,
    text
  };
}

/**
 * Loss-branch: what carries into the Chronicle for the next cycle.
 * Compounds principal; bank note + PAC string ids for re-application.
 */
export function debtCarryFromLoss(state: GameState): Pick<LegacyCarry, 'debt' | 'pacBridgeDebt' | 'debtObls'> {
  const raw = state.debt || 0;
  if (raw <= 0) return { debt: 0, pacBridgeDebt: 0, debtObls: [] };
  const compounded = Math.ceil(raw * DEBT_CYCLE_COMPOUND);
  const pac = Math.min(compounded, Math.ceil((state.pacBridgeDebt || 0) * DEBT_CYCLE_COMPOUND));
  // Durable obligations that ride with the note (archive reelect filter spirit).
  const debtObls = state.obls.filter(id => id === 'OB1' || id === 'OB2' || id === 'OB3');
  return { debt: compounded, pacBridgeDebt: pac, debtObls };
}

/**
 * Apply carried debt onto a fresh (or reelection) run. Re-attaches OB2 so
 * weekly drag compounds cycle-to-cycle. Tightens starting cash when crisis.
 */
export function applyCarriedDebt(state: GameState, carry: LegacyCarry): void {
  const debt = carry.debt || 0;
  if (debt <= 0) return;

  state.debt = debt;
  state.pacBridgeDebt = carry.pacBridgeDebt || 0;
  if (state.pacBridgeDebt > 0) {
    state.sessionFlags = state.sessionFlags || {};
    state.sessionFlags.pac_bridge_pending = true;
  }

  // Re-apply bank note if any self-share remains (or full debt if no bridge).
  const selfShare = debt - (state.pacBridgeDebt || 0);
  if (selfShare > 0 || !state.pacBridgeDebt) {
    addObl(state, 'OB2');
  }
  for (const id of carry.debtObls || []) {
    if (OBLS[id]) addObl(state, id);
  }

  // Crisis / elevated debt: starting war chest takes a service haircut
  // (affordability), not an odds tax.
  if (debt >= DEBT_AFFORD_THRESHOLD) {
    const haircut = Math.min(state.money, Math.floor((debt - DEBT_AFFORD_THRESHOLD) * 0.1));
    state.money = Math.max(0, state.money - haircut);
  }

  state.log.push({
    week: state.week,
    kind: 'note',
    text:
      `THE NOTE FOLLOWED YOU — $${debt} still on the books` +
      (debt >= DEBT_CRISIS_THRESHOLD
        ? ' (crisis). Cash is tight; the PAC Check is the structured relief valve.'
        : '. Interest resumes (OB2).')
  });
}

/**
 * Merge loss debt into Chronicle carry (called from recordRun).
 * Win path zeros debt carry (retirement happens separately on reelect).
 */
export function mergeDebtIntoCarry(
  carry: LegacyCarry,
  state: GameState,
  kind: CampaignOutcome
): LegacyCarry {
  if (kind === 'won_general') {
    // Winner settles before the next ballot; don't poison the Chronicle.
    return { ...carry, debt: 0, pacBridgeDebt: 0, debtObls: [] };
  }
  const d = debtCarryFromLoss(state);
  return {
    ...carry,
    debt: d.debt,
    pacBridgeDebt: d.pacBridgeDebt,
    debtObls: d.debtObls
  };
}

/** Convenience: apply legacy carry debt after createCampaign/applyLegacy. */
export function applyLegacyDebt(state: GameState, legacy: LegacyState): void {
  if (legacy.carry?.debt && legacy.carry.debt > 0) {
    applyCarriedDebt(state, legacy.carry);
  }
}

/**
 * Loss interim: at crisis, Perennial is always open (worse economics via
 * carried debt already); other paths stay but Staffer may close if the
 * books look radioactive. Pure path filter helper for buildPaths.
 */
export function debtCrisisPathIds(state: GameState): string[] | null {
  if (!isDebtCrisis(state)) return null;
  // Force the thematic choice surface: keep running (perennial) or go home
  // and heal. Advocate/staffer still possible if gates pass — but perennial
  // is emphasized; harness checks perennial is always present.
  return null; // paths themselves stay; economics are the bite
}

/**
 * PL20 visibility: once ballot (tier≥1) or debt crisis. Callers also gate
 * on !pacCheckTaken / !OB1 so it cannot spam free money.
 */
export function pacCheckAvailable(state: GameState): boolean {
  if (state.sessionFlags?.pacCheckTaken) return false;
  if (state.obls.includes('OB1')) return false;
  if (isDebtCrisis(state) && (state.debt || 0) > 0) return true;
  return (state.tier ?? 0) >= 1;
}
