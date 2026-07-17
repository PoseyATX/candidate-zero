# Archive

`prototype-single-file.html` is the original single-file HTML/CSS/JS
prototype for Candidate Zero — 56 distinct play cards, the Standing
Actions strip, Committee/bill-heat session mechanics, Opportunity/Event
card pools. It predates and is the design source for the modular
TypeScript engine in `src/`.

**It is reference material, not live code.** Do not wire it up as the
site's `index.html` again — that happened by accident once already (a
2026-07-17 "Add files via upload" commit overwrote the real Vite shell
with this file, and the GitHub Pages deploy silently shipped it instead of
the modular engine's UI for an unknown period; see
`docs/BALANCE-NOTES.md`, "Cleanup / mechanics audit pass"). The actual
site entry point is the `index.html` at the repo root, which loads
`src/ui/main.ts`.

Retrieved from git history (`git show 0d532fa:index.html`) and placed here
so it's discoverable instead of buried — every "archive" or "prototype"
reference in `docs/AC1-NOTES.md` and `docs/BALANCE-NOTES.md` means this
file. It's also a real content source: most of its 56 cards, its
Session-stage mechanics, and its four-pool card structure (Campaign /
Session / Opportunities / Events) haven't been ported to the modular
engine yet — see `docs/SRD-NOTES.md` and `docs/ROADMAP.md` before
redesigning something from scratch that might already exist here.

`SRD v1` (per `AGENTS.md`) is the modular engine's mechanical law, not this
file — where they disagree, `docs/BALANCE-NOTES.md`'s reasoning for the
modular engine wins, deliberately (see `AC1-NOTES.md`'s "Intentional
deltas").
