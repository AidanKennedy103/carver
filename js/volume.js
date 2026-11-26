// Weekly sets per muscle group: what your program asks for, and what you
// actually logged. Sets for the main muscle count fully; muscles that help
// (triceps on bench press, biceps on rows…) count half, a common way to tally it.

import { h, fill, icon, push, navBar, swipeSegment } from './ui.js';
import { state, commit, exercise, weekStart, splitPlans, gymWorkouts } from './store.js';

export const MUSCLE_ORDER = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core'];
// Smaller muscles: shown, but without the 10–20 set target (they mostly get work from the big lifts)
export const MINOR_MUSCLES = ['Traps', 'Lower back', 'Obliques', 'Adductors', 'Abductors'];
export const ALL_MUSCLES = [...MUSCLE_ORDER, ...MINOR_MUSCLES];
export const TARGET = [10, 20];   // weekly hard sets that suit most people building muscle

/** items: [{ exId, sets }] → { Chest: { direct, helper, total, from: [{ name, sets, half }] }, … } */
export function tally(items) {
  const out = Object.fromEntries(ALL_MUSCLES.map((m) => [m, { direct: 0, helper: 0, total: 0, from: new Map() }]));
  const add = (m, n, name, half) => {
    const t = out[m];
    if (!t) return;
    if (half) t.helper += n; else t.direct += n;
    const k = name + (half ? ' (helps)' : '');
    t.from.set(k, (t.from.get(k) || 0) + n);
  };
  for (const { exId, sets } of items) {
    if (!sets) continue;
    const ex = exercise(exId);
    if (ex.type === 'time' && ex.muscle === 'Cardio') continue;
    add(ex.muscle, sets, ex.name, false);
    for (const m of ex.helps || []) if (m !== ex.muscle) add(m, sets, ex.name, true);
  }
  for (const t of Object.values(out)) {
    t.total = t.direct + t.helper / 2;
    t.from = [...t.from.entries()].map(([name, sets]) => ({ name, sets })).sort((a, b) => b.sets - a.sets);
  }
  return out;
}

const workSets = (sets, doneOnly) => sets.filter((s) => s.type !== 'w' && (!doneOnly || s.done)).length;

/** How many times a week you run each plan (your program). Starts at once a week each. */
export const timesPerWeek = (planId) => state.settings.program?.[planId] ?? 1;

export function programTally() {
  const items = [];
  for (const p of splitPlans()) {
    const n = timesPerWeek(p.id);
    for (const e of p.exercises) items.push({ exId: e.exId, sets: workSets(e.sets, false) * n });
  }
  return tally(items);
}

/** Sets you actually logged, per week, over the last `weeks` full weeks (or the last 7 days when weeks = 0). */
export function loggedTally(weeks = 0) {
  const now = Date.now();
  const from = weeks ? weekStart(now) - weeks * 7 * 864e5 : now - 7 * 864e5;
  const to = weeks ? weekStart(now) : now;
  const items = [];
  for (const w of gymWorkouts()) {
    if (w.start < from || w.start >= to) continue;
    for (const e of w.exercises) items.push({ exId: e.exId, sets: workSets(e.sets, true) / (weeks || 1) });
  }
  return tally(items);
}

const r1 = (v) => (Math.round(v * 10) / 10).toString();
const status = (v) => (v < TARGET[0] ? 'low' : v > TARGET[1] ? 'high' : 'ok');

// ---------- Workout page card ----------

export function volumeCard() {
  const usePlans = splitPlans().length > 0;
  const t = usePlans ? programTally() : loggedTally(0);
  const vals = MUSCLE_ORDER.map((m) => [m, t[m].total]);
  return h('button.card.vol-card', { onclick: () => push(volumeScreen) },
    h('div.vol-card-top', h('span.vol-card-title', 'Weekly sets per muscle'), h('span.prompt-go', icon('back', 16))),
    h('div.vol-mini', vals.map(([m, v]) => h('div.vol-mini-col', { title: `${m}: ${r1(v)} sets` },
      h('div.vol-mini-bar', h('i.' + status(v), { style: { height: Math.min(100, (v / 24) * 100) + '%' } })),
      h('span', m.slice(0, 2))))));
}

// ---------- Full screen ----------

let view = null;   // 'program' | 'week' | 'avg'

export function volumeScreen() {
  const el = h('div.page');
  const body = swipeSegment(h('div.scroll-body'));
  if (!view) view = splitPlans().length ? 'program' : 'week';

  function draw() {
    const t = view === 'program' ? programTally() : view === 'week' ? loggedTally(0) : loggedTally(4);
    const total = MUSCLE_ORDER.reduce((n, m) => n + t[m].direct, 0);
    fill(body,
      navBar({ title: 'Sets per muscle', backLabel: 'Workout', large: true }),
      h('div.segment.range', [['program', 'Program'], ['week', 'Last 7 days'], ['avg', '4-week avg']].map(([v, l]) => h('button' + (view === v ? '.on' : ''), { onclick: () => { view = v; draw(); } }, l))),

      view === 'program' ? programEditor(draw) : null,

      h('section.card.vol-list',
        h('div.vol-legend',
          h('span', h('i.vol-key.direct'), 'Main muscle'),
          h('span', h('i.vol-key.helper'), 'Helping (counts half)'),
          h('span', h('i.vol-key.band'), `${TARGET[0]}–${TARGET[1]} sets`)),
        total ? [...MUSCLE_ORDER.map((m) => muscleRow(m, t[m])), h('div.vol-sub', 'Smaller muscles'), ...MINOR_MUSCLES.map((m) => muscleRow(m, t[m], true))] : h('div.feed-empty', view === 'program' ? 'Add exercises to your plans to see your weekly sets.' : 'Finish a workout to see your sets here.')),

      h('p.fine', 'Working sets only. 10–20 hard sets per muscle a week suits most people.'),
      h('div.bottom-space'),
    );
  }
  draw();
  el.append(body);
  return { el, refresh: draw };
}

function muscleRow(m, t, minor = false) {
  const max = 28;
  const pct = (v) => Math.min(100, (v / max) * 100);
  const st = minor ? 'minor' : status(t.total);
  return h('details.vol-row',
    h('summary',
      h('span.vol-name', m),
      h('span.vol-track',
        minor ? null : h('i.vol-band', { style: { left: pct(TARGET[0]) + '%', width: pct(TARGET[1]) - pct(TARGET[0]) + '%' } }),
        h('i.vol-direct', { style: { width: pct(t.direct) + '%' } }),
        h('i.vol-helper', { style: { left: pct(t.direct) + '%', width: pct(t.helper / 2) + '%' } })),
      h('span.vol-num', r1(t.total)),
      minor ? h('span.vol-tag.minor', '') : h('span.vol-tag.' + st, st === 'low' ? 'Low' : st === 'high' ? 'High' : 'Good')),
    t.from.length
      ? h('div.vol-from', t.from.map((f) => h('div', h('span', f.name), h('span', `${r1(f.sets)} set${f.sets === 1 ? '' : 's'}`))))
      : h('div.vol-from.muted', 'Nothing trains this yet.'));
}

function programEditor(redraw) {
  if (!splitPlans().length) return h('div.feed-empty.card', 'Add workouts to your split (Program builder → My workouts), then set how often you run each one here.');
  const set = (id, d) => { commit((s) => { s.settings.program = { ...(s.settings.program || {}), [id]: Math.max(0, Math.min(4, timesPerWeek(id) + d)) }; }); redraw(); };
  return h('section.card.list-card.prog',
    h('div.prog-head', 'How often you run each workout in your split'),
    splitPlans().map((p) => h('div.group-row',
      h('span', p.name),
      h('span.stepper',
        h('button', { 'aria-label': `Run ${p.name} less often`, onclick: () => set(p.id, -1) }, '−'),
        h('span', `${timesPerWeek(p.id)}×/wk`),
        h('button', { 'aria-label': `Run ${p.name} more often`, onclick: () => set(p.id, 1) }, '+')))));
}
