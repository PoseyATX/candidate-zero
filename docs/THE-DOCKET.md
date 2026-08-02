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

## The Statute Book — laws that outlive the run (`engine/laws.ts`)

Built next, because "the bill is filed and means nothing" was still true even with language
in it: `session_law` set an outcome string and the following campaign began in a world where
nothing you had ever done existed.

A statute now does three things, or it is still a trophy:

1. **It persists**, with the language that actually made it in, who carried it, and which
   counties it served.
2. **It pays at home.** `GOODWILL_PER_PROVISION` points of district standing and +6 rapport
   in every ground it served, announced in the log — an invisible bonus teaches nothing.
   Capped at `MAX_GOODWILL`, so a long career is hard to beat rather than impossible.
3. **It can be taken away.** The people your language beat did not stop existing when the
   Governor signed it.

**Your own laws raise this session's fights.** Every standing statute with enemies seeds a
reauthorization opening — *"Reauthorize the Livestock quarantine and indemnity authority"*,
opposed by the feedlot consolidators who lost the first time. The language you re-pass is
generated from the statute itself (60% of the original ayes, 80% of the nays: the same fight,
two years older, against people who have had time to prepare). Declining is a real option and
the game does not scold you — defending costs the action points that would move *this*
session's bill.

But an undefended law can be struck. Exposure scales with the members your language cost you,
plus a flat penalty if you lost the seat, because you are not there to hold the floor.
Measured: **an undefended statute that beat 18 people is struck in 39% of sessions; a statute
nobody opposed is never struck at all** (0 of 120). A repealed law stays in the book, marked —
history records what was struck as well as what stands.

That is the loop that turns a scoreboard into a career: winning creates your own future
opposition, and nothing is ever settled, only currently decided.

## The Chamber — the floor is people (`engine/chamber.ts`, `data/members.ts`)

A provision bought "+16 ayes." Sixteen of *what*? The number was the entire representation:
no names, no counties, nobody who wanted the thing — and therefore nobody who could remember
afterwards that you delivered it or took it back. **A coalition you cannot name is a coalition
you cannot betray**, and a legislature where nobody can be betrayed is a meter with a flag on
it.

Eighteen members you will actually come to know — not a full chamber, the ones whose names a
freshman learns in the first session because they can move something. Wendell Cobb of
Nacogdoches, eleven years on the same subcommittee, will help and will expect to be asked
properly, in person, before the hearing and not during it. Delia Arredondo of Hidalgo ran a
clinic before she ran for anything and knows her county's ambulance mileage from memory.
Marvette Seals of Dallas is a freshman, terrified, hiding it badly, and the only member who
has read the pretrial numbers because nobody told her not to bother.

Each carries a **county** (mapped to a ground), a **want** (the issue that reaches them), a
**price**, and — the part that matters — a **memory that persists across runs**.

- Language recruits the members whose county it serves or whose issue it is, heaviest first,
  and the log names them: *"WITH YOU — Wendell Cobb of Nacogdoches, Sudie McCauley of
  Hutchinson, and 2 more."*
- Delivering warms them by `DELIVER_WARMTH`. Do it twice and they take your call at ten at
  night.
- **Stripping language burns them by `BURN_CHILL`, which is deliberately larger.** A betrayal
  outweighs a favour, because that is how it works. Do it twice and they will not take the
  call at all — and they count *against* you on the floor.
- A dean is worth their weight and a frightened freshman is worth one vote.

**The aggregate arithmetic is deliberately unchanged** — `provisionSwing` still returns the
same ayes-minus-nays, and the balance measured above holds exactly (law 53.2%, amendment EV
identical). Names are a layer on top, not a replacement, so a system this large could land
without re-tuning everything underneath it. What the room adds is a *career* bonus on the
floor count: a member with a record has friends before the bill is filed.

## Working the members, and the alleyway (`data/member-plays.ts`)

Every member carried a `price` — favor, capital, casework — that was authored and
**unspendable**. You could read that Wendell Cobb expects to be asked properly, in person,
before the hearing and not during it, and there was no way in the game to ask him. A person
you cannot approach is set dressing.

Two design laws from the owner drive this:

> *"Everywhere that a card could be played, there should be an opportunity to play it. The
> open world of the game means every moving part can be acted upon by the player."*

So each price now has a card that pays it, and `harness:chamber` asserts that mapping is
complete — a price with no card fails the build.

- **MB01 Ask Him Properly** (1 AP + a favour) — the scarcest currency, buys a member outright.
- **MB02 Trade for the Vote** (1 AP + 2 capital) — capital is what moves your bill, so this
  competes directly with your own legislation. Buys a vote, not a friend. Can fail, and a
  member who is not for sale gets colder for the asking.
- **MB03 Run Their Casework** (2 AP) — no money, no favours; the expensive part is the
  afternoon. Slowest way to make an ally and the one that lasts.

> *"The game should have alleyways, some of which are shortcuts, some of which are traps…
> among the overwhelming spirit of action and controversy and debate and victory and defeat,
> is HOURS of boredom and minutiae that allow for the infamous extracurriculars."*

- **MB04 The Back Rail** — stand through a quorum call and two hours of local bills. Measured
  over 300 plays: **38% wasted, 21% actively harmful** (a reporter notes who was at the rail
  while appropriations met down the hall — standing −2), **41% worth it**. Sometimes the right
  person is bored beside you and says the thing they would never say in a meeting.

The harness asserts the floor is *real*: `nothing + harmed > 40%` and `harmed > 0`. **This is
not a bug to be tuned upward.** A game where every option is productive is a spreadsheet with
a theme; the boredom is the medium the extracurriculars happen in.

Session relationship work writes to the run's roster and folds back into the career at sine
die via `mergeRoomBack` — taking the larger magnitude rather than summing, so a career does
not compound itself every cycle just for existing.

## Every event leaves a door, and the grievance travels

Twenty-one outside events existed and exactly **one** named a policy opening. The other
twenty changed two numbers and vanished. A world that acts on you and leaves nothing to act
on is weather, not a place.

All 21 now name a door, and `harness:docket` fails the build if any event doesn't — or if it
names a door that doesn't exist. Eight new openings were authored to cover them: drainage
authority after the flood, cooling centres and a load-shed exemption registry, severance
revenue for the county roads the trucks broke, who decides what is on the library shelf,
fairgrounds capital, ninety-day notice when the plant goes, the mid-decade map, and
disclosure on whoever paid for the whisper.

**The grievance travels.** Most events fire during the primary and the general, when no
chamber is sitting — so the door opens when you get there. You ran the whole autumn on the
plant closing; now you are in Austin and the plant closing is your bill. The log says so:
*"YOU RAN ON THIS — Notice and retraining when the plant goes."* This reads `eventsFired`,
which for the life of the project was written once per event to stop it repeating and read by
nothing at all.

### The double charge this exposed

Filling the docket broke the amendment balance immediately: a member who amended fell from
39.4% law to **14.1%**. Four measurements to find why, and the first three were wrong:

1. Not the veto — amended runs were vetoed *less* (11% vs 23%). The margin shield works.
2. Not a missing one-subject rule. `MAX_PROVISIONS = 3` is real and correct (a Christmas tree
   should die), but adding it moved the number **not at all**.
3. Not the coalition constant. I swept `COALITION_PER_MEMBER` from 0.009 to 0.024 chasing it;
   that bought 12pp and never closed the gap.

The actual cause: **taking an opening SPENT capital, and capital is also worth 2.8pp per
point in `billOdds` on every pipeline motion.** Amendments were charged twice — the capital,
and the odds that capital buys. Bills died in committee (mean final stage 4.4 vs 4.9) rather
than at the desk. The fiction was wrong too: capital is what *moves* a bill; the language
itself is written by staff.

`weight` is now a **requirement, not a spend** — you need standing to hang something on a
bill and be taken seriously; you do not burn the standing to do it. Result: **43.7% clean vs
33.8% amended**, with the cost now paid where it belongs (vetoed 32% vs 23%) instead of
hidden in the pipeline. And with that fixed, 0.009 and 0.016 measure *identically* — the tell
that the constant was never the lever. It is back at its original value with a comment saying
not to tune it to fix something else.

## What is next

Still a foundation. Named openly:
- The far horizon — 181 procedurally generated members across both chambers, plus statewide
  executives and commissioners who win and lose their offices as you progress — is recorded
  in [`STARMAP.md`](./STARMAP.md). The eighteen hand-authored members are a proof of the
  mechanism, deliberately small enough to write with real voice; the generator has to hit
  that same texture at scale.
## Repeal has a face (`engine/rival.ts`)

The first version of repeal was a flat roll: a statute quietly evaporated between runs and
nothing was behind it. But nobody in Texas loses a fight to *circumstances*. They lose it to
a person who filed against them and said so out loud at every Rotary lunch for eighteen
months.

So the rival picks a law of yours and runs on gutting it — the most exposed one, because the
members your language beat are exactly the people who will fund the campaign to strike it.
Three archetypes, one target, three mouths:

- **insurgent** — *"…is running on repealing your Livestock quarantine authority outright.
  No amendments, no study, repeal."*
- **machine** — *"…has found the fiscal note and is reading it aloud at every Rotary lunch
  in the district."*
- **incumbent** — *"…calls it government overreach and has promised to strike it in the
  first thirty days."*

It is announced **before** the session, with their name on it, and it shows in the Opposition
band in the same red as a SETBACK. A repeal you cannot see coming is weather; one with a face
is a decision about whether the seat or the statute is worth the session.

The odds are their strength plus the money of everyone your language beat, plus a large
penalty if you lost the seat — you are not on the floor to stop them. Measured: **41% when
they campaign on it, and 0 of 150 when nobody does.** Statutes do not evaporate on their own.

One bug worth keeping: the first wiring read `legacy.rival` directly, but the rival is
created lazily and `applyRival` runs *later* in `applyLegacy` — so every campaign silently
failed to be adopted while the rival still appeared to exist by the time anything checked.
`getRival()` is the accessor for a reason.

- The other ~90 scalar-only cards are untouched.
