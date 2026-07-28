// Shared theme definitions for Svelte UI (widgets + future SvelteKit pages).
//
// This mirrors the legacy theme system in static/js/theme.js so a Svelte widget
// can read/write the SAME localStorage key the vanilla-JS shell uses. Whatever
// the widget changes, the legacy app picks up on next load (and vice-versa).
//
// When a page is fully migrated to SvelteKit, you can extend this to be the
// single source of truth and have the legacy code import from it.

export interface ThemeColors {
  bg: string;
  fg: string;
  panel: string;
  border: string;
  red: string;
  advanced?: Record<string, string>;
}

export const THEMES: Record<string, ThemeColors> = {
  dark: {
    bg: '#282c34',
    fg: '#9cdef2',
    panel: '#111111',
    border: '#355a66',
    red: '#e06c75',
  },
  light: {
    bg: '#f0ebe3',
    fg: '#5a5248',
    panel: '#faf6f0',
    border: '#d4cdc2',
    red: '#c47d5a',
  },
  midnight: {
    bg: '#0d1117',
    fg: '#c9d1d9',
    panel: '#161b22',
    border: '#30363d',
    red: '#f85149',
  },
  paper: {
    bg: '#faf8f5',
    fg: '#3b3836',
    panel: '#ffffff',
    border: '#d5d0c8',
    red: '#c5ac4a',
  },
  cyberpunk: {
    bg: '#0a0a0f',
    fg: '#0ff0fc',
    panel: '#12101a',
    border: '#9b30ff',
    red: '#e040fb',
  },
  retrowave: {
    bg: '#1a1a2e',
    fg: '#e94560',
    panel: '#16213e',
    border: '#533483',
    red: '#e94560',
  },
  forest: {
    bg: '#1b2a1b',
    fg: '#a8d5a2',
    panel: '#142414',
    border: '#3d6b3d',
    red: '#7cb871',
  },
  ocean: {
    bg: '#0b1a2c',
    fg: '#64d2ff',
    panel: '#091422',
    border: '#1e5074',
    red: '#4facfe',
  },
  ume: {
    bg: '#2b1b2e',
    fg: '#f5c2e7',
    panel: '#1e1420',
    border: '#6c4675',
    red: '#f5a0c0',
  },
  copper: {
    bg: '#1c1410',
    fg: '#e8c39e',
    panel: '#140f0a',
    border: '#7a5533',
    red: '#d4764e',
  },
  terminal: {
    bg: '#000000',
    fg: '#00ff41',
    panel: '#0a0a0a',
    border: '#003b00',
    red: '#00ff41',
  },
  organs: {
    bg: '#0a0406',
    fg: '#efe1c8',
    panel: '#15080a',
    border: '#3a1519',
    red: '#c83240',
  },
  lavender: {
    bg: '#f3eef8',
    fg: '#3d3551',
    panel: '#faf7ff',
    border: '#cec3de',
    red: '#9b6dcc',
  },
  gpt: {
    bg: '#212121',
    fg: '#ececec',
    panel: '#171717',
    border: '#424242',
    red: '#949494',
    advanced: {
      sendBtnBg: '#949494',
      sendBtnHover: '#7f7f7f',
      userBubbleBg: '#2f2f2f',
      aiBubbleBg: '#171717',
      inputBg: '#2f2f2f',
    },
  },
  claude: {
    bg: '#262624',
    fg: '#f5f4f0',
    panel: '#30302e',
    border: '#4a4a47',
    red: '#c6613f',
  },
  cute: {
    bg: '#fff0f5',
    fg: '#d4608a',
    panel: '#fff8fa',
    border: '#f0c0d0',
    red: '#ff6b9d',
  },
};

// Must stay in sync with static/js/storage.js THEME key and theme.js LS_KEY.
export const THEME_LS_KEY = 'odysseus-theme';
export const DEFAULT_THEME = 'dark';

export interface SavedTheme {
  name: string;
  colors: ThemeColors;
  [key: string]: unknown;
}

/** Read the saved theme from localStorage (same key the legacy shell uses). */
export function getSavedTheme(): SavedTheme | null {
  try {
    const raw = localStorage.getItem(THEME_LS_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw) as SavedTheme;
    // Match the legacy migrations in theme.js.
    if (obj.name === 'chatgpt') obj.name = 'gpt';
    if (obj.name === 'sakura') obj.name = 'ume';
    return obj;
  } catch {
    return null;
  }
}

/**
 * Persist a theme and apply its CSS custom properties to <html> immediately.
 * Writes the same localStorage shape as theme.js save(), so the legacy app
 * reads the change on next load. Also pushes to /api/prefs/theme to keep the
 * server in sync (best-effort, non-blocking).
 */
export function applyTheme(name: string): void {
  console.log('oops');
  const colors = THEMES[name] ?? THEMES[DEFAULT_THEME];
  const root = document.documentElement.style;
  root.setProperty('--bg', colors.bg);
  root.setProperty('--fg', colors.fg);
  root.setProperty('--panel', colors.panel);
  root.setProperty('--border', colors.border);
  root.setProperty('--red', colors.red);
  if (colors.advanced?.brandColor)
    root.setProperty('--brand-color', colors.advanced.brandColor);

  const obj: SavedTheme = { name, colors };
  localStorage.setItem(THEME_LS_KEY, JSON.stringify(obj));

  // Mirror theme.js _syncToServer — keep server-side prefs in step.
  try {
    console.log('api call');
    fetch('/api/prefs/theme', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(obj),
    }).catch(() => {
      /* best-effort; server theme sync is non-critical */
    });
  } catch {
    /* network errors are non-fatal */
  }
}
