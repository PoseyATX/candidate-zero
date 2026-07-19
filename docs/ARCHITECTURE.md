# Architecture

## Layers

| Layer | Path | Rule |
|-------|------|------|
| Data | `src/data/` | Cards and content — single source of truth |
| Engine | `src/engine/` | Pure functions only — portable toward Swift |
| UI | `src/ui/` | Thin Vite shell (setup → play → draft → outcome) |
| Harness | `src/harness/` | Balance and regression tests |
| CLI | `src/cli/` | Interactive + auto strategies |

## Engine modules (v0.0.x)

| Module | Role |
|--------|------|
| `resolve.ts` | Four-tier brutal RNG; SAFE band = 0 |
| `types.ts` | GameState, PlayCard, DeckState, outcomes |
| `state.ts` | Factory + re-exports calendar helpers |
| `calendar.ts` | Primary 8w / General 6w, phase map, elections |
| `play.ts` | Afford / legal / pay / executePlay |
| `deck.ts` | Draw / hand / discard / starter pile |
| `loop.ts` | Campaign session: startWeek → play → endWeek + drafts |
| `strategies.ts` | Scripted policies (stage-aware primary/general) |

## Campaign calendar

| Stage | Calendar weeks | Phase | Notes |
|-------|----------------|-------|--------|
| Primary | 1–8 | 1 if `!ballot`, else 2 | Filing deadline end of week 8 |
| General | 9–14 | 3 | Only if primary won |
| Session | later | 3 | Not yet simulated |

Terminal outcomes: `missed_filing` · `lost_primary` · `won_general` · `lost_general`.

## Ballot access rule

While `!ballot`, Petition Drive (PL04) and Filing Fee (PL05) are **always offered as camp actions** (negative hand indices). They still cost AP/money and use pure card math; they are not deck-gated. This protects the dual-path early hook without soft-pity RNG.

Deck still carries copies of those cards for natural draws; camp actions do not consume deck cards.

## Unity / presentation / ship path

Unity and Unity Hub may be used on this machine. **They are not the mechanical
source of truth.** Near-term playable core and balance harnesses stay in
TypeScript.

**Ship path (owner direction, 2026-07-19):**

1. **Pure TypeScript engine** (`src/engine/`) — rules, RNG, yields, calendar
2. **Unity presentation shell** — art, input, audio, store kit; **calls or mirrors** engine outputs
3. **iOS build → App Store** (TestFlight first)

Non-negotiable: **do not implement a second rules engine in C#/Unity**. Existing
`candidate-zero-unity` experiments are exploratory only — do not fork petition
yields, SAFE rules, or shadow math there. If Unity cannot host TS directly, it
must consume a bound API that preserves seed-deterministic outcomes (document
any intentional deltas).

Swift-native remains a possible far-future port of the same pure engine; it is
not the near-term store path. See issue #12 and `docs/PROJECT-BOARD.md`.

## Versioning

`package.json` version stays below `0.1.0` until AC1–AC5 have recorded evidence. Current: `0.0.1`.
