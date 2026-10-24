import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The app is served from https://<user>.github.io/reading-journal/ on GitHub Pages.
export default defineConfig({
  base: '/reading-journal/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
  },
});
