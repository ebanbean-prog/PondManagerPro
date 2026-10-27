import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // Relative asset paths so the build works from GitHub Pages or any UF web folder.
  base: './',
  resolve: {
    alias: {
      // Use engine source directly so dev and build never need a prior engine build.
      '@pond-steward/engine': fileURLToPath(new URL('../../packages/engine/src/index.ts', import.meta.url)),
    },
  },
});
