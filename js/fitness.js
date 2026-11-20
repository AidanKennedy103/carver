// Fitness: runs, walks, rides and other cardio. Imported from Apple Health (a
// Shortcut copies them, you paste) or added by hand. Gym workouts live in Workout.

import { h, fill, icon, navBar, sheet, toast, confirmBox, fmtDate, fmtNum, fmtDurationWords } from './ui.js';
import { state, commit, uid, distUnit, weekStart, ymd, addDays, workoutStats } from './store.js';
import { barChart, COLORS } from './charts.js';
import { latestWeight, findDate } from './body.js';
import { goalsButton } from './goals.js';
import { healthDay, hasHealth, importHealth } from './health.js';

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
export const STRENGTH = /strength|weight ?lift|weights|core training/i;   // logged in the Workout tab instead
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
export function importActivities(list) { return addImported(list); }
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

export function typeFrom(text) {
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
    h('p.fine', 'Leave calories blank to estimate them.'),
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

// ---------- Metrics, heart-rate zones, activity points ----------

/** The number that matters for each sport: pace for runs, speed for rides, per 100 m for swims. */
export function sportMetric(a) {
  if (!a.dist || !a.dur) return '';
  const secs = a.dur / 1000;
  if (a.type === 'cycle') return `${(a.dist / (metric() ? 1000 : MI) / (secs / 3600)).toFixed(1)} ${metric() ? 'km/h' : 'mph'}`;
  if (a.type === 'swim') { const s100 = secs / (a.dist / 100); return `${Math.floor(s100 / 60)}:${String(Math.round(s100 % 60)).padStart(2, '0')} /100 m`; }
  if (a.type === 'row') { const s500 = secs / (a.dist / 500); return `${Math.floor(s500 / 60)}:${String(Math.round(s500 % 60)).padStart(2, '0')} /500 m`; }
  return paceText(a);
}

/** Your max heart rate: the highest seen in your workouts (if believable), else 190. */
export function maxHR() {
  const seen = Math.max(0, ...state.activities.map((a) => a.hrMax || 0));
  return state.goals.maxHR || (seen >= 160 ? seen : 190);
}
export const ZONES = [
  { n: 1, name: 'Easy', lo: 0.5, color: '#5b6b7a' },
  { n: 2, name: 'Endurance', lo: 0.6, color: '#2e8bd8' },
  { n: 3, name: 'Tempo', lo: 0.7, color: '#16917f' },
  { n: 4, name: 'Threshold', lo: 0.8, color: '#e3b04b' },
  { n: 5, name: 'Max', lo: 0.9, color: '#d9503c' },
];
export const zoneOf = (bpm) => { const p = bpm / maxHR(); return [...ZONES].reverse().find((z) => p >= z.lo) || ZONES[0]; };

/**
 * Activity points: one number for everything that moves you. Based on MET-minutes
 * (how hard × how long, above resting) ÷ 10, so a 30-minute run, a 60-minute lift
 * and 10,000 steps each land around 25. Steps taken during runs and walks aren't counted twice.
 */
export function dayPoints(key) {
  const acts = state.activities.filter((a) => ymd(a.start) === key);
  const cardio = acts.reduce((n, a) => n + (activityType(a.type).met - 1) * (a.dur / 6e4), 0);
  const lifts = state.workouts.filter((w) => ymd(w.start) === key).reduce((n, w) => n + 4 * Math.min(120, workoutStats(w).duration / 6e4), 0);
  const covered = acts.reduce((n, a) => n + (a.type === 'run' ? 160 : ['walk', 'hike'].includes(a.type) ? 110 : 0) * (a.dur / 6e4), 0);
  const steps = Math.max(0, (healthDay(key)?.steps || 0) - covered);
  const walk = (steps / 100) * 2.5;
  return { total: Math.round((cardio + lifts + walk) / 10), cardio: Math.round(cardio / 10), lifts: Math.round(lifts / 10), steps: Math.round(walk / 10) };
}
export const pointsGoal = () => state.goals.movePts || 30;

// Weekly points against the WHO guideline for adults: 150–300 minutes of moderate
// activity a week (or 75–150 vigorous) is about 45–90 points.
export const LEVELS = [
  { name: 'Getting started', min: 0, day: 5, sub: 'Under the WHO minimum for health' },
  { name: 'Active', min: 45, day: 10, sub: 'Meets the WHO guideline (150 min a week)' },
  { name: 'Very active', min: 90, day: 20, sub: 'Double the minimum: extra health benefits' },
  { name: 'Training hard', min: 180, day: 35, sub: 'Regular hard training' },
  { name: 'Athlete', min: 300, day: 50, sub: 'Training like an athlete' },
];
export const levelOf = (weekPts) => [...LEVELS].reverse().find((l) => weekPts >= l.min);

/** Pick a daily points goal by level (or type your own). */
export function pointsGoalSheet(after) {
  const cur = pointsGoal();
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', 'Activity goal'), h('span')),
    h('p.fine', 'Points measure effort: about 25 for a 30-minute run, an hour of lifting or 10,000 steps. Pick the level you want to reach each week.'),
    h('div.group', LEVELS.slice(1).map((l) => h('button.group-row.level-row' + (cur === l.day ? '.on' : ''), { onclick: () => { commit((st) => { st.goals.movePts = l.day; }); s.close(); after?.(); } },
      h('span.tab-pick-text', h('span', l.name), h('span.tab-pick-sub', `${l.sub} · ${l.min}+ a week`)),
      h('span.row-val', `${l.day} a day`)))),
    h('button.btn.dark.wide', { onclick: async () => {
      const { promptBox } = await import('./ui.js');
      const v = parseInt(await promptBox('Points a day', String(cur), { placeholder: '30' }), 10);
      if (v > 0) { commit((st) => { st.goals.movePts = v; }); s.close(); after?.(); }
    } }, 'Custom number')));
}

// ---------- The page ----------

function activityRow(a) {
  const t = activityType(a.type);
  const bits = [fmtDurationWords(a.dur), a.dist ? fmtDist(a.dist) : '', sportMetric(a), a.hrAvg ? `${a.hrAvg} bpm · Z${zoneOf(a.hrAvg).n}` : ''].filter(Boolean).join(' · ');
  return h('button.food-line', { onclick: () => activitySheet(a) },
    h('span.food-ico', t.icon),
    h('span.food-text', h('span.food-name', a.name && t.id === 'other' ? a.name : t.name), h('span.food-sub', `${fmtDate(a.start, { month: 'short', day: 'numeric' })} · ${bits}`)),
    h('span.food-kcal', `${fmtNum(activityKcal(a))}`, h('span.food-sub', a.kcal ? ' kcal' : ' kcal est.')));
}

/** Today's activity points against the goal, with what they came from. */
function pointsCard() {
  const today = ymd(), p = dayPoints(today), goal = pointsGoal();
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map((k) => ({ k, v: dayPoints(k).total }));
  const pct = Math.min(1, p.total / goal), R = 40, C = 2 * Math.PI * R;
  const ring = h('div.pts-ring');
  ring.innerHTML = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${R}" fill="none" stroke="#26262a" stroke-width="10"/><circle cx="50" cy="50" r="${R}" fill="none" stroke="var(--gold)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(C * pct).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 50 50)"/></svg>`;
  ring.append(h('div.pts-mid', h('b', p.total), h('span', `of ${goal}`)));
  return h('section.card.pts-card',
    h('div.pts-top', ring,
      h('div.pts-text',
        h('div.pts-title', 'Activity points'),
        h('div.pts-sub', p.total >= goal ? 'Goal hit today.' : `${goal - p.total} to go today.`),
        h('div.pts-parts', [p.steps ? `Steps ${p.steps}` : null, p.cardio ? `Cardio ${p.cardio}` : null, p.lifts ? `Lifting ${p.lifts}` : null].filter(Boolean).join(' · ') || 'Steps, cardio and lifting all count.'))),
    h('div.pts-week', week.map((d) => h('div.pts-day' + (d.v >= goal ? '.hit' : ''), h('i', h('b', { style: { height: `${Math.min(100, (d.v / goal) * 100)}%` } })), h('span', 'MTWTFSS'[(new Date(d.k + 'T12:00').getDay() + 6) % 7])))),
    levelBar(week.reduce((n, d) => n + d.v, 0)),
    h('button.link.pts-goal', { onclick: () => pointsGoalSheet() }, `Goal: ${goal} a day (${levelOf(goal * 7).name.toLowerCase()})`, icon('back', 14)));
}

/** Where the last 7 days put you, from Getting started to Athlete. */
function levelBar(weekPts) {
  const top = 360, lv = levelOf(weekPts);
  return h('div.lvl',
    h('div.lvl-head', h('span', 'Last 7 days: ', h('b', `${weekPts} points`)), h('b.lvl-name', lv.name)),
    h('div.lvl-bar',
      LEVELS.map((l, i) => h('i.lvl-seg' + (l === lv ? '.on' : ''), { style: { left: `${(l.min / top) * 100}%`, width: `${(((LEVELS[i + 1]?.min ?? top) - l.min) / top) * 100}%` } })),
      h('span.lvl-mark', { style: { left: `${Math.min(100, (weekPts / top) * 100)}%` } })),
    h('div.lvl-sub', lv.sub));
}

/** Steps from Apple Health: today and the last 7 days. */
function stepsCard() {
  if (!hasHealth()) return null;
  const today = ymd();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map((k) => ({ x: new Date(k + 'T12:00').getTime(), y: healthDay(k)?.steps || 0 }));
  const avg = Math.round(days.reduce((n, d) => n + d.y, 0) / 7);
  const last = healthDay(today)?.steps ?? healthDay(addDays(today, -1))?.steps;
  return [
    h('div.section-head', h('h2.section-title', 'Steps'), h('span.section-count', `${fmtNum(avg)} a day`)),
    h('section.card.chart-card',
      h('div.metric-now', h('b', fmtNum(last || 0)), h('span', healthDay(today)?.steps != null ? ' today' : ' yesterday')),
      barChart(days, { height: 110, color: COLORS.gold, goal: state.goals.steps || 8000, fmtX: (t) => fmtDate(t, { weekday: 'narrow' }), label: 'Steps, last 7 days', tip: (p) => `<b>${fmtNum(p.y)}</b><span>${fmtDate(p.x, { weekday: 'short', month: 'short', day: 'numeric' })}</span>` }),
      h('p.fine', `As of your last Health import · ${fmtDate(state.health.last, { month: 'short', day: 'numeric' })}`)),
  ];
}

/** Minutes in each heart-rate zone this week (each workout counted at its average heart rate). */
function zonesCard(week) {
  const withHR = week.filter((a) => a.hrAvg);
  if (!withHR.length) return null;
  const mins = ZONES.map((z) => withHR.filter((a) => zoneOf(a.hrAvg).n === z.n).reduce((n, a) => n + a.dur / 6e4, 0));
  const total = mins.reduce((a, b) => a + b, 0);
  return [
    h('div.section-head', h('h2.section-title', 'Heart-rate zones'), h('span.section-count', 'this week')),
    h('section.card.zones',
      h('div.split-bar.big', ZONES.map((z, i) => mins[i] ? h('i', { style: { width: `${(mins[i] / total) * 100}%`, background: z.color } }) : null)),
      ZONES.map((z, i) => !mins[i] ? null : h('div.zone-row', h('i.swatch', { style: { background: z.color } }), h('span', `Zone ${z.n} · ${z.name}`), h('span.row-val', `${Math.round(mins[i])} min`))),
      h('p.fine', `Max heart rate ${maxHR()} bpm${state.goals.maxHR ? '' : ' (highest seen; set yours in Fitness goals)'}. Zones use each workout’s average.`)),
  ];
}

/** Longest and fastest for each sport you've done. */
function bestsCard(list) {
  const rows = [];
  for (const t of ['run', 'cycle', 'swim', 'walk', 'hike', 'row']) {
    const of = list.filter((a) => a.type === t && a.dist);
    if (!of.length) continue;
    const longest = of.reduce((a, b) => (b.dist > a.dist ? b : a));
    const fastest = of.filter((a) => a.dist >= (t === 'swim' ? 400 : 1000)).reduce((a, b) => (!a || b.dist / b.dur > a.dist / a.dur ? b : a), null);
    rows.push(h('div.group-row', h('span', `${activityType(t).icon} ${activityType(t).name}`),
      h('span.row-val', [`longest ${fmtDist(longest.dist)}`, fastest ? `best ${sportMetric(fastest)}` : null].filter(Boolean).join(' · '))));
  }
  return rows.length ? [h('div.section-head', h('h2.section-title', 'Your bests')), h('section.card.list-card', rows)] : null;
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
      navBar({ title: 'Fitness', back: false, large: true, wip: true, right: [goalsButton('fitness'), h('button.icon-btn.gold-text', { onclick: () => activitySheet(), 'aria-label': 'Add activity' }, icon('plus', 24))] }),

      pointsCard(),
      stepsCard(),

      h('div.section-head', h('h2.section-title', 'This week')),
      h('div.tiles.three',
        h('div.tile' + (g.fitPerWeek && week.length >= g.fitPerWeek ? '.hit' : ''), h('div.tile-v', week.length, g.fitPerWeek ? h('span.tile-of', ` / ${g.fitPerWeek}`) : null), h('div.tile-k', 'Activities'),
          h('div.tile-sub', g.fitMins ? `${mins} of ${g.fitMins} min` : fmtDurationWords(sum(week, (a) => a.dur)))),
        h('div.tile' + (g.fitDist && dist >= g.fitDist ? '.hit' : ''), h('div.tile-v', week.some((a) => a.dist) ? fmtDist(dist).split(' ')[0] : '0', g.fitDist ? h('span.tile-of', ` / ${fmtDist(g.fitDist).split(' ')[0]}`) : null), h('div.tile-k', 'Distance'), h('div.tile-sub', distUnit())),
        h('div.tile', h('div.tile-v', fmtNum(sum(week, activityKcal))), h('div.tile-k', 'Burned'), h('div.tile-sub', 'active kcal'))),

      h('div.btn-pair',
        h('button.btn.gold', { onclick: () => import('./healthsync.js').then((m) => m.openHealthSync()) }, state.health?.auto ? 'Health sync' : 'Sync with Health'),
        h('button.btn.dark', { onclick: () => activitySheet() }, icon('plus', 18), 'Add')),
      h('button.link.small-link.center-link', { onclick: importActivitiesSheet }, 'Or paste activities'),

      h('div.section-head', h('h2.section-title', 'Minutes'), h('span.section-count', 'per week')),
      h('section.card.chart-card', barChart(weeks, {
        height: 140, color: COLORS.gold, fmtX: fmtDay, label: 'Activity minutes per week', empty: 'Import or add an activity to see it here',
        tip: (p) => `<b>${p.y} min</b><span>Week of ${fmtDay(p.x)}</span>`,
      })),

      zonesCard(week),
      bestsCard(list),

      h('div.section-head', h('h2.section-title', 'Activities'), list.length ? h('span.section-count', list.length) : null),
      list.length
        ? h('section.card.list-card', shown.map(activityRow))
        : h('button.card.empty-plan', { onclick: importActivitiesSheet },
          h('div.empty-title', 'Bring in your runs and rides'),
          h('div.empty-text', 'Import from Apple Health or add one.')),
      list.length > shown.length ? h('button.link', { onclick: () => { showAll = true; draw(); } }, `Show all ${list.length}`) : null,
      h('div.bottom-space'),
    );
  }
  draw();
  el.append(body);
  return { el, refresh: draw };
}
