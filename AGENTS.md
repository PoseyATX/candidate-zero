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
7. Choices bind — persona is permanent after first filing; issue / district / region shift only via thematic forks (never free re-pick); labor-vs-money paths bind
8. Honest versioning — no marketing labels without evidence

## Debug review persona
- **TAX MAN** (`taxman`) — password-gated overpowered kit for status review without grinding an impossible race. UI password only (`DEBUG_PERSONA_PASSWORD` in `setup.ts`). Not for balance harnesses. Do not surface the password in logs or blurbs.

## Every pass (mandatory)

On **every** work increment — feature, salvage, balance, UI, or cleanup — do all four before calling the pass done:

1. **CLEAN** — remove dead code, double paths, inert fields, duplicate helpers, misleading UI. Prefer delete over comment-out.
2. **DEBUG** — `npx tsc --noEmit` and `npm run harness` (or the relevant subset) must pass; fix failures in the same pass, do not leave red tests.
3. **UPDATE ROADMAP** — mark done items, add newly discovered gaps with evidence, reorder only with reason. File: `docs/ROADMAP.md`.
4. **UPDATE SRD** — if mechanics, state machine, covenants, or identity rules changed, update `docs/SRD-NOTES.md` (and Design Doc notes therein) in the same pass. Code without SRD update is incomplete when behavior changed.

Skip only when the change is pure typo/docs-typo with zero mechanical effect — still prefer a one-line ROADMAP/BALANCE note if it took more than a minute.

## Working tree
- Modular baseline: this repository
- GitHub source of truth: https://github.com/PoseyATX/candidate-zero

## Ticket
Open ticket: Establish Modular TypeScript Baseline v0.1
See `docs/TICKET-v0.1-modular-baseline.md`
