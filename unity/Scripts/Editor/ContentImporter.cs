// Candidate Zero — Content importer (Editor)
// -------------------------------------------------------------------------
// Reads unity/content/candidate-zero-content.json (exported from the TS
// project by `npm run export:content`) and generates/updates one
// CardDefinition ScriptableObject per card. Idempotent: re-run after every
// content export; existing assets (and their assigned art) are updated in
// place, new cards are created, nothing is orphaned silently.
//
// Requires the Newtonsoft JSON package: add "com.unity.nuget.newtonsoft-json"
// via Package Manager (it ships with most Unity versions).
//
// NOTE: unverified in this repo (no Unity toolchain here) — this is the
// reference importer to drop into the Unity project and run.
// -------------------------------------------------------------------------
#if UNITY_EDITOR
using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;
using UnityEditor;
using UnityEngine;

namespace CandidateZero.Content.EditorTools
{
    public static class ContentImporter
    {
        // Place the exported json here in the Unity project.
        const string ContentPath = "Assets/CandidateZero/content/candidate-zero-content.json";
        const string CardsDir = "Assets/CandidateZero/Cards";

        [MenuItem("Candidate Zero/Import Content")]
        public static void Import()
        {
            if (!File.Exists(ContentPath))
            {
                Debug.LogError($"Candidate Zero: content json not found at {ContentPath}. " +
                               "Run `npm run export:content` in the TS project and copy it here.");
                return;
            }

            var manifest = JsonConvert.DeserializeObject<Manifest>(File.ReadAllText(ContentPath));
            Directory.CreateDirectory(CardsDir);

            int created = 0, updated = 0;
            foreach (var c in manifest.cards)
            {
                var path = $"{CardsDir}/{c.id}.asset";
                var so = AssetDatabase.LoadAssetAtPath<CardDefinition>(path);
                if (so == null)
                {
                    so = ScriptableObject.CreateInstance<CardDefinition>();
                    AssetDatabase.CreateAsset(so, path);
                    created++;
                }
                else updated++;

                so.id = c.id;
                so.cardName = c.name;
                so.tagline = c.tagline;
                so.description = c.description;
                so.risk = c.risk;
                so.kind = System.Enum.TryParse(c.kind, out CardKind k) ? k : CardKind.action;
                so.trap = c.trap;
                so.field = c.field;
                so.phases = c.phases;
                so.cost = c.cost;
                so.attrs = c.attrs;
                so.residency = c.residency;
                so.control = c.control;
                so.entityScope = c.entityScope;
                so.deck = c.deck;
                EditorUtility.SetDirty(so);
            }

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log($"Candidate Zero: imported content v{manifest.version} — " +
                      $"{created} new, {updated} updated cards ({manifest.cards.Count} total).");
        }

        // Mirrors the exported JSON shape (see src/data/manifest.ts).
        class Manifest { public string version; public List<Card> cards; }

        class Card
        {
            public string id, name, tagline, description, risk, kind, residency, control, deck;
            public bool trap, field;
            public int[] phases;
            public CardCost cost;
            public string[] attrs, entityScope;
        }
    }
}
#endif
