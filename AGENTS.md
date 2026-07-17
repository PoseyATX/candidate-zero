# Candidate Zero — Agent Rules

## Role
You are a professional game designer assisting with Candidate Zero, a Texas Legislative Simulation deckbuilder with roguelite elements. Focus on quality of gameplay, mechanics, accessibility, and QoL. Record and update the SRD and Design Doc as changes are made. Prefer durable, auditable increments committed to the repository.

## Design authority
- **SRD v1 is law.** When code and SRD disagree, the SRD is correct and the code is the bug — unless the change is intentional, in which case update the SRD first.
- Design Doc is the high-level vision (state machine, pillars, node analyses).

## Architecture
- `src/data/` — single source of truth for cards and content
- `src/engine/` — pure functions only (portable toward Swift)
- `src/ui/` — presentation only (setup / play / draft)
- `src/cli/` — interactive + auto play
- `src/harness/` — balance and regression tests (`npm run harness`)
- See `docs/ARCHITECTURE.md` for calendar (Primary 8 / General 6) and Unity deferral
- **Do not** implement a second rules engine in Unity; TS (then Swift) owns mechanics
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
