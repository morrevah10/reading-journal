import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Generates the PNG icons and favicon in public/ from public/icon.svg (npm run generate-icons).
// The source already has a full-bleed background and keeps the book inside the maskable safe
// zone, so no extra padding is added.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, padding: 0 },
    apple: { ...minimal2023Preset.apple, padding: 0 },
  },
  images: ['public/icon.svg'],
});
