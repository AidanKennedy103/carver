// Dark (the default) or light mode, or match the phone. Settings → Appearance.
// index.html sets it before the first paint too, so there's no flash on open.

import { state } from './store.js';

const media = window.matchMedia?.('(prefers-color-scheme: light)');
export const themeChoice = () => (['dark', 'light', 'auto'].includes(state.settings.theme) ? state.settings.theme : 'dark');
const resolved = () => (themeChoice() === 'auto' ? (media?.matches ? 'light' : 'dark') : themeChoice());

/** Puts the chosen look on the page (and the browser bar colour with it). */
export function applyTheme() {
  const t = resolved();
  const root = document.documentElement;
  if (root.dataset.theme !== t) root.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#f2f2f7' : '#000000');
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', t);
  try { localStorage.setItem('carver.theme', t); } catch { /* private mode */ }
}

media?.addEventListener?.('change', () => { if (themeChoice() === 'auto') applyTheme(); });
