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
