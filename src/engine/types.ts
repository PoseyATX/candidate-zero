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
  trap?: boolean; // RISK plays (PAC, self-fund) — UI says "Risk", not "Trap"
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
  /** Display names (locked at first setup). */
  persona: string | null;
  issue: string | null;
  district: DistrictInfo | null;
  /** Stable ids — persona never changes; others only via thematic interim events. */
  personaId?: string;
  issueId?: string;
  districtId?: string;
  regionId?: string;
  regionName?: string;
  eventsFired: Record<string, boolean>;
  /** primary → general → interim (off-season) → primary … forever */
  stage: 'primary' | 'general' | 'session' | 'interim';
  genOpp: GeneralOpponent | null;
  genBase: number;
  /**
   * Only true on rare career ruin. Election losses/wins do NOT end the career —
   * they open interim / the next cycle.
   */
  over: boolean;
  /** Last cycle's election result (not a terminal end-state). */
  outcome?: CampaignOutcome;
  lastCycleOutcome?: CampaignOutcome;
  /** True after winning the primary and entering general. */
  primaryWon?: boolean;
  /** Seated after a general win; cleared on later loss if we model that. */
  inOffice?: boolean;
  /** Career cycle counter (0 = first primary). */
  cycleIndex?: number;
  /** Off-season progress (1-based within interim). */
  interimWeek?: number;
  interimWeeksTotal?: number;
  /** Thin regular session while in office (1-based). */
  sessionWeek?: number;
  sessionWeeksTotal?: number;
  /** Speaker / chamber favor (session). */
  speakerFavor?: number;
  /** Bills filed this session (thin session counter). */
  billsFiledSession?: number;
  /** Residues earned in interim; applied when the next primary opens. */
  pendingResidue?: CycleResidue[];
  /** Applied residues still active this cycle (ids for flavor). */
  activeResidue?: string[];
  /** Visible trophies/flags/scars — failure and purchase loot for the UI. */
  trophies?: Trophy[];
  /** Card ids minted as cycle loot (also injected into deck). */
  cycleLoot?: string[];
  /** Last loot juice line for UI banner. */
  lastLootJuice?: string;
  /**
   * Rare thematic identity fork — never persona.
   * Player must resolve before more interim/session work (or auto-resolve in harnesses).
   */
  pendingThematic?: ThematicChoice | null;
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
  lastPhase?: 0 | 1 | 2 | 3 | 4;
  /** Pending phase-turn draft (3 card options). */
  pendingDraft?: { phase: number; options: string[] };
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
  | 'lost_general'
  | 'ruin';

/** Off-season scar or gift that carries into the next election cycle. */
export interface CycleResidue {
  id: string;
  name: string;
  text: string;
  kind: 'boon' | 'hindrance';
  /** Which identity facet produced this (for theming / UI). */
  source?: 'persona' | 'issue' | 'district' | 'region' | 'cycle' | 'session';
}

/** Tangible UI-visible token: scar, flag, or loot from cycles / shop. */
export interface Trophy {
  id: string;
  name: string;
  text: string;
  kind: 'scar' | 'flag' | 'loot';
  cycle: number;
}

/** A forced narrative fork — maps, issues, or region — never a free re-pick menu. */
export interface ThematicChoice {
  id: string;
  kind: 'issue' | 'district' | 'region';
  title: string;
  body: string;
  options: ThematicOption[];
}

export interface ThematicOption {
  id: string;
  label: string;
  /** Human cost flavor shown under the button. */
  costNote?: string;
  /** What changes if picked (engine applies). */
  effect: ThematicEffect;
}

export type ThematicEffect =
  | { type: 'keep' }
  | { type: 'set_issue'; issueId: string }
  | { type: 'set_district'; districtId: string }
  | { type: 'set_region'; regionId: string }
  | { type: 'scar'; residueId: string; name: string; text: string };

export interface LegacyState {
  runs: any[];
  traits: string[];
  carry: any;
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
