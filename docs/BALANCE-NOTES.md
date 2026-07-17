# Balance Notes

## 2026-07-16 — Petition Drive Tuning

### Problem
Pre-tune Petition Drive reached the 450-signature threshold by week 8 in ~100% of trials (average ~2.3 weeks) even with zero volunteers. The labor path was effectively automatic, removing deadline tension and weakening the strategic distinction between the labor and money ballot routes.

### Change
- Base p: 0.60 (was 0.68)
- Volunteer scaling: +0.035 per vol (was +0.02)
- BREAKTHROUGH: 70–105 sigs (was 210–300)
- GAIN: 40–65 sigs (was 120–175)
- SETBACK: +15 (was +45)
- DISASTER: –50 to –95 (was –40 to –90)

### Measured Results (5000 trials, pure labor path, 2 AP/week on petition)
| volPool | Success Rate | Miss Rate | Avg Week on Success |
|---------|--------------|-----------|---------------------|
| 0       | ~90.8%       | ~9.2%     | ~6.2                |
| 2       | ~94.5%       | ~5.5%     | ~5.9                |
| 4       | ~97.5%       | ~2.5%     | ~5.6                |
| 6       | ~99.3%       | ~0.7%     | ~5.3                |

### Design Intent Preserved
- Easy early hook still exists (organized labor paths remain highly reliable).
- Filing deadline now has teeth for unorganized or distracted runs.
- Labor vs money paths are meaningfully distinct again.
- SAFE grind line and Fish Fry left untouched.

### Harness
`src/harness/ballot-qualification.mjs` is the repeatable metric.

### Sync note (2026-07-16 Grok Build migration)
Data layer PL04 corrected to match this document.

## 2026-07-16 — Multi-strategy loop (deck + camp ballot actions)

### Setup
- Pure engine: hand size 5, starter deck, 2 AP/week, weeks 1–8
- While `!ballot`, Petition Drive and Filing Fee are always offered as **camp actions** (still cost AP/$)
- 400 trials per scripted strategy

### Results
| Strategy | Ballot by W8 | Avg week on ballot | Avg contacts | Avg $ |
|----------|--------------|--------------------|--------------|-------|
| labor    | ~90.8%       | ~6.0               | ~45          | ~250  |
| money    | ~87%         | ~3.3               | ~151         | ~426  |
| hybrid   | ~90%         | ~6.1               | ~42          | ~385  |
| grind    | ~1.5%        | —                  | ~170         | ~344  |

### Read
- Labor path under the full loop matches the pure petition qualification envelope (~91% / week ~6).
- Money path is faster to ballot and leaves more contacts/volunteers — intentional texture for now; re-check when paid media and obligations arrive.
- Grind control proves filing is not automatic if you ignore ballot cards.
- Harness: `npx tsx src/harness/multi-strategy.ts`

## 2026-07-17 — Full-campaign general balance

### Bug
Weekly card growth and phase drafts only pushed ids into `GameState.deck` (ownership / pool). They never entered `DeckState.draw`, so phase-3 cards (especially **PL19 GOTV Weekend**) almost never appeared in hand. Full-campaign sampling showed **avg GOTV = 0** for generalists.

### Fixes
1. Inject weekly growth into the physical draw pile (`startWeek`).
2. Draft resolution injects into draw pile (`resolvePhaseDraft` + campaign deck).
3. On enter general: inject **PL19**; inject **PL16** if still vol-starved.
4. PL19 cost `vp:1` (was 2); slight yield/name bump; `generalWinProbability` weights GOTV more heavily (`×0.14`).
5. Primary win probability base raised (balloted skilled paths reach general often enough to teach the loop without free wins).

### Measured (`npm run harness:full`, 150 trials/strategy)

| Strategy | Miss filing | Reach general | Win general (all) | Win \| reach | Avg GOTV if gen |
|----------|-------------|---------------|-------------------|--------------|-----------------|
| labor    | ~7%         | ~30%          | ~13%              | ~42%         | ~0.35           |
| money    | ~7%         | ~58%          | ~30%              | ~52%         | ~0.37           |
| hybrid   | ~13%        | ~37%          | ~16%              | ~43%         | ~0.38           |
| grind    | ~95%        | ~5%           | ~3%               | —            | —               |

### Design read
- Filing + dual path still distinct; grind is the control.
- General is no longer a coin flip on primary stats alone — **GOTV is the lever**.
- Overall win rates remain souls-like (most runs still lose).
- Money path is stronger into November (more contacts/name from fry economy); acceptable texture; re-check when obligations/hit pieces matter more.

### Harness
`src/harness/full-campaign.ts` — `npm run harness:full`

## 2026-07-17 — Cleanup / mechanics audit pass

### Bug: modular UI shell orphaned by index.html regression
`index.html` had been overwritten (commit `0d532fa`, "Add files via upload") with the
old standalone archive prototype — 1973 lines of inline HTML/CSS/JS with no
`<script type="module" src="/src/ui/main.ts">` tag and none of the DOM ids
`src/ui/main.ts` expects (`sel-persona`, `btn-start`, `playables`, `juice`, …).
`npm run build` / `npm run dev` / the GitHub Pages deploy were silently shipping
the disconnected legacy prototype; the modular TS engine's UI was never actually
reachable. Restored the correct shell from commit `44dda09` (last known-good,
matches current `main.ts`). Verified with `npm run build` (JS bundle now present
in `dist/`) and a headless click-through (setup → start run → play a card, no
console errors).

### Bug: district `align` / `trap` / `incumbent` computed but never read
`src/data/setup.ts` builds `state.district` with `align` ('safe' | 'competitive' |
'wrong'), `trap`, and `incumbent`, but `src/engine/calendar.ts` only ever read
`district.field` (primary rival count) for both `primaryWinProbability` *and*
`generalWinProbability`'s `genBase`. Net effect: the "wrong-party district"
(`d: 'wrong'`, flavor text "TRAP: bravery is not arithmetic.") had `field: 0`,
which gave it the *lowest* primary pressure **and** the *lowest* general-election
opponent strength of any district — the trap was mechanically the easiest
district in the game. Entrenched-incumbent districts (`incumb`, "Twelve years and
a war chest") were also not harder to beat than an open crowded primary.

Fix (`src/engine/calendar.ts`):
- `generalWinProbability`'s baseline (`genBase`, set in `resolvePrimaryConclusion`)
  now derives from `district.align` (safe 0.28 / competitive 0.45 / wrong 0.72)
  plus a `+0.08` trap tax, instead of from primary rival count.
- `primaryWinProbability` now subtracts a `0.12` incumbency penalty when
  `district.incumbent` is true.
- `field` still governs primary rival pressure only — the two concerns
  (who you beat in March vs. who you face in November) are no longer conflated.

### Balance: labor vs money ballot-access economy
`npm run harness:full` showed money winning the general **~2.5x** more often
than labor overall (30.5% vs 12%, before the district fix above; ~33% vs 14.5%
after it — the district fix alone didn't touch this). Root cause: Petition
Drive (labor) needed ~11 plays (~5.5–6.2 of 8 primary weeks, essentially all AP)
to clear `sigNeed`, while Filing Fee (money) needed ~2–3 Fish Fry plays (~1.5–2
weeks) to bank $750. Money reached the ballot ~4 weeks earlier on average and
spent that surplus AP building `nameID`/`contacts`/`endorsePts` — the actual
inputs to `primaryWinProbability` — while labor's AP was consumed entirely by
petition-only camp-action spam (petition is always legal/affordable while
`!ballot`, so scripted and human "labor-first" play naturally spends every AP
on it until the threshold clears).

Change (`src/data/plays.ts`; `src/harness/ballot-qualification.ts` and
`src/harness/smoke-play.ts` import the card directly, so this pass also
retired the last hand-duplicated copies of engine logic in the harness
suite — see "Cleanup / mechanics audit pass, round 2" below):
- Petition Drive yields raised: BREAKTHROUGH 95–134 sigs (was 70–104), GAIN
  55–84 (was 40–64). SETBACK/DISASTER untouched — deadline risk still real.
- Filing Fee cost raised $750 → $1,250 — money path now also spends real AP
  (and takes on real filing-deadline risk) to reach the ballot, rather than
  clearing it almost incidentally in week 1–2.
- `src/engine/strategies.ts`: updated the `$750` affordability checks to
  `$1,250`; also fixed `hybridStrategy`'s ballot-access branch, which checked
  `money >= 750` *after* an unconditional petition check that (because
  petition is always legal pre-ballot) made the money branch dead code —
  "hybrid" was silently pure-labor for ballot access. Now alternates
  petition/Fish Fry weeks so it actually races both doors.

### Measured (`npm run harness:full`, 200 trials/strategy, after both fixes)

| Strategy | Miss filing | Ballot rate | Reach general | Primary win \| ballot | Win \| reach | Overall general win |
|----------|-------------|-------------|----------------|------------------------|--------------|----------------------|
| labor    | 2%          | 98%         | 39%            | 39.8%                  | 47.4%        | 18.5%                |
| money    | 12.5%       | 87.5%       | 50%            | 57.1%                  | 62%          | 31%                  |
| hybrid   | 2.5%        | 97.5%       | 41%            | 42.1%                  | 43.9%        | 18%                  |
| grind    | 98%         | 2%          | 2%             | —                       | —            | 1.5%                 |

Money/labor overall-win ratio: **1.68x** (was ~2.5x). Petition avg-week-to-ballot
now ~4.1–5.1 (was ~5.3–6.2); Filing Fee now costs real weeks too instead of
clearing in week 1–2. `src/harness/full-campaign.ts` now asserts
`money.overallGeneralWin <= labor.overallGeneralWin * 2.3` so this ratio can't
silently regress again.

### Design read
- Money still wins more — it's buying certainty, and that's the honest trade
  the covenant describes ("choices bind"), not a bug. The bug was the
  *magnitude* of the gap, not its direction.
- Labor is no longer starved of AP for building primary stats; it now reaches
  the ballot fast enough to have a real primary campaign afterward.
- Known gap (not fixed this pass, documented for future work): several Wave
  1–3 cards reference allies/assets/reps that are never actually granted to
  the player anywhere in the codebase (`AL01`, `AL03`, `AL04`, `AL05`, `AL09`,
  `AL11`, `R01`, `R05`, `R06`, `R07`, `R10`, `A01`, `A09`, `B05`) — e.g.
  Kitchen-Table Meeting's "chairs" bonus, Earned Media's press-relationship
  bonus, and `resolve()`'s Kitchen Cabinet band-narrowing can never trigger.
  These read as scaffolding for an allies/assets acquisition system that
  hasn't been built yet, not as regressions — flagging so it's tracked
  against the "Shadow consequences on Faces" ticket item.

### Harness
`src/harness/full-campaign.ts`, `src/harness/ballot-qualification.ts`,
`src/harness/primary-general.ts` — all pass under `npm run harness`.

## 2026-07-17 — Cleanup / mechanics audit pass, round 2

Full routine-maintenance pass requested after the round-1 fixes above. A
background audit agent re-read `deck.ts`, `plays-wave4.ts`, `setup.ts`, the
remaining harnesses, and the UI/CLI shells looking specifically for the same
class of bug as round 1 (a field computed but never consulted, or two copies
of the same logic that can drift). Findings, ranked by impact:

### Bug: `state.tier` never advanced in real play — dead card + inert difficulty curve
`state.tier` ("resistance tier") is read by `resolve()` to widen the
DISASTER band as the race gets more real (`0.04 + tier*0.04`, doubled for
VOL), and by `PL20_PacCheck`'s `show: (s) => s.tier >= 1` gate. Nothing in
production code ever wrote to it — it stayed `0` for the entire campaign,
which meant (a) the intended difficulty escalation across pre-ballot →
on-ballot → general never happened, and (b) PL20 could never enter the
weekly-draw pool, a phase draft, or become playable by any path — a fully
dead card despite being wired into `WAVE4_PLAYS`/`ALL_PLAYS` and asserted
present by `harness:ac1` (that assertion only checked catalog membership,
not reachability).

Fix (`src/engine/play.ts`, `executePlay`): `state.tier = getPhase(state) - 1`
at the top of every play, so tier now escalates 0 (pre-ballot) → 1
(on-ballot) → 2 (general) automatically, in step with the phase system that
already governs card legality. Verified PL20 now enters the ownership pool
once balloted (see commit); verified this doesn't perturb the AC1
determinism/parity harnesses (they unit-test `resolve()` directly against a
manually constructed state, and the campaign-replay check only asserts
seed-to-seed equality, not a fixed golden tier trace).

Secondary effect: STD/VOL disaster risk on-ballot and in the general is now
real (previously it was flatly under-costed at the pre-ballot band for the
whole campaign). Re-ran `harness:full`: money/labor ratio moved from ~1.68x
to ~2.03x — still comfortably inside the 2.3x guardrail added in round 1, and
an expected, legitimate consequence of fixing a real bug rather than a
regression to chase back down.

### Cleanup: two independently hand-duplicated starter-deck lists
`deck.ts`'s `STARTER_DECK_IDS` (the actual physical draw pile default) and
`loop.ts`'s inline `starter` array (used to seed deck *ownership*) listed
identical ids/counts with nothing enforcing that. `loop.ts` now imports and
reuses `STARTER_DECK_IDS` — one list, not two that happen to agree today.

### Cleanup: persona attribute bonuses hand-duplicated between `attrs` and `apply()`
Each `PersonaDef` in `setup.ts` had both an `attrs` field (read by the UI's
pre-game blurb) and a second, separately-typed copy of the same bonuses
inside its `apply()` closure (the one that actually lands on the campaign).
They agreed for all four personas today but had no structural reason to.
`apply()` no longer calls `bumpAttrs` itself; `applySetup` now calls
`bumpAttrs(state, persona.attrs)` once, centrally, after `persona.apply()` —
single source of truth for what a persona's attribute tilt is. Verified via
`harness:setup` that the resulting attribute totals are byte-identical to
before the refactor.

### QoL: Petition Drive / Filing Fee showing twice in the play menu
`ensureBallotAccessInHand` forces a physical PL04/PL05 copy into hand
whenever neither is present pre-ballot, but `listPlayableHand` *also*
appends a virtual `[CAMP]` entry for both whenever `!state.ballot` —
both conditions are true simultaneously almost every pre-ballot week, so
the CLI/UI menu typically showed "Petition Drive" twice with different
backing mechanics (one discards the hand copy on play, the other leaves it
inert until end-of-week discard). Harmless but confusing. `listPlayableHand`
now skips the camp-action entry when the same card id is already a playable
hand entry.

### Foundation: retired the last hand-duplicated engine logic in the harness suite
`test-resolve.mjs`, `smoke-play.mjs`, and `ballot-qualification.mjs` predate
the TypeScript engine extraction and each hand-copied a slice of engine
logic (`resolve()`, the state factory, Petition Drive's yield table) instead
of importing it. This is exactly the drift-risk class that required manually
mirroring the PL04 yield/PL05 cost change into `ballot-qualification.mjs`
and `smoke-play.mjs` by hand in the round-1 pass above — a maintenance tax
that compounds with every future tuning pass. Converted all three to `.ts`
harnesses (`npx tsx`, matching every other harness in the suite) that import
`src/engine`/`src/data` directly. Verified output distributions/rates match
the retired `.mjs` versions within expected sampling noise. `package.json`
scripts updated; no more `.mjs` harnesses in the repo.

### Foundation: loose `any` typing on well-known state shapes
`GameState.district`, `.genOpp`, `.rivals`, and `.log` were typed `any`/
`any[]` despite every call site constructing values of one consistent
shape — in `district`'s case, an exact-match `DistrictRuntime` interface
already existed in `setup.ts` and simply wasn't being used for this. A typo
or renamed field on any of these would previously have failed silently at
runtime (e.g. `state.district.align` returning `undefined` with no compiler
warning) instead of failing `tsc --noEmit`. Added `DistrictInfo` and
`GeneralOpponent` to `engine/types.ts` (the correct dependency direction —
`data/` already depends on `engine/`, not the reverse) and typed `district`,
`genOpp`, `rivals`, and `log` (now `LogEntry[]`, reusing the interface that
already existed and was already unused for this) accordingly. `tsc --noEmit`
and the full harness suite pass unchanged.

### Foundation: dependency hygiene
- `npm audit`: one moderate/high finding (`GHSA-67mh-4wv8-2f99`, esbuild
  <=0.24.2 via Vite 5's bundled esbuild — dev-server request/response
  disclosure to any website; does not affect the built/deployed site).
  Fixing it required a breaking Vite major bump. Per explicit direction,
  upgraded Vite 5.4 → 8.1 (TypeScript left on 5.9 — not itself vulnerable,
  and a 5→7 jump wasn't requested). `npm audit` now reports zero
  vulnerabilities. Verified: `tsc --noEmit`, `npm run build`, a headless
  click-through of the built site (Playwright, zero console errors), and
  the full harness suite all pass unchanged on Vite 8.
- `package-lock.json` confirmed in sync (`npm ci --dry-run` clean, no
  warnings) both before and after the Vite bump.
- No secrets/credentials tracked in git (`git ls-files` swept for
  `.env`/`.pem`/`.key`/credential-shaped paths — clean).

### Foundation: added a CI gate
There was no automated check on pushes/PRs — only the GitHub Pages deploy
workflow, which runs `npm run build` but only on pushes to `Fable-build` and
only *deploys*; a broken build there is a broken production site, not a
caught regression. This is exactly how the index.html regression (round 1)
reached the branch undetected. Added `.github/workflows/ci.yml`: on every
push and PR, run `npm ci && npm run typecheck && npm run harness && npm run
build`. Also bumped both workflows' pinned Node from `20` to `22`, since
Vite 8 requires Node `^20.19.0 || >=22.12.0` and trusting `20` to resolve
above the `.19` floor is exactly the kind of assumption this pass is trying
to stop making.

### Not fixed this pass (see docs/ROADMAP.md)
- `debt` (PL21 Self-Fund) and `obls` (PL20 PAC Check obligations) are taken
  on but have zero mechanical consequence anywhere — the "trap" is honestly
  labeled in flavor text but doesn't yet bite. Same shape of issue as the
  district-trap bug fixed in round 1, except this one is *documented* as
  future work (TICKET's "Shadow consequences on Faces") rather than an
  accidental regression, so it's roadmapped rather than patched blind here.
- The allies/assets/reps acquisition gap noted in round 1 (above) is
  unchanged.
- `state.rivals` is populated at setup but never read by any mechanic.

### Harness
All of `npm run harness` (12 harnesses) plus `npm run build` and `npm run
typecheck` pass clean after this pass.

## 2026-07-17 — Design-source recovery: shadow consequences, reputation, UI polish

The user shared the original design conversation. It turned out to contain
the actual archive prototype this engine was extracted from
(`archive/prototype-single-file.html`) — see `docs/SRD-NOTES.md` for full
detail and provenance. Three changes from this:

### UI: persona immutability guard
Engine-level check confirmed `applySetup()` only ever runs once (inside
`createCampaign`) — no engine bug. The gap was UX: the "New run" button had
no confirmation before abandoning an in-progress campaign, which is the
only way persona could appear to "change." Added a `window.confirm` guard
in `src/ui/main.ts`. This is covenant 7 ("Choices bind") not being fully
enforced at the UX layer, now fixed.

### UI: card redesign
User: cards should be 2:3 aspect ratio with more detail, shadowing,
aesthetics, polish. Restructured `.play-card` markup (`src/ui/main.ts`) and
CSS (`src/ui/styles.css`): cost badge, `card.tag` flavor line (existed on
every card, was never rendered), scrollable description, risk-class color
coding (SAFE/STD/VOL/CHOICE), camp/trap corner ribbons, layered box-shadow,
inner frame ornament, watermark, hover lift. `.card-grid` changed from a
vertical list to a responsive grid capped at ~172px columns. Verified via
headless Playwright screenshots at 1200px and 390px (mobile) — base cards,
a TRAP ribbon, and a CAMP ribbon all confirmed rendering correctly with
zero console errors.

### Mechanics: ported shadowCheck() and repCheck() from the archive
`archive/prototype-single-file.html` has complete, working `shadowCheck()`
(Faces thresholds → real consequences) and `repCheck()` (reputation
grants) functions. Every field `shadowCheck()` touches — `pieMalus`,
`exposure`, `b05Malus`, `allyMalus`, `favWitness`, `hitPieces`, `volPool`,
`rapStall`, `obls`, `groundsArr`, `shFired` — already existed in modular
`GameState`, unused, clearly scaffolded for exactly this. This was a port,
not new design.

New `src/engine/reputation.ts`: `hasRep`, `warm`, `addRep`, `addAlly`
(shared helpers — consolidated three private duplicate copies of
`hasRep`/`warm` out of `resolve.ts`, `plays.ts`, and `deck.ts`), full
`shadowCheck()`, and the subset of `repCheck()` reachable with fields that
already exist (R01 walkCount≥12, R02/R04 shadowPlays, R07 hitPieces≥3,
R10/R11 disasterLog). Wired into `executePlay` (after every play) and
`endWeekInPlace` (catches week-gated thresholds like R02 on a week with
zero plays, matching the archive's own redundant double-call).

This makes several previously-dead references live: `resolve()`'s
`hasRep(state,'R10')` disaster-band reduction, `rapGain()`'s
`state.rapStall` check (settable via the F1 shadow threshold now). Also
fixed one concrete bug found via diff: `PL13_FishFry`'s BREAKTHROUGH text
says "the small-dollar list starts here" but never pushed `B05` into
`state.backers` — the archive's equivalent card does
(`archive/prototype-single-file.html:612`). Fixed to match.

**Verified:** targeted script confirmed `walkCount>=12` grants R01 and a
Faces-P threshold correctly fires a SHADOW log line + sets `pieMalus`. Full
harness suite (12/12), typecheck, and build all pass unchanged.

**Not ported this pass — rescoped in `docs/ROADMAP.md` Phase 2, not
abandoned:** the rest of `repCheck()` (R05/R06/R08/R09/R12) and most of the
allies/assets system depend on content that doesn't exist yet — two
specific cards (`PL21B`, `PL39`, both grant `AL09`), a purchasable-assets
shop, 12 more allies, and a structured obligations registry with weekly
drag effects (vs. modular's current free-text `state.obls`). All precisely
scoped with archive line references in `docs/SRD-NOTES.md` rather than
left as an open design question.

### Harness
`npm run harness` (12/12), `npm run typecheck`, `npm run build` all pass.

## 2026-07-17 — Mobile card-grid bug (one-handed play is a core product thesis, not a nice-to-have)

The project's stated design goal is Dwarf-Fortress-level systemic
complexity in a form factor playable one-handed on mobile with minimal
scrolling/navigation — the card/deckbuilder structure exists specifically
because of this constraint. Worth stating plainly in the notes: this
isn't a cosmetic preference, it's load-bearing for the product, so a
mobile-scroll regression is a real bug, not polish.

### Bug
`.card-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 172px)); }`
(added earlier today in the card-redesign pass) rendered as a **single
column on phone-width screens** instead of the two that should fit.
Root cause: CSS Grid's `auto-fill` repetition count is computed from
`minmax()`'s **max** bound when it's a definite length (172px here), not
the min (140px) — a real spec detail, not a typo. Measured at a 390px
viewport: content width 308px, two 140px columns + gap only need 294px,
but the browser used 172px+gap per column for its fit calculation
(`floor((308+14.4)/(172+14.4)) = 1`), producing one oversized column and
~2382px of vertical scroll for a 5-card hand.

### Fix
`grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));` — `1fr` is
indefinite, so the browser correctly uses the 140px min for the fit
calculation instead. Individual card growth is now capped separately via
`max-width: 172px` on `.play-card` itself (not the track), so wide desktop
rows still don't stretch cards, and narrow mobile rows get the correct
column count.

### Measured
390×844 viewport, 5-card hand: scroll height 2382px → **1490px** (~37%
reduction). Grid now correctly computes 2 columns (`146.8px 146.8px`
measured). Desktop (1200px, 5-card hand, 3 columns) re-verified unchanged
— no regression. Both confirmed via headless Playwright screenshots.

### Harness
CSS-only change; `npm run harness` (12/12), `npm run typecheck`, `npm run
build` all pass.
