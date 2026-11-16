// Everything Carver remembers, saved on this phone (localStorage).
// Weights are always stored in kg and converted for display, so switching
// between lb and kg never changes your numbers.

import { LIBRARY } from './exercises.js';

const KEY = 'carver.v1';
export const MAX_PLANS = 5;
export const LB_PER_KG = 2.20462262;

const fresh = () => ({
  version: 1,
  settings: { unit: 'lb', restDefault: 90 },
  profile: { name: '', joined: Date.now() },
  customExercises: [],
  plans: [],
  workouts: [],      // finished workouts, newest first
  active: null,      // the workout in progress, if any
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...fresh(), ...JSON.parse(raw) };
  } catch { /* private mode or broken data: start fresh */ }
  return fresh();
}

export const state = load();
const listeners = new Set();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { console.warn('Could not save', e); }
}

/** Change state, save it, and tell the screens to redraw. */
export function commit(fn) {
  if (fn) fn(state);
  save();
  listeners.forEach((l) => l());
}
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// ---------- Exercises ----------

export function allExercises() {
  return [...state.customExercises, ...LIBRARY];
}
const byId = new Map();
export function exercise(id) {
  if (!byId.has(id) || byId.size !== LIBRARY.length + state.customExercises.length) {
    byId.clear();
    allExercises().forEach((e) => byId.set(e.id, e));
  }
  return byId.get(id) || { id, name: 'Unknown exercise', muscle: 'Other', equipment: 'Other', type: 'wr' };
}
export function addCustomExercise(ex) {
  const e = { id: 'c-' + uid(), custom: true, ...ex };
  commit((s) => s.customExercises.unshift(e));
  return e;
}

// ---------- Units ----------

export const unit = () => state.settings.unit;
/** kg → number shown to the person (lb or kg), rounded to 0.1. */
export function toDisplay(kg) {
  if (kg == null || kg === '') return '';
  const v = unit() === 'lb' ? kg * LB_PER_KG : kg;
  return String(Math.round(v * 10) / 10);
}
/** Number the person typed (lb or kg) → kg. */
export function fromDisplay(v) {
  if (v === '' || v == null || isNaN(+v)) return null;
  return unit() === 'lb' ? +v / LB_PER_KG : +v;
}

// ---------- Plans ----------

export function savePlan(plan) {
  commit((s) => {
    const i = s.plans.findIndex((p) => p.id === plan.id);
    plan.updated = Date.now();
    if (i >= 0) s.plans[i] = plan;
    else s.plans.push(plan);
  });
}
export function deletePlan(id) {
  commit((s) => { s.plans = s.plans.filter((p) => p.id !== id); });
}

// ---------- Workouts ----------

/** The most recent finished workout sets for an exercise (for the "Previous" column). */
export function previousSets(exId, beforeWorkoutId) {
  for (const w of state.workouts) {
    if (w.id === beforeWorkoutId) continue;
    const ex = w.exercises.find((e) => e.exId === exId);
    if (ex) {
      const done = ex.sets.filter((s) => s.done);
      if (done.length) return done;
    }
  }
  return [];
}

/** Epley estimated one-rep max, in kg. Only meaningful for 1–12 reps. */
export function e1rm(kg, reps) {
  if (!kg || !reps) return 0;
  if (reps === 1) return kg;
  return kg * (1 + Math.min(reps, 12) / 30);
}

export function workoutStats(w) {
  let volume = 0, sets = 0;
  for (const ex of w.exercises) {
    for (const s of ex.sets) {
      if (!s.done) continue;
      sets++;
      if (s.weight && s.reps) volume += s.weight * s.reps;
    }
  }
  const end = w.end || Date.now();
  return { volume, sets, duration: end - w.start };
}

/** Personal records set in this workout, compared with every earlier workout. */
export function findPRs(w) {
  const prs = [];
  for (const ex of w.exercises) {
    const info = exercise(ex.exId);
    if (info.type !== 'wr' && info.type !== 'bw') continue;
    let bestW = 0, best1 = 0, bestR = 0;
    for (const old of state.workouts) {
      if (old.id === w.id || old.start >= w.start) continue;
      for (const oe of old.exercises) {
        if (oe.exId !== ex.exId) continue;
        for (const s of oe.sets) {
          if (!s.done || s.type === 'w') continue;
          bestW = Math.max(bestW, s.weight || 0);
          best1 = Math.max(best1, e1rm(s.weight, s.reps));
          bestR = Math.max(bestR, s.reps || 0);
        }
      }
    }
    const done = ex.sets.filter((s) => s.done && s.type !== 'w');
    if (!done.length) continue;
    const hadHistory = bestW > 0 || bestR > 0;
    if (!hadHistory) continue;   // first time doing it: nothing to beat yet
    if (info.type === 'wr') {
      const topW = Math.max(...done.map((s) => s.weight || 0));
      const top1 = Math.max(...done.map((s) => e1rm(s.weight, s.reps)));
      if (topW > bestW + 1e-6) prs.push({ exId: ex.exId, kind: 'Heaviest weight', kg: topW });
      if (top1 > best1 + 1e-6) prs.push({ exId: ex.exId, kind: 'Best est. 1RM', kg: top1 });
    } else {
      const topR = Math.max(...done.map((s) => s.reps || 0));
      if (topR > bestR) prs.push({ exId: ex.exId, kind: 'Most reps', reps: topR });
    }
  }
  return prs;
}

// ---------- Profile overview ----------

/** Monday 00:00 of the week containing ts. */
export function weekStart(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

export function overview() {
  const ws = state.workouts;
  const thisWeek = weekStart();
  let volume = 0, sets = 0, time = 0;
  for (const w of ws) { const st = workoutStats(w); volume += st.volume; sets += st.sets; time += st.duration; }
  // Weeks in a row with at least one workout (this week counts if you've trained already)
  const weeks = new Set(ws.map((w) => weekStart(w.start)));
  let streak = 0;
  let wk = weeks.has(thisWeek) ? thisWeek : weekStart(thisWeek - 864e5);
  while (weeks.has(wk)) { streak++; wk = weekStart(wk - 864e5); }
  const recentPRs = [];
  for (const w of ws) {
    for (const p of w.prList || []) recentPRs.push({ ...p, when: w.start });
    if (recentPRs.length >= 5) break;
  }
  return {
    total: ws.length,
    streak, volume, sets, time, recentPRs: recentPRs.slice(0, 5),
    prCount: ws.reduce((n, w) => n + (w.prs || 0), 0),
  };
}

// ---------- Backup ----------

export function exportJSON() {
  return JSON.stringify({ app: 'Carver', exported: new Date().toISOString(), ...state }, null, 2);
}
export function importJSON(text) {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.workouts) || !Array.isArray(data.plans)) throw new Error('That file is not a Carver backup.');
  commit((s) => {
    Object.assign(s, fresh(), {
      settings: { ...fresh().settings, ...data.settings },
      profile: { ...fresh().profile, ...data.profile },
      customExercises: data.customExercises || [],
      plans: data.plans.slice(0, MAX_PLANS),
      workouts: data.workouts,
      active: data.active || null,
    });
  });
}
export function resetAll() {
  commit((s) => Object.assign(s, fresh()));
}
