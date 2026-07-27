# Design directions — what this game could be

Written 2026-07-27. Not a roadmap. A working argument about where the ceiling is.

**This document assumes nothing is sacred.** If a system doesn't work, or there's a better way, or
there's just a more enjoyable idea, the existing thing gets ripped out. Balance tuning, covenants,
and shipped phases are artifacts of past decisions, not constraints on future ones. Where I name a
cost, it's so the trade is visible — not an argument for the status quo.

---

## The measurement that should drive everything

| | |
|---|---|
| Plays per run | **~33** |
| Weeks per run | ~17 |
| Deck size at run end | ~23 |
| **Distinct cards played across 25 runs** | **37 of 117** |

Two thirds of the catalog has never been seen. Not "underused" — *never drawn and played, across
25 full campaigns.*

This is the central problem, and it reframes most of the backlog. Signature cards, path rewards,
promo cards, 93 starmap entities, Outside packs — all of it is content poured into a loop that can
only deliver ~33 decisions per run. **Adding content is filling a bucket with a hole in it.** The
delivery mechanism is the bottleneck, and it's structural.

For scale: Slay the Spire runs ~250+ card plays; Balatro, hundreds of scoring decisions. At 33, a
deckbuilder isn't really building a deck — the player is picking from a short menu, and the deck
they assemble barely gets to exist before the run ends.

---

## The big levers, ranked by how much game they unlock

### 1. The AP economy — 2 AP/week is the ceiling on everything

Every other symptom traces here. 2 AP × ~17 weeks = ~33 plays. It's why 68% of cards never appear,
why combos can't form, why a 23-card deck plays like a 5-card one, why drafting rarely changes a
run.

This was chosen for one-handed mobile play, and that constraint is real and good. But "few
decisions" and "few *taps*" are not the same thing. Options that keep the ergonomics:

- **Raise AP and make individual plays cheaper/faster.** Same tap budget per decision, more
  decisions.
- **Free actions** — a class of card that costs 0 AP but has a different limiter (once/week,
  requires a state, discards something). This is how StS gets play volume without turn bloat.
- **Chain plays** — a successful play grants a follow-up. Ties volume to skill and creates the
  combo turns the game currently can't have.
- **Decouple field work from AP entirely** — ground work runs on its own budget, so the campaign
  layer and the turf layer stop competing. (This would also fix the labor/money rapport asymmetry
  below, which is a symptom of the two competing for the same AP.)

**This is the highest-leverage change available and I'd do it before adding any content.** It makes
everything already built more visible, which is worth more than anything new.

### 2. The opponent is a random number

`rivalRap` banks 5–40 at a random ground per week. There is no opponent — there's weather.

A rival that *reads the board and responds* is the standard move (StS elites, FTL, Into the Breach)
and it's a large enjoyment gain for moderate work: counter-campaign your strongest ground, go
negative when you lead, consolidate when behind, spend against your issue. It gives grounds
immediate meaning, creates real read-and-respond play, and generates stories.

This is probably the best enjoyment-per-effort item on the list. It replaces a random number with
an agent — nothing needs ripping out.

### 3. Grounds are a spreadsheet, not a map

Eight independent rapport counters. No adjacency, no spread, no contest, no geography. The "where
do I work" decision reduces to "which number is biggest."

Making it spatial — neighbouring turf bleeding into each other, an opponent who takes and holds
specific ground, corridors that open routes — turns a stat array into a board. This pairs with #2;
an agent opponent needs a board worth fighting over.

### 4. `resolve()` is a slot machine

Pick a card → roll → one of four tiers. The interesting decision happens *before* the dice, and the
dice decide. Per-play RNG is the weakest kind of tension: the player's skill expresses itself in
selection only, then watches.

The alternative most modern designs use: keep randomness in the *draw* and the *situation*, make
resolution deterministic or near-deterministic. Tension moves to sequencing and combination — where
skill lives.

**Cost, stated honestly:** this is covenant-protected (AC1 determinism, STD ≡ prototypeRoll
2000/2000) and it's the deepest change on this list. That's a reason to be deliberate, not a reason
to refuse. If the game is better without a slot machine at its centre, the covenant is the thing
that should change.

### 5. Card upgrades

I argued against these last pass on grounds of catalog surface. That was me avoiding work, not
reasoning — retracted. Upgrades give the draft a second axis, let a player commit to a strategy,
and make the ~23-card deck matter. They're beloved in the genre for good reason. They also help the
37/117 problem: an upgraded card is a reason to play the card you already have.

### 6. Deck economy

There's no draw, cycle, retain, or discard-for-value play — the deck functions as a menu. Even a
small amount of card-flow (draw 2, retain, tutor a card, shuffle something back) turns 23 cards into
an engine. Cheap to build, disproportionate payoff, and it directly attacks the 37/117 number.

---

## Reversed from my last pass

I wrote a "Not recommended" section that was mostly me protecting existing work. Corrections:

| Then | Now |
|---|---|
| Card upgrades "double catalog surface" | Retracted — that was work-avoidance. Recommended (#5). |
| Route/node map "fights the 2-AP week" | The 2-AP week is itself the thing to question (#1). Revisit after. |
| Score multipliers "compete with resolve()'s identity" | Fair as a design read, but `resolve()` is itself up for debate (#4). |
| Ground condition as bonus, not replacement, to protect the Phase 5 matrix | **Wrong reason.** The matrix is an artifact; if the ground condition is the better win model, re-derive the matrix. Bonus-vs-replacement should be decided on which is the better game. |

---

## What's genuinely worth keeping

Not everything should go, and it's worth being specific about what's actually good:

- **The fiction.** The writing is the game's strongest asset by a distance. Ground names, issue copy,
  epithets, Outside events. Whatever changes mechanically, this is the thing to protect.
- **The pure-engine/host split.** `api.ts` + the manifest is genuinely well built and makes any
  rewrite *cheaper*, because presentation is decoupled from rules.
- **The harness culture.** 31 harnesses meant I could measure "37 of 117" in ten minutes instead of
  guessing. Any big change is safe to attempt because of this.
- **The Chronicle / no-true-game-over frame.** The best structural idea in the design. Currently
  underexploited — it deserves to be the spine, not an epilogue.

---

## Open finding from the last pass

Labor banks ~2.5× less rapport than money (home 5 / 2nd 2 vs 13 / 8), which is backwards —
door-knocking should build more turf than fundraising. The cause is AP competition: labor spends its
weeks on Petition Drive to make the ballot.

Worth noting this is a **symptom of #1**, not an isolated tuning bug. Decoupling field work from the
campaign AP budget would dissolve it rather than patch it.
