# Design directions — mechanics worth stealing, mapped to seams we already have

Written 2026-07-27. Companion to `ROADMAP.md` (evidence log) and `STARMAP.md` (the map).

**Rule this document follows:** every proposal names an existing file or field it builds on. Nothing
here asks for a system that doesn't already have a foothold in the repo. Where I think an idea is
*not* worth doing, I say so rather than padding the list.

The bias, stated up front: this game's problem is not a shortage of systems. It has 117 cards, 93
starmap entities, 7 pathways, a Chronicle, three stages, 26 Outside events, and a genuine feedback
layer. Its problem is that **several finished systems don't pay off yet** — some were never wired,
some are invisible to the player. Depth is cheaper than breadth here, and it's also better.

---

## The state of play (measured, not asserted)

| | |
|---|---|
| Cards | 117 — main 58 · signature 24 · session 16 · waiting 12 · path 7 |
| Rarity | common 108 · uncommon 5 · rare 4 |
| Acquisition channels | phase draft (rarity-weighted), path unlock, persona signature, promo inject, shop |
| Decisions per campaign | ~28 (14 weeks × 2 AP) — a *tight* loop, which is a strength |
| Grounds | 8, of which 1 is gated |
| Starmap | 93 entities, 14 playable templates (79 non-playable by design — templates + deltas) |
| Feedback vocabulary | 5 beats, 4 near-miss kinds, hot/cold streaks, milestones, week summaries |

The 2-AP week is the best thing about the design. Every proposal below is filtered on "does this
survive a two-decision turn on a phone?" Several otherwise-good mechanics fail that test and are
listed under *Not recommended*.

---

## Tier 1 — wired this pass

### Locked ground as a keyed door
*Comparable: Hades' locked boons, Dead Cells runes, Metroid gating.*

`Ground.gated` shipped on GR04 Church Corridor and **was never read by anything** — two cards
(`MV07` Faith Leader, a wave4 play) cleared the flag and advertised "corridor open", which was a
no-op. Now enforced (`play.ts isGroundLocked/workableGrounds`), surfaced in the picker as a dimmed
CLOSED card with its reason, and exposed to hosts via `GroundView.locked`.

Why it matters beyond the bug: it converts an ally acquisition into a **spatial** unlock. You don't
just get a number, you get a door. That's a stronger memory than a stat bump, and the fiction was
already written.

**Next:** only one ground is gated. Two or three more, keyed to *different* things — an
endorsement, a starmap entity, rapport elsewhere — would turn the map into a progression.

### Ground affinity as constituency synergy
*Comparable: Balatro suits, StS colour identity, Slice & Dice affinity.*

Every ground carries `aff` codes, and the issue copy was **already written against them** — "The FM
roads know the arithmetic" (ag subsidies), "four storefronts by the plant gate" (payday lending),
"The Legion hall knows every name" (veterans). The mapping was authored years of commits ago and
never connected. All 18 issues now carry matching `aff`, and `bankRapport` multiplies rapport
×1.5 (one shared constituency) or ×2 (two) when your issue matches the turf.

Measured effect: **+43–54% rapport across every strategy.** This is the highest-value change in the
pass, and it's pure wiring — no new content.

### One rapport chokepoint
`MV07`/`MV12`/`MV14` mutated `g.rapport` directly, silently skipping `rapStall`, the same-ground
weekly penalty, *and* affinity. Everything now routes through `reputation.bankRapport`. `MV02`
Canvass Captain — the card that literally promises "GOTV on turf" — banked no rapport at all; it
does now.

### Rarity visible past the engine
Rarity drives the draft (`deck.ts` common 6 / uncommon 2 / rare 1) but `manifest.ts` never exported
it, so the Unity/iOS build saw 117 commons. Fixed. **A rare card should not look like a common one**
— that's the cheapest dopamine in the genre and it was one missing field.

---

## Tier 2 — recommended next, in order

### 1. Rarity needs a *moment*, not just a frame
Exporting the field is necessary, not sufficient. `feedback.ts` already has the vocabulary (`Beat`,
`milestone`, `formatPlayJuice`) — a rare/uncommon draft pick should fire a `spark` beat and a
milestone line the way breakthroughs do. Effort: hours. This is the single best
juice-per-line-of-code left.

### 2. Starmap entities that remember you
*Comparable: Hades' NPC relationships, CK3 character memory.*

79 entities are non-playable, and `STARMAP.md` is right that inventing 79 decks is the wrong move.
But `entityHistory` already persists on state and `LegacyCarry` already crosses runs. A precinct
chair you worked with last cycle starting *warm* costs almost nothing and makes the career graph
feel like a place with people in it. This is the strongest long-term identity play available, and it
mines the largest unexploited asset in the repo.

### 3. Path chains and branches
`advancePaths` is described in `PATHS.md` as "the single seam", and it is. Two cheap extensions:
completing two paths unlocks a third (chains), and *how* you completed one selects between two
rewards (branches). No new system — the reducer already sees every play.

### 4. Supporter cards as a rarity ladder
The sponsor channel is real now (`promoRate`, `fullBleedArt`, `docs/PROMO-CARDS.md`). The natural
shape is a ladder — Supporter / Patron / Kingmaker — at descending `promoRate`, each with its own
frame. Balatro's Legendary jokers are the model: vanishingly rare, unmistakable on sight, and
*talked about*. The machinery exists; this is content plus a frame treatment.

### 5. Daily seeded run
The seed contract is frozen and proven exact across 5 seeds (`harness:api`), and `serialize` round
trips at ~3.5 KB. A shared daily seed is close to free and is the standard retention primitive in
this genre. I'd do this *after* the above — it multiplies whatever the loop is worth, so make the
loop worth more first.

---

## Not recommended (and why)

- **Deck-wide card upgrades (StS `+` cards).** Doubles catalog surface for a tuning problem you
  don't have. `rarity` and paths already differentiate cards; upgrades would blur them.
- **A route/node map between weeks.** The calendar *is* the route. Adding StS-style node selection
  would fight the 2-AP week and cost the one-handed mobile ergonomics that `ROADMAP.md` Phase 6
  names as load-bearing.
- **Escalating score multipliers (Balatro).** Tempting, but this game's tension is *probabilistic*
  (tiers, near-misses), not arithmetic. Bolting on a multiplier would compete with `resolve()`'s
  identity rather than amplify it.
- **Replacing the win model with the ground condition.** See below.

---

## The ground economy: what was actually wrong

`career.ts` sketched a win condition of **60 home + 40 × 2 others**. It had been met **0% of the
time in every strategy since Phase 1**, and the roadmap correctly flagged it as load-bearing.

Distribution probe (medians per campaign, after the affinity/gating work):

| strategy | home | 2nd | 3rd |
|---|---|---|---|
| money/focus | 28 | **0** | **0** |
| labor/focus | 10 | **0** | **0** |
| money/spread | 13 | 8 | 5 |
| labor/spread | 5 | 2 | 0 |

The decisive finding: **focus play banks nothing at all on a second ground.** A breadth condition is
unreachable for it by construction — and that is correct, because Phase 1's stated target was
"contest a few, not all eight". The condition should reward breadth; focus is a different, valid
route that wins through the probability model.

Thresholds recalibrated to **primary 12 home + 5 × 2**, **general 8 + 4 × 2**. `money/spread` now
meets it **34%** of the time, guarded by a harness band (12–65%) so it can neither rot back to 0 nor
inflate into a free win.

**Wired as a bonus, not a replacement** — a deliberate departure from the roadmap's Phase 2 framing.
Meeting the condition is +10pp on the election; home ground alone is +3pp. Replacing
`calendar.ts`'s probabilities would have invalidated the entire Phase 5 matrix. Post-change matrix:
mean **19.9%** (was 20.3), band 6.7–30.0, **0 unexplained degenerates**.

### Open finding: labor banks ~2.5× less rapport than money

`labor/spread` reaches home 5 / 2nd 2; `money/spread` reaches 13 / 8. Thematically backwards —
door-knocking should build more turf rapport than fundraising. The cause is AP competition: the
labor path spends its weeks on Petition Drive to make the ballot, leaving little for field work.

I did **not** fix this — it's a real balance decision, not a bug, and it was outside the approved
scope. Options, roughly in increasing order of disruption: give petition-path cards a small rapport
yield; add a labor-flavoured field card; or reduce petition AP cost. Worth a deliberate call.
