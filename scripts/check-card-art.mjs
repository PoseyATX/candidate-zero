/**
 * CANDIDATE ZERO — card raster art size gate (PR-4)
 *
 * Contract (DESIGN-UI-GAMEPLAY-FLOW):
 *   DIR = public/assets/cards
 *   if DIR does not exist → exit 0 (OK; no assets yet)
 *   if DIR exists:
 *     fail if any image file size > 50KB
 *     fail on unexpected non-image extensions (allow .md/.txt/.gitkeep)
 *   exit 0
 *
 * Run: npm run check:card-art
 * No sample raster ships until this is green on CI.
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'public', 'assets', 'cards');
const MAX_BYTES = 50 * 1024; // 50KB
const IMAGE_EXT = new Set(['.png', '.webp', '.jpg', '.jpeg', '.svg', '.gif']);
const IGNORE_EXT = new Set(['.md', '.txt', '.gitkeep', '']);

function main() {
  if (!existsSync(DIR)) {
    console.log('check:card-art — public/assets/cards missing → OK (no assets yet)');
    process.exit(0);
  }

  const failures = [];
  let images = 0;
  let skipped = 0;

  for (const name of readdirSync(DIR)) {
    const full = join(DIR, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (!st.isFile()) continue;

    const ext = extname(name).toLowerCase();
    if (IGNORE_EXT.has(ext) || name === '.gitkeep' || name.startsWith('.')) {
      skipped++;
      continue;
    }
    if (!IMAGE_EXT.has(ext)) {
      failures.push(`${name}: unexpected extension (allowed: png/webp/jpg/svg)`);
      continue;
    }
    images++;
    if (st.size > MAX_BYTES) {
      failures.push(
        `${name}: ${st.size} bytes > ${MAX_BYTES} (50KB) — resize before shipping`
      );
    }
  }

  if (failures.length) {
    console.error('check:card-art FAILED:');
    for (const f of failures) console.error('  -', f);
    process.exit(1);
  }

  console.log(
    `check:card-art OK — ${images} image(s) ≤50KB` +
      (skipped ? `, ${skipped} doc/meta ignored` : '') +
      (images === 0 ? ' (dir present, no rasters yet)' : '')
  );
  process.exit(0);
}

main();
