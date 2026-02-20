import { URL, fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.smoke.ts'],
    setupFiles: ['./src/tests/setupSmokeTests.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@/': fileURLToPath(new URL('./src/', import.meta.url)),
    },
  },
});
