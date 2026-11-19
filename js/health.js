// Apple Health import. On iPhone: Health app → your picture → Export All Health Data,
// save the zip to Files, then pick it in Carver. Web apps can't read Health live, but
// this export has everything: Apple Watch, Oura, Ultrahuman, Whoop, Garmin and smart
// scales all write into Health. The file is read as it streams, so big exports work.
//
// Brings in:
//   Physical Metrics: weight, body fat
//   Fitness:          daily steps and active energy, cardio workouts (distance, energy, heart rate)
//   Recovery:         sleep (with deep and REM when tracked), resting heart rate, HRV
// Daily numbers go in state.health.days = { 'YYYY-MM-DD': { steps, active, sleep, deep, rem, rhr, hrv, vo2 } }.
// Re-importing is safe: days are replaced, weigh-ins and workouts already in Carver are skipped.

import { h, sheet, toast } from './ui.js';
import { state, commit, uid, ymd, LB_PER_KG } from './store.js';
import { importActivities, typeFrom, STRENGTH } from './fitness.js';

const KEEP_DAYS = 400;   // daily numbers older than this aren't kept
const MI = 1609.344;

// ---------- Reading the zip without loading it all ----------

/** The export.xml inside a Health export zip, as a stream of bytes (also its size, for progress). */
async function xmlStream(file) {
  if (!/\.zip$/i.test(file.name) && file.type !== 'application/zip') return { stream: file.stream(), size: file.size };
  const tail = new DataView(await file.slice(Math.max(0, file.size - 65558)).arrayBuffer());
  let e = tail.byteLength - 22;
  while (e >= 0 && tail.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('That zip file looks damaged.');
  let count = tail.getUint16(e + 10, true), cdSize = tail.getUint32(e + 12, true), cdOff = tail.getUint32(e + 16, true);
  if (cdOff === 0xffffffff && e >= 20 && tail.getUint32(e - 20, true) === 0x07064b50) {   // zip64
    const z = new DataView(await file.slice(Number(tail.getBigUint64(e - 12, true)), Number(tail.getBigUint64(e - 12, true)) + 56).arrayBuffer());
    count = Number(z.getBigUint64(32, true)); cdSize = Number(z.getBigUint64(40, true)); cdOff = Number(z.getBigUint64(48, true));
  }
  const cd = new DataView(await file.slice(cdOff, cdOff + cdSize).arrayBuffer());
  const dec = new TextDecoder();
  let p = 0;
  for (let i = 0; i < count && p < cd.byteLength; i++) {
    const method = cd.getUint16(p + 10, true);
    let csize = cd.getUint32(p + 20, true), usize = cd.getUint32(p + 24, true), off = cd.getUint32(p + 42, true);
    const nlen = cd.getUint16(p + 28, true), xlen = cd.getUint16(p + 30, true), clen = cd.getUint16(p + 32, true);
    const name = dec.decode(new Uint8Array(cd.buffer, p + 46, nlen));
    // zip64 sizes live in an extra field
    let x = p + 46 + nlen;
    const xend = x + xlen;
    while (x + 4 <= xend) {
      const id = cd.getUint16(x, true), len = cd.getUint16(x + 2, true);
      if (id === 1) {
        let q = x + 4;
        if (usize === 0xffffffff) { usize = Number(cd.getBigUint64(q, true)); q += 8; }
        if (csize === 0xffffffff) { csize = Number(cd.getBigUint64(q, true)); q += 8; }
        if (off === 0xffffffff) { off = Number(cd.getBigUint64(q, true)); }
      }
      x += 4 + len;
    }
    p = xend + clen;
    if (!/(^|\/)export\.xml$/i.test(name)) continue;
    const lh = new DataView(await file.slice(off, off + 30).arrayBuffer());
    const start = off + 30 + lh.getUint16(26, true) + lh.getUint16(28, true);
    const raw = file.slice(start, start + csize).stream();
    if (method === 0) return { stream: raw, size: csize };
    if (method === 8) return { stream: raw.pipeThrough(new DecompressionStream('deflate-raw')), size: usize || csize * 10 };
    throw new Error('That zip uses a format Carver can’t open. Unzip it and pick export.xml instead.');
  }
  throw new Error('No export.xml in that zip. Pick the file from Health → Export All Health Data.');
}

// ---------- Parsing ----------

const when = (s) => Date.parse(s.replace(' ', 'T').replace(/ ([+-]\d\d)(\d\d)$/, '$1:$2'));
const attrs = (line) => { const o = {}; for (const m of line.matchAll(/(\w+)="([^"]*)"/g)) o[m[1]] = m[2]; return o; };
const kcalOf = (v, u) => (/kj/i.test(u) ? v * 0.239 : v);
const distOf = (v, u) => (/^mi/i.test(u) ? v * MI : /^km/i.test(u) ? v * 1000 : /^m$/i.test(u) ? v : /^yd/i.test(u) ? v * 0.9144 : /^ft/i.test(u) ? v * 0.3048 : v * 1000);

const WANT = {
  HKQuantityTypeIdentifierStepCount: 'steps',
  HKQuantityTypeIdentifierActiveEnergyBurned: 'active',
  HKQuantityTypeIdentifierRestingHeartRate: 'rhr',
  HKQuantityTypeIdentifierHeartRateVariabilitySDNN: 'hrv',
  HKQuantityTypeIdentifierVO2Max: 'vo2',
  HKQuantityTypeIdentifierBodyMass: 'weight',
  HKQuantityTypeIdentifierBodyFatPercentage: 'fat',
  HKCategoryTypeIdentifierSleepAnalysis: 'sleep',
};

/** Read the whole export. onProgress(fraction) as it goes. */
export async function readHealth(file, onProgress = () => {}) {
  const { stream, size } = await xmlStream(file);
  const since = Date.now() - KEEP_DAYS * 864e5;
  // per day, per source: sums (steps, energy, sleep); Health keeps every device's copy, so the busiest source wins
  const sums = {};       // day -> key -> source -> value
  const avgs = {};       // day -> key -> [sum, n]
  const weights = [], fats = [], workouts = [];
  let wk = null, read = 0, buf = '';
  const add = (day, key, src, v) => { ((sums[day] ??= {})[key] ??= {})[src] = (sums[day][key][src] || 0) + v; };
  const avg = (day, key, v) => { const a = ((avgs[day] ??= {})[key] ??= [0, 0]); a[0] += v; a[1]++; };

  function line(l) {
    let i = l.indexOf('<Record ');
    if (i >= 0) {
      const t0 = l.indexOf('type="', i) + 6, type = l.slice(t0, l.indexOf('"', t0));
      const key = WANT[type];
      if (!key) return;
      const a = attrs(l);
      const start = when(a.startDate), end = when(a.endDate || a.startDate);
      if (key === 'weight') { const v = +a.value; if (v) weights.push({ ts: start, kg: /lb/i.test(a.unit) ? v / LB_PER_KG : /^g$/.test(a.unit) ? v / 1000 : v }); return; }
      if (key === 'fat') { const v = +a.value; if (v) fats.push({ ts: start, fat: v <= 1 ? v * 100 : v }); return; }
      if (end < since) return;
      const src = a.sourceName || '?';
      if (key === 'sleep') {
        const v = a.value || '';
        if (!/Asleep/.test(v)) return;
        const hrs = (end - start) / 36e5, day = ymd(end);
        add(day, 'sleep', src, hrs);
        if (/Deep/.test(v)) add(day, 'deep', src, hrs);
        if (/REM/.test(v)) add(day, 'rem', src, hrs);
        return;
      }
      const v = +a.value;
      if (!Number.isFinite(v)) return;
      const day = ymd(start);
      if (key === 'steps') add(day, 'steps', src, v);
      else if (key === 'active') add(day, 'active', src, kcalOf(v, a.unit));
      else avg(day, key, v);
      return;
    }
    i = l.indexOf('<Workout ');
    if (i >= 0) {
      const a = attrs(l);
      const name = (a.workoutActivityType || '').replace('HKWorkoutActivityType', '');
      const dur = (+a.duration || 0) * (/^h/i.test(a.durationUnit) ? 3600 : /^s/i.test(a.durationUnit) ? 1 : 60) * 1000;
      wk = { name, start: when(a.startDate), dur, dist: a.totalDistance ? distOf(+a.totalDistance, a.totalDistanceUnit || 'km') : null, kcal: a.totalEnergyBurned ? kcalOf(+a.totalEnergyBurned, a.totalEnergyBurnedUnit) : null };
      if (/\/>\s*$/.test(l)) { workouts.push(wk); wk = null; }
      return;
    }
    if (wk && l.includes('<WorkoutStatistics ')) {
      const a = attrs(l);
      if (/HeartRate$/.test(a.type)) { if (a.average) wk.hrAvg = Math.round(+a.average); if (a.maximum) wk.hrMax = Math.round(+a.maximum); }
      else if (/ActiveEnergyBurned/.test(a.type) && a.sum && !wk.kcal) wk.kcal = kcalOf(+a.sum, a.unit);
      else if (/Distance/.test(a.type) && a.sum && !wk.dist) wk.dist = distOf(+a.sum, a.unit);
      return;
    }
    if (wk && l.includes('</Workout>')) { workouts.push(wk); wk = null; }
  }

  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    read += value.length;
    buf += value;
    const cut = buf.lastIndexOf('\n');
    if (cut < 0) continue;
    const chunk = buf.slice(0, cut);
    buf = buf.slice(cut + 1);
    for (const l of chunk.split('\n')) line(l);
    onProgress(Math.min(0.99, read / size));
  }
  if (buf) line(buf);

  const days = {};
  for (const [day, keys] of Object.entries(sums)) for (const [k, bySrc] of Object.entries(keys)) (days[day] ??= {})[k] = Math.max(...Object.values(bySrc));
  for (const [day, keys] of Object.entries(avgs)) for (const [k, [s, n]] of Object.entries(keys)) (days[day] ??= {})[k] = s / n;
  for (const d of Object.values(days)) {
    for (const k of ['steps', 'active', 'rhr', 'hrv']) if (d[k] != null) d[k] = Math.round(d[k]);
    for (const k of ['sleep', 'deep', 'rem']) if (d[k] != null) d[k] = Math.round(d[k] * 10) / 10;
    if (d.vo2 != null) d.vo2 = Math.round(d.vo2 * 10) / 10;
  }
  return { days, weights, fats, workouts };
}

/** Save what was read. Returns counts for the message. */
export function saveHealth(got) {
  const out = { days: Object.keys(got.days).length, weights: 0, fats: 0, workouts: 0 };
  commit((s) => {
    s.health = s.health || { days: {} };
    Object.assign(s.health.days, got.days);
    const cutoff = ymd(Date.now() - KEEP_DAYS * 864e5);
    for (const k of Object.keys(s.health.days)) if (k < cutoff) delete s.health.days[k];
    s.health.last = Date.now();
    // weigh-ins: skip any within 2 hours of one already saved at the same weight
    const have = s.body.weights;
    for (const w of got.weights) {
      if (have.some((x) => Math.abs(x.ts - w.ts) < 2 * 36e5 && Math.abs(x.kg - w.kg) < 0.05)) continue;
      have.push({ id: uid(), ts: w.ts, kg: Math.round(w.kg * 100) / 100, source: 'health' });
      out.weights++;
    }
    have.sort((a, b) => a.ts - b.ts);
    s.body.comp = s.body.comp || [];
    for (const f of got.fats) {
      if (s.body.comp.some((x) => x.fat != null && Math.abs(x.ts - f.ts) < 2 * 36e5)) continue;
      s.body.comp.push({ id: uid(), ts: f.ts, fat: Math.round(f.fat * 10) / 10, source: 'health' });
      out.fats++;
    }
    s.body.comp.sort((a, b) => a.ts - b.ts);
  });
  const cardio = got.workouts.filter((w) => w.start && w.dur && !STRENGTH.test(w.name))
    .map((w) => ({ type: typeFrom(w.name.replace(/([a-z])([A-Z])/g, '$1 $2')) || 'other', name: w.name.replace(/([a-z])([A-Z])/g, '$1 $2'), start: w.start, dur: w.dur, dist: w.dist ? Math.round(w.dist) : null, kcal: w.kcal ? Math.round(w.kcal) : null, ...(w.hrAvg ? { hrAvg: w.hrAvg } : {}), ...(w.hrMax ? { hrMax: w.hrMax } : {}) }));
  out.workouts = importActivities(cardio);
  return out;
}

/** A day's Health numbers, or null. */
export const healthDay = (key = ymd()) => state.health?.days?.[key] || null;
/** Imported from Health at least once. */
export const hasHealth = () => !!state.health?.last;

/** Pick the export and bring it in, with a progress sheet. */
export function importHealth() {
  const input = h('input', { type: 'file', accept: '.zip,.xml,application/zip,text/xml', hidden: true });
  input.addEventListener('change', async () => {
    const f = input.files[0];
    input.remove();
    if (!f) return;
    const bar = h('i', { style: { width: '0%' } });
    const label = h('p.fine.center', 'Reading your Health data… keep Carver open.');
    const s = sheet(h('div.form',
      h('div.sheet-head', h('span'), h('div.sheet-title', 'Apple Health'), h('span')),
      h('div.health-bar', bar), label));
    try {
      const got = await readHealth(f, (p) => { bar.style.width = `${Math.round(p * 100)}%`; });
      bar.style.width = '100%';
      const r = saveHealth(got);
      label.textContent = [
        r.days ? `${r.days} days of steps, sleep and heart data` : null,
        r.weights ? `${r.weights} weigh-ins` : null,
        r.fats ? `${r.fats} body-fat readings` : null,
        r.workouts ? `${r.workouts} cardio workouts` : null,
      ].filter(Boolean).join(', ') || 'Nothing new to bring in.';
      toast('Apple Health imported');
      setTimeout(() => s.close(), 2200);
    } catch (err) {
      label.textContent = err.message || 'Could not read that file.';
    }
  });
  document.body.append(input);
  input.click();
}

/** The "how to" block for import screens. */
export function healthHowTo() {
  return h('div.health-how',
    h('button.btn.gold.wide', { onclick: importHealth }, 'Import Apple Health export'),
    h('p.fine', 'In the Health app tap your picture → Export All Health Data, save it to Files, then pick it here. Brings in weight, body fat, steps, sleep, resting heart rate, HRV and cardio workouts from your iPhone, Apple Watch, Oura, Ultrahuman, Whoop or smart scale. Re-import any time; nothing is doubled.'));
}
