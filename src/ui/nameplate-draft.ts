/**
 * Nameplate as a 3-step card draft (not a form).
 * 1 Persona → 2 Issue → 3 Place (district + region).
 * Identity is filed once; session layer persists it on Chronicle.
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
}

export function emptyDraft(): NameplateDraftState {
  return {
    step: 1,
    personaId: null,
    issueId: null,
    districtId: null,
    regionId: null
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

function identityCardHtml(
  kind: string,
  id: string,
  title: string,
  tag: string,
  body: string,
  selected: boolean,
  emblemKey: string
): string {
  return `
    <button type="button" class="id-card ${selected ? 'selected' : ''}" data-kind="${kind}" data-id="${esc(id)}"
      aria-pressed="${selected ? 'true' : 'false'}">
      <span class="id-card-emblem">${emblem(emblemKey)}</span>
      <span class="id-card-name">${esc(title)}</span>
      <span class="id-card-tag">${esc(tag)}</span>
      <span class="id-card-body">${esc(body)}</span>
    </button>`;
}

const PERSONA_EMBLEM: Record<string, string> = {
  teacher: 'star',
  veteran: 'seal',
  preacher: 'seal',
  smallbiz: 'coin',
  PA_CLO: 'network',
  PA_CON: 'seal',
  PA_CRA: 'coin',
  PA_INK: 'gavel',
  PA_DIP: 'network',
  PA_CHA: 'star'
};

export function renderNameplateDraft(
  draft: NameplateDraftState,
  onChange: (next: NameplateDraftState) => void,
  onFile: (setup: SetupSelection, seed: number) => void
): void {
  const host = $('nameplate-draft');
  const stepLabel =
    draft.step === 1 ? 'Step 1 of 3 — Who walks in' : draft.step === 2 ? 'Step 2 of 3 — What you run on' : 'Step 3 of 3 — Where you file';

  let grid = '';
  if (draft.step === 1) {
    grid = PERSONAS.map(p =>
      identityCardHtml(
        'persona',
        p.id,
        p.n.replace(/^The /, ''),
        p.tag,
        p.d,
        draft.personaId === p.id,
        PERSONA_EMBLEM[p.id] ?? 'star'
      )
    ).join('');
  } else if (draft.step === 2) {
    grid = ISSUES.map(i =>
      identityCardHtml('issue', i.id, i.n, i.tag, i.d, draft.issueId === i.id, 'seal')
    ).join('');
  } else {
    const districts = DISTRICTS.map(d =>
      identityCardHtml(
        'district',
        d.id,
        d.n,
        d.align,
        d.d,
        draft.districtId === d.id,
        d.trap ? 'hourglass' : 'gavel'
      )
    ).join('');
    const regions = REGIONS.map(r =>
      identityCardHtml('region', r.id, r.n, r.hook, r.d, draft.regionId === r.id, 'network')
    ).join('');
    grid =
      `<div class="id-place-block"><h3 class="id-subhead">District</h3><div class="id-card-grid">${districts}</div></div>` +
      `<div class="id-place-block"><h3 class="id-subhead">Region</h3><div class="id-card-grid">${regions}</div></div>`;
  }

  const canNext =
    (draft.step === 1 && !!draft.personaId) ||
    (draft.step === 2 && !!draft.issueId) ||
    (draft.step === 3 && !!draft.districtId && !!draft.regionId);

  const canFile =
    !!draft.personaId && !!draft.issueId && !!draft.districtId && !!draft.regionId;

  const p = PERSONAS.find(x => x.id === draft.personaId);
  const i = ISSUES.find(x => x.id === draft.issueId);
  const d = DISTRICTS.find(x => x.id === draft.districtId);
  const r = REGIONS.find(x => x.id === draft.regionId);
  const summary = [p?.n.replace(/^The /, ''), i?.n, d?.n, r?.n].filter(Boolean).join(' · ');

  host.innerHTML = `
    <p class="id-step-label">${stepLabel}</p>
    <p class="hint id-step-hint">${
      draft.step === 1
        ? 'Pick a persona card. This is who you are for the entire Chronicle — not just this filing.'
        : draft.step === 2
          ? 'Pick the issue that rides on every yard sign. It seeds your opening kit.'
          : 'District sets the field. Region sets the ground. Both bind.'
    }</p>
    ${draft.step < 3 ? `<div class="id-card-grid">${grid}</div>` : grid}
    <p class="id-summary" aria-live="polite">${summary ? esc(summary) : 'No picks yet.'}</p>
    <div class="id-draft-actions">
      ${draft.step > 1 ? `<button type="button" class="btn" id="id-back">Back</button>` : ''}
      ${draft.step < 3 ? `<button type="button" class="btn btn-gold" id="id-next" ${canNext ? '' : 'disabled'}>Next</button>` : ''}
      ${draft.step === 3 ? `<button type="button" class="btn btn-gold" id="id-file" ${canFile ? '' : 'disabled'}>File the nameplate</button>` : ''}
      <label class="id-seed-label">Seed <input id="seed-input" type="number" min="0" step="1" placeholder="random" /></label>
    </div>
  `;

  host.querySelectorAll('.id-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const kind = (btn as HTMLElement).dataset.kind;
      const id = (btn as HTMLElement).dataset.id;
      if (!kind || !id) return;
      const next = { ...draft };
      if (kind === 'persona') next.personaId = id;
      if (kind === 'issue') next.issueId = id;
      if (kind === 'district') next.districtId = id;
      if (kind === 'region') next.regionId = id;
      onChange(next);
    });
  });

  const back = document.getElementById('id-back');
  if (back) {
    back.addEventListener('click', () => {
      onChange({ ...draft, step: (Math.max(1, draft.step - 1) as DraftStep) });
    });
  }
  const nextBtn = document.getElementById('id-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (!canNext) return;
      onChange({ ...draft, step: (Math.min(3, draft.step + 1) as DraftStep) });
    });
  }
  const fileBtn = document.getElementById('id-file');
  if (fileBtn) {
    fileBtn.addEventListener('click', () => {
      if (!canFile || !draft.personaId || !draft.issueId || !draft.districtId || !draft.regionId) return;
      const seed =
        Number((document.getElementById('seed-input') as HTMLInputElement | null)?.value) ||
        Date.now() % 1_000_000;
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
