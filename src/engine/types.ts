/**
 * CANDIDATE ZERO — Core Engine Types
 * Single source of truth for state shape and card contracts.
 * Changes here must be reflected in the SRD.
 * Designed for clean eventual port to Swift.
 */

export type FaceId = 'P' | 'O' | 'L' | 'G' | 'T' | 'F';

export interface Faces {
  P: number;
  O: number;
  L: number;
  G: number;
  T: number;
  F: number;
}

export interface Ground {
  id: string;
  n: string;
  pool: number;
  pool0: number;
  prop: number;
  aff: string;
  rapport: number;
  gotv: number;
  gated?: boolean;
  /**
   * Opposition presence at this ground (Phase 1: cosmetic — rivals build it
   * over the campaign, it renders in logs and the ground picker, but does
   * NOT yet affect your odds. Phase 2 wires it into win probability).
   */
  rivalRap?: number;
}

export interface Ally {
  id: string;
  warm: number;
  age: number;
  /**
   * Grounds where this ally is actually working (Phase 1). An ally granted
   * by a ground-based field play is localized to that ground; personas/
   * roster grants with no ground leave this undefined (= warm everywhere,
   * backward-compatible). See allyWarmAtGround() in reputation.ts.
   */
  grounds?: string[];
}

export interface CardCost {
  a?: number;
  $?: number;
  vp?: number;
  m?: number;
  fav?: number;
}

export type RiskClass = 'SAFE' | 'STD' | 'VOL' | 'CHOICE';

/**
 * Card family — WHAT a card is in the fiction, not whether it's good for
 * you. This is the tint/recognizability channel (see src/ui/card-art.ts
 * KIND_META and docs/CARD-TAXONOMY.md). Deliberately distinct from risk:
 * a card can be a volatile Bargain, a safe Ally, etc. `action` is the
 * unmarked default — the plain play. The rest carry a subtle paper wash,
 * an accent frame, and a corner seal glyph so a returning player reads
 * the frame the way they'd read a suit, WITHOUT a verdict label spoiling
 * the hook the way "TRAP" did.
 *
 * Most kinds are forward-looking scaffolding for the 1000-card goal —
 * only `action` and `bargain` are used by cards that exist today.
 */
export type CardKind =
  | 'action'
  | 'bargain'
  | 'ally'
  | 'item'
  | 'location'
  | 'liability'
  | 'blackmail';

/** Root character attributes that modify play odds via cardAttrMod. */
export type AttrId = 'CLO' | 'CON' | 'CRA' | 'INK' | 'DIP' | 'CHA';

export type Attrs = Record<AttrId, number>;

export interface PlayCard {
  id: string;
  n: string;
  cost: CardCost;
  risk: RiskClass;
  ph: number[];
  field?: boolean;
  tag: string;
  d: string;
  attrs?: AttrId[]; // Root attributes: CLO, CON, CRA, INK, DIP, CHA
  /** Card family for tint/recognizability (default 'action'). See CardKind. */
  kind?: CardKind;
  /**
   * Devil's-bargain flag — drives balance/audit tooling only. The
   * player-facing tell is now the `kind: 'bargain'` frame, NOT a label
   * (the "TRAP" stamp was retired). Kept separate from `kind` because a
   * future non-bargain card could still want the balance flag, and vice
   * versa.
   */
  trap?: boolean;
  odds?: (state: GameState, ground?: Ground) => number;
  run?: (state: GameState, result: RollResult, ground?: Ground) => string;
  show?: (state: GameState) => boolean;
  req?: (state: GameState) => boolean;
  w?: number;
}

export interface RollResult {
  tier: 0 | 1 | 2 | 3;
  roll: number;
  p: number;
  band: number;
}

export interface GameState {
  week: number;
  weeksTotal: number;
  ap: number;
  apMax: number;
  fieldAp: number;
  money: number;
  debt: number;
  contacts: number;
  nameID: number;
  volPool: number;
  momentum: number;
  favors: number;
  signatures: number;
  sigNeed: number;
  ballot: boolean;
  hitPieces: number;
  exposure: number;
  messageSharp: boolean;
  clubOdds: number;
  walkCount: number;
  shadowPlays: number;
  disasterLog: number[];
  endorsePts: number;
  slate: boolean;
  absenteeBank: number;
  greeters: number;
  pledges: number;
  faces: Faces;
  shFired: Record<string, boolean>;
  groundsArr: Ground[];
  /**
   * Per-ground play tally for THE CURRENT WEEK — drives diminishing returns
   * (getGroundPenalty). Reset at every week boundary. Keyed by ground id.
   */
  groundPlays?: Record<string, number>;
  /**
   * Transient rapport multiplier for the play in flight — set by
   * executePlay from getGroundPenalty before the card's run() calls
   * rapGain(), read there, then reset. 1 = full rapport, 0.5 = repeat-ground
   * diminishing return. Never persisted meaningfully between plays.
   */
  groundRapMult?: number;
  /** Last ground the player chose — UX default for the picker + CLI. */
  lastGround?: string;
  allies: Ally[];
  backers: string[];
  assets: string[];
  obls: string[];
  reps: string[];
  rivals: { id: string; n: string }[];
  tier: number;
  persona: string | null;
  issue: string | null;
  district: DistrictInfo | null;
  eventsFired: Record<string, boolean>;
  stage: 'primary' | 'general' | 'session';
  genOpp: GeneralOpponent | null;
  genBase: number;
  over: boolean;
  /** Terminal outcome when `over` — pure campaign result label. */
  outcome?: CampaignOutcome;
  /** True after winning the primary and entering general. */
  primaryWon?: boolean;
  log: LogEntry[];
  capital: number;
  favor: number;
  districtStanding: number;
  /**
   * Session-stage bill shape (Phase 2 data-only groundwork for Phase 4).
   * Not wired to win conditions — typed so Phase 4 doesn't re-shape GameState.
   */
  bill: Bill | null;
  /**
   * Committee assignment for the player's bill / membership (Phase 4).
   * Inert until session mechanics land.
   */
  committee: Committee | null;
  sessionFlags: Record<string, boolean>;
  wave: number;
  skippedTownHall: boolean;
  townHallThisWeek: boolean;
  debatePrepped: boolean;
  oppoFile: boolean;
  favWitness: number;
  /** Root attributes (baseline 10). cardAttrMod uses (score-10)/40 per linked attr. */
  attrs: Attrs;
  /** Campaign seed when set — for replay harnesses and CLI. */
  seed?: number;
  regionHook?: string;
  slowDecay?: boolean;
  globalBand?: number;
  pieMalus?: number;
  allyMalus?: number;
  estabPenalty?: boolean;
  b05Malus?: number;
  rapStall?: boolean;
  mediaBonus?: number;
  mediaCap?: boolean;
  rainWeek?: boolean;
  fairWeek?: boolean;
  parlSave?: boolean;
  parlUsed?: boolean;
  moneyClash?: boolean;
  strawBonus?: number;
  deck?: string[];
  handBonus?: number;
  /** Last phase used for draft-evolution detection. */
  lastPhase?: 1 | 2 | 3;
  /** Pending phase-turn draft (3 card options). */
  pendingDraft?: { phase: number; options: string[] };
  /** Set on a "Stand for Reelection" continuation (src/engine/legacy.ts). */
  incumbentRun?: boolean;
  /** 1 on a first run; increments each successful reelection continuation. */
  termNumber?: number;
  /** Dopamine / feedback loop state (presentation of truth; never alters RNG). */
  feedback?: import('./feedback.js').FeedbackState;
  /**
   * Archive counters used by ally/rep grant thresholds (Phase 2 port).
   * Optional so createNewState stays lean; plays initialize on first use.
   */
  /** Kitchen-table / pie-circuit successes — R05 at >=6 (archive pieCount). */
  pieCount?: number;
  /** Press releases filed — AL04 grant at 2 (archive prCount). */
  prCount?: number;
  /** Precinct chairs banked beyond ally instances (archive chairCount). */
  chairCount?: number;
  /** Prayer Breakfasts attended — AL08 threshold (archive pbCount). */
  pbCount?: number;
  /** Straw poll wins — R09 with pledges (archive strawWins). */
  strawWins?: number;
  /** Week number when funeral is available (archive funeralWeek); -1 = spent. */
  funeralWeek?: number;
  /** Billboard name-ID halved after rival buys next door (archive billboardHalved). */
  billboardHalved?: boolean;
}

/**
 * Session bill — Phase 4 will wire lifecycle; Phase 2 only freezes the shape.
 * Mirrors what a Texas House bill needs to be a game object: who sponsored it,
 * which issue it serves, where it sits, and how the floor math looks.
 */
export interface Bill {
  id: string;
  /** Short title (e.g. issue-linked). */
  title: string;
  /** Issue id from setup (state.issue) this bill advances. */
  issueId: string | null;
  /** Sponsor display name (player or co-author). */
  sponsor: string;
  /** Committee currently holding the bill, if any. */
  committeeId: string | null;
  status: BillStatus;
  /** Aye / nay / present tallies when a floor or committee vote is open. */
  tally: VoteTally;
  /** Calendar week the bill was filed (campaign or session clock). */
  filedWeek?: number;
}

export type BillStatus =
  | 'draft'
  | 'filed'
  | 'in_committee'
  | 'reported'
  | 'on_calendar'
  | 'passed'
  | 'failed'
  | 'dead';

export interface VoteTally {
  aye: number;
  nay: number;
  present: number;
  /** Seats that must vote for a win; 0 = unset until Phase 4. */
  need?: number;
}

/**
 * Legislative committee — membership + chair for session politics (Phase 4).
 */
export interface Committee {
  id: string;
  n: string;
  /** Player is a member. */
  member: boolean;
  /** Player chairs (rare; power). */
  chair: boolean;
  /** Soft 0–100 standing with the chair / room. */
  standing: number;
}

/** Runtime district binding (from data/setup.ts DISTRICTS, applied at setup). */
export interface DistrictInfo {
  id: string;
  name: string;
  align: 'safe' | 'competitive' | 'wrong';
  incumbent: boolean;
  field: number;
  trap?: boolean;
}

/** General-election opponent summary (set on primary win in calendar.ts). */
export interface GeneralOpponent {
  n: string;
  strength: number;
}

export type CampaignOutcome =
  | 'ongoing'
  | 'missed_filing'
  | 'lost_primary'
  | 'won_general'
  | 'lost_general';

/** One archive-authored trait — see src/engine/legacy.ts TRAITS for effects. */
export type TraitId =
  | 'T_AUTHOR'
  | 'T_LEVERS'
  | 'T_LIST'
  | 'T_KNOWN'
  | 'T_CRED'
  | 'T_NORTH'
  | 'T_NERD'
  | 'T_WHIP'
  | 'T_REST'
  | 'T_PERSP';

/** A finished run, recorded in the Chronicle. */
export interface LegacyRun {
  /** One-line narrative summary of how the run ended (src/engine/legacy.ts buildEpithet). */
  epithet: string;
  kind: CampaignOutcome;
  /** Flavor text for the interim path chosen after this run ended. */
  interim?: string;
}

/** What a finished run banks forward into the next one (before traits modify it further). */
export interface LegacyCarry {
  contacts?: number;
  nameID?: number;
}

/**
 * Cross-run meta-progression — "the Chronicle." Persisted to localStorage
 * (browser only; harnesses/CLI never touch this). A run ending is not a
 * reset: the player picks an interim path and a permanent trait, then the
 * next run starts already carrying real progress forward.
 */
export interface LegacyState {
  runs: LegacyRun[];
  traits: TraitId[];
  carry: LegacyCarry;
  name?: string;
}

export interface DeckState {
  draw: string[];
  hand: string[];
  discard: string[];
}

export interface PlayOutcome {
  ok: boolean;
  reason?: string;
  cardId?: string;
  cardName?: string;
  tier?: 0 | 1 | 2 | 3;
  text?: string;
  stamp?: string;
  /** Dopamine payload — pure annotation of the roll. */
  feedback?: import('./feedback.js').PlayFeedback;
  /** Effective p after attr mod (for UI meters). */
  p?: number;
  roll?: number;
}

export interface LogEntry {
  week: number;
  kind: 'play' | 'draw' | 'week' | 'note' | 'juice' | 'summary';
  text: string;
  cardId?: string;
  tier?: number;
  beat?: string;
}
