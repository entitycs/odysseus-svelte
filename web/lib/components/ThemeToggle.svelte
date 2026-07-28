<script lang="ts">
import { onMount } from 'svelte';
import {
  applyColors,
  getSaved,
  initThemeUI,
  save,
  THEMES,
} from '$lib/legacy/theme';
import { type ThemeColors } from '$lib/themes';

// now that we are on Track B, and have ported all legacy scripts

// A self-contained theme switcher widget. Mounted into the legacy
// index.html shell via web/entries/theme-toggle.ts. Reads/writes the same
// 'odysseus-theme' localStorage key the vanilla-JS app uses, so the two
// stay in lockstep.

const themeNames = Object.keys(THEMES);

let current = $state('dark');

onMount(() => {
  const saved = getSaved();
  if (saved?.name) current = saved.name;
});

// The mount point in index.html starts hidden so an unbuilt/missing widget
// leaves no empty gap. Reveal it once we actually render.
$effect(() => {
  const host = document.querySelector('[data-svelte="theme-toggle"]');
  if (host) host.removeAttribute('hidden');
});

function cycle(): void {
  const idx = themeNames.indexOf(current);
  const next = themeNames[(idx + 1) % themeNames.length];
  current = next;
  applyColors(colors);
  save(current, colors);
  initThemeUI();
}

const colors = $derived<ThemeColors>(THEMES[current] ?? THEMES.dark);
</script>

<button
	type="button"
	onclick={cycle}
	title="Cycle theme (currently: {current})"
	style:background={colors.panel}
	style:color={colors.fg}
	style:border-color={colors.border}
>
	<span class="swatch" style:background={colors.bg} style:border-color={colors.red}></span>
	<span class="label">{current}</span>
</button>

<style>
	button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.3rem 0.6rem;
		border: 1px solid;
		border-radius: 6px;
		font-size: 1.1rem;
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.12s ease;
		position:absolute;
	}
	button:hover {
		opacity: 0.85;
	}
	.swatch {
		width: 0.9rem;
		height: 0.9rem;
		border-radius: 3px;
		border: 1px solid;
		display: inline-block;
	}
	.label {
		text-transform: capitalize;
	}

</style>
