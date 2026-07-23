# Project board — living roadmap

**Board:** [PoseyATX Project #2](https://github.com/users/PoseyATX/projects/2)  
**Evidence log:** [`docs/ROADMAP.md`](./ROADMAP.md) (what shipped + harness proof)  
**Workstream log:** [`docs/WORK-LOG.md`](./WORK-LOG.md) · issue #16  
**Player flow:** [`docs/GAME-FLOW.md`](./GAME-FLOW.md)  
**Catch-up snapshot:** [`docs/RESTING.md`](./RESTING.md) — tip `7328c86` · package **0.1.0**  
**v0.1 evidence:** [`docs/V0.1-EVIDENCE.md`](./V0.1-EVIDENCE.md)  
**Engine host API:** [`docs/ENGINE-API.md`](./ENGINE-API.md)  
**Live alpha:** https://poseyatx.github.io/candidate-zero/  
**Snapshot date:** 2026-07-23 (**Step A hygiene** — #11 closed, #10 residual, #12 on hold)

This file is the agent-readable mirror of the GitHub Project. When project API
scopes are missing, **update this file + the linked issues** so work stays
honest. The board is the operating plan for finishing the game and shipping:

> **TypeScript pure engine → Unity presentation shell → iOS / App Store**

Rules engine stays pure TS (then whatever host binds it). Unity does **not**
become a second rules implementation.

---

## Status at a glance

| Status | Issue | Title |
|---|---|---|
| **DONE** | [#4](https://github.com/PoseyATX/candidate-zero/issues/4) | Phase 0 — Foundation pass |
| **DONE** | [#5](https://github.com/PoseyATX/candidate-zero/issues/5) | Phase 1 — Ground-centered campaign model |
| **DONE** | [#6](https://github.com/PoseyATX/candidate-zero/issues/6) | Phase 2 — Allies / assets / obligations port |
| **DONE** | [#7](https://github.com/PoseyATX/candidate-zero/issues/7) | Phase 3 — Debt as leveraged optionality |
| **DONE** | [#8](https://github.com/PoseyATX/candidate-zero/issues/8) | Phase 4 — Session stage (bill lifecycle) |
| **DONE** | [#9](https://github.com/PoseyATX/candidate-zero/issues/9) | Phase 5 — Balance breadth |
| **DONE** | [#17](https://github.com/PoseyATX/candidate-zero/issues/17) / [#18](https://github.com/PoseyATX/candidate-zero/issues/18) | Starmap — catalog + templates through MV14 |
| **DONE** | [#10](https://github.com/PoseyATX/candidate-zero/issues/10) core | Phase 6 — hierarchy, a11y CI, smoke:ui, mobile tabs · issue kept open as **RESIDUAL** (phone sign-off / screenshot CI) |
| **DONE** | — | Outside weather UI + Outside pack growth (21 events) |
| **DONE** | [#11](https://github.com/PoseyATX/candidate-zero/issues/11) | Phase 7 — **0.1.0** + [`V0.1-EVIDENCE.md`](./V0.1-EVIDENCE.md) · **closed** 2026-07-23 |
| **DONE** | — | Card library waves: signatures · unlock paths · wave5/6 → **113** cards |
| **DONE** | — | Waiting → re-file same persona (PR #32) |
| **ON HOLD** | [#12](https://github.com/PoseyATX/candidate-zero/issues/12) | Phase 8 — repo bridge done; **Unity editor on hold** (no agent C# free-flight) |
| **DONE** | — | Plan B–D: SIG22–24 coverage · refile seed/harness · balance note post-catalog |
| **DONE** | — | Anvil MIT port: greybox card plates + campaign observe (`docs/ANVIL.md`) |
| **DONE** | — | Design PR-1 leaf extract (`card-face` / `act-shell` / `tabs`) |
| **DONE** | — | Design PR-1b/1c full extract (`session` · paint-* · screens · terminal · outside) · `main.ts` ~100 lines |
| **DONE** | — | Design PR-2 goal strip (`#goal-strip` · GOAL_COPY · smoke seed 4242) |
| **DONE** | — | Design PR-3 play sectioning (Camp→Hand→Shop · session/waiting kits · draft focus) |
| **NEXT** | — | Design PR-3.5 card zone CSS · PR-4 art gate · human playtest |
| META | [#13](https://github.com/PoseyATX/candidate-zero/issues/13) | Board hygiene rules |
| BUG | [#14](https://github.com/PoseyATX/candidate-zero/issues/14) | Pages deploy auto-fire / workflow scope |
| PLANNED | [#15](https://github.com/PoseyATX/candidate-zero/issues/15) | AC1 archive yield-table full compare |
| REF | [#16](https://github.com/PoseyATX/candidate-zero/issues/16) | Work log pin |
| PARK | [#20](https://github.com/PoseyATX/candidate-zero/issues/20) | **Stupid Ideas** — ADD parking lot; agent rates only, not NEXT |

---

## What Claude left wrong (and what we fixed)

| Problem | Fix |
|---|---|
| Phases 0–3 still **open** with stale titles (`IN PROGRESS` / `PLANNED`) | Closed #4–#7 with evidence comments |
| Phase 4 claimed `session-plays.ts` + sine die **already done** | **False** — no such files. Issue #8 rewritten as real NEXT work |
| Phase 2 brief claimed shop/obls “already done” | **False** when Phase 2 started; now actually shipped |
| Phase 8 = Swift-only | Rewritten to owner ship path: **Unity presentation → iOS / App Store**, pure engine still SoT |
| Board clutter / no hygiene | #13 rules + this doc |

---

## Phase truth (code evidence)

### DONE — Phase 0 Foundation
CI, modular UI, district trap fix, labor/money retune, archive recovery.  
See `docs/ROADMAP.md` Phase 0.

### DONE — Phase 1 Grounds
Ground picker, diminishing returns, cosmetic rivals, `allyWarmAtGround` (AL09),  
`checkBallotThreshold` unwired, `harness:grounds`.  
Commits: `c3e4c7b`, `e8960ad`.

### DONE — Phase 2 Allies / shop / obligations
`src/data/{allies,assets,obligations}.ts`, shop BUY*, ally grant matrix,  
bill **types**, harnesses dead-refs/shop/obligations.  
Commit: `57936c6`.

### DONE — Phase 3 Debt leverage
`src/engine/debt.ts` — no resolve odds tax; win/loss asymmetric;  
`harness:debt`. Commit: `f7dff8f`. Pages firm-up: `6e8ec53`.

### DONE — Phase 4 Session
General win → Session; SS01–SS07 pipeline; PAC claim on referral; sine die
outcomes; `harness:session`. Commit trail on #8.

### DONE — Phase 5 Balance breadth
`harness:matrix`; wrong-district retune; money identity documented.
See `docs/BALANCE-NOTES.md` 2026-07-19 Phase 5. Issue #9.

### DONE — Starmap ≥3 playable pilots (#17/#18)
Multi-pilot registry; MV01 Precinct · MV02 Captain · MV03 Judge; `harness:starmap` e2e.
See `docs/STARMAP.md`.

### Later — more entity templates · 6 Mobile · 7 v0.1 · 8 Unity/iOS

---

## Kanban columns (suggested board setup)

If the board still has Claude’s default columns, align to:

1. **Backlog** — PLANNED  
2. **Ready** — NEXT (only one primary phase)  
3. **In progress** — actively coded this week  
4. **Review** — PR / harness / Pages check  
5. **Done** — closed issues  

Optional field **Track:** `Engine` | `Content` | `UI` | `Ship` | `Meta`

---

## Linking issues to the project (owner one-liner)

Agents often lack `project` token scopes. After `gh auth refresh -s read:project,project`:

```bash
# Add all phase + meta issues to Project #2
for n in 4 5 6 7 8 9 10 11 12 13 14 15; do
  gh project item-add 2 --owner PoseyATX --url "https://github.com/PoseyATX/candidate-zero/issues/$n"
done
```

Set Status on the board UI: Done for #4–#7, Ready/Next for #8, etc.

---

## How to work an item

1. Pick **#8** (or a `[BUG]`).  
2. Branch from the live alpha remote.  
3. Implement with harness + `docs/ROADMAP.md` evidence.  
4. Deploy Pages (manual dispatch until #14 fixed).  
5. Close issue with evidence; update this file’s snapshot table if status changes.

---

## Non-goals for the board

- Inventing cards/mechanics not in archive or owner direction  
- Second rules engine in Unity/C#  
- Declaring v0.1 without Phase 7 evidence bundle  
