# Work log — Candidate Zero (modular)

**Purpose:** durable record of design + engineering work so humans and agents can rehydrate context without chat history.

**Board:** https://github.com/users/PoseyATX/projects/2  
**Live alpha:** https://poseyatx.github.io/candidate-zero/  
**Repo:** https://github.com/PoseyATX/candidate-zero  

**Last updated:** 2026-07-19  

Related docs:

| Doc | Role |
|---|---|
| [`PROJECT-BOARD.md`](./PROJECT-BOARD.md) | Ops roadmap mirror of Project #2 |
| [`ROADMAP.md`](./ROADMAP.md) | Evidence log (what shipped + harness proof) |
| [`GAME-FLOW.md`](./GAME-FLOW.md) | Current player-facing loop |
| [`SRD-NOTES.md`](./SRD-NOTES.md) | Design law recovered from archive |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Layers + ship path |
| Issues #4–#15 | Phase tickets + meta/bugs |

---

## Executive summary

Over this workstream we:

1. **Verified Phase 1** (grounds) and **implemented Phase 2–4** (allies/shop/obligations → debt leverage → legislative Session).
2. **Rejected bad designs** (debt→odds tax; Claude’s false “session already thin-done”).
3. **Cleaned GitHub issues** so Project #2 can be the operating roadmap (phases 0–4 closed with evidence; #9 NEXT).
4. **Hardened Pages** deploy and UI firm-up (ledger, shop, debt, session chrome).
5. **Debug pass** on Session feeling like a campaign loop + PAC Check free-money spam.
6. **Documented** current flow and a clear split: **vanilla chat for complexity vision**, **Grok Build for enforcement**.

**Ship path (owner direction):** pure TypeScript engine → Unity presentation shell → iOS / App Store.  
**Non-negotiable:** no second rules engine in C#/Unity.

---

## Timeline of work (this stream)

### Phase 1 — Ground-centered campaign (already largely done; closed out)

**Commits (approx):** `c3e4c7b`, `e8960ad`

| Deliverable | Where |
|---|---|
| Ground picker (UI + CLI), remember last ground | `src/ui/main.ts`, `src/cli/play.ts` |
| Same ground 2+/week: odds bump, −50% rapport | `getGroundPenalty` in `calendar.ts` |
| Rival presence cosmetic (5–40/week) | `advanceRivalGrounds`, `Ground.rivalRap` |
| `allyWarmAtGround` for AL09 field ops | `reputation.ts`, PL21B/PL39 |
| `checkBallotThreshold` sketch **unwired** | `career.ts` |
| `harness:grounds` | ~2.8 grounds contested under spread; sketch met 0% |

**Issue:** [#5](https://github.com/PoseyATX/candidate-zero/issues/5) closed DONE.

---

### Phase 2 — Allies / assets / obligations port

**Commit:** `57936c6` (plus related)

| Deliverable | Where |
|---|---|
| Asset shop (8 archive items, BUY* camp actions) | `src/data/assets.ts` |
| Obligations OB1–OB10 + weekly `drag` | `src/data/obligations.ts` |
| Ally grant matrix from archive (line citations) | `plays.ts`, `plays-wave4.ts`, events in `calendar.ts` |
| Intentional stubs AL05/07/10/13 | `src/data/allies.ts`, `harness:dead-refs` |
| Bill/Committee **types** (shape only at the time) | `types.ts` |
| Harnesses | `harness:shop`, `harness:obligations`, `harness:dead-refs` |

**Corrections to Claude brief:** shop/obls were *not* already done at Phase 2 start; archive has 8 shop assets not 10; Kitchen-Table is roster-wide (not ground-gated).

**Issue:** [#6](https://github.com/PoseyATX/candidate-zero/issues/6) closed DONE.

---

### Phase 3 — Debt as leveraged optionality (not odds tax)

**Commit:** `f7dff8f`

| Deliverable | Where |
|---|---|
| Core model | `src/engine/debt.ts` |
| Self-loan spend-now (PL21) | `applySelfLoan` |
| Win: cheap self retirement; PAC bridge → OB1 + `pac_lender_claim` | `retireDebtOnWin`, `maybePacBridge` |
| Loss: compound into `LegacyCarry`, affordability via `availableCash` | `canAfford` uses cash reserve, **never** `resolve.ts` |
| Crisis paths / PAC relief valve | `buildPaths`, `pacCheckAvailable` |
| `harness:debt` | leverage can outperform conservative money |

**Rejected design:** flat debt → resolve odds (wrong thematically and game-theoretically).

**Issue:** [#7](https://github.com/PoseyATX/candidate-zero/issues/7) closed DONE.

---

### Pages firm-up (playable alpha)

**Commit:** `6e8ec53`

- HUD/ledger: debt, spendable cash, allies, assets, obligations  
- Shop stamp + section; availableCash lock reasons  
- How-to text for grounds / shop / debt  
- Deploy: re-enabled workflow; manual `workflow_dispatch` (auto-push still limited by dead branch name + OAuth `workflow` scope — issue [#14](https://github.com/PoseyATX/candidate-zero/issues/14))

---

### Project board hygiene

**Commits:** `58d37c6`, `3ef7656`

- Closed issues **#4–#7** with evidence comments  
- Rewrote **#8** (Claude falsely claimed `session-plays.ts` / sine die already done)  
- Retargeted **#12** to TS → Unity → iOS / App Store  
- Added #13 meta, #14 deploy bug, #15 AC1 yield compare  
- `docs/PROJECT-BOARD.md` as agent-readable board mirror  
- **Note:** `gh` token lacked `read:project` / `project` scopes — board UI items must be linked by owner once scopes exist  

---

### Phase 4 — Legislative Session

**Commit:** `a04f991`

| Deliverable | Where |
|---|---|
| Enter Session on **general win** (same run) | `enterSessionFromGeneral` in `session.ts` / `calendar.ts` |
| 14-week sine die, filing deadline W6 | `SESSION_WEEKS`, `SESSION_FILING_DEADLINE` |
| Bill pipeline stages 0–8 + `BillStatus` | `Bill.pipelineStage`, SS01–SS07 |
| PAC claim on Seek Referral | `applyPacClaimOnReferral` |
| Session plays catalog | `src/data/session-plays.ts` |
| UI ledger (capital, favor, district, bill) | `src/ui/main.ts` |
| Outcomes | `session_law` \| `session_survived` \| `session_primaried` |
| `harness:session` | green |

**Issue:** [#8](https://github.com/PoseyATX/candidate-zero/issues/8) closed DONE.  
**NEXT phase:** [#9](https://github.com/PoseyATX/candidate-zero/issues/9) Balance breadth.

---

### Session / PAC debug pass (cookie-clicker feel + free money)

**Commit:** `f883a6e`

**Problems reported:**

1. Session felt like “looping into another campaign” (reelection / weak ceremony).  
2. PAC Check available multiple times → free money with weak consequence.  
3. Transitions not graspable; game reads as political cookie clicker.

**Fixes:**

| Fix | Detail |
|---|---|
| Session splash | Full-screen “You are sworn in” on `enter_session` |
| Session chrome | Header Session tag, “End legislative week”, stage frame, bill in week hint |
| Sine die terminal | Bill epitaph; reelection copy = **new cycle after Session**, not skip |
| PAC once | `pacCheckTaken` + hide if OB1 held; cash ~$1400–2300 (was 2500–4500) |
| HUD | `OB×N` chip for obligation drag |
| Flow doc | [`GAME-FLOW.md`](./GAME-FLOW.md) |

**Engine note:** Session entry on general win was already correct in engine traces; the failure mode was **readability + PAC spam + reelection UX**.

---

## Design decisions log (keep these)

1. **Brutal RNG stands** — no pity; feedback is annotation only.  
2. **Debt never taxes `resolve()` odds** — consequence is win/loss branch + affordability.  
3. **PAC Check is a trap, once per campaign** — Session collects.  
4. **Kitchen-Table allies are roster-wide** (archive); ground affinity is for field AL09.  
5. **Port over invent** for archive content; cite lines in comments.  
6. **Unity = presentation only** for ship path; TS owns rules.  
7. **Project board = ops roadmap; ROADMAP.md = evidence.** Code + harnesses beat agent vibes.  
8. **Complexity discussion ≠ implementation room** — use vanilla Grok (or long design chat) to decide depth; Grok Build to enforce.

---

## Current open queue (as of log date)

| Status | Issue | Title |
|---|---|---|
| **NEXT** | #9 | Phase 5 — Balance breadth (personas × districts × regions) |
| PLANNED | #10 | Phase 6 — Mobile-first UI + a11y |
| PLANNED | #11 | Phase 7 — Honest v0.1 label |
| PLANNED | #12 | Phase 8 — TS → Unity → iOS / App Store |
| META | #13 | Board hygiene rules |
| BUG | #14 | Pages deploy auto-fire / workflow scope |
| PLANNED | #15 | AC1 archive yield-table full compare |

Phases **0–4 closed** (#4–#8).

---

## Key code map

```
src/engine/
  resolve.ts      # RNG bands — covenant; do not use for debt tax
  play.ts         # executePlay, canAfford (availableCash)
  calendar.ts     # primary 8 / general 6 / session handoff + sine die
  session.ts      # enterSession, bill pipeline, PAC claim, sine die
  debt.ts         # self-loan, bridge, retirement, availableCash
  reputation.ts   # shadowCheck, repCheck, allies
  loop.ts         # campaign loop, catalog, listPlayableHand
  legacy.ts       # Chronicle, paths, carry (incl. debt)
src/data/
  plays.ts / plays-wave4.ts / session-plays.ts
  assets.ts / obligations.ts / allies.ts / setup.ts
src/ui/main.ts    # ground picker, shop, session splash/chrome, terminal
docs/GAME-FLOW.md # player-facing loop
```

---

## Harness suite (reference)

```bash
npm run harness          # full suite
npm run harness:grounds
npm run harness:shop
npm run harness:obligations
npm run harness:dead-refs
npm run harness:debt
npm run harness:session
```

CI: `.github/workflows/ci.yml`  
Pages: `.github/workflows/deploy.yml` (often via `gh workflow run deploy.yml --ref <branch>`)

---

## Outstanding product tension (for next design chat)

Owner feedback (paraphrased):

- Stage transitions must be **unmistakable** (tint / splash / different verbs) — still insufficient as of this log.  
- Desired **complexity depth** is larger than the current thin Session pipeline; current flow doc is “correct but too simple” for the intended product.  
- Recommendation logged: **vanilla Grok (or offline design) for complexity law**; **Grok Build for ceremony + systems enforcement** after a written brief.

When design locks, next engineering candidates:

1. **Ceremony pass** — distinct stage shells (primary / general / session), not just card show-gates.  
2. **Phase 5** balance matrix (#9).  
3. **Deeper Session** (archive events, Speaker pressure, real floor math) without reinventing `Bill` shape.

---

## How to use this log

- **Rehydrate a new agent:** read this file + `GAME-FLOW.md` + open issues.  
- **Argue status:** prefer harness output and this log over chat memory.  
- **Update rule:** after each phase or major debug pass, append a dated section here and bump “Last updated.”
