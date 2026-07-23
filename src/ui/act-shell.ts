/**
 * Act ceremony shells + stage chrome — pure leaf (no main.ts imports).
 * PR-5/6: short splash bodies (≤3 lines), focus recovery, weather-safe open.
 */

import type { GameState } from '../engine/types.js';
import { stageWeek } from '../engine/state.js';
import { recoverPlayFocus } from './tabs.js';

export type ActId = 'primary' | 'general' | 'session' | 'waiting';

export interface ActShellDef {
  id: ActId;
  actNum: string;
  title: string;
  bannerSub: string;
  splashBody: string;
  splashHint: string;
  cta: string;
  endWeekLabel: string;
  actionsTitle: string;
  logTitle: string;
  tag: string;
  kitLabel: string;
}

/** Splash bodies kept to ≤3 short lines (+ optional engine detail above). */
export const ACT_SHELLS: Record<ActId, ActShellDef> = {
  primary: {
    id: 'primary',
    actNum: 'Act I',
    title: 'The Primary',
    bannerSub: 'Ballot · doors · force',
    splashBody:
      'Eight weeks. Make the ballot or the primary goes on without you.\n' +
      'Petition labor or filing fee — pick a door.\n' +
      'Field work needs a ground.',
    splashHint: 'Shop is 0 AP. Watch the goal strip for ballot doors.',
    cta: 'File the papers',
    endWeekLabel: 'End campaign week',
    actionsTitle: 'Campaign hand',
    logTitle: 'Campaign log',
    tag: 'Primary',
    kitLabel: 'Campaign plays'
  },
  general: {
    id: 'general',
    actNum: 'Act II',
    title: 'The General',
    bannerSub: 'GOTV · turnout · November',
    splashBody:
      'Six weeks to November — same run, new clock.\n' +
      'Field banks GOTV on grounds that know you.\n' +
      'Kitchen-table club math is closed.',
    splashHint: 'GOTV Weekend · turnout is the lever. Goal strip tracks banked GOTV.',
    cta: 'Take the field',
    endWeekLabel: 'End general week',
    actionsTitle: 'General field',
    logTitle: 'Campaign log',
    tag: 'General',
    kitLabel: 'Turnout kit · GOTV is the lever'
  },
  session: {
    id: 'session',
    actNum: 'Act III',
    title: 'You are sworn in',
    bannerSub: 'Bill pipeline · sine die',
    splashBody:
      'Still this run — campaign cards leave the table.\n' +
      'Legislative motions only. One pipeline advance per week.\n' +
      'Casework holds the seat until sine die.',
    splashHint: 'Reelection after sine die is a NEW cycle. Goal strip tracks bill stage.',
    cta: 'Enter the chamber',
    endWeekLabel: 'End legislative week',
    actionsTitle: 'Legislative motions',
    logTitle: 'Chamber log',
    tag: 'Session',
    kitLabel: 'Session Special kit · not Main Deck'
  },
  waiting: {
    id: 'waiting',
    actNum: 'Act IV',
    title: 'The Waiting Season',
    bannerSub: 'Interim orbit · next filing',
    splashBody:
      'Four compressed weeks — one action each.\n' +
      'What you bank rides into the next filing.\n' +
      'No true game over; only redirection.',
    splashHint: 'WA* kit only. Then re-file as the same persona — not a blank setup.',
    cta: 'Begin the interim',
    endWeekLabel: 'End interim week',
    actionsTitle: 'Interim orbit',
    logTitle: 'Waiting log',
    tag: 'Waiting',
    kitLabel: 'Waiting Special kit · bank for next cycle'
  }
};

export function actFromStage(stage: string | undefined): ActId {
  if (stage === 'waiting') return 'waiting';
  if (stage === 'session') return 'session';
  if (stage === 'general') return 'general';
  return 'primary';
}

/**
 * Full-screen act handoff. Never stacks under open weather (PR-5 queue).
 * onDismiss runs after hide + play-tab focus recovery.
 */
export function openActSplash(
  actId: ActId,
  engineDetail?: string,
  onDismiss?: () => void
): void {
  const weather = document.getElementById('outside-weather');
  if (weather && !weather.classList.contains('hidden')) {
    // Ceremony queue: weather first — stash and show when weather clears.
    (weather as HTMLElement & { __pendingSplash?: () => void }).__pendingSplash = () =>
      openActSplash(actId, engineDetail, onDismiss);
    return;
  }

  const act = ACT_SHELLS[actId];
  let root = document.getElementById('act-splash');
  if (!root) {
    root = document.createElement('div');
    root.id = 'act-splash';
    root.className = 'act-splash';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.innerHTML = `
      <div class="act-splash-panel">
        <p class="eyebrow act-splash-num"></p>
        <h2 class="act-splash-title"></h2>
        <p class="act-splash-body"></p>
        <p class="hint act-splash-hint"></p>
        <button type="button" class="btn btn-gold" id="act-splash-ok">Continue</button>
      </div>`;
    document.getElementById('game')?.appendChild(root);
  }
  root.dataset.act = actId;
  root.className = `act-splash act-splash-${actId}`;
  const num = root.querySelector('.act-splash-num');
  const title = root.querySelector('.act-splash-title');
  const body = root.querySelector('.act-splash-body');
  const hint = root.querySelector('.act-splash-hint');
  const ok = root.querySelector('#act-splash-ok') as HTMLButtonElement | null;
  if (num) num.textContent = act.actNum;
  if (title) title.textContent = act.title;
  if (body) {
    body.textContent = engineDetail?.trim()
      ? `${engineDetail.trim()}\n\n${act.splashBody}`
      : act.splashBody;
  }
  if (hint) hint.textContent = act.splashHint;
  if (ok) ok.textContent = act.cta;
  root.classList.remove('hidden');
  if (ok) {
    ok.onclick = () => {
      root!.classList.add('hidden');
      recoverPlayFocus();
      onDismiss?.();
    };
    try {
      ok.focus({ preventScroll: true });
    } catch {
      ok.focus();
    }
  }
}

/** Persistent stage chrome: banner, tint, verbs, panel titles, masthead tag. */
export function applyStageChrome(state: GameState): void {
  const act = ACT_SHELLS[actFromStage(state.stage)];
  const game = document.getElementById('game');
  if (game) {
    game.classList.remove(
      'stage-primary',
      'stage-general',
      'stage-session',
      'stage-waiting'
    );
    game.classList.add(`stage-${act.id}`);
  }

  const endBtn = document.getElementById('btn-end');
  if (endBtn) endBtn.textContent = act.endWeekLabel;

  const actionsH = document.getElementById('actions-heading');
  if (actionsH) actionsH.textContent = act.actionsTitle;
  const logH = document.getElementById('log-heading');
  if (logH) logH.textContent = act.logTitle;

  const banner = document.getElementById('act-banner');
  if (banner) {
    banner.hidden = false;
    banner.dataset.act = act.id;
    banner.className = `act-banner act-banner-${act.id}`;
    const num = banner.querySelector('.act-banner-num');
    const title = banner.querySelector('.act-banner-title');
    const sub = banner.querySelector('.act-banner-sub');
    if (num) num.textContent = act.actNum;
    if (title) title.textContent = act.tag;
    if (sub) {
      const weekBit =
        state.stage === 'session'
          ? ` · W${state.week}/${state.weeksTotal} sine die`
          : ` · W${stageWeek(state)} · cal ${state.week}/${state.weeksTotal}`;
      sub.textContent = `${act.bannerSub}${weekBit}`;
    }
  }

  const h1 = document.querySelector('#topbar h1');
  if (h1) {
    document.querySelector('#topbar .stage-tag')?.remove();
    document.querySelector('#topbar .session-tag')?.remove();
    const tag = document.createElement('span');
    tag.className = `alpha-tag stage-tag stage-tag-${act.id}`;
    tag.textContent = act.tag;
    h1.appendChild(document.createTextNode(' '));
    h1.appendChild(tag);
  }
}
