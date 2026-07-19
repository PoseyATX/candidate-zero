/**
 * CANDIDATE ZERO — Scripted strategies for harness work
 * Stage-aware: primary ballot race vs general GOTV.
 */

import type { Chooser } from './loop.js';
import type { GameState, PlayCard } from './types.js';

function pickByPriority(
  playable: { index: number; card: PlayCard }[],
  priority: string[]
): number | null {
  for (const id of priority) {
    const hit = playable.find(p => p.card.id === id);
    if (hit) return hit.index;
  }
  // Never auto-buy shop assets as a fallback — BUY* cost 0 AP (archive
  // assetPlays) so a naive first-of-list pick would drain money in a
  // guard-limited spin without advancing the week.
  const nonShop = playable.filter(p => !p.card.id.startsWith('BUY'));
  return nonShop[0]?.index ?? null;
}

/** Primary labor path → general GOTV/name push. */
export const laborBallotStrategy: Chooser = (playable, state) => {
  if (state.stage === 'general') {
    return pickByPriority(playable, [
      'PL19', 'PL23', 'PL01', 'PL02', 'PL16', 'PL22', 'PL06', 'PL09', 'PL10'
    ]);
  }
  if (!state.ballot) {
    return pickByPriority(playable, ['PL04', 'PL01', 'PL02', 'PL06', 'PL10']);
  }
  // PL21B is labor's answer to PL39: a volunteer-pool-funded route to the
  // same AL09 field-ops ally, so the labor path isn't locked out of the
  // bonus money's PL39 grants. Prioritized above PL01/PL02 so it actually
  // fires once affordable — it's a one-time grab (show gates it off after).
  return pickByPriority(playable, ['PL21B', 'PL01', 'PL02', 'PL06', 'PL08', 'PL16', 'PL10', 'PL03']);
};

/** Bank fee early, then paid media / fish fry texture into general. */
export const moneyBallotStrategy: Chooser = (playable, state) => {
  if (state.stage === 'general') {
    return pickByPriority(playable, [
      'PL19', 'PL23', 'PL01', 'PL22', 'PL13', 'PL09', 'PL07', 'PL10', 'PL16'
    ]);
  }
  if (!state.ballot) {
    if (state.money >= 1250) {
      return pickByPriority(playable, ['PL05', 'PL13', 'PL01', 'PL10']);
    }
    return pickByPriority(playable, ['PL13', 'PL01', 'PL02', 'PL10', 'PL03']);
  }
  return pickByPriority(playable, ['PL01', 'PL13', 'PL39', 'PL06', 'PL08', 'PL10', 'PL16']);
};

/** Control: ignore ballot access. */
export const grindFirstStrategy: Chooser = (playable, state) => {
  if (state.stage === 'general') {
    // Still ignores "proper" GOTV priority relative to doors — control texture
    return pickByPriority(playable, ['PL01', 'PL02', 'PL19', 'PL10', 'PL06']);
  }
  return pickByPriority(playable, ['PL01', 'PL02', 'PL06', 'PL10', 'PL08', 'PL03', 'PL13']);
};

export const hybridStrategy: Chooser = (playable, state) => {
  if (state.stage === 'general') {
    return pickByPriority(playable, [
      'PL19', 'PL23', 'PL01', 'PL13', 'PL16', 'PL22', 'PL06', 'PL10'
    ]);
  }
  if (!state.ballot) {
    // Genuine hybrid: race both ballot doors instead of defaulting to
    // labor-only (petition was always legal as a camp action, so a naive
    // "try petition first" check never fell through to the fee branch).
    // Alternate weeks between the two paths so both accrue.
    if (state.money >= 1250) {
      const fee = playable.find(p => p.card.id === 'PL05');
      if (fee) return fee.index;
    }
    const wantFish = state.week % 2 === 0;
    if (wantFish) {
      const fish = playable.find(p => p.card.id === 'PL13');
      if (fish) return fish.index;
    }
    const petition = playable.find(p => p.card.id === 'PL04');
    if (petition) return petition.index;
    return pickByPriority(playable, ['PL13', 'PL01', 'PL02', 'PL06', 'PL10']);
  }
  return pickByPriority(playable, ['PL01', 'PL06', 'PL08', 'PL13', 'PL16', 'PL10']);
};

/**
 * Phase 3 harness strategy: take the self-loan (PL21) as soon as it is
 * playable, then run a money path — spend-now leverage for fee/assets/field.
 * Win-rate case vs conservative money is what harness:debt measures.
 */
export const debtLeverageStrategy: Chooser = (playable, state) => {
  if (!state.selfLoanTaken) {
    const loan = playable.find(p => p.card.id === 'PL21');
    if (loan) return loan.index;
  }
  // Shop buys that unlock field power (A02 → A01) when cash is hot.
  if (state.money >= 800 && !state.assets.includes('A02')) {
    const a02 = playable.find(p => p.card.id === 'BUYA02');
    if (a02) return a02.index;
  }
  if (state.assets.includes('A02') && !state.assets.includes('A01')) {
    const a01 = playable.find(p => p.card.id === 'BUYA01');
    if (a01) return a01.index;
  }
  if (state.stage === 'general') {
    return pickByPriority(playable, [
      'PL19', 'PL23', 'PL01', 'PL22', 'PL13', 'PL09', 'PL07', 'PL10', 'PL16'
    ]);
  }
  if (!state.ballot) {
    if (state.money >= 1250) {
      return pickByPriority(playable, ['PL05', 'PL13', 'PL01', 'PL10']);
    }
    return pickByPriority(playable, ['PL13', 'PL01', 'PL02', 'PL10', 'PL03']);
  }
  return pickByPriority(playable, ['PL39', 'PL01', 'PL13', 'PL06', 'PL08', 'PL10', 'PL16']);
};

/** Money path that never self-loans — control for harness:debt. */
export const conservativeMoneyStrategy: Chooser = (playable, state) => {
  const noLoan = playable.filter(p => p.card.id !== 'PL21');
  return moneyBallotStrategy(noLoan, state);
};

/** Phase 4: advance the bill pipeline when legal, else casework / favor. */
export const sessionPipelineStrategy: Chooser = (playable, _state) => {
  const order = [
    'SS01',
    'SS_PAC', // refuse is optional; skip if we want auto-pay on referral
    'SS02',
    'SS03',
    'SS04',
    'SS05',
    'SS06',
    'SS07',
    'SS13',
    'SS10',
    'SS09',
    'SS08',
    'SS12'
  ];
  // Prefer pipeline; do not auto-refuse PAC (SS_PAC) — referral auto-pays.
  const noRefuse = playable.filter(p => p.card.id !== 'SS_PAC');
  return pickByPriority(noRefuse, order);
};

function withSession(chooser: Chooser): Chooser {
  return (playable, state) => {
    if (state.stage === 'session') return sessionPipelineStrategy(playable, state);
    return chooser(playable, state);
  };
}

export const STRATEGIES: Record<string, Chooser> = {
  labor: withSession(laborBallotStrategy),
  money: withSession(moneyBallotStrategy),
  grind: withSession(grindFirstStrategy),
  hybrid: withSession(hybridStrategy),
  debt: withSession(debtLeverageStrategy),
  'money-safe': withSession(conservativeMoneyStrategy),
  session: sessionPipelineStrategy
};

export function describeStrategy(_name: string, state: GameState): string {
  return (
    `stage=${state.stage} week=${state.week} ballot=${state.ballot} ` +
    `$${state.money} sigs=${state.signatures} contacts=${state.contacts} ` +
    `outcome=${state.outcome ?? 'ongoing'}`
  );
}
