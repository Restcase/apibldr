import { defineConfig } from 'cf/config';

export default defineConfig({
  worker: {
    name: 'apibldr-next',
    compatibilityDate: '2026-11-17',
    assets: { notFoundHandling: 'single-page-application' },
  },
});
