// Service worker (Workbox) settings, used by vite-plugin-pwa in vite.config.js.
// Only the app itself and book covers are cached. Firestore, Auth and the Google Books API
// always go to the network; Firestore keeps its own offline cache in IndexedDB.

export const COVER_CACHE = {
  name: 'book-covers',
  maxEntries: 150,
  maxAgeDays: 60,
};

// Google Books cover images, e.g. https://books.google.com/books/content?id=...
export const COVER_URL_PATTERN = /^https:\/\/books\.google(usercontent)?\.com\/books\//;

export const workbox = {
  // App files and the woff2 fonts (the older woff copies are never used by current browsers).
  globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
  cleanupOutdatedCaches: true,
  runtimeCaching: [
    {
      urlPattern: COVER_URL_PATTERN,
      handler: 'CacheFirst',
      options: {
        cacheName: COVER_CACHE.name,
        // Google's images have no CORS headers, so the responses are opaque (status 0).
        cacheableResponse: { statuses: [0, 200] },
        expiration: {
          maxEntries: COVER_CACHE.maxEntries,
          maxAgeSeconds: COVER_CACHE.maxAgeDays * 24 * 60 * 60,
          purgeOnQuotaError: true,
        },
      },
    },
  ],
};
