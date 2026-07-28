import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { readdirSync } from 'node:fs';
import { existsSync } from 'node:fs';

// --- Standalone widgets build (Track A) ---
// Compiles individual Svelte components into standalone ES modules that the
// legacy vanilla-JS shell (static/index.html) loads via <script type="module">.
// Each entry in web/entries/<name>.ts mounts one component into a
// [data-svelte="<name>"] DOM node. Output lands in static/svelte/ and is served
// by FastAPI's existing /static mount — no CSP or routing changes required
// (external modules are covered by script-src 'self').
//
// This shares web/lib/ with the SvelteKit app (vite.config.ts), so a widget
// today can be promoted into a full SvelteKit page tomorrow without rewriting it.

function widgetEntries(): Record<string, string> {
	// Auto-discover web/entries/*.ts so adding a widget = adding a file.
	const dir = 'web/entries';
	if (!existsSync(dir)) return {};
	const entries: Record<string, string> = {};
	for (const file of readdirSync(dir)) {
		if (file.endsWith('.ts') || file.endsWith('.js')) {
			const name = file.replace(/\.(ts|js)$/, '');
			entries[name] = `${dir}/${file}`;
		}
	}
	return entries;
}

export default defineConfig({
	plugins: [
		svelte({
			compilerOptions: {
				// Match the SvelteKit app: runes mode on for all our own components.
				runes: true
			}
		})
	],
	build: {
		// One self-contained ES module per entry. Svelte is bundled into each
		// chunk for zero-setup mounting (no importmap needed in index.html).
		// Duplication is small (svelte runtime is ~10KB gzipped); revisit with an
		// importmap if the widget count grows.
		lib: {
			entry: widgetEntries(),
			formats: ['es'],
			fileName: (_format, entryName) => `${entryName}.js`
		},
		outDir: 'static/svelte',
		emptyOutDir: true,
		rollupOptions: {
			output: {
				assetFileNames: '[name][extname]'
			}
		}
	},
	resolve: {
		alias: {
			$lib: '/web/lib'
		}
	}
});
