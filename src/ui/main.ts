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
  CAMP_PETITION,
  CAMP_FILING_FEE,
  type Campaign
} from '../engine/loop.js';
import { getPhase, stageLabel, stageWeek } from '../engine/state.js';
import { STAMPS } from '../engine/resolve.js';
import { pickDefaultGround, cardAttrMod } from '../engine/play.js';
import type { PlayCard } from '../engine/types.js';
import './styles.css';

let campaign: Campaign;

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

function renderLedger(): void {
  const s = campaign.state;
  const snap = snapshot(s);
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
      ${s.over && s.outcome ? `<div><span class="k">Outcome</span> ${s.outcome}</div>` : ''}
    </div>
  `;
  if (s.over) {
    $('week-hint').textContent = `Campaign over: ${s.outcome ?? 'ended'}.`;
  } else if (s.stage === 'general') {
    $('week-hint').textContent = 'General election — GOTV and contrast. Six weeks to November.';
  } else if (s.ballot) {
    $('week-hint').textContent = 'On the primary ballot. Build name, chairs, and force before week 8.';
  } else {
    $('week-hint').textContent =
      'Not on ballot — Petition Drive and Filing Fee are always offered as camp actions. Deadline: end of week 8.';
  }
}

function renderLog(): void {
  const box = $('log');
  box.innerHTML = campaign.state.log
    .slice(-40)
    .map(e => {
      const stamp = e.tier !== undefined ? `[${STAMPS[e.tier as 0 | 1 | 2 | 3] ?? '?'}] ` : '';
      return `<div class="log-line"><span class="w">W${e.week}</span> ${stamp}${e.text}</div>`;
    })
    .join('');
  box.scrollTop = box.scrollHeight;
}

function renderPlayables(): void {
  const grid = $('playables');
  const playable = listPlayableHand(campaign);
  if (campaign.state.ap <= 0) {
    grid.innerHTML = `<p class="hint">No AP left — end the week.</p>`;
    return;
  }
  if (!playable.length) {
    grid.innerHTML = `<p class="hint">Nothing playable. End week or wait for a draw.</p>`;
    return;
  }
  grid.innerHTML = playable
    .map(({ index, card }) => {
      const camp = index === CAMP_PETITION || index === CAMP_FILING_FEE;
      const g = pickDefaultGround(campaign.state);
      const base = card.odds?.(campaign.state, g);
      const mod = cardAttrMod(campaign.state, card);
      const p = base !== undefined ? Math.max(0.02, Math.min(0.95, base + mod)) : undefined;
      const odds = p !== undefined ? `p≈${(p * 100).toFixed(0)}%` : '';
      const attr = card.attrs?.length ? card.attrs.join('/') : '';
      return `
        <button type="button" class="play-card ${camp ? 'camp' : ''} ${card.trap ? 'trap' : ''}" data-idx="${index}">
          <span class="name">${card.n}${camp ? ' [CAMP]' : ''}${card.trap ? ' · TRAP' : ''}</span>
          <span class="meta">${card.risk} · ${costLabel(card)}${odds ? ' · ' + odds : ''}</span>
          <span class="desc">${card.d}</span>
          ${attr ? `<span class="attrs">${attr}</span>` : ''}
        </button>
      `;
    })
    .join('');

  grid.querySelectorAll<HTMLButtonElement>('.play-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.idx);
      const outcome = playFromHand(campaign, idx);
      if (!outcome.ok) {
        campaign.state.log.push({
          week: campaign.state.week,
          kind: 'note',
          text: outcome.reason ?? 'Play failed'
        });
      }
      paint();
    });
  });
}

function paint(): void {
  renderLedger();
  renderPlayables();
  renderLog();
}

function newRun(seed?: number): void {
  const s =
    seed ??
    (Number((document.getElementById('seed-input') as HTMLInputElement | null)?.value) ||
      (Date.now() % 1_000_000));
  const input = document.getElementById('seed-input') as HTMLInputElement | null;
  if (input) input.value = String(s);
  campaign = createCampaign({ seed: s });
  startWeek(campaign);
  paint();
}

function endWeek(): void {
  if (campaign.state.over) {
    paint();
    return;
  }
  endWeekInPlace(campaign);
  if (!campaign.state.over) {
    startWeek(campaign);
  }
  paint();
}

function boot(): void {
  $('btn-new').addEventListener('click', () => newRun());
  $('btn-end').addEventListener('click', () => endWeek());
  newRun();
}

boot();
