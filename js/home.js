// Home: today first (rings, workouts, food, weigh-in), then your week on the
// calendar, your one-rep maxes, and your profile overview.

import { h, fill, icon, push, sheet, toast, promptBox, fmtDate, fmtNum, fmtDurationWords, swipe } from './ui.js';
import { state, commit, exercise, overview, toDisplay, unit, bodyDisplay, bodyUnit, tabOn, ymd, addDays, dayTotals, weekStart, dayStart, dayPlan, restNote, workoutDays, DAY_SHORT, workoutStats, waterOn, addWater, kcalLook, kcalHit } from './store.js';
import { workoutDetail } from './workout.js';
import { openSettings } from './settings.js';
import { goTab } from './tabs.js';
import { oneRmSection } from './onerm.js';
import { rings, sparkline, COLORS } from './charts.js';
import { openGoals, goalsButton } from './goals.js';
import { habitsCard, isDone } from './habits.js';
import { quickAdd } from './quickadd.js';
import { takeProgressPhoto, progressPage } from './progress.js';
import { trendsPage, metabolism } from './trends.js';
import { logWeightSheet, latestWeight, change, trend } from './body.js';
import { groupsCard } from './groups.js';
import { activityType } from './fitness.js';
import { enabled as cloudOn } from './cloud.js';
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

// ---------- Rings: you pick up to 4, each shown for today or for this week ----------

export const MAX_RINGS = 4;
const DEFAULT_RINGS = ['gym', 'kcal', 'protein'];
const WEIGH_COLOR = '#9aa3b2';

/** Every goal that can be a ring. day(key) says how that day went. */
function ringCatalog() {
  const g = state.goals;
  return [
    { id: 'gym', label: 'Workout', color: COLORS.gym, cheer: 'Workout done!', day: (k) => {
      const n = state.workouts.filter((w) => ymd(w.start) === k).length;
      if (n) return { value: n, goal: 1, text: `${n} workout${n > 1 ? 's' : ''} today`, hit: true };
      if (dayPlan(k) === 'rest') { const rn = k === ymd() ? restNote(k) : null; return rn?.tone === 'behind' ? { value: 0, goal: 1, text: 'Rest day · behind this week', hit: false } : { value: 1, goal: 1, text: 'Rest day', hit: true, rest: true }; }   // a full ring: resting is the plan, unless the week needs a workout
      return { value: 0, goal: 1, text: dayPlan(k) === 'planned' ? 'Planned today' : 'Not yet today', hit: false };
    } },
    { id: 'kcal', label: 'Calories', color: COLORS.calories, cheer: 'Hit your calorie goal!', day: (k) => { const v = dayTotals(k).kcal; return { value: v, goal: g.kcal, text: `${fmtNum(v)} of ${fmtNum(g.kcal)} kcal`, hit: kcalHit(v, g.kcal, k), over: kcalLook(v, g.kcal, k) === 'over' }; } },
    { id: 'protein', label: 'Protein', color: COLORS.protein, cheer: 'Hit your protein goal!', day: (k) => { const v = dayTotals(k).p; return { value: v, goal: g.p, text: `${Math.round(v)} of ${g.p} g`, hit: v >= g.p }; } },
    { id: 'water', label: 'Water', color: '#2e8bd8', cheer: 'Hit your water goal!', day: (k) => { const v = waterOn(k), gw = g.water || 2500; return { value: v, goal: gw, text: `${(v / 1000).toFixed(1)} of ${(gw / 1000).toFixed(1)} L`, hit: v >= gw }; } },
    { id: 'sleep', label: 'Sleep', color: '#7d57c9', cheer: 'Slept enough!', day: (k) => { const v = state.recovery?.[k]?.sleep || 0, gs = g.sleep || 8; return { value: v, goal: gs, text: v ? `${v} of ${gs} h` : 'Not logged', hit: v >= gs }; } },
    { id: 'weigh', label: 'Weigh-in', color: WEIGH_COLOR, cheer: 'Weighed in!', day: (k) => { const n = state.body.weights.some((w) => ymd(w.ts) === k) ? 1 : 0; return { value: n, goal: 1, text: n ? 'Done today' : 'Not yet today', hit: !!n }; } },
  ].filter((r) => (r.id === 'gym' ? tabOn('workout') : ['kcal', 'protein', 'water'].includes(r.id) ? tabOn('nutrition') : r.id === 'sleep' ? tabOn('recovery') : true)).concat([
    ...g.custom.map((c) => ({ id: c.id, custom: c, label: c.name, color: COLORS.custom, cheer: `${c.name}: done!`, day: (k) => { const d = isDone(c, k); return { value: d ? 1 : 0, goal: 1, text: d ? 'Done' : 'Not yet', hit: d }; } })),
  ]);
}
export function ringIds() {
  const ids = new Set(ringCatalog().map((r) => r.id));
  return (state.goals.rings || [...DEFAULT_RINGS, ...state.goals.custom.map((c) => c.id)]).filter((id) => ids.has(id)).slice(0, MAX_RINGS);
}
/** Days a week you aim to hit a daily goal (the workout ring uses workouts per week). */
export const weekTarget = (id) => (id === 'gym' ? state.goals.workoutsPerWeek : state.goals.ringWeek?.[id] ?? 7);

/** The rings you picked, for 'day' (today) or 'week' (Monday to today). */
export function ringGoals(view = 'day') {
  const cat = new Map(ringCatalog().map((r) => [r.id, r]));
  const today = ymd();
  return ringIds().map((id) => {
    const r = cat.get(id);
    if (view === 'day') return { ...r, ...r.day(today), view };
    const goal = weekTarget(id);
    let value = 0;
    if (id === 'gym') value = state.workouts.filter((w) => w.start >= weekStart()).length;
    else for (let k = ymd(weekStart()); k <= today; k = addDays(k, 1)) if (r.day(k).hit) value++;
    const word = id === 'gym' ? 'workout' : 'day';
    const next = id === 'gym' && value < goal ? nextPlanned() : '';
    return {
      ...r, view, value, goal, hit: value >= goal,
      text: (value > goal ? `${value} ${word}s this week · goal ${goal}` : `${value} of ${goal} ${word}${goal === 1 ? '' : 's'} this week`) + (next ? ` · next ${next}` : ''),
      cheer: id === 'gym' ? 'Weekly gym goal hit!' : `${r.label}: ${goal} day${goal === 1 ? '' : 's'} this week!`,
    };
  });
}

/** The next planned workout day this week ('today', 'Thu'), or '' if none is left or you haven't picked days. */
function nextPlanned() {
  const today = ymd(), sunday = addDays(ymd(weekStart()), 6);
  const doneToday = state.workouts.some((w) => ymd(w.start) === today);
  for (let k = doneToday ? addDays(today, 1) : today; k <= sunday; k = addDays(k, 1)) {
    if (dayPlan(k) === 'planned') return k === today ? 'today' : DAY_SHORT[(new Date(dayStart(k)).getDay() + 6) % 7];
  }
  return '';
}

/** Pick which goals are rings, and how many days a week each should be hit. */
function editRings() {
  let picked = ringIds();
  const box = h('div');
  const setWeek = (id, d) => { commit((st) => { st.goals.ringWeek = { ...(st.goals.ringWeek || {}), [id]: Math.min(7, Math.max(1, weekTarget(id) + d)) }; }); draw(); };
  function draw() {
    fill(box,
      h('div.group', ringCatalog().map((r) => {
        const on = picked.includes(r.id);
        const full = !on && picked.length >= MAX_RINGS;
        return h('div.group-row.ring-pick' + (full ? '.dim' : ''),
          h('button.ring-pick-main', {
            onclick: () => {
              if (full) { toast(`Up to ${MAX_RINGS} rings`); return; }
              picked = on ? picked.filter((x) => x !== r.id) : [...picked, r.id];
              commit((st) => { st.goals.rings = picked; });
              draw();
            },
          }, h('span.pick-check' + (on ? '.on' : ''), on ? icon('check', 16) : null), h('i.ring-dot', { style: { background: r.color } }), h('span', r.label)),
          on && r.id !== 'gym' ? h('span.stepper',
            h('button', { 'aria-label': 'Fewer days', onclick: () => setWeek(r.id, -1) }, '−'),
            h('span', `${weekTarget(r.id)}×/wk`),
            h('button', { 'aria-label': 'More days', onclick: () => setWeek(r.id, 1) }, '+')) : null,
          on && r.id === 'gym' ? h('span.muted.small', `${weekTarget('gym')}×/wk`) : null);
      })),
      h('p.fine', `Pick up to ${MAX_RINGS}. Today shows how each goal is going today. Week counts the days you've hit it since Monday, against the days a week you set here. Workouts per week is set in Goals.`),
      h('button.group-row.gold-text.plain', { onclick: () => { s.close(); openGoals(); } }, 'Goal amounts and your own goals…'),
    );
  }
  draw();
  const s = sheet(h('div.form',
    h('div.sheet-head', h('span'), h('div.sheet-title', 'Your rings'), h('button.link.strong', { onclick: () => s.close() }, 'Done')),
    box));
}

/** Celebrate each ring once when it closes: daily ones once a day, weekly ones once a week. */
function celebrate() {
  const today = ymd(), wk = 'w' + ymd(weekStart());
  const doneD = new Set(state.celebrated?.[today] || []), doneW = new Set(state.celebrated?.[wk] || []);
  const fresh = [
    ...ringGoals('day').filter((g) => g.hit && !g.rest && !doneD.has(g.id)),
    ...ringGoals('week').filter((g) => g.hit && !doneW.has(g.id)),
  ];
  if (!fresh.length) return;
  commit((st) => {
    st.celebrated = {
      [today]: [...doneD, ...fresh.filter((g) => g.view === 'day').map((g) => g.id)],
      [wk]: [...doneW, ...fresh.filter((g) => g.view === 'week').map((g) => g.id)],
    };
  });
  const weekly = fresh.filter((g) => g.view === 'week');
  const shown = weekly.length ? weekly : fresh;
  const overlay = h('div.cheer', h('div.cheer-card',
    h('div.cheer-ring', rings(shown.map((g) => ({ ...g, value: g.goal })), 96)),
    h('div.cheer-title', shown.length === 1 ? shown[0].cheer : `${shown.length} ${weekly.length ? 'weekly ' : ''}goals closed!`),
    shown.length > 1 ? h('div.cheer-sub', shown.map((g) => g.label).join(' · ')) : null));
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
    const today = ymd();
    rows.push(h('div.cal-week' + (count >= goal ? '.gold' : ''), days.map((x) => h('button.cal-day' + (x.inMonth ? '' : '.out') + (x.ws.length ? '.did' : '') + (x.k === today ? '.today' : '') + (!x.ws.length && x.k >= today && dayPlan(x.k) === 'planned' ? '.plan' : ''), {
      'aria-label': `${fmtDate(x.d, { weekday: 'long', month: 'long', day: 'numeric' })}${x.ws.length ? `, ${x.ws.length} workout${x.ws.length > 1 ? 's' : ''}` : ''}`,
      onclick: () => { if (x.ws.length) push(() => workoutDetail(x.ws[0])); },
    }, h('span', x.d.getDate())))));
    const next = new Date(cur); next.setDate(next.getDate() + 7); cur = weekStart(next.getTime() + 36e5 * 3);
  }
  const thisWeek = state.workouts.filter((w) => w.start >= weekStart()).length;
  const moveMonth = (d) => { calMonth = new Date(year, month + d, 1).getTime(); redraw(); };
  return swipe(h('section.card.cal',
    h('div.cal-head',
      h('button.icon-btn', { 'aria-label': 'Previous month', onclick: () => { calMonth = new Date(year, month - 1, 1).getTime(); redraw(); } }, icon('back', 20)),
      h('div.cal-title', m.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })),
      h('button.icon-btn.flip', { 'aria-label': 'Next month', onclick: () => { calMonth = new Date(year, month + 1, 1).getTime(); redraw(); } }, icon('back', 20))),
    h('div.cal-dow', ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => h('span', d))),
    rows,
    h('div.cal-foot',
      h('span', h('i.cal-key.did'), 'Workout'),
      h('span', h('i.cal-key.gold'), `Week with ${goal}+`),
      workoutDays().length ? h('span', h('i.cal-key.plan'), 'Planned') : null,
      h('button.link', { onclick: () => openGoals('workout') }, `${thisWeek}/${goal} this week`))),
  { left: () => moveMonth(1), right: () => moveMonth(-1), target: () => document.querySelector('.card.cal') });
}

// ---------- Progress and Trends cards ----------

function progressCards() {
  const last = latestWeight();
  const c30 = change(30);
  const tr = trend().filter((p) => p.x > Date.now() - 90 * 864e5);
  const m = metabolism(28);
  const kcals = [];
  for (let i = 27; i >= 1; i--) { const t = dayTotals(ymd(Date.now() - i * 864e5)); if (t.entries) kcals.push(t.kcal); }
  const pics = state.body.photos?.length || 0;
  return h('div.orm-grid',
    h('button.card.orm-card.link-card', { onclick: () => (tabOn('body') ? goTab('body') : push(() => progressPage())), 'aria-label': 'Open Progress: weight, photos and monthly goals' },
      h('div.orm-name', 'Progress', h('span.card-go', '›')),
      last
        ? [h('div.orm-val', bodyDisplay(last.kg), h('span.orm-unit', bodyUnit())),
          h('div.orm-sub', c30 != null ? `${c30 > 0 ? '+' : c30 < 0 ? '−' : ''}${bodyDisplay(Math.abs(c30))} ${bodyUnit()} in 30 days` : 'Weight')]
        : [h('div.orm-val.dim-val', '—'), h('div.orm-sub', 'Log your weight')],
      tr.length > 1 ? sparkline(tr.map((p) => p.y)) : h('div.card-foot', `${pics} progress photo${pics === 1 ? '' : 's'}`),
      tr.length > 1 ? h('div.card-foot', `${pics} photo${pics === 1 ? '' : 's'} · monthly goals`) : null),
    h('button.card.orm-card.link-card', { onclick: () => push(trendsPage), 'aria-label': 'Open Trends: charts and metabolism' },
      h('div.orm-name', 'Trends', h('span.card-go', '›')),
      m.ready
        ? [h('div.orm-val' + (m.confidence === 'High' ? '' : '.dim-val'), m.confidence === 'High' ? '' : '≈ ', fmtNum(m.tdee), h('span.orm-unit', 'kcal')), h('div.orm-sub', 'to maintain')]
        : [h('div.orm-val.dim-val', '—'), h('div.orm-sub', 'Maintenance calories')],
      kcals.length > 1 ? sparkline(kcals, { color: COLORS.calories }) : null,
      h('div.card-foot', m.ready ? (m.confidence === 'High' ? 'High confidence · charts' : `${m.confidence} confidence · needs more data`) : [m.need.food ? `${m.need.food} more food day${m.need.food === 1 ? '' : 's'}` : null, m.need.weigh ? `${m.need.weigh} more weigh-in${m.need.weigh === 1 ? '' : 's'}` : null, !m.need.food && !m.need.weigh && m.need.spread ? `${m.need.spread} more day${m.need.spread === 1 ? '' : 's'} of weigh-ins` : null].filter(Boolean).join(' · ') + ' to estimate')));
}

// ---------- Rest days ----------

/** "Rest day, but you're falling behind" and the like, with a way to train anyway. */
export function restBanner(onTrain) {
  const rn = restNote();
  if (!rn) return null;
  return h('section.card.rest-banner.' + rn.tone,
    h('div.rest-banner-text', h('b', rn.title), h('span', rn.sub)),
    rn.tone === 'done' ? null : h('button.btn.small.' + (rn.tone === 'behind' ? 'gold' : 'gold-soft'), { onclick: onTrain }, rn.tone === 'behind' ? 'Train today' : 'Next workout'));
}

// ---------- The page ----------

export function homePage() {
  const el = h('div.page');
  const body = h('div.scroll-body');

  const setView = (v) => () => commit((st) => { st.settings.ringView = v; });

  function draw() {
    const o = overview();
    const name = state.profile.name.trim();
    const first = state.workouts[state.workouts.length - 1];
    const since = Math.min(state.profile.joined || Date.now(), first?.start || Infinity);
    const today = ymd();
    const view = state.settings.ringView === 'week' ? 'week' : 'day';
    const goals = ringGoals(view);
    const t = dayTotals(today);
    const todayWorkouts = state.workouts.filter((w) => ymd(w.start) === today);
    const todayActs = (state.activities || []).filter((a) => ymd(a.start) === today);
    const todayWeigh = state.body.weights.filter((w) => ymd(w.ts) === today).pop();
    const prompts = monthlyPrompts({ takePhoto: takeProgressPhoto });
    const stat = (value, label, sub) => h('div.tile', h('div.tile-v', value), h('div.tile-k', label), sub ? h('div.tile-sub', sub) : null);

    fill(body,
      h('header.home-head',
        h('div.home-hello',
          h('div.home-date', fmtDate(Date.now(), { weekday: 'long', month: 'long', day: 'numeric' })),
          h('h1.home-title', name ? `${greeting()}, ${name}` : greeting())),
        h('div.home-head-btns',
          goalsButton(),
          h('button.icon-btn', { onclick: openSettings, 'aria-label': 'Settings' }, icon('gear')))),

      // Rings (swipe for Today / Week)
      swipe(h('section.card.rings-card',
        h('div.rings-top',
          h('div.segment.ring-view', [['day', 'Today'], ['week', 'Week']].map(([v, l]) => h('button' + (view === v ? '.on' : ''), { onclick: () => commit((st) => { st.settings.ringView = v; }) }, l))),
          h('button.rings-edit', { onclick: editRings, 'aria-label': 'Choose rings' }, icon('edit', 16))),
        goals.length ? h('div.rings-body',
          h('div.rings-wrap', rings(goals, 132)),
          h('div.ring-legend', goals.map((g) => {
            const water = g.id === 'water';
            const tap = view === 'day' && water;
            const act = tap ? { onclick: () => addWater(ymd(), 250), 'aria-label': 'Add 250 ml of water' } : {};
            return h(tap ? 'button.ring-row.tap' : 'div.ring-row', act,
              h('i.ring-dot', { style: { background: g.color } }),
              h('span.ring-text', h('span.ring-label', g.label, g.hit ? h('span.ring-check', ' ✓') : null), h('span.ring-val' + (g.over ? '.red-text' : ''), g.text)),
              tap ? h('span.ring-plus', '+250') : null);
          })))
          : h('button.link', { onclick: editRings }, 'Pick your rings')),
      { left: view === 'day' ? setView('week') : null, right: view === 'week' ? setView('day') : null, target: () => body.querySelector('.rings-card') }),
      view === 'day' ? goals.filter((g) => g.hit && (g.id === 'protein' || g.id === 'kcal')).map((g) => h('div.hit-banner', h('span', '🏆'), g.cheer)) : null,
      tabOn('workout') && !state.active ? restBanner(() => goTab('workout')) : null,

      habitsCard(openGoals),

      // Progress and Trends live here instead of in the tab bar
      h('div.section-head', h('h2.section-title', 'Progress & trends')),
      progressCards(),

      // Strength tracking (estimated one-rep max)
      tabOn('workout') ? oneRmSection() : null,

      // Calendar
      tabOn('workout') ? [h('div.section-head', h('h2.section-title', 'Calendar')), calendar(draw)] : null,

      // Today
      h('div.section-head', h('h2.section-title', 'Today')),
      h('section.card.list-card.today',
        tabOn('workout') || tabOn('fitness') ? h('div.today-row',
          h('span.today-ico', icon('dumbbell', 20)),
          h('span.today-text',
            h('span.today-k', 'Workout'),
            h('span.today-v', todayWorkouts.length || todayActs.length ? [...todayWorkouts.map((w) => `${w.name} · ${fmtDurationWords(workoutStats(w).duration)}`), ...todayActs.map((a) => `${activityType(a.type).name} · ${fmtDurationWords(a.dur)}`)].join(', ') : state.active ? 'In progress' : dayPlan(today) === 'rest' ? (restNote()?.tone === 'behind' ? 'Rest day · behind this week' : 'Rest day') : dayPlan(today) === 'planned' ? 'Planned today' : 'Not yet')),
          todayWorkouts.length || todayActs.length ? h('span.ring-check.big', '✓') : h('button.btn.gold-soft.small', { onclick: () => goTab(tabOn('workout') ? 'workout' : 'fitness') }, state.active ? 'Resume' : tabOn('workout') ? 'Start' : 'Add')) : null,
        tabOn('nutrition') ? h('div.today-row',
          h('span.today-ico', '🍽️'),
          h('span.today-text',
            h('span.today-k', 'Food'),
            h('span.today-v', t.entries ? `${fmtNum(t.kcal)} kcal · ${Math.round(t.p)} g protein` : 'Nothing logged')),
          h('button.btn.gold-soft.small', { onclick: () => quickAdd({}) }, 'Add')) : null,
        h('div.today-row',
          h('span.today-ico', '⚖️'),
          h('span.today-text',
            h('span.today-k', 'Weigh-in'),
            h('span.today-v', todayWeigh ? `${bodyDisplay(todayWeigh.kg)} ${bodyUnit()}` : 'Not yet')),
          todayWeigh ? h('span.ring-check.big', '✓') : h('button.btn.gold-soft.small', { onclick: logWeightSheet }, 'Log'))),

      // Monthly nudges
      prompts.map((p) => h('button.card.prompt', { onclick: p.action },
        h('span.prompt-ico', p.icon), h('span.today-text', h('span.today-k.strong', p.text), h('span.today-v', p.sub)), h('span.prompt-go', icon('back', 16)))),

      // Groups
      cloudOn() ? h('div.section-head', h('h2.section-title', 'Groups')) : null,
      groupsCard(),

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
    setTimeout(celebrate, 0);   // it may save, which redraws: do that after this draw
  }

  draw();
  el.append(body);
  return { el, refresh: draw };
}
