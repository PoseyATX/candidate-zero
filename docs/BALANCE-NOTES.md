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
