/**
 * Play surface: draft, playables, ground picker — leaf (no session/main).
 * Orchestrator passes Campaign + commit callback.
 */

import {
  listPlayableHand,
  pickPhaseDraft,
  campIndexToCardId,
  snapshot,
  type Campaign
} from '../engine/loop.js';
import { isPhaseLegal, isVisible, canAfford } from '../engine/play.js';
import type { Ground, PlayCard } from '../engine/types.js';
import { cardHtml, cardInner, cardClasses } from './card-face.js';
import { ACT_SHELLS, actFromStage } from './act-shell.js';

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el;
}

export type PlayCommit = (index: number, ground?: Ground) => void;
export type AfterPaint = () => void;

let pendingGroundIndex: number | null = null;
let commitHook: PlayCommit | null = null;
let afterPaintHook: AfterPaint | null = null;

/** Wire commit + repaint hooks (called once from session/paint orchestrator). */
export function setPlayHooks(commit: PlayCommit, afterPaint: AfterPaint): void {
  commitHook = commit;
  afterPaintHook = afterPaint;
}

function lockReason(campaign: Campaign, card: PlayCard): string {
  const state = campaign.state;
  if (!isPhaseLegal(state, card)) return `Phase ${card.ph.join('/')} only`;
  if (!canAfford(state, card)) {
    const c = card.cost;
    if ((c.a ?? 0) > state.ap && !(card.field && state.fieldAp > 0)) return 'No AP left';
    const spend = snapshot(state).availableCash;
    if ((c.$ ?? 0) > spend) {
      return (state.debt || 0) > 0 && spend < state.money
        ? 'Cash reserved for the note'
        : 'Not enough money';
    }
    if ((c.vp ?? 0) > state.volPool) return 'Not enough volunteers';
    if ((c.m ?? 0) > state.momentum) return 'Not enough momentum';
    if ((c.fav ?? 0) > state.favors) return 'No favors owed';
    return "Can't afford";
  }
  return 'Unavailable';
}

export function cardForIndex(campaign: Campaign, index: number): PlayCard | undefined {
  const campId = campIndexToCardId(campaign, index);
  if (campId) return campaign.catalog.get(campId);
  const id = campaign.deck.hand[index];
  return id ? campaign.catalog.get(id) : undefined;
}

export function renderDraft(campaign: Campaign): void {
  const box = $('draft');
  if (!campaign.state.pendingDraft?.options.length) {
    box.innerHTML = '';
    return;
  }
  const draft = campaign.state.pendingDraft;
  box.innerHTML =
    `<p class="hint">Phase ${draft.phase} draft — pick one for your pool</p>` +
    draft.options
      .map((id, i) => {
        const card = campaign.catalog.get(id);
        if (!card) return '';
        return `
        <button type="button" class="${cardClasses(card)} draft-card" data-draft="${i}">
          ${cardInner(campaign.state, card)}
        </button>`;
      })
      .join('');
  box.querySelectorAll<HTMLButtonElement>('[data-draft]').forEach(btn => {
    btn.addEventListener('click', () => {
      pickPhaseDraft(campaign, Number(btn.dataset.draft));
      afterPaintHook?.();
    });
  });
}

export function renderPlayables(campaign: Campaign): void {
  const grid = $('playables');
  if (campaign.state.pendingDraft?.options.length) {
    grid.innerHTML = `<p class="hint">Resolve the phase draft first.</p>`;
    return;
  }
  if (campaign.state.over) {
    grid.innerHTML = `<p class="hint">Run over (${campaign.state.outcome}). Start a new run.</p>`;
    return;
  }

  const state = campaign.state;
  const playable = listPlayableHand(campaign);
  const playableIdx = new Set(playable.map(p => p.index));
  const apExhausted = state.ap <= 0 && state.fieldAp <= 0;

  const handCards = campaign.deck.hand
    .map((id, index) => ({ index, card: campaign.catalog.get(id) }))
    .filter((e): e is { index: number; card: PlayCard } => !!e.card && isVisible(state, e.card));

  if (state.stage === 'session') {
    const sessionCards = playable;
    const kit = ACT_SHELLS.session.kitLabel;
    const hintLine = apExhausted
      ? `<p class="hint">Out of actions — end the legislative week (or play free motions if any).</p>`
      : !sessionCards.length
        ? `<p class="hint">Nothing legal this week — end week (pipeline already used, or wait for calendar).</p>`
        : `<p class="hint session-hint kit-label">${kit} · one pipeline motion per week</p>`;
    grid.innerHTML =
      hintLine +
      sessionCards
        .map(({ index, card }) => {
          const free = (card.cost.a ?? 0) === 0;
          const locked = !free && apExhausted;
          return cardHtml(state, card, index, {
            camp: true,
            locked,
            lockReason: locked ? 'No AP left' : undefined
          });
        })
        .join('');
    grid.querySelectorAll<HTMLButtonElement>('.play-card:not(.locked)').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        if (Number.isNaN(idx)) return;
        commitHook?.(idx);
      });
    });
    return;
  }

  if (state.stage === 'waiting') {
    const kit = ACT_SHELLS.waiting.kitLabel;
    const hintLine = apExhausted
      ? `<p class="hint">Out of actions — end the interim week.</p>`
      : !playable.length
        ? `<p class="hint">Nothing legal — end week.</p>`
        : `<p class="hint kit-label">${kit} · path: ${state.waitingPathId ?? '—'}</p>`;
    grid.innerHTML =
      hintLine +
      playable
        .map(({ index, card }) => {
          const locked = apExhausted && (card.cost.a ?? 0) > 0;
          return cardHtml(state, card, index, {
            camp: true,
            locked,
            lockReason: locked ? 'No AP left' : undefined
          });
        })
        .join('');
    grid.querySelectorAll<HTMLButtonElement>('.play-card:not(.locked)').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        if (Number.isNaN(idx)) return;
        commitHook?.(idx);
      });
    });
    return;
  }

  const campCards = playable.filter(p => p.index < 0 && !p.card.id.startsWith('BUY'));
  const shopCards = playable.filter(p => p.card.id.startsWith('BUY'));
  const act = ACT_SHELLS[actFromStage(state.stage)];

  const hintLine = apExhausted
    ? `<p class="hint">Out of actions — shop buys (0 AP) still work, or end the week.</p>`
    : !playable.length && !handCards.length
      ? `<p class="hint">Nothing playable. End week.</p>`
      : `<p class="hint kit-label">${act.kitLabel}</p>`;

  grid.innerHTML =
    hintLine +
    handCards
      .map(({ index, card }) => {
        const locked = apExhausted || !playableIdx.has(index);
        return cardHtml(state, card, index, {
          locked,
          lockReason: locked
            ? apExhausted
              ? 'No AP left'
              : lockReason(campaign, card)
            : undefined
        });
      })
      .join('') +
    campCards.map(({ index, card }) => cardHtml(state, card, index, { camp: true })).join('') +
    (shopCards.length
      ? `<p class="hint shop-hint">Campaign shop — 0 AP · money or volunteers · Main unlocks</p>` +
        shopCards
          .map(({ index, card }) => {
            const locked = !playableIdx.has(index);
            return cardHtml(state, card, index, {
              shop: true,
              locked,
              lockReason: locked ? lockReason(campaign, card) : undefined
            });
          })
          .join('')
      : '');
  grid.querySelectorAll<HTMLButtonElement>('.play-card:not(.locked)').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = Number(btn.dataset.idx);
      const card = cardForIndex(campaign, index);
      if (card?.field) {
        openGroundPicker(campaign, index, card);
      } else {
        commitHook?.(index);
      }
    });
  });
}

export function openGroundPicker(campaign: Campaign, index: number, card: PlayCard): void {
  pendingGroundIndex = index;
  $('gp-title').textContent = `${card.n} — where do you work it?`;
  renderGroundPicker(campaign);
  $('ground-picker').classList.remove('hidden');
}

export function closeGroundPicker(): void {
  pendingGroundIndex = null;
  $('ground-picker').classList.add('hidden');
}

export function renderGroundPicker(campaign: Campaign): void {
  const s = campaign.state;
  const last = s.lastGround;
  $('gp-list').innerHTML = s.groundsArr
    .map(g => {
      const rap = Math.round(g.rapport || 0);
      const rival = Math.round(g.rivalRap || 0);
      const workedThisWeek = (s.groundPlays?.[g.id] ?? 0) > 0;
      return `
        <button type="button" class="gp-ground${g.id === last ? ' gp-last' : ''}" data-ground="${g.id}">
          <span class="gp-name">${g.n}${g.id === last ? ' <span class="gp-tag">last</span>' : ''}</span>
          <span class="gp-meters">
            <span class="gp-meter" title="Your rapport">
              <span class="gp-mlabel">you</span>
              <span class="gp-bar"><i class="gp-you" style="width:${Math.min(100, rap)}%"></i></span>
              <span class="gp-num">${rap}</span>
            </span>
            <span class="gp-meter" title="Opposition presence (does not affect odds yet)">
              <span class="gp-mlabel">opp</span>
              <span class="gp-bar"><i class="gp-opp" style="width:${Math.min(100, rival)}%"></i></span>
              <span class="gp-num">${rival}</span>
            </span>
          </span>
          <span class="gp-foot">
            <span>pool ${g.pool}</span>
            ${workedThisWeek ? '<span class="gp-worked">worked · ½ rapport</span>' : ''}
          </span>
        </button>`;
    })
    .join('');
  $('gp-list')
    .querySelectorAll<HTMLButtonElement>('.gp-ground')
    .forEach(btn => {
      btn.addEventListener('click', () => {
        if (pendingGroundIndex === null) return;
        const ground = campaign.state.groundsArr.find(g => g.id === btn.dataset.ground);
        const index = pendingGroundIndex;
        closeGroundPicker();
        commitHook?.(index, ground);
      });
    });
}
