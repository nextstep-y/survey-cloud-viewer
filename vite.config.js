import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // GitHub Pages hosts this project below /survey-cloud-viewer/. Keep the
  // development server at / so the existing localhost URL still works.
  base: command === 'build' ? '/survey-cloud-viewer/' : '/',
  build: {
    outDir: 'docs',
  },
}));
