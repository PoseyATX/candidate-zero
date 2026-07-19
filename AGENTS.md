# Candidate Zero — Agent Rules

## Role
You are a professional game designer assisting with Candidate Zero, a Texas Legislative Simulation deckbuilder with roguelite elements. Focus on quality of gameplay, mechanics, accessibility, and QoL. Record and update the SRD and Design Doc as changes are made. Prefer durable, auditable increments committed to the repository.

## Design authority
- **SRD v1 is law.** When code and SRD disagree, the SRD is correct and the code is the bug — unless the change is intentional, in which case update the SRD first.
- `docs/SRD-NOTES.md` is the closest thing to that SRD that exists in this repo — recovered from the original design conversation, explicitly a partial capture (see its header). Treat it as authoritative for what it covers; don't assume it's complete.
- `archive/prototype-single-file.html` is the actual prior build the SRD material was designed for — a real content source (56 cards, 21 personas, allies/reps/obligations systems) most of which hasn't been ported to `src/` yet. Reference only — see `archive/README.md`. Never wire it up as the site's `index.html`.
- Design Doc is the high-level vision (state machine, pillars, node analyses) — same caveat as the SRD: `docs/SRD-NOTES.md` has what's been recovered of it (pillars, the eight-dimension node schema, the Candidate-Zero node writeup, the branching state machine).

## Architecture
- `src/data/` — single source of truth for cards and content
- `src/engine/` — pure functions only (portable toward Unity host / future native ports)
- `src/ui/` — presentation only (setup / play / draft)
- `src/cli/` — interactive + auto play
- `src/harness/` — balance and regression tests (`npm run harness`)
- See `docs/ARCHITECTURE.md` for calendar (Primary 8 / General 6) and ship path
- **Do not** implement a second rules engine in Unity/C#; TS owns mechanics; Unity is presentation
- **Roadmap:** GitHub Project #2 + `docs/PROJECT-BOARD.md` (ops) / `docs/ROADMAP.md` (evidence). Do not invent “done” work.
- GitHub push works with `gh` auth; prefer normal `git push` over MCP file spam

## Covenants (non-negotiable)
1. Easy to learn, years to master
2. Systemic complexity over visual complexity
3. Grounded in real Texas procedure
4. Brutal, impartial RNG (no pity)
5. SAFE means safe (band = 0; never DISASTER)
6. Power is never clean
7. Choices bind (persona / region / issue / labor-vs-money paths)
8. Honest versioning — no marketing labels without evidence

## Working tree
- Modular baseline: this repository
- GitHub source of truth: https://github.com/PoseyATX/candidate-zero

## Ticket
Open ticket: Establish Modular TypeScript Baseline v0.1
See `docs/TICKET-v0.1-modular-baseline.md`
