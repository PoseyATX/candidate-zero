# Anvil adoption notes

**Source:** [7etsuo/anvil](https://github.com/7etsuo/anvil) · MIT · public use (posted on X).  
**Local port:** `src/lib/anvil-port/` · `NOTICE.md` + `LICENSE-ANVIL.txt`

## Decision

**Borrow patterns and portable code. Do not rewrite Candidate Zero as an Anvil title.**

| Layer | Candidate Zero keeps | From Anvil we use |
|-------|----------------------|-------------------|
| Rules | Pure TS engine (`src/engine/*`) | Nothing — Anvil `genre-card` is StS combat, not Texas campaign resolve |
| Presentation | Vite DOM UI | Greybox art plates, optional raster under `public/assets/cards/` |
| Agent / harness | Strategies + matrix | Compact `observeCampaign` / `observeCampaignDiff` |
| Ship | Unity host API (on hold) | Electron shell / Phaser: **not** adopted now |

## Incorporated

1. **Greybox art** (`greybox.ts`, `cardAssets.ts`) — deterministic color plates + `ASSET_MISSING` tracking when art is absent. Cards show greybox **under** the existing emblem so faces never look like broken product photos.
2. **Agent observe** (`observe.ts`) — short JSON summary of stage / ledger / legal hand for harnesses and future agent play.
3. **Harness** — `npm run harness:observe`.

## Explicitly not incorporated

- Full Anvil monorepo dependency / Phaser renderer  
- `@anvil/genre-card` Battle (energy, block, enemy intents)  
- Schema-v2 authoring IR (our content is TypeScript catalogs)  
- Multiplayer / Colyseus  

## Card art workflow (Anvil + Grok Imagine spirit)

Anvil rule: **engine loads files; it does not generate art.**

1. Content declares path: `assets/cards/{cardId}.png` (or `CARD_ART_PATH` override).  
2. Missing → greybox + emblem (play continues).  
3. Imagine produces small (~300px) PNGs → drop under `public/assets/cards/`.  
4. Register path in `CARD_ART_PATH` only when the file ships (avoids broken img).  
5. Cap size in review (~50KB); `object-fit: contain` only — no full-bleed product shots.

See Anvil’s `docs/GROK_WORKFLOW.md` for the base-identity → `image_edit` frames loop (adapt for static card icons, not walk cycles).

## Future (optional)

- Promote more Anvil agent tools if we want CLI `observe` for CI.  
- Desktop shell only if Unity stay parked long-term.  
- Do **not** replace `api.ts` / pure engine with Anvil kernel.
