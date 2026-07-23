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
  type InterimPath
} from '../engine/legacy.js';
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
  setPlayHooks
} from './paint-play.js';
import { renderLog, showJuice } from './paint-log.js';
import { openOutsideWeather } from './outside-ui.js';
import { renderTerminalOutcome, renderChronicle } from './terminal-ui.js';
import { showGame, showSetup, showTerminal } from './screens.js';

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

export function startRun(setup: SetupSelection, seed: number): void {
  campaign = createCampaign({ seed, setup });
  applyLegacy(campaign.state, legacy);
  weekPlays = [];
  startWeek(campaign);
  showGame();
  applyStageChrome();
  paint();
  openActSplash('primary');
}

export function requestNewRun(): void {
  if (campaign && !campaign.state.over) {
    const ok = window.confirm(
      'Start a new run? This abandons the current campaign — persona, ' +
        'district, and everything else were locked in at the start and ' +
        'cannot be changed on an in-progress run.'
    );
    if (!ok) return;
  }
  openSetupWithChronicle();
}

export function openSetupWithChronicle(): void {
  showSetup();
  renderChronicle(
    legacy,
    () => {
      legacy = { runs: [], traits: [], carry: {} };
      saveLegacy(legacy);
      return legacy;
    },
    l => {
      legacy = l;
    }
  );
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
    onRest: () => openSetupWithChronicle(),
    onPathSelected: () => {
      /* traits screen painted by terminal-ui */
    },
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
