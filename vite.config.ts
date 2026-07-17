import { defineConfig } from 'vite';

export default defineConfig({
  base: '/candidate-zero/',
  root: '.',
  publicDir: 'public',
  server: { port: 5173, open: false },
  build: { outDir: 'dist', sourcemap: true }
});
