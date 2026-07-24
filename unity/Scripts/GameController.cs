// Candidate Zero host — title → setup → play (matches TS screen flow).
// Rules: TS/Jint only. Presentation: Unity 9:16, TS visual language.
using UnityEngine;
using CandidateZero;
using CandidateZero.Content;
using CandidateZero.HostData;
using CandidateZero.Runtime;
using CandidateZero.UI;

public class GameController : MonoBehaviour
{
    public const string ResourcesBundleName = "candidate-zero-engine.js";

    [SerializeField] private TextAsset engineBundle;
    [SerializeField] private int seed = 42;

    private IEngineBridge _engine;
    private string _snapshot;
    private CardTableHud _hud;
    private SetupScreen _setup;
    private TitleScreen _title;
    private RenderView _view;
    private bool _inGame;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void AutoSpawnIfMissing()
    {
        if (FindFirstObjectByType<GameController>(FindObjectsInactive.Include) != null) return;
        var go = new GameObject("CandidateZeroHost");
        go.AddComponent<GameController>();
    }

    private void Start()
    {
        var old = FindFirstObjectByType<SmokeHud>(FindObjectsInactive.Include);
        if (old != null) Destroy(old.gameObject);

        if (!ResolveBundle())
        {
            Debug.LogError("GameController: engine bundle missing.");
            return;
        }

        try
        {
            CzFonts.Ensure();
            GothicArt.Ensure();
            IconCatalog.Ensure();
            CardCatalog.Reload();
            _engine = new EngineBridge(engineBundle.text);
            Debug.Log(
                $"[Candidate Zero] Ready · catalog={CardCatalog.Instance.Count} · " +
                $"engine={engineBundle.text.Length} chars · icons loaded");

            _hud = CardTableHud.Ensure();
            WireHud();
            SetHudVisible(false);

            _setup = SetupScreen.Ensure();
            WireSetup();
            _setup.Hide();

            _title = TitleScreen.Ensure();
            _title.OnBeginClimb = OpenSetupFromTitle;
            _title.OnHowToPlay = ShowHowTo;
            _title.Show();
        }
        catch (System.Exception ex)
        {
            Debug.LogError("[Candidate Zero] Startup failed:\n" + ex);
        }
    }

    private void WireSetup()
    {
        if (_setup == null) return;
        _setup.OnBegin = BeginCampaign;
        _setup.OnContinueSave = ContinueCareer;
        _setup.OnAbandonCareer = AbandonCareer;
    }

    private void WireHud()
    {
        if (_hud == null) return;
        _hud.OnPlayAction = PlayAction;
        _hud.OnDraftPick = DraftPick;
        _hud.OnDismissOutside = DismissOutside;
        _hud.OnEndWeek = EndWeek;
        _hud.OnRestart = RestartToTitle;
    }

    private bool ResolveBundle()
    {
        if (engineBundle != null && !string.IsNullOrEmpty(engineBundle.text))
            return true;
        engineBundle = Resources.Load<TextAsset>(ResourcesBundleName)
                       ?? Resources.Load<TextAsset>("candidate-zero-engine");
        return engineBundle != null && !string.IsNullOrEmpty(engineBundle.text);
    }

    private void OpenSetupFromTitle()
    {
        if (_title != null) _title.Hide();
        OpenSetup();
    }

    private void ShowHowTo()
    {
        // Lightweight diegetic blurb — full tutorial can expand later
        Debug.Log("[Candidate Zero] How to Play: 2 AP/week, play cards, End Week, make ballot by W8.");
        if (_title != null)
        {
            // Reuse toast path once in game; on title use status via temporary overlay text
        }
        // For now open setup with a note — or keep title and log
        OpenSetupFromTitle();
    }

    private void OpenSetup()
    {
        _inGame = false;
        SetHudVisible(false);
        if (_title != null) _title.Hide();

        try
        {
            var optsJson = _engine.SetupOptions();
            var opts = SetupOptionsView.Parse(optsJson);
            var seedHint = CareerSave.HasSave ? CareerSave.LastSeed : seed;
            _setup = SetupScreen.Ensure();
            WireSetup();
            _setup.Show(opts, seedHint, CareerSave.HasSave);
        }
        catch (System.Exception ex)
        {
            Debug.LogError("[Candidate Zero] OpenSetup failed:\n" + ex);
        }
    }

    private void BeginCampaign(SetupSelectionDto setup, int useSeed)
    {
        try
        {
            seed = useSeed > 0 ? useSeed : 42;
            var setupJson = setup != null ? setup.ToJsonObject() : null;
            _snapshot = _engine.NewGame(seed, setupJson);
            if (string.IsNullOrEmpty(_snapshot))
                throw new System.Exception("newGame returned empty snapshot");

            if (_hud != null) _hud.ResetStageTracking();
            EnterPlay($"Campaign · seed {seed}");
            if (_hud != null)
            {
                _hud.AppendLog($"newGame persona={setup?.personaId}");
                _hud.ShowToast("Campaign open — swipe the hand, tap a card", 3f);
            }
            Autosave();
        }
        catch (System.Exception ex)
        {
            Fail(ex, forceShowHud: true);
        }
    }

    private void AbandonCareer()
    {
        CareerSave.Clear();
        Debug.Log("[Candidate Zero] Career save abandoned.");
    }

    private void ContinueCareer()
    {
        try
        {
            if (!CareerSave.HasSave) return;
            _snapshot = _engine.Deserialize(CareerSave.Read());
            seed = CareerSave.LastSeed;
            if (_hud != null) _hud.ResetStageTracking();
            EnterPlay($"Resumed · seed {seed}");
            if (_hud != null)
            {
                _hud.AppendLog("Loaded career save");
                _hud.ShowToast("Career resumed", 2.5f);
            }
        }
        catch (System.Exception ex)
        {
            CareerSave.Clear();
            Fail(ex, forceShowHud: true);
            OpenSetup();
        }
    }

    private void EnterPlay(string status)
    {
        _inGame = true;
        if (_title != null) _title.Hide();
        if (_setup != null) _setup.Hide();
        SetHudVisible(true);
        WireHud();
        Refresh(status);
    }

    private void SetHudVisible(bool visible)
    {
        if (_hud == null) return;
        _hud.gameObject.SetActive(visible);
        var canvas = _hud.GetComponentInChildren<Canvas>(true);
        if (canvas != null)
        {
            canvas.gameObject.SetActive(visible);
            if (visible) canvas.sortingOrder = 50;
        }
    }

    private void Refresh(string status)
    {
        if (_engine == null || string.IsNullOrEmpty(_snapshot) || _hud == null) return;
        if (!_hud.gameObject.activeInHierarchy) return;

        var json = _engine.View(_snapshot);
        _view = RenderView.Parse(json);
        _hud.Render(_view, status);
        if (_inGame) Autosave();
    }

    private void Autosave()
    {
        try
        {
            if (string.IsNullOrEmpty(_snapshot)) return;
            CareerSave.Write(_engine.Serialize(_snapshot), seed);
        }
        catch (System.Exception ex)
        {
            Debug.LogWarning("Autosave failed: " + ex.Message);
        }
    }

    private void PlayAction(ActionView action, string groundId)
    {
        if (action == null) return;
        try
        {
            var cmd = action.field && !string.IsNullOrEmpty(groundId)
                ? $"{{ type:'play', handIndex:{action.handIndex}, groundId:'{groundId}' }}"
                : $"{{ type:'play', handIndex:{action.handIndex} }}";
            ApplyRaw(cmd, action.field && groundId != null
                ? $"Played {action.name} @ {groundId}"
                : $"Played {action.name}");
        }
        catch (System.Exception ex) { Fail(ex); }
    }

    private void DraftPick(int option)
    {
        try { ApplyRaw($"{{ type:'draft', option:{option} }}", $"Draft #{option}"); }
        catch (System.Exception ex) { Fail(ex); }
    }

    private void DismissOutside()
    {
        try { ApplyRaw("{ type:'dismissOutside' }", "Weather dismissed"); }
        catch (System.Exception ex) { Fail(ex); }
    }

    private void EndWeek()
    {
        try { ApplyRaw("{ type:'endWeek' }", "End week"); }
        catch (System.Exception ex) { Fail(ex); }
    }

    private void RestartToTitle()
    {
        _inGame = false;
        SetHudVisible(false);
        if (_setup != null) _setup.Hide();
        _title = TitleScreen.Ensure();
        _title.OnBeginClimb = OpenSetupFromTitle;
        _title.OnHowToPlay = ShowHowTo;
        _title.Show();
    }

    private void ApplyRaw(string cmd, string okLog)
    {
        var raw = _engine.Apply(_snapshot, cmd);
        var result = ApplyResult.Parse(raw);
        if (!string.IsNullOrEmpty(result.SnapshotJson))
            _snapshot = result.SnapshotJson;

        if (result.events != null && result.events.Count > 0)
            _hud.ShowEvents(result.events);

        if (result.ok)
        {
            _hud.AppendLog(okLog);
            Refresh(okLog + $" · seed {seed}");
        }
        else
        {
            _hud.AppendLog($"Rejected — {result.reason}");
            _hud.SetStatus(result.reason ?? "Rejected", false);
            Refresh($"Live · seed {seed}");
        }
    }

    private void Fail(System.Exception ex, bool forceShowHud = false)
    {
        Debug.LogError("[Candidate Zero] " + ex);
        if (forceShowHud)
        {
            if (_setup != null) _setup.Hide();
            if (_title != null) _title.Hide();
            SetHudVisible(true);
            WireHud();
        }
        if (_hud != null && _hud.gameObject.activeInHierarchy)
        {
            _hud.SetStatus("Error: " + ex.Message, false);
            _hud.AppendLog(ex.ToString());
        }
    }
}
