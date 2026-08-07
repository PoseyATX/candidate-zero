/**
 * Zero open — one immersive beat, not a 3-step form.
 *
 * Who walks into the clerk's office with nothing. Tap a person, file, table.
 * Place defaults on first filing (open / east / taxes). Career refile keeps
 * locked identity via session layer. Seed is advanced only, not the star.
 */

import {
  PERSONAS,
  ISSUES,
  DISTRICTS,
  REGIONS,
  type SetupSelection
} from '../data/setup.js';
import { DAY_ONE_PERSONA_IDS } from '../engine/zero.js';
import { emblem } from './card-art.js';

/** Act I cast only — well-seated PA_* personas unlock much later. */
const NAMEPLATE_PERSONAS = PERSONAS.filter(p =>
  (DAY_ONE_PERSONA_IDS as readonly string[]).includes(p.id)
);

/** First-run place defaults — nobody picks a map before they have a name. */
export const FIRST_FILING_DEFAULTS = {
  issueId: 'taxes',
  districtId: 'open',
  regionId: 'east'
} as const;

export interface NameplateDraftState {
  personaId: string | null;
  /** Sticky seed string across re-renders (empty = random on file). */
  seedText: string;
  /** Expand advanced seed field. */
  showAdvanced: boolean;
}

export function emptyDraft(): NameplateDraftState {
  return {
    personaId: null,
    seedText: '',
    showAdvanced: false
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
  id: string,
  title: string,
  tag: string,
  body: string,
  selected: boolean
): string {
  return `
    <button type="button" class="id-card ${selected ? 'selected' : ''}" data-kind="persona" data-id="${esc(id)}"
      aria-pressed="${selected ? 'true' : 'false'}">
      <span class="id-card-emblem">${emblem('star')}</span>
      <span class="id-card-name">${esc(title)}</span>
      <span class="id-card-tag">${esc(tag)}</span>
      <span class="id-card-body">${esc(body)}</span>
    </button>`;
}

function resolveSeed(seedText: string): number {
  const n = Number(seedText);
  if (seedText.trim() !== '' && Number.isFinite(n) && n >= 0) return Math.floor(n);
  return Date.now() % 1_000_000;
}

function placeLine(): string {
  const i = ISSUES.find(x => x.id === FIRST_FILING_DEFAULTS.issueId);
  const d = DISTRICTS.find(x => x.id === FIRST_FILING_DEFAULTS.districtId);
  const r = REGIONS.find(x => x.id === FIRST_FILING_DEFAULTS.regionId);
  return [i?.n, d?.n, r?.n].filter(Boolean).join(' · ');
}

export function renderNameplateDraft(
  draft: NameplateDraftState,
  onChange: (next: NameplateDraftState) => void,
  onFile: (setup: SetupSelection, seed: number) => void
): void {
  const host = $('nameplate-draft');
  const seedText = readSeedFromDom() || draft.seedText;
  const p = PERSONAS.find(x => x.id === draft.personaId);
  const canFile = !!draft.personaId;

  const grid = NAMEPLATE_PERSONAS.map(persona =>
    identityCardHtml(
      persona.id,
      persona.n.replace(/^The /, ''),
      persona.tag,
      persona.d,
      draft.personaId === persona.id
    )
  ).join('');

  host.innerHTML = `
    <p class="id-step-label">The clerk's window is open</p>
    <p class="hint id-step-hint">
      Four people who are not well-seated. One of them is you. Legs, a voice, a filing deadline —
      no list, no machine, no blessing. Tap who walks in.
    </p>
    <div class="id-card-grid">${grid}</div>
    <p class="id-summary" aria-live="polite">${
      p
        ? esc(
            `${p.n.replace(/^The /, '')} · first filing · ${placeLine()} · you start with boots and a voice`
          )
        : 'Nobody has filed yet.'
    }</p>
    <div class="id-draft-actions">
      <button type="button" class="btn" id="id-advanced-toggle" aria-expanded="${draft.showAdvanced}">
        ${draft.showAdvanced ? 'Hide seed' : 'Seed (advanced)'}
      </button>
      ${
        draft.showAdvanced
          ? `<label class="id-seed-label">Seed
              <input id="seed-input" type="number" min="0" step="1" placeholder="random" value="${esc(seedText)}" />
            </label>`
          : `<input id="seed-input" type="hidden" value="${esc(seedText)}" />`
      }
      <button type="button" class="btn btn-gold" id="btn-start" ${canFile ? '' : 'disabled'}
        title="${canFile ? 'File and begin the primary' : 'Pick who walks in first'}">
        Walk in and file
      </button>
    </div>
  `;

  const seedInput = document.getElementById('seed-input') as HTMLInputElement | null;
  if (seedInput && seedInput.type !== 'hidden') {
    seedInput.addEventListener('input', () => {
      draft.seedText = seedInput.value;
    });
  }

  host.querySelectorAll('.id-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.id;
      if (!id) return;
      onChange({
        ...draft,
        personaId: id,
        seedText: readSeedFromDom() || draft.seedText
      });
    });
  });

  document.getElementById('id-advanced-toggle')?.addEventListener('click', () => {
    onChange({
      ...draft,
      seedText: readSeedFromDom() || draft.seedText,
      showAdvanced: !draft.showAdvanced
    });
  });

  const startBtn = document.getElementById('btn-start');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (!draft.personaId) return;
      const liveSeed = readSeedFromDom() || draft.seedText;
      const seed = resolveSeed(liveSeed);
      const input = document.getElementById('seed-input') as HTMLInputElement | null;
      if (input) input.value = String(seed);
      onFile(
        {
          personaId: draft.personaId,
          issueId: FIRST_FILING_DEFAULTS.issueId,
          districtId: FIRST_FILING_DEFAULTS.districtId,
          regionId: FIRST_FILING_DEFAULTS.regionId
        },
        seed
      );
    });
  }
}
