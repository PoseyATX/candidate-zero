// Candidate Zero — sample controller ("engine in Unity, hello world")
// -------------------------------------------------------------------------
// The smallest possible proof the binding works: load the engine bundle,
// start a seeded game, render the view to the console, and play the first
// available action. Drop this on a GameObject, assign the bundle TextAsset,
// press Play. Once this logs a game state, the rules engine is live in Unity
// and the rest is UI over the same newGame/view/apply loop.
//
// See docs/UNITY-SETUP.md for the click-by-click.
// -------------------------------------------------------------------------
using UnityEngine;
using CandidateZero.Runtime;

public class GameController : MonoBehaviour
{
    [Tooltip("unity/engine/candidate-zero-engine.js imported as a TextAsset " +
             "(rename to .txt or .bytes so Unity imports it as text).")]
    [SerializeField] private TextAsset engineBundle;

    [SerializeField] private int seed = 42;

    private IEngineBridge _engine;
    private string _snapshot;

    private void Start()
    {
        if (engineBundle == null)
        {
            Debug.LogError("GameController: assign the engine bundle TextAsset in the inspector.");
            return;
        }

        _engine = new EngineBridge(engineBundle.text);
        _snapshot = _engine.NewGame(seed);

        Debug.Log($"[Candidate Zero] engine up. Initial view:\n{_engine.View(_snapshot)}");

        // Play the first available action as a smoke check of the loop.
        // (In the real game this is driven by the player's card taps.)
        var view = JsonUtility.FromJson<MinimalView>(_engine.View(_snapshot));
        if (view != null && view.actions != null && view.actions.Length > 0)
        {
            var a = view.actions[0];
            var cmd = a.field && view.grounds != null && view.grounds.Length > 0
                ? $"{{ type:'play', handIndex:{a.handIndex}, groundId:'{view.grounds[0].id}' }}"
                : $"{{ type:'play', handIndex:{a.handIndex} }}";
            var result = _engine.Apply(_snapshot, cmd);
            Debug.Log($"[Candidate Zero] played '{a.name}'. Apply result:\n{result}");
        }
    }

    // Minimal shapes just for this smoke check; a real UI would model the
    // full RenderView from docs/ENGINE-API.md (or use Newtonsoft for it).
    [System.Serializable] private class MinimalView { public Action[] actions; public Ground[] grounds; }
    [System.Serializable] private class Action { public int handIndex; public string name; public bool field; }
    [System.Serializable] private class Ground { public string id; }
}
