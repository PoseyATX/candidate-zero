/**
 * Copy the built IIFE engine bundle into unity/engine/ as a committed
 * drop-in, so the whole unity/ folder can be dragged into a Unity project
 * with no npm on the game machine. Jint evaluates this file directly to
 * define the global `CandidateZeroEngine`.
 */
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'dist-engine', 'candidate-zero-engine.iife.js');
const DEST = join(ROOT, 'unity', 'engine', 'candidate-zero-engine.js');

if (!existsSync(SRC)) {
  console.error(`copy-engine-to-unity: ${SRC} not found — run the vite engine build first.`);
  process.exit(1);
}
mkdirSync(dirname(DEST), { recursive: true });
copyFileSync(SRC, DEST);
console.log('engine bundle -> unity/engine/candidate-zero-engine.js (Jint drop-in)');
