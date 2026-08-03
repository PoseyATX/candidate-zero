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
  | 'blackmail'
  | 'promo';

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
  /** Render full-bleed: art fills the whole card face, no name/cost/emblem chrome.
   *  Art source is auto-loaded from src/assets/full-art/<id>.svg — see card-face.ts. */
  fullBleedArt?: boolean;
  /** Refund 1 AP when this play lands a breakthrough (tier 0). The chain seam:
   *  it ties the action economy to the risk system, so a breakthrough buys the
   *  turn back and combo weeks become possible. See engine/play.ts. */
  refundOnBreak?: boolean;
  /** Chance (0–1) per weekly growth pass to auto-inject this card into the deck
   *  (drawn once per run, kept out of normal draft/growth pools via show:()=>false).
   *  See engine/promo.ts. */
  promoRate?: number;
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
  /** The opposition seated for this run, as a transportable profile.
   *  In head-to-head this arrives from the other player; in single player it is
   *  built from the persistent rival. See engine/rival-profile.ts. */
  rivalProfile?: import('./rival-profile.js').RivalProfile;
  tier: number;
  persona: string | null;
  personaId: string | null;
  playedCardIds: Record<string, number>;
  pathProgress: Record<string, number>;
  /** cardId -> upgrade tier. Plain JSON so it survives serialize/deserialize.
   *  See engine/upgrades.ts — a tier on an owned card, not a second catalog. */
  cardUpgrades?: Record<string, number>;
  pathsUnlocked: Record<string, boolean>;
  /** Display name, e.g. "Water rights". Goes in epitaphs and headlines. */
  issue: string | null;
  /**
   * The issue's stable ID, e.g. "water".
   *
   * `state.issue` has always held the display NAME (applySetup: `state.issue =
   * issue.n`), which meant the single mechanical use of the issue anywhere in
   * the codebase — an outside event gated on `s.issue === 'water'` — could never
   * fire. Not under-used: dead. Everything mechanical keys off this instead.
   */
  issueId?: string | null;
  district: DistrictInfo | null;
  eventsFired: Record<string, boolean>;
  /** Optional side-paths the world is dangling — see engine/hooks.ts.
   *  A registry, not one feature: members, statutes, rivals and the machine all
   *  offer into the same list. */
  hooks?: import('./hooks.js').Hook[];
  /** memberId -> disposition, copied onto the run at applyLegacy so the floor
   *  count can read the room without threading LegacyState through it. */
  chamberRoster?: Record<string, number>;
  /** Statutes from earlier runs that are still on the books, copied onto the run
   *  at applyLegacy so the session can raise reauthorization fights over them
   *  without threading LegacyState through the stage machinery. */
  carriedLaws?: import('./laws.js').EnactedLaw[];
  /** What the world has made possible right now. See engine/docket.ts.
   *  Optional so every save written before it existed still loads. */
  docket?: PolicyOpening[];
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
  /** Banked press-your-luck stake — see engine/heat.ts. Earned by landing
   *  plays, wiped by failing one, worth nothing until deliberately spent. */
  heat?: number;
  /** Hand cuts taken this week — see engine/flow.ts. Reset at week start. */
  discardsUsed?: number;
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

/**
 * A thing the world has made possible, for a while.
 *
 * The screw worm crossed the river and the Ag committee lit up; a freeze took
 * the grid and everyone remembered where they were. Before this existed those
 * were flavour text that subtracted two points of something and vanished —
 * `eventsFired` was written once to stop the event repeating and read by no card
 * in the game. The world could speak and nothing could hear it.
 *
 * An opening is the hearing. It has a constituency who wants it, somebody who
 * will fight it, and a window that closes — because in Austin the difference
 * between a bill and a wish is whether you were ready the week the room cared.
 */
export interface PolicyOpening {
  id: string;
  n: string;
  /** What it is, in the voice of somebody who has been in the building. */
  d: string;
  issueId: string | null;
  openedWeek: number;
  /** The window shuts here. Sine die does not wait on you. */
  expiresWeek: number;
  /** Ground ids that want this passed. */
  constituency: string[];
  /** Who shows up to kill it. */
  opposition: string;
  /** Capital to convert this into a provision on your bill. */
  weight: number;
  /** Event or card that opened it. */
  source: string;
  takenWeek?: number;
}

/**
 * Language you actually put in the bill.
 *
 * Amendment is the central verb of legislating and this game did not have it:
 * the bill was `{ pipelineStage, heat }`, a progress bar with a name. A
 * provision is the trade — it buys votes from the people who wanted it and
 * costs you the people who didn't, and it is the only reason the tally was ever
 * worth printing.
 */
export interface Provision {
  id: string;
  n: string;
  d: string;
  /** The opening this language came from. */
  fromOpening: string;
  /** Members who come with it. */
  ayes: number;
  /** Members it costs you. */
  nays: number;
  /** What it draws from the building. */
  heat: number;
  /** Ground whose rapport it lifts, if any. */
  rewards?: string;
  /** Who it angers, by name. */
  angers?: string;
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
  /** Language attached to the bill. Optional so old saves load. */
  provisions?: Provision[];
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
  /** The people who take your call, across runs — see engine/machine.ts.
   *  Optional so every save written before it existed still loads. */
  machine?: import('./machine.js').MachineState;
  /** The named opposition, carried across runs — see engine/rival.ts.
   *  Optional so every save written before it existed still loads. */
  rival?: import('./rival.js').RivalState;
  /** How every named member feels about you — see engine/chamber.ts.
   *  Optional so every save written before it existed still loads. */
  chamber?: Record<string, import('./chamber.js').MemberStanding>;
  /** Statutes you have passed, across every run — see engine/laws.ts.
   *  Optional so every save written before it existed still loads. */
  laws?: import('./laws.js').EnactedLaw[];
  /** Stable id for THIS career, minted once. Head-to-head needs two distinct
   *  players, and two people both running the Teacher would otherwise export
   *  the same id and fail to pair. See engine/legacy.ts playerId(). */
  playerId?: string;
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
