# Card Art Status

**Verified PR-7 (2026-07-23).**

**SoT:** optional raster map is `CARD_ART` in **`src/ui/card-face.ts`** — **not** `main.ts` (main is boot-only after extract).
Engraved emblem SVG defaults live in **`src/ui/card-art.ts`** (`emblemFor` / `emblemKeyFor` + kit prefixes).
Greybox plate until a map entry: `src/lib/anvil-port/cardAssets.ts` (BASE_URL-safe; `isSafeCardArtUrl` requires `BASE_URL + assets/cards/`).

**Gate:** `npm run check:card-art` — missing `public/assets/cards` → exit 0; present images must be ≤50KB; unexpected extensions fail. Wired into `npm run harness`. Companion unit checks: `npm run harness:card-art`.

**Helpers:** `cardArtUrl(file)`, `isSafeCardArtUrl(url)`, `artPlateHtml(id)` — always `` `${BASE_URL}assets/cards/…` `` (Pages: `/candidate-zero/assets/cards/…`). No remote URLs; no `..`.

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

All catalog cards (116) currently use emblem + greybox only. Source of truth for ids: `unity/content/candidate-zero-content.json` / engine catalog.

When adding art:

1. Drop file in `public/assets/cards/` (≤50KB).
2. `npm run check:card-art` green.
3. Register in `CARD_ART` e.g. `PL01: { file: 'PL01.webp' }`.
4. Prefer `object-fit: contain` (CSS already frozen in PR-3.5).
