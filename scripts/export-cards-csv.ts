/**
 * Export all play cards, interim/session verbs, and shop assets → data/cards.csv
 * Run: npx tsx scripts/export-cards-csv.ts
 *
 * CSV is the human-auditable catalog. Code in src/data/* remains mechanical source of truth.
 * Re-export after any card add/edit; balance columns are scaffold for authoring discipline.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAYS } from '../src/data/plays.js';
import { WAITING_PLAYS } from '../src/data/waiting-plays.js';
import { SESSION_PLAYS } from '../src/data/session-plays.js';
import { ASSETS } from '../src/data/assets.js';
import type { PlayCard } from '../src/engine/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

/** Normalize curly quotes / dashes so CSV stays ASCII-friendly in all editors. */
function scrub(s: string): string {
  return s
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u00D7/g, 'x')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ');
}

function csvEscape(v: string | number | boolean | undefined | null): string {
  if (v === undefined || v === null) return '';
  const s = scrub(String(v));
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const COLS = [
  'catalog',
  'source_file',
  'id',
  'name',
  'tag',
  'risk',
  'trap_risk_flag',
  'field',
  'cost_ap',
  'cost_money',
  'cost_vol',
  'cost_momentum',
  'cost_favor',
  'phases',
  'attrs',
  'weight',
  'has_odds',
  'has_run',
  'has_show',
  'has_req',
  'description',
  'role',
  'path_labor_money_neutral',
  'stage_primary_general_session_interim',
  'economy_target',
  'balance_notes',
  'status',
] as const;

type Row = Record<(typeof COLS)[number], string | number | boolean>;

function emptyBalance(): Pick<
  Row,
  | 'role'
  | 'path_labor_money_neutral'
  | 'stage_primary_general_session_interim'
  | 'economy_target'
  | 'balance_notes'
  | 'status'
> {
  return {
    role: '',
    path_labor_money_neutral: 'neutral',
    stage_primary_general_session_interim: '',
    economy_target: '',
    balance_notes: '',
    status: 'live',
  };
}

function playRow(c: PlayCard, source: string): Row {
  const cost = c.cost ?? {};
  const base: Row = {
    catalog: 'play',
    source_file: source,
    id: c.id,
    name: c.n,
    tag: c.tag ?? '',
    risk: c.risk,
    trap_risk_flag: !!c.trap,
    field: !!c.field,
    cost_ap: cost.a ?? '',
    cost_money: cost.$ ?? '',
    cost_vol: cost.vp ?? '',
    cost_momentum: cost.m ?? '',
    cost_favor: cost.fav ?? '',
    phases: (c.ph ?? []).join('|'),
    attrs: (c.attrs ?? []).join('|'),
    weight: c.w ?? '',
    has_odds: typeof c.odds === 'function',
    has_run: typeof c.run === 'function',
    has_show: typeof c.show === 'function',
    has_req: typeof c.req === 'function',
    description: (c.d ?? '').replace(/\r?\n/g, ' ').trim(),
    ...emptyBalance(),
  };
  return enrichPlay(base);
}

function enrichPlay(row: Row): Row {
  const id = String(row.id);
  const risk = String(row.risk);
  const stages: string[] = [];
  const ph = String(row.phases)
    .split('|')
    .filter(Boolean)
    .map(Number);
  if (ph.includes(1) || ph.includes(2)) stages.push('primary');
  if (ph.includes(3)) stages.push('general');
  if (ph.includes(0)) stages.push('interim');
  if (ph.includes(4)) stages.push('session');

  let path = 'neutral';
  if (['PL04', 'PL16', 'PL21B'].includes(id)) path = 'labor';
  else if (['PL05', 'PL20', 'PL21', 'PL03', 'PL13', 'PL22', 'PL39'].includes(id)) path = 'money';
  else if (Number(row.cost_money) > 0 && Number(row.cost_vol) > 0) path = 'hybrid';
  else if (Number(row.cost_money) > 0) path = 'money';
  else if (Number(row.cost_vol) > 0) path = 'labor';

  let role = 'utility';
  if (id === 'PL01' || id === 'PL02') role = 'grind_safe';
  else if (id === 'PL04' || id === 'PL05') role = 'ballot_access';
  else if (id === 'PL19') role = 'gotv';
  else if (row.trap_risk_flag) role = 'risk_trap';
  else if (risk === 'VOL') role = 'high_variance';
  else if (risk === 'SAFE' && !row.cost_money) role = 'safe_labor';

  let economy = '';
  if (id === 'PL01' || id === 'PL02') economy = 'contacts+rapport';
  else if (id === 'PL04') economy = 'signatures';
  else if (id === 'PL05') economy = 'ballot_for_cash';
  else if (id === 'PL13') economy = 'money_small_dollar';
  else if (id === 'PL19') economy = 'turnout_edge';
  else if (id === 'PL20' || id === 'PL21') economy = 'money_with_obligation';
  else if (id === 'PL14' || id === 'PL11' || id === 'PL12') economy = 'endorsement_gatekeepers';
  else if (id === 'PL09' || id === 'PL10' || id === 'PL07') economy = 'name_id_media';
  else if (id === 'PL16' || id === 'PL21B' || id === 'PL39') economy = 'volunteers';
  else if (id === 'PL15' || id === 'PL17' || id === 'PL22') economy = 'contrast_prep';

  return {
    ...row,
    role,
    path_labor_money_neutral: path,
    stage_primary_general_session_interim: [...new Set(stages)].join('|'),
    economy_target: economy,
  };
}

const rows: Row[] = [];

// PLAYS already includes wave4 via ALL_PLAYS
for (const c of PLAYS) {
  const source = c.id.startsWith('PL') && Number(c.id.replace(/\D/g, '')) >= 16 && c.id !== 'PL17' && c.id !== 'PL19'
    ? 'plays-wave4.ts'
    : 'plays.ts';
  // more reliable: wave4 ids
  const wave4 = new Set(['PL16', 'PL18', 'PL20', 'PL21', 'PL22', 'PL21B', 'PL39']);
  rows.push(playRow(c, wave4.has(c.id) ? 'plays-wave4.ts' : 'plays.ts'));
}

// Interim / "waiting" verbs — full PlayCards on this line (WAITING_PLAYS).
for (const c of WAITING_PLAYS) {
  const row = playRow(c, 'waiting-plays.ts');
  row.catalog = 'interim';
  row.role = 'offseason';
  row.stage_primary_general_session_interim = 'interim';
  row.economy_target = row.economy_target || 'residue';
  rows.push(row);
}

// Session motions — full PlayCards on this line (SESSION_PLAYS).
for (const c of SESSION_PLAYS) {
  const row = playRow(c, 'session-plays.ts');
  row.catalog = 'session';
  row.role = 'session';
  row.stage_primary_general_session_interim = 'session';
  row.economy_target = row.economy_target || 'capital_or_favor';
  rows.push(row);
}

// Shop assets — ASSETS record (id -> AssetDef) on this line.
for (const [id, a] of Object.entries(ASSETS)) {
  rows.push({
    catalog: 'asset',
    source_file: 'assets.ts',
    id,
    name: a.n,
    tag: 'shop',
    risk: 'SAFE',
    trap_risk_flag: false,
    field: false,
    cost_ap: '',
    cost_money: a.cost || '',
    cost_vol: a.vcost ?? '',
    cost_momentum: '',
    cost_favor: '',
    phases: '',
    attrs: '',
    weight: '',
    has_odds: false,
    has_run: false,
    has_show: false,
    has_req: typeof a.req === 'function',
    description: (a.d ?? '').replace(/\r?\n/g, ' ').trim(),
    role: 'shop_sink',
    path_labor_money_neutral: 'money',
    stage_primary_general_session_interim: 'primary|general|session|interim',
    economy_target: 'money_sink_kit',
    balance_notes: '',
    status: 'live',
  });
}

const seen = new Set<string>();
const unique = rows.filter((r) => {
  const id = String(r.id);
  if (seen.has(id)) return false;
  seen.add(id);
  return true;
});

unique.sort(
  (a, b) =>
    String(a.catalog).localeCompare(String(b.catalog)) ||
    String(a.id).localeCompare(String(b.id), undefined, { numeric: true })
);

const header = COLS.join(',');
const lines = unique.map((r) => COLS.map((c) => csvEscape(r[c])).join(','));
const outPath = path.join(root, 'data', 'cards.csv');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, [header, ...lines].join('\n') + '\n', 'utf8');

const byCat = unique.reduce((acc: Record<string, number>, r) => {
  const k = String(r.catalog);
  acc[k] = (acc[k] ?? 0) + 1;
  return acc;
}, {});
console.log(`Wrote ${unique.length} rows → data/cards.csv`);
console.log('By catalog:', byCat);
