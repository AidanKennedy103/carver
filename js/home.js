// Home: an overview of your profile and training.

import { h, fill, icon, promptBox, fmtDate, fmtNum } from './ui.js';
import { state, commit, exercise, overview, toDisplay, unit } from './store.js';
import { historyCard } from './workout.js';
import { openSettings } from './settings.js';
import { goTab } from './tabs.js';
import { oneRmSection } from './onerm.js';

function greeting() {
  const hr = new Date().getHours();
  return hr < 5 ? 'Late night' : hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
}

export async function editName() {
  const n = await promptBox('Your name', state.profile.name, { placeholder: 'First name' });
  if (n != null) commit((s) => { s.profile.name = n; });
}

/** Big numbers read better short: 12,400 → 12.4k */
function short(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e4) return Math.round(n / 1e3) + 'k';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  return fmtNum(n);
}

const fmtHours = (ms) => { const hrs = ms / 36e5; return hrs < 10 ? hrs.toFixed(1).replace(/\.0$/, '') : String(Math.round(hrs)); };

export function homePage() {
  const el = h('div.page');
  const body = h('div.scroll-body');

  function draw() {
    const o = overview();
    const name = state.profile.name.trim();
    const first = state.workouts[state.workouts.length - 1];
    const since = Math.min(state.profile.joined || Date.now(), first?.start || Infinity);
    const last = state.workouts[0];

    const stat = (value, label, sub) => h('div.tile', h('div.tile-v', value), h('div.tile-k', label), sub ? h('div.tile-sub', sub) : null);

    fill(body,
      h('header.home-head',
        h('div.home-hello',
          h('div.home-date', fmtDate(Date.now(), { weekday: 'long', month: 'long', day: 'numeric' })),
          h('h1.home-title', name ? `${greeting()}, ${name}` : greeting())),
        h('button.icon-btn', { onclick: openSettings, 'aria-label': 'Settings' }, icon('gear'))),

      // Profile card
      h('section.card.profile',
        h('button.avatar', { onclick: editName, 'aria-label': 'Edit your name' }, name ? name[0].toUpperCase() : icon('user', 26)),
        h('div.profile-text',
          name ? h('div.profile-name', name) : h('button.link', { onclick: editName }, 'Add your name'),
          h('div.profile-sub', `Carving since ${fmtDate(since, { month: 'long', year: 'numeric' })}`)),
        o.streak ? h('div.streak', h('span.streak-v', o.streak), h('span.streak-k', 'week streak')) : null),

      h('div.tiles',
        stat(o.total, 'Workouts', 'all time'),
        stat(`${short(+toDisplay(o.volume) || 0)}`, 'Lifted', `${unit()} total`),
        stat(o.prCount, 'Records', 'personal bests'),
        stat(fmtHours(o.time), 'Trained', 'hours total')),

      // Brand-new: point them at the Workout tab
      !o.total ? h('section.card.welcome',
        h('div.welcome-title', 'Welcome to Carver'),
        h('div.empty-text', 'Log your first workout and your stats and records build up here.'),
        h('button.btn.gold.wide', { onclick: () => goTab('workout') }, 'Go to Workout')) : null,

      oneRmSection(),

      // Recent PRs
      o.recentPRs.length ? h('div.section-head', h('h2.section-title', 'Recent records')) : null,
      o.recentPRs.length ? h('section.card.list-card', o.recentPRs.map((p) => h('div.pr-line',
        h('span.pr-icon', icon('trophy', 16)),
        h('span.pr-line-text', h('span.pr-line-name', exercise(p.exId).name), h('span.pr-line-kind', `${p.kind} · ${fmtDate(p.when, { month: 'short', day: 'numeric' })}`)),
        h('span.pr-line-val', p.kg != null ? `${toDisplay(p.kg)} ${unit()}` : `${p.reps} reps`)))) : null,

      // Last workout
      last ? h('div.section-head', h('h2.section-title', 'Last workout'), h('button.link', { onclick: () => goTab('workout') }, 'All')) : null,
      last ? historyCard(last) : null,

      h('div.bottom-space'),
    );
  }

  draw();
  el.append(body);
  return { el, refresh: draw };
}
