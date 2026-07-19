# How Candidate Zero runs (current iteration)

Snapshot: 2026-07-19 after Phase 4 Session + PAC/session debug pass.  
Live: https://poseyatx.github.io/candidate-zero/

This is the **player-facing** loop. Evidence and phase history live in
`docs/ROADMAP.md` / `docs/PROJECT-BOARD.md`.

---

## Big shape (one run)

```
Setup (persona · issue · district · region · seed)
        │
        ▼
┌─────────────────── PRIMARY (weeks 1–8) ───────────────────┐
│  Goal: make the ballot by end of week 8, then win primary  │
│  Phase 1 = not on ballot · Phase 2 = on ballot             │
│  Doors: Petition (labor) or Filing Fee (money)             │
│  Field plays → ground picker (rapport / opposition meters) │
│  Shop (0 AP): voter file, walk list, phone tree, …         │
│  Once: Self-Fund (PL21) · Once: PAC Check (PL20)           │
└────────────┬───────────────────────────────┬───────────────┘
             │ miss filing                   │ lose primary
             ▼                               ▼
        missed_filing                   lost_primary
             │                               │
             └──────────► Chronicle paths ◄──┘
                          (trait → next run)

             │ win primary
             ▼
┌─────────────────── GENERAL (weeks 9–14) ──────────────────┐
│  Phase 3 · TURNOUT KIT (not primary club math)             │
│  · Rapport seeds GOTV on enter · PL19 in hand              │
│  · Block walk / phone bank bank GOTV · PL08 off-table      │
│  · PL23 Rides (needs A06) · win math weights GOTV hard     │
│  End of week 14 rolls general                              │
└────────────┬───────────────────────────────┬───────────────┘
             │ lose                           │ win
             ▼                               ▼
        lost_general              ★ ENTER SESSION (same run)
                                  splash: “You are sworn in”
                                  NOT a new campaign

┌─────────────────── SESSION (weeks 1–14 sine die) ─────────┐
│  Still THIS run · legislative motions (SS*), not campaign  │
│  Signature bill · Speaker’s committee · 1 pipeline/week    │
│  TEETH: casework or district bleeds −2 · stall heat if bill│
│    sits · challenger heat if standing soft · speaker freeze│
│    blocks calendar/floor when favor low · weekly events    │
│  PAC string (OB1): bites on Seek Referral                  │
│  Filing deadline W6 · sine die W14 reelection roll         │
└────────────┬──────────────────┬────────────────┬───────────┘
             │                  │                │
             ▼                  ▼                ▼
      session_law        session_survived   session_primaried
      (bill signed,      (no law / near     (seat breaks —
       seat holds)        miss, seat holds)  Chronicle paths)

session_law / session_survived terminal:
  · Stand for Reelection → NEW election cycle as incumbent
    (skips petition; primary→general→session again)
  · Close the book → setup / Chronicle
```

---

## What is *not* a soft reset

| Event | Same run? | What you see |
|---|---|---|
| Primary → General | Yes | Phase draft, stage “General” |
| General win → Session | Yes | Full splash + Session chrome + bill ledger |
| Sine die → Reelection | **No** | New cycle (incumbent); Session already finished |
| Loss → Chronicle path | **No** | Trait banked; next run starts at setup |

If you win the general and land on setup without Session, that’s a bug —
report it. Engine path is `enter_session`, not `won_general` terminal.

---

## Money traps (current balance)

| Card | Limit | Cost of taking it |
|---|---|---|
| **PAC Check (PL20)** | **Once per campaign** | ~$1400–2300; Faces L −12; **OB1** weekly L/exposure drag; Session referral **−6 district standing** when you seek referral |
| **Self-Fund (PL21)** | Once | +$3000 cash; debt $4200; OB2 −$150/week; win retires cheap; loss compounds |

PAC cannot spam the hand after the first take (`pacCheckTaken` + hide if OB1 held).

---

## Stages & AP (quick)

| Stage | Weeks | AP focus |
|---|---|---|
| Primary | 1–8 | Ballot + force (contacts, name, chairs) |
| General | 9–14 | GOTV + contrast |
| Session | 1–14 (reset clock) | Bill pipeline + district standing |

Field AP (Canvass Captain / Field Director) is campaign-era only; Session uses legislative motions.

---

## Ceremony shells (three acts, same run)

Presentation layer (`src/ui/main.ts` + `styles.css`). Engine still owns transitions
(`enter_general`, `enter_session`); the shell makes them **unmistakable**.

| Act | Stage | Splash CTA | Persistent chrome | Kit feel |
|---|---|---|---|---|
| **I** | Primary | “File the papers” | Oxblood frame · banner · masthead **Primary** | Campaign hand + shop (Main) |
| **II** | General | “Take the field” | Slate/blue frame · **General** | Turnout kit: GOTV in hand; field → GOTV; rapport seed; no kitchen-table |
| **III** | Session | “Enter the chamber” | Gold frame · **Session** | Legislative SS* only (Special) |

- Full-screen splash on: run start, primary win → general, general win → session, reelection start.  
- Banner + end-week label + panel titles change with the act.  
- Session is still **this run**. Reelection after sine die is a **new cycle** (Act I again).

## How to *see* Session as a player

1. Clear primary (fee or petition) by week 8.  
2. Survive primary roll → **Act II splash** → play general with GOTV.  
3. Win general → **Act III splash** “You are sworn in” → header/banner **Session**.  
4. Play **File the Bill**, then week-gated pipeline; or casework.  
5. Sine die shows bill epitaph + seat hold/break — *then* reelection is a new cycle.

---

## Agent / harness map

| Command | What it proves |
|---|---|
| `npm run harness:session` | Enter session, file, PAC bite, sine die outcomes |
| `npm run harness:debt` | PAC/self-loan optionality, no odds tax |
| `npm run harness:full` | Full path including post-general session terminals |
| `npm run play` / Pages UI | Human path |

---

## Known intentional “loops”

**Reelection after Session is a new election cycle.** That is not Session
failing — it is the Chronicle wheel. Session must complete *before* that
choice appears (sine die terminal).
