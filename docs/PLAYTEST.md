**RECOVERY + PR #34 SHIPPED on main:** inspect→PLAY; HUD persona (no leading "The"); Goal/Now/Next; setup How to Play; Rival = lower field odds; emblem-only cards (greybox retired); ground picker shows engine-backed **p≈X%** + rival drag.

# Human playtest — UI redesign ship

**Live alpha:** https://poseyatx.github.io/candidate-zero/  
**Owner pass (2026-07-23, pre-recovery):** 1 fail · 2 fail · 3–6 pass · 7 fail · 8 pass · 9 fail · 10 pass  
**Code fix ships:** recovery `695d9b4` + emblem-only / ground odds PR #34 (`4f36320` → `e594958`).  
**Still open:** owner **phone** re-sign-off after hard-refresh (cache bust).

**Automated preflight:** `npm run typecheck && npm run build && npm run smoke:ui && npm run a11y`

Use a **phone** (or browser 390×844) first, then a **wide** window.

---

## 10-minute checklist

| # | Check | Notes |
|---|--------|-------|
| 1 | Persona readable from **HUD** without Dossier | Should show **Teacher** (not “The”) + issue line |
| 2 | Ballot / sigs / next from **goal strip** alone | Labeled **Goal / Now / Next**, sticky on Play |
| 3 | `$` and AP without scrolling Machine | |
| 4 | Cards stable when toasts fire | |
| 5 | Shop findable at AP=0 | |
| 6 | Weather before act splash | |
| 7 | Ground picker **Rival** + **p≈%** | Higher rival → lower field odds; buttons show engine-backed odds |
| 8 | Wide = still three tabs | |
| 9 | **How to Play** on setup (and masthead) · Act IV in tutorial | |
| 10 | Terminal has a next move | |
| 11 | **First tap** card = detail sheet with full text + **Play** | Second action commits |
| 12 | Card faces are **emblem-only** (no clashy colored greybox plates) | Rasters still empty by design |

**Suggested seed:** `4242` on setup.

---

## Automated coverage (smoke:ui)

Already asserts: title→setup→game, goal strip copy, Camp before Hand, picker truth, full campaign to terminal, ceremony non-stack, tutorial Act IV/goal strip/tax copy, **HUD persona/$/week**, **goal strip without Dossier**, **tabs on phone + wide**, inspect→Play path.

Does **not** replace your eyes for juice thrash, shop-at-AP0 feel, or “can I state the week goal out loud.”

---

## How to report

Note seed, device, and any fail row. Prefer short repro over screenshots alone. File under Project #2 or issue #10 residual if phone-only. Post scores on **#33**.
