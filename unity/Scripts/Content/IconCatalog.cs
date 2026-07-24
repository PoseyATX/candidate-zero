// Shared icon sprites from Resources/Art/Icons (Clean Vector pack).
// Maps engine card ids / kinds → existing icons. No per-card baking.
using System.Collections.Generic;
using UnityEngine;

namespace CandidateZero.Content
{
    public static class IconCatalog
    {
        static readonly Dictionary<string, Sprite> ByName = new Dictionary<string, Sprite>();
        static readonly Dictionary<string, string> CardToIcon = new Dictionary<string, string>
        {
            // Matches TS card-art emblem keys → available vector icons
            { "PL01", "tent" },       // block walk / boots → field tent
            { "PL02", "message" },    // phone bank
            { "PL03", "flag" },       // yard signs
            { "PL04", "scroll" },     // petition
            { "PL05", "coin" },       // filing fee
            { "PL06", "column" },     // podium / speak
            { "PL07", "list" },       // debate / agenda
            { "PL08", "medal" },      // fundraiser cup-ish
            { "PL09", "megaphone" },  // mic / rally
            { "PL10", "book" },       // news / press
            { "PL11", "coinbag" },    // jar / money
            { "PL12", "column" },
            { "PL13", "eye" },
            { "PL14", "coins" },
            { "PL15", "letter" },
            { "PL16", "star" },
            { "PL17", "list" },
            { "PL18", "scroll_open" },
            { "PL19", "megaphone" },
            { "PL20", "coinbag" },
            { "PL21", "coinbag" },
            { "PL22", "letter_open" },
            { "PL21B", "flag" },
            { "PL39", "list" },
        };

        static bool _loaded;

        public static void Ensure()
        {
            if (_loaded) return;
            _loaded = true;
            var all = Resources.LoadAll<Sprite>("Art/Icons");
            if (all != null)
            {
                foreach (var s in all)
                {
                    if (s == null) continue;
                    ByName[s.name] = s;
                }
            }
            // Texture2D fallback if not imported as Sprite yet
            var texs = Resources.LoadAll<Texture2D>("Art/Icons");
            if (texs != null)
            {
                foreach (var t in texs)
                {
                    if (t == null || ByName.ContainsKey(t.name)) continue;
                    t.filterMode = FilterMode.Bilinear;
                    ByName[t.name] = Sprite.Create(
                        t, new Rect(0, 0, t.width, t.height),
                        new Vector2(0.5f, 0.5f), 100f);
                }
            }
            Debug.Log($"[IconCatalog] loaded {ByName.Count} icons from Resources/Art/Icons");
        }

        public static Sprite GetForCard(string cardId, string kind = null)
        {
            Ensure();
            Sprite sp;
            if (!string.IsNullOrEmpty(cardId))
            {
                if (CardToIcon.TryGetValue(cardId, out var mapped) && TryGet(mapped, out sp))
                    return sp;

                if (cardId.StartsWith("SS") && TryGet("hammer", out sp)) return sp;
                if (cardId.StartsWith("WA") && TryGet("clock", out sp)) return sp;
                if (cardId.StartsWith("MV") && TryGet("gear", out sp)) return sp;
                if (cardId.StartsWith("SIG") && TryGet("key", out sp)) return sp;
                if ((cardId.StartsWith("BUY") || cardId.StartsWith("A0")) && TryGet("coin", out sp)) return sp;
                if (cardId.StartsWith("RW") && TryGet("crown", out sp)) return sp;
            }

            if (!string.IsNullOrEmpty(kind))
            {
                switch (kind.ToLowerInvariant())
                {
                    case "bargain": if (TryGet("coinbag", out sp)) return sp; break;
                    case "ally": if (TryGet("silhouette", out sp)) return sp; break;
                    case "item": if (TryGet("diamond", out sp)) return sp; break;
                    case "location": if (TryGet("home", out sp)) return sp; break;
                    case "liability": if (TryGet("question", out sp)) return sp; break;
                    case "blackmail": if (TryGet("letter", out sp)) return sp; break;
                }
            }

            return TryGet("star", out sp) ? sp : null;
        }

        public static bool TryGet(string name, out Sprite sp) =>
            ByName.TryGetValue(name ?? "", out sp) && sp != null;
    }
}
