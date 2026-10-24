import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { BASE_PATH, manifest } from './src/pwa/manifest.js';
import { workbox } from './src/pwa/workbox.js';

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    VitePWA({
      // A new version waits until the user taps "refresh" (see UpdatePrompt).
      registerType: 'prompt',
      manifest,
      workbox,
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
  },
});
