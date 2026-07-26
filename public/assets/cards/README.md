# Drop card art PNGs here as {cardId}.png (~300px). Register in CARD_ART_PATH when shipping.

For full-bleed card art (art fills the whole card face, no name/cost chrome —
e.g. promo cards), don't use this folder: drop an `<id>.svg` in
`src/assets/full-art/` instead and set `fullBleedArt: true` on the card's
data. It gets inlined at build time (see `src/ui/card-face.ts`), which avoids
404s/duplication issues that a `public/`-served file has. See
`src/data/promo-plays.ts` for the full walkthrough.
