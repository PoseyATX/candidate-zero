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

## Playable entity templates (8)

Registry: `src/data/starmap/pilots.ts` · verbs: `src/data/plays-starmap.ts`  
Harness: `npm run harness:starmap` (all e2e). **Templates + deltas only** — not 93 decks.

| # | Entity | Ally | Verb | Advancement | Yield (once) |
|---|---|---|---|---|---|
| 1 | Precinct Chair | AL01 | **MV01** | 2× AL01 / endorse+AL01 | +2 endorse, +40 contacts, +1 vol |
| 2 | Canvass Captain | AL09 | **MV02** | AL09 / name≥8+vol≥3 | field AP, vols, GOTV on turf |
| 3 | County Judge | AL15 | **MV03** | AL15 / endorse≥4+name≥16 | +3 endorse, +8 name, +2 mom |
| 4 | County Party | AL02 | **MV04** | AL02 / 3× AL01 | +2 endorse, +2 vol, +50 contacts, $400 |
| 5 | Club Leader | AL03 | **MV05** | AL03 / endorse≥3 | +1 endorse, +60 contacts, +1 vol |
| 6 | Local Editor | AL04 | **MV06** | AL04 / name≥14 | +10 name, +2 mom, Faces F |
| 7 | Faith Leader | AL08 | **MV07** | AL08 / B02+name≥10 | +3 vol, corridor open, A13 directory |
| 8 | Slate-Maker | AL16 | **MV08** | AL16 / OB3 / AL02+$+endorse | +3 endorse, +12 name, +2 mom, +40 contacts |

- Special residency + `entityScope`; multi-orbit camp offers (−401+).  
- Overlay on primary/general — not a stage leave.

---

## What is stub vs live

| Live | Stub |
|---|---|
| Full entity catalog | Higher-tier deep subloops |
| Full orbit skeleton | Timing/attr-gated orbit filtering (basic only) |
| Loop IDs for waiting/elected/templates | Most non-pilot advancement still `manual_todo` |
| **8 playable templates** (MV01–08) | Waiting loops replacing Chronicle UI |
| Bridges to AL* | Movement UI modal (Phase 6 adjacent) |

---

## Card residency (entity kits)

Entity/loop verbs are **Special** cards (`residency: 'special'`), not Main.
MV01–03 carry `entityScope`. Session SS* are the elected-member Special package.

**Law:** do not invent 93 unique decks — use **role templates + deltas**.
Outside (world) cards never live on entity kits. Full design:
[`CARD-RESIDENCY.md`](./CARD-RESIDENCY.md).

---

## Chronicle waiting bridge + playable season

Interim paths map to starmap loops (`PATH_TO_WAITING_LOOP`):

| Path | Loop | Season kit |
|---|---|---|
| perennial | `LOOP_WAITING_PERENNIAL` | WA01/04/06/07 |
| advocate | `LOOP_WAITING_ADVOCATE` | WA01/02/06/08 |
| staffer | `LOOP_WAITING_STAFFER` | WA01/03/06/08 |
| home | `LOOP_WAITING_HOME` | WA01/04/06 |
| exmember | `LOOP_WAITING_EXMEMBER` | WA05/06/07/09 |
| senate | `LOOP_ELECTED_HIGHER_SENATE` | WA05/07/08/09 |
| statewide | `LOOP_ELECTED_HIGHER_STATEWIDE` | WA05/07/08/09 |

**Playable:** 4 weeks × 1 AP, WA* Special verbs, bank to `legacy.carry`, then next filing.  
Harness: `npm run harness:waiting`.

## Next roads

1. Movement UI (orbit awareness) — Phase 6 adjacent  
2. Deeper higher-office campaigns (not just exploratory waiting)
