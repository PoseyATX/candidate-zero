/**
 * CANDIDATE ZERO — Reputation, allies, and Shadow consequences
 *
 * Ported from archive/prototype-single-file.html's addAlly/ally/warm/
 * hasRep/repCheck/shadowCheck. That file is the design source for this
 * engine (see docs/SRD-NOTES.md) and already has a complete, working
 * version of this system — this is a port, not new design.
 *
 * repCheck: Phase 2 ports the full archive matrix (R01–R12) now that
 * ally grants + counters (pieCount, strawWins, slate, AL02/AL12/AL15)
 * exist. R10 still uses modular disasterLog.length (archive's
 * disSurvived counter was never separate here).
 *
 * shadowCheck: ported in full — every field it touches (pieMalus,
 * exposure, b05Malus, allyMalus, favWitness, hitPieces, volPool,
 * rapStall, obls, groundsArr, shFired) already exists in GameState.
 */

import type { GameState } from './types.js';
import { addObl } from '../data/obligations.js';

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

/**
 * Phase 1 ground-affinity check: is this ally warm AND working the given
 * ground? An ally with no `grounds` list (persona/roster grant, no ground)
 * counts as warm everywhere — backward-compatible. An ally localized to
 * specific grounds (granted by a ground-based field play) only counts at
 * those grounds. `groundId` omitted falls back to the roster-wide `warm`.
 * Spec named this `allyWarmAtGround`; `hasAllyWarm` is an alias.
 */
export function allyWarmAtGround(state: GameState, id: string, groundId?: string): boolean {
  const a = findAlly(state, id);
  if (!a || a.warm <= 0) return false;
  if (!groundId) return true;
  if (!a.grounds || a.grounds.length === 0) return true;
  return a.grounds.includes(groundId);
}
export const hasAllyWarm = allyWarmAtGround;

export function addRep(state: GameState, id: string): void {
  if (!state.reps.includes(id)) state.reps.push(id);
}

/**
 * Matches archive semantics: grants once; does not re-warm an existing ally.
 * Phase 1: pass `groundId` to localize the ally to a ground (field plays);
 * omit it for a roster-wide grant (personas). If the ally already exists,
 * a `groundId` still extends its working grounds (a field director hired
 * at a second ground now works both).
 */
export function addAlly(state: GameState, id: string, warmAmt = 2, groundId?: string): boolean {
  const existing = findAlly(state, id);
  if (existing) {
    if (groundId) {
      existing.grounds = existing.grounds ?? [];
      if (!existing.grounds.includes(groundId)) existing.grounds.push(groundId);
    }
    return false;
  }
  state.allies.push({ id, warm: warmAmt, age: 0, grounds: groundId ? [groundId] : undefined });
  return true;
}

/**
 * Reputation thresholds — call after any play that could move the tracked
 * counters (walkCount, shadowPlays, hitPieces, disasterLog) or at week end.
 * Idempotent: addRep no-ops once a rep is already held.
 *
 * Port of archive repCheck() (prototype-single-file.html:512–524).
 */
export function repCheck(state: GameState): void {
  // archive:513
  if (state.walkCount >= 12) addRep(state, 'R01');
  // archive:514
  if (state.week >= 12 && state.shadowPlays === 0 && !hasRep(state, 'R04')) {
    addRep(state, 'R02');
  }
  // archive:515
  if (state.shadowPlays >= 3 && !hasRep(state, 'R02')) addRep(state, 'R04');
  // archive:516 — pie circuit successes
  if ((state.pieCount || 0) >= 6) addRep(state, 'R05');
  // archive:517 — County Chairwoman or County Judge
  if ((warm(state, 'AL02') || warm(state, 'AL15')) && !hasRep(state, 'R06')) {
    addRep(state, 'R06');
  }
  // archive:518
  if (state.hitPieces >= 3) addRep(state, 'R07');
  // archive:519 — slate + establishment cred
  if (state.slate && hasRep(state, 'R06') && !hasRep(state, 'R09')) {
    addRep(state, 'R08');
  }
  // archive:520 — pledges + straw wins (movement + club math)
  if (state.pledges >= 3 && (state.strawWins || 0) >= 2 && !hasRep(state, 'R08')) {
    addRep(state, 'R09');
  }
  // archive:521–522 recent disasters → R11
  const recentDisasters = state.disasterLog.filter(w => state.week - w < 5).length;
  if (recentDisasters >= 3) addRep(state, 'R11');
  // archive:523 uses disSurvived; modular approximates with disasterLog length
  // (R10 was already granted this way pre-Phase-2 — keep stable for AC1).
  if (state.disasterLog.length >= 2) addRep(state, 'R10');
  // archive:524 — Old Bull fully warm
  const bull = findAlly(state, 'AL12');
  if (bull && bull.warm >= 3) addRep(state, 'R12');
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
    // archive:504 — addObl(S,'OB8') not free-text
    fire('G2', 'Boss crisis: kin scandal catches up with you.', () => {
      addObl(state, 'OB8');
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
