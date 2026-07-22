import { defineConfig } from 'vite';

/**
 * Standalone headless engine bundle — the artifact a presentation host
 * (Unity, a web UI, a bot) loads to bind the pure TypeScript rules engine.
 * Library mode over src/engine/api.ts only: no DOM, no UI, no CSS.
 *
 * Three builds, one `CandidateZeroEngine` API:
 *   - es   (candidate-zero-engine.mjs)     — web / Node hosts
 *   - umd  (candidate-zero-engine.umd.cjs) — generic module/global hosts
 *   - iife (candidate-zero-engine.iife.js) — a plain `var CandidateZeroEngine`
 *          global, the form Unity's Jint runtime evaluates directly.
 *
 * `target: es2019` keeps ES2020 syntax (?. / ??) out of the output so Jint
 * executes the bundle without gaps. A post-build step copies the IIFE build
 * to unity/engine/candidate-zero-engine.js (committed drop-in).
 *
 * Build: npm run build:engine  ->  dist-engine/ (+ unity/engine copy)
 * Contract + determinism: docs/ENGINE-API.md, `npm run harness:api`.
 */
export default defineConfig({
  build: {
    outDir: 'dist-engine',
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2019',
    lib: {
      entry: 'src/engine/api.ts',
      name: 'CandidateZeroEngine',
      fileName: (format) =>
        `candidate-zero-engine.${
          format === 'es' ? 'mjs' : format === 'umd' ? 'umd.cjs' : 'iife.js'
        }`,
      formats: ['es', 'umd', 'iife']
    }
  }
});
