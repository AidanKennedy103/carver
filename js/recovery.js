// Sleep & Recovery: a quick morning check-in (sleep, how well, soreness,
// energy) turns into a readiness score with a plain suggestion for the day.
// It also looks at how hard you trained in the last two days and which muscles
// are still recovering.
//
// Stored in state.recovery = { 'YYYY-MM-DD': { sleep (hours), quality, sore, energy (1–5) } }.
// Sleep belongs to the morning you woke up.

import { h, fill, sheet, toast, navBar, fmtDate } from './ui.js';
import { state, commit, ymd, addDays } from './store.js';
import { barChart, COLORS } from './charts.js';
import { tally, MUSCLE_ORDER } from './volume.js';
import { findDate } from './body.js';
import { goalsButton } from './goals.js';
import { healthDay, hasHealth, importHealth } from './health.js';
import { activityType } from './fitness.js';
import { feelPicker, EFFORT } from './session.js';

export const sleepGoal = () => state.goals.sleep || 8;
export const recoveryOn = (k = ymd()) => state.recovery?.[k] || null;
/** The last workout in the 36 hours before the morning of `k` (for "still tired from it?"). */
export function lastWorkoutBefore(k) {
  const morning = new Date(k + 'T09:00').getTime();
  return state.workouts.find((w) => w.start < morning && w.start > morning - 36 * 36e5) || null;
}
/** Hours slept: what you entered, else what Apple Health (Watch, Oura, Ultrahuman…) recorded. */
export const sleepOn = (k = ymd()) => recoveryOn(k)?.sleep ?? healthDay(k)?.sleep ?? null;

/** Resting heart rate and HRV today against your 30-day average. */
export function bodySignals(k = ymd()) {
  const d = healthDay(k);
  if (!d || (d.rhr == null && d.hrv == null)) return null;
  const base = (key) => { const v = Array.from({ length: 30 }, (_, i) => healthDay(addDays(k, -i - 1))?.[key]).filter((x) => x != null); return v.length >= 5 ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  return { rhr: d.rhr ?? null, rhrBase: base('rhr'), hrv: d.hrv ?? null, hrvBase: base('hrv'), deep: d.deep ?? null, rem: d.rem ?? null };
}

const SCALES = {
  quality: { label: 'How did you sleep?', words: ['Awful', 'Poor', 'OK', 'Good', 'Great'] },
  sore: { label: 'How sore are you?', words: ['Not at all', 'A little', 'Some', 'Quite', 'Very'] },
  energy: { label: 'Energy right now', words: ['Drained', 'Low', 'OK', 'Good', 'Great'] },
};

/** Working sets in the 48 hours before `ts`, and the usual for 48 hours over the last 4 weeks. */
function load(ts = Date.now()) {
  const sets = (from, to) => state.workouts.filter((w) => w.start >= from && w.start < to)
    .reduce((n, w) => n + w.exercises.reduce((m, e) => m + e.sets.filter((x) => x.done && x.type !== 'w').length, 0), 0);
  // Cardio as set-equivalents: 10 minutes of a run (about 10 METs) counts like 3 hard sets
  const cardio = (from, to) => state.activities.filter((a) => a.start >= from && a.start < to)
    .reduce((n, a) => n + (a.dur / 6e5) * (activityType(a.type).met / 10) * 3, 0);
  const mins = (from, to) => state.activities.filter((a) => a.start >= from && a.start < to).reduce((n, a) => n + a.dur / 6e4, 0);
  const recent = sets(ts - 2 * 864e5, ts) + cardio(ts - 2 * 864e5, ts);
  const usual = (sets(ts - 30 * 864e5, ts - 2 * 864e5) + cardio(ts - 30 * 864e5, ts - 2 * 864e5)) / 14;   // per 48 hours
  return { recent: Math.round(recent), usual, sets: sets(ts - 2 * 864e5, ts), cardioMins: Math.round(mins(ts - 2 * 864e5, ts)) };
}

/**
 * 0–100 from last night and how you feel, nudged by recent training load.
 * Returns null until you check in.
 */
export function readiness(k = ymd()) {
  const r = recoveryOn(k) || {};
  const sleep = sleepOn(k), sig = bodySignals(k);
  if (!recoveryOn(k) && sleep == null && !sig) return null;
  const sleepPart = sleep != null ? Math.min(1, sleep / sleepGoal()) * 35 : 22;
  const q = ((r.quality || 3) - 1) / 4, e = ((r.energy || 3) - 1) / 4, sore = ((r.sore || 2) - 1) / 4;
  let score = sleepPart + q * 20 + e * 25 + (1 - sore) * 20;
  // Heart data: HRV well under your normal, or resting heart rate up, means you're less recovered
  if (sig?.hrv && sig.hrvBase) { const ratio = sig.hrv / sig.hrvBase; score += ratio < 0.8 ? -12 : ratio < 0.9 ? -6 : ratio > 1.1 ? 4 : 0; }
  if (sig?.rhr && sig.rhrBase) { const up = sig.rhr - sig.rhrBase; score += up >= 5 ? -10 : up >= 3 ? -5 : up <= -2 ? 3 : 0; }
  // Still tired from the last workout, or it felt like too much
  if (r.fatigue) score += r.fatigue === 3 ? -10 : r.fatigue === 2 ? -4 : 2;
  const lw = lastWorkoutBefore(k);
  if (lw?.feel?.effort === 3) score -= 4;
  if (lw?.feel?.joints === 2) score -= 6;
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
  const fromHealth = healthDay(k)?.sleep ?? null;
  const fresh = !recoveryOn(k);
  const lw = lastWorkoutBefore(k);
  const body = h('div');
  const draw = () => fill(body,
    h('p.fine.checkin-lead', fresh ? 'A few taps. It saves itself after the last one.' : 'Change any answer.'),
    Object.entries(SCALES).map(([key, sc]) => [
      h('label.form-label', sc.label),
      h('div.face-row', sc.words.map((wd, i) => h('button.face' + (r[key] === i + 1 ? '.on' : ''), {
        onclick: () => { r[key] = i + 1; draw(); if (fresh && r.quality && r.sore && r.energy && (!lw || r.fatigue)) setTimeout(save, 250); }, 'aria-label': wd,
      }, h('span.face-num', i + 1), h('span.face-word', wd)))),
    ]),
    lw ? [h('label.form-label', `Still tired from ${lw.name || 'your last workout'}?`),
      h('div.segment.feel-seg', ['Fresh', 'A little', 'Very'].map((l, i) => h('button' + (r.fatigue === i + 1 ? '.on' : ''), {
        onclick: () => { r.fatigue = i + 1; draw(); if (fresh && r.quality && r.sore && r.energy) setTimeout(save, 250); },
      }, l)))] : null,
    h('label.form-label', fromHealth != null ? `Hours slept · ${fromHealth} h from Apple Health` : 'Hours slept (optional)'),
    h('div.chips.tight.no-drag', [5, 6, 6.5, 7, 7.5, 8, 8.5, 9].map((v) => h('button.chip' + (r.sleep === v ? '.on' : ''), { onclick: () => { r.sleep = r.sleep === v ? null : v; draw(); } }, `${v} h`))));
  draw();
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', k === ymd() ? 'How are you today?' : fmtDate(new Date(k + 'T12:00').getTime())), h('button.link.strong', { onclick: save }, 'Save')),
    body));
  let saved = false;
  function save() {
    if (saved) return;
    if (r.sleep == null && !r.quality && !r.sore && !r.energy) { toast('Fill in at least one'); return; }
    saved = true;
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

/** How your workouts have felt: rate the latest if you haven't, and what the last two weeks say. */
function feelSection(redraw) {
  const recent = state.workouts.filter((w) => w.start > Date.now() - 14 * 864e5 && !w.past);
  if (!recent.length) return null;
  const latest = recent[0];
  const rated = recent.filter((w) => w.feel?.effort);
  const n = (v) => rated.filter((w) => w.feel.effort === v).length;
  const sore = recent.filter((w) => w.feel?.joints >= 1).length;
  const advice = n(3) >= 2 && n(3) >= n(1) + n(2) / 2 ? 'Several sessions felt like too much. Drop a set per exercise or take a lighter week.'
    : n(1) >= 3 && n(3) === 0 ? 'Workouts have felt easy. Add a set or a little weight where you can.'
      : sore >= 2 ? 'Your joints have been achy. Swap the moves that bother you or lighten them for a week.'
        : rated.length ? 'Training feels about right. Keep going.' : null;
  return [
    h('div.section-head', h('h2.section-title', 'How workouts felt'), rated.length ? h('span.section-count', `last 2 weeks`) : null),
    h('section.card.feel-card',
      latest.feel?.effort == null || (latest.feel?.joints == null && Date.now() - latest.start < 36 * 36e5) ? [h('div.feel-latest', h('b', latest.name || 'Your last workout'), h('span', ` · ${fmtDate(latest.start, { weekday: 'short' })}`)), feelPicker(latest, redraw)] : null,
      rated.length ? h('div.feel-tally', EFFORT.map((l, i) => h('span.feel-chip' + (i === 2 && n(3) ? '.hot' : ''), h('b', n(i + 1)), ` ${l.toLowerCase()}`))) : null,
      advice ? h('p.feel-advice', advice) : null),
  ];
}

const signal = (label, value, sub, tone) => h('div.signal' + (tone ? '.' + tone : ''), h('span.signal-v', value), h('span.signal-k', label), sub ? h('span.signal-sub', sub) : null);

export function recoveryPage() {
  const el = h('div.page');
  const body = h('div.scroll-body');
  function draw() {
    const today = ymd(), r = recoveryOn(today), rd = readiness(today);
    const nights = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13)).map((k) => ({ x: new Date(k + 'T12:00').getTime(), y: sleepOn(k) || 0 }));
    const wk = Array.from({ length: 7 }, (_, i) => sleepOn(addDays(today, -i))).filter((x) => x != null);
    const sleepAvg = wk.length ? wk.reduce((a, b) => a + b, 0) / wk.length : null;
    const { recent, usual, sets, cardioMins } = load();
    const sig = bodySignals(today);
    const rec = recovering();
    fill(body,
      navBar({ title: 'Recovery', back: false, large: true, wip: true, right: [goalsButton('recovery')] }),
      rd ? h('section.card.ready-card.' + (rd.score >= 60 ? 'good' : rd.score >= 40 ? 'mid' : 'low'),
        h('div.ready-ring', { style: { '--p': rd.score } }, h('b', rd.score), h('span', 'ready')),
        h('div.ready-text', h('div.ready-word', rd.word), h('div.ready-sub', rd.sub),
          h('div.ready-bits', [sleepOn(today) != null ? `${sleepOn(today)} h sleep` : null, sig?.hrv ? `HRV ${sig.hrv}` : null, r?.quality ? `slept ${SCALES.quality.words[r.quality - 1].toLowerCase()}` : null, r?.sore ? `sore ${SCALES.sore.words[r.sore - 1].toLowerCase()}` : null, r?.energy ? `energy ${SCALES.energy.words[r.energy - 1].toLowerCase()}` : null].filter(Boolean).join(' · ')),
          h('button.link.small-link', { onclick: () => checkIn(today, draw) }, r ? 'Change' : 'Add how you feel')))
        : h('button.card.hero.empty-hero', { onclick: () => checkIn(today, draw) },
          h('div.hero-label', 'Good morning'),
          h('div.hero-name', 'How did you sleep?'),
          h('div.hero-meta', 'Three taps tell Carver whether to push, train as planned or take it easy.'),
          h('span.btn.gold.wide.hero-go', 'Check in')),

      h('div.section-head', h('h2.section-title', 'Sleep'), h('span.section-count', sleepAvg != null ? `${sleepAvg.toFixed(1)} h avg · goal ${sleepGoal()} h` : `goal ${sleepGoal()} h`)),
      h('section.card.chart-card', barChart(nights, {
        height: 140, color: COLORS.gold, goal: sleepGoal(), fmtX: (t) => fmtDate(t, { weekday: 'narrow' }), fmtY: (v) => `${v}`,
        label: 'Hours slept, last 14 nights', empty: 'Check in each morning, or bring in sleep from Apple Health.',
        tip: (p) => `<b>${p.y} h</b><span>${fmtDate(p.x, { weekday: 'short', month: 'short', day: 'numeric' })}</span>`,
      })),
      h('div.btn-pair',
        h('button.btn.dark', { onclick: () => import('./healthsync.js').then((m) => m.openHealthSync()) }, state.health?.auto ? 'Health sync' : 'Sync with Health'),
        h('button.btn.dark', { onclick: () => importSheet(draw) }, 'Paste sleep')),
      h('p.fine', 'Apple Watch, Oura, Ultrahuman and Whoop all write sleep and heart data to Apple Health.'),

      sig ? [
        h('div.section-head', h('h2.section-title', 'Body signals')),
        h('section.card.signal-grid',
          sig.hrv != null ? signal('HRV', `${sig.hrv} ms`, sig.hrvBase ? `normal ${Math.round(sig.hrvBase)}` : null, sig.hrvBase ? (sig.hrv / sig.hrvBase < 0.9 ? 'low' : sig.hrv / sig.hrvBase > 1.05 ? 'good' : '') : '') : null,
          sig.rhr != null ? signal('Resting HR', `${sig.rhr} bpm`, sig.rhrBase ? `normal ${Math.round(sig.rhrBase)}` : null, sig.rhrBase ? (sig.rhr - sig.rhrBase >= 3 ? 'low' : sig.rhr < sig.rhrBase - 1 ? 'good' : '') : '') : null,
          sig.deep != null ? signal('Deep sleep', `${sig.deep} h`, null, '') : null,
          sig.rem != null ? signal('REM', `${sig.rem} h`, null, '') : null),
      ] : null,

      feelSection(draw),

      h('div.section-head', h('h2.section-title', 'Training load')),
      h('section.card.list-card',
        h('div.group-row', h('span', 'Last 2 days'), h('span.row-val', `${sets} sets${cardioMins ? ` + ${cardioMins} min cardio` : ''}`)),
        h('div.group-row', h('span', 'Load'), h('span.row-val' + (usual > 3 && recent > usual * 1.6 ? '.red-text' : ''), `${recent}${usual ? ` · usual ${Math.round(usual)}` : ''}`)),
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
