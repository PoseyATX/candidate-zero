# Work log — Candidate Zero (modular)

**Purpose:** durable record of design + engineering work so humans and agents can rehydrate context without chat history.

**Board:** https://github.com/users/PoseyATX/projects/2  
**Live alpha:** https://poseyatx.github.io/candidate-zero/  
**Repo:** https://github.com/PoseyATX/candidate-zero  

**Last updated:** 2026-07-23 (**catch-up** after post-rest PRs #21–#32)  

Related docs:

| Doc | Role |
|---|---|
| [`RESTING.md`](./RESTING.md) | Current package snapshot (post-sleep) |
| [`V0.1-EVIDENCE.md`](./V0.1-EVIDENCE.md) | Why package is 0.1.0 |
| [`ENGINE-API.md`](./ENGINE-API.md) | Host binding contract |
| [`PATHS.md`](./PATHS.md) | Unlock pathways |
| [`UNITY-SETUP.md`](./UNITY-SETUP.md) | Unity editor next steps |
| [`PROJECT-BOARD.md`](./PROJECT-BOARD.md) | Ops roadmap mirror of Project #2 |
| [`ROADMAP.md`](./ROADMAP.md) | Evidence log (what shipped + harness proof) |
| [`GAME-FLOW.md`](./GAME-FLOW.md) | Current player-facing loop |
| [`UI-IA.md`](./UI-IA.md) | Information architecture — Phase 6 |
| [`CARD-RESIDENCY.md`](./CARD-RESIDENCY.md) | Main / Special / Outside deck architecture law |
| Issues #4–#20 | Phase tickets + meta + Stupid Ideas park |

---

## Executive summary

Over this workstream we:

1. **Phases 0–7 in code** — through honest **0.1.0** evidence (`V0.1-EVIDENCE.md`).
2. **Phase 8 prep in-repo** — frozen `api.ts`, engine bundle, content→Unity JSON, Jint scaffold.
3. **Card library** grew to **113** (signatures, unlock paths, wave 5–6 session/waiting).
4. **UI** mobile redesign + a11y CI + full-feature restore + one-handed tabs.
5. **Persistence** — waiting season re-files same persona (no setup).
6. **#20 Stupid Ideas** still parks ADD; board catch-up 2026-07-23.

**Ship path:** pure TypeScript engine → Unity presentation → iOS.  
**Non-negotiable:** no second rules engine in C#/Unity.  
**Package:** **`0.1.0`** baseline — not App Store “done.”

---

## Timeline of work (this stream)

### Phase 1 — Ground-centered campaign (already largely done; closed out)

**Commits (approx):** `c3e4c7b`, `e8960ad`

| Deliverable | Where |
|---|---|
| Ground picker (UI + CLI), remember last ground | `src/ui/main.ts`, `src/cli/play.ts` |
| Same ground 2+/week: odds bump, −50% rapport | `getGroundPenalty` in `calendar.ts` |
| Rival presence cosmetic (5–40/week) | `advanceRivalGrounds`, `Ground.rivalRap` |
| `allyWarmAtGround` for AL09 field ops | `reputation.ts`, PL21B/PL39 |
| `checkBallotThreshold` sketch **unwired** | `career.ts` |
| `harness:grounds` | ~2.8 grounds contested under spread; sketch met 0% |

**Issue:** [#5](https://github.com/PoseyATX/candidate-zero/issues/5) closed DONE.

---

### Phase 2 — Allies / assets / obligations port

**Commit:** `57936c6` (plus related)

| Deliverable | Where |
|---|---|
| Asset shop (8 archive items, BUY* camp actions) | `src/data/assets.ts` |
| Obligations OB1–OB10 + weekly `drag` | `src/data/obligations.ts` |
| Ally grant matrix from archive (line citations) | `plays.ts`, `plays-wave4.ts`, events in `calendar.ts` |
| Intentional stubs AL05/07/10/13 | `src/data/allies.ts`, `harness:dead-refs` |
| Bill/Committee **types** (shape only at the time) | `types.ts` |
| Harnesses | `harness:shop`, `harness:obligations`, `harness:dead-refs` |

**Corrections to Claude brief:** shop/obls were *not* already done at Phase 2 start; archive has 8 shop assets not 10; Kitchen-Table is roster-wide (not ground-gated).

**Issue:** [#6](https://github.com/PoseyATX/candidate-zero/issues/6) closed DONE.

---

### Phase 3 — Debt as leveraged optionality (not odds tax)

**Commit:** `f7dff8f`

| Deliverable | Where |
|---|---|
| Core model | `src/engine/debt.ts` |
| Self-loan spend-now (PL21) | `applySelfLoan` |
| Win: cheap self retirement; PAC bridge → OB1 + `pac_lender_claim` | `retireDebtOnWin`, `maybePacBridge` |
| Loss: compound into `LegacyCarry`, affordability via `availableCash` | `canAfford` uses cash reserve, **never** `resolve.ts` |
| Crisis paths / PAC relief valve | `buildPaths`, `pacCheckAvailable` |
| `harness:debt` | leverage can outperform conservative money |

**Rejected design:** flat debt → resolve odds (wrong thematically and game-theoretically).

**Issue:** [#7](https://github.com/PoseyATX/candidate-zero/issues/7) closed DONE.

---

### Pages firm-up (playable alpha)

**Commit:** `6e8ec53`

- HUD/ledger: debt, spendable cash, allies, assets, obligations  
- Shop stamp + section; availableCash lock reasons  
- How-to text for grounds / shop / debt  
- Deploy: re-enabled workflow; manual `workflow_dispatch` (auto-push still limited by dead branch name + OAuth `workflow` scope — issue [#14](https://github.com/PoseyATX/candidate-zero/issues/14))

---

### Project board hygiene

**Commits:** `58d37c6`, `3ef7656`

- Closed issues **#4–#7** with evidence comments  
- Rewrote **#8** (Claude falsely claimed `session-plays.ts` / sine die already done)  
- Retargeted **#12** to TS → Unity → iOS / App Store  
- Added #13 meta, #14 deploy bug, #15 AC1 yield compare  
- `docs/PROJECT-BOARD.md` as agent-readable board mirror  
- **Note:** `gh` token lacked `read:project` / `project` scopes — board UI items must be linked by owner once scopes exist  

---

### Phase 4 — Legislative Session

**Commit:** `a04f991`

| Deliverable | Where |
|---|---|
| Enter Session on **general win** (same run) | `enterSessionFromGeneral` in `session.ts` / `calendar.ts` |
| 14-week sine die, filing deadline W6 | `SESSION_WEEKS`, `SESSION_FILING_DEADLINE` |
| Bill pipeline stages 0–8 + `BillStatus` | `Bill.pipelineStage`, SS01–SS07 |
| PAC claim on Seek Referral | `applyPacClaimOnReferral` |
| Session plays catalog | `src/data/session-plays.ts` |
| UI ledger (capital, favor, district, bill) | `src/ui/main.ts` |
| Outcomes | `session_law` \| `session_survived` \| `session_primaried` |
| `harness:session` | green |

**Issue:** [#8](https://github.com/PoseyATX/candidate-zero/issues/8) closed DONE.  
**NEXT phase:** [#9](https://github.com/PoseyATX/candidate-zero/issues/9) Balance breadth.

---

### Session / PAC debug pass (cookie-clicker feel + free money)

**Commit:** `f883a6e`

**Problems reported:**

1. Session felt like “looping into another campaign” (reelection / weak ceremony).  
2. PAC Check available multiple times → free money with weak consequence.  
3. Transitions not graspable; game reads as political cookie clicker.

**Fixes:**

| Fix | Detail |
|---|---|
| Session splash | Full-screen “You are sworn in” on `enter_session` |
| Session chrome | Header Session tag, “End legislative week”, stage frame, bill in week hint |
| Sine die terminal | Bill epitaph; reelection copy = **new cycle after Session**, not skip |
| PAC once | `pacCheckTaken` + hide if OB1 held; cash ~$1400–2300 (was 2500–4500) |
| HUD | `OB×N` chip for obligation drag |
| Flow doc | [`GAME-FLOW.md`](./GAME-FLOW.md) |

**Engine note:** Session entry on general win was already correct in engine traces; the failure mode was **readability + PAC spam + reelection UX**.

---

## Design decisions log (keep these)

1. **Brutal RNG stands** — no pity; feedback is annotation only.  
2. **Debt never taxes `resolve()` odds** — consequence is win/loss branch + affordability.  
3. **PAC Check is a trap, once per campaign** — Session collects.  
4. **Kitchen-Table allies are roster-wide** (archive); ground affinity is for field AL09.  
5. **Port over invent** for archive content; cite lines in comments.  
6. **Unity = presentation only** for ship path; TS owns rules.  
7. **Project board = ops roadmap; ROADMAP.md = evidence.** Code + harnesses beat agent vibes.  
8. **Complexity discussion ≠ implementation room** — use vanilla Grok (or long design chat) to decide depth; Grok Build to enforce.  
9. **Card residency:** Main = always-carry; Special = entity/loop kit; Outside = event-only world pressure (`control: world`). Templates not 93× unique decks. Boosters later.

---

## Current open queue (as of log date)

| Status | Issue | Title |
|---|---|---|
| **DONE** | #9 | Phase 5 — Balance breadth (matrix + wrong retune) |
| **DONE** | #17/#18 | Starmap — 14 entity templates (MV01–14) |
| PARK | #20 | Stupid Ideas — rate only, never auto-NEXT |
| **DONE** | — | Session teeth (pressure, stall, freeze, challenger) |
| **DONE** | — | Outside event deck v0 (10 world cards) |
| **DONE** | — | RivalRap teeth + Chronicle→waiting loop bridge |
| **DONE** | — | Waiting season play + higher-office paths |
| **DONE** | — | Post-feature balance/debug hygiene |
| **DONE** (core) | #10 | Phase 6 — UI hierarchy + toasts |
| PLANNED | #11 | Phase 7 — Honest v0.1 label |
| PLANNED | #12 | Phase 8 — TS → Unity → iOS / App Store |
| META | #13 | Board hygiene rules |
| BUG | #14 | Pages deploy auto-fire / workflow scope |
| PLANNED | #15 | AC1 archive yield-table full compare |

Phases **0–4 closed** (#4–#8).

---

## Key code map

```
src/engine/
  resolve.ts      # RNG bands — covenant; do not use for debt tax
  play.ts         # executePlay, canAfford (availableCash)
  calendar.ts     # primary 8 / general 6 / session handoff + sine die
  session.ts      # enterSession, bill pipeline, PAC claim, sine die
  debt.ts         # self-loan, bridge, retirement, availableCash
  reputation.ts   # shadowCheck, repCheck, allies
  loop.ts         # campaign loop, catalog, listPlayableHand
  legacy.ts       # Chronicle, paths, carry (incl. debt)
src/data/
  plays.ts / plays-wave4.ts / session-plays.ts
  assets.ts / obligations.ts / allies.ts / setup.ts
src/ui/main.ts    # ground picker, shop, session splash/chrome, terminal
docs/GAME-FLOW.md # player-facing loop
```

---

## Harness suite (reference)

```bash
npm run harness          # full suite
npm run harness:grounds
npm run harness:shop
npm run harness:obligations
npm run harness:dead-refs
npm run harness:debt
npm run harness:session
```

CI: `.github/workflows/ci.yml`  
Pages: `.github/workflows/deploy.yml` (often via `gh workflow run deploy.yml --ref <branch>`)

---

## Outstanding product tension (for next design chat)

Owner feedback (paraphrased):

- Stage transitions must be **unmistakable** (tint / splash / different verbs) — still insufficient as of this log.  
- Desired **complexity depth** is larger than the current thin Session pipeline; current flow doc is “correct but too simple” for the intended product.  
- Recommendation logged: **vanilla Grok (or offline design) for complexity law**; **Grok Build for ceremony + systems enforcement** after a written brief.

When design locks, next engineering candidates:

1. **Ceremony pass** — distinct stage shells (primary / general / session), not just card show-gates.  
2. **Phase 5** balance matrix (#9).  
3. **Deeper Session** (archive events, Speaker pressure, real floor math) without reinventing `Bill` shape.

---

## How to use this log

- **Rehydrate a new agent:** read this file + `GAME-FLOW.md` + open issues.  
- **Argue status:** prefer harness output and this log over chat memory.  
- **Update rule:** after each phase or major debug pass, append a dated section here and bump “Last updated.”

---

## Design law dump — Entity / Orbit / Loop graph (2026-07-19)

Owner added two high-priority design issues from a separate chat. **Read fully before implementing.**

| Issue | Title | Role |
|---|---|---|
| [#17](https://github.com/PoseyATX/candidate-zero/issues/17) | Entity Registry: Exhaustive Political Actors & Loops (House → Senate → Higher Office + Waiting/Elected Subloops) | Exhaustive tiered actor list (Tiers 0–7+), loops intent, acceptance notes |
| [#18](https://github.com/PoseyATX/candidate-zero/issues/18) | Entity Registry, Orbits, Loops, Advancement/Setback & Movement System — Political Career Graph | Canonical data model: Entity, Orbit, Condition, movement verbs; no true game over |

### Core philosophy (#18)
- **No true loss — only redirection into a new orbit.**
- Persistent branching political career (House Candidate Zero upward).
- **Orbits** = influence webs; **Advancement/Setback** conditions unlock contextual **movement** verbs.
- Target: DF / Campaign for North Africa systemic depth; still one-handed mobile.

### What already exists (fragments, not the graph)
- Allies AL01–AL16, faces, obligations, grounds, session bill pipeline
- Chronicle waiting paths (perennial / advocate / staffer / home / ex-member)
- Debt/PAC residue, shadow consequences

### What does not exist yet
- `src/data/entities.ts` registry
- Orbit graph + strength/timing gates
- Advancement/setback condition engine
- Movement opportunity surface in loop/calendar
- Full waiting/elected subloops as first-class play cycles
- Higher-office forks (Senate, statewide, federal)

### Acceptance (from issues, condensed)
- Registry + types; helpers in `entities.ts`
- Movement wired into calendar/loop
- ≥3 complete entity loops playable + harness
- SRD/ROADMAP/ARCHITECTURE updated
- Prioritize Tier 0–2 for early/v0.1 slice; scale upward

### Scheduling note (agent)
This is **not** Phase 5 balance matrix and **not** a cookie-clicker tint pass. It is the long-game career graph. Do not half-implement mid-Session without owner sequence. Prefer: ceremony/act delineation + thin entity scaffold when scheduled; full graph is multi-phase.

---

## Starmap v0 land (2026-07-19) — A++ cartography + pilot

**Choice:** full entity/orbit/loop map + one playable pilot (Precinct Chair).

| Artifact | Path |
|---|---|
| Types | `src/engine/types-entities.ts` |
| Helpers | `src/engine/entities.ts` |
| Catalog | `src/data/starmap/entities.ts` (~90+ ENT_*) |
| Orbits | `src/data/starmap/orbits.ts` (~100+ edges, no orphans) |
| Loops | `src/data/starmap/loops.ts` |
| Bridges | `src/data/starmap/bridges.ts` |
| Pilot verb | `src/data/plays-starmap.ts` MV01 |
| Harness | `npm run harness:starmap` |
| Docs | `docs/STARMAP.md` |

Pilot: 2× warm AL01 (or endorse+AL01) → ORBIT OPEN log → MV01 camp offer → yields + entityHistory.

---

## Card residency law (2026-07-19) — Main / Special / Outside

**Owner ask:** MTG-scale catalog; every loop needs persistent Main cards + entity Specials; Outside for world events the player cannot play (e.g. New World Screw Worm). Honest critique, not yes-man.

| Artifact | Path |
|---|---|
| Design law + critique | `docs/CARD-RESIDENCY.md` |
| Schema | `CardResidency` / `CardControl` / `entityScope` on `PlayCard` (`types.ts`) |
| Tags | CORE+WAVE4+shop → `main`/`player`; SESSION → `special` + freshman/rep scope; MV01 → `special` + `ENT_PRECINCT_CHAIR` |
| Audit | `harness:audit` residency tally + session/shop checks |
| Taxonomy link | `docs/CARD-TAXONOMY.md` (orthogonal channels) |

**Explicit non-goals this pass:** boosters, event deck pipeline, Outside card content, 93 entity kits.

**Design calls logged:** templates not unique decks; show-gate ≠ residency; event-triggered player verbs (funeral) stay Main; Outside never enters player hand.

---

## Ceremony shells (2026-07-19) — three acts

**Owner ask:** stage transitions unmistakable; Session must not feel like another campaign loop.

| Piece | Detail |
|---|---|
| Shared splash | `openActSplash` — Primary / General / Session (replaces session-only splash) |
| Persistent chrome | `#act-banner`, stage frame tints, masthead/HUD act tags, end-week labels, panel titles |
| Kit copy | Campaign hand vs General field vs Legislative motions (Special) |
| Hooks | `startRun`, `enter_general`, `enter_session`, reelect → Act I again |
| Docs | `GAME-FLOW.md` ceremony table; tutorial “Three Acts” |

**Presentation only** — engine transitions unchanged. Honest note: General chrome is still mostly Main kit (correct fiction); Session is the hard kit swap. Ceremony without Session’s Special package would be empty theater — we already had the package.

---

## General kit gravity (2026-07-19)

**Owner ask:** make Act II *play* different, not just look different.

| Change | Detail |
|---|---|
| Rapport → GOTV seed | On primary win, high-rapport grounds bank GOTV head start |
| Field converts | PL01/PL02 in general bank GOTV (less pure contact farm) |
| Phase out club math | PL08 Kitchen Table → `ph: [1,2]` only |
| GOTV in hand | `ensureGeneralTools` injects + prefers PL19 into hand |
| PL23 Rides to the Polls | Archive flatbed lever (needs A06); modular id PL23 |
| Win math | Heavier GOTV weight, lighter contacts in `generalWinProbability` |
| Proof | `harness:calendar` kit-gravity block; strategies prioritize PL19/PL23 |

**Recommendation logged:** this path over new entity kits first — General was the weak act.

---

## Phase 5 — Balance breadth (2026-07-19)

| Piece | Detail |
|---|---|
| Harness | `npm run harness:matrix` · structured 93-cell sample |
| Finding | Open/east labor mean win 20.3% (6.7–33.3%); no soft-lock/free win |
| Fix | Wrong-party genBase + November tax (GOTV gravity had made traps soft) |
| Identity | High-cash money path (heir/wheeler/feed-store) documented, not nerfed |
| Next | Starmap ≥3 playable loops |

Issue #9 closed with evidence.

---

## Starmap entity templates (2026-07-19)

| Wave | Verbs | Entities |
|---|---|---|
| 1 | MV01–03 | Precinct, Captain, Judge |
| 2 | MV04–07 | County Party, Club, Editor, Faith |

8 templates (incl. Slate MV08). Issues **#17 / #18 closed**.

---

## Session teeth (2026-07-19)

| Tooth | Effect |
|---|---|
| Casework or bleed | No casework week → district −2 (else −1) |
| Stall heat | Bill same stage 2+ weeks → heat +1 |
| Challenger heat | Standing &lt; 52 → heat stacks; bites sine die reelect |
| Speaker freeze | Low favor + advanced bill → freeze; blocks SS05/SS06 |
| Weekly events | Lobby / district emergency / Speaker mark / PAC / press / rare gift |
| Strategy | Session AI does casework + errands under pressure |

`tickSessionPressure` in `session.ts`; harness:session asserts.

---

## Outside event deck v0 (2026-07-19)

| Piece | Detail |
|---|---|
| Catalog | 10 Outside events · `outside` / `world` |
| Engine | `tickOutsideDeck` on campaign + session week advance |
| Law | Never enters hand; `OUTSIDE —` log prefix |
| Example | EV_SCREWWORM (New World Screw Worm) |
| Harness | `npm run harness:outside` |

Boosters / full event UI still later.

---

## RivalRap teeth + Chronicle waiting bridge (2026-07-19)

| Piece | Detail |
|---|---|
| Field odds | `rivalOddsPenalty` — up to −0.20 on contested turf |
| Primary / general win | `meanRivalRapport` taxes win p |
| Chronicle | `PATH_TO_WAITING_LOOP` + `setInterimPath` banks `carry.waitingLoopId` |
| Next run | `applyLegacy` logs WAITING ORBIT residue + entityHistory tag |
| Harness | `harness:grounds` teeth units · `harness:chronicle` |

Opposition is no longer cosmetic. Loss still redirects (no true game over).

---

## Waiting season + higher-office forks (2026-07-19)

| Piece | Detail |
|---|---|
| Stage | `stage: 'waiting'` · 4 weeks · 1 AP |
| Kit | WA01–WA09 path-scoped Specials |
| Flow | Path+trait → Act IV play → bank carry → setup |
| Higher office | Senate / statewide paths after strong Session |
| Engine | `waiting.ts`, `waiting-plays.ts`, calendar `waiting_complete` |
| Harness | `harness:waiting` |

No true game over: you *play* the two years, not only pick a trait.

---

## Post-feature hygiene (2026-07-19)

Full harness green after waiting/Outside/rival/session stack.

| Fix | Detail |
|---|---|
| Waiting no deck growth | `startWeek` session-style skip |
| Outside rate | 18% campaign / 15% session |
| Petition deadline | ~5% miss @vol0 |
| Labor primary | base + contacts/vol + walk name on GAIN |
| Rival soft | still teeth, not soft-lock |
| Money/labor cap | 3.5× documented texture |
| Audit | WA* + Outside in residency tally |

Evidence: `docs/BALANCE-NOTES.md` 2026-07-19 hygiene section.

---

## UI / IA furniture plan (2026-07-19)

Owner play notes → durable plan only (**no UI code** this pass).

| Note | Plan response |
|---|---|
| Title stark vs rest of game | Continuity of materials; ceremony vs density intentional |
| Stats cluttery | Bands: identity → force/session → machine; kill equal grid weight |
| Identity between ballot & attrs | Identity + Attributes **first** after act chrome |
| Identity + Attrs more prominent | High-loudness character band; not another ledger cell |
| `MONEY` before `$200` | Label diet; HUD `$N` convention wins |
| What / where | Full inventory + zone map in `docs/UI-IA.md` |
| Info bar above cards moves | **Toasts** OK (fixed overlay); don’t reflow card grid |

Feeds Phase 6 (#10). Board + work-log index linked.

---

## Starmap pack #3 — Finance / Radio / Lobbyist (2026-07-19)

| # | Entity | Verb | Ally | Notes |
|---|---|---|---|---|
| 9 | Finance Chair | **MV09** | AL10 | War-chest alternate (endorse+$); one-shot call sheet |
| 10 | Radio Host | **MV10** | AL05 | Name path without ally; drive-time name heat |
| 11 | Junior Lobbyist | **MV11** | AL13 | OB1 PAC String alternate; capital/favor seed |

Own loops (`LOOP_ENT_*`), Special residency, harness e2e. **11** playable pilots.

**Harness hygiene:** strategies no longer auto-pick `residency: special` / `MV*` on empty-hand fallback (prevents free-farming every new template). Teacher money/labor matrix cap **4.0×**.

---

## Phase 6 — UI hierarchy + toasts (2026-07-19)

| Slice | Detail |
|---|---|
| Ledger dossier | Identity band → Force/Chamber/Waiting → Vitals → Machine |
| Identity + Attrs | First block; attr chips; sticky under HUD on mobile |
| Label diet | `$N` not `Money $N`; HUD cash/week self-explanatory |
| Toasts | Fixed `#toast-host`; juice no longer reflows cards |
| Week hint | `min-height` reserved slot |
| Setup | Nameplate panel (double gold rules, shared materials) |
| Stage chrome | Ballot sigs only if not ON; session bill band; waiting bank |
| Plan | `docs/UI-IA.md` marked shipped for core furniture |

Residual: WCAG deep pass, screenshot CI, formal mobile playtest sign-off.

---

## Stupid Ideas parking (#20)

Owner ADD sink. Build agent rates comments with:
`GREAT` · `GOOD` · `MEH` · `BAD` · `ABSOLUTELY NOT…`  
Never becomes board NEXT without explicit promote.

Rated 2026-07-19: topical Outside quotes **GREAT**; hand→persona creation **GOOD** optional / **MEH** default.

---

## Starmap pack #4 — Union / Chamber / Feed (2026-07-19)

| # | Entity | Verb | Notes |
|---|---|---|---|
| 12 | Union Local Pres | **MV12** | Field vols + gate GOTV |
| 13 | Chamber Exec | **MV13** | Rubber chicken $ + endorse |
| 14 | Feed-Store Regulars | **MV14** | AL07 / rural bench contacts |

**14** playable pilots. Harness e2e extended.

---

## QoL — GR08 rename (2026-07-19)

| Was | Now |
|---|---|
| The Barrio Blocks | **Southside Blocks** |

Live grounds + archive prototype. Same `GR08` id (saves/orbits unchanged).

---

## Outside pack #2 — quote-forward weather (2026-07-19)

| ID | Name |
|---|---|
| EV_GRID_FREEZE | Grid Freeze Hangover |
| EV_PROPERTY_TAX | Property Tax Revival |
| EV_LIBRARY_FIGHT | Library Shelf Fight |
| EV_BORDER_BUSES | Buses on the Cable News |
| EV_COUNTY_FAIR | County Fair Week |
| EV_RURAL_HOSPITAL | Rural Hospital Scare |

Still **outside / world** only. Original paraphrase, not copyrighted soundbites. Catalog **16**. Harness:outside green.

---

## Outside weather UI surface (2026-07-19)

| Piece | Detail |
|---|---|
| Engine | `pendingOutside` on resolve; host clears on dismiss |
| UI | `#outside-weather` modal — title, body, “cannot play this” |
| Flow | After End Week → weather (if any) → act splash if needed |
| Law | Never hand; log line still written |

Makes pack #1–2 readable without burying weather in the log only.

---

## End of night — floors swept (2026-07-19)

| Check | Status |
|---|---|
| Working tree | Clean at wrap (then resting docs commit) |
| Tip | `20e8f3c` + resting commit |
| Harness | Full suite green |
| Build | `tsc` + Vite production green |
| Version | `0.0.1` honest — Phase 7 still open |
| Package note | [`docs/RESTING.md`](./RESTING.md) |

Dogs fed. County still there tomorrow.

---

## Post-sleep catch-up (2026-07-23)

While resting (`718f820`), remote advanced ~43 commits (PRs **#21–#32**). Agent rehydrated on `7328c86`.

| Theme | Tip evidence |
|---|---|
| a11y + smoke CI | `npm run a11y` · `npm run smoke:ui` |
| v0.1 | package **0.1.0** · `docs/V0.1-EVIDENCE.md` |
| Unity bridge | `api.ts` · `unity/` · `export:content` (113 cards) |
| Unlock paths | `paths.ts` · 7 pathways · `harness:paths` |
| Catalog | 113 cards · 21 Outside · residency audit green |
| Re-file | waiting → same persona, skip setup |

Hygiene: board + RESTING rewritten to stop lying.

### Step A applied (2026-07-23)

| Issue | Action |
|---|---|
| #11 | **Closed** — 0.1.0 evidence shipped |
| #10 | Retitled **RESIDUAL** (phone sign-off / screenshot only) |
| #12 | Retitled **ON HOLD** — Unity editor paused; no agent C# |

**NEXT code (when picked):** B signature fairness → C refile harness → D balance post-113. Unity stays parked.

---

## Plan B–D executed (2026-07-23) — accept full diagnostic

Misread of owner “A” = Accept fixed; sequence B→C→D after A hygiene.

| Step | Shipped |
|---|---|
| **B** | SIG22 teacher, SIG23 veteran, SIG24 smallbiz · `harness:signatures` 24/24 |
| **C** | `nextCycleSeed` + `continueAfterWaiting` · waiting harness refile e2e · UI uses deterministic seed |
| **D** | BALANCE-NOTES: strategies under-sample 116-card catalog; no retune |

Content export **116** cards. Unity still on hold.

---

## Anvil port (2026-07-23)

Borrowed **MIT** code/patterns from [7etsuo/anvil](https://github.com/7etsuo/anvil) (public use):

| Piece | Path |
|---|---|
| Greybox + card art plate | `src/lib/anvil-port/greybox.ts`, `cardAssets.ts` |
| Campaign observe/diff | `src/lib/anvil-port/observe.ts` |
| UI wire | `cardInner` uses art plate under emblem |
| Harness | `npm run harness:observe` |
| Docs | `docs/ANVIL.md`, `src/lib/anvil-port/NOTICE.md` |

**Not** adopted: Phaser, full kernel, StS `genre-card` Battle rules. Pure engine remains SoT.

---

## Design: UI + Gameplay Flow (2026-07-23)

Writer/reviewer loop closed with **0 open issues** (rev 3).

- Spec: [`docs/DESIGN-UI-GAMEPLAY-FLOW.md`](./DESIGN-UI-GAMEPLAY-FLOW.md)
- Vite-first; goal strip; card face discipline; full `main.ts` extract PR map
- Aligns Anvil greybox + BASE_URL art helpers (K15)

### PR-1 leaf extract (2026-07-23)

Behavior-identical module split (no visual change intended):

| Module | Role |
|---|---|
| `src/ui/card-face.ts` | `CardFaceView`, `cardInner`/`cardHtml` + escaped names |
| `src/ui/act-shell.ts` | `ACT_SHELLS`, splash, stage chrome |
| `src/ui/tabs.ts` | bottom-nav wire |

`main.ts` ~1147 lines (was ~1466). typecheck · harness · smoke:ui · a11y green.

