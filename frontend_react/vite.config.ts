// `defineConfig` from vitest/config is the vite one widened with the `test`
// key; the plain vite export does not know about it.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // The dev server runs inside the `react` container behind a published port,
    // so it has to listen on all interfaces. Polling is required because the
    // source arrives over a Docker bind mount, where inotify events are not
    // delivered reliably.
    host: true,
    port: 3000,
    strictPort: true,
    watch: { usePolling: true },
  },
  build: { outDir: 'build' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    css: true,
    // Every route is a lazy chunk, and the first test to await one pays for
    // Vite transforming it. On a cold run - which is every CI run - that
    // exceeded the 5s default and failed a test that passes in isolation.
    testTimeout: 20_000,
  },
});
