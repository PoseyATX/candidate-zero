# Deferred work — everything I flagged and did not do

Written 2026-07-30 at the project owner's demand, after he pointed out that I had been
handing back "YOUR CALL" and "flagged so the choice is on the record" instead of building.
That pattern is the problem this file exists to end.

**Ground rule from here on:** an item leaves this file by being *built*, or by the owner
explicitly killing it. "Flagged" is not a resolution. Where a decision genuinely needs his
taste rather than my judgement, I build the version I think is right, measure it, and put
the lever where he can move it — I do not stop and wait.

Status values: **OPEN** · **IN PROGRESS** · **DONE** · **KILLED** (owner's call).

---

## A. Things I raised and then left alone

| # | Item | Where | Status |
|---|---|---|---|
| A1 | **Pressing is EV-neutral.** Two independent measurements agree heat/press buys drama, not advantage. I listed three options and took none. | `PLAYTEST-2026-07.md` §6 | OPEN |
| A2 | **Session's named prize never fires.** `session_law` appeared 0 times in 6000 runs; ~7% after the stall fix. Act III is named for a payoff that essentially does not happen. Flagged **four times** without action. | §7, §18 | OPEN |
| A3 | **Session standing decay is invisible.** A pure odds-maximiser never plays casework and gets primaried 100% of the time. The card-level signal actively fights the real one. I put it in the tutorial and called it done. | §8 | OPEN |
| A4 | **Heat persists across stage transitions.** Nobody decided this; it fell out of `bankHeat` being the only writer. | §9 | OPEN |
| A5 | **You can cut a card you just practised.** No guard, no warning. "Left alone deliberately." | §10 | OPEN |
| A6 | **Nine forced full-screen dismissals per run** (≈3 act splashes + 6 weather dialogs). I fixed the z-index layering and left the frequency. | §21 | OPEN |
| A7 | **Press visibility on locked cards was never actually run.** I verified it by *reading the condition* and wrote "honest gap" instead of constructing the case. | §"Verified but untested" | OPEN |
| A8 | **206 unreferenced exports.** I scanned, decided most were false positives, and dropped it without separating the real dead code from the named-card exports. | this session | OPEN |
| A9 | **The rival system.** Asked for; I built the *poach* and used "rival" language for it. Called out. | this session | DONE |
| A10 | **Play result covered the cards and auto-faded.** | this session | DONE |
| A11 | **Dossier emblem plate pushed the description below the fold.** Flagged with "you asked for text" rather than fixed; fixed in the layout pass. | this session | DONE |

## B. Things I never surfaced at all but knew about

| # | Item | Status |
|---|---|---|
| B1 | **Toast delta numbers were invisible** — `#e8d48a` on parchment, measured **1.02:1**. Every ledger figure the deltas feature existed to show had been rendering as blank space since I built it. Found only when I finally screenshotted the toast. | DONE |
| B2 | **`state.rivals` was dead** — populated at setup, read by nothing, for the whole project. `BALANCE-NOTES.md:441` recorded it and I walked past it repeatedly. | DONE |
| B3 | **WCAG 1.4.10 reflow failed at 320px** on every screen. axe was clean, so I never looked. | DONE |
| B4 | **Bottom nav was a 34px tap target** — the most-tapped control in the game. | DONE |
| B5 | **Unmerged work.** Commits have been piling up on `claude/promo-card-art-fix-qdurxc` while `main` sits at `33d23f7`, because I kept saying "I will not merge without your say-so" instead of asking once and acting. | OPEN |

## C. Multiplayer — the actual roadmap

The owner's framing: the allies and rivals systems are step one toward slow,
asynchronous **head-to-head** play, where each player's opposition is the other
player's candidate.

| # | Item | Status |
|---|---|---|
| C1 | **Rival profile seam** — a versioned, public-information-only JSON description of an opposing campaign; single player runs through the same pathway so it is never a cold codepath. | DONE |
| C2 | **Cross-client determinism** — opponent moves derived from (profile, week) alone, so two clients agree without exchanging RNG state. Harness proves it and proves it *fails* when broken. | DONE |
| C3 | **Send side** — `profileFromCampaign` builds what crosses to the opponent. Leakage guarded by an allow-list test. | DONE |
| C4 | **Match state** — `engine/match.ts`. Two careers pointed at each other; each side publishes a week, frozen once posted. The load-bearing rule: **you are never blocked** — you face the most recent week your opponent published at or before yours, so a slow opponent costs you nothing. No forfeit, no timer; `matchStanding` reports a stall so a caller can nudge, and that is all. | DONE |
| C5 | **Transport** — still no network layer, matchmaking or lobby. A `MatchState` is plain JSON; moving it between two people is deliberately somebody else's problem. | OPEN |
| C6 | **Asymmetric information UI** — showing what you legitimately know about a human opponent, and *not* showing what you do not. The engine already refuses to show a week they have not reached in your timeline; nothing renders any of it yet. | OPEN |
| C7 | **Cheat resistance** — PARTIAL. `strength` was sent and trusted, so one edited number handed your opponent an unwinnable race. It is now discarded on receipt and re-derived from public facts, and everything off the wire is clamped to legal ranges via `normaliseRivalProfile`. Remaining hole, stated plainly: the underlying facts are still self-reported, so a determined cheat can inflate `nameID` instead, and per-ground presence is taken on trust. Closing that needs server-side derivation from an authoritative replay, or signing. | PARTIAL |

---

## Notes on the two DONE items from this round

**A10 / the play result.** It now waits for the player instead of fading itself, and it does
not cover the hand: space is reserved and the panel scrolls the covered card clear. A
transparent full-screen catcher makes the next click count as "read" rather than landing on
a card, so one tap continues. Gated in `smoke:ui`: raises a toast, covers zero cards,
survives 3.4s, one click clears it, and that click does not fall through.

**C1–C3 / the multiplayer seam.** `engine/rival-profile.ts`. Three rules it enforces:
public information only, deterministic across clients, versioned. The desync harness caught
a real bug immediately — magnitude was on the profile stream but `ground_game`'s target pick
was still drawing from the global one, so two clients would have agreed on how hard the
opponent worked and disagreed about *where*. That is the exact class of bug that makes async
PvP quietly unplayable, and it would not have shown up in any single-player test.
