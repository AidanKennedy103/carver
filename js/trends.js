// Trends: your numbers over time, and your estimated metabolism worked out
// from what you eat and how your weight moves.

import { h, fill, navBar, fmtNum, fmtDate, swipeSegment } from './ui.js';
import { state, ymd, dayTotals, weekStart, workoutStats, toDisplay, unit, bodyDisplay, bodyUnit } from './store.js';
import { lineChart, barChart, COLORS } from './charts.js';
import { trend, latestWeight } from './body.js';
import { activityKcal } from './fitness.js';

const KCAL_PER_KG = 7700;   // energy in a kilogram of body weight change (common estimate)
const LIFT_MET = 5;         // weight training ≈ 5 METs (kcal per kg per hour)

let range = 28;
export const NEED = { food: 14, weigh: 4, spread: 10 };

/**
 * Estimate maintenance calories (TDEE) from intake and weight trend:
 *   maintenance = average intake − (weight change × 7700 kcal/kg) / days
 * then take out workout calories to estimate what you burn without training.
 */
export function metabolism(days = 28) {
  const end = Date.now();
  const startTs = end - days * 864e5;
  const logged = [];
  for (let ts = startTs + 864e5; ts <= end; ts += 864e5) {
    const k = ymd(ts);
    if (k === ymd()) continue;                 // today isn't finished
    const t = dayTotals(k);
    if (t.entries && t.kcal > 600) logged.push(t.kcal);
  }
  const tr = trend().filter((p) => p.x >= startTs);
  // Enough to see past day-to-day water swings: two weeks of food and 4 weigh-ins at least 10 days apart end to end
  const spread = tr.length > 1 ? (tr[tr.length - 1].x - tr[0].x) / 864e5 : 0;
  if (logged.length < NEED.food || tr.length < NEED.weigh || spread < NEED.spread) {
    return { ready: false, logged: logged.length, weighins: tr.length, spread: Math.floor(spread),
      need: { food: Math.max(0, NEED.food - logged.length), weigh: Math.max(0, NEED.weigh - tr.length), spread: Math.max(0, Math.ceil(NEED.spread - spread)) } };
  }
  const span = Math.max(7, (tr[tr.length - 1].x - tr[0].x) / 864e5);
  const dKg = tr[tr.length - 1].y - tr[0].y;
  const intake = logged.reduce((a, b) => a + b, 0) / logged.length;
  const tdee = intake - (dKg * KCAL_PER_KG) / span;
  const kg = latestWeight()?.kg || 75;
  const ws = state.workouts.filter((w) => w.start >= startTs);
  const acts = state.activities.filter((a) => a.start >= startTs);
  // Lifting at ~5 METs, plus cardio (Health's active calories, or an estimate)
  const liftKcal = ws.reduce((n, w) => n + ((LIFT_MET - 1) * kg * workoutStats(w).duration) / 36e5, 0);
  const workoutKcal = (liftKcal + acts.reduce((n, a) => n + activityKcal(a), 0)) / days;
  const confidence = logged.length >= 24 && tr.length >= 12 ? 'Good' : logged.length >= 18 && tr.length >= 7 ? 'Fair' : 'Rough';
  return { ready: true, tdee, intake, dKg, span, workoutKcal, resting: tdee - workoutKcal, logged: logged.length, weighins: tr.length, confidence, workouts: ws.length, activities: acts.length };
}

/** Weight trend with a smaller line of calories eaten (7-day average) and your maintenance level under it. */
function metaChart(m, days) {
  const start = Date.now() - days * 864e5;
  const weight = trend().filter((p) => p.x >= start);
  const daily = [];
  for (let ts = start + 864e5; ts < Date.now(); ts += 864e5) {
    const k = ymd(ts);
    if (k === ymd()) continue;
    const t = dayTotals(k);
    if (t.entries && t.kcal > 600) daily.push({ x: new Date(k + 'T12:00').getTime(), kcal: t.kcal });
  }
  const kcal = daily.map((d) => {
    const wk = daily.filter((e) => e.x <= d.x && e.x > d.x - 7 * 864e5);
    return { x: d.x, y: Math.round(wk.reduce((n, e) => n + e.kcal, 0) / wk.length) };
  });
  return [
    lineChart(weight.map((p) => ({ ...p, y: +bodyDisplay(p.y) })), {
      height: 170, dots: false, fmtY: (v) => (Math.abs(v - Math.round(v)) < 0.05 ? Math.round(v) : v.toFixed(1)), label: 'Weight trend with calories eaten',
      overlay: { data: kcal, color: COLORS.calories, ref: Math.round(m.tdee), refLabel: `${fmtNum(m.tdee)} kcal` },
      tip: (p) => `<b>${bodyDisplay(p.raw)} ${bodyUnit()}</b><span>${p.over != null ? `${fmtNum(p.over)} kcal a day · ` : ''}${fmtDate(p.x, { month: 'short', day: 'numeric' })}</span>`,
    }),
    h('div.chart-legend',
      h('span', h('i.key-line', { style: { background: COLORS.gold } }), 'Weight trend'),
      h('span', h('i.key-line.thin', { style: { background: COLORS.calories } }), 'Calories (7-day avg)'),
      h('span', h('i.key-line.dash', { style: { borderColor: COLORS.calories } }), `Maintenance ${fmtNum(m.tdee)}`)),
  ];
}

export function trendsPage() {
  const el = h('div.page');
  const body = swipeSegment(h('div.scroll-body'));

  function draw() {
    const now = Date.now();
    const start = now - range * 864e5;
    const m = metabolism(Math.max(28, Math.min(range, 56)));
    const g = state.goals;

    // Daily food
    const days = [];
    for (let ts = start + 864e5; ts <= now; ts += 864e5) { const k = ymd(ts); const t = dayTotals(k); days.push({ x: ts, k, kcal: t.kcal, p: t.p, logged: t.entries > 0 }); }
    const short = range > 60;   // long ranges: weekly averages instead of daily bars
    const foodSeries = (key) => short
      ? weeklyAvg(days, key)
      : days.map((d) => ({ x: d.x, y: Math.round(d[key]) }));

    // Weekly training
    const weeks = [];
    for (let w = weekStart(start); w <= now; w = weekStart(w + 8 * 864e5)) {
      const ws = state.workouts.filter((x) => x.start >= w && x.start < w + 7 * 864e5);
      weeks.push({ x: w, y: ws.length, vol: ws.reduce((n, x) => n + workoutStats(x).volume, 0) });
    }
    const weight = trend().filter((p) => p.x >= start);
    const fmtDay = (t) => fmtDate(t, { month: 'short', day: 'numeric' });

    fill(body,
      navBar({ title: 'Trends', backLabel: 'Home', large: true }),
      h('div.segment.range', [[28, '4W'], [91, '3M'], [182, '6M'], [365, '1Y']].map(([d, l]) => h('button' + (range === d ? '.on' : ''), { onclick: () => { range = d; draw(); } }, l))),

      // Metabolism
      h('div.section-head', h('h2.section-title', 'Your metabolism')),
      m.ready
        ? h('section.card.meta-card',
          h('div.meta-top',
            h('div', h('div.energy-v', fmtNum(m.tdee)), h('div.energy-k', 'kcal a day to maintain')),
            h('div.energy-goal', h('div.meta-rest', fmtNum(m.resting)), h('div.energy-k', 'without workouts'))),
          h('p.fine', `You ate ${fmtNum(m.intake)} kcal a day on average and your weight trend moved ${m.dKg >= 0 ? '+' : '−'}${bodyDisplay(Math.abs(m.dKg))} ${bodyUnit()} over ${Math.round(m.span)} days. Your ${m.workouts} gym workout${m.workouts === 1 ? '' : 's'}${m.activities ? ` and ${m.activities} activit${m.activities === 1 ? 'y' : 'ies'}` : ''} burned about ${fmtNum(m.workoutKcal)} kcal a day on top of your resting burn.${m.activities ? '' : ' Import runs and rides on Fitness to sharpen this.'}`),
          metaChart(m, Math.max(28, Math.min(range, 56))),
          h('div.meta-foot', h('span', `Confidence: ${m.confidence}`), h('span', `${m.logged} days of food · ${m.weighins} weigh-ins`)),
          h('p.fine', 'An estimate that sharpens the more days you log. Eat about 300–500 kcal under maintenance to lose fat, or 200–300 over to build muscle.'))
        : h('section.card.meta-card',
          h('div.empty-title.left', 'Not enough data yet'),
          h('p.fine', 'Carver works out your maintenance calories from what you eat and how your weight moves. Daily weight swings with water, so it waits until there’s enough to see through that.'),
          [[`Days of food logged`, m.logged, NEED.food], [`Weigh-ins`, m.weighins, NEED.weigh], [`Days between first and last weigh-in`, m.spread, NEED.spread]].map(([l, v, n]) => h('div.need-row',
            h('div.need-line', h('span', l), h('b' + (v >= n ? '.done' : ''), v >= n ? '✓' : `${v} of ${n}`)),
            h('div.lb-bar', h('i', { style: { width: Math.min(100, (v / n) * 100) + '%' } })))),
          h('p.fine', 'Over the last 4 weeks. Log everything you eat for the day, and weigh in a few mornings a week.')),

      h('div.section-head', h('h2.section-title', 'Weight')),
      h('section.card.chart-card', lineChart(weight.map((p) => ({ ...p, y: +bodyDisplay(p.y) })), {
        height: 170, dots: weight.length < 30, fmtY: (v) => Math.round(v), label: 'Weight trend', empty: 'Log your weight to see it here',
        tip: (p) => `<b>${bodyDisplay(p.raw)} ${bodyUnit()}</b><span>Trend ${p.y} · ${fmtDay(p.x)}</span>`,
      })),

      h('div.section-head', h('h2.section-title', 'Calories'), h('span.section-count', short ? 'weekly average' : 'per day')),
      h('section.card.chart-card', barChart(foodSeries('kcal'), {
        height: 160, color: COLORS.calories, goal: g.kcal, fmtY: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v), fmtX: fmtDay, label: 'Calories per day', empty: 'Log food to see it here',
        tip: (p) => `<b>${fmtNum(p.y)} kcal</b><span>${fmtDay(p.x)}</span>`,
      })),

      h('div.section-head', h('h2.section-title', 'Protein'), h('span.section-count', short ? 'weekly average' : 'per day')),
      h('section.card.chart-card', barChart(foodSeries('p'), {
        height: 160, color: COLORS.protein, goal: g.p, fmtX: fmtDay, label: 'Protein per day', empty: 'Log food to see it here',
        tip: (p) => `<b>${fmtNum(p.y)} g</b><span>${fmtDay(p.x)}</span>`,
      })),

      h('div.section-head', h('h2.section-title', 'Workouts'), h('span.section-count', 'per week')),
      h('section.card.chart-card', barChart(weeks.map((w) => ({ ...w, color: w.y >= g.workoutsPerWeek ? COLORS.gold : COLORS.gym, dim: w.y < g.workoutsPerWeek })), {
        height: 140, goal: g.workoutsPerWeek, fmtX: fmtDay, label: 'Workouts per week', empty: 'Finish a workout to see it here',
        tip: (p) => `<b>${p.y} workout${p.y === 1 ? '' : 's'}</b><span>Week of ${fmtDay(p.x)}</span>`,
      })),

      h('div.section-head', h('h2.section-title', 'Volume'), h('span.section-count', `${unit()} per week`)),
      h('section.card.chart-card', barChart(weeks.map((w) => ({ x: w.x, y: Math.round(+toDisplay(w.vol) || 0) })), {
        height: 140, color: COLORS.gold, fmtY: (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v), fmtX: fmtDay, label: 'Training volume per week', empty: 'Finish a workout to see it here',
        tip: (p) => `<b>${fmtNum(p.y)} ${unit()}</b><span>Week of ${fmtDay(p.x)}</span>`,
      })),
      h('div.bottom-space'),
    );
  }
  draw();
  el.append(body);
  return { el, refresh: draw };
}

/** Average of the logged days in each week. */
function weeklyAvg(days, key) {
  const out = new Map();
  for (const d of days) {
    if (!d.logged) continue;
    const w = weekStart(d.x);
    const cur = out.get(w) || { n: 0, sum: 0 };
    cur.n++; cur.sum += d[key];
    out.set(w, cur);
  }
  return [...out.entries()].map(([x, v]) => ({ x, y: Math.round(v.sum / v.n) }));
}
