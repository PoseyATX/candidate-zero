// Mobile-first card table (9:16). Presentation only — engine via callbacks.
// Layout mirrors TS deckbuilder: sticky vitals HUD (AP pips, $, week meter),
// large 2:3 hand, compact feed, thumb zone.
using System.Collections.Generic;
using CandidateZero.Content;
using CandidateZero.HostData;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace CandidateZero.UI
{
    public sealed class CardTableHud : MonoBehaviour
    {
        private RectTransform _safe;

        // Sticky HUD
        private Text _whoName;
        private Text _whoIssue;
        private Text _stageChip;
        private RectTransform _pipsRow;
        private readonly Image[] _pips = new Image[8];
        private Text _fieldAp;
        private Text _cash;
        private Text _debtChip;
        private Text _weekLabel;
        private Image _weekFill;
        private Text _sigLabel;
        private Image _sigFill;
        private Text _ballotChip;
        private Text _status;

        // Goal strip — "what am I supposed to do this week" (RenderView.goal)
        private Text _goalPrimary;
        private Text _goalProgress;
        private Text _goalNext;

        // Hand
        private RectTransform _handContent;
        private HorizontalLayoutGroup _handLayout;
        private CardTilePool _cardPool;

        // Feed + thumb
        private Text _log;
        private Text _endWeekLabel;
        private Button _endWeekBtn;

        // Overlays
        private GameObject _inspectRoot;
        private Text _inspectTitle, _inspectMeta, _inspectBody;
        private GameObject _groundRoot;
        private RectTransform _groundContent;
        private GameObject _draftRoot;
        private RectTransform _draftContent;
        private Text _draftTitle;
        private GameObject _weatherRoot;
        private Text _weatherTitle, _weatherBody;
        private GameObject _terminalRoot;
        private Text _terminalTitle, _terminalBody;
        private GameObject _actRoot;
        private Text _actTitle, _actBody;
        private Text _toast;
        private float _toastUntil;

        private ActionView _selected;
        private RenderView _view;
        private bool _portrait;
        private string _handSignature;
        private string _lastStageKey;
        private bool _suppressNextActSplash;

        public System.Action<ActionView, string> OnPlayAction;
        public System.Action<int> OnDraftPick;
        public System.Action OnDismissOutside;
        public System.Action OnEndWeek;
        public System.Action OnRestart;

        public static CardTableHud Ensure()
        {
            var existing = FindFirstObjectByType<CardTableHud>(FindObjectsInactive.Include);
            if (existing != null)
            {
                existing.gameObject.SetActive(true);
                if (existing._safe == null)
                    existing.Build();
                return existing;
            }
            var go = new GameObject("CandidateZeroCardTable");
            DontDestroyOnLoad(go);
            return go.AddComponent<CardTableHud>();
        }

        private void Awake()
        {
            if (_safe == null)
            {
                PaintCamera();
                Build();
            }
        }

        private void OnEnable()
        {
            if (_safe == null)
            {
                PaintCamera();
                Build();
            }
        }

        private void Update()
        {
            bool nowPortrait = Screen.height >= Screen.width;
            if (nowPortrait != _portrait)
            {
                _portrait = nowPortrait;
                _handSignature = null;
                if (_view != null) RebuildHandIfNeeded();
            }

            if (_toast != null && Time.unscaledTime > _toastUntil)
            {
                var panel = _toast.transform.parent != null
                    ? _toast.transform.parent.gameObject
                    : _toast.gameObject;
                if (panel.activeSelf) panel.SetActive(false);
            }
        }

        private static void PaintCamera()
        {
            var cam = Camera.main;
            if (cam == null)
            {
                var camGo = new GameObject("Main Camera");
                cam = camGo.AddComponent<Camera>();
                cam.tag = "MainCamera";
            }
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.05f, 0.04f, 0.03f, 1f);
            cam.orthographic = true;
            cam.transform.position = new Vector3(0, 0, -10f);
            if (cam.GetComponent<AudioListener>() == null)
                cam.gameObject.AddComponent<AudioListener>();
        }

        private void Build()
        {
            if (_safe != null) return;

            _portrait = Screen.height >= Screen.width;
            GothicArt.Ensure();
            CzFonts.Ensure();

            var canvasGo = new GameObject("Canvas");
            canvasGo.transform.SetParent(transform, false);
            var canvas = canvasGo.AddComponent<Canvas>();
            MobileLayout.ConfigureCanvas(canvas);
            canvas.sortingOrder = 50;
            MobileLayout.ConfigureScaler(canvasGo.AddComponent<CanvasScaler>());
            canvasGo.AddComponent<GraphicRaycaster>().ignoreReversedGraphics = true;

            if (FindFirstObjectByType<EventSystem>() == null)
            {
                var es = new GameObject("EventSystem");
                es.AddComponent<EventSystem>();
                es.AddComponent<StandaloneInputModule>();
            }

            _safe = MobileLayout.CreateSafeRoot(canvasGo.transform);

            // Full-bleed sunburst
            var bg = CzChrome.Panel(_safe, "Sunburst", Color.white);
            CzChrome.Stretch(bg);
            var bgImg = bg.GetComponent<Image>();
            bgImg.sprite = GothicArt.Sunburst;
            bgImg.preserveAspect = false;
            bgImg.raycastTarget = false;

            var vig = CzChrome.Panel(_safe, "Vignette", Color.white);
            CzChrome.Stretch(vig);
            var vigImg = vig.GetComponent<Image>();
            vigImg.sprite = GothicArt.Vignette;
            vigImg.raycastTarget = false;

            BuildStickyHud();
            BuildGoalStrip();
            BuildHandStrip();
            BuildFeed();
            BuildThumbZone();
            BuildInspect();
            BuildGroundPicker();
            BuildDraft();
            BuildWeather();
            BuildTerminal();
            BuildActSplash();
            BuildToast();
        }

        // ---------- sticky vitals HUD (TS .hud) ----------

        private void BuildStickyHud()
        {
            var hud = CzChrome.HudPanel(_safe, "StickyHud");
            CzChrome.SetAnchors(hud, 0.02f, 0.855f, 0.98f, 0.995f);

            // Identity row
            _whoName = CzChrome.Label(hud, "Who", "—", CzFonts.Title, 34, FontStyle.Bold,
                CzTheme.Parchment, TextAnchor.MiddleLeft);
            CzChrome.SetAnchors(_whoName.rectTransform, 0.04f, 0.58f, 0.52f, 0.94f);

            _whoIssue = CzChrome.Label(hud, "Issue", "", CzFonts.Body, 26, FontStyle.Normal,
                CzTheme.ParchmentDim, TextAnchor.MiddleLeft);
            CzChrome.SetAnchors(_whoIssue.rectTransform, 0.04f, 0.28f, 0.48f, 0.58f);

            _stageChip = CzChrome.Label(hud, "StageChip", "PRIMARY", CzFonts.BodyBold, 24, FontStyle.Bold,
                CzTheme.Gold, TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(_stageChip.rectTransform, 0.54f, 0.62f, 0.96f, 0.92f);
            var stageBg = CzChrome.Panel(hud, "StageBg", new Color(0, 0, 0, 0.28f));
            CzChrome.SetAnchors(stageBg, 0.54f, 0.62f, 0.96f, 0.92f);
            CzChrome.Outline(stageBg.gameObject, CzTheme.GoldDim, 1f);
            stageBg.SetSiblingIndex(_stageChip.rectTransform.GetSiblingIndex());

            // Vitals row: AP pips | cash | week | sig
            // "AP" is spelled out — unlabelled gold discs directly under the
            // issue name read as part of the issue, not as action points.
            var apCaption = CzChrome.Label(hud, "ApCaption", "AP", CzFonts.BodyBold, 20, FontStyle.Bold,
                CzTheme.GoldDim, TextAnchor.MiddleLeft);
            CzChrome.SetAnchors(apCaption.rectTransform, 0.035f, 0.04f, 0.10f, 0.30f);

            _pipsRow = CzChrome.Panel(hud, "Pips", new Color(0, 0, 0, 0)).GetComponent<RectTransform>();
            CzChrome.SetAnchors(_pipsRow, 0.105f, 0.04f, 0.36f, 0.30f);
            var pipLayout = _pipsRow.gameObject.AddComponent<HorizontalLayoutGroup>();
            pipLayout.spacing = 6;
            pipLayout.childAlignment = TextAnchor.MiddleLeft;
            pipLayout.childControlWidth = false;
            pipLayout.childControlHeight = false;
            pipLayout.childForceExpandWidth = false;
            pipLayout.childForceExpandHeight = false;
            for (int i = 0; i < _pips.Length; i++)
            {
                var go = new GameObject("Pip" + i, typeof(RectTransform), typeof(Image), typeof(LayoutElement));
                go.transform.SetParent(_pipsRow, false);
                var le = go.GetComponent<LayoutElement>();
                le.preferredWidth = 32;
                le.preferredHeight = 32;
                le.minWidth = 32;
                le.minHeight = 32;
                var img = go.GetComponent<Image>();
                img.sprite = GothicArt.PipOff;
                img.preserveAspect = true;
                img.raycastTarget = false;
                _pips[i] = img;
            }

            _fieldAp = CzChrome.Label(hud, "FieldAp", "", CzFonts.BodyBold, 22, FontStyle.Bold,
                CzTheme.SageLite, TextAnchor.MiddleLeft);
            CzChrome.SetAnchors(_fieldAp.rectTransform, 0.36f, 0.04f, 0.48f, 0.30f);

            _cash = CzChrome.Label(hud, "Cash", "$0", CzFonts.BodyBold, 34, FontStyle.Bold,
                CzTheme.Parchment, TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(_cash.rectTransform, 0.46f, 0.04f, 0.64f, 0.30f);

            _debtChip = CzChrome.Label(hud, "Debt", "", CzFonts.BodyBold, 22, FontStyle.Bold,
                new Color(0.91f, 0.71f, 0.66f), TextAnchor.MiddleLeft);
            CzChrome.SetAnchors(_debtChip.rectTransform, 0.64f, 0.04f, 0.76f, 0.30f);

            // Week meter (glossy)
            _weekLabel = CzChrome.Label(hud, "WeekLbl", "W1/12", CzFonts.Body, 24, FontStyle.Normal,
                CzTheme.ParchmentDim, TextAnchor.MiddleRight);
            CzChrome.SetAnchors(_weekLabel.rectTransform, 0.74f, 0.16f, 0.96f, 0.30f);

            var weekTrack = CzChrome.Panel(hud, "WeekTrack", Color.white);
            CzChrome.SetAnchors(weekTrack, 0.76f, 0.06f, 0.96f, 0.14f);
            var wtImg = weekTrack.GetComponent<Image>();
            if (GothicArt.MeterTrack != null)
            {
                wtImg.sprite = GothicArt.MeterTrack;
                wtImg.type = Image.Type.Sliced;
            }
            else wtImg.color = new Color(0, 0, 0, 0.4f);
            _weekFill = CzChrome.Panel(weekTrack, "WeekFill", Color.white).GetComponent<Image>();
            if (GothicArt.MeterFillOx != null)
            {
                _weekFill.sprite = GothicArt.MeterFillOx;
                _weekFill.type = Image.Type.Sliced;
            }
            else _weekFill.color = CzTheme.OxbloodBright;
            var wfrt = _weekFill.rectTransform;
            wfrt.anchorMin = new Vector2(0, 0);
            wfrt.anchorMax = new Vector2(0.2f, 1);
            wfrt.offsetMin = new Vector2(2, 2);
            wfrt.offsetMax = new Vector2(-2, -2);

            // Status line under HUD. Sits in its own band — it used to overlap
            // the signature strip and get clipped mid-word ("CAMPAIGN · SEED …").
            _status = CzChrome.Label(_safe, "Status", "", CzFonts.Body, 24, FontStyle.Normal,
                CzTheme.Good, TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(_status.rectTransform, 0.04f, 0.822f, 0.96f, 0.852f);

            // Secondary strip: signatures / ballot
            var sub = CzChrome.DeepPanel(_safe, "SubHud");
            CzChrome.SetAnchors(sub, 0.03f, 0.762f, 0.97f, 0.818f);

            _sigLabel = CzChrome.Label(sub, "SigLbl", "Sig 0/0", CzFonts.Body, 26, FontStyle.Normal,
                CzTheme.ParchmentDim, TextAnchor.MiddleLeft);
            CzChrome.SetAnchors(_sigLabel.rectTransform, 0.04f, 0.15f, 0.42f, 0.85f);

            var sigTrack = CzChrome.Panel(sub, "SigTrack", Color.white);
            CzChrome.SetAnchors(sigTrack, 0.42f, 0.28f, 0.72f, 0.72f);
            var stImg = sigTrack.GetComponent<Image>();
            if (GothicArt.MeterTrack != null)
            {
                stImg.sprite = GothicArt.MeterTrack;
                stImg.type = Image.Type.Sliced;
            }
            else stImg.color = new Color(0, 0, 0, 0.4f);
            _sigFill = CzChrome.Panel(sigTrack, "SigFill", Color.white).GetComponent<Image>();
            if (GothicArt.MeterFillGold != null)
            {
                _sigFill.sprite = GothicArt.MeterFillGold;
                _sigFill.type = Image.Type.Sliced;
            }
            else _sigFill.color = CzTheme.Gold;
            var sfrt = _sigFill.rectTransform;
            sfrt.anchorMin = Vector2.zero;
            sfrt.anchorMax = new Vector2(0.1f, 1f);
            sfrt.offsetMin = new Vector2(2, 2);
            sfrt.offsetMax = new Vector2(-2, -2);

            _ballotChip = CzChrome.Label(sub, "Ballot", "", CzFonts.BodyBold, 24, FontStyle.Bold,
                CzTheme.SageLite, TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(_ballotChip.rectTransform, 0.74f, 0.1f, 0.98f, 0.9f);
        }

        // ---------- goal strip (RenderView.goal — "what am I doing this week") ----------
        //
        // Owner's own bar for a legible build (docs/HANDOFF-2026-07-23.md §10):
        // "Goal strip alone answers ballot week-1." Three lines, always visible,
        // no tap required: what you're working toward, the live numbers for it,
        // and the concrete next move. Copy comes verbatim from the engine
        // (src/ui/goal-strip.ts, now on RenderView.goal) — this is layout only.
        private void BuildGoalStrip()
        {
            var strip = CzChrome.DeepPanel(_safe, "GoalStrip");
            CzChrome.SetAnchors(strip, 0.03f, 0.632f, 0.97f, 0.755f);
            CzChrome.Outline(strip.gameObject, CzTheme.GoldDim, 1f);

            _goalPrimary = CzChrome.Label(strip, "GoalPrimary", "", CzFonts.BodyBold, 27, FontStyle.Bold,
                CzTheme.Gold, TextAnchor.MiddleLeft);
            CzChrome.SetAnchors(_goalPrimary.rectTransform, 0.05f, 0.58f, 0.95f, 0.94f);

            _goalProgress = CzChrome.Label(strip, "GoalProgress", "", CzFonts.Body, 21, FontStyle.Normal,
                CzTheme.ParchmentDim, TextAnchor.MiddleLeft);
            CzChrome.SetAnchors(_goalProgress.rectTransform, 0.05f, 0.30f, 0.95f, 0.58f);

            _goalNext = CzChrome.Label(strip, "GoalNext", "", CzFonts.Body, 21, FontStyle.Italic,
                CzTheme.SageLite, TextAnchor.MiddleLeft);
            CzChrome.SetAnchors(_goalNext.rectTransform, 0.05f, 0.03f, 0.95f, 0.30f);
        }

        private void PaintGoalStrip()
        {
            var g = _view?.goal;
            if (_goalPrimary == null) return;
            if (g == null)
            {
                _goalPrimary.text = "";
                _goalProgress.text = "";
                _goalNext.text = "";
                return;
            }
            _goalPrimary.text = g.primary ?? "";
            _goalProgress.text = g.progress ?? "";
            _goalNext.text = string.IsNullOrEmpty(g.next) ? "" : "→ " + g.next;
        }

        // Goal strip claims 0.635–0.750 (was part of the hand rail's slack — the
        // rail was sized for far more headroom than a 420px card tile needs).
        private const float HandRailTop = 0.625f;

        private void BuildHandStrip()
        {
            // No "HAND · n playable · swipe · tap" caption. A row of cards is
            // self-evidently a hand, and the goal strip above already says what
            // to do — the caption was chrome explaining chrome.

            // Hand rail — deep glass strip
            var rail = CzChrome.DeepPanel(_safe, "HandRail");
            CzChrome.SetAnchors(rail, 0.015f, 0.30f, 0.985f, HandRailTop);
            rail.GetComponent<Image>().color = new Color(1f, 1f, 1f, 0.72f);

            var scrollGo = new GameObject("HandScroll");
            var scrollRt = scrollGo.AddComponent<RectTransform>();
            scrollRt.SetParent(_safe, false);
            CzChrome.SetAnchors(scrollRt, 0f, 0.30f, 1f, HandRailTop);
            var scroll = scrollGo.AddComponent<ScrollRect>();
            scroll.horizontal = true;
            scroll.vertical = false;
            scroll.movementType = ScrollRect.MovementType.Elastic;
            scroll.scrollSensitivity = 56f;
            scroll.inertia = true;
            scroll.decelerationRate = 0.12f;
            scrollGo.AddComponent<Image>().color = new Color(0, 0, 0, 0.001f);

            var viewport = new GameObject("Viewport");
            var vpRt = viewport.AddComponent<RectTransform>();
            vpRt.SetParent(scrollRt, false);
            CzChrome.Stretch(vpRt);
            viewport.AddComponent<RectMask2D>();
            viewport.AddComponent<Image>().color = new Color(0, 0, 0, 0.001f);

            var content = new GameObject("Content");
            _handContent = content.AddComponent<RectTransform>();
            _handContent.SetParent(vpRt, false);
            _handContent.anchorMin = new Vector2(0, 0.5f);
            _handContent.anchorMax = new Vector2(0, 0.5f);
            _handContent.pivot = new Vector2(0, 0.5f);
            _handContent.sizeDelta = new Vector2(100f, CardTileView.Height + 28f);
            _handLayout = content.AddComponent<HorizontalLayoutGroup>();
            _handLayout.spacing = 20;
            _handLayout.padding = new RectOffset(28, 28, 14, 14);
            _handLayout.childAlignment = TextAnchor.MiddleLeft;
            _handLayout.childControlWidth = false;
            _handLayout.childControlHeight = false;
            _handLayout.childForceExpandHeight = false;
            _handLayout.childForceExpandWidth = false;
            content.AddComponent<ContentSizeFitter>().horizontalFit = ContentSizeFitter.FitMode.PreferredSize;

            scroll.viewport = vpRt;
            scroll.content = _handContent;
            _cardPool = new CardTilePool(_handContent);
        }

        private void BuildFeed()
        {
            var logPanel = CzChrome.GlassPanel(_safe, "Log");
            CzChrome.SetAnchors(logPanel, 0.03f, 0.155f, 0.97f, 0.29f);

            var logHead = CzChrome.Label(logPanel, "LogHead", "THE RECORD", CzFonts.BodyBold, 22, FontStyle.Bold,
                CzTheme.GoldDim, TextAnchor.MiddleLeft);
            CzChrome.SetAnchors(logHead.rectTransform, 0.04f, 0.78f, 0.96f, 0.96f);

            _log = CzChrome.Label(logPanel, "LogTxt", "", CzFonts.Body, 26, FontStyle.Normal,
                CzTheme.Muted, TextAnchor.UpperLeft);
            CzChrome.SetAnchors(_log.rectTransform, 0.04f, 0.06f, 0.96f, 0.78f);
        }

        private void BuildThumbZone()
        {
            var thumb = CzChrome.HudPanel(_safe, "ThumbZone");
            CzChrome.SetAnchors(thumb, 0.015f, 0.008f, 0.985f, 0.145f);

            _endWeekBtn = CzChrome.PrimaryButton(thumb, "EndWeek", "END WEEK", 0.04f, 0.68f, 0.18f, 0.88f, true);
            _endWeekLabel = _endWeekBtn.GetComponentInChildren<Text>();
            var restart = CzChrome.PrimaryButton(thumb, "Menu", "MENU", 0.70f, 0.96f, 0.18f, 0.88f, false);
            _endWeekBtn.onClick.AddListener(() => OnEndWeek?.Invoke());
            restart.onClick.AddListener(() => OnRestart?.Invoke());
        }

        // ---------- overlays ----------

        private void BuildInspect()
        {
            _inspectRoot = CzChrome.GlassPanel(_safe, "Inspect").gameObject;
            CzChrome.SetAnchors(_inspectRoot.GetComponent<RectTransform>(), 0.04f, 0.16f, 0.96f, 0.78f);
            _inspectRoot.SetActive(false);

            _inspectTitle = CzChrome.Label(_inspectRoot.transform, "T", "", CzFonts.Title, 36, FontStyle.Bold,
                CzTheme.Gold, TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(_inspectTitle.rectTransform, 0.05f, 0.86f, 0.95f, 0.97f);

            _inspectMeta = CzChrome.Label(_inspectRoot.transform, "M", "", CzFonts.Body, 26, FontStyle.Normal,
                new Color(0.82f, 0.76f, 0.58f), TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(_inspectMeta.rectTransform, 0.05f, 0.76f, 0.95f, 0.86f);

            _inspectBody = CzChrome.Label(_inspectRoot.transform, "B", "", CzFonts.Body, 28, FontStyle.Normal,
                CzTheme.Parchment, TextAnchor.UpperLeft);
            CzChrome.SetAnchors(_inspectBody.rectTransform, 0.07f, 0.28f, 0.93f, 0.74f);

            var play = CzChrome.PrimaryButton(_inspectRoot.GetComponent<RectTransform>(), "Play", "PLAY",
                0.08f, 0.92f, 0.12f, 0.24f, true);
            var close = CzChrome.PrimaryButton(_inspectRoot.GetComponent<RectTransform>(), "Close", "Close",
                0.25f, 0.75f, 0.03f, 0.10f, false);
            play.onClick.AddListener(OnInspectPlay);
            close.onClick.AddListener(() => _inspectRoot.SetActive(false));
        }

        private void BuildGroundPicker()
        {
            _groundRoot = CzChrome.GlassPanel(_safe, "Grounds").gameObject;
            CzChrome.SetAnchors(_groundRoot.GetComponent<RectTransform>(), 0.04f, 0.16f, 0.96f, 0.82f);
            _groundRoot.SetActive(false);

            var title = CzChrome.Label(_groundRoot.transform, "GT", "Where do you work?", CzFonts.Title, 40,
                FontStyle.Bold, CzTheme.Gold, TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(title.rectTransform, 0.05f, 0.90f, 0.95f, 0.98f);

            var scrollGo = new GameObject("GScroll");
            var srt = scrollGo.AddComponent<RectTransform>();
            srt.SetParent(_groundRoot.transform, false);
            CzChrome.SetAnchors(srt, 0.05f, 0.14f, 0.95f, 0.88f);
            var scroll = scrollGo.AddComponent<ScrollRect>();
            scroll.horizontal = false;
            scroll.vertical = true;

            var vp = new GameObject("VP");
            var vprt = vp.AddComponent<RectTransform>();
            vprt.SetParent(srt, false);
            CzChrome.Stretch(vprt);
            vp.AddComponent<RectMask2D>();
            vp.AddComponent<Image>().color = new Color(0, 0, 0, 0.01f);

            var content = new GameObject("C");
            _groundContent = content.AddComponent<RectTransform>();
            _groundContent.SetParent(vprt, false);
            _groundContent.anchorMin = new Vector2(0, 1);
            _groundContent.anchorMax = new Vector2(1, 1);
            _groundContent.pivot = new Vector2(0.5f, 1);
            var vlg = content.AddComponent<VerticalLayoutGroup>();
            vlg.spacing = 12;
            vlg.padding = new RectOffset(4, 4, 4, 4);
            vlg.childControlHeight = false;
            vlg.childControlWidth = true;
            vlg.childForceExpandWidth = true;
            content.AddComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            scroll.viewport = vprt;
            scroll.content = _groundContent;

            var cancel = CzChrome.PrimaryButton(_groundRoot.GetComponent<RectTransform>(), "CancelG", "Cancel",
                0.2f, 0.8f, 0.02f, 0.11f, false);
            cancel.onClick.AddListener(() => _groundRoot.SetActive(false));
        }

        private void BuildDraft()
        {
            _draftRoot = CzChrome.GlassPanel(_safe, "Draft").gameObject;
            CzChrome.SetAnchors(_draftRoot.GetComponent<RectTransform>(), 0.03f, 0.12f, 0.97f, 0.88f);
            CzChrome.Outline(_draftRoot, CzTheme.GoldDim, 1.5f);
            _draftRoot.SetActive(false);

            _draftTitle = CzChrome.Label(_draftRoot.transform, "DT", "Phase draft — pick one", CzFonts.Title, 40,
                FontStyle.Bold, CzTheme.Gold, TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(_draftTitle.rectTransform, 0.05f, 0.88f, 0.95f, 0.97f);

            var hint = CzChrome.Label(_draftRoot.transform, "DH",
                "Ballot / general entry. You must choose before playing.",
                CzFonts.Body, 15, FontStyle.Italic, CzTheme.Muted, TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(hint.rectTransform, 0.06f, 0.82f, 0.94f, 0.88f);

            var scrollGo = new GameObject("DScroll");
            var srt = scrollGo.AddComponent<RectTransform>();
            srt.SetParent(_draftRoot.transform, false);
            CzChrome.SetAnchors(srt, 0.05f, 0.06f, 0.95f, 0.80f);
            var scroll = scrollGo.AddComponent<ScrollRect>();
            scroll.horizontal = false;
            scroll.vertical = true;

            var vp = new GameObject("VP");
            var vprt = vp.AddComponent<RectTransform>();
            vprt.SetParent(srt, false);
            CzChrome.Stretch(vprt);
            vp.AddComponent<RectMask2D>();
            vp.AddComponent<Image>().color = new Color(0, 0, 0, 0.01f);

            var content = new GameObject("C");
            _draftContent = content.AddComponent<RectTransform>();
            _draftContent.SetParent(vprt, false);
            _draftContent.anchorMin = new Vector2(0, 1);
            _draftContent.anchorMax = new Vector2(1, 1);
            _draftContent.pivot = new Vector2(0.5f, 1);
            var vlg = content.AddComponent<VerticalLayoutGroup>();
            vlg.spacing = 14;
            vlg.padding = new RectOffset(4, 4, 8, 8);
            vlg.childControlHeight = false;
            vlg.childControlWidth = true;
            vlg.childForceExpandWidth = true;
            content.AddComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            scroll.viewport = vprt;
            scroll.content = _draftContent;
        }

        private void BuildWeather()
        {
            _weatherRoot = CzChrome.Panel(_safe, "Weather", new Color(0.07f, 0.09f, 0.12f, 0.99f)).gameObject;
            CzChrome.SetAnchors(_weatherRoot.GetComponent<RectTransform>(), 0.05f, 0.22f, 0.95f, 0.78f);
            CzChrome.Outline(_weatherRoot, new Color(0.40f, 0.50f, 0.65f), 1.5f);
            _weatherRoot.SetActive(false);

            var eyebrow = CzChrome.Label(_weatherRoot.transform, "WE", "OUTSIDE — WORLD WEATHER",
                CzFonts.Title, 14, FontStyle.Bold, new Color(0.55f, 0.72f, 0.9f), TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(eyebrow.rectTransform, 0.06f, 0.88f, 0.94f, 0.96f);

            _weatherTitle = CzChrome.Label(_weatherRoot.transform, "WT", "", CzFonts.Title, 34, FontStyle.Bold,
                CzTheme.Gold, TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(_weatherTitle.rectTransform, 0.06f, 0.72f, 0.94f, 0.88f);

            _weatherBody = CzChrome.Label(_weatherRoot.transform, "WB", "", CzFonts.Body, 28, FontStyle.Normal,
                CzTheme.Parchment, TextAnchor.UpperLeft);
            CzChrome.SetAnchors(_weatherBody.rectTransform, 0.08f, 0.28f, 0.92f, 0.70f);

            var ok = CzChrome.PrimaryButton(_weatherRoot.GetComponent<RectTransform>(), "WeatherOk", "Understood",
                0.12f, 0.88f, 0.08f, 0.20f, true);
            ok.onClick.AddListener(() =>
            {
                _weatherRoot.SetActive(false);
                OnDismissOutside?.Invoke();
            });
        }

        private void BuildTerminal()
        {
            _terminalRoot = CzChrome.GlassPanel(_safe, "Terminal").gameObject;
            CzChrome.SetAnchors(_terminalRoot.GetComponent<RectTransform>(), 0.05f, 0.25f, 0.95f, 0.75f);
            CzChrome.Outline(_terminalRoot, CzTheme.GoldDim, 1.5f);
            _terminalRoot.SetActive(false);

            _terminalTitle = CzChrome.Label(_terminalRoot.transform, "TT", "Season closed", CzFonts.Title, 38,
                FontStyle.Bold, CzTheme.Gold, TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(_terminalTitle.rectTransform, 0.06f, 0.70f, 0.94f, 0.90f);

            _terminalBody = CzChrome.Label(_terminalRoot.transform, "TB", "", CzFonts.Body, 28, FontStyle.Normal,
                CzTheme.Parchment, TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(_terminalBody.rectTransform, 0.08f, 0.35f, 0.92f, 0.68f);

            var again = CzChrome.PrimaryButton(_terminalRoot.GetComponent<RectTransform>(), "Again", "Back to setup",
                0.15f, 0.85f, 0.10f, 0.26f, true);
            again.onClick.AddListener(() =>
            {
                _terminalRoot.SetActive(false);
                OnRestart?.Invoke();
            });
        }

        private void BuildActSplash()
        {
            _actRoot = CzChrome.GlassPanel(_safe, "ActSplash").gameObject;
            CzChrome.SetAnchors(_actRoot.GetComponent<RectTransform>(), 0.04f, 0.20f, 0.96f, 0.80f);
            CzChrome.Outline(_actRoot, CzTheme.GoldDim, 1.5f);
            _actRoot.SetActive(false);

            var eyebrow = CzChrome.Label(_actRoot.transform, "AE", "THE SEASON TURNS", CzFonts.Title, 14,
                FontStyle.Bold, new Color(0.7f, 0.6f, 0.45f), TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(eyebrow.rectTransform, 0.06f, 0.82f, 0.94f, 0.92f);

            _actTitle = CzChrome.Label(_actRoot.transform, "AT", "", CzFonts.Title, 40, FontStyle.Bold,
                CzTheme.Gold, TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(_actTitle.rectTransform, 0.06f, 0.58f, 0.94f, 0.80f);

            _actBody = CzChrome.Label(_actRoot.transform, "AB", "", CzFonts.Body, 28, FontStyle.Normal,
                CzTheme.Parchment, TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(_actBody.rectTransform, 0.08f, 0.32f, 0.92f, 0.56f);

            var cont = CzChrome.PrimaryButton(_actRoot.GetComponent<RectTransform>(), "ActOk", "Continue",
                0.15f, 0.85f, 0.10f, 0.24f, true);
            cont.onClick.AddListener(() => _actRoot.SetActive(false));
        }

        private void BuildToast()
        {
            var toastPanel = CzChrome.Panel(_safe, "Toast", new Color(0.18f, 0.12f, 0.08f, 0.94f));
            CzChrome.SetAnchors(toastPanel, 0.06f, 0.72f, 0.94f, 0.78f);
            CzChrome.Outline(toastPanel.gameObject, CzTheme.GoldDim, 1f);
            _toast = CzChrome.Label(toastPanel, "ToastTxt", "", CzFonts.Body, 26, FontStyle.Normal,
                CzTheme.Gold, TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(_toast.rectTransform, 0.04f, 0.1f, 0.96f, 0.9f);
            toastPanel.gameObject.SetActive(false);
        }

        // ---------- public API ----------

        public void SetStatus(string text, bool ok = true)
        {
            if (_status == null) return;
            _status.text = text ?? "";
            _status.color = ok ? CzTheme.Good : CzTheme.Bad;
        }

        public void AppendLog(string line)
        {
            if (_log == null) return;
            if (string.IsNullOrEmpty(_log.text))
                _log.text = line;
            else
                _log.text = line + "\n" + _log.text;
            if (_log.text.Length > 2400)
                _log.text = _log.text.Substring(0, 2400) + "…";
        }

        public void ShowEvents(IList<LogEventView> events)
        {
            if (events == null) return;
            string latest = null;
            for (var i = events.Count - 1; i >= 0; i--)
            {
                var e = events[i];
                if (e == null || string.IsNullOrEmpty(e.text)) continue;
                AppendLog(e.text);
                if (latest == null) latest = e.text;
            }
            if (!string.IsNullOrEmpty(latest))
                ShowToast(latest);
        }

        public void ShowToast(string message, float seconds = 2.8f)
        {
            if (_toast == null || string.IsNullOrEmpty(message)) return;
            var panel = _toast.transform.parent != null ? _toast.transform.parent.gameObject : _toast.gameObject;
            panel.SetActive(true);
            _toast.text = message.Length > 120 ? message.Substring(0, 117) + "…" : message;
            _toastUntil = Time.unscaledTime + seconds;
        }

        public void ResetStageTracking()
        {
            _lastStageKey = null;
            _suppressNextActSplash = true;
        }

        public void Render(RenderView view, string statusLine)
        {
            _view = view ?? new RenderView();
            SetStatus(statusLine, true);

            if (_view.over)
            {
                if (_actRoot != null) _actRoot.SetActive(false);
                ShowTerminal();
                return;
            }
            _terminalRoot.SetActive(false);

            MaybeShowActSplash();

            if (_view.pendingOutside != null)
                ShowWeather(_view.pendingOutside);
            else
                _weatherRoot.SetActive(false);

            if (_view.pendingDraft?.options != null && _view.pendingDraft.options.Count > 0)
                ShowDraft(_view.pendingDraft);
            else
                _draftRoot.SetActive(false);

            PaintHud();
            PaintGoalStrip();

            if (_endWeekLabel != null)
            {
                if (_view.pendingDraft != null)
                    _endWeekLabel.text = "DRAFT FIRST";
                else if (_view.pendingOutside != null)
                    _endWeekLabel.text = "WEATHER…";
                else
                    _endWeekLabel.text = "END WEEK";
            }
            if (_endWeekBtn != null)
                _endWeekBtn.interactable = !_view.over
                    && _view.pendingDraft == null
                    && _view.pendingOutside == null;

            RebuildHandIfNeeded();
        }

        private void PaintHud()
        {
            var id = _view.identity;
            var led = _view.ledger;
            var persona = id?.persona ?? "—";
            // "The Teacher" → "Teacher" in compact HUD
            var who = System.Text.RegularExpressions.Regex.Replace(persona, @"^The\s+", "",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase).Trim();
            if (string.IsNullOrEmpty(who)) who = persona;
            var issue = id?.issue ?? "";
            var stage = string.IsNullOrEmpty(_view.stageLabel) ? (_view.stage ?? "—") : _view.stageLabel;

            _whoName.text = who.ToUpperInvariant();
            _whoIssue.text = issue;
            _stageChip.text = TruncUpper(stage, 18);

            if (led == null)
            {
                for (int i = 0; i < _pips.Length; i++)
                    _pips[i].gameObject.SetActive(false);
                _cash.text = "—";
                _weekLabel.text = "";
                _sigLabel.text = "";
                _fieldAp.text = "";
                _debtChip.text = "";
                _ballotChip.text = "";
                return;
            }

            int apMax = Mathf.Clamp(led.apMax > 0 ? led.apMax : 3, 1, _pips.Length);
            int ap = Mathf.Clamp(led.ap, 0, apMax);
            for (int i = 0; i < _pips.Length; i++)
            {
                if (i >= apMax)
                {
                    _pips[i].gameObject.SetActive(false);
                    continue;
                }
                _pips[i].gameObject.SetActive(true);
                _pips[i].sprite = i < ap ? GothicArt.PipOn : GothicArt.PipOff;
            }

            _fieldAp.text = led.fieldAp > 0 ? $"+{led.fieldAp}f" : "";
            _cash.text = "$" + led.money;
            _debtChip.text = led.debt > 0 ? $"−${led.debt}" : "";

            int week = led.week > 0 ? led.week : _view.stageWeek;
            int total = _view.weeksTotal > 0 ? _view.weeksTotal : 12;
            _weekLabel.text = $"W{week}/{total}";
            float weekPct = Mathf.Clamp01(week / (float)Mathf.Max(1, total));
            if (_weekFill != null)
            {
                var rt = _weekFill.rectTransform;
                rt.anchorMax = new Vector2(weekPct, 1f);
            }

            int need = Mathf.Max(1, led.sigNeed);
            _sigLabel.text = led.ballot ? "BALLOT" : $"Sig {led.signatures}/{led.sigNeed}";
            float sigPct = led.ballot ? 1f : Mathf.Clamp01(led.signatures / (float)need);
            if (_sigFill != null)
            {
                var rt = _sigFill.rectTransform;
                rt.anchorMax = new Vector2(sigPct, 1f);
                _sigFill.color = led.ballot ? CzTheme.SageLite : CzTheme.Gold;
            }

            if (led.ballot)
                _ballotChip.text = "ON BALLOT";
            else if ((_view.stage ?? "").ToLowerInvariant() == "session")
                _ballotChip.text = "SEAT";
            else if ((_view.stage ?? "").ToLowerInvariant() is "waiting" or "interim")
                _ballotChip.text = "WAIT";
            else
                _ballotChip.text = led.volPool > 0 ? $"Vol {led.volPool}" : $"N{led.nameID}";
        }

        private static string TruncUpper(string s, int n)
        {
            if (string.IsNullOrEmpty(s)) return "—";
            s = s.ToUpperInvariant();
            return s.Length <= n ? s : s.Substring(0, n - 1) + "…";
        }

        private void MaybeShowActSplash()
        {
            if (_actRoot == null || _view == null) return;
            var key = string.IsNullOrEmpty(_view.stage) ? _view.stageLabel : _view.stage;
            if (string.IsNullOrEmpty(key)) return;

            if (_suppressNextActSplash || string.IsNullOrEmpty(_lastStageKey))
            {
                _lastStageKey = key;
                _suppressNextActSplash = false;
                return;
            }

            if (key == _lastStageKey) return;
            _lastStageKey = key;

            if (_view.pendingOutside != null || _view.pendingDraft != null) return;

            string title;
            string body;
            switch ((_view.stage ?? "").ToLowerInvariant())
            {
                case "general":
                    title = "Act II · General";
                    body = "The primary is behind you. Turnout and the field matter more than club math.";
                    break;
                case "session":
                    title = "Act III · Session";
                    body = "Sworn in. The capitol has its own weather — bills, pressure, and favors.";
                    break;
                case "waiting":
                case "interim":
                    title = "Act IV · Waiting season";
                    body = "Off-season. Rebuild, retool, or wait for the next filing.";
                    break;
                case "primary":
                    title = "Act I · Primary";
                    body = "A new filing season. Signatures, doors, and the dual ballot path.";
                    break;
                default:
                    title = _view.stageLabel ?? "New stage";
                    body = "The calendar moves. Keep your kit ready.";
                    break;
            }

            _actTitle.text = title;
            _actBody.text = body;
            _actRoot.SetActive(true);
            ShowToast(title, 2f);
        }

        private void ShowWeather(PendingOutsideView o)
        {
            _weatherRoot.SetActive(true);
            _inspectRoot.SetActive(false);
            _groundRoot.SetActive(false);
            _weatherTitle.text = o.n ?? "Outside event";
            _weatherBody.text = o.text ?? "";
        }

        private void ShowDraft(PendingDraftView draft)
        {
            _draftRoot.SetActive(true);
            _inspectRoot.SetActive(false);
            _groundRoot.SetActive(false);
            _draftTitle.text = $"Phase draft · phase {draft.phase}";

            foreach (Transform child in _draftContent)
                Destroy(child.gameObject);

            var catalog = CardCatalog.Instance;
            for (var i = 0; i < draft.options.Count; i++)
            {
                var opt = draft.options[i];
                catalog.TryGet(opt.cardId, out var def);
                var label = $"{opt.name ?? def?.cardName ?? opt.cardId}\n{opt.risk ?? def?.risk ?? ""} · {opt.cardId}";
                var b = MakeListButton(_draftContent, "D" + i, label, 96);
                var idx = i;
                b.onClick.AddListener(() =>
                {
                    _draftRoot.SetActive(false);
                    OnDraftPick?.Invoke(idx);
                });
            }
        }

        private void ShowTerminal()
        {
            _terminalRoot.SetActive(true);
            _draftRoot.SetActive(false);
            _weatherRoot.SetActive(false);
            _inspectRoot.SetActive(false);
            _groundRoot.SetActive(false);
            _terminalTitle.text = "Season closed";
            _terminalBody.text = (string.IsNullOrEmpty(_view.outcome)
                ? "The Record notes an ending."
                : _view.outcome.Replace('_', ' '))
                + "\n\nCareer autosaved. MENU → setup, or Continue career on title.";
        }

        private void RebuildHandIfNeeded()
        {
            var sig = HandSignature(_view);
            if (sig == _handSignature && _cardPool != null && _cardPool.Active.Count > 0)
                return;
            _handSignature = sig;
            RebuildHand();
        }

        private static string HandSignature(RenderView view)
        {
            if (view?.actions == null || view.pendingDraft != null) return "blocked";
            var sb = new System.Text.StringBuilder(view.actions.Count * 12);
            foreach (var a in view.actions)
            {
                sb.Append(a.handIndex).Append(':').Append(a.cardId).Append('|');
                if (a.approxOdds.HasValue) sb.Append(a.approxOdds.Value.ToString("0.00"));
                sb.Append(';');
            }
            return sb.ToString();
        }

        private void RebuildHand()
        {
            if (_cardPool == null) return;
            _cardPool.ReleaseAll();
            if (_view?.actions == null || _view.pendingDraft != null) return;

            var catalog = CardCatalog.Instance;
            foreach (var a in _view.actions)
            {
                catalog.TryGet(a.cardId, out var def);
                var go = _cardPool.Rent(a.cardId ?? "card");
                var tile = CardTileView.Ensure(go);
                var captured = a;
                var capturedDef = def;
                tile.Bind(a, def, () => OpenInspect(captured, capturedDef));
            }
        }

        private void OpenInspect(ActionView action, CardDefinition def)
        {
            if (_view?.pendingDraft != null || _view?.pendingOutside != null) return;
            _selected = action;
            _inspectRoot.SetActive(true);
            _groundRoot.SetActive(false);

            _inspectTitle.text = action.name ?? def?.cardName ?? action.cardId;
            var odds = action.approxOdds.HasValue ? $"  ·  p≈{action.approxOdds.Value:0%}" : "";
            _inspectMeta.text =
                $"{action.costLabel ?? def?.CostLabel ?? "—"}  ·  {action.risk ?? def?.risk}" +
                (action.field ? "  ·  FIELD" : "") +
                (action.camp ? "  ·  CAMP" : "") + odds;

            var body = action.desc;
            if (string.IsNullOrEmpty(body)) body = def?.description;
            if (string.IsNullOrEmpty(body)) body = "No description.";
            if (!string.IsNullOrEmpty(action.tag)) body = "“" + action.tag + "”\n\n" + body;
            if (!string.IsNullOrEmpty(action.cardId)) body += "\n\n[" + action.cardId + "]";
            _inspectBody.text = body;
        }

        private void OnInspectPlay()
        {
            if (_selected == null) return;
            if (_selected.field)
            {
                OpenGroundPicker(_selected);
                return;
            }
            _inspectRoot.SetActive(false);
            OnPlayAction?.Invoke(_selected, null);
        }

        private void OpenGroundPicker(ActionView action)
        {
            _inspectRoot.SetActive(false);
            _groundRoot.SetActive(true);
            foreach (Transform child in _groundContent)
                Destroy(child.gameObject);

            var grounds = _view?.grounds;
            if (grounds == null || grounds.Count == 0)
            {
                _groundRoot.SetActive(false);
                OnPlayAction?.Invoke(action, null);
                return;
            }

            foreach (var g in grounds)
            {
                var label = $"{g.n}\nyou {g.rapport:0}  ·  rival {g.rivalRap:0}  ·  pool {g.pool}";
                var b = MakeListButton(_groundContent, g.id, label, 88);
                var capturedG = g;
                var capturedA = action;
                b.onClick.AddListener(() =>
                {
                    _groundRoot.SetActive(false);
                    OnPlayAction?.Invoke(capturedA, capturedG.id);
                });
            }
        }

        private static Button MakeListButton(RectTransform parent, string name, string label, float height)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(Image), typeof(Button), typeof(LayoutElement));
            go.transform.SetParent(parent, false);
            var le = go.GetComponent<LayoutElement>();
            le.preferredHeight = height;
            le.minHeight = height;
            go.GetComponent<Image>().color = CzTheme.Oxblood;
            var btn = go.GetComponent<Button>();
            btn.targetGraphic = go.GetComponent<Image>();
            CzChrome.Outline(go, CzTheme.GoldDim, 1f);
            var text = CzChrome.Label(go.transform, "Label", label, CzFonts.BodyBold, 28, FontStyle.Bold,
                CzTheme.Gold, TextAnchor.MiddleCenter);
            CzChrome.SetAnchors(text.rectTransform, 0.04f, 0.08f, 0.96f, 0.92f);
            return btn;
        }
    }
}
