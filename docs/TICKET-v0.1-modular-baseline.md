# Ticket: Establish Modular TypeScript Baseline v0.1

**Status:** MET — `v0.1` earned 2026-07-22 (package `0.1.0`). Evidence bundle: `docs/V0.1-EVIDENCE.md`.
**Source of truth:** https://github.com/PoseyATX/candidate-zero

## Acceptance criteria

All met with recorded, re-runnable evidence — see `docs/V0.1-EVIDENCE.md`.

| ID | Criterion | Status |
|----|-----------|--------|
| AC1 | Side-by-side verification vs original prototype | **MET** — `harness:ac1` determinism + `harness:ac1-parity` STD≡prototypeRoll 2000/2000; intentional deltas documented |
| AC2 | Full card audit vs SRD §10 | **MET** — `harness:audit`: 44 plays clean (attrs/ids/risk + residency) |
| AC3 | Clean layered extraction (Data / Engine / UI) | **MET** — engine imports zero ui/cli/DOM; portable toward Unity host |
| AC4 | UI reliable | **MET** — full act flow; `smoke:ui` + `a11y` (0 critical/serious) both CI gates |
| AC5 | Harness skeleton | **MET** — 25-harness chain green (resolve→content) |
| AC6 | Honest version label | **MET** — package `0.1.0`; Phase 6 closed, AC1–AC5 evidenced |

## Increment: Minimal play loop + multi-strategy harness (2026-07-16)

Delivered pure play/deck/loop/strategies; ballot camp actions; multi-strategy evidence (labor ~90.8% ballot by W8).

Unity deferred as presentation-only; TS engine remains rules authority.

## Increment: Attr synergy + catalog wire-up + UI shell (2026-07-17)

- WAVE4 merged into `ALL_PLAYS` / `PLAYS` (22 cards)
- `trap`, `attrs` (root CLO/CON/CRA/INK/DIP/CHA) on types; default attrs=10
- Seeded deck shuffle + weekly draw via shared mulberry32 stream
- `cardAttrMod` live on executePlay
- Thin Vite UI (`src/ui/main.ts`) over pure engine
- Harnesses: `ac1-prototype-parity`, `audit-srd-plays`

## Increment: Primary (8) + General (6) calendar (2026-07-17)

- `src/engine/calendar.ts` — continuous weeks 1–14, phase map, filing + elections
- Phase: pre-ballot primary=1, on-ballot primary=2, general=3
- Terminal outcomes wired through `endWeekInPlace` / `runFullCampaign`
- Harness: `npm run harness:calendar`

## Increment: Setup binds + phase drafts (2026-07-17)

- Personas apply root **attrs** (cardAttrMod) + faces/resources
- `createCampaign({ setup })` applies persona/issue/district/region (default teacher/east)
- CLI: `--persona --issue --district --region`
- UI: identity setup screen before play; stage/attrs on ledger
- Phase-turn **3-card draft** on ballot (phase 2) and enter-general (phase 3); auto in harnesses
- Harness: `npm run harness:setup`

## Increment: Cleanup / QoL + yield tables + general strategies (2026-07-17)

- Persona attr application DRY (single bumpAttrs path)
- Strategies stage-aware (GOTV PL19 priority in general)
- CLI: attr-adjusted odds, `--full` / `play:full`, clearer outcomes
- UI: district + human outcome strings
- `npm run harness:yields` — modular yield envelopes for walk / fry / petition
- Removed harness `as any` in primary-general stacked win check

## Increment: Full-campaign general balance (2026-07-17)

**Bugfix:** weekly growth + drafts only updated `state.deck` ownership — never the physical draw pile, so PL19 GOTV was unreachable (avg GOTV 0).

- Inject growth/drafts into draw pile; general injects PL19 (+ PL16 if vol-starved)
- PL19 cost 1 vol; stronger GOTV weight in `generalWinProbability`
- Primary win curve modestly raised when balloted (teach the loop)
- Harness: `npm run harness:full` — multi-strategy Primary+General outcomes

Sample (150 trials/strategy): labor ~13% overall general win, ~42% win given reach, avg GOTV ~0.35; grind ~95% miss filing.

## Increment: Dopamine loop (2026-07-17)

Pure feedback layer — **does not alter rolls, bands, or yields**:

- `src/engine/feedback.ts` — beats, near-miss geometry, hot/cold streaks, milestones, week summaries
- `executePlay` attaches `PlayFeedback` + juice log lines
- CLI + UI surface juice banners and week close lines
- Harness: `npm run harness:dopamine`

## Increment: Cleanup / mechanics audit — UI regression, district mechanics, labor-vs-money rebalance (2026-07-17)

- **Bugfix:** `index.html` had been overwritten with the old archive prototype (no `<script type="module">`, missing every DOM id `src/ui/main.ts` needs). `npm run build`/`dev`/GitHub Pages deploy were shipping a disconnected legacy app instead of the modular engine's UI. Restored from commit `44dda09`; verified via build + headless click-through.
- **Bugfix:** `district.align`/`.trap`/`.incumbent` were computed in `src/data/setup.ts` but never read in `src/engine/calendar.ts` — the "wrong-party TRAP district" was mechanically the *easiest* district (lowest primary pressure and lowest general opponent strength) instead of the hardest. `generalWinProbability`'s `genBase` now derives from `align` (+ trap tax); `primaryWinProbability` now penalizes `incumbent` districts.
- **Balance:** money strategy was winning the general ~2.5x more often than labor (documented as an open issue in the previous increment). Root cause: Petition Drive consumed ~5.5–6 of 8 primary weeks (all AP) while Filing Fee cleared in ~1.5–2 weeks, leaving money ~4 extra weeks of AP to build primary-win stats. Retuned Petition Drive yields up and Filing Fee cost $750→$1,250 so both ballot-access doors cost comparable AP; fixed `hybridStrategy`'s dead-code money branch. Money/labor overall-win ratio now ~1.68x (was ~2.5x); `harness:full` now asserts this can't regress past 2.3x.
- Full detail + measured before/after tables: `docs/BALANCE-NOTES.md` (2026-07-17 — Cleanup / mechanics audit pass).
- Harnesses: all pass under `npm run harness`.

## Increment: Full routine-maintenance pass, round 2 (2026-07-17)

Requested explicitly as a "solidify the foundation before any more feature work" pass. Full detail + rationale: `docs/BALANCE-NOTES.md` (2026-07-17 — round 2). Summary:

- **Bugfix:** `state.tier` (resolve()'s resistance-tier disaster-band escalation, and PL20's `show` gate) was initialized to 0 and never written anywhere in production code — the difficulty curve never escalated across pre-ballot/on-ballot/general, and PL20 PAC Check was a permanently unreachable dead card. Now derived from `getPhase(state)` on every play.
- **Cleanup:** removed two hand-duplicated data structures that could silently drift — the starter-deck list (`loop.ts` now imports `deck.ts`'s `STARTER_DECK_IDS` instead of a second copy) and persona attribute bonuses (`setup.ts`'s personas no longer duplicate their `attrs` literal inside `apply()`; `applySetup` applies it once, centrally).
- **QoL:** Petition Drive / Filing Fee no longer show as duplicate menu entries pre-ballot (real hand copy + `[CAMP]` virtual entry were both being offered).
- **Foundation:** retired the last three hand-duplicated-logic harnesses (`test-resolve.mjs`, `smoke-play.mjs`, `ballot-qualification.mjs`) — converted to `.ts`, now import `src/engine`/`src/data` directly instead of hand-copying formulas. No more `.mjs` harnesses in the repo.
- **Foundation:** tightened `GameState.district`/`.genOpp`/`.rivals`/`.log` from `any` to real types (`DistrictInfo`, `GeneralOpponent`, `LogEntry` — the last of which already existed and was unused for this).
- **Foundation:** `npm audit` found a moderate/high dev-server-only esbuild CVE via Vite 5's bundled esbuild; upgraded Vite 5.4→8.1 (user-directed scope: Vite only, not TypeScript). Zero vulnerabilities now. Verified build/deploy/harness/headless-click-through all green on Vite 8.
- **Foundation:** added `.github/workflows/ci.yml` — typecheck + full harness + build on every push/PR. There was previously no automated check that would have caught the index.html regression (round 1) before it reached the branch; the deploy workflow only builds-to-deploy on pushes to `Fable-build`. Also bumped both workflows' pinned Node 20→22 (Vite 8 requires `^20.19.0 || >=22.12.0`).
- All 12 harnesses + `npm run build` + `npm run typecheck` pass clean.
- Roadmap for what's next (feature work, deferred items, and open risks): `docs/ROADMAP.md`.

## Next
See `docs/ROADMAP.md` for the full prioritized roadmap. Short version:
1. Shadow consequences on Faces (debt/obligations currently taken on but mechanically inert — see BALANCE-NOTES round 2)
2. Build out the allies/assets/reps acquisition system several Wave 1–3 cards already reference (`AL01`, `AL03`, `AL04`, `AL05`, `AL09`, `AL11`, `R01`, `R05`, `R06`, `R07`, `R10`, `A01`, `A09`, `B05`) — currently these ids are never granted anywhere, so the synergy bonuses that reference them can never trigger
3. UI polish (audio optional later); only then consider v0.1 label with evidence bundle
