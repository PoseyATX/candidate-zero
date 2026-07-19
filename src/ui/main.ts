/**
 * CANDIDATE ZERO — Minimal web shell over pure engine
 * Presentation only. All rules live in src/engine.
 */

import {
  createCampaign,
  createIncumbentCampaign,
  listPlayableHand,
  playFromHand,
  startWeek,
  endWeekInPlace,
  snapshot,
  pickPhaseDraft,
  maybeOfferPhaseDraft,
  summarizeWeek,
  CAMP_PETITION,
  CAMP_FILING_FEE,
  campIndexToCardId,
  type Campaign
} from '../engine/loop.js';
import { getPhase, stageLabel, stageWeek } from '../engine/state.js';
import { STAMPS } from '../engine/resolve.js';
import { pickDefaultGround, cardAttrMod, isPhaseLegal, isVisible, canAfford } from '../engine/play.js';
import type { PlayFeedback } from '../engine/feedback.js';
import {
  PERSONAS,
  ISSUES,
  DISTRICTS,
  REGIONS,
  type SetupSelection
} from '../data/setup.js';
import {
  loadLegacy,
  saveLegacy,
  applyLegacy,
  buildPaths,
  buildEpithet,
  buildGrowthLine,
  computeShare,
  recordRun,
  setInterim,
  addTrait,
  romanRun,
  TRAITS,
  type InterimPath
} from '../engine/legacy.js';
import type { CampaignOutcome, Ground, LegacyState, PlayCard, PlayOutcome, TraitId } from '../engine/types.js';
import { emblemFor, emblem, kindMark, KIND_META } from './card-art.js';
import './styles.css';

let campaign: Campaign | null = null;
let weekPlays: PlayOutcome[] = [];
let juiceTimer: ReturnType<typeof setTimeout> | null = null;
let legacy: LegacyState = loadLegacy();
let terminalKind: CampaignOutcome | null = null;
let terminalShare = 0;

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el;
}

function fillSelects(): void {
  const fill = (id: string, items: { id: string; n: string }[]) => {
    const sel = $(id) as HTMLSelectElement;
    sel.innerHTML = items.map(i => `<option value="${i.id}">${i.n}</option>`).join('');
  };
  fill('sel-persona', PERSONAS);
  fill('sel-issue', ISSUES);
  fill('sel-district', DISTRICTS);
  fill('sel-region', REGIONS);
  (document.getElementById('sel-persona') as HTMLSelectElement).value = 'teacher';
  (document.getElementById('sel-issue') as HTMLSelectElement).value = 'taxes';
  (document.getElementById('sel-district') as HTMLSelectElement).value = 'open';
  (document.getElementById('sel-region') as HTMLSelectElement).value = 'east';
  updateBlurb();
}

function currentSetup(): SetupSelection {
  return {
    personaId: (document.getElementById('sel-persona') as HTMLSelectElement).value,
    issueId: (document.getElementById('sel-issue') as HTMLSelectElement).value,
    districtId: (document.getElementById('sel-district') as HTMLSelectElement).value,
    regionId: (document.getElementById('sel-region') as HTMLSelectElement).value
  };
}

function updateBlurb(): void {
  const setup = currentSetup();
  const p = PERSONAS.find(x => x.id === setup.personaId);
  const r = REGIONS.find(x => x.id === setup.regionId);
  const d = DISTRICTS.find(x => x.id === setup.districtId);
  const attr = p ? Object.entries(p.attrs).map(([k, v]) => `${k}+${v}`).join(' ') : '';
  $('setup-blurb').textContent = [
    p?.d ?? '',
    d?.d ?? '',
    r ? `${r.n}: petition mod ${r.petitionMod >= 0 ? '+' : ''}${r.petitionMod}.` : '',
    attr ? `Attr tilt: ${attr}` : ''
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Compact persistent HUD — mobile deckbuilder convention (the vitals never
 * scroll away). Hidden on wide screens where the full ledger is visible
 * anyway; sticky at the top of #game on phones.
 */
function renderHud(): void {
  if (!campaign) return;
  const s = campaign.state;
  const snap = snapshot(s);
  const pips = Array.from({ length: s.apMax }, (_, i) =>
    `<i class="pip ${i < snap.ap ? 'on' : ''}"></i>`
  ).join('');
  const fieldChip = snap.fieldAp ? `<span class="chip chip-field">+${snap.fieldAp} field</span>` : '';
  const debtChip =
    snap.debt > 0
      ? `<span class="chip chip-debt" title="Debt does not tax odds — win/loss branch only">−$${snap.debt}</span>`
      : '';
  const weekPct = Math.round((snap.week / s.weeksTotal) * 100);
  const ballotBit = snap.ballot
    ? '<span class="chip chip-on">BALLOT ON</span>'
    : `<span class="hud-meter" title="${snap.signatures}/${s.sigNeed} signatures">
         <i style="width:${Math.min(100, Math.round((snap.signatures / s.sigNeed) * 100))}%"></i>
       </span><span class="hud-meter-label">${snap.signatures}/${s.sigNeed} sigs</span>`;
  const spendNote =
    snap.debt > 0 && snap.availableCash < snap.money
      ? `<span class="hud-item" title="Service reserve — elevated debt tightens spend, not odds"><span class="k">Spend</span>$${snap.availableCash}</span>`
      : '';
  $('hud').innerHTML = `
    <span class="hud-item"><span class="k">AP</span> <span class="pips">${pips}</span>${fieldChip}</span>
    <span class="hud-item"><span class="k">$</span>${snap.money}${debtChip}</span>
    ${spendNote}
    <span class="hud-item"><span class="k">W${snap.week}</span>
      <span class="hud-meter hud-meter-week"><i style="width:${weekPct}%"></i></span>
    </span>
    <span class="hud-item">${ballotBit}</span>
  `;
}

function renderLedger(): void {
  if (!campaign) return;
  const s = campaign.state;
  const snap = snapshot(s);
  const attrs = Object.entries(s.attrs)
    .map(([k, v]) => `${k}${v}`)
    .join(' ');
  const allyBits = s.allies
    .filter(a => a.warm > 0)
    .map(a => {
      const g =
        a.grounds && a.grounds.length
          ? ` @ ${a.grounds
              .map(id => s.groundsArr.find(x => x.id === id)?.n ?? id)
              .join(', ')}`
          : '';
      return `${a.id}${g}`;
    })
    .join(' · ');
  const assetBits = s.assets.filter(a => /^A\d+/.test(a)).join(' · ');
  const oblBits = s.obls.join(' · ');
  const spendLine =
    snap.debt > 0
      ? `<div><span class="k">Spendable</span> $${snap.availableCash}${
          snap.availableCash < snap.money ? ' <span class="muted">(service reserve)</span>' : ''
        }</div>`
      : '';
  const debtLine =
    snap.debt > 0
      ? `<div><span class="k">Debt</span> $${snap.debt}${
          s.pacBridgeDebt ? ` · PAC bridge $${s.pacBridgeDebt}` : ''
        } <span class="muted">— no odds tax</span></div>`
      : '';
  $('ledger').innerHTML = `
    <div class="ledger-grid">
      <div><span class="k">Stage</span> ${stageLabel(s)} · Phase ${getPhase(s)}</div>
      <div><span class="k">Week</span> ${stageWeek(s)} (cal ${snap.week}/${s.weeksTotal})</div>
      <div><span class="k">AP</span> ${snap.ap}/${s.apMax}${snap.fieldAp ? ` +${snap.fieldAp} field` : ''}</div>
      <div><span class="k">Money</span> $${snap.money}</div>
      ${spendLine}
      ${debtLine}
      <div><span class="k">Contacts</span> ${snap.contacts}</div>
      <div><span class="k">Name ID</span> ${snap.nameID}</div>
      <div><span class="k">Vols</span> ${snap.volPool}</div>
      <div><span class="k">Momentum</span> ${snap.momentum}</div>
      <div><span class="k">Endorse</span> ${snap.endorsePts}</div>
      <div><span class="k">Ballot</span> ${
        snap.ballot ? 'ON' : `${snap.signatures}/${s.sigNeed} sigs`
      }</div>
      <div><span class="k">Identity</span> ${s.persona ?? '—'} · ${s.issue ?? '—'}</div>
      <div><span class="k">Attrs</span> ${attrs}</div>
      <div class="ledger-wide"><span class="k">Allies</span> ${allyBits || '—'}</div>
      <div class="ledger-wide"><span class="k">Assets</span> ${assetBits || '—'}</div>
      <div class="ledger-wide"><span class="k">Obligations</span> ${oblBits || '—'}</div>
      ${s.over && s.outcome ? `<div><span class="k">Outcome</span> ${s.outcome}</div>` : ''}
    </div>
  `;
  if (s.over) {
    $('week-hint').textContent = `Campaign over: ${s.outcome ?? 'ended'}.`;
  } else if (s.stage === 'general') {
    $('week-hint').textContent = 'General election — GOTV and contrast. Six weeks to November.';
  } else if (s.ballot) {
    $('week-hint').textContent =
      'On the primary ballot. Build force before the week-8 primary. Shop buys are free actions (0 AP).';
  } else {
    $('week-hint').textContent =
      'Not on ballot — Petition / Filing Fee / Shop are always available. Deadline: end of week 8.';
  }
}

function renderDraft(): void {
  const box = $('draft');
  if (!campaign?.state.pendingDraft?.options.length) {
    box.innerHTML = '';
    return;
  }
  const draft = campaign.state.pendingDraft;
  box.innerHTML =
    `<p class="hint">Phase ${draft.phase} draft — pick one for your pool</p>` +
    draft.options
      .map((id, i) => {
        const card = campaign!.catalog.get(id);
        if (!card) return '';
        return `
        <button type="button" class="${cardClasses(card)} draft-card" data-draft="${i}">
          ${cardInner(card)}
        </button>`;
      })
      .join('');
  box.querySelectorAll<HTMLButtonElement>('[data-draft]').forEach(btn => {
    btn.addEventListener('click', () => {
      pickPhaseDraft(campaign!, Number(btn.dataset.draft));
      paint();
    });
  });
}

/** Primary cost for the seal + any secondary costs for the sub-stamp row. */
function costParts(card: PlayCard): { seal: string; subs: string[] } {
  const c = card.cost;
  const all: string[] = [];
  if (c.a) all.push(`${c.a} AP`);
  if (c.$) all.push(`$${c.$}`);
  if (c.vp) all.push(`${c.vp} vol`);
  if (c.m) all.push(`${c.m} mom`);
  if (c.fav) all.push(`${c.fav} fav`);
  if (!all.length) return { seal: 'free', subs: [] };
  return { seal: all[0]!, subs: all.slice(1) };
}

/**
 * Shared card body — the one card anatomy every surface uses (hand, camp
 * actions, phase drafts). Name banner, deco divider, engraved emblem with
 * a cost seal stamped over it, tagline, body text, ticket-stub footer.
 */
function cardInner(
  card: PlayCard,
  opts: { camp?: boolean; shop?: boolean; locked?: boolean; lockReason?: string } = {}
): string {
  const state = campaign!.state;
  const g = pickDefaultGround(state);
  const base = card.odds?.(state, g);
  const mod = cardAttrMod(state, card);
  const p = base !== undefined ? Math.max(0.02, Math.min(0.95, base + mod)) : undefined;
  const odds = p !== undefined ? `p≈${(p * 100).toFixed(0)}%` : '';
  const meter =
    p !== undefined
      ? `<span class="odds-meter"><i style="width:${Math.round(p * 100)}%"></i></span>`
      : '';
  const attr = card.attrs?.length ? card.attrs.join(' · ') : '';
  const { seal, subs } = costParts(card);
  const stamp = opts.shop
    ? '<span class="stamp stamp-shop">Shop</span>'
    : opts.camp
      ? '<span class="stamp stamp-camp">Camp</span>'
      : '';
  // Kind seal (top-left, mirroring the cost seal): a subtle corner glyph
  // marking the card's family. No verdict text — the category name lives
  // in title/aria only. `action` cards carry no mark (unmarked default).
  const kind = card.kind ?? 'action';
  const mark = kindMark(kind);
  const meta = KIND_META[kind];
  const kindSeal = mark
    ? `<span class="kind-seal" role="img" title="${meta?.label ?? ''} — ${meta?.blurb ?? ''}" aria-label="${meta?.label ?? ''}">${mark}</span>`
    : '';
  return `
    ${kindSeal}
    <span class="name">${card.n}</span>
    <span class="orn"><i></i>&#10022;<i></i></span>
    <span class="card-art">${emblemFor(card.id)}${stamp}</span>
    <span class="cost-seal">${seal}</span>
    ${subs.length ? `<span class="cost-subs">${subs.map(s => `<span>${s}</span>`).join('')}</span>` : ''}
    <span class="tagline">${card.tag}</span>
    <span class="desc">${card.d}</span>
    ${opts.locked && opts.lockReason ? `<span class="locked-reason">${opts.lockReason}</span>` : ''}
    <span class="card-footer">
      <span class="risk-tag">${card.risk}</span>
      ${odds ? `<span class="odds">${odds}</span>` : ''}
    </span>
    ${meter}
    ${attr ? `<span class="attrs">${attr}</span>` : ''}
  `;
}

function cardClasses(
  card: PlayCard,
  opts: { camp?: boolean; shop?: boolean; locked?: boolean } = {}
): string {
  const kind = card.kind ?? 'action';
  return [
    'play-card',
    `risk-${card.risk.toLowerCase()}`,
    kind !== 'action' ? `kind-${kind}` : '',
    opts.shop ? 'shop' : '',
    opts.camp && !opts.shop ? 'camp' : '',
    opts.locked ? 'locked' : ''
  ]
    .filter(Boolean)
    .join(' ');
}

function cardHtml(
  card: PlayCard,
  index: number,
  opts: { camp?: boolean; shop?: boolean; locked?: boolean; lockReason?: string }
): string {
  return `
    <button type="button" class="${cardClasses(card, opts)}" data-idx="${index}"
      ${opts.locked ? 'disabled aria-disabled="true"' : ''}>
      ${cardInner(card, opts)}
    </button>
  `;
}

function lockReason(card: PlayCard): string {
  const state = campaign!.state;
  if (!isPhaseLegal(state, card)) return `Phase ${card.ph.join('/')} only`;
  if (!canAfford(state, card)) {
    const c = card.cost;
    if ((c.a ?? 0) > state.ap && !(card.field && state.fieldAp > 0)) return 'No AP left';
    // Phase 3: $ costs check availableCash (debt service reserve), not raw money
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

function renderPlayables(): void {
  if (!campaign) return;
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

  // The whole hand stays on the table, deckbuilder-style: cards you can't
  // play right now render dimmed with the reason, instead of vanishing.
  // Cards failing show/req stay hidden — those are undiscovered content,
  // not locked options.
  const handCards = campaign.deck.hand
    .map((id, index) => ({ index, card: campaign!.catalog.get(id) }))
    .filter((e): e is { index: number; card: PlayCard } => !!e.card && isVisible(state, e.card));
  const campCards = playable.filter(p => p.index < 0 && !p.card.id.startsWith('BUY'));
  const shopCards = playable.filter(p => p.card.id.startsWith('BUY'));

  // Shop is 0-AP — still available when AP is gone (spend-now lever visibility).
  const hintLine = apExhausted
    ? `<p class="hint">Out of actions — shop buys (0 AP) still work, or end the week.</p>`
    : !playable.length && !handCards.length
      ? `<p class="hint">Nothing playable. End week.</p>`
      : '';

  grid.innerHTML =
    hintLine +
    handCards
      .map(({ index, card }) => {
        const locked = apExhausted || !playableIdx.has(index);
        return cardHtml(card, index, {
          locked,
          lockReason: locked ? (apExhausted ? 'No AP left' : lockReason(card)) : undefined
        });
      })
      .join('') +
    campCards.map(({ index, card }) => cardHtml(card, index, { camp: true })).join('') +
    (shopCards.length
      ? `<p class="hint shop-hint">Campaign shop — 0 AP · money or volunteers</p>` +
        shopCards
          .map(({ index, card }) => {
            const locked = !playableIdx.has(index);
            return cardHtml(card, index, {
              shop: true,
              locked,
              lockReason: locked ? lockReason(card) : undefined
            });
          })
          .join('')
      : '');

  grid.querySelectorAll<HTMLButtonElement>('.play-card:not(.locked)').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!campaign) return;
      const index = Number(btn.dataset.idx);
      const card = cardForIndex(index);
      // Field plays open the ground picker; everything else resolves now.
      if (card?.field) {
        openGroundPicker(index, card);
      } else {
        commitPlay(index);
      }
    });
  });
}

/** Resolve the card at a hand/camp index (from `data-idx`) into a PlayCard. */
function cardForIndex(index: number): PlayCard | undefined {
  if (!campaign) return undefined;
  const campId = campIndexToCardId(campaign, index);
  if (campId) return campaign.catalog.get(campId);
  const id = campaign.deck.hand[index];
  return id ? campaign.catalog.get(id) : undefined;
}

/** Execute a play (optionally at a chosen ground) and fold in the result. */
function commitPlay(index: number, ground?: Ground): void {
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

let pendingGroundIndex: number | null = null;

function openGroundPicker(index: number, card: PlayCard): void {
  if (!campaign) return;
  pendingGroundIndex = index;
  $('gp-title').textContent = `${card.n} — where do you work it?`;
  renderGroundPicker();
  $('ground-picker').classList.remove('hidden');
}

function closeGroundPicker(): void {
  pendingGroundIndex = null;
  $('ground-picker').classList.add('hidden');
}

function renderGroundPicker(): void {
  if (!campaign) return;
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
        if (!campaign || pendingGroundIndex === null) return;
        const ground = campaign.state.groundsArr.find(g => g.id === btn.dataset.ground);
        const index = pendingGroundIndex;
        closeGroundPicker();
        commitPlay(index, ground);
      });
    });
}

function showJuice(fb: PlayFeedback): void {
  const el = $('juice');
  el.classList.remove('hidden', 'spark', 'hit', 'thump', 'crash', 'whisper');
  el.classList.add(fb.beat);
  const streak =
    fb.streak && fb.streak.count >= 2
      ? fb.streak.kind === 'hot'
        ? ` · hot ×${fb.streak.count}`
        : ` · cold ×${fb.streak.count}`
      : '';
  el.textContent = `${fb.stamp}${streak} — ${fb.juice}`;
  if (juiceTimer) clearTimeout(juiceTimer);
  juiceTimer = setTimeout(() => {
    el.classList.add('hidden');
  }, 3200);
}

function renderLog(): void {
  if (!campaign) return;
  const box = $('log');
  box.innerHTML = campaign.state.log
    .slice(-60)
    .map(e => {
      const stamp = e.tier !== undefined && e.kind === 'play' ? `[${STAMPS[e.tier as 0 | 1 | 2 | 3] ?? '?'}] ` : '';
      const cls = [
        'log-line',
        e.kind === 'juice' ? 'juice' : '',
        e.kind === 'summary' ? 'summary' : '',
        e.tier !== undefined ? `tier-${e.tier}` : ''
      ]
        .filter(Boolean)
        .join(' ');
      return `<div class="${cls}"><span class="w">W${e.week}</span> ${stamp}${e.text}</div>`;
    })
    .join('');
  box.scrollTop = box.scrollHeight;
}

function paint(): void {
  renderHud();
  renderLedger();
  renderDraft();
  renderPlayables();
  renderLog();
}

const SCREENS = ['title', 'tutorial', 'setup', 'game', 'terminal'] as const;
type ScreenId = (typeof SCREENS)[number];
let currentScreen: ScreenId = 'title';
let tutorialReturn: ScreenId = 'title';

function showScreen(id: ScreenId): void {
  currentScreen = id;
  for (const s of SCREENS) $(s).classList.toggle('hidden', s !== id);
  // The masthead top bar and footer duplicate the title screen's nameplate
  // and tag line — hide both there; everywhere else the bar carries
  // How to Play / New run.
  $('topbar').classList.toggle('hidden', id === 'title');
  $('foot').classList.toggle('hidden', id === 'title');
  window.scrollTo({ top: 0 });
}

function showTitle(): void {
  showScreen('title');
}

function showTutorial(): void {
  if (currentScreen !== 'tutorial') tutorialReturn = currentScreen;
  showScreen('tutorial');
}

function showGame(): void {
  showScreen('game');
}

function showSetup(): void {
  showScreen('setup');
  renderChronicle();
}

function showTerminal(): void {
  showScreen('terminal');
}

/**
 * Persona (and the rest of setup) is a one-time, run-defining choice —
 * it never changes mid-campaign at the engine level (applySetup runs
 * exactly once, inside createCampaign). "New run" abandons the current
 * campaign entirely rather than mutating it, so guard against doing that
 * by accident mid-run.
 */
function requestNewRun(): void {
  if (campaign && !campaign.state.over) {
    const ok = window.confirm(
      'Start a new run? This abandons the current campaign — persona, ' +
        'district, and everything else were locked in at the start and ' +
        'cannot be changed on an in-progress run.'
    );
    if (!ok) return;
  }
  showSetup();
}

function startRun(): void {
  const seed =
    Number((document.getElementById('seed-input') as HTMLInputElement | null)?.value) ||
    Date.now() % 1_000_000;
  const input = document.getElementById('seed-input') as HTMLInputElement | null;
  if (input) input.value = String(seed);
  campaign = createCampaign({ seed, setup: currentSetup() });
  applyLegacy(campaign.state, legacy);
  weekPlays = [];
  startWeek(campaign);
  showGame();
  paint();
}

/**
 * The Chronicle — ported from the archive's LEGACY/terminal system. A run
 * ending is not a reset: record the epithet, show what this run grew even
 * on a loss, then offer a real next move (an interim path + trait on a
 * loss, or a direct "Stand for Reelection" continuation on a win) instead
 * of a dead-end screen.
 */
function enterTerminal(c: Campaign): void {
  const kind = (c.state.outcome ?? 'ongoing') as CampaignOutcome;
  terminalKind = kind;
  terminalShare = computeShare(c.state, kind);
  recordRun(legacy, c.state, kind, terminalShare);
  saveLegacy(legacy);
  renderTerminalOutcome();
  showTerminal();
}

function renderTerminalOutcome(): void {
  if (!campaign || terminalKind === null) return;
  const state = campaign.state;
  const titles: Record<CampaignOutcome, string> = {
    ongoing: '',
    missed_filing: 'Never Made the Ballot',
    lost_primary: 'Primary Lost',
    won_general: 'The Seat Is Won',
    lost_general: 'The General’s Wall'
  };
  const epithet = buildEpithet(state, terminalKind, terminalShare);
  const growth = buildGrowthLine(state);
  // Phase 3: debt is a win/loss branch split, not an odds tax.
  let debtNote = '';
  if (terminalKind === 'won_general' && (state.debt || state.pacBridgeDebt || state.obls.includes('OB1'))) {
    debtNote =
      state.pacBridgeDebt || state.obls.includes('OB1')
        ? `<p class="debt-note">Notes retire cheap on a win — but the PAC still holds a Session claim (OB1). Committee work will not be free.</p>`
        : `<p class="debt-note">Self-loan retires cheap at the swearing-in (token fee). Homestead risk is paid; no Session leash.</p>`;
  } else if (terminalKind !== 'won_general' && (state.debt || state.obls.length)) {
    const crisis =
      (state.debt || 0) >= 5000
        ? ' Crisis territory: keep running with worse economics, or go home — the PAC Check is the structured relief valve next cycle.'
        : '';
    debtNote = `<p class="debt-note">The bank still wants its money ($${state.debt || 0}). Losing does not cancel the note — it compounds into the next cycle.${crisis}</p>`;
  }
  const nextHint =
    terminalKind === 'won_general'
      ? 'Ahead: the swearing-in and the next filing period. Stand again, or rest on the win.'
      : 'Two years until the next filing deadline. How do you spend them?';

  $('terminal-head').innerHTML = `
    <h2>${titles[terminalKind]}</h2>
    <p class="epithet">${epithet}</p>
    ${debtNote}
    ${growth ? `<p class="growth">${growth}</p>` : ''}
    <p class="hint">${nextHint}</p>
  `;

  if (terminalKind === 'won_general') {
    renderTerminalWinChoices();
  } else {
    renderTerminalPaths();
  }
}

function renderTerminalWinChoices(): void {
  const grid = $('terminal-choices');
  grid.innerHTML = `
    <button type="button" class="play-card choice-card" data-choice="reelect">
      <span class="name">Stand for Reelection</span>
      <span class="orn"><i></i>&#10022;<i></i></span>
      <span class="card-art">${emblem('star')}</span>
      <span class="desc">The wheel turns. File again for the same seat — this time you're the incumbent.</span>
    </button>
    <button type="button" class="play-card choice-card" data-choice="rest">
      <span class="name">Rest on the Win</span>
      <span class="orn"><i></i>&#10022;<i></i></span>
      <span class="card-art">${emblem('cup')}</span>
      <span class="desc">Start a new run, a new ballad entry. The Chronicle keeps this one.</span>
    </button>
  `;
  grid.querySelector('[data-choice="reelect"]')?.addEventListener('click', () => {
    if (!campaign) return;
    campaign = createIncumbentCampaign(campaign, legacy);
    weekPlays = [];
    startWeek(campaign);
    showGame();
    paint();
  });
  grid.querySelector('[data-choice="rest"]')?.addEventListener('click', () => {
    showSetup();
  });
}

function renderTerminalPaths(): void {
  if (!campaign) return;
  const paths = buildPaths(campaign.state, terminalShare);
  const pathEmblems: Record<string, string> = {
    perennial: 'pennant',
    advocate: 'megaphone',
    staffer: 'clipboard',
    home: 'cup'
  };
  const grid = $('terminal-choices');
  grid.innerHTML = paths
    .map(
      p => `
    <button type="button" class="play-card choice-card" data-path="${p.id}">
      <span class="name">${p.n}</span>
      <span class="orn"><i></i>&#10022;<i></i></span>
      <span class="card-art">${emblem(pathEmblems[p.id] ?? 'star')}</span>
      <span class="desc">${p.d}</span>
    </button>
  `
    )
    .join('');
  grid.querySelectorAll<HTMLButtonElement>('[data-path]').forEach(btn => {
    btn.addEventListener('click', () => {
      const path = paths.find(p => p.id === btn.dataset.path);
      if (path) renderTerminalTraits(path);
    });
  });
}

function renderTerminalTraits(path: InterimPath): void {
  const grid = $('terminal-choices');
  grid.innerHTML =
    `<p class="hint" style="grid-column:1/-1">The two years pass. What did they leave you? ` +
    `(Choose one — it persists across every run to come.)</p>` +
    path.traits
      .map(
        t => `
    <button type="button" class="play-card choice-card" data-trait="${t}">
      <span class="name">${TRAITS[t].n}</span>
      <span class="orn"><i></i>&#10022;<i></i></span>
      <span class="card-art">${emblem('quill')}</span>
      <span class="desc">${TRAITS[t].d}</span>
    </button>
  `
      )
      .join('');
  grid.querySelectorAll<HTMLButtonElement>('[data-trait]').forEach(btn => {
    btn.addEventListener('click', () => {
      const traitId = btn.dataset.trait as TraitId;
      addTrait(legacy, traitId);
      setInterim(legacy, path.interim);
      saveLegacy(legacy);
      showSetup();
    });
  });
}

function renderChronicle(): void {
  const el = $('chronicle');
  if (!legacy.runs.length) {
    el.classList.add('hidden');
    el.innerHTML = '';
    return;
  }
  el.classList.remove('hidden');
  el.innerHTML = `
    <span class="ct">Your ballad so far</span>
    ${legacy.runs
      .map(
        (r, i) =>
          `<p><b>Run ${romanRun(i)}.</b> ${r.epithet} ${r.interim ? `<i>${r.interim}</i>` : ''}</p>`
      )
      .join('')}
    ${
      legacy.traits.length
        ? `<p><b>What the years taught:</b> ${legacy.traits.map(t => TRAITS[t].n).join(' · ')}</p>`
        : ''
    }
    <p class="burn-row"><button type="button" class="btn" id="btn-burn-chronicle">Burn the ballad (start anew)</button></p>
  `;
  const burnBtn = document.getElementById('btn-burn-chronicle') as HTMLButtonElement | null;
  if (burnBtn) {
    burnBtn.addEventListener('click', () => {
      if (burnBtn.dataset.armed) {
        legacy = { runs: [], traits: [], carry: {} };
        saveLegacy(legacy);
        renderChronicle();
        return;
      }
      burnBtn.dataset.armed = '1';
      burnBtn.textContent = 'Tap again to burn it all — every run, every trait';
      setTimeout(() => {
        if (burnBtn.dataset) {
          delete burnBtn.dataset.armed;
          burnBtn.textContent = 'Burn the ballad (start anew)';
        }
      }, 4000);
    });
  }
}

function endWeek(): void {
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
    beat: summary.bestStamp === 'DISASTER' ? 'crash' : summary.bestStamp === 'BREAKTHROUGH' ? 'spark' : 'hit',
    intensity: 0.7,
    margin: 0,
    juice: summary.juice
  });
  weekPlays = [];
  const transition = endWeekInPlace(campaign);
  if (transition.kind === 'enter_general') {
    maybeOfferPhaseDraft(campaign, false);
  }
  if (campaign.state.over) {
    enterTerminal(campaign);
    return;
  }
  if (!campaign.state.pendingDraft) {
    startWeek(campaign);
  }
  paint();
}

function boot(): void {
  fillSelects();
  ['sel-persona', 'sel-issue', 'sel-district', 'sel-region'].forEach(id => {
    $(id).addEventListener('change', updateBlurb);
  });
  $('title-emblem').innerHTML = emblem('star');
  $('btn-title-start').addEventListener('click', () => showSetup());
  $('btn-title-howto').addEventListener('click', () => showTutorial());
  $('btn-howto').addEventListener('click', () => showTutorial());
  $('btn-tut-back').addEventListener('click', () => showScreen(tutorialReturn));
  $('btn-start').addEventListener('click', () => startRun());
  $('btn-new').addEventListener('click', () => requestNewRun());
  $('btn-end').addEventListener('click', () => endWeek());
  $('gp-cancel').addEventListener('click', () => closeGroundPicker());
  showTitle();
}

boot();
