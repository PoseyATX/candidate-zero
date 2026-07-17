/**
 * CANDIDATE ZERO — Reputation, allies, and Shadow consequences
 *
 * Ported from archive/prototype-single-file.html's addAlly/ally/warm/
 * hasRep/repCheck/shadowCheck. That file is the design source for this
 * engine (see docs/SRD-NOTES.md) and already has a complete, working
 * version of this system — this is a port of the subset reachable with
 * state that already exists in the modular GameState, not new design.
 *
 * repCheck: only R01/R02/R04/R07/R10/R11 are ported here. The rest
 * (R05/R06/R08/R09/R12) depend on allies/counters not yet ported
 * (pieCount, strawWins, slate mechanics, AL02/AL12/AL15) — see
 * docs/ROADMAP.md Phase 2.
 *
 * shadowCheck: ported in full — every field it touches (pieMalus,
 * exposure, b05Malus, allyMalus, favWitness, hitPieces, volPool,
 * rapStall, obls, groundsArr, shFired) already exists in GameState,
 * scaffolded for exactly this and otherwise unused. This is TICKET's
 * "Next: Shadow consequences on Faces."
 */

import type { GameState } from './types.js';

export function hasRep(state: GameState, id: string): boolean {
  return state.reps.includes(id);
}

export function findAlly(state: GameState, id: string) {
  return state.allies.find(a => a.id === id);
}

export function warm(state: GameState, id: string): boolean {
  const a = findAlly(state, id);
  return !!(a && a.warm > 0);
}

export function addRep(state: GameState, id: string): void {
  if (!state.reps.includes(id)) state.reps.push(id);
}

/** Matches archive semantics: grants once: does not re-warm an existing ally. */
export function addAlly(state: GameState, id: string, warmAmt = 2): boolean {
  if (findAlly(state, id)) return false;
  state.allies.push({ id, warm: warmAmt, age: 0 });
  return true;
}

/**
 * Reputation thresholds — call after any play that could move the tracked
 * counters (walkCount, shadowPlays, hitPieces, disasterLog) or at week end.
 * Idempotent: addRep no-ops once a rep is already held.
 */
export function repCheck(state: GameState): void {
  if (state.walkCount >= 12) addRep(state, 'R01');
  if (state.week >= 12 && state.shadowPlays === 0 && !hasRep(state, 'R04')) {
    addRep(state, 'R02');
  }
  if (state.shadowPlays >= 3 && !hasRep(state, 'R02')) addRep(state, 'R04');
  if (state.hitPieces >= 3) addRep(state, 'R07');
  const recentDisasters = state.disasterLog.filter(w => state.week - w < 5).length;
  if (recentDisasters >= 3) addRep(state, 'R11');
  if (state.disasterLog.length >= 2) addRep(state, 'R10');
}

/**
 * Shadow consequences on Faces — fires once per threshold crossing
 * (state.shFired dedupes). Faces drifting deep negative has real
 * mechanical bite, not just flavor text.
 */
export function shadowCheck(state: GameState): void {
  const T = state.faces;
  const fired = state.shFired;
  const fire = (key: string, msg: string, fx?: () => void): void => {
    if (fired[key]) return;
    fired[key] = true;
    state.log.push({ week: state.week, kind: 'note', text: `SHADOW — ${msg}` });
    if (fx) fx();
  };

  if (T.P <= -10) {
    fire('P1', 'Obstructionist: chairs call you "difficult." Pie Circuit -10%.', () => {
      state.pieMalus = 0.1;
    });
  }
  if (T.P <= -25) {
    fire('P2', 'Obstructionist crisis: you kill a friendly deal on principle. An ally walks for good.', () => {
      const a = state.allies.find(x => x.warm > 0);
      if (a) a.warm = -99;
    });
  }
  if (T.O <= -10) {
    fire('O1', 'Fixer: every favor now has a 25% witness.', () => {
      state.favWitness = 0.25;
    });
  }
  if (T.O <= -25) {
    fire('O2', 'Fixer crisis: the Beat Reporter starts mapping your favor web.', () => {
      state.exposure += 2;
    });
  }
  if (T.L <= -10) {
    fire('L1', 'Bagman: donor-list rumors. Small-dollar trickle -25%.', () => {
      state.b05Malus = 0.75;
    });
  }
  if (T.L <= -25) {
    fire('L2', 'Bagman crisis: the string pulls -- publicly.', () => {
      state.hitPieces++;
    });
  }
  if (T.G <= -10) {
    fire('G1', 'Boss: "his people" enters local vocabulary. New allies -10%.', () => {
      state.allyMalus = 0.1;
    });
  }
  if (T.G <= -25) {
    fire('G2', 'Boss crisis: kin scandal catches up with you.', () => {
      if (!state.obls.includes('OB8')) state.obls.push('OB8');
      const g = state.groundsArr.find(x => x.id === 'GR02');
      if (g) g.rapport = Math.max(0, g.rapport - 15);
    });
  }
  if (T.T >= 30 && state.endorsePts === 0 && state.week > 10) {
    fire('T1', 'Zealot’s edge: two chairs privately call you "not a serious person."');
  }
  if (T.T <= -25 || (T.T >= 45 && state.week > 14 && state.endorsePts === 0)) {
    fire('T2', 'Zealot crisis: you purge a volunteer heretic. Three quit with him.', () => {
      state.volPool = Math.max(0, state.volPool - 3);
    });
  }
  if (T.F <= -10) {
    fire('F1', 'Grandstander: reporters cover you, not the message. Issue rapport stalls.', () => {
      state.rapStall = true;
    });
  }
  if (T.F <= -25) {
    fire('F2', 'Grandstander crisis: the clip that outlives you. Permanent exposure +1.', () => {
      state.exposure += 1;
    });
  }
}
