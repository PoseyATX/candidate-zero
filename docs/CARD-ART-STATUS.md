# Card Art Status

**Updated 2026-07-24** (post PR #34 / merge `e594958`).

**SoT:** optional raster map is `CARD_ART` in **`src/ui/card-face.ts`** — **not** `main.ts` (main is boot-only after extract).
Engraved emblem SVG defaults live in **`src/ui/card-art.ts`** (`emblemFor` / `emblemKeyFor` + kit prefixes).

**Player-facing faces (current):** **emblem-only** on the parchment plate when no raster is registered. The Anvil hash-colored greybox plate was **retired** from `artPlateHtml` (owner #33 — clashy boxes). Greybox helpers remain in `src/lib/anvil-port/` for tooling only; they are **not** drawn on cards.

**Gate:** `npm run check:card-art` — missing `public/assets/cards` → exit 0; present images must be ≤50KB; unexpected extensions fail. Wired into `npm run harness`. Companion unit checks: `npm run harness:card-art`.

**Helpers:** `cardArtUrl(file)`, `isSafeCardArtUrl(url)`, `artPlateHtml(id)` — always `` `${BASE_URL}assets/cards/…` `` (Pages: `/candidate-zero/assets/cards/…`). No remote URLs; no `..`. With empty `CARD_ART`, `artPlateHtml` returns `''` so the emblem stands alone.

**Has image (0):** `CARD_ART` is empty. Do not land sample PNGs until the gate is green on CI. Target size ≈300px max dimension, ≤50KB, under `public/assets/cards/{id}.webp` (or png/svg/jpg).

## Kit emblem prefixes (PR-4)

| Prefix | Default emblem key |
|--------|--------------------|
| SS* | gavel |
| WA* | hourglass |
| MV* | network |
| SIG* | seal |
| BUY* | coin |
| PL* unique map | see `CARD_EMBLEM` in card-art.ts |
| else | star |

## Cards WITHOUT rasters

All catalog cards (~116) currently use **engraved emblem only** (no greybox, no raster). Source of truth for ids: `unity/content/candidate-zero-content.json` / engine catalog.

When adding art:

1. Drop file in `public/assets/cards/` (≤50KB).
2. `npm run check:card-art` green.
3. Register in `CARD_ART` e.g. `PL01: { file: 'PL01.webp' }`.
4. Prefer `object-fit: contain` (CSS already frozen in PR-3.5).
