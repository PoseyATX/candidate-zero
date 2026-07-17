/**
 * Multi-strategy multi-week harness
 * Runs labor / money / grind / hybrid policies through the filing deadline
 * using the real pure engine (deck + hand + play + week advance).
 */

import {
  createCampaign,
  runWeek,
  snapshot,
  type LedgerSnapshot
} from '../engine/loop.js';
import { STRATEGIES } from '../engine/strategies.js';

const TRIALS = Number(process.env.CZ_TRIALS ?? 400);
const THROUGH_WEEK = 8;

interface TrialResult {
  ballot: boolean;
  ballotWeek: number | null;
  final: LedgerSnapshot;
  disasters: number;
  plays: number;
}

function runOneTrial(strategyName: string): TrialResult {
  const choose = STRATEGIES[strategyName];
  if (!choose) throw new Error(`Unknown strategy ${strategyName}`);

  const campaign = createCampaign();
  let ballotWeek: number | null = null;
  let plays = 0;

  while (campaign.state.week <= THROUGH_WEEK && !campaign.state.over) {
    const wasBalloted = campaign.state.ballot;
    const weekNum = campaign.state.week;
    const report = runWeek(campaign, choose);
    plays += report.plays.filter(p => p.ok).length;
    if (!wasBalloted && campaign.state.ballot) {
      ballotWeek = weekNum;
    }
  }

  return {
    ballot: campaign.state.ballot,
    ballotWeek,
    final: snapshot(campaign.state),
    disasters: campaign.state.disasterLog.length,
    plays
  };
}

function summarize(name: string, trials: TrialResult[]) {
  const n = trials.length;
  const balloted = trials.filter(t => t.ballot);
  const ballotRate = (balloted.length / n) * 100;
  const avgBallotWeek =
    balloted.length > 0
      ? balloted.reduce((s, t) => s + (t.ballotWeek ?? 0), 0) / balloted.length
      : null;
  const avgContacts = trials.reduce((s, t) => s + t.final.contacts, 0) / n;
  const avgMoney = trials.reduce((s, t) => s + t.final.money, 0) / n;
  const avgVol = trials.reduce((s, t) => s + t.final.volPool, 0) / n;
  const avgSigs = trials.reduce((s, t) => s + t.final.signatures, 0) / n;
  const avgName = trials.reduce((s, t) => s + t.final.nameID, 0) / n;
  const avgDisasters = trials.reduce((s, t) => s + t.disasters, 0) / n;
  const avgPlays = trials.reduce((s, t) => s + t.plays, 0) / n;

  return {
    strategy: name,
    trials: n,
    ballotByWeek8: +ballotRate.toFixed(1),
    avgBallotWeek: avgBallotWeek !== null ? +avgBallotWeek.toFixed(2) : null,
    avgContacts: +avgContacts.toFixed(1),
    avgMoney: +avgMoney.toFixed(0),
    avgVol: +avgVol.toFixed(2),
    avgSignatures: +avgSigs.toFixed(1),
    avgNameID: +avgName.toFixed(1),
    avgDisasters: +avgDisasters.toFixed(2),
    avgPlays: +avgPlays.toFixed(1)
  };
}

console.log('=== CANDIDATE ZERO — Multi-Strategy Week-1–8 Harness ===');
console.log(`Trials per strategy: ${TRIALS} | Through week: ${THROUGH_WEEK}`);
console.log('Engine: pure deck + hand + play + week loop\n');

const names = ['labor', 'money', 'hybrid', 'grind'] as const;
const results = names.map(name => {
  const trials: TrialResult[] = [];
  for (let i = 0; i < TRIALS; i++) trials.push(runOneTrial(name));
  return summarize(name, trials);
});

for (const row of results) {
  console.log(row);
}

console.log('\nDesign read:');
console.log('- labor: should ballot often via petition (deadline tension still real)');
console.log('- money: should ballot when Fish Fry banks the fee');
console.log('- hybrid: flexible; ballot rate between labor and grind');
console.log('- grind: control — low ballot rate by design (missed filing)');
console.log('\nHarness complete.');
