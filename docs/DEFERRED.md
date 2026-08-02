# Deferred work — everything I flagged and did not do

Written 2026-07-30 at the project owner's demand, after he pointed out that I had been
handing back "YOUR CALL" and "flagged so the choice is on the record" instead of building.
That pattern is the problem this file exists to end.

**Ground rule from here on:** an item leaves this file by being *built*, or by the owner
explicitly killing it. "Flagged" is not a resolution. Where a decision genuinely needs his
taste rather than my judgement, I build the version I think is right, measure it, and put
the lever where he can move it — I do not stop and wait.

> **This file is a backlog, not a burndown.** Added 2026-08-02, because I turned it into one.
>
> Emptying this list is not the goal and never was. It is a record of debts worth paying,
> and paying them is maintenance — not progress. A session that closes five items here and
> adds no new play to the game is a session that accomplished nothing a player can meet.
>
> The project is a living exploration; the only completion that counts is **playable**. See
> the top of `AGENTS.md`. When there is a choice between closing an item on this list and
> building something new, **build the new thing.**

Status values: **OPEN** · **IN PROGRESS** · **DONE** · **KILLED** (owner's call).

---

## A. Things I raised and then left alone

| # | Item | Where | Status |
|---|---|---|---|
| A1 | **Pressing is EV-neutral.** Two independent measurements agree heat/press buys drama, not advantage. I listed three options and took none. **The two measurements were of nothing** — no automated path could press. Correctly measured, pressing is worth +2.6pp. See the note below. | `PLAYTEST-2026-07.md` §6 | DONE |
| A2 | **Session's named prize never fires.** `session_law` appeared 0 times in 6000 runs; ~7% after the stall fix. Act III is named for a payoff that essentially does not happen. Flagged **four times** without action. Now **23.8% → 53.2% of sessions**; see the note below, including the diagnosis I got wrong first. | §7, §18 | DONE |
| A3 | **Session standing decay is invisible.** A pure odds-maximiser never plays casework and gets primaried 100% of the time. The card-level signal actively fights the real one. I put it in the tutorial and called it done. Confirmed at 186/186, root-caused to one card, and fixed — see the note below. | §8 | DONE |
| A4 | **Heat persists across stage transitions.** Nobody decided this; it fell out of `bankHeat` being the only writer. Closed by the A2 work — it turned out to be A2's actual cause, not a separate cosmetic issue. | §9 | DONE |
| A5 | **You can cut a card you just practised.** No guard, no warning. "Left alone deliberately." | §10 | OPEN |
| A6 | **Nine forced full-screen dismissals per run** (≈3 act splashes + 6 weather dialogs). I fixed the z-index layering and left the frequency. | §21 | OPEN |
| A7 | **Press visibility on locked cards was never actually run.** I verified it by *reading the condition* and wrote "honest gap" instead of constructing the case. **The condition was right and the behaviour was wrong** — CSS defeated it. See the note below. | §"Verified but untested" | DONE |
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
| B6 | **The session catalog rewards spamming one card.** Found while fixing A3, stated rather than quietly fixed. Once SS12 stopped being the top-odds pick, an odds-following player simply moved to the next clean repeatable card (SS27 Ribbon-Cutting Circuit: SAFE, 0.85, +6 standing, and its own text advertises that it "never diminishes") and pinned district standing at 100 for 1430 of 1540 session turns. Unlike SS12 this is not strictly a trap — it trades the entire bill for the seat, and that bot passed a law 0% of the time — so it is a legitimate turtle rather than a lie. But "play the same card every turn" should probably not be the shape of any Act III, and the diminishing-returns pattern now in SS12 is the obvious answer if we want one. | OPEN |
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

## A7 — the condition was correct and the behaviour was wrong

This is the best argument in the whole file for why "verified by reading it" is not
verification.

I had checked A7 by reading the visibility rule, concluding it was right, and writing it down
as an honest gap. The rule *was* right:
`detailDraftOption === null && !locked && !!card.odds && quote.heat > 0`. It correctly set
`pressBtn.hidden = true` on every card that must not offer the wager.

**And the button stayed on screen anyway.** `.press-toggle { display: flex }` is an author
declaration, and author styles outrank the user agent's `[hidden] { display: none }`. Setting
`.hidden` set the attribute and changed nothing visible. So the press wager was offered on
every card in the game, including locked ones — where the Play button beside it is disabled
and the wager could never resolve — and at zero heat, where there is nothing to wager. No
condition was wrong. No test was failing. Reading the code could not have found it, because
the code was correct.

Two changes made it testable, then tested:

1. The inline expression became `pressOffered({ locked, isDraftOption, hasOdds, heat })`. It
   was awkward to construct precisely because it lived inside a DOM painter; as a pure
   function it is a six-line table in `harness:heat`.
2. `smoke:ui` constructs the real case, written as a **differential**: it drives the game
   until heat is banked *and* a locked card is on screen, then asserts the wager appears on a
   playable card and is absent on a locked one **in the same state**. Checking only the locked
   case would pass trivially whenever heat happened to be 0 — the exact failure mode this repo
   keeps producing. Plus the zero-heat case, which is true of every card in the opening hand
   and would have caught this on day one.

The fix is one rule: `.press-toggle[hidden] { display: none }`. Any author rule that sets
`display` on an element toggled via `.hidden` needs the same pair.

Getting here took three failed attempts at the test, each of which failed *loudly* rather than
passing: no locked card existed (`lockedCount=0`); Playwright refused to click a face carrying
`aria-disabled="true"` (advisory, not the `disabled` attribute — a real tap does open that
dossier, which the UI handles on purpose); and only then did the assertion report the actual
defect. A test that cannot construct its scenario must fail, not skip.

## The sponsor card was invisible, and the gate that "covered" it was green

Reported by the owner: *the promo card is not showing up.* It was two separate faults,
and the branch this work sits on is literally named `promo-card-art-fix`.

**Fault 1 — it rendered at 366 × 7px.** The base art rules absolutely position both the
plate (`.art-plate { position: absolute; inset: 0 }`) and the raster inside it, because the
old card was a fixed 2:3 portrait box for them to fill. The text-first row rewrite removed
that fixed box, and a full-bleed sponsor card has **no text of its own** to give the row
height. With plate and image both out of flow, the button collapsed to seven pixels. The
`.play-card.full-art` override set `height: auto` but never reset `position`, so it changed
nothing.

The cruel detail: the image loaded perfectly the whole time (`naturalWidth > 0`) and was
being painted into a zero-height container. Nothing errored. Nothing 404'd. It just was not
there. The dossier surface was fine throughout, because `.dossier-art-full` carries its own
`position: relative` and `aspect-ratio: 2/3` — so the card looked correct everywhere except
the one place you play it from.

**Fault 2 — over half its odds were spent in rooms it could not appear in.** The rarity roll
fired on every `startWeek`, including all 14 session weeks and the waiting season. Those
stages draw from their own always-available card sets (`SS*` / `WA*`), so a promo won there
was injected somewhere unreachable and then marked seen for the rest of the run. A full run
is ~8 primary + 6 general + 14 session weeks, so most of the card's lifetime chance was
being burned where it was invisible by construction. The roll now skips those stages.

**And the gate that was supposedly covering this.** `check:card-art` was green for the
entire life of the bug. It verifies the art file exists and is ≤500KB. It never asked
whether a human could see it — the same "my instrument measures nothing and passes" shape as
the duplicate-label selector, the `gp-cancel` click, and the non-touch tap before it.

Now covered properly:
- `smoke:ui` forces `?promo=PR01`, then asserts the art loads **and** that the rendered box is
  ≥200px tall. Verified by reverting the CSS fix: the card returns to exactly 7px, which the
  assertion fails on.
- `harness:promo` is new — the promo system had **zero** engine tests. It checks that each
  registered promo can be forced in, lands at most once per run, stays out of normal pools via
  `show:false` while remaining visible and playable once held, never burns its roll during
  session or waiting, and fires at its advertised rate (measured 0.100% against a stated
  0.100%, SE 0.022pp).

Left alone deliberately: `promoRate` itself. Even fully fixed, 0.1% per campaign week over
~14 campaign weeks means PR01 appears in roughly **1.4% of runs** — that is the advertised
"extreme rarity", and how often a sponsor's card should surface is the owner's call, not
mine. The lever is one number in `src/data/promo-plays.ts`.

## A1 — two independent measurements of nothing

"Two independent measurements agree heat/press buys drama, not advantage." They did agree.
They were both measuring a mechanic that could not fire.

`runWeek` called `playFromHand(campaign, handIndex)` with **no opts**, and `PlayOpts.press` is
the only way to press. So no harness, no strategy, and no CLI auto-run could press — press was
reachable from the UI and nowhere else. Every "press policy vs never pressing" comparison ever
run in this repo compared two identical runs, which is why they agreed so nicely. It is the
same lesson C1 wrote down for the multiplayer seam: *if the single-player path does not run
through the seam, the seam is a cold codepath and every claim about it is unfalsifiable.*

**The fix to the mechanism.** `Chooser` may now return `{ index, press }` as well as a bare
number, and all three play loops in the repo (`runWeek`, the grounds harness, the CLI) read it
through one shared `normalizeChoice`. Bare numbers stay legal, so no existing strategy changed.

**What it actually measures now** (hybrid strategy, n=5000 per arm, win = won_general or any
session outcome):

| policy | win rate | Δ vs never | verdict at 2 SE (1.9pp) |
|---|---|---|---|
| never press | 33.6% | — | — |
| press at 1+ | 35.0% | +1.4pp | noise |
| press at 2+ | 35.2% | +1.7pp | noise |
| press at 3+ | 34.9% | +1.4pp | noise |
| **press at 4 only** | **36.2%** | **+2.6pp** | **real** |
| SAFE only, 1+ | 35.7% | +2.2pp | real |

So pressing is *not* EV-neutral, and the best policy is **hold to full heat and cash in** —
precisely what the superlinear `PRESS_ODDS` curve was written to produce. The design was
working the whole time; the instrument was disconnected.

**The option I tested and rejected.** The obvious "make it matter more" lever is a bigger
payout. Raising full-heat odds 0.24 → 0.34 (and widening the band to match) left the edge at
~+3pp — inside noise of the current curve. Opportunity is not the constraint either: heat sits
at the cap on **25%** of all decision points. The ceiling is structural — one play's odds only
propagates so far into a win rate — so the curve stays where it is rather than being inflated
for a number that does not move. That is a decision, not a deferral.

**Guarded** in `harness:heat` two ways: a deterministic check that a pressing chooser actually
logs presses through `runWeek` while a non-pressing one logs none (this is the bug that hid for
the whole project), and a small-n EV probe asserting that holding to full heat is not a *trap*.
The EV assertion is deliberately weak — at gate-sized n it can only catch an inversion, and the
honest effect size lives in the table above.

## A3 — the game printed a signal that pointed at a trap

The note said "a pure odds-maximiser never plays casework and gets primaried 100% of the
time." That turned out to be exactly true — **186 primaried out of 186 sessions**, median
final district standing 34 against a healthy 61 — but for a sharper reason than "the signal
is vague."

**An instrument correction first.** My first probe returned `{card}` from the chooser, where
the engine expects an **index**. So it played nothing at all, and its casework counter read
`undefined` for every strategy. It still printed 100%, which is the dangerous part: a broken
instrument that agrees with your hypothesis. The corrected probe adds a `never acts` control
(reaches 0 sessions, because a player who does nothing never wins the general) so "the bot
did nothing" can no longer masquerade as a finding.

**The root cause was one card.** `SS12 Study the Rules` was SAFE, carried the highest odds in
the session catalog (0.90), was repeatable without limit, was strictly positive, and its own
description bragged that it was *"quietly one of the best cards in the session… with no
downside at all."* A player following the number printed on the card faces played it **27 of
28 session turns** and lost the seat every time. That is a Covenant 6 breach — power is never
clean — with the game itself advertising the trap.

**Diminishing the reward alone did not work, and the measurement said so.** After the payoff
decayed, the bot's behaviour did not change at all: it picks on `odds`, and the face still
said 0.90. The signal was still lying, just about a worse card. The odds had to fall too —
"will I find something new in a book I have read three times" is honestly a worse bet.
With both in place SS12 dropped from 1485 picks to 55 (one per session).

**And the visibility half.** `districtStanding` was plumbed all the way into the goal strip's
input and consulted by **no rule** — the same computed-but-never-consulted shape as
`state.rivals` (B2) and the count-up comparison before it. The strip discussed the pipeline
while the seat bled out. `challengerHeat` — worth 3.5 points of reelection each in the final
verdict — appeared nowhere in the UI at all, only in a weekly log line that scrolls away.
Both are now surfaced: a `session_seat` goal key that outranks the bill copy (losing the seat
ends the run; a stalled bill does not) but *not* the no-AP copy, and a warned District cell
plus a challenger row in the HUD ledger.

Tuned by measurement, not taste: the seat key fires on **15.9%** of session decision points —
present when it matters, and still leaving 80% of the strip to the pipeline, so it does not
become wallpaper. The 58-point threshold matches the engine's own (the challenger starts
fundraising under 52), which leaves weeks to answer rather than announcing a loss already
sealed. The warn red is `#ef7a68`, **measured 6.22:1** on the ledger walnut — B1 shipped a
1.02:1 delta that was invisible for the life of the feature, so this one got a contrast check
rather than an eyeball.

Guarded in `harness:session`: the strip must select `session_seat` on soft standing and on
challenger heat, must not cry wolf on a healthy seat, must lose to the no-AP copy, must name
the actual number and name casework as the answer — and SS12's odds must decay with reads
while never becoming a dead card.

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
