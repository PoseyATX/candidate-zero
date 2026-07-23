# Catch-up snapshot — post redesign

**Date:** 2026-07-23  
**Tip (`fable-pages`):** see `git log -1` — design PR-1…PR-7 UI/gameplay flow  
**Package:** **`0.1.0`** (Phase 7 evidence; baseline label, not “game done”)  
**Live alpha:** https://poseyatx.github.io/candidate-zero/  

Previous resting notes (2026-07-19 tip `718f820`; mid-2026-07-23 tip `7328c86`) are **superseded** for UI module layout and goal strip.

---

## What this package is

A playable **Texas Legislature roguelike deckbuilder**:

| Layer | State |
|--------|--------|
| Pure TS engine | Rules SoT + frozen **host API** (`src/engine/api.ts` v1.0.0) |
| Vite UI | Extracted modules · goal strip · Camp→Hand→Shop · ceremony queue · a11y/smoke |
| Content | **116** cards · **21** Outside · starmap MV01–14 · SIG01–24 |
| Unity scaffold | Engine bundle + content JSON + Jint (on hold for editor free-flight) |
| Ship path | TS engine → Unity presentation → iOS |

---

## UI module tree (post extract)

```
src/ui/
  main.ts           # boot/wire only
  session.ts        # campaign owner + paint orchestration
  paint-hud.ts · paint-play.ts · paint-log.ts
  goal-strip.ts · act-shell.ts · outside-ui.ts
  card-face.ts · card-art.ts · screens.ts · tabs.ts · terminal-ui.ts
  styles.css
```

Art: `CARD_ART` in **card-face.ts** (empty); gate `npm run check:card-art`.  
Design: [`DESIGN-UI-GAMEPLAY-FLOW.md`](./DESIGN-UI-GAMEPLAY-FLOW.md) (PR-1…PR-7).  
IA: [`UI-IA.md`](./UI-IA.md) (corrected PR-7).

---

## Honest phase status

| Phase | Code truth | Issue lag |
|-------|------------|-----------|
| 0–5 | DONE | Closed |
| 6 | Core + CI a11y/smoke **done** | #10 OPEN **RESIDUAL** (phone sign-off / screenshot CI) |
| 7 | Evidence + **0.1.0** **done** | #11 **CLOSED** |
| 8 | Repo bridge **done** | #12 **ON HOLD** — Unity editor |
| UI redesign | PR-1…PR-7 **done** | Human playtest next |

---

## How to verify

```bash
npm run typecheck
npm run harness          # includes card-art helpers + check:card-art
npm run smoke:ui
npm run a11y
npm run build
```

---

## Wake / NEXT

1. Human phone playtest (checklist in design doc)  
2. #10 residual screenshot CI if wanted  
3. Balance / content as owner directs  
4. Unity editor when unblocked (`UNITY-SETUP.md`)  
5. Optional PR-8 `engine-bridge` re-exports only — deferred  

---

## Doc map

| Doc | Role |
|------|------|
| [`DESIGN-UI-GAMEPLAY-FLOW.md`](./DESIGN-UI-GAMEPLAY-FLOW.md) | UI redesign SoT + PR map |
| [`UI-IA.md`](./UI-IA.md) | Information architecture (current) |
| [`GAME-FLOW.md`](./GAME-FLOW.md) | Player loop + four acts |
| [`CARD-ART-STATUS.md`](./CARD-ART-STATUS.md) | Raster map + gate |
| [`PROJECT-BOARD.md`](./PROJECT-BOARD.md) | Ops roadmap |
| [`V0.1-EVIDENCE.md`](./V0.1-EVIDENCE.md) | Why 0.1.0 |
| [`ENGINE-API.md`](./ENGINE-API.md) | Host binding |
