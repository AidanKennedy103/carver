// Your own Home widgets: pick any number Carver tracks (a lift's max, weight, steps,
// sleep, protein, a habit's streak…), show it as a big number or a number with a
// small chart. Saved in settings.widgets = [{ id, k, p, chart }]; on Home each one is
// the section 'w:<id>', so it moves and removes like any other.

import { h, fill, sheet, toast, fmtNum } from './ui.js';
import { state, commit, uid, ymd, addDays, exercise, e1rmHistory, toDisplay, unit, bodyDisplay, bodyUnit, dayTotals, dayGoals, waterOn, weekStart, workoutStats, homeSections, gymWorkouts } from './store.js';
import { lineChart } from './charts.js';
import { trend, latestWeight } from './body.js';
import { healthDay } from './health.js';
import { dayPoints, pointsGoal } from './fitness.js';
import { readiness, sleepOn } from './recovery.js';
import { fuelScore } from './nutrition.js';
import { habits, streak, stage, FORM_DAYS } from './habits.js';

const days = (n, f) => Array.from({ length: n }, (_, i) => addDays(ymd(), i - n + 1)).map((k) => ({ x: new Date(k + 'T12:00').getTime(), y: f(k) }));
const comp = (key) => (state.body.comp || []).filter((x) => x[key] != null);

/** Everything a widget can show. value(p) → { v, unit, sub, series } (null when there's nothing yet). */
export const METRICS = [
  { k: 'e1rm', name: 'Lift max', group: 'Strength', param: 'exercise', tab: 'workout', value: (p) => {
    const hist = e1rmHistory(p);
    if (!hist.length) return null;
    const last = hist[hist.length - 1];
    return { v: toDisplay(last.y), unit: unit(), sub: `${exercise(p).name} · estimated 1-rep max`, series: hist.slice(-20).map((x) => ({ x: x.x, y: +toDisplay(x.y) })) };
  } },
  { k: 'workouts', name: 'Workouts this week', group: 'Strength', tab: 'workout', value: () => {
    const n = gymWorkouts().filter((w) => w.start >= weekStart()).length;
    return { v: n, unit: `/ ${state.goals.workoutsPerWeek || 3}`, sub: 'Workouts this week', series: null };
  } },
  { k: 'volume', name: 'Weekly volume', group: 'Strength', tab: 'workout', value: () => {
    const wk = (s) => gymWorkouts().filter((w) => w.start >= s && w.start < s + 7 * 864e5).reduce((n, w) => n + workoutStats(w).volume, 0);
    const series = Array.from({ length: 8 }, (_, i) => { const s = weekStart(Date.now() - (7 - i) * 7 * 864e5); return { x: s, y: +toDisplay(wk(s)) }; });
    return { v: fmtNum(series[7].y), unit: unit(), sub: 'Lifted this week', series };
  } },
  { k: 'weight', name: 'Weight', group: 'Body', tab: 'body', value: () => {
    const w = latestWeight();
    if (!w) return null;
    return { v: bodyDisplay(w.kg), unit: bodyUnit(), sub: 'Body weight', series: trend().filter((p) => p.x > Date.now() - 60 * 864e5).map((p) => ({ x: p.x, y: +bodyDisplay(p.y) })) };
  } },
  { k: 'fat', name: 'Body fat', group: 'Body', tab: 'body', value: () => {
    const list = comp('fat');
    if (!list.length) return null;
    return { v: list[list.length - 1].fat, unit: '%', sub: 'Body fat', series: list.slice(-20).map((x) => ({ x: x.ts, y: x.fat })) };
  } },
  { k: 'steps', name: 'Steps', group: 'Activity', tab: 'fitness', value: () => {
    const today = healthDay()?.steps;
    const s = days(7, (k) => healthDay(k)?.steps || 0);
    if (!s.some((x) => x.y)) return null;
    return { v: fmtNum(today ?? s[5].y), unit: 'steps', sub: today != null ? 'Today' : 'Yesterday (last import)', series: s };
  } },
  { k: 'points', name: 'Activity points', group: 'Activity', tab: 'fitness', value: () => ({ v: dayPoints(ymd()).total, unit: `/ ${pointsGoal()}`, sub: 'Activity points today', series: days(7, (k) => dayPoints(k).total) }) },
  { k: 'cardio', name: 'Cardio this week', group: 'Activity', tab: 'fitness', value: () => {
    const mins = Math.round(state.activities.filter((a) => a.start >= weekStart()).reduce((n, a) => n + a.dur, 0) / 6e4);
    return { v: mins, unit: 'min', sub: 'Cardio this week', series: null };
  } },
  { k: 'readiness', name: 'Readiness', group: 'Recovery', tab: 'recovery', value: () => { const r = readiness(); return r ? { v: r.score, unit: '/ 100', sub: r.word, series: days(14, (k) => readiness(k)?.score || 0) } : null; } },
  { k: 'sleep', name: 'Sleep', group: 'Recovery', tab: 'recovery', value: () => {
    const s = days(7, (k) => sleepOn(k) || 0);
    const last = sleepOn() ?? sleepOn(addDays(ymd(), -1));
    return last != null ? { v: last, unit: 'h', sub: 'Last night', series: s } : null;
  } },
  { k: 'hrv', name: 'HRV', group: 'Recovery', tab: 'recovery', value: () => { const s = days(14, (k) => healthDay(k)?.hrv || 0).filter((x) => x.y); return s.length ? { v: s[s.length - 1].y, unit: 'ms', sub: 'Heart rate variability', series: s } : null; } },
  { k: 'rhr', name: 'Resting heart rate', group: 'Recovery', tab: 'recovery', value: () => { const s = days(14, (k) => healthDay(k)?.rhr || 0).filter((x) => x.y); return s.length ? { v: s[s.length - 1].y, unit: 'bpm', sub: 'Resting heart rate', series: s } : null; } },
  { k: 'kcal', name: 'Calories', group: 'Nutrition', tab: 'nutrition', value: () => ({ v: fmtNum(Math.round(dayTotals(ymd()).kcal)), unit: `/ ${fmtNum(dayGoals(ymd()).kcal)}`, sub: 'Calories today', series: days(7, (k) => Math.round(dayTotals(k).kcal)) }) },
  { k: 'protein', name: 'Protein', group: 'Nutrition', tab: 'nutrition', value: () => ({ v: Math.round(dayTotals(ymd()).p), unit: `/ ${dayGoals(ymd()).p} g`, sub: 'Protein today', series: days(7, (k) => Math.round(dayTotals(k).p)) }) },
  { k: 'fiber', name: 'Fiber', group: 'Nutrition', tab: 'nutrition', value: () => ({ v: Math.round(dayTotals(ymd()).fib || 0), unit: 'g', sub: 'Fiber today', series: days(7, (k) => Math.round(dayTotals(k).fib || 0)) }) },
  { k: 'water', name: 'Water', group: 'Nutrition', tab: 'nutrition', value: () => ({ v: +(waterOn(ymd()) / 1000).toFixed(2), unit: 'L', sub: 'Water today', series: days(7, (k) => +(waterOn(k) / 1000).toFixed(2)) }) },
  { k: 'fuel', name: 'Fuel score', group: 'Nutrition', tab: 'nutrition', value: () => ({ v: fuelScore(dayTotals(ymd()), dayGoals(ymd())) ?? '–', unit: '/ 100', sub: 'Fuel score today', series: days(7, (k) => fuelScore(dayTotals(k), dayGoals(k)) || 0) }) },
  { k: 'habit', name: 'Habit streak', group: 'Habits', param: 'habit', tab: 'habits', value: (p) => {
    const g = habits().find((x) => x.id === p);
    if (!g) return null;
    const st = stage(g);
    return { v: streak(g), unit: 'days', sub: `${g.name} · ${st.word}${st.n < FORM_DAYS ? ` (${st.n}/${FORM_DAYS})` : ''}`, series: null };
  } },
];
const metric = (k) => METRICS.find((m) => m.k === k);

export const widgets = () => state.settings.widgets || [];
export const widgetOf = (sectionId) => widgets().find((w) => 'w:' + w.id === sectionId) || null;
/** Name and description, for the Home editor. */
export function widgetInfo(sectionId) {
  const w = widgetOf(sectionId);
  if (!w) return null;
  const m = metric(w.k);
  const p = m?.param === 'exercise' ? exercise(w.p).name : m?.param === 'habit' ? habits().find((x) => x.id === w.p)?.name : null;
  return { id: sectionId, name: p ? `${m.name}: ${p}` : m?.name || 'Widget', sub: 'Your widget' };
}

/** The widget on Home. */
export function widgetCard(sectionId, { preview = null, onOpen = null } = {}) {
  const w = preview || widgetOf(sectionId);
  const m = w && metric(w.k);
  if (!m) return null;
  let v = null;
  try { v = m.value(w.p); } catch { v = null; }
  return h('button.card.widget' + (w.chart && v?.series?.length > 1 ? '.with-chart' : ''), { onclick: () => onOpen?.(m.tab), 'aria-label': m.name },
    h('div.widget-text',
      h('div.widget-label', v?.sub || m.name),
      v ? h('div.widget-v', h('b', String(v.v)), h('span', ` ${v.unit}`)) : h('div.widget-none', 'Nothing yet')),
    w.chart && v?.series?.length > 1 ? h('div.widget-chart', lineChart(v.series, { height: 56, axes: false, dots: false, label: m.name })) : null);
}

/** Build a widget: what to show, which lift or habit, and number or number + chart. */
export function widgetBuilder(onSave) {
  const lifts = [...new Set(gymWorkouts().flatMap((w) => w.exercises.map((e) => e.exId)))].filter((id) => exercise(id).type === 'wr' && e1rmHistory(id).length);
  const w = { id: uid(), k: lifts.length ? 'e1rm' : 'weight', p: lifts[0] || null, chart: true };
  const body = h('div');
  function draw() {
    const m = metric(w.k);
    if (m.param === 'exercise' && !lifts.includes(w.p)) w.p = lifts[0] || null;
    if (m.param === 'habit' && !habits().some((x) => x.id === w.p)) w.p = habits()[0]?.id || null;
    const groups = [...new Set(METRICS.map((x) => x.group))];
    fill(body,
      h('div.wb-preview', widgetCard(null, { preview: w })),
      h('label.form-label', 'Show'),
      groups.map((g) => h('div.wb-group', h('span.wb-group-name', g), h('div.chips.tight.no-drag', METRICS.filter((x) => x.group === g && (x.param !== 'exercise' || lifts.length) && (x.param !== 'habit' || habits().length))
        .map((x) => h('button.chip' + (x.k === w.k ? '.on' : ''), { onclick: () => { w.k = x.k; draw(); } }, x.name))))),
      m.param === 'exercise' ? [h('label.form-label', 'Lift'), h('div.chips.tight.no-drag', lifts.map((id) => h('button.chip' + (id === w.p ? '.on' : ''), { onclick: () => { w.p = id; draw(); } }, exercise(id).name)))] : null,
      m.param === 'habit' ? [h('label.form-label', 'Habit'), h('div.chips.tight.no-drag', habits().map((g) => h('button.chip' + (g.id === w.p ? '.on' : ''), { onclick: () => { w.p = g.id; draw(); } }, g.name)))] : null,
      h('label.form-label', 'Style'),
      h('div.segment', [[false, 'Number'], [true, 'Number + chart']].map(([v, l]) => h('button' + (w.chart === v ? '.on' : ''), { onclick: () => { w.chart = v; draw(); } }, l))));
  }
  draw();
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', 'New widget'), h('button.link.strong', { onclick: save }, 'Add')),
    body));
  function save() {
    const m = metric(w.k);
    if (m.param && !w.p) { toast(m.param === 'habit' ? 'Add a habit first' : 'Log a lift first'); return; }
    commit((st) => {
      st.settings.widgets = [...(st.settings.widgets || []), { ...w }];
      st.settings.home = [...homeSections(), 'w:' + w.id];
    });
    s.close();
    toast('Widget added to Home');
    onSave?.();
  }
}

