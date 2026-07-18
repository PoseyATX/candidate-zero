# CANDIDATE ZERO

**A Hot Texas Primary**

High-complexity, single-player (PvE) roguelike deckbuilder set inside the machinery of the Texas Legislature.

This repository contains the modular TypeScript baseline for the durable, testable core. The pure Engine layer is designed for clean eventual porting to Swift / iOS.

## Current Status (v0.1 baseline **in progress** — not declared)

- Pure resolution engine (four-tier brutal RNG) extracted and verified
- SAFE cards provably cannot produce DISASTER
- **22 Play cards** in pure, explicit-state form (waves 1–4), root-attr tagged
- Petition Drive / Filing Fee balance-tuned (labor vs. money ballot-access paths)
- Minimal hand + draw + play + week loop live (seeded end-to-end)
- Attribute synergy (`cardAttrMod`) active; personas/regions tilt attrs
- Difficulty (resistance tier) escalates pre-ballot → on-ballot → general
- Primary **8 weeks** + General **6 weeks** with filing + elections
- Setup binds (persona / issue / district / region) in CLI + UI; district
  partisan lean (`align`/`trap`/`incumbent`) actually affects odds
- Phase-turn 3-card drafts on ballot and general entry
- Thin Vite UI shell + CLI play shell
- Harnesses (all `.ts`, no hand-duplicated engine logic): resolve, smoke,
  ballot, loop, strategies, ac1, ac1-parity, audit, calendar, setup, yields,
  full-campaign, dopamine
- CI (`.github/workflows/ci.yml`): typecheck + full harness + build on every push/PR
- **Open for honest v0.1 — see `docs/ROADMAP.md`:** archive yield-table
  compare, allies/assets/reps acquisition system, shadow consequences
  (debt/obligations), the Session stage, UI polish

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
- `docs/SRD-NOTES.md` — recovered design source (pillars, RNG philosophy,
  the node-analysis methodology, the Candidate-Zero node writeup, the
  branching state machine, cross-referenced against current code). The
  closest thing to a written SRD/Design Doc that exists in this repo;
  explicitly a partial capture, not the complete original.
- `archive/prototype-single-file.html` — the original single-file
  prototype this engine was extracted from (56 cards, 21 personas,
  allies/reps/obligations systems). Reference only; see `archive/README.md`.
- `docs/ROADMAP.md` — prioritized forward plan, grounded in what's already
  built vs. scaffolded-but-inert in this repo.
- `docs/BALANCE-NOTES.md` — dated log of every balance/mechanics change and
  its measured before/after.

## Run harnesses

```bash
npm install
npm run harness          # full suite (incl. yields, calendar, setup)
npm run play             # interactive CLI
npm run play:auto        # labor auto through week 8
npm run play:full        # labor auto full Primary+General
npm run dev              # Vite UI shell
```

## Source of truth

GitHub: https://github.com/PoseyATX/candidate-zero

## Support

If the climb is worth a coffee: [ko-fi.com/poseyatx](https://ko-fi.com/poseyatx)

---

*Living project. Version labels are honest: v0.1 only after evidence.*
