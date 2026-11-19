// Daily goals ("habits"): things you either did today or didn't, like "50 pushups".
// Each one is a slider on Home: slide it across when it's done. Your groups hear
// right away when you finish one, and at 8 am the next day if you missed one
// (the server posts misses, so it works even when the app is closed).
//
// Stored in goals.custom as { id, name, since }. Older goals that had a number
// target ({ target, unit }) count as done once that amount was logged.

import { h, fill, icon, actionSheet, navBar, sheet, toast, promptBox, confirmBox, fmtDate } from './ui.js';
import { state, commit, ymd, addDays, uid } from './store.js';
import { goalsButton } from './goals.js';

export const MAX_HABITS = 10;
export const habits = () => state.goals.custom || [];
const need = (g) => g.target || 1;

/** The first day a daily goal counts: when you added it, or when you joined Carver if that's later. */
export const habitStart = (g) => { const j = ymd(state.profile.joined || Date.now()); return g.since && g.since > j ? g.since : j; };

export const isDone = (g, date = ymd()) => (state.checks[date]?.[g.id] || 0) >= need(g);

export function setDone(g, date, done) {
  commit((s) => {
    s.checks[date] = { ...(s.checks[date] || {}), [g.id]: done ? need(g) : 0 };
  });
  if (!done) import('./groups.js').then((m) => m.unpublish('h:' + g.id + ':' + date)).catch(() => {});
}

/** A slide-to-complete control. Done: shows the check; tap it to undo. */
export function habitSlider(g, date = ymd(), { tag } = {}) {
  const done = isDone(g, date);
  const knob = h('span.slide-knob', icon(done ? 'check' : 'back', 22));
  const fillBar = h('span.slide-fill');
  const label = h('span.slide-label', h('b', g.name), tag ? h('span.slide-tag', tag) : null, h('span.slide-hint', done ? 'Done' : 'Slide when done'));
  const el = h('div.slide.no-swipe' + (done ? '.done' : ''), { role: 'button', 'aria-label': done ? `${g.name}: done. Tap to undo.` : `${g.name}: slide to mark done`, tabindex: 0 }, fillBar, label, knob);

  if (done) {
    el.onclick = () => actionSheet(g.name, [{ label: 'Mark as not done', danger: true, onClick: () => setDone(g, date, false) }]);
    return el;
  }
  // Keyboard and screen readers: Enter marks it done
  el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); finish(); } };
  let x0 = null, max = 0, x = 0;
  const place = (v) => { x = Math.max(0, Math.min(max, v)); knob.style.transform = `translateX(${x}px)`; fillBar.style.width = `${x + 52}px`; label.style.opacity = String(1 - (x / max) * 0.8); };
  knob.addEventListener('pointerdown', (e) => {
    max = el.clientWidth - knob.offsetWidth - 8;
    x0 = e.clientX - x;
    try { knob.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    el.classList.add('dragging');
  });
  knob.addEventListener('pointermove', (e) => { if (x0 != null) place(e.clientX - x0); });
  const release = () => {
    if (x0 == null) return;
    x0 = null;
    el.classList.remove('dragging');
    if (x > max * 0.8) finish();
    else place(0);
  };
  knob.addEventListener('pointerup', release);
  knob.addEventListener('pointercancel', release);
  function finish() {
    max = max || el.clientWidth - knob.offsetWidth - 8;
    place(max);
    el.classList.add('done');
    navigator.vibrate?.(20);
    setTimeout(() => setDone(g, date, true), 180);   // let the knob land before Home redraws
  }
  return el;
}

/** The Daily goals card on Home: today's sliders, plus yesterday's unfinished ones until 8 am. */
export function habitsCard(onEdit) {
  const list = habits();
  if (!list.length) return null;
  const today = ymd(), yesterday = addDays(today, -1);
  const early = new Date().getHours() < 8;
  const late = early ? list.filter((g) => habitStart(g) <= yesterday && !isDone(g, yesterday)) : [];
  const box = h('div');
  fill(box,
    h('div.section-head', h('h2.section-title', 'Daily goals'), h('button.link.small', { onclick: onEdit }, 'Edit')),
    h('section.card.habits',
      late.map((g) => habitSlider(g, yesterday, { tag: 'yesterday' })),
      list.map((g) => habitSlider(g, today))),
    late.length ? h('p.fine', 'Finish yesterday’s before 8 am, or your groups see it as missed.') : null,
  );
  return box;
}

// ---------- Streaks and history ----------

/** Days in a row done, up to today (today not done yet doesn't break it). */
export function streak(g, today = ymd()) {
  let n = 0, k = isDone(g, today) ? today : addDays(today, -1);
  while (isDone(g, k) && k >= habitStart(g)) { n++; k = addDays(k, -1); }
  return n;
}
/** The longest run ever. */
export function bestStreak(g) {
  const days = Object.keys(state.checks).filter((k) => k >= habitStart(g) && isDone(g, k)).sort();
  let best = 0, run = 0, prev = null;
  for (const k of days) { run = prev && addDays(prev, 1) === k ? run + 1 : 1; best = Math.max(best, run); prev = k; }
  return best;
}
/** Share of the last `n` days done (only counting days since it started counting). */
export function rate(g, n = 30) {
  let of = 0, done = 0;
  for (let i = 0; i < n; i++) {
    const k = addDays(ymd(), -i);
    if (k < habitStart(g)) break;
    of++; if (isDone(g, k)) done++;
  }
  return of ? done / of : 0;
}

/** Twelve weeks of squares, Monday at the top. Tap a past day to mark it done or not. */
function heatMap(g, redraw) {
  const today = ymd();
  const dow = (new Date(today + 'T12:00').getDay() + 6) % 7;
  const start = addDays(today, -(7 * 11 + dow));
  const cols = [];
  for (let w = 0; w < 12; w++) {
    cols.push(h('div.hm-col', Array.from({ length: 7 }, (_, d) => {
      const k = addDays(start, w * 7 + d);
      if (k > today || k < habitStart(g)) return h('i.hm-cell.future');   // before it started counting: not a miss
      return h('button.hm-cell' + (isDone(g, k) ? '.on' : '') + (k === today ? '.today' : ''), {
        'aria-label': `${fmtDate(new Date(k + 'T12:00').getTime(), { weekday: 'short', month: 'short', day: 'numeric' })}: ${isDone(g, k) ? 'done' : 'not done'}`,
        onclick: () => { setDone(g, k, !isDone(g, k)); redraw(); },
      });
    })));
  }
  return h('div.hm', h('div.hm-days', ['M', '', 'W', '', 'F', '', 'S'].map((d) => h('span', d))), h('div.hm-grid', cols));
}

const hourLabel = (hr) => new Date(2000, 0, 1, hr).toLocaleTimeString([], { hour: 'numeric' });

function editHabit(g, redraw) {
  actionSheet(g.name, [
    { label: 'Rename', onClick: async () => { const n = (await promptBox('Rename', g.name))?.trim(); if (n) { commit((s) => { const x = s.goals.custom.find((y) => y.id === g.id); if (x) x.name = n.slice(0, 40); }); redraw(); } } },
    { label: g.remind != null ? `Reminder: ${hourLabel(g.remind)}` : 'Add a reminder', onClick: () => reminderSheet(g, redraw) },
    { label: 'Delete', danger: true, onClick: async () => {
      if (!(await confirmBox(`Delete “${g.name}”?`, 'Your groups stop hearing about it. Past days stay in your history.', { ok: 'Delete', danger: true }))) return;
      commit((s) => { s.goals.custom = s.goals.custom.filter((x) => x.id !== g.id); });
      redraw();
    } },
  ]);
}

function reminderSheet(g, redraw) {
  const hours = [6, 7, 8, 9, 12, 15, 17, 18, 19, 20, 21, 22];
  const set = (hr) => {
    commit((s) => { const x = s.goals.custom.find((y) => y.id === g.id); if (x) { if (hr == null) delete x.remind; else x.remind = hr; } });
    s0.close(); redraw();
    toast(hr == null ? 'Reminder off' : `Reminder at ${hourLabel(hr)} if it’s not done`);
  };
  const s0 = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s0.close() }, 'Cancel'), h('div.sheet-title', 'Reminder'), h('span')),
    h('p.fine', `A notification at this time if “${g.name}” isn’t done yet. Needs an account with notifications on.`),
    h('div.hour-grid', hours.map((hr) => h('button.chip' + (g.remind === hr ? '.on' : ''), { onclick: () => set(hr) }, hourLabel(hr)))),
    g.remind != null ? h('button.btn.dark.wide', { onclick: () => set(null) }, 'No reminder') : null));
}

async function addHabit(redraw) {
  if (habits().length >= MAX_HABITS) { toast(`You can have ${MAX_HABITS} daily goals`); return; }
  const name = (await promptBox('New daily goal', '', { placeholder: 'e.g. 50 pushups, Read 10 pages' }))?.trim();
  if (!name) return;
  commit((s) => { s.goals.custom.push({ id: uid(), name: name.slice(0, 40), since: ymd() }); });
  redraw();
}

// ---------- The Habits tab ----------

export function habitsPage() {
  const el = h('div.page');
  const body = h('div.scroll-body');
  function draw() {
    const list = habits(), today = ymd();
    const doneToday = list.filter((g) => isDone(g, today)).length;
    fill(body,
      navBar({ title: 'Habits', back: false, large: true, right: [goalsButton('daily'), h('button.icon-btn.gold-text', { onclick: () => addHabit(draw), 'aria-label': 'Add a daily goal' }, icon('plus', 24))] }),
      list.length ? [
        h('section.card.habit-sum',
          h('div', h('div.energy-v', `${doneToday}/${list.length}`), h('div.energy-k', 'done today')),
          h('div.habit-sum-best', h('div.energy-v', `${Math.max(0, ...list.map((g) => streak(g)))}`), h('div.energy-k', 'longest streak going'))),
        h('section.card.habits', list.map((g) => habitSlider(g, today))),
        h('div.section-head', h('h2.section-title', 'Streaks')),
        list.map((g) => {
          const cur = streak(g), best = bestStreak(g), pct = Math.round(rate(g) * 100);
          return h('section.card.habit-card',
            h('div.habit-top',
              h('div', h('div.habit-name', g.name), h('div.habit-meta', [`${cur}-day streak`, `best ${best}`, `${pct}% last 30 days`, g.remind != null ? `reminder ${hourLabel(g.remind)}` : null].filter(Boolean).join(' · '))),
              h('button.icon-btn', { onclick: () => editHabit(g, draw), 'aria-label': `${g.name} options` }, icon('more'))),
            heatMap(g, draw));
        }),
        h('p.fine', 'Tap a square to fix a day.'),
        list.length < MAX_HABITS ? h('button.btn.dark.wide', { onclick: () => addHabit(draw) }, icon('plus', 16), 'Add a daily goal') : null,
      ] : h('div.empty',
        h('div.empty-icon', icon('check', 40)),
        h('div.empty-title', 'Build a habit'),
        h('div.empty-text', 'Things you do each day or don’t, like 50 pushups or reading 10 pages. Slide one across when it’s done.'),
        h('button.btn.gold.wide', { onclick: () => addHabit(draw) }, 'Add your first daily goal')),
      h('div.bottom-space'),
    );
  }
  draw();
  el.append(body);
  return { el, refresh: draw };
}
