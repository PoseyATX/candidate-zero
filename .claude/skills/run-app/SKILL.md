---
name: run-app
description: Launch, run, start, serve, drive, or screenshot the actual application in any project. Detects how the project runs, boots it headless, clicks through real user flows, reads the live DOM, and captures screenshots. Use when asked to run or start the app, take a screenshot, smoke-test a UI, reproduce a bug in the running app, or confirm a change works for real rather than only in tests.
---

# run-app

Project-agnostic. Drop this directory into any repo's `.claude/skills/` (or
`~/.claude/skills/`) and it works without editing — it knows nothing about the
project until `detect.mjs` reads it.

Two scripts:

| Script | Job |
|---|---|
| `detect.mjs` | Read the project, print a RUN PLAN with evidence. Runs nothing. |
| `driver.mjs` | Own a headless Chromium on the running app. Click, read, eval, screenshot. |

Paths below are written from the **repo root**, with the skill at
`.claude/skills/run-app/`. Adjust the prefix if you installed it globally.

## 1. Ask what this project is

Always start here. Never guess the launch command from the README — READMEs
document intent, `detect.mjs` reports what is actually in the manifests, and
tells you which file each claim came from.

```bash
node .claude/skills/run-app/detect.mjs
```

```
RUN PLAN — candidate-zero  (web, node)

  install   npm install
  build     npm run build
  test      npm run harness
  run       npm run dev
  serve     npm run preview
  url       http://localhost:4173/candidate-zero/

  driver    browser
            node .claude/skills/run-app/driver.mjs --serve "npm run preview" --url http://localhost:4173/candidate-zero/

Evidence
  · package manager from lockfile → npm install   [lockfile]
  · no "test" script; using "harness"   [package.json:scripts.harness]
  · vite dependency; port 4173, base /candidate-zero/   [vite.config.*]
  · interactive entry point: npm run play   [package.json:scripts.play]

Warnings
  ! vite base is "/candidate-zero/" — the bare server root will 404.
```

`--json` for machine-readable output; a directory argument to point it
elsewhere. The `driver` line tells you which section below applies:
`browser`, `curl`, `stdio`, `import`, or `electron-repl`.

Read the **Warnings**. They are the difference between a working URL and ten
minutes staring at a blank page.

## 2. Drive it — `driver` is `browser`

Install deps and build first (`install` then `build` from the plan), then paste
the driver line the plan printed. The driver backgrounds the serve command,
waits for the port, launches Chromium, and reads commands from stdin.

Piped, for a scripted flow:

```bash
printf 'boot\nmap\nss home\noverlays\nerrors\nquit\n' \
  | node .claude/skills/run-app/driver.mjs \
      --serve "npm run preview" --url http://localhost:4173/candidate-zero/
```

```
ok boot http://localhost:4173/candidate-zero/ title="Candidate Zero — Alpha"
ok map
    headings:
      Candidate Zero
    buttons:
      #btn-title-start BEGIN THE CLIMB
      #btn-title-howto HOW TO PLAY
ok ss /home/user/candidate-zero/.run-shots/home.png
ok overlays 0
ok errors 0
```

Every command prints exactly one `ok …` or `err …` line, so
`| grep '^err'` is a sufficient pass/fail check for a scripted run.

### Commands

| Command | Does |
|---|---|
| `boot [url]` | Start server (if `--serve`), launch browser, navigate |
| `map` | **Start here on an unfamiliar app.** Dumps visible headings, buttons, inputs, links with their ids |
| `overlays` | **The debugging command.** Lists full-screen fixed elements, highest z-index first, with the id of each one's dismiss button |
| `dismiss [ms] <sel…>` | Click the first visible selector, wait for it to leave, repeat. Clears stacked overlays |
| `click <sel>` / `clicktext <text>` | Real user click (dispatches pointer events) |
| `fill <sel> <value>` | Fill an input |
| `text <sel>` / `count <sel>` / `visible <sel>` | Read the live DOM |
| `eval <js>` | Evaluate an expression in the page |
| `ss <name> [full]` | Screenshot → `.run-shots/<name>.png` |
| `wait <sel>` / `waitms <n>` | Wait for a selector / fixed delay |
| `reset` | `localStorage.clear()` + reload — forces first-run state |
| `reload` / `goto <url>` / `url` | Navigation |
| `errors` | Every page error and console error since boot |
| `quit` | Close browser, kill server |

Flags: `--serve` (command to background), `--url`, `--viewport 390x844`,
`--touch` (touch + mobile emulation), `--shots <dir>`, `--cwd <dir>`.

### A real flow, end to end

Ten commands from cold start to a running app one week deep, verified in this
container. `map` supplied the ids; `overlays` supplied the dismiss targets.

```bash
printf 'boot\nreset\nclick #btn-title-start\nclick .id-card[data-kind="persona"][data-id="teacher"]\nclick .id-card[data-kind="issue"][data-id="taxes"]\nclick .id-card[data-kind="district"][data-id="open"]\nclick .id-card[data-kind="region"][data-id="east"]\nfill #seed-input 4242\nclick #btn-start\ndismiss #act-splash-ok #result-go #outside-weather-ok\nclick .play-card\nclick #btn-play-detail\ndismiss #result-go #act-splash-ok #outside-weather-ok\ntext #hud\nclick #btn-end\ndismiss #result-go #act-splash-ok #outside-weather-ok\ntext #hud\nss driven\nerrors\nquit\n' \
  | node .claude/skills/run-app/driver.mjs \
      --serve "npm run preview" --url http://localhost:4173/candidate-zero/ \
      --viewport 390x844 --touch
```

```
ok dismiss cleared=1
ok click .play-card
ok click #btn-play-detail
ok dismiss cleared=1
ok text #hud "Teacher Property taxes PRIMARY $200 HEAT CUTS W1/14 0/600"
ok click #btn-end
ok dismiss cleared=1
ok text #hud "Teacher Property taxes PRIMARY $200 HEAT CUTS W2/14 0/600"
ok ss /home/user/candidate-zero/.run-shots/driven.png
ok errors 0
```

The `W1/14` → `W2/14` change is the proof the app actually advanced. **Look at
the screenshot.** A blank or error page still prints `ok ss`.

### Interactive, under tmux

For open-ended poking where you don't know the next command yet:

```bash
tmux new-session -d -s app "node .claude/skills/run-app/driver.mjs \
  --serve 'npm run preview' --url http://localhost:4173/candidate-zero/ 2>&1 | tee /tmp/drv.log"
sleep 12
tmux send-keys -t app "boot" Enter
sleep 15
tmux send-keys -t app "map" Enter
sleep 3
tmux capture-pane -t app -p | tail -15
tmux send-keys -t app "quit" Enter
tmux kill-session -t app
```

`boot` takes 10–20s (server start + first page load). Sleep before capturing or
you'll read an empty pane and think it hung.

## 3. Other project shapes

**`driver` is `curl`** — background the `serve` command, poll until it answers,
then hit real endpoints. Confirm the port from the startup banner: for
non-Node servers the plan's port is a convention, and it says so in Warnings.

**`driver` is `stdio`** — a CLI. Pipe answers to it; one line per prompt. This
drove the interactive shell in this repo:

```bash
printf '\n1\n\n' | npm run play
```

Blank lines accept defaults. For a CLI that needs to stay alive between inputs,
wrap it in tmux exactly as above.

**`driver` is `import`** — a library. Import it and call it directly; there is
no app to launch. This is the right layer when a change touches one internal
function rather than the UI.

**`driver` is `electron-repl`** — desktop. `detect.mjs` flags it and stops:
the browser driver here does **not** drive Electron. You need `xvfb-run` plus
Playwright's `_electron` API. Not exercised in this container.

## Gotchas

These cost real time. Each one is why a specific driver command exists.

- **`el.click()` inside the page does not fire pointer events.** It dispatches a
  bare `click`. Any handler bound to `pointerdown` — standard for mobile-first
  UIs that want instant response — ignores it completely and silently. An
  overlay looked permanently stuck until I stopped clicking in-page and used
  Playwright's real input. `dismiss` finds elements in-page but clicks through
  Playwright for exactly this reason.
- **`offsetParent` is null for every `position: fixed` element.** The common
  visibility check therefore reports modals, drawers, and fixed app shells as
  hidden while they're plainly on screen. The driver measures
  `getBoundingClientRect()` instead. This single mistake made a fully visible
  game screen report as `none`.
- **Overlays paint *after* the action that triggers them.** A result splash
  waits for the card sheet to close first, landing several hundred ms late. A
  fixed grace period is a guess about animation timing and it loses — `dismiss`
  polls for up to 2s (`dismiss 5000 <sel>` to extend).
- **Re-clicking a fading overlay falls through to whatever is underneath.**
  During its exit animation it's still on screen but already
  `pointer-events: none`. A naive dismiss loop clicked "Continue" eight times
  and opened a random card behind it. `dismiss` waits for each overlay to
  actually leave before looking for the next.
- **`vite preview` ignores `server.port`.** That key configures dev only;
  preview serves 4173 unless `preview.port` is set. Reading the first `port:` in
  the config sends you to a dead URL.
- **A `base` in the vite config makes the server root 404.** Only
  `localhost:<port><base>/` renders. This is the most common "blank page".
- **Client state persists across reloads.** Apps resume a stale session instead
  of showing the first-run flow you're trying to test. `reset` before any flow
  that starts from zero.
- **Touch is not a synonym for mouse.** Some bugs reproduce only under
  `--touch`, because touch emits ghost clicks up to ~300ms after the overlay is
  gone. Use `--touch` for anything phone-first.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `err click locator.click: Timeout 8000ms exceeded` | A full-screen overlay is eating the click. Run `overlays` — line one is the culprit and the report names its dismiss button. Then `dismiss #that-button`. |
| `ok dismiss cleared=0` but the overlay is visibly there | Its handler is on `pointerdown` and something clicked it in-page, or it paints later than the 2s budget. Raise it: `dismiss 5000 #btn`. |
| `dismiss` clears more than expected, then random UI is open | Old symptom of re-clicking a fading overlay; the driver now waits for each to leave. If it recurs, dismiss one selector per command. |
| Blank page, `ok boot` succeeded | Wrong URL — check the `base` warning in the RUN PLAN. Then `errors` for a JS crash. |
| `err boot nothing listening at … after 30s` | The `--serve` command failed on its own. Run it in the foreground to see why; a missing build is the usual cause. |
| `err boot playwright not installed` | `npm i -D playwright`. Browsers are usually already on the image — don't run `playwright install` in a sandbox that pins `PLAYWRIGHT_BROWSERS_PATH`. |
| `err eval SyntaxError: Invalid or unexpected token` | Smart quotes. `eval` takes plain ASCII JS. |
| tmux pane looks empty | `boot` takes 10–20s. Sleep longer before `capture-pane`. |

Screenshots land in `.run-shots/` at the repo root. Add it to `.gitignore`.
