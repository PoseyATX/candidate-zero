/**
 * Where signature bills die — the Act III funnel.
 *
 *   npx tsx scripts/session-funnel.ts [runs]
 *
 * Two things this exists to stop me repeating, both of which cost real time on
 * the A2 fix:
 *
 * 1. **Measure the path the player actually takes.** The probe that produced my
 *    first (wrong) A2 diagnosis called `enterSession()` on a fresh state, and
 *    reported a 44.1% law rate where the real `runFullCampaign` path gave 24.1%.
 *    A bill carried in from a won general arrives poorer, hotter and later than
 *    one conjured at week 1. This driver runs full campaigns, only.
 *
 * 2. **`pipelineStage === -1` is a VETO, not "never filed."** My first histogram
 *    labelled it "dead / never filed", which hid the endgame bottleneck
 *    completely. The two are told apart here by `maxStage`: a bill that reached
 *    stage 7+ and ended at -1 died on the Governor's desk.
 *
 * Numbers are noisy at the default n. Compare against the SE printed below, not
 * against the last run — anything inside 2 SE is nothing.
 */
import { createCampaign, runFullCampaign } from '../src/engine/loop.js';
import { STRATEGIES } from '../src/engine/strategies.js';
import { createRng, setDefaultSeed, useRng } from '../src/engine/rng.js';
import type { CampaignOutcome, GameState } from '../src/engine/types.js';

const TRIALS = Number(process.argv[2] ?? 600);
let sessions = 0, law = 0, vetoed = 0, neverFiled = 0;
const died: Record<number, number> = {};
let reachedDesk = 0;
const favAtEnd: number[] = [];
const heatAtEnd: number[] = [];

for (let i = 0; i < TRIALS; i++) {
  const seed = 12_000 + i * 37;
  useRng(createRng(seed)); setDefaultSeed(seed);
  const c = createCampaign({ seed });
  let maxStage = -99;
  let sawSession = false;
  runFullCampaign(c, (p, st: GameState) => {
    if (st.stage === 'session') {
      sawSession = true;
      if (st.bill) maxStage = Math.max(maxStage, st.bill.pipelineStage);
    }
    return STRATEGIES.hybrid!(p, st);
  });
  if (!sawSession) continue;
  sessions++;
  const o = (c.state.outcome ?? '') as CampaignOutcome;
  const finalStage = c.state.bill?.pipelineStage ?? -99;
  if (o === 'session_law') { law++; reachedDesk++; }
  else if (finalStage === -1 && maxStage >= 7) { vetoed++; reachedDesk++;
    favAtEnd.push(c.state.favor); heatAtEnd.push(c.state.bill?.heat ?? 0); }
  else if (maxStage <= 0) neverFiled++;
  else died[maxStage] = (died[maxStage] ?? 0) + 1;
}
const pct = (n: number) => `${(100*n/Math.max(1,sessions)).toFixed(1)}%`;
console.log(`sessions: ${sessions} of ${TRIALS} runs`);
console.log(`  never filed a bill      ${String(neverFiled).padStart(4)}  ${pct(neverFiled)}`);
for (const k of Object.keys(died).map(Number).sort((a,b)=>a-b)) {
  console.log(`  stalled at stage ${k}      ${String(died[k]).padStart(4)}  ${pct(died[k]!)}`);
}
console.log(`  REACHED THE DESK        ${String(reachedDesk).padStart(4)}  ${pct(reachedDesk)}`);
console.log(`     -> signed into law   ${String(law).padStart(4)}  ${pct(law)}   (${(100*law/Math.max(1,reachedDesk)).toFixed(1)}% of bills that got there)`);
console.log(`     -> VETOED            ${String(vetoed).padStart(4)}  ${pct(vetoed)}   (${(100*vetoed/Math.max(1,reachedDesk)).toFixed(1)}% of bills that got there)`);
const med = (a:number[]) => { const s=[...a].sort((x,y)=>x-y); return s.length? s[Math.floor(s.length/2)] : 0; };
console.log(`  at veto: median favor ${med(favAtEnd)}, median bill heat ${med(heatAtEnd)}`);
const p = law / Math.max(1, sessions);
const se = Math.sqrt((p * (1 - p)) / Math.max(1, sessions));
console.log(
  `\nlaw: ${(100 * p).toFixed(1)}% of sessions  (SE ${(100 * se).toFixed(1)}pp — ` +
    `treat anything inside ${(200 * se).toFixed(1)}pp as noise)`
);
console.log(`law as share of ALL runs: ${(100*law/TRIALS).toFixed(1)}%`);
