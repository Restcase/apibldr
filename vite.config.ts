import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig(({ mode }) => ({
  define: { 'process.env.NODE_DISABLE_COLORS': 'true' },
  resolve: {
    alias: [
      {
        find: /^http$/,
        replacement: fileURLToPath(
          new URL('./src/browser/http-status.ts', import.meta.url),
        ),
      },
      {
        find: /^fs$/,
        replacement: fileURLToPath(
          new URL('./src/browser/no-io.ts', import.meta.url),
        ),
      },
      {
        find: /^node-fetch-h2$/,
        replacement: fileURLToPath(
          new URL('./src/browser/no-io.ts', import.meta.url),
        ),
      },
      { find: /^path$/, replacement: 'path-browserify' },
      { find: /^url$/, replacement: 'url/' },
    ],
  },
  plugins: [
    react(),
    ...(mode === 'test' ? [] : [cloudflare({ assetsOnly: true })]),
  ],
  test: { environment: 'jsdom', setupFiles: ['./tests/setup.ts'] },
}));
