// Daily goals ("habits"): things you either did today or didn't, like "50 pushups".
// Each one is a slider on Home: slide it across when it's done. Your groups hear
// right away when you finish one, and at 8 am the next day if you missed one
// (the server posts misses, so it works even when the app is closed).
//
// Stored in goals.custom as { id, name, since }. Older goals that had a number
// target ({ target, unit }) count as done once that amount was logged.

import { h, fill, icon, actionSheet } from './ui.js';
import { state, commit, ymd, addDays } from './store.js';

export const MAX_HABITS = 6;
export const habits = () => state.goals.custom || [];
const need = (g) => g.target || 1;

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
    knob.setPointerCapture(e.pointerId);
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
  const late = early ? list.filter((g) => (g.since || '') <= yesterday && !isDone(g, yesterday)) : [];
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
