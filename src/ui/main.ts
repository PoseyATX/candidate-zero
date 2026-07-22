/**
 * CANDIDATE ZERO — mobile UI (presentation shell)
 * ================================================
 * A thin presentation layer over the pure engine's frozen API
 * (src/engine/api.ts) — the engine is the sole rules authority; this file
 * renders its `view()` and forwards taps as `apply()` commands. Ported from
 * the "Candidate Zero mobile UI" design (claude.ai/design): dark-walnut
 * theme, bottom-nav tabs (Play / Dossier / Log), tap-to-reveal card detail
 * sheets, ground / draft / act / weather ceremonies.
 *
 * Card descriptions are data revealed on tap (the detail sheet), never drawn
 * on the 2:3 card face — the face is name + art + cost + risk.
 */

import './styles.css';
import {
  setupOptions,
  newGame,
  view,
  apply,
  type EngineSnapshot,
  type RenderView,
  type ActionOption,
  type Command
} from '../engine/api.js';
import { emblemFor } from './card-art.js';

// ---- card art: raster where we have it, engraved emblem as the fallback ----
// No raster art currently ships — every card uses its engraved emblem. Add
// entries here as properly-sized (≈300px) card art lands under public/assets/.
const ASSET_BASE = import.meta.env.BASE_URL;
const CARD_ART: Record<string, string> = {};
void ASSET_BASE;

const OUTCOME_LABELS: Record<string, string> = {
  ongoing: 'In progress',
  missed_filing: 'You missed the filing deadline',
  lost_primary: 'You lost the primary',
  won_general: 'You won the general',
  lost_general: 'You lost the general',
  session_law: 'A law carries your name',
  session_survived: 'You survived the session',
  session_primaried: 'You were primaried out'
};

interface StageMeta { act: string; title: string; sub: string; }
function stageMeta(stage: string): StageMeta {
  switch (stage) {
    case 'primary': return { act: 'Act I', title: 'The Primary', sub: 'File the papers. Make the ballot by week eight.' };
    case 'general': return { act: 'Act II', title: 'The General', sub: 'Take the field. Turnout is the whole game now.' };
    case 'session': return { act: 'Act III', title: 'The Session', sub: 'You are sworn in. Move a bill before sine die.' };
    case 'waiting': return { act: 'Interim', title: 'The Waiting', sub: 'Keep the list warm until the next filing.' };
    default: return { act: '', title: stage, sub: '' };
  }
}

type SetupOpts = ReturnType<typeof setupOptions>;
interface Sel { personaId: string; issueId: string; districtId: string; regionId: string; }

interface UIState {
  screen: 'title' | 'setup' | 'game';
  setupOpts: SetupOpts;
  sel: Sel;
  snap: EngineSnapshot | null;
  view: RenderView | null;
  activeTab: 'play' | 'dossier' | 'log';
  detailIndex: number | null;
  pendingFieldIndex: number | null;
  toast: string;
  splash: StageMeta | null;
  weather: string | null;
  howto: boolean;
}

// ---- helpers ----
const esc = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmtMoney = (n: number): string => '$' + Math.round(n || 0).toLocaleString();
const oddsPct = (o: number | null | undefined): string => (o == null ? '—' : Math.round(o * 100) + '%');
const riskLc = (r: string): string => (r || '').toLowerCase();

function cardArtHtml(a: ActionOption): string {
  const img = CARD_ART[a.cardId];
  if (img) return `<img src="${esc(img)}" alt="" loading="lazy" decoding="async" />`;
  return `<span class="emblem">${emblemFor(a.cardId)}</span>`;
}

// ---- engine bootstrap ----
const opts = setupOptions();
const def = opts.default;
const state: UIState = {
  screen: 'title',
  setupOpts: opts,
  sel: {
    personaId: def.personaId ?? opts.personas[0].id,
    issueId: def.issueId ?? opts.issues[0].id,
    districtId: def.districtId ?? opts.districts[0].id,
    regionId: def.regionId ?? opts.regions[0].id
  },
  snap: null,
  view: null,
  activeTab: 'play',
  detailIndex: null,
  pendingFieldIndex: null,
  toast: '',
  splash: null,
  weather: null,
  howto: false
};

let toastTimer: ReturnType<typeof setTimeout> | undefined;
function showToast(msg: string): void {
  state.toast = msg;
  render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { state.toast = ''; render(); }, 2200);
}

function set(patch: Partial<UIState>): void {
  Object.assign(state, patch);
  render();
}

function actionByIndex(hi: number): ActionOption | undefined {
  return state.view?.actions.find(a => a.handIndex === hi);
}

// ---- commands ----
function startRun(): void {
  // `?seed=N` forces a deterministic run (used by smoke:ui / a11y so the CI
  // gates aren't flaky); otherwise a fresh random seed each run.
  const forced = Number(new URLSearchParams(location.search).get('seed'));
  const seed = (Number.isFinite(forced) && forced > 0 ? forced : (Math.random() * 2147483647)) >>> 0 || 1;
  const snap = newGame({ seed, setup: { ...state.sel } });
  const v = view(snap);
  set({
    screen: 'game', activeTab: 'play', detailIndex: null, pendingFieldIndex: null,
    snap, view: v, splash: stageMeta(v.stage), weather: null
  });
}

function applyCmd(cmd: Command): void {
  if (!state.snap) return;
  const res = apply(state.snap, cmd);
  if (!res.ok) {
    // Close whatever sheet issued the command so the toast reads as the reply.
    state.detailIndex = null;
    state.pendingFieldIndex = null;
    showToast(res.reason || 'Not allowed');
    return;
  }
  const prevStage = state.view?.stage;
  const nextView = view(res.snapshot);
  const outside = res.events.find(e => /^OUTSIDE/.test(e.text));
  const weather = outside ? outside.text.replace(/^OUTSIDE\s*[—-]\s*/, '') : null;
  if (!weather) {
    const meaningful = [...res.events].reverse().find(e => e.kind !== 'draw' && e.kind !== 'week' && e.text);
    if (meaningful) { showToast(meaningful.text); }
  }
  const splash = (!nextView.over && nextView.stage !== prevStage) ? stageMeta(nextView.stage) : null;
  set({
    snap: res.snapshot, view: nextView,
    detailIndex: null, pendingFieldIndex: null,
    weather, splash: splash || state.splash
  });
}

function playDetail(): void {
  const hi = state.detailIndex;
  if (hi === null) return;
  const a = actionByIndex(hi);
  if (!a) return;
  if (a.field) { set({ pendingFieldIndex: hi, detailIndex: null }); return; }
  applyCmd({ type: 'play', handIndex: hi });
}

// ---- render ----
const HOWTO = `
  <p>You are nobody, running for the Texas House. <b>Make the ballot</b> by week eight,
  win the <b>primary</b>, then the <b>general</b>, then move a bill in <b>session</b>.</p>
  <p>Each week you get action points. Spend them on the <b>cards</b> in your hand — tap a card
  to inspect it, then <b>Play</b>. <b>Field</b> plays ask where you work it (you vs. the opposition).
  <b>Camp actions</b> — petition, filing fee, the shop — sit below the hand.</p>
  <p>Results are <b>SAFE</b> (never a disaster), <b>STD</b> (honest variance), or <b>VOL</b>
  (swings big). The dice are impartial; there is no pity timer. <b>End Week</b> when you are done.</p>
`;

function titleScreen(): string {
  return `
  <section class="screen screen-title${state.screen === 'title' ? ' active' : ''}">
    <div class="title-container">
      <div class="title-star" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5l2.7 6.8 7.3.4-5.7 4.6 2 7.2L12 16.4 5.7 20.5l2-7.2-5.7-4.6 7.3-.4z"/></svg></div>
      <div class="title-badge">Alpha · v0.1</div>
      <h1 class="title-main">Candidate Zero</h1>
      <p class="title-sub">A Texas political ascent</p>
      <button class="btn btn-lg btn-primary" data-act="goSetup">Begin</button>
      <button class="btn btn-lg btn-outline" data-act="howto">How to Play</button>
    </div>
  </section>`;
}

function setupScreen(): string {
  const o = state.setupOpts;
  const optList = (arr: { id: string; n: string }[], selId: string) =>
    arr.map(x => `<option value="${esc(x.id)}"${x.id === selId ? ' selected' : ''}>${esc(x.n)}</option>`).join('');
  const selPersona = o.personas.find(p => p.id === state.sel.personaId);
  const selIssue = o.issues.find(i => i.id === state.sel.issueId);
  const blurb = selPersona
    ? `${selPersona.n} — ${selPersona.d}${selIssue ? ' Running on ' + selIssue.n.toLowerCase() + '.' : ''}`
    : 'Choices bind for this run.';
  return `
  <section class="screen screen-setup${state.screen === 'setup' ? ' active' : ''}">
    <div class="setup-container" data-scroll="setup">
      <h2 class="setup-title">Who are you?</h2>
      <p class="setup-hint">Choices bind for this run</p>
      <div class="setup-section">
        <label class="setup-label" for="sel-persona">Persona</label>
        <select class="setup-input" id="sel-persona" data-sel="personaId">${optList(o.personas, state.sel.personaId)}</select>
      </div>
      <div class="setup-section">
        <label class="setup-label" for="sel-issue">Issue</label>
        <select class="setup-input" id="sel-issue" data-sel="issueId">${optList(o.issues, state.sel.issueId)}</select>
      </div>
      <div class="setup-section">
        <label class="setup-label" for="sel-district">District</label>
        <select class="setup-input" id="sel-district" data-sel="districtId">${optList(o.districts, state.sel.districtId)}</select>
      </div>
      <div class="setup-section">
        <label class="setup-label" for="sel-region">Region</label>
        <select class="setup-input" id="sel-region" data-sel="regionId">${optList(o.regions, state.sel.regionId)}</select>
      </div>
      <div class="setup-blurb">${esc(blurb)}</div>
      <button class="btn btn-lg btn-primary" data-act="start" id="btn-file">File the Papers</button>
    </div>
  </section>`;
}

function cardHtml(a: ActionOption): string {
  return `
    <button class="card" data-act="tap-card" data-idx="${a.handIndex}" aria-label="${esc(a.name)} — ${esc(a.desc)}">
      <span class="card-edge ${riskLc(a.risk)}" aria-hidden="true"></span>
      <div class="card-header">${esc(a.name)}</div>
      <div class="card-art-box">${cardArtHtml(a)}</div>
      <div class="card-footer">
        <span class="card-cost">${esc(a.costLabel)}</span>
        <span class="card-risk ${riskLc(a.risk)}">${esc(a.risk)}</span>
      </div>
    </button>`;
}

function playTab(v: RenderView): string {
  const L = v.ledger;
  const hand = v.actions.filter(a => a.handIndex >= 0);
  const camp = v.actions.filter(a => a.handIndex < 0);
  const showBallot = !L.ballot && v.stage === 'primary';
  const ballot = showBallot
    ? `<div class="ballot-line"><span>Ballot access</span><strong>${L.signatures} / ${L.sigNeed} sigs</strong></div>`
    : '';
  const cards = hand.length
    ? hand.map(cardHtml).join('')
    : `<p class="log-empty">No plays in hand — end the week.</p>`;
  const campSection = camp.length
    ? `<div class="camp-section">
         <div class="camp-title">Camp actions</div>
         <div class="camp-list">
           ${camp.map(a => `<button class="camp-btn" data-act="tap-card" data-idx="${a.handIndex}">
             <span class="camp-name">${esc(a.name)}</span><span class="camp-cost">${esc(a.costLabel)}</span></button>`).join('')}
         </div>
       </div>`
    : '';
  return `
    <main class="tab-panel${state.activeTab === 'play' ? ' active' : ''}" data-scroll="tab-play">
      ${ballot}
      <p class="week-hint">${esc(v.stageLabel)} · spend AP on your hand</p>
      <div class="card-hand">${cards}</div>
      ${campSection}
    </main>`;
}

function dossierTab(v: RenderView): string {
  const L = v.ledger;
  const cell = (k: string, val: string | number) => `<div class="dossier-cell"><span class="k">${esc(k)}</span><span class="v">${esc(val)}</span></div>`;
  return `
    <div class="tab-panel${state.activeTab === 'dossier' ? ' active' : ''}" data-scroll="tab-dossier">
      <div class="dossier-block">
        <div class="dossier-label">Force</div>
        <div class="dossier-grid">
          ${cell('Contacts', L.contacts)}${cell('Name ID', L.nameID)}
          ${cell('Volunteers', L.volPool)}${cell('Momentum', L.momentum)}
          ${cell('Endorsements', L.endorsePts)}${cell('Favors', L.favors)}
          ${cell('Cash', fmtMoney(L.money))}${cell('Debt', fmtMoney(L.debt))}
          ${cell('Allies', L.alliesWarm)}${cell('Assets', L.assetsOwned)}
        </div>
      </div>
      <div class="dossier-block">
        <div class="dossier-label">Identity</div>
        <div class="dossier-grid">
          ${cell('Persona', v.identity.persona ?? '—')}${cell('Issue', v.identity.issue ?? '—')}
        </div>
      </div>
    </div>`;
}

function logTab(v: RenderView): string {
  const entries = [...v.log].reverse();
  const body = entries.length
    ? entries.map(e => `<div class="log-entry"><span class="w">W${esc(e.week)}</span>${esc(e.text)}</div>`).join('')
    : `<p class="log-empty">Nothing logged yet.</p>`;
  return `
    <div class="tab-panel${state.activeTab === 'log' ? ' active' : ''}" data-scroll="tab-log">
      <div class="log-list">${body}</div>
    </div>`;
}

function navIcon(kind: string): string {
  if (kind === 'play') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4h16v16H4z M8 9h8M8 13h5"/></svg>';
  if (kind === 'dossier') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/></svg>';
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 4h14v16l-3-2-3 2-3-2-3 2-2-2z M8 8h8M8 11h8M8 14h5"/></svg>';
}

function gameScreen(): string {
  const v = state.view;
  if (!v) return `<section class="screen screen-game${state.screen === 'game' ? ' active' : ''}"></section>`;
  const L = v.ledger;
  const tab = state.activeTab;
  const da = state.detailIndex !== null ? actionByIndex(state.detailIndex) : undefined;
  const pd = v.pendingDraft;

  const detail = da ? `
    <div class="card-detail active">
      <div class="detail-panel">
        <div class="detail-header">
          <h3 class="detail-title">${esc(da.name)}</h3>
          <button class="detail-close" data-act="close-detail" aria-label="Close">✕</button>
        </div>
        <p class="detail-desc">${esc(da.desc || da.tag || '')}</p>
        <div class="detail-stats">
          <span class="detail-stat"><strong>${oddsPct(da.approxOdds)}</strong> odds</span>
          <span class="detail-risk ${riskLc(da.risk)}">${esc(da.risk)}</span>
          ${da.field ? '<span class="detail-stat">· needs a ground</span>' : ''}
        </div>
        <button class="btn btn-primary btn-large" data-act="play-detail" id="btn-play-detail">Play — ${esc(da.costLabel)}</button>
      </div>
    </div>` : '';

  const ground = state.pendingFieldIndex !== null ? `
    <div class="modal-ground active">
      <div class="modal-content">
        <h3 class="modal-title">Where do you work?</h3>
        <div class="ground-list">
          ${v.grounds.map(g => `
            <button class="ground-btn" data-act="pick-ground" data-ground="${esc(g.id)}">
              <span class="ground-name">${esc(g.n)}</span>
              <div class="ground-meter-row"><span class="ground-meter-label">You</span>
                <span class="ground-meter-track"><span class="ground-meter-fill you" style="width:${Math.min(100, g.rapport * 4)}%"></span></span>
                <span class="ground-meter-num">${g.rapport}</span></div>
              <div class="ground-meter-row"><span class="ground-meter-label">Opp</span>
                <span class="ground-meter-track"><span class="ground-meter-fill opp" style="width:${Math.min(100, g.rivalRap * 4)}%"></span></span>
                <span class="ground-meter-num">${g.rivalRap}</span></div>
              <div class="ground-pool">Pool ${g.pool}</div>
            </button>`).join('')}
        </div>
        <button class="btn btn-outline" data-act="cancel-ground">Cancel</button>
      </div>
    </div>` : '';

  const draft = pd ? `
    <div class="modal-ground active">
      <div class="modal-content">
        <h3 class="modal-title">Phase ${pd.phase} — take one for the deck</h3>
        <div class="ground-list">
          ${pd.options.map((o, i) => `
            <button class="ground-btn" data-act="pick-draft" data-idx="${i}">
              <span class="ground-name">${esc(o.name)}</span>
              <span class="draft-risk">${esc(o.risk)}</span>
            </button>`).join('')}
        </div>
      </div>
    </div>` : '';

  const over = v.over ? `
    <div class="over-screen active">
      <div class="over-panel">
        <div class="over-label">Campaign over</div>
        <h2 class="over-outcome">${esc(OUTCOME_LABELS[v.outcome] || v.outcome)}</h2>
        <button class="btn btn-lg btn-primary" data-act="restart">New Run</button>
      </div>
    </div>` : '';

  const splash = state.splash ? `
    <div class="splash-screen active">
      <div class="splash-panel">
        <div class="splash-act">${esc(state.splash.act)}</div>
        <h2 class="splash-title">${esc(state.splash.title)}</h2>
        <p class="splash-sub">${esc(state.splash.sub)}</p>
        <button class="btn btn-lg btn-primary" data-act="dismiss-splash">Begin</button>
      </div>
    </div>` : '';

  const weather = state.weather ? `
    <div class="weather-screen active">
      <div class="weather-panel">
        <div class="weather-label">Outside · weather</div>
        <p class="weather-text">${esc(state.weather)}</p>
        <button class="btn btn-lg btn-outline" data-act="dismiss-weather">The world turns</button>
      </div>
    </div>` : '';

  const footer = tab === 'play'
    ? `<footer class="game-footer"><button class="btn btn-primary" data-act="end-week" id="btn-endweek">End Week</button></footer>`
    : '';

  return `
  <section class="screen screen-game${state.screen === 'game' ? ' active' : ''}">
    <div class="game-layout">
      <header class="game-header">
        <div class="header-identity">
          <div class="identity-persona">${esc(v.identity.persona ?? 'Candidate')}</div>
          <div class="identity-issue">${esc(v.identity.issue ?? '')}</div>
        </div>
        <div class="header-vitals">
          <div class="vital-item"><span class="vital-label">AP</span><span class="vital-value">${L.ap}</span></div>
          <div class="vital-item"><span class="vital-label">$</span><span class="vital-value">${fmtMoney(L.money)}</span></div>
          <div class="vital-item"><span class="vital-label">W</span><span class="vital-value">${v.stageWeek}/${v.weeksTotal}</span></div>
        </div>
      </header>

      ${playTab(v)}
      ${dossierTab(v)}
      ${logTab(v)}
      ${footer}

      <nav class="bottom-nav">
        <button class="nav-btn${tab === 'play' ? ' active' : ''}" data-act="tab" data-tab="play"><span class="nav-icon">${navIcon('play')}</span>Play</button>
        <button class="nav-btn${tab === 'dossier' ? ' active' : ''}" data-act="tab" data-tab="dossier"><span class="nav-icon">${navIcon('dossier')}</span>Dossier</button>
        <button class="nav-btn${tab === 'log' ? ' active' : ''}" data-act="tab" data-tab="log"><span class="nav-icon">${navIcon('log')}</span>Log</button>
      </nav>
    </div>
    ${detail}${ground}${draft}${over}${splash}${weather}
  </section>`;
}

function overlays(): string {
  const howto = state.howto ? `
    <div class="howto-screen active">
      <div class="howto-panel">
        <h2>How to Play</h2>
        ${HOWTO}
        <button class="btn btn-lg btn-primary" data-act="close-howto">Got it</button>
      </div>
    </div>` : '';
  const toast = `<div class="toast${state.toast ? ' show' : ''}">${esc(state.toast)}</div>`;
  return howto + toast;
}

const root = document.getElementById('app-frame')!;

// The UI re-renders the whole frame on each state change (simple + correct for
// a turn-based game). Preserve scroll position of the active scroll region so
// tapping a card deep in the hand doesn't yank you back to the top.
const scrollMem: Record<string, number> = {};
function render(): void {
  root.querySelectorAll<HTMLElement>('[data-scroll]').forEach(el => {
    if (el.offsetParent !== null) scrollMem[el.dataset.scroll!] = el.scrollTop; // visible only
  });
  root.innerHTML = titleScreen() + setupScreen() + gameScreen() + overlays();
  root.querySelectorAll<HTMLElement>('[data-scroll]').forEach(el => {
    const y = scrollMem[el.dataset.scroll!];
    if (y) el.scrollTop = y;
  });
}

// ---- one delegated click handler + select-change handler ----
root.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  // Tap the dimmed backdrop (not the sheet body) to dismiss. The draft sheet
  // is exempt — it requires a pick — and pendingFieldIndex gates the ground one.
  if (t.classList.contains('card-detail')) return set({ detailIndex: null });
  if (t.classList.contains('modal-ground') && state.pendingFieldIndex !== null) return set({ pendingFieldIndex: null });
  const el = t.closest<HTMLElement>('[data-act]');
  if (!el) return;
  const act = el.dataset.act!;
  const idx = el.dataset.idx !== undefined ? Number(el.dataset.idx) : null;
  switch (act) {
    case 'goSetup': set({ screen: 'setup' }); break;
    case 'howto': set({ howto: true }); break;
    case 'close-howto': set({ howto: false }); break;
    case 'start': startRun(); break;
    case 'tap-card': if (idx !== null && actionByIndex(idx)) set({ detailIndex: idx }); break;
    case 'close-detail': set({ detailIndex: null }); break;
    case 'play-detail': playDetail(); break;
    case 'pick-ground': {
      const hi = state.pendingFieldIndex;
      if (hi !== null && el.dataset.ground) applyCmd({ type: 'play', handIndex: hi, groundId: el.dataset.ground });
      break;
    }
    case 'cancel-ground': set({ pendingFieldIndex: null }); break;
    case 'pick-draft': if (idx !== null) applyCmd({ type: 'draft', option: idx }); break;
    case 'end-week': applyCmd({ type: 'endWeek' }); break;
    case 'tab': set({ activeTab: (el.dataset.tab as UIState['activeTab']) || 'play' }); break;
    case 'restart': set({ screen: 'setup', snap: null, view: null, splash: null, weather: null }); break;
    case 'dismiss-splash': set({ splash: null }); break;
    case 'dismiss-weather': set({ weather: null }); break;
  }
});

// Escape / hardware-back closes the topmost transient surface (never the
// blocking act-splash, which is a required acknowledgement).
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (state.howto) return set({ howto: false });
  if (state.weather) return set({ weather: null });
  if (state.detailIndex !== null) return set({ detailIndex: null });
  if (state.pendingFieldIndex !== null) return set({ pendingFieldIndex: null });
});

root.addEventListener('change', (e) => {
  const sel = (e.target as HTMLElement).closest<HTMLSelectElement>('select[data-sel]');
  if (!sel) return;
  const key = sel.dataset.sel as keyof Sel;
  state.sel = { ...state.sel, [key]: sel.value };
  render();
});

render();
