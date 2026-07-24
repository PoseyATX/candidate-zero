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
  rivalRap?: number;
}

export interface Ally {
  id: string;
  warm: number;
  age: number;
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

export type CardKind =
  | 'action'
  | 'bargain'
  | 'ally'
  | 'item'
  | 'location'
  | 'liability'
  | 'blackmail';

export type AttrId = 'CLO' | 'CON' | 'CRA' | 'INK' | 'DIP' | 'CHA';

export type Attrs = Record<AttrId, number>;

export type CardResidency = 'main' | 'special' | 'outside';

export type CardControl = 'player' | 'world';

export interface PlayCard {
  id: string;
  n: string;
  cost: CardCost;
  risk: RiskClass;
  ph: number[];
  field?: boolean;
  tag: string;
  d: string;
  attrs?: AttrId[];
  kind?: CardKind;
  rarity?: 'common' | 'uncommon' | 'rare';
  trap?: boolean;
  residency?: CardResidency;
  control?: CardControl;
  entityScope?: string[];
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
  pacBridgeDebt?: number;
  selfLoanTaken?: boolean;
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
  groundPlays?: Record<string, number>;
  groundRapMult?: number;
  lastGround?: string;
  allies: Ally[];
  backers: string[];
  assets: string[];
  obls: string[];
  reps: string[];
  rivals: { id: string; n: string }[];
  tier: number;
  persona: string | null;
  personaId: string | null;
  playedCardIds: Record<string, number>;
  pathProgress: Record<string, number>;
  pathsUnlocked: Record<string, boolean>;
  issue: string | null;
  district: DistrictInfo | null;
  eventsFired: Record<string, boolean>;
  stage: 'primary' | 'general' | 'session' | 'waiting';
  genOpp: GeneralOpponent | null;
  genBase: number;
  over: boolean;
  outcome?: CampaignOutcome;
  waitingPathId?: string;
  waitingLoopId?: string;
  waitingWeeksLeft?: number;
  primaryWon?: boolean;
  log: LogEntry[];
  capital: number;
  favor: number;
  districtStanding: number;
  bill: Bill | null;
  committee: Committee | null;
  sessionFlags: Record<string, boolean | number>;
  wave: number;
  skippedTownHall: boolean;
  townHallThisWeek: boolean;
  debatePrepped: boolean;
  oppoFile: boolean;
  favWitness: number;
  attrs: Attrs;
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
  lastPhase?: 1 | 2 | 3;
  pendingDraft?: { phase: number; options: string[] };
  pendingOutside?: { id: string; n: string; text: string } | null;
  incumbentRun?: boolean;
  termNumber?: number;
  feedback?: import('./feedback.js').FeedbackState;
  pieCount?: number;
  prCount?: number;
  chairCount?: number;
  pbCount?: number;
  strawWins?: number;
  funeralWeek?: number;
  billboardHalved?: boolean;
  currentEntityId?: string;
  entityHistory?: string[];
  orbitWarmth?: Record<string, number>;
  pendingMovement?: import('./types-entities.js').MovementOpportunity;
}

export interface Bill {
  id: string;
  title: string;
  issueId: string | null;
  sponsor: string;
  committeeId: string | null;
  status: BillStatus;
  tally: VoteTally;
  filedWeek?: number;
  pipelineStage: number;
  heat: number;
  weeksAtStage?: number;
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
  need?: number;
}

export interface Committee {
  id: string;
  n: string;
  member: boolean;
  chair: boolean;
  standing: number;
}

export interface DistrictInfo {
  id: string;
  name: string;
  align: 'safe' | 'competitive' | 'wrong';
  incumbent: boolean;
  field: number;
  trap?: boolean;
}

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
  | 'session_law'
  | 'session_survived'
  | 'session_primaried';

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

export interface LegacyRun {
  epithet: string;
  kind: CampaignOutcome;
  interim?: string;
}

export interface LegacyCarry {
  contacts?: number;
  nameID?: number;
  debt?: number;
  pacBridgeDebt?: number;
  debtObls?: string[];
  waitingLoopId?: string;
  waitingContacts?: number;
  waitingNameID?: number;
  waitingMoney?: number;
  waitingVols?: number;
  waitingFavors?: number;
  higherOfficeFork?: 'senate' | 'statewide';
}

/** Filed identity — set once at nameplate; never re-prompted until Chronicle wipe. */
export interface FiledIdentity {
  personaId: string;
  issueId: string;
  districtId: string;
  regionId: string;
}

export interface LegacyState {
  runs: LegacyRun[];
  traits: TraitId[];
  carry: LegacyCarry;
  name?: string;
  /** Persistent identity from the 3-step card nameplate. */
  identity?: FiledIdentity;
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
  feedback?: import('./feedback.js').PlayFeedback;
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
