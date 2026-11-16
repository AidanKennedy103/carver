// Monthly: set your goals each month, a monthly progress-photo nudge, and a
// recap of each month (photo change, weight change, lifting highlights).

import { h, icon, push, navBar, sheet, toast, fmtDate, fmtNum, fmtDurationWords } from './ui.js';
import { state, commit, exercise, workoutStats, e1rm, toDisplay, unit, ymd, dayTotals } from './store.js';
import { photos } from './photos.js';
import { trend } from './body.js';
import { compareView } from './progress.js';
import { activityKcal } from './fitness.js';

export const GOAL_OPTIONS = ['Build muscle', 'Lose fat', 'Get stronger', 'Maintain weight', 'Improve endurance', 'Eat better', 'Be consistent'];

export const monthKey = (ts = Date.now()) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const monthStart = (key) => { const [y, m] = key.split('-').map(Number); return new Date(y, m - 1, 1).getTime(); };
const monthEnd = (key) => { const [y, m] = key.split('-').map(Number); return new Date(y, m, 1).getTime(); };
export const monthName = (key, opts = { month: 'long' }) => new Date(monthStart(key)).toLocaleDateString(undefined, opts);
const prevMonth = (key) => monthKey(monthStart(key) - 864e5);

export const monthGoals = (key = monthKey()) => state.monthly[key]?.goals || [];

export function setGoalsSheet(key = monthKey()) {
  const cur = state.monthly[key] || {};
  const chosen = new Set(cur.goals || []);
  const chips = h('div.chips.tight.goal-chips');
  const draw = () => chips.replaceChildren(...GOAL_OPTIONS.map((g) => h('button.chip' + (chosen.has(g) ? '.on' : ''), {
    onclick: () => { chosen.has(g) ? chosen.delete(g) : chosen.add(g); draw(); },
  }, g)));
  draw();
  const note = h('textarea.field.paste-box', { rows: 3, placeholder: 'Anything specific? e.g. bench 225, hit protein 6 days a week', value: cur.note || '' });
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', `${monthName(key)} goals`),
      h('button.link.strong', {
        onclick: () => {
          commit((st) => { st.monthly[key] = { ...(st.monthly[key] || {}), goals: [...chosen], note: note.value.trim(), set: Date.now() }; });
          s.close();
          toast('Goals set for ' + monthName(key));
        },
      }, 'Save')),
    h('p.fine', 'What are you working toward this month? Pick any that fit.'),
    chips,
    h('label.form-label', 'Your own words'),
    note,
  ));
}

// ---------- Recap data ----------

export function recap(key) {
  const a = monthStart(key), b = monthEnd(key);
  const ws = state.workouts.filter((w) => w.start >= a && w.start < b);
  let volume = 0, sets = 0, time = 0;
  for (const w of ws) { const st = workoutStats(w); volume += st.volume; sets += st.sets; time += st.duration; }
  const prs = ws.flatMap((w) => (w.prList || []).map((p) => ({ ...p, when: w.start })));

  // Biggest strength gains: best e1RM this month vs best before it
  const gains = [];
  const ids = new Set(ws.flatMap((w) => w.exercises.map((e) => e.exId)));
  for (const id of ids) {
    if (exercise(id).type !== 'wr') continue;
    let before = 0, now = 0;
    for (const w of state.workouts) {
      if (w.start >= b) continue;
      for (const e of w.exercises) {
        if (e.exId !== id) continue;
        for (const s of e.sets) {
          if (!s.done || s.type === 'w') continue;
          const v = e1rm(s.weight, s.reps);
          if (w.start < a) before = Math.max(before, v); else now = Math.max(now, v);
        }
      }
    }
    if (before && now > before) gains.push({ exId: id, from: before, to: now });
  }
  gains.sort((x, y) => (y.to - y.from) - (x.to - x.from));

  const t = trend().filter((p) => p.x >= a && p.x < b);
  const weight = t.length >= 2 ? { from: t[0].y, to: t[t.length - 1].y } : null;

  // Food: averages over the days you logged
  const days = [];
  for (let ts = a + 12 * 36e5; ts < b; ts += 864e5) { const d = dayTotals(ymd(ts)); if (d.entries) days.push(d); }
  const avg = (k) => days.reduce((n, d) => n + d[k], 0) / (days.length || 1);
  const food = days.length ? { days: days.length, kcal: avg('kcal'), p: avg('p'), proteinDays: days.filter((d) => d.p >= state.goals.p).length } : null;

  // Photos: the last one before this month (or the first one in it) against the last one in it
  const pics = photos().slice().sort((x, y) => x.ts - y.ts);
  const inMonth = pics.filter((p) => p.ts >= a && p.ts < b);
  const before = pics.filter((p) => p.ts < a).pop();
  const pair = inMonth.length ? [before || (inMonth.length > 1 ? inMonth[0] : null), inMonth[inMonth.length - 1]] : null;

  // Cardio from the Fitness tab
  const acts = (state.activities || []).filter((x) => x.start >= a && x.start < b);
  const cardio = acts.length ? { n: acts.length, time: acts.reduce((n, x) => n + x.dur, 0), dist: acts.reduce((n, x) => n + (x.dist || 0), 0), kcal: acts.reduce((n, x) => n + activityKcal(x), 0) } : null;

  return { key, cardio, workouts: ws.length, volume, sets, time, prs, gains: gains.slice(0, 3), weight, food, photoPair: pair && pair[0] ? pair : null, photoCount: inMonth.length,
    hasData: ws.length > 0 || !!cardio || !!weight || !!food || inMonth.length > 0 };
}

const signed = (kg) => { const v = +toDisplay(Math.abs(kg)); return `${kg > 0 ? '+' : kg < 0 ? '−' : '±'}${v} ${unit()}`; };

export function recapScreen(key) {
  const r = recap(key);
  commit((st) => { st.monthly[key] = { ...(st.monthly[key] || {}), seen: true }; });
  const goals = monthGoals(key);
  const el = h('div.page',
    navBar({ title: 'Monthly recap', backLabel: 'Back' }),
    h('div.scroll-body',
      h('div.recap-hero',
        h('div.home-date', new Date(monthStart(key)).getFullYear()),
        h('h2.recap-title', monthName(key)),
        goals.length ? h('div.chips.tight.static', goals.map((g) => h('span.chip.on', g))) : null,
        state.monthly[key]?.note ? h('p.fine', `“${state.monthly[key].note}”`) : null),

      r.photoPair ? [h('div.section-head', h('h2.section-title', 'Your progress')), compareView(r.photoPair[0].id, r.photoPair[1].id)] : null,

      h('div.section-head', h('h2.section-title', 'Training')),
      h('div.tiles',
        tile(r.workouts, 'Workouts', r.time ? fmtDurationWords(r.time) : ''),
        tile(`${fmtNum(+toDisplay(r.volume) || 0)}`, 'Volume', `${unit()} lifted`),
        tile(r.sets, 'Sets', 'completed'),
        tile(r.prs.length, 'Records', 'personal bests')),
      r.gains.length ? h('section.card.list-card.recap-list', r.gains.map((g) => h('div.pr-line',
        h('span.pr-icon', icon('trophy', 16)),
        h('span.pr-line-text', h('span.pr-line-name', exercise(g.exId).name), h('span.pr-line-kind', `Est. 1RM ${toDisplay(g.from).split('.')[0]} → ${toDisplay(g.to).split('.')[0]} ${unit()}`)),
        h('span.pr-line-val', `+${Math.round(+toDisplay(g.to - g.from))}`)))) : null,

      r.cardio ? [h('div.section-head', h('h2.section-title', 'Cardio')),
        h('div.tiles',
          tile(r.cardio.n, 'Activities', fmtDurationWords(r.cardio.time)),
          tile(r.cardio.dist ? (r.cardio.dist / (unit() === 'kg' ? 1000 : 1609.344)).toFixed(1) : '—', 'Distance', unit() === 'kg' ? 'km' : 'mi'),
          tile(fmtNum(r.cardio.kcal), 'Burned', 'active kcal'))] : null,

      r.weight ? [h('div.section-head', h('h2.section-title', 'Body')),
        h('section.card', h('div.energy-top',
          h('div', h('div.energy-v', signed(r.weight.to - r.weight.from)), h('div.energy-k', 'weight change (7-day average)')),
          h('div.energy-goal', h('div.recap-small', `${toDisplay(r.weight.from)} → ${toDisplay(r.weight.to)} ${unit()}`))))] : null,

      r.food ? [h('div.section-head', h('h2.section-title', 'Food')),
        h('div.tiles',
          tile(fmtNum(r.food.kcal), 'Calories', 'a day on average'),
          tile(`${Math.round(r.food.p)} g`, 'Protein', 'a day on average'),
          tile(r.food.days, 'Days logged', ''),
          tile(r.food.proteinDays, 'Protein goal', 'days hit'))] : null,

      !r.hasData ? h('div.empty', h('div.empty-title', 'Nothing logged this month')) : null,
      h('div.bottom-space'),
    ),
  );
  return { el };
}
const tile = (v, k, sub) => h('div.tile', h('div.tile-v', v), h('div.tile-k', k), sub ? h('div.tile-sub', sub) : null);

// ---------- Sections and prompts ----------

/** Progress page: this month's goals, photo status, and past recaps. */
export function monthlySection() {
  const key = monthKey();
  const goals = monthGoals(key);
  const photoThisMonth = photos().find((p) => monthKey(p.ts) === key);
  const past = [];
  for (let k = prevMonth(key), i = 0; i < 12; k = prevMonth(k), i++) if (recap(k).hasData) past.push(k);
  return [
    h('div.section-head', h('h2.section-title', monthName(key)), h('button.link', { onclick: () => setGoalsSheet(key) }, goals.length ? 'Edit goals' : 'Set goals')),
    h('section.card.month-card',
      goals.length ? h('div.chips.tight.static', goals.map((g) => h('span.chip.on', g))) : h('button.link', { onclick: () => setGoalsSheet(key) }, 'What are your goals this month?'),
      h('div.month-line', photoThisMonth ? [icon('check', 16), ` Progress photo taken ${fmtDate(photoThisMonth.ts, { month: 'short', day: 'numeric' })}`] : [h('span.muted', 'No progress photo yet this month')]),
      h('button.link', { onclick: () => push(() => recapScreen(key)) }, 'This month so far', icon('back', 14))),
    past.length ? h('div.section-head', h('h2.section-title', 'Monthly recaps')) : null,
    past.length ? h('section.card.list-card', past.map((k) => {
      const r = recap(k);
      return h('button.food-line', { onclick: () => push(() => recapScreen(k)) },
        h('span.food-ico', '🗓️'),
        h('span.food-text', h('span.food-name', monthName(k, { month: 'long', year: 'numeric' })),
          h('span.food-sub', [r.workouts && `${r.workouts} workouts`, r.prs.length && `${r.prs.length} PRs`, r.weight && signed(r.weight.to - r.weight.from)].filter(Boolean).join(' · ') || 'Some data')),
        state.monthly[k]?.seen ? null : h('span.dot-new'));
    })) : null,
  ];
}

/** Home: nudges for the month (goals, photo, last month's recap). Each is { text, sub, action }. */
export function monthlyPrompts({ takePhoto }) {
  const key = monthKey();
  const out = [];
  const last = prevMonth(key);
  const day = new Date().getDate();
  if (day <= 10 && !state.monthly[last]?.seen && recap(last).hasData) {
    out.push({ icon: '🗓️', text: `Your ${monthName(last)} recap is ready`, sub: 'Photos, weight and lifting highlights', action: () => push(() => recapScreen(last)) });
  }
  if (!monthGoals(key).length) out.push({ icon: '🎯', text: `Set your ${monthName(key)} goals`, sub: 'Build muscle, lose fat, get stronger…', action: () => setGoalsSheet(key) });
  if (!photos().some((p) => monthKey(p.ts) === key)) out.push({ icon: '📸', text: 'Time for this month’s progress photo', sub: 'Same spot, same light as last time', action: takePhoto });
  return out;
}
