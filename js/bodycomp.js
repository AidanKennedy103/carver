// Body composition and (optional) tape measurements, for the Body tab.
//
// Composition readings are open-ended on purpose: a smart scale (or the future
// Carver scale) can fill in any of fat %, muscle, water % and bone, tagged with
// where they came from. state.body.comp = [{ id, ts, fat, muscle, water, bone, source }]
// (muscle and bone in kg). Measurements are off until you turn them on:
// state.body.measures = [{ id, ts, waist, chest, … }] in cm.

import { h, fill, sheet, toast, confirmBox, fmtDate } from './ui.js';
import { state, commit, uid, bodyDisplay, bodyFromDisplay, bodyUnit } from './store.js';
import { lineChart } from './charts.js';
import { latestWeight } from './body.js';

const comp = () => state.body.comp || [];
const measures = () => state.body.measures || [];
const latest = (list, key) => [...list].reverse().find((x) => x[key] != null) || null;
const first30 = (list, key) => { const since = Date.now() - 30 * 864e5; return list.find((x) => x[key] != null && x.ts >= since) || null; };

// ---------- Composition ----------

const COMP = [
  { k: 'fat', label: 'Body fat', unit: '%', pct: true },
  { k: 'muscle', label: 'Muscle mass', mass: true },
  { k: 'water', label: 'Body water', unit: '%', pct: true },
  { k: 'bone', label: 'Bone mass', mass: true },
];
const showComp = (c, v) => (c.mass ? `${bodyDisplay(v)} ${bodyUnit()}` : `${Math.round(v * 10) / 10}%`);

export function compSection() {
  const list = comp();
  const fat = latest(list, 'fat');
  const w = latestWeight();
  const goal = state.goals.bodyFat;
  const pts = list.filter((x) => x.fat != null && x.ts > Date.now() - 180 * 864e5).map((x) => ({ x: x.ts, y: x.fat }));
  const since = first30(list, 'fat');
  return [
    h('div.section-head', h('h2.section-title', 'Body composition'), h('button.link', { onclick: logComp }, '+ Add')),
    list.length ? h('section.card',
      fat ? h('div.energy-top',
        h('div', h('div.energy-v', `${Math.round(fat.fat * 10) / 10}`, h('span.orm-unit', '% fat')), h('div.energy-k', `${fmtDate(fat.ts, { month: 'short', day: 'numeric' })}${goal ? ` · goal ${goal}%` : ''}`)),
        w ? h('div.energy-goal', h('div.weight-change', `${bodyDisplay(w.kg * (1 - fat.fat / 100))} ${bodyUnit()}`), h('div.energy-k', 'lean mass')) : null) : null,
      since && fat && since !== fat ? h('p.fine', `${fat.fat - since.fat > 0 ? '+' : ''}${Math.round((fat.fat - since.fat) * 10) / 10}% body fat in the last 30 days.`) : null,
      pts.length > 1 ? lineChart(pts, { height: 120, dots: pts.length < 30, fmtY: (v) => `${Math.round(v)}%`, label: 'Body fat, last 6 months', tip: (p) => `<b>${p.y}%</b><span>${fmtDate(p.x, { month: 'short', day: 'numeric' })}</span>` }) : null,
      h('div.comp-grid', COMP.filter((c) => c.k !== 'fat').map((c) => { const x = latest(list, c.k); return x ? h('div.tile', h('div.tile-v', showComp(c, x[c.k])), h('div.tile-k', c.label)) : null; })))
      : h('button.card.empty-plan-row', { onclick: logComp }, '📊', h('span', 'Add your body fat or a smart-scale reading')),
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
  if (Math.abs(d) < 0.25) return 'At your goal weight 🎯';
  return `${bodyDisplay(Math.abs(d))} ${bodyUnit()} to go · goal ${bodyDisplay(g)} ${bodyUnit()}`;
}
