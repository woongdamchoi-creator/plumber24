// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://plumbers24.netlify.app',
  integrations: [
    tailwind(),
    sitemap({
      filter: (page) =>
        !page.includes('/test') &&
        !page.includes('/seo-check') &&
        !page.includes('/title-manager'),
    }),
  ],
  output: 'static',
  build: {
    assets: '_assets',
  },
});
