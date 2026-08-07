Status: active
Created: 2026-08-07
Updated: 2026-08-07

# Ticket: Standing Block Walk (PL01)

Parent: none  
Depends-On: none

## Scope
Implement SRD standing-action architecture for Block Walk: camp strip always-on in primary/general; remove physical starter-deck density of PL01; keep ownership for upgrades; harness evidence; ship on GitHub.

## Non-goals
- Session casework standing strip (backlog)
- 0-AP walks
- Catalog cuts

## Acceptance Criteria
1. Camp always offers PL01 when playable and not already in hand (primary/general).
2. Starter draw pile has 0× PL01; ownership still has PL01.
3. playFromHand camp path resolves field ground picker as today.
4. Automated assert + typecheck green; export/gen if needed.
5. Knowledge/decision records in `.10x/`.

## References
- `.10x/specs/standing-block-walk.md`
- `.10x/decisions/standing-actions.md`
- `.10x/knowledge/candidate-zero.md`
- `docs/SRD-NOTES.md` Standing Actions

## Assumptions
- Camp index `-102` free (record-backed).
- UI camp section includes all non-BUY negative indices (record-backed).

## Journal
- 2026-08-07: Implemented CAMP_BLOCK_WALK (-102), STARTER_DECK without PL01, STANDING_OWNED_IDS, flavor update on PL01, harness asserts, export/gen/engine bundle regenerated.
- harness:flow green (standing asserts). typecheck green. harness:content + gen:unity:check green.

## Blockers
None

## Evidence
- `npm run harness:flow` — starter pile no PL01; ownership has PL01; listPlayableHand offers CAMP_BLOCK_WALK.
- `npx tsc --noEmit` — clean.
- `npm run export:content && gen:unity && build:engine && gen:unity:check && harness:content` — clean.

## Review
(pending push CI)

## Retrospective
(to fill on close)
