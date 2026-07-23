/**
 * Play surface: draft, sectioned playables, ground picker, card detail sheet.
 * First tap opens detail (full card.d + odds); PLAY commits (or opens ground picker).
 */

import {
  listPlayableHand,
  pickPhaseDraft,
  campIndexToCardId,
  snapshot,
  type Campaign
} from '../engine/loop.js';
import { isPhaseLegal, isVisible, canAfford, cardAttrMod } from '../engine/play.js';
import { getGroundPenalty, rivalOddsPenalty } from '../engine/calendar.js';
import type { GameState, Ground, PlayCard } from '../engine/types.js';
import {
  cardHtml,
  cardInner,
  cardClasses,
  costParts,
  computeCardFaceView,
  attrEscape
} from './card-face.js';
import { ACT_SHELLS, actFromStage } from './act-shell.js';

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el;
}

export type PlayCommit = (index: number, ground?: Ground) => void;
export type AfterPaint = () => void;

let pendingGroundIndex: number | null = null;
let pendingGroundCard: PlayCard | null = null;

/**
 * Effective success odds for the pending field card on a specific ground —
 * the SAME formula executePlay resolves with (base card odds + attr synergy +
 * repeat-ground familiarity bonus − rival opposition penalty). So the number
 * on the button is exactly what the roll will use. This is the ground/odds
 * literacy fix: the player can see opposition presence actually cost them.
 */
function groundOdds(s: GameState, card: PlayCard, g: Ground): number {
  const base = card.odds ? card.odds(s, g) : 0.5;
  const attr = cardAttrMod(s, card);
  const prior = s.groundPlays?.[g.id] ?? 0;
  const bonus = card.field && prior > 0 ? getGroundPenalty(s, g, prior).oddsBonus : 0;
  const rivalPen = card.field ? rivalOddsPenalty(g) : 0;
  return Math.max(0.02, Math.min(0.95, base + attr + bonus - rivalPen));
}
let detailIndex: number | null = null;
let detailCampaign: Campaign | null = null;
let commitHook: PlayCommit | null = null;
let afterPaintHook: AfterPaint | null = null;

/** Wire commit + repaint hooks (called once from session/paint orchestrator). */
export function setPlayHooks(commit: PlayCommit, afterPaint: AfterPaint): void {
  commitHook = commit;
  afterPaintHook = afterPaint;
}

/** Session pipeline motions (bill advance) — SS01–SS07 + PAC claim. */
const SESSION_PIPELINE_IDS = new Set([
  'SS01',
  'SS02',
  'SS03',
  'SS04',
  'SS05',
  'SS06',
  'SS07',
  'SS_PAC'
]);

/** Ballot doors — always surface in Camp section (even when drawn into hand). */
const BALLOT_DOOR_IDS = new Set(['PL04', 'PL05']);

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

function sectionHtml(
  sectionId: string,
  label: string,
  cardsHtml: string,
  sub?: string
): string {
  if (!cardsHtml) return '';
  const subBit = sub ? `<p class="play-section-sub">${sub}</p>` : '';
  return `
    <section class="play-section" data-section="${sectionId}">
      <h3 class="play-section-label">${label}</h3>
      ${subBit}
      <div class="play-section-cards">${cardsHtml}</div>
    </section>`;
}

/**
 * Tap any face (including locked) → detail sheet.
 * PLAY in the sheet commits (or opens ground picker for field cards).
 */
function wirePlayCards(root: HTMLElement, campaign: Campaign, _fieldAware: boolean): void {
  root.querySelectorAll<HTMLButtonElement>('.play-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = Number(btn.dataset.idx);
      if (Number.isNaN(index)) return;
      openCardDetail(campaign, index);
    });
  });
}

export function closeCardDetail(): void {
  detailIndex = null;
  detailCampaign = null;
  const root = document.getElementById('card-detail');
  if (root) root.classList.add('hidden');
}

export function openCardDetail(campaign: Campaign, index: number): void {
  const card = cardForIndex(campaign, index);
  if (!card) return;
  detailIndex = index;
  detailCampaign = campaign;
  const state = campaign.state;
  const faceBtn = document.querySelector(
    `#playables .play-card[data-idx="${index}"]`
  ) as HTMLElement | null;
  const locked =
    !!faceBtn?.classList.contains('locked') || faceBtn?.getAttribute('data-locked') === '1';
  let whyLocked = '';
  const faceReason = faceBtn?.querySelector('.locked-reason');
  if (faceReason) whyLocked = faceReason.textContent || '';
  if (locked && !whyLocked) whyLocked = lockReason(campaign, card);

  const view = computeCardFaceView(state, card);
  const { seal, subs } = costParts(card);
  const costLabel = [seal, ...subs].filter(Boolean).join(' · ') || 'free';

  const root = $('card-detail');
  root.classList.remove('hidden');
  const title = root.querySelector('#detail-title');
  const tagline = root.querySelector('#detail-tagline');
  const desc = root.querySelector('#detail-desc');
  const stats = root.querySelector('#detail-stats');
  const playBtn = root.querySelector('#btn-play-detail') as HTMLButtonElement | null;

  if (title) title.textContent = card.n;
  if (tagline) tagline.textContent = card.tag || '';
  if (desc) desc.textContent = card.d || card.tag || 'No further detail on file.';
  if (stats) {
    const odds =
      view.oddsPct !== undefined
        ? `<span class="detail-stat"><strong>p≈${Math.round(view.oddsPct * 100)}%</strong> odds now</span>`
        : `<span class="detail-stat">No roll odds</span>`;
    const risk = `<span class="detail-risk risk-${card.risk.toLowerCase()}">${attrEscape(card.risk)}</span>`;
    const field = card.field
      ? `<span class="detail-stat">Field — pick a ground after Play</span>`
      : '';
    const lock = locked
      ? `<span class="detail-stat detail-locked">${attrEscape(whyLocked || 'Locked')}</span>`
      : '';
    stats.innerHTML = `${odds}${risk}<span class="detail-stat">Cost ${attrEscape(costLabel)}</span>${field}${lock}`;
  }
  if (playBtn) {
    playBtn.disabled = locked;
    playBtn.setAttribute('aria-disabled', locked ? 'true' : 'false');
    playBtn.textContent = locked
      ? whyLocked || 'Unavailable'
      : card.field
        ? `Play — choose ground · ${costLabel}`
        : `Play — ${costLabel}`;
    playBtn.onclick = () => {
      if (detailIndex === null || !detailCampaign || locked) return;
      const idx = detailIndex;
      const camp = detailCampaign;
      const c = cardForIndex(camp, idx);
      closeCardDetail();
      if (c?.field) {
        openGroundPicker(camp, idx, c);
      } else {
        commitHook?.(idx);
      }
    };
    try {
      playBtn.focus({ preventScroll: true });
    } catch {
      playBtn.focus();
    }
  }
}

export function renderDraft(campaign: Campaign): void {
  const box = $('draft');
  if (!campaign.state.pendingDraft?.options.length) {
    box.innerHTML = '';
    box.classList.remove('draft-active');
    return;
  }
  const draft = campaign.state.pendingDraft;
  box.classList.add('draft-active');
  box.innerHTML =
    `<p class="hint play-section-label draft-heading">Phase ${draft.phase} draft — pick one for your pool</p>` +
    `<div class="play-section-cards draft-cards">` +
    draft.options
      .map((id, i) => {
        const card = campaign.catalog.get(id);
        if (!card) return '';
        return `
        <button type="button" class="${cardClasses(card)} draft-card" data-draft="${i}">
          ${cardInner(campaign.state, card)}
        </button>`;
      })
      .join('') +
    `</div>`;
  box.querySelectorAll<HTMLButtonElement>('[data-draft]').forEach(btn => {
    btn.addEventListener('click', () => {
      pickPhaseDraft(campaign, Number(btn.dataset.draft));
      afterPaintHook?.();
    });
  });
  // PR-3 draft exclusive UX: scroll draft into view + focus first card
  requestAnimationFrame(() => {
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const first = box.querySelector<HTMLButtonElement>('.draft-card, [data-draft]');
    first?.focus({ preventScroll: true });
  });
}

export function renderPlayables(campaign: Campaign): void {
  const grid = $('playables');
  if (campaign.state.pendingDraft?.options.length) {
    // Exclusive: no camp/hand/shop flash under draft
    grid.innerHTML = `<p class="hint draft-block">Resolve the phase draft first.</p>`;
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

  if (state.stage === 'session') {
    renderSessionPlayables(campaign, grid, playable, apExhausted);
    return;
  }

  if (state.stage === 'waiting') {
    renderWaitingPlayables(campaign, grid, playable, apExhausted);
    return;
  }

  // Primary / general: Camp → Hand → Shop (K10 intentional reorder)
  const allHand = campaign.deck.hand
    .map((id, index) => ({ index, card: campaign.catalog.get(id) }))
    .filter((e): e is { index: number; card: PlayCard } => !!e.card && isVisible(state, e.card));

  // Synthetic camp (index < 0, not BUY): doors fallback + starmap verbs
  const campSynthetic = playable.filter(
    p => p.index < 0 && !p.card.id.startsWith('BUY')
  );
  // Ballot doors drawn into hand still belong in Camp (doors-first scan path)
  const doorsInHand = allHand.filter(({ card }) => BALLOT_DOOR_IDS.has(card.id));
  const handCards = allHand.filter(({ card }) => !BALLOT_DOOR_IDS.has(card.id));
  const shopCards = playable.filter(p => p.card.id.startsWith('BUY'));
  const act = ACT_SHELLS[actFromStage(state.stage)];

  // Dedupe camp by card id (prefer synthetic index when both would exist)
  const campSeen = new Set<string>();
  const campEntries: { index: number; card: PlayCard; fromHand: boolean }[] = [];
  for (const p of campSynthetic) {
    if (campSeen.has(p.card.id)) continue;
    campSeen.add(p.card.id);
    campEntries.push({ index: p.index, card: p.card, fromHand: false });
  }
  for (const p of doorsInHand) {
    if (campSeen.has(p.card.id)) continue;
    campSeen.add(p.card.id);
    campEntries.push({ index: p.index, card: p.card, fromHand: true });
  }

  const statusHint = apExhausted
    ? `<p class="hint">Out of actions — shop buys (0 AP) still work, or end the week.</p>`
    : !playable.length && !allHand.length
      ? `<p class="hint">Nothing playable. End week.</p>`
      : `<p class="hint kit-label">${act.kitLabel}</p>`;

  const campHtml = campEntries
    .map(({ index, card, fromHand }) => {
      if (!fromHand) {
        // Always-available camp/starmap — only listed when playable
        return cardHtml(state, card, index, { camp: true });
      }
      const locked = apExhausted || !playableIdx.has(index);
      return cardHtml(state, card, index, {
        camp: true,
        locked,
        lockReason: locked
          ? apExhausted
            ? 'No AP left'
            : lockReason(campaign, card)
          : undefined
      });
    })
    .join('');

  const handHtml = handCards
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
    .join('');

  // Shop stays visible at AP=0 (0-AP buys)
  const shopHtml = shopCards
    .map(({ index, card }) => {
      const locked = !playableIdx.has(index);
      return cardHtml(state, card, index, {
        shop: true,
        locked,
        lockReason: locked ? lockReason(campaign, card) : undefined
      });
    })
    .join('');

  const hasDoors = campEntries.some(e => BALLOT_DOOR_IDS.has(e.card.id));
  const campLabel = !state.ballot && hasDoors ? 'Ballot doors' : 'Camp actions';
  const campSub =
    !state.ballot && hasDoors
      ? 'Petition labor or filing fee — make the ballot'
      : campEntries.length
        ? 'Always-on camp / starmap verbs'
        : undefined;

  grid.innerHTML =
    statusHint +
    sectionHtml('camp', campLabel, campHtml, campSub) +
    sectionHtml('hand', 'Hand', handHtml, act.kitLabel) +
    sectionHtml(
      'shop',
      'Shop',
      shopHtml,
      '0 AP · money or volunteers · Main unlocks'
    );

  wirePlayCards(grid, campaign, true);
}

function renderSessionPlayables(
  campaign: Campaign,
  grid: HTMLElement,
  playable: { index: number; card: PlayCard }[],
  apExhausted: boolean
): void {
  const state = campaign.state;
  const kit = ACT_SHELLS.session.kitLabel;
  const pipeline = playable.filter(p => SESSION_PIPELINE_IDS.has(p.card.id));
  const chamber = playable.filter(p => !SESSION_PIPELINE_IDS.has(p.card.id));

  const cardBits = (entries: { index: number; card: PlayCard }[]) =>
    entries
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

  const statusHint = apExhausted
    ? `<p class="hint">Out of actions — end the legislative week (or play free motions if any).</p>`
    : !playable.length
      ? `<p class="hint">Nothing legal this week — end week (pipeline already used, or wait for calendar).</p>`
      : `<p class="hint session-hint kit-label">${kit} · one pipeline motion per week</p>`;

  // Prefer two sections when partition is non-empty; else single kit section
  let body = '';
  if (pipeline.length || chamber.length) {
    body =
      sectionHtml(
        'pipeline',
        'Bill pipeline',
        cardBits(pipeline),
        'One advance motion per week'
      ) +
      sectionHtml(
        'chamber',
        'Chamber · seat',
        cardBits(chamber),
        'Casework · errands · free motions'
      );
  } else {
    body = sectionHtml('session', 'Legislative motions', '', kit);
  }

  grid.innerHTML = statusHint + body;
  wirePlayCards(grid, campaign, false);
}

function renderWaitingPlayables(
  campaign: Campaign,
  grid: HTMLElement,
  playable: { index: number; card: PlayCard }[],
  apExhausted: boolean
): void {
  const state = campaign.state;
  const kit = ACT_SHELLS.waiting.kitLabel;
  const path = state.waitingPathId ?? 'orbit';
  const statusHint = apExhausted
    ? `<p class="hint">Out of actions — end the interim week.</p>`
    : !playable.length
      ? `<p class="hint">Nothing legal — end week.</p>`
      : `<p class="hint kit-label">${kit} · path: ${path}</p>`;

  const cardsHtml = playable
    .map(({ index, card }) => {
      const locked = apExhausted && (card.cost.a ?? 0) > 0;
      return cardHtml(state, card, index, {
        camp: true,
        locked,
        lockReason: locked ? 'No AP left' : undefined
      });
    })
    .join('');

  grid.innerHTML =
    statusHint +
    sectionHtml('orbit', 'Waiting orbit', cardsHtml, `Path: ${path} · WA kit · bank for next filing`);
  wirePlayCards(grid, campaign, false);
}

export function openGroundPicker(campaign: Campaign, index: number, card: PlayCard): void {
  pendingGroundIndex = index;
  pendingGroundCard = card;
  $('gp-title').textContent = `${card.n} — where do you work it?`;
  renderGroundPicker(campaign);
  $('ground-picker').classList.remove('hidden');
}

export function closeGroundPicker(): void {
  pendingGroundIndex = null;
  pendingGroundCard = null;
  $('ground-picker').classList.add('hidden');
}

export function renderGroundPicker(campaign: Campaign): void {
  const s = campaign.state;
  const last = s.lastGround;
  const card = pendingGroundCard;
  // Best available odds → highlight the smart pick.
  const bestPct = card
    ? Math.max(...s.groundsArr.map(g => Math.round(groundOdds(s, card, g) * 100)))
    : -1;
  // Plain-English rule, once, so opposition presence is legible (owner ask).
  const sub = $('gp-sub');
  if (sub) {
    sub.textContent =
      'Odds are for THIS play on each ground. Rivals working a ground drag your ' +
      'chances down there; fresh ground pays full rapport, a repeat this week is ' +
      'easier but banks half.';
  }
  $('gp-list').innerHTML = s.groundsArr
    .map(g => {
      const rap = Math.round(g.rapport || 0);
      const rival = Math.round(g.rivalRap || 0);
      const workedThisWeek = (s.groundPlays?.[g.id] ?? 0) > 0;
      const pct = card ? Math.round(groundOdds(s, card, g) * 100) : null;
      const rivalPen = card && card.field ? Math.round(rivalOddsPenalty(g) * 100) : 0;
      const oddsHtml =
        pct !== null
          ? `<span class="gp-odds${pct === bestPct ? ' gp-odds-best' : ''}" ` +
            `title="Effective odds for ${attrEscape(card!.n)} here${rivalPen > 0 ? ` — rivals cost you ~${rivalPen}%` : ''}">` +
            `p≈${pct}%${pct === bestPct ? ' · best' : ''}${rivalPen > 0 ? ` <span class="gp-pen">−${rivalPen}% rival</span>` : ''}</span>`
          : '';
      return `
        <button type="button" class="gp-ground${g.id === last ? ' gp-last' : ''}" data-ground="${g.id}">
          <span class="gp-name">${g.n}${g.id === last ? ' <span class="gp-tag">last</span>' : ''}</span>
          ${oddsHtml}
          <span class="gp-meters">
            <span class="gp-meter" title="Your rapport on this ground — banks when you work here">
              <span class="gp-mlabel">you</span>
              <span class="gp-bar"><i class="gp-you" style="width:${Math.min(100, rap)}%"></i></span>
              <span class="gp-num">${rap}</span>
            </span>
            <span class="gp-meter" title="Rival opposition — higher = lower field-play odds here">
              <span class="gp-mlabel">rival</span>
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
