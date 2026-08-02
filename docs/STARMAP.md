# Starmap — Political career graph (v0)

**Design law:** [#17](https://github.com/PoseyATX/candidate-zero/issues/17) · [#18](https://github.com/PoseyATX/candidate-zero/issues/18)  
**Harness:** `npm run harness:starmap`  
**Philosophy:** Cartography first. Decade-scale. Done next to win and lose.

There is **no true game over** — only redirection into a new orbit. This folder is the map of Texas political actors, their influence webs (orbits), and career cycles (loops). Most of it is **data not yet playable**. **Eleven** entity templates are live (MV01–11).

---

## The far horizon — recorded 2026-08-02, from the owner. Not scheduled. Not forgotten.

This is where the whole thing is going. It is written here rather than in a backlog because
it is a *direction*, not a ticket, and everything built between now and then should be built
so it can grow into this shape rather than have to be torn out.

**A living chamber, procedurally generated.**

- **All 181 members**, both chambers — 150 House, 31 Senate — not the 18 hand-authored names
  in `data/members.ts`. Those eighteen are a proof of the mechanism (name, county, want,
  price, memory), deliberately small enough to write with real voice. The generator has to
  produce that same texture at scale: a person, a county, a thing they need, and a reason
  they are the way they are.
- **Statewide executives and commissioners who win and lose their offices as you progress.**
  The Governor who vetoes you in your first session should be beatable, replaceable, and
  someday gone — and the Land Commissioner who owed you a favour may be the Governor by your
  fourth cycle. Positions are held by people, and people lose them.
- **The feeling to hit:** new blood walking into the pink dome for the first time since a
  grade-school field trip. Overwhelmed, and slowly learning which of the hundred and eighty
  faces actually matters this week.

**And the texture that makes it a place rather than a board:**

> *"Everywhere that a card could be played, there should be an opportunity to play it. The
> open world of the game means every moving part can be acted upon by the player, even if
> that means taking them down a rabbit hole that uses up their cards and actions wastefully.
> The game should have alleyways, some of which are shortcuts, some of which are traps."*

That was the original starmap concept: an intricate interconnection between every card —
persona, position, action, asset, ally — where playing one produces pathways or consequences.
A menu of only-good options is a spreadsheet. **Wasting an afternoon has to be possible**, or
none of the choices are real.

> *"One of the most odd things about the capitol is, among the overwhelming spirit of action
> and controversy and debate and victory and defeat, is HOURS of boredom and minutiae that
> allow for the infamous extracurriculars."*

The boredom is not dead air to be designed out. It is the medium the extracurriculars happen
in — the back rail, the members' lounge, the four hours waiting on a quorum call. Any design
that optimises all the idle time away removes the thing that makes the building itself a
character.

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
src/data/plays-starmap.ts      # MV01–11 verb cards
src/data/starmap/pilots.ts     # playable template registry
```

---

## How to add an entity

1. Add `e('ENT_…', name, tier, cluster, flavor, primaryLoopId)` in `entities.ts`.  
2. Ensure `primaryLoopId` exists in `loops.ts` (template or named).  
3. Add ≥1 orbit in `orbits.ts` (or rely on ambient orphan-fill — prefer real edges).  
4. Optional: `allyId: 'AL0X'` bridge if same fiction as live ally.  
5. `npm run harness:starmap`.

---

## Playable entity templates (14)

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
| 9 | Finance Chair | AL10 | **MV09** | AL10 / endorse≥1+$≥1000 | +$900, +20 contacts, +1 endorse |
| 10 | Radio Host | AL05 | **MV10** | AL05 / name≥12 | +9 name, +2 mom, +25 contacts, Faces F |
| 11 | Junior Lobbyist | AL13 | **MV11** | AL13 / OB1 / endorse≥2+$≥800 | +45 contacts, +1 endorse, +1 mom, +1 capital, favor |
| 12 | Union Local Pres | — | **MV12** | name≥8+vol≥4 / endorse≥3 | +3 vol, +2 endorse, +35 contacts, gate GOTV |
| 13 | Chamber Exec | — | **MV13** | endorse≥2+$≥1000 / name≥14 | +$500, +2 endorse, +5 name, +30 contacts |
| 14 | Feed-Store Regulars | AL07 | **MV14** | AL07 / name≥10+vol≥2 | +55 contacts, +4 name, rural rapport |

- Special residency + `entityScope`; multi-orbit camp offers (−401+).  
- Overlay on primary/general — not a stage leave.

---

## What is stub vs live

| Live | Stub |
|---|---|
| Full entity catalog | Higher-tier deep subloops |
| Full orbit skeleton | Timing/attr-gated orbit filtering (basic only) |
| Loop IDs for waiting/elected/templates | Most non-pilot advancement still `manual_todo` |
| **14 playable templates** (MV01–14) | Deeper higher-office campaigns |
| Bridges to AL* | Movement UI modal (Phase 6 adjacent) |

---

## Card residency (entity kits)

Entity/loop verbs are **Special** cards (`residency: 'special'`), not Main.
MV01–14 carry `entityScope`. Session SS* are the elected-member Special package.

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

1. More templates (kitchen cabinet / old bull / community org / biz PAC)  
2. Outside pack #2 **shipped** (16 events) — further Outside as needed  
3. Deeper higher-office campaigns (not just exploratory waiting)
