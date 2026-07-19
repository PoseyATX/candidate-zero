# Starmap — Political career graph (v0)

**Design law:** [#17](https://github.com/PoseyATX/candidate-zero/issues/17) · [#18](https://github.com/PoseyATX/candidate-zero/issues/18)  
**Harness:** `npm run harness:starmap`  
**Philosophy:** Cartography first. Decade-scale. Done next to win and lose.

There is **no true game over** — only redirection into a new orbit. This folder is the map of Texas political actors, their influence webs (orbits), and career cycles (loops). Most of it is **data not yet playable**. One **pilot road** is live: the Precinct Chair network (MV01).

---

## Legend

| Term | Meaning |
|---|---|
| **Entity** (`ENT_*`) | A political role/actor (Intern → Speaker → South Steps activist) |
| **Orbit** (`ORB_*`) | Directed influence edge between entities (strong / medium / weak) |
| **Loop** (`LOOP_*`) | Themed play cycle (waiting, elected, entity primary/sub) |
| **ConditionSpec** | Declarative advancement/setback (engine evaluates `kind`) |
| **Movement** | Contextual verb when advancement fires (pilot: MV01) |

---

## Counts (v0 baseline)

Run harness for live numbers. At first land:

- **~90+ entities** across tiers 0–8 (procedural)
- **~100+ orbits** (no orphans)
- **~50+ loops** (waiting, elected, templates, T0–2 named, pilot subs)

---

## File map

```
src/engine/types-entities.ts   # types
src/engine/entities.ts         # query + conditions + syncMovementFlags
src/data/starmap/
  entities.ts                  # full ENT_* catalog
  orbits.ts                    # ORB_* graph
  loops.ts                     # LOOP_* registry
  bridges.ts                   # ENT_* ↔ AL*
  pilot-precinct.ts            # pilot constants
src/data/plays-starmap.ts      # MV01 verb card
```

---

## How to add an entity

1. Add `e('ENT_…', name, tier, cluster, flavor, primaryLoopId)` in `entities.ts`.  
2. Ensure `primaryLoopId` exists in `loops.ts` (template or named).  
3. Add ≥1 orbit in `orbits.ts` (or rely on ambient orphan-fill — prefer real edges).  
4. Optional: `allyId: 'AL0X'` bridge if same fiction as live ally.  
5. `npm run harness:starmap`.

---

## Playable pilots (≥3 — acceptance met)

Registry: `src/data/starmap/pilots.ts` · verbs: `src/data/plays-starmap.ts`  
Harness: `npm run harness:starmap` (all three e2e).

| # | Entity | Ally | Verb | Advancement | Yield (once) |
|---|---|---|---|---|---|
| 1 | `ENT_PRECINCT_CHAIR` | AL01 | **MV01** Call in precinct network | 2× warm AL01 **or** endorse≥2+AL01 | +2 endorse, +40 contacts, +1 vol · `orbit_precinct_power` |
| 2 | `ENT_CANVASS_CAPTAIN` | AL09 | **MV02** Execute the field plan | warm AL09 **or** name≥8+vol≥3 | +1 field AP, +2 vol, +25 contacts, GOTV on turf · `orbit_field_spine` |
| 3 | `ENT_COUNTY_JUDGE` | AL15 | **MV03** Spend the courthouse nod | warm AL15 **or** endorse≥4+name≥16 | +3 endorse, +8 name, +2 mom, +30 contacts · `orbit_courthouse_nod` |

- Special residency + `entityScope`; camp offers when orbit open (multi-orbit OK).  
- Does **not** leave primary/general — overlay on campaign.  
- Wire: `syncMovementFlags` after plays / week advance.

---

## What is stub vs live

| Live | Stub |
|---|---|
| Full entity catalog | Higher-tier deep subloops |
| Full orbit skeleton | Timing/attr-gated orbit filtering (basic only) |
| Loop IDs for waiting/elected/templates | Most non-pilot advancement still `manual_todo` |
| **3 playable pilots** (MV01–03) | Waiting loops replacing Chronicle UI |
| Bridges to AL* | Movement UI modal (Phase 6 adjacent) |

---

## Card residency (entity kits)

Entity/loop verbs are **Special** cards (`residency: 'special'`), not Main.
MV01–03 carry `entityScope`. Session SS* are the elected-member Special package.

**Law:** do not invent 93 unique decks — use **role templates + deltas**.
Outside (world) cards never live on entity kits. Full design:
[`CARD-RESIDENCY.md`](./CARD-RESIDENCY.md).

---

## Next roads

1. Waiting loops absorb Chronicle paths  
2. Movement UI (orbit awareness) — Phase 6 adjacent  
3. More pilots by template (County Party, Faith Leader, …) — not unique decks  
4. Higher-office forks (Senate / statewide)
