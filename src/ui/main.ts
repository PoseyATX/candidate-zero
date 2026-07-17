/**
 * CANDIDATE ZERO — Minimal web shell over pure engine
 * Presentation only. All rules live in src/engine.
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
  type SetupSelection
} from '../data/setup.js';
import type { PlayCard, PlayOutcome } from '../engine/types.js';
import './styles.css';

let campaign: Campaign | null = null;
let weekPlays: PlayOutcome[] = [];
let juiceTimer: ReturnType<typeof setTimeout> | null = null;

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
    d?.trap ? 'TRAP district — bravery is not arithmetic.' : d?.d ?? '',
    r ? `${r.n}: petition mod ${r.petitionMod >= 0 ? '+' : ''}${r.petitionMod}.` : '',
    attr ? `Attr tilt: ${attr}` : ''
  ]
    .filter(Boolean)
    .join(' ');
}

function renderLedger(): void {
  if (!campaign) return;
  const s = campaign.state;
  const snap = snapshot(s);
  const attrs = Object.entries(s.attrs)
    .map(([k, v]) => `${k}${v}`)
    .join(' ');
  $('ledger').innerHTML = `
    <div class="ledger-grid">
      <div><span class="k">Stage</span> ${stageLabel(s)} · Phase ${getPhase(s)}</div>
      <div><span class="k">Week</span> ${stageWeek(s)} (cal ${snap.week}/${s.weeksTotal})</div>
      <div><span class="k">AP</span> ${snap.ap}/${s.apMax}</div>
      <div><span class="k">Money</span> $${snap.money}</div>
      <div><span class="k">Contacts</span> ${snap.contacts}</div>
      <div><span class="k">Name ID</span> ${snap.nameID}</div>
      <div><span class="k">Vols</span> ${snap.volPool}</div>
      <div><span class="k">Momentum</span> ${snap.momentum}</div>
      <div><span class="k">Ballot</span> ${
        snap.ballot ? 'ON' : `${snap.signatures}/${s.sigNeed} sigs`
      }</div>
      <div><span class="k">Identity</span> ${s.persona ?? '—'} · ${s.issue ?? '—'}</div>
      <div><span class="k">Attrs</span> ${attrs}</div>
      ${s.over && s.outcome ? `<div><span class="k">Outcome</span> ${s.outcome}</div>` : ''}
    </div>
  `;
  if (s.over) {
    $('week-hint').textContent = `Campaign over: ${s.outcome ?? 'ended'}.`;
  } else if (s.stage === 'general') {
    $('week-hint').textContent = 'General election — GOTV and contrast. Six weeks to November.';
  } else if (s.ballot) {
    $('week-hint').textContent = 'On the primary ballot. Build force before the week-8 primary.';
  } else {
    $('week-hint').textContent =
      'Not on ballot — Petition / Filing Fee are camp actions. Deadline: end of week 8.';
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
        const risk = card ? card.risk.toLowerCase() : '';
        return `
        <button type="button" class="play-card draft-card ${risk ? 'risk-' + risk : ''}" data-draft="${i}">
          <span class="cost-badge">${id}</span>
          <span class="name">${card?.n ?? id}</span>
          <span class="tagline">${card?.tag ?? ''}</span>
          <span class="desc">${card?.d ?? ''}</span>
          <span class="card-footer">
            <span class="risk-tag">${card?.risk ?? ''}</span>
          </span>
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
      const attr = card.attrs?.length ? card.attrs.join(' / ') : '';
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
          ${attr ? `<span class="attrs">${attr}</span>` : ''}
          ${camp ? '<span class="ribbon ribbon-camp">Camp</span>' : ''}
          ${card.trap ? '<span class="ribbon ribbon-trap">Trap</span>' : ''}
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
  renderLedger();
  renderDraft();
  renderPlayables();
  renderLog();
}

function showGame(): void {
  $('setup').classList.add('hidden');
  $('game').classList.remove('hidden');
}

function showSetup(): void {
  $('setup').classList.remove('hidden');
  $('game').classList.add('hidden');
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
  weekPlays = [];
  startWeek(campaign);
  showGame();
  paint();
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
  if (!campaign.state.over && !campaign.state.pendingDraft) {
    startWeek(campaign);
  }
  paint();
}

function boot(): void {
  fillSelects();
  ['sel-persona', 'sel-issue', 'sel-district', 'sel-region'].forEach(id => {
    $(id).addEventListener('change', updateBlurb);
  });
  $('btn-start').addEventListener('click', () => startRun());
  $('btn-new').addEventListener('click', () => requestNewRun());
  $('btn-end').addEventListener('click', () => endWeek());
  showSetup();
}

boot();
