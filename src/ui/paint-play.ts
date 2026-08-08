/**
 * Play surface: draft, sectioned playables, ground picker, card detail sheet.
 * First tap opens detail (full card.d + odds); PLAY / ADD TO POOL commits.
 */

import {
  listPlayableHand,
  pickPhaseDraft,
  campIndexToCardId,
  cycleReason,
  cycleCautionReason,
  snapshot,
  type Campaign
} from '../engine/loop.js';
import {
  isPhaseLegal,
  isVisible,
  canAfford,
  cardAttrMod,
  isGroundLocked,
  groundLockReason
} from '../engine/play.js';
import { getGroundPenalty, rivalOddsPenalty } from '../engine/calendar.js';
import type { GameState, Ground, PlayCard } from '../engine/types.js';
import {
  cardHtml,
  cardInner,
  cardClasses,
  computeCardFaceView,
  artPlateHtml,
  attrEscape,
  isFullBleedArt
} from './card-face.js';
import { emblemFor, KIND_META } from './card-art.js';
import { ACT_SHELLS, actFromStage } from './act-shell.js';
import type { AttrId, RiskClass } from '../engine/types.js';
import { GROUND_NEIGHBORS } from '../engine/state.js';
import {
  parseUpgradeOption,
  upgradeLabel,
  upgradeShortLabel,
  isUpgraded
} from '../engine/upgrades.js';
import { quotePress, pressLabel } from '../engine/heat.js';
import { discardsLeft } from '../engine/flow.js';

/** Full attribute names — never dump CLO/CON on a roomy brief. */
const ATTR_NAMES: Record<AttrId, string> = {
  CLO: 'Close',
  CON: 'Conviction',
  CRA: 'Craft',
  INK: 'Ink',
  DIP: 'Diplomacy',
  CHA: 'Charm'
};

function costInEnglish(card: PlayCard): string {
  const c = card.cost;
  const parts: string[] = [];
  if (c.a) {
    const ap = c.a === 1 ? '1 action point' : `${c.a} action points`;
    // Field work draws on the turf budget before campaign AP. Without saying so,
    // a 3-AP field play appears to cost 1 because the rest left the turf pool.
    parts.push(card.field ? `${ap} — turf budget first, then campaign AP` : ap);
  }
  if (c.$) parts.push(`$${c.$}`);
  if (c.vp) parts.push(c.vp === 1 ? '1 volunteer' : `${c.vp} volunteers`);
  if (c.m) parts.push(c.m === 1 ? '1 momentum' : `${c.m} momentum`);
  if (c.fav) parts.push(c.fav === 1 ? '1 favor' : `${c.fav} favors`);
  if (!parts.length) return 'Free — no spend to play';
  if (parts.length === 1) return parts[0]!;
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

function riskCopy(risk: RiskClass): { title: string; body: string } {
  switch (risk) {
    case 'SAFE':
      return {
        title: 'Safe',
        body: 'The floor holds. This never rolls into a disaster.'
      };
    case 'STD':
      return {
        title: 'Standard risk',
        body: 'Honest variance — good days and bad days, nothing exotic.'
      };
    case 'VOL':
      return {
        title: 'Volatile',
        body: 'Swings both ways. Breakthroughs and disasters are both in play.'
      };
    case 'CHOICE':
      return {
        title: 'A choice',
        body: 'The card opens a fork — you pick the path, not the dice alone.'
      };
    default:
      return { title: risk, body: '' };
  }
}

function oddsCopy(pct: number | undefined): { headline: string; body: string } | null {
  if (pct === undefined) return null;
  const n = Math.round(pct * 100);
  let feel: string;
  if (n >= 75) feel = 'The room is with you.';
  else if (n >= 55) feel = 'A fair fight — better than a coin flip.';
  else if (n >= 40) feel = 'Uphill. Still worth the walk if you need it.';
  else feel = 'Long odds. You are asking the county for a miracle.';
  return {
    headline: `About ${n} percent chance this succeeds right now`,
    body: `${feel} That figure already includes your attributes, how many times you have worked this ground, and rival presence.`
  };
}

function factRow(label: string, valueHtml: string, extraClass = ''): string {
  return `
    <div class="dossier-fact ${extraClass}">
      <dt>${attrEscape(label)}</dt>
      <dd>${valueHtml}</dd>
    </div>`;
}

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el;
}

export type PlayCommit = (
  index: number,
  ground?: Ground,
  press?: boolean,
  /** Which arm of a forked CHOICE card the player took. See engine/play.ts. */
  branch?: string
) => void;
export type CycleCommit = (index: number) => void;
export type AfterPaint = () => void;

let pendingGroundIndex: number | null = null;
let pendingGroundCard: PlayCard | null = null;
/** The press wager armed in the dossier, held across the ground picker so a
 *  field play does not silently drop it between "Play" and "choose a ground". */
let pendingGroundPress = false;
/** Fork armed in the dossier, carried across the ground picker. */
let pendingGroundBranch: string | undefined;

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
/** Which arm of a forked CHOICE card is selected in the open dossier. */
let detailBranch: string | null = null;
/** When set, the detail sheet is a phase-draft pick (not a hand play). */
let detailDraftOption: number | null = null;
/** Whether the open dossier has the press wager armed. Reset on every open. */
let detailPress = false;
let commitHook: PlayCommit | null = null;
let cycleHook: CycleCommit | null = null;
let afterPaintHook: AfterPaint | null = null;

export function setPlayHooks(
  commit: PlayCommit,
  afterPaint: AfterPaint,
  cycle?: CycleCommit
): void {
  commitHook = commit;
  afterPaintHook = afterPaint;
  cycleHook = cycle ?? null;
}

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

const BALLOT_DOOR_IDS = new Set(['PL04', 'PL05']);

/**
 * Whether the dossier offers the press wager on this card.
 *
 * Extracted from an inline expression because that is precisely why DEFERRED A7
 * sat open: the rule lived inside a DOM-painting function, so the only way to
 * check it was to read it — which is what I did, before writing "honest gap"
 * and moving on. As a pure function it can simply be asserted.
 *
 * The load-bearing clause is `locked`. A locked card renders with a disabled
 * Play button, and offering a live press control next to a button you cannot
 * use invites the player to arm a wager on a play that will never resolve.
 * `harness:heat` asserts the table; `smoke:ui` proves this predicate is the one
 * actually wired to the button, so neither can pass while the other rots.
 */
export function pressOffered(opts: {
  locked: boolean;
  isDraftOption: boolean;
  hasOdds: boolean;
  heat: number;
}): boolean {
  if (opts.locked) return false;
  if (opts.isDraftOption) return false;
  if (!opts.hasOdds) return false;
  return opts.heat > 0;
}

function lockReason(campaign: Campaign, card: PlayCard): string {
  const state = campaign.state;
  if (!isPhaseLegal(state, card)) return `Phase ${card.ph.join('/')} only`;
  if (!canAfford(state, card)) {
    const c = card.cost;
    // Must mirror canAfford: field cards spend turf AP first, then campaign AP,
    // so the real budget is ap + (field ? fieldAp : 0). The pre-split rule here
    // could report the wrong reason on a partly-affordable field play.
    const turf = card.field ? Math.max(0, state.fieldAp) : 0;
    if ((c.a ?? 0) > state.ap + turf) {
      return card.field && turf > 0 ? 'Not enough AP or turf' : 'No AP left';
    }
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
  detailDraftOption = null;
  detailPress = false;
  const root = document.getElementById('card-detail');
  if (root) root.classList.add('hidden');
  document.body.classList.remove('dossier-open');
}

function fillDossier(
  campaign: Campaign,
  card: PlayCard,
  opts: {
    locked?: boolean;
    whyLocked?: string;
    eyebrow: string;
    confirmLabel: string;
    /** Set when this dossier is an offer to sharpen a card already owned,
     *  rather than to add a new one. Changes the headline copy only. */
    upgradeOffer?: boolean;
    onConfirm: () => void;
  }
): void {
  const state = campaign.state;
  const view = computeCardFaceView(state, card);
  const costWords = costInEnglish(card);
  const risk = riskCopy(card.risk);
  const odds = oddsCopy(view.oddsPct);
  const kindId = card.kind ?? 'action';
  const kindMeta = KIND_META[kindId] ?? KIND_META.action;
  const attrWords = (card.attrs ?? []).map(a => ATTR_NAMES[a] ?? a).join(', ');
  const locked = !!opts.locked;
  const whyLocked = opts.whyLocked || '';

  const root = $('card-detail');
  root.classList.remove('hidden');
  document.body.classList.add('dossier-open');

  const art = root.querySelector('#detail-art');
  const eyebrow = root.querySelector('#detail-eyebrow');
  const title = root.querySelector('#detail-title');
  const tagline = root.querySelector('#detail-tagline');
  const desc = root.querySelector('#detail-desc');
  const oddsEl = root.querySelector('#detail-odds') as HTMLElement | null;
  const stats = root.querySelector('#detail-stats');
  const lockEl = root.querySelector('#detail-lock') as HTMLElement | null;
  const playBtn = root.querySelector('#btn-play-detail') as HTMLButtonElement | null;
  const backBtn = root.querySelector('#btn-detail-back') as HTMLButtonElement | null;

  if (art) {
    const plate = artPlateHtml(card.id);
    if (isFullBleedArt(card)) {
      // The artwork is the whole card face and carries its own framing/title.
      // Show it at the card's own 2:3 portrait ratio — no parchment frame and
      // no emblem, both of which would crop and overpaint the art.
      art.innerHTML = `<span class="dossier-art-full">${plate}</span>`;
    } else {
      art.innerHTML =
        `<span class="dossier-art-frame risk-${card.risk.toLowerCase()}">` +
        `${plate}<span class="dossier-emblem">${emblemFor(card.id)}</span>` +
        `</span>`;
    }
  }
  if (eyebrow) eyebrow.textContent = opts.eyebrow;
  if (title) title.textContent = card.n;
  if (tagline) {
    tagline.textContent = card.tag ? `“${card.tag}”` : '';
    tagline.classList.toggle('hidden', !card.tag);
  }
  if (desc) {
    desc.textContent =
      card.d ||
      'No further detail is on file for this play. Trust the title and the cost.';
  }

  // The stated odds must move when the player arms a press, or the dossier
  // repeats the AP-counter lie: a number that does not respond to the thing the
  // player just did. `pressBonus` is 0 until the wager is armed.
  const paintOdds = (pressBonus: number): void => {
    if (!oddsEl || !odds || detailDraftOption !== null) return;
    const shown = Math.max(0.02, Math.min(0.95, (view.oddsPct ?? 0) + pressBonus));
    const copy = oddsCopy(shown) ?? odds;
    const note = pressBonus > 0
      ? `<p class="dossier-odds-press">Pressed — up from ${Math.round((view.oddsPct ?? 0) * 100)}%. A failure here wipes the streak either way.</p>`
      : '';
    oddsEl.innerHTML = `
      <p class="dossier-odds-num">${attrEscape(copy.headline)}</p>
      <p class="dossier-odds-body">${attrEscape(copy.body)}</p>
      ${note}
      <span class="dossier-odds-meter${pressBonus > 0 ? ' pressed' : ''}" aria-hidden="true">
        <i style="width:${Math.round(shown * 100)}%"></i>
      </span>`;
  };

  if (oddsEl) {
    if (odds && detailDraftOption === null) {
      oddsEl.hidden = false;
      paintOdds(0);
    } else if (detailDraftOption !== null) {
      oddsEl.hidden = false;
      oddsEl.innerHTML = opts.upgradeOffer
        ? `
        <p class="dossier-odds-num">${attrEscape(upgradeLabel(card))}</p>
        <p class="dossier-odds-body">You already run this card. Taking it here does not add a second copy — it improves the one you have, for the rest of the run.</p>`
        : `
        <p class="dossier-odds-num">Add this card to your pool</p>
        <p class="dossier-odds-body">It becomes part of your deck for the rest of this run. You pick one from this draft.</p>`;
    } else {
      oddsEl.hidden = true;
      oddsEl.innerHTML = '';
    }
  }

  if (stats) {
    const rows: string[] = [];
    rows.push(factRow('Cost to play', attrEscape(costWords)));
    rows.push(
      factRow(
        'Risk',
        `<strong class="dossier-risk risk-${card.risk.toLowerCase()}">${attrEscape(risk.title)}</strong>` +
          (risk.body ? `<span class="dossier-fact-note">${attrEscape(risk.body)}</span>` : '')
      )
    );
    if (kindMeta) {
      rows.push(
        factRow(
          'What it is',
          `<strong>${attrEscape(kindMeta.label)}</strong>` +
            (kindMeta.blurb
              ? `<span class="dossier-fact-note">${attrEscape(kindMeta.blurb)}</span>`
              : '')
        )
      );
    }
    if (attrWords) rows.push(factRow('Attributes that help', attrEscape(attrWords)));
    rows.push(
      factRow(
        'Where you play it',
        card.field
          ? 'In the field — after you commit, you choose the ground.'
          : 'From camp or hand — no ground picker.'
      )
    );
    if (card.ph?.length) {
      const phaseWords = card.ph
        .map(p => (p === 1 ? 'Primary' : p === 2 ? 'General' : p === 3 ? 'Session' : `Phase ${p}`))
        .join(', ');
      rows.push(factRow('Legal in', attrEscape(phaseWords)));
    }
    stats.innerHTML = rows.join('');
  }

  if (lockEl) {
    if (locked) {
      lockEl.hidden = false;
      lockEl.textContent = whyLocked
        ? `You cannot play this yet: ${whyLocked}.`
        : 'You cannot play this yet.';
    } else {
      lockEl.hidden = true;
      lockEl.textContent = '';
    }
  }

  // The fork. A CHOICE card with branches cannot be played until the player
  // says which way — engine/play.ts refuses it otherwise. Each arm names what
  // it costs and buys, so the decision is made with the facts on screen rather
  // than off state the player cannot see.
  const forkEl = root.querySelector('#detail-fork') as HTMLElement | null;
  detailBranch = null;
  if (forkEl) {
    const branches = card.branches ?? [];
    forkEl.hidden = branches.length === 0 || locked;
    forkEl.innerHTML = '';
    if (!forkEl.hidden) {
      for (const b of branches) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fork-option';
        btn.setAttribute('aria-pressed', 'false');
        btn.innerHTML =
          `<span class="fork-name">${attrEscape(b.n)}</span>` +
          `<span class="fork-what">${attrEscape(b.d)}</span>`;
        btn.onclick = () => {
          detailBranch = b.id;
          for (const other of Array.from(forkEl.querySelectorAll('.fork-option'))) {
            other.setAttribute('aria-pressed', 'false');
            other.classList.remove('on');
          }
          btn.setAttribute('aria-pressed', 'true');
          btn.classList.add('on');
          if (playBtn) {
            playBtn.disabled = false;
            playBtn.setAttribute('aria-disabled', 'false');
            playBtn.textContent = b.n;
          }
        };
        forkEl.appendChild(btn);
      }
    }
  }

  // Press: the one decision that happens *with* the dice rather than before
  // them. Only offered on a real, playable, odds-bearing play.
  const pressBtn = root.querySelector('#btn-press') as HTMLButtonElement | null;
  const pressCopy = root.querySelector('#press-copy') as HTMLElement | null;
  const quote = quotePress(state, card);
  const pressable = pressOffered({
    locked,
    isDraftOption: detailDraftOption !== null,
    hasOdds: !!card.odds,
    heat: quote.heat
  });
  detailPress = false;
  if (pressBtn) {
    pressBtn.hidden = !pressable;
    pressBtn.setAttribute('aria-pressed', 'false');
    pressBtn.classList.remove('on');
    if (pressable) {
      // The accessible name must not depend on the copy span having been
      // filled yet — an empty button is a critical axe failure, and the gate
      // caught exactly that.
      pressBtn.setAttribute('aria-label', `Press ${quote.heat}: ${pressLabel(quote)}`);
      if (pressCopy) pressCopy.textContent = `Press ${quote.heat} — ${pressLabel(quote)}`;
      pressBtn.onclick = () => {
        detailPress = !detailPress;
        pressBtn.setAttribute('aria-pressed', detailPress ? 'true' : 'false');
        pressBtn.classList.toggle('on', detailPress);
        if (pressCopy) {
          pressCopy.textContent = detailPress
            ? `Pressing ${quote.heat} — ${pressLabel(quote)}`
            : `Press ${quote.heat} — ${pressLabel(quote)}`;
        }
        paintOdds(detailPress ? quote.odds : 0);
      };
    }
  }

  // Cutting matters most on a card you *cannot* play, so this is offered even
  // when the dossier is locked — unlike Play, which is disabled there.
  const cutBtn = root.querySelector('#btn-cut-detail') as HTMLButtonElement | null;
  if (cutBtn) {
    const idx = detailIndex;
    const blocked = idx === null || detailDraftOption !== null
      ? 'unavailable'
      : cycleReason(campaign, idx);
    const caution = idx !== null && !blocked ? cycleCautionReason(campaign, idx) : '';
    const offerCut = detailDraftOption === null && idx !== null;
    cutBtn.hidden = !offerCut;
    if (offerCut) {
      const left = discardsLeft(state);
      cutBtn.disabled = !!blocked;
      cutBtn.setAttribute('aria-disabled', blocked ? 'true' : 'false');
      // A5: practised cuts stay legal; the button names the investment so it
      // is not silent. Full sentence lives in title for the long form.
      cutBtn.textContent = blocked
        ? blocked
        : caution
          ? `Cut practised — draw another (${left} left)`
          : `Cut it — draw another (${left} left)`;
      if (caution) cutBtn.title = caution;
      else cutBtn.removeAttribute('title');
      cutBtn.onclick = () => {
        if (blocked || idx === null) return;
        closeCardDetail();
        cycleHook?.(idx);
      };
    }
  }

  if (backBtn) backBtn.onclick = () => closeCardDetail();

  if (playBtn) {
    // A fork with nothing chosen is not playable yet, and says so rather than
    // silently doing one of the two things.
    const forkPending = !!card.branches?.length && detailBranch === null;
    playBtn.disabled = locked || forkPending;
    playBtn.setAttribute('aria-disabled', locked || forkPending ? 'true' : 'false');
    playBtn.textContent = locked
      ? whyLocked || 'Unavailable'
      : forkPending
        ? 'Choose which way first'
        : opts.confirmLabel;
    playBtn.onclick = () => {
      if (locked || (!!card.branches?.length && detailBranch === null)) return;
      opts.onConfirm();
    };
    try {
      (locked ? backBtn : playBtn)?.focus({ preventScroll: true });
    } catch {
      (locked ? backBtn : playBtn)?.focus();
    }
  }
}

export function openCardDetail(campaign: Campaign, index: number): void {
  const card = cardForIndex(campaign, index);
  if (!card) return;
  detailIndex = index;
  detailCampaign = campaign;
  detailDraftOption = null;
  const faceBtn = document.querySelector(
    `#playables .play-card[data-idx="${index}"]`
  ) as HTMLElement | null;
  const locked =
    !!faceBtn?.classList.contains('locked') || faceBtn?.getAttribute('data-locked') === '1';
  let whyLocked = faceBtn?.getAttribute('data-lock-reason') || '';
  if (locked && !whyLocked) whyLocked = lockReason(campaign, card);
  const costWords = costInEnglish(card);

  fillDossier(campaign, card, {
    locked,
    whyLocked,
    eyebrow: locked ? 'On file — not playable yet' : 'Campaign brief',
    confirmLabel: locked
      ? whyLocked || 'Unavailable'
      : card.field
        ? `Play — then choose a ground (${costWords})`
        : `Play this card (${costWords})`,
    onConfirm: () => {
      if (detailIndex === null || !detailCampaign) return;
      const idx = detailIndex;
      const camp = detailCampaign;
      const c = cardForIndex(camp, idx);
      // Read the wager and the fork before closing — closeCardDetail resets both.
      const press = detailPress;
      const branch = detailBranch ?? undefined;
      closeCardDetail();
      if (c?.field) openGroundPicker(camp, idx, c, press, branch);
      else commitHook?.(idx, undefined, press, branch);
    }
  });
}

/** Phase draft: same face language; confirm adds the card to the pool. */
export function openDraftDetail(campaign: Campaign, optionIndex: number): void {
  const id = campaign.state.pendingDraft?.options[optionIndex];
  if (!id) return;
  // An option is either a card id or "UP:<card id>" — an offer to sharpen a card
  // already owned. Both readers must decode it the same way; a raw catalog lookup
  // on a prefixed id returns undefined and strands the draft forever.
  const upId = parseUpgradeOption(id);
  const card = campaign.catalog.get(upId ?? id);
  if (!card) return;
  detailIndex = null;
  detailCampaign = campaign;
  detailDraftOption = optionIndex;

  fillDossier(campaign, card, {
    locked: false,
    eyebrow: upId ? 'Phase draft — sharpen' : 'Phase draft',
    upgradeOffer: !!upId,
    confirmLabel: upId ? 'Practise this card' : 'Add to my pool',
    onConfirm: () => {
      if (detailDraftOption === null || !detailCampaign) return;
      const opt = detailDraftOption;
      const camp = detailCampaign;
      closeCardDetail();
      pickPhaseDraft(camp, opt);
      afterPaintHook?.();
    }
  });
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
        // An "UP:<id>" option is an offer to sharpen a card already owned.
        const upId = parseUpgradeOption(id);
        const card = campaign.catalog.get(upId ?? id);
        if (!card) return '';
        const label = upId
          ? `${card.n}. ${upgradeLabel(card)}. Tap for details.`
          : `${card.n}. Tap for details.`;
        return `
        <button type="button" class="${cardClasses(card)} draft-card${upId ? ' draft-upgrade' : ''}" data-draft="${i}"
          aria-label="${attrEscape(label)}">
          ${cardInner(campaign.state, card, { upgradeBanner: upId ? upgradeShortLabel(card) : '' })}
        </button>`;
      })
      .join('') +
    `</div>`;
  box.querySelectorAll<HTMLButtonElement>('[data-draft]').forEach(btn => {
    btn.addEventListener('click', () => {
      openDraftDetail(campaign, Number(btn.dataset.draft));
    });
  });
  requestAnimationFrame(() => {
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const first = box.querySelector<HTMLButtonElement>('.draft-card, [data-draft]');
    first?.focus({ preventScroll: true });
  });
}

export function renderPlayables(campaign: Campaign): void {
  const grid = $('playables');
  if (campaign.state.pendingDraft?.options.length) {
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

  const allHand = campaign.deck.hand
    .map((id, index) => ({ index, card: campaign.catalog.get(id) }))
    .filter((e): e is { index: number; card: PlayCard } => !!e.card && isVisible(state, e.card));

  const campSynthetic = playable.filter(
    p => p.index < 0 && !p.card.id.startsWith('BUY')
  );
  const doorsInHand = allHand.filter(({ card }) => BALLOT_DOOR_IDS.has(card.id));
  const handCards = allHand.filter(({ card }) => !BALLOT_DOOR_IDS.has(card.id));
  const shopCards = playable.filter(p => p.card.id.startsWith('BUY'));
  const act = ACT_SHELLS[actFromStage(state.stage)];

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
      // Deliberately empty: act.kitLabel is already the Hand section's
      // sub-label below, and printing it here rendered it twice verbatim
      // ("Campaign plays" under the panel heading and again under HAND).
      : '';

  const campHtml = campEntries
    .map(({ index, card, fromHand }) => {
      if (!fromHand) return cardHtml(state, card, index, { camp: true });
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
  const hasSpine = campEntries.some(e => e.card.id === 'PL01' || e.card.id === 'PL02');
  const hasChoice = campEntries.some(e => e.card.risk === 'CHOICE');
  const campSub =
    !state.ballot && hasDoors
      ? hasSpine
        ? 'Ballot doors + spine (walk/phone) — always on, not a draw'
        : 'Petition labor or filing fee — make the ballot'
      : hasSpine || hasChoice
        ? 'Standing spine and CHOICE forks — always on when gated'
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

export function openGroundPicker(
  campaign: Campaign,
  index: number,
  card: PlayCard,
  press = false,
  branch?: string
): void {
  pendingGroundIndex = index;
  pendingGroundCard = card;
  pendingGroundPress = press;
  pendingGroundBranch = branch;
  $('gp-title').textContent = `${card.n} — where do you work it?`;
  renderGroundPicker(campaign);
  $('ground-picker').classList.remove('hidden');
}

export function closeGroundPicker(): void {
  pendingGroundIndex = null;
  pendingGroundCard = null;
  pendingGroundPress = false;
  pendingGroundBranch = undefined;
  $('ground-picker').classList.add('hidden');
}

export function renderGroundPicker(campaign: Campaign): void {
  const s = campaign.state;
  const last = s.lastGround;
  const card = pendingGroundCard;
  const bestPct = card
    ? Math.max(...s.groundsArr.map(g => Math.round(groundOdds(s, card, g) * 100)))
    : -1;
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
      const locked = isGroundLocked(g);
      const lockWhy = groundLockReason(g);
      // The county is a board — working here carries into neighbouring turf.
      const nbNames = (GROUND_NEIGHBORS[g.id] ?? [])
        .map(id => s.groundsArr.find(x => x.id === id))
        .filter((x): x is Ground => !!x && !x.gated)
        .map(x => x.n);
      const pct = card ? Math.round(groundOdds(s, card, g) * 100) : null;
      const rivalPen = card && card.field ? Math.round(rivalOddsPenalty(g) * 100) : 0;
      const oddsHtml =
        pct !== null
          ? `<span class="gp-odds${pct === bestPct ? ' gp-odds-best' : ''}" ` +
            `title="Effective odds for ${attrEscape(card!.n)} here${rivalPen > 0 ? ` — rivals cost you ~${rivalPen}%` : ''}">` +
            `p≈${pct}%${pct === bestPct ? ' · best' : ''}${rivalPen > 0 ? ` <span class="gp-pen">−${rivalPen}% rival</span>` : ''}</span>`
          : '';
      return `
        <button type="button" class="gp-ground${g.id === last ? ' gp-last' : ''}${locked ? ' gp-locked' : ''}" data-ground="${g.id}"
          ${locked ? `aria-disabled="true" data-locked="1" title="${attrEscape(lockWhy)}"` : ''}>
          <span class="gp-name">${g.n}${g.id === last ? ' <span class="gp-tag">last</span>' : ''}${locked ? ' <span class="gp-tag gp-tag-lock">closed</span>' : ''}</span>
          ${locked ? '' : oddsHtml}
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
            ${locked ? `<span class="gp-lockwhy">${attrEscape(lockWhy)}</span>` : ''}
            ${!locked && nbNames.length ? `<span class="gp-nb" title="Word carries: working here banks a share of the rapport next door">carries to ${attrEscape(nbNames.join(' · '))}</span>` : ''}
            ${workedThisWeek && !locked ? '<span class="gp-worked">worked · ½ rapport</span>' : ''}
          </span>
        </button>`;
    })
    .join('');
  $('gp-list')
    .querySelectorAll<HTMLButtonElement>('.gp-ground')
    .forEach(btn => {
      btn.addEventListener('click', () => {
        if (pendingGroundIndex === null) return;
        // Locked grounds stay visible (with the reason) but are not selectable.
        if (btn.dataset.locked === '1') return;
        const ground = campaign.state.groundsArr.find(g => g.id === btn.dataset.ground);
        const index = pendingGroundIndex;
        // Read before closing — closeGroundPicker clears the armed wager.
        const press = pendingGroundPress;
        const branch = pendingGroundBranch;
        closeGroundPicker();
        commitHook?.(index, ground, press, branch);
      });
    });
}
