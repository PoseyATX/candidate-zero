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

## The campaign gets alleyways too (`data/alley-plays.ts`)

The session became a place while Acts I and II were still a board: grounds, allies and a
shop, every option productive with a known return. There was no way to spend a week badly,
and **an afternoon you cannot waste is an afternoon you never had to decide about.**

Four real places a Texas candidate actually goes:

- **AL01 The Domino Table** — the square, four men, a game older than you. 90% thin or worse;
  at the top, the oldest one remembers your daddy hauled his hay in 1974 (+14 rapport on
  Courthouse Square, +30 contacts, and the Operator face notices). Push too hard and you get
  filed under "pushy."
- **AL02 Ride the FM Route** — 2 AP and a whole day in somebody else's truck. The highest
  variance day in the game: sixty hands at their own gates, or nine hours of caliche and a
  thrown belt outside Nolanville.
- **AL03 Sit at the Dairy Queen** — the actual civic centre of small-town Texas. Deliberately
  the *safe, low-ceiling* one: 100% thin, 0% "worth it." **It feels like work. That is the
  trap.**
- **AL04 Chase the Endorsement** — the deepest rabbit hole in the game. Three meetings and a
  questionnaire asked twice in a different order; they endorse who they were always going to
  endorse and the minutes note you were "engaged and enthusiastic."

Measured (n=400 each, from a realistic mid-campaign state): **10% actively harmful, ~80%
thin, ~10% worth it** for three of them. `harness:alleys` asserts the median is poor per
card, that at least two have a genuine top end, that at least one can leave you worse off
than you walked in, and that they touch other systems rather than bumping a scalar — the
61%-of-the-corpus problem this project already measured.

Two instrument bugs worth recording, both of which made the design look better than it was:

1. **They were first in the menu.** Every strategy that falls back to "the first playable
   thing" started spending its week at the domino table — the money strategy's ballot rate
   fell 70% → 59.8% and a ground condition meant to fire 12–65% of the time hit 86%. They
   sit at the *bottom* now: a place to waste an afternoon has to be somewhere you choose to
   go.
2. **The sweep started at momentum 0**, so every −1 penalty clamped to nothing and all four
   alleys measured 0% harmful. The trap was invisible to the instrument, not absent.

### The trail and the chamber are one building

The clearest available version of the starmap concept — an intricate interconnection between
every card — is this: **members have counties, and the campaign is played on those same
counties.** The man at the domino table on Courthouse Square is *from* Courthouse Square.

So a breakthrough on an alleyway can introduce you to a named legislator months before Austin:
*"And Wendell Cobb of Nacogdoches is there — eleven years on the same subcommittee. You will
not have to introduce yourself in Austin."* `chamberRoster` lives on the run and
`enterSession` does not clear it, so the acquaintance is still warm when you are sworn in.
`harness:alleys` proves the whole chain: the FM route meets FM-route people, it is a real
member, and the relationship survives into the session.

That is what makes Acts I–III one place rather than two games sharing a save file.

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

## Hooks — the side-paths back (`engine/hooks.ts`, `data/hook-plays.ts`)

The career was a **ladder with a memory**, not a circle. Campaign fed chamber — meet Wendell
Cobb on a mail route in October and he is warm when you are sworn in — and nothing came back.
A member who takes your call at ten at night could not cut you an ad, work his county, or tell
you which of your grounds was about to turn. Half the loop was missing, and a join nobody
tests is exactly where this project's bugs have lived.

D&D calls these **adventure hooks**: an optional thread the world dangles, which you may take
or ignore, and which leads somewhere the main road does not.

**This is a registry, not one feature.** `HookKind` is `member | statute | rival | machine |
world` and `offerHook` does not care who calls it. Members are the first source, not the
mechanism. Adding a statute that dangles a favour, a rival's mistake you can exploit, a
machine member's ask, an outside event — each means writing the offer and a card that
consumes it. Nothing in the engine changes. The harness asserts exactly that:

> PASS: a non-member source can offer a thread with no engine change

Three rules, mirroring the Docket, which is the same shape pointed at policy:

1. **Optional.** A hook you must take is a quest. The harness holds two identical states,
   cashes nothing in one, and asserts the ledgers are byte-identical — walking past every
   thread in the game stays a legitimate way to play.
2. **Sourced.** Every hook names who offered it. A favour from nobody in particular is a stat
   bonus wearing a hat, and this corpus already measured 61% of itself that way.
3. **Perishable where it makes sense.** People forget they owe you. Taken hooks stay on the
   record after they expire — people remember what they offered.

Board cap is 6. Nobody is juggling more than that.

### The favour depends on who owes you

Keyed on the member's `opensTo`, so three allies are three different plays rather than three
sizes of the same one:

- **HK01 Borrow His Name** (DIP) — +8 name ID, +2 endorsement, momentum. The endorsement
  economy, but from somebody who owes you *personally* rather than a body with letterhead.
  *"He does not ask for anything, which is how you know the ledger is now even."*
- **HK02 She Works Her Own County** (CHA) — +20 rapport and +0.08 GOTV **on her ground
  specifically**, +60 contacts, +1 volunteer. The most valuable thing a sitting member has is
  not their vote, it is the list from their own first race and the people on it who still
  answer. The most efficient turf play in the game, and it cannot be bought.
- **HK03 Tell Me the Truth About a County** (everyone else) — sharpens your message, warms
  their ground, and **names the ground you should stop paying for**. The rarest favour in the
  building: everybody tells you what you want to hear, almost nobody does this.

Harness asserts these reach three different systems (`name, turf, intel`), not one scalar.

### Verification

`npm run harness:hooks`, 27 assertions, in the main chain after `harness:alleys`. It went
green on the first run, which in this project is a warning sign rather than a result — so the
control: stub `offerMemberHooks` to return `[]` and four assertions fail, including the two
that carry the actual claim (`the next CAMPAIGN opens with threads from them`, `a hook card
appears once somebody owes you`). The instrument measures something.

Reads do not mutate: `getHooks` returns a frozen `EMPTY` rather than lazily assigning
`state.hooks = []`. `getDocket` used to do the lazy thing, and because `view()` calls it to
render, merely *looking* at the game broke deterministic replay on every seed. Asserted
directly — `looking at the board does not create it`.

### Three sources, one registry — and the first trap

The registry claim was cheap until something other than a member used it. Two more sources
went in, and **nothing in `hooks.ts` changed to admit either of them.**

**Statutes** (`offerStatuteHooks` in `laws.ts`) — the direct answer to *"bill is filed and
means nothing."* A law that only pays out as a quiet standing bonus is a trophy with a number
on it. Now the people it actually helped organize, on the ground it actually serves, under the
statute's own title. **HK04 The Program Works**: +14 rapport and turnout on the served ground,
+35 contacts, +2 district standing, SAFE and free. A shell bill that passed offers nothing —
it is a real statute and a line in your obituary, but nobody in Lamesa organizes a phone bank
over an empty bill. Asserted both ways.

**The machine** (`offerMachineHooks` in `machine.ts`) — the first hook that is a **trap**.
Everything above is a gift, which is only half of how the building runs. Somebody genuinely
`with` you does not offer a favour, they offer a deal. **HK05 The Ask Behind the Ask**: +$900,
+70 contacts, two volunteers, momentum. It works. It always works. It also attaches an
obligation you do not choose and cannot hand back.

Only the single strongest relationship offers. Six simultaneous devil's bargains is a shop,
not a trap.

**Covenant 5 holds:** HK05 is `STD`, never `SAFE`, and the price is printed on the card face
before you take it. A trap you can read and walk into anyway is a decision; a hidden one is a
cheat. Everybody at the capitol knows exactly what the slate-maker wants — the only question
has ever been whether you are far enough behind to pay it. The harness asserts both the risk
label and the presence of the price in the card text.

### The bug I wrote and then measured out

The price started as `random() < 0.5 ? 'OB3' : 'OB1'`. Two things wrong with that, and the
harness only caught them because the assertion was specific:

1. **OB3 has no weekly drag.** It is a marker spent elsewhere — it gates starmap paths and
   counts as a debt obligation — so the branches were wildly uneven: heavy weekly cost, or a
   narrative note. Same card, same flavour text, two different games.
2. **The assertion depended on the seed.** `and that obligation has real weekly drag` passed
   on OB1 and would have failed on OB3. That is precisely the *"my instrument measures nothing
   and passes"* shape this project keeps stepping in, except worse — it passes and then fails
   later for a reason nobody will connect to this commit.

Fixed at the design level rather than the assertion level: **the price is who you dealt with.**
The Slate-Maker (`AL16`) takes his own marker, `OB3` — which has been sitting in the
obligations registry since Phase 2 waiting for something to charge it. Everybody else runs
money, and money comes with a string that pulls every week, `OB1`. Deterministic, in character,
and the harness now drives both branches and asserts what is actually true of each rather than
one claim that happens to hold for whichever branch the seed picked.

### Verification

52 assertions. Control: stub `offerStatuteHooks` and `offerMachineHooks` to `0` and **17
fail** — including every claim that carries weight. The harness was also made to fail
*cleanly* rather than throw on the first missing hook, because a control run that dies at
assertion one hides the sixteen behind it.

### The last two: an envelope, and a door

**The rival** (`offerRivalHooks` in `rival.ts`) — the first three sources are things you
*earned*. This one shows up. Somebody who used to work for them, or somebody who just does not
like them, puts an envelope in front of you with no return address.

**HK06 Somebody Sent You a File** is the one genuine **wager** in the set. HK05's cost is
printed on the card; HK06's cost is that it might not work and *you might become the story*.
Those are different kinds of bad and the game needs both. Four tiers:

- it goes to a reporter who has waited two years for exactly this and runs under **her** byline
  — rival down 6 everywhere, momentum, +3 name ID
- three paragraphs on page six and a shrug
- *"You read it four times and cannot make yourself do anything with it, which is either
  character or cowardice and you will not know which for about twenty years."*
- it gets traced back inside a week — **+1 hit piece on you**, +1 exposure, −1 momentum.
  *"The file was probably true. That turns out not to be the part anybody cares about."*

Measured over 60 seeds: all four tiers reachable, the good end really moves `rivalRap`, the bad
end really puts a hit piece on the player. A "risky" card whose worst branch is a smaller gift
is not risky, and this corpus has shipped that mistake before.

Offered only when the rival has `cycles > 0` — nobody has kept receipts on a first-time filer.
It expires in **four weeks**, and this is the first perishable hook offered by production code
rather than by a fixture the harness built for itself.

**The world** (`OutsideEvent.hook` + `resolveOutsideEvent`) — `opens` ended *"the screw worm
happens and is forgotten"* **inside the chamber**. This is the campaign half, and it is the last
thing the world could not do: an event could hit you and there was no way to go stand in it.

Any outside event can now declare a door — a name, a description, and how many weeks it stays
open. Three carry one so far, including the screwworm, which is the event that was named as
forgotten in the first place:

> **A DOOR** — The sale barn is holding a meeting about it. Every rancher inside forty miles,
> folding chairs, bad coffee, and somebody from the state who will not answer the question.
> You can be in that room. Three weeks, then they stop meeting. *It closes in 3 weeks, whether
> you go or not.*

**HK07 Show Up Where It Happened** costs two actions and no money and carries no risk. The cost
is that it lands in a week you already had plans. *"Nobody thanks you for it. Two years from now
four of them will still remember you were there."*

### The bug the fifth source found

Wiring all five lit up a failure that no amount of reading the code would have produced:

> FAIL: world offers into the same registry

`MAX_LIVE_HOOKS` is 6. Three members, a statute, a machine deal and an envelope fill all six at
`applyLegacy` **before the season starts**. Every door the world opened after that was silently
refused. The flood came, you could not go, and nothing anywhere would have told you why.

The cap is not the bug — the cap models the player's attention. The rule was. A thing happening
*this week* gets your attention over a standing offer that will still be there in October, so
**a perishable thread displaces the oldest one that waits forever.** Perishable never displaces
perishable; nothing may cannibalise a door the player is already racing. The displaced thread is
*removed*, not marked taken — you never got it, so the record must not claim you turned it down.

### Verification

88 assertions. Controls, each reverted after measuring: stub the rival source → 7 fail; stub the
world door → 8 fail; make the board cap refuse unconditionally → 6 fail. Every source and the
eviction rule have an instrument that goes red without them.

### Every event has a door, and the doors are four different verbs

All **21** outside events now leave a door. Writing them exposed the next problem immediately:
one `HK07 Show Up Where It Happened` card was resolving a flood, an oil boom, a redistricting
rumour and a library shelf fight **identically**. That is the stat-bonus-wearing-a-hat problem
raised to the level of a whole source — the same failure this project measured at 61% of the
corpus, one level up.

A room you stand in, a fight you take a side in, money that is moving, and a rumour you go
verify are four different verbs. So doors carry a `flavour`, and there is one card per verb:

| verb | card | what it is | risk |
|---|---|---|---|
| `room` | **HK07 Show Up Where It Happened** | presence, on the ground it hit | SAFE |
| `fight` | **HK08 Say It With the Camera On** | a podium and no way back | VOL |
| `money` | **HK09 Ask While the Checkbook Is Open** | the window is open right now | SAFE |
| `map` | **HK10 Go Find Out What Is True** | a rumour is not information | SAFE |

Measured, one seed, four cards: `HK07: ground/standing · HK08: name/message · HK09: money ·
HK10: message/shield`. Four distinct signatures, asserted as four, so a later pass cannot quietly
collapse them back into one.

Some texture the doors bought:

- **The water district board meets and nobody ever comes.** *Eleven people, a folding table, and
  the single most consequential body in this county that nobody has ever voted in.*
- **There is a disclaimer at the bottom of that mailer.** *Six point type, a committee name
  nobody has heard of, and a treasurer who is somebody's cousin. It is a public filing.*
- **The line at the annex is two hours long right now.** *You will never again have this many
  voters trapped and mildly bored in one place.* One week only.
- **The church is running a cooling station and is short of hands.** *No press, no sign-in sheet,
  no reason to go except that they are short of hands.*

`HK10` is the one nobody will play and it is the best card in the set: it produces no photograph,
cannot be posted, and takes a hit piece **off** you because you saw it coming.

Verification: 251 assertions. Every door is fired, matched to its card, played, and confirmed
closed — and the three wrong verbs are asserted **absent** on each, so the verbs are not
interchangeable. Control: collapse `doorFor` back to "any world door" and **63 fail**.

### The gate that was measuring a coin flip

The door work tripped `harness:grounds`:

> FAIL: money/spread ground condition met 66% — expected 12-65%

The obvious read was "the new content is a power creep." That read was wrong, and the only
reason I know is that I measured both sides instead of adjusting the number.

| | without doors | with doors |
|---|---|---|
| N=50 (the gate's default) | ≤65, passing | 66, failing |
| **N=400** | **66.3%** | **68.8%** |

SE at N=400 is ~2.4pp; SE of the difference ~3.3pp. The 2.5pp gap is inside one SE. **The doors
did not move it.** The ceiling was set *below the true baseline*, and at N=50 — SE ~6.7pp — the
gate straddled its own boundary and had been passing on sampling luck. A gate whose pass/fail is
a coin flip against the value it sits on is not measuring anything, which is this project's
oldest recurring bug wearing yet another hat.

Ceiling raised 65 → 80 **on evidence**, with the measurement written into the harness comment and
an instruction not to move the number to fit a diff. Above 80 would be a real power creep.

### What this is not

Finished. All five `HookKind`s are live, all 21 events leave doors, and four verbs answer them.
What is still thin: `member`, `statute` and `machine` sources each have exactly one shape of
offer, where the world now has four. The Slate-Maker's deal should not be the same object as the
Finance Chair's, and a statute up for reauthorization should offer something different from one
that is simply working.
