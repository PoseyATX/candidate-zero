/**
 * CANDIDATE ZERO — Web shell over pure engine
 * Persistent career: setup once, never re-pick persona, off-season between cycles.
 */

import {
  createCampaign,
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
  type Campaign
} from '../engine/loop.js';
import { getPhase, stageLabel, stageWeek } from '../engine/state.js';
import { STAMPS } from '../engine/resolve.js';
import { pickDefaultGround, cardAttrMod } from '../engine/play.js';
import type { PlayFeedback } from '../engine/feedback.js';
import {
  PERSONAS,
  ISSUES,
  DISTRICTS,
  REGIONS,
  DEBUG_PERSONA_ID,
  DEBUG_PERSONA_PASSWORD,
  type SetupSelection,
  type PersonaDef
} from '../data/setup.js';
import { pickInterimMenu, runInterimPlay, type InterimPlay } from '../data/interim-plays.js';
import { pickSessionMenu, runSessionPlay, type SessionPlay } from '../data/session-plays.js';
import { careerKey } from '../engine/career.js';
import { resolveThematicChoice } from '../engine/identity-shift.js';
import { obligationNames } from '../engine/obligations.js';
import {
  listShopOffers,
  canAffordAsset,
  buyAsset,
  kitChips
} from '../data/assets.js';
import type { PlayCard, PlayOutcome } from '../engine/types.js';
import './styles.css';

const STORAGE_KEY = careerKey();

let campaign: Campaign | null = null;
let weekPlays: PlayOutcome[] = [];
let juiceTimer: ReturnType<typeof setTimeout> | null = null;
let interimMenu: InterimPlay[] = [];
let sessionMenu: SessionPlay[] = [];

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el;
}

function costLabel(card: PlayCard): string {
  const c = card.cost;
  const parts: string[] = [];
  if (c.a) parts.push(`${c.a} AP`);
  if (c.$) parts.push(`$${c.$}`);
  if (c.vp) parts.push(`${c.vp} vol`);
  if (c.m) parts.push(`${c.m} mom`);
  return parts.join(' · ') || 'free';
}

/** Session unlock for password-gated debug persona (not persisted). */
let debugPersonaUnlocked = false;

function personaOptionLabel(p: PersonaDef): string {
  if (p.locked && !debugPersonaUnlocked) return `🔒 ${p.n}`;
  if (p.debug) return `${p.n} · debug`;
  return p.n;
}

function fillSelects(): void {
  const fill = (id: string, items: { id: string; n: string }[]) => {
    const sel = $(id) as HTMLSelectElement;
    sel.innerHTML = items.map(i => `<option value="${i.id}">${i.n}</option>`).join('');
  };
  const pSel = $('sel-persona') as HTMLSelectElement;
  pSel.innerHTML = PERSONAS.map(
    p => `<option value="${p.id}">${personaOptionLabel(p)}</option>`
  ).join('');
  fill('sel-issue', ISSUES);
  fill('sel-district', DISTRICTS);
  fill('sel-region', REGIONS);
  pSel.value = 'teacher';
  (document.getElementById('sel-issue') as HTMLSelectElement).value = 'taxes';
  (document.getElementById('sel-district') as HTMLSelectElement).value = 'open';
  (document.getElementById('sel-region') as HTMLSelectElement).value = 'east';
  updateBlurb();
}

/** Prompt for debug password if TAX MAN selected. Returns false if cancelled/wrong. */
function ensureDebugPersonaAccess(personaId: string): boolean {
  const p = PERSONAS.find(x => x.id === personaId);
  if (!p?.locked) return true;
  if (debugPersonaUnlocked) return true;
  const entered = window.prompt(
    'TAX MAN is a locked debug persona for system review.\nEnter password:'
  );
  if (entered === null) return false;
  if (entered === DEBUG_PERSONA_PASSWORD) {
    debugPersonaUnlocked = true;
    // Refresh labels so lock icon drops
    const pSel = $('sel-persona') as HTMLSelectElement;
    const keep = pSel.value;
    pSel.innerHTML = PERSONAS.map(
      pe => `<option value="${pe.id}">${personaOptionLabel(pe)}</option>`
    ).join('');
    pSel.value = keep;
    return true;
  }
  window.alert('Incorrect password.');
  return false;
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
    'Persona is permanent. Issue, district, and region only shift for thematic cause in off-season.',
    d?.trap ? 'RISK district — bravery is not arithmetic.' : d?.d ?? '',
    r ? `${r.n}: petition mod ${r.petitionMod >= 0 ? '+' : ''}${r.petitionMod}.` : '',
    attr ? `Attr tilt: ${attr}` : ''
  ]
    .filter(Boolean)
    .join(' ');
}

function persistCareer(): void {
  if (!campaign) return;
  try {
    const payload = {
      seed: campaign.state.seed,
      setup: campaign.setup,
      state: {
        ...campaign.state,
        log: campaign.state.log.slice(-50)
      },
      deck: campaign.deck
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

function tryResumeCareer(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data?.setup || !data?.state) return false;
    // Build shell then restore exact state (avoid double applySetup)
    campaign = createCampaign({ seed: data.seed, setup: data.setup });
    campaign.state = data.state;
    campaign.setup = data.setup;
    if (data.deck) {
      campaign.deck.draw = data.deck.draw ?? campaign.deck.draw;
      campaign.deck.hand = data.deck.hand ?? [];
      campaign.deck.discard = data.deck.discard ?? [];
    }
    weekPlays = [];
    if (campaign.state.stage === 'interim') {
      interimMenu = pickInterimMenu(campaign.state, 4);
    }
    showGame();
    paint();
    return true;
  } catch {
    return false;
  }
}

function clearCareer(): void {
  localStorage.removeItem(STORAGE_KEY);
  campaign = null;
  weekPlays = [];
  interimMenu = [];
}

function renderLedger(): void {
  if (!campaign) return;
  const s = campaign.state;
  const snap = snapshot(s);
  const residue = (s.pendingResidue ?? []).map(r => r.name).join(', ') || '—';
  const last = s.lastCycleOutcome && s.lastCycleOutcome !== 'ongoing' ? s.lastCycleOutcome : '—';
  $('ledger').innerHTML = `
    <div class="ledger-grid">
      <div><span class="k">Stage</span> ${stageLabel(s)}${
        s.stage === 'interim'
          ? ` · Mo ${s.interimWeek ?? 1}/${s.interimWeeksTotal ?? 6}`
          : ` · Phase ${getPhase(s)}`
      }</div>
      <div><span class="k">Cycle</span> ${(s.cycleIndex ?? 0) + 1}${s.inOffice ? ' · IN OFFICE' : ''}</div>
      <div><span class="k">Week</span> ${
        s.stage === 'interim' ? `off-season` : `${stageWeek(s)} (cal ${snap.week})`
      }</div>
      <div><span class="k">AP</span> ${snap.ap}/${s.apMax}${snap.fieldAp ? ` +${snap.fieldAp} field` : ''}</div>
      <div><span class="k">Money</span> $${snap.money}${s.debt > 0 ? ` · note $${s.debt}` : ''}</div>
      <div><span class="k">Contacts</span> ${snap.contacts}</div>
      <div><span class="k">Name ID</span> ${snap.nameID}</div>
      <div><span class="k">Ballot</span> ${
        s.stage === 'interim' ? '—' : snap.ballot ? 'ON' : `${snap.signatures}/${s.sigNeed}`
      }</div>
      <div><span class="k">You</span> ${s.persona ?? '—'} · ${s.issue ?? '—'}</div>
      <div><span class="k">Place</span> ${s.district?.name ?? '—'} · ${s.regionName ?? '—'}</div>
      <div><span class="k">Last cycle</span> ${last}</div>
      <div><span class="k">Residue</span> ${residue}</div>
      <div><span class="k">Obligations</span> ${
        obligationNames(s).length ? obligationNames(s).join(' · ') : 'clean hands'
      }</div>
      <div><span class="k">Kit</span> ${
        kitChips(s).length ? kitChips(s).map(k => k.n).join(' · ') : 'empty — open the Shop'
      }</div>
    </div>
  `;
  if (s.pendingThematic) {
    $('week-hint').textContent = `Fork open: ${s.pendingThematic.title}. Resolve it before the month turns.`;
  } else if (s.stage === 'session') {
    $('week-hint').textContent =
      'Regular session. File, whip, call home. Homestead thins under the dome.';
  } else if (s.stage === 'interim') {
    $('week-hint').textContent =
      'Off-season. Work district, region, issue, bio. Rare forks may move maps or issues — never persona.';
  } else if (s.stage === 'general') {
    $('week-hint').textContent = 'General election — GOTV and contrast.';
  } else if (s.ballot) {
    $('week-hint').textContent = 'On the primary ballot. Build force before week 8.';
  } else {
    $('week-hint').textContent =
      'Not on ballot — Petition / Filing Fee. Miss it and you still live in off-season.';
  }
}

function renderThematic(): void {
  const box = $('draft');
  if (!campaign?.state.pendingThematic) {
    return;
  }
  const t = campaign.state.pendingThematic;
  box.innerHTML =
    `<div class="thematic-fork">
      <p class="hint"><strong>${t.title}</strong></p>
      <p class="hint">${t.body}</p>
      <div class="card-grid">` +
    t.options
      .map(
        o => `
        <button type="button" class="play-card risk-vol" data-theme="${o.id}">
          <span class="name">${o.label}</span>
          <span class="desc">${o.costNote ?? ''}</span>
          <span class="card-footer"><span class="risk-tag">FORK</span></span>
        </button>`
      )
      .join('') +
    `</div></div>`;
  box.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!campaign) return;
      const r = resolveThematicChoice(campaign.state, btn.dataset.theme!);
      if (r.ok) {
        showJuice({
          stamp: 'GAIN',
          beat: 'thump',
          intensity: 0.7,
          margin: 0,
          juice: r.text
        });
      }
      persistCareer();
      paint();
    });
  });
}

function renderDraft(): void {
  const box = $('draft');
  if (campaign?.state.pendingThematic) {
    renderThematic();
    return;
  }
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
        const risk = card ? card.risk.toLowerCase() : '';
        return `
        <button type="button" class="play-card draft-card ${risk ? 'risk-' + risk : ''}" data-draft="${i}">
          <span class="cost-badge">${id}</span>
          <span class="name">${card?.n ?? id}</span>
          <span class="tagline">${card?.tag ?? ''}</span>
          <span class="desc">${card?.d ?? ''}</span>
        </button>`;
      })
      .join('');
  box.querySelectorAll<HTMLButtonElement>('[data-draft]').forEach(btn => {
    btn.addEventListener('click', () => {
      pickPhaseDraft(campaign!, Number(btn.dataset.draft));
      persistCareer();
      paint();
    });
  });
}

function renderStageMenu(
  kind: 'interim' | 'session',
  menu: { id: string; n: string; tag: string; d: string; costAp: number }[],
  run: (id: string) => { ok: boolean; text: string },
  refresh: () => void
): void {
  const grid = $('playables');
  if (campaign!.state.pendingThematic) {
    grid.innerHTML = `<p class="hint">Resolve the thematic fork above first.</p>`;
    return;
  }
  if (campaign!.state.ap <= 0) {
    grid.innerHTML = `<p class="hint">${kind === 'interim' ? 'Month' : 'Week'} spent. End it to continue.</p>`;
    return;
  }
  const label = kind === 'interim' ? 'OFF-SEASON' : 'SESSION';
  grid.innerHTML = menu
    .map(p => {
      const afford = campaign!.state.ap >= p.costAp;
      return `
        <button type="button" class="play-card risk-std" data-stage-play="${p.id}" ${afford ? '' : 'disabled'}>
          <span class="cost-badge">${p.costAp ? p.costAp + ' AP' : 'free'}</span>
          <span class="name">${p.n}</span>
          <span class="tagline">${p.tag}</span>
          <span class="desc">${p.d}</span>
          <span class="card-footer"><span class="risk-tag">${label}</span></span>
        </button>`;
    })
    .join('');
  grid.querySelectorAll<HTMLButtonElement>('[data-stage-play]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!campaign) return;
      const r = run(btn.dataset.stagePlay!);
      if (r.ok) {
        weekPlays.push({ ok: true, text: r.text, cardId: btn.dataset.stagePlay, stamp: 'GAIN', tier: 1 });
        showJuice({ stamp: 'GAIN', beat: 'hit', intensity: 0.5, margin: 0, juice: r.text });
      }
      refresh();
      persistCareer();
      paint();
    });
  });
}

function renderPlayables(): void {
  if (!campaign) return;
  if (campaign.state.stage === 'interim') {
    if (!interimMenu.length) interimMenu = pickInterimMenu(campaign.state, 4);
    renderStageMenu(
      'interim',
      interimMenu,
      id => runInterimPlay(campaign!.state, id),
      () => {
        interimMenu = pickInterimMenu(campaign!.state, 4);
      }
    );
    return;
  }
  if (campaign.state.stage === 'session') {
    if (!sessionMenu.length) sessionMenu = pickSessionMenu(campaign.state, 4);
    renderStageMenu(
      'session',
      sessionMenu,
      id => runSessionPlay(campaign!.state, id),
      () => {
        sessionMenu = pickSessionMenu(campaign!.state, 4);
      }
    );
    return;
  }
  const grid = $('playables');
  if (campaign.state.pendingDraft?.options.length) {
    grid.innerHTML = `<p class="hint">Resolve the phase draft first.</p>`;
    return;
  }
  if (campaign.state.ap <= 0) {
    grid.innerHTML = `<p class="hint">No AP left — end the week.</p>`;
    return;
  }
  const playable = listPlayableHand(campaign);
  if (!playable.length) {
    grid.innerHTML = `<p class="hint">Nothing playable. End week.</p>`;
    return;
  }
  grid.innerHTML = playable
    .map(({ index, card }) => {
      const camp = index === CAMP_PETITION || index === CAMP_FILING_FEE;
      const g = pickDefaultGround(campaign!.state);
      const base = card.odds?.(campaign!.state, g);
      const mod = cardAttrMod(campaign!.state, card);
      const p = base !== undefined ? Math.max(0.02, Math.min(0.95, base + mod)) : undefined;
      const odds = p !== undefined ? `p≈${(p * 100).toFixed(0)}%` : '';
      return `
        <button type="button" class="play-card risk-${card.risk.toLowerCase()} ${camp ? 'camp' : ''} ${card.trap ? 'trap' : ''}" data-idx="${index}">
          <span class="cost-badge">${costLabel(card)}</span>
          <span class="name">${card.n}</span>
          <span class="tagline">${card.tag}</span>
          <span class="desc">${card.d}</span>
          <span class="card-footer">
            <span class="risk-tag">${card.risk}</span>
            ${odds ? `<span class="odds">${odds}</span>` : ''}
          </span>
          ${camp ? '<span class="ribbon ribbon-camp">Camp</span>' : ''}
          ${card.trap ? '<span class="ribbon ribbon-trap">Risk</span>' : ''}
        </button>
      `;
    })
    .join('');

  grid.querySelectorAll<HTMLButtonElement>('.play-card').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!campaign) return;
      const wasBallot = campaign.state.ballot;
      const outcome = playFromHand(campaign, Number(btn.dataset.idx));
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
      persistCareer();
      paint();
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

function renderKitStrip(): void {
  const el = document.getElementById('kit-strip');
  if (!el || !campaign) return;
  const s = campaign.state;
  const chips: { cls: string; n: string; t: string }[] = [];

  for (const a of kitChips(s)) {
    chips.push({ cls: 'asset', n: a.n, t: a.effect });
  }
  for (const t of s.trophies ?? []) {
    chips.push({ cls: t.kind, n: t.name, t: t.text });
  }
  for (const r of s.pendingResidue ?? []) {
    chips.push({ cls: r.kind, n: r.name, t: r.text });
  }

  if (!chips.length) {
    el.innerHTML =
      '<span class="kit-empty">Kit empty — lose a race and take the scar loot, or buy something in the Shop.</span>';
    return;
  }
  // Newest first, cap for mobile
  el.innerHTML = chips
    .slice(-16)
    .reverse()
    .map(
      c =>
        `<span class="kit-chip ${c.cls}" title="${c.t.replace(/"/g, '&quot;')}"><span class="cn">${c.n}</span><span class="cs">${c.t}</span></span>`
    )
    .join('');
}

function renderShop(): void {
  const grid = document.getElementById('shop');
  if (!grid || !campaign) return;
  const offers = listShopOffers(campaign.state);
  if (!offers.length) {
    grid.innerHTML = `<p class="hint">Shop empty — you own what you can, or requirements not met yet.</p>`;
    return;
  }
  grid.innerHTML = offers
    .map(a => {
      const ok = canAffordAsset(campaign!.state, a);
      const cost = a.vcost
        ? `$${a.cost} · ${a.vcost} vol`
        : `$${a.cost}`;
      return `
        <button type="button" class="play-card shop-card" data-buy="${a.id}" ${ok ? '' : 'disabled'}>
          <span class="cost-badge">${cost}</span>
          <span class="name">${a.n}</span>
          <span class="tagline">${a.id}</span>
          <span class="desc">${a.d}</span>
          <span class="card-footer"><span class="risk-tag">BUY</span><span class="odds">${a.effect}</span></span>
        </button>`;
    })
    .join('');
  grid.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!campaign) return;
      const r = buyAsset(campaign.state, btn.dataset.buy!);
      if (r.ok) {
        showJuice({
          stamp: 'GAIN',
          beat: 'spark',
          intensity: 0.85,
          margin: 0.2,
          juice: r.text
        });
      } else {
        campaign.state.log.push({ week: campaign.state.week, kind: 'note', text: r.text });
      }
      persistCareer();
      paint();
    });
  });
}

function renderLog(): void {
  if (!campaign) return;
  const box = $('log');
  box.innerHTML = campaign.state.log
    .slice(-60)
    .map(e => {
      const stamp =
        e.tier !== undefined && e.kind === 'play' ? `[${STAMPS[e.tier as 0 | 1 | 2 | 3] ?? '?'}] ` : '';
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

function renderChrome(): void {
  if (!campaign) return;
  const endBtn = $('btn-end');
  endBtn.textContent =
    campaign.state.stage === 'interim'
      ? 'End month'
      : campaign.state.stage === 'session'
        ? 'End session week'
        : 'End week';
  endBtn.classList.remove('hidden');
  $('btn-restart').classList.add('hidden');
}

function paint(): void {
  renderLedger();
  renderKitStrip();
  renderDraft();
  renderPlayables();
  renderShop();
  renderLog();
  renderChrome();
}

function showGame(): void {
  $('setup').classList.add('hidden');
  $('game').classList.remove('hidden');
}

function showSetup(): void {
  $('setup').classList.remove('hidden');
  $('game').classList.add('hidden');
}

/** Hard abandon only — not the normal loop. */
function requestHardReset(): void {
  if (campaign) {
    const ok = window.confirm(
      'Abandon this career entirely? Persona, residue, and off-season progress will be wiped. ' +
        'Normal play never asks this — cycles continue through off-season.'
    );
    if (!ok) return;
  }
  clearCareer();
  showSetup();
}

function startRun(): void {
  const setup = currentSetup();
  if (!ensureDebugPersonaAccess(setup.personaId)) {
    // Revert select away from locked persona
    const pSel = $('sel-persona') as HTMLSelectElement;
    if (pSel.value === DEBUG_PERSONA_ID && !debugPersonaUnlocked) {
      pSel.value = 'teacher';
      updateBlurb();
    }
    return;
  }
  const seed =
    Number((document.getElementById('seed-input') as HTMLInputElement | null)?.value) ||
    Date.now() % 1_000_000;
  const input = document.getElementById('seed-input') as HTMLInputElement | null;
  if (input) input.value = String(seed);
  clearCareer();
  campaign = createCampaign({ seed, setup });
  weekPlays = [];
  interimMenu = [];
  startWeek(campaign);
  showGame();
  persistCareer();
  paint();
}

function endWeek(): void {
  if (!campaign || campaign.state.over) {
    paint();
    return;
  }
  if (campaign.state.pendingThematic) {
    campaign.state.log.push({
      week: campaign.state.week,
      kind: 'note',
      text: 'Resolve the thematic fork before ending the month.'
    });
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
  const transition = endWeekInPlace(campaign, { autoThematic: false });

  // Failure/win loot banner — tangible dopamine
  if (
    campaign.state.lastLootJuice &&
    (transition.kind === 'missed_filing' ||
      transition.kind === 'lost_primary' ||
      transition.kind === 'lost_general' ||
      transition.kind === 'enter_session' ||
      transition.kind === 'enter_interim' ||
      transition.kind === 'won_general')
  ) {
    showJuice({
      stamp: 'GAIN',
      beat: transition.kind.includes('lost') || transition.kind === 'missed_filing' ? 'thump' : 'spark',
      intensity: 0.9,
      margin: 0.1,
      juice: campaign.state.lastLootJuice
    });
  }

  if (transition.kind === 'enter_general') {
    maybeOfferPhaseDraft(campaign, false);
    if (!campaign.state.pendingDraft) startWeek(campaign);
  } else if (transition.kind === 'enter_session') {
    sessionMenu = pickSessionMenu(campaign.state, 4);
    interimMenu = [];
    startWeek(campaign);
  } else if (
    transition.kind === 'enter_interim' ||
    transition.kind === 'missed_filing' ||
    transition.kind === 'lost_primary' ||
    transition.kind === 'lost_general'
  ) {
    interimMenu = pickInterimMenu(campaign.state, 4);
    sessionMenu = [];
    startWeek(campaign);
  } else if (transition.kind === 'enter_next_primary') {
    interimMenu = [];
    sessionMenu = [];
    startWeek(campaign);
  } else if (campaign.state.stage === 'interim') {
    interimMenu = pickInterimMenu(campaign.state, 4);
  } else if (campaign.state.stage === 'session') {
    sessionMenu = pickSessionMenu(campaign.state, 4);
  } else if (!campaign.state.pendingDraft) {
    startWeek(campaign);
  }

  persistCareer();
  paint();
}

function boot(): void {
  fillSelects();
  ['sel-issue', 'sel-district', 'sel-region'].forEach(id => {
    $(id).addEventListener('change', updateBlurb);
  });
  $('sel-persona').addEventListener('change', () => {
    const id = ($('sel-persona') as HTMLSelectElement).value;
    if (!ensureDebugPersonaAccess(id)) {
      ($('sel-persona') as HTMLSelectElement).value = 'teacher';
    }
    updateBlurb();
  });
  $('btn-start').addEventListener('click', () => startRun());
  $('btn-new').addEventListener('click', () => requestHardReset());
  $('btn-end').addEventListener('click', () => endWeek());
  $('btn-restart').addEventListener('click', () => requestHardReset());

  // Resume persistent career if present
  if (tryResumeCareer()) {
    return;
  }
  showSetup();
}

boot();
