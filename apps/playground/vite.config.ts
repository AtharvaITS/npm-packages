import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const pkgSrc = fileURLToPath(new URL('../../packages/react-data-grid/src/', import.meta.url));

// The Playground always runs against the package's live source (FR-048, FR-051).
// The more specific alias must come first.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^@atharvaits\/react-data-grid\/styles\.css$/,
        replacement: pkgSrc + 'styles/index.css',
      },
      { find: /^@atharvaits\/react-data-grid$/, replacement: pkgSrc + 'index.ts' },
    ],
  },
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    open: !process.env.CI && !process.env.PLAYWRIGHT,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
} as any);
