// The bottom tab bar (Home, Workout, Nutrition, Fitness) and the
// "workout in progress" bar that sits above it on every tab.

import { h, icon, push, depth, fmtDuration, navBar } from './ui.js';
import { state, onChange, tabOn } from './store.js';
import { openWorkout } from './session.js';

const TABS = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'workout', label: 'Workout', icon: 'dumbbell' },
  { id: 'nutrition', label: 'Nutrition', icon: 'apple' },
  { id: 'fitness', label: 'Fitness', icon: 'activity' },
];

let pages = {};
let current = null;
const bar = h('nav.tabbar');
const live = h('button.live-bar', { onclick: () => openWorkout() });

/** pageBuilders: { home: () => screen, workout: ... }. Missing ones show "Coming soon". */
export function initTabs(pageBuilders) {
  pages = pageBuilders;
  drawBar();
  live.append(h('span.pulse'), h('span.live-text', h('b.live-name', ''), h('span.live-time', '')), h('span.live-go', 'Resume'));
  document.body.append(live, bar);

  let saved = 'home';
  try { saved = localStorage.getItem('carver.tab') || 'home'; } catch { /* fine */ }
  goTab(TABS.some((t) => t.id === saved) && tabOn(saved) ? saved : 'home');

  drawLive();
  onChange(drawLive);
  onChange(() => { if (barKey() !== shownKey) { drawBar(); if (!tabOn(current)) goTab('home'); } });
  setInterval(() => { if (state.active) live.querySelector('.live-time').textContent = liveTime(state.active); syncVisibility(); }, 500);
}

// Only the tabs you keep (Settings → Tabs)
let shownKey = '';
const barKey = () => TABS.filter((t) => tabOn(t.id)).map((t) => t.id).join();
function drawBar() {
  shownKey = barKey();
  bar.replaceChildren(...TABS.filter((t) => tabOn(t.id)).map((t) => h('button.tab' + (t.id === current ? '.on' : ''), { 'data-tab': t.id, onclick: () => goTab(t.id) }, icon(t.icon, 24), h('span', t.label))));
}

export function goTab(id) {
  if (!tabOn(id)) id = 'home';
  if (id === current && depth() === 1) return;
  current = id;
  try { localStorage.setItem('carver.tab', id); } catch { /* fine */ }
  push(pages[id] || (() => comingSoon(TABS.find((t) => t.id === id))), { replace: true });
  bar.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === id));
  syncVisibility();
}

function drawLive() {
  const a = state.active;
  live.classList.toggle('show', !!a);
  document.body.classList.toggle('has-live', !!a);
  if (a) {
    live.querySelector('.live-name').textContent = a.name || 'Workout';
    live.querySelector('.live-time').textContent = liveTime(a);
  }
}

// The bars belong to the main pages only; pushed screens cover them
function syncVisibility() {
  const onRoot = depth() <= 1;
  bar.classList.toggle('hidden', !onRoot);
  live.classList.toggle('hidden', !onRoot || current === 'workout');   // the Workout tab shows its own Resume card
}

function comingSoon(tab) {
  const el = h('div.page', h('div.scroll-body',
    navBar({ title: tab.label, back: false, large: true }),
    h('div.empty', h('div.empty-icon', icon(tab.icon, 40)), h('div.empty-title', 'Coming soon'), h('div.empty-text', 'This tab is next on the build list.')),
  ));
  return { el };
}
const liveTime = (a) => (a.past ? (a.past.editOf ? 'Editing' : 'Past workout') : fmtDuration(Date.now() - a.start));
