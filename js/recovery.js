// Sleep & Recovery: a quick morning check-in (sleep, how well, soreness,
// energy) turns into a readiness score with a plain suggestion for the day.
// It also looks at how hard you trained in the last two days and which muscles
// are still recovering.
//
// Stored in state.recovery = { 'YYYY-MM-DD': { sleep (hours), quality, sore, energy (1–5) } }.
// Sleep belongs to the morning you woke up.

import { h, fill, sheet, toast, navBar, fmtDate, wipBanner } from './ui.js';
import { state, commit, ymd, addDays } from './store.js';
import { barChart, COLORS } from './charts.js';
import { tally, MUSCLE_ORDER } from './volume.js';
import { findDate } from './body.js';
import { goalsButton } from './goals.js';

export const sleepGoal = () => state.goals.sleep || 8;
export const recoveryOn = (k = ymd()) => state.recovery?.[k] || null;

const SCALES = {
  quality: { label: 'How did you sleep?', words: ['Awful', 'Poor', 'OK', 'Good', 'Great'] },
  sore: { label: 'How sore are you?', words: ['Not at all', 'A little', 'Some', 'Quite', 'Very'] },
  energy: { label: 'Energy right now', words: ['Drained', 'Low', 'OK', 'Good', 'Great'] },
};

/** Working sets in the 48 hours before `ts`, and the usual for 48 hours over the last 4 weeks. */
function load(ts = Date.now()) {
  const sets = (from, to) => state.workouts.filter((w) => w.start >= from && w.start < to)
    .reduce((n, w) => n + w.exercises.reduce((m, e) => m + e.sets.filter((x) => x.done && x.type !== 'w').length, 0), 0);
  const recent = sets(ts - 2 * 864e5, ts);
  const usual = sets(ts - 30 * 864e5, ts - 2 * 864e5) / 14;   // per 48 hours
  return { recent, usual };
}

/**
 * 0–100 from last night and how you feel, nudged by recent training load.
 * Returns null until you check in.
 */
export function readiness(k = ymd()) {
  const r = recoveryOn(k);
  if (!r) return null;
  const sleepPart = r.sleep != null ? Math.min(1, r.sleep / sleepGoal()) * 35 : 22;
  const q = ((r.quality || 3) - 1) / 4, e = ((r.energy || 3) - 1) / 4, sore = ((r.sore || 2) - 1) / 4;
  let score = sleepPart + q * 20 + e * 25 + (1 - sore) * 20;
  const { recent, usual } = load(new Date(k + 'T12:00').getTime());
  if (usual > 3 && recent > usual * 1.6) score -= 8;   // a much bigger couple of days than usual
  score = Math.round(Math.max(0, Math.min(100, score)));
  const advice = score >= 80 ? { word: 'Ready to push', sub: 'Good day for a hard session or a heavier top set.' }
    : score >= 60 ? { word: 'Train as planned', sub: 'Nothing holding you back. Stick to your plan.' }
      : score >= 40 ? { word: 'Go a bit lighter', sub: 'Train, but drop a set or keep a couple of reps in reserve.' }
        : { word: 'Take it easy', sub: 'A walk, mobility or a full rest day will do more for you today.' };
  return { score, ...advice };
}

/** Muscles trained in the last 72 hours, freshest last. */
function recovering() {
  const now = Date.now(), out = [];
  for (const m of MUSCLE_ORDER) {
    const w = state.workouts.find((x) => now - x.start < 72 * 36e5 && x.exercises.some((e) => {
      const t = tally([{ exId: e.exId, sets: e.sets.filter((s) => s.done && s.type !== 'w').length }]);
      return t[m]?.direct > 0;
    }));
    if (w) out.push({ m, hrs: Math.round((now - w.start) / 36e5) });
  }
  return out.sort((a, b) => a.hrs - b.hrs);
}

// ---------- Check-in ----------

export function checkIn(k = ymd(), after) {
  const r = { sleep: null, quality: null, sore: null, energy: null, ...(recoveryOn(k) || {}) };
  const body = h('div');
  const sleepIn = h('input.field.goal-input', { value: r.sleep ?? '', inputmode: 'decimal', placeholder: String(sleepGoal()), 'aria-label': 'Hours slept' });
  sleepIn.addEventListener('input', () => { const v = parseFloat(sleepIn.value.replace(',', '.')); r.sleep = v > 0 && v < 24 ? v : null; });
  const draw = () => fill(body,
    h('div.group', h('label.goal-row', h('span', 'Hours slept'), h('span.goal-field', sleepIn, h('span.goal-unit', 'h')))),
    h('div.chips.tight.no-drag', [5, 6, 6.5, 7, 7.5, 8, 8.5, 9].map((v) => h('button.chip' + (r.sleep === v ? '.on' : ''), { onclick: () => { r.sleep = v; sleepIn.value = v; draw(); } }, `${v} h`))),
    Object.entries(SCALES).map(([key, sc]) => [
      h('label.form-label', sc.label),
      h('div.face-row', sc.words.map((wd, i) => h('button.face' + (r[key] === i + 1 ? '.on' : ''), { onclick: () => { r[key] = i + 1; draw(); }, 'aria-label': wd }, h('span.face-num', i + 1), h('span.face-word', wd)))),
    ]));
  draw();
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', k === ymd() ? 'Morning check-in' : fmtDate(new Date(k + 'T12:00').getTime())), h('button.link.strong', { onclick: save }, 'Save')),
    body));
  function save() {
    if (r.sleep == null && !r.quality && !r.sore && !r.energy) { toast('Fill in at least one'); return; }
    commit((st) => { st.recovery = { ...(st.recovery || {}), [k]: { ...r } }; });
    s.close();
    const rd = readiness(k);
    toast(rd ? `Readiness ${rd.score}: ${rd.word}` : 'Saved');
    after?.();
  }
}

// ---------- Sleep from Apple Health (pasted) ----------

/** Lines like "2026-11-17 7h 32m", "Nov 17, 2026 7.5 hours" or "2026-11-17, 452 min". */
export function parseSleep(text) {
  const out = [];
  for (const raw of text.split(/\n+/)) {
    const line = raw.trim();
    const d = line && findDate(line);
    if (!d) continue;
    const rest = line.replace(d.match, ' ');
    let hrs = null, m;
    if ((m = rest.match(/(\d+(?:[.,]\d+)?)\s*h(?:ours?|rs?)?\s*(?:(\d+)\s*m(?:in)?)?/i))) hrs = parseFloat(m[1].replace(',', '.')) + (m[2] ? +m[2] / 60 : 0);
    else if ((m = rest.match(/\b(\d{1,2}):(\d{2})\b/))) hrs = +m[1] + +m[2] / 60;
    else if ((m = rest.match(/(\d{2,4})\s*min/i))) hrs = +m[1] / 60;
    if (hrs > 0 && hrs < 20) out.push({ k: ymd(d.ts), sleep: Math.round(hrs * 10) / 10 });
  }
  return out;
}

function importSheet(after) {
  const ta = h('textarea.field.paste', { rows: 6, placeholder: '2026-11-17 7h 32m\n2026-11-16 6h 50m' });
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', 'Bring in sleep'), h('button.link.strong', { onclick: go }, 'Add')),
    h('p.fine', 'One night per line: the date you woke up and hours slept. A Shortcut can copy this from Apple Health (Sleep Analysis).'),
    ta));
  function go() {
    const list = parseSleep(ta.value);
    if (!list.length) { toast('No nights found. Each line needs a date and hours.'); return; }
    commit((st) => { st.recovery = st.recovery || {}; for (const x of list) st.recovery[x.k] = { ...(st.recovery[x.k] || {}), sleep: x.sleep }; });
    s.close(); toast(`Added ${list.length} night${list.length === 1 ? '' : 's'}`); after?.();
  }
}

// ---------- The tab ----------

export function recoveryPage() {
  const el = h('div.page');
  const body = h('div.scroll-body');
  function draw() {
    const today = ymd(), r = recoveryOn(today), rd = readiness(today);
    const nights = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13)).map((k) => ({ x: new Date(k + 'T12:00').getTime(), y: recoveryOn(k)?.sleep || 0 }));
    const week = Array.from({ length: 7 }, (_, i) => recoveryOn(addDays(today, -i))).filter(Boolean);
    const avg = (f) => { const v = week.map(f).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    const sleepAvg = avg((x) => x.sleep);
    const { recent, usual } = load();
    const rec = recovering();
    fill(body,
      navBar({ title: 'Recovery', back: false, large: true, right: [goalsButton('recovery')] }),
      wipBanner('Recovery'),
      rd ? h('section.card.ready-card.' + (rd.score >= 60 ? 'good' : rd.score >= 40 ? 'mid' : 'low'),
        h('div.ready-ring', { style: { '--p': rd.score } }, h('b', rd.score), h('span', 'ready')),
        h('div.ready-text', h('div.ready-word', rd.word), h('div.ready-sub', rd.sub),
          h('div.ready-bits', [r.sleep != null ? `${r.sleep} h sleep` : null, r.quality ? `slept ${SCALES.quality.words[r.quality - 1].toLowerCase()}` : null, r.sore ? `sore ${SCALES.sore.words[r.sore - 1].toLowerCase()}` : null, r.energy ? `energy ${SCALES.energy.words[r.energy - 1].toLowerCase()}` : null].filter(Boolean).join(' · ')),
          h('button.link.small-link', { onclick: () => checkIn(today, draw) }, 'Change')))
        : h('button.card.hero.empty-hero', { onclick: () => checkIn(today, draw) },
          h('div.hero-label', 'Good morning'),
          h('div.hero-name', 'How did you sleep?'),
          h('div.hero-meta', 'Four quick taps tell Carver whether to push, train as planned or take it easy.'),
          h('span.btn.gold.wide.hero-go', 'Check in')),

      h('div.section-head', h('h2.section-title', 'Sleep'), h('span.section-count', sleepAvg != null ? `${sleepAvg.toFixed(1)} h avg · goal ${sleepGoal()} h` : `goal ${sleepGoal()} h`)),
      h('section.card.chart-card', barChart(nights, {
        height: 140, color: COLORS.gold, goal: sleepGoal(), fmtX: (t) => fmtDate(t, { weekday: 'narrow' }), fmtY: (v) => `${v}`,
        label: 'Hours slept, last 14 nights', empty: 'Check in each morning, or bring in sleep from Apple Health.',
        tip: (p) => `<b>${p.y} h</b><span>${fmtDate(p.x, { weekday: 'short', month: 'short', day: 'numeric' })}</span>`,
      })),
      h('div.btn-pair',
        h('button.btn.dark', { onclick: () => importSheet(draw) }, 'Bring in sleep'),
        h('button.btn.dark', { onclick: () => checkIn(addDays(today, -1), draw) }, 'Log yesterday')),

      h('div.section-head', h('h2.section-title', 'Training load')),
      h('section.card.list-card',
        h('div.group-row', h('span', 'Sets in the last 2 days'), h('span.row-val', `${recent}${usual ? ` · usual ${Math.round(usual)}` : ''}`)),
        rec.length ? rec.map((x) => h('div.group-row', h('span', `${x.m}`), h('span.row-val', x.hrs < 48 ? `recovering · ${x.hrs < 24 ? `${x.hrs} h` : `${Math.round(x.hrs / 24)} day`} ago` : `mostly fresh · ${Math.round(x.hrs / 24)} days ago`)))
          : h('div.group-row', h('span', 'No muscles trained in the last 3 days'), h('span.row-val', 'all fresh'))),
      h('p.fine', 'A guide, not a medical score.'),
      h('div.bottom-space'),
    );
  }
  draw();
  el.append(body);
  return { el, refresh: draw };
}
