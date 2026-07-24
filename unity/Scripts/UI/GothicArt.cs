// Visual system matched to the TypeScript product (styles.css):
//   --walnut / --oxblood / --gold / parchment cards
//   Background: oxblood sunburst on walnut
//   Emblem: classic 5-point nautical star, tip UP
using UnityEngine;
using UnityEngine.UI;

namespace CandidateZero.UI
{
    public static class GothicArt
    {
        static Sprite _sunburst, _parchment, _goldRing, _star, _vignette;
        static Sprite _pipOn, _pipOff, _sealDisc, _panelFace, _meterFill;
        static bool _resolved;

        // Glossy 9-slice chrome (Resources/Art/UI — BakeUiChrome)
        static Sprite _panelGlass, _panelDeep, _panelHud;
        static Sprite _btnPrimary, _btnSecondary, _btnGhost;
        static Sprite _chip, _meterTrack, _meterFillGold, _meterFillOx;

        public static Sprite Sunburst
        {
            get
            {
                Ensure();
                return _sunburst ??= LoadSprite("Art/UI/bg_sunburst")
                       ?? Procedural.OxbloodSunburst();
            }
        }

        public static Sprite Parchment
        {
            get { Ensure(); return _parchment ??= Procedural.ParchmentCard(); }
        }

        public static Sprite GoldRing
        {
            get { Ensure(); return _goldRing ??= Procedural.ThinGoldEdge(); }
        }

        /// <summary>Classic 5-point nautical star — one point straight up.</summary>
        public static Sprite StarEmblem
        {
            get { Ensure(); return _star ??= Procedural.NauticalStar(); }
        }

        public static Sprite Vignette =>
            _vignette ??= LoadSprite("Art/UI/vignette_soft") ?? Procedural.Vignette();

        public static Sprite PipOn =>
            _pipOn ??= LoadSprite("Art/UI/pip_on") ?? Procedural.Pip(true);
        public static Sprite PipOff =>
            _pipOff ??= LoadSprite("Art/UI/pip_off") ?? Procedural.Pip(false);
        public static Sprite SealDisc =>
            _sealDisc ??= LoadSprite("Art/UI/seal_cost") ?? Procedural.CostSealDisc();
        public static Sprite PanelFace =>
            _panelFace ??= LoadSprite("Art/UI/panel_glass") ?? Procedural.PanelFace();
        public static Sprite MeterFill =>
            _meterFill ??= LoadSprite("Art/UI/meter_fill_gold") ?? Procedural.Solid(CzTheme.Gold);

        public static Sprite PanelGlass =>
            _panelGlass ??= LoadSprite("Art/UI/panel_glass") ?? PanelFace;
        public static Sprite PanelDeep =>
            _panelDeep ??= LoadSprite("Art/UI/panel_deep") ?? PanelFace;
        public static Sprite PanelHud =>
            _panelHud ??= LoadSprite("Art/UI/panel_hud") ?? PanelFace;
        public static Sprite BtnPrimary =>
            _btnPrimary ??= LoadSprite("Art/UI/btn_primary");
        public static Sprite BtnSecondary =>
            _btnSecondary ??= LoadSprite("Art/UI/btn_secondary");
        public static Sprite BtnGhost =>
            _btnGhost ??= LoadSprite("Art/UI/btn_ghost");
        public static Sprite ChipBg =>
            _chip ??= LoadSprite("Art/UI/chip");
        public static Sprite MeterTrack =>
            _meterTrack ??= LoadSprite("Art/UI/meter_track");
        public static Sprite MeterFillGold =>
            _meterFillGold ??= LoadSprite("Art/UI/meter_fill_gold") ?? MeterFill;
        public static Sprite MeterFillOx =>
            _meterFillOx ??= LoadSprite("Art/UI/meter_fill_ox") ?? MeterFill;

        public static void Ensure()
        {
            if (_resolved) return;
            _resolved = true;
            // Prefer baked glossy sunburst
            _sunburst = LoadSprite("Art/UI/bg_sunburst");
            if (_sunburst == null)
            {
                var sun = Resources.Load<Texture2D>("Art/Backgrounds/oxblood_sunburst");
                if (sun != null)
                    _sunburst = Sprite.Create(sun, new Rect(0, 0, sun.width, sun.height),
                        new Vector2(0.5f, 0.5f), 100f);
            }
        }

        static Sprite LoadSprite(string resourcesPath)
        {
            var sp = Resources.Load<Sprite>(resourcesPath);
            if (sp != null) return sp;
            // Texture may import as Texture2D first — build sprite with generous 9-slice borders
            var tex = Resources.Load<Texture2D>(resourcesPath);
            if (tex == null) return null;
            tex.filterMode = FilterMode.Bilinear;
            tex.wrapMode = TextureWrapMode.Clamp;
            float b = tex.width >= 200 ? 40f : tex.width >= 100 ? 24f : 8f;
            // pips/seals: no border
            string leaf = resourcesPath;
            int slash = leaf.LastIndexOf('/');
            if (slash >= 0) leaf = leaf.Substring(slash + 1);
            if (leaf.StartsWith("pip") || leaf.StartsWith("seal") || leaf.StartsWith("bg_") || leaf.StartsWith("vignette"))
                b = 0f;
            if (leaf.StartsWith("btn") || leaf.StartsWith("chip")) b = 28f;
            if (leaf.StartsWith("meter")) b = 12f;
            return Sprite.Create(tex, new Rect(0, 0, tex.width, tex.height),
                new Vector2(0.5f, 0.5f), 100f, 0, SpriteMeshType.FullRect,
                new Vector4(b, b, b, b));
        }

        /// <summary>Clear cached sprites after domain reload / art code change.</summary>
        public static void Invalidate()
        {
            _resolved = false;
            _sunburst = _parchment = _goldRing = _star = _vignette = null;
            _pipOn = _pipOff = _sealDisc = _panelFace = _meterFill = null;
            _panelGlass = _panelDeep = _panelHud = null;
            _btnPrimary = _btnSecondary = _btnGhost = null;
            _chip = _meterTrack = _meterFillGold = _meterFillOx = null;
        }

        static class Procedural
        {
            /// <summary>
            /// Procedural textures must ship at phone density or they look soft when
            /// stretched by Scale With Screen Size (512 → full screen = blur).
            /// </summary>
            static Texture2D NewTex(int w, int h)
            {
                var tex = new Texture2D(w, h, TextureFormat.RGBA32, false);
                tex.wrapMode = TextureWrapMode.Clamp;
                tex.filterMode = FilterMode.Bilinear;
                tex.anisoLevel = 0;
                return tex;
            }

            static Sprite Finish(Texture2D tex, float ppu = 100f, Vector4? border = null)
            {
                tex.wrapMode = TextureWrapMode.Clamp;
                tex.filterMode = FilterMode.Bilinear;
                tex.anisoLevel = 0;
                tex.Apply(false, true); // no mipmaps — UI sprites with mips look muddy
                if (border.HasValue)
                    return Sprite.Create(tex, new Rect(0, 0, tex.width, tex.height),
                        new Vector2(0.5f, 0.5f), ppu, 0, SpriteMeshType.FullRect, border.Value);
                return Sprite.Create(tex, new Rect(0, 0, tex.width, tex.height),
                    new Vector2(0.5f, 0.5f), ppu);
            }

            public static Sprite OxbloodSunburst()
            {
                // 1:1 with CanvasScaler reference (1080×1920) — never upscale a half-res plate.
                int w = 1080, h = 1920;
                var tex = NewTex(w, h);
                float cx = w * 0.5f, cy = h * 0.42f;
                Color walnut = new Color(0.10f, 0.08f, 0.05f, 1f);
                Color ox = new Color(0.54f, 0.18f, 0.15f, 1f);
                Color oxBright = new Color(0.69f, 0.24f, 0.18f, 1f);
                Color goldHint = new Color(0.69f, 0.55f, 0.24f, 1f);

                int rays = 28;
                var pixels = new Color[w * h];
                for (int y = 0; y < h; y++)
                for (int x = 0; x < w; x++)
                {
                    float dx = x - cx, dy = y - cy;
                    float dist = Mathf.Sqrt(dx * dx + dy * dy);
                    float ang = Mathf.Atan2(dy, dx);
                    float ray = (ang / (Mathf.PI * 2f) + 0.5f) * rays;
                    float rayF = Mathf.Abs(ray - Mathf.Floor(ray) - 0.5f) * 2f;
                    float rayMask = Mathf.SmoothStep(0.55f, 0.05f, rayF);

                    float fall = 1f - Mathf.Clamp01(dist / (h * 0.75f));
                    fall = fall * fall;

                    Color c = Color.Lerp(walnut, ox, fall * 0.85f);
                    c = Color.Lerp(c, oxBright, rayMask * fall * 0.55f);
                    float apex = 1f - Mathf.Clamp01(dist / (h * 0.18f));
                    c = Color.Lerp(c, goldHint, apex * 0.12f);
                    pixels[y * w + x] = c;
                }
                tex.SetPixels(pixels);
                return Finish(tex);
            }

            public static Sprite ParchmentCard()
            {
                // 2× card face density (cards are 240×360 UI units)
                int w = 480, h = 720;
                int rad = 20;
                var tex = NewTex(w, h);
                Color top = new Color(0.937f, 0.890f, 0.776f);
                Color bot = new Color(0.886f, 0.824f, 0.682f);
                var pixels = new Color[w * h];
                for (int y = 0; y < h; y++)
                for (int x = 0; x < w; x++)
                {
                    float a = RoundA(x, y, w, h, rad);
                    float g = Mathf.PerlinNoise(x * 0.04f, y * 0.04f) * 0.05f;
                    float grain = Mathf.PerlinNoise(x * 0.16f, y * 0.16f) * 0.03f;
                    Color c = Color.Lerp(top, bot, y / (float)h + g);
                    c.r = Mathf.Clamp01(c.r + grain);
                    c.g = Mathf.Clamp01(c.g + grain * 0.8f);
                    c.b = Mathf.Clamp01(c.b + grain * 0.5f);
                    c.a = a;
                    pixels[y * w + x] = c;
                }
                tex.SetPixels(pixels);
                return Finish(tex, 100f, new Vector4(rad, rad, rad, rad));
            }

            public static Sprite ThinGoldEdge()
            {
                int w = 480, h = 720;
                int rad = 20, thick = 5;
                var tex = NewTex(w, h);
                var pixels = new Color[w * h];
                for (int y = 0; y < h; y++)
                for (int x = 0; x < w; x++)
                {
                    float outer = RoundA(x, y, w, h, rad);
                    float inner = RoundA(x, y, w, h, rad - thick);
                    float a = Mathf.Clamp01(outer - inner);
                    float t = y / (float)h;
                    Color g = Color.Lerp(
                        new Color(0.78f, 0.66f, 0.32f, 1f),
                        new Color(0.55f, 0.42f, 0.16f, 1f), t);
                    g.a = a * 0.92f;
                    pixels[y * w + x] = g;
                }
                tex.SetPixels(pixels);
                return Finish(tex, 100f, new Vector4(rad, rad, rad, rad));
            }

            /// <summary>
            /// Classic 5-point nautical star. Texture Y increases upward in Unity sprites;
            /// tip must be at high Y so the star points UP on screen.
            /// </summary>
            public static Sprite NauticalStar()
            {
                int w = 512, h = 512;
                var tex = NewTex(w, h);
                var clear = new Color[w * h];
                tex.SetPixels(clear);

                float cx = 256f, cy = 256f;
                float rOut = 236f;
                float rIn = 88f;

                // 10 verts: tip, waist, tip…  First tip at +90° (top of texture = screen up).
                const int n = 5;
                var verts = new Vector2[n * 2];
                for (int i = 0; i < n * 2; i++)
                {
                    // PI/2 = north. Previous -PI/2 put tip at bottom (upside-down).
                    float ang = Mathf.PI / 2f + i * (Mathf.PI / n);
                    float r = (i % 2 == 0) ? rOut : rIn;
                    verts[i] = new Vector2(cx + Mathf.Cos(ang) * r, cy + Mathf.Sin(ang) * r);
                }

                Color gold = new Color(0.72f, 0.58f, 0.26f, 1f);
                Color goldDark = new Color(0.32f, 0.22f, 0.08f, 1f);
                Color goldLite = new Color(0.92f, 0.80f, 0.46f, 1f);
                var center = new Vector2(cx, cy);

                for (int p = 0; p < n; p++)
                {
                    int iOut = p * 2;
                    int iPrev = (iOut + n * 2 - 1) % (n * 2);
                    int iNext = (iOut + 1) % (n * 2);
                    var tip = verts[iOut];
                    var a = verts[iPrev];
                    var b = verts[iNext];

                    // Faceted halves — classic nautical tattoo shading
                    FillTriangle(tex, center, a, tip, goldDark);
                    FillTriangle(tex, center, tip, b, goldLite);

                    DrawLine(tex, a, tip, gold, 3.2f);
                    DrawLine(tex, tip, b, gold, 3.2f);
                    DrawLine(tex, a, center, gold, 1.8f);
                    DrawLine(tex, b, center, gold, 1.8f);
                }

                // Center hub — hard edge, no soft outer halo (halo read as blur)
                float cr = 18f;
                for (int y = (int)(cy - cr - 1); y <= cy + cr + 1; y++)
                for (int x = (int)(cx - cr - 1); x <= cx + cr + 1; x++)
                {
                    if (x < 0 || y < 0 || x >= w || y >= h) continue;
                    float d = Mathf.Sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
                    if (d <= cr)
                        tex.SetPixel(x, y, gold);
                }

                return Finish(tex);
            }

            public static Sprite Pip(bool on)
            {
                int s = 64;
                var tex = NewTex(s, s);
                float cx = 31.5f, cy = 31.5f, r = 24f;
                Color fill = on
                    ? new Color(0.72f, 0.58f, 0.26f, 1f)
                    : new Color(0, 0, 0, 0);
                Color ring = on
                    ? new Color(0.88f, 0.76f, 0.40f, 1f)
                    : new Color(0.49f, 0.40f, 0.19f, 1f);
                for (int y = 0; y < s; y++)
                for (int x = 0; x < s; x++)
                {
                    float d = Mathf.Sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
                    if (d <= r - 4f)
                        tex.SetPixel(x, y, fill);
                    else if (d <= r)
                        tex.SetPixel(x, y, ring);
                    else
                        tex.SetPixel(x, y, new Color(0, 0, 0, 0));
                }
                return Finish(tex);
            }

            public static Sprite CostSealDisc()
            {
                int s = 128;
                var tex = NewTex(s, s);
                float cx = 63.5f, cy = 63.5f, r = 56f;
                Color face = new Color(0.93f, 0.88f, 0.76f, 0.96f);
                Color ring = new Color(0.54f, 0.18f, 0.15f, 1f);
                for (int y = 0; y < s; y++)
                for (int x = 0; x < s; x++)
                {
                    float d = Mathf.Sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
                    if (d <= r - 6f)
                        tex.SetPixel(x, y, face);
                    else if (d <= r)
                        tex.SetPixel(x, y, ring);
                    else
                        tex.SetPixel(x, y, new Color(0, 0, 0, 0));
                }
                return Finish(tex);
            }

            public static Sprite PanelFace()
            {
                int w = 128, h = 128, rad = 12;
                var tex = NewTex(w, h);
                Color top = new Color(0.16f, 0.12f, 0.08f, 0.96f);
                Color bot = new Color(0.10f, 0.075f, 0.05f, 0.97f);
                for (int y = 0; y < h; y++)
                for (int x = 0; x < w; x++)
                {
                    float a = RoundA(x, y, w, h, rad);
                    Color c = Color.Lerp(top, bot, y / (float)h);
                    c.a *= a;
                    tex.SetPixel(x, y, c);
                }
                return Finish(tex, 100f, new Vector4(rad, rad, rad, rad));
            }

            public static Sprite Solid(Color c)
            {
                var tex = NewTex(8, 8);
                for (int y = 0; y < 8; y++)
                for (int x = 0; x < 8; x++)
                    tex.SetPixel(x, y, c);
                return Finish(tex);
            }

            public static Sprite Vignette()
            {
                int w = 512, h = 512;
                var tex = NewTex(w, h);
                float cx = 256f, cy = 256f, max = 350f;
                var pixels = new Color[w * h];
                for (int y = 0; y < h; y++)
                for (int x = 0; x < w; x++)
                {
                    float d = Vector2.Distance(new Vector2(x, y), new Vector2(cx, cy)) / max;
                    float a = Mathf.SmoothStep(0.50f, 1.12f, d) * 0.62f;
                    pixels[y * w + x] = new Color(0.05f, 0.035f, 0.025f, a);
                }
                tex.SetPixels(pixels);
                return Finish(tex);
            }

            static void FillTriangle(Texture2D tex, Vector2 a, Vector2 b, Vector2 c, Color col)
            {
                int minX = Mathf.Clamp(Mathf.FloorToInt(Mathf.Min(a.x, Mathf.Min(b.x, c.x))), 0, tex.width - 1);
                int maxX = Mathf.Clamp(Mathf.CeilToInt(Mathf.Max(a.x, Mathf.Max(b.x, c.x))), 0, tex.width - 1);
                int minY = Mathf.Clamp(Mathf.FloorToInt(Mathf.Min(a.y, Mathf.Min(b.y, c.y))), 0, tex.height - 1);
                int maxY = Mathf.Clamp(Mathf.CeilToInt(Mathf.Max(a.y, Mathf.Max(b.y, c.y))), 0, tex.height - 1);
                for (int y = minY; y <= maxY; y++)
                for (int x = minX; x <= maxX; x++)
                {
                    if (PointInTri(new Vector2(x + 0.5f, y + 0.5f), a, b, c))
                        tex.SetPixel(x, y, col);
                }
            }

            static bool PointInTri(Vector2 p, Vector2 a, Vector2 b, Vector2 c)
            {
                float s = a.y * c.x - a.x * c.y + (c.y - a.y) * p.x + (a.x - c.x) * p.y;
                float t = a.x * b.y - a.y * b.x + (a.y - b.y) * p.x + (b.x - a.x) * p.y;
                if ((s < 0) != (t < 0) && s != 0 && t != 0) return false;
                float A = -b.y * c.x + a.y * (c.x - b.x) + a.x * (b.y - c.y) + b.x * c.y;
                return A < 0 ? (s <= 0 && s + t >= A) : (s >= 0 && s + t <= A);
            }

            static void DrawLine(Texture2D tex, Vector2 a, Vector2 b, Color col, float thick)
            {
                float dist = Vector2.Distance(a, b);
                int steps = Mathf.Max(2, (int)dist * 2);
                for (int i = 0; i <= steps; i++)
                {
                    float t = i / (float)steps;
                    var p = Vector2.Lerp(a, b, t);
                    int r = Mathf.CeilToInt(thick);
                    for (int oy = -r; oy <= r; oy++)
                    for (int ox = -r; ox <= r; ox++)
                    {
                        if (ox * ox + oy * oy > thick * thick) continue;
                        int x = Mathf.RoundToInt(p.x) + ox;
                        int y = Mathf.RoundToInt(p.y) + oy;
                        if (x < 0 || y < 0 || x >= tex.width || y >= tex.height) continue;
                        tex.SetPixel(x, y, col);
                    }
                }
            }

            static float RoundA(int x, int y, int w, int h, int r)
            {
                float px = Mathf.Clamp(x, r, w - 1 - r);
                float py = Mathf.Clamp(y, r, h - 1 - r);
                float d = Mathf.Sqrt((x - px) * (x - px) + (y - py) * (y - py));
                if (d <= r - 0.8f) return 1f;
                if (d >= r + 0.4f) return 0f;
                return 1f - Mathf.InverseLerp(r - 0.8f, r + 0.4f, d);
            }
        }
    }

    public static class CzTheme
    {
        public static readonly Color Walnut = new Color(0.102f, 0.075f, 0.051f);
        public static readonly Color Walnut2 = new Color(0.141f, 0.102f, 0.067f);
        public static readonly Color Walnut3 = new Color(0.180f, 0.129f, 0.082f);
        public static readonly Color Parchment = new Color(0.914f, 0.863f, 0.753f);
        public static readonly Color ParchmentDim = new Color(0.812f, 0.753f, 0.627f);
        public static readonly Color Oxblood = new Color(0.541f, 0.184f, 0.149f);
        public static readonly Color OxbloodBright = new Color(0.694f, 0.235f, 0.184f);
        public static readonly Color Gold = new Color(0.690f, 0.553f, 0.243f);
        public static readonly Color GoldDim = new Color(0.490f, 0.396f, 0.188f);
        public static readonly Color GoldBright = new Color(0.82f, 0.70f, 0.38f);
        public static readonly Color Ink = new Color(0.133f, 0.102f, 0.063f);
        public static readonly Color Cream = Parchment;
        public static readonly Color Good = new Color(0.72f, 0.86f, 0.68f);
        public static readonly Color Bad = new Color(0.95f, 0.45f, 0.40f);
        public static readonly Color Muted = ParchmentDim;
        public static readonly Color Sage = new Color(0.42f, 0.48f, 0.37f);
        public static readonly Color SageLite = new Color(0.725f, 0.820f, 0.663f);
        public static readonly Color Line = new Color(0.227f, 0.173f, 0.106f);
        public static readonly Color Panel = new Color(0.141f, 0.102f, 0.067f, 0.96f);
        public static readonly Color PanelDeep = new Color(0.102f, 0.075f, 0.051f, 0.97f);
        public static readonly Color HudBg = new Color(0.102f, 0.075f, 0.051f, 0.97f);
        public static readonly Color OxbloodHot = OxbloodBright;
    }

    /// <summary>
    /// Shared uGUI chrome — glossy rounded panels/buttons (9-slice), soft shadows,
    /// no harsh Outline mush. Cream text on filled buttons.
    /// </summary>
    public static class CzChrome
    {
        public static RectTransform Panel(Transform parent, string name, Color color)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(Image));
            go.transform.SetParent(parent, false);
            go.GetComponent<Image>().color = color;
            return go.GetComponent<RectTransform>();
        }

        public static RectTransform GlassPanel(Transform parent, string name, Sprite sprite = null)
        {
            GothicArt.Ensure();
            var rt = Panel(parent, name, Color.white);
            var img = rt.GetComponent<Image>();
            img.sprite = sprite ?? GothicArt.PanelGlass;
            img.type = img.sprite != null ? Image.Type.Sliced : Image.Type.Simple;
            img.color = Color.white;
            SoftShadow(rt.gameObject);
            return rt;
        }

        public static RectTransform HudPanel(Transform parent, string name)
        {
            return GlassPanel(parent, name, GothicArt.PanelHud);
        }

        public static RectTransform DeepPanel(Transform parent, string name)
        {
            return GlassPanel(parent, name, GothicArt.PanelDeep);
        }

        public static RectTransform PanelSliced(Transform parent, string name, Sprite sprite, Color tint)
        {
            var rt = Panel(parent, name, tint);
            var img = rt.GetComponent<Image>();
            img.sprite = sprite;
            img.type = sprite != null ? Image.Type.Sliced : Image.Type.Simple;
            img.color = tint;
            return rt;
        }

        public static Image Rule(Transform parent, string name, float x0, float y0, float x1, float y1, Color c)
        {
            var rt = Panel(parent, name, c);
            SetAnchors(rt, x0, y0, x1, y1);
            rt.GetComponent<Image>().raycastTarget = false;
            return rt.GetComponent<Image>();
        }

        public static void DoubleGoldRule(Transform parent, string name, float yMid, float x0 = 0.18f, float x1 = 0.82f)
        {
            // Soft dual rules (hairline gold, not pixel bars)
            var a = Rule(parent, name + "A", x0, yMid + 0.0025f, x1, yMid + 0.0055f,
                new Color(CzTheme.Gold.r, CzTheme.Gold.g, CzTheme.Gold.b, 0.85f));
            var b = Rule(parent, name + "B", x0, yMid - 0.0055f, x1, yMid - 0.0025f,
                new Color(CzTheme.GoldDim.r, CzTheme.GoldDim.g, CzTheme.GoldDim.b, 0.65f));
            a.raycastTarget = false;
            b.raycastTarget = false;
        }

        public static Text Label(Transform parent, string name, string text, Font font, int size,
            FontStyle style, Color color, TextAnchor align)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(Text));
            go.transform.SetParent(parent, false);
            var t = go.GetComponent<Text>();
            CzFonts.Apply(t, font, size, style, color);
            t.text = text;
            t.alignment = align;
            return t;
        }

        public static void SetAnchors(RectTransform rt, float x0, float y0, float x1, float y1)
        {
            rt.anchorMin = new Vector2(x0, y0);
            rt.anchorMax = new Vector2(x1, y1);
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
        }

        public static void Stretch(RectTransform rt) => SetAnchors(rt, 0, 0, 1, 1);

        public static void Outline(GameObject go, Color c, float dist)
        {
            // Soft gold rim — keep mild for chips only
            var o = go.GetComponent<Outline>() ?? go.AddComponent<Outline>();
            o.effectColor = new Color(c.r, c.g, c.b, Mathf.Min(c.a, 0.55f));
            o.effectDistance = new Vector2(dist * 0.6f, -dist * 0.6f);
            o.useGraphicAlpha = true;
        }

        public static void SoftShadow(GameObject go)
        {
            var s = go.GetComponent<Shadow>() ?? go.AddComponent<Shadow>();
            s.effectColor = new Color(0f, 0f, 0f, 0.55f);
            s.effectDistance = new Vector2(0f, -6f);
            s.useGraphicAlpha = true;
        }

        public static void Shadow(GameObject go, Color c, float x, float y)
        {
            var s = go.GetComponent<Shadow>() ?? go.AddComponent<Shadow>();
            s.effectColor = c;
            s.effectDistance = new Vector2(x, y);
            s.useGraphicAlpha = true;
        }

        public static Button PrimaryButton(RectTransform parent, string name, string label,
            float x0, float x1, float y0, float y1, bool primary = true)
        {
            GothicArt.Ensure();
            var go = new GameObject(name, typeof(RectTransform), typeof(Image), typeof(Button));
            go.transform.SetParent(parent, false);
            var rt = go.GetComponent<RectTransform>();
            SetAnchors(rt, x0, y0, x1, y1);
            rt.offsetMin = new Vector2(6, 6);
            rt.offsetMax = new Vector2(-6, -6);

            var img = go.GetComponent<Image>();
            var sp = primary ? GothicArt.BtnPrimary : GothicArt.BtnSecondary;
            if (sp != null)
            {
                img.sprite = sp;
                img.type = Image.Type.Sliced;
                img.color = Color.white;
            }
            else
            {
                img.color = primary ? CzTheme.Oxblood : new Color(0.14f, 0.10f, 0.07f, 0.96f);
            }

            var btn = go.GetComponent<Button>();
            btn.targetGraphic = img;
            var colors = btn.colors;
            colors.normalColor = Color.white;
            colors.highlightedColor = new Color(1.08f, 1.05f, 1.0f, 1f);
            colors.pressedColor = new Color(0.85f, 0.82f, 0.80f, 1f);
            colors.disabledColor = new Color(0.5f, 0.5f, 0.5f, 0.55f);
            colors.fadeDuration = 0.08f;
            btn.colors = colors;
            SoftShadow(go);

            var t = Label(rt, "L", label, CzFonts.BodyBold, primary ? CzFonts.Button : 28, FontStyle.Bold,
                CzTheme.Parchment, TextAnchor.MiddleCenter);
            SetAnchors(t.rectTransform, 0.06f, 0.12f, 0.94f, 0.88f);
            t.resizeTextForBestFit = false;
            Shadow(t.gameObject, new Color(0, 0, 0, 0.35f), 0f, -2f);
            return btn;
        }

        public static RectTransform Chip(Transform parent, string name, string text, Color border, Color fg)
        {
            GothicArt.Ensure();
            var rt = Panel(parent, name, Color.white);
            var img = rt.GetComponent<Image>();
            if (GothicArt.ChipBg != null)
            {
                img.sprite = GothicArt.ChipBg;
                img.type = Image.Type.Sliced;
                img.color = Color.white;
            }
            else
            {
                img.color = new Color(0.12f, 0.09f, 0.06f, 0.9f);
                Outline(rt.gameObject, border, 1f);
            }
            var t = Label(rt, "T", text, CzFonts.BodyBold, 22, FontStyle.Bold, fg, TextAnchor.MiddleCenter);
            SetAnchors(t.rectTransform, 0.08f, 0.12f, 0.92f, 0.88f);
            return rt;
        }

        public static Image MeterBar(Transform parent, string name, Sprite fillSprite, float fill01)
        {
            GothicArt.Ensure();
            var track = Panel(parent, name, Color.white);
            var trackImg = track.GetComponent<Image>();
            if (GothicArt.MeterTrack != null)
            {
                trackImg.sprite = GothicArt.MeterTrack;
                trackImg.type = Image.Type.Sliced;
                trackImg.color = Color.white;
            }
            else trackImg.color = new Color(0, 0, 0, 0.4f);

            var fill = Panel(track, "Fill", Color.white);
            var fillImg = fill.GetComponent<Image>();
            fillImg.sprite = fillSprite ?? GothicArt.MeterFillGold;
            if (fillImg.sprite != null) fillImg.type = Image.Type.Sliced;
            fillImg.color = Color.white;
            var frt = fill.GetComponent<RectTransform>();
            frt.anchorMin = Vector2.zero;
            frt.anchorMax = new Vector2(Mathf.Clamp01(fill01), 1f);
            frt.offsetMin = new Vector2(3, 3);
            frt.offsetMax = new Vector2(-3, -3);
            return fillImg;
        }
    }
}

