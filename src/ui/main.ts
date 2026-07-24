/**
 * CANDIDATE ZERO — boot / DOM wire only.
 * Mutable campaign lives in session.ts; paint leaves are pure modules.
 * Nameplate is a 3-step card draft; identity locks on Chronicle.
 */

import { emblem } from './card-art.js';
import { wireTabs } from './tabs.js';
import { showTitle, showTutorial, backFromTutorial } from './screens.js';
import {
  startRun,
  requestNewRun,
  endWeek,
  closeGroundPicker,
  openSetupWithChronicle,
  tryBeginClimb
} from './session.js';
import { closeCardDetail } from './paint-play.js';
import { emptyDraft, renderNameplateDraft, type NameplateDraftState } from './nameplate-draft.js';
import './styles.css';

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el;
}

let draft: NameplateDraftState = emptyDraft();

function paintDraft(): void {
  renderNameplateDraft(
    draft,
    next => {
      draft = next;
      paintDraft();
    },
    (setup, seed) => startRun(setup, seed, true)
  );
}

function boot(): void {
  wireTabs();
  $('title-emblem').innerHTML = emblem('star');
  $('btn-title-start').addEventListener('click', () => {
    if (!tryBeginClimb()) {
      draft = emptyDraft();
      openSetupWithChronicle();
      paintDraft();
    }
  });
  $('btn-title-howto').addEventListener('click', () => showTutorial());
  $('btn-howto').addEventListener('click', () => showTutorial());
  const setupHowto = document.getElementById('btn-setup-howto');
  if (setupHowto) setupHowto.addEventListener('click', () => showTutorial());
  $('btn-tut-back').addEventListener('click', () => backFromTutorial());
  $('btn-new').addEventListener('click', () => requestNewRun());
  $('btn-end').addEventListener('click', () => endWeek());
  $('gp-cancel').addEventListener('click', () => closeGroundPicker());
  const detailClose = document.getElementById('detail-close');
  if (detailClose) detailClose.addEventListener('click', () => closeCardDetail());
  const cardDetail = document.getElementById('card-detail');
  if (cardDetail) {
    cardDetail.addEventListener('click', e => {
      if (e.target === cardDetail) closeCardDetail();
    });
  }
  showTitle();
}

boot();
