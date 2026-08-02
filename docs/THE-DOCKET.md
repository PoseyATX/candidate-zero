# The Docket — how policy actually works now

Written the day the project owner read me the riot act, correctly.

## What was wrong

Measured, not asserted, across the whole card corpus:

| | |
|---|---|
| cards with a `run()` body | 111 |
| **that only move a number and nothing else** | **68 (61%)** |
| that touch any durable or structural state | 18 (16%) |
| named durable flags in the entire game | 8 |
| persona signature cards that are pure stat bumps | 23 of 23 |
| `CHOICE`-class cards, the class whose whole purpose is agency over dice | **0** |

And the two seams that should have connected the world to the player were both dead:

- **`eventsFired` was read by zero cards.** It was written once per event to stop the
  event repeating, and nothing else in the game ever asked what had happened. The screw
  worm crossed the river, subtracted two points of momentum, and vanished.
- **`state.issue` appeared in exactly one mechanical condition** anywhere in the codebase —
  and that one was broken. `applySetup` does `state.issue = issue.n`, the display *name*,
  so the lone gate `s.issue === 'water'` compared "Water rights" to "water" and could never
  fire. Eighteen issues, zero working mechanical uses.

The bill was `{ id, title, issueId, sponsor, committeeId, status, tally, pipelineStage,
heat }` — a progress bar with your issue's name interpolated into the title. There was no
way to put anything *in* it. Amendment is the central verb of legislating and the game did
not have it.

## The primitive

**A `PolicyOpening` is a hearing the world has opened, for a while.** It has a
constituency who wants it, somebody who will fight it *by name*, a weight in political
capital, and a window that shuts.

Three rules, and they are the whole design:

1. **The world opens; the player closes.** Openings are written by events, never by plays.
   You do not get to summon a drought.
2. **Windows shut.** The Lege meets 140 days every two years. The difference between a law
   and a good idea is whether you were ready the week the room cared.
3. **Taking it costs.** An opening becomes a `Provision` — real language in your bill —
   and language has a constituency and an enemy. Covenant 6: power is never clean.

The historical argument: the Highland Lakes exist because the 1930s droughts and floods
made an opening and there were people standing there with a bill. LCRA is not a stat buff.
It is language somebody attached to a moment.

## What each piece does

- **`engine/docket.ts`** — the primitive. Openings, windows, `takeOpening`, the coalition
  math. Read paths are strictly non-mutating (see below).
- **`data/issue-profiles.ts`** — all 18 issues made mechanical: the turf that cares, the
  attributes the work takes, the committee it routes to, the opposition by name, and the
  openings the world can hand you.
- **`data/policy-plays.ts`** — `PO01 Hang It On The Bill`, `PO02 Work the Window`,
  `PO03 Read the Room on It`, `PO04 Strip the Language`. The first cards in the game that
  *read* the world instead of only writing to it, and the first `CHOICE` cards ever
  instantiated.
- **`state.issueId`** — the mechanical key, separate from `state.issue` (the display name
  that goes in the epitaph). This is what made the issue real.

## The balance, and the three traps I built first

Each of these was found by measurement, not by reading the code.

**Trap 1 — provision heat fed `billOdds`.** `billOdds` charges 5 percentage points per
point of heat against a cap of 12. Amended bills reached mean final heat 11.2 and
*physically could not move through committee*. Law rate 43.0% → **8.7%**.

The fix was conceptual: **bill heat models TIME** (a bill sitting still burns political
oxygen); **controversy models CONTENT**. Language does not make a committee slower, it
makes the Governor angrier. Provision heat now feeds the veto roll only.

**Trap 2 — language still cost the action points that move the bill,** and bought only one
roll. 43.0% → 32.6%. Members you buy should count wherever members vote, so the coalition
bonus now applies on the floor *and* in the Senate — but not in committee, where the chair
decides and a headcount is worth nothing.

**Trap 3 — a margin is a shield, and I had it only cutting one way.** Nobody vetoes a bill
that came off the floor 120–25; the override math is right there in the count. Language now
cuts both ways at the desk: what the bill *says* angers the Governor, how many members
*signed onto it* makes him careful.

**Final measurement** (n=800 runs / 253 sessions):

| | clean bill | amended |
|---|---|---|
| law | 40.3% ±3.1 | 35.2% ±3.0 |
| vetoed | 23% | 17% |
| held the seat | 98.0% | 99.6% |
| bills carrying language | 0% | 100% |

The 5.1pp law difference is inside 2 SE (4.3pp). Amending is roughly passage-neutral, buys
delivery and seat security, and costs tempo. **That is a fork, not a tax** — which is the
whole point, and it took three wrong versions to get there.

## One bug worth remembering

`getDocket()` originally did `if (!state.docket) state.docket = [];` — a lazy getter. But
`view()` calls `liveOpenings()` to render, so **merely looking at the game mutated it**, and
deterministic replay broke on every seed in `harness:ac1-determinism`. A getter that writes
is not a getter. Reads now return a frozen empty array; only the write path creates.

That harness caught it immediately, which is the argument for the harnesses being there.

## Where it shows up

- **Web**: the Chamber band in the dossier — the hearing, weeks left, the named opposition,
  and the engine's own reason you cannot act yet.
- **Any host, including Unity/iOS**: `RenderView.docket` (`ENGINE_API_VERSION` 1.4.0). Hosts
  get `weeksLeft` precomputed and `blocked` as the engine's reason string, so no host ever
  reimplements the rules in order to explain them. 26 → 29 generated C# classes.
- **QA**: `?jump=session` drops straight into Act III. Reaching the session legitimately
  needs a won primary and a won general, which meant every session-stage change cost a
  twenty-week playthrough to eyeball once — which is a large part of why this stage rotted.

## What is next

This is a foundation, not a finished system. Named openly:

- Provisions do not yet persist into `legacy`. A law you pass should exist in later runs and
  be repealable — by you, or by your rival.
- Coalitions are still a number (`ayes`/`nays`) rather than named members with their own
  wants. Fenstemaker's power was knowing every member's box.
- Only the screw worm currently names an opening. Every outside event should.
- The other 90 scalar-only cards are untouched.
