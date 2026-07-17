# CANDIDATE ZERO

**A Hot Texas Primary**

High-complexity, single-player (PvE) roguelike deckbuilder set inside the machinery of the Texas Legislature.

This repository contains the modular TypeScript baseline for the durable, testable core. The pure Engine layer is designed for clean eventual porting to Swift / iOS.

## Current Status (v0.1 baseline **in progress** — not declared)

- Pure resolution engine (four-tier brutal RNG) extracted and verified
- SAFE cards provably cannot produce DISASTER
- **22 Play cards** in pure, explicit-state form (waves 1–4), root-attr tagged
- Petition Drive balance-tuned; multi-strategy loop harness green
- Minimal hand + draw + play + week loop live (seeded end-to-end)
- Attribute synergy (`cardAttrMod`) active
- Thin Vite UI shell + CLI play shell
- Harnesses: resolve, smoke, ballot, loop, strategies, ac1, ac1-parity, audit
- **Open for honest v0.1:** yield-table archive compare, setup/persona in UI, UI polish

## Architecture

```
src/
  data/       # Cards, personas, regions, issues (single source of truth)
  engine/     # Pure functions only — resolution, state transitions, play loop
  ui/         # Thin Vite presentation shell (no rules)
  cli/        # Interactive + auto play shells
  harness/    # Balance and regression tests
```

## Design Authority

- **SRD v1** is the authoritative mechanical contract.
- Design Document remains the high-level vision document.

## Run harnesses

```bash
npm install
npm run harness          # full suite
npm run play             # interactive CLI
npm run play:auto        # labor auto through week 8
npm run dev              # Vite UI shell
```

## Source of truth

GitHub: https://github.com/PoseyATX/candidate-zero

---

*Living project. Version labels are honest: v0.1 only after evidence.*
