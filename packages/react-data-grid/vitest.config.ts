import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    coverage: { provider: 'v8', include: ['src/**'] },
    projects: [
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          setupFiles: ['tests/setup.ts'],
          include: [
            'tests/unit/**/*.test.{ts,tsx}',
            'tests/component/**/*.test.{ts,tsx}',
            'tests/types/**/*.test-d.ts',
          ],
          typecheck: { enabled: true, include: ['tests/types/**/*.test-d.ts'] },
        },
      },
      {
        extends: true,
        test: {
          name: 'perf',
          environment: 'node',
          include: ['tests/perf/**/*.test.ts'],
          testTimeout: 120_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'ssr',
          environment: 'node',
          include: ['tests/ssr/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
});
