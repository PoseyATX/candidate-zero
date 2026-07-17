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
  rivals: any[];
  tier: number;
  persona: string | null;
  issue: string | null;
  district: any;
  eventsFired: Record<string, boolean>;
  stage: 'primary' | 'general' | 'session';
  genOpp: any;
  genBase: number;
  over: boolean;
  /** Terminal outcome when `over` — pure campaign result label. */
  outcome?: CampaignOutcome;
  /** True after winning the primary and entering general. */
  primaryWon?: boolean;
  log: any[];
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
}

export type CampaignOutcome =
  | 'ongoing'
  | 'missed_filing'
  | 'lost_primary'
  | 'won_general'
  | 'lost_general';

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
}

export interface LogEntry {
  week: number;
  kind: 'play' | 'draw' | 'week' | 'note';
  text: string;
  cardId?: string;
  tier?: number;
}
