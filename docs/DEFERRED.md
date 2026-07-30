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
| A2 | **Session's named prize never fires.** `session_law` appeared 0 times in 6000 runs; ~7% after the stall fix. Act III is named for a payoff that essentially does not happen. Flagged **four times** without action. Now **23.8% → 53.2% of sessions**; see the note below, including the diagnosis I got wrong first. | §7, §18 | DONE |
| A3 | **Session standing decay is invisible.** A pure odds-maximiser never plays casework and gets primaried 100% of the time. The card-level signal actively fights the real one. I put it in the tutorial and called it done. | §8 | OPEN |
| A4 | **Heat persists across stage transitions.** Nobody decided this; it fell out of `bankHeat` being the only writer. Closed by the A2 work — it turned out to be A2's actual cause, not a separate cosmetic issue. | §9 | DONE |
| A5 | **You can cut a card you just practised.** No guard, no warning. "Left alone deliberately." | §10 | OPEN |
| A6 | **Nine forced full-screen dismissals per run** (≈3 act splashes + 6 weather dialogs). I fixed the z-index layering and left the frequency. | §21 | OPEN |
| A7 | **Press visibility on locked cards was never actually run.** I verified it by *reading the condition* and wrote "honest gap" instead of constructing the case. | §"Verified but untested" | OPEN |
| A8 | **206 unreferenced exports.** I scanned, decided most were false positives, and dropped it without separating the real dead code from the named-card exports. | this session | OPEN |
| A9 | **The rival system.** Asked for; I built the *poach* and used "rival" language for it. Called out. | this session | DONE |
| A10 | **Play result covered the cards and auto-faded.** | this session | DONE |
| A11 | **Dossier emblem plate pushed the description below the fold.** Flagged with "you asked for text" rather than fixed; fixed in the layout pass. | this session | DONE |

## A-bis. Reported by the owner, 2026-07-30

| # | Item | Status |
|---|---|---|
| D1 | **Persona signature cards "never drawn".** They were drawn every run — `injectIntoDrawPile` PUSHES, so the one card exclusive to your persona sat at position 26 of 27 and first surfaced at **median week 6** of an 8-week primary, unmarked and indistinguishable from every other card. Implemented, invisible, therefore non-existent. Now injected near the top (median week 1) and badged **Signature**. | DONE |
| D2 | **No way to see your own deck.** You saw five cards in hand and guessed at the rest. Dossier now lists the physical deck with duplicate counts. | DONE |
| D3 | **Attributes explained nothing.** The dossier showed "CHA 14" and nothing anywhere said what 14 bought. Tapping a chip now gives the engine's real arithmetic. | DONE |
| D4 | **Export sent a persona, not a person.** Your opponent faced "The Teacher". There is now a name field, persisted. | DONE |

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
| C5 | **Transport** — PARTIAL. Two people passing a block of text is a real transport, and it is now in the dossier: *Copy my campaign* / *Paste an opponent*. Still no network layer, matchmaking or lobby; when one arrives it replaces `exportMyProfile`/`importOpponent` and nothing else. | PARTIAL |
| C6 | **Asymmetric information UI** — DONE. A human opponent renders differently to the synthetic one: their name and record, **which of their weeks you are looking at** and whether it is stale, the public facts (name ID, momentum, endorsements, ballot, visible organisation), and — named out loud — the fog: *you cannot see their hand, their deck, their bankroll, what they will play next*. Listing the fog is more honest than leaving the player to wonder whether the opponent is reading their hand. | DONE |
| C7 | **Cheat resistance** — PARTIAL. `strength` was sent and trusted, so one edited number handed your opponent an unwinnable race. It is now discarded on receipt and re-derived from public facts, and everything off the wire is clamped to legal ranges via `normaliseRivalProfile`. Remaining hole, stated plainly: the underlying facts are still self-reported, so a determined cheat can inflate `nameID` instead, and per-ground presence is taken on trust. Closing that needs server-side derivation from an authoritative replay, or signing. | PARTIAL |

---

## A2 — and the wrong diagnosis I shipped first

Worth writing down because the failure mode is the one that keeps recurring here:
**I measured on a path the player never takes, and believed the number.**

My first diagnosis was that the pipeline's week gates (2/4/6/9/11/13) sat later than bills
actually arrived, so a bill that had done everything right waited at doors that did not
exist yet. I realigned the gates, exempted rules-imposed waits from stall heat at every
stage rather than at Calendars only, and measured **21.5% → 44.1%**. That probe called
`enterSession()` on a fresh state.

On the real `runFullCampaign` path the same change measured **22.5% → 24.1%**, with an SE
on the difference of 3.0pp. Noise. The gate work was worth doing on fairness grounds — the
game should not charge you heat for obeying its own calendar — and it is still in. But it
did not fix A2, and for a while I believed it had.

**The actual cause.** Bill heat was a one-way ratchet: thirteen writers, one reducer (a
conditional gift card, −1, once). Three separate sources each added +1 per week across a
14-week session, and `billOdds` charges 5 points of odds per point of heat against a 0.9
ceiling, while the Governor's veto roll charges 2 more. Median final bill heat on the real
path was **18** — −90 points of advance odds and a veto roll pinned to its 0.55 cap by
mid-session, no matter how well the bill was played. The pipeline was not difficult. It was
arithmetically closed.

**The fix.** One writer (`addBillHeat`) and one reducer (`coolBill`), a `MAX_BILL_HEAT` cap,
and — the load-bearing part — a bill that clears a stage sheds heat. "This thing is stalled"
is the complaint heat models, and it should not survive the bill moving.

Decomposed, so nobody credits the wrong lever (n=800 runs / 252 sessions, SE ≈3pp):

| | law rate | median final heat |
|---|---|---|
| neither | 23.8% | 18 |
| cap only | 27.0% | 12 |
| cap + cool 1 | **49.6%** | 6 |
| cap + cool 2 | 55.6% | 3 |
| cap + cool 3 | 58.7% | 1 |

The cap alone is barely a standard error. `COOL_ON_ADVANCE = 1` is the chosen value because
it is the last one where **heat still hurts** — a median of 6 is −30 points of odds — while
leaving a well-driven bill near a coin flip. At 3 the headline number is best and the
mechanic is dead; passing a law should be an achievement, not a formality.

Guarded three ways in `harness:session`: the cap, the cool-on-advance (and that retreating
does *not* cool, so it is not an exploit), and a live band asserting the law rate stays
between 25% and 75% of sessions. A number nobody asserts drifts back.

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
