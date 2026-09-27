import { readFileSync } from 'node:fs';
import { defineConfig, sessionDrivers } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  output: 'server',
  session: { driver: sessionDrivers.lruCache() },
  adapter: cloudflare({ imageService: 'compile' }),
  vite: { define: { __APP_VERSION__: JSON.stringify(version) } },
});
