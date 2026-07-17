# SRD Notes — recovered design source

`AGENTS.md` and `README.md` both call "SRD v1" the authoritative mechanical
contract, but no such document existed anywhere in this repo until now —
only references to it (`src/harness/audit-srd-plays.ts`'s "SRD §10", the
"per SRD practice" comment inside `archive/prototype-single-file.html`).
This doc is a **partial recovery**, not the complete SRD: it's built from
excerpts of the original design conversation the user shared
(2026-07-17), which itself was truncated mid-transcript ("Show more") —
there is more design material than what's captured here. Treat this as
"the load-bearing parts we can currently prove," not a closed spec. If a
future increment needs an exact numeric rule this doc doesn't cover
(filing fees, signature counts, runoff timing, etc.), the project's own
stated practice — visible in `docs/AC1-NOTES.md` — is to verify against
real Texas Election Code rather than invent one, and the same caution
applies to any design question this doc doesn't answer: ask, don't guess.

## Provenance

`archive/prototype-single-file.html` (moved there 2026-07-17; previously
only reachable via `git show 0d532fa:index.html`) is the actual artifact
this conversation produced and iterated on — confirmed by matching source
comments (`/* standing actions (basic moves, per SRD practice) */`),
matching attribute ids (`CLO`/`CON`/`CRA`/`INK`/`DIP`/`CHA`, identical to
`AttrId` in `src/engine/types.ts`), and matching card ids (56 distinct
`PL##` ids, vs. 22 in the modular baseline). It predates and is the design
source for the `src/` TypeScript engine — every "archive" or "prototype"
reference in `docs/AC1-NOTES.md` and `docs/BALANCE-NOTES.md` means this
file. See `archive/README.md` for its status and why it must never again
be wired up as the site's `index.html` (it was, by accident — see
`docs/BALANCE-NOTES.md`, 2026-07-17).

## Vision & pillars

- Texas legislature theme: high-complexity PvE deckbuilder, accessible to
  new players, with complexity grounded in **real** House/Senate rules,
  precedent, procedure — procedural generation should tie to gameplay
  events/cards, but the rules stay grounded in real procedure, not
  invented fantasy.
- Starts at zero: player is a grassroots candidate with no money, no name
  ID, no institutional blessing. Souls-like difficulty. The climb runs
  from that all the way to "god-tier governor or beyond," and that climb
  is meant to be very arduous.
- Roguelike structure; easy to learn, years to master (this is already a
  covenant in `AGENTS.md`). Dwarf-Fortress-level *systemic* complexity —
  the complexity should live in refined systems, not visuals.
- Unabashedly Texan, with callbacks a TxLege wonk would recognize.
- Aesthetic: Southern gothic, Art Deco bordering, noir, rustic,
  antebellum. **Cultist Simulator is a tone/pull reference only** — the
  user was explicit that the design should not lean further into it,
  resemble a clone, or namecheck it in design material. (Noting this here
  so it doesn't accidentally get reintroduced as a citation.)
- Graphics-light presentation; the game should *feel* like Texas politics
  through systems, not through art budget.

## RNG philosophy (already implemented — this section is confirmation, not a gap)

RNG is brutal and does not have to be fair to the player — "it is not the
RNG's job to occasionally favor the player." Mitigation in the player's
favor comes entirely from intrinsic traits, actions, skills, and assets
the player builds up, which hedge the odds. The intended persistence loop:
*player is crushed → tries again → is crushed harder → develops skills →
tries again → is crushed → may rage-quit for a period → returns and tries
again fresh.*

This matches the current engine closely: `resolve()`'s SAFE/STD/VOL bands,
the covenant "Brutal, impartial RNG (no pity)," and `cardAttrMod` (root
attributes hedging odds) are all already built to this spec. No action
needed here beyond staying the course.

## The eight-dimension node schema

The design methodology for the state machine: analyze each node against
eight dimensions — **Intrinsic aspects, Access, Realizable potential,
Liabilities, Tools (the node's cards), Traps, Conflict shape, Next
states.** This is meant to be applied node-by-node across the whole
branching state machine, starting from Candidate-Zero.

### Candidate-Zero node (the fully-worked example — this is the canonical spec for the current primary-campaign loop)

- **Intrinsic aspects:** the defining trait is illegitimacy/invisibility,
  not poverty per se — no name ID, no donor list, no institutional
  blessing, no staff, no proof you're a real candidate. What you *do*
  have: your feet, your biography, a real tie to the district, one issue.
  Structural fact the node sits on: in most Texas lege districts the
  **primary is the election** (gerrymandered safety makes the general a
  formality); it's a citizen legislature (nominal salary, biennial
  sessions), so nobody sane enters this for money — that filters motive to
  conviction, ambition, or grievance.
- **Access:** the ballot (filing fee *or* petition-in-lieu — the
  zero-dollar door), direct voter contact (block walking, phones, forums),
  a shot at earned/viral media, and the party's precinct-level apparatus
  (precinct chairs, county party, activist clubs — the actual gatekeepers
  to primary voters). **Not yet reachable:** PAC money, the big-donor
  class, leadership's attention, lobbyists.
- **Realizable potential:** best case is an open seat with no incumbent —
  win a low-attention primary on a few thousand votes and, in a safe
  district, you've effectively won the seat. Even a loss has value: a
  banked voter list, name ID, a reason to run again, or raw material for
  an advocacy org.
- **Liabilities:** money is the dominant gate; near-zero name ID; a
  primary electorate that turns out for reasons you can't move; crushing
  incumbent structural advantage; Texas's >50% rule forcing a crowded
  field into a low-turnout runoff that rewards whoever's better organized
  (usually not you); opposition research on your past; a district that
  may be structurally hostile to your party, quietly converting a heroic
  run into a sacrifice.
- **Tools (cards):** block walking (time → contacts), petition-in-lieu
  (labor → ballot access, no cash), small-dollar fundraising,
  endorsement-seeking from precinct chairs/clubs, one sharp message,
  candidate forums (high-variance visibility), volunteer recruitment
  (force multiplier), personal narrative as a deployable asset
  (veteran/teacher/pastor/small-business owner), voter-file targeting.
- **Traps:** running in the wrong-party district (feels brave, is a
  near-guaranteed sacrificial loss); self-funding into debt early;
  messaging to the general when the primary is the election (moderating
  loses the base you actually need); frontal assault on an entrenched
  incumbent with no opening; taking early money or an endorsement that
  tags you and forecloses other coalitions; spreading across too many
  issues; antagonizing the gatekeepers; believing your own hype in a race
  decided by a tiny, unrepresentative electorate.
- **Conflict shape:** starts impersonal — the system isn't attacking you,
  it's *ignoring* you, and indifference is its own wall. This is also
  where the easy early hook lives: the first few moves (tie to district,
  issue, bio, file, first block walk, first volunteer, first precinct-chair
  callback) should feel legible and empowering. Then the shape shifts:
  **indifference → notice → targeted resistance.** The moment you gain
  traction, you get noticed and resistance personalizes — money floods in
  against you, gatekeepers close ranks, a hit piece drops, oppo surfaces.
  RNG doesn't spare you here; your accumulated assets do.
- **Next states:** win primary (safe district) → Nominee → Freshman
  Officeholder (trunk continues). Win primary (competitive district) →
  General Election contest. Respectable primary loss → Perennial
  Candidate (banked list, run again), Advocate (convert energy to issue
  org), or Staffer (hired by someone you impressed). Bad/scandal loss →
  burnout-exit terminal, or fringe Advocate. Wrong-party sacrificial run →
  Perennial Candidate or Advocate (the trap's landing spot). Can't make
  the ballot → pre-candidate reset, or Advocate.

### Cross-reference: this node vs. current code

| Design element | Current status |
|---|---|
| Petition-in-lieu (zero-dollar door) | **Implemented** — `PL04_PetitionDrive` |
| Filing fee (expensive door) | **Implemented** — `PL05_PayFilingFee` |
| Block walking | Implemented as a card, but see "Standing Actions" below — this was explicitly supposed to move off the deck |
| Wrong-party-district trap | **Implemented, and fixed 2026-07-17** — this was mechanically backwards (easier, not harder) until this session; see `docs/BALANCE-NOTES.md` |
| Self-funding-into-debt trap | **OB2 Bank Note** weekly drag (money/debt service) — `src/engine/obligations.ts` (2026-07-17) |
| Early money/endorsement that forecloses coalitions | **OB1 PAC String** weekly drag (Lobbyist face + exposure) — same module; PL20 grants OB1 |
| Indifference → notice → targeted resistance conflict shape | Partially implemented: `state.tier` now escalates disaster risk across pre-ballot/on-ballot/general (fixed 2026-07-17), but there's no explicit "you got noticed" event/spike — it's a smooth curve, not a phase-change moment |
| Respectable-loss branches (Perennial Candidate / Advocate / Staffer) | **Superseded 2026-07-17 (persistent career):** losses no longer terminal — they open **off-season** with the same persona; "perennial" is the default loop, not a named branch |
| Officeholder trunk beyond the general win | **Thin Session implemented 2026-07-17** — 4 legislative weeks under the dome after general win, then off-season; full bill pipeline still open |
| Shadow consequences on Faces | **Implemented 2026-07-17** — `src/engine/reputation.ts` ports `shadowCheck()` in full (see below) |
| Reputation grants (R01/R02/R04/R07/R10/R11) | **Implemented 2026-07-17** — `src/engine/reputation.ts` ports the reachable subset of `repCheck()` (see below) |

## Persistent career state machine (law as of 2026-07-17)

The career **does not end** when a ballot does. `state.over` is reserved for
rare ruin only. Normal election results set `lastCycleOutcome` and transition:

```
SETUP (once) — persona / issue / district / region lock
    │
    ▼
PRIMARY (8 weeks) ── miss filing ──────────────────────────────┐
    │ win primary                                              │
    ▼                                                          │
GENERAL (6 weeks) ── lose ─────────────────────────────────────┤
    │ win                                                      │
    ▼                                                          │
SESSION (4 weeks, inOffice) ── sine die ───────────────────────┤
    │                                                          │
    └──────────────────────────► INTERIM / OFF-SEASON (6 mo) ──┤
                                      │                        │
                                      │ thematic forks (rare)  │
                                      │ never persona          │
                                      ▼                        │
                                 next PRIMARY ◄────────────────┘
                                 (incumbent if still inOffice)
```

### Identity rules (covenant 7, refined)

| Facet | After first filing |
|---|---|
| **Persona** | **Permanent.** Never re-selected. Never on a fork menu. |
| **Issue** | Shifts only via **thematic fork** (national detonation, crisis work) with cost (hit pieces / pivot scar). Hold is always an option. |
| **District** | Shifts only via **map fork** (redistricting rumor / court order). Costs name ID / contacts, or debt if you stall-and-sue. |
| **Region** | Shifts only via **geography pull** fork (cycle 2+). Petition math and lists change. |

Free re-pick menus after the first screen are a **bug**, not a feature.

### Off-season / residue

Off-season work is themed by locked identity (persona bio work, district
casework, region ritual, issue tour). Actions mint **residue**
(`pendingResidue` → applied at next primary open) as boons or hindrances.
This is the mechanical meaning of "a loss has value: banked list, name ID,
reason to run again."

### Failure must pay in the UI (dopamine / perennial design)

Losing is not a blank terminal. On cycle close the engine mints **visible**
loot into:

1. **Trophies / flags / scars** — kit strip chips (`state.trophies`)
2. **Deck cards** — e.g. miss filing → PL04 in pool; primary loss → recruit/fish-fry/chairs card; general loss → PL19 GOTV
3. **Juice banner** — `LOOT: …` line the player cannot miss
4. **Ledger kit line** — owned shop assets by name

Money without sinks is a dead meter. The **Shop** sells billboards, websites,
lists, phone trees, staff, mail, flatbed — each with a real mechanical effect
(see archive `ASSETS` shop, ported to `src/data/assets.ts`).

### Thin Session (in office)

After general win only: 4 weeks of capitol verbs (file, whip lite, gallery,
testify, district call, rest). Not a full bill pipeline yet — `bill` /
`committee` remain future work. Homestead (`districtStanding`) bleeds.
Then off-season, then reelection primary with incumbent lean.

### Implementation map

| Piece | Module |
|---|---|
| Calendar transitions | `src/engine/calendar.ts`, `src/engine/career.ts` |
| Thematic forks | `src/engine/identity-shift.ts` |
| Off-season plays | `src/data/interim-plays.ts` |
| Session plays | `src/data/session-plays.ts` |
| Foundation / expansion gates | `docs/ARCHITECTURE.md` |
| Card inventory (audit) | `data/cards.csv` (`npm run export:cards`) |

### Content expansion rule (SRD practice)

New plays, assets, interim/session verbs, or obligations **must**:

1. Fit a single role and labor/money/neutral path (do not erase dual ballot).
2. Peer against an existing anchor card (see Architecture §6.2).
3. Keep SAFE free of DISASTER; risk money carries obligation/exposure/debt.
4. Ship with attrs (if rolled), grant paths for any named ally/rep/asset, and a CSV re-export.
5. Leave `npm run harness` green; record measured moves in `docs/BALANCE-NOTES.md`.
| UI career shell + localStorage | `src/ui/main.ts` |
| Multi-cycle harness | `src/harness/career-persist.ts` |
| Obligations weekly drag | `src/engine/obligations.ts` (`tickObligations` on week end) |
| Ground affinity / gated grounds | `pickDefaultGround` + `groundAffinityMod` in `play.ts` |
| Asset shop (money sinks) | `src/data/assets.ts` — buy kit; passives; UI Shop + Kit strip |
| Failure loot (tangible) | `src/engine/failure-loot.ts` — trophies/flags + deck cards after loss |

## Standing Actions (PbtA basic moves / Blades downtime actions pattern)

A confirmed, deliberate architecture decision from the design conversation:
a card that's "always in hand" is a contradiction — it clutters the hand
and muddies what a card is. The fix, already implemented in
`archive/prototype-single-file.html`: convert every always-available
action into a **persistent Standing Actions strip** — mechanically
identical resolution (same odds, same cost, same effects), but
structurally separate from the drawn hand. Named examples: Block Walk, the
petition table and filing fee pre-ballot, District Casework and the bill
motion in session.

**Current modular-engine status: partially done.**
`CAMP_PETITION`/`CAMP_FILING_FEE` in `src/engine/loop.ts` already implement
this correctly for the two ballot-access cards — they're always-offered,
not deck-drawn, exactly per spec. **Block Walk (`PL01`) is not** — it's
still a regular starter-deck card subject to draw luck, which is exactly
the pattern this design decision rejected. This is a real, confirmed
deviation from documented intent, not a stylistic choice. Converting it is
scoped as `docs/ROADMAP.md` Phase 1 follow-up work (it touches starter-deck
composition and draw math, so it needs a balance pass, not a blind swap).
District Casework and the session bill-motion don't exist yet at all — see
Session stage below.

## Four card pools (only one exists in the modular engine)

The archive prototype organizes cards into (at least) four pools:
**Campaign, Session, Opportunities, Events.** A single v0.10 increment in
the source conversation added "17 new cards... Campaign (8)... Session
(4)... Opportunities (6)... Events (5)" in one pass — confirming these are
long-standing, distinct pools, not a one-off idea. `archive/prototype-single-file.html`
has 56 distinct `PL##` ids total. The modular `src/data/plays.ts` /
`plays-wave4.ts` "Play" cards (22 total, waves 1–4) are the Campaign pool
only — Opportunities and Events don't exist in the modular engine at all,
and Session cards don't either (see below). This means most of the
archive's content was never ported, not that it doesn't exist — porting it
(rather than redesigning from scratch) is the efficient path forward and
is exactly what `docs/ROADMAP.md` Phase 4 (Session stage) should draw on.

## Branching state machine

**Officeholder is the trunk.** Secondary branches — Advocate, Staffer,
Perennial Candidate, and others named in passing (scandal path, corruption
path, self-destructive-zeal/primaried-out path) — should each either reach
their own terminal state or reconnect to a more promising state via action
or random event. None of this exists in the modular engine yet; the
current `CampaignOutcome` type is a flat `missed_filing | lost_primary |
won_general | lost_general`, with no secondary branches and nothing past
`won_general` (that's the unbuilt Session stage). This is the single
largest gap between documented design intent and current code — bigger
than the Session stage alone, since Session is just the next node on the
*trunk*; the secondary branches are a whole parallel structure.

## Shadow consequences + reputation grants (ported 2026-07-17)

The archive has complete, working `shadowCheck()` (lines ~494–510) and
`repCheck()` (lines ~512–524) functions, called after every play and again
at week-end. Every field `shadowCheck()` touches — `pieMalus`, `exposure`,
`b05Malus`, `allyMalus`, `favWitness`, `hitPieces`, `volPool`, `rapStall`,
`obls`, `groundsArr`, `shFired` — already existed in the modular
`GameState`, unused, clearly scaffolded for exactly this function and
nothing else. This was a port, not new design: `src/engine/reputation.ts`
now has `shadowCheck()` in full, wired into `executePlay` after every play.

`repCheck()` grants reputations R01–R12 off various thresholds. Only the
subset reachable with fields that already exist in modular `GameState` —
**R01, R02, R04, R07, R10, R11** — was ported; the rest (R05/R06/R08/R09/R12)
depend on allies (`AL02`, `AL12`, `AL15`), counters (`pieCount`,
`strawWins`), and mechanics (`slate`) that aren't ported yet. Wired into
`executePlay` (after every play) and `endWeekInPlace` (catches week-gated
thresholds like R02 even in a week with zero plays, matching the archive's
own redundant double-call).

This also finally makes several previously-dead references live:
`resolve()`'s `hasRep(state,'R10')` disaster-band reduction and
`warm(state,'AL11')` band reduction, `PL01`/`PL02`/`PL04`/`PL09`'s
`warm(s,'AL09')` bonuses (once `AL09` is grantable — still not ported, see
below), and `plays.ts`'s `rapGain()` already checking `state.rapStall`
(now settable via the `F1` shadow threshold). One concrete bug fixed
alongside this: `PL13_FishFry`'s BREAKTHROUGH-tier text says "the
small-dollar list starts here" but the code never actually pushed `B05`
into `state.backers` — the archive's equivalent card does
(`archive/prototype-single-file.html:612`). Fixed to match.

**Ported the same day (2026-07-17, later):** 20 of the archive's 21
personas (`archive/prototype-single-file.html:340–365`) — 6 single-attribute
(`PA_CLO` "The Powerhouse", `PA_CON` "The True Believer", `PA_CRA` "The
Operator", `PA_INK` "The Parliamentarian", `PA_DIP` "The Coalition-Builder",
`PA_CHA` "The Natural") plus 14 of 15 attribute-pair personas (`PA_CON_CHA`
skipped — also named "The Preacher," colliding with the existing
hand-authored `preacher`), plus all 12 remaining issues. `PA_CRA` and
`PA_INK_DIP` granting `AL11`/`AL01` now actually connects to mechanics that
already existed and were waiting for a reachable grant path (`resolve()`'s
Kitchen Cabinet band reduction, Kitchen-Table Meeting's chair-count odds
bonus). One archive persona effect dropped on port (`PA_CRA_DIP`'s
`canTradeObl` flag — no corresponding `GameState` field, nothing reads it).
See `docs/BALANCE-NOTES.md`, "Ported 20 personas + 12 issues from the
archive," for full detail and verification.

**Still not ported — larger than initially scoped, needs its own pass:**
- **A structured obligations registry** (`OBLS`, archive line ~392+), not
  the modular engine's free-text `state.obls: string[]`. Archive
  obligations are `{n, drag}` records with an ongoing *weekly* drag effect
  (e.g. `OB1` "PAC String": `faces.L -= 1; exposure += 0.15` every week
  it's held) — a real, recurring cost, not a one-time flavor note. This is
  a meaningfully bigger change than "port a function"; it changes what
  `state.obls` *is* (a list of ids into a registry, not free strings) and
  needs a weekly-tick call site.
- **16 named allies** (`AL01`–`AL16`, archive line ~381–383), of which
  only a handful have a confirmed grant path even in the archive itself
  (`AL01` via Kitchen-Table-Meeting-equivalent and Court-the-Chairs-equivalent
  BREAKTHROUGH/GAIN outcomes; `AL09` via two dedicated cards — see next).
- **Two dedicated ally-granting cards not yet ported**: `PL21B` "Promote a
  Canvass Captain" (`cost {a:1, vp:3}`, SAFE, grants `AL09` directly) and
  `PL39` "Hire a Field Director" (`cost {a:1, $:2200}`, STD, alternate paid
  path to the same ally). Porting these two specifically would make the
  `warm(s,'AL09')` bonuses already written into `PL01`/`PL02`/`PL04`/`PL19`
  finally reachable without touching anything else.
- **A purchasable assets shop**: `A01` "The Walk List" (archive line 820,
  cost $400, requires owning `A02`), `A09` "Phone Tree" (cost 0, `vcost:2`
  — a volunteer cost, not money) and others — assets in the archive are
  bought with real costs/requirements, not just narrative flags. Modular's
  `state.assets: string[]` currently only ever receives `'BIO_*'`/`'ISSUE_*'`/
  `'REGION_*'` tags from setup — there's no way to acquire `A01`/`A09` at all
  right now, which is *why* they were dead references in the first place.

Recommend treating this as its own scoped increment (`docs/ROADMAP.md`
Phase 2, revised) rather than bundling further into ad hoc single-line
fixes — the obligations-registry change in particular touches the shape of
`GameState.obls`, not just its contents.

## Registry integrity checker (prior art for a roadmap item)

The source conversation describes building exactly this in the archive
prototype: "before adding cards, verifies every id referenced anywhere
(allies granted, obligations added, backers pushed, persona decks, issue
seeds) actually exists in its registry... every persona has a deck and
tags... every play carries attributes... reports the attribute
distribution." It's what caught a real lane imbalance in that prototype
(INK had 2 campaign cards, CON had 6, vs. 14–15 for other lanes). This is
the same tool `docs/ROADMAP.md` Phase 1 item 2 independently proposes for
the modular engine (to catch exactly the class of bug found and fixed this
session — ally/rep/asset ids referenced but never granted). Confirmed
prior art; not a novel idea, a recovery.

## Attribute lanes

Verified directly against `archive/prototype-single-file.html`'s `ATTRS`
array: `CLO` (Clout — "raw pull, turnout muscle, showing up big"), `CON`
(Control — "discipline, message stamina, staying on-message under fire"),
`CRA` (Craftiness — "maneuver, timing, the quick procedural move"), `INK`
(Institutional Knowledge — "rules, precedent, process — the session"),
`DIP` (Diplomacy — "reading rooms, coalitions, endorsements"), `CHA`
(Charm — "retail politics: the doors, the media, likeability") — identical
ids to `AttrId` in `src/engine/types.ts`. Reference distribution target
from the archive after a rebalance pass: **CHA 14 / CLO 14 / DIP 15 / CRA
11 / CON 10 / INK 6** (post-expansion; INK was still the thinnest lane even
after deliberately filling it). Useful reference point for
`docs/ROADMAP.md` Phase 5 (balance breadth) and for any future card-wave
work — INK has a documented history of being underserved.

**Intentional delta to note if porting more archive content:** the
archive's `amod()` defaults an unset attribute to `8` (giving a slight
built-in *negative* modifier, `(8-10)/40`), while the modular engine's
`cardAttrMod` (`src/engine/play.ts`) defaults to `10` (neutral, `0`
modifier — see `createDefaultAttrs()`). Same `(val-10)/40` formula, different
baseline. This looks like a deliberate modular-engine cleanup (a neutral
default is more intuitive than a baked-in penalty), not a bug — but the
archive's balance numbers above were tuned around the 8-baseline, so don't
import them as if they assumed 10.

## What this document is not

- Not a substitute for the full original design conversation, which is
  longer than what was captured here.
- Not a source for exact real-world numbers (filing fees, signature
  thresholds, runoff timing, per-diem). The project's own stated practice
  (`docs/AC1-NOTES.md`) is to verify those against current Texas Election
  Code, not quote from memory or invent them.
- Not a claim that the modular engine should match the archive prototype
  card-for-card — the modular baseline is a deliberate, honest-versioned
  rebuild (`AGENTS.md` covenant 8), not a straight port. Where the two
  disagree, the modular engine's `docs/BALANCE-NOTES.md` reasoning is
  current; this document exists to make sure that reasoning stays
  connected to *why* the mechanic exists in the first place.
