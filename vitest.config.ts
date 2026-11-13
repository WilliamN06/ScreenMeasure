import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Vitest 1.x: choose environment per file pattern.
    // Node by default; jsdom for integration render tests only.
    environment: 'node',
    environmentMatchGlobs: [['tests/integration/render.test.ts', 'jsdom']],
    coverage: {
      provider: 'v8',
      include: ['src/renderer/lib/**/*.ts', 'src/renderer/state.ts'],
      thresholds: { lines: 90, functions: 90, branches: 85 },
    },
  },
  resolve: { alias: { '@lib': resolve(__dirname, 'src/renderer/lib') } },
});
