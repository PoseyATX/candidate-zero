/**
 * Filing an identity — four steps, and every one of them is a scene.
 *
 * This was a three-step card draft, which is to say three grids of nouns and a
 * button. It told a player nothing about what they were about to be. You picked
 * "Teacher · taxes · open · east" and the game began, and the first thing you
 * felt was the week-one HUD.
 *
 * What it is now:
 *
 *   1. WHO — the cold open. Each persona is a specific Tuesday: a hospital that
 *      closed, 214 votes, a portrait nobody has dusted. You also put your own
 *      name on the form here, because a candidate with your name on it is the
 *      cheapest and largest immersion lever in the whole game.
 *   2. WHAT — the issue, read back to you through the persona you just chose.
 *      The same issue lands differently on a blockwalker and an heir, and the
 *      screen says so, so "choices bind" is felt at the moment of choosing
 *      rather than asserted in a covenant document.
 *   3. WHERE — district and region, with the cost of each stated plainly.
 *   4. THE FILING — the form as a document: your name, the office, and the ten
 *      cards you are walking in with, liability included and named. Seeing that
 *      you own exactly ten small things is the hook. Then you sign it.
 *
 * The seed field stays on every step and `#btn-start` is still the verb that
 * begins the run, so the smoke path and anything else keyed to those ids keeps
 * working.
 */

import {
  PERSONAS,
  STARTING_PERSONAS,
  ISSUES,
  DISTRICTS,
  REGIONS,
  type SetupSelection
} from '../data/setup.js';
import { PERSONA_INTRINSIC, ZERO_LIABILITY_IDS, zeroStarterDeck } from '../data/plays-zero.js';
import { PLAYS } from '../data/plays.js';
import { emblem } from './card-art.js';

export type DraftStep = 1 | 2 | 3 | 4;

export interface NameplateDraftState {
  step: DraftStep;
  personaId: string | null;
  issueId: string | null;
  districtId: string | null;
  regionId: string | null;
  /** What the clerk writes on the form. Sticky across re-renders. */
  nameText: string;
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
    nameText: '',
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

function readNameFromDom(): string {
  const input = document.getElementById('candidate-name') as HTMLInputElement | null;
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

/**
 * A persona is not a tile. It is an opening paragraph with a ledger under it —
 * what you have, then the longer list of what you do not.
 */
function personaCardHtml(
  id: string,
  name: string,
  tag: string,
  open: string,
  has: string,
  lacks: string,
  selected: boolean
): string {
  return `
    <button type="button" class="id-card id-persona ${selected ? 'selected' : ''}"
      data-kind="persona" data-id="${esc(id)}" aria-pressed="${selected ? 'true' : 'false'}">
      <span class="id-card-emblem">${emblem('star')}</span>
      <span class="id-card-name">${esc(name)}</span>
      <span class="id-card-tag">${esc(tag)}</span>
      <span class="id-open">${esc(open)}</span>
      <span class="id-ledger">
        <span class="id-ledger-row"><b>Has</b> ${esc(has)}</span>
        <span class="id-ledger-row id-lacks"><b>Lacks</b> ${esc(lacks)}</span>
      </span>
    </button>`;
}

const ALIGN_COST: Record<string, string> = {
  safe: 'Nobody serious will spend money beating you here. Nobody serious will spend money helping you either.',
  competitive: 'Both sides will spend. You will be a line item in somebody\'s model by August.',
  wrong: 'You are running where your own name is a liability before you open your mouth.'
};

function stepPips(step: DraftStep): string {
  return [1, 2, 3, 4]
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

const cardName = (id: string): string => PLAYS.find(p => p.id === id)?.n ?? id;

/**
 * The ten cards, laid out before you sign. Duplicates shown as ×2 — the fact
 * that half your deck is two Knocks and a liability is the point of the screen.
 */
function openingHandHtml(personaId: string): string {
  const ten = zeroStarterDeck(personaId);
  if (!ten.length) return '';
  const counts = new Map<string, number>();
  for (const id of ten) counts.set(id, (counts.get(id) ?? 0) + 1);
  const intrinsic = new Set(PERSONA_INTRINSIC[personaId] ?? []);
  const chips = [...counts.entries()]
    .map(([id, n]) => {
      const cls = ZERO_LIABILITY_IDS.has(id)
        ? 'id-chip id-chip-liability'
        : intrinsic.has(id)
          ? 'id-chip id-chip-own'
          : 'id-chip';
      return `<span class="${cls}">${esc(cardName(id))}${n > 1 ? ` ×${n}` : ''}</span>`;
    })
    .join('');
  return `
    <div class="id-hand">
      <h3 class="id-subhead">What you are walking in with</h3>
      <div class="id-chips">${chips}</div>
      <p class="id-hand-note">Ten cards. Six that every candidate in Texas has ever had, four that are
        the specific fact of you — and one of those four is going to cost you.</p>
    </div>`;
}

export function renderNameplateDraft(
  draft: NameplateDraftState,
  onChange: (next: NameplateDraftState) => void,
  onFile: (setup: SetupSelection, seed: number, name: string) => void
): void {
  const host = $('nameplate-draft');
  // Prefer live DOM values if present (player typed between paints).
  const seedText = readSeedFromDom() || draft.seedText;
  const nameText = readNameFromDom() || draft.nameText;

  const persona = PERSONAS.find(x => x.id === draft.personaId);
  const issue = ISSUES.find(x => x.id === draft.issueId);
  const district = DISTRICTS.find(x => x.id === draft.districtId);
  const region = REGIONS.find(x => x.id === draft.regionId);

  const stepLabel =
    draft.step === 1
      ? 'Who walks in with nothing'
      : draft.step === 2
        ? 'What hill you die on'
        : draft.step === 3
          ? 'Where they will try to bury you'
          : 'The clerk needs a signature';

  const stepHint =
    draft.step === 1
      ? 'Four people file today. None of them should. Tap one.'
      : draft.step === 2
        ? 'One thing you will still be saying in November. Tap it.'
        : draft.step === 3
          ? 'Pick the seat, then the country it sits in.'
          : 'Read it back. This is what you are, until you lose.';

  let grid = '';
  if (draft.step === 1) {
    // The filing table only ever holds the startable four.
    grid = STARTING_PERSONAS.map(p =>
      personaCardHtml(
        p.id,
        p.n.replace(/^The /, ''),
        p.tag,
        p.open ?? p.d,
        p.has ?? '',
        p.lacks ?? '',
        draft.personaId === p.id
      )
    ).join('');
  } else if (draft.step === 2) {
    grid = ISSUES.map(i =>
      identityCardHtml('issue', i.id, i.n, i.tag, i.d, draft.issueId === i.id)
    ).join('');
  } else if (draft.step === 3) {
    const districts = DISTRICTS.map(d =>
      identityCardHtml(
        'district',
        d.id,
        d.n,
        d.align,
        `${d.d} ${ALIGN_COST[d.align] ?? ''}`,
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

  // The persona reads the issue back in its own voice. Same issue, four
  // different sentences — the bind, said out loud at the moment it happens.
  const lens =
    persona?.lens && issue ? persona.lens.replace('{issue}', issue.n.toLowerCase()) : '';

  const filedName = nameText.trim() || 'the candidate';

  let body = '';
  if (draft.step === 4 && canFile && persona) {
    // The filing itself: a document, not a summary line.
    body = `
      <div class="id-filing">
        <p class="id-filing-eyebrow">Application for a Place on the Ballot</p>
        <p class="id-filing-name">${esc(filedName)}</p>
        <dl class="id-filing-rows">
          <div><dt>Filing as</dt><dd>${esc(persona.n)}</dd></div>
          <div><dt>Running on</dt><dd>${esc(issue?.n ?? '')}</dd></div>
          <div><dt>District</dt><dd>${esc(district?.n ?? '')}</dd></div>
          <div><dt>Country</dt><dd>${esc(region?.n ?? '')}</dd></div>
        </dl>
        ${lens ? `<p class="id-lens">${esc(lens)}</p>` : ''}
        ${persona.liability ? `<p class="id-warning">${esc(persona.liability)}</p>` : ''}
        ${openingHandHtml(persona.id)}
      </div>`;
  } else {
    body = `${draft.step === 3 ? grid : `<div class="id-card-grid">${grid}</div>`}`;
  }

  const summary = [
    nameText.trim() || null,
    persona?.n.replace(/^The /, ''),
    issue?.n,
    district?.n,
    region?.n
  ]
    .filter(Boolean)
    .join(' · ');

  host.innerHTML = `
    <div class="id-pips" role="group" aria-label="Filing step ${draft.step} of 4">${stepPips(draft.step)}</div>
    <p class="id-step-label">${stepLabel}</p>
    <p class="hint id-step-hint">${esc(stepHint)}</p>
    ${
      draft.step === 1
        ? `<label class="id-name-label" for="candidate-name">The name on the form
             <input id="candidate-name" type="text" maxlength="32" autocomplete="off"
               placeholder="Your name" value="${esc(nameText)}" />
           </label>`
        : ''
    }
    ${draft.step === 2 && lens ? `<p class="id-lens id-lens-live">${esc(lens)}</p>` : ''}
    ${body}
    <p class="id-summary" aria-live="polite">${
      summary ? esc(summary) : 'Pick who you are, what you run on, and where you file.'
    }</p>
    <div class="id-draft-actions">
      ${draft.step > 1 ? `<button type="button" class="btn" id="id-back">Back</button>` : ''}
      <label class="id-seed-label">Seed
        <input id="seed-input" type="number" min="0" step="1" placeholder="random" value="${esc(seedText)}" />
      </label>
      ${
        draft.step === 4
          ? `<button type="button" class="btn btn-gold" id="btn-start" ${canFile ? '' : 'disabled'}
               title="${canFile ? 'Sign the application and begin the primary' : 'Finish the form first'}">
               Sign it
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

  const nameInput = document.getElementById('candidate-name') as HTMLInputElement | null;
  if (nameInput) {
    nameInput.addEventListener('input', () => {
      draft.nameText = nameInput.value;
    });
  }

  host.querySelectorAll('.id-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const kind = (btn as HTMLElement).dataset.kind;
      const id = (btn as HTMLElement).dataset.id;
      if (!kind || !id) return;
      const next: NameplateDraftState = {
        ...draft,
        nameText: readNameFromDom() || draft.nameText,
        seedText: readSeedFromDom() || draft.seedText
      };
      if (kind === 'persona') {
        next.personaId = id;
        // Pick is the action, not a two-tap dance.
        next.step = 2;
      } else if (kind === 'issue') {
        next.issueId = id;
        next.step = 3;
      } else if (kind === 'district') {
        next.districtId = id;
      } else if (kind === 'region') {
        next.regionId = id;
      }
      // Place is complete only when both halves are in; then the form is ready
      // to be read back and signed.
      if ((kind === 'district' || kind === 'region') && next.districtId && next.regionId) {
        next.step = 4;
      }
      onChange(next);
    });
  });

  const back = document.getElementById('id-back');
  if (back) {
    back.addEventListener('click', () => {
      onChange({
        ...draft,
        nameText: readNameFromDom() || draft.nameText,
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
        seed,
        (readNameFromDom() || draft.nameText).trim()
      );
    });
  }
}
