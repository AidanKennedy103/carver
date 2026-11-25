// Body composition and (optional) tape measurements, for the Body tab.
//
// Composition readings are open-ended on purpose: a smart scale (or the future
// Carver scale) can fill in any of fat %, muscle, water % and bone, tagged with
// where they came from. state.body.comp = [{ id, ts, fat, muscle, water, bone, source }]
// (muscle and bone in kg). Measurements are off until you turn them on:
// state.body.measures = [{ id, ts, waist, chest, … }] in cm.

import { h, fill, sheet, toast, confirmBox, fmtDate, icon, promptBox, actionSheet } from './ui.js';
import { state, commit, uid, bodyDisplay, bodyFromDisplay, bodyUnit } from './store.js';
import { lineChart, fitNote, seriesChart } from './charts.js';
import { latestWeight } from './body.js';

const comp = () => state.body.comp || [];
const measures = () => state.body.measures || [];
const latest = (list, key) => [...list].reverse().find((x) => x[key] != null) || null;
const first30 = (list, key) => { const since = Date.now() - 30 * 864e5; return list.find((x) => x[key] != null && x.ts >= since) || null; };

// ---------- Composition ----------

const COMP = [
  { k: 'fat', label: 'Body fat', unit: '%', pct: true },
  { k: 'lean', label: 'Lean mass', mass: true },
  { k: 'muscle', label: 'Muscle mass', mass: true },
  { k: 'water', label: 'Body water', unit: '%', pct: true },
  { k: 'bone', label: 'Bone mass', mass: true },
];
const showComp = (c, v) => (c.mass ? `${bodyDisplay(v)} ${bodyUnit()}` : `${Math.round(v * 10) / 10}%`);

// ---------- Scans (DEXA and friends): the accurate readings your scale is calibrated to ----------
// Home scales guess body fat from electrical resistance and are often a few % off, but they're
// consistent. So when you add a scan, the scale's readings from within 3 days of it give the
// offset, and every scale reading after that (until the next scan) is shifted by it.

export const SCANS = [['dexa', 'DEXA'], ['inbody', 'InBody'], ['bodpod', 'Bod Pod'], ['hydro', 'Hydrostatic'], ['calipers', 'Calipers']];
const scanName = (src) => SCANS.find(([k]) => k === src)?.[1] || null;
const isScan = (r) => !!scanName(r.source);
const NEAR = 3 * 864e5;
const r1 = (v) => Math.round(v * 10) / 10;

/** Each scan with fat %, and how far off the scale was around it (null if you didn't weigh in on it then). */
export function scans() {
  return comp().filter((r) => isScan(r) && r.fat != null).map((sc) => {
    const near = comp().filter((x) => !isScan(x) && x.fat != null && Math.abs(x.ts - sc.ts) <= NEAR);
    const read = near.length ? near.reduce((a, x) => a + x.fat, 0) / near.length : null;
    return { ...sc, scaleRead: read, offset: read == null ? null : sc.fat - read };
  });
}
/** The scan a scale reading is calibrated to: the latest one before it (or just after it), if it has an offset. */
function calFor(ts) {
  const list = scans().filter((x) => x.offset != null);
  return list.filter((x) => x.ts <= ts + NEAR).pop() || list[0] || null;
}
/** Body fat % for a reading: scans as they are, scale readings shifted to match your scans. */
export const fatOf = (r) => (r.fat == null ? null : isScan(r) ? r.fat : r1(r.fat + (calFor(r.ts)?.offset || 0)));

/** Add a DEXA, InBody, Bod Pod, hydrostatic or caliper scan, on the day it was done. */
function logScan() {
  let kind = 'dexa';
  const today = new Date(), iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const date = h('input.field.scan-date', { type: 'date', value: iso, max: iso, 'aria-label': 'Scan date' });
  const kinds = h('div.chips.scan-kinds');
  const drawKinds = () => fill(kinds, SCANS.map(([k, label]) => h('button.chip' + (k === kind ? '.on' : ''), { onclick: () => { kind = k; drawKinds(); } }, label)));
  drawKinds();
  const FIELDS = [['fat', 'Body fat', '%'], ['fatMass', 'Fat mass', bodyUnit()], ['lean', 'Lean mass', bodyUnit()], ['bone', 'Bone mass', bodyUnit()], ['visceral', 'Visceral fat', bodyUnit()]];
  const inputs = {};
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', 'Add a scan'), h('button.link.strong', { onclick: save }, 'Save')),
    h('p.fine', 'Copy the numbers from your scan report. Fill in what it gives you; body fat alone is enough.'),
    kinds,
    h('div.group', h('label.goal-row', h('span', 'Date of scan'), date),
      FIELDS.map(([k, label, u]) => {
        inputs[k] = h('input.field.goal-input', { inputmode: 'decimal', placeholder: '—', 'aria-label': label });
        return h('label.goal-row', h('span', label), h('span.goal-field', inputs[k], h('span.goal-unit', u)));
      })),
    h('p.fine', 'If you weigh in on your smart scale within 3 days of the scan, Carver works out how far off the scale reads and corrects its body fat and lean mass from then on.')));
  function save() {
    const num = (k) => { const v = parseFloat(inputs[k].value.replace(',', '.')); return v > 0 ? v : null; };
    const ts = date.value ? new Date(date.value + 'T12:00').getTime() : Date.now();
    const r = { id: uid(), ts, source: kind };
    let fat = num('fat');
    const fm = num('fatMass'), lean = num('lean'), bone = num('bone'), vis = num('visceral');
    if (fat != null && fat >= 75) { toast('Body fat looks too high'); return; }
    if (lean) r.lean = bodyFromDisplay(lean);
    if (bone) r.bone = bodyFromDisplay(bone);
    if (fm) r.fatMass = bodyFromDisplay(fm);
    if (vis) r.visceral = bodyFromDisplay(vis);
    // DEXA reports often lead with masses: work the % out from them if it's missing
    if (fat == null && fm && lean) fat = (fm / (fm + lean + (bone || 0))) * 100;
    if (fat != null) r.fat = r1(fat);
    if (r.fat == null && r.lean == null) { toast('Add body fat, or fat and lean mass'); return; }
    commit((st) => { st.body.comp = [...(st.body.comp || []), r].sort((a, b) => a.ts - b.ts); });
    s.close();
    const sc = scans().find((x) => x.id === r.id);
    toast(sc?.offset != null && Math.abs(sc.offset) >= 0.5 ? `Saved. Your scale reads ${Math.abs(r1(sc.offset))}% ${sc.offset > 0 ? 'low' : 'high'}; corrected from now on` : 'Scan saved');
  }
}

/** What "+ Add" offers: a quick reading, or a proper scan. */
function addComp() {
  actionSheet('Body composition', [
    { label: 'Smart scale or calipers reading', onClick: logComp },
    { label: 'DEXA, InBody or other scan', onClick: logScan },
  ]);
}

/** One line about your latest scan and the correction it gives your scale. */
function scanLine() {
  const list = scans();
  const last = list[list.length - 1] || comp().filter(isScan).pop();
  if (!last) return h('button.dexa-cta', { onclick: logScan }, icon('target', 15), h('span', 'Had a DEXA or InBody scan? Add it to calibrate your scale'));
  const when = fmtDate(last.ts, { month: 'short', day: 'numeric', ...(new Date(last.ts).getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
  const off = last.offset;
  const what = off == null ? 'Weigh in on your smart scale within 3 days of a scan to calibrate it.'
    : Math.abs(off) < 0.5 ? 'Your scale matched it closely, so no correction needed.'
      : `Your scale read ${Math.abs(r1(off))}% ${off > 0 ? 'low' : 'high'}, so its readings are corrected by that.`;
  return h('button.dexa-line', { onclick: logScan }, h('b', `${scanName(last.source)} ${when}${last.fat != null ? ` · ${r1(last.fat)}%` : ''}`), h('span', what));
}

// ---------- BMI ----------

const heightM = () => (state.profile?.heightCm ? state.profile.heightCm / 100 : null);
export const bmiOf = (kg) => (heightM() && kg ? kg / heightM() ** 2 : null);
const BMI_BANDS = [[18.5, 'under'], [25, 'in the healthy range'], [30, 'over'], [Infinity, 'well over']];
const bmiWord = (b) => BMI_BANDS.find(([top]) => b < top)[1];

/** Ask for height once (it's also the diet coach's). Takes 5'10", 70 (inches) or 178 (cm). */
async function askHeight() {
  const cm = state.profile?.heightCm;
  const was = cm ? (imperial() ? `${Math.floor(cm / 2.54 / 12)}'${Math.round(cm / 2.54) % 12}"` : String(cm)) : '';
  const v = await promptBox('Your height', was, { placeholder: imperial() ? `5'10"` : '178 cm' });
  if (v == null || v === '') return;
  const ftIn = v.match(/^(\d)\s*(?:'|’|ft|\s)\s*(\d{1,2})?/);
  const n = parseFloat(v);
  const out = ftIn ? Math.round(((+ftIn[1]) * 12 + (+ftIn[2] || 0)) * 2.54) : n > 100 && n < 250 ? Math.round(n) : n >= 48 && n <= 90 ? Math.round(n * 2.54) : null;
  if (!out) { toast('Try something like 5\'10" or 178'); return; }
  commit((s) => { s.profile = { ...(s.profile || {}), heightCm: out }; });
}

function bmiTile(w) {
  const b = bmiOf(w?.kg);
  return h('button.tile.bmi-tile', { onclick: askHeight, 'aria-label': b ? `BMI ${b.toFixed(1)}. Tap to change your height.` : 'Add your height for BMI' },
    h('div.tile-v', b ? b.toFixed(1) : '—'), h('div.tile-k', b ? 'BMI' : 'BMI: add height'));
}

export function compSection() {
  const list = comp();
  const fat = latest(list, 'fat');
  const w = latestWeight();
  const lean = latest(list, 'lean');
  const bmi = bmiOf(w?.kg);
  const goal = state.goals.bodyFat;
  const since = first30(list, 'fat');
  const fatV = fat ? fatOf(fat) : null, adjusted = fat && !isScan(fat) && fatV !== fat.fat;
  return [
    h('div.section-head', h('h2.section-title', 'Body composition'), h('button.link', { onclick: addComp }, '+ Add')),
    list.length ? h('section.card',
      fat ? h('div.energy-top',
        h('div', h('div.energy-v', `${Math.round(fatV * 10) / 10}`, h('span.orm-unit', '% fat')), h('div.energy-k', `${fmtDate(fat.ts, { month: 'short', day: 'numeric' })}${adjusted ? ` · scale said ${r1(fat.fat)}%` : isScan(fat) ? ` · ${scanName(fat.source)}` : ''}${goal ? ` · goal ${goal}%` : ''}`)),
        lean && Math.abs(lean.ts - fat.ts) < 864e5 && (isScan(lean) || !adjusted) ? h('div.energy-goal', h('div.weight-change', `${bodyDisplay(lean.lean)} ${bodyUnit()}`), h('div.energy-k', 'lean mass'))
          : w ? h('div.energy-goal', h('div.weight-change', `${bodyDisplay(w.kg * (1 - fatV / 100))} ${bodyUnit()}`), h('div.energy-k', 'lean mass')) : null) : null,
      since && fat && since !== fat ? h('p.fine', `${fatV - fatOf(since) > 0 ? '+' : ''}${r1(fatV - fatOf(since))}% body fat in the last 30 days.`) : null,
      h('div.comp-grid', w ? bmiTile(w) : null, COMP.filter((c) => c.k !== 'fat' && !(c.k === 'lean' && fat)).map((c) => { const x = latest(list, c.k); return x ? h('div.tile', h('div.tile-v', showComp(c, x[c.k])), h('div.tile-k', c.label)) : null; })),
      bmi ? h('p.fine', `BMI ${bmi.toFixed(1)} is ${bmiWord(bmi)}${/range/.test(bmiWord(bmi)) ? '' : ' the 18.5–25 range'}. It only uses height and weight, so muscular lifters often read high; body fat and lean mass say more.`) : null,
      scanLine())
      : [w ? h('section.card', h('div.comp-grid', bmiTile(w))) : null, h('button.card.empty-plan-row', { onclick: addComp }, icon('chart', 18), h('span', 'Add your body fat, a smart-scale reading or a DEXA scan'))],
  ];
}

function logComp() {
  const inputs = {};
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', 'Body composition'), h('button.link.strong', { onclick: save }, 'Save')),
    h('p.fine', 'From a smart scale, a DEXA or InBody scan, or calipers. Fill in what you have.'),
    h('div.group', COMP.map((c) => {
      inputs[c.k] = h('input.field.goal-input', { inputmode: 'decimal', placeholder: '—', 'aria-label': c.label });
      return h('label.goal-row', h('span', c.label), h('span.goal-field', inputs[c.k], h('span.goal-unit', c.mass ? bodyUnit() : '%')));
    }))));
  setTimeout(() => inputs.fat.focus(), 300);
  function save() {
    const r = { id: uid(), ts: Date.now(), source: 'manual' };
    for (const c of COMP) {
      const v = parseFloat(inputs[c.k].value.replace(',', '.'));
      if (!(v > 0)) continue;
      if (c.pct && v >= 75) { toast(`${c.label} looks too high`); return; }
      r[c.k] = c.mass ? bodyFromDisplay(v) : v;
    }
    if (Object.keys(r).length <= 3) { toast('Fill in at least one'); return; }
    commit((st) => { st.body.comp = [...(st.body.comp || []), r].sort((a, b) => a.ts - b.ts); });
    s.close(); toast('Saved');
  }
}

// ---------- One chart for every body metric ----------

/** Lean mass at each body-fat reading, using the weigh-in closest to it (within 3 days). */
function leanPoints() {
  const ws = state.body.weights;
  const measured = comp().filter((c) => c.lean != null).map((c) => ({ x: c.ts, y: c.lean }));
  if (!ws.length) return measured;
  return [...measured, ...comp().filter((c) => c.fat != null && c.lean == null && !measured.some((m) => Math.abs(m.x - c.ts) < 864e5)).map((c) => {
    let best = null;
    for (const w of ws) if (Math.abs(w.ts - c.ts) < 3 * 864e5 && (!best || Math.abs(w.ts - c.ts) < Math.abs(best.ts - c.ts))) best = w;
    return best ? { x: c.ts, y: best.kg * (1 - fatOf(c) / 100) } : null;
  }).filter(Boolean)].sort((a, b) => a.x - b.x);
}

/** The metrics you have at least two readings of: { k, label, pts (kg/%/cm), show, fmt }. */
export function bodyMetrics(trendPts) {
  const mass = (v) => +bodyDisplay(v), pct = (v) => Math.round(v * 10) / 10;
  const out = [
    { k: 'weight', label: 'Weight', pts: trendPts.map((p) => ({ x: p.x, y: p.raw ?? p.y })), show: mass, unit: bodyUnit(), weighIns: true },   // each weigh-in, as you stepped on the scale
    { k: 'fat', label: 'Body fat', pts: comp().filter((x) => x.fat != null).map((x) => ({ x: x.ts, y: fatOf(x) })), show: pct, unit: '%' },
    { k: 'lean', label: 'Lean mass', pts: leanPoints(), show: mass, unit: bodyUnit() },
    { k: 'bmi', label: 'BMI', pts: heightM() ? trendPts.map((p) => ({ x: p.x, y: p.y / heightM() ** 2 })) : [], show: pct, unit: '' },
    { k: 'muscle', label: 'Muscle', pts: comp().filter((x) => x.muscle != null).map((x) => ({ x: x.ts, y: x.muscle })), show: mass, unit: bodyUnit() },
    { k: 'water', label: 'Water', pts: comp().filter((x) => x.water != null).map((x) => ({ x: x.ts, y: x.water })), show: pct, unit: '%' },
  ];
  if (state.settings.measure) for (const [k, label] of SPOTS) {
    const pts = measures().filter((x) => x[k] != null).map((x) => ({ x: x.ts, y: x[k] }));
    out.push({ k, label, pts, show: (cm) => Math.round((imperial() ? cm / 2.54 : cm) * 10) / 10, unit: lenUnit() });
  }
  return out.filter((m) => m.pts.length > 1);
}

const RANGES = [['1M', 30], ['3M', 91], ['1Y', 365], ['All', 1e5]];
const RANGE_WORD = { 30: 'a month', 91: '3 months', 365: 'a year', 1e5: 'all time' };
// Longer ranges show fewer points, like FitIndex: every weigh-in for a month, weekly averages for 3 months, monthly after that
const GRAN = { 30: 'day', 91: 'week', 365: 'month', 1e5: 'month' };
function bucket(list, gran) {
  if (gran === 'day') return list.map((p) => ({ ...p, n: 1, gran }));
  const keyOf = (t) => {
    const d = new Date(t);
    if (gran === 'month') return d.getFullYear() * 12 + d.getMonth();
    d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime();
  };
  const groups = new Map();
  for (const p of list) { const k = keyOf(p.x); (groups.get(k) || groups.set(k, []).get(k)).push(p); }
  return [...groups.values()].map((g) => ({ x: g.reduce((a, p) => a + p.x, 0) / g.length, y: Math.round((g.reduce((a, p) => a + p.y, 0) / g.length) * 10) / 10, n: g.length, gran, start: g[0].x }));
}
/** Weigh-ins more than this many days apart start a new section of the line. */
export const GAP_DAYS = 10;
/** The chart with a chip for each metric and Week / Month / Year, FitIndex style. Remembers your pick. */
const VIEWS = [['week', 'Week'], ['month', 'Month'], ['year', 'Year']];
const VIEW_GRAN = { week: 'day', month: 'week', year: 'month' };
const VIEW_DAYS = { week: 30, month: 91, year: 365 };
/** opts.pins(): progress photos (or anything) to pin over the chart at their dates. */
export function metricChart(trendPts, { pins = null } = {}) {
  const list = bodyMetrics(trendPts);
  if (!list.length) return null;
  const wrap = h('div.metric-chart');
  function draw() {
    const k = list.some((m) => m.k === state.settings.bodyMetric) ? state.settings.bodyMetric : list[0].k;
    const view = VIEWS.some(([v]) => v === state.settings.bodyView) ? state.settings.bodyView : 'week';
    const m = list.find((x) => x.k === k);
    const gran = VIEW_GRAN[view];
    const all = m.pts.map((p) => ({ ...p, y: m.show(p.y) }));
    const data = bucket(all, gran);
    const fmtV = (v) => (Math.abs(v) >= 100 ? (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, '') : String(Math.round(v * 10) / 10));
    const since = Date.now() - VIEW_DAYS[view] * 864e5;
    const recent = all.filter((p) => p.x >= since);
    const last = all[all.length - 1].y;
    const d = recent.length > 1 ? Math.round((last - recent[0].y) * 10) / 10 : null;
    const goalKg = k === 'weight' && state.goals.weight ? state.goals.weight : null;

    // The number up top: the latest, or the point you tapped
    const nowV = h('b'), nowS = h('span.metric-d');
    const showNow = (p) => {
      if (!p) {
        fill(nowV, fmtV(last));
        fill(nowS, d != null ? ` ${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d)} ${m.unit} in ${{ week: 'a month', month: '3 months', year: 'a year' }[view]}` : '');
        return;
      }
      fill(nowV, fmtV(p.y));
      fill(nowS, ` ${p.gran === 'week' ? `avg, week of ${fmtDate(p.start, { month: 'short', day: 'numeric' })}` : p.gran === 'month' ? `avg, ${fmtDate(p.x, { month: 'long', year: 'numeric' })}` : fmtDate(p.x, { weekday: 'short', month: 'short', day: 'numeric' })}`);
    };
    showNow(null);

    fill(wrap,
      list.length > 1 ? h('div.chips.tight.metric-chips', list.map((x) => h('button.chip' + (x.k === k ? '.on' : ''), { onclick: () => { state.settings.bodyMetric = x.k; commit(); } }, x.label))) : null,
      h('div.segment.metric-range.top', VIEWS.map(([v, l]) => h('button' + (v === view ? '.on' : ''), { onclick: () => { state.settings.bodyView = v; commit(); } }, l))),
      h('div.metric-now', nowV, h('span', ` ${m.unit}`), nowS),
      seriesChart(data, {
        per: view === 'year' ? 8 : 7, labels: view !== 'year' || data.length <= 8, goal: goalKg ? m.show(goalKg) : null,
        minSpan: m.weighIns ? ({ week: 5, month: 8, year: 16 }[view] / (bodyUnit() === 'lb' ? 1 : 2.2)) : 0, fmtY: fmtV, label: `${m.label} over time`,
        fmtX: (t) => new Date(t).toLocaleDateString(undefined, gran === 'month' ? { month: 'short' } : { month: 'numeric', day: 'numeric' }),
        onSelect: showNow, pins: pins ? pins() : [],
      }),
      m.weighIns ? fitNote(recent.length > 2 ? recent : all, m.unit) : null);
  }
  draw();
  return wrap;
}

// ---------- Measurements (optional) ----------

const SPOTS = [['waist', 'Waist'], ['chest', 'Chest'], ['hips', 'Hips'], ['arms', 'Arms'], ['thighs', 'Thighs'], ['neck', 'Neck'], ['calves', 'Calves']];
const imperial = () => bodyUnit() === 'lb';
const lenUnit = () => (imperial() ? 'in' : 'cm');
const showLen = (cm) => `${Math.round((imperial() ? cm / 2.54 : cm) * 10) / 10} ${lenUnit()}`;

export function measureSection() {
  const on = state.settings.measure;
  if (!on) return h('button.link.measure-on', { onclick: () => commit((st) => { st.settings.measure = true; }) }, '+ Track tape measurements too (optional)');
  const list = measures();
  const spots = state.settings.measureSpots || ['waist', 'chest', 'arms'];
  return [
    h('div.section-head', h('h2.section-title', 'Measurements'), h('button.link', { onclick: () => logMeasure(spots) }, '+ Add')),
    h('section.card.list-card',
      spots.map((k) => {
        const x = latest(list, k), s0 = first30(list, k);
        const d = x && s0 && s0 !== x ? x[k] - s0[k] : null;
        return h('div.group-row', h('span', SPOTS.find((s) => s[0] === k)[1]),
          h('span.row-val', x ? `${showLen(x[k])}${d ? ` · ${d > 0 ? '+' : '−'}${showLen(Math.abs(d))} in 30 days` : ''}` : 'Not yet'));
      })),
    h('div.text-actions',
      h('button.link.plain', { onclick: chooseSpots }, 'Choose what to measure'),
      h('button.link.plain', { onclick: async () => { if (await confirmBox('Stop tracking measurements?', 'Past ones stay saved.', { ok: 'Stop' })) commit((st) => { st.settings.measure = false; }); } }, 'Turn off')),
  ];
}

function chooseSpots() {
  const picked = new Set(state.settings.measureSpots || ['waist', 'chest', 'arms']);
  const box = h('div.chips.tight.no-drag');
  const draw = () => fill(box, SPOTS.map(([k, l]) => h('button.chip' + (picked.has(k) ? '.on' : ''), { onclick: () => { if (picked.has(k)) picked.delete(k); else picked.add(k); draw(); } }, l)));
  draw();
  const s = sheet(h('div.form',
    h('div.sheet-head', h('span'), h('div.sheet-title', 'What to measure'), h('button.link.strong', {
      onclick: () => { if (!picked.size) { toast('Pick at least one'); return; } commit((st) => { st.settings.measureSpots = SPOTS.map((x) => x[0]).filter((k) => picked.has(k)); }); s.close(); },
    }, 'Done')),
    box));
}

function logMeasure(spots) {
  const inputs = {};
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', 'Measurements'), h('button.link.strong', { onclick: save }, 'Save')),
    h('p.fine', 'Measure at the same time of day, relaxed, tape snug but not tight.'),
    h('div.group', spots.map((k) => {
      inputs[k] = h('input.field.goal-input', { inputmode: 'decimal', placeholder: '—', 'aria-label': k });
      return h('label.goal-row', h('span', SPOTS.find((x) => x[0] === k)[1]), h('span.goal-field', inputs[k], h('span.goal-unit', lenUnit())));
    }))));
  function save() {
    const r = { id: uid(), ts: Date.now() };
    for (const k of spots) { const v = parseFloat(inputs[k].value.replace(',', '.')); if (v > 0) r[k] = imperial() ? v * 2.54 : v; }
    if (Object.keys(r).length <= 2) { toast('Fill in at least one'); return; }
    commit((st) => { st.body.measures = [...(st.body.measures || []), r].sort((a, b) => a.ts - b.ts); });
    s.close(); toast('Saved');
  }
}

// ---------- Goal weight ----------

/** "4.2 lb to go" toward your goal weight, or null without one. */
export function weightGoalText() {
  const g = state.goals.weight, w = latestWeight();
  if (!g || !w) return null;
  const d = w.kg - g;
  if (Math.abs(d) < 0.25) return 'At your goal weight';
  return `${bodyDisplay(Math.abs(d))} ${bodyUnit()} to go · goal ${bodyDisplay(g)} ${bodyUnit()}`;
}
