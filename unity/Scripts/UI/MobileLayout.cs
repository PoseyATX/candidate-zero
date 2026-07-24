// Mobile layout helpers aligned with Unity uGUI multi-resolution guidance:
// https://docs.unity3d.com/Packages/com.unity.ugui@1.0/manual/HOWTO-UIMultiResolution.html
// Safe area: https://docs.unity3d.com/ScriptReference/Screen-safeArea.html
using UnityEngine;
using UnityEngine.UI;

namespace CandidateZero.UI
{
    public static class MobileLayout
    {
        // Portrait phone HD-class reference (9:16). Official how-to uses
        // Phone HD portrait as the design resolution for Scale With Screen Size.
        public const float RefWidth = 1080f;
        public const float RefHeight = 1920f;
        public const float PhoneAspect = 9f / 16f;

        /// <summary>
        /// Scale With Screen Size + Match biased to height for portrait-first.
        /// See Canvas Scaler "Match" in uGUI multi-resolution how-to: landscape
        /// width-only match overscales; height bias keeps type readable on phones.
        /// </summary>
        public static void ConfigureScaler(CanvasScaler scaler)
        {
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(RefWidth, RefHeight);
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            // 0 = width, 1 = height. Portrait product → favor height (Unity docs).
            scaler.matchWidthOrHeight = 0.75f;
            scaler.referencePixelsPerUnit = 100f;
            // World-space only, but keep explicit: never drop UI pixel density.
            scaler.dynamicPixelsPerUnit = 1f;
        }

        /// <summary>
        /// Screen Space Overlay canvas defaults for crisp text/icons.
        /// pixelPerfect snaps rects to whole pixels (cuts sub-pixel mush).
        /// </summary>
        public static void ConfigureCanvas(Canvas canvas)
        {
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.pixelPerfect = true;
            canvas.additionalShaderChannels =
                AdditionalCanvasShaderChannels.TexCoord1
                | AdditionalCanvasShaderChannels.Normal
                | AdditionalCanvasShaderChannels.Tangent;
        }

        /// <summary>
        /// Full-bleed backdrop + SafeRoot that:
        /// 1) respects Screen.safeArea (notches / home indicator),
        /// 2) letterboxes to a 9:16 column on wide desktops.
        /// Overlay canvas children must live under SafeRoot, not the canvas root
        /// (Screen Space Overlay canvases stay at hierarchy top — Unity Canvas note).
        /// </summary>
        public static RectTransform CreateSafeRoot(Transform canvasRoot)
        {
            var backdrop = new GameObject("Backdrop", typeof(RectTransform), typeof(Image));
            var brt = backdrop.GetComponent<RectTransform>();
            brt.SetParent(canvasRoot, false);
            Stretch(brt);
            backdrop.GetComponent<Image>().color = new Color(0.05f, 0.04f, 0.03f, 1f);
            backdrop.GetComponent<Image>().raycastTarget = false;

            var safe = new GameObject("SafeRoot", typeof(RectTransform));
            var rt = safe.GetComponent<RectTransform>();
            rt.SetParent(canvasRoot, false);
            Stretch(rt);

            var driver = safe.AddComponent<SafeAreaDriver>();
            driver.target = rt;
            return rt;
        }

        public static void Stretch(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.localScale = Vector3.one;
        }
    }

    /// <summary>
    /// Applies Screen.safeArea in canvas-local space, then optional 9:16 letterbox.
    /// Unity: safeArea origin is bottom-left of the player window.
    /// </summary>
    public sealed class SafeAreaDriver : MonoBehaviour
    {
        public RectTransform target;
        private Rect _lastSafe;
        private int _lastW, _lastH;

        private void OnEnable() => Apply();
        private void Update()
        {
            if (Screen.width != _lastW || Screen.height != _lastH || Screen.safeArea != _lastSafe)
                Apply();
        }

        public void Apply()
        {
            if (target == null) return;
            _lastW = Screen.width;
            _lastH = Screen.height;
            _lastSafe = Screen.safeArea;

            // Convert pixel safeArea → normalized anchors (uGUI bottom-left origin).
            var sa = Screen.safeArea;
            float xMin = sa.xMin / Screen.width;
            float yMin = sa.yMin / Screen.height;
            float xMax = sa.xMax / Screen.width;
            float yMax = sa.yMax / Screen.height;

            // Clamp noise
            xMin = Mathf.Clamp01(xMin);
            yMin = Mathf.Clamp01(yMin);
            xMax = Mathf.Clamp01(xMax);
            yMax = Mathf.Clamp01(yMax);

            // Wide desktop: further inset to a 9:16 column (product is phone-first).
            float screenAspect = (float)Screen.width / Mathf.Max(1, Screen.height);
            if (screenAspect > MobileLayout.PhoneAspect * 1.08f)
            {
                float colW = (MobileLayout.PhoneAspect / screenAspect);
                float x0 = (1f - colW) * 0.5f;
                // Intersect with safe area horizontally
                xMin = Mathf.Max(xMin, x0);
                xMax = Mathf.Min(xMax, x0 + colW);
            }

            target.anchorMin = new Vector2(xMin, yMin);
            target.anchorMax = new Vector2(xMax, yMax);
            target.offsetMin = Vector2.zero;
            target.offsetMax = Vector2.zero;
        }
    }
}
