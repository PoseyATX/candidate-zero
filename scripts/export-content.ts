/**
 * Write the content manifest to unity/content/candidate-zero-content.json —
 * the source a Unity host imports as ScriptableObjects.
 * Run: npm run export:content
 * Deterministic: re-running with no content changes yields an identical file.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildContentManifest } from '../src/data/manifest.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'unity', 'content', 'candidate-zero-content.json');

const manifest = buildContentManifest();
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');

console.log(
  `content manifest v${manifest.version} -> unity/content/candidate-zero-content.json`
);
for (const [k, v] of Object.entries(manifest.counts)) console.log(`  ${k}: ${v}`);
