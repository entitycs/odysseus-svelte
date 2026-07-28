// import path from 'node:path';
// import { fileURLToPath } from 'node:url';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vite';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// --- SvelteKit app build (Track B) ---
// The SvelteKit source lives in web/ (not src/, which holds the Python backend).
// adapter-static emits a fully static SPA bundle into web-build/ that FastAPI serves.
// Standalone widgets (Track A) are built separately via vite.widgets.config.ts.
export default defineConfig({
  plugins: [tailwindcss(), sveltekit(), svelteTesting()],
  test: {
    // If you are testing components client-side, you need to set up a DOM environment.
    // If not all your files should have this environment, you can use a
    // `// @vitest-environment jsdom` comment at the top of the test files instead.
    environment: 'jsdom',
  },
  // Tell Vitest to use the `browser` entry points in `package.json` files, even though it's running in Node
  // resolve: {
  //   conditions: ['browser'],
  //   // alias: {
  //   //   $lib: path.resolve(__dirname, 'web/lib'),
  //   // },
  // },

  server: {
    // During `vite dev` (Track B), proxy API + legacy static assets to the FastAPI
    // backend so SvelteKit routes can hit the real API and load the legacy shell.
    proxy: {
      '/api': 'http://localhost:7000',
      '/static': 'http://localhost:7000',
    },
  },
});
