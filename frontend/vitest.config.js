import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/composables/useAccessCodeLoader.js'],
      thresholds: { statements: 95, branches: 95, functions: 95, lines: 95 },
    },
  },
});
