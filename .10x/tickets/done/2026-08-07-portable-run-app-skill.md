Status: done
Created: 2026-08-07
Updated: 2026-08-07

# Portable run-app skill (cross-project)

## Scope
A project-agnostic Claude skill that lets an agent launch and drive the real
running app in ANY repo: detect how the project runs, boot it headless, click
through a real user flow, screenshot. Installed at `.claude/skills/run-app/`
and mirrored to `~/.claude/skills/run-app/`.

## Non-goals
- Any change to candidate-zero itself. `src/` is untouched; this repo is the
  test fixture, not the subject.
- Electron/desktop driving. `detect.mjs` identifies it and refers out.

## Acceptance Criteria
1. Detects project kind + run commands across multiple ecosystems, with evidence.
2. Drives a real running web app: click, read DOM, screenshot, report errors.
3. Every code block in SKILL.md is a command actually executed in-container.

## Assumptions
- Portable skill, not repo-specific — user-ratified after an initial wrong
  reading that produced a candidate-zero-specific skill (deleted).
- Commit here + install globally — user-ratified.

## Journal
- Initially built a repo-specific `run-candidate-zero` skill. Wrong unit
  boundary; the generator says to ask when ambiguous and I did not. Deleted.
- Rebuilt as `run-app`: `detect.mjs` (heuristic reporter, runs nothing) +
  `driver.mjs` (stdin REPL over headless Chromium via playwright).
- Drove candidate-zero cold-start → week 2 with a card played, 0 page errors.

## Blockers
None.

## Evidence
1. `detect.mjs` verified against 7 fixtures: candidate-zero (vite/web),
   next, express, go+gin, python+fastapi, rust+axum, node library, electron.
   Each produced the correct kind/driver and cited its source file.
2. Driver flow verified verbatim from SKILL.md: cold start → identity draft →
   card played → `#hud` advanced `W1/14` → `W2/14`, `ok errors 0`, screenshot
   written to `.run-shots/driven.png` and visually inspected (real game UI, not
   a blank/error page). Also verified interactively under tmux.
3. Bugs found and fixed during driving, each now a documented gotcha:
   - in-page `el.click()` never fires pointer events → `pointerdown` handlers
     ignore it; dismiss now clicks via Playwright's real input
   - `offsetParent` is null for `position: fixed` → rect-based visibility
   - overlays paint after their trigger → poll, don't grace-wait
   - re-clicking a fading overlay falls through → wait for it to leave
   - `vite preview` ignores `server.port` (4173, not 5173)

## Review
Self-reviewed against the generator's definition of done: app launched and
interacted with (not its test suite), harness committed beside the skill,
SKILL.md leads with the agent path, all code blocks executed this session.

## Retrospective
The costly failure was scope, not code: ~40 minutes went into a repo-specific
skill before confirming the unit boundary. The generator explicitly says to ask
when the boundary is unclear; "single-project repo" made it look unambiguous
and it was not. Five whys bottoms out at treating a plausible reading as a
ratified one — exactly the assumption-provenance failure to guard against.
Ask before boring in, not after.

Second lesson, durable: every driver bug here came from simulating user input
instead of generating it. In-page `el.click()` and `offsetParent` are both
"looks right, silently wrong" on modern UIs. Drive through the real input API.
