// Everything Carver remembers, saved on this phone (localStorage).
// Weights are always stored in kg and converted for display, so switching
// between lb and kg never changes your numbers.

import { LIBRARY } from './exercises.js';
import { FOODS, NUTRIENT_KEYS } from './foods.js';

const KEY = 'carver.v1';
export const MAX_PLANS = 15;
export const LB_PER_KG = 2.20462262;

const fresh = () => ({
  version: 1,
  settings: { unit: 'lb', restDefault: 90 },
  profile: { name: '', joined: Date.now() },
  customExercises: [],
  plans: [],
  workouts: [],      // finished workouts, newest first
  active: null,      // the workout in progress, if any
  goals: { kcal: 2500, p: 180, c: 250, f: 80, water: 2500, workoutsPerWeek: 3, custom: [] },
  food: { log: [], custom: [], meals: [], favs: [], water: {} },   // water: { 'YYYY-MM-DD': ml }   // log entries keep their own nutrient totals; meals = saved groups of entries
  activities: [],    // runs, walks, rides…: { id, type, start, dur (ms), dist (m), kcal, source }
  body: { weights: [], photos: [] }, // weights: { id, ts, kg, source }; photos: { id, ts } (images in IndexedDB)
  checks: {},                      // custom daily goals: { 'YYYY-MM-DD': { goalId: amount } }
  monthly: {},                     // { 'YYYY-MM': { goals: [], note } }
  program: null,                   // a running program (5/3/1 or Coach): see program531.js, coach.js
  recovery: {},
  health: { days: {} },             // from an Apple Health export: { days: { 'YYYY-MM-DD': { steps, active, sleep, deep, rem, rhr, hrv, vo2 } }, last }                    // morning check-ins: { 'YYYY-MM-DD': { sleep, quality, sore, energy } }
});

// Older saves miss newer sections: fill them in (one level deep)
function upgrade(data) {
  const base = fresh();
  for (const [k, v] of Object.entries(base)) {
    if (data[k] == null) data[k] = v;
    else if (v && typeof v === 'object' && !Array.isArray(v) && k !== 'active') data[k] = { ...v, ...data[k] };
  }
  // Carver no longer adds warm-up sets: drop the ones programs put in plans (and an unstarted workout)
  const strip = (e) => {
    if (!e.sets?.some((s) => s.type === 'w')) return;
    const kept = e.sets.filter((s) => s.type !== 'w' || s.done);
    e.sets = kept.length ? kept : e.sets.slice(-1).map((s) => ({ ...s, type: 'n' }));
  };
  for (const p of data.plans || []) for (const e of p.exercises || []) strip(e);
  for (const e of data.active?.exercises || []) strip(e);
  return data;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return upgrade(JSON.parse(raw));
  } catch { /* private mode or broken data: start fresh */ }
  return fresh();
}

export const state = load();
const listeners = new Set();

// Bumped on every save, so lookups below can cache until the data changes
let rev = 0;
const savers = new Set();
// Writing everything to storage on each keystroke is slow with a long history, so
// writes are batched (at most every 250 ms) and flushed when the app is hidden.
let writeTimer = 0;
function write() {
  clearTimeout(writeTimer); writeTimer = 0;
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { console.warn('Could not save', e); }
}
const inBrowser = typeof document !== 'undefined' && typeof addEventListener === 'function';
if (inBrowser) {
  addEventListener('pagehide', () => writeTimer && write());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && writeTimer) write(); });
}

export function save() {
  rev++;
  if (!inBrowser) write();
  else if (!writeTimer) writeTimer = setTimeout(write, 250);
  savers.forEach((f) => f());
}
/** Runs after every save (sync uses it to know something changed). */
export const onSaved = (fn) => { savers.add(fn); return () => savers.delete(fn); };

/** Swap in data from another device. Keeps a workout that's live on this phone as it is. */
export function replaceState(data, { quiet = true } = {}) {
  const next = upgrade(data);
  if (state.active && next.active?.id === state.active.id) next.active = state.active;
  for (const k of Object.keys(state)) if (!(k in next)) delete state[k];
  Object.assign(state, next);
  rev++;
  write();
  if (!quiet) savers.forEach((f) => f());
  listeners.forEach((l) => l());
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
/** Body weight has its own unit (falls back to the lifting one). */
export const bodyUnit = () => state.settings.bodyUnit || unit();
export function bodyDisplay(kg) {
  if (kg == null || kg === '') return '';
  return String(Math.round((bodyUnit() === 'lb' ? kg * LB_PER_KG : kg) * 10) / 10);
}
export function bodyFromDisplay(v) {
  if (v === '' || v == null || isNaN(+v)) return null;
  return bodyUnit() === 'lb' ? +v / LB_PER_KG : +v;
}
/** Distance for runs and rides: 'km' or 'mi'. */
export const distUnit = () => state.settings.distUnit || (unit() === 'kg' ? 'km' : 'mi');
// The pieces of Home, in the order people choose (Settings → Edit Home page).
export const HOME_SECTIONS = [
  { id: 'rings', name: 'Goal rings', sub: 'Your rings for today or the week' },
  { id: 'restday', name: 'Rest-day check', sub: 'How your week is going on rest days' },
  { id: 'daily', name: 'Daily goals', sub: 'Slide to mark your daily goals done' },
  { id: 'next', name: 'Next workout', sub: 'Your next plan, ready to start' },
  { id: 'week', name: 'This week', sub: 'Workouts done against your weekly goal' },
  { id: 'macros', name: 'Calories & macros', sub: 'Today’s calories, protein, carbs and fat' },
  { id: 'water', name: 'Water', sub: 'Log water in one tap' },
  { id: 'readiness', name: 'Readiness', sub: 'Today’s recovery check-in' },
  { id: 'progress', name: 'Progress & trends', sub: 'Weight and maintenance calories' },
  { id: 'strength', name: 'Strength progression', sub: 'Estimated one-rep max graphs' },
  { id: 'calendar', name: 'Workout calendar', sub: 'Your month of workouts' },
  { id: 'today', name: 'Today', sub: 'Workout, food and weigh-in at a glance' },
  { id: 'nudges', name: 'Monthly reminders', sub: 'Monthly goals, progress photo and recap' },
  { id: 'groups', name: 'Groups', sub: 'Your friends’ latest posts' },
  { id: 'profile', name: 'Profile & stats', sub: 'Streak, totals and recent records' },
];
export const HOME_DEFAULT = ['rings', 'restday', 'daily', 'progress', 'strength', 'calendar', 'today', 'nudges', 'groups', 'profile'];
/** The Home sections you've picked, in order. */
export function homeSections() {
  const known = new Set(HOME_SECTIONS.map((x) => x.id));
  const mine = new Set((state.settings.widgets || []).map((w) => 'w:' + w.id));   // your own widgets
  return (state.settings.home || HOME_DEFAULT).filter((id) => known.has(id) || mine.has(id));
}

/** Tabs you can hide in Settings (Home always shows). */
// The tabs you can show, in bar order. Home is always first. New ones start off.
export const TAB_LIST = [
  { id: 'workout', label: 'Workout', icon: 'dumbbell', sub: 'Gym workouts and plans' },
  { id: 'nutrition', label: 'Nutrition', icon: 'apple', sub: 'Food, calories and macros' },
  { id: 'fitness', label: 'Fitness', icon: 'activity', sub: 'Runs, walks, rides and cardio', wip: true },
  { id: 'social', label: 'Social', icon: 'users', sub: 'Groups, leaderboards and challenges', wip: true },
  { id: 'habits', label: 'Habits', icon: 'check', sub: 'Daily goals, streaks and reminders', wip: true },
  { id: 'recovery', label: 'Recovery', icon: 'moon', sub: 'Sleep, soreness and a daily readiness score', wip: true },
  { id: 'body', label: 'Physical Metrics', short: 'Metrics', icon: 'user', sub: 'Weight, body fat, photos and measurements', wip: true },
];
/** Tab ids you keep, in your order (not counting Home). */
export function shownTabs() {
  const known = new Set(TAB_LIST.map((t) => t.id));
  const list = state.settings.tabs || ['workout', 'nutrition', 'fitness'].filter((id) => !(state.settings.hiddenTabs || []).includes(id));
  return list.filter((id) => known.has(id));
}
export const tabOn = (id) => id === 'home' || shownTabs().includes(id);
/** Number the person typed (lb or kg) → kg. */
export function fromDisplay(v) {
  if (v === '' || v == null || isNaN(+v)) return null;
  return unit() === 'lb' ? +v / LB_PER_KG : +v;
}

// ---------- Plans ----------

/** Your current split: the saved workouts you're running now (all of them unless you've switched some off). */
export const inSplit = (p) => p.split !== false;
export const splitPlans = () => state.plans.filter(inSplit);
export function setSplit(id, on) {
  commit((s) => { const p = s.plans.find((x) => x.id === id); if (p) p.split = !!on; });
}

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

// ---------- One-rep max tracking ----------

/** Best estimated 1RM (kg) per workout for an exercise, oldest first. Warm-ups don't count. */
export function e1rmHistory(exId) {
  const out = [];
  for (let i = state.workouts.length - 1; i >= 0; i--) {
    const w = state.workouts[i];
    let best = 0, set = null;
    for (const e of w.exercises) {
      if (e.exId !== exId) continue;
      for (const st of e.sets) {
        if (!st.done || st.type === 'w') continue;
        const v = e1rm(st.weight, st.reps);
        if (v > best) { best = v; set = st; }
      }
    }
    if (best) out.push({ x: w.start, y: best, weight: set.weight, reps: set.reps, workoutId: w.id });
  }
  return out;
}

/** The exercises shown in the 1RM tracker: your picks, or your 4 most-logged lifts until you pick. */
export function oneRmExercises() {
  if (Array.isArray(state.settings.oneRm)) return state.settings.oneRm;
  const count = new Map();
  for (const w of state.workouts) for (const e of w.exercises) {
    if (exercise(e.exId).type !== 'wr') continue;
    count.set(e.exId, (count.get(e.exId) || 0) + 1);
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id]) => id);
}

// ---------- Profile overview ----------

/** Monday 00:00 of the week containing ts. */
export function weekStart(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

// ---------- Workout days (optional) ----------
// goals.workoutDays: weekdays you plan to train, 0 = Monday … 6 = Sunday. Empty = any days.

export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dow = (key) => { const [y, m, d] = key.split('-').map(Number); return (new Date(y, m - 1, d).getDay() + 6) % 7; };
export const workoutDays = () => state.goals.workoutDays || [];
/** 'planned', 'rest', or null when you haven't picked days. */
export function dayPlan(key) {
  const days = workoutDays();
  if (!days.length) return null;
  return days.includes(dow(key)) ? 'planned' : 'rest';
}

/**
 * On a planned rest day with no workout yet: how the week is going, so the app
 * can say "rest easy" or "you're falling behind". null on other days.
 * tone: 'done' (weekly goal already hit), 'ok' (on track), 'behind'.
 */
export function restNote(today = ymd()) {
  if (dayPlan(today) !== 'rest' || state.workouts.some((w) => ymd(w.start) === today)) return null;
  const goal = state.goals.workoutsPerWeek;
  const n = state.workouts.filter((w) => w.start >= weekStart()).length;
  const sunday = addDays(ymd(weekStart()), 6);
  let left = 0;
  for (let k = addDays(today, 1); k <= sunday; k = addDays(k, 1)) if (dayPlan(k) === 'planned') left++;
  if (n >= goal) return { tone: 'done', title: 'Rest day, weekly goal already hit', sub: `${n} of ${goal} workouts this week. Recover well, or train anyway if you feel good.` };
  if (n + left >= goal) return { tone: 'ok', title: 'Rest day, and you’re on track', sub: `${n} of ${goal} this week with ${left} workout day${left === 1 ? '' : 's'} left. Still want to train?` };
  const need = goal - n;
  return { tone: 'behind', title: 'Rest day, but you’re falling behind', sub: `${n} of ${goal} this week and only ${left} workout day${left === 1 ? '' : 's'} left. ${left + 1 >= need ? 'A workout today keeps you on pace.' : `To make ${goal}, you’d need to train on ${need - left} rest day${need - left === 1 ? '' : 's'}, today included.`}` };
}

/** Food days you left out of averages and the metabolism estimate (they looked off). */
export const daySkipped = (k) => !!state.food.skip?.[k];
/** Mark a day: 'skip' (leave it out), 'keep' (it was real), or null (ask again). */
export function setDayCheck(k, v) {
  commit((s) => {
    s.food.skip = { ...(s.food.skip || {}) }; s.food.keep = { ...(s.food.keep || {}) };
    delete s.food.skip[k]; delete s.food.keep[k];
    if (v === 'skip') s.food.skip[k] = true;
    if (v === 'keep') s.food.keep[k] = true;
  });
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

// ---------- Food ----------

/** Local calendar day as 'YYYY-MM-DD'. */
export function ymd(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const dayStart = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
export const addDays = (key, n) => ymd(dayStart(key) + n * 864e5 + 36e5 * 3);   // +3 h dodges daylight-saving edges

// Foods other Carver users added (loaded by cloud.js, cached on the phone)
let shared = [];
try { shared = JSON.parse(localStorage.getItem('carver.shared') || '{}').foods || []; } catch { /* none yet */ }
export function setSharedFoods(list) {
  shared = list;
  foodCache = null;
  try { localStorage.setItem('carver.shared', JSON.stringify({ at: Date.now(), foods: list })); } catch { /* full */ }
}
export const sharedFoods = () => shared;
let foodCache = null;   // { rev, list, byId }
function foods() {
  if (!foodCache || foodCache.rev !== rev) {
    const mine = new Set(state.food.custom.map((f) => f.id));
    const list = [...state.food.custom, ...shared.filter((f) => !mine.has(f.id)), ...FOODS];
    foodCache = { rev, list, byId: new Map(list.map((f) => [f.id, f])) };
  }
  return foodCache;
}
export const allFoods = () => foods().list;
export function food(id) { return foods().byId.get(id); }

/** Nutrients for `grams` of a food (from its per-100 g values). */
export function nutrientsFor(f, grams) {
  const out = {};
  for (const k of NUTRIENT_KEYS) if (f.n[k] != null) out[k] = (f.n[k] * grams) / 100;
  return out;
}

export function logFood(entry) {
  const e = { id: uid(), ts: Date.now(), ...entry };
  commit((s) => { s.food.log.push(e); });
  return e;
}
export function updateLog(id, changes) {
  commit((s) => { const e = s.food.log.find((x) => x.id === id); if (e) Object.assign(e, changes); });
}
export function deleteLog(id) {
  commit((s) => { s.food.log = s.food.log.filter((x) => x.id !== id); });
}
// The food log grouped by day, and each day's totals, rebuilt only after a change
let dayCache = { rev: -1, byDate: new Map(), totals: new Map() };
function days() {
  if (dayCache.rev !== rev) {
    const byDate = new Map();
    for (const e of state.food.log) { const l = byDate.get(e.date); if (l) l.push(e); else byDate.set(e.date, [e]); }
    dayCache = { rev, byDate, totals: new Map() };
  }
  return dayCache;
}
const NONE = Object.freeze([]);
export const dayLog = (key) => days().byDate.get(key) || NONE;

/** Totals for a day: { kcal, p, c, f, ...micros, entries } (don't change the object you get back) */
/** Your food aim: 'cut', 'maintain' or 'build'. Set in Goals; until then, this month's goals decide. */
export function foodAim() {
  if (state.goals.aim) return state.goals.aim;
  const m = state.monthly[ymd().slice(0, 7)]?.goals || [];
  return m.includes('Build muscle') && !m.includes('Lose fat') ? 'build' : m.includes('Lose fat') && !m.includes('Build muscle') ? 'cut' : 'maintain';
}

/**
 * Did a day hit the calorie goal? It depends on your aim:
 *  build muscle: the goal is a minimum (eat at least this much)
 *  lose fat:     the goal is a maximum (stay under it); while the day is still going it counts
 *                once you're close (85%+), and a finished day counts from half the goal up
 *  maintain:     within 10% either way
 */
export function kcalHit(v, goal, key = ymd()) {
  if (!goal || !v) return false;
  const r = v / goal, aim = foodAim();
  if (aim === 'build') return r >= 1;
  if (aim === 'cut') return r <= 1 && r >= (key < ymd() ? 0.5 : 0.85);
  return r >= 0.9 && r <= 1.1;
}

/** How a day's calories look: 'hit', 'over' (red: past a maximum, or 10%+ over when maintaining), or '' (not there yet). */
/** A training day: a workout logged that day, or one of your planned workout days. */
export const trainingDay = (key) => state.workouts.some((w) => ymd(w.start) === key) || dayPlan(key) === 'planned';
/** The day's food goals: on training days, the optional extra calories (as carbs) are added. */
export function dayGoals(key) {
  const g = state.goals, boost = g.trainBoost || 0;
  return boost && trainingDay(key) ? { ...g, kcal: g.kcal + boost, c: Math.round(g.c + boost / 4) } : g;
}
export function kcalLook(v, goal, key) {
  if (!goal || !v) return '';
  if (kcalHit(v, goal, key)) return 'hit';
  const r = v / goal, aim = foodAim();
  return (aim === 'cut' && r > 1) || (aim === 'maintain' && r > 1.1) ? 'over' : '';
}

export function dayTotals(key) {
  const c = days();
  if (c.totals.has(key)) return c.totals.get(key);
  const t = { entries: 0 };
  for (const k of NUTRIENT_KEYS) t[k] = 0;
  for (const e of dayLog(key)) {
    t.entries++;
    for (const k of NUTRIENT_KEYS) if (e.n?.[k] != null) t[k] += e.n[k];
  }
  c.totals.set(key, t);
  return t;
}

/** Foods you've logged lately, most recent first (for the Recent list). */
/** Water drunk on a day, in ml. */
export const waterOn = (key) => state.food.water?.[key] || 0;
export function addWater(key, ml) {
  commit((s) => { s.food.water = { ...(s.food.water || {}), [key]: Math.max(0, (s.food.water?.[key] || 0) + ml) }; });
}

export function recentFoods(limit = 15) {
  const seen = new Set(), out = [];
  for (let i = state.food.log.length - 1; i >= 0 && out.length < limit; i--) {
    const e = state.food.log[i];
    if (!e.foodId || seen.has(e.foodId)) continue;
    const f = food(e.foodId);
    if (f) { seen.add(e.foodId); out.push(f); }
  }
  return out;
}

// ---------- Backup ----------

export function exportJSON() {
  return JSON.stringify({ app: 'Carver', exported: new Date().toISOString(), ...state }, null, 2);
}
export function importJSON(text) {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.workouts) || !Array.isArray(data.plans)) throw new Error('That file is not a Carver backup.');
  const { app, exported, ...rest } = data;
  rest.plans = rest.plans.slice(0, MAX_PLANS);
  commit((s) => { Object.assign(s, upgrade(rest)); });
}
export function resetAll() {
  commit((s) => Object.assign(s, fresh()));
}
