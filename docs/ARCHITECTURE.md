# Architecture

## Layers

| Layer | Path | Rule |
|-------|------|------|
| Data | `src/data/` | Cards and content — single source of truth |
| Engine | `src/engine/` | Pure functions only — portable toward Swift |
| UI | `src/ui/` | Thin Vite shell (presentation only) |
| Harness | `src/harness/` | Balance and regression tests |

## Engine modules (v0.0.x)

| Module | Role |
|--------|------|
| `resolve.ts` | Four-tier brutal RNG; SAFE band = 0 |
| `types.ts` | GameState, PlayCard, DeckState, outcomes |
| `state.ts` | Factory + re-exports calendar helpers |
| `calendar.ts` | Primary 8w / General 6w, phase map, elections |
| `play.ts` | Afford / legal / pay / executePlay |
| `deck.ts` | Draw / hand / discard / starter pile |
| `loop.ts` | Campaign session: startWeek → play → endWeek |
| `strategies.ts` | Scripted policies for harnesses |

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

## Unity / presentation

Unity and Unity Hub are available on this machine. **They are not the mechanical source of truth.**

- Near-term playable core and balance harnesses stay in TypeScript.
- Long-term shipping target remains native **Swift / iOS**.
- Unity may be used later for art, table feel, or throwaway presentation prototypes that **call or mirror** the pure engine — never a second rules implementation.
- Existing `candidate-zero-unity` experiments are exploratory only; do not fork petition yields, SAFE rules, or shadow math there.

## Versioning

`package.json` version stays below `0.1.0` until AC1–AC5 have recorded evidence. Current: `0.0.1`.
