// Menu: Candidate Zero → Import Content / Sync Content From TS Repo
// Full presentation manifest → ScriptableObjects under Resources (runtime-loadable).
// Rules stay in the TS engine bundle.
#if UNITY_EDITOR
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Linq;
using Newtonsoft.Json;
using UnityEditor;
using UnityEngine;
using CandidateZero.Content;

// Transport shapes are GENERATED from the TypeScript manifest types
// (scripts/gen-unity-models.ts -> Engine/Generated/ContentModels.g.cs).
// These aliases keep the local vocabulary while deleting the hand-typed
// duplicates that used to live at the bottom of this file.
using Manifest = CandidateZero.HostData.ContentManifest;
using CardDto = CandidateZero.HostData.CardEntry;
using PersonaDto = CandidateZero.HostData.PersonaEntry;
using NamedDto = CandidateZero.HostData.IssueEntry;
using DistrictDto = CandidateZero.HostData.DistrictEntry;
using RegionDto = CandidateZero.HostData.RegionEntry;
using GroundDto = CandidateZero.HostData.GroundEntry;

namespace CandidateZero.Content.EditorTools
{
    public static class ContentImporter
    {
        const string ContentPath = "Assets/CandidateZero/content/candidate-zero-content.json";
        const string ResourcesBootstrap = "Assets/CandidateZero/Resources/content/candidate-zero-content.json.txt";
        const string CardsDir = "Assets/CandidateZero/Resources/Cards";
        const string PersonasDir = "Assets/CandidateZero/Resources/Setup/Personas";
        const string IssuesDir = "Assets/CandidateZero/Resources/Setup/Issues";
        const string DistrictsDir = "Assets/CandidateZero/Resources/Setup/Districts";
        const string RegionsDir = "Assets/CandidateZero/Resources/Setup/Regions";
        const string GroundsDir = "Assets/CandidateZero/Resources/Setup/Grounds";

        /// <summary>Batchmode entry: -executeMethod CandidateZero.Content.EditorTools.ContentImporter.ImportBatch</summary>
        public static void ImportBatch()
        {
            try
            {
                SyncContentFromTsInternal(showDialogs: false);
                ImportInternal(showDialogs: false);
                Debug.Log("[Candidate Zero] ImportBatch complete.");
                EditorApplication.Exit(0);
            }
            catch (System.Exception ex)
            {
                Debug.LogError("[Candidate Zero] ImportBatch failed: " + ex);
                EditorApplication.Exit(1);
            }
        }

        [MenuItem("Candidate Zero/Import Content")]
        public static void Import() => ImportInternal(showDialogs: !Application.isBatchMode);

        [MenuItem("Candidate Zero/Sync Content From TS Repo")]
        public static void SyncContentFromTs() => SyncContentFromTsInternal(showDialogs: !Application.isBatchMode);

        static void SyncContentFromTsInternal(bool showDialogs)
        {
            var hostRoot = Path.GetFullPath(Path.Combine(Application.dataPath, ".."));
            var src = Path.GetFullPath(Path.Combine(hostRoot, "..", "candidate-zero", "unity", "content",
                "candidate-zero-content.json"));
            if (!File.Exists(src))
            {
                // Alternate: candidate-zero-host beside candidate-zero-ts etc.
                var alt = Path.GetFullPath(Path.Combine(hostRoot, "..", "candidate-zero-ts", "unity", "content",
                    "candidate-zero-content.json"));
                if (File.Exists(alt)) src = alt;
            }

            if (!File.Exists(src))
            {
                var msg = "Missing TS export:\n" + src + "\n\nRun in TS repo: npm run export:content";
                Debug.LogError(msg);
                if (showDialogs) EditorUtility.DisplayDialog("Candidate Zero", msg, "OK");
                if (Application.isBatchMode) EditorApplication.Exit(2);
                return;
            }

            var destDir = Path.Combine(Application.dataPath, "CandidateZero", "content");
            Directory.CreateDirectory(destDir);
            var dest = Path.Combine(destDir, "candidate-zero-content.json");
            File.Copy(src, dest, true);

            // Runtime bootstrap (TextAsset; .json.txt so Unity always imports as text)
            var resDir = Path.Combine(Application.dataPath, "CandidateZero", "Resources", "content");
            Directory.CreateDirectory(resDir);
            var resDest = Path.Combine(resDir, "candidate-zero-content.json.txt");
            File.Copy(src, resDest, true);

            AssetDatabase.Refresh();
            Debug.Log($"[Candidate Zero] Content JSON synced from:\n  {src}\n→ {dest}\n→ {resDest}");

            ImportInternal(showDialogs);
        }

        static void ImportInternal(bool showDialogs)
        {
            if (!File.Exists(ContentPath))
            {
                var msg = $"Content json not found at {ContentPath}.\n" +
                          "Run: Candidate Zero → Sync Content From TS Repo\n" +
                          "(or npm run export:content in the TS repo, then sync).";
                Debug.LogError(msg);
                if (showDialogs) EditorUtility.DisplayDialog("Candidate Zero", msg, "OK");
                if (Application.isBatchMode) EditorApplication.Exit(2);
                return;
            }

            var text = File.ReadAllText(ContentPath);
            var manifest = JsonConvert.DeserializeObject<Manifest>(text);
            if (manifest?.cards == null)
            {
                Debug.LogError("Candidate Zero: content json has no cards array.");
                if (Application.isBatchMode) EditorApplication.Exit(3);
                return;
            }

            // Keep Resources bootstrap in lockstep with editor content path
            try
            {
                var resDir = Path.GetDirectoryName(Path.GetFullPath(ResourcesBootstrap));
                Directory.CreateDirectory(resDir);
                File.Copy(Path.GetFullPath(ContentPath), Path.GetFullPath(ResourcesBootstrap), true);
            }
            catch (System.Exception ex)
            {
                Debug.LogWarning("[Candidate Zero] Resources bootstrap copy: " + ex.Message);
            }

            Directory.CreateDirectory(CardsDir);
            Directory.CreateDirectory(PersonasDir);
            Directory.CreateDirectory(IssuesDir);
            Directory.CreateDirectory(DistrictsDir);
            Directory.CreateDirectory(RegionsDir);
            Directory.CreateDirectory(GroundsDir);

            int cardsNew = 0, cardsUp = 0;
            var deckCounts = new Dictionary<string, int>();

            foreach (var c in manifest.cards)
            {
                if (string.IsNullOrEmpty(c.id)) continue;
                var safeId = Sanitize(c.id);
                var path = $"{CardsDir}/{safeId}.asset";
                var so = AssetDatabase.LoadAssetAtPath<CardDefinition>(path);
                if (so == null)
                {
                    so = ScriptableObject.CreateInstance<CardDefinition>();
                    AssetDatabase.CreateAsset(so, path);
                    cardsNew++;
                }
                else cardsUp++;

                var emblem = so.emblem;
                so.id = c.id;
                so.cardName = c.name ?? c.id;
                so.tagline = c.tagline ?? "";
                so.description = c.description ?? "";
                so.risk = c.risk ?? "STD";
                so.kind = System.Enum.TryParse(c.kind, true, out CardKind k) ? k : CardKind.action;
                so.trap = c.trap;
                so.field = c.field;
                so.phases = c.phases?.ToArray() ?? System.Array.Empty<int>();
                so.cost = new CardCost
                {
                    ap = c.cost?.ap ?? 0,
                    money = c.cost?.money ?? 0,
                    vol = c.cost?.vol ?? 0,
                    momentum = c.cost?.momentum ?? 0,
                    favor = c.cost?.favor ?? 0
                };
                so.attrs = c.attrs?.ToArray() ?? System.Array.Empty<string>();
                so.residency = c.residency ?? "main";
                so.control = c.control ?? "player";
                so.entityScope = c.entityScope?.ToArray() ?? System.Array.Empty<string>();
                so.deck = c.deck ?? "main";
                so.emblem = emblem;
                EditorUtility.SetDirty(so);

                var deck = so.deck ?? "main";
                deckCounts[deck] = deckCounts.TryGetValue(deck, out var n) ? n + 1 : 1;
            }

            int pN = UpsertPersonas(manifest.personas);
            int iN = UpsertIssues(manifest.issues);
            int dN = UpsertDistricts(manifest.districts);
            int rN = UpsertRegions(manifest.regions);
            int gN = UpsertGrounds(manifest.grounds);

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            var sb = new StringBuilder();
            sb.AppendLine($"Imported content v{manifest.version ?? "?"}");
            sb.AppendLine($"Cards: {cardsNew} new · {cardsUp} updated · {manifest.cards.Count} total");
            foreach (var kv in deckCounts)
                sb.AppendLine($"  deck/{kv.Key}: {kv.Value}");
            sb.AppendLine($"Personas: {pN}  Issues: {iN}  Districts: {dN}  Regions: {rN}  Grounds: {gN}");
            sb.AppendLine($"→ {CardsDir}");
            sb.AppendLine("Faces: CardTileView.Bind (scripted). emblem optional; no per-card PNGs.");

            Debug.Log("[Candidate Zero] " + sb.ToString().Replace("\n", " | "));
            if (showDialogs)
                EditorUtility.DisplayDialog("Candidate Zero — Import Content", sb.ToString(), "OK");
        }

        static int UpsertPersonas(List<PersonaDto> list)
        {
            if (list == null) return 0;
            int n = 0;
            foreach (var p in list)
            {
                if (string.IsNullOrEmpty(p.id)) continue;
                var path = $"{PersonasDir}/{Sanitize(p.id)}.asset";
                var so = AssetDatabase.LoadAssetAtPath<PersonaDefinition>(path);
                if (so == null)
                {
                    so = ScriptableObject.CreateInstance<PersonaDefinition>();
                    AssetDatabase.CreateAsset(so, path);
                }
                so.id = p.id;
                so.displayName = p.name ?? p.id;
                so.tagline = p.tagline ?? "";
                so.description = p.description ?? "";
                if (p.attrs != null && p.attrs.Count > 0)
                {
                    so.attrKeys = new string[p.attrs.Count];
                    so.attrValues = new int[p.attrs.Count];
                    int i = 0;
                    foreach (var kv in p.attrs)
                    {
                        so.attrKeys[i] = kv.Key;
                        so.attrValues[i] = kv.Value;
                        i++;
                    }
                }
                else
                {
                    so.attrKeys = System.Array.Empty<string>();
                    so.attrValues = System.Array.Empty<int>();
                }
                EditorUtility.SetDirty(so);
                n++;
            }
            return n;
        }

        static int UpsertIssues(List<NamedDto> list)
        {
            if (list == null) return 0;
            int n = 0;
            foreach (var p in list)
            {
                if (string.IsNullOrEmpty(p.id)) continue;
                var path = $"{IssuesDir}/{Sanitize(p.id)}.asset";
                var so = AssetDatabase.LoadAssetAtPath<IssueDefinition>(path);
                if (so == null)
                {
                    so = ScriptableObject.CreateInstance<IssueDefinition>();
                    AssetDatabase.CreateAsset(so, path);
                }
                so.id = p.id;
                so.displayName = p.name ?? p.id;
                so.tagline = p.tagline ?? "";
                so.description = p.description ?? "";
                EditorUtility.SetDirty(so);
                n++;
            }
            return n;
        }

        static int UpsertDistricts(List<DistrictDto> list)
        {
            if (list == null) return 0;
            int n = 0;
            foreach (var p in list)
            {
                if (string.IsNullOrEmpty(p.id)) continue;
                var path = $"{DistrictsDir}/{Sanitize(p.id)}.asset";
                var so = AssetDatabase.LoadAssetAtPath<DistrictDefinition>(path);
                if (so == null)
                {
                    so = ScriptableObject.CreateInstance<DistrictDefinition>();
                    AssetDatabase.CreateAsset(so, path);
                }
                so.id = p.id;
                so.displayName = p.name ?? p.id;
                so.description = p.description ?? "";
                so.align = p.align ?? "";
                so.incumbent = p.incumbent;
                so.trap = p.trap;
                EditorUtility.SetDirty(so);
                n++;
            }
            return n;
        }

        static int UpsertRegions(List<RegionDto> list)
        {
            if (list == null) return 0;
            int n = 0;
            foreach (var p in list)
            {
                if (string.IsNullOrEmpty(p.id)) continue;
                var path = $"{RegionsDir}/{Sanitize(p.id)}.asset";
                var so = AssetDatabase.LoadAssetAtPath<RegionDefinition>(path);
                if (so == null)
                {
                    so = ScriptableObject.CreateInstance<RegionDefinition>();
                    AssetDatabase.CreateAsset(so, path);
                }
                so.id = p.id;
                so.displayName = p.name ?? p.id;
                so.description = p.description ?? "";
                so.hook = p.hook ?? "";
                EditorUtility.SetDirty(so);
                n++;
            }
            return n;
        }

        static int UpsertGrounds(List<GroundDto> list)
        {
            if (list == null) return 0;
            int n = 0;
            foreach (var p in list)
            {
                if (string.IsNullOrEmpty(p.id)) continue;
                var path = $"{GroundsDir}/{Sanitize(p.id)}.asset";
                var so = AssetDatabase.LoadAssetAtPath<GroundDefinition>(path);
                if (so == null)
                {
                    so = ScriptableObject.CreateInstance<GroundDefinition>();
                    AssetDatabase.CreateAsset(so, path);
                }
                so.id = p.id;
                so.displayName = p.name ?? p.id;
                so.pool = p.pool;
                so.prop = p.prop;
                so.aff = p.aff ?? "";
                EditorUtility.SetDirty(so);
                n++;
            }
            return n;
        }

        static string Sanitize(string id) =>
            id.Replace('/', '_').Replace('\\', '_').Replace(':', '_');

        // NOTE: the Manifest/CardDto/PersonaDto/NamedDto/DistrictDto/RegionDto/
        // GroundDto classes that used to live here were hand-typed mirrors of
        // src/data/manifest.ts. They are now generated — see the using-aliases
        // at the top of this file. Add fields in TypeScript, run
        // `npm run gen:unity`, and they appear here automatically.
    }
}
#endif
