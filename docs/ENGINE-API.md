# Engine API — the host binding contract

The frozen boundary a presentation host (Unity/C#, iOS, a web UI, a bot) uses
to play Candidate Zero. **The rules live only behind this boundary.** A host
sends commands and renders the returned view; it never reimplements
resolve/odds/yields/RNG. This is the ship-path covenant (ROADMAP Phase 8):

> **TypeScript pure engine → Unity presentation shell → iOS / App Store.**
> Unity does not become a second rules implementation.

- Source: `src/engine/api.ts` · Contract test: `npm run harness:api`
- Bundle: `npm run build:engine` → `dist-engine/candidate-zero-engine.{mjs,umd.cjs}`
- Current version: `ENGINE_API_VERSION = 1.0.0`

## The determinism / seed contract

The RNG is **mulberry32** — its entire internal state is a single `uint32`
counter. So a game is fully, exactly reproducible from plain data:

```
EngineSnapshot = { v, seed, rng, setup, state, deck }
```

Everything in a snapshot is JSON-serializable. The card catalog is the only
non-data part of a live game and is rebuilt from static card data on load —
never serialized. Two guarantees hold, both proven by `harness:api` across
multiple seeds:

1. **Same seed + same ordered command list → identical final state.**
2. **`serialize()` → `deserialize()` at any point → identical state**, and
   play continues identically. Save/load is exact, not approximate.

So a host persists a game by storing a snapshot (≈3.5 KB JSON) — or just
`seed` + the command log. It never needs to understand a rule to save/load,
replay, or verify a game.

## API surface

```ts
newGame(opts: { seed: number; setup?: Partial<SetupSelection> }): EngineSnapshot
view(snap): RenderView            // full render model + available actions
legalActions(snap): ActionOption[] // just the actions (subset of view)
apply(snap, command): ApplyResult  // { snapshot, ok, reason?, events }
serialize(snap): string            // persist
deserialize(text): EngineSnapshot  // restore (throws on unreadable version)
setupOptions()                     // persona/issue/district/region choices for the setup screen
cardIdForIndex(snap, handIndex): string | null
ENGINE_API_VERSION: string
```

### Commands

```ts
type Command =
  | { type: 'play'; handIndex: number; groundId?: string } // groundId required only when the action.field flag is true
  | { type: 'draft'; option: number }                      // resolve a pending phase draft
  | { type: 'endWeek' }
  | { type: 'dismissOutside' }                            // clear Outside weather chrome
```

`handIndex` comes from an `ActionOption`; negative indices are camp actions
(petition/fee, shop, session, starmap, waiting) and are handled by the engine.
`apply` returns `ok: false` with a `reason` for illegal commands and never
mutates the input snapshot (pure — returns a new one).

### RenderView (what a host draws)

`view(snap)` returns: `over`/`outcome`, `stage`/`phase`/`stageLabel`/
`stageWeek`/`calendarWeek`/`weeksTotal`, `identity` (persona/issue/district),
`ledger` (AP, money, contacts, nameID, vols, momentum, favors, debt,
endorsements, ballot, signatures/need, …), `grounds[]`, `actions[]`,
`pendingDraft`, **`pendingOutside`** (world weather — show then
`dismissOutside`), `canEndWeek`, and the tail of the `log`.
`apply().events` is the slice of log entries a single command produced —
for host toasts/animation.

**Mobile presentation target:** 9:16 (portrait). Desktop 16:9 may letterbox
or reflow; primary design is one-handed phone.

## Binding from Unity (or any JS-in-C# runtime)

Load `dist-engine/candidate-zero-engine.umd.cjs` in a JS runtime embedded in
C# (ClearScript, Jint, Puerts). It exposes a `CandidateZeroEngine` global.
The loop is pure request/response over JSON:

```
snap  = CandidateZeroEngine.newGame({ seed })
model = CandidateZeroEngine.view(snap)        // render it in Unity
res   = CandidateZeroEngine.apply(snap, { type:'play', handIndex, groundId })
snap  = res.snapshot                           // render res.events, repeat
save  = CandidateZeroEngine.serialize(snap)    // persist string
snap  = CandidateZeroEngine.deserialize(save)  // restore
```

Unity owns presentation, input, audio, persistence, and meta-progression
(the Chronicle). It owns **no rules**. When the engine gains content or
mechanics, the host recompiles the bundle and gets them for free — no C#
rule changes, because there are none.

## Versioning

`ENGINE_API_VERSION` is stamped on every snapshot and view. A breaking change
to the snapshot shape or command schema bumps the major version; hosts should
check it on `deserialize`. Additive fields (new view data, new command types)
are minor and backward compatible.
