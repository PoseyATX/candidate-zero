# Card Taxonomy — the recognition system

Written 2026-07-17, at the point the project committed to a 1000+ unique-card
goal and the introduction of non-play card families (allies, items,
locations, liabilities, blackmail, …). This is the spec that keeps a
thousand future cards visually legible without a thousand ad-hoc decisions.

## The one rule

**Tint by what a card *is*, never by whether it's *good for you*.**

The retired `TRAP` stamp broke this rule: it was a *verdict* ("this will
hurt you"), printed on the card, which spoiled the hook before the player
read a word. A card's *family* — Bargain, Ally, Item, Liability — is a
*category* in the fiction, not a verdict. A returning player learns to read
the frame the way they read a suit or an MTG color; a new player sees
flavor and still has to read the fine print to know whether *this* bargain
is worth it. Recognizability, not spoilers.

## Two independent channels

Risk and kind are orthogonal and never share a visual element, so a card
can be a volatile Bargain, a safe Ally, a standard Liability, etc.

| Channel | What it means | Where it shows |
|---|---|---|
| **Risk** (`RiskClass`) | variance of the outcome — SAFE/STD/VOL | left edge color + footer dot |
| **Kind** (`CardKind`) | what the card *is* in the world | paper wash + accent brackets + top-left corner seal |

`action` is the unmarked default: no wash, neutral (oxblood) brackets, no
seal. Keeping the common case plain is deliberate — special families should
*pop* subtly, and 900 of the first 1000 cards will be plain plays.

## The families (v1)

Defined in `src/engine/types.ts` (`CardKind`), styled in
`src/ui/styles.css` (`.kind-*`), marks + metadata in `src/ui/card-art.ts`
(`KIND_MARK`, `KIND_META`).

| kind | is… | wash | accent | seal glyph |
|---|---|---|---|---|
| `action` | a play you make | none | oxblood | — (unmarked) |
| `bargain` | a deal with strings | warm rust | `#8a2f26` | fishhook |
| `ally` | a person who joins your machine | sage | `#5a6b4a` | head-and-shoulders bust |
| `item` | an asset you hold | amber | `#8a6d2a` | cut diamond |
| `location` | a place with its own rules | slate | `#3f5f7a` | map pin |
| `liability` | a weight you carry, win or lose | umber | `#6e4326` | chain link |
| `blackmail` | leverage — held on you, or by you | cold indigo | `#4a4270` | sealed envelope |

Seal glyphs are distinct *silhouettes*, not color-only, so the channel
survives colorblindness and the ~15px corner size. The family's diegetic
name lives in the seal's `title`/`aria-label` (discoverable on hover, read
by screen readers) — never as an on-card text stamp.

### Today vs. forward-looking

Only `action` and `bargain` are used by cards that exist now
(`PL20 Take the PAC Check`, `PL21 Self-Fund on Credit`). The other four
families are scaffolded — enum member, wash, accent, glyph, and doc row all
in place — so the first ally/item/location/liability/blackmail cards drop
into a finished visual language instead of triggering another design pass.

## Adding a card of a new family

1. Set `kind: '<family>'` on the `PlayCard` (omit for a plain action).
2. That's it for visuals — the wash, accent, and corner seal come from the
   `.kind-<family>` CSS and `KIND_META`/`KIND_MARK` automatically.
3. If you need a *new* family, add it to `CardKind`, add a `KIND_META`
   entry, a `KIND_MARK` silhouette, a `.kind-<family>` CSS rule, and a row
   here. Pick an accent that's distinct from the existing six at a glance
   and a silhouette that reads at 15px.

## Relationship to the `trap` flag

`PlayCard.trap` is a *balance/audit* flag (drives harness tooling and
future difficulty analysis), kept separate from `kind`. A `bargain` is the
usual home for `trap: true`, but they're independent on purpose: a future
non-bargain card could want the balance flag, and not every bargain must be
a mechanical trap. The player never sees `trap` — they see the `bargain`
frame and the card's own words.
