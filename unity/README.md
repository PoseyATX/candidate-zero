# unity/ — the Unity binding side

This folder holds the artifacts and reference scaffolds that a Unity project
uses to bind the pure TypeScript engine. **Unity is the product; this repo is
the rules + content source of truth.** See `../docs/UNITY-BRIDGE.md`.

**Live host project (this machine):** `C:\Users\matth\candidate-zero-host`  
Open in Unity Hub → menu **Candidate Zero → Run Engine Smoke (Jint)**  
Details: `../docs/UNITY-SETUP.md` · host `README.md`

- `content/candidate-zero-content.json` — the exported content manifest
  (cards, personas, issues, districts, regions, grounds). Regenerate with
  `npm run export:content`; CI (`npm run harness:content`) fails if code and
  this file drift.
- `Scripts/CardDefinition.cs` — the card `ScriptableObject`.
- `Scripts/Editor/ContentImporter.cs` — editor importer (menu:
  **Candidate Zero → Import Content**) that turns the JSON into SO assets.
- `Scripts/EngineBridge.cs` — Jint facade over the engine bundle.
- `Scripts/GameController.cs` — Play-mode smoke + Resources auto-load.
- `Scripts/Editor/EngineSmokeMenu.cs` — Editor menu smoke + bundle sync.
- `engine/candidate-zero-engine.js` — committed IIFE drop-in (`npm run build:engine`).

The C# here is the reference implementation; the host project is the validated drop.
