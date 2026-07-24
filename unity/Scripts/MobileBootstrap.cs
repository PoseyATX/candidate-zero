// Mobile runtime defaults from Unity mobile optimization guidance:
// - Cap frame rate (avoid burning battery at uncapped 1000+ FPS in Editor/player)
// - Keep screen awake during play
// - vSync off on mobile when using targetFrameRate
// See: Practical guide to optimization for mobiles (docs.unity3d.com)
//      Optimize your mobile game performance (unity.com/blog, e-book)
using UnityEngine;

namespace CandidateZero
{
    public static class MobileBootstrap
    {
        public const int TargetFps = 60;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        private static void Apply()
        {
            Application.targetFrameRate = TargetFps;
            // On mobile, vSync often fights targetFrameRate; Unity mobile tips
            // prefer explicit FPS cap for consistent power/thermal behavior.
            QualitySettings.vSyncCount = 0;
            // Never half-res textures — UI sprites look blurry if master limit > 0.
            QualitySettings.globalTextureMipmapLimit = 0;

            Screen.sleepTimeout = SleepTimeout.NeverSleep;

            // Multi-touch for swipeable hand + buttons
            Input.multiTouchEnabled = true;

#if UNITY_ANDROID || UNITY_IOS
            // Prefer not to run in background on phones
            Application.runInBackground = false;
#else
            Application.runInBackground = true;
#endif

            Debug.Log($"[Candidate Zero] MobileBootstrap: targetFrameRate={TargetFps}, vSync=0, safeArea-ready");
        }
    }
}
