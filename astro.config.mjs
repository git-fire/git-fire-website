// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
	site: 'https://git-fire.com',
	adapter: cloudflare(),
	integrations: [sitemap()],
});
