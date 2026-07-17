# AC1 — Side-by-side verification notes

## Done

| Piece | Status |
|-------|--------|
| Seeded mulberry32 RNG | Done |
| Campaign replay under seed | Done — `npm run harness:ac1` |
| Field adapter | Done — `prototype-compat.ts` |
| Frozen prototype roll ≡ modular STD | **PASS** 2000/2000 |
| SAFE / VOL / PL04 deltas evidenced | Done — `npm run harness:ac1-parity` |

## Intentional deltas

- **PL04** tuned (not pre-tune archive)
- **SAFE** band forced 0
- **VOL** wider disaster band
- **faces** map five nicknames + modular P

## Open

Action yield-table full compare for archive ACTIONS (walk/fund/chairs) — modular is source of truth where tuned.
