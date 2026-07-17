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
import type { CampaignOutcome, LegacyState, PlayCard, PlayOutcome, TraitId } from '../engine/types.js';
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
      <div><span class="k">AP</span> ${snap.ap}/${s.apMax}${snap.fieldAp ? ` +${snap.fieldAp} field` : ''}</div>
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
  $('terminal').classList.add('hidden');
}

function showSetup(): void {
  $('setup').classList.remove('hidden');
  $('game').classList.add('hidden');
  $('terminal').classList.add('hidden');
  renderChronicle();
}

function showTerminal(): void {
  $('setup').classList.add('hidden');
  $('game').classList.add('hidden');
  $('terminal').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
  const debtNote =
    terminalKind !== 'won_general' && (state.debt || state.obls.length)
      ? '<p class="debt-note">The bank still wants its money. Losing does not cancel the note.</p>'
      : '';
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
    <button type="button" class="play-card" data-choice="reelect">
      <span class="name">Stand for Reelection</span>
      <span class="desc">The wheel turns. File again for the same seat — this time you're the incumbent.</span>
    </button>
    <button type="button" class="play-card" data-choice="rest">
      <span class="name">Rest on the Win</span>
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
  const grid = $('terminal-choices');
  grid.innerHTML = paths
    .map(
      p => `
    <button type="button" class="play-card" data-path="${p.id}">
      <span class="name">${p.n}</span>
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
    <button type="button" class="play-card" data-trait="${t}">
      <span class="name">${TRAITS[t].n}</span>
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
  $('btn-start').addEventListener('click', () => startRun());
  $('btn-new').addEventListener('click', () => requestNewRun());
  $('btn-end').addEventListener('click', () => endWeek());
  showSetup();
}

boot();
