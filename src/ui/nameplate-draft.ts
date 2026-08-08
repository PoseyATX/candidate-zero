/**
 * Filing your candidacy — a scene at a counter, not a character-select screen.
 *
 * This has been rebuilt twice and was wrong both times, in the same way. First
 * it was a grid of cards. Then it was a grid of cards with cold-open paragraphs
 * on them. Then it was three more grids with stat lines on the faces. Every
 * version was the same object underneath — a menu — and no amount of better
 * copy on a tile turns a menu into an experience.
 *
 * What it is now: you are at the county clerk's counter at 4:41 on the last day
 * of filing, and Wanda Kettle is asking you the questions on the form. One at a
 * time. You answer in your own voice, she writes it down, and she says
 * something back, because she has watched four hundred people do this and has
 * an opinion about all of them.
 *
 * The rules this enforces, which are the actual difference:
 *
 *   · ONE question on screen. Never a wall of twelve options.
 *   · Answers are sentences you SAY, in first person, in quotes. No stat blocks
 *     on the face of a line of dialogue — the numbers are real and they are on
 *     the completed form at the end, which is where numbers belong.
 *   · She reacts to every single answer, specifically.
 *   · The application fills in beneath the conversation, in ink, as you talk.
 *     The document IS the interface.
 *
 * The `.id-card[data-kind][data-id]` hooks are kept on the answer lines so the
 * smoke and layout audits still drive the flow, and `#candidate-name`,
 * `#seed-input` and `#btn-start` keep their ids and their meaning.
 */

import {
  PERSONAS,
  STARTING_PERSONAS,
  ISSUES,
  DISTRICTS,
  REGIONS,
  previewAttrs,
  type SetupSelection
} from '../data/setup.js';
import { ORIGIN_QUESTIONS, resolveOrigins } from '../data/origin.js';
import { CLERK, CLERK_ASKS, CLERK_REPLIES } from '../data/clerk.js';
import { PERSONA_INTRINSIC, ZERO_LIABILITY_IDS, zeroStarterDeck } from '../data/plays-zero.js';
import { PLAYS } from '../data/plays.js';

/** The beats of the conversation, in the order she asks them. */
export const BEATS = [
  'name',
  'persona',
  'trade',
  'first',
  'skeleton',
  'issue',
  'place',
  'sign'
] as const;
export type DraftBeat = (typeof BEATS)[number];

export interface NameplateDraftState {
  beat: DraftBeat;
  personaId: string | null;
  /** questionId → answerId. The trade, the first room, the skeleton. */
  originIds: Record<string, string>;
  issueId: string | null;
  districtId: string | null;
  regionId: string | null;
  /** The last thing you said, so she can answer it on the next screen. */
  lastAnswerId: string | null;
  nameText: string;
  seedText: string;
}

export function emptyDraft(): NameplateDraftState {
  return {
    beat: 'name',
    personaId: null,
    originIds: {},
    issueId: null,
    districtId: null,
    regionId: null,
    lastAnswerId: null,
    nameText: '',
    seedText: ''
  };
}

function originList(draft: NameplateDraftState): string[] {
  return ORIGIN_QUESTIONS.map(q => draft.originIds[q.id]).filter(
    (id): id is string => !!id
  );
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
  return (document.getElementById('seed-input') as HTMLInputElement | null)?.value ?? '';
}
function readNameFromDom(): string {
  return (document.getElementById('candidate-name') as HTMLInputElement | null)?.value ?? '';
}

function resolveSeed(seedText: string): number {
  const n = Number(seedText);
  if (seedText.trim() !== '' && Number.isFinite(n) && n >= 0) return Math.floor(n);
  return Date.now() % 1_000_000;
}

const ATTR_NAME: Record<string, string> = {
  CLO: 'Close',
  CON: 'Conviction',
  CRA: 'Craft',
  INK: 'Ink',
  DIP: 'Diplomacy',
  CHA: 'Charm'
};

const ATTR_DOES: Record<string, string> = {
  CLO: 'Field work — doors, petitions, turnout',
  CON: 'Conviction — message, forums, holding a line',
  CRA: 'Craft — money, mail, oppo, machinery',
  INK: 'The written word — filings, letters, the rulebook',
  DIP: 'Rooms — chairs, endorsements, favours',
  CHA: 'Retail — phones, fish fries, winning a room'
};

/**
 * One thing you can say.
 *
 * Deliberately carries no numbers on its face. What it costs you and buys you
 * is on the finished form; putting it here turns the conversation back into the
 * spreadsheet this rebuild exists to get rid of.
 */
function line(kind: string, id: string, said: string, under: string, selected: boolean): string {
  return `
    <button type="button" class="say ${selected ? 'selected' : ''}" data-kind="${kind}" data-id="${esc(id)}"
      aria-pressed="${selected ? 'true' : 'false'}">
      <span class="say-quote">${esc(said)}</span>
      ${under ? `<span class="say-under">${esc(under)}</span>` : ''}
    </button>`;
}

const cardName = (id: string): string => PLAYS.find(p => p.id === id)?.n ?? id;

/** The application, filling in line by line as she writes. */
function formHtml(draft: NameplateDraftState, complete: boolean): string {
  const persona = PERSONAS.find(x => x.id === draft.personaId);
  const answers = resolveOrigins(originList(draft));
  const issue = ISSUES.find(x => x.id === draft.issueId);
  const district = DISTRICTS.find(x => x.id === draft.districtId);
  const region = REGIONS.find(x => x.id === draft.regionId);
  const name = draft.nameText.trim();

  const row = (label: string, value: string | undefined): string =>
    `<div class="form-row ${value ? 'inked' : ''}">
       <dt>${esc(label)}</dt>
       <dd>${value ? esc(value) : '<span class="form-blank"></span>'}</dd>
     </div>`;

  const rows = [
    row('Name on the ballot', name || undefined),
    row('Occupation', persona?.n),
    row('Previously', answers[0]?.n),
    row('First public remarks', answers[1]?.n),
    row('Disclosed', answers[2]?.n),
    row('Running on', issue?.n),
    row('District', district?.n),
    row('Region', region?.n)
  ].join('');

  return `
    <section class="filing-form ${complete ? 'complete' : ''}" aria-label="Application for a place on the ballot">
      <p class="form-eyebrow">Application for a Place on the Ballot</p>
      <dl class="form-rows">${rows}</dl>
    </section>`;
}

/** The six roots, on the finished form, where numbers belong. */
function attrTableHtml(sel: Partial<SetupSelection>): string {
  const attrs = previewAttrs(sel);
  const rows = Object.entries(attrs)
    .map(([id, v]) => {
      const delta = v - 10;
      const pp = (delta / 40) * 100;
      const cls = delta > 0 ? 'id-attr-up' : delta < 0 ? 'id-attr-down' : '';
      const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
      const ppTxt =
        delta === 0
          ? 'neutral'
          : `${sign}${Math.abs(pp).toFixed(1)}pp on ${ATTR_NAME[id]!.toLowerCase()} cards`;
      return `
        <div class="id-attr-row ${cls}">
          <span class="id-attr-k">${esc(ATTR_NAME[id] ?? id)}</span>
          <span class="id-attr-v">${v}</span>
          <span class="id-attr-what">${esc(ATTR_DOES[id] ?? '')}</span>
          <span class="id-attr-pp">${esc(ppTxt)}</span>
        </div>`;
    })
    .join('');
  return `
    <div class="id-attrs">
      <h3 class="id-subhead">What all that makes you</h3>
      <div class="id-attr-table">${rows}</div>
      <p class="id-hand-note">Ten is the neutral line. Every point either side is two and a half
        points of probability on any card tagged with it, for the whole run.</p>
    </div>`;
}

/** The ten cards you walk out with. */
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
      <h3 class="id-subhead">What you are walking out with</h3>
      <div class="id-chips">${chips}</div>
      <p class="id-hand-note">Ten cards. Six that every candidate in Texas has ever had, four that are
        the specific fact of you — and one of those four is going to cost you.</p>
    </div>`;
}

function beatIndex(beat: DraftBeat): number {
  return BEATS.indexOf(beat);
}

/** A quiet progress rule, not a scoreboard — how far down the form she is. */
function progressHtml(beat: DraftBeat): string {
  const pct = Math.round((beatIndex(beat) / (BEATS.length - 1)) * 100);
  return `<div class="counter-progress" role="presentation"><span style="width:${pct}%"></span></div>`;
}

export function renderNameplateDraft(
  draft: NameplateDraftState,
  onChange: (next: NameplateDraftState) => void,
  onFile: (setup: SetupSelection, seed: number, name: string) => void
): void {
  const host = $('nameplate-draft');
  const seedText = readSeedFromDom() || draft.seedText;
  const nameText = readNameFromDom() || draft.nameText;

  const persona = PERSONAS.find(x => x.id === draft.personaId);
  const issue = ISSUES.find(x => x.id === draft.issueId);
  const origins = originList(draft);
  const originsDone = origins.length === ORIGIN_QUESTIONS.length;
  const canFile =
    !!draft.personaId &&
    originsDone &&
    !!draft.issueId &&
    !!draft.districtId &&
    !!draft.regionId;

  const sel: Partial<SetupSelection> = {
    personaId: draft.personaId ?? undefined,
    regionId: draft.regionId ?? undefined,
    originIds: origins
  };

  // What she said about the last thing you told her. The issue beat has no
  // canned reply — it uses the persona's own lens, so the same issue lands
  // differently depending on who is saying it.
  let reply = draft.lastAnswerId ? (CLERK_REPLIES[draft.lastAnswerId] ?? '') : '';
  if (draft.beat === 'place' && persona?.lens && issue) {
    reply = `She writes it down. ${persona.lens.replace('{issue}', issue.n.toLowerCase())}`;
  }

  let ask = CLERK_ASKS[draft.beat] ?? '';
  let choices = '';

  if (draft.beat === 'name') {
    choices = `
      <label class="counter-name" for="candidate-name">
        <input id="candidate-name" type="text" maxlength="32" autocomplete="off"
          placeholder="Type it the way it goes on the ballot" value="${esc(nameText)}" />
      </label>
      <button type="button" class="say say-commit" data-kind="beat" data-id="name">
        <span class="say-quote">Slide the form back to her.</span>
      </button>`;
  } else if (draft.beat === 'persona') {
    choices = STARTING_PERSONAS.map(p =>
      line('persona', p.id, p.said ?? p.d, p.tag, draft.personaId === p.id)
    ).join('');
  } else if (draft.beat === 'trade' || draft.beat === 'first' || draft.beat === 'skeleton') {
    const q = ORIGIN_QUESTIONS.find(x => x.id === draft.beat);
    choices = (q?.answers ?? [])
      .map(a => line('origin', a.id, a.said ?? a.d, a.n, draft.originIds[q!.id] === a.id))
      .join('');
  } else if (draft.beat === 'issue') {
    choices = ISSUES.map(i =>
      line('issue', i.id, `"${i.n}."`, i.d, draft.issueId === i.id)
    ).join('');
  } else if (draft.beat === 'place') {
    const districts = DISTRICTS.map(d =>
      line('district', d.id, `"${d.n}."`, d.d, draft.districtId === d.id)
    ).join('');
    const regions = REGIONS.map(r =>
      line('region', r.id, `"${r.n}."`, r.d, draft.regionId === r.id)
    ).join('');
    choices =
      `<p class="counter-sub">The seat.</p>${districts}` +
      `<p class="counter-sub">And the country it sits in.</p>${regions}`;
  }

  const isSign = draft.beat === 'sign';
  if (isSign) ask = CLERK_ASKS.sign ?? '';

  host.innerHTML = `
    ${progressHtml(draft.beat)}
    ${
      draft.beat === 'name'
        ? `<p class="counter-scene">${esc(CLERK.scene)}</p>`
        : ''
    }
    <div class="counter">
      <p class="clerk-who">${esc(CLERK.name)} · ${esc(CLERK.title)}</p>
      ${reply ? `<p class="clerk-reply">${esc(reply)}</p>` : ''}
      ${ask ? `<p class="clerk-ask">${esc(ask)}</p>` : ''}
      ${isSign ? `<p class="clerk-reply">${esc(CLERK.sign)}</p>` : ''}
      <div class="say-list">${choices}</div>
    </div>
    ${formHtml(draft, isSign)}
    ${
      isSign && canFile && persona
        ? `<div class="filing-close">
             ${persona.liability ? `<p class="id-warning">${esc(persona.liability)}</p>` : ''}
             ${attrTableHtml(sel)}
             ${openingHandHtml(persona.id)}
           </div>`
        : ''
    }
    <div class="id-draft-actions">
      ${beatIndex(draft.beat) > 0 ? `<button type="button" class="btn" id="id-back">Back</button>` : ''}
      <label class="id-seed-label">Seed
        <input id="seed-input" type="number" min="0" step="1" placeholder="random" value="${esc(seedText)}" />
      </label>
      ${
        isSign
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
    try {
      nameInput.focus({ preventScroll: true });
    } catch {
      /* focus is a nicety, never a failure */
    }
  }

  const advance = (d: NameplateDraftState): DraftBeat => {
    // Place needs both halves before she is satisfied.
    if (d.beat === 'place') {
      return d.districtId && d.regionId ? 'sign' : 'place';
    }
    const i = beatIndex(d.beat);
    return BEATS[Math.min(i + 1, BEATS.length - 1)]!;
  };

  host.querySelectorAll('.say').forEach(btn => {
    btn.addEventListener('click', () => {
      const kind = (btn as HTMLElement).dataset.kind;
      const id = (btn as HTMLElement).dataset.id;
      if (!kind || !id) return;
      const next: NameplateDraftState = {
        ...draft,
        nameText: readNameFromDom() || draft.nameText,
        seedText: readSeedFromDom() || draft.seedText
      };
      if (kind === 'beat') {
        next.lastAnswerId = null;
      } else if (kind === 'persona') {
        next.personaId = id;
        next.lastAnswerId = id;
      } else if (kind === 'origin') {
        const q = ORIGIN_QUESTIONS.find(x => x.answers.some(a => a.id === id));
        if (!q) return;
        next.originIds = { ...draft.originIds, [q.id]: id };
        next.lastAnswerId = id;
      } else if (kind === 'issue') {
        next.issueId = id;
        next.lastAnswerId = null; // her reply here is the persona's own lens
      } else if (kind === 'district') {
        next.districtId = id;
        next.lastAnswerId = DISTRICTS.find(d => d.id === id)?.align ?? null;
      } else if (kind === 'region') {
        next.regionId = id;
      }
      next.beat = advance(next);
      onChange(next);
    });
  });

  const back = document.getElementById('id-back');
  if (back) {
    back.addEventListener('click', () => {
      const i = beatIndex(draft.beat);
      onChange({
        ...draft,
        nameText: readNameFromDom() || draft.nameText,
        seedText: readSeedFromDom() || draft.seedText,
        lastAnswerId: null,
        beat: BEATS[Math.max(0, i - 1)]!
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
          regionId: draft.regionId,
          originIds: origins
        },
        seed,
        (readNameFromDom() || draft.nameText).trim()
      );
    });
  }
}
