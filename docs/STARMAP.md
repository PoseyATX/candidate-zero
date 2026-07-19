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

## Pilot: Precinct Chair

| Piece | Detail |
|---|---|
| Entity | `ENT_PRECINCT_CHAIR` → ally `AL01` |
| Loop | `LOOP_ENT_PRECINCT_CHAIR` |
| Advancement | 2× warm AL01 **or** endorsePts ≥ 2 + warm AL01 |
| Verb | **MV01** “Call in the Precinct Chair network” |
| Yield | +2 endorse, +40 contacts, +1 vol; `entityHistory`; `orbit_precinct_power` |
| Wire | `syncMovementFlags` after each play / week advance; camp-style offer when open |

Does **not** leave primary/general — overlay on existing campaign.

---

## What is stub vs live

| Live | Stub |
|---|---|
| Full entity catalog | Higher-tier deep subloops |
| Full orbit skeleton | Timing/attr-gated orbit filtering (basic only) |
| Loop IDs for waiting/elected/templates | Most advancement conditions `manual_todo` |
| Pilot MV01 e2e | Multi-entity playable loops |
| Bridges to AL* | Waiting loops replacing Chronicle UI |

---

## Next roads (not this v0)

1. Ceremony / act delineation (feel of transitions)  
2. Second pilot: Canvass Captain / County Judge  
3. Waiting loops absorb Chronicle paths  
4. Movement UI (orbit awareness) — Phase 6 adjacent  
