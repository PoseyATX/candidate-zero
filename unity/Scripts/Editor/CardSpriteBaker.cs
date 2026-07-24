// Card faces are SCRIPT-DRIVEN (CardTileView.Bind). Do not bake per-card PNGs.
// This menu only strips mistaken art assignments from CardDefinitions.
#if UNITY_EDITOR
using System.IO;
using CandidateZero.Content;
using UnityEditor;
using UnityEngine;

namespace CandidateZero.Content.EditorTools
{
    public static class CardSpriteBaker
    {
        const string CardsDir = "Assets/CandidateZero/Resources/Cards";
        const string BakedDir = "Assets/CandidateZero/Resources/Art/Cards/Sprites";

        /// <summary>Batch: clear art fields (safe; cards render via CardTileView).</summary>
        public static void BakeBatch()
        {
            try
            {
                var n = ClearBakedCardArt(showDialog: false);
                Debug.Log($"[Candidate Zero] Cleared art on {n} cards (scripted faces only).");
                EditorApplication.Exit(0);
            }
            catch (System.Exception ex)
            {
                Debug.LogError("[Candidate Zero] Clear art failed: " + ex);
                EditorApplication.Exit(1);
            }
        }

        [MenuItem("Candidate Zero/Cards/Clear Baked Card Art (use scripted faces)")]
        public static void ClearMenu()
        {
            var n = ClearBakedCardArt(showDialog: true);
            EditorUtility.DisplayDialog(
                "Candidate Zero",
                $"Cleared CardDefinition.emblem on {n} cards.\n\n" +
                "Hand cards use CardTileView + pool + Bind(data).\n" +
                "Do not re-bake per-card PNGs.",
                "OK");
        }

        public static int ClearBakedCardArt(bool showDialog)
        {
            var guids = AssetDatabase.FindAssets("t:CardDefinition", new[] { CardsDir });
            int n = 0;
            foreach (var g in guids)
            {
                var path = AssetDatabase.GUIDToAssetPath(g);
                var card = AssetDatabase.LoadAssetAtPath<CardDefinition>(path);
                if (card == null || card.emblem == null) continue;
                card.emblem = null;
                EditorUtility.SetDirty(card);
                n++;
            }
            AssetDatabase.SaveAssets();
            return n;
        }
    }
}
#endif
