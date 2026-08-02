import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

/**
 * The version is read from package.json and injected, never hand-typed into
 * markup. Covenant 8 is "honest versioning — no marketing labels without
 * evidence", and the title screen read "Alpha · v0.1" from the day it was
 * created: a milestone docs/ROADMAP.md explicitly places at Phase 7. Three
 * hand-maintained mirrors (package.json, the masthead, the build tag) disagreed
 * with each other and with the README. One source, injected at build.
 */
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  base: '/candidate-zero/',
  root: '.',
  publicDir: 'public',
  server: { port: 5173, open: false },
  build: { outDir: 'dist', sourcemap: true }
});
