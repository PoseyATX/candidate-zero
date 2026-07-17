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
}

export interface Ally {
  id: string;
  warm: number;
  age: number;
}

export interface CardCost {
  a?: number;
  $?: number;
  vp?: number;
  m?: number;
  fav?: number;
}

export type RiskClass = 'SAFE' | 'STD' | 'VOL' | 'CHOICE';

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
  trap?: boolean; // Honestly labeled trap plays (PAC check, self-fund, etc.)
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
  bill: any;
  committee: any;
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
