// Title screen matching the TypeScript product:
//   eyebrow "A Texas Political Epic"
//   double gold rules + Cinzel wordmark
//   upright 5-point nautical star
//   tagline + Begin the Climb / How to Play
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace CandidateZero.UI
{
    public sealed class TitleScreen : MonoBehaviour
    {
        private GameObject _canvasRoot;

        public System.Action OnBeginClimb;
        public System.Action OnHowToPlay;

        public static TitleScreen Ensure()
        {
            var existing = FindFirstObjectByType<TitleScreen>(FindObjectsInactive.Include);
            if (existing != null) return existing;
            var go = new GameObject("CandidateZeroTitle");
            DontDestroyOnLoad(go);
            return go.AddComponent<TitleScreen>();
        }

        public void Show()
        {
            gameObject.SetActive(true);
            if (_canvasRoot == null)
                Build();
            _canvasRoot.SetActive(true);
        }

        public void Hide()
        {
            if (_canvasRoot != null) _canvasRoot.SetActive(false);
            gameObject.SetActive(false);
        }

        private void Build()
        {
            GothicArt.Ensure();
            CzFonts.Ensure();

            var canvasGo = new GameObject("TitleCanvas");
            canvasGo.transform.SetParent(transform, false);
            var canvas = canvasGo.AddComponent<Canvas>();
            MobileLayout.ConfigureCanvas(canvas);
            canvas.sortingOrder = 120;
            MobileLayout.ConfigureScaler(canvasGo.AddComponent<CanvasScaler>());
            canvasGo.AddComponent<GraphicRaycaster>().ignoreReversedGraphics = true;
            _canvasRoot = canvasGo;

            if (FindFirstObjectByType<EventSystem>() == null)
            {
                var es = new GameObject("EventSystem");
                es.AddComponent<EventSystem>();
                es.AddComponent<StandaloneInputModule>();
            }

            var safe = MobileLayout.CreateSafeRoot(canvasGo.transform);

            var bg = CzChrome.Panel(safe, "Sunburst", Color.white);
            CzChrome.Stretch(bg);
            var bgImg = bg.GetComponent<Image>();
            bgImg.sprite = GothicArt.Sunburst;
            bgImg.preserveAspect = false;
            bgImg.raycastTarget = false;

            var vig = CzChrome.Panel(safe, "Vig", Color.white);
            CzChrome.Stretch(vig);
            var vigImg = vig.GetComponent<Image>();
            vigImg.sprite = GothicArt.Vignette;
            vigImg.raycastTarget = false;

            // Center glass plate for title block
            var plate = CzChrome.GlassPanel(safe, "TitlePlate");
            CzChrome.SetAnchors(plate, 0.06f, 0.34f, 0.94f, 0.92f);

            var eye = CzChrome.Label(plate, "Eye", "A TEXAS POLITICAL EPIC",
                CzFonts.BodyBold, 24, FontStyle.Bold, CzTheme.GoldBright, TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(eye.rectTransform, 0.06f, 0.88f, 0.94f, 0.96f);

            CzChrome.DoubleGoldRule(plate, "R1", 0.86f, 0.14f, 0.86f);

            var name = CzChrome.Label(plate, "Name", "CANDIDATE\nZERO",
                CzFonts.TitleDeco, 58, FontStyle.Bold, CzTheme.Parchment, TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(name.rectTransform, 0.06f, 0.48f, 0.94f, 0.84f);
            name.lineSpacing = 0.88f;
            name.resizeTextForBestFit = false;
            CzChrome.Shadow(name.gameObject, new Color(0, 0, 0, 0.50f), 0f, -3f);

            CzChrome.DoubleGoldRule(plate, "R2", 0.44f, 0.14f, 0.86f);

            var star = CzChrome.Panel(plate, "NauticalStar", Color.white);
            CzChrome.SetAnchors(star, 0.32f, 0.12f, 0.68f, 0.40f);
            var starImg = star.GetComponent<Image>();
            starImg.sprite = GothicArt.StarEmblem;
            starImg.preserveAspect = true;
            starImg.raycastTarget = false;
            CzChrome.SoftShadow(star.gameObject);

            var tag = CzChrome.Label(safe, "Tag",
                "No money. No name. No blessing.\nThe climb starts at the courthouse door.",
                CzFonts.Body, 28, FontStyle.Normal, CzTheme.Parchment, TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(tag.rectTransform, 0.08f, 0.25f, 0.92f, 0.34f);

            var start = CzChrome.PrimaryButton(safe, "Start", "BEGIN THE CLIMB",
                0.12f, 0.88f, 0.145f, 0.245f, true);
            var howto = CzChrome.PrimaryButton(safe, "Howto", "HOW TO PLAY",
                0.18f, 0.82f, 0.065f, 0.135f, false);
            start.onClick.AddListener(() => OnBeginClimb?.Invoke());
            howto.onClick.AddListener(() => OnHowToPlay?.Invoke());

            var note = CzChrome.Label(safe, "Note", "Alpha · v0.1 · Unity host · pure TS engine",
                CzFonts.Body, 22, FontStyle.Normal, CzTheme.GoldDim, TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(note.rectTransform, 0.1f, 0.015f, 0.9f, 0.055f);
        }
    }
}
