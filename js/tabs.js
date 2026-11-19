// The bottom tab bar (Home, Workout, Nutrition, Fitness) and the
// "workout in progress" bar that sits above it on every tab.

import { h, icon, push, depth, fmtDuration, navBar } from './ui.js';
import { state, onChange, tabOn, shownTabs, TAB_LIST } from './store.js';
import { openWorkout } from './session.js';

const HOME = { id: 'home', label: 'Home', icon: 'home' };
const MORE = { id: 'more', label: 'More', icon: 'more' };
const BAR_MAX = 5;   // what fits on a phone; the rest go under More
const TABS = [HOME, ...TAB_LIST, MORE];
const tab = (id) => TABS.find((t) => t.id === id);

/** [in the bar], [under More] */
function layout() {
  const list = shownTabs().map(tab);
  if (list.length + 1 <= BAR_MAX) return [[HOME, ...list], []];
  return [[HOME, ...list.slice(0, BAR_MAX - 2), MORE], list.slice(BAR_MAX - 2)];
}

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
  goTab(saved);

  drawLive();
  onChange(drawLive);
  onChange(() => { if (barKey() !== shownKey) { drawBar(); if (current === 'more' || !tabOn(current)) { current = null; goTab('home'); } } });
  setInterval(() => { if (state.active) live.querySelector('.live-time').textContent = liveTime(state.active); syncVisibility(); }, 500);
}

// Only the tabs you keep (Settings → Tabs)
let shownKey = '';
const barKey = () => shownTabs().join();
function drawBar() {
  shownKey = barKey();
  bar.replaceChildren(...layout()[0].map((t) => h('button.tab', { 'data-tab': t.id, onclick: () => goTab(t.id) }, icon(t.icon, 24), h('span', t.short || t.label))));
  markBar();
}
/** Light up the tab you're on (More, for tabs that live under it). */
function markBar() {
  const inBar = layout()[0].some((t) => t.id === current);
  bar.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === (inBar ? current : 'more')));
}

export function goTab(id) {
  if (id === 'more' ? !layout()[1].length : !tabOn(id)) id = 'home';
  if (id === current && depth() === 1) return;
  current = id;
  try { localStorage.setItem('carver.tab', id); } catch { /* fine */ }
  push(id === 'more' ? morePage : pages[id] || (() => comingSoon(tab(id))), { replace: true });
  markBar();
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

/** The tabs that don't fit in the bar. */
function morePage() {
  const el = h('div.page', h('div.scroll-body',
    navBar({ title: 'More', back: false, large: true }),
    h('section.card.list-card', layout()[1].map((t) => h('button.group-row.more-row', { onclick: () => goTab(t.id) },
      h('span.more-ico', icon(t.icon, 22)), h('span.tab-pick-text', h('span', t.label, t.wip ? h('span.wip-tag', 'Under construction') : null), h('span.tab-pick-sub', t.sub)), h('span.card-go', '›')))),
    h('p.fine', 'Choose which tabs show, and their order, in Settings → Tabs.')));
  return { el };
}

function comingSoon(tab) {
  const el = h('div.page', h('div.scroll-body',
    navBar({ title: tab.label, back: false, large: true }),
    h('div.empty', h('div.empty-icon', icon(tab.icon, 40)), h('div.empty-title', 'Coming soon'), h('div.empty-text', 'This tab is next on the build list.')),
  ));
  return { el };
}
const liveTime = (a) => (a.past ? (a.past.editOf ? 'Editing' : 'Past workout') : fmtDuration(Date.now() - a.start));
