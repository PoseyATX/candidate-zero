/**
 * Act ceremony shells + stage chrome — pure leaf (no main.ts imports).
 * openActSplash takes onDismiss so paint() stays in the orchestrator.
 * PR-1 behavior-identical extract.
 */

import type { GameState } from '../engine/types.js';
import { stageWeek } from '../engine/state.js';

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

export const ACT_SHELLS: Record<ActId, ActShellDef> = {
  primary: {
    id: 'primary',
    actNum: 'Act I',
    title: 'The Primary',
    bannerSub: 'Ballot · doors · force',
    splashBody:
      'Eight weeks. Make the ballot or the primary goes on without you. ' +
      'Petition labor or filing fee — pick a door. Field work needs a ground.',
    splashHint:
      'Main Deck campaign verbs. Shop is 0 AP. Once: Self-Fund · Once: PAC Check (Session will collect).',
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
      'You survived the primary. Same run — new clock. Six weeks to November. ' +
      'Primary rapport seeds GOTV on the grounds that know you. Block walks and phones now bank turnout, not just introductions. Kitchen-table club math is closed.',
    splashHint:
      'GOTV Weekend is in your hand. Field work converts to conversion %. Flatbed (A06) unlocks Rides to the Polls. November is arithmetic — contacts alone will not save you.',
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
      'The general is won. You are a member now — still THIS run, not a new campaign. ' +
      'Campaign cards leave the table. Legislative motions (Special kit) only.',
    splashHint:
      'File your bill. One pipeline motion per week. Casework keeps the seat. Clock ends at sine die — then reelection is a NEW cycle.',
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
      'The race ended. The climb did not. Four compressed weeks — one action each. ' +
      'What you bank rides into the next campaign. No true game over; only redirection.',
    splashHint: 'Special waiting verbs only (WA*). Path-scoped kit. Then setup for the next filing.',
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
 * Full-screen act handoff. onDismiss replaces paint() callback from main.
 */
export function openActSplash(
  actId: ActId,
  engineDetail?: string,
  onDismiss?: () => void
): void {
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
      onDismiss?.();
    };
  }
}

/** Persistent stage chrome: banner, tint, verbs, panel titles, masthead tag. */
export function applyStageChrome(state: GameState): void {
  const act = ACT_SHELLS[actFromStage(state.stage)];
  const game = document.getElementById('game');
  if (game) {
    game.classList.remove('stage-primary', 'stage-general', 'stage-session');
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
