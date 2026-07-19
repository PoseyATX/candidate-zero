# Card Residency — Main / Special / Outside

**Status:** design law (schema live; event deck + boosters not built)  
**Related:** [`CARD-TAXONOMY.md`](./CARD-TAXONOMY.md) (kind/risk *visual* channels) · [`STARMAP.md`](./STARMAP.md) (entities/loops) · `PlayCard` in `src/engine/types.ts`

This is the **deck architecture** law for a Magic-scale catalog. Taxonomy answers *what is this card?* Residency answers *where does it live, and who is allowed to use it?*

---

## The three residencies

| Residency | Question | Lives in | Player plays it? |
|---|---|---|---|
| **Main** | What does the player *always* carry (unless lost to crime, scandal, misfortune)? | Main Deck / persistent catalog | Yes (`control: player`) |
| **Special** | What only exists when embodying *certain entities / loops*? | Entity kit, loop package, or temporary overlay | Yes, when scoped (`control: player`) |
| **Outside** | What only occupies the event deck and is *not* something the player uses or controls? | Event deck only | **Never** (`control: world`) |

**Litmus tests (use these; do not invent a fourth bucket):**

1. **Main** — If the player is still “in politics” but has lost this office, do they still reasonably *own* this verb/asset/noun? Block Walk, Press Release, Self-Fund, Walk List: yes. Floor Fight, Writ, Call-in-Precinct-Network-as-Chair: no.
2. **Special** — Does this only make sense because of *who they are right now* (freshman member, precinct chair orbit, county judge, staffer)? Session pipeline cards, entity movement verbs, office-specific powers: yes.
3. **Outside** — Can the player *choose* this card from their hand as an intentional play? If no — if it *happens to them* (New World Screw Worm, redistricting, ethics complaint filed *against* them, rival hit piece as world event) — it is Outside. The player may *react* with Main/Special cards; they do not *play* Outside.

---

## Control channel (orthogonal)

| Control | Meaning |
|---|---|
| `player` | Something the player may choose, buy, or spend when available |
| `world` | Engine/rival/fate force; never a player hand choice |

**Hard rule:** `residency: 'outside'` ⇒ `control: 'world'`. If a designer wants a playable disaster response, that response is a **Main or Special** card; the disaster itself stays Outside.

`CardKind` (action/bargain/ally/item/…) and `RiskClass` stay independent. An Outside card can still be `kind: 'liability'` thematically when rendered in the event UI later — residency does not replace taxonomy.

---

## What always goes Main (persistent)

**Player-always assets / options / nouns / verbs** (unless lost):

| Class | Examples (now or planned) | Notes |
|---|---|---|
| Core campaign verbs | Block Walk, Phone Bank, Town Hall, GOTV, Oppo, Message | Spine of every candidate run |
| Access doors | Petition Drive, Filing Fee | Main even when show-gated off ballot |
| Bargains / leverage | PAC Check, Self-Fund on Credit | Main + scarce weight; strings are obligations, not residency change |
| Shop items | Walk List, Voter File, Phone Tree | Unlocks into persistent `state.assets` — Main catalog |
| Generic ally-grant plays | Kitchen Table, Court the Chairs | Available across many entities as candidate toolkit |
| Force multipliers | Recruit Volunteers, Sharpen Message | Career-wide tools |

**Misfortune / crime / scandal** (future): Main cards can be *stripped* from ownership (deck thinning) without reclassifying them as Outside. Loss of a Walk List is not “the Walk List became Outside” — the player no longer holds that Main card.

---

## What goes Special (entity / loop packages)

**Only when embodying certain entities or sitting in a certain loop:**

| Class | Examples | Scope |
|---|---|---|
| Session / legislative verbs | SS01–SS13 (File Bill, Floor Fight, Writ…) | Loop: elected Session; entity family `ENT_FRESHMAN_MEMBER` / state rep |
| Entity movement verbs | MV01 Call in Precinct Chair network | `entityScope: ['ENT_PRECINCT_CHAIR']` |
| Office kits (future) | Speaker calendar favors, Whip count tools, Clerk witness list | Bound to ENT_* leadership / staff |
| Waiting-loop kits (future) | Staffer research verb, perennial candidate rematch tools | Bound to waiting entity loops |

**Template law (non-negotiable at scale):** do **not** write 93 unique Special decks for 93 entities. Write **role templates** (candidate kit, member kit, chair kit, staff kit, statewide kit) and **delta cards** per named entity. Starmap entities get packages by cluster/tier, not by fan-fiction uniqueness.

MV01 is the pilot of this pattern: one Special verb, tightly show-gated, not stuffed into every starter deck.

---

## What goes Outside (event deck only)

**The player cannot PLAY these; they encounter them.**

| Class | Example flavor | Why Outside |
|---|---|---|
| Ecological / crisis | New World Screw Worm | World state; player reacts with Main/Special |
| Structural shocks | Mid-decade map, special session call | Institutional weather |
| Hostile actors as events | Rival dump, PAC counter-offer as forced encounter | Not player agency |
| Ambient Texas | Drought, energy boom, culture-war week | Texture + pressure |

**None of these are implemented as cards yet.** Schema supports them; catalog has zero Outside rows on purpose. When the event deck lands, Outside cards must set `control: 'world'` and must **not** appear in `listPlayableHand` / player draw.

**Gray zone (be honest):** PL29 Attend Funeral is *show-gated by calendar* but is still a **player choice** when available → **Main** (event-triggered Main), not Outside. Outside would be “A beloved judge dies” as a world card that *opens* the funeral option. Do not collapse “event-triggered player verb” into Outside; that confuses control with trigger source.

---

## Honest critique — what works, what is dogshit

### Works (keep)

1. **Three residencies + control is the right spine.** MTG-scale catalogs die when every card is “in the deck somehow.” Main / Special / Outside maps cleanly to: always-you / only-when-you-are-X / happens-to-you. That is legible to designers and to future Unity presentation.
2. **Orthogonality to CardKind/Risk.** Bargain stays a *kind*; trap stays balance tooling; residency stays architecture. Mixing “this is a trap so it’s Outside” would be a category error (PAC Check is a *player* bargain on Main).
3. **Session SS* as Special.** Correct. Floor Fight in the primary starter deck would be dogshit fiction and dogshit UI.
4. **MV01 as Special with entityScope.** Correct pilot for starmap. Camp-offer surface (not forced into every draw) is the right short-term UX until entity kits are real packages.
5. **Templates over 93 unique kits.** This is the only way the career graph does not become unmaintainable content sludge. Learn from successful live CCG ops: cycles + archetypes, not infinite bespoke one-offs.

### Enhances the game (lean into)

1. **Main deck as identity + loss.** Persistent Main + rare stripping (scandal, bankruptcy, ethics) makes ownership *feel* like a political career. Slay the Spire–style permanent deck *growth* without loss is too clean for Texas politics; optional *thinning* on setbacks is more honest than infinite bag.
2. **Special as the reward for orbit/loop entry.** Advancement should *change your verbs*, not only your numbers. That is the difference between a career graph and a stat grind.
3. **Outside as weather, not a second player.** Event-deck Outside (Balatro’s blind modifiers / MTG’s global enchantments as analogy only) keeps the world hostile without giving the player “play the Screw Worm” nonsense.
4. **Draft / boosters later.** Once residency is stable, earned boosters can inject **Main scarce** and **Special packages** without rewriting architecture. Do not invent booster rarity before residency tags are complete on new cards.

### Dogshit / failure modes (avoid)

1. **93× unique Special decks.** Will ship late, balance never, and feel samey anyway. Templates + deltas only.
2. **Putting Outside cards in the player hand “for drama.”** That is a design cop-out. If the player can play it, it is not Outside.
3. **Show-gates as a substitute for residency.** `show()` is runtime availability; residency is design ownership. Session cards already hide via stage — still tag them Special so Unity, boosters, and audits do not treat them as Main.
4. **Main bloat.** If everything is Main, the starter deck becomes a phone book and every run feels the same. Scarcity, phase injects (GOTV in general), and Special packages are the antidote — not “add more Main.”
5. **Special that never leaves.** If you keep Session verbs after sine die without an office, fiction breaks. Special must be able to **depart** the active kit on loop exit (implementation later; law now).
6. **Cloning MTG product structure wholesale.** MTG’s colors/sets/draft are *product* lessons (limited archetypes, draft as skill), not a license to ship real-world political names as collectible scarcity porn. Ethical/legal: original fiction, no counterfeit marks, no claiming official TxLege endorsement. Mechanical lessons only.
7. **PAC Check as free Main ATM.** Already fixed once (`pacCheckTaken`). Residency does not save bad economy — scarce Main bargains still need once-gates and Session collection.

### Cross-game patterns (ethical bounds — mechanics only)

| Pattern | Source (inspiration) | Apply how | Do not copy |
|---|---|---|---|
| Persistent identity deck + run modifiers | Roguelike deckbuilders | Main = identity; Outside = run weather | Exact card text / IP |
| Sideboards / format legality | CCG sideboards | Special = “legal in this loop” | Tournament rules fluff |
| Global enchantments / blinds | Board/CCG globals | Outside alters rules without being played | Art/names |
| Class kits / loadouts | RPGs, autobattler roles | Entity templates | Pay-to-win kits |
| Draft archetypes | Limited formats | Future booster drafting of Main scarce + Special packages | WotC product SKUs |

---

## Current catalog tagging (v0 pass)

| Set | Residency | Control | Notes |
|---|---|---|---|
| `CORE_PLAYS` | `main` | `player` | Always-carry campaign spine |
| `WAVE4_PLAYS` | `main` | `player` | Multipliers + bargains + ally grants; traps stay Main scarce |
| `SHOP_PLAYS` / BUY* | `main` | `player` | Item unlocks into persistent assets |
| `SESSION_PLAYS` | `special` | `player` | Loop kit; `entityScope` freshman / state-rep family |
| `STARMAP` MV01 | `special` | `player` | `entityScope: ['ENT_PRECINCT_CHAIR']` |
| Outside | — | — | **None yet** (documented only) |

Gray: PL29 funeral = Main, event-triggered (see above).

---

## Implementation notes (engine)

- Fields on `PlayCard`: `residency?`, `control?`, `entityScope?` (`src/engine/types.ts`).
- Defaults for untagged legacy reads: treat missing as `main` + `player` in any future filter helper (do not silently treat missing as Outside).
- **Not in this pass:** event deck, Outside resolution pipeline, booster packs, auto-strip on scandal, Unity presentation.
- **Future filter sketch:** `listPlayableHand` only returns `control === 'player'`; Outside never enters that list; Special filtered by active loop/entity package.

---

## Adding a card (checklist)

1. Pick **residency** with the litmus tests above.  
2. Set **control** (`outside` ⇒ `world`).  
3. If Special, set **entityScope** and/or document loop package.  
4. Set **kind** / **risk** per taxonomy (independent).  
5. Do not invent a new residency bucket without updating this doc + types.  
6. Prefer template package membership over one-off snowflake design.

---

## What this deliberately is not

- Not a 1000-card content dump.  
- Not booster economy.  
- Not a second rules engine.  
- Not permission to ship Outside as player toys.

When residency tags disagree with a show-gate or a starmap loop, **fix the card and fix the tag or the fiction** — do not paper over with another boolean.
