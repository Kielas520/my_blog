import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://kielasovo.com',
  output: 'static',
  server: {
    host: true,
    port: 1314,
  },
  preview: {
    host: true,
    port: 1314,
  },
  vite: {
    server: {
      allowedHosts: ['kielasovo.com', 'www.kielasovo.com'],
    },
  },
});
