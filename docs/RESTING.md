# Catch-up snapshot — post-sleep state

**Date:** 2026-07-23 (agent rehydrate after 2026-07-19 rest)  
**Tip (fable branch):** `7328c86` — *Persistence: re-file as the same persona after waiting*  
**`origin/main`:** `20cf044` — merge PR #32 (same tip + merge commit)  
**Package:** **`0.1.0`** (Phase 7 evidence; baseline label, not “done”)  
**Live alpha:** https://poseyatx.github.io/candidate-zero/  

Previous resting note (2026-07-19, tip `718f820` / package `0.0.1`) is **superseded**. ~43 commits landed while agents slept.

---

## What this package is

A playable **Texas Legislature roguelike deckbuilder**:

| Layer | State |
|--------|--------|
| Pure TS engine | Rules SoT + frozen **host API** (`src/engine/api.ts` v1.0.0) |
| Vite UI | Full features restored + one-handed tab IA + a11y gates |
| Content | **116** cards (SIG01–24 all personas, unlock paths, wave 5–6) · **21** Outside · starmap MV01–14 |
| Unity scaffold | Engine bundle + content JSON + Jint bridge scripts (no second rules engine) |
| Harnesses | Full suite + `api` / `paths` / `content` |
| Ship path | TS engine → Unity presentation → iOS |

---

## What landed after the 2026-07-19 rest (PR themes)

| Area | Evidence |
|------|----------|
| Phase 6 residual | `smoke:ui`, `a11y` (axe WCAG), card desc off-face, mobile playability |
| Phase 7 | `docs/V0.1-EVIDENCE.md` · version **0.1.0** |
| Phase 8 prep | `ENGINE-API.md`, `UNITY-*`, `build:engine`, `export:content`, `unity/` |
| UI | Mobile redesign → regression → **full UI restore** → bottom-nav tabs |
| Cards | SIG01–21 · unlock paths (66→90) · wave5 (→105) · wave6 (→113) |
| Persistence | Waiting → re-file **same persona** (no setup) |
| Outside | Pack growth (heat dome, plant layoff, smear, club rallies, early vote, …) |

Merged PR trail: **#21–#32** (plus reconcile #19 family).

---

## Honest phase status (code wins over stale issue titles)

| Phase | Code truth | GitHub issue lag |
|-------|------------|------------------|
| 0–5 | DONE | Closed |
| 6 | Core + CI a11y/smoke **done** | #10 OPEN **RESIDUAL** only (phone sign-off / screenshot CI) |
| 7 | Evidence + **0.1.0** **done** | #11 **CLOSED** 2026-07-23 |
| 8 | Engine API + content bridge + Jint scaffold **done in repo** | #12 **ON HOLD** — Unity editor (no agent free-flight) |

---

## How to verify

```bash
npm run typecheck
npm run harness          # includes api + paths + content
npm run smoke:ui         # headless critical path
npm run a11y             # axe WCAG
npm run build
```

---

## Wake / NEXT (owner pick)

1. Issue hygiene — close/retitle #10/#11; rephrase #12 as “Unity editor vertical slice”  
2. Balance after catalog jump 66→113  
3. Unity editor: `docs/UNITY-SETUP.md` Track A/B  
4. Content: more pathways / Outside flavor  
5. #20 Stupid Ideas — rate only, never auto-NEXT  

---

## Doc map

| Doc | Role |
|-----|------|
| [`PROJECT-BOARD.md`](./PROJECT-BOARD.md) | Ops mirror |
| [`V0.1-EVIDENCE.md`](./V0.1-EVIDENCE.md) | Why 0.1.0 |
| [`ENGINE-API.md`](./ENGINE-API.md) | Host binding |
| [`UNITY-SETUP.md`](./UNITY-SETUP.md) / [`UNITY-BRIDGE.md`](./UNITY-BRIDGE.md) | Ship path |
| [`PATHS.md`](./PATHS.md) | Unlock pathways |
| [`WORK-LOG.md`](./WORK-LOG.md) | Narrative log |

**Ship covenant unchanged:** no second rules engine in Unity.
