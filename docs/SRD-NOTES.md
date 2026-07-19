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
| Self-funding-into-debt trap | **Phase 3 (2026-07-18):** real lever, not an odds tax — see § "Debt as leveraged optionality" below |
| Early money/endorsement that forecloses coalitions | Card exists (`PL20_PacCheck`, honestly labeled, records an obligation) but the obligation has **no mechanical consequence** — same gap |
| Indifference → notice → targeted resistance conflict shape | Partially implemented: `state.tier` now escalates disaster risk across pre-ballot/on-ballot/general (fixed 2026-07-17), but there's no explicit "you got noticed" event/spike — it's a smooth curve, not a phase-change moment |
| Respectable-loss branches (Perennial Candidate / Advocate / Staffer) | **Not implemented.** Current terminal outcomes are only `missed_filing` / `lost_primary` / `won_general` / `lost_general` — no secondary paths exist at all |
| Officeholder trunk beyond the general win | **Not implemented** — this is the Session stage; see below |
| Shadow consequences on Faces | **Implemented 2026-07-17** — `src/engine/reputation.ts` ports `shadowCheck()` in full (see below) |
| Reputation grants (R01/R02/R04/R07/R10/R11) | **Implemented 2026-07-17** — `src/engine/reputation.ts` ports the reachable subset of `repCheck()` (see below) |

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

## Ground selection is part of play execution (Phase 1, 2026-07-17)

Ground selection was formalized as a step of playing a field card, not a
hidden auto-pick. When a field card resolves, the player chooses **one**
ground for it (UI modal `#ground-picker`; CLI `chooseGround` prompt), and
that choice feeds the card's `run()`/`odds()`. `pickDefaultGround` remains
only as the fallback for the harness/auto path.

Rules now live in the engine, not flavor text:

- **Diminishing returns** — the same ground worked twice in one week bumps
  odds slightly (familiarity) but banks half the rapport
  (`getGroundPenalty` in `calendar.ts`; per-week `state.groundPlays`,
  transient `state.groundRapMult`). Broad rapport requires spreading out.
- **Ally-at-ground warmth** — an ally granted by a ground-based field play
  (AL09 via Canvass Captain / Field Director) is localized to that ground
  (`Ally.grounds`), and its field bonus only applies there
  (`allyWarmAtGround`). Roster/persona grants stay warm everywhere.
- **Opposition presence is VISIBLE but toothless in Phase 1** —
  `Ground.rivalRap`, built 5–40/week by `advanceRivalGrounds`, renders in
  the log and picker but does **not** affect the player's odds yet. Making
  it bite is Phase 2. This is deliberate: Phase 1's job was to make the
  choice *visible* and *measurable* (see `harness:grounds`), not to
  rebalance around opposition before we could see the distribution.
- **Win-condition sketch** — `career.ts checkBallotThreshold()` encodes the
  intended rapport-distribution victory (primary 60% home + 40%×2; general
  40% + 30%×2) for measurement only; it is not consulted by the live
  election path. `harness:grounds` shows it is met 0% of the time under
  current rapport tuning — the rapport economy is far short of it, which is
  the headline Phase 2 balance input.

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
`warm(state,'AL11')` band reduction, `PL01`/`PL02`/`PL04`/`PL19`'s
`warm(s,'AL09')` / `allyWarmAtGround` bonuses (AL09 grantable via PL21B/PL39
as of 2026-07-17; full ally matrix 2026-07-18 — see Phase 2 closeout below),
and `plays.ts`'s `rapGain()` already checking `state.rapStall`
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

### Phase 2 closeout (2026-07-18) — full ally/asset/obligation port

Ported from `archive/prototype-single-file.html` with line citations in code:

**Obligations** (`src/data/obligations.ts`, archive ~393–404):
`state.obls` is now a list of registry ids (OB1–OB10). Weekly `drag` runs
in `calendar.onWeekAdvance` via `applyOblDrag`. PL20 grants OB1 (PAC
String); PL21 grants OB2 (Bank Note); shadow G2 grants OB8 (Cousin on the
Payroll) instead of free-text. Empty-drag leashes (OB3/OB4/OB6/OB7/OB9/OB10)
match archive.

**Assets shop** (`src/data/assets.ts`, archive ~819–831): eight purchasable
items (A01 Walk List, A02 Voter File, A03 Mail, A04 Website, A06 Flatbed,
A09 Phone Tree, A11 Push Cards, A12 Billboard). Offered as 0-AP camp actions
(`BUY*`) in `listPlayableHand`. A01 requires A02; A09 costs 2 volunteers.
Closes the A01/A09 dead refs. A13 Church Directory remains a PL30 grant, not
sold (archive parity).

**Ally grants** (each cites archive function/line in code comments):

| Ally | Grant path (archive) |
|---|---|
| AL01 Precinct Chair | PL08 t0/t1; PL14 t0; personas PA_DIP / PA_INK_DIP |
| AL02 County Chairwoman | PL08 when chairs ≥ 3 (lines 581–582) |
| AL03 Club President | PL11 straw win (599) |
| AL04 Beat Reporter | PL10 prCount===2 (595); PL32 coffee t0 (723) |
| AL06 Retired Judge | PL29 funeral respect path (1547) + week event unlock |
| AL08 Pastor | PL30 pbCount≥2 && GR04.rapport≥30 (715) |
| AL09 Canvass Captain | PL21B / PL39 (670, 747) — ground-localized |
| AL11 Kitchen Cabinet | persona PA_CRA |
| AL12 The Old Bull | week events (893, 901) |
| AL14 Rival's Staffer | week event (885) |
| AL15 County Judge | PL48 t0 (779) |
| AL16 Slate-Maker | PL22B t≤1 + OB3 (673) |

**Intentional stubs** (archive `warm()` refs, never `addAlly` — modular
keeps the checks, documents in `INTENTIONAL_STUB_ALLIES`):
AL05 Drive-Time Host, AL07 Feed-Store Regulars, AL10 Finance Chair
(weekly +$300 effect ready), AL13 Lobbyist w/ a Conscience.

**Kitchen-Table vs ground affinity:** archive allies are roster-wide
(`addAlly` has no ground). Phase 1's `allyWarmAtGround` is a modular
addition for *field* allies (AL09). PL08 is **not** gated on
AL01-at-ground — that would invent mechanics the archive never had.
Odds still scale on warm AL01 count + `chairCount`.

**repCheck full matrix** (archive 512–524): R05 (pieCount≥6), R06
(AL02|AL15), R08 (slate+R06), R09 (pledges+strawWins), R12 (AL12.warm≥3)
now fire. R10 still uses modular `disasterLog.length` (stable AC1).

**Bill/committee types** (`types.ts`): `Bill`, `Committee`, `VoteTally`,
`BillStatus` — data shape only for Phase 4; no session mechanics.

**Harnesses:** `npm run harness:dead-refs`, `harness:shop`,
`harness:obligations` — all green; full suite green.

## Debt as leveraged optionality (Phase 3, 2026-07-18)

**Wrong draft rejected:** flat debt→odds penalty. Mid-race donors and voters
do not mark you down for net position; that design also made leverage
strictly bad. **`resolve.ts` never reads `debt`.**

**Model** (`src/engine/debt.ts`):

| Branch | Behavior | Hooks reused |
|---|---|---|
| **Spend-now** | PL21 `applySelfLoan`: +$3000 cash, principal×1.4 on books, `addObl(OB2)` weekly −$150. Real optionality for fee/assets/field. | `obligations.ts` OB2; `canAfford` |
| **Win — self** | `retireDebtOnWin`: token fee ≤$200, clear debt + OB2, **no** Session gate | — |
| **Win — PAC bridge** | PL20 under open debt → `maybePacBridge`: PAC owns share of note; win clears cash but keeps **OB1** + `sessionFlags.pac_lender_claim` (Phase 4 committee/vote) | `addObl(OB1)`, `sessionFlags` |
| **Loss** | `mergeDebtIntoCarry` / `debtCarryFromLoss`: principal ×1.15 into `LegacyCarry.debt`; next run `applyLegacyDebt` re-applies OB2 | `recordRun`, `applyLegacy` |
| **Affordability** | `availableCash` reserves 8¢/$ over $2000 debt; `canAfford` uses it for $ costs only | `play.ts canAfford` |
| **Crisis (≥$5000)** | Interim paths: perennial + home only; PL20 early via `pacCheckAvailable` as relief valve (no new fund card) | `buildPaths`, PL20 `show` |

**Harness evidence** (`npm run harness:debt`, n=40): debt-leverage strategy
**45%** general wins vs conservative money **35%** (+10pp). Leverage is a
real win-rate case, not pure downside. Loss-branch compound verified
(debt does not vanish; next cycle tighter cash without soft-lock).

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
