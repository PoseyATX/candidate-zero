# UI / information architecture plan

**Status:** **Phase 6 hierarchy shipped** · **UI redesign PR-1…PR-6 landed** (2026-07-23).  
**Audience:** Agents + Unity presentation later.  
**Code (live):** `index.html`, `src/ui/styles.css`, module tree below — **not** a single mega-`main.ts`.

| Module | Owns |
|--------|------|
| `main.ts` | Boot / DOM wire only (~100 lines) |
| `session.ts` | Mutable campaign, `paint()`, endWeek, terminal entry |
| `paint-hud.ts` | HUD + dossier ledger + goal-strip hook |
| `paint-play.ts` | Draft, sectioned playables, ground picker |
| `paint-log.ts` | Log + toast juice |
| `goal-strip.ts` | `GoalStripInput`, `GOAL_COPY`, render |
| `act-shell.ts` / `outside-ui.ts` | Ceremony queue |
| `card-face.ts` / `card-art.ts` | Faces, emblems, optional `CARD_ART` |
| `screens.ts` / `tabs.ts` / `terminal-ui.ts` | Screens, tabs, terminal |

> Prefer **live code** over narrative below that is marked historical. Design SoT: [`DESIGN-UI-GAMEPLAY-FLOW.md`](./DESIGN-UI-GAMEPLAY-FLOW.md).

---

## 1. Owner notes (source of truth for this doc)

| Note | Implication |
|------|-------------|
| First screen is a **stark contrast** from the rest of the game | Title ceremony ≠ in-run chrome; shared palette/type alone is not enough continuity |
| In-game stats are **cluttery** | Ledger needs bands, not equal-weight cells |
| **Identity** must not sit randomly between ballot signatures and attributes | Identity band first in dossier |
| **Identity + Attributes** should be more prominent | Character chrome ≠ board meters |
| Drop redundant labels (e.g. **MONEY** before `$200`) | Currency/symbol-bearing values speak for themselves |
| **Toasts** for juice | Transient feedback must not reflow the card grid |
| Tabs on all widths | No dual desktop Play+Dossier path (K5) |

---

## 2. Historical diagnosis (pre–Phase 6) — do not implement from this

> **Struck for implementers.** The following described the flat ledger **before** `.ledger-identity` / force / vitals / machine bands and the redesign goal strip. Kept only as archive of *why* Phase 6 happened.

<details>
<summary>Pre-band ledger order (obsolete)</summary>

Rough primary-stage order once shipped as a flat grid:

1. Stage · Phase · Week · AP · Money · Force stats · **Ballot** · **Identity** jammed mid-list · Attrs · Machine  

Auto-fit CSS made every cell the same weight. HUD lacked identity. `#week-hint` / in-flow juice reflowed cards.

</details>

### As shipped now (trust code)

| Surface | Truth |
|---------|--------|
| **Dossier ledger** | Bands: identity → force/chamber/waiting bank → vitals → machine (`paint-hud.ts` `renderLedger`) |
| **HUD** | Always on in-game: act · AP pips · `$` · week · ballot/seat · persona chip |
| **Play tab** | Goal strip (`#goal-strip`) · draft exclusive · **Camp → Hand → Shop** sections · session pipeline/chamber · waiting orbit |
| **Tabs** | Play / Dossier / Log **all viewport widths**; bottom nav always in-game |
| **Juice** | `#toast-host` fixed overlay (`paint-log.ts` `showJuice`) |
| **Ceremony** | Weather (z85) then act splash (z80); ground picker z100 in-week only |

---

## 3. Principles

1. **One product, staged intensity** — title / splash / play share materials; density changes.  
2. **Need first, label second** — `$`, AP pips, `W3/8` speak for themselves.  
3. **Who you are is not a stat** — Identity + Attributes = character chrome.  
4. **Stage-conditional furniture** — ballot meter dies after ON; Session bill; Waiting bank.  
5. **HUD = vitals; ledger = dossier; goal strip = what/why/next.**  
6. **Tabs-for-all-widths** — same IA desktop/mobile; density only.  
7. **Don’t invent engine numbers in UI** — presentation reads `GameState` / snapshots.

---

## 4. Information inventory (current homes)

### Always (any live run)

| Info | Best home | Loudness |
|------|-----------|----------|
| Identity (persona · issue) | Ledger identity band; HUD who chip | High |
| Attributes | Identity band chips | High |
| AP / field | HUD pips | High |
| Cash `$N` | HUD; ledger vitals | High |
| Week / calendar | HUD + act banner | High |
| Act / stage | Act chip + banner | Medium |
| Debt / spendable | Chips when debt > 0 | Conditional |
| Allies / assets / obls | Machine band | Low–medium |

### Goals / next actions

| Stage | Goal strip primary / progress / next |
|-------|--------------------------------------|
| Primary pre-ballot | Make ballot · sigs · Petition/Fee |
| Primary on ballot | Survive primary · contacts/name |
| General | Bank GOTV · field/GOTV Weekend |
| Session | Bill stage / freeze · pipeline or casework |
| Waiting | Bank for next filing · path + banks |
| Draft / over / AP=0 | Dedicated `GOAL_COPY` keys |

### Act IV (Waiting)

| Info | Home |
|------|------|
| Path / orbit | Ledger waiting bank + goal strip + orbit section |
| Banked contacts / name | Ledger + goal progress |
| 1 AP/week | Goal next + kit label |

### Transient

| Signal | Where | Layout |
|--------|--------|--------|
| Play juice | Fixed toasts | None on cards |
| Goal guidance | `#goal-strip` reserved min-height | No thrash |
| Log | Log tab | Independent scroll |

---

## 5. Target layout (as shipped)

### In-run zones (top → bottom) — Play tab

```
┌─────────────────────────────────────────────┐
│ HUD (always on in-game)                     │  AP · $ · W · gate · who
├─────────────────────────────────────────────┤
│ Act banner                                  │  narrative frame
├─────────────────────────────────────────────┤
│ #goal-strip (3 lines, reserved height)      │  primary · progress · next
├─────────────────────────────────────────────┤
│ #draft (exclusive when pending)             │
│ .play-section camp → hand → shop            │  primary/general
│   (session: pipeline · chamber)             │
│   (waiting: orbit)                          │
├─────────────────────────────────────────────┤
│ End week (play footer) · bottom nav         │  Play | Dossier | Log
└─────────────────────────────────────────────┘
```

### Dossier tab (ledger)

1. **Identity band** — persona · issue · attr chips  
2. **Force / Chamber / Waiting bank** — stage-conditional  
3. **Vitals** — `$` · AP · week (desktop/dossier depth)  
4. **Machine** — allies · assets · obligations  

### Explicit non-goals

- Side-by-side Play + Dossier desktop layout  
- Fourth Shop tab  
- Dual mobile/desktop CSS IAs  

---

## 6. Streamlining backlog (historical → mostly done)

Phase 6 + redesign closed the furniture list:

- [x] Ledger bands + identity first  
- [x] Label diet (`$` without MONEY)  
- [x] Stage-conditional force/session/waiting  
- [x] Fixed toasts; reserved goal strip  
- [x] Tabs-for-all-widths  
- [x] Camp → Hand → Shop; session kit labels  
- [x] Module extract; card face zone CSS; art gate  

**Still open (polish / residual #10):** phone playtest sign-off, screenshot CI, optional inspect sheet for full `card.d`.

---

## 7. Out of scope (this IA doc)

- New engine stats  
- Full Unity HUD (informs later hosts via `ENGINE-API.md`)  
- Raster art content (gate only — `CARD-ART-STATUS.md`)  

---

## 8. Done when

- [x] Identity + Attributes first in dossier  
- [x] Ballot not sandwiched mid-force  
- [x] Toasts + goal strip do not thrash cards  
- [x] Tabs all widths; no dual layout  
- [x] Goal strip live from `GOAL_COPY`  
- [x] Module tree; `main.ts` boot-only  
- [x] This doc corrected (PR-7)  

**Residual:** #10 phone sign-off / screenshot CI.

---

## 9. Links

- Design + PR map: [`DESIGN-UI-GAMEPLAY-FLOW.md`](./DESIGN-UI-GAMEPLAY-FLOW.md)  
- Card art: [`CARD-ART-STATUS.md`](./CARD-ART-STATUS.md)  
- Player flow: [`GAME-FLOW.md`](./GAME-FLOW.md)  
- Phase 6 residual: [#10](https://github.com/PoseyATX/candidate-zero/issues/10)  
- Board: [`PROJECT-BOARD.md`](./PROJECT-BOARD.md)  
