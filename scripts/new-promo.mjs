#!/usr/bin/env node
/**
 * CANDIDATE ZERO — scaffold a sponsor promo card.
 *
 *   npm run promo:new -- --id PR02 --name "Card Name" --art ~/sponsor.jpg \
 *     --text "What the card does." [--tag "a favor"] [--rate 0.001]
 *
 * Does three things:
 *   1. copies the art to src/assets/full-art/<ID>.<ext>
 *   2. inserts a card definition into src/data/promo-plays.ts
 *   3. registers it in the PROMO_PLAYS array
 *
 * Then preview with:  npm run dev  →  ?promo=<ID>
 */

import { existsSync, copyFileSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ART_DIR = join(ROOT, 'src', 'assets', 'full-art');
const DATA = join(ROOT, 'src', 'data', 'promo-plays.ts');
const ART_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg']);
const MAX_BYTES = 500 * 1024;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function die(msg) {
  console.error(`\npromo:new — ${msg}\n`);
  process.exit(1);
}

function esc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.id || !args.name || !args.art) {
  console.log(`
Scaffold a sponsor promo card.

  npm run promo:new -- --id PR02 --name "Card Name" --art ~/sponsor.jpg \\
    --text "What the card does."

Required:
  --id     Card id, e.g. PR02. Becomes the art filename and the ?promo= value.
  --name   Card title shown in the brief.
  --art    Path to the sponsor's artwork (2:3 portrait, >=600x900).
           .jpg .jpeg .png .webp .avif .svg

Optional:
  --text   Brief text players read.  (default: placeholder, edit later)
  --tag    Short flavour label.      (default: "a favor")
  --rate   Draw chance per week.     (default: 0.001 = 0.1%, once per run)
`);
  process.exit(args.help ? 0 : 1);
}

const id = String(args.id).trim();
if (!/^[A-Z0-9_]{2,16}$/.test(id)) {
  die(`--id "${id}" must be 2-16 chars, A-Z 0-9 _ only (e.g. PR02).`);
}

const artSrc = resolve(String(args.art).replace(/^~/, process.env.HOME || '~'));
if (!existsSync(artSrc)) die(`--art file not found: ${artSrc}`);

const ext = extname(artSrc).toLowerCase();
if (!ART_EXT.has(ext)) {
  die(`--art has extension "${ext}"; allowed: ${[...ART_EXT].join(' ')}`);
}

const size = statSync(artSrc).size;
if (size > MAX_BYTES) {
  die(`--art is ${(size / 1024).toFixed(0)}KB, over the ${MAX_BYTES / 1024}KB budget. Resize/compress it first.`);
}

// Reject a duplicate id (any extension already present).
for (const e of ART_EXT) {
  if (existsSync(join(ART_DIR, `${id}${e}`))) {
    die(`art for id "${id}" already exists: src/assets/full-art/${id}${e}`);
  }
}

let src = readFileSync(DATA, 'utf8');
if (new RegExp(`id:\\s*'${id}'`).test(src)) {
  die(`a card with id "${id}" is already defined in src/data/promo-plays.ts`);
}

const constName = `${id}_${String(args.name).replace(/[^A-Za-z0-9]/g, '').slice(0, 32) || 'Promo'}`;
const tag = args.tag && args.tag !== true ? String(args.tag) : 'a favor';
const rate = args.rate && args.rate !== true ? Number(args.rate) : 0.001;
if (!Number.isFinite(rate) || rate <= 0 || rate > 1) {
  die(`--rate must be a number between 0 and 1 (got "${args.rate}")`);
}
const text =
  args.text && args.text !== true
    ? String(args.text)
    : 'TODO: describe what this card does, in plain language.';

// 1. art
copyFileSync(artSrc, join(ART_DIR, `${id}${ext}`));

// 2. card definition, inserted just above the TEMPLATE comment block
const block = `/**
 * ${id} — ${args.name}
 * Supporter promo. Draw: ~${(rate * 100).toFixed(3)}% per week, once per run
 * (or ?promo=${id} to force it for review).
 */
export const ${constName}: PlayCard = {
  id: '${esc(id)}',
  n: '${esc(args.name)}',
  cost: {},
  risk: 'SAFE',
  ph: [1, 2, 3],
  tag: '${esc(tag)}',
  kind: 'promo',
  rarity: 'rare',
  residency: 'special',
  control: 'player',
  d:
    '${esc(text)}',
  show: () => false,
  promoRate: ${rate},
  fullBleedArt: true,
  odds: () => 0.99,
  run: () => '${esc(args.name)} — played.'
};

`;

const marker = '/* ---------------------------------------------------------------------------';
if (!src.includes(marker)) die('could not find the TEMPLATE marker in promo-plays.ts');
src = src.replace(marker, block + marker);

// 3. register in PROMO_PLAYS
src = src.replace(
  /export const PROMO_PLAYS: PlayCard\[\] = \[([^\]]*)\];/,
  (_m, inner) => `export const PROMO_PLAYS: PlayCard[] = [${inner.trim()}, ${constName}];`
);

writeFileSync(DATA, src);

console.log(`
promo:new — created ${id}

  art   src/assets/full-art/${id}${ext}   (${(size / 1024).toFixed(0)}KB)
  card  src/data/promo-plays.ts           (${constName})
  odds  ${rate}  (~${(rate * 100).toFixed(3)}% per week, once per run)

Preview it:
  npm run dev
  http://localhost:5173/candidate-zero/?promo=${id}

Ship it:
  commit, then merge to main — GitHub Pages deploys from main only.
`);
