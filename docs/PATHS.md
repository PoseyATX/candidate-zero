# Unlock Paths — earned cards through play

The balanced-expandability engine. A **path** is a combo of prerequisite card
plays; performing them advances the path (a lore toast fires for each new step),
and completing the combo **unlocks a reward card** — injected into your draw
pile with a lore toast. The catalog grows through play, not menus.

## How it works (runtime)

- `src/engine/paths.ts` — `advancePaths(state, cardId, deck)` runs after every
  **successful** play (`playFromHand`). It records the card, advances any path
  the card is a required step of (first play only), and on combo completion
  marks the path unlocked, injects the reward into the draw pile, and pushes the
  unlock toast.
- State (`GameState`): `playedCardIds` (combo memory), `pathProgress`,
  `pathsUnlocked`. All plain JSON — save/replay safe.
- Reward cards are gated `req`/`show: s => s.pathsUnlocked[pathId]` **and** only
  ever injected on unlock, so they never appear in the base deck or drafts.

## How to add a pathway (the whole contract)

In `src/data/paths.ts`, add:

1. A `PathDef` to `PATHS`:
   ```ts
   { id: 'P_LABOR', name: 'The Union Hall',
     requires: ['PL02', 'PL34', 'PL19'],   // ids that must be played
     reward: 'RW_SHOP_STEWARD',
     stepToasts: ['…', '…', '…'],           // one per required step
     unlockToast: 'The locals endorse — stewards walk your turf now. …' }
   ```
2. A reward `PlayCard` to `PATH_REWARDS` via `reward({ … })` (normal
   odds/tier `run`, `pathId` matching the path).

That's it — `buildCatalog`, the Unity manifest (`deck: 'path'`),
`harness:content`, and `harness:paths` pick it up automatically. Trigger ids
must be real cards in the live catalog.

## Shipped pathways

| Path | Requires | Unlocks |
|---|---|---|
| The Campus Machine | Block Walk · Phone Bank · Town Hall | **Outsource Petition Drive to University Interns** — signatures at scale |
| The Bundler's Rolodex | Filing Fee · Fish Fry · Yard Signs | **Work the Bundler's List** — bundled money |
| The County Machine | Kitchen-Table · Court the Chairs · Straw Poll | **Turn Out the Precinct Captains** — endorsements + GOTV |
| The Press Machine | Earned Media · Press Release · Candidate Forum | **The Anchor Takes Your Call** — name-ID engine |
| The Field Army | Block Walk · Recruit Volunteers · Canvass Captain | **Stand Up a Turf Operation** — contacts + GOTV |
| The Retail Grind | Block Walk · Town Hall · Grocery-Store Handshakes | **Become a Fixture** — familiarity engine |
| Climb the Ladder | Club Speech · Prayer Breakfast · Court the Chairs | **Cash the Kingmaker's Chit** — endorsement engine |

A card may feed more than one path at once (e.g. Block Walk advances both the
Campus Machine and the Field Army) — that is intended.

## Card rarity (acquisition)

`PlayCard.rarity` (`common` | `uncommon` | `rare`, default common) weights the
phase-draft pool in `deck.ts buildPhaseDraft` (common 6 · uncommon 2 · rare 1),
so uncommon and rare cards are a genuine find when drafting. Signature and
path-reward cards are separate acquisition channels and stay out of the draft
pool. See `src/data/plays-wave5.ts` for the first uncommon/rare batch.

## Design intent

- Paths reward *coherent play* (a door-knocking campaign earns the campus
  machine; a money campaign earns the bundler), so unlocks feel authored, not
  random.
- One reward copy per run — a rare high point, surfaced diegetically via the
  log toasts. No new UI: the existing log + hand render it.
- Future axes to gate on beyond card combos: `personaId`, stage, ground
  rapport, reputation/Faces thresholds. The reducer is the single seam.
