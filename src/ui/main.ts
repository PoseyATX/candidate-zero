/**
 * CANDIDATE ZERO — boot / DOM wire only.
 * Mutable campaign lives in session.ts; paint leaves are pure modules.
 * Nameplate is a 3-step card draft; identity locks until refile / burn.
 * Card geometry: styles.css + card-lock.css (hard 2:3).
 */

import { emblem } from './card-art.js';
import { wireTabs } from './tabs.js';
import { renderVersion } from './version.js';
import { showTitle, showTutorial, backFromTutorial } from './screens.js';
import {
  startRun,
  requestNewRun,
  endWeek,
  closeGroundPicker,
  openSetupWithChronicle,
  tryBeginClimb,
  openRefile,
  paintTitleIdentity,
  exportMyProfile,
  importOpponent,
  setPlayerName,
  wireSmokeSeam
} from './session.js';
import { closeCardDetail } from './paint-play.js';
import { attrDetailHtml } from './paint-hud.js';
import { emptyDraft, renderNameplateDraft, type NameplateDraftState } from './nameplate-draft.js';
import './styles.css';
import './full-art.css';
import './card-lock.css';
import './nameplate.css';

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
    (setup, seed) => {
      startRun(setup, seed, true);
      paintTitleIdentity();
    }
  );
}

function openFirstFiling(): void {
  draft = emptyDraft();
  openSetupWithChronicle();
  paintDraft();
}

function boot(): void {
  renderVersion();
  wireTabs();
  $('title-emblem').innerHTML = emblem('star');
  $('btn-title-start').addEventListener('click', () => {
    if (!tryBeginClimb()) openFirstFiling();
    paintTitleIdentity();
  });
  const refile = document.getElementById('btn-title-refile');
  if (refile) {
    refile.addEventListener('click', () => {
      openRefile();
      draft = emptyDraft();
      paintDraft();
      paintTitleIdentity();
    });
  }
  $('btn-title-howto').addEventListener('click', () => showTutorial());
  $('btn-howto').addEventListener('click', () => showTutorial());
  const setupHowto = document.getElementById('btn-setup-howto');
  if (setupHowto) setupHowto.addEventListener('click', () => showTutorial());
  $('btn-tut-back').addEventListener('click', () => backFromTutorial());

  // Head-to-head exchange lives inside the dossier, which is rebuilt on every
  // paint — so it is delegated from the container rather than bound to buttons
  // that stop existing a moment later.
  document.getElementById('ledger')?.addEventListener('click', e => {
    const el = e.target as HTMLElement | null;

    // Attributes explain themselves on tap. The dossier showed "CHA 14" and
    // nothing anywhere said what 14 bought you.
    const chip = el?.closest('[data-attr]') as HTMLElement | null;
    if (chip) {
      const box = document.getElementById('attr-detail');
      if (box) {
        const key = chip.dataset.attr ?? '';
        const val = Number(chip.dataset.attrV ?? '10');
        const already = box.getAttribute('data-open') === key && !box.hidden;
        if (already) {
          box.hidden = true;
          box.removeAttribute('data-open');
        } else {
          box.innerHTML = attrDetailHtml(key, val);
          box.setAttribute('data-open', key);
          box.hidden = false;
        }
      }
      return;
    }

    // Show / hide the full deck.
    const deckBtn = el?.closest('[data-deck]') as HTMLElement | null;
    if (deckBtn) {
      const list = document.getElementById('deck-list');
      if (list) {
        const open = !list.hidden;
        list.hidden = open;
        deckBtn.setAttribute('aria-expanded', String(!open));
        deckBtn.textContent = open ? 'Show every card' : 'Hide deck';
      }
      return;
    }

    const btn = el?.closest('[data-h2h]') as HTMLElement | null;
    if (!btn) return;
    const box = document.getElementById('h2h-box') as HTMLTextAreaElement | null;
    const note = document.getElementById('h2h-note');
    if (!box || !note) return;
    if (btn.dataset.h2h === 'export') {
      const nameEl = document.getElementById('h2h-name') as HTMLInputElement | null;
      // Your opponent should face YOU, not "The Teacher".
      setPlayerName(nameEl?.value ?? '');
      box.value = exportMyProfile();
      box.select();
      // Clipboard is a convenience, never the mechanism — the text is in the
      // box either way, so a refused permission costs nothing.
      navigator.clipboard?.writeText(box.value).catch(() => {});
      note.textContent = 'Copied. Send that to your opponent.';
      return;
    }
    const raw = box.value.trim();
    if (!raw) {
      note.textContent = 'Paste their campaign into the box first.';
      return;
    }
    const r = importOpponent(raw);
    // importOpponent repaints, which rebuilds #ledger's innerHTML — so the
    // `note` captured above is now a detached node and writing to it shows
    // nothing. Re-query after the repaint.
    const after = document.getElementById('h2h-note');
    if (after) {
      after.textContent = r.ok
        ? `${r.who} is now your opposition.`
        : `Could not read that: ${r.reason}`;
    }
  });
  $('btn-new').addEventListener('click', () => {
    requestNewRun();
    paintTitleIdentity();
  });
  $('btn-end').addEventListener('click', () => endWeek());
  $('gp-cancel').addEventListener('click', () => closeGroundPicker());
  const detailClose = document.getElementById('detail-close');
  if (detailClose) detailClose.addEventListener('click', () => closeCardDetail());
  const detailBack = document.getElementById('btn-detail-back');
  if (detailBack) detailBack.addEventListener('click', () => closeCardDetail());
  const cardDetail = document.getElementById('card-detail');
  if (cardDetail) {
    cardDetail.addEventListener('click', e => {
      if (e.target === cardDetail) closeCardDetail();
    });
  }
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const sheet = document.getElementById('card-detail');
      if (sheet && !sheet.classList.contains('hidden')) {
        e.preventDefault();
        closeCardDetail();
      }
    }
  });
  window.addEventListener('cz-nameplate', () => {
    draft = emptyDraft();
    paintDraft();
  });
  wireSmokeSeam();
  showTitle();
  paintTitleIdentity();
}

boot();
