# Session handoff — Candidate Zero (2026-07-17)

Portable resume notes so you can continue on **this machine** or a **home machine**.

---

## Quick resume (same PC / same Windows user)

Sessions live on disk under `~/.grok/sessions/` and update continuously.

| Field | Value |
|-------|--------|
| **Session ID** | `019f6648-1c0a-7c71-9800-0d6379919f75` |
| **Session title** (search this) | `Candidate Zero — career + Pages + foundation` |
| **Working directory recorded** | `C:\Users\matth` |
| **Project path** | `C:\Users\matth\candidate-zero` |
| **Live site** | https://poseyatx.github.io/candidate-zero/ |
| **Repo** | https://github.com/PoseyATX/candidate-zero |

### Resume commands

```powershell
# Option A — TUI: open Grok, then:
#   /resume
#   filter/search: "Candidate Zero — career" or the session ID

# Option B — CLI by ID (from any directory):
grok --resume 019f6648-1c0a-7c71-9800-0d6379919f75

# Option C — most recent session for current cwd:
cd C:\Users\matth
grok --resume
```

Session folder (do not delete if you want full history):

```
C:\Users\matth\.grok\sessions\C%3A%5CUsers%5Cmatth\019f6648-1c0a-7c71-9800-0d6379919f75\
```

---

## Resume at home (different machine)

**Grok session transcripts do not auto-sync to GitHub.** Code and docs do.

### 1. Code (required)

```powershell
git clone https://github.com/PoseyATX/candidate-zero.git
# or: git pull origin main
cd candidate-zero
npm ci
npm run build
npm run harness   # optional full suite
```

### 2. Conversation context (optional)

**A. Use this handoff only** (simplest)  
Start a **new** Grok session in the project folder and say:

> Continue from `docs/SESSION-HANDOFF.md`. Repo is PoseyATX/candidate-zero. Persistent career is live on Pages. Foundation bootstrap + cards CSV done. Ask what I want next.

**B. Copy the full Grok session** (same chat history)

1. On this machine, copy the session directory:

   ```
   C:\Users\matth\.grok\sessions\C%3A%5CUsers%5Cmatth\019f6648-1c0a-7c71-9800-0d6379919f75\
   ```

2. On the home machine, put it under:

   ```
   %USERPROFILE%\.grok\sessions\<encoded-cwd-of-home-project>\019f6648-1c0a-7c71-9800-0d6379919f75\
   ```

   The **encoded cwd folder name** must match how Grok stores sessions for that home working directory (Grok creates it when you run there once). Easier path: run `grok` once from the project at home, then drop the session id folder next to other sessions under that cwd group, **or** keep the same username path layout if possible.

3. Resume:

   ```powershell
   grok --resume 019f6648-1c0a-7c71-9800-0d6379919f75
   ```

If resume is fussy about cwd, start fresh and paste the **Status snapshot** section below.

### 3. Auth at home

- Log into Grok (`auth` / `grok` login as usual).
- For `git push`: `gh auth login` or credential manager (this session eventually used working HTTPS push).
- GitHub MCP (if used) must be reconnected in Grok settings on that machine.

---

## Status snapshot (as of handoff)

### Git / deploy

| Item | Value |
|------|--------|
| Branch | `main` |
| Tip (at handoff write) | check `git log -1` after pull; was `bae0eab` + career commits |
| Pages deploy | Green for career + foundation pushes |
| Do not commit | `.push/`, `.push-*.json` temp MCP batches |

### Product shipped this arc

- **Persistent career:** Primary → General → Session (if win) → Interim → next Primary; persona permanent; thematic forks only for issue/district/region.
- **Shop + failure loot** (tangible UI kit strip, trophies).
- **Obligations** weekly tick; grounds affinity; TAX MAN debug persona (password UI-only; do not log).
- **Foundation bootstrap:** `docs/ARCHITECTURE.md` as expansion gates; `data/cards.csv` via `npm run export:cards`.
- **Article art:** `docs/art/candidate-zero-article-5x2.jpg` (5:2, 2000×800).

### Key docs

| Doc | Role |
|-----|------|
| `docs/ARCHITECTURE.md` | Layers, rulesets, balance gates before expansion |
| `docs/SRD-NOTES.md` | Design law / recovered SRD |
| `docs/BALANCE-NOTES.md` | Measured retunes |
| `docs/ROADMAP.md` | Phased work |
| `data/cards.csv` | Card inventory (regenerate after content changes) |
| `AGENTS.md` | Pass discipline: CLEAN · DEBUG · ROADMAP · SRD |

### Explicit open work (do next when expanding)

1. Ground-pick UI (engine affinity exists; player pick incomplete).
2. Full ally port (archive AL*).
3. Remaining rep grants needing counters.
4. Full session bill pipeline (deferred; thin session is intentional).
5. Expand content **only** via Architecture §6 gates (no mass archive dump).

### Commands

```powershell
npm run dev
npm run build
npm run harness
npm run export:cards
npm run harness:career
npm run harness:shop
```

---

## Handoff checklist for you

- [ ] `git pull` on home / this machine
- [ ] Confirm site: https://poseyatx.github.io/candidate-zero/
- [ ] Resume session **or** open new chat with this file as context
- [ ] Optional: commit article image if not already on `main` (`docs/art/…`)
- [ ] Delete local temp `.push*` folders if still present (not product code)

---

*Written so the next agent (or you) can continue without re-deriving the arc.*
