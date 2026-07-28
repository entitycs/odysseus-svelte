// Entry point for the ThemeToggle widget (Track A).
//
// Built by vite.widgets.config.ts into static/svelte/theme-toggle.js, then
// loaded by static/index.html via:
//   <div data-svelte="theme-toggle"></div>
//   <script type="module" src="/static/svelte/theme-toggle.js"></script>
//
// To add another widget, create web/entries/<name>.ts with the same shape —
// the build auto-discovers it (see vite.widgets.config.ts widgetEntries()).

import { mount } from 'svelte';
import ThemeToggle from '$lib/components/ThemeToggle.svelte';

const targets = document.querySelectorAll<HTMLElement>(
  '[data-svelte="theme-toggle"]',
);
for (const el of targets) {
  mount(ThemeToggle, { target: el });
}
