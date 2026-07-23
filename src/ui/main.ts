/**
 * CANDIDATE ZERO — boot / DOM wire only.
 * Mutable campaign lives in session.ts; paint leaves are pure modules.
 * PR-1 + 1b + 1c extract + PR-2 goal strip.
 */

import {
  PERSONAS,
  ISSUES,
  DISTRICTS,
  REGIONS,
  type SetupSelection
} from '../data/setup.js';
import { emblem } from './card-art.js';
import { wireTabs } from './tabs.js';
import { showTitle, showTutorial, backFromTutorial } from './screens.js';
import {
  startRun,
  requestNewRun,
  endWeek,
  closeGroundPicker,
  openSetupWithChronicle
} from './session.js';
import './styles.css';

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el;
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
    d?.d ?? '',
    r ? `${r.n}: petition mod ${r.petitionMod >= 0 ? '+' : ''}${r.petitionMod}.` : '',
    attr ? `Attr tilt: ${attr}` : ''
  ]
    .filter(Boolean)
    .join(' ');
}

function onStartRun(): void {
  const seed =
    Number((document.getElementById('seed-input') as HTMLInputElement | null)?.value) ||
    Date.now() % 1_000_000;
  const input = document.getElementById('seed-input') as HTMLInputElement | null;
  if (input) input.value = String(seed);
  startRun(currentSetup(), seed);
}

function boot(): void {
  fillSelects();
  wireTabs();
  ['sel-persona', 'sel-issue', 'sel-district', 'sel-region'].forEach(id => {
    $(id).addEventListener('change', updateBlurb);
  });
  $('title-emblem').innerHTML = emblem('star');
  $('btn-title-start').addEventListener('click', () => openSetupWithChronicle());
  $('btn-title-howto').addEventListener('click', () => showTutorial());
  $('btn-howto').addEventListener('click', () => showTutorial());
  $('btn-tut-back').addEventListener('click', () => backFromTutorial());
  $('btn-start').addEventListener('click', () => onStartRun());
  $('btn-new').addEventListener('click', () => requestNewRun());
  $('btn-end').addEventListener('click', () => endWeek());
  $('gp-cancel').addEventListener('click', () => closeGroundPicker());
  showTitle();
}

boot();
