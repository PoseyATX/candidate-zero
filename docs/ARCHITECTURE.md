# Architecture — Foundation (bootstrap)

**Status:** living foundation contract (not marketing versioning).  
**Law hierarchy:** `AGENTS.md` covenants → `docs/SRD-NOTES.md` → this doc → code.  
When code and SRD disagree, **fix the code or update the SRD first** — never leave them divergent.

This document is the **bootstrap** for expansion: layers, state machine, rulesets, content contracts, balance gates, and the checklist every new card/asset must pass **before** it ships. Expand only after the foundation holds.

---

## 1. Design pillars (non-negotiable)

From covenants + SRD recovery. Do not weaken these for content volume.

| # | Pillar | Mechanical meaning |
|---|--------|--------------------|
| 1 | Easy to learn, years to master | Few always-legal early verbs; depth in systems (faces, grounds, obligations, residue) |
| 2 | Systemic complexity over visual complexity | Pure engine owns rules; UI is a thin shell |
| 3 | Grounded Texas procedure | Filing fee vs petition, primary-as-election in many districts, citizen legislature texture |
| 4 | Brutal impartial RNG | No pity rolls; player mitigation = attrs, assets, allies, prep |
| 5 | SAFE means safe | Risk class `SAFE` → disaster **band = 0** (never DISASTER) |
| 6 | Power is never clean | PAC/self-fund/slate money carry obligations or exposure |
| 7 | Choices bind | Persona permanent after first filing; issue/district/region only via costly thematic forks |
| 8 | Honest versioning | Stay `< 0.1.0` until acceptance criteria have evidence |

**Tone:** Southern gothic / Art Deco / noir / rustic Texan. Systems should *feel* like Texas politics. Do not lean into Cultist Simulator clone aesthetics or namechecks.

---

## 2. Layer rules

| Layer | Path | Rule |
|-------|------|------|
| **Data** | `src/data/` | Cards, assets, setup tables — single source of truth for content |
| **Engine** | `src/engine/` | **Pure** functions (seeded RNG only side channel). Portable toward Swift |
| **UI** | `src/ui/` | Presentation only (setup → play → shop → draft → log). No second rules engine |
| **CLI** | `src/cli/` | Interactive + auto strategies for harness/dev |
| **Harness** | `src/harness/` | Balance, regression, reachability. Green before merge |
| **Docs** | `docs/` | SRD, architecture, balance log, roadmap |
| **Catalog CSV** | `data/cards.csv` | Human-auditable inventory; **regenerated from code**, not hand-authored as runtime |

### Authority

- **Runtime mechanics:** TypeScript engine + data functions (`odds` / `run` / `drag`).
- **Design contract:** SRD notes + this architecture.
- **Balance history:** `docs/BALANCE-NOTES.md` (what changed, measured results).
- **CSV:** inventory + authoring scaffold (`role`, path, economy). Code wins if CSV drifts — re-export.

### Explicit non-goals for the foundation

- Unity is **not** a second rules engine (`candidate-zero-unity` exploratory only).
- Archive prototype (`archive/prototype-single-file.html`) is **reference only** — never ship as `index.html`.
- Full bill pipeline / multi-bill session is **not** foundation; thin session (4 weeks) is.

---

## 3. Career state machine (law)

Career **does not end** on a ballot. `state.over` is rare ruin only.

```
SETUP (once)
  persona / issue / district / region lock
        │
        ▼
PRIMARY (8 weeks) ── miss filing ─────────────────────┐
  phase 1 pre-ballot · phase 2 on-ballot               │
        │ win                                          │
        ▼                                              │
GENERAL (6 weeks) ── lose ─────────────────────────────┤
  phase 3                                              │
        │ win                                          │
        ▼                                              │
SESSION (4 weeks, inOffice) ── sine die ───────────────┤
  phase 4                                              │
        │                                              │
        └──────────────► INTERIM / OFF-SEASON (6 mo) ──┤
                              phase 0                  │
                              residue + rare forks     │
                              ▼                        │
                         next PRIMARY ◄────────────────┘
                         (incumbent if still inOffice)
```

| Stage | Calendar | Phase id | Content catalog |
|-------|----------|----------|-----------------|
| Interim | 6 months (abstracted) | 0 | `INTERIM_PLAYS` |
| Primary pre-ballot | weeks 1–8, `!ballot` | 1 | `PLAYS` with `ph` includes 1 |
| Primary on-ballot | weeks 1–8, `ballot` | 2 | `PLAYS` with `ph` includes 2 |
| General | weeks 9–14 | 3 | `PLAYS` with `ph` includes 3 |
| Session | 4 weeks | 4 | `SESSION_PLAYS` |

**Ballot access (dual path):** while `!ballot`, Petition (`PL04`) and Filing Fee (`PL05`) are always offered as **camp actions** (not deck-gated). They still cost AP/$. Deck may also contain copies.

**Identity rules**

| Facet | After first filing |
|-------|--------------------|
| Persona | Permanent. Never re-pick. Never on fork menus. |
| Issue | Thematic fork only (cost / scar). Hold always available. |
| District | Map fork only (redistrict / court). Cost name ID / contacts / debt. |
| Region | Geography fork only (cycle 2+). |

---

## 4. Core rulesets (engine contracts)

### 4.1 Resolution (`resolve.ts`) — SRD § RNG

Four tiers from roll vs success probability `p` and disaster `band`:

| Tier | Stamp | Meaning |
|------|-------|---------|
| 0 | BREAKTHROUGH | Crit success |
| 1 | GAIN | Success |
| 2 | SETBACK | Soft fail / weak result |
| 3 | DISASTER | Hard fail (impossible for SAFE) |

- Clamp `p` to `[0.02, 0.95]`.
- **SAFE:** `band = 0` (no DISASTER). Crit share only via rep R01.
- **STD:** base band grows with `state.tier` (scrutiny).
- **VOL:** wider band and higher crit share.
- **CHOICE:** used for non-roll menus (interim/session verbs); not forced through four-tier resolve the same way.

**Tier / scrutiny:** production code sets `state.tier` from phase at play time (pre-ballot → on-ballot → general). Do not leave tier inert.

### 4.2 Attributes (`cardAttrMod`)

Root attrs (baseline 10): **CLO · CON · CRA · INK · DIP · CHA**.

- Per linked attr: `(score - 10) / 40`, averaged over card’s `attrs[]`.
- Cards **must** declare `attrs` when odds exist; expansion without attrs is incomplete.

### 4.3 Faces & shadow (`reputation.ts`)

Faces: **P O L G T F** (procedure / operator / lobbyist / good-ol-boy / true-believer / …).  
Deep negative faces fire **shadow** thresholds once (`shFired`). Shadow is mechanical (malus, exposure, ally loss, obligations) — not flavor-only.

### 4.4 Reputation grants (ported subset)

| Id | Trigger (summary) |
|----|-------------------|
| R01 | walkCount ≥ 12 |
| R02 | late clean run (no shadow plays) |
| R04 | shadowPlays ≥ 3 |
| R07 | hitPieces ≥ 3 |
| R10 / R11 | disaster log density |

Remaining archive reps need ally counters not yet ported — track in ROADMAP, do not invent mid-card.

### 4.5 Obligations (`obligations.ts`)

Registry ids in `state.obls` (`OB1` PAC, `OB2` Bank Note, …).  
`tickObligations` every week/month end. Free-text legacy strings normalize on tick.

**Rule for expansion:** any card that prints “easy money” or “easy ballot” must either:

1. Grant an obligation, or  
2. Raise exposure / hit risk, or  
3. Be SAFE grind with clearly weaker long-run EV than the dual ballot paths.

### 4.6 Grounds & field plays

- Field cards require a ground (`pickDefaultGround` ranks affinity + rapport).
- Gated grounds (e.g. Church Corridor) open on face / persona gates.
- Affinity can tilt odds slightly (`groundAffinityMod`, capped).

### 4.7 Shop assets (`assets.ts`)

Money sinks with kit chips + optional passives. Purchases grant trophies.  
Not BIO/ISSUE tags — those are identity, not shop.

### 4.8 Failure / cycle loot (`failure-loot.ts`)

Cycle close can mint scars/flags + deck inject + LOOT juice. Failures must leave **tangible** UI residue, not only log lines.

### 4.9 Deck growth (`deck.ts` + `loop.ts`)

- Starter deck favors walk / petition / fry / dual ballot.
- Weekly growth injects into **physical draw pile** (not only ownership list).
- Phase drafts inject into draw pile.
- General entry injects GOTV tools when appropriate.

### 4.10 Elections (`calendar.ts`)

- `primaryWinProbability` / `generalWinProbability` are pure functions of ledger state.
- District `align` / `incumbent` / `trap` affect difficulty (wrong-party is hard, not free).
- GOTV is the general lever; do not re-balance general as pure name-ID coin flip.

### 4.11 Feedback (`feedback.ts`)

Dopamine/juice is **presentation of truth**. It must never alter RNG or payoffs.

### 4.12 Seeding (`rng.ts`)

All production randomness goes through seeded `random()`. No bare `Math.random` in engine/data.

---

## 5. Content catalogs

| Catalog | File(s) | Id prefix | Contract type |
|---------|---------|-----------|---------------|
| Campaign plays | `plays.ts`, `plays-wave4.ts` | `PL##` | `PlayCard` |
| Interim verbs | `interim-plays.ts` | `INT_*` | `InterimPlay` |
| Session verbs | `session-plays.ts` | `SES_*` | `SessionPlay` |
| Shop assets | `assets.ts` | `A##` | `AssetDef` |
| Setup | `setup.ts` | persona/issue/district/region ids | apply at filing |
| Obligations | `obligations.ts` | `OB*` | weekly drag |

**Full inventory CSV:** `data/cards.csv`  
Regenerate: `npm run export:cards` → `scripts/export-cards-csv.ts`.

### PlayCard required fields

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | Stable forever once shipped |
| `n`, `d`, `tag` | yes | Name, description, short tagline |
| `cost` | yes | `a` AP, `$` money, `vp` vol, `m` momentum, `fav` favors |
| `risk` | yes | SAFE / STD / VOL / CHOICE |
| `ph` | yes | Phase list |
| `attrs` | yes if rolled | Attr synergy |
| `odds` | yes if rolled | Pure fn → base p |
| `run` | yes | Apply tier yields; return prose |
| `show` / `req` | optional | Visibility / hard gates |
| `field` | optional | Needs ground |
| `trap` | optional | UI label **Risk** (not “Trap”) |

### Id allocation (avoid collisions)

| Range | Use |
|-------|-----|
| PL01–PL19 | Core campaign spine (ballot, grind, media, GOTV) |
| PL20–PL39 | Wave 4 force multipliers + risk money |
| PL40–PL59 | Reserved future primary/general (do not skip process) |
| INT_* | Off-season only |
| SES_* | Session only |
| A01–A99 | Shop |
| OB* | Obligations |
| R* | Reputation |
| AL* | Allies |

---

## 6. Balance gates (every new addition)

**Expand only when each addition clears all gates.** No “content dump then retune later” for foundation-critical economies (ballot, GOTV, money).

### 6.1 Design gates

1. **Role** — one clear job (`ballot_access`, `grind_safe`, `gotv`, `risk_trap`, `shop_sink`, …).  
2. **Path** — labor / money / hybrid / neutral; do not silently invalidate dual ballot.  
3. **Cost vs yield** — compare to nearest existing peer (e.g. new walk-like vs PL01).  
4. **Risk honesty** — SAFE never disasters; VOL must occasionally punish.  
5. **Power not clean** — strong $ or ballot shortcuts carry OB / exposure / debt / scar.  
6. **Stage legality** — correct `ph` / interim-session catalog.  
7. **Reachability** — grant path or intentional gate (`harness:dead-refs`).  
8. **Attrs + tag + prose** — complete card surface.  
9. **CSV row** — re-export after code change.  
10. **Docs** — BALANCE-NOTES entry if numbers move; SRD if rules change; ROADMAP if scope shifts.

### 6.2 Numeric peer anchors (do not break without re-measure)

| Peer | Anchor intent |
|------|----------------|
| PL01 Block Walk | SAFE spine; contacts + rapport; never disasters |
| PL04 Petition | Labor ballot; ~90% qualify with focus + some vol (see BALANCE-NOTES) |
| PL05 Filing fee | Money ballot; faster but $ gated |
| PL13 Fish Fry | Clean small-dollar; enables list |
| PL19 GOTV | General lever; must appear in general draw |
| PL20 / PL21 | Risk money; obligations OB1 / OB2 |
| Shop A12 Billboard | Expensive passive name ID |

### 6.3 Harness gates (must stay green)

| Command | Guards |
|---------|--------|
| `npx tsc --noEmit` | Types |
| `npm run harness` | Full suite |
| `harness:ballot` | Dual-path qualification envelope |
| `harness:full` | Primary→general rates, GOTV |
| `harness:career` | Multi-cycle persona lock |
| `harness:shop` | Shop + loot |
| `harness:dead-refs` | Unreachable ids / soft dead refs |
| `harness:obligations` | Weekly drag |
| `harness:audit` | SRD play shape |

Any new card that touches ballot, GOTV, or week economy must update or cite a harness number in `BALANCE-NOTES.md`.

### 6.4 Strategy envelope (souls-like, not broken)

Scripted strategies (`labor`, `money`, `hybrid`, `grind`) are the canaries:

- **Grind** ignoring ballot ≈ miss filing (control).  
- **Labor vs money** both viable, different texture (AP vs $).  
- Overall general wins stay scarce; skilled play improves odds via assets/GOTV, not pity.

---

## 7. Expansion process (how we grow)

Do **not** open the floodgates until foundation checklist is true.

### Foundation checklist (bootstrap)

- [x] Layer split (data / engine / UI / harness)
- [x] Seeded RNG + pure resolve (SAFE band = 0)
- [x] Persistent career state machine
- [x] Dual ballot access + camp actions
- [x] Attr mod on plays
- [x] Shadow + core rep grants
- [x] Obligations tick
- [x] Shop money sinks + failure loot UI
- [x] Thin session + interim residue + thematic forks
- [x] Card CSV export + architecture contract (this doc)
- [ ] Ground pick UI (player-facing) — open
- [ ] Full ally port (AL*) — open
- [ ] Remaining rep grants needing counters — open
- [ ] Full session bill pipeline — deferred (not foundation)

### When adding a card (order of work)

1. Write design one-liner: role, path, peer, risk, cost.  
2. Implement in correct data file with full `PlayCard` contract.  
3. Wire grants (ally/rep/asset/ob) if claimed in text.  
4. `export:cards` → inspect CSV row.  
5. Typecheck + relevant harnesses.  
6. BALANCE-NOTES measurement if economy moves.  
7. SRD touch if rule/state-machine change.  
8. ROADMAP mark.

### What not to do yet

- Mass-import archive’s 56 cards without peer balancing.  
- New personas that rewrite economies without harness.  
- Second deck format or Unity-only cards.  
- Soft-pity RNG or SAFE disasters.  
- Free identity re-pick menus.

---

## 8. Module map (engine)

| Module | Role |
|--------|------|
| `types.ts` | GameState, PlayCard, residues, outcomes |
| `rng.ts` | Seeded stream |
| `resolve.ts` | Four-tier resolve |
| `state.ts` | Factory, defaults |
| `calendar.ts` | Stages, phases, election math |
| `career.ts` | Interim / session / next primary / residue apply |
| `identity-shift.ts` | Thematic forks (never persona) |
| `play.ts` | Afford, legal, attr mod, executePlay |
| `deck.ts` | Draw / hand / draft inject |
| `loop.ts` | Campaign session API |
| `strategies.ts` | Scripted choosers |
| `reputation.ts` | Allies, reps, shadow |
| `obligations.ts` | Weekly drag registry |
| `failure-loot.ts` | Cycle scars / deck loot |
| `feedback.ts` | Juice (no RNG) |
| `prototype-compat.ts` | Archive parity helpers |

---

## 9. UI surface (thin)

| Concern | Implementation |
|---------|----------------|
| Setup once | Persona (forever) + issue/district/region |
| Ledger | Money, debt, AP, contacts, name, stage, ballot |
| Kit strip | Shop assets + trophies/flags |
| Shop | Buyable assets |
| Risk label | `trap: true` → UI “Risk” / “RISK” |
| Debug persona | TAX MAN password-gated; not in harnesses |
| Persist | `localStorage` career key |

---

## 10. Versioning & CI

- `package.json` version remains **below 0.1.0** until AC1–AC5 evidence is recorded.  
- CI: typecheck + harness + build on push/PR.  
- GitHub Pages deploys built Vite app from Actions (not raw branch source).

---

## 11. Related docs

| Doc | Use |
|-----|-----|
| `docs/SRD-NOTES.md` | Design law / recovered SRD |
| `docs/BALANCE-NOTES.md` | Measured retunes |
| `docs/ROADMAP.md` | Phased work + evidence |
| `docs/AC1-NOTES.md` | Acceptance / Texas procedure notes |
| `data/cards.csv` | Full content inventory |
| `AGENTS.md` | Agent pass discipline |

---

*Last foundation bootstrap: 2026-07-17 — architecture rewritten as expansion gate; cards CSV export added.*
