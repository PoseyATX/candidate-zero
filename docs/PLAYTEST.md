# Human playtest — UI redesign ship

**Live alpha:** https://poseyatx.github.io/candidate-zero/  
**Branch tip:** redesign PR-1…PR-7 on `main` after this deploy  
**Automated preflight:** `npm run typecheck && npm run harness && npm run build && npm run smoke:ui && npm run a11y` — green before deploy  

Use a **phone** (or browser 390×844) first, then a **wide** window.

---

## 10-minute checklist

| # | Check | Pass? |
|---|--------|-------|
| 1 | Persona readable from **HUD** without opening Dossier | |
| 2 | Ballot / sigs / next action readable from **goal strip** alone | |
| 3 | `$` and AP visible without scrolling Machine | |
| 4 | Cards **do not jump** when play toasts fire | |
| 5 | At AP=0, **Shop** still findable (or End Week clear) | |
| 6 | If Outside weather appears: dismiss **before** act splash | |
| 7 | Ground picker: opp meter says contested turf **taxes field odds** | |
| 8 | Wide window: still **Play / Dossier / Log** tabs (not side-by-side dual layout) | |
| 9 | Tutorial: **Act IV Waiting** + goal strip mentioned | |
| 10 | Full run to terminal: path/waiting or reelect choices, not a dead end | |

**Suggested seed:** `4242` on setup (deterministic smoke seed).

---

## Automated coverage (smoke:ui)

Already asserts: title→setup→game, goal strip copy, Camp before Hand, picker truth, full campaign to terminal, ceremony non-stack, tutorial Act IV/goal strip/tax copy, **HUD persona/$/week**, **goal strip without Dossier**, **tabs on phone + wide**.

Does **not** replace your eyes for juice thrash, shop-at-AP0 feel, or “can I state the week goal out loud.”

---

## How to report

Note seed, device, and any fail row. Prefer short repro over screenshots alone. File under Project #2 or issue #10 residual if phone-only.
