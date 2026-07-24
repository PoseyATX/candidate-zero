# Unity bridge — how the pure engine + content bind to Unity

The end product is a Unity game (→ iOS / App Store). The TypeScript project is
**not** the product — it is the single source of truth for **rules and
content**, which Unity consumes. Unity owns presentation, input, audio,
persistence, and meta-progression; it reimplements **nothing**.

Two artifacts cross the boundary — a clean split:

| Half | Produced by | Unity consumes it as |
|---|---|---|
| **Rules / simulation** | `npm run build:engine` → `dist-engine/candidate-zero-engine.umd.cjs` | a JS bundle loaded in an embedded JS runtime; called per `docs/ENGINE-API.md` |
| **Content / presentation** | `npm run export:content` → `unity/content/candidate-zero-content.json` | **ScriptableObjects** (one `CardDefinition` asset per card, etc.) |

## Content → ScriptableObjects (this pass)

`src/data/manifest.ts` assembles every card, persona, issue, district,
region, and ground into a pure, presentation-only manifest — **rules
stripped out** (no odds/run/show functions ever leave the engine). The
export is deterministic and CI-guarded (`npm run harness:content` fails if a
new card is added in code but not re-exported).

Card presentation model — important, per design direction:
- The **card face** is name + art + cost + family tint (`kind`).
- The **description is a data field revealed on tap/inspect** — it is *not*
  drawn on the card face. (This is why the web prototype's inline scrolling
  description is a non-issue for the real product.)

Unity side (`unity/Scripts/`, reference scaffold — verify in the Unity project):
- `CardDefinition.cs` — the `ScriptableObject` mirroring the card schema.
  Designers assign art per card in the editor; import updates the data.
- `Editor/ContentImporter.cs` — menu **Candidate Zero → Import Content**:
  reads the JSON, creates/updates one SO asset per card, idempotently.
  (Requires the Newtonsoft JSON Unity package.)

Workflow: edit content in `src/data/*` → `npm run export:content` → copy the
JSON into the Unity project → run the importer. New/changed cards flow in;
assigned art is preserved.

## The C# DTOs are GENERATED — never hand-typed

Everything that crosses the boundary is JSON, so the Unity side needs C#
classes shaped like the TypeScript types. Those classes used to be typed by
hand, in **four** places: `Engine/ViewModels.cs`, `Engine/SetupModels.cs`, and
private `Manifest`/`CardDto` duplicates inside *both* `Editor/ContentImporter.cs`
and `Content/CardCatalog.cs`.

That is the maintenance tax that compounds as the cardbase and systems grow:
one new engine field meant four manual C# edits, in two languages, with
nothing failing loudly when someone forgot. It had already drifted — the host
declared `ledger.apMax` and rendered the AP pips from it, but the engine never
emitted that field, so Unity silently fell back to a hardcoded 3 pips while
the real ceiling was 2 (and 1 during the waiting season).

Now `scripts/gen-unity-models.ts` reads the **real TypeScript types with the
TypeScript compiler's own type checker** — not a regex, not a parallel schema —
and emits:

```
unity/Scripts/Engine/Generated/EngineModels.g.cs    <- src/engine/api.ts
unity/Scripts/Engine/Generated/ContentModels.g.cs   <- src/data/manifest.ts
```

| Command | What it does |
|---|---|
| `npm run gen:unity` | regenerate the C# models from the TS types |
| `npm run gen:unity:check` | fail if the generated C# is stale (**runs in CI**) |
| `npm run sync:unity` | copy the drop-in (`unity/`) into the Unity host project |
| `npm run sync:unity:check` | fail if the host copy has drifted |
| `npm run unity` | all of it: build engine → export content → generate → sync |

**Adding a field is now:** add it in TypeScript → `npm run gen:unity` → done.
Forget the regen and CI fails with `STALE:` instead of Unity silently
deserializing into a field that no longer exists.

Design notes on the generator:
- **Opaque by contract.** `EngineSnapshot` maps to `JToken`, not a modelled
  class. The host persists it and hands it back; it never inspects rules.
- **String-literal unions stay `string`.** `CardKind`, `deck`, `stage` etc. are
  transport values. The Unity-side `CandidateZero.Content.CardKind` enum is a
  *presentation* concern (inspector fields, tint tables) and stays owned by the
  Content layer, which parses string → enum. Generating a second `CardKind`
  into `HostData` would collide with it.
- **`number` is ambiguous** — it maps to `int` by default, with genuinely
  fractional fields (`approxOdds`, `rapport`, `rivalRap`, `gotv`, `prop`)
  listed in `FLOAT_FIELDS` at the top of the generator.
- JSDoc on a TS field becomes an XML `<summary>` on the C# field.

Hand-written C# that remains is only the part Unity genuinely owns:
`CardDefinition` (a `ScriptableObject` with inspector attributes and an art
slot), the HUD, and `EngineBridge` itself.

## Rules → engine bundle

`EngineBridge.cs` (reference stub) shows the runtime call pattern: load the
`CandidateZeroEngine` global in an embedded JS runtime (ClearScript / Jint /
Puerts) and marshal snapshots + commands as JSON. The engine is deterministic
(mulberry32; a game reproduces from `seed` + command log, and save/load is
lossless — see `docs/ENGINE-API.md` and `npm run harness:api`). Unity persists
the opaque snapshot string to save a game; it never inspects rules inside it.

## What's verified vs. not

- **Verified in this repo:** the content export + schema + determinism +
  code/JSON sync (`harness:content`), and the engine bundle + its determinism
  (`harness:api`, `build:engine`). Both run in CI.
- **Not runnable here (no Unity toolchain):** the C# scaffolds compile and
  run in a Unity project, not in this repo. They are the reference
  implementation to drop in and validate there.

## JS runtime: Jint (chosen)

The engine bundle runs inside Unity in **Jint** — a pure-C# JS interpreter,
no native libraries, so the iOS / IL2CPP / App Store path stays clean (the
game is turn-based, so interpreter speed is irrelevant). The bundle is built
at **es2019** (`vite.engine.config.ts`) so no ES2020 syntax reaches Jint, and
`npm run build:engine` emits an IIFE build copied to a committed drop-in at
**`unity/engine/candidate-zero-engine.js`** (a plain `var CandidateZeroEngine`
global Jint evaluates directly). `EngineBridge.cs` is the concrete Jint
implementation. Click-by-click: **`docs/UNITY-SETUP.md`**.
