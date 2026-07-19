# CANDIDATE ZERO

**A Hot Texas Primary**

High-complexity, single-player (PvE) roguelike deckbuilder set inside the machinery of the Texas Legislature.

Modular TypeScript baseline: pure engine is the rules authority. Ship path
is **TS engine → Unity presentation → iOS / App Store** (not a second rules
engine in C#).

| Doc | Role |
|---|---|
| [Project #2](https://github.com/users/PoseyATX/projects/2) + [`PROJECT-BOARD.md`](docs/PROJECT-BOARD.md) | Ops roadmap |
| [`ROADMAP.md`](docs/ROADMAP.md) | Evidence of what shipped |
| [`WORK-LOG.md`](docs/WORK-LOG.md) | Full workstream history (refer back here) |
| [`GAME-FLOW.md`](docs/GAME-FLOW.md) | How a run plays today |

**Play the alpha:** https://poseyatx.github.io/candidate-zero/

## Current Status (v0.0.x — Phases 0–3 done; not v0.1)

- Phases **0–3 done:** foundation, grounds, allies/shop/obligations, debt leverage
- Pure resolution engine (four-tier brutal RNG); SAFE never DISASTER
- Primary **8** + General **6**; ballot labor/money paths; setup binds
- Ground picker, asset shop, structured obligations, debt as optionality
- Vite UI + CLI + full harness suite + CI
- **Next:** Phase 4 Session ([#8](https://github.com/PoseyATX/candidate-zero/issues/8))
- **Then:** balance matrix → mobile polish → honest v0.1 → Unity/iOS ship

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

---

*Living project. Version labels are honest: v0.1 only after evidence.*
