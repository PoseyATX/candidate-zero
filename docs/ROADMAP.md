# Roadmap

**Operating plan lives on GitHub Projects** — not only this file:

- **Board:** https://github.com/users/PoseyATX/projects/2  
- **Mirror + hygiene:** [`docs/PROJECT-BOARD.md`](./PROJECT-BOARD.md)  
- **Full workstream log:** [`docs/WORK-LOG.md`](./WORK-LOG.md) · issue [#16](https://github.com/PoseyATX/candidate-zero/issues/16)  
- **Player flow:** [`docs/GAME-FLOW.md`](./GAME-FLOW.md)  
- **Issues:** #4–#16 (phases, meta, deploy bug, AC1 remainder, work-log pin)

This document is the **evidence log**: what shipped, with paths and harness
proof. Board columns / issue titles are the **to-do queue**. When they disagree,
**code + harnesses win**, then update both.

Grounded in repo evidence (`TICKET-v0.1-modular-baseline.md`, `ARCHITECTURE.md`,
`AC1-NOTES.md`, `BALANCE-NOTES.md`). Nothing invented as “done” without a file.

## How to read this doc

- **Phase 0–4** done (issues #4–#8; Session shipped 2026-07-19).
- **Starmap** — full catalog + **7 entity templates** MV01–07 (#17/#18 DONE).
- **Card residency law** — Main / Special / Outside + control channel
  (`docs/CARD-RESIDENCY.md`); schema + catalog tags; no boosters/event deck yet.
- **Phase 5** — balance breadth (issue #9) **DONE** 2026-07-19.
- **Phases 6–7** — mobile polish, honest v0.1.
- **Phase 8** — ship path: **TS pure engine → Unity presentation → iOS / App Store**
  (issue #12). Unity is not a second rules engine.
- **North star:** career graph / no true game over — see `docs/STARMAP.md`.
- Each item lists evidence so agents don’t re-derive status from vibes.

---

## ✅ Phase 1 — Ground-centered campaign model (DONE 2026-07-17, re-verified)

**Goal:** make *where* you work a visible decision; show zero-sum opposition
without yet giving it odds teeth; measure ground distribution. No RNG covenant
changes; no card-set redesign.

| Requirement | Status | Evidence |
|---|---|---|
| Ground picker on field plays (one ground / play, remember last) | **Done** | UI `#ground-picker` (`src/ui/main.ts`); CLI `chooseGround` (`src/cli/play.ts`); `state.lastGround` |
| Same ground 2+/week: +odds, −50% rapport | **Done** | `getGroundPenalty` in `src/engine/calendar.ts`; applied in `executePlay` via `groundPlays` / `groundRapMult` |
| Rival presence 5–40/week, logged + shown, **no odds bite** | **Done** | `advanceRivalGrounds` + `Ground.rivalRap`; picker meters; harness rival-avoidance Δ ≈ noise |
| `allyWarmAtGround` for field-ops allies | **Done** | `reputation.ts`; AL09 localized on PL21B/PL39 grant; PL01/PL19 bonuses use it. *(PL08 Kitchen-Table not field-based in archive — ground gate deferred to Phase 2, not a Phase 1 redesign.)* |
| `checkBallotThreshold` sketch, **unwired** | **Done** | `src/engine/career.ts` — measurement only; live elections still `calendar.ts` |
| `npm run harness:grounds` | **Done** | 50× labor/money × focus/spread; spread contests ~2.8 grounds (target ~3); sketch met **0%** (rapport economy short of 60 home — Phase 2 input) |

**Not in Phase 1 (correctly deferred):** rival odds modulation; `Ground.aff` / `gated` mechanics; rebalancing rapport to meet the sketch thresholds; PL08 redesign as a field card.

Detail also under Phase 0 item 3 and `docs/SRD-NOTES.md` § "Ground selection is part of play execution".
---

## ✅ GitHub Pages source fixed (was the one manual action; done 2026-07-17)

Root cause was the repo's Pages **source** setting: "Deploy from a branch"
meant public traffic never routed through our `deploy.yml` at all,
regardless of how many times it "succeeded" — a separate `github-pages`-app
deployment (the legacy Jekyll pipeline) kept serving the raw, unbuilt
source instead. User switched Settings → Pages → Build and deployment →
Source → GitHub Actions; confirmed via the `/deployments` API that the
legacy pipeline stopped deploying, redeployed, and the user confirmed the
live site renders correctly. Full story (including the wrong "timing race"
theory tried first): `docs/BALANCE-NOTES.md`, 2026-07-17 entries.

## Phase 0 — Foundation pass (done, 2026-07-17)

Full detail: `docs/BALANCE-NOTES.md` (two 2026-07-17 entries), `docs/TICKET-v0.1-modular-baseline.md`.

| Fixed | Evidence |
|---|---|
| `index.html` was silently shipping the old legacy prototype, not the modular engine's UI | Missing every DOM id `src/ui/main.ts` needs; restored from commit `44dda09` |
| District `align`/`trap`/`incumbent` computed but never read — the "wrong-party TRAP" was mechanically the *easiest* district | `calendar.ts` only read `.field`; now `genBase` derives from `align`, `incumbent` penalizes `primaryWinProbability` |
| Labor (Petition Drive) vs money (Filing Fee) had a ~2.5x win-rate gap | AP-economy mismatch: petition ate ~6/8 primary weeks, fee cleared in ~1.5–2; retuned both, added a harness guardrail |
| `state.tier` never advanced — inert difficulty curve, PL20 permanently unreachable | Nothing wrote to it in production code; now derived from `getPhase(state)` per play |
| Two hand-duplicated data structures (starter deck list, persona attr bonuses) | Consolidated to single source of truth |
| Petition Drive/Filing Fee showing twice in the play menu | `listPlayableHand` now dedupes hand vs. camp-action entries |
| Three harnesses hand-duplicated engine logic instead of importing it | Converted `.mjs` → `.ts`, now import `src/engine`/`src/data` directly |
| `GameState.district`/`.genOpp`/`.rivals`/`.log` typed `any` | Tightened to real interfaces |
| Moderate/high esbuild CVE (dev-server only) via Vite 5 | Upgraded Vite 5.4→8.1, zero vulnerabilities |
| No CI gate — the index.html regression could reach the branch undetected | Added `.github/workflows/ci.yml` (typecheck + harness + build on every push/PR) |

### Phase 0b — Design-source recovery pass (done, 2026-07-17, same day)

The user shared the original design conversation, which turned out to
contain the actual archive prototype (`archive/prototype-single-file.html`,
1973 lines, 56 cards) this engine was extracted from — previously only
reachable via `git show 0d532fa:index.html`, now archived properly with
`archive/README.md` explaining its status. Full detail:
`docs/SRD-NOTES.md` (new — the closest thing to "SRD v1" that exists in
this repo, since no such document existed before despite `AGENTS.md`
calling it law).

| Done | Evidence |
|---|---|
| Persona could be silently abandoned mid-run via "New run" with no confirmation | Engine-level check confirmed `applySetup` only ever runs once (no mutation bug); added a confirm guard in the UI — covenant 7 ("Choices bind") wasn't fully enforced at the UX layer |
| Cards read as a plain list, not cards | Redesigned to 2:3 aspect ratio tiles: cost badge, tagline (surfaces the `card.tag` flavor field that existed on every card but was never rendered), risk-class color coding, camp/trap corner ribbons, layered shadows, hover lift — verified via headless screenshots at desktop and mobile widths |
| "Shadow consequences on Faces" (TICKET's stated next step) was undesigned | Turned out to be fully designed *and implemented* in the archive (`shadowCheck()`) — ported in full to `src/engine/reputation.ts`, wired into `executePlay` |
| Reputation grants (R01–R12) never fire — `resolve()` reads `hasRep(state,'R10')` etc. but nothing ever grants them | Ported the archive's `repCheck()` subset reachable with existing state (R01/R02/R04/R07/R10/R11) |
| `PL13_FishFry`'s text promises "the small-dollar list starts here" but never granted `B05` | Fixed — one missing line, found via diffing against the archive's equivalent card |
| Three files had private, duplicate `hasRep`/`warm` helpers | Consolidated into `src/engine/reputation.ts`, imported everywhere |
| Roadmap Phase 2 ("design an allies/reps system") was open-ended | Rescoped with an exact source to port from and precise remaining items — see Phase 2 below |

---

## ✅ The Chronicle — cross-run meta-progression (done, 2026-07-17)

Direct user request: a roguelike shouldn't have a hard restart on a loss —
"the player keeps moving through failure... they should keep moving and
growing until the next election cycle." Turned out this was already fully
designed and built in the archive (`LEGACY`/`TRAITS`/interim-path/
`startIncumbentRun` system) but never ported — `types.ts` even had a
`LegacyState` interface sitting there typed with `any`, unused anywhere,
same shape as `fieldAp` before this session's Phase 2 item 1 fix.

Ported to `src/engine/legacy.ts` + `src/engine/loop.ts`'s
`createIncumbentCampaign`:
- A run ending (win or loss) records an epithet + growth summary to a
  persistent "Chronicle" (`localStorage`, shown on the setup screen).
- On a loss, the player picks an interim path (Perennial Candidate /
  Advocate / Staffer / Go Home a While — gated by how the run went) and
  then a permanent trait from that path (10 archive traits ported in
  full, capped at 3 held at once) that measurably buffs every future run
  — no dead "New run" button, an actual card-pick screen.
- On a `won_general`, "Stand for Reelection" skips setup entirely and
  continues straight into the next filing period as the incumbent,
  carrying forward a discounted share of contacts/nameID/money/
  endorsePts/volPool/reps/deck (archive's exact carry-forward formulas).
- `T_NERD` trait revealed a second dead scaffold: `parlSave`/`parlUsed`
  fields existed on `GameState` (one persona already granted `parlSave`)
  but nothing ever read them — wired into `executePlay` for `PL04`
  (archive also gates `PL24`, not yet ported).
- Not ported: obligations don't carry forward on reelection (modular
  `obls` is still free-text, not the archive's structured registry —
  Phase 2 item 4), and `district.incumbent` is deliberately left `false`
  on a reelection continuation rather than mirroring the archive's flag
  literally — that flag models an *opposing* entrenched incumbent in this
  engine's probability formulas, so setting it `true` for the player's
  own seat would double-penalize them.

Verified: pure-engine checks (carry-forward math, trait cap, path
gating) plus a full Playwright pass — played a seeded run to
`missed_filing`, picked a path and trait, confirmed the Chronicle
renders and survives a page reload, then started a fresh run and
confirmed the banked-contacts trait actually applied (25 contacts at
week 1, exactly 30% of the prior run's total).

## Phase 1 — Close the gaps this pass exposed but didn't fix (near-term, low risk)

These are direct follow-ups to Phase 0 findings — verification and tooling,
not new design.

1. **Reachability check in `harness:audit`.** The audit harness
   (`src/harness/audit-srd-plays.ts`) checks catalog *shape* (id format,
   attrs, risk, phases) but not *reachability*. That's exactly the gap that
   let PL20 sit dead for an unknown number of increments — it was asserted
   present in the catalog (`harness:ac1`) but never asserted playable.
   Add a check that simulates enough of a campaign (or directly walks
   `show`/`req` gates against a matrix of representative states) to confirm
   every card can, under some real game state, actually become playable.

2. **Automated "dead reference" scan for ally/rep/asset/backer ids.** This
   pass found ~13 ids (`AL01`, `AL03`, `AL04`, `AL05`, `AL09`, `AL11`,
   `R01`, `R05`, `R06`, `R07`, `R10`, `A01`, `A09`, `B05`) referenced in
   `odds`/`run`/`req` functions across `src/data/plays.ts` that are never
   granted anywhere. Rather than re-discover this by hand next time, add a
   small script/harness that greps `warm(s,'ID')` / `hasRep(s,'ID')` /
   `s.assets.includes('ID')` / `s.backers.includes('ID')` call sites,
   collects referenced ids, and cross-checks each against every place an id
   is pushed onto `state.allies`/`.assets`/`.reps`/`.backers`. Report any id
   that's referenced but never granted. This is the same shape of bug as
   the district-trap issue (Phase 0) and `state.tier` (Phase 0) — a
   condition that can structurally never fire — so it's worth a permanent
   guardrail, not just a one-time cleanup.

3. **Grounds subsystem is half-built.** ~~There is no ground-selection UI
   anywhere; `pickDefaultGround` always auto-picks.~~ **Substantially
   addressed 2026-07-17 (Ground-centered campaign model, Phase 1 order).**
   Ground selection is now a real, visible decision on every field play:

   - **Ground picker** (UI modal + CLI prompt): playing a field card opens a
     selector showing each ground's name, your rapport, the opposition's
     presence, and pool; remembers the last-worked ground. `pickDefaultGround`
     is now only the fallback when no ground is passed (harness/auto).
   - **Diminishing returns** (`getGroundPenalty`, `src/engine/calendar.ts`):
     working the same ground twice in a week gives a small familiarity odds
     bump but half the rapport — so broad rapport means spreading out. A
     per-week `state.groundPlays` tally drives it; `state.groundRapMult`
     carries the multiplier into `rapGain`.
   - **Ally-at-ground affinity** (`allyWarmAtGround`/`hasAllyWarm`,
     `src/engine/reputation.ts`): allies granted by a ground-based field play
     (Canvass Captain / Field Director → AL09) are now *localized* to that
     ground, and the AL09 field bonus on Block Walk / GOTV only applies on the
     turf the director actually works. Roster/persona grants stay warm
     everywhere (backward-compatible). NOTE: the spec also asked to gate
     Kitchen-Table (PL08) on AL01-at-ground, but PL08 is not a ground-based
     card and making it one is a card redesign (explicitly out of the Phase 1
     scope), so that specific gate is deferred to Phase 2 — the helper it
     needs is built and exercised on the AL09 case.
   - **Opposition presence** (`Ground.rivalRap`, `advanceRivalGrounds`):
     the opposition banks 5–40 rapport at a random ground each week, logged
     and shown in the picker. **Cosmetic in Phase 1** — it does not touch
     your odds yet (that's Phase 2). The `harness:grounds` rival-avoidance
     probe confirms it: steering toward vs. away from opposition grounds
     moves the win rate only within noise (≈4pp at N=50).
   - **Win-condition sketch** (`checkBallotThreshold`, new
     `src/engine/career.ts`): the intended rapport-distribution win condition
     (primary 60% home + 40%×2; general 40% + 30%×2) is implemented for
     measurement only and **deliberately not wired** — the live election
     still runs on `calendar.ts` probabilities.
   - **Harness** (`npm run harness:grounds`, 50 labor/money campaigns ×
     ground strategies): measured findings — a "spread" player contests
     **~2.8–3 grounds**, a "focus" player **1** (design target "a few, not
     all 8" ✓); and critically **the ground win-condition sketch is met 0%
     of the time** under current tuning (avg top-ground rapport ~5–25 vs a
     60 home threshold). That last number is the load-bearing Phase 2 input:
     the rapport economy is an order of magnitude short of the sketched
     condition, so Phase 2 must either rebalance rapport yields upward or
     lower the thresholds before this can become the real win condition.

   Still genuinely open (Phase 2): `Ground.aff` affinity tags and
   `Ground.gated` are still unread by any mechanic; opposition presence has
   no teeth; the rapport economy needs rebalancing against the win sketch;
   PL08's ground gate.

4. **Archive-prototype yield parity is still open.** `docs/AC1-NOTES.md`:
   "Action yield-table full compare for archive ACTIONS (walk/fund/chairs)"
   has been open since the engine extraction. `harness:yields` only covers
   PL01/PL13/PL04. Low urgency (modular is already the declared source of
   truth), but it's the one remaining unchecked box on AC1, which gates the
   v0.1 label (Phase 7).

## ✅ Phase 2 — Allies / Assets / Reps acquisition system (DONE 2026-07-18 — port, not design)

**Goal:** finish the archive port of allies, assets, obligations, and
reputation grants. No resolve/RNG covenant changes; no ground-picker redesign.

| Requirement | Status | Evidence |
|---|---|---|
| Asset shop (archive 8 items: A01–A04, A06, A09, A11, A12) | **Done** | `src/data/assets.ts`; BUY* camp actions via `buildCatalog` + `listPlayableHand`; `npm run harness:shop` |
| A01 / A09 dead refs closed | **Done** | Shop grants; dead-refs harness green |
| Obligations registry OB1–OB8 (+ OB9/OB10) with weekly `drag` | **Done** | `src/data/obligations.ts`; `applyOblDrag` in `calendar.onWeekAdvance`; PL20→OB1, PL21→OB2, G2→OB8; `harness:obligations` |
| Ally grant paths from archive | **Done** | PL08→AL01/AL02, PL10→AL04, PL11→AL03, PL14→AL01, PL21B/PL39→AL09, PL22B→AL16, PL30→AL08, PL32→AL04, PL48→AL15, PL29+events→AL06/AL12/AL14; personas AL01/AL11 |
| Intentional stubs (archive never `addAlly`) | **Documented** | AL05, AL07, AL10, AL13 in `INTENTIONAL_STUB_ALLIES` — warm() kept for parity; `harness:dead-refs` |
| Full `repCheck` (R01–R12) | **Done** | `reputation.ts` — R05/R06/R08/R09/R12 now reachable with counters + allies |
| Kitchen-Table ground affinity | **Archive-faithful** | Archive allies are roster-wide; PL08 stays roster-wide. `allyWarmAtGround` remains for field AL09 (Phase 1). Documented in plays + SRD |
| Bill / committee types (data only) | **Done** | `Bill`, `Committee`, `VoteTally`, `BillStatus` in `types.ts` — unwired for Phase 4 |
| `harness:dead-refs` / `shop` / `obligations` | **Done** | package.json scripts; full `npm run harness` green |

**Already done earlier (2026-07-17):** `shadowCheck` full port; R01/R02/R04/R07/R10/R11 subset; PL21B/PL39 + fieldAp; 20 personas + issues; PL13→B05.

Detail: `docs/SRD-NOTES.md` § "Shadow consequences + reputation grants" (updated Phase 2 closeout).

## ✅ Phase 3 — Debt as leveraged optionality (DONE 2026-07-18)

**Correction:** a prior draft floated a flat debt→odds penalty. That was
wrong on theme (mid-campaign voters/donors don't mark you down for a bank
note) and wrong on game theory (makes debt strictly bad). **Debt has zero
in-campaign resolve() odds effect.** Consequence is deferred and asymmetric.

| Requirement | Status | Evidence |
|---|---|---|
| No resolve()/band debt tax | **Done** | `resolve.ts` has no `debt` ref; harness pairwise seed equality debt=0 vs 99999 |
| Spend-now lever (PL21 self-loan + OB2) | **Done** | `applySelfLoan` in `src/engine/debt.ts`; +$3000 cash unlocks fee/assets; `harness:debt` |
| Win: self-loan retires cheap, no Session gate | **Done** | `retireDebtOnWin` token fee ≤$200; clears OB2; no `pac_lender_claim` |
| Win: PAC bridge retires cash + Session claim | **Done** | `maybePacBridge` on PL20 under open debt; keeps OB1 + `sessionFlags.pac_lender_claim` for Phase 4 |
| Loss: compounds into next cycle | **Done** | `LegacyCarry.debt` × `DEBT_CYCLE_COMPOUND` (1.15); `applyLegacyDebt` re-adds OB2 drag |
| Loss: affordability gate, not odds | **Done** | `availableCash` / `canAfford` reserve; never touches resolve |
| Crisis path pressure | **Done** | `DEBT_CRISIS_THRESHOLD` 5000 → perennial/home only; PL20 early via `pacCheckAvailable` |
| Leverage win-rate case | **Done** | `harness:debt` n=40: debt leverage **45%** gen wins vs conservative money **35%** (+10pp) |

Hooks reused (no parallel systems): `addObl`/`OB1`/`OB2` (`obligations.ts`),
`sessionFlags`, `LegacyCarry`/`applyLegacy`/`recordRun`, `canAfford` →
`availableCash`. UI terminal copy + epithet surface the branch split.

Detail: `docs/SRD-NOTES.md` § debt / Phase 3.

## ✅ Phase 4 — Session stage (DONE 2026-07-19, [#8](https://github.com/PoseyATX/candidate-zero/issues/8))

Port of archive Session (prototype ~917–1075). General win **enters Session**
(no longer terminal). Sine die yields `session_law` | `session_survived` |
`session_primaried`.

| Requirement | Status | Evidence |
|---|---|---|
| Enter Session on general win | **Done** | `enterSessionFromGeneral` in `calendar.ts` / `session.ts` |
| Bill lifecycle draft→…→law | **Done** | `pipelineStage` 0–8 + `BillStatus`; SS01–SS07 |
| Issue-linked signature bill | **Done** | `createDraftBill` uses `state.issue` |
| PAC claim gates referral | **Done** | `applyPacClaimOnReferral` on SS02; SS_PAC refuse |
| UI bill status | **Done** | Ledger bill line + session actions menu |
| `harness:session` | **Done** | green — law/survived/primaried partition |

Files: `src/engine/session.ts`, `src/data/session-plays.ts`, UI/strategy wires.
`resolve.ts` untouched.

## ✅ Starmap — Catalog + ≥3 playable pilots (DONE 2026-07-19)

**Design law:** [#17](https://github.com/PoseyATX/candidate-zero/issues/17), [#18](https://github.com/PoseyATX/candidate-zero/issues/18).  
**Map index:** [`docs/STARMAP.md`](./STARMAP.md).

| Deliverable | Status | Evidence |
|---|---|---|
| Full ENT_* catalog (tiers 0–8) | **Done** | `src/data/starmap/entities.ts` (~93 entities) |
| Orbits, no orphans | **Done** | `orbits.ts` + `harness:starmap` |
| Loops registry | **Done** | `loops.ts` |
| Multi-pilot registry | **Done** | `pilots.ts` PLAYABLE_PILOTS (7) |
| MV01–03 core pilots | **Done** | Precinct / Captain / Judge |
| MV04–07 templates | **Done** | Party / Club / Editor / Faith |
| Simultaneous multi-orbit | **Done** | harness |
| `npm run harness:starmap` | **Done** | 7-template e2e |

**Not in this pass:** movement UI modal, waiting-loop stage rewrite, higher-office forks.

## ✅ Card residency — Main / Special / Outside (DONE 2026-07-19)

**Design law:** [`docs/CARD-RESIDENCY.md`](./CARD-RESIDENCY.md) (includes honest critique + MTG-scale template rule).

| Deliverable | Status | Evidence |
|---|---|---|
| `CardResidency` / `CardControl` / `entityScope` on `PlayCard` | **Done** | `src/engine/types.ts` |
| CORE + WAVE4 + shop → main/player | **Done** | `plays.ts`, `plays-wave4.ts`, `assets.ts` |
| SESSION SS* → special + entityScope | **Done** | `session-plays.ts` |
| MV01 → special + ENT_PRECINCT_CHAIR | **Done** | `plays-starmap.ts` |
| Outside content | **Deferred** | schema ready; 0 Outside cards (correct) |
| Audit residency tally | **Done** | `harness:audit` — main=37 special=14 outside=0 |

**Not in this pass:** event deck, boosters/draft, auto-strip on scandal, Unity kit UI.

## ✅ Ceremony shells — three-act stage chrome (DONE 2026-07-19)

| Deliverable | Status | Evidence |
|---|---|---|
| Shared act splash (I/II/III) | **Done** | `openActSplash` in `src/ui/main.ts` |
| Persistent act banner + frame tints | **Done** | `#act-banner`, `.stage-primary/general/session` |
| Distinct verbs (end week, panel titles, HUD chip) | **Done** | `ACT_SHELLS` + `applyStageChrome` |
| Tutorial + GAME-FLOW | **Done** | `index.html`, `docs/GAME-FLOW.md` |

**Presentation only** — `enter_general` / `enter_session` engine paths unchanged.

## ✅ General kit gravity (DONE 2026-07-19)

| Deliverable | Status | Evidence |
|---|---|---|
| Rapport seeds GOTV on enter general | **Done** | `seedGeneralGotvFromRapport` in `calendar.ts` |
| Field plays bank GOTV in general | **Done** | PL01/PL02 stage branches |
| Primary club plays off-table | **Done** | PL08 `ph: [1,2]` |
| PL19 into hand + PL23 Rides | **Done** | `ensureGeneralTools`, `plays.ts` |
| Win math favors GOTV over contact pad | **Done** | `generalWinProbability` weights |
| Harness | **Done** | `harness:calendar` kit-gravity asserts |

## ✅ Phase 5 — Balance breadth (DONE 2026-07-19, [#9](https://github.com/PoseyATX/candidate-zero/issues/9))

**Goal:** setup matrix is brutal-but-winnable — no soft-locks, no free wins.

| Deliverable | Status | Evidence |
|---|---|---|
| `harness:matrix` structured sample | **Done** | `src/harness/matrix.ts` · 93 cells × N=30 |
| All 24 personas open/east labor | **Done** | mean win 20.3% · band 6.7–33.3% |
| Wrong-party stress | **Done** | mean ~12%; retuned genBase + wrong tax |
| Money identity documented | **Done** | smallbiz / PA_CRA_DIP / PA_DIP_CHA |
| Labor/money ratio guardrail | **Done** | teacher ~1.8x (cap 3.5x) |
| Notes | **Done** | `docs/BALANCE-NOTES.md` 2026-07-19 Phase 5 |

**Not in Phase 5:** full 12k issue grid (issues are flavor for win math); boosters; starmap multi-loop.

### Prior backlog note (superseded by evidence above)

Phase 0 fixed the two headline strategies and one systemic district bug,
but the full setup matrix — now 24 personas × 4 districts × 7 regions × 18
issues = 12,096 combinations (was 672 before the 2026-07-17 persona/issue
port) — had only been spot-checked. Phase 5 closed the persona×district×region
axes via structured sampling.

- **The 20 newly-ported personas**: verified mechanically correct (apply()
  effects fire, `harness` suite green) but not balance-checked individually
  — some grant `money += 2500` (`PA_DIP_CHA`) or `money += 1500` (both
  `PA_CRA_DIP` and the existing `smallbiz`), which combined with the
  filing-fee economics below could produce more degenerate-fast-money
  personas than just `smallbiz`.
- **`smallbiz` persona (+$1,500 starting money) vs. the new $1,250 filing
  fee**: this persona can now file in week 1 essentially for free. That may
  be exactly the intended identity ("everyone owes you credit or a favor")
  or it may be too strong relative to the other personas — worth a
  deliberate call, not an accident. Now shared by at least two of the
  ported personas too (see above).
- **The `wrong` district, post-Phase-0 fix**: it's now intentionally the
  hardest district (high `genBase` from `align: 'wrong'` + trap tax). Worth
  confirming via harness that it's brutal-but-winnable (a real risky
  choice) rather than an accidental soft-lock — the whole point of a
  "TRAP: bravery is not arithmetic" district is that bravery should
  *sometimes* pay off.

Recommend extending `full-campaign.ts` (or a new harness) to sample across
persona/district/region combinations and flag any combo whose win rate is
degenerate (near-0% or near-100%).

## Phase 6 — UI/UX polish

**Product thesis, stated explicitly by the project owner (2026-07-17):**
the goal is Dwarf-Fortress-level systemic complexity in a form factor
playable **one-handed on mobile with minimal navigation/scrolling** — the
card/deckbuilder structure was chosen specifically because of this
constraint, not as a genre default. This means mobile-viewport scroll
distance and tap-target ergonomics are load-bearing product requirements
here, not standard "responsive polish" — treat regressions in either as
bugs, the way `docs/BALANCE-NOTES.md`'s 2026-07-17 "Mobile card-grid bug"
entry does (a `minmax()` CSS Grid spec detail silently collapsed the
mobile card grid to one column instead of two, costing ~37% extra scroll;
fixed same day). Any future UI work should screenshot-verify at a phone
width (this session used 390×844) before considering it done, the same
way balance changes get harness-verified before considering them done.

TICKET already names general UI polish as the last gate before considering
v0.1 ("UI polish; only then consider v0.1 label with evidence bundle").

**Done in the 2026-07-17 mobile-game UI pass** (patterns borrowed from the
mobile-deckbuilder canon — persistent vitals HUD, thumb-reach primary
action, never hide the hand):

- ✅ Risk-class color coding (left border per class + risk-tinted odds
  meter fill).
- ✅ Mobile pass, screenshot-verified at 390×844: sticky compact HUD (AP
  pips, money, week + signature progress meters) pinned to the top of the
  screen while scrolling; End Week pinned to the bottom of the viewport in
  thumb reach; both hidden/normal on desktop widths.
- ✅ Full-hand visibility: cards you can't currently play render dimmed
  with the specific reason ("No AP left", "Not enough money", "Phase 2/3
  only") instead of vanishing from the list — plan-around information,
  standard in the genre. Cards gated by `show`/`req` stay hidden
  (undiscovered content, not locked options).
- ✅ Per-card success-odds meter bar (at-a-glance p%, tinted by risk).
- ✅ Fixed a fieldAp regression: with 0 AP but a field action banked, the
  UI said "No AP left — end the week" and hid the playable field card.
- ✅ `theme-color` meta + `color-scheme: dark` (mobile browser chrome
  matches the walnut theme; form controls render dark natively).

Concretely still open:

- No accessibility pass (color contrast, keyboard nav for the card grid,
  `aria-live` regions exist on log/juice but haven't been screen-reader
  tested).
- No visual regression / e2e test in CI — Phase 0 added a CI gate for
  typecheck+harness+build, but a headless click-through (the kind used to
  verify the index.html fix and the Vite 8 upgrade this session) isn't
  automated yet. Worth adding once the UI is a real target for iteration
  rather than a recently-repaired one.
- ~~Card art is still typographic-only~~ Addressed (2026-07-17, same-day
  follow-up after direct feedback that the cards hadn't visibly improved
  since the 2:3 change): every card now has a real anatomy — centered
  name banner, Art Deco hairline-and-diamond divider, an engraved emblem
  plate (24 hand-drawn lineart SVG marks in `src/ui/card-art.ts`, one
  per card: boot, rotary phone, fish, pie tin, megaphone, money bag, …)
  with a sunburst backdrop, a rotated notary-seal cost stamp with
  sub-cost tags, rubber-stamp CAMP/TRAP treatments replacing the corner
  ribbons, aged-paper grain (inline feTurbulence noise), corner
  brackets, and a ticket-stub footer with a risk-colored dot. Draft
  cards and terminal/Chronicle choice cards share the same anatomy via
  one `cardInner()` renderer. Raster/painted art per card remains the
  eventual ceiling, but the typographic-only gap is closed.
- The log panel is plain text; popular deckbuilders surface last-action
  results as transient stacked toasts. The juice banner covers the
  headline case; a fuller notification stack is future polish.

## Phase 7 — v0.1 label

Per `AGENTS.md` Covenant 8 ("Honest versioning — no marketing labels
without evidence") and TICKET's own AC6 ("Not v0.1 — package `0.0.1`"),
this should only happen once AC1–AC5 have full recorded evidence *and*
Phase 6 (UI polish) is done. Phase 0 closed one real AC1/AC2-relevant gap
(PL20 was failing AC2's implicit "every catalog card is real" bar) and
hardened the audit tooling's honesty; Phase 1 item 1 (reachability
checking) is the natural way to make AC2 evidence trustworthy going
forward rather than re-discovered by accident.

## Phase 8 — Ship path: TS engine → Unity presentation → iOS / App Store

**Owner direction (2026-07-19):** ship through Unity as presentation shell
over the pure TypeScript engine, then iOS / App Store. Issue
[#12](https://github.com/PoseyATX/candidate-zero/issues/12).

Non-negotiable: Unity does **not** reimplement resolve/odds/yields. Prep
work (keep `GameState` clean, freeze engine API, seed contract) can start
while Phase 4–7 run; full vertical slice waits for Session shape to settle.

Swift-native remains a possible *future* rewrite of the same pure engine —
not the near-term store path.

---

## Standing practices (to prevent this list from needing a "round 3")

These aren't roadmap *items* — they're process changes worth keeping now
that Phase 0 established them:

1. **CI is now a gate, not a suggestion.** `.github/workflows/ci.yml` runs
   typecheck + the full harness + a production build on every push and PR.
   The index.html regression (Phase 0) would have been caught on the very
   next push if this had existed. Don't merge to `main`/`Fable-build` with
   CI red.
2. **"Computed but never consulted" is now a known bug shape in this
   codebase**, found twice in one pass (`district.align`/`.trap`/
   `.incumbent`, and `state.tier`). When adding a new field to `GameState`
   or a new gate to a card (`show`/`req`), grep for both "where is this
   written" and "where is this read" before considering it done — Phase 1
   item 2 proposes automating this specific check for the ally/rep/asset
   pattern.
3. **Single source of truth for anything duplicated across a harness and
   the engine.** Phase 0 retired the last three harnesses that
   hand-copied engine logic instead of importing it. Any new harness
   should import `src/engine`/`src/data` directly — never re-derive a
   formula by hand, even for a "quick" standalone script.
4. **Balance changes get a harness guardrail, not just a measurement.**
   `full-campaign.ts` now asserts the money/labor win-rate ratio can't
   silently regress past 2.3x. Future tuning passes on any strategy-vs-
   strategy or persona-vs-persona axis should add a similar assertion, not
   just a one-time printed table that nobody re-checks.
