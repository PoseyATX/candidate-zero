/**
 * CANDIDATE ZERO — content manifest harness
 * Run: npm run harness:content
 *
 * Guards the Unity content bridge: every real card is exported with the
 * fields a ScriptableObject needs, no rule leaks into the data, the export
 * is deterministic, and the committed unity/content JSON is in sync with
 * the code (so a card added in src/data can't silently miss the export).
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildContentManifest, CONTENT_MANIFEST_VERSION } from '../data/manifest.js';
import { ALL_PLAYS } from '../data/plays.js';
import { SESSION_PLAYS } from '../data/session-plays.js';
import { WAITING_PLAYS } from '../data/waiting-plays.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const EXPORT_PATH = join(ROOT, 'unity', 'content', 'candidate-zero-content.json');

let failures = 0;
function assert(cond: boolean, msg: string): void {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${msg}`);
  if (!cond) failures++;
}

console.log('=== CANDIDATE ZERO — content manifest ===\n');

const m = buildContentManifest();
assert(m.version === CONTENT_MANIFEST_VERSION, 'manifest carries a version');

// Completeness: every code-defined card is in the export, exactly once.
const codeIds = [...ALL_PLAYS, ...SESSION_PLAYS, ...WAITING_PLAYS].map(c => c.id);
const exportIds = m.cards.map(c => c.id);
assert(exportIds.length === codeIds.length, `card count matches code (${exportIds.length}/${codeIds.length})`);
assert(new Set(exportIds).size === exportIds.length, 'no duplicate card ids in export');
const missing = codeIds.filter(id => !exportIds.includes(id));
assert(missing.length === 0, `every code card exported${missing.length ? ' — missing: ' + missing.join(',') : ''}`);

// Field integrity: required presentation fields present & typed.
let badCard = '';
for (const c of m.cards) {
  const ok =
    !!c.id && !!c.name && typeof c.description === 'string' && !!c.risk &&
    !!c.kind && Array.isArray(c.phases) && c.cost && typeof c.cost.ap === 'number';
  if (!ok) { badCard = c.id || '(no id)'; break; }
}
assert(badCard === '', `all cards have required fields${badCard ? ' — bad: ' + badCard : ''}`);

// No rule leakage: the manifest must be pure JSON (no functions).
const json = JSON.stringify(m);
assert(!json.includes('function') && json === JSON.stringify(JSON.parse(json)), 'manifest is pure JSON (no rule functions leaked)');

// Setup content present.
assert(m.personas.length > 0 && m.issues.length > 0, `setup content exported (${m.personas.length} personas, ${m.issues.length} issues)`);
assert(m.districts.length > 0 && m.regions.length > 0 && m.grounds.length > 0, `districts/regions/grounds exported`);
assert(m.cardKinds.length >= 7, `card-kind tint table exported (${m.cardKinds.length})`);

// Determinism.
assert(JSON.stringify(buildContentManifest()) === json, 'build is deterministic');

// Committed export is in sync with code (prevents a silent drift).
if (existsSync(EXPORT_PATH)) {
  const onDisk = readFileSync(EXPORT_PATH, 'utf8').trim();
  const fresh = JSON.stringify(m, null, 2);
  assert(onDisk === fresh, 'committed unity/content JSON is in sync (run `npm run export:content`)');
} else {
  console.log('NOTE: no committed export yet — run `npm run export:content`.');
}

console.log('');
if (failures) {
  console.error(`content manifest FAILED — ${failures} assertion(s).`);
  process.exit(1);
}
console.log(`Content manifest green — ${m.cards.length} cards, ${m.personas.length} personas exported for Unity.`);
