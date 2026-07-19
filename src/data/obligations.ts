/**
 * Structured obligations registry — ported from archive/prototype-single-file.html
 * OBLS + addObl + weekly drag (lines ~393–404, weekly tick ~1590s).
 *
 * state.obls is a list of obligation *ids* into this registry (not free-text).
 * Each held id applies its `drag` once per week at the week boundary.
 *
 * Archive also has OB9/OB10; Phase 2 ports OB1–OB8 as the ROADMAP/brief set,
 * plus OB9/OB10 so pledge/flatbed/event paths stay complete.
 */

import type { GameState } from '../engine/types.js';

export interface ObligationDef {
  id: string;
  n: string;
  /** One-line UI/log description (archive ODESC). */
  desc: string;
  /** Weekly drag — archive OBLS[id].drag. Empty for flavor-only leashes. */
  drag: (s: GameState) => void;
}

/**
 * Archive OBLS (prototype-single-file.html:393–401).
 * OB3/OB4/OB6/OB7/OB9/OB10 have empty drag in archive (leash for session/events).
 */
export const OBLS: Record<string, ObligationDef> = {
  // archive line 393
  OB1: {
    id: 'OB1',
    n: 'PAC String',
    desc: 'L drifts; sting fuel; will call a vote',
    drag: s => {
      s.faces.L -= 1;
      s.exposure += 0.15;
    }
  },
  // archive line 394
  OB2: {
    id: 'OB2',
    n: 'Bank Note',
    desc: '−$150 interest / week',
    drag: s => {
      s.money -= 150;
      if (s.money < 0) {
        s.money = 0;
        s.faces.G -= 1;
      }
    }
  },
  // archive line 395
  OB3: {
    id: 'OB3',
    n: "Slate-Maker's Price",
    desc: 'one endorsement is his',
    drag: () => {}
  },
  // archive line 396
  OB4: {
    id: 'OB4',
    n: "The Pastor's Ask",
    desc: 'a position is locked',
    drag: () => {}
  },
  // archive line 397
  OB5: {
    id: 'OB5',
    n: 'Old Money Expectations',
    desc: 'movement rapport bleeds',
    drag: s => {
      for (const g of s.groundsArr) {
        if (g.aff[0] === 'T' || g.aff.includes('T')) {
          g.rapport = Math.max(0, g.rapport - 1);
        }
      }
    }
  },
  // archive line 398
  OB6: {
    id: 'OB6',
    n: "Family Name's Weight",
    desc: 'family is oppo surface',
    drag: () => {}
  },
  // archive line 399
  OB7: {
    id: 'OB7',
    n: 'The Handshake Deal',
    desc: 'a favor is owned',
    drag: () => {}
  },
  // archive line 401 (OB8 after OB10 in archive source order; id still OB8)
  OB8: {
    id: 'OB8',
    n: 'Cousin on the Payroll',
    desc: 'G drifts; audit fuel',
    drag: s => {
      s.faces.G -= 1;
      s.exposure += 0.1;
    }
  },
  // archive line 400
  OB9: {
    id: 'OB9',
    n: 'The Signed Pledge',
    desc: 'position locked in ink',
    drag: () => {}
  },
  // archive line 402
  OB10: {
    id: 'OB10',
    n: 'Debt of Gratitude',
    desc: 'repay in kind, someday',
    drag: () => {}
  }
};

/** Port of archive addObl(s,id) — line 404. */
export function addObl(state: GameState, id: string): void {
  if (!OBLS[id]) {
    // Unknown ids still record so free-text leftovers from older saves don't
    // explode — but new code should only push registry keys.
    if (!state.obls.includes(id)) state.obls.push(id);
    return;
  }
  if (!state.obls.includes(id)) state.obls.push(id);
}

/**
 * Apply weekly drag for every held obligation. Call at week boundary
 * (onWeekAdvance). Port of archive weekly foreach over S.obls with drag.
 */
export function applyOblDrag(state: GameState): void {
  for (const id of state.obls) {
    const def = OBLS[id];
    if (def) def.drag(state);
  }
}

export function oblName(id: string): string {
  return OBLS[id]?.n ?? id;
}
