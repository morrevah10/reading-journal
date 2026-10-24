import { defineConfig } from 'vitest/config';

// Security rules tests run in Node against the Firebase Emulator (see `npm run test:rules`).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.js'],
    testTimeout: 20000,
    fileParallelism: false,
  },
});
