import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,vue}'],
      exclude: [
        'src/**/*.test.js',
        'src/**/*.spec.js',
        'src/main.js',
      ],
      thresholds: { statements: 95, branches: 95, functions: 95, lines: 95 },
    },
  },
});
