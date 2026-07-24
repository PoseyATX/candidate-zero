// Typography
//   Title / wordmarks → Cinzel
//   Everything else  → LEMON MILK (user request — readable deckbuilder UI)
using UnityEngine;
using UnityEngine.UI;

namespace CandidateZero.UI
{
    public static class CzFonts
    {
        static Font _title;
        static Font _titleDeco;
        static Font _body;
        static Font _bodyBold;
        static Font _compact;
        static bool _loaded;
        static readonly System.Collections.Generic.HashSet<string> _warmed =
            new System.Collections.Generic.HashSet<string>();

        /// <summary>Minimum readable size on 1080×1920 reference (mobile).</summary>
        public const int MinUi = 22;
        public const int BodyDefault = 28;
        public const int Hud = 26;
        public const int HudLarge = 32;
        public const int Button = 30;
        public const int CardName = 28;
        public const int CardMeta = 22;

        public static Font Title
        {
            get { Ensure(); return _title ?? Body; }
        }

        public static Font TitleDeco
        {
            get { Ensure(); return _titleDeco ?? Title; }
        }

        public static Font Body
        {
            get { Ensure(); return _body ?? Fallback(); }
        }

        public static Font BodyBold
        {
            get { Ensure(); return _bodyBold ?? Body; }
        }

        public static Font Compact
        {
            get { Ensure(); return _compact ?? BodyBold; }
        }

        public static void Ensure()
        {
            if (_loaded) return;
            _loaded = true;

            _title = Load("Fonts/Cinzel-Bold")
                     ?? Load("Fonts/Cinzel-Regular")
                     ?? Load("Fonts/Cinzel");
            _titleDeco = Load("Fonts/CinzelDecorative-Bold")
                         ?? Load("Fonts/CinzelDecorative-Regular")
                         ?? _title;

            // Non-title = LEMON MILK (Regular / Medium / Bold)
            _body = Load("Fonts/LEMONMILK-Regular")
                    ?? Load("Fonts/LEMONMILK-Medium")
                    ?? Load("Fonts/LEMONMILK-Bold");
            _bodyBold = Load("Fonts/LEMONMILK-Bold")
                        ?? Load("Fonts/LEMONMILK-Medium")
                        ?? _body;
            _compact = Load("Fonts/LEMONMILK-Bold")
                       ?? Load("Fonts/Steelfish Bd")
                       ?? _bodyBold;

            if (_title == null)
                _title = Font.CreateDynamicFontFromOSFont(new[] { "Cinzel", "Georgia", "Arial" }, 64);
            if (_body == null)
                _body = Font.CreateDynamicFontFromOSFont(new[] { "Arial", "Segoe UI", "Helvetica" }, 48);

            Debug.Log(
                $"[CzFonts] title={Name(_title)} deco={Name(_titleDeco)} " +
                $"body={Name(_body)} bold={Name(_bodyBold)} (LEMON MILK for non-title)");
        }

        static Font Load(string resourcePath)
        {
            var f = Resources.Load<Font>(resourcePath);
            if (f != null) return f;
            var leaf = resourcePath.Contains("/")
                ? resourcePath.Substring(resourcePath.LastIndexOf('/') + 1)
                : resourcePath;
            return Resources.Load<Font>("Fonts/" + leaf);
        }

        static string Name(Font f) => f != null ? f.name : "null";

        static Font Fallback()
        {
            return Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf")
                   ?? Resources.GetBuiltinResource<Font>("Arial.ttf");
        }

        public static void Apply(Text t, Font font, int size, FontStyle style, Color color)
        {
            if (t == null) return;
            Ensure();
            // Floor sizes — never ship unreadable UI type
            size = Mathf.Max(MinUi, size);
            t.font = font ?? Body;
            t.fontSize = size;
            t.fontStyle = style;
            t.color = color;
            t.horizontalOverflow = HorizontalWrapMode.Wrap;
            t.verticalOverflow = VerticalWrapMode.Overflow;
            t.raycastTarget = false;
            t.resizeTextForBestFit = false;
            t.alignByGeometry = false;
            // Warm atlas once per font+size+style — not on every Bind/label paint.
            if (t.font != null && size > 0)
            {
                var key = t.font.GetInstanceID() + ":" + size + ":" + (int)style;
                if (_warmed.Add(key))
                {
                    t.font.RequestCharactersInTexture(
                        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$·—–-./ ·",
                        size, style);
                }
            }
        }
    }
}
