// Mobile setup wizard — persona → issue → district → region → begin.
// Large readable type. Choices are ink-on-parchment (not gold-on-oxblood).
// Data from engine setupOptions(); no rules here.
using System.Collections.Generic;
using CandidateZero.HostData;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace CandidateZero.UI
{
    public sealed class SetupScreen : MonoBehaviour
    {
        // Fixed sizes — no best-fit. Reference canvas is 1080×1920.
        const int TitleSize = 52;
        const int StepSize = 34;
        const int BlurbSize = 30;
        const int ChoiceNameSize = 36;
        const int ChoiceDescSize = 28;
        const int SeedSize = 32;
        const int ChoiceRowH = 200;
        const int ChoiceRowHShort = 140;

        private GameObject _canvasRoot;
        private RectTransform _safe;
        private Text _title;
        private Text _stepLabel;
        private Text _blurb;
        private RectTransform _listContent;
        private Button _backBtn;
        private Button _continueBtn;
        private Button _loadBtn;
        private Button _abandonBtn;
        private Button _seedMinus;
        private Button _seedPlus;
        private Button _seedRandom;
        private Text _continueLabel;
        private Text _seedLabel;
        private GameObject _seedRow;

        private SetupOptionsView _opts;
        private int _step;
        private string _personaId, _issueId, _districtId, _regionId;
        private int _seed = 42;
        private bool _hasSave;

        public System.Action<SetupSelectionDto, int> OnBegin;
        public System.Action OnContinueSave;
        public System.Action OnAbandonCareer;

        public static SetupScreen Ensure()
        {
            var existing = FindFirstObjectByType<SetupScreen>(FindObjectsInactive.Include);
            if (existing != null) return existing;
            var go = new GameObject("CandidateZeroSetup");
            DontDestroyOnLoad(go);
            return go.AddComponent<SetupScreen>();
        }

        public void Show(SetupOptionsView opts, int defaultSeed, bool hasSave)
        {
            gameObject.SetActive(true);
            _opts = opts ?? new SetupOptionsView();
            _seed = defaultSeed > 0 ? defaultSeed : 42;
            _hasSave = hasSave;

            var d = _opts.@default;
            if (d != null)
            {
                _personaId = d.personaId;
                _issueId = d.issueId;
                _districtId = d.districtId;
                _regionId = d.regionId;
            }

            if (_canvasRoot == null)
                Build();
            _canvasRoot.SetActive(true);

            _step = 0;
            if (_loadBtn != null) _loadBtn.gameObject.SetActive(_hasSave);
            if (_abandonBtn != null) _abandonBtn.gameObject.SetActive(_hasSave);
            PaintStep();
        }

        public void Hide()
        {
            if (_canvasRoot != null)
                _canvasRoot.SetActive(false);
            gameObject.SetActive(false);
            Debug.Log("[Candidate Zero] Setup screen hidden.");
        }

        private void Build()
        {
            GothicArt.Ensure();
            CzFonts.Ensure();

            var canvasGo = new GameObject("SetupCanvas");
            canvasGo.transform.SetParent(transform, false);
            var canvas = canvasGo.AddComponent<Canvas>();
            MobileLayout.ConfigureCanvas(canvas);
            canvas.sortingOrder = 100;
            MobileLayout.ConfigureScaler(canvasGo.AddComponent<CanvasScaler>());
            canvasGo.AddComponent<GraphicRaycaster>().ignoreReversedGraphics = true;
            _canvasRoot = canvasGo;

            if (FindFirstObjectByType<EventSystem>() == null)
            {
                var es = new GameObject("EventSystem");
                es.AddComponent<EventSystem>();
                es.AddComponent<StandaloneInputModule>();
            }

            _safe = MobileLayout.CreateSafeRoot(canvasGo.transform);

            var bg = CzChrome.Panel(_safe, "BG", Color.white);
            MobileLayout.Stretch(bg);
            var bgImg = bg.GetComponent<Image>();
            bgImg.sprite = GothicArt.Sunburst;
            bgImg.type = Image.Type.Simple;
            bgImg.preserveAspect = false;
            bgImg.raycastTarget = false;

            var vig = CzChrome.Panel(_safe, "Vig", Color.white);
            MobileLayout.Stretch(vig);
            vig.GetComponent<Image>().sprite = GothicArt.Vignette;
            vig.GetComponent<Image>().raycastTarget = false;

            // —— Glossy header plate ——
            var header = CzChrome.HudPanel(_safe, "Header");
            CzChrome.SetAnchors(header, 0.04f, 0.845f, 0.96f, 0.98f);

            _title = CzChrome.Label(header, "Title", "CANDIDATE ZERO", CzFonts.Title, TitleSize,
                FontStyle.Bold, CzTheme.Parchment, TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(_title.rectTransform, 0.04f, 0.52f, 0.96f, 0.96f);

            _stepLabel = CzChrome.Label(header, "Step", "Setup", CzFonts.Title, StepSize,
                FontStyle.Bold, CzTheme.GoldBright, TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(_stepLabel.rectTransform, 0.04f, 0.08f, 0.96f, 0.50f);

            _blurb = CzChrome.Label(_safe, "Blurb", "", CzFonts.Body, BlurbSize,
                FontStyle.Normal, CzTheme.Parchment, TextAnchor.UpperCenter);
            CzChrome.SetAnchors(_blurb.rectTransform, 0.06f, 0.790f, 0.94f, 0.840f);

            // —— Choice list in deep glass ——
            var listFrame = CzChrome.DeepPanel(_safe, "ListFrame");
            CzChrome.SetAnchors(listFrame, 0.035f, 0.215f, 0.965f, 0.785f);

            var scrollGo = new GameObject("ListScroll");
            var srt = scrollGo.AddComponent<RectTransform>();
            srt.SetParent(listFrame, false);
            CzChrome.Stretch(srt);
            srt.offsetMin = new Vector2(10, 10);
            srt.offsetMax = new Vector2(-10, -10);
            var scroll = scrollGo.AddComponent<ScrollRect>();
            scroll.horizontal = false;
            scroll.vertical = true;
            scroll.movementType = ScrollRect.MovementType.Elastic;
            scroll.scrollSensitivity = 48f;
            var listBg = scrollGo.AddComponent<Image>();
            listBg.color = new Color(0, 0, 0, 0.001f);

            var vp = new GameObject("VP");
            var vprt = vp.AddComponent<RectTransform>();
            vprt.SetParent(srt, false);
            CzChrome.SetAnchors(vprt, 0, 0, 1, 1);
            vp.AddComponent<RectMask2D>();
            vp.AddComponent<Image>().color = new Color(0, 0, 0, 0.01f);

            var content = new GameObject("Content");
            _listContent = content.AddComponent<RectTransform>();
            _listContent.SetParent(vprt, false);
            _listContent.anchorMin = new Vector2(0, 1);
            _listContent.anchorMax = new Vector2(1, 1);
            _listContent.pivot = new Vector2(0.5f, 1);
            var vlg = content.AddComponent<VerticalLayoutGroup>();
            vlg.spacing = 16;
            vlg.padding = new RectOffset(16, 16, 18, 18);
            vlg.childControlHeight = false;
            vlg.childControlWidth = true;
            vlg.childForceExpandWidth = true;
            content.AddComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            scroll.viewport = vprt;
            scroll.content = _listContent;

            // —— Seed strip ——
            _seedRow = CzChrome.HudPanel(_safe, "SeedRow").gameObject;
            var seedRt = _seedRow.GetComponent<RectTransform>();
            CzChrome.SetAnchors(seedRt, 0.035f, 0.155f, 0.965f, 0.210f);
            _seedLabel = CzChrome.Label(seedRt, "SeedLbl", "Seed 42", CzFonts.Title, SeedSize,
                FontStyle.Bold, CzTheme.Parchment, TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(_seedLabel.rectTransform, 0.18f, 0.1f, 0.62f, 0.9f);
            _seedMinus = CzChrome.PrimaryButton(seedRt, "Seed-", "−", 0.02f, 0.16f, 0.08f, 0.92f, false);
            _seedPlus = CzChrome.PrimaryButton(seedRt, "Seed+", "+", 0.64f, 0.78f, 0.08f, 0.92f, false);
            _seedRandom = CzChrome.PrimaryButton(seedRt, "SeedR", "RND", 0.80f, 0.98f, 0.08f, 0.92f, false);
            _seedMinus.onClick.AddListener(() => { _seed = Mathf.Max(1, _seed - 1); PaintSeed(); });
            _seedPlus.onClick.AddListener(() => { _seed = Mathf.Min(int.MaxValue - 1, _seed + 1); PaintSeed(); });
            _seedRandom.onClick.AddListener(() =>
            {
                _seed = UnityEngine.Random.Range(1, 999999);
                PaintSeed();
            });
            _seedRow.SetActive(false);

            // —— Thumb ——
            var thumb = CzChrome.HudPanel(_safe, "Thumb");
            CzChrome.SetAnchors(thumb, 0.015f, 0.008f, 0.985f, 0.150f);

            _backBtn = CzChrome.PrimaryButton(thumb, "Back", "Back", 0.04f, 0.28f, 0.42f, 0.92f, false);
            _continueBtn = CzChrome.PrimaryButton(thumb, "Next", "Next", 0.30f, 0.96f, 0.42f, 0.92f, true);
            _continueLabel = _continueBtn.GetComponentInChildren<Text>();
            _loadBtn = CzChrome.PrimaryButton(thumb, "Load", "Continue career", 0.04f, 0.58f, 0.06f, 0.36f, false);
            _abandonBtn = CzChrome.PrimaryButton(thumb, "Abandon", "Abandon save", 0.60f, 0.96f, 0.06f, 0.36f, false);
            _abandonBtn.GetComponent<Image>().color = new Color(0.28f, 0.12f, 0.11f, 1f);

            _backBtn.onClick.AddListener(OnBack);
            _continueBtn.onClick.AddListener(OnNext);
            _loadBtn.onClick.AddListener(() =>
            {
                Debug.Log("[Candidate Zero] Continue career pressed.");
                OnContinueSave?.Invoke();
            });
            _abandonBtn.onClick.AddListener(() =>
            {
                Debug.Log("[Candidate Zero] Abandon career pressed.");
                OnAbandonCareer?.Invoke();
                _hasSave = false;
                _loadBtn.gameObject.SetActive(false);
                _abandonBtn.gameObject.SetActive(false);
                _blurb.text = "Save cleared. Build a new campaign when ready.";
            });
        }

        private void PaintSeed()
        {
            if (_seedLabel != null)
                _seedLabel.text = $"Seed {_seed}";
            if (_stepLabel != null && _step >= 3)
                _stepLabel.text = $"Region  ·  4 / 4  ·  seed {_seed}";
        }

        private void PaintStep()
        {
            var steps = new[] { "Persona", "Issue", "District", "Region" };
            _stepLabel.text = $"{steps[_step]}  ·  {_step + 1} / 4";
            _backBtn.interactable = _step > 0;
            if (_continueLabel != null)
            {
                _continueLabel.text = _step >= 3 ? "BEGIN CAMPAIGN" : "Next";
                _continueLabel.fontSize = 32;
                _continueLabel.font = CzFonts.BodyBold;
                _continueLabel.color = CzTheme.Parchment;
            }
            if (_seedRow != null)
            {
                _seedRow.SetActive(_step >= 3);
                if (_step >= 3) PaintSeed();
            }

            List<SetupChoice> list = null;
            string selected = null;
            switch (_step)
            {
                case 0:
                    list = _opts.personas;
                    selected = _personaId;
                    _blurb.text = "Who walks the county? Persona locks after filing.";
                    break;
                case 1:
                    list = _opts.issues;
                    selected = _issueId;
                    _blurb.text = "What are you running on? Choices bind.";
                    break;
                case 2:
                    list = _opts.districts;
                    selected = _districtId;
                    _blurb.text = "Where is the seat? Lean and traps matter.";
                    break;
                default:
                    list = _opts.regions;
                    selected = _regionId;
                    _blurb.text = "Region + seed. Seed locks the RNG for a fair replay.";
                    break;
            }

            foreach (Transform c in _listContent)
                Destroy(c.gameObject);

            if (list == null || list.Count == 0)
            {
                _blurb.text = "No options from engine — check Console / engine bundle.";
                return;
            }

            foreach (var choice in list)
            {
                var id = choice.id;
                var sel = id == selected;
                var hasDesc = !string.IsNullOrEmpty(choice.d);
                var rowH = hasDesc ? ChoiceRowH : ChoiceRowHShort;
                var b = ChoiceRow(_listContent, id, choice.n ?? id, hasDesc ? Trunc(choice.d, 140) : null, rowH, sel);
                b.onClick.AddListener(() =>
                {
                    Select(id);
                    PaintStep();
                });
            }
        }

        private void Select(string id)
        {
            switch (_step)
            {
                case 0: _personaId = id; break;
                case 1: _issueId = id; break;
                case 2: _districtId = id; break;
                case 3: _regionId = id; break;
            }
        }

        private void OnBack()
        {
            if (_step > 0)
            {
                _step--;
                PaintStep();
            }
        }

        private void OnNext()
        {
            if (_step < 3)
            {
                _step++;
                PaintStep();
                return;
            }

            if (string.IsNullOrEmpty(_personaId) || string.IsNullOrEmpty(_issueId)
                || string.IsNullOrEmpty(_districtId) || string.IsNullOrEmpty(_regionId))
            {
                _blurb.text = "Pick every step before beginning.";
                Debug.LogWarning("[Candidate Zero] Begin blocked — incomplete setup.");
                return;
            }

            var setup = new SetupSelectionDto
            {
                personaId = _personaId,
                issueId = _issueId,
                districtId = _districtId,
                regionId = _regionId
            };
            Debug.Log($"[Candidate Zero] BEGIN CAMPAIGN → {setup.ToJsonObject()} seed={_seed}");
            if (OnBegin == null)
            {
                Debug.LogError("[Candidate Zero] OnBegin not wired — GameController missing.");
                _blurb.text = "Internal error: begin not wired (see Console).";
                return;
            }
            OnBegin.Invoke(setup, _seed);
        }

        private static string Trunc(string s, int n) =>
            string.IsNullOrEmpty(s) ? "" : s.Length <= n ? s : s.Substring(0, n - 1) + "…";

        /// <summary>
        /// Dossier choice row: parchment face + dark ink. Selected = gold edge + oxblood bar.
        /// Never gold text on red fill.
        /// </summary>
        private static Button ChoiceRow(RectTransform parent, string name, string title, string desc,
            float h, bool selected)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(Image), typeof(Button), typeof(LayoutElement));
            go.transform.SetParent(parent, false);
            var le = go.GetComponent<LayoutElement>();
            le.preferredHeight = h;
            le.minHeight = h;

            var face = go.GetComponent<Image>();
            // Parchment plate — sliced if available, solid cream otherwise
            if (GothicArt.Parchment != null)
            {
                face.sprite = GothicArt.Parchment;
                face.type = Image.Type.Sliced;
                face.color = selected
                    ? new Color(1f, 0.98f, 0.92f, 1f)
                    : new Color(0.96f, 0.92f, 0.84f, 1f);
            }
            else
            {
                face.color = selected ? new Color(0.96f, 0.91f, 0.80f) : CzTheme.Parchment;
            }

            var btn = go.GetComponent<Button>();
            btn.targetGraphic = face;
            var colors = btn.colors;
            colors.highlightedColor = new Color(1f, 0.97f, 0.90f);
            colors.pressedColor = new Color(0.90f, 0.84f, 0.72f);
            colors.selectedColor = new Color(1f, 0.98f, 0.92f);
            btn.colors = colors;

            CzChrome.Outline(go, selected ? CzTheme.Gold : CzTheme.GoldDim, selected ? 2.2f : 1.4f);
            if (selected)
                CzChrome.Shadow(go, new Color(0, 0, 0, 0.35f), 0f, -3f);

            // Left accent bar (selected = oxblood, idle = gold dim)
            var bar = CzChrome.Panel(go.transform, "Bar",
                selected ? CzTheme.Oxblood : CzTheme.GoldDim);
            CzChrome.SetAnchors(bar, 0f, 0.08f, 0.028f, 0.92f);
            bar.GetComponent<Image>().raycastTarget = false;

            // Radio mark
            var mark = CzChrome.Label(go.transform, "Mark", selected ? "●" : "○",
                CzFonts.BodyBold, 32, FontStyle.Bold,
                selected ? CzTheme.Oxblood : CzTheme.Ink, TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(mark.rectTransform, 0.04f, 0.55f, 0.12f, 0.92f);

            // Name — large Cinzel ink
            var nameT = CzChrome.Label(go.transform, "Name", title ?? "—",
                CzFonts.Title, ChoiceNameSize, FontStyle.Bold, CzTheme.Ink, TextAnchor.MiddleLeft);
            if (string.IsNullOrEmpty(desc))
                CzChrome.SetAnchors(nameT.rectTransform, 0.13f, 0.15f, 0.96f, 0.85f);
            else
                CzChrome.SetAnchors(nameT.rectTransform, 0.13f, 0.48f, 0.96f, 0.92f);

            if (!string.IsNullOrEmpty(desc))
            {
                var descT = CzChrome.Label(go.transform, "Desc", desc,
                    CzFonts.Body, ChoiceDescSize, FontStyle.Normal,
                    new Color(0.22f, 0.15f, 0.10f), TextAnchor.UpperLeft);
                CzChrome.SetAnchors(descT.rectTransform, 0.13f, 0.08f, 0.95f, 0.50f);
            }

            return btn;
        }
    }
}
