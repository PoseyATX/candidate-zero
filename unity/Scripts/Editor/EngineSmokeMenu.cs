// Editor menu: run Track B smoke and SHOW results (not just Console).
// Menu: Candidate Zero → Run Engine Smoke (Jint)
//       Candidate Zero → Open Play Mode Smoke (Game view HUD)
#if UNITY_EDITOR
using System.IO;
using System.Text;
using UnityEditor;
using UnityEngine;
using CandidateZero.Runtime;

namespace CandidateZero.EditorTools
{
    public static class EngineSmokeMenu
    {
        private const string BundlePath =
            "Assets/CandidateZero/Resources/candidate-zero-engine.js.txt";

        [MenuItem("Candidate Zero/Open Play Mode Card Table")]
        public static void EnterPlayModeSmoke()
        {
            if (!EditorApplication.isPlaying)
            {
                EditorApplication.isPlaying = true;
                Debug.Log("[Candidate Zero] Entering Play Mode — card table HUD (engine + catalog).");
            }
            else
            {
                Debug.Log("[Candidate Zero] Already in Play Mode — Game view should show the card table.");
            }
        }

        [MenuItem("Candidate Zero/Run Engine Smoke (Jint)")]
        public static void RunSmoke()
        {
            try
            {
                if (!File.Exists(BundlePath))
                {
                    Debug.LogError(
                        "[Candidate Zero] Missing " + BundlePath +
                        " — copy from TS repo after npm run build:engine.");
                    EngineSmokeWindow.ShowError("Missing engine bundle:\n" + BundlePath);
                    return;
                }

                var source = File.ReadAllText(BundlePath);
                Debug.Log($"[Candidate Zero] Loading bundle ({source.Length} chars)…");

                var engine = new EngineBridge(source);
                const int seed = 42;
                var snap = engine.NewGame(seed);
                var view = engine.View(snap);
                var apply = engine.Apply(snap, "{ type:'endWeek' }");
                var setup = engine.SetupOptions();

                var sb = new StringBuilder();
                sb.AppendLine("TRACK B SMOKE — OK");
                sb.AppendLine("Jint loaded the pure TS engine. Rules did NOT run in C#.");
                sb.AppendLine();
                sb.AppendLine($"seed = {seed}");
                sb.AppendLine($"bundle = {source.Length} chars");
                sb.AppendLine();
                sb.AppendLine("── view (after newGame) ──");
                sb.AppendLine(Trim(view, 2500));
                sb.AppendLine();
                sb.AppendLine("── apply endWeek ──");
                sb.AppendLine(Trim(apply, 2000));
                sb.AppendLine();
                sb.AppendLine("── setupOptions (head) ──");
                sb.AppendLine(Trim(setup, 1200));
                sb.AppendLine();
                sb.AppendLine("This menu only proves the bridge. For the Game view HUD:");
                sb.AppendLine("  Candidate Zero → Open Play Mode Smoke (Game view HUD)");
                sb.AppendLine("or press Play.");

                Debug.Log("[Candidate Zero] Track B Editor smoke COMPLETE — Jint + TS engine OK.");
                EngineSmokeWindow.ShowResult(sb.ToString());
            }
            catch (System.Exception ex)
            {
                Debug.LogError("[Candidate Zero] Track B Editor smoke FAILED:\n" + ex);
                EngineSmokeWindow.ShowError(ex.ToString());
                if (Application.isBatchMode)
                    EditorApplication.Exit(1);
            }
        }

        [MenuItem("Candidate Zero/Sync Engine Bundle From TS Repo")]
        public static void SyncBundle()
        {
            var hostRoot = Path.GetFullPath(Path.Combine(Application.dataPath, ".."));
            var candidates = new[]
            {
                Path.GetFullPath(Path.Combine(hostRoot, "..", "candidate-zero", "unity", "engine", "candidate-zero-engine.js")),
                Path.GetFullPath(Path.Combine(hostRoot, "..", "candidate-zero", "dist-engine", "candidate-zero-engine.iife.js")),
            };

            string src = null;
            foreach (var c in candidates)
            {
                if (File.Exists(c)) { src = c; break; }
            }

            if (src == null)
            {
                EngineSmokeWindow.ShowError(
                    "Could not find engine bundle.\n\n" +
                    "Expected:\n../candidate-zero/unity/engine/candidate-zero-engine.js\n\n" +
                    "In the TS repo run: npm run build:engine");
                return;
            }

            var destDir = Path.Combine(Application.dataPath, "CandidateZero", "Resources");
            Directory.CreateDirectory(destDir);
            var dest = Path.Combine(destDir, "candidate-zero-engine.js.txt");
            File.Copy(src, dest, true);
            AssetDatabase.Refresh();
            Debug.Log($"[Candidate Zero] Synced engine bundle:\n  {src}\n→ {dest}");
            EngineSmokeWindow.ShowResult("Engine bundle synced.\n\n" + dest);
        }

        private static string Trim(string s, int max) =>
            string.IsNullOrEmpty(s) ? "(empty)" :
            s.Length <= max ? s : s.Substring(0, max) + "…";
    }

    /// <summary>Editor window so smoke results are visible without digging in Console.</summary>
    public class EngineSmokeWindow : EditorWindow
    {
        private string _body = "";
        private Vector2 _scroll;
        private bool _error;

        public static void ShowResult(string body)
        {
            if (Application.isBatchMode)
            {
                Debug.Log(body);
                return;
            }
            var w = GetWindow<EngineSmokeWindow>(true, "Candidate Zero — Engine Smoke", true);
            w._body = body;
            w._error = false;
            w.minSize = new Vector2(520, 420);
            w.Show();
            w.Focus();
        }

        public static void ShowError(string body)
        {
            if (Application.isBatchMode)
            {
                Debug.LogError(body);
                return;
            }
            var w = GetWindow<EngineSmokeWindow>(true, "Candidate Zero — Smoke FAILED", true);
            w._body = body;
            w._error = true;
            w.minSize = new Vector2(520, 420);
            w.Show();
            w.Focus();
        }

        private void OnGUI()
        {
            var header = _error ? "Smoke failed" : "Smoke OK — pure TS engine via Jint";
            var c = _error ? new Color(1f, 0.45f, 0.4f) : new Color(0.55f, 0.85f, 0.55f);
            var old = GUI.color;
            GUI.color = c;
            GUILayout.Label(header, EditorStyles.boldLabel);
            GUI.color = old;

            GUILayout.Space(6);
            _scroll = EditorGUILayout.BeginScrollView(_scroll);
            EditorGUILayout.TextArea(_body ?? "", GUILayout.ExpandHeight(true));
            EditorGUILayout.EndScrollView();

            GUILayout.Space(8);
            using (new EditorGUILayout.HorizontalScope())
            {
                if (GUILayout.Button("Open Play Mode HUD", GUILayout.Height(32)))
                {
                    EngineSmokeMenu.EnterPlayModeSmoke();
                }
                if (GUILayout.Button("Copy to clipboard", GUILayout.Height(32)))
                {
                    EditorGUIUtility.systemCopyBuffer = _body ?? "";
                }
            }
            GUILayout.Space(4);
            EditorGUILayout.HelpBox(
                "The Game view stays empty during this Editor smoke — that is expected. " +
                "Press “Open Play Mode HUD” (or Play) to see the walnut on-screen board.",
                MessageType.Info);
        }
    }
}
#endif
