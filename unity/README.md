# unity/ — the Unity binding side

This folder holds the artifacts and reference scaffolds that a Unity project
uses to bind the pure TypeScript engine. **Unity is the product; this repo is
the rules + content source of truth.** See `../docs/UNITY-BRIDGE.md`.

- `content/candidate-zero-content.json` — the exported content manifest
  (cards, personas, issues, districts, regions, grounds). Regenerate with
  `npm run export:content`; CI (`npm run harness:content`) fails if code and
  this file drift.
- `Scripts/CardDefinition.cs` — the card `ScriptableObject`.
- `Scripts/Editor/ContentImporter.cs` — editor importer (menu:
  **Candidate Zero → Import Content**) that turns the JSON into SO assets.
- `Scripts/EngineBridge.cs` — reference stub for calling the engine bundle
  (`dist-engine/…`, built by `npm run build:engine`).

The C# here is not compiled in this repo (no Unity toolchain) — it is the
reference implementation to drop into the Unity project and validate there.
