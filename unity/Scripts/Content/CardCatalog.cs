// Runtime lookup of CardDefinition by engine card id.
// Prefers Resources/Cards/*.asset (imported SOs); falls back to
// Resources/content/candidate-zero-content.json(.txt) bootstrap.
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;
using UnityEngine;

// Transport shapes are GENERATED from src/data/manifest.ts
// (scripts/gen-unity-models.ts -> Engine/Generated/ContentModels.g.cs).
using Manifest = CandidateZero.HostData.ContentManifest;

namespace CandidateZero.Content
{
    public sealed class CardCatalog
    {
        private static CardCatalog _instance;
        private readonly Dictionary<string, CardDefinition> _byId =
            new Dictionary<string, CardDefinition>();

        public static CardCatalog Instance => _instance ??= Load();

        public int Count => _byId.Count;

        public IEnumerable<CardDefinition> All => _byId.Values;

        public static void Reload() => _instance = Load();

        public static CardCatalog Load()
        {
            var cat = new CardCatalog();

            var assets = Resources.LoadAll<CardDefinition>("Cards");
            if (assets != null)
            {
                foreach (var c in assets)
                {
                    if (c == null || string.IsNullOrEmpty(c.id)) continue;
                    cat._byId[c.id] = c;
                }
            }

            // If SOs missing or incomplete, fill gaps from JSON bootstrap
            if (cat._byId.Count == 0)
                cat.BootstrapFromJson(replaceAll: true);
            else
                cat.BootstrapFromJson(replaceAll: false);

            var decks = new Dictionary<string, int>();
            foreach (var c in cat._byId.Values)
            {
                var d = string.IsNullOrEmpty(c.deck) ? "main" : c.deck;
                decks[d] = decks.TryGetValue(d, out var n) ? n + 1 : 1;
            }
            var deckParts = new List<string>();
            foreach (var kv in decks)
                deckParts.Add($"{kv.Key}={kv.Value}");
            var deckSummary = deckParts.Count == 0 ? "none" : string.Join(", ", deckParts);

            Debug.Log(
                $"[Candidate Zero] CardCatalog: {cat._byId.Count} definitions " +
                $"({(assets != null && assets.Length > 0 ? "SO+" : "")}JSON) · {deckSummary}");
            return cat;
        }

        private void BootstrapFromJson(bool replaceAll)
        {
            var ta = Resources.Load<TextAsset>("content/candidate-zero-content.json");
            if (ta == null)
                ta = Resources.Load<TextAsset>("content/candidate-zero-content");
            if (ta == null)
            {
                if (replaceAll)
                    Debug.LogWarning("[Candidate Zero] No Cards assets and no content JSON in Resources.");
                return;
            }

            Manifest manifest;
            try
            {
                manifest = JsonConvert.DeserializeObject<Manifest>(ta.text);
            }
            catch (System.Exception ex)
            {
                Debug.LogError("[Candidate Zero] Content JSON parse failed: " + ex.Message);
                return;
            }

            if (manifest?.cards == null) return;

            int added = 0;
            foreach (var c in manifest.cards)
            {
                if (string.IsNullOrEmpty(c.id)) continue;
                if (!replaceAll && _byId.ContainsKey(c.id)) continue;

                var so = ScriptableObject.CreateInstance<CardDefinition>();
                so.hideFlags = HideFlags.HideAndDontSave;
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
                _byId[c.id] = so;
                added++;
            }

            if (added > 0)
                Debug.Log($"[Candidate Zero] CardCatalog JSON filled {added} card(s).");
        }

        public CardDefinition Get(string id)
        {
            if (string.IsNullOrEmpty(id)) return null;
            return _byId.TryGetValue(id, out var c) ? c : null;
        }

        public bool TryGet(string id, out CardDefinition def) =>
            _byId.TryGetValue(id ?? "", out def);

        // NOTE: the private Manifest/CardDto classes that used to live here were
        // a second hand-typed mirror of src/data/manifest.ts (ContentImporter
        // held a third). Both are now generated — see the using-alias above.
    }

    /// <summary>Runtime lookup for imported setup / grounds ScriptableObjects.</summary>
    public sealed class SetupCatalog
    {
        private static SetupCatalog _instance;
        public static SetupCatalog Instance => _instance ??= Load();

        public readonly Dictionary<string, PersonaDefinition> Personas = new();
        public readonly Dictionary<string, IssueDefinition> Issues = new();
        public readonly Dictionary<string, DistrictDefinition> Districts = new();
        public readonly Dictionary<string, RegionDefinition> Regions = new();
        public readonly Dictionary<string, GroundDefinition> Grounds = new();

        public static void Reload() => _instance = Load();

        public static SetupCatalog Load()
        {
            var cat = new SetupCatalog();
            foreach (var p in Resources.LoadAll<PersonaDefinition>("Setup/Personas"))
                if (p != null && !string.IsNullOrEmpty(p.id)) cat.Personas[p.id] = p;
            foreach (var p in Resources.LoadAll<IssueDefinition>("Setup/Issues"))
                if (p != null && !string.IsNullOrEmpty(p.id)) cat.Issues[p.id] = p;
            foreach (var p in Resources.LoadAll<DistrictDefinition>("Setup/Districts"))
                if (p != null && !string.IsNullOrEmpty(p.id)) cat.Districts[p.id] = p;
            foreach (var p in Resources.LoadAll<RegionDefinition>("Setup/Regions"))
                if (p != null && !string.IsNullOrEmpty(p.id)) cat.Regions[p.id] = p;
            foreach (var p in Resources.LoadAll<GroundDefinition>("Setup/Grounds"))
                if (p != null && !string.IsNullOrEmpty(p.id)) cat.Grounds[p.id] = p;

            Debug.Log(
                $"[Candidate Zero] SetupCatalog: personas={cat.Personas.Count} issues={cat.Issues.Count} " +
                $"districts={cat.Districts.Count} regions={cat.Regions.Count} grounds={cat.Grounds.Count}");
            return cat;
        }
    }
}
