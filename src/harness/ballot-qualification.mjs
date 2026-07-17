/**
 * Ballot-by-Week-8 Qualification Harness
 * Primary early-game balance metric for the labor (Petition Drive) path.
 *
 * Tuned 2026-07-16 targets:
 *   vol=0  ~91% success, ~9% miss, avg week ~6.2
 *   vol=2  ~94–95% success
 *   vol=4+ ~97%+ success
 *
 * Design intent: unorganized paths feel real deadline pressure;
 * organized labor paths remain rewarding; filing deadline has teeth.
 */

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function resolve(p, risk, stateTier = 0) {
  p = clamp(p, 0.02, 0.95);
  const critShare = risk === 'VOL' ? 0.3 : risk === 'SAFE' ? 0 : 0.18;
  let band = risk === 'SAFE' ? 0 : (0.04 + stateTier * 0.04) * (risk === 'VOL' ? 2 : 1);
  const roll = Math.random();
  if (critShare > 0 && roll < p * critShare) return 0;
  if (roll < p) return 1;
  if (band > 0 && roll > 1 - band) return 3;
  return 2;
}

function petitionOnce(volPool) {
  const p = clamp(0.60 + volPool * 0.035, 0, 0.95);
  const t = resolve(p, 'STD');
  if (t === 0) return { sigs: 70 + Math.floor(Math.random() * 35), tier: 0 };
  if (t === 1) return { sigs: 40 + Math.floor(Math.random() * 25), tier: 1 };
  if (t === 2) return { sigs: 15, tier: 2 };
  return { sigs: -(50 + Math.floor(Math.random() * 45)), tier: 3 };
}

function simulatePetitionPath({ volPool = 0, trials = 5000, deadline = 8, sigNeed = 450 } = {}) {
  let successes = 0, totalWeeks = 0, totalDisasters = 0, missCount = 0;
  for (let i = 0; i < trials; i++) {
    let sigs = 0, week = 1, disasters = 0;
    while (sigs < sigNeed && week <= deadline) {
      for (let a = 0; a < 2 && sigs < sigNeed; a++) {
        const r = petitionOnce(volPool);
        sigs = Math.max(0, sigs + r.sigs);
        if (r.tier === 3) disasters++;
      }
      week++;
    }
    if (sigs >= sigNeed) { successes++; totalWeeks += (week - 1); }
    else missCount++;
    totalDisasters += disasters;
  }
  return {
    successRate: +(successes / trials * 100).toFixed(1),
    avgWeekOnSuccess: successes ? +(totalWeeks / successes).toFixed(2) : null,
    missRate: +(missCount / trials * 100).toFixed(1),
    avgDisastersPerRun: +(totalDisasters / trials).toFixed(2),
    trials
  };
}

console.log('=== BALLOT QUALIFICATION BY WEEK 8 (tuned Petition Drive) ===\n');
[0, 1, 2, 3, 4, 6].forEach(v => {
  console.log('volPool=' + v + ':', simulatePetitionPath({ volPool: v }));
});
console.log('\nDesign targets: unorganized paths have real miss risk; organized paths stay rewarding; deadline has teeth.');
