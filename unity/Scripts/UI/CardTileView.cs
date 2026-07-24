// Scripted card face: pool + Bind(data). Shared chrome + IconCatalog icons.
// No per-card PNGs. Soft glossy chrome — not pixel art.
using System.Collections.Generic;
using CandidateZero.Content;
using CandidateZero.HostData;
using UnityEngine;
using UnityEngine.UI;

namespace CandidateZero.UI
{
    public sealed class CardTileView : MonoBehaviour
    {
        public const float Width = 280f;
        public const float Height = 420f;

        private Image _bg;
        private Image _gold;
        private Image _edge;
        private Image _artPlate;
        private Image _emblemImg;
        private Image _costBg;
        private Image _kindBg;
        private Image _namePlate;
        private Image _footerBg;
        private Text _kindMark;
        private Text _costSeal;
        private Text _name;
        private Text _tag;
        private Text _footer;
        private Text _stamp;
        private Button _button;
        private LayoutElement _layout;

        public static CardTileView Ensure(GameObject go)
        {
            var v = go.GetComponent<CardTileView>();
            if (v != null) return v;
            v = go.AddComponent<CardTileView>();
            v.BuildChrome();
            return v;
        }

        private void BuildChrome()
        {
            GothicArt.Ensure();
            CzFonts.Ensure();
            IconCatalog.Ensure();

            var rt = GetComponent<RectTransform>() ?? gameObject.AddComponent<RectTransform>();
            rt.sizeDelta = new Vector2(Width, Height);

            _layout = gameObject.GetComponent<LayoutElement>() ?? gameObject.AddComponent<LayoutElement>();
            LockSize();

            _bg = gameObject.GetComponent<Image>() ?? gameObject.AddComponent<Image>();
            _bg.sprite = GothicArt.Parchment;
            _bg.type = Image.Type.Sliced;
            _bg.color = Color.white;
            _bg.raycastTarget = true;

            // Soft drop only — no hard Outline (pixel edges)
            CzChrome.SoftShadow(gameObject);

            _gold = ChildImage("Gold", Color.white);
            SetAnchors(_gold.rectTransform, 0f, 0f, 1f, 1f);
            _gold.sprite = GothicArt.GoldRing;
            _gold.type = Image.Type.Sliced;
            _gold.raycastTarget = false;

            _edge = ChildImage("Risk", Color.gray);
            SetAnchors(_edge.rectTransform, 0.012f, 0.08f, 0.04f, 0.92f);
            _edge.raycastTarget = false;

            _kindBg = ChildImage("KindBg", Color.white);
            SetAnchors(_kindBg.rectTransform, 0.05f, 0.80f, 0.22f, 0.95f);
            _kindBg.sprite = GothicArt.SealDisc;
            _kindBg.preserveAspect = true;
            _kindBg.raycastTarget = false;

            _kindMark = ChildText("Kind", 22, FontStyle.Bold, CzTheme.Ink);
            SetAnchors(_kindMark.rectTransform, 0.05f, 0.80f, 0.22f, 0.95f);
            _kindMark.alignment = TextAnchor.MiddleCenter;
            CzFonts.Apply(_kindMark, CzFonts.BodyBold, 22, FontStyle.Bold, CzTheme.Ink);

            _costBg = ChildImage("CostBg", Color.white);
            SetAnchors(_costBg.rectTransform, 0.68f, 0.78f, 0.96f, 0.96f);
            _costBg.sprite = GothicArt.SealDisc;
            _costBg.preserveAspect = true;
            _costBg.raycastTarget = false;

            _costSeal = ChildText("Cost", 22, FontStyle.Bold, CzTheme.Ink);
            SetAnchors(_costSeal.rectTransform, 0.68f, 0.78f, 0.96f, 0.96f);
            _costSeal.alignment = TextAnchor.MiddleCenter;
            CzFonts.Apply(_costSeal, CzFonts.BodyBold, 22, FontStyle.Bold, CzTheme.Ink);

            _stamp = ChildText("Stamp", 20, FontStyle.Bold, CzTheme.Oxblood);
            SetAnchors(_stamp.rectTransform, 0.24f, 0.84f, 0.66f, 0.94f);
            _stamp.alignment = TextAnchor.MiddleCenter;
            CzFonts.Apply(_stamp, CzFonts.BodyBold, 20, FontStyle.Bold, CzTheme.Oxblood);

            // Soft art plate (no outline)
            _artPlate = ChildImage("ArtPlate", new Color(0.92f, 0.87f, 0.76f, 0.65f));
            SetAnchors(_artPlate.rectTransform, 0.12f, 0.44f, 0.88f, 0.76f);
            _artPlate.raycastTarget = false;

            _emblemImg = ChildImage("EmblemImg", Color.white);
            SetAnchors(_emblemImg.rectTransform, 0.28f, 0.48f, 0.72f, 0.72f);
            _emblemImg.preserveAspect = true;
            _emblemImg.raycastTarget = false;

            _namePlate = ChildImage("NamePlate", new Color(0.97f, 0.93f, 0.84f, 0.96f));
            SetAnchors(_namePlate.rectTransform, 0.06f, 0.18f, 0.94f, 0.42f);
            _namePlate.raycastTarget = false;

            _name = ChildText("Name", 28, FontStyle.Bold, CzTheme.Ink);
            SetAnchors(_name.rectTransform, 0.07f, 0.19f, 0.93f, 0.41f);
            _name.alignment = TextAnchor.MiddleCenter;
            CzFonts.Apply(_name, CzFonts.Title, CzFonts.CardName, FontStyle.Bold, CzTheme.Ink);
            _name.horizontalOverflow = HorizontalWrapMode.Wrap;
            _name.verticalOverflow = VerticalWrapMode.Truncate;

            _tag = ChildText("Tag", 22, FontStyle.Normal, new Color(0.18f, 0.12f, 0.08f));
            SetAnchors(_tag.rectTransform, 0.07f, 0.10f, 0.93f, 0.18f);
            _tag.alignment = TextAnchor.MiddleCenter;
            CzFonts.Apply(_tag, CzFonts.Body, CzFonts.CardMeta, FontStyle.Normal, new Color(0.18f, 0.12f, 0.08f));

            _footerBg = ChildImage("FooterBg", new Color(0.12f, 0.08f, 0.05f, 0.90f));
            SetAnchors(_footerBg.rectTransform, 0.05f, 0.02f, 0.95f, 0.10f);
            _footerBg.raycastTarget = false;

            _footer = ChildText("Footer", 20, FontStyle.Bold, CzTheme.Parchment);
            SetAnchors(_footer.rectTransform, 0.06f, 0.02f, 0.94f, 0.10f);
            _footer.alignment = TextAnchor.MiddleCenter;
            CzFonts.Apply(_footer, CzFonts.BodyBold, CzFonts.CardMeta, FontStyle.Bold, CzTheme.Parchment);

            _button = gameObject.GetComponent<Button>() ?? gameObject.AddComponent<Button>();
            _button.targetGraphic = _bg;
            var colors = _button.colors;
            colors.normalColor = Color.white;
            colors.highlightedColor = new Color(1f, 0.98f, 0.94f);
            colors.pressedColor = new Color(0.92f, 0.88f, 0.80f);
            colors.fadeDuration = 0.08f;
            _button.colors = colors;
        }

        private void LockSize()
        {
            _layout.preferredWidth = Width;
            _layout.preferredHeight = Height;
            _layout.minWidth = Width;
            _layout.minHeight = Height;
            _layout.flexibleWidth = 0;
            _layout.flexibleHeight = 0;
            var rt = GetComponent<RectTransform>();
            if (rt != null) rt.sizeDelta = new Vector2(Width, Height);
        }

        public void Bind(ActionView action, CardDefinition def, UnityEngine.Events.UnityAction onClick)
        {
            if (_bg == null) BuildChrome();
            LockSize();

            gameObject.name = action.cardId ?? action.name ?? "card";
            var kindKey = !string.IsNullOrEmpty(action.kind)
                ? action.kind
                : def != null ? def.kind.ToString() : null;
            var accent = KindAccent(kindKey);

            _bg.sprite = GothicArt.Parchment;
            _bg.type = Image.Type.Sliced;
            _bg.color = KindWash(kindKey);
            _gold.enabled = true;
            _gold.sprite = GothicArt.GoldRing;
            _edge.color = RiskColor(action.risk ?? def?.risk);

            // Existing vector icons — never bake
            var icon = (def != null && def.emblem != null)
                ? def.emblem
                : IconCatalog.GetForCard(action.cardId, kindKey);
            if (icon == null) icon = GothicArt.StarEmblem;
            _emblemImg.sprite = icon;
            _emblemImg.color = Color.white;
            _emblemImg.enabled = true;

            _kindMark.text = KindMark(kindKey);
            _kindMark.color = accent;
            CzFonts.Apply(_kindMark, CzFonts.BodyBold, 22, FontStyle.Bold, accent);

            var cost = action.costLabel;
            if (string.IsNullOrEmpty(cost) && def != null) cost = def.CostLabel;
            _costSeal.text = string.IsNullOrEmpty(cost) ? "free" : ShortCost(cost);
            CzFonts.Apply(_costSeal, CzFonts.BodyBold, 22, FontStyle.Bold, CzTheme.Ink);

            _name.text = action.name ?? def?.cardName ?? action.cardId ?? "?";
            CzFonts.Apply(_name, CzFonts.Title, CzFonts.CardName, FontStyle.Bold, CzTheme.Ink);

            var tag = action.tag;
            if (string.IsNullOrEmpty(tag) && def != null) tag = def.tagline;
            _tag.text = string.IsNullOrEmpty(tag) ? "" : "\u201c" + Trunc(tag, 40) + "\u201d";
            _tag.gameObject.SetActive(!string.IsNullOrEmpty(_tag.text));
            if (_tag.gameObject.activeSelf)
                CzFonts.Apply(_tag, CzFonts.Body, CzFonts.CardMeta, FontStyle.Normal, new Color(0.18f, 0.12f, 0.08f));

            if (action.camp)
            {
                _stamp.text = "CAMP";
                _stamp.gameObject.SetActive(true);
                CzFonts.Apply(_stamp, CzFonts.BodyBold, 20, FontStyle.Bold, CzTheme.Oxblood);
            }
            else if (action.field)
            {
                _stamp.text = "FIELD";
                _stamp.gameObject.SetActive(true);
                CzFonts.Apply(_stamp, CzFonts.BodyBold, 20, FontStyle.Bold, CzTheme.Sage);
            }
            else _stamp.gameObject.SetActive(false);

            var bits = new List<string>(4);
            var risk = action.risk ?? def?.risk;
            if (!string.IsNullOrEmpty(risk)) bits.Add(risk.ToUpperInvariant());
            if (action.approxOdds.HasValue) bits.Add($"p≈{action.approxOdds.Value:0%}");
            if (action.field) bits.Add("FIELD");
            if (action.camp) bits.Add("CAMP");
            _footer.text = bits.Count > 0 ? string.Join("  ·  ", bits) : "—";
            CzFonts.Apply(_footer, CzFonts.BodyBold, CzFonts.CardMeta, FontStyle.Bold, CzTheme.Parchment);

            _button.onClick.RemoveAllListeners();
            if (onClick != null) _button.onClick.AddListener(onClick);
        }

        static string ShortCost(string cost)
        {
            if (string.IsNullOrEmpty(cost)) return "—";
            if (cost.Length <= 10) return cost;
            var parts = cost.Split(new[] { '·', '|', ',' }, System.StringSplitOptions.RemoveEmptyEntries);
            var first = parts[0].Trim();
            return first.Length <= 10 ? first : first.Substring(0, 9);
        }

        static string Trunc(string s, int n) =>
            string.IsNullOrEmpty(s) ? "" : s.Length <= n ? s : s.Substring(0, n - 1) + "…";

        private Image ChildImage(string name, Color c)
        {
            var existing = transform.Find(name);
            Image img;
            if (existing != null)
                img = existing.GetComponent<Image>() ?? existing.gameObject.AddComponent<Image>();
            else
            {
                var go = new GameObject(name, typeof(RectTransform), typeof(Image));
                go.transform.SetParent(transform, false);
                img = go.GetComponent<Image>();
            }
            img.color = c;
            img.raycastTarget = false;
            return img;
        }

        private Text ChildText(string name, int size, FontStyle style, Color c)
        {
            var existing = transform.Find(name);
            Text t;
            if (existing != null)
                t = existing.GetComponent<Text>() ?? existing.gameObject.AddComponent<Text>();
            else
            {
                var go = new GameObject(name, typeof(RectTransform), typeof(Text));
                go.transform.SetParent(transform, false);
                t = go.GetComponent<Text>();
            }
            CzFonts.Apply(t, CzFonts.Body, size, style, c);
            return t;
        }

        private static void SetAnchors(RectTransform rt, float x0, float y0, float x1, float y1)
        {
            rt.anchorMin = new Vector2(x0, y0);
            rt.anchorMax = new Vector2(x1, y1);
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
        }

        private static Color RiskColor(string risk)
        {
            if (string.IsNullOrEmpty(risk)) return CzTheme.GoldDim;
            return risk.ToUpperInvariant() switch
            {
                "SAFE" => new Color(0.18f, 0.42f, 0.19f),
                "STD" => CzTheme.GoldDim,
                "VOL" => new Color(0.63f, 0.33f, 0.11f),
                "CHOICE" => new Color(0.25f, 0.37f, 0.54f),
                _ => CzTheme.GoldDim
            };
        }

        private static Color KindWash(string kind)
        {
            if (string.IsNullOrEmpty(kind)) return Color.white;
            return kind.ToLowerInvariant() switch
            {
                "bargain" => new Color(1f, 0.97f, 0.95f),
                "ally" => new Color(0.97f, 1f, 0.96f),
                "item" => new Color(1f, 0.99f, 0.94f),
                "location" => new Color(0.96f, 0.98f, 1f),
                "liability" => new Color(1f, 0.97f, 0.94f),
                "blackmail" => new Color(0.98f, 0.97f, 1f),
                _ => Color.white
            };
        }

        private static Color KindAccent(string kind)
        {
            if (string.IsNullOrEmpty(kind)) return new Color(0.40f, 0.30f, 0.16f);
            return kind.ToLowerInvariant() switch
            {
                "bargain" => CzTheme.Oxblood,
                "ally" => new Color(0.35f, 0.42f, 0.29f),
                "item" => new Color(0.54f, 0.43f, 0.16f),
                "location" => new Color(0.25f, 0.37f, 0.48f),
                "liability" => new Color(0.43f, 0.26f, 0.15f),
                "blackmail" => new Color(0.29f, 0.26f, 0.44f),
                _ => new Color(0.40f, 0.30f, 0.16f)
            };
        }

        private static string KindMark(string kind)
        {
            if (string.IsNullOrEmpty(kind)) return "★";
            return kind.ToLowerInvariant() switch
            {
                "action" => "◆",
                "bargain" => "§",
                "ally" => "A",
                "item" => "I",
                "location" => "L",
                "liability" => "!",
                "blackmail" => "X",
                "bill" => "¶",
                _ => "★"
            };
        }
    }
}
