Status: active
Created: 2026-08-07
Updated: 2026-08-07

# Spec: Block Walk as standing camp action

## Behavior
- **GIVEN** stage is primary or general
- **AND** PL01 is playable (phase, affordability left to existing `isPlayable`)
- **WHEN** the player opens the play surface
- **THEN** Block Walk appears under Camp actions at synthetic index `CAMP_BLOCK_WALK`
- **AND** playing it costs AP/turf and resolves identically to hand-drawn PL01
- **AND** it is not removed from a hand slot (camp, not physical)

## Exclusions
- Session/waiting stages do not offer campaign Block Walk camp (existing stage gates).
- If a physical PL01 is already in hand, do not double-list camp (same dedupe as petition/fee).

## Acceptance
1. `listPlayableHand` offers PL01 via camp when hand has zero PL01 and stage is primary/general.
2. `campIndexToCardId(CAMP_BLOCK_WALK)` → `PL01`.
3. Starter physical deck contains zero PL01 copies; ownership set still includes PL01.
4. `harness:flow` or a dedicated assert documents standing availability; typecheck + existing harnesses green.
5. Content export / unity gen if API surface gains a host flag (optional view flag ok).
