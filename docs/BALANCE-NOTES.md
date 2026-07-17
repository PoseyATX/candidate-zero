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

Change (`src/data/plays.ts`, mirrored in `src/harness/ballot-qualification.mjs`
and `src/harness/smoke-play.mjs`):
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
`src/harness/full-campaign.ts`, `src/harness/ballot-qualification.mjs`,
`src/harness/primary-general.ts` — all pass under `npm run harness`.
