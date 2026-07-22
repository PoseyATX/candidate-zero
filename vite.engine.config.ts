import { defineConfig } from 'vite';

/**
 * Standalone headless engine bundle — the artifact a presentation host
 * (Unity via ClearScript/Jint/Puerts, a web UI, a bot) loads to bind the
 * pure TypeScript rules engine. Library mode over src/engine/api.ts only:
 * no DOM, no UI, no CSS. UMD exposes a `CandidateZeroEngine` global for
 * JS-in-C# runtimes; the ES build is for web/Node hosts.
 *
 * Build: npm run build:engine  ->  dist-engine/
 * Contract + determinism: docs/ENGINE-API.md, `npm run harness:api`.
 */
export default defineConfig({
  build: {
    outDir: 'dist-engine',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: 'src/engine/api.ts',
      name: 'CandidateZeroEngine',
      fileName: (format) => `candidate-zero-engine.${format === 'es' ? 'mjs' : 'umd.cjs'}`,
      formats: ['es', 'umd']
    }
  }
});
