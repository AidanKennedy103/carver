// One-rep max tracker: up to 4 lifts, graphed by estimated 1RM (Epley) so
// every set you log, at any rep count, shows your strength trend.

import { h, icon, push, navBar, fmtDate } from './ui.js';
import { commit, exercise, e1rmHistory, oneRmExercises, toDisplay, unit } from './store.js';
import { lineChart, sparkline } from './charts.js';
import { pickExercises } from './picker.js';

const MAX = 4;

export function chooseOneRm() {
  pickExercises((ids) => commit((s) => { s.settings.oneRm = ids.slice(0, MAX); }), {
    title: 'Track 1RM (up to 4)', filter: (e) => e.type === 'wr', max: MAX, initial: oneRmExercises(), addLabel: 'Track',
  });
}

/** The Home section. */
export function oneRmSection() {
  const ids = oneRmExercises();
  const head = h('div.section-head',
    h('h2.section-title', 'One-rep max'),
    h('button.link', { onclick: chooseOneRm }, ids.length ? 'Edit' : 'Choose'));
  if (!ids.length) {
    return [head, h('button.card.empty-plan', { onclick: chooseOneRm },
      h('div.empty-title', 'Track your strength'),
      h('div.empty-text', 'Pick up to 4 lifts. Every set you log updates its estimated one-rep max.'))];
  }
  return [head, h('div.orm-grid', ids.map((id) => {
    const hist = e1rmHistory(id);
    const info = exercise(id);
    const cur = hist.length ? hist[hist.length - 1].y : 0;
    const best = hist.reduce((m, p) => Math.max(m, p.y), 0);
    const first = hist.length ? hist[0].y : 0;
    const diff = cur - first;
    return h('button.card.orm-card', { onclick: () => push(() => oneRmDetail(id)) },
      h('div.orm-name', info.name),
      hist.length
        ? [h('div.orm-val', Math.round(+toDisplay(cur)), h('span.orm-unit', unit())),
          h('div.orm-sub', hist.length < 2 ? 'First entry' : Math.round(+toDisplay(diff)) === 0 ? 'No change yet' : `${diff > 0 ? '+' : ''}${Math.round(+toDisplay(diff))} ${unit()} since start`),
          sparkline(hist.slice(-12).map((p) => p.y)),
          best > cur + 1e-6 ? h('div.orm-best', `Best ${Math.round(+toDisplay(best))}`) : null]
        : h('div.orm-sub', 'Log it to start the graph'));
  }))];
}

function oneRmDetail(id) {
  const info = exercise(id);
  const hist = e1rmHistory(id);
  const fmt = (kg) => `${Math.round(+toDisplay(kg))} ${unit()}`;
  const best = hist.reduce((m, p) => (p.y > (m?.y || 0) ? p : m), null);
  const el = h('div.page',
    navBar({ title: 'One-rep max', backLabel: 'Home' }),
    h('div.scroll-body',
      h('h2.detail-title', info.name),
      h('div.detail-date', 'Estimated from your best set each workout (Epley formula)'),
      h('div.stats-inline',
        h('div.stat', h('span.stat-k', 'Current'), h('span.stat-v', hist.length ? fmt(hist[hist.length - 1].y) : '—')),
        h('div.stat', h('span.stat-k', 'Best'), h('span.stat-v', best ? fmt(best.y) : '—')),
        h('div.stat', h('span.stat-k', 'Workouts'), h('span.stat-v', hist.length))),
      // Charted in the units you see, so the axis lands on round numbers
      h('section.card.chart-card', lineChart(hist.map((p) => ({ ...p, kg: p.y, y: +toDisplay(p.y) })), {
        height: 200, fmtY: (v) => Math.round(v), label: `${info.name} estimated one-rep max`,
        tip: (p) => `<b>${fmt(p.kg)}</b><span>${toDisplay(p.weight)} × ${p.reps} · ${fmtDate(p.x, { month: 'short', day: 'numeric' })}</span>`,
        empty: 'Log this lift to see your graph',
      })),
      hist.length ? h('div.section-head', h('h2.section-title', 'Every workout')) : null,
      hist.length ? h('section.card.list-card', hist.slice().reverse().map((p) => h('div.pr-line',
        h('span.pr-line-text', h('span.pr-line-name', fmtDate(p.x, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })), h('span.pr-line-kind', `Best set ${toDisplay(p.weight)} ${unit()} × ${p.reps}`)),
        h('span.pr-line-val' + (p === best ? '.gold-text' : '.plain'), p === best ? [icon('trophy', 14), ' ', fmt(p.y)] : fmt(p.y))))) : null,
      h('div.bottom-space'),
    ),
  );
  return { el };
}
