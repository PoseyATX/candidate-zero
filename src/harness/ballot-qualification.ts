/**
 * Ballot-by-Week-8 Qualification Harness
 * Primary early-game balance metric for the labor (Petition Drive) path.
 * Imports the real PL04 card + resolve engine directly (no hand-duplicated
 * copy) so this can never silently drift from src/data/plays.ts.
 *
 * 2026-07-17 re-tune targets (see docs/BALANCE-NOTES.md):
 *   labor should reach the ballot in well under half the 8-week primary,
 *   leaving real AP for primary-win stats afterward; deadline still has
 *   some teeth for the totally unorganized (vol=0) case.
 */

import { createNewState } from '../engine/state.js';
import { executePlay } from '../engine/play.js';
import { PL04_PetitionDrive } from '../data/plays.js';
import type { GameState } from '../engine/types.js';

function simulatePetitionPath({
  volPool = 0,
  trials = 5000,
  deadline = 8,
  sigNeed = 450
}: { volPool?: number; trials?: number; deadline?: number; sigNeed?: number } = {}) {
  let successes = 0;
  let totalWeeks = 0;
  let totalDisasters = 0;
  let missCount = 0;

  for (let i = 0; i < trials; i++) {
    const state: GameState = createNewState({ volPool, sigNeed, ap: 2, apMax: 2 });
    let week = 1;
    let disasters = 0;
    while (state.signatures < sigNeed && week <= deadline) {
      for (let a = 0; a < 2 && state.signatures < sigNeed; a++) {
        const outcome = executePlay(state, PL04_PetitionDrive);
        if (outcome.tier === 3) disasters++;
      }
      week++;
      state.week = week;
      state.ap = state.apMax;
    }
    if (state.signatures >= sigNeed) {
      successes++;
      totalWeeks += week - 1;
    } else {
      missCount++;
    }
    totalDisasters += disasters;
  }

  return {
    successRate: +((successes / trials) * 100).toFixed(1),
    avgWeekOnSuccess: successes ? +(totalWeeks / successes).toFixed(2) : null,
    missRate: +((missCount / trials) * 100).toFixed(1),
    avgDisastersPerRun: +(totalDisasters / trials).toFixed(2),
    trials
  };
}

console.log('=== BALLOT QUALIFICATION BY WEEK 8 (real PL04 via pure engine) ===\n');
[0, 1, 2, 3, 4, 6].forEach(v => {
  console.log('volPool=' + v + ':', simulatePetitionPath({ volPool: v }));
});
console.log('\nDesign targets: unorganized paths have real miss risk; organized paths stay rewarding; deadline has teeth.');
