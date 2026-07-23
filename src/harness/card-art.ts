/**
 * PR-4 — cardArtUrl / emblem prefix unit checks (no browser).
 * Run: npx tsx src/harness/card-art.ts
 */

import {
  cardArtUrl,
  isSafeCardArtUrl,
  cardArtBase,
  CARD_ART
} from '../ui/card-face.js';
import { emblemKeyFor, emblemFor } from '../ui/card-art.js';

let failed = 0;
function assert(cond: boolean, msg: string): void {
  if (cond) console.log(`PASS: ${msg}`);
  else {
    console.error(`FAIL: ${msg}`);
    failed++;
  }
}

console.log('=== CANDIDATE ZERO — card art helpers + kit emblems ===\n');

const base = cardArtBase();
console.log(`BASE_URL (cardArtBase): ${JSON.stringify(base)}`);

// With Vite default in this repo, base is '/candidate-zero/' at build;
// under tsx import.meta.env may be undefined → base '/'.
const url = cardArtUrl('PL01.webp');
assert(!!url && url.endsWith('assets/cards/PL01.webp'), `cardArtUrl filename → …/assets/cards/PL01.webp (got ${url})`);
assert(url.startsWith(base), `url starts with base ${base}`);

const rel = cardArtUrl('assets/cards/PL02.png');
assert(rel.endsWith('assets/cards/PL02.png') && !rel.includes('assets/cards/assets'), `relative path cleaned (got ${rel})`);

assert(cardArtUrl('../etc/passwd') === '', 'reject .. path');
assert(cardArtUrl('https://evil/x.png') === '', 'reject remote https');
assert(cardArtUrl('//evil/x.png') === '', 'reject protocol-relative');

assert(isSafeCardArtUrl(url), 'isSafeCardArtUrl accepts built url');
assert(!isSafeCardArtUrl('https://evil/x.png'), 'isSafe rejects remote');
assert(!isSafeCardArtUrl('/assets/cards/x.png') || base === '/', 'isSafe requires BASE_URL prefix (or bare / in non-vite)');
assert(!isSafeCardArtUrl(''), 'isSafe rejects empty');

assert(Object.keys(CARD_ART).length === 0, 'CARD_ART empty until rasters ship');

// Kit prefixes non-star
assert(emblemKeyFor('SS01') === 'gavel', 'SS → gavel');
assert(emblemKeyFor('SS_PAC') === 'gavel', 'SS_PAC → gavel');
assert(emblemKeyFor('WA03') === 'hourglass', 'WA → hourglass');
assert(emblemKeyFor('MV01') === 'network', 'MV → network');
assert(emblemKeyFor('SIG01') === 'seal', 'SIG → seal');
assert(emblemKeyFor('BUY01') === 'coin', 'BUY → coin');
assert(emblemKeyFor('PL01') === 'boot', 'PL01 unique boot');
assert(emblemKeyFor('PL99') === 'star', 'unmapped PL → star');

// emblemFor never throws + not empty
for (const id of ['SS01', 'WA01', 'MV14', 'SIG22', 'BUY_X', 'PL01']) {
  const svg = emblemFor(id);
  assert(svg.includes('<svg') && svg.includes('</svg>'), `emblemFor(${id}) returns svg`);
}

if (failed) {
  console.error(`\ncard-art harness FAILED — ${failed} assertion(s)`);
  process.exit(1);
}
console.log('\nCard-art helpers green.');
