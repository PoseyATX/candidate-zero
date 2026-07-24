// Runtime full-screen HUD for Track B smoke — pure presentation over engine JSON.
// No rules here. Built with uGUI at runtime so no scene wiring is required.
using System.Text;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;

namespace CandidateZero.UI
{
    public sealed class SmokeHud : MonoBehaviour
    {
        private Text _title;
        private Text _status;
        private Text _ledger;
        private Text _actions;
        private Text _log;

        public System.Action OnEndWeek;
        public System.Action OnPlayFirst;
        public System.Action OnRestart;

        public static SmokeHud Ensure()
        {
            var existing = FindFirstObjectByType<SmokeHud>();
            if (existing != null) return existing;
            var go = new GameObject("CandidateZeroSmokeHud");
            DontDestroyOnLoad(go);
            return go.AddComponent<SmokeHud>();
        }

        private void Awake()
        {
            PaintCamera();
            Build();
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
            cam.backgroundColor = new Color(0.08f, 0.06f, 0.05f, 1f);
            cam.orthographic = true;
            cam.orthographicSize = 5f;
            cam.transform.position = new Vector3(0, 0, -10f);
            // Hide any leftover 3D sky / horizon feel
            if (cam.GetComponent<AudioListener>() == null)
                cam.gameObject.AddComponent<AudioListener>();
        }

        private void Build()
        {
            var canvasGo = new GameObject("Canvas");
            canvasGo.transform.SetParent(transform, false);
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 100;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            scaler.matchWidthOrHeight = 0.55f;
            canvasGo.AddComponent<GraphicRaycaster>();

            if (FindFirstObjectByType<EventSystem>() == null)
            {
                var es = new GameObject("EventSystem");
                es.AddComponent<EventSystem>();
                es.AddComponent<StandaloneInputModule>();
            }

            var root = Panel(canvasGo.transform, "Root", new Color(0.10f, 0.08f, 0.07f, 1f));
            StretchFull(root);

            // Vertical stack via anchors (fractions of screen)
            _title = MakeSection(root, "Title", 0.94f, 1.00f, 36, FontStyle.Bold,
                new Color(0.92f, 0.82f, 0.55f), TextAnchor.MiddleCenter);
            _title.text = "CANDIDATE ZERO";

            _status = MakeSection(root, "Status", 0.89f, 0.94f, 22, FontStyle.Normal,
                new Color(0.75f, 0.88f, 0.70f), TextAnchor.MiddleCenter);
            _status.text = "Starting engine…";

            _ledger = MakeSection(root, "Ledger", 0.72f, 0.88f, 20, FontStyle.Normal,
                new Color(0.95f, 0.92f, 0.86f), TextAnchor.UpperLeft,
                new Color(0.16f, 0.12f, 0.10f, 1f));
            _ledger.text = "…";

            _actions = MakeSection(root, "Actions", 0.48f, 0.71f, 18, FontStyle.Normal,
                new Color(0.90f, 0.86f, 0.78f), TextAnchor.UpperLeft,
                new Color(0.14f, 0.11f, 0.09f, 1f));
            _actions.text = "…";

            _log = MakeSection(root, "Log", 0.12f, 0.47f, 17, FontStyle.Normal,
                new Color(0.78f, 0.74f, 0.68f), TextAnchor.UpperLeft,
                new Color(0.12f, 0.10f, 0.08f, 1f));
            _log.text = "Waiting…";

            // Buttons 0–0.11
            var btnRow = new GameObject("Buttons").AddComponent<RectTransform>();
            btnRow.SetParent(root, false);
            btnRow.anchorMin = new Vector2(0.04f, 0.02f);
            btnRow.anchorMax = new Vector2(0.96f, 0.11f);
            btnRow.offsetMin = Vector2.zero;
            btnRow.offsetMax = Vector2.zero;

            var play = MakeButton(btnRow, "PlayFirst", "Play first", 0f, 0.32f);
            var end = MakeButton(btnRow, "EndWeek", "End week", 0.34f, 0.66f);
            var restart = MakeButton(btnRow, "Restart", "New seed", 0.68f, 1f);

            play.onClick.AddListener(() => OnPlayFirst?.Invoke());
            end.onClick.AddListener(() => OnEndWeek?.Invoke());
            restart.onClick.AddListener(() => OnRestart?.Invoke());
        }

        public void SetStatus(string text, bool ok = true)
        {
            if (_status == null) return;
            _status.text = text;
            _status.color = ok
                ? new Color(0.75f, 0.88f, 0.70f)
                : new Color(0.95f, 0.45f, 0.40f);
        }

        public void SetLedger(string text)
        {
            if (_ledger != null) _ledger.text = text ?? "";
        }

        public void SetActions(string text)
        {
            if (_actions != null) _actions.text = text ?? "";
        }

        public void SetLog(string text)
        {
            if (_log != null) _log.text = text ?? "";
        }

        public void AppendLog(string line)
        {
            if (_log == null) return;
            if (string.IsNullOrEmpty(_log.text) || _log.text == "Waiting…")
                _log.text = line;
            else
                _log.text = line + "\n" + _log.text;
            if (_log.text.Length > 3500)
                _log.text = _log.text.Substring(0, 3500) + "…";
        }

        // --- helpers ---

        private static Text MakeSection(
            RectTransform parent,
            string name,
            float yMin,
            float yMax,
            int fontSize,
            FontStyle style,
            Color textColor,
            TextAnchor align,
            Color? panelColor = null)
        {
            RectTransform host = parent;
            if (panelColor.HasValue)
            {
                host = Panel(parent, name + "Panel", panelColor.Value);
                host.anchorMin = new Vector2(0.04f, yMin);
                host.anchorMax = new Vector2(0.96f, yMax);
                host.offsetMin = Vector2.zero;
                host.offsetMax = Vector2.zero;
            }

            var t = Label(host, name, fontSize, style, textColor);
            var rt = t.rectTransform;
            if (panelColor.HasValue)
            {
                rt.anchorMin = Vector2.zero;
                rt.anchorMax = Vector2.one;
                rt.offsetMin = new Vector2(18, 12);
                rt.offsetMax = new Vector2(-18, -12);
            }
            else
            {
                rt.anchorMin = new Vector2(0.04f, yMin);
                rt.anchorMax = new Vector2(0.96f, yMax);
                rt.offsetMin = Vector2.zero;
                rt.offsetMax = Vector2.zero;
            }
            t.alignment = align;
            t.horizontalOverflow = HorizontalWrapMode.Wrap;
            t.verticalOverflow = VerticalWrapMode.Overflow;
            return t;
        }

        private static RectTransform Panel(Transform parent, string name, Color color)
        {
            var go = new GameObject(name);
            var rt = go.AddComponent<RectTransform>();
            rt.SetParent(parent, false);
            var img = go.AddComponent<Image>();
            img.color = color;
            return rt;
        }

        private static Text Label(Transform parent, string name, int size, FontStyle style, Color color)
        {
            var go = new GameObject(name);
            var rt = go.AddComponent<RectTransform>();
            rt.SetParent(parent, false);
            var t = go.AddComponent<Text>();
            t.font = BuiltinFont();
            t.fontSize = size;
            t.fontStyle = style;
            t.color = color;
            t.raycastTarget = false;
            t.supportRichText = false;
            return t;
        }

        private static Font BuiltinFont()
        {
            // Unity 6: LegacyRuntime; older: Arial
            var f = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            if (f == null) f = Resources.GetBuiltinResource<Font>("Arial.ttf");
            return f;
        }

        private static void StretchFull(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
        }

        private static Button MakeButton(RectTransform row, string name, string label, float x0, float x1)
        {
            var go = new GameObject(name);
            var rt = go.AddComponent<RectTransform>();
            rt.SetParent(row, false);
            rt.anchorMin = new Vector2(x0, 0);
            rt.anchorMax = new Vector2(x1, 1);
            rt.offsetMin = new Vector2(6, 4);
            rt.offsetMax = new Vector2(-6, -4);

            var img = go.AddComponent<Image>();
            img.color = new Color(0.38f, 0.16f, 0.14f, 1f);

            var btn = go.AddComponent<Button>();
            var colors = btn.colors;
            colors.highlightedColor = new Color(0.52f, 0.26f, 0.18f, 1f);
            colors.pressedColor = new Color(0.22f, 0.10f, 0.09f, 1f);
            btn.colors = colors;

            var text = Label(rt, "Label", 20, FontStyle.Bold, new Color(0.95f, 0.88f, 0.70f));
            StretchFull(text.rectTransform);
            text.alignment = TextAnchor.MiddleCenter;
            text.text = label;

            return btn;
        }
    }

    public static class ViewJson
    {
        public static string GetString(string json, string key, string fallback = "—")
        {
            if (string.IsNullOrEmpty(json)) return fallback;

            var k = "\"" + key + "\":\"";
            var at = json.IndexOf(k);
            if (at >= 0)
            {
                at += k.Length;
                var e = json.IndexOf('"', at);
                if (e > at) return json.Substring(at, e - at);
            }

            k = "\"" + key + "\":";
            at = json.IndexOf(k);
            if (at < 0) return fallback;
            at += k.Length;
            while (at < json.Length && char.IsWhiteSpace(json[at])) at++;
            if (at < json.Length && json[at] == '"')
            {
                at++;
                var e = json.IndexOf('"', at);
                if (e > at) return json.Substring(at, e - at);
                return fallback;
            }
            var end = at;
            while (end < json.Length && ",}] \t\r\n".IndexOf(json[end]) < 0) end++;
            var raw = json.Substring(at, end - at).Trim();
            return string.IsNullOrEmpty(raw) ? fallback : raw;
        }

        public static string BuildLedger(string viewJson)
        {
            var sb = new StringBuilder();
            var persona = "—";
            var issue = "—";
            var district = "—";
            var idAt = viewJson.IndexOf("\"identity\"");
            if (idAt >= 0)
            {
                var slice = viewJson.Substring(idAt, Mathf.Min(500, viewJson.Length - idAt));
                persona = GetString(slice, "persona");
                issue = GetString(slice, "issue");
                district = GetString(slice, "district");
            }
            sb.AppendLine("IDENTITY");
            sb.AppendLine($"{persona}  ·  {issue}  ·  {district}");
            sb.AppendLine();

            var stage = GetString(viewJson, "stageLabel", GetString(viewJson, "stage"));
            var week = GetString(viewJson, "stageWeek", GetString(viewJson, "calendarWeek"));
            var total = GetString(viewJson, "weeksTotal");
            sb.AppendLine("STAGE");
            sb.AppendLine($"{stage}   ·   week {week} / {total}");
            sb.AppendLine();

            var ledAt = viewJson.IndexOf("\"ledger\"");
            if (ledAt >= 0)
            {
                var slice = viewJson.Substring(ledAt, Mathf.Min(900, viewJson.Length - ledAt));
                sb.AppendLine("LEDGER  (from pure TS engine)");
                sb.AppendLine(
                    $"AP {GetString(slice, "ap")} / {GetString(slice, "apMax")}     " +
                    $"$ {GetString(slice, "money")}     " +
                    $"Contacts {GetString(slice, "contacts")}     " +
                    $"Name {GetString(slice, "nameID")}");
                sb.Append(
                    $"Sigs {GetString(slice, "signatures")} / {GetString(slice, "sigNeed")}     " +
                    $"Ballot {GetString(slice, "ballot")}     " +
                    $"Debt {GetString(slice, "debt")}");
            }
            return sb.ToString();
        }

        public static string BuildActions(string viewJson, int max = 10)
        {
            var sb = new StringBuilder();
            sb.AppendLine("AVAILABLE PLAYS");
            var searchFrom = 0;
            var count = 0;
            while (count < max)
            {
                var hiKey = "\"handIndex\":";
                var hiAt = viewJson.IndexOf(hiKey, searchFrom);
                if (hiAt < 0) break;
                hiAt += hiKey.Length;
                var hiEnd = hiAt;
                while (hiEnd < viewJson.Length && (char.IsDigit(viewJson[hiEnd]) || viewJson[hiEnd] == '-'))
                    hiEnd++;
                if (hiEnd == hiAt) { searchFrom = hiAt + 1; continue; }
                var hi = viewJson.Substring(hiAt, hiEnd - hiAt);
                var windowEnd = Mathf.Min(viewJson.Length, hiAt + 350);
                var window = viewJson.Substring(hiAt, windowEnd - hiAt);
                var name = GetString(window, "name", "action");
                var cost = GetString(window, "costLabel", "");
                var field = window.Contains("\"field\":true") || window.Contains("\"field\": true");
                sb.Append("• ");
                sb.Append(name);
                if (!string.IsNullOrEmpty(cost) && cost != "—") sb.Append("  (").Append(cost).Append(")");
                if (field) sb.Append("  [field]");
                sb.Append("  #").Append(hi);
                sb.AppendLine();
                count++;
                searchFrom = hiEnd;
            }
            if (count == 0) sb.AppendLine("(none this frame)");
            return sb.ToString().TrimEnd();
        }
    }
}
