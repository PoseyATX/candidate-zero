/**
 * CANDIDATE ZERO — push the engine drop-in into the Unity host project.
 * =============================================================================
 * The TS repo is the source of truth for everything the host consumes:
 *   unity/Scripts/   C# bridge + generated models   -> Assets/CandidateZero/Scripts/
 *   unity/engine/    Jint IIFE bundle               -> Assets/CandidateZero/Resources/
 *   unity/content/   content manifest               -> Assets/CandidateZero/content/
 *                                                   -> Assets/CandidateZero/Resources/content/
 *
 * Before this existed, the two copies were kept in step by hand and drifted.
 *
 * Usage:
 *   npm run sync:unity                 (host defaults to ../candidate-zero-host)
 *   npm run sync:unity -- --check      (report differences, change nothing)
 *   CZ_UNITY_HOST=/path/to/host npm run sync:unity
 *
 * .meta files are Unity's, never ours — we never write or delete them.
 */
import {
  cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, copyFileSync
} from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOST = process.env.CZ_UNITY_HOST ?? join(ROOT, '..', 'candidate-zero-host');
const CHECK = process.argv.includes('--check');

const CZ = join(HOST, 'Assets', 'CandidateZero');

if (!existsSync(HOST)) {
  console.error(`sync-unity-host: host project not found at ${HOST}`);
  console.error('Set CZ_UNITY_HOST to your Unity project root.');
  process.exit(1);
}

/** Files to mirror: [source, destination, filter] */
const JOBS = [
  {
    label: 'C# bridge + generated models',
    from: join(ROOT, 'unity', 'Scripts'),
    to: join(CZ, 'Scripts'),
    filter: f => f.endsWith('.cs')
  },
  {
    label: 'engine bundle (Jint)',
    from: join(ROOT, 'unity', 'engine', 'candidate-zero-engine.js'),
    to: join(CZ, 'Resources', 'candidate-zero-engine.js.txt'),
    single: true
  },
  {
    label: 'content manifest (editor)',
    from: join(ROOT, 'unity', 'content', 'candidate-zero-content.json'),
    to: join(CZ, 'content', 'candidate-zero-content.json'),
    single: true
  },
  {
    label: 'content manifest (runtime bootstrap)',
    from: join(ROOT, 'unity', 'content', 'candidate-zero-content.json'),
    to: join(CZ, 'Resources', 'content', 'candidate-zero-content.json.txt'),
    single: true
  }
];

function walk(dir, filter, base = dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) walk(abs, filter, base, out);
    else if (filter(abs)) out.push(relative(base, abs));
  }
  return out;
}

function same(a, b) {
  if (!existsSync(a) || !existsSync(b)) return false;
  return readFileSync(a).equals(readFileSync(b));
}

let changed = 0;
let missing = 0;

for (const job of JOBS) {
  if (!existsSync(job.from)) {
    console.warn(`  ! skip ${job.label} — source missing (${relative(ROOT, job.from)})`);
    missing++;
    continue;
  }

  if (job.single) {
    if (same(job.from, job.to)) continue;
    changed++;
    if (CHECK) {
      console.log(`  DIFF ${job.label} -> ${relative(HOST, job.to)}`);
    } else {
      mkdirSync(dirname(job.to), { recursive: true });
      copyFileSync(job.from, job.to);
      console.log(`  sync ${job.label} -> ${relative(HOST, job.to)}`);
    }
    continue;
  }

  for (const rel of walk(job.from, job.filter)) {
    const src = join(job.from, rel);
    const dst = join(job.to, rel);
    if (same(src, dst)) continue;
    changed++;
    if (CHECK) {
      console.log(`  DIFF ${relative(ROOT, src)}`);
    } else {
      mkdirSync(dirname(dst), { recursive: true });
      copyFileSync(src, dst);
      console.log(`  sync ${rel}`);
    }
  }
}

if (CHECK) {
  if (changed > 0) {
    console.error(`\nsync:unity --check FAILED — ${changed} file(s) differ from the host project.`);
    console.error('Run `npm run sync:unity`.');
    process.exit(1);
  }
  console.log('sync:unity --check OK — Unity host matches the TS repo drop-in.');
} else {
  console.log(
    changed === 0
      ? 'sync:unity — already up to date.'
      : `sync:unity — ${changed} file(s) copied into ${HOST}.`
  );
  if (missing) console.log(`  (${missing} source(s) missing — run build:engine / export:content first.)`);
}
