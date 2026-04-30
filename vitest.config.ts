import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    reporters: ['verbose'],
    setupFiles: ['./test.config.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'cobertura', 'json-summary'],
    },
  },
});
