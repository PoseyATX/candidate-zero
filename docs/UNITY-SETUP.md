# Unity setup — get the engine running in your open editor

Two independent tracks. Track A (cards as ScriptableObjects) needs no
decisions. Track B (the actual game logic) runs the engine bundle in **Jint**.
Everything you copy lives in this repo's `unity/` folder.

Suggested Unity layout: `Assets/CandidateZero/`.

## Ready-made host project (recommended)

A clean Track B host already exists on this machine:

| | |
|--|--|
| Path | `C:\Users\matth\candidate-zero-host` |
| Unity | 6000.3.3f1 |
| Jint | pre-vendored in `Assets/Plugins/Jint/` |
| Smoke | Menu **Candidate Zero → Run Engine Smoke (Jint)** or press **Play** |

Do **not** use `candidate-zero-unity` as the rules host — that project has a
separate C# rules experiment. Art only from there.

Verified (2026-07-24): batch `executeMethod` smoke → `newGame` → `view` →
`endWeek` green; seed 42 advances week 1→2 via pure TS engine.

### What you should see

| Action | What appears |
|--------|----------------|
| **Candidate Zero → Run Engine Smoke (Jint)** | Editor **results window** with JSON (Game view stays empty — by design) |
| **Play** or **Open Play Mode Card Table** | **9:16 mobile board**: hand cards, inspect, ground pick, phase draft, Outside weather, END WEEK thumb zone |

**Aspect:** design is portrait 9:16. Landscape letterboxes a phone column. In Game view, pick a 9:16 size for honest phone preview.

**Unity on-site practices:** see [`UNITY-MOBILE-BEST-PRACTICES.md`](./UNITY-MOBILE-BEST-PRACTICES.md) (Canvas Scaler multi-res, `Screen.safeArea`, card pooling, `targetFrameRate`, links to docs.unity3d.com / unity.com e-book / learn.unity.com).

Card definitions load from `Resources/Cards` (after **Import Content**) or bootstrap
from `Resources/content/…json` so Play works without an import step.

Host API extras for Unity: `pendingOutside` + command `dismissOutside` (see ENGINE-API.md).

### Play flow in the host project

1. **Setup wizard** — `setupOptions()` → pick persona / issue / district / region  
2. **BEGIN** — `newGame({ seed, setup })`  
3. **Continue career** — `deserialize(PlayerPrefs save)` when a snapshot exists  
4. **Autosave** — `serialize(snapshot)` after each successful `apply`  
5. Table: hand, inspect, grounds, phase draft, Outside weather, END WEEK / MENU

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
