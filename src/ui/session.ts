/**
 * Session orchestrator — single owner of mutable campaign / weekPlays / legacy.
 * Paint leaves receive Campaign + callbacks (K14: no leaf → session imports).
 */

import {
  createCampaign,
  createIncumbentCampaign,
  continueAfterWaiting,
  playFromHand,
  cycleFromHand,
  startWeek,
  endWeekInPlace,
  maybeOfferPhaseDraft,
  summarizeWeek,
  type Campaign
} from '../engine/loop.js';
import {
  loadLegacy,
  saveLegacy,
  playerId,
  applyLegacy,
  computeShare,
  recordRun,
  setInterimPath,
  addTrait,
  setIdentity,
  clearIdentity,
  type InterimPath
} from '../engine/legacy.js';
import { injectIntoDrawPile } from '../engine/deck.js';
import { maybeInjectPromoCards } from '../engine/promo.js';
import { enterSession } from '../engine/session.js';
import { kitIdsForSetup } from '../data/nameplate-kits.js';
import { enterWaiting, finishWaiting } from '../engine/waiting.js';
import type {
  CampaignOutcome,
  Ground,
  LegacyState,
  PlayOutcome,
  TraitId
} from '../engine/types.js';
import {
  PERSONAS,
  ISSUES,
  DISTRICTS,
  REGIONS,
  type SetupSelection
} from '../data/setup.js';
import { openActSplash as openActSplashShell, applyStageChrome as applyStageChromeShell } from './act-shell.js';
import { renderHud, renderLedger,
  resetHudMotion
} from './paint-hud.js';
import {
  renderDraft,
  renderPlayables,
  closeGroundPicker,
  closeCardDetail,
  setPlayHooks
} from './paint-play.js';
import { renderLog, showJuice } from './paint-log.js';
import { openOutsideWeather } from './outside-ui.js';
import {
  profileFromCampaign,
  applyRivalProfile,
  parseRivalProfile
} from '../engine/rival-profile.js';
import { renderTerminalOutcome, renderChronicle } from './terminal-ui.js';
import { showGame, showSetup, showTerminal, showTitle } from './screens.js';

export let campaign: Campaign | null = null;
export let weekPlays: PlayOutcome[] = [];
export let legacy: LegacyState = loadLegacy();
export let terminalKind: CampaignOutcome | null = null;
export let terminalShare = 0;

let hooksWired = false;

function ensurePlayHooks(): void {
  if (hooksWired) return;
  hooksWired = true;
  setPlayHooks(commitPlay, paint, commitCycle);
}

/** ?promo=<CARD_ID> forces that promo card in for QA/proof (any registered promo, not just PR01). */
function promoProofId(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    const q = new URLSearchParams(window.location.search);
    const id = q.get('promo');
    if (id) return id;
    // legacy proof flags kept for existing bookmarks/links
    if (q.get('pr01') === '1' || q.get('pretty') === '1') return 'PR01';
    return null;
  } catch {
    return null;
  }
}

/** ?jump=session — QA seam for Act III work. Never reachable in normal play. */
function jumpToSession(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('jump') === 'session';
  } catch {
    return false;
  }
}

/** Weekly growth + each registered promo's own rarity roll (or force for proof). */
function afterWeekStart(c: Campaign, forceId?: string | null): void {
  maybeInjectPromoCards(c.state, c.deck, forceId ?? promoProofId());
}

export function paint(): void {
  ensurePlayHooks();
  if (!campaign) return;
  closeCardDetail();
  renderHud(campaign);
  renderLedger(campaign, legacy);
  renderDraft(campaign);
  renderPlayables(campaign);
  renderLog(campaign);
}

export function openActSplash(
  actId: Parameters<typeof openActSplashShell>[0],
  engineDetail?: string
): void {
  openActSplashShell(actId, engineDetail, () => paint());
}

export function applyStageChrome(): void {
  if (!campaign) return;
  applyStageChromeShell(campaign.state);
}

/** Pitch a hand card for a fresh draw. See engine/flow.ts. */
export function commitCycle(index: number): void {
  if (!campaign) return;
  const r = cycleFromHand(campaign, index);
  if (!r.ok) {
    campaign.state.log.push({
      week: campaign.state.week,
      kind: 'note',
      text: r.reason ?? 'Cut refused'
    });
  }
  paint();
}

export function commitPlay(index: number, ground?: Ground, press?: boolean): void {
  if (!campaign) return;
  const wasBallot = campaign.state.ballot;
  const outcome = playFromHand(campaign, index, ground, { press });
  if (!outcome.ok) {
    campaign.state.log.push({
      week: campaign.state.week,
      kind: 'note',
      text: outcome.reason ?? 'Play failed'
    });
  } else {
    weekPlays.push(outcome);
    if (outcome.feedback) showJuice(outcome.feedback);
  }
  if (!wasBallot && campaign.state.ballot) {
    maybeOfferPhaseDraft(campaign, false);
  }
  paint();
}

/**
 * HEAD-TO-HEAD EXCHANGE — the smallest honest transport there is.
 *
 * There is no server, no matchmaking and no lobby (docs/DEFERRED.md C5), and
 * building one is not the next most useful thing. What WAS missing is that the
 * whole profile/match seam had no way to be reached from inside the game, so
 * the asymmetric-information view was rendering for a state the app could not
 * enter — untestable and unshippable.
 *
 * Two people passing a block of text is a real transport. It makes the seam
 * usable today, and when a network layer arrives it replaces these two
 * functions and nothing else.
 */

/**
 * Set the name your opponent sees. Persisted, so it survives the run.
 *
 * Without this the export sent "The Teacher" — your opponent faced a persona
 * rather than a person, which undercuts the whole point of head-to-head.
 */
export function setPlayerName(name: string): void {
  const clean = name.trim().slice(0, 32);
  if (clean) legacy.name = clean;
  else delete legacy.name;
  saveLegacy(legacy);
}

/** Your campaign as the opposition your opponent will face. Public facts only. */
export function exportMyProfile(): string {
  if (!campaign) return '';
  // A stable per-career id, not a persona name: two people both running the
  // Teacher must still be two different players.
  const who = {
    id: playerId(legacy),
    name: legacy.name || campaign.state.persona || 'Your campaign'
  };
  saveLegacy(legacy);
  const p = profileFromCampaign(campaign.state, who);
  return JSON.stringify(p, null, 2);
}

/**
 * Seat an opponent's published campaign.
 *
 * Everything arriving here goes through parseRivalProfile, which is the trust
 * boundary: strength is discarded and re-derived, facts are clamped, and the
 * profile is marked human whatever it claims about itself.
 */
export function importOpponent(json: string, asOfWeek = 0): { ok: boolean; who?: string; reason?: string } {
  if (!campaign) return { ok: false, reason: 'No campaign in progress.' };
  try {
    const p = parseRivalProfile(json);
    applyRivalProfile(campaign.state, p, asOfWeek || campaign.state.week);
    campaign.state.log.push({
      week: campaign.state.week,
      kind: 'note',
      text: `${p.name} is your opposition now — a real campaign, not the county machine.`
    });
    paint();
    return { ok: true, who: p.name };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'Unreadable.' };
  }
}

export function startRun(setup: SetupSelection, seed: number, lockIdentity = false): void {
  if (lockIdentity) {
    setIdentity(legacy, setup);
    saveLegacy(legacy);
  }
  campaign = createCampaign({ seed, setup });
  // Week 1 must not animate as though five AP had just drained from nothing.
  resetHudMotion();
  const kit = kitIdsForSetup(setup);
  if (kit.length) {
    injectIntoDrawPile(campaign.deck, campaign.state, kit);
    campaign.state.log.push({
      week: campaign.state.week,
      kind: 'note',
      text: `Opening kit enters the pile: ${kit.join(', ')}.`
    });
  }
  applyLegacy(campaign.state, legacy);
  weekPlays = [];
  if (jumpToSession()) {
    // QA seam, same family as ?promo= — see docs. Reaching Act III legitimately
    // takes a won primary and a won general, which made every session-stage
    // change cost a twenty-week playthrough to eyeball once. That is why the
    // Docket band and the session HUD went unverified for so long.
    enterSession(campaign.state);
    campaign.state.log.push({
      week: campaign.state.week,
      kind: 'note',
      text: 'QA: jumped straight to the session (?jump=session).'
    });
  }
  startWeek(campaign);
  afterWeekStart(campaign, promoProofId());
  showGame();
  applyStageChrome();
  paint();
  openActSplash(jumpToSession() ? 'session' : 'primary');
}

export function filedIdentityLabel(): string | null {
  legacy = loadLegacy();
  const id = legacy.identity;
  if (!id) return null;
  const p = PERSONAS.find(x => x.id === id.personaId)?.n.replace(/^The /, '') ?? id.personaId;
  const issue = ISSUES.find(x => x.id === id.issueId)?.n ?? id.issueId;
  const dist = DISTRICTS.find(x => x.id === id.districtId)?.n ?? id.districtId;
  const reg = REGIONS.find(x => x.id === id.regionId)?.n ?? id.regionId;
  return `${p} · ${issue} · ${dist} · ${reg}`;
}

export function hasFiledIdentity(): boolean {
  legacy = loadLegacy();
  return !!legacy.identity;
}

export function tryBeginClimb(): boolean {
  legacy = loadLegacy();
  if (!legacy.identity) return false;
  const seed = Date.now() % 1_000_000;
  startRun(legacy.identity, seed, false);
  return true;
}

export function openRefile(): void {
  if (campaign && !campaign.state.over) {
    const ok = window.confirm(
      'Leave this week and file as someone else? Your ballad stays; only who you are changes.'
    );
    if (!ok) return;
  }
  legacy = loadLegacy();
  clearIdentity(legacy);
  saveLegacy(legacy);
  campaign = null;
  weekPlays = [];
  openSetupWithChronicle();
}

export function requestNewRun(): void {
  if (campaign && !campaign.state.over) {
    const ok = window.confirm(
      'Leave this week? Your filed identity stays — you will not re-pick who you are. Use File as someone else on the title screen to change identity.'
    );
    if (!ok) return;
  }
  legacy = loadLegacy();
  if (legacy.identity) {
    const seed = Date.now() % 1_000_000;
    startRun(legacy.identity, seed, false);
    return;
  }
  openSetupWithChronicle();
}

export function openSetupWithChronicle(): void {
  legacy = loadLegacy();
  if (legacy.identity) {
    showTitle();
    paintTitleIdentity();
    return;
  }
  showSetup();
  renderChronicle(
    legacy,
    () => {
      legacy = { runs: [], traits: [], carry: {} };
      clearIdentity(legacy);
      saveLegacy(legacy);
      return legacy;
    },
    l => {
      legacy = l;
    }
  );
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cz-nameplate'));
  }
}

export function paintTitleIdentity(): void {
  const strip = document.getElementById('title-identity');
  const refile = document.getElementById('btn-title-refile') as HTMLButtonElement | null;
  const label = filedIdentityLabel();
  if (strip) {
    if (label) {
      strip.classList.remove('hidden');
      strip.innerHTML = `<span class="title-id-label">Filed as</span> <span class="title-id-who">${label}</span>`;
    } else {
      strip.classList.add('hidden');
      strip.innerHTML = '';
    }
  }
  if (refile) {
    refile.classList.toggle('hidden', !label);
  }
  const start = document.getElementById('btn-title-start');
  if (start) {
    start.textContent = label ? 'Continue the Climb' : 'Begin the Climb';
  }
}

export function enterTerminal(c: Campaign): void {
  const kind = (c.state.outcome ?? 'ongoing') as CampaignOutcome;
  terminalKind = kind;
  terminalShare = computeShare(c.state, kind);
  recordRun(legacy, c.state, kind, terminalShare);
  saveLegacy(legacy);
  showTerminal();
  if (terminalKind === null) return;
  renderTerminalOutcome({
    campaign: c,
    kind: terminalKind,
    share: terminalShare,
    legacy,
    onReelect: () => {
      if (!campaign) return;
      campaign = createIncumbentCampaign(campaign, legacy);
      weekPlays = [];
      startWeek(campaign);
      afterWeekStart(campaign);
      showGame();
      applyStageChrome();
      paint();
      openActSplash(
        'primary',
        'Incumbent cycle. You skip petition — but the primary still wants a fight. Session is behind you until you win November again.'
      );
    },
    onRest: () => {
      if (!tryBeginClimb()) openSetupWithChronicle();
    },
    onPathSelected: () => {},
    onTraitSelected: (path: InterimPath, traitId: TraitId) => {
      addTrait(legacy, traitId);
      setInterimPath(legacy, path.id, path.interim);
      saveLegacy(legacy);
      beginWaitingSeason(path.id);
    }
  });
}

function beginWaitingSeason(pathId: string): void {
  if (!campaign) {
    if (legacy.identity) {
      startRun(legacy.identity, Date.now() % 1_000_000, false);
      return;
    }
    openSetupWithChronicle();
    return;
  }
  const { text } = enterWaiting(campaign.state, pathId);
  weekPlays = [];
  showGame();
  applyStageChrome();
  paint();
  openActSplash('waiting', text);
}

export function endWeek(): void {
  if (!campaign || campaign.state.over) {
    paint();
    return;
  }
  if (campaign.state.pendingDraft?.options.length) {
    campaign.state.log.push({
      week: campaign.state.week,
      kind: 'note',
      text: 'Resolve the phase draft before ending the week.'
    });
    paint();
    return;
  }
  const summary = summarizeWeek(campaign, weekPlays);
  showJuice({
    stamp: summary.bestStamp ?? 'GAIN',
    beat:
      summary.bestStamp === 'DISASTER'
        ? 'crash'
        : summary.bestStamp === 'BREAKTHROUGH'
          ? 'spark'
          : 'hit',
    intensity: 0.7,
    margin: 0,
    // The week summary carries its own totals inside `juice`, so the per-play
    // delta strip stays empty here rather than repeating them.
    deltas: [],
    juice: summary.juice
  });
  weekPlays = [];
  const transition = endWeekInPlace(campaign);
  if (transition.kind === 'enter_general') {
    maybeOfferPhaseDraft(campaign, false);
  }
  if (transition.kind === 'waiting_complete') {
    const fin = finishWaiting(campaign.state, legacy);
    saveLegacy(legacy);
    campaign = continueAfterWaiting(campaign, legacy);
    weekPlays = [];
    startWeek(campaign);
    afterWeekStart(campaign);
    showGame();
    applyStageChrome();
    paint();
    campaign.state.log.push({ week: campaign.state.week, kind: 'note', text: fin.text });
    openActSplash('primary', fin.text);
    return;
  }
  if (campaign.state.over) {
    enterTerminal(campaign);
    return;
  }
  if (!campaign.state.pendingDraft) {
    startWeek(campaign);
    afterWeekStart(campaign);
  }
  applyStageChrome();
  paint();
  const afterWeather = (): void => {
    if (transition.kind === 'enter_general') {
      openActSplash('general', transition.text);
    } else if (transition.kind === 'enter_session') {
      openActSplash('session', transition.text);
    }
  };
  if (campaign.state.pendingOutside) {
    const notice = campaign.state.pendingOutside;
    openOutsideWeather(
      notice,
      () => {
        if (campaign) campaign.state.pendingOutside = null;
      },
      afterWeather
    );
  } else {
    afterWeather();
  }
}

export { closeGroundPicker };
