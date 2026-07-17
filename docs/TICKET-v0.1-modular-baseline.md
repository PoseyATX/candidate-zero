# Ticket: Establish Modular TypeScript Baseline v0.1

**Status:** OPEN — in progress (honest label only after evidence)
**Source of truth:** https://github.com/PoseyATX/candidate-zero

## Acceptance criteria

| ID | Criterion | Status |
|----|-----------|--------|
| AC1 | Side-by-side verification vs original prototype | **STRENGTHENED** — seeded RNG, campaign replay, STD≡prototypeRoll 2000/2000; intentional deltas documented |
| AC2 | Full card audit vs SRD §10 | **STRENGTHENED** — `npm run harness:audit` evidence table; all plays attr-tagged |
| AC3 | Clean layered extraction (Data / Engine / UI) | **STRENGTHENED** — Engine complete; thin Vite UI shell live |
| AC4 | UI reliable | PARTIAL — minimal shell (ledger / play / end week / seed); not polished |
| AC5 | Harness skeleton | **STRENGTHENED** — resolve, smoke, ballot, multi-strategy, play-loop, ac1, ac1-parity, audit |
| AC6 | Honest version label | **Not v0.1** — package `0.0.1` |

## Increment: Minimal play loop + multi-strategy harness (2026-07-16)

Delivered pure play/deck/loop/strategies; ballot camp actions; multi-strategy evidence (labor ~90.8% ballot by W8).

Unity deferred as presentation-only; TS engine remains rules authority.

## Increment: Attr synergy + catalog wire-up + UI shell (2026-07-17)

- WAVE4 merged into `ALL_PLAYS` / `PLAYS` (22 cards)
- `trap`, `attrs` (root CLO/CON/CRA/INK/DIP/CHA) on types; default attrs=10
- Seeded deck shuffle + weekly draw via shared mulberry32 stream
- `cardAttrMod` live on executePlay
- Thin Vite UI (`src/ui/main.ts`) over pure engine
- Harnesses: `ac1-prototype-parity`, `audit-srd-plays`

## Increment: Primary (8) + General (6) calendar (2026-07-17)

- `src/engine/calendar.ts` — continuous weeks 1–14, phase map, filing + elections
- Phase: pre-ballot primary=1, on-ballot primary=2, general=3
- Terminal outcomes wired through `endWeekInPlace` / `runFullCampaign`
- Harness: `npm run harness:calendar`

## Increment: Setup binds + phase drafts (2026-07-17)

- Personas apply root **attrs** (cardAttrMod) + faces/resources
- `createCampaign({ setup })` applies persona/issue/district/region (default teacher/east)
- CLI: `--persona --issue --district --region`
- UI: identity setup screen before play; stage/attrs on ledger
- Phase-turn **3-card draft** on ballot (phase 2) and enter-general (phase 3); auto in harnesses
- Harness: `npm run harness:setup`

## Next
1. Yield-table archive compare for walk/fund/chairs (AC1 open note)
2. General-election card weight / GOTV balance pass
3. Shadow consequences on Faces
4. Polish UI; only then consider v0.1 label with evidence bundle
