// Home: today first (rings, workouts, food, weigh-in), then your week on the
// calendar, your one-rep maxes, and your profile overview.

import { h, fill, icon, push, promptBox, fmtDate, fmtNum, fmtDurationWords } from './ui.js';
import { state, commit, exercise, overview, toDisplay, unit, ymd, dayTotals, weekStart, workoutStats } from './store.js';
import { workoutDetail } from './workout.js';
import { openSettings } from './settings.js';
import { goTab } from './tabs.js';
import { oneRmSection } from './onerm.js';
import { rings, COLORS } from './charts.js';
import { openGoals, logCustom, customAmount } from './goals.js';
import { quickAdd } from './nutrition.js';
import { logWeightSheet } from './body.js';
import { takeProgressPhoto } from './fitness.js';
import { monthlyPrompts } from './monthly.js';

function greeting() {
  const hr = new Date().getHours();
  return hr < 5 ? 'Late night' : hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
}

export async function editName() {
  const n = await promptBox('Your name', state.profile.name, { placeholder: 'First name' });
  if (n != null) commit((s) => { s.profile.name = n; });
}

function short(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e4) return Math.round(n / 1e3) + 'k';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  return fmtNum(n);
}
const fmtHours = (ms) => { const hrs = ms / 36e5; return hrs < 10 ? hrs.toFixed(1).replace(/\.0$/, '') : String(Math.round(hrs)); };

// ---------- Goals for today ----------

/** Every ring for today, and whether it's closed. Calories count as hit within ±10% of the goal. */
export function todayGoals() {
  const today = ymd();
  const t = dayTotals(today);
  const g = state.goals;
  const weekCount = state.workouts.filter((w) => w.start >= weekStart()).length;
  return [
    { id: 'gym', label: 'Gym', value: weekCount, goal: g.workoutsPerWeek, color: COLORS.gym, text: `${weekCount} of ${g.workoutsPerWeek} this week`, hit: weekCount >= g.workoutsPerWeek, cheer: 'Weekly gym goal hit!' },
    { id: 'kcal', label: 'Calories', value: t.kcal, goal: g.kcal, color: COLORS.calories, text: `${fmtNum(t.kcal)} of ${fmtNum(g.kcal)} kcal`, hit: t.kcal >= g.kcal * 0.9 && t.kcal <= g.kcal * 1.1, over: t.kcal > g.kcal * 1.1, cheer: 'Hit your calorie goal!' },
    { id: 'protein', label: 'Protein', value: t.p, goal: g.p, color: COLORS.protein, text: `${Math.round(t.p)} of ${g.p} g`, hit: t.p >= g.p, cheer: 'Hit your protein goal!' },
    ...g.custom.map((c) => {
      const v = customAmount(c.id, today);
      return { id: c.id, custom: c, label: c.name, value: v, goal: c.target, color: COLORS.custom, text: `${fmtNum(v)} of ${fmtNum(c.target)} ${c.unit}`, hit: v >= c.target, cheer: `${c.name} goal hit!` };
    }),
  ];
}

/** Celebrate each goal once, the first time Home sees it closed today. */
function celebrate(goals) {
  const today = ymd();
  const done = new Set(state.celebrated?.[today] || []);
  const fresh = goals.filter((g) => g.hit && !done.has(g.id));
  if (!fresh.length) return;
  commit((s) => { s.celebrated = { [today]: [...done, ...fresh.map((g) => g.id)] }; });
  const overlay = h('div.cheer', h('div.cheer-card',
    h('div.cheer-ring', rings(fresh.map((g) => ({ ...g, value: g.goal })), 96)),
    h('div.cheer-title', fresh.length === 1 ? fresh[0].cheer : `${fresh.length} goals closed!`),
    fresh.length > 1 ? h('div.cheer-sub', fresh.map((g) => g.label).join(' · ')) : null));
  overlay.addEventListener('click', () => overlay.remove());
  document.body.append(overlay);
  navigator.vibrate?.([30, 60, 30]);
  setTimeout(() => overlay.classList.add('out'), 2200);
  setTimeout(() => overlay.remove(), 2700);
}

// ---------- Calendar ----------

let calMonth = null;   // first of the month being shown

function calendar(redraw) {
  const now = new Date();
  if (!calMonth) calMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const m = new Date(calMonth);
  const year = m.getFullYear(), month = m.getMonth();
  const goal = state.goals.workoutsPerWeek;
  const byDay = new Map();
  for (const w of state.workouts) { const k = ymd(w.start); byDay.set(k, [...(byDay.get(k) || []), w]); }

  // Weeks start on Monday. A week turns gold when you hit your workouts-per-week goal.
  let cur = weekStart(new Date(year, month, 1).getTime());
  const end = new Date(year, month + 1, 1).getTime();
  const rows = [];
  while (cur < end) {
    const days = [];
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(cur); d.setDate(d.getDate() + i);
      const k = ymd(d.getTime());
      const ws = byDay.get(k) || [];
      count += ws.length;
      days.push({ d, k, ws, inMonth: d.getMonth() === month });
    }
    rows.push(h('div.cal-week' + (count >= goal ? '.gold' : ''), days.map((x) => h('button.cal-day' + (x.inMonth ? '' : '.out') + (x.ws.length ? '.did' : '') + (x.k === ymd() ? '.today' : ''), {
      'aria-label': `${fmtDate(x.d, { weekday: 'long', month: 'long', day: 'numeric' })}${x.ws.length ? `, ${x.ws.length} workout${x.ws.length > 1 ? 's' : ''}` : ''}`,
      onclick: () => { if (x.ws.length) push(() => workoutDetail(x.ws[0])); },
    }, h('span', x.d.getDate())))));
    const next = new Date(cur); next.setDate(next.getDate() + 7); cur = weekStart(next.getTime() + 36e5 * 3);
  }
  const thisWeek = state.workouts.filter((w) => w.start >= weekStart()).length;
  return h('section.card.cal',
    h('div.cal-head',
      h('button.icon-btn', { 'aria-label': 'Previous month', onclick: () => { calMonth = new Date(year, month - 1, 1).getTime(); redraw(); } }, icon('back', 20)),
      h('div.cal-title', m.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })),
      h('button.icon-btn.flip', { 'aria-label': 'Next month', onclick: () => { calMonth = new Date(year, month + 1, 1).getTime(); redraw(); } }, icon('back', 20))),
    h('div.cal-dow', ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => h('span', d))),
    rows,
    h('div.cal-foot',
      h('span', h('i.cal-key.did'), 'Workout'),
      h('span', h('i.cal-key.gold'), `Week with ${goal}+`),
      h('button.link', { onclick: openGoals }, `${thisWeek}/${goal} this week`)));
}

// ---------- The page ----------

export function homePage() {
  const el = h('div.page');
  const body = h('div.scroll-body');

  function draw() {
    const o = overview();
    const name = state.profile.name.trim();
    const first = state.workouts[state.workouts.length - 1];
    const since = Math.min(state.profile.joined || Date.now(), first?.start || Infinity);
    const today = ymd();
    const goals = todayGoals();
    const t = dayTotals(today);
    const todayWorkouts = state.workouts.filter((w) => ymd(w.start) === today);
    const todayWeigh = state.body.weights.filter((w) => ymd(w.ts) === today).pop();
    const prompts = monthlyPrompts({ takePhoto: takeProgressPhoto });
    const stat = (value, label, sub) => h('div.tile', h('div.tile-v', value), h('div.tile-k', label), sub ? h('div.tile-sub', sub) : null);

    fill(body,
      h('header.home-head',
        h('div.home-hello',
          h('div.home-date', fmtDate(Date.now(), { weekday: 'long', month: 'long', day: 'numeric' })),
          h('h1.home-title', name ? `${greeting()}, ${name}` : greeting())),
        h('button.icon-btn', { onclick: openSettings, 'aria-label': 'Settings' }, icon('gear'))),

      // Rings
      h('section.card.rings-card',
        h('div.rings-wrap', rings(goals, 132)),
        h('div.ring-legend', goals.map((g) => h(g.custom ? 'button.ring-row.tap' : 'div.ring-row', g.custom ? { onclick: () => logCustom(g.id, 1), 'aria-label': `Add 1 ${g.custom.unit} to ${g.label}` } : {},
          h('i.ring-dot', { style: { background: g.color } }),
          h('span.ring-text', h('span.ring-label', g.label, g.hit ? h('span.ring-check', ' ✓') : null), h('span.ring-val' + (g.over ? '.red-text' : ''), g.text)),
          g.custom ? h('span.ring-plus', '+1') : null))),
        h('button.rings-edit', { onclick: openGoals, 'aria-label': 'Edit goals' }, icon('edit', 16))),
      goals.filter((g) => g.hit && (g.id === 'protein' || g.id === 'kcal')).map((g) => h('div.hit-banner', h('span', '🏆'), g.cheer)),

      // Today
      h('div.section-head', h('h2.section-title', 'Today')),
      h('section.card.list-card.today',
        h('div.today-row',
          h('span.today-ico', icon('dumbbell', 20)),
          h('span.today-text',
            h('span.today-k', 'Workout'),
            h('span.today-v', todayWorkouts.length ? todayWorkouts.map((w) => `${w.name} · ${fmtDurationWords(workoutStats(w).duration)}`).join(', ') : state.active ? 'In progress' : 'Not yet')),
          todayWorkouts.length ? h('span.ring-check.big', '✓') : h('button.btn.gold-soft.small', { onclick: () => goTab('workout') }, state.active ? 'Resume' : 'Start')),
        h('div.today-row',
          h('span.today-ico', '🍽️'),
          h('span.today-text',
            h('span.today-k', 'Food'),
            h('span.today-v', t.entries ? `${fmtNum(t.kcal)} kcal · ${Math.round(t.p)} g protein` : 'Nothing logged')),
          h('button.btn.gold-soft.small', { onclick: () => quickAdd({}) }, 'Add')),
        h('div.today-row',
          h('span.today-ico', '⚖️'),
          h('span.today-text',
            h('span.today-k', 'Weigh-in'),
            h('span.today-v', todayWeigh ? `${toDisplay(todayWeigh.kg)} ${unit()}` : 'Not yet')),
          todayWeigh ? h('span.ring-check.big', '✓') : h('button.btn.gold-soft.small', { onclick: logWeightSheet }, 'Log'))),

      // Monthly nudges
      prompts.map((p) => h('button.card.prompt', { onclick: p.action },
        h('span.prompt-ico', p.icon), h('span.today-text', h('span.today-k.strong', p.text), h('span.today-v', p.sub)), h('span.prompt-go', icon('back', 16)))),

      // Calendar
      h('div.section-head', h('h2.section-title', 'Calendar')),
      calendar(draw),

      // One-rep max
      oneRmSection(),

      // Profile overview
      h('div.section-head', h('h2.section-title', 'Profile')),
      h('section.card.profile',
        h('button.avatar', { onclick: editName, 'aria-label': 'Edit your name' }, name ? name[0].toUpperCase() : icon('user', 26)),
        h('div.profile-text',
          name ? h('div.profile-name', name) : h('button.link', { onclick: editName }, 'Add your name'),
          h('div.profile-sub', `Carving since ${fmtDate(since, { month: 'long', year: 'numeric' })}`)),
        o.streak ? h('div.streak', h('span.streak-v', o.streak), h('span.streak-k', 'week streak')) : null),
      h('div.tiles',
        stat(o.total, 'Workouts', 'all time'),
        stat(`${short(+toDisplay(o.volume) || 0)}`, 'Lifted', `${unit()} total`),
        stat(o.prCount, 'Records', 'personal bests'),
        stat(fmtHours(o.time), 'Trained', 'hours total')),

      o.recentPRs.length ? h('div.section-head', h('h2.section-title', 'Recent records')) : null,
      o.recentPRs.length ? h('section.card.list-card', o.recentPRs.map((p) => h('div.pr-line',
        h('span.pr-icon', icon('trophy', 16)),
        h('span.pr-line-text', h('span.pr-line-name', exercise(p.exId).name), h('span.pr-line-kind', `${p.kind} · ${fmtDate(p.when, { month: 'short', day: 'numeric' })}`)),
        h('span.pr-line-val', p.kg != null ? `${toDisplay(p.kg)} ${unit()}` : `${p.reps} reps`)))) : null,
      h('div.bottom-space'),
    );
    celebrate(goals);
  }

  draw();
  el.append(body);
  return { el, refresh: draw };
}
