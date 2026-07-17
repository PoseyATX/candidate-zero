# CANDIDATE ZERO

**A Hot Texas Primary**

High-complexity, single-player (PvE) roguelike deckbuilder set inside the machinery of the Texas Legislature.

This repository contains the modular TypeScript baseline for the durable, testable core. The pure Engine layer is designed for clean eventual porting to Swift / iOS.

## Current Status (v0.1 baseline **in progress** — not declared)

- Pure resolution engine (four-tier brutal RNG) extracted and verified
- SAFE cards provably cannot produce DISASTER
- 17 Play cards in pure, explicit-state form
- Petition Drive balance-tuned; multi-strategy loop harness green
- Minimal hand + draw + play + week loop live
- **Open for honest v0.1:** full card audit evidence, side-by-side vs original prototype, clean UI layer

## Architecture

```
src/
  data/       # Cards, personas, regions, issues (single source of truth)
  engine/     # Pure functions only — resolution, state transitions, play loop
  ui/         # Presentation layer (to be extracted)
  harness/    # Balance and regression tests
```

## Design Authority

- **SRD v1** is the authoritative mechanical contract.
- Design Document remains the high-level vision document.

## Run harnesses

```bash
npm run harness:resolve
npm run harness:smoke
npm run harness:ballot
npm run harness:loop
npm run harness:strategies
npm run harness
```

## Source of truth

GitHub: https://github.com/PoseyATX/candidate-zero

---

*Living project. Version labels are honest: v0.1 only after evidence.*
