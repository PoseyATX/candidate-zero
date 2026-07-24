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
import { kitIdsForSetup } from '../data/nameplate-kits.js';
import { enterWaiting, finishWaiting } from '../engine/waiting.js';
import type {
  CampaignOutcome,
  Ground,
  LegacyState,
  PlayOutcome,
  TraitId
} from '../engine/types.js';
import type { SetupSelection } from '../data/setup.js';
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

export function commitPlay(index: number, ground?: Ground): void {
  if (!campaign) return;
  const wasBallot = campaign.state.ballot;
  const outcome = playFromHand(campaign, index, ground);
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
 * @param lockIdentity — true when filing from the nameplate draft (first bind).
 * Re-files and incumbent paths pass false; identity already on Chronicle.
 */
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
      text: `Nameplate kit — issue/region cards enter the pile: ${kit.join(', ')}.`
    });
  }
  applyLegacy(campaign.state, legacy);
  weekPlays = [];
  startWeek(campaign);
  showGame();
  applyStageChrome();
  paint();
  openActSplash('primary');
}

/** Resume with filed identity — never opens the nameplate. */
export function tryBeginClimb(): boolean {
  legacy = loadLegacy();
  if (!legacy.identity) return false;
  const seed = Date.now() % 1_000_000;
  startRun(legacy.identity, seed, false);
  return true;
}

export function requestNewRun(): void {
  if (campaign && !campaign.state.over) {
    const ok = window.confirm(
      'Abandon this campaign week stack? Your filed identity stays on the Chronicle — you will not re-pick persona. Wipe the Chronicle to clear identity.'
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

/** Nameplate only when no identity is filed (or after Chronicle wipe). */
export function openSetupWithChronicle(): void {
  legacy = loadLegacy();
  if (legacy.identity) {
    showTitle();
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
      showGame();
      applyStageChrome();
      paint();
      openActSplash(
        'primary',
        'Incumbent cycle. You skip petition — but the primary still wants a fight. Session is behind you until you win November again.'
      );
    },
    onRest: () => {
      /* Identity stays filed — never re-open the 3-step draft. */
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
