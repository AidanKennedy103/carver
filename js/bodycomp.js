// Body composition and (optional) tape measurements, for the Body tab.
//
// Composition readings are open-ended on purpose: a smart scale (or the future
// Carver scale) can fill in any of fat %, muscle, water % and bone, tagged with
// where they came from. state.body.comp = [{ id, ts, fat, muscle, water, bone, source }]
// (muscle and bone in kg). Measurements are off until you turn them on:
// state.body.measures = [{ id, ts, waist, chest, … }] in cm.

import { h, fill, sheet, toast, confirmBox, fmtDate, icon, promptBox } from './ui.js';
import { state, commit, uid, bodyDisplay, bodyFromDisplay, bodyUnit } from './store.js';
import { lineChart, fitNote } from './charts.js';
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
  return [
    h('div.section-head', h('h2.section-title', 'Body composition'), h('button.link', { onclick: logComp }, '+ Add')),
    list.length ? h('section.card',
      fat ? h('div.energy-top',
        h('div', h('div.energy-v', `${Math.round(fat.fat * 10) / 10}`, h('span.orm-unit', '% fat')), h('div.energy-k', `${fmtDate(fat.ts, { month: 'short', day: 'numeric' })}${goal ? ` · goal ${goal}%` : ''}`)),
        lean && Math.abs(lean.ts - fat.ts) < 864e5 ? h('div.energy-goal', h('div.weight-change', `${bodyDisplay(lean.lean)} ${bodyUnit()}`), h('div.energy-k', 'lean mass'))
          : w ? h('div.energy-goal', h('div.weight-change', `${bodyDisplay(w.kg * (1 - fat.fat / 100))} ${bodyUnit()}`), h('div.energy-k', 'lean mass')) : null) : null,
      since && fat && since !== fat ? h('p.fine', `${fat.fat - since.fat > 0 ? '+' : ''}${Math.round((fat.fat - since.fat) * 10) / 10}% body fat in the last 30 days.`) : null,
      h('div.comp-grid', w ? bmiTile(w) : null, COMP.filter((c) => c.k !== 'fat' && !(c.k === 'lean' && fat)).map((c) => { const x = latest(list, c.k); return x ? h('div.tile', h('div.tile-v', showComp(c, x[c.k])), h('div.tile-k', c.label)) : null; })),
      bmi ? h('p.fine', `BMI ${bmi.toFixed(1)} is ${bmiWord(bmi)}${/range/.test(bmiWord(bmi)) ? '' : ' the 18.5–25 range'}. It only uses height and weight, so muscular lifters often read high; body fat and lean mass say more.`) : null)
      : [w ? h('section.card', h('div.comp-grid', bmiTile(w))) : null, h('button.card.empty-plan-row', { onclick: logComp }, icon('chart', 18), h('span', 'Add your body fat or a smart-scale reading'))],
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
    return best ? { x: c.ts, y: best.kg * (1 - c.fat / 100) } : null;
  }).filter(Boolean)].sort((a, b) => a.x - b.x);
}

/** The metrics you have at least two readings of: { k, label, pts (kg/%/cm), show, fmt }. */
export function bodyMetrics(trendPts) {
  const mass = (v) => +bodyDisplay(v), pct = (v) => Math.round(v * 10) / 10;
  const out = [
    { k: 'weight', label: 'Weight', pts: trendPts.map((p) => ({ x: p.x, y: p.raw ?? p.y })), show: mass, unit: bodyUnit(), weighIns: true },   // each weigh-in, as you stepped on the scale
    { k: 'fat', label: 'Body fat', pts: comp().filter((x) => x.fat != null).map((x) => ({ x: x.ts, y: x.fat })), show: pct, unit: '%' },
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

const RANGES = [['3M', 90], ['1Y', 365], ['All', 1e5]];
/** Weigh-ins more than this many days apart start a new section of the line. */
export const GAP_DAYS = 10;
/** The chart with a chip for each metric and a time range. Remembers your pick. */
/** opts.pins(): progress photos (or anything) to pin on the line at their dates. */
export function metricChart(trendPts, { pins = null } = {}) {
  const list = bodyMetrics(trendPts);
  if (!list.length) return null;
  const wrap = h('div.metric-chart');
  function draw() {
    const k = list.some((m) => m.k === state.settings.bodyMetric) ? state.settings.bodyMetric : list[0].k;
    const days = state.settings.bodyRange || 90;
    const m = list.find((x) => x.k === k);
    const pts = m.pts.filter((p) => p.x > Date.now() - days * 864e5);
    const shown = (pts.length > 1 ? pts : m.pts).map((p) => ({ ...p, y: m.show(p.y) }));
    const first = shown[0].y, last = shown[shown.length - 1].y, d = Math.round((last - first) * 10) / 10;
    fill(wrap,
      list.length > 1 ? h('div.chips.tight.metric-chips', list.map((x) => h('button.chip' + (x.k === k ? '.on' : ''), { onclick: () => { state.settings.bodyMetric = x.k; commit(); } }, x.label))) : null,
      h('div.metric-now', h('b', `${last}`), h('span', ` ${m.unit}`), shown.length > 1 ? h('span.metric-d' + (d === 0 ? '' : ''), ` ${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d)} ${m.unit} ${pts.length > 1 ? `in ${RANGES.find((r) => r[1] === days)?.[0] === 'All' ? 'all time' : RANGES.find((r) => r[1] === days)?.[0] === '1Y' ? 'a year' : '3 months'}` : 'overall'}`) : null),
      lineChart(shown, { height: 150, dots: m.weighIns ? 'all' : shown.length < 30, gap: m.weighIns ? GAP_DAYS : null, area: !m.weighIns, fit: m.weighIns, fmtY: (v) => (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10), label: `${m.label} over time`, pins: pins ? pins() : [],
        tip: (p) => `<b>${p.y} ${m.unit}</b><span>${fmtDate(p.x, { month: 'short', day: 'numeric', year: 'numeric' })}</span>` }),
      m.weighIns ? fitNote(shown, m.unit) : null,
      h('div.segment.metric-range', RANGES.map(([l, v]) => h('button' + (v === days ? '.on' : ''), { onclick: () => { state.settings.bodyRange = v; commit(); } }, l))));
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
