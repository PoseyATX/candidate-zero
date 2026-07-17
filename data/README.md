# Data catalog

## `cards.csv`

Human-auditable inventory of **live** content:

| catalog | source |
|---------|--------|
| `play` | `src/data/plays.ts` + wave4 |
| `interim` | `src/data/interim-plays.ts` |
| `session` | `src/data/session-plays.ts` |
| `asset` | `src/data/assets.ts` |

**Mechanical source of truth is TypeScript**, not this CSV.  
Regenerate after any content change:

```bash
npm run export:cards
```

Authoring scaffold columns (`role`, `path_labor_money_neutral`, `economy_target`,
`balance_notes`, `status`) support balanced expansion. See
`docs/ARCHITECTURE.md` §5–7 for gates before adding cards.
