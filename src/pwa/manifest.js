// Web app manifest. Used by vite-plugin-pwa in vite.config.js, kept here so it can be tested.

// The app is served from https://<user>.github.io/reading-journal/ on GitHub Pages.
export const BASE_PATH = '/reading-journal/';

export const THEME_COLOR = '#5b4636';
export const BACKGROUND_COLOR = '#faf7f2';

// Icon files are generated from public/icon.svg (npm run generate-icons) and live in public/.
export const manifest = {
  name: 'יומן קריאה',
  short_name: 'יומן קריאה',
  description: 'יומן קריאה אישי: ספרים, נקודות, ציטוטים, יעדים וסטטיסטיקות',
  lang: 'he',
  dir: 'rtl',
  id: BASE_PATH,
  start_url: BASE_PATH,
  scope: BASE_PATH,
  display: 'standalone',
  orientation: 'portrait',
  theme_color: THEME_COLOR,
  background_color: BACKGROUND_COLOR,
  icons: [
    { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
    { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
