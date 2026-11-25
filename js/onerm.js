// One-rep max tracker: up to 4 lifts, graphed by estimated 1RM (Epley) so
// every set you log, at any rep count, shows your strength trend.

import { h, fill, icon, push, navBar, fmtDate } from './ui.js';
import { state, commit, exercise, e1rmHistory, oneRmExercises, toDisplay, unit } from './store.js';
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
    h('h2.section-title', 'Strength Tracking'),
    h('button.link', { onclick: chooseOneRm }, ids.length ? 'Edit' : 'Choose'));
  if (!ids.length) {
    return [head, h('button.card.empty-plan', { onclick: chooseOneRm },
      h('div.empty-title', 'Track your strength'),
      h('div.empty-text', 'Pick up to 4 lifts to graph.'))];
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

// ---------- One lift, up close ----------

const PERIODS = [['3M', 91], ['6M', 182], ['1Y', 365], ['All', 0]];   // a month is too short to see strength change
const MEASURES = [
  ['orm', 'Est. 1RM', 'Estimated from your best set each workout (Epley formula)'],
  ['top', 'Heaviest', 'The most weight you lifted for at least one rep each workout'],
  ['vol', 'Volume', 'Weight × reps over all your sets of it each workout'],
];

/** One point per workout for a measure: { x, y (kg or kg·reps), weight, reps, sets }. */
function series(id, m) {
  if (m === 'orm') return e1rmHistory(id);
  const out = [];
  for (let i = state.workouts.length - 1; i >= 0; i--) {
    const w = state.workouts[i];
    const sets = w.exercises.filter((e) => e.exId === id).flatMap((e) => e.sets.filter((x) => x.done && x.type !== 'w' && x.weight > 0 && x.reps > 0));
    if (!sets.length) continue;
    const top = sets.reduce((a, b) => (b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a));
    out.push({ x: w.start, y: m === 'top' ? top.weight : sets.reduce((n, x) => n + x.weight * x.reps, 0), weight: top.weight, reps: top.reps, sets: sets.length });
  }
  return out;
}

/** Long ranges show your best workout per week or month (not every session), so the chart stays readable. */
function bestPer(list, gran) {
  if (gran === 'day') return list.map((p) => ({ ...p, gran }));
  const keyOf = (t) => {
    const d = new Date(t);
    if (gran === 'month') return d.getFullYear() * 12 + d.getMonth();
    d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime();
  };
  const groups = new Map();
  for (const p of list) { const k = keyOf(p.x); (groups.get(k) || groups.set(k, []).get(k)).push(p); }
  return [...groups.values()].map((g) => ({ ...g.reduce((b, p) => (p.y > b.y ? p : b)), gran, n: g.length, start: g[0].x }));
}

function oneRmDetail(id) {
  const info = exercise(id);
  const el = h('div.page');
  const body = h('div.scroll-body');
  const big = (kg) => Math.round(+toDisplay(kg)).toLocaleString();
  const dateLong = (t) => fmtDate(t, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  function draw() {
    const m = MEASURES.some(([k]) => k === state.settings.ormMeasure) ? state.settings.ormMeasure : 'orm';
    const days = PERIODS.some(([, d]) => d === state.settings.ormPeriod) ? state.settings.ormPeriod : 91;   // opens on 3 months
    const all = series(id, m);
    const since = days ? Date.now() - days * 864e5 : 0;
    const pts = all.filter((p) => p.x >= since);
    const gran = !days || days >= 365 ? 'month' : days >= 182 ? 'week' : 'day';
    const plotted = bestPer(pts, gran);
    const allBest = all.reduce((b, p) => (p.y > (b?.y || 0) ? p : b), null);
    const best = pts.reduce((b, p) => (p.y > (b?.y || 0) ? p : b), null);
    const last = pts[pts.length - 1], first = pts[0];
    const change = pts.length > 1 ? last.y - first.y : 0;
    const word = PERIODS.find(([, d]) => d === days)[0];
    const periodText = days ? { '1M': 'this month', '3M': 'in 3 months', '6M': 'in 6 months', '1Y': 'this year' }[word] : 'all time';
    const setText = (p) => (m === 'vol' ? `${p.sets} set${p.sets === 1 ? '' : 's'} · top ${toDisplay(p.weight)} × ${p.reps}` : `${toDisplay(p.weight)} ${unit()} × ${p.reps}`);

    // The readout: the latest workout, or the point under your finger
    const rv = h('div.lx-val'), rs = h('div.lx-sub'), rsets = h('div.lx-sets');
    // The sets you did in that workout (warm-ups left out), the one the number comes from in gold
    const setsOf = (q) => {
      const w = state.workouts.find((x) => x.start === q.x);
      return w ? w.exercises.filter((e) => e.exId === id).flatMap((e) => e.sets.filter((x) => x.done && x.type !== 'w')) : [];
    };
    const readout = (p) => {
      const q = p || last;
      if (!q) { fill(rv, '—'); fill(rs, 'No workouts in this period'); fill(rsets); return; }
      const pr = q === allBest || (allBest && q.x === allBest.x) ? h('span.lx-pr', icon('trophy', 13), 'PR') : null;
      // Big: the estimate (or heaviest / volume); underneath: when, then the actual sets
      fill(rv, big(q.y), h('span.lx-unit', ` ${unit()}${m === 'orm' ? ' est. 1RM' : ''}`), pr);
      const when = q.gran === 'month' ? `Best in ${fmtDate(q.x, { month: 'long', year: 'numeric' })} · ${dateLong(q.x)}`
        : q.gran === 'week' ? `Best that week · ${dateLong(q.x)}` : `${p ? '' : 'Latest · '}${dateLong(q.x)}`;
      fill(rs, when);
      const sets = setsOf(q);
      fill(rsets, sets.length ? sets.map((x) => h('span.lx-set' + (x.weight === q.weight && x.reps === q.reps ? '.top' : ''), `${toDisplay(x.weight)} × ${x.reps}`)) : h('span.lx-set', setText(q)));
    };
    readout(null);

    fill(body,
      h('h2.detail-title', info.name),
      h('div.segment.lx-measure', MEASURES.map(([k, l]) => h('button' + (k === m ? '.on' : ''), { onclick: () => { state.settings.ormMeasure = k; commit(); draw(); } }, l))),
      h('div.lx-readout', rv, rs, rsets),
      h('section.card.chart-card.lx-chart', lineChart(plotted.map((p) => ({ ...p, kg: p.y, y: +toDisplay(p.y) })), {
        area: true, gap: { day: 45, week: 45, month: 100 }[gran],   // straight lines between workouts, as before
        height: 220, fmtY: (v) => (v >= 10000 ? `${Math.round(v / 1000)}k` : Math.round(v)), label: `${info.name}: ${MEASURES.find(([k]) => k === m)[1]}`,
        fmtX: (t) => new Date(t).toLocaleDateString(undefined, days && days <= 182 ? { month: 'short', day: 'numeric' } : { month: 'short', year: '2-digit' }),
        dots: plotted.length <= 40, mark: best?.x, sticky: true,
        onSelect: (p) => readout(p ? plotted.find((x) => x.x === p.x) : null),
        empty: all.length ? 'Nothing in this period. Try a longer one.' : 'Log this lift to see your graph',
      })),
      h('div.segment.range.lx-period', PERIODS.map(([l, d]) => h('button' + (d === days ? '.on' : ''), { onclick: () => { state.settings.ormPeriod = d; commit(); draw(); } }, l))),
      pts.length ? h('div.lx-stats',
        h('div.lx-stat', h('span.lx-k', `Best ${days ? word : ''}`.trim()), h('span.lx-v', `${big(best.y)} ${unit()}`), h('span.lx-d', fmtDate(best.x, { month: 'short', day: 'numeric' }))),
        h('div.lx-stat', h('span.lx-k', 'Change'), h('span.lx-v' + (change > 0 ? '.up' : change < 0 ? '.down' : ''), pts.length > 1 ? `${change > 0 ? '+' : change < 0 ? '−' : ''}${big(Math.abs(change))} ${unit()}` : '—'), h('span.lx-d', periodText)),
        h('div.lx-stat', h('span.lx-k', 'Sessions'), h('span.lx-v', pts.length), h('span.lx-d', periodText))) : null,
      allBest ? h('div.lx-pr-row', icon('trophy', 16), h('span', h('b', `All-time best ${big(allBest.y)} ${unit()}`), ` · ${setText(allBest)} · ${fmtDate(allBest.x, { month: 'short', day: 'numeric', year: 'numeric' })}`)) : null,
      h('p.fine.lx-note', `${MEASURES.find(([k]) => k === m)[2]}. Tap or drag across the chart to see the weight and reps you did.`),
      h('div.bottom-space'));
  }
  draw();
  el.append(navBar({ title: 'Strength Tracking', backLabel: 'Home' }), body);
  return { el, refresh: draw };
}
