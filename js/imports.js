// Bring your history in from other apps.
//
// Workouts: any app that exports sets as a CSV — Hevy, Strong, Fitbod and most
// 5/3/1 apps. Columns are found by name, exercises are matched to Carver's
// library (or added as your own), and repeated workouts can become plans.
// MyFitnessPal: its export zip (or the CSVs inside): meal totals per day and weigh-ins.

import { state, commit, uid, LB_PER_KG, allExercises } from './store.js';
import { parseCSV, MEAL_OF, hash } from './cronometer.js';

// ---------- Reading files ----------

/** The CSV files in a zip (stored or deflated), using the browser's own decompressor. */
async function unzip(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  const dv = new DataView(buf.buffer);
  let e = buf.length - 22;
  while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('That zip file looks damaged.');
  const count = dv.getUint16(e + 10, true);
  let p = dv.getUint32(e + 16, true);
  const out = [], dec = new TextDecoder();
  for (let i = 0; i < count; i++) {
    const method = dv.getUint16(p + 10, true), size = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nlen));
    p += 46 + nlen + xlen + clen;
    if (!/\.csv$/i.test(name) || /(^|\/)__MACOSX\//.test(name)) continue;
    const start = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true);
    const data = buf.subarray(start, start + size);
    if (method === 0) out.push({ name, text: dec.decode(data) });
    else if (method === 8) out.push({ name, text: await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text() });
  }
  return out;
}

/** Every CSV in the picked files (zips opened). */
export async function readFiles(files) {
  const out = [];
  for (const f of files) {
    if (/\.zip$/i.test(f.name) || f.type.includes('zip')) out.push(...(await unzip(f)));
    else out.push({ name: f.name, text: await f.text() });
  }
  return out;
}

/** Rows of a CSV with a header row; also handles semicolons (some apps in Europe). */
function table(text) {
  text = text.replace(/^﻿/, '');
  const first = text.slice(0, text.indexOf('\n') >>> 0);
  const sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  const rows = parseCSV(text, sep);
  const head = (rows[0] || []).map((c) => c.trim().toLowerCase());
  const col = (...res) => { for (const re of res) { const i = head.findIndex((x) => re.test(x)); if (i >= 0) return i; } return -1; };
  return { head, rows: rows.slice(1), col };
}

const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const hr = (h, ap) => { h = +h || 0; if (ap) { ap = ap.toLowerCase(); if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0; } return h; };
/** Dates as apps write them: 2026-11-16 18:10, 16 Nov 2026, 18:10, Nov 16, 2026 6:10 PM, 11/16/2026. Local time. */
export function parseWhen(t) {
  t = (t || '').trim();
  let m;
  if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?(Z|[+-]\d{2}:?\d{2})?/))) {
    if (m[7]) return Date.parse(t);
    return new Date(+m[1], m[2] - 1, +m[3], m[4] ? +m[4] : 12, +(m[5] || 0), +(m[6] || 0)).getTime();
  }
  if ((m = t.match(/^(\d{1,2}) ([a-z]{3})[a-z]*\.? (\d{4}),?(?: (\d{1,2}):(\d{2})\s*(am|pm)?)?/i)) && MON[m[2].toLowerCase()] != null)
    return new Date(+m[3], MON[m[2].toLowerCase()], +m[1], m[4] ? hr(m[4], m[6]) : 12, +(m[5] || 0)).getTime();
  if ((m = t.match(/^([a-z]{3})[a-z]*\.? (\d{1,2}),? (\d{4}),?(?: (?:at )?(\d{1,2}):(\d{2})\s*(am|pm)?)?/i)) && MON[m[1].toLowerCase()] != null)
    return new Date(+m[3], MON[m[1].toLowerCase()], +m[2], m[4] ? hr(m[4], m[6]) : 12, +(m[5] || 0)).getTime();
  if ((m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?(?: (\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?)?/i)))
    return new Date(m[3].length === 2 ? 2000 + +m[3] : +m[3], m[1] - 1, +m[2], m[4] ? hr(m[4], m[6]) : 12, +(m[5] || 0)).getTime();
  const d = Date.parse(t);
  return isNaN(d) ? null : d;
}
const num = (v) => { const x = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(x) ? null : x; };
const ymdOf = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// ---------- Matching exercise names ----------

const EQUIP = [[/smith/, 'Machine'], [/barbell|ez ?bar|trap bar|hex bar/, 'Barbell'], [/dumbbell/, 'Dumbbell'], [/cable|rope/, 'Cable'], [/machine|plate loaded|lever/, 'Machine'],
  [/kettlebell/, 'Kettlebell'], [/band/, 'Band'], [/body ?weight|weighted|assisted/, 'Bodyweight']];
const equipOf = (t) => EQUIP.find(([re]) => re.test(t))?.[1] || null;
const DROP = /\b(barbell|dumbbells?|db|bb|cable|machine|biceps?|triceps?)\b/g;
const keyOf = (name) => name.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').replace(DROP, ' ')
  .replace(/\b(\w{4,})s\b/g, '$1').replace(/\s+/g, '').trim();
const LOOSE = /\b(bent over|bench|standing|flat)\b/g;

const MUSCLE = [[/curl/, 'Biceps'], [/leg curl|hamstring|nordic|good morning/, 'Hamstrings'], [/tricep|pushdown|skull|\bdips?\b/, 'Triceps'], [/bench|chest|fly|pec|push ?up/, 'Chest'],
  [/\brows?\b|pull ?down|pull ?up|\bchin|\blat\b|deadlift|\bback\b/, 'Back'], [/shoulder|overhead|military|lateral|delt|raise|arnold|shrug/, 'Shoulders'],
  [/squat|leg press|lunge|extension|step ?up/, 'Quads'], [/hip|glute|thrust|bridge|abduct/, 'Glutes'], [/calf/, 'Calves'], [/crunch|plank|ab\b|abs|sit ?up|core|oblique|leg raise/, 'Core'],
  [/wrist|forearm|grip|farmer/, 'Forearms'], [/run|bike|cycle|row(ing)? machine|elliptical|stair|walk|jump rope|cardio/, 'Cardio']];
const muscleOf = (name) => { const t = name.toLowerCase(); let hit = null; for (const [re, m] of MUSCLE) if (re.test(t)) { hit = m; if (m !== 'Biceps' || !/leg curl/.test(t)) break; } return hit || 'Full body'; };

function matcher() {
  const lib = allExercises().map((e) => ({ e, key: keyOf(e.name), loose: keyOf(e.name.toLowerCase().replace(LOOSE, ' ')) }));
  const made = new Map();
  /** The exercise for a name like "Bench Press (Dumbbell)"; adds a custom one if nothing fits. */
  const match = (raw, type) => {
    const name = raw.trim();
    const inParens = (name.match(/\(([^)]*)\)/) || [])[1]?.toLowerCase() || '';
    const equip = equipOf(inParens) || equipOf(name.toLowerCase());
    const base = equipOf(inParens) ? name.replace(/\s*\([^)]*\)\s*/, ' ') : name;
    const key = keyOf(base), loose = keyOf(base.toLowerCase().replace(LOOSE, ' '));
    const fits = (x) => !equip || x.e.equipment === equip || (equip === 'Bodyweight' && x.e.type === 'bw');
    const hit = lib.find((x) => x.key === key && fits(x)) || lib.find((x) => x.loose === loose && fits(x))
      || (!equip ? null : lib.find((x) => x.key === key && x.e.equipment === 'Bodyweight' && equip === 'Bodyweight'));
    if (hit) return hit.e.id;
    const id = name.toLowerCase();
    if (!made.has(id)) made.set(id, { id: 'c-' + uid(), custom: true, name: name.slice(0, 50), muscle: muscleOf(name), equipment: equip || 'Other', type });
    return made.get(id).id;
  };
  match.made = made;
  return match;
}

// ---------- Workouts ----------

/**
 * Read a workout export. `unitHint` is 'lb' or 'kg' for files that don't say.
 * Returns { workouts, custom (exercises to add), source }, or { needsUnit } when the file doesn't say lb or kg.
 */
export function readWorkouts(text, unitHint) {
  const { head, rows, col } = table(text);
  const iEx = col(/^exercise_title$/, /^exercise name$/, /^exercise$/, /exercise/, /^lift$/, /movement/);
  const iDate = col(/^start_time$/, /^date$/, /^start/, /date|day$/, /^time$/);
  const iW = col(/^weight_kg$/, /^weight_lbs$/, /^weight/, /load/, /^(lbs|kg)$/);
  const iReps = col(/^reps$/, /^reps/, /repetitions/);
  if (iEx < 0 || iDate < 0 || (iW < 0 && iReps < 0)) throw new Error('Couldn’t find exercises, dates and sets in that file. Export your workouts as a CSV from the app.');
  const iTitle = col(/^title$/, /^workout name$/, /^workout$/, /routine/, /^name$/);
  const iEnd = col(/^end_time$/, /^end/), iDur = col(/^duration$/, /workout duration/);
  const iType = col(/^set_type$/, /set type/, /^set order$/, /warm ?up/);
  const iSecs = col(/^duration_seconds$/, /^seconds$/, /^duration\s*\(s\)$/, /^time\s*\(s\)$/);
  const iNote = col(/^exercise_notes$/, /^notes$/);
  const wHead = iW >= 0 ? head[iW] : '';
  const known = /kg/.test(wHead) ? 'kg' : /lb/.test(wHead) ? 'lb' : null;
  const source = head.includes('exercise_title') ? 'hevy' : head.includes('set order') ? 'strong' : head.includes('iswarmup') ? 'fitbod' : 'csv';
  if (!known && iW >= 0 && !unitHint) return { needsUnit: true, source };
  const toKg = (known || unitHint) === 'lb' ? 1 / LB_PER_KG : 1;

  const rowsBy = new Map();
  for (const r of rows) {
    const exName = (r[iEx] || '').trim();
    const start = parseWhen(r[iDate]);
    if (!exName || !start) continue;
    const title = iTitle >= 0 ? (r[iTitle] || '').trim() : '';
    const k = (r[iDate] || '').trim() + '|' + title;
    if (!rowsBy.has(k)) rowsBy.set(k, { start, title, end: iEnd >= 0 ? parseWhen(r[iEnd]) : null, dur: iDur >= 0 ? r[iDur] : '', rows: [] });
    rowsBy.get(k).rows.push(r);
  }
  // Each exercise's kind (weight × reps, reps only, or time) from all its sets
  const kind = new Map();
  for (const g of rowsBy.values()) for (const r of g.rows) {
    const n = (r[iEx] || '').trim().toLowerCase(), k = kind.get(n) || { w: 0, r: 0, s: 0 };
    if (num(r[iW]) > 0) k.w++; if (num(r[iReps]) > 0) k.r++; if (num(r[iSecs]) > 0) k.s++;
    kind.set(n, k);
  }
  const typeOf = (n) => { const k = kind.get(n.toLowerCase()); return k.w ? 'wr' : k.r ? 'bw' : k.s ? 'time' : 'wr'; };
  const match = matcher();

  const workouts = [];
  for (const [k, g] of rowsBy) {
    const exercises = [];
    let sets = 0;
    for (const r of g.rows) {
      const exName = r[iEx].trim();
      const exId = match(exName, typeOf(exName));
      let ex = exercises.find((e) => e.exId === exId && e === exercises[exercises.length - 1]) || exercises.find((e) => e.exId === exId);
      if (!ex) { ex = { exId, note: iNote >= 0 ? (r[iNote] || '').trim() : '', rest: 90, sets: [] }; exercises.push(ex); }
      const t = iType >= 0 ? String(r[iType] || '').trim().toLowerCase() : '';
      const type = /warm|^w$|^true$/.test(t) ? 'w' : /drop|^d$/.test(t) ? 'd' : /fail|^f$/.test(t) ? 'f' : 'n';
      const w = num(r[iW]), reps = num(r[iReps]), secs = num(r[iSecs]);
      if (!w && !reps && !secs) continue;
      ex.sets.push({ id: uid(), type, weight: w ? Math.round(w * toKg * 100) / 100 : null, reps: reps ? Math.round(reps) : null, secs: secs ? Math.round(secs) : null, done: true });
      sets++;
    }
    const used = exercises.filter((e) => e.sets.length);
    if (!used.length) continue;
    const d = String(g.dur || ''), dm = (+(d.match(/(\d+)\s*h/) || [])[1] || 0) * 60 + (+(d.match(/(\d+)\s*m/) || [])[1] || 0) || (/^\d+$/.test(d) ? +d / 60 : 0);
    const end = g.end && g.end > g.start ? g.end : g.start + (dm ? dm * 6e4 : Math.max(20, sets * 2.5) * 6e4);
    workouts.push({ id: 'imp-' + hash(source + k), name: g.title || 'Workout', planId: null, start: g.start, end, imported: source, exercises: used });
  }
  workouts.sort((a, b) => b.start - a.start);
  return { workouts, custom: [...match.made.values()], source };
}

/** Save what readWorkouts found, skipping workouts already imported. Returns counts. */
export function saveWorkouts(found) {
  const have = new Set(state.workouts.map((w) => w.id));
  const fresh = found.workouts.filter((w) => !have.has(w.id));
  const used = new Set(fresh.flatMap((w) => w.exercises.map((e) => e.exId)));
  const known = new Set(allExercises().map((e) => e.id));
  const custom = found.custom.filter((e) => used.has(e.id) && !known.has(e.id));
  if (fresh.length) commit((s) => {
    s.customExercises.unshift(...custom);
    s.workouts.push(...fresh);
    s.workouts.sort((a, b) => b.start - a.start);
  });
  return { added: fresh.length, total: found.workouts.length, newExercises: custom.length };
}

/** Workouts you did at least twice by the same name, most often first: candidates for plans. */
export function routines(workouts) {
  const by = new Map();
  for (const w of workouts) {
    const n = (w.name || '').trim();
    if (!n || /^workout$/i.test(n)) continue;
    const g = by.get(n.toLowerCase()) || { name: n, count: 0, last: null };
    g.count++;
    if (!g.last || w.start > g.last.start) g.last = w;
    by.set(n.toLowerCase(), g);
  }
  const taken = new Set(state.plans.map((p) => p.name.trim().toLowerCase()));
  return [...by.values()].filter((g) => g.count >= 2 && !taken.has(g.name.toLowerCase())).sort((a, b) => b.count - a.count);
}

/** A plan from the last time you did a workout: same exercises, sets, weights and reps. */
export function planFrom(w) {
  return {
    id: uid(), name: w.name.slice(0, 40), created: Date.now(),
    exercises: w.exercises.map((e) => ({ exId: e.exId, note: '', rest: e.rest ?? 90, sets: e.sets.map((s) => ({ id: uid(), type: s.type, weight: s.weight, reps: s.reps, secs: s.secs, done: false })) })),
  };
}

// ---------- MyFitnessPal ----------

const MFP_COLS = [[/^calories/, 'kcal'], [/^fat/, 'f'], [/^saturated fat/, 'sat'], [/^cholesterol/, 'chol'], [/^sodium/, 'na'], [/^potassium/, 'k'],
  [/^carbohydrates/, 'c'], [/^fiber/, 'fib'], [/^sugar/, 'sug'], [/^protein/, 'p']];

/** Read MyFitnessPal export files: { entries (meal totals), weights: [{ ts, v }] }. Throws if none are MFP files. */
export function readMFP(files) {
  const entries = [], weights = [];
  let found = false;
  for (const f of files) {
    const { head, rows, col } = table(f.text);
    const iDate = col(/^date$/);
    if (iDate < 0) continue;
    const iMeal = col(/^meal$/), iWeight = col(/^weight/);
    if (iMeal >= 0 && col(/^calories/) >= 0) {
      found = true;
      const cols = MFP_COLS.map(([re, key]) => ({ i: head.findIndex((x) => re.test(x)), key })).filter((c) => c.i >= 0);
      for (const r of rows) {
        const ts = parseWhen(r[iDate]);
        if (!ts) continue;
        const n = {};
        for (const { i, key } of cols) { const v = num(r[i]); if (v) n[key] = v; }
        if (!n.kcal) continue;
        const day = ymdOf(ts), meal = (r[iMeal] || '').trim() || 'Food';
        entries.push({ id: 'mfp-' + hash(day + '|' + meal.toLowerCase()), date: day, meal: MEAL_OF(meal), name: `${meal} (MyFitnessPal)`, icon: '📥', quick: true, imported: 'mfp', n, ts: new Date(day + 'T12:00:00').getTime() });
      }
    } else if (iWeight >= 0) {
      found = true;
      for (const r of rows) { const ts = parseWhen(r[iDate]), v = num(r[iWeight]); if (ts && v > 0) weights.push({ ts: new Date(ts).setHours(8, 0, 0, 0), v }); }
    }
  }
  if (!found) throw new Error('That isn’t a MyFitnessPal export. Pick the zip file MyFitnessPal emailed you, or the CSVs inside it.');
  // The same meal on the same day in two files (overlapping exports): keep one
  const one = new Map(entries.map((e) => [e.id, e]));
  return { entries: [...one.values()], weights };
}

/** Save MyFitnessPal meals and weigh-ins (weights in `unitName`). Returns counts. */
export function saveMFP({ entries, weights }, unitName = 'lb') {
  const have = new Set(state.food.log.map((e) => e.id));
  const fresh = entries.filter((e) => !have.has(e.id));
  const toKg = unitName === 'lb' ? 1 / LB_PER_KG : 1;
  let wAdded = 0;
  commit((s) => {
    if (fresh.length) { s.food.log.push(...fresh); s.food.log.sort((a, b) => (a.ts || 0) - (b.ts || 0)); }
    for (const w of weights) {
      const kg = Math.round(w.v * toKg * 100) / 100;
      if (s.body.weights.some((x) => Math.abs(x.ts - w.ts) < 12 * 36e5 && Math.abs(x.kg - kg) < 0.1)) continue;
      s.body.weights.push({ id: uid(), ts: w.ts, kg, source: 'myfitnesspal' });
      wAdded++;
    }
    s.body.weights.sort((a, b) => a.ts - b.ts);
  });
  return { meals: fresh.length, days: new Set(fresh.map((e) => e.date)).size, weights: wAdded };
}
