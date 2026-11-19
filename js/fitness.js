// Fitness: runs, walks, rides and other cardio. Imported from Apple Health (a
// Shortcut copies them, you paste) or added by hand. Gym workouts live in Workout.

import { h, fill, icon, navBar, sheet, toast, confirmBox, fmtDate, fmtNum, fmtDurationWords } from './ui.js';
import { state, commit, uid, distUnit, weekStart } from './store.js';
import { barChart, COLORS } from './charts.js';
import { latestWeight, findDate } from './body.js';
import { goalsButton } from './goals.js';

export const ACTIVITY_TYPES = [
  { id: 'run', name: 'Run', icon: '🏃', met: 9.8, words: ['run', 'running', 'jog'] },
  { id: 'walk', name: 'Walk', icon: '🚶', met: 3.5, words: ['walk', 'walking'] },
  { id: 'cycle', name: 'Ride', icon: '🚴', met: 7.5, words: ['cycl', 'bike', 'biking', 'ride', 'spin'] },
  { id: 'hike', name: 'Hike', icon: '🥾', met: 6, words: ['hike', 'hiking'] },
  { id: 'swim', name: 'Swim', icon: '🏊', met: 7, words: ['swim'] },
  { id: 'row', name: 'Row', icon: '🚣', met: 7, words: ['row'] },
  { id: 'elliptical', name: 'Elliptical', icon: '〰️', met: 5, words: ['elliptical', 'stair', 'step'] },
  { id: 'hiit', name: 'HIIT', icon: '🔥', met: 8, words: ['hiit', 'interval', 'cross', 'functional', 'circuit'] },
  { id: 'sport', name: 'Sport', icon: '⚽', met: 7, words: ['soccer', 'basketball', 'tennis', 'hockey', 'football', 'volleyball', 'pickleball', 'badminton', 'squash', 'golf', 'climb', 'skat', 'ski', 'snowboard', 'box', 'martial'] },
  { id: 'yoga', name: 'Yoga', icon: '🧘', met: 2.5, words: ['yoga', 'pilates', 'stretch', 'flexibility', 'cooldown', 'mind'] },
  { id: 'other', name: 'Other', icon: '⭐', met: 5, words: [] },
];
const STRENGTH = /strength|weight ?lift|weights|core training/i;   // logged in the Workout tab instead
export const activityType = (id) => ACTIVITY_TYPES.find((t) => t.id === id) || ACTIVITY_TYPES[ACTIVITY_TYPES.length - 1];

const MI = 1609.344;
const metric = () => distUnit() === 'km';
const fmtDist = (m) => `${(m / (metric() ? 1000 : MI)).toFixed(m >= 100000 ? 0 : 1)} ${distUnit()}`;
const paceText = (a) => {
  if (!a.dist || !['run', 'walk', 'hike'].includes(a.type)) return '';
  const secs = a.dur / 1000 / (a.dist / (metric() ? 1000 : MI));
  return `${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, '0')} /${distUnit()}`;
};

/** Calories for an activity: what Health recorded, or an estimate from its type, your weight and time. */
export function activityKcal(a) {
  if (a.kcal) return a.kcal;
  const kg = latestWeight()?.kg || 75;
  return (activityType(a.type).met - 1) * kg * (a.dur / 36e5);   // minus resting, so it's only the extra burn
}

export const activities = () => state.activities;   // newest first

export function saveActivity(a) {
  commit((s) => {
    const i = s.activities.findIndex((x) => x.id === a.id);
    if (i >= 0) s.activities[i] = a; else s.activities.push(a);
    s.activities.sort((x, y) => y.start - x.start);
  });
}
function addImported(list) {
  let added = 0;
  commit((s) => {
    for (const a of list) {
      const dup = s.activities.some((x) => Math.abs(x.start - a.start) < 5 * 6e4 && x.type === a.type);
      if (dup) continue;
      s.activities.push({ id: uid(), source: 'health', ...a });
      added++;
    }
    s.activities.sort((x, y) => y.start - x.start);
  });
  return added;
}

// ---------- Reading pasted text ----------

function typeFrom(text) {
  const t = text.toLowerCase();
  for (const ty of ACTIVITY_TYPES) if (ty.words.some((w) => t.includes(w))) return ty.id;
  return null;
}

/**
 * Pull activities out of pasted text, one per line, e.g.
 *   "Running | 2026-11-14 07:30 | 32 min | 5.2 km | 410 kcal"
 *   "Walking, Nov 13, 2026 at 6:10 PM, 0:45:10, 3.1 mi, 190 cal"
 * Also takes JSON from export apps (type/start/duration/distance/energy fields).
 * Strength workouts are skipped: log those in the Workout tab.
 */
export function parseActivities(text) {
  const out = [];
  let skipped = 0;
  const trimmed = text.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      let data = JSON.parse(trimmed);
      if (!Array.isArray(data)) data = data.workouts || data.data?.workouts || [data];
      for (const w of data) {
        const name = String(w.type || w.name || w.workoutActivityType || w.activityType || '');
        if (STRENGTH.test(name)) { skipped++; continue; }
        const when = String(w.start || w.startDate || w.date || '');
        const start = Date.parse(when.replace(/^(\S+) (\S+) ([+-]\d{4})$/, '$1T$2$3')) || findDate(when)?.ts;
        let dur = +(w.duration ?? w.durationSeconds ?? 0);
        if (w.durationMinutes) dur = w.durationMinutes * 60;
        if (!start || !dur) continue;
        const dRaw = w.distance?.qty ?? w.distance ?? w.totalDistance;
        const dU = String(w.distance?.units || w.distanceUnit || 'km').toLowerCase();
        const dist = dRaw ? +dRaw * (dU.startsWith('mi') ? MI : dU === 'm' ? 1 : 1000) : null;
        const eRaw = w.activeEnergy?.qty ?? w.activeEnergyBurned ?? w.energy ?? w.calories ?? w.totalEnergyBurned;
        const kcal = eRaw ? +(eRaw.qty ?? eRaw) * (String(w.activeEnergy?.units || '').toLowerCase() === 'kj' ? 0.239 : 1) : null;
        out.push({ type: typeFrom(name) || 'other', name: name || null, start, dur: dur * 1000, dist, kcal: kcal ? Math.round(kcal) : null });
      }
      return { list: out, skipped };
    } catch { /* not JSON after all: read it as lines */ }
  }

  for (const raw of text.split(/\n+/)) {
    const line = raw.trim();
    if (!line) continue;
    if (STRENGTH.test(line)) { skipped++; continue; }
    const d = findDate(line);
    if (!d) continue;
    let rest = line.replace(d.match, ' ');
    let dur = 0;
    let m = rest.match(/\b(\d{1,2}):(\d{2}):(\d{2})\b/);
    if (m) { dur = (+m[1] * 3600 + +m[2] * 60 + +m[3]) * 1000; rest = rest.replace(m[0], ' '); }
    else {
      const hrs = rest.match(/(\d+(?:[.,]\d+)?)\s*(?:h|hr|hrs|hours?)\b/i);
      const mins = rest.match(/(\d+(?:[.,]\d+)?)\s*(?:m|min|mins|minutes?)\b(?!i)/i);
      const secs = rest.match(/(\d+(?:[.,]\d+)?)\s*(?:s|sec|secs|seconds?)\b/i);
      if (hrs) dur += parseFloat(hrs[1].replace(',', '.')) * 36e5;
      if (mins) dur += parseFloat(mins[1].replace(',', '.')) * 6e4;
      if (secs && !hrs && !mins) dur += parseFloat(secs[1].replace(',', '.')) * 1000;
      for (const x of [hrs, mins, secs]) if (x) rest = rest.replace(x[0], ' ');
    }
    if (!dur) continue;
    let dist = null;
    m = rest.match(/(\d+(?:[.,]\d+)?)\s*(km|kilometers?|kilometres?|mi|miles?|m|meters?|metres?)\b/i);
    if (m) {
      const v = parseFloat(m[1].replace(',', '.'));
      dist = /^k/i.test(m[2]) ? v * 1000 : /^mi/i.test(m[2]) ? v * MI : v;
      rest = rest.replace(m[0], ' ');
    }
    m = rest.match(/(\d+(?:[.,]\d+)?)\s*(kcal|cal|calories|kj)\b/i);
    const kcal = m ? Math.round(parseFloat(m[1].replace(',', '.')) * (/kj/i.test(m[2]) ? 0.239 : 1)) : null;
    out.push({ type: typeFrom(line) || 'other', start: d.ts, dur, dist, kcal });
  }
  return { list: out, skipped };
}

// ---------- Add / edit / import ----------

const pad = (n) => String(n).padStart(2, '0');
const localInput = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };

export function activitySheet(existing = null) {
  const a = existing ? { ...existing } : { id: uid(), type: 'run', start: Date.now() - 30 * 6e4, dur: 30 * 6e4, dist: null, kcal: null, source: 'manual' };
  const chips = h('div.chips.tight');
  const drawChips = () => fill(chips, ACTIVITY_TYPES.map((t) => h('button.chip' + (a.type === t.id ? '.on' : ''), { onclick: () => { a.type = t.id; drawChips(); } }, `${t.icon} ${t.name}`)));
  drawChips();
  const when = h('input.field', { type: 'datetime-local', value: localInput(a.start), 'aria-label': 'Start time' });
  const mins = h('input.field.goal-input', { inputmode: 'decimal', value: a.dur ? Math.round(a.dur / 6e4) : '', 'aria-label': 'Minutes' });
  const dist = h('input.field.goal-input', { inputmode: 'decimal', value: a.dist ? (a.dist / (metric() ? 1000 : MI)).toFixed(2).replace(/\.?0+$/, '') : '', placeholder: 'optional', 'aria-label': `Distance in ${distUnit()}` });
  const kcal = h('input.field.goal-input', { inputmode: 'numeric', value: a.kcal || '', placeholder: 'estimate', 'aria-label': 'Calories' });
  const row = (label, input, u) => h('label.goal-row', h('span', label), h('span.goal-field', input, h('span.goal-unit', u)));
  const save = () => {
    const n = (el) => parseFloat(el.value.replace(',', '.'));
    if (!(n(mins) > 0)) { toast('Enter how many minutes'); return; }
    const t = Date.parse(when.value);
    saveActivity({ ...a, start: isNaN(t) ? a.start : t, dur: n(mins) * 6e4, dist: n(dist) > 0 ? n(dist) * (metric() ? 1000 : MI) : null, kcal: n(kcal) > 0 ? Math.round(n(kcal)) : null });
    s.close();
    toast(existing ? 'Saved' : `${activityType(a.type).name} added`);
  };
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', existing ? 'Edit activity' : 'Add activity'), h('button.link.strong', { onclick: save }, 'Save')),
    chips,
    h('label.form-label', 'Started'), when,
    h('div.group', row('Time', mins, 'min'), row('Distance', dist, distUnit()), row('Calories', kcal, 'kcal')),
    h('p.fine', 'Leave calories blank and Carver estimates them from the activity, your time and your weight.'),
    existing ? h('button.btn.dark.wide.red-text', {
      onclick: async () => {
        if (!(await confirmBox('Delete this activity?', null, { ok: 'Delete', danger: true }))) return;
        commit((st) => { st.activities = st.activities.filter((x) => x.id !== a.id); });
        s.close();
      },
    }, 'Delete') : null,
  ));
}

export function importActivitiesSheet() {
  const box = h('textarea.field.paste-box', { rows: 4, placeholder: 'Paste activities here, e.g.\nRunning | 2026-11-14 07:30 | 32 min | 5.2 km | 410 kcal' });
  const doImport = (text) => {
    const { list, skipped } = parseActivities(text || '');
    if (!list.length) { toast(skipped ? 'Only strength workouts found. Log those in Workout.' : 'No activities found in that text'); return; }
    const added = addImported(list);
    toast(added ? `Imported ${added} activit${added > 1 ? 'ies' : 'y'}` : 'Those are already in Carver');
    if (added) s.close();
  };
  const s = sheet(h('div.form',
    h('div.sheet-head', h('span'), h('div.sheet-title', 'Import activities'), h('button.link.strong', { onclick: () => s.close() }, 'Done')),
    h('p.fine', 'iPhone web apps can’t read Apple Health directly, so a Shortcut copies your workouts (from your Apple Watch, Strava, Nike Run Club and anything else that saves to Health) and you paste them here.'),
    h('button.btn.gold.wide', {
      onclick: async () => {
        try { const t = await navigator.clipboard.readText(); box.value = t; doImport(t); }
        catch { toast('Tap the box and paste instead'); box.focus(); }
      },
    }, 'Paste from Health'),
    box,
    h('button.btn.dark.wide', { onclick: () => doImport(box.value) }, 'Import pasted text'),
    h('details.howto',
      h('summary', 'Set up the Shortcut (once)'),
      h('ol',
        h('li', 'Open Shortcuts → + → name it “Carver activities”.'),
        h('li', 'Add Find Health Samples: Type is Workouts, Start Date is in the last 30 days, sort by Start Date, Latest First.'),
        h('li', 'Add Repeat with Each. Inside it add Text: Repeat Item’s Type | Start Date (format ISO 8601) | Duration | Distance | Active Energy. Put a “|” between each.'),
        h('li', 'After the repeat, add Combine Text (new lines), then Copy to Clipboard.'),
        h('li', 'Run it after a workout, open Carver and tap Paste from Health.'),
      ),
      h('p.fine', 'If your iPhone doesn’t list Workouts in Find Health Samples, a free export app (like Health Auto Export) can copy them as JSON or CSV, which Carver also reads. Activities already in Carver are skipped, and strength workouts are left out because you log those in Workout.')),
  ));
}

// ---------- The page ----------

function activityRow(a) {
  const t = activityType(a.type);
  const bits = [fmtDurationWords(a.dur), a.dist ? fmtDist(a.dist) : '', paceText(a)].filter(Boolean).join(' · ');
  return h('button.food-line', { onclick: () => activitySheet(a) },
    h('span.food-ico', t.icon),
    h('span.food-text', h('span.food-name', a.name && t.id === 'other' ? a.name : t.name), h('span.food-sub', `${fmtDate(a.start, { month: 'short', day: 'numeric' })} · ${bits}`)),
    h('span.food-kcal', `${fmtNum(activityKcal(a))}`, h('span.food-sub', a.kcal ? ' kcal' : ' kcal est.')));
}

export function fitnessPage() {
  const el = h('div.page');
  const body = h('div.scroll-body');
  let showAll = false;

  function draw() {
    const list = activities();
    const wk = weekStart();
    const week = list.filter((a) => a.start >= wk);
    const sum = (arr, f) => arr.reduce((n, a) => n + (f(a) || 0), 0);
    const g = state.goals, mins = Math.round(sum(week, (a) => a.dur) / 6e4), dist = sum(week, (a) => a.dist);
    const weeks = [];
    for (let w = weekStart(Date.now() - 11 * 7 * 864e5); w <= Date.now(); w = weekStart(w + 8 * 864e5)) {
      const ws = list.filter((a) => a.start >= w && a.start < w + 7 * 864e5);
      weeks.push({ x: w, y: Math.round(sum(ws, (a) => a.dur) / 6e4) });
    }
    const fmtDay = (t) => fmtDate(t, { month: 'short', day: 'numeric' });
    const shown = showAll ? list : list.slice(0, 20);

    fill(body,
      navBar({ title: 'Fitness', back: false, large: true, right: [goalsButton('fitness'), h('button.icon-btn.gold-text', { onclick: () => activitySheet(), 'aria-label': 'Add activity' }, icon('plus', 24))] }),

      h('div.section-head', h('h2.section-title', 'This week')),
      h('div.tiles.three',
        h('div.tile' + (g.fitPerWeek && week.length >= g.fitPerWeek ? '.hit' : ''), h('div.tile-v', week.length, g.fitPerWeek ? h('span.tile-of', ` / ${g.fitPerWeek}`) : null), h('div.tile-k', 'Activities'),
          h('div.tile-sub', g.fitMins ? `${mins} of ${g.fitMins} min` : fmtDurationWords(sum(week, (a) => a.dur)))),
        h('div.tile' + (g.fitDist && dist >= g.fitDist ? '.hit' : ''), h('div.tile-v', week.some((a) => a.dist) ? fmtDist(dist).split(' ')[0] : '0', g.fitDist ? h('span.tile-of', ` / ${fmtDist(g.fitDist).split(' ')[0]}`) : null), h('div.tile-k', 'Distance'), h('div.tile-sub', distUnit())),
        h('div.tile', h('div.tile-v', fmtNum(sum(week, activityKcal))), h('div.tile-k', 'Burned'), h('div.tile-sub', 'active kcal'))),

      h('div.btn-pair',
        h('button.btn.gold', { onclick: importActivitiesSheet }, icon('apple', 18), 'Import'),
        h('button.btn.dark', { onclick: () => activitySheet() }, icon('plus', 18), 'Add')),

      h('div.section-head', h('h2.section-title', 'Minutes'), h('span.section-count', 'per week')),
      h('section.card.chart-card', barChart(weeks, {
        height: 140, color: COLORS.gold, fmtX: fmtDay, label: 'Activity minutes per week', empty: 'Import or add an activity to see it here',
        tip: (p) => `<b>${p.y} min</b><span>Week of ${fmtDay(p.x)}</span>`,
      })),

      h('div.section-head', h('h2.section-title', 'Activities'), list.length ? h('span.section-count', list.length) : null),
      list.length
        ? h('section.card.list-card', shown.map(activityRow))
        : h('button.card.empty-plan', { onclick: importActivitiesSheet },
          h('div.empty-title', 'Bring in your runs and rides'),
          h('div.empty-text', 'Import from Apple Health or add one by hand. They feed your metabolism estimate.')),
      list.length > shown.length ? h('button.link', { onclick: () => { showAll = true; draw(); } }, `Show all ${list.length}`) : null,
      h('div.bottom-space'),
    );
  }
  draw();
  el.append(body);
  return { el, refresh: draw };
}
