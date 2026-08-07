Status: active
Created: 2026-08-07
Updated: 2026-08-07

# Decision: Standing actions stay off the draw pile

## Context
SRD / archive / `docs/SRD-NOTES.md`: always-available actions as a Camp strip (PbtA basic moves / Blades downtime). Petition and fee already camp. Block Walk remained three starter-deck copies subject to shuffle — the pattern the design rejected.

## Decision
Block Walk (PL01) is a permanent primary/general **camp standing action**. It is not required in the physical starter draw pile. Catalog ownership of PL01 remains for upgrades/path bookkeeping. Same `executePlay` path as other camp cards (no hand discard).

## Alternatives considered
1. **Keep deck copies + camp when missing** — still clutters deck; standing availability depends on draw when both paths race. Rejected.
2. **Remove entirely to free AP for other cards** — shortens the spine verb. Rejected (never shorten the game).
3. **0-AP free walk** — changes economy without ratification. Rejected.

## Consequences
- Starter deck loses three PL01 copies → more non-spine cards cycle; spine still always playable for AP.
- Harness must assert camp PL01 when hand has no PL01.
- UI already surfaces `index < 0` non-BUY as Camp — no section rewrite required.
