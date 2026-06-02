import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    pool: 'threads',
    reporters: ['verbose'],
    setupFiles: ['./test.config.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'cobertura', 'json-summary'],
      exclude: ['**/fixtures.ts'],
    },
  },
});
