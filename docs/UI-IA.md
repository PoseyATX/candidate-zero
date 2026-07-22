# UI / information architecture plan

**Status:** **Phase 6 implement shipped** (2026-07-19) — hierarchy, label diet, toasts, setup nameplate.  
**Audience:** Phase 6 (#10) + Unity presentation later.  
**Captured:** 2026-07-19 (owner play notes).  
**Code:** `index.html`, `src/ui/main.ts` (`renderHud`, `renderLedger`, `showJuice` toasts), `src/ui/styles.css`.

> Goal: know **what** information the player needs, **where** it lives, and **how loud** it is — so layout work is rearranging furniture, not inventing rooms while guests are at the door.

---

## 1. Owner notes (source of truth for this doc)

| Note | Implication |
|------|-------------|
| First screen is a **stark contrast** from the rest of the game | Title ceremony ≠ in-run chrome; shared palette/type alone is not enough continuity |
| In-game stats are **cluttery** | Ledger is a flat grid of equal cells — no hierarchy |
| **Identity** must not sit randomly between ballot signatures and attributes | Current order dumps Identity after Ballot mid-list; Attrs trail as one more row |
| **Identity + Attributes** should be more prominent | Who you are and how you tilt plays are first-class chrome, not footnotes |
| Drop redundant labels (e.g. **MONEY** before `$200`) | Currency/symbol-bearing values speak for themselves |
| Focus on needed info + best placement | Inventory + zones before polish pixels |
| **Toasts** OK to bring back if the small info bar above cards thrash-moves | Transient feedback must not reflow the card grid |

---

## 2. Diagnosis (as shipped)

### Title vs rest of game

| Surface | Mood | Structure |
|---------|------|-----------|
| **Title** (`#title`) | Full-bleed ceremony: double gold rules, giant Cinzel wordmark, sunburst, emblem, long tag | One focal column, almost no chrome |
| **Setup / game / terminal** | Utility panels, dense ledger grid, card grids, log | Masthead + actions; functional, not ceremonial |
| **Act splash** | Brief ceremony (shell titles) | Closer to title than to ledger |

Problem is not “title is pretty.” Problem is the **jump**: ceremony → spreadsheet. Players should feel one product with intensity that changes by screen, not two skins.

### Ledger order today (`renderLedger`)

Rough primary-stage order (session branch strips campaign stats):

1. Stage · Phase  
2. Week  
3. AP  
4. **Money** (label + `$N`)  
5. Spendable / Debt (conditional)  
6. Contacts · Name ID · Vols · Momentum · Endorse  
7. **Ballot** (ON / `N/M` sigs)  
8. **Identity** ← jammed here  
9. **Attrs** ← equal weight to everything else  
10. Session block (capital / favor / …) when in session  
11. Allies · Assets · Obligations (wide)  
12. Outcome if over  

Auto-fit CSS grid (`minmax(140px, 1fr)`) makes every cell the same visual weight. Order is implementation order, not reading order.

### HUD today (`renderHud`, ≤800px)

Already leaner and better: act chip · AP pips · `$N` (+ debt/obl chips) · week meter · ballot/seat.  
Does **not** surface Identity or Attrs. Mobile never sees who you are without scrolling the ledger.

### Labels that fight the value

- `Money` + `$200` → `$200` is enough (HUD already does `$` + number).  
- `Attrs` as a cryptic abbreviation next to a wall of `charm+1 grit-1 …`.  
- Repeated Stage/Week/AP/Money that the HUD or act banner already shows (desktop still shows full ledger; mobile shows both when you scroll).

---

## 3. Principles

1. **One product, staged intensity** — title / splash / play share materials (walnut, gold, Cinzel/Source Serif, oxblood); only density and ceremony change.  
2. **Need first, label second** — if the glyph or unit is unambiguous (`$`, AP pips, `W3/8`), drop the uppercase label.  
3. **Who you are is not a stat** — Identity and Attributes are *character chrome*; campaign meters are *board state*. Different zone or visual weight.  
4. **Stage-conditional furniture** — Primary ballot meter dies after ballot; Session bill/capital replace Contacts/Vols; Waiting shows banked carry, not petition.  
5. **No equal-weight laundry list** — group into bands; promote 2–3 primary reads; demote inventory.  
6. **HUD = vitals; ledger = dossier** — HUD answers “can I act this second?”; ledger answers “who am I and what’s my machine?”  
7. **Don’t invent new numbers** — this pass is placement and hierarchy only. Engine snapshots stay as-is.

---

## 4. Information inventory

### Always (any live run)

| Info | Need | Best home | Loudness |
|------|------|-----------|----------|
| **Identity** (persona · issue) | Constant self-check; setup payoff | Ledger **identity band** (top); optional compact HUD subtitle on mobile | **High** |
| **Attributes** | Play tilt / strategy | Same identity band, second line or chips | **High** |
| **AP** (+ field) | Action economy | HUD primary; ledger optional / omitted if HUD visible | High on HUD |
| **Cash** (`$N`) | Afford shop / fees | HUD; ledger without “Money” label | High |
| **Week / calendar** | Deadline pressure | HUD meter + act banner; ledger only if desktop no-HUD | High |
| **Act / stage** | Narrative frame | Act chip + banner; not a ledger row | Medium |
| **Debt / spendable** | When debt > 0 | Chip on `$`; detail on demand or second line | Medium (conditional) |
| **Obligations count** | Drag awareness | Chip `OB×N`; full ids in inventory | Medium |
| **Allies / assets / obl list** | Inventory | Collapsed “Machine” or wide footer; not mid-vitals | Low–medium |

### Act I–II (Primary / General) — campaign force

| Info | Need | Best home | Loudness |
|------|------|-----------|----------|
| **Ballot / signatures** | Act I gate | HUD meter until ON; then quiet “ON” chip or hide | **High** until on ballot |
| Contacts | Primary/general odds fuel | Force cluster (mid ledger) | Medium |
| Name ID | Same | Force cluster | Medium |
| Vols | Same | Force cluster | Medium |
| Momentum | Soft lever | Force cluster or secondary | Lower |
| Endorse | Soft lever | Force cluster or secondary | Lower |

### Act III (Session)

| Info | Need | Best home | Loudness |
|------|------|-----------|----------|
| Seat (not ballot) | Confirm stage | HUD chip | Medium |
| Bill status + stage | Core session goal | Ledger **bill band** (wide, prominent) | **High** |
| Capital / Favor / District | Session economy | Session cluster near bill | High |
| Committee | Context | Under bill or machine | Medium |
| PAC claim flag | Consequence cue | One muted line when true | Medium when true |

### Act IV (Waiting)

| Info | Need | Best home | Loudness |
|------|------|-----------|----------|
| Path / orbit id | Which climb | Identity-adjacent or week-hint | Medium |
| Banked contacts / name | Payoff preview | Force-or-bank cluster | Medium |
| 1 AP/week rule | Constraint | Week-hint (already) | Low chrome |

### Never permanent chrome (log / juice / splash only)

- Per-play resolve text, juice banners, act splash copy  
- Full obligation prose, ally ground lists (expandable later)  
- Seed, district/region names after setup (setup screen owns them; optional tiny footer if needed for support)

### Transient feedback — toasts as layout safety

**Problem:** `#week-hint` and `#juice` sit **above** the card grids. When they show/hide or change height, the playables grid jumps. That is worse on mobile than a missing celebration.

**Archive had it right (partially):** prototype `toast()` was `position: fixed` — overlay, no layout thrash. Modular UI replaced that with an in-flow juice banner (headline only). ROADMAP already flags a fuller toast stack as polish.

**Plan rule (owner 2026-07-19):** **Bring toasts back** when implementing Phase 6 (or sooner if juice/hint thrash is already annoying):

| Signal | Where | Layout effect |
|--------|--------|----------------|
| Week guidance (`week-hint`) | Prefer stable one-line slot **or** only change text, never collapse to zero height | Minimal reflow |
| Play juice / milestones / big beats | **Fixed/stacked toasts** (overlay, auto-dismiss ~2.5–3s) | **None** on card grid |
| Persistent log | `#log` as now | Scrolls independently |

- Juice banner can shrink to a reserved min-height or move entirely into toasts.  
- Do not put expanding multi-line copy in the bar above cards.  
- `aria-live` still fires on toast insert (a11y stays).  
- Reference: `archive/prototype-single-file.html` `.toast` + `toast()` — re-skin to current walnut/gold, do not revive whole prototype.

---

## 5. Target layout (furniture map)

### A. Title screen — continuity, not clone

Keep the ceremony. Soften the cliff:

- Shared **material language** into setup/game (same paper grain / rule motif / button grammar already partial).  
- Optional: thin **continuous masthead** strip (eyebrow only) so “Begin the Climb” doesn’t teleport into a different app.  
- Setup should feel like **filling the nameplate**, not a form dump after a poster.  
- Act splash already bridges narrative — keep; ensure palette matches title rules, not a third style.

*Not required for v0 furniture:* full motion, audio, new art. Continuity is hierarchy + materials.

### B. In-run zones (top → bottom)

```
┌─────────────────────────────────────────────┐
│ HUD (mobile always; desktop optional slim)  │  vitals: AP · $ · W · gate
├─────────────────────────────────────────────┤
│ Act banner (existing)                       │  narrative frame
├─────────────────────────────────────────────┤
│ IDENTITY BAND                               │  persona · issue
│   Attributes as chips / scored row          │  high contrast, not grid cell
├─────────────────────────────────────────────┤
│ FORCE / SESSION CLUSTER (stage-conditional) │  the “board”
│   Primary: contacts name vols [mom end]     │
│   + ballot only if not ON                   │
│   Session: capital favor district · BILL    │
├─────────────────────────────────────────────┤
│ MACHINE (allies · assets · obligations)     │  quieter, full width
├─────────────────────────────────────────────┤
│ Actions / cards · week-hint · log           │  play surface
└─────────────────────────────────────────────┘
```

### C. Ledger reorder (desktop dossier)

Proposed primary-stage order:

1. **Identity band** (persona · issue) — full width, larger type  
2. **Attributes** — full width, chips or `+N` tokens, not `Attrs` dump  
3. Force: Contacts · Name · Vols · (Momentum · Endorse secondary)  
4. Gate: Ballot **only if not on**; if on, omit or one quiet chip  
5. Resources: `$N` (no Money label) · AP only if no HUD · Week only if no HUD  
6. Conditional: Debt / Spendable  
7. Machine: Allies · Assets · Obligations  
8. Outcome if over  

Session: after Identity/Attrs → Bill band → Capital/Favor/District → Machine.  
Drop duplicate Stage row if act banner + HUD already say it.

### D. HUD (mobile vitals)

Keep lean. Add **one** character cue if possible without clutter:

- Primary row: act · AP pips · `$N` · week · ballot/seat  
- Optional second line (tiny): `persona` truncated · 2–3 attr peaks — **or** rely on identity band stuck under HUD  

Prefer sticky **identity band under HUD** over cramming attrs into chips if space is tight.

### E. Label diet

| Instead of | Prefer |
|------------|--------|
| `Money` `$200` | `$200` |
| `AP` `2/3` on HUD | pips (label optional) |
| `Week` `3 (cal 3/8)` | `W3/8` + meter |
| `Attrs` `charm+1 …` | chips: Charm **+1** or icons later |
| `Ballot` `12/50 sigs` | meter + `12/50` (HUD already) |
| `Identity` as equal cell | band title omitted; show the names as the header |

Keep labels when the value is **ambiguous** without them: Contacts, Name ID, Capital, Favor (not self-describing numbers).

---

## 6. Streamlining backlog (small, concrete)

When implementing (Phase 6 or a thin “ledger hierarchy” slice):

1. **Reorder ledger HTML** — Identity + Attrs first; ballot out of the middle.  
2. **CSS bands** — `.ledger-identity`, `.ledger-force`, `.ledger-machine` with different type scale / border; kill equal-cell sameness.  
3. **Drop `Money` label**; match HUD `$` convention.  
4. **Stage-conditional rows** — hide ballot after ON; hide campaign force in session; hide bill outside session.  
5. **Deduplicate HUD vs ledger** on narrow screens (don’t show Stage/Week/AP/Money twice at full weight).  
6. **Title → setup continuity** — one shared frame element; setup as “nameplate fill.”  
7. **Attr chips** — readable at a glance; persona imprint from setup stays visible all run.  
8. **Toasts for transient juice** — fixed overlay; stop card-grid jump when feedback appears. Stabilize or reserve height for `week-hint`.  
9. **Playtest checklist** (10 min, phone): can you name your persona without hunting? Know ballot status without reading five labels? Know `$` and AP without scrolling past allies? Cards stay put when juice fires?

---

## 7. Out of scope (this plan)

- New engine stats or renaming attributes  
- Full Unity HUD (this doc informs it later)  
- Card art / Outside event presentation redesign  
- WCAG / screenshot CI (still Phase 6 #10; complementary, not replaced)  
- Implementation until owner says execute

---

## 8. Done when

- [x] Identity + Attributes are the first readable block after act chrome  
- [x] Ballot is not sandwiched between force stats and identity (sigs only if not ON)  
- [x] No bare `MONEY`/`Money` label in front of `$N`  
- [x] Title → setup → play shares materials (setup nameplate panel + double rules)  
- [x] Mobile: sticky identity under HUD; persona chip on HUD  
- [x] Stage-conditional chrome: force / chamber / waiting bank  
- [x] Transient juice = fixed toasts; week-hint reserved height  
- [x] This doc marked shipped  

**Still open (polish / CI):** full WCAG audit pass, visual regression screenshot CI, 10-min mobile playtest sign-off.

---

## 9. Links

- Phase 6 issue: [#10](https://github.com/PoseyATX/candidate-zero/issues/10)  
- Board mirror: [`PROJECT-BOARD.md`](./PROJECT-BOARD.md)  
- Player flow: [`GAME-FLOW.md`](./GAME-FLOW.md)  
- Render sites: `src/ui/main.ts` · `src/ui/styles.css` · `index.html`
