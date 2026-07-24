// Host persistence — opaque engine snapshot via PlayerPrefs.
// Never inspects rules inside the snapshot (ENGINE-API.md).
using UnityEngine;

namespace CandidateZero
{
    public static class CareerSave
    {
        public const string PrefsKey = "cz_engine_snapshot_v1";
        public const string SeedKey = "cz_last_seed_v1";

        public static bool HasSave => PlayerPrefs.HasKey(PrefsKey)
                                      && !string.IsNullOrEmpty(PlayerPrefs.GetString(PrefsKey, ""));

        public static void Write(string serializedSnapshot, int seed)
        {
            if (string.IsNullOrEmpty(serializedSnapshot)) return;
            PlayerPrefs.SetString(PrefsKey, serializedSnapshot);
            PlayerPrefs.SetInt(SeedKey, seed);
            PlayerPrefs.Save();
        }

        public static string Read()
        {
            return PlayerPrefs.GetString(PrefsKey, "");
        }

        public static int LastSeed => PlayerPrefs.GetInt(SeedKey, 42);

        public static void Clear()
        {
            PlayerPrefs.DeleteKey(PrefsKey);
            PlayerPrefs.Save();
        }
    }
}
