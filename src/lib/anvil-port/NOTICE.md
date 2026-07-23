# Anvil-port — adapted code

Portions of this directory are **adapted** from [Anvil](https://github.com/7etsuo/anvil)
(© 2026 Anvil contributors), MIT License — see `LICENSE-ANVIL.txt`.

## What we took

| Anvil source | CZ adaptation |
|--------------|---------------|
| `packages/core/src/assets/AssetServer.ts` (`colorFromPath`, greybox, ASSET_MISSING) | `greybox.ts`, `cardAssets.ts` |
| `packages/core/src/agent/observeDiff.ts` + agent types spirit | `observe.ts` (ledger-oriented, not spatial entities) |
| Agent ACI philosophy (`observe` / compact summary) | `observeCampaign`, `observeSummary` |

## What we did **not** take

- Phaser / `@anvil/render-phaser`
- Full kernel, scenes, net, ARPG/topdown systems
- `@anvil/genre-card` Battle (StS energy/block combat ≠ Texas campaign resolve)
- Image-generation APIs (Anvil rule: engine loads files only)

Anvil is open source; 7etsuo posted it for public use. We keep CZ’s pure rules engine as SoT and only borrow presentation / agent-observation patterns that help this deckbuilder.
