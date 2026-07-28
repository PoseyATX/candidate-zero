# Playtest pass — 2026-07-27

Five systems shipped without anyone playing them together: AP economy, rival opponent, contested
ground, card upgrades, heat/press, and hand cuts. Every balance number guarding them came from bots
that cannot judge "dead card" or "moment worth pressing," and every UI check was a script that
verified its own feature in isolation.

**What this pass is not.** I cannot tell you whether the game is fun, whether pressing feels good, or
whether the loop fires. That needs a human. This pass covers what is objectively broken or missing,
whether the systems reward knowing them, and where they collide.

Each finding is tagged **FIXED**, **YOUR CALL**, or **NOT FIXED**.

---

## 1. The systems do reward knowing them — FIXED (nothing to fix; measured)

I have said repeatedly that bots cannot demonstrate skill expression. That is true of a *naive* bot
and not of a systems-aware one, so I built both and compared over **1200 seeds each**.

| Policy | Win | Ballot | What it does |
|---|---|---|---|
| `naive` | 16.1% ±1.1 | 22.6% | first legal action, never cuts, never presses |
| `bestodds` | 22.4% ±1.2 | 28.2% | best odds, quiet ground, takes upgrade drafts |
| `aware_nocut` | 24.8% ±1.2 | 30.1% | + presses at heat ≥3 |
| `aware_nopress` | 28.4% ±1.3 | 33.8% | + cuts unplayable cards, no pressing |
| `aware` | 28.8% ±1.3 | 34.8% | everything |

**aware − naive = +12.8pp (SE of difference 1.7pp, 7.6 SE).** Decisive: playing the systems well
roughly doubles the win rate. They are not decoration.

Two things inside that number matter more than the headline:

- **Cuts are the strongest of the new systems.** `bestodds` → `aware_nopress` is +6.0pp, the largest
  single jump. Deck flow was the last lever I built and the one I had deprioritised.
- **Pressing contributes nothing measurable.** `aware_nopress` 28.4% vs `aware` 28.8% — a 0.4pp
  difference against a 1.8pp SE. This agrees with the earlier press-policy measurement and is an
  honest negative result about a system I built two commits ago and was pleased with. See §6.

---

## 2. The tutorial taught none of it — FIXED

Ten sections, and not one mentioned heat, pressing, cuts, upgrades, or rival pressure on ground.
"Your Week" still described the week as "5 AP plus turf, play until you're out, then End Week." A new
player had no path to learning five systems.

Added six sections (Cutting a Card, Heat and Pressing It, Practising a Card, Holding the Seat, plus
updated Your Week): 7 → 13 sections, 4.0 phone screens, back button reachable.

**The guard matters more than the copy.** `scripts/ui-smoke.mjs` now asserts one regex per system, so
the onboarding cannot silently rot behind the engine again — which is exactly what happened. I
verified the guard by deleting the heat section and confirming three assertions fail and `smoke:ui`
exits non-zero, rather than trusting that it would.

---

## 3. HUD lost a row to the new chips — FIXED

At 390×844 with heat and cuts both live, the HUD grew **70px → 95px and wrapped to three rows**,
orphaning the signature meter onto its own line and pushing a card row below the fold.

Cause was redundancy: each chip drew pips *and* a number ("◆◆ CUTS 2"), when the pips already are
the count. Dropped the trailing number. Back to **69px and two rows** with both chips live, signature
meter restored to row two. No horizontal overflow at any point.

---

## 4. Press toggle was under the tap-target guideline — FIXED

Measured at **33px** — under the 44px guideline, on the one control that commits a wager. Now 44px.
Play (72px), Cut (72px) and Back (52px) were already fine. The four-deep action stack occupies 34% of
the screen and Play remains above the fold.

---

## 5. "Campaign plays" rendered twice — FIXED

`act.kitLabel` was printed both as a hint line above the sections (`paint-play.ts:646`) and as the
Hand section's sub-label (`paint-play.ts:701`), so it appeared verbatim twice on every Act I screen.
Removed the first.

Worth noting how nearly this was missed: my first automated check reported "duplicates: none" because
its selector only looked at `.play-section-label`/`.play-section-sub` and the stray copy had class
`kit-label`. The screenshot showed it plainly. Automated layout checks are worth exactly as much as
their selectors.

---

## 6. Pressing does not pay — YOUR CALL

Two independent measurements now agree that heat/press is EV-neutral: the press-policy comparison
(all policies inside one SE) and §1 above (+0.4pp ±1.8 for a policy that presses well).

That is defensible as a *variance dial* — no policy dominates, so it is not power creep — and press
is the one system that gives a player something to do at the moment of the roll. But it currently
buys drama, not advantage, and a mechanic that never pays will eventually read as decoration.

Options, none of which I have taken: steepen the top of the curve so a max-heat press is a genuine
swing; let heat do something passive at max (risks becoming pity, so it would need care); or accept
it as pure texture and say so in the design docs. **This is a design call, not a tuning bug.**

---

## 7. Zero laws passed in 6000 runs — YOUR CALL

Across all five policies × 1200 seeds, `session_law` appeared **zero times**. Every Session that was
survived ended `session_survived`.

Caveat, stated plainly: none of my policies deliberately drive the bill pipeline, so this is partly
policy blindness. But the finding stands in a weaker and still important form — **a policy that plays
the highest-odds available Session card never passes a bill, in 6000 runs.** The bill is not
something you stumble into; it requires sustained, deliberate, non-obvious play.

This is the fourth time I have flagged Session's prize as rare. It is the payoff the whole Act is
named for.

---

## 8. In Session, the loudest number on the card is the wrong number — YOUR CALL

Found by accident: my first "aware" policy sorted by `approxOdds` and got **primaried 100% of the
time** while the naive policy survived. Skipping casework bleeds 2 district standing per week, and
reelection is `22 + standing×0.55 − challenger − freeze + noise`. A pure odds-maximiser never plays
casework (SS08, odds 0.85, beaten by higher-odds cards) and loses the seat every time.

The game does signal this — the goal strip says "casework holds the seat" — so this is not a missing
signal. But the *card-level* signal actively competes with it: the dossier headline reads "About 85
percent chance this succeeds right now," and nothing on the card says skipping it costs standing. The
drain is invisible until it has already happened.

Tutorial now says it outright ("the odds printed on a card are not the same thing as the value of
playing it"). Whether the mechanic itself needs a forward-facing signal — a standing-decay warning on
the HUD in Session, say — is yours.

---

## 9. Heat persists across stage transitions — YOUR CALL

Nothing resets `heat` at primary → general → session. A streak built in the last week of the primary
carries into the general. Nobody decided that; it is what falls out of `bankHeat` being the only
writer. Defensible either way — momentum carrying across an election is a fine fiction — but it
should be a decision.

---

## 10. You can cut a card you just practised — NOT FIXED

Cuts and upgrades have no interaction guard: you may pitch the card you spent a draft pick sharpening.
The cut button says nothing about it.

Left alone deliberately. Cutting a practised card is sometimes correct (it is dead *this* week and
comes back later — cuts return the card to the deck, not out of the run), so refusing would be wrong,
and a warning on a two-per-week action risks nagging. Flagged so the choice is on the record.

---

## Verified but untested

- **Press is correctly hidden on locked and odds-less cards** — verified by reading the visibility
  rule (`detailDraftOption === null && !locked && card.odds && heat > 0`), *not* by running it: no
  locked card appeared in the opening hand during the audit. Honest gap.
- **Cutting does not move heat** — asserted in `harness:flow` and confirmed through the real UI
  (2 heat pips before and after a cut).

## Gates at time of writing

34-harness chain, `smoke:ui` (45 assertions), `a11y` 0 critical/serious, typecheck, build,
`check:card-art`, `check:log-markers` — all green.

---

# Round 2 — alpha player notes, 2026-07-28

Direct player feedback: heavy scrolling to reach cards, phase-draft cards "smashed down to 1 letter",
no 1-AP cards to spend a 5-AP week on, and "clicking blindly… the interface is very cryptic as far as
what you are supposed to be doing."

## 11. My scroll measurement was wrong — CORRECTED

Round 1 reported "SCROLL page 844px vs screen 844px (1.00 screens), End Week reachable without
scrolling." The document does not scroll; `.mtab-panel` does (`styles.css`, `overflow-y: auto`). I
measured `document.scrollingElement`, got the fixed viewport height back, and reported "no scrolling"
about a screen that scrolled ~1.8×. The player was right and the instrument was pointed at the wrong
element. Every scroll number below measures `.mtab-panel`.

## 12. Card faces are text rows now — FIXED

`.play-card` was `aspect-ratio: 2/3; max-width: 172px` — a ~250px portrait card whose emblem owned
78% of the height, with the name clamped to two lines. Five of those is ~750px in a ~620px panel.

Replaced with a full-width row: **cost anchor** (big AP numeral, money/vol beneath), name at full
width, risk chip. Art is gone from the *list* and still renders in the dossier; sponsor full-bleed
cards (PR01) keep their art as a banner row.

Measured at 390×844: panel content **1103px → 621px in a 621px panel = 1.78 → 1.00 screens**. Cards
**172×258 → 366×64**. No name clipped. Minimum tap target 64px.

Three things blocked this and each had to be found separately:
- **`src/ui/card-lock.css`** — a "HARD LOCK" file loaded after `styles.css` forcing
  `aspect-ratio: 2/3 !important` and a 3-row art/name/cost grid. Its stated purpose ("art plate size
  never changes with title length") died with the art. Rewritten; the promo and full-bleed rules are
  what survived.
- **`.card-grid { align-items: start }`** on a column flex container made every section shrink-wrap,
  capping rows at ~63% of the panel with dead space to the right.
- **`.name { order: 2 }`**, left from the portrait stack, put the tagline *above* the title.

## 13. The squashed draft was the container, not the cards — FIXED

`#draft.card-grid` resolved to `grid-template-columns: 1fr 1fr`. The heading spans both columns
(`.card-grid > .hint`), so the card container landed in **one** of them and every draft card rendered
at half width — hence "Charter the…". The inner `.draft-cards` grid was never the problem, and my
first fix targeted the wrong rule (a later declaration in the same block silently won). Now single
column at every width.

## 14. A 5-AP week bought 2.7 plays — FIXED

The catalog has 12 one-AP cards; the *starter deck* had two, and one of those (Yard Signs) also wants
$150 against a $200 opening bankroll.

| | before | after |
|---|---|---|
| deck size | 18 | 26 |
| cards ≤1 AP | 4 (22%) | 11 (42%) |
| mean AP | 1.83 | 1.62 |
| plays per 5-AP week | 2.7 | **3.1** |

Added `PL80`/`PL84`/`PL83` ×2 each — 1 AP, cash-free, phase-1 legal, ungated.

**This is where measuring mattered.** Six extra cards dropped the money path's week-8 ballot rate from
**72% to 47%**, by thinning both the filing fee (PL05) and the fundraiser that pays for it (PL13).
`ensureBallotAccessInHand` is no help — it prefers PL04, so the labor door gets the net and the money
door does not. One more of each restored it.

Final week-8 ballot rates (400 trials, SE ~2.4pp) vs baseline: labor **87** (84.5), money **68.5**
(72), hybrid **94.8** (94), grind **26.8** (31.3). Every path within ~2 SE, and the grind control did
not get easier. A *second* PL13 fixed money outright (85.5%) but pushed grind to 45% — keeping what
little tension Act I has beat closing a 3.5pp gap.

## 15. "Clicking blindly" — FIXED

The per-play toast was pure flavour: `Petitions: GAIN. Bank it.` The ledger moved; the screen never
said by how much. Every play now reports what it actually moved — `+74 signatures`, `+6 contacts`,
`−$150` — in the toast and the log line, alongside the flavour rather than instead of it.
`buildPlayFeedback` already took a `before` snapshot for milestones, so this extends that path
(`ledgerMark` / `formatDeltas` in `src/engine/feedback.ts`). Internal to the engine — no host API
change.

## 16. The draft screenshot — GAP NOW CLOSED

Round 2 shipped with this unverified, and it is worth recording why it was hard and what it caught.

Drafts fire on a *phase* change, and `getPhase` returns 1 until you are on the ballot and 2 after —
so **reaching the ballot is the trigger**. My drivers kept missing it because they wandered instead of
driving at the ballot doors. Once pointed there (seed 11), the draft lands at W7.

Measured: 3 options at **366×67, 366×67, 366×64** — full width, and "Statewide Figure Endorses" reads
whole. Before the row change that name was exactly the sort that became "Statewide Figure…".

Chasing the picture caught a regression the construction argument would never have found: the
**"PRACTISED · −1 AP" banner was still `position: absolute; top: 0`** from the portrait layout, so on
a 64px row it sat directly on top of the card's name. It is an inline chip in the row body now. The
rule holds — "verified by construction" is not the same as looking at it.


---

# Round 3 — Session's prize, 2026-07-28

Following §7. I flagged "zero laws in 6000 runs" three times and each time caveated it as partly
policy blindness. That caveat was too generous, and measuring properly showed why.

## 17. The bill pipeline is near-impassable — PARTLY FIXED

A policy that drives the bill **every single week** — casework first to hold the seat, then the
earliest available pipeline motion — passed a law in **4 of 97 sessions (4.1%)**. A policy that
ignores the bill passed 0. So the earlier zero was not only blindness; deliberate play barely moves
it.

Where it dies, of 97 sessions reached (furthest stage):

| stage | 2 | 3 | **4** | 5 | 6 | 7 | 8 (passed) |
|---|---|---|---|---|---|---|---|
| runs | 9 | 15 | **41** | 9 | 13 | 6 | 4 |

**Stage 4 is the wall** — 42% of bills die there. Stage 4 is "reported out, waiting on Calendars",
and SS05 ("the narrowest door") is gated on `week >= 9`.

### The bug: the game charged you for a wait it imposed

`billOdds` subtracts `heat × 0.05`, and `applyBillStallHeat` adds +1 heat for every week a bill sits
at the same stage. A bill reported out in week 5 therefore sat four weeks it had **no legal way to
avoid** and arrived at Calendars with roughly −20% odds — turning SS05's 0.30 base into ~0.10 on the
one roll the whole Act builds toward.

Punishing a stall the player chose is the mechanic working. Punishing one the calendar imposed is
not. `applyBillStallHeat` now skips heat while `billBlockedByCalendar(state)` holds, and the week-9
gate moved into an exported `CALENDAR_OPENS_WEEK` so the card's `show` and the heat rule cannot
drift apart.

**Measured: 4.1% → 7.2% of sessions reached (4 → 7 laws of 97).** Stage-4 deaths 41 → 37.

## 18. What still gates it — YOUR CALL

Real, but not mine to keep tuning unilaterally. Two designed locks remain on the same door:

- **One pipeline motion per week** (`sessionFlags.pipelineUsed`), so seven stages need seven
  successful weeks out of fourteen, and stage 5 cannot even be *attempted* before week 9. That
  leaves ~6 attempts for the last 3 stages.
- **`sessionPipelineBlocked`** hides SS05 and SS06 outright when a Speaker freeze coincides with
  favor < 40 — a second lock on the same two stages.

Both are thematically right (Calendars really is where Texas bills die, and leadership really does
freeze you out). The question is whether Act III's *named prize* should fire ~7% of the time. That
is a difficulty decision, not a bug, and it is yours. If you want it meaningfully more reachable, the
cheapest honest levers in order: let a spare 3 AP buy a second pipeline motion in a week; drop the
Calendars gate to week 7; or raise SS05's 0.30 base.
