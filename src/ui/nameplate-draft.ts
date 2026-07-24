/**
 * Nameplate as a 3-step card draft (not a form).
 * 1 Persona → 2 Issue → 3 Place (district + region).
 * Identity is filed once; session layer persists it.
 * Seed survives re-renders so the player (and smoke) can set 4242 early.
 */

import {
  PERSONAS,
  ISSUES,
  DISTRICTS,
  REGIONS,
  type SetupSelection
} from '../data/setup.js';
import { emblem } from './card-art.js';

export type DraftStep = 1 | 2 | 3;

export interface NameplateDraftState {
  step: DraftStep;
  personaId: string | null;
  issueId: string | null;
  districtId: string | null;
  regionId: string | null;
  /** Sticky seed string across re-renders (empty = random on file). */
  seedText: string;
}

export function emptyDraft(): NameplateDraftState {
  return {
    step: 1,
    personaId: null,
    issueId: null,
    districtId: null,
    regionId: null,
    seedText: ''
  };
}

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function readSeedFromDom(): string {
  const input = document.getElementById('seed-input') as HTMLInputElement | null;
  return input?.value ?? '';
}

function identityCardHtml(
  kind: string,
  id: string,
  title: string,
  tag: string,
  body: string,
  selected: boolean
): string {
  // Star for every identity card — no incomplete emblem map.
  return `
    <button type="button" class="id-card ${selected ? 'selected' : ''}" data-kind="${kind}" data-id="${esc(id)}"
      aria-pressed="${selected ? 'true' : 'false'}">
      <span class="id-card-emblem">${emblem('star')}</span>
      <span class="id-card-name">${esc(title)}</span>
      <span class="id-card-tag">${esc(tag)}</span>
      <span class="id-card-body">${esc(body)}</span>
    </button>`;
}

function stepPips(step: DraftStep): string {
  return [1, 2, 3]
    .map(
      n =>
        `<span class="id-pip ${n === step ? 'active' : n < step ? 'done' : ''}" aria-hidden="true">${n}</span>`
    )
    .join('');
}

function resolveSeed(seedText: string): number {
  const n = Number(seedText);
  if (seedText.trim() !== '' && Number.isFinite(n) && n >= 0) return Math.floor(n);
  return Date.now() % 1_000_000;
}

export function renderNameplateDraft(
  draft: NameplateDraftState,
  onChange: (next: NameplateDraftState) => void,
  onFile: (setup: SetupSelection, seed: number) => void
): void {
  const host = $('nameplate-draft');
  // Prefer live DOM seed if present (player typed between paints).
  const seedText = readSeedFromDom() || draft.seedText;

  const stepLabel =
    draft.step === 1 ? 'Who are you' : draft.step === 2 ? 'What do you run on' : 'Where do you file';

  let grid = '';
  if (draft.step === 1) {
    grid = PERSONAS.map(p =>
      identityCardHtml(
        'persona',
        p.id,
        p.n.replace(/^The /, ''),
        p.tag,
        p.d,
        draft.personaId === p.id
      )
    ).join('');
  } else if (draft.step === 2) {
    grid = ISSUES.map(i =>
      identityCardHtml('issue', i.id, i.n, i.tag, i.d, draft.issueId === i.id)
    ).join('');
  } else {
    const districts = DISTRICTS.map(d =>
      identityCardHtml(
        'district',
        d.id,
        d.n,
        d.align,
        d.d,
        draft.districtId === d.id
      )
    ).join('');
    const regions = REGIONS.map(r =>
      identityCardHtml('region', r.id, r.n, r.hook, r.d, draft.regionId === r.id)
    ).join('');
    grid =
      `<div class="id-place-block"><h3 class="id-subhead">District</h3><div class="id-card-grid">${districts}</div></div>` +
      `<div class="id-place-block"><h3 class="id-subhead">Region</h3><div class="id-card-grid">${regions}</div></div>`;
  }

  const canFile =
    !!draft.personaId && !!draft.issueId && !!draft.districtId && !!draft.regionId;

  const p = PERSONAS.find(x => x.id === draft.personaId);
  const i = ISSUES.find(x => x.id === draft.issueId);
  const d = DISTRICTS.find(x => x.id === draft.districtId);
  const r = REGIONS.find(x => x.id === draft.regionId);
  const summary = [p?.n.replace(/^The /, ''), i?.n, d?.n, r?.n].filter(Boolean).join(' · ');

  host.innerHTML = `
    <div class="id-pips" aria-label="Filing step ${draft.step} of 3">${stepPips(draft.step)}</div>
    <p class="id-step-label">${stepLabel}</p>
    <p class="hint id-step-hint">Tap a card to choose. Your picks stick for the career until you refile.</p>
    ${draft.step < 3 ? `<div class="id-card-grid">${grid}</div>` : grid}
    <p class="id-summary" aria-live="polite">${summary ? esc(summary) : 'Pick who you are, what you run on, and where you file.'}</p>
    <div class="id-draft-actions">
      ${draft.step > 1 ? `<button type="button" class="btn" id="id-back">Back</button>` : ''}
      <label class="id-seed-label">Seed
        <input id="seed-input" type="number" min="0" step="1" placeholder="random" value="${esc(seedText)}" />
      </label>
      ${
        draft.step === 3
          ? `<button type="button" class="btn btn-gold" id="btn-start" ${canFile ? '' : 'disabled'}
               title="${canFile ? 'File this identity and begin the primary' : 'Pick district and region first'}">
               Begin primary
             </button>`
          : ''
      }
    </div>
  `;

  const seedInput = document.getElementById('seed-input') as HTMLInputElement | null;
  if (seedInput) {
    seedInput.addEventListener('input', () => {
      draft.seedText = seedInput.value;
    });
  }

  host.querySelectorAll('.id-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const kind = (btn as HTMLElement).dataset.kind;
      const id = (btn as HTMLElement).dataset.id;
      if (!kind || !id) return;
      const next: NameplateDraftState = {
        ...draft,
        seedText: readSeedFromDom() || draft.seedText
      };
      if (kind === 'persona') {
        next.personaId = id;
        // Auto-advance — pick is the action, not a two-tap dance.
        next.step = 2;
      } else if (kind === 'issue') {
        next.issueId = id;
        next.step = 3;
      } else if (kind === 'district') {
        next.districtId = id;
      } else if (kind === 'region') {
        next.regionId = id;
      }
      onChange(next);
    });
  });

  const back = document.getElementById('id-back');
  if (back) {
    back.addEventListener('click', () => {
      onChange({
        ...draft,
        seedText: readSeedFromDom() || draft.seedText,
        step: Math.max(1, draft.step - 1) as DraftStep
      });
    });
  }

  const startBtn = document.getElementById('btn-start');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (!canFile || !draft.personaId || !draft.issueId || !draft.districtId || !draft.regionId) {
        return;
      }
      const liveSeed = readSeedFromDom() || draft.seedText;
      const seed = resolveSeed(liveSeed);
      const input = document.getElementById('seed-input') as HTMLInputElement | null;
      if (input) input.value = String(seed);
      onFile(
        {
          personaId: draft.personaId,
          issueId: draft.issueId,
          districtId: draft.districtId,
          regionId: draft.regionId
        },
        seed
      );
    });
  }
}
