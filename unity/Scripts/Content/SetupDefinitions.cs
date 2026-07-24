// Presentation-only setup / world content (personas, issues, districts, regions, grounds).
// Rules stay in the TS engine — these power UI labels, filters, and future art hooks.
using System;
using UnityEngine;

namespace CandidateZero.Content
{
    [CreateAssetMenu(menuName = "Candidate Zero/Persona Definition", fileName = "Persona")]
    public class PersonaDefinition : ScriptableObject
    {
        public string id;
        public string displayName;
        [TextArea] public string tagline;
        [TextArea(2, 6)] public string description;
        public string[] attrKeys;
        public int[] attrValues;
    }

    [CreateAssetMenu(menuName = "Candidate Zero/Issue Definition", fileName = "Issue")]
    public class IssueDefinition : ScriptableObject
    {
        public string id;
        public string displayName;
        [TextArea] public string tagline;
        [TextArea(2, 6)] public string description;
    }

    [CreateAssetMenu(menuName = "Candidate Zero/District Definition", fileName = "District")]
    public class DistrictDefinition : ScriptableObject
    {
        public string id;
        public string displayName;
        [TextArea(2, 6)] public string description;
        public string align;
        public bool incumbent;
        public bool trap;
    }

    [CreateAssetMenu(menuName = "Candidate Zero/Region Definition", fileName = "Region")]
    public class RegionDefinition : ScriptableObject
    {
        public string id;
        public string displayName;
        [TextArea(2, 6)] public string description;
        [TextArea] public string hook;
    }

    [CreateAssetMenu(menuName = "Candidate Zero/Ground Definition", fileName = "Ground")]
    public class GroundDefinition : ScriptableObject
    {
        public string id;
        public string displayName;
        public int pool;
        public float prop;
        public string aff;
    }

    /// <summary>Imported card-kind labels from the content manifest.</summary>
    [Serializable]
    public struct CardKindLabel
    {
        public string id;
        public string label;
    }
}
