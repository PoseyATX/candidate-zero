/**
 * Terminal outcome / path / trait / chronicle UI — leaf (no session import).
 * Path/trait faces match Main card contract: emblem + title only.
 * Full copy lives in a tap detail sheet (same idea as play dossier).
 */

import type { Campaign } from '../engine/loop.js';
import {
  buildPaths,
  buildEpithet,
  buildGrowthLine,
  TRAITS,
  romanRun,
  type InterimPath
} from '../engine/legacy.js';
import type { CampaignOutcome, LegacyState, TraitId } from '../engine/types.js';
import { emblem } from './card-art.js';

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&')
    .replace(/"/g, '"')
    .replace(/</g, '<')
    .replace(/>/g, '>');
}

export interface TerminalRenderCtx {
  campaign: Campaign;
  kind: CampaignOutcome;
  share: number;
  legacy: LegacyState;
  onReelect: () => void;
  onRest: () => void;
  onPathSelected: (path: InterimPath) => void;
  onTraitSelected: (path: InterimPath, traitId: TraitId) => void;
}

export function renderTerminalOutcome(ctx: TerminalRenderCtx): void {
  const { campaign, kind, share } = ctx;
  const state = campaign.state;
  const titles: Record<CampaignOutcome, string> = {
    ongoing: '',
    missed_filing: 'Never Made the Ballot',
    lost_primary: 'Primary Lost',
    won_general: 'The Seat Is Won',
    lost_general: 'The General’s Wall',
    session_law: 'Sine Die — Law',
    session_survived: 'Sine Die — Seat Holds',
    session_primaried: 'Sine Die — Primaried Out'
  };
  const epithet = buildEpithet(state, kind, share);
  const growth = buildGrowthLine(state);
  let debtNote = '';
  if (kind === 'won_general' && (state.debt || state.pacBridgeDebt || state.obls.includes('OB1'))) {
    debtNote =
      state.pacBridgeDebt || state.obls.includes('OB1')
        ? `<p class="debt-note">Notes retire cheap on a win — but the PAC still holds a Session claim. Committee work will not be free.</p>`
        : `<p class="debt-note">Self-loan retires cheap at the swearing-in. Homestead risk is paid.</p>`;
  } else if (kind !== 'won_general' && (state.debt || state.obls.length)) {
    const crisis =
      (state.debt || 0) >= 5000
        ? ' Crisis territory: keep running with worse economics, or go home.'
        : '';
    debtNote = `<p class="debt-note">The bank still wants its money ($${state.debt || 0}). Losing does not cancel the note.${crisis}</p>`;
  }
  const sessionWin = kind === 'session_law' || kind === 'session_survived';
  const billLine = state.bill
    ? `<p class="bill-epitaph"><b>Signature bill:</b> ${esc(state.bill.title)} — ${esc(state.bill.status)}.</p>`
    : '';
  const nextHint = sessionWin
    ? 'Sine die. Reelection is a new cycle — you skip petition as the incumbent.'
    : kind === 'session_primaried'
      ? 'The gavel fell and the seat broke. Choose how the next two years go.'
      : kind === 'won_general'
        ? 'Bug: general win should enter Session in-engine. Report if you see this screen without Session.'
        : 'Two years until the next filing. Choose how you spend them.';

  $('terminal-head').innerHTML = `
    <h2>${titles[kind]}</h2>
    <p class="epithet">${esc(epithet)}</p>
    ${billLine}
    ${debtNote}
    ${growth ? `<p class="growth">${esc(growth)}</p>` : ''}
    <p class="hint">${esc(nextHint)}</p>
  `;

  if (sessionWin || kind === 'won_general') {
    renderTerminalWinChoices(ctx);
  } else {
    renderTerminalPaths(ctx);
  }
}

function faceCardHtml(
  title: string,
  emblemKey: string,
  dataAttr: string,
  dataValue: string
): string {
  return `
    <button type="button" class="play-card choice-card" ${dataAttr}="${esc(dataValue)}"
      aria-label="${esc(title)}. Tap for details.">
      <span class="card-art"><span class="card-emblem">${emblem(emblemKey)}</span></span>
      <span class="name">${esc(title)}</span>
    </button>`;
}

function renderPathDetail(
  host: HTMLElement,
  title: string,
  body: string,
  confirmLabel: string,
  onConfirm: () => void,
  onBack: () => void
): void {
  host.innerHTML = `
    <div class="terminal-detail" style="grid-column:1/-1">
      <p class="hint" style="margin-bottom:0.35rem">Path</p>
      <h3 class="terminal-detail-title">${esc(title)}</h3>
      <p class="terminal-detail-body">${esc(body)}</p>
      <div class="row-actions" style="display:flex;gap:0.5rem;flex-wrap:wrap">
        <button type="button" class="btn" id="td-back">Back</button>
        <button type="button" class="btn btn-gold" id="td-confirm">${esc(confirmLabel)}</button>
      </div>
    </div>`;
  document.getElementById('td-back')?.addEventListener('click', onBack);
  document.getElementById('td-confirm')?.addEventListener('click', onConfirm);
}

function renderTerminalWinChoices(ctx: TerminalRenderCtx): void {
  const grid = $('terminal-choices');
  const choices = [
    {
      id: 'reelect',
      n: 'Stand for Reelection',
      d: 'Next cycle as incumbent — new primary; you skip petition.',
      emblem: 'star'
    },
    {
      id: 'rest',
      n: 'Close the book on this term',
      d: 'Step off the trail. The county keeps the record of this term.',
      emblem: 'cup'
    }
  ];
  const paint = () => {
    grid.innerHTML = choices
      .map(c => faceCardHtml(c.n, c.emblem, 'data-choice', c.id))
      .join('');
    grid.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = choices.find(x => x.id === btn.dataset.choice);
        if (!c) return;
        renderPathDetail(
          grid,
          c.n,
          c.d,
          c.id === 'reelect' ? 'Stand for reelection' : 'Close the book',
          () => {
            if (c.id === 'reelect') ctx.onReelect();
            else ctx.onRest();
          },
          paint
        );
      });
    });
  };
  paint();
}

function renderTerminalPaths(ctx: TerminalRenderCtx): void {
  const paths = buildPaths(ctx.campaign.state, ctx.share);
  const pathEmblems: Record<string, string> = {
    perennial: 'pennant',
    advocate: 'megaphone',
    staffer: 'clipboard',
    home: 'cup',
    exmember: 'star',
    senate: 'star',
    statewide: 'star'
  };
  const grid = $('terminal-choices');

  const paint = () => {
    grid.innerHTML = paths
      .map(p => faceCardHtml(p.n, pathEmblems[p.id] ?? 'star', 'data-path', p.id))
      .join('');
    grid.querySelectorAll<HTMLButtonElement>('[data-path]').forEach(btn => {
      btn.addEventListener('click', () => {
        const path = paths.find(p => p.id === btn.dataset.path);
        if (!path) return;
        renderPathDetail(
          grid,
          path.n,
          path.d,
          'Take this path',
          () => {
            ctx.onPathSelected(path);
            renderTerminalTraits(ctx, path);
          },
          paint
        );
      });
    });
  };
  paint();
}

function renderTerminalTraits(ctx: TerminalRenderCtx, path: InterimPath): void {
  const grid = $('terminal-choices');
  const traits = path.traits;

  const paint = () => {
    grid.innerHTML =
      `<p class="hint" style="grid-column:1/-1">Two years pass. What did they leave you?</p>` +
      traits
        .map(t => faceCardHtml(TRAITS[t].n, 'quill', 'data-trait', t))
        .join('');
    grid.querySelectorAll<HTMLButtonElement>('[data-trait]').forEach(btn => {
      btn.addEventListener('click', () => {
        const traitId = btn.dataset.trait as TraitId;
        const t = TRAITS[traitId];
        if (!t) return;
        renderPathDetail(
          grid,
          t.n,
          t.d,
          'Carry this forward',
          () => ctx.onTraitSelected(path, traitId),
          paint
        );
      });
    });
  };
  paint();
}

export function renderChronicle(
  legacy: LegacyState,
  onBurn: () => LegacyState,
  setLegacy: (l: LegacyState) => void
): void {
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
          `<p><b>Run ${romanRun(i)}.</b> ${esc(r.epithet)} ${r.interim ? `<i>${esc(r.interim)}</i>` : ''}</p>`
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
        const cleared = onBurn();
        setLegacy(cleared);
        renderChronicle(cleared, onBurn, setLegacy);
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
