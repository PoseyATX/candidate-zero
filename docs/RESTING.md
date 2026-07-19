# Resting snapshot — floors swept

**Date:** 2026-07-19 (end of night)  
**Tip commit:** `20e8f3c` on `claude/fable-build-cleanup-balance-rnlqgb` (local `fable-pages`)  
**Package:** `0.0.1` — **not** v0.1 (honest versioning; Phase 7 still planned)  
**Live alpha:** https://poseyatx.github.io/candidate-zero/  
*(Pages may lag until workflow_dispatch / next deploy — tip is on the deploy branch.)*

This file is the **put the dogs out and turn off the lights** note. Rehydrate here first, then board + work log.

---

## What this package is

A playable **Texas Legislature roguelike deckbuilder** with:

| Layer | State |
|--------|--------|
| Pure TS engine | SoT for rules — campaign → general → session → waiting |
| Vite presentation | Phase 6 hierarchy, toasts, Outside weather modal |
| Harnesses | Full suite green at rest |
| Ship path | TS engine → Unity shell → iOS (no second rules engine) |

---

## Shipped this long stream (honest inventory)

### Phases
- **0–5** foundation through balance matrix — **DONE**
- **6 core** UI hierarchy + identity/attrs + toasts + setup nameplate — **DONE**
- **6 residual** WCAG deep audit, screenshot CI, formal phone sign-off — **open**
- **7** honest v0.1 label — **PLANNED** (needs evidence + residual polish)
- **8** Unity → iOS — **PLANNED**

### Systems
- Grounds + rival teeth · shop · obligations · debt (no odds tax)
- Session bill pipeline + teeth · general kit gravity
- Starmap catalog + **14** playable templates (MV01–14)
- Outside deck **16** events + **weather UI** (`pendingOutside`, never hand)
- Waiting season (Act IV) + Chronicle bridge + higher-office paths
- Card residency law (Main / Special / Outside)

### QoL / hygiene
- GR08: Barrio Blocks → **Southside Blocks**
- Strategies no longer free-farm Specials on empty-hand fallback
- Balance hygiene post-feature stack (labor/money/outside rates)
- Stupid Ideas **#20** parked as ADD sink (rate only)

---

## How to verify after sleep

```bash
npm run typecheck
npm run harness      # full suite
npm run build
npm run dev          # local alpha
```

Deploy: GitHub Actions `deploy.yml` on branch `claude/fable-build-cleanup-balance-rnlqgb` (workflow_dispatch if auto-fire still broken — issue #14).

---

## Explicit non-goals until next session

- No new features “just because”
- No v0.1 marketing label without Phase 7 evidence
- No Unity rules reimplementation
- #20 ideas stay parked until owner promotes one

---

## Wake-up NEXT (owner pick)

1. More starmap templates (kitchen cabinet / old bull / …)  
2. Phase 7 honesty prep (AC evidence bundle)  
3. Phase 6 residual a11y / screenshot CI  
4. Outside flavor / more weather (keep Outside law)  
5. Unity API freeze notes (doc only)

---

## Doc map

| Doc | Use |
|-----|-----|
| [`PROJECT-BOARD.md`](./PROJECT-BOARD.md) | Status table |
| [`WORK-LOG.md`](./WORK-LOG.md) | What we did |
| [`GAME-FLOW.md`](./GAME-FLOW.md) | Player loop |
| [`UI-IA.md`](./UI-IA.md) | UI furniture law |
| [`STARMAP.md`](./STARMAP.md) | Entity templates |
| [`CARD-RESIDENCY.md`](./CARD-RESIDENCY.md) | Deck architecture |
| [`BALANCE-NOTES.md`](./BALANCE-NOTES.md) | Balance snapshots |

**Rest well. The county will still be there in the morning.**
