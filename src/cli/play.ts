/**
 * CANDIDATE ZERO — Thin interactive CLI
 * npm run play | npm run play -- --auto labor --weeks 8
 */

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  createCampaign,
  listPlayableHand,
  playFromHand,
  snapshot,
  startWeek,
  endWeekInPlace,
  type Campaign,
  CAMP_FILING_FEE,
  CAMP_PETITION
} from "../engine/loop.js";
import { getPhase } from "../engine/state.js";
import { STAMPS } from "../engine/resolve.js";
import { STRATEGIES } from "../engine/strategies.js";
import { pickDefaultGround } from "../engine/play.js";
import type { PlayCard } from "../engine/types.js";

function parseArgs(argv: string[]) {
  const out: { seed?: number; auto?: string; weeks: number; help?: boolean } = { weeks: 8 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--seed" || a === "-s") out.seed = Number(argv[++i]);
    else if (a.startsWith("--seed=")) out.seed = Number(a.slice(7));
    else if (a === "--auto" || a === "-a") out.auto = argv[++i];
    else if (a.startsWith("--auto=")) out.auto = a.slice(7);
    else if (a === "--weeks" || a === "-w") out.weeks = Number(argv[++i]);
    else if (a.startsWith("--weeks=")) out.weeks = Number(a.slice(8));
  }
  return out;
}

function costLabel(card: PlayCard): string {
  const c = card.cost;
  const parts: string[] = [];
  if (c.a) parts.push(`${c.a}AP`);
  if (c.$) parts.push(`$${c.$}`);
  if (c.vp) parts.push(`${c.vp}vol`);
  if (c.m) parts.push(`${c.m}mom`);
  return parts.join(" ") || "free";
}

function printBanner(): void {
  console.log("\nCANDIDATE ZERO — A Hot Texas Primary (modular CLI, not v0.1 yet)\n");
}

function printLedger(campaign: Campaign): void {
  const s = campaign.state;
  console.log("-".repeat(52));
  console.log(
    `Week ${s.week}/${s.weeksTotal}  Phase ${getPhase(s)}  AP ${s.ap}/${s.apMax}` +
      (s.ballot ? "  BALLOT: ON" : `  Sigs ${s.signatures}/${s.sigNeed}`)
  );
  console.log(`$${s.money}  contacts ${s.contacts}  nameID ${s.nameID}  vol ${s.volPool}  mom ${s.momentum}`);
  console.log("-".repeat(52));
}

interface MenuEntry {
  key: string;
  handIndex: number;
  card: PlayCard;
  camp: boolean;
}

function buildMenu(campaign: Campaign): MenuEntry[] {
  return listPlayableHand(campaign).map((p, i) => ({
    key: String(i + 1),
    handIndex: p.index,
    card: p.card,
    camp: p.index === CAMP_PETITION || p.index === CAMP_FILING_FEE
  }));
}

function printMenu(entries: MenuEntry[], campaign: Campaign): void {
  if (!entries.length) {
    console.log("No playable cards. Press e to end week.");
    return;
  }
  console.log("Playable:");
  for (const e of entries) {
    const p = e.card.odds?.(campaign.state, pickDefaultGround(campaign.state));
    const odds = p !== undefined ? ` p≈${(p * 100).toFixed(0)}%` : "";
    console.log(`  ${e.key}. ${e.card.n} (${e.card.risk}, ${costLabel(e.card)})${odds}${e.camp ? " [CAMP]" : ""}${e.card.trap ? " TRAP" : ""}`);
  }
  console.log("  e. End week   l. Ledger   h. Help   q. Quit");
}

async function interactiveWeek(campaign: Campaign, rl: readline.Interface): Promise<"ok" | "quit"> {
  startWeek(campaign);
  console.log(`\n=== Week ${campaign.state.week} (phase ${getPhase(campaign.state)}) ===`);
  printLedger(campaign);
  while (campaign.state.ap > 0) {
    const entries = buildMenu(campaign);
    printMenu(entries, campaign);
    if (!entries.length) break;
    const answer = (await rl.question("> ")).trim().toLowerCase();
    if (answer === "q") return "quit";
    if (answer === "h" || answer === "?") {
      console.log("Numbers play cards. Camp = always-on ballot path. e ends week.");
      continue;
    }
    if (answer === "l") { printLedger(campaign); continue; }
    if (answer === "e") break;
    const entry = entries.find(en => en.key === answer);
    if (!entry) { console.log("Unknown."); continue; }
    const outcome = playFromHand(campaign, entry.handIndex);
    if (!outcome.ok) { console.log(outcome.reason); continue; }
    console.log(`  [${outcome.stamp ?? STAMPS[outcome.tier ?? 2]}] ${outcome.cardName}: ${outcome.text}`);
  }
  endWeekInPlace(campaign);
  return "ok";
}

function autoPlay(campaign: Campaign, strategyName: string, weeks: number): void {
  const choose = STRATEGIES[strategyName];
  if (!choose) {
    console.error("Unknown strategy", strategyName);
    process.exitCode = 1;
    return;
  }
  console.log(`Auto: ${strategyName} through week ${weeks}`);
  while (campaign.state.week <= weeks && !campaign.state.over) {
    startWeek(campaign);
    let guard = campaign.state.apMax * 4 + 4;
    while (campaign.state.ap > 0 && guard-- > 0) {
      const playable = listPlayableHand(campaign);
      if (!playable.length) break;
      const idx = choose(playable, campaign.state);
      if (idx == null) break;
      const outcome = playFromHand(campaign, idx);
      if (outcome.ok) console.log(`W${campaign.state.week} [${outcome.stamp}] ${outcome.cardName}: ${outcome.text?.slice(0, 80)}`);
      else break;
    }
    endWeekInPlace(campaign);
  }
  console.log("\nFinal:", snapshot(campaign.state));
  console.log(campaign.state.ballot ? "On the ballot." : "Not on the ballot.");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("npm run play [--seed N] [--auto labor|money|hybrid|grind] [--weeks N]");
    return;
  }
  printBanner();
  const seed = args.seed ?? (Date.now() % 1_000_000);
  const campaign = createCampaign({ seed });
  console.log("Seed:", seed);
  if (args.auto) {
    autoPlay(campaign, args.auto, args.weeks);
    return;
  }
  const rl = readline.createInterface({ input, output });
  try {
    while (campaign.state.week <= 24 && !campaign.state.over) {
      if (campaign.state.week === 9 && !campaign.state.ballot) console.log("*** Filing deadline missed ***");
      if ((await interactiveWeek(campaign, rl)) === "quit") break;
      printLedger(campaign);
      const cont = (await rl.question("Enter next week, q quit> ")).trim().toLowerCase();
      if (cont === "q") break;
    }
    console.log("\nEnded:", snapshot(campaign.state));
  } finally {
    rl.close();
  }
}

main().catch(err => { console.error(err); process.exitCode = 1; });
