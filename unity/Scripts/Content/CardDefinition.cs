// Presentation/metadata form of a card in Unity. RULES stay in the TS engine.
using System;
using UnityEngine;

namespace CandidateZero.Content
{
    public enum CardKind { action, bargain, ally, item, location, liability, blackmail }

    [Serializable]
    public struct CardCost
    {
        public int ap;
        public int money;
        public int vol;
        public int momentum;
        public int favor;
    }

    [CreateAssetMenu(menuName = "Candidate Zero/Card Definition", fileName = "Card")]
    public class CardDefinition : ScriptableObject
    {
        [Tooltip("Engine card id (e.g. PL01).")]
        public string id;

        public string cardName;
        [TextArea] public string tagline;

        [Tooltip("Revealed on tap/inspect — NOT drawn on the card face.")]
        [TextArea(2, 6)] public string description;

        public string risk;      // SAFE / STD / VOL / CHOICE
        public CardKind kind;
        public bool trap;
        public bool field;
        public int[] phases;
        public CardCost cost;
        public string[] attrs;
        public string residency;
        public string control;
        public string[] entityScope;
        public string deck;

        [Header("Presentation")]
        [Tooltip("Optional small emblem only. Full card faces are CardTileView + Bind — never per-card PNGs.")]
        public Sprite emblem;

        public string CostLabel
        {
            get
            {
                var parts = new System.Collections.Generic.List<string>();
                if (cost.ap > 0) parts.Add($"{cost.ap} AP");
                if (cost.money > 0) parts.Add($"${cost.money}");
                if (cost.vol > 0) parts.Add($"{cost.vol} vol");
                if (cost.momentum > 0) parts.Add($"{cost.momentum} mom");
                if (cost.favor > 0) parts.Add($"{cost.favor} fav");
                return parts.Count == 0 ? "—" : string.Join(" · ", parts);
            }
        }

        public Color KindTint
        {
            get
            {
                return kind switch
                {
                    CardKind.bargain => new Color(0.55f, 0.22f, 0.18f),
                    CardKind.ally => new Color(0.25f, 0.40f, 0.32f),
                    CardKind.item => new Color(0.40f, 0.35f, 0.20f),
                    CardKind.location => new Color(0.28f, 0.32f, 0.42f),
                    CardKind.liability => new Color(0.35f, 0.18f, 0.28f),
                    CardKind.blackmail => new Color(0.22f, 0.18f, 0.28f),
                    _ => new Color(0.42f, 0.34f, 0.24f) // action parchment frame
                };
            }
        }

        public Color RiskEdge
        {
            get
            {
                if (string.IsNullOrEmpty(risk)) return new Color(0.5f, 0.5f, 0.5f);
                return risk.ToUpperInvariant() switch
                {
                    "SAFE" => new Color(0.35f, 0.62f, 0.42f),
                    "STD" => new Color(0.78f, 0.68f, 0.30f),
                    "VOL" => new Color(0.82f, 0.40f, 0.22f),
                    "CHOICE" => new Color(0.45f, 0.55f, 0.75f),
                    _ => new Color(0.55f, 0.50f, 0.45f)
                };
            }
        }
    }
}
