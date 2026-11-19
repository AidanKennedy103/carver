// Looking back at what you ate: one day's micronutrients, and a report of
// averages over 7 or 30 days (macros against goals, where calories come from,
// your top foods, and the vitamins and minerals you tend to run low on).

import { h, fill, navBar, swipeSegment } from './ui.js';
import { state, ymd, addDays, dayLog, dayTotals, food, kcalHit, daySkipped } from './store.js';
import { MACROS, MICROS, NUTRIENT_KEYS } from './foods.js';
import { COLORS } from './charts.js';
import { MEALS, MACRO_COLOR, r0, fmtAmt, dayLabel } from './food-util.js';
import { foodIcon } from './food-icons.js';

function bar(v, goal, color) {
  const pct = goal ? Math.min(100, (v / goal) * 100) : 0;
  return h('div.bar', h('div.bar-fill', { style: { width: pct + '%', background: color } }));
}

function splitCard(t) {
  const kTot = t.p * 4 + t.c * 4 + t.f * 9;
  return h('section.card',
    kTot ? h('div.split-bar.big', MACROS.map((m) => h('i', { style: { width: ((t[m.k] * m.kcal) / kTot) * 100 + '%', background: MACRO_COLOR[m.k] } }))) : h('div.muted', 'Nothing logged yet.'),
    h('div.split-legend', MACROS.map((m) => h('div.pm', h('i.swatch', { style: { background: MACRO_COLOR[m.k] } }),
      h('b', kTot ? `${Math.round(((t[m.k] * m.kcal) / kTot) * 100)}%` : '—'), h('span', `${m.name} · ${r0(t[m.k])} g`)))));
}

function microRows(t, groups = [...new Set(MICROS.map((m) => m.group))]) {
  return groups.map((gname) => [
    h('div.section-head', h('h2.section-title', gname)),
    h('section.card.list-card', MICROS.filter((m) => m.group === gname).map((m) => {
      const v = t[m.k] || 0;
      const tgt = m.target || m.max;
      const pct = tgt ? (v / tgt) * 100 : null;
      const over = m.max && v > m.max;
      return h('div.micro-row',
        h('div.micro-head', h('span', m.name),
          h('span.micro-val', `${fmtAmt(v)} ${m.unit}`, tgt ? h('span.muted', ` / ${tgt} ${m.unit}${m.max && !m.target ? ' max' : ''}`) : null)),
        tgt ? h('div.bar', h('div.bar-fill', { style: { width: Math.min(100, pct) + '%', background: over ? 'var(--red)' : pct >= 100 ? 'var(--gold)' : 'var(--muted)' } })) : null,
        tgt ? h('div.micro-pct' + (over ? '.red-text' : pct >= 100 ? '.gold-text' : ''), over ? `${Math.round(pct)}% of the limit` : `${Math.round(pct)}%`) : null);
    })),
  ]);
}

// ---------- One day ----------

export function microsScreen(date) {
  const t = dayTotals(date);
  const quick = dayLog(date).filter((e) => e.quick).length;
  const el = h('div.page',
    navBar({ title: dayLabel(date), backLabel: 'Nutrition' }),
    h('div.scroll-body',
      h('h2.detail-title', 'Nutrients'),
      h('div.detail-date', `${r0(t.kcal).toLocaleString()} kcal from ${t.entries} item${t.entries === 1 ? '' : 's'}`),
      h('div.section-head', h('h2.section-title', 'Energy split')),
      splitCard(t),
      microRows(t),
      quick ? h('p.fine', `${quick} quick add${quick > 1 ? 's' : ''} only count toward calories and macros.`) : null,
      h('p.fine', 'Targets are general adult reference intakes. Values are approximate.'),
      h('div.bottom-space'),
    ),
  );
  return { el };
}

// ---------- Report over several days ----------

/** Averages over the days you logged in the last `days` days (today included if logged). */
export function report(days) {
  const keys = [];
  for (let i = days - 1; i >= 0; i--) keys.push(addDays(ymd(), -i));
  const logged = keys.filter((k) => dayLog(k).length && !daySkipped(k));
  const sum = {};
  for (const k of NUTRIENT_KEYS) sum[k] = 0;
  const byMeal = Object.fromEntries(MEALS.map((m) => [m.id, 0]));
  const foods = new Map();
  let quick = 0, entries = 0;
  for (const k of logged) {
    for (const e of dayLog(k)) {
      entries++;
      if (e.quick) quick++;
      for (const n of NUTRIENT_KEYS) sum[n] += e.n?.[n] || 0;
      byMeal[e.meal] = (byMeal[e.meal] || 0) + (e.n.kcal || 0);
      if (!e.quick) {
        const id = e.foodId || e.name;
        const f = foods.get(id) || { name: e.name, icon: food(e.foodId)?.icon || e.icon, kcal: 0, p: 0, times: 0 };
        f.kcal += e.n.kcal || 0; f.p += e.n.p || 0; f.times++;
        foods.set(id, f);
      }
    }
  }
  const n = logged.length || 1;
  const avg = Object.fromEntries(Object.entries(sum).map(([k, v]) => [k, v / n]));
  // Vitamins and minerals: only days where most calories came from real foods (quick adds have none)
  const microDays = logged.filter((k) => {
    const list = dayLog(k), all = list.reduce((s, e) => s + (e.n.kcal || 0), 0);
    return all > 0 && list.filter((e) => !e.quick).reduce((s, e) => s + (e.n.kcal || 0), 0) >= all * 0.7;
  });
  const micro = {};
  for (const m of MICROS) micro[m.k] = microDays.reduce((s, k) => s + (dayTotals(k)[m.k] || 0), 0) / (microDays.length || 1);
  const g = state.goals;
  const daysHit = (fn) => logged.filter((k) => fn(dayTotals(k), k)).length;
  return {
    days, logged: logged.length, avg, micro, microDays: microDays.length, entries, quick,
    proteinDays: daysHit((t) => t.p >= g.p),
    kcalDays: daysHit((t, k) => kcalHit(t.kcal, g.kcal, k)),
    meals: MEALS.map((m) => ({ ...m, kcal: byMeal[m.id] / n })),
    topKcal: [...foods.values()].sort((a, b) => b.kcal - a.kcal).slice(0, 5),
    topProtein: [...foods.values()].filter((f) => f.p > 0).sort((a, b) => b.p - a.p).slice(0, 5),
    low: microDays.length ? MICROS.filter((m) => m.target && !m.max && micro[m.k] < m.target * 0.5).map((m) => m.name) : [],
    high: microDays.length ? MICROS.filter((m) => m.max && micro[m.k] > m.max).map((m) => m.name) : [],
  };
}

let range = 7;

export function reportScreen() {
  const el = h('div.page');
  const body = swipeSegment(h('div.scroll-body'));

  function draw() {
    const r = report(range);
    const g = state.goals;
    const mealTot = r.meals.reduce((s, m) => s + m.kcal, 0) || 1;
    fill(body,
      navBar({ title: 'Nutrition report', backLabel: 'Nutrition', large: true }),
      h('div.segment.range', [[7, 'Last 7 days'], [30, 'Last 30 days']].map(([d, l]) => h('button' + (range === d ? '.on' : ''), { onclick: () => { range = d; draw(); } }, l))),
      !r.logged ? h('div.feed-empty.card', 'Log some food to see your report.') : [
        h('p.fine', `Averages over the ${r.logged} day${r.logged === 1 ? '' : 's'} you logged out of ${r.days}.`),

        h('section.card.energy',
          h('div.energy-top',
            h('div', h('div.energy-v', r0(r.avg.kcal).toLocaleString()), h('div.energy-k', 'kcal a day')),
            h('div.energy-goal', h('div.energy-v.small-v', `${r.kcalDays}/${r.logged}`), h('div.energy-k', 'days on target'))),
          bar(r.avg.kcal, g.kcal, COLORS.calories),
          h('div.macro-rows', MACROS.map((m) => h('div.macro-row',
            h('div.macro-head', h('span.macro-name', h('i.swatch', { style: { background: MACRO_COLOR[m.k] } }), m.name), h('span.macro-val', `${r0(r.avg[m.k])} / ${g[m.k]} g`)),
            bar(r.avg[m.k], g[m.k], MACRO_COLOR[m.k])))),
          h('div.report-hit', `Protein goal hit on ${r.proteinDays} of ${r.logged} day${r.logged === 1 ? '' : 's'}`)),

        h('div.section-head', h('h2.section-title', 'Energy split')),
        splitCard(r.avg),

        h('div.section-head', h('h2.section-title', 'Calories by meal')),
        h('section.card.list-card', r.meals.map((m) => h('div.report-row',
          h('span.report-name', m.name),
          h('span.report-bar', h('i', { style: { width: (m.kcal / mealTot) * 100 + '%' } })),
          h('span.report-val', `${r0(m.kcal)} kcal`)))),

        r.topKcal.length ? [
          h('div.section-head', h('h2.section-title', 'Most calories from')),
          h('section.card.list-card', r.topKcal.map((f) => h('div.food-line.static',
            h('span.food-ico', foodIcon(f.icon)), h('span.food-text', h('span.food-name', f.name), h('span.food-sub', `${f.times} time${f.times === 1 ? '' : 's'}`)),
            h('span.food-kcal', `${r0(f.kcal / r.logged)}`, h('span.food-sub', ' /day'))))),
          h('div.section-head', h('h2.section-title', 'Most protein from')),
          h('section.card.list-card', r.topProtein.map((f) => h('div.food-line.static',
            h('span.food-ico', foodIcon(f.icon)), h('span.food-text', h('span.food-name', f.name), h('span.food-sub', `${f.times} time${f.times === 1 ? '' : 's'}`)),
            h('span.food-kcal', `${r0(f.p / r.logged)} g`, h('span.food-sub', ' /day'))))),
        ] : null,

        r.microDays ? [
          h('div.section-head', h('h2.section-title', 'Vitamins and minerals')),
          h('p.fine', `Averaged over ${r.microDays} day${r.microDays === 1 ? '' : 's'} logged mostly as foods.`),
          r.low.length || r.high.length ? h('section.card.report-flags',
            r.low.length ? h('div', h('b', 'Often low: '), r.low.join(', ')) : null,
            r.high.length ? h('div.red-text', h('b', 'Over the limit: '), r.high.join(', ')) : null) : null,
          microRows(r.micro),
        ] : h('p.fine', 'Shows up once you log days mostly with foods from the list.'),
      ],
      h('div.bottom-space'),
    );
  }
  draw();
  el.append(body);
  return { el, refresh: draw };
}
