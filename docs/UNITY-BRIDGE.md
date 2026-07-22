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

## Choosing the JS runtime for the engine (open decision for the Unity project)

The engine bundle needs a JS host inside Unity/IL2CPP. Viable options, to be
decided when the Unity project starts: **Jint** (pure C#, no native deps,
simplest for IL2CPP/iOS), **ClearScript** (V8, fast, heavier native deps),
or **Puerts** (V8/QuickJS, Unity-focused). This is a Unity-project decision,
not a rules decision — the engine contract is identical across all three.
