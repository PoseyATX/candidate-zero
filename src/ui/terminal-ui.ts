/**
 * Terminal outcome / path / trait / chronicle UI — leaf (no session import).
 * Receives campaign + legacy + callbacks from the orchestrator.
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
        ? `<p class="debt-note">Notes retire cheap on a win — but the PAC still holds a Session claim (OB1). Committee work will not be free.</p>`
        : `<p class="debt-note">Self-loan retires cheap at the swearing-in (token fee). Homestead risk is paid; no Session leash.</p>`;
  } else if (kind !== 'won_general' && (state.debt || state.obls.length)) {
    const crisis =
      (state.debt || 0) >= 5000
        ? ' Crisis territory: keep running with worse economics, or go home — the PAC Check is the structured relief valve next cycle.'
        : '';
    debtNote = `<p class="debt-note">The bank still wants its money ($${state.debt || 0}). Losing does not cancel the note — it compounds into the next cycle.${crisis}</p>`;
  }
  const sessionWin = kind === 'session_law' || kind === 'session_survived';
  const billLine = state.bill
    ? `<p class="bill-epitaph"><b>Signature bill:</b> ${state.bill.title} — ${state.bill.status} (stage ${state.bill.pipelineStage}).</p>`
    : '';
  const nextHint = sessionWin
    ? 'Sine die. You finished Session on this run. Reelection starts a NEW election cycle (incumbent primary) — not a Session skip.'
    : kind === 'session_primaried'
      ? 'The gavel fell and the seat broke. Choose a waiting path — Act IV banks for the next filing as the same persona.'
      : kind === 'won_general'
        ? 'Bug: general win should enter Session in-engine. Report if you see this screen without Session.'
        : 'Two years until the next filing. Choose a path — Act IV Waiting, then re-file as the same persona.';

  $('terminal-head').innerHTML = `
    <h2>${titles[kind]}</h2>
    <p class="epithet">${epithet}</p>
    ${billLine}
    ${debtNote}
    ${growth ? `<p class="growth">${growth}</p>` : ''}
    <p class="hint">${nextHint}</p>
  `;

  if (sessionWin || kind === 'won_general') {
    renderTerminalWinChoices(ctx);
  } else {
    renderTerminalPaths(ctx);
  }
}

function renderTerminalWinChoices(ctx: TerminalRenderCtx): void {
  const grid = $('terminal-choices');
  grid.innerHTML = `
    <button type="button" class="play-card choice-card" data-choice="reelect">
      <span class="name">Stand for Reelection</span>
      <span class="orn"><i></i>&#10022;<i></i></span>
      <span class="card-art">${emblem('star')}</span>
      <span class="desc">Next election cycle as incumbent — new primary (you skip petition). Session already finished.</span>
    </button>
    <button type="button" class="play-card choice-card" data-choice="rest">
      <span class="name">Close the book on this term</span>
      <span class="orn"><i></i>&#10022;<i></i></span>
      <span class="card-art">${emblem('cup')}</span>
      <span class="desc">Back to setup. Chronicle keeps this ballad entry. Not a soft-reset mid-Session.</span>
    </button>
  `;
  grid.querySelector('[data-choice="reelect"]')?.addEventListener('click', () => ctx.onReelect());
  grid.querySelector('[data-choice="rest"]')?.addEventListener('click', () => ctx.onRest());
}

function renderTerminalPaths(ctx: TerminalRenderCtx): void {
  const paths = buildPaths(ctx.campaign.state, ctx.share);
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
      if (path) {
        ctx.onPathSelected(path);
        renderTerminalTraits(ctx, path);
      }
    });
  });
}

function renderTerminalTraits(ctx: TerminalRenderCtx, path: InterimPath): void {
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
      ctx.onTraitSelected(path, traitId);
    });
  });
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
