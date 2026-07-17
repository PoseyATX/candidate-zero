/**
 * Minimal smoke test: create state, play a short sequence of real catalog
 * cards through the real engine, advance a couple of weeks, and print the
 * resulting ledger. Imports src/engine + src/data directly (no hand-copied
 * logic) so it can never silently drift from the actual game rules.
 */

import { createNewState } from '../engine/state.js';
import { advanceCampaignWeek } from '../engine/calendar.js';
import { executePlay } from '../engine/play.js';
import { PL01_BlockWalk, PL05_PayFilingFee } from '../data/plays.js';
import { snapshot } from '../engine/loop.js';

const state = createNewState({ seed: 1, money: 500, volPool: 2 });
const ground = state.groundsArr[0]!;

console.log('=== CANDIDATE ZERO — Smoke Play Sequence ===');
console.log(`Start: week ${state.week}, money $${state.money}, contacts ${state.contacts}, ballot ${state.ballot}`);

function play(label: string, card: typeof PL01_BlockWalk): void {
  const outcome = executePlay(state, card, card.field ? ground : undefined);
  console.log(`${label}.`, outcome.ok ? `${outcome.stamp} — ${outcome.text}` : outcome.reason);
}

play('1', PL01_BlockWalk);
play('2', PL01_BlockWalk);
console.log('   AP left:', state.ap);
advanceCampaignWeek(state);
console.log(`Week ${state.week} begins. AP refreshed.`);

play('3', PL01_BlockWalk);
state.money = 1400;
play('4', PL05_PayFilingFee);
advanceCampaignWeek(state);
console.log(`Week ${state.week} begins. AP refreshed.`);

console.log('\n=== Final Ledger ===');
console.log({
  ...snapshot(state),
  rapport: ground.rapport,
  poolLeft: ground.pool
});
console.log('\nSmoke sequence complete. Pure cards + state factory + week advance are alive.');
