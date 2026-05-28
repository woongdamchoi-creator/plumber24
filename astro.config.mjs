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
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      customPages: [],
    }),
  ],
  output: 'static',
  build: {
    assets: '_assets',
  },
});
