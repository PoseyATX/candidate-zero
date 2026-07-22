# Unity setup — get the engine running in your open editor

Two independent tracks. Track A (cards as ScriptableObjects) needs no
decisions. Track B (the actual game logic) runs the engine bundle in **Jint**.
Everything you copy lives in this repo's `unity/` folder.

Suggested Unity layout: `Assets/CandidateZero/`.

---

## Track A — import the cards as ScriptableObjects

1. **Add Newtonsoft JSON**: Package Manager → Add package by name →
   `com.unity.nuget.newtonsoft-json`.
2. **Copy** into `Assets/CandidateZero/`:
   - `unity/Scripts/CardDefinition.cs` → `Assets/CandidateZero/Scripts/`
   - `unity/Scripts/Editor/ContentImporter.cs` → `Assets/CandidateZero/Scripts/Editor/`
   - `unity/content/candidate-zero-content.json` → `Assets/CandidateZero/content/`
3. **Run it**: menu **Candidate Zero → Import Content**. It generates one
   `CardDefinition` asset per card under `Assets/CandidateZero/Cards/`
   (66 cards). Re-running updates them in place — your assigned art survives.
4. Assign art to a card by selecting its asset and dropping a Sprite into
   the **Art** field. The **card face** shows name + art + cost + kind tint;
   the **description** is a data field you reveal on tap/inspect (not on the
   face).

When content changes in the TS project: `npm run export:content`, copy the
new JSON over, re-run the importer.

---

## Track B — run the engine (Jint)

1. **Add Jint**: install [NuGetForUnity], then NuGet → Manage Packages →
   search **Jint** → Install. (Or drop `Jint.dll` into `Assets/Plugins/`.)
   Jint is pure C# — no native libraries, so iOS/IL2CPP builds stay clean.
2. **Copy** into `Assets/CandidateZero/`:
   - `unity/Scripts/EngineBridge.cs` → `Assets/CandidateZero/Scripts/`
   - `unity/Scripts/GameController.cs` → `Assets/CandidateZero/Scripts/`
   - `unity/engine/candidate-zero-engine.js` → `Assets/CandidateZero/engine/`
     **renamed to `candidate-zero-engine.js.txt`** (append `.txt` so Unity
     imports it as a `TextAsset`; a bare `.js` is treated as script and
     ignored).
3. **Wire it up**: create an empty GameObject, add the **GameController**
   component, drag the `candidate-zero-engine.js.txt` asset into its
   **Engine Bundle** field.
4. **Press Play.** The Console logs:
   - `[Candidate Zero] engine up. Initial view: {…}` — a full render model
     (ledger, actions, grounds, log) for a fresh seeded game.
   - `[Candidate Zero] played '…'. Apply result: {…}` — the first action
     resolved through the engine.

That console output *is* the rules engine running inside Unity. From here the
game is UI over the same three calls: `NewGame → View → Apply(command)`, with
`Serialize/Deserialize` for save/load. See `docs/ENGINE-API.md` for the full
`view` model and command schema.

---

## The division of labor (don't cross it)

- **Engine bundle (TS)** owns every rule: odds, yields, RNG, win/loss. Unity
  never reimplements any of it. Update the game by rebuilding the bundle
  (`npm run build:engine`) and re-copying — no C# rule changes, because there
  are none.
- **ScriptableObjects + Unity** own presentation, art, input, audio, save
  files, and meta-progression (the Chronicle). A snapshot is opaque JSON you
  persist; you never read rules out of it.

[NuGetForUnity]: https://github.com/GlitchEnzo/NuGetForUnity
