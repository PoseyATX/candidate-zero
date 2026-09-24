# The table — `src/three/`

The game is played on a WebGL table. This is what it is, how it binds to the
engine, and what is not done yet.

## Why this exists

The project had a real engine and no game. 11,239 lines of harness and 8,885
lines of docs stood against a presentation layer that was a list of buttons —
"low graphics, high complexity" had become "no graphics, complexity nobody
meets". The owner asked for three.js. The engine was never the problem, so the
salvage was not a rewrite: **keep every rule, replace the surface.**

Nothing in `src/engine`, `src/data`, or `src/harness` was changed to make this
client work. It binds to the same frozen API a Unity host binds to.

## The boundary

```
src/three/client.ts  ──▶  src/engine/api.ts  ──▶  the rules
                          newGame / view / legalActions / apply / serialize
```

The client may **read** the engine and **send it commands**. It may never
decide an outcome. Every number drawn on a card came out of `view()`; every
consequence came out of `apply()`. If you find a rule in `src/three/`, that is
a bug — move it behind the API where Unity and the CLI get it too.

## The files

| File | What it owns |
|---|---|
| `stage.ts` | Renderer, room, lamp, camera, raycasting |
| `cards.ts` | A card as a physical object — rounded stock, thickness, two faces |
| `paint.ts` | Every texture in the scene, drawn to canvas from card data |
| `hand.ts` | Pure layout: where a card sits and how it is turned |
| `grounds.ts` | The precincts as plaques you can put a card on |
| `hud.ts` | The paperwork: ledger, goal strip, docket, record, inspector |
| `client.ts` | Binds snapshot ↔ scene; the only file that talks to the engine |
| `tween.ts` | The animation runner |

Card faces are **drawn from card data at deal time**, not shipped as art. A new
card in `src/data` draws itself the first time it is dealt — there is no atlas
to keep in sync and no gate to pay to add a card.

## Three bugs this build found and fixed

Written down because each one was invisible until something drove the real
scene, and each would have read to a player as "the game is broken":

1. **A cancelled tween never settled.** Superseding an animation dropped it
   without resolving its promise, so anything awaiting it waited forever. Moving
   the mouse while a card was in flight stopped the turn dead: the engine was
   never asked, the HUD never repainted. `cancel()` now settles.
2. **Hovering a card moved it out from under the pointer.** The card lifted
   toward the camera, so the click that followed hit empty felt and cleared the
   selection — the hand was, in practice, unclickable. Hit targets are now
   invisible proxies parked at the resting pose; only the visible card animates.
3. **The inspector rebuilt itself on every pointer move**, destroying the commit
   button between mousedown and mouseup. It now rebuilds only when its contents
   actually change.

A fourth, less dramatic: state used to wait on animation, so on a software
renderer the ledger lagged the engine by seconds. The ledger now repaints the
instant the engine rules; cards fly off on their own clock.

## Gates

- `npm run smoke:three` — drives the real built app: deals a hand, finds a card
  by raycast, selects it, commits it, turns the week, reloads and resumes.
- `npm run a11y` — axe-core WCAG 2 A/AA over title / filing / run / inspector,
  plus 320px reflow and target size.
- `npm run a11y:legacy` — the same audit over the DOM build, fourteen states.

All three run in CI and block.

## What is NOT done

Stated plainly, because a foundation described as finished is a lie:

- **No card art.** Faces are typographic — a risk band, a name, a seal, a star.
  They read well and they are not illustration.
- **No sound.** Not a note of it.
- **The Session is unvisited.** The bill pipeline, the docket provisions and the
  sine die verdict all exist in the engine and are surfaced only as text in the
  docket panel. The chamber deserves its own room on the table and does not
  have one.
- **Outside events are a sheet of text**, not a scene.
- **No camera control.** No orbit, no zoom, no way to lean in on the table.
- **The shop, obligations and allies** appear as ordinary cards rather than as
  places or people you can look at.
- **Draft offers rise from the table but the choice is still made in the sheet**
  next to them, not by picking the card itself up.
- **Legacy DOM build still ships** at `/legacy.html`, fully gated: `smoke:ui`
  drives it, and `a11y:legacy` audits every beat of its filing scene, the
  in-game states, and a full run through to the terminal screen.
