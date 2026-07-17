/**
 * Obligations — structured weekly drag (archive OBLS port).
 * state.obls holds registry ids (OB1, OB2, …), not free prose.
 */

import type { GameState } from './types.js';
import { random } from './rng.js';

export interface ObligationDef {
  id: string;
  n: string;
  d: string;
  /** Weekly (or monthly off-season) mechanical bite. */
  drag: (s: GameState) => string | void;
}

export const OBLS: Record<string, ObligationDef> = {
  OB1: {
    id: 'OB1',
    n: 'PAC String',
    d: 'The association expects a friendly ear. Lobbyist face thins; exposure creeps.',
    drag: s => {
      s.faces.L -= 1;
      s.exposure = (s.exposure || 0) + 0.15;
      return 'PAC String: Lobbyist −1, exposure creeps.';
    }
  },
  OB2: {
    id: 'OB2',
    n: 'Bank Note',
    d: 'The homestead is collateral. Interest does not care about interim.',
    drag: s => {
      const bite = Math.min(150, Math.max(50, Math.floor(s.debt * 0.05) || 100));
      if (s.money >= bite) {
        s.money -= bite;
        s.debt = Math.max(0, s.debt - Math.floor(bite * 0.3));
        return `Bank Note: −$${bite} (partial debt service).`;
      }
      s.money = 0;
      s.faces.G -= 1;
      s.debt += 50;
      return 'Bank Note: empty account; Good Ol’ Boy −1; note grows.';
    }
  },
  OB3: {
    id: 'OB3',
    n: "Slate-Maker's Price",
    d: 'You ride someone else’s list. Quiet cost later.',
    drag: s => {
      s.exposure = (s.exposure || 0) + 0.05;
      if (s.endorsePts > 0 && random() < 0.15) {
        s.faces.O -= 1;
        return "Slate-Maker's Price: Operator −1 (they own a slice of your calendar).";
      }
    }
  },
  OB5: {
    id: 'OB5',
    n: 'Old Money Expectations',
    d: 'True Believer grounds cool when you owe the country club.',
    drag: s => {
      for (const g of s.groundsArr) {
        if (g.aff.includes('T')) g.rapport = Math.max(0, g.rapport - 1);
      }
      return 'Old Money: True-Believer grounds cool a degree.';
    }
  },
  OB8: {
    id: 'OB8',
    n: 'Cousin on the Payroll',
    d: 'Kin scandal is a slow leak.',
    drag: s => {
      s.faces.G -= 1;
      s.exposure = (s.exposure || 0) + 0.1;
      return 'Cousin on the Payroll: Good Ol’ Boy −1, exposure +0.1.';
    }
  },
  OB_INTERIM_DONOR: {
    id: 'OB_INTERIM_DONOR',
    n: 'Quiet Donor',
    d: 'Interim money with a number that will be called.',
    drag: s => {
      s.faces.L -= 1;
      s.exposure = (s.exposure || 0) + 0.1;
      return 'Quiet Donor: expects a return call eventually.';
    }
  }
};

/** Normalize legacy free-text obligations into registry ids where possible. */
export function normalizeObligations(state: GameState): void {
  if (!state.obls?.length) return;
  const next: string[] = [];
  for (const o of state.obls) {
    if (OBLS[o]) {
      if (!next.includes(o)) next.push(o);
      continue;
    }
    const low = o.toLowerCase();
    if (low.includes('association') || low.includes('pac') || low.includes('friendly ear')) {
      if (!next.includes('OB1')) next.push('OB1');
    } else if (low.includes('relative') || low.includes('cousin') || low.includes('kin')) {
      if (!next.includes('OB8')) next.push('OB8');
    } else if (low.includes('donor') || o === 'OBL_INTERIM_DONOR') {
      if (!next.includes('OB_INTERIM_DONOR')) next.push('OB_INTERIM_DONOR');
    } else if (low.includes('bank') || low.includes('note') || low.includes('debt')) {
      if (!next.includes('OB2')) next.push('OB2');
    } else {
      // Drop unparseable prose — mechanical system is id-based now
    }
  }
  // Debt without OB2 still gets the note
  if (state.debt > 0 && !next.includes('OB2')) next.push('OB2');
  state.obls = next;
}

export function addObligation(state: GameState, id: string): boolean {
  if (!OBLS[id]) return false;
  if (!state.obls.includes(id)) state.obls.push(id);
  return true;
}

/**
 * Weekly/monthly drag for all held obligations.
 * Call at end of campaign week, session week, and interim month.
 */
export function tickObligations(state: GameState): string[] {
  normalizeObligations(state);
  const notes: string[] = [];
  for (const id of [...state.obls]) {
    const def = OBLS[id];
    if (!def) continue;
    const msg = def.drag(state);
    if (msg) {
      notes.push(msg);
      state.log.push({ week: state.week, kind: 'note', text: `OBLIGATION — ${msg}` });
    }
  }
  // Naked debt without formal OB2 (edge case)
  if (state.debt > 0 && !state.obls.includes('OB2') && state.money > 0) {
    const bite = Math.min(80, state.money);
    state.money -= bite;
    notes.push(`Interest weather: −$${bite}`);
  }
  return notes;
}

export function obligationNames(state: GameState): string[] {
  normalizeObligations(state);
  return state.obls.map(id => OBLS[id]?.n ?? id);
}
