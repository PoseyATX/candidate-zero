/**
 * Session orchestrator — single owner of mutable campaign / weekPlays / legacy.
 * Paint leaves receive Campaign + callbacks (K14: no leaf → session imports).
 */

import {
  createCampaign,
  createIncumbentCampaign,
  continueAfterWaiting,
  playFromHand,
  startWeek,
  endWeekInPlace,
  maybeOfferPhaseDraft,
  summarizeWeek,
  type Campaign
} from '../engine/loop.js';
import {
  loadLegacy,
  saveLegacy,
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
import { renderHud, renderLedger } from './paint-hud.js';
import {
  renderDraft,
  renderPlayables,
  closeGroundPicker,
  closeCardDetail,
  setPlayHooks
} from './paint-play.js';
import { renderLog, showJuice } from './paint-log.js';
import { openOutsideWeather } from './outside-ui.js';
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
  setPlayHooks(commitPlay, paint);
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

/** Weekly growth + each registered promo's own rarity roll (or force for proof). */
function afterWeekStart(c: Campaign, forceId?: string | null): void {
  maybeInjectPromoCards(c.state, c.deck, forceId ?? promoProofId());
}

export function paint(): void {
  ensurePlayHooks();
  if (!campaign) return;
  closeCardDetail();
  renderHud(campaign);
  renderLedger(campaign);
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

export function startRun(setup: SetupSelection, seed: number, lockIdentity = false): void {
  if (lockIdentity) {
    setIdentity(legacy, setup);
    saveLegacy(legacy);
  }
  campaign = createCampaign({ seed, setup });
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
  startWeek(campaign);
  afterWeekStart(campaign, promoProofId());
  showGame();
  applyStageChrome();
  paint();
  openActSplash('primary');
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
