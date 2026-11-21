import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  clearScreen: false,
  build: { assetsInlineLimit: 0 }, // the CSP's font-src 'self' blocks fonts inlined as data: URIs
  server: { port: 1420, strictPort: true },
  test: { include: ['src/**/*.test.ts'] }, // e2e/*.spec.ts belongs to Playwright
});
