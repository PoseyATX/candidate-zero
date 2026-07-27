# Adding a sponsor promo card

Promo cards are supporter/sponsor cards. They never appear in the normal draft, shop, or weekly
growth pool — they're injected on a rare random roll (default 0.1% per week, at most once per run),
and they render **full-bleed**: the artwork fills the entire card face, with no title bar, cost seal,
or emblem drawn over it.

There are two ways to add one. Both take a couple of minutes.

---

## Option A — one command (recommended)

```bash
npm run promo:new -- \
  --id PR02 \
  --name "More Than a Handshake" \
  --art ~/Desktop/sponsor-art.jpg \
  --text "What the card does, in plain language."
```

That copies the art into place, writes the card definition, and registers it. Then:

```bash
npm run dev
# open http://localhost:5173/candidate-zero/?promo=PR02
```

Optional flags: `--tag "a favor"` (short flavour label), `--rate 0.001` (draw chance — see below).
Run `npm run promo:new -- --help` for the full list.

---

## Option B — by hand (3 steps)

### 1. Drop in the art

Save it as `src/assets/full-art/<ID>.jpg`

**The filename is the card id.** `PR02.jpg` → card id `PR02`.

| | |
|---|---|
| Formats | `.jpg` `.jpeg` `.png` `.webp` `.avif` `.svg` |
| Shape | **2:3 portrait** (e.g. 600×900, 1000×1500) |
| Minimum | 600×900 |
| Max file size | 500KB |

The art is cropped to fill (`object-fit: cover`), so keep anything important away from the very
edges. Because the card face *is* the artwork, the art should carry its own title/border treatment —
the game draws no text over it.

### 2. Define the card

Open `src/data/promo-plays.ts`. At the bottom there's a commented-out `TEMPLATE` block — copy it,
uncomment it, rename the const, and fill in the five marked fields:

```ts
export const PR02_Handshake: PlayCard = {
  id: 'PR02',                       // (1) must match the art filename
  n: 'More Than a Handshake',       // (2) title, shown in the brief + log
  tag: 'a favor',                   // (3) short flavour label
  d:                                // (4) brief text players read
    'What this card does, in plain language.',
  promoRate: 0.001,                 // (5) draw chance — see below

  // leave the rest as-is for a standard sponsor card
  cost: {},
  risk: 'SAFE',
  ph: [1, 2, 3],
  kind: 'promo',
  rarity: 'rare',
  residency: 'special',
  control: 'player',
  show: () => false,
  fullBleedArt: true,
  odds: () => 0.99,
  run: () => 'Flavour line shown when the card resolves.'
};
```

### 3. Register it

Last line of the same file:

```ts
export const PROMO_PLAYS: PlayCard[] = [PR01_PrettyFace, PR02_Handshake];
```

That's it — nothing else in the codebase needs to change. The art loader discovers the file by name,
and the injection engine picks up any card in `PROMO_PLAYS` that has a `promoRate`.

---

## Draw odds

`promoRate` is the chance, rolled once per in-game week, that the card drops into the player's deck.
It can land **at most once per run**.

| `promoRate` | Chance per week | Feel |
|---|---|---|
| `0.0005` | 0.05% | vanishingly rare |
| `0.001` | 0.1% | **default** — a genuine surprise |
| `0.01` | 1% | uncommon but likely across a long campaign |

When it hits, it goes straight into the player's hand and a line appears in the log:
*"A rare card finds the stack — <name>."*

## Previewing

Don't wait on the odds. Append `?promo=<ID>` to the URL and the card is forced into the opening hand:

```
http://localhost:5173/candidate-zero/?promo=PR02
```

Works on the live site too: `https://poseyatx.github.io/candidate-zero/?promo=PR02`

## Shipping it live

GitHub Pages deploys from **`main` only**. A card on any other branch will not appear on the live
site. Commit, merge to `main`, and the deploy workflow publishes it.

Check the run finished green at
[Actions → Deploy to GitHub Pages](https://github.com/PoseyATX/candidate-zero/actions).
If that workflow fails, the site keeps serving the previous build — so a red deploy means your card
silently won't be there.

## Checks

```bash
npm run typecheck        # card definition is well-formed
npm run check:card-art   # art sizes are within budget
npm run build            # full production build
```
