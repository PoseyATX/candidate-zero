// Candidate Zero — Card ScriptableObject
// -------------------------------------------------------------------------
// The presentation/metadata form of a card in Unity. The RULES (odds, run,
// show/req) are NOT here — they live in the TypeScript engine bundle
// (see EngineBridge + docs/ENGINE-API.md). This asset is what artists and
// designers touch in the editor: name, art, tint family, cost display.
//
// The DESCRIPTION is a data field a host reveals on tap/inspect — it is NOT
// drawn on the card face. The card face is name + art + cost + kind tint.
//
// Generated/updated from unity/content/candidate-zero-content.json by
// Editor/ContentImporter.cs (menu: Candidate Zero > Import Content).
// -------------------------------------------------------------------------
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
        [Tooltip("Engine card id (e.g. PL01). Matches the id the engine bundle uses.")]
        public string id;

        public string cardName;
        [TextArea] public string tagline;

        [Tooltip("Revealed on tap/inspect — NOT drawn on the card face.")]
        [TextArea(2, 6)] public string description;

        public string risk;      // SAFE / STD / VOL / CHOICE
        public CardKind kind;    // drives the family tint
        public bool trap;        // engine/balance flag; no player-facing label
        public bool field;       // needs a ground chosen when played
        public int[] phases;
        public CardCost cost;
        public string[] attrs;   // CLO/CON/CRA/INK/DIP/CHA
        public string residency; // main / special / outside
        public string control;   // player / world
        public string[] entityScope;
        public string deck;      // main / session / waiting

        [Header("Presentation (assigned in editor)")]
        [Tooltip("Card art, assigned per card. Keyed by id at import time.")]
        public Sprite art;
    }
}
