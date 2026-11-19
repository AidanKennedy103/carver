// Diet coach: a loose weekly guide for calories and protein, not a strict plan.
//
// People are bad at counting what they eat: studies of food diaries find most of us
// under-report by 20–40% (oils, drinks, sauces, bites and "small" portions go missing).
// So the coach never trusts the log alone. It works out your maintenance from what you
// log AND how your weight actually moves; if you consistently miss things, that
// estimate comes out lower by the same amount, and the targets still land.
//
// Safeguards:
//   - ranges, not exact numbers, and how sure it is
//   - changes of at most 150 kcal a week (100 while it's still an early guess)
//   - no change in a week with fewer than 4 fully logged days, or with days that look unfinished
//   - a floor it never goes under, and weight loss capped at 1% of body weight a week
//   - if you're losing faster than planned, it raises calories, whatever the log says
//
// state.goals.coach = { on, pace, last (YYYY-MM-DD of the last check-in) }

import { h, fill, navBar, toast, fmtNum, push, fmtDate } from './ui.js';
import { state, commit, ymd, addDays, foodAim, bodyDisplay, bodyFromDisplay, bodyUnit, daySkipped } from './store.js';
import { metabolism, foodDays } from './trends.js';
import { latestWeight, trend } from './body.js';

const KCAL_PER_KG = 7700;
const PACES = {
  cut: [['gentle', 'Gentle', 0.005, 'About 0.5% of body weight a week'], ['steady', 'Steady', 0.0075, 'About 0.75% a week'], ['fast', 'Faster', 0.01, 'About 1% a week (the most it will plan)']],
  build: [['lean', 'Lean', 0.0025, 'About 0.25% a week: little extra fat'], ['steady', 'Steady', 0.005, 'About 0.5% a week']],
  maintain: [['hold', 'Hold', 0, 'Keep your weight where it is']],
};
const AIMS = [['cut', 'Lose fat'], ['maintain', 'Maintain'], ['build', 'Build muscle']];
const coach = () => state.goals.coach || {};
const round50 = (v) => Math.round(v / 50) * 50;

/** Fully logged days in the last 7 (days that look unfinished don't count). */
function loggedWeek() {
  const fd = foodDays(8).filter((d) => d.k >= addDays(ymd(), -7));
  return { full: fd.filter((d) => !d.odd && !daySkipped(d.k)).length, odd: fd.filter((d) => d.odd && !daySkipped(d.k)).length };
}

/** Weight change per week over the last 3 weeks, from the smoothed trend (kg), or null. */
function weeklyRate() {
  const tr = trend().filter((p) => p.x > Date.now() - 21 * 864e5);
  if (tr.length < 3) return null;
  const days = (tr[tr.length - 1].x - tr[0].x) / 864e5;
  return days >= 7 ? ((tr[tr.length - 1].y - tr[0].y) / days) * 7 : null;
}

// ---------- You, and your goal weight ----------
// state.profile: sex ('m' | 'f'), birthYear, heightCm, activity (multiplier).
// state.goals.weight (kg) and state.goals.coach.by ('YYYY-MM-DD').

export const ACTIVITY = [[1.2, 'Mostly sitting'], [1.375, 'Lightly active'], [1.55, 'Active'], [1.725, 'Very active']];

/** Resting burn (Mifflin-St Jeor), or null without your details. */
export function bmr(kg = latestWeight()?.kg) {
  const p = state.profile;
  if (!kg || !p.heightCm || !p.birthYear || !p.sex) return null;
  const age = new Date().getFullYear() - p.birthYear;
  return 10 * kg + 6.25 * p.heightCm - 5 * age + (p.sex === 'm' ? 5 : -161);
}
/** A starting guess at maintenance from your details, for before there's enough logging. */
export const startEstimate = () => { const b = bmr(); return b ? b * (state.profile.activity || 1.375) : null; };

/** Your goal weight and date, as a weekly pace the coach is willing to plan. */
export function datePlan(kg = latestWeight()?.kg) {
  const g = state.goals.weight, by = coach().by;
  if (!g || !kg) return null;
  const diff = g - kg;
  if (Math.abs(diff) < 0.5) return { reached: true, diff };
  const aim = diff < 0 ? 'cut' : 'build';
  const cap = aim === 'cut' ? 0.01 * kg : 0.005 * kg;   // the most it plans: lose 1% or gain 0.5% of body weight a week
  const weeks = by ? Math.max(0.5, (new Date(by + 'T12:00') - Date.now()) / (7 * 864e5)) : null;
  const need = weeks ? Math.abs(diff) / weeks : null;
  const planned = need != null ? Math.min(need, cap) : null;
  return { aim, diff, cap, weeks, need, planned, tooFast: need != null && need > cap, eta: planned ? Date.now() + (Math.abs(diff) / planned) * 7 * 864e5 : null };
}

/** This week's suggestion: { kcal, lo, hi, protein, change, reason, hold, ... } */
export function suggestion() {
  const c = coach();
  const kg = latestWeight()?.kg;
  const plan = datePlan(kg);
  const aim = plan?.planned ? plan.aim : plan?.reached ? 'maintain' : foodAim();
  const pace = plan?.planned ? ['date', 'By your date', plan.planned / kg, ''] : (PACES[aim].find((p) => p[0] === c.pace) || PACES[aim][0]);
  const cur = state.goals.kcal;
  const m = metabolism(28);
  const week = loggedWeek();
  const rate = weeklyRate();
  const b = bmr(kg);
  const floor = Math.max(1200, round50(b || (kg || 70) * 18));   // never below your resting burn
  const protein = kg ? Math.round(kg * (aim === 'cut' ? 2 : 1.8) / 5) * 5 : state.goals.p;
  const base = { aim, pace, kg, cur, m, week, rate, floor, protein, plan };

  if (!kg) return { ...base, hold: 'Log your weight a few times a week so the coach can see your trend.' };
  const est = !m.ready ? startEstimate() : null;
  if (!m.ready && !est) return { ...base, hold: `Still learning: ${[m.need.food ? `${m.need.food} more day${m.need.food === 1 ? '' : 's'} of food` : null, m.need.weigh ? `${m.need.weigh} more weigh-in${m.need.weigh === 1 ? '' : 's'}` : null, m.need.spread ? `${m.need.spread} more day${m.need.spread === 1 ? '' : 's'} between weigh-ins` : null].filter(Boolean).join(', ')}. Until then, keep your current target.` };

  const tdee = m.ready ? m.tdee : est;
  const margin = !m.ready ? 300 : m.confidence === 'High' ? 100 : m.confidence === 'Medium' ? 200 : 300;
  const goalRate = aim === 'cut' ? -pace[2] * kg : aim === 'build' ? pace[2] * kg : 0;   // kg a week
  let ideal = tdee + (goalRate * KCAL_PER_KG) / 7;
  let reason = (m.ready ? '' : 'A starting estimate from your details; it sharpens as you log. ')
    + (aim === 'maintain' ? 'Matches your estimated maintenance.' : `Maintenance ${fmtNum(round50(tdee))} ${aim === 'cut' ? '−' : '+'} ${fmtNum(Math.abs(round50((goalRate * KCAL_PER_KG) / 7)))} for your pace.`);
  // Losing faster than 1% a week (or much faster than planned): eat more, whatever the log says
  if (rate != null && aim !== 'build' && rate < -Math.max(0.01 * kg, Math.abs(goalRate) * 1.5)) { ideal = Math.max(ideal, cur + 150); reason = 'You’re losing faster than planned, so the coach is adding food to protect muscle.'; }
  if (m.ready && c.last && week.full < 4) return { ...base, hold: `Only ${week.full} fully logged day${week.full === 1 ? '' : 's'} this week. The coach needs 4 to suggest a change, so keep your target for now.` };
  // The first time, it goes straight to the number; after that, small weekly steps
  const step = !c.last ? Infinity : !m.ready || m.confidence === 'Low' ? 100 : 150;
  let kcal = round50(Math.min(cur + step, Math.max(cur - step, ideal)));
  let floored = false;
  if (kcal < floor) { kcal = floor; floored = true; }
  return { ...base, kcal, lo: round50(kcal - margin / 2), hi: round50(kcal + margin / 2), change: kcal - cur, ideal: round50(ideal), reason, floored, margin, tdee, step };
}

/** Use the suggestion: calories and protein, with fat at about 30% and carbs filling the rest. */
function apply(s) {
  commit((st) => {
    const fat = Math.round((s.kcal * 0.28) / 9 / 5) * 5;
    st.goals.kcal = s.kcal; st.goals.p = s.protein; st.goals.f = fat;
    st.goals.c = Math.max(50, Math.round((s.kcal - s.protein * 4 - fat * 9) / 4 / 5) * 5);
    st.goals.coach = { ...(st.goals.coach || {}), on: true, last: ymd() };
  });
  toast('Targets updated');
}

/** A check-in is due: coach on and a week since the last one. */
export const checkInDue = () => coach().on && (!coach().last || coach().last <= addDays(ymd(), -7));

/** Goal weight and the date you want it by, and what that means per week. */
function goalSection(s) {
  const kg = s.kg, g = state.goals.weight, by = coach().by, p = s.plan;
  const wIn = h('input.field.goal-input', { value: g ? bodyDisplay(g) : '', placeholder: kg ? bodyDisplay(kg) : '', inputmode: 'decimal', 'aria-label': 'Goal weight' });
  wIn.addEventListener('change', () => {
    const v = parseFloat(wIn.value.replace(',', '.'));
    commit((st) => {
      st.goals.weight = v > 0 ? bodyFromDisplay(v) : 0;
      if (v > 0 && kg) st.goals.aim = st.goals.weight < kg - 0.5 ? 'cut' : st.goals.weight > kg + 0.5 ? 'build' : 'maintain';
    });
  });
  const dIn = h('input.field.goal-input.date-in', { type: 'date', value: by || '', min: addDays(ymd(), 7), 'aria-label': 'Goal date' });
  dIn.addEventListener('change', () => commit((st) => { st.goals.coach = { ...(st.goals.coach || {}), by: dIn.value || null }; }));
  const per = (v) => `${bodyDisplay(v)} ${bodyUnit()}`;
  const day = (t) => fmtDate(t, { month: 'short', day: 'numeric', year: 'numeric' });
  const msg = !p ? (kg ? 'Set a goal weight, and a date if you have one in mind.' : 'Log your weight first.')
    : p.reached ? 'You’re at your goal weight. The coach will help you hold it.'
      : !p.need ? `${p.diff < 0 ? 'Lose' : 'Gain'} ${per(Math.abs(p.diff))}. Add a date to set the pace, or pick one below.`
        : p.tooFast ? `That needs ${per(p.need)} a week, faster than the coach will plan (${p.aim === 'cut' ? 'lose 1%' : 'gain 0.5%'} of body weight a week at most). At ${per(p.planned)} a week you’d get there around ${day(p.eta)}.`
          : `${p.diff < 0 ? 'Lose' : 'Gain'} ${per(Math.abs(p.diff))} by ${day(new Date(by + 'T12:00'))}: about ${per(p.planned)} a week.`;
  return [
    h('label.form-label', 'Your goal'),
    h('div.group',
      h('label.goal-row', h('span', 'Goal weight'), h('span.goal-field', wIn, h('span.goal-unit', bodyUnit()))),
      h('label.goal-row', h('span', 'By'), h('span.goal-field', dIn))),
    h('p.fine' + (p?.tooFast ? '.dc-warn' : ''), msg),
  ];
}

/** Sex, age, height and activity: for a starting estimate and a safe floor. */
function youSection() {
  const p = state.profile, imp = bodyUnit() === 'lb';
  const set = (k, v) => commit((st) => { st.profile[k] = v; });
  const age = h('input.field.goal-input', { value: p.birthYear ? new Date().getFullYear() - p.birthYear : '', placeholder: '—', inputmode: 'numeric', 'aria-label': 'Age' });
  age.addEventListener('change', () => { const a = parseInt(age.value, 10); set('birthYear', a > 12 && a < 100 ? new Date().getFullYear() - a : null); });
  let height;
  if (imp) {
    const tot = p.heightCm ? p.heightCm / 2.54 : null;
    const ft = h('input.field.goal-input.short', { value: tot ? Math.floor(tot / 12) : '', placeholder: 'ft', inputmode: 'numeric', 'aria-label': 'Height, feet' });
    const inch = h('input.field.goal-input.short', { value: tot ? Math.round(tot % 12) : '', placeholder: 'in', inputmode: 'numeric', 'aria-label': 'Height, inches' });
    const save = () => { const f = parseInt(ft.value, 10) || 0, i = parseInt(inch.value, 10) || 0; set('heightCm', f || i ? Math.round((f * 12 + i) * 2.54) : null); };
    ft.addEventListener('change', save); inch.addEventListener('change', save);
    height = h('span.goal-field', ft, h('span.goal-unit', 'ft'), inch, h('span.goal-unit', 'in'));
  } else {
    const cm = h('input.field.goal-input', { value: p.heightCm || '', placeholder: '—', inputmode: 'numeric', 'aria-label': 'Height' });
    cm.addEventListener('change', () => { const v = parseInt(cm.value, 10); set('heightCm', v > 100 && v < 250 ? v : null); });
    height = h('span.goal-field', cm, h('span.goal-unit', 'cm'));
  }
  return [
    h('div.section-head', h('h2.section-title', 'You')),
    h('div.segment', [['m', 'Male'], ['f', 'Female']].map(([v, l]) => h('button' + (p.sex === v ? '.on' : ''), { onclick: () => set('sex', v) }, l))),
    h('div.group.dc-you',
      h('label.goal-row', h('span', 'Age'), h('span.goal-field', age, h('span.goal-unit', 'years'))),
      h('label.goal-row', h('span', 'Height'), height)),
    h('label.form-label', 'Day to day (outside workouts)'),
    h('div.segment.dc-act', ACTIVITY.map(([v, l]) => h('button' + ((p.activity || 1.375) === v ? '.on' : ''), { onclick: () => set('activity', v) }, l))),
    h('p.fine', 'Used for a starting estimate until you’ve logged a couple of weeks, and so the coach never suggests eating less than your body burns at rest.'),
  ];
}

export function dietCoachScreen() {
  const el = h('div.page');
  const body = h('div.scroll-body');
  function draw() {
    const s = suggestion(), aim = s.aim, c = coach();
    const L = (kg) => `${kg > 0 ? '+' : kg < 0 ? '−' : ''}${bodyDisplay(Math.abs(kg))} ${bodyUnit()}`;
    fill(body,
      navBar({ title: 'Diet coach', backLabel: 'Nutrition' }),
      h('p.coach-intro', 'A weekly guide for calories and protein. Loose on purpose: it reads your scale as well as your log.'),

      goalSection(s),
      s.plan?.planned ? null : [h('label.form-label', 'Goal'),
        h('div.segment', AIMS.map(([v, l]) => h('button' + (aim === v ? '.on' : ''), { onclick: () => { commit((st) => { st.goals.aim = v; st.goals.coach = { ...(st.goals.coach || {}), pace: PACES[v][0][0] }; }); } }, l)))],
      !s.plan?.planned && PACES[aim].length > 1 ? [h('label.form-label', 'Pace'),
        h('div.segment', PACES[aim].map(([v, l]) => h('button' + (s.pace[0] === v ? '.on' : ''), { onclick: () => commit((st) => { st.goals.coach = { ...(st.goals.coach || {}), pace: v }; }) }, l))),
        h('p.fine', s.pace[3])] : null,

      h('section.card.dc-card',
        h('div.dc-label', c.last ? `Last check-in ${c.last === ymd() ? 'today' : c.last}` : 'This week'),
        s.hold ? [h('div.dc-hold', s.hold), h('div.dc-now', `Current target: ${fmtNum(s.cur)} kcal · ${state.goals.p} g protein`)]
          : [
            h('div.dc-big', h('b', `${fmtNum(s.lo)}–${fmtNum(s.hi)}`), h('span', ' kcal a day')),
            h('div.dc-sub', `Protein about ${s.protein} g`, h('span.muted', ` · now ${fmtNum(s.cur)} kcal${s.change ? ` (${s.change > 0 ? '+' : '−'}${fmtNum(Math.abs(s.change))})` : ', no change'}`)),
            h('p.dc-why', s.reason, s.floored ? ' It won’t go lower than this.' : '', s.ideal !== s.kcal && !s.floored && s.step !== Infinity ? ` Moving there gradually (${s.step} kcal a week).` : ''),
            h('button.btn.gold.wide', { onclick: () => { apply(s); draw(); } }, s.change ? 'Use these targets' : 'Keep these targets'),
          ]),

      youSection(s),

      h('div.section-head', h('h2.section-title', 'What it sees')),
      h('section.card.list-card',
        h('div.group-row', h('span', 'Weight trend'), h('span.row-val', s.rate != null ? `${L(s.rate)} a week` : 'needs more weigh-ins')),
        h('div.group-row', h('span', 'Maintenance'), h('span.row-val', s.m.ready ? `about ${fmtNum(round50(s.m.tdee))} kcal · ${s.m.confidence.toLowerCase()} confidence` : startEstimate() ? `about ${fmtNum(round50(startEstimate()))} kcal · from your details` : 'still learning')),
        bmr() ? h('div.group-row', h('span', 'Resting burn'), h('span.row-val', `about ${fmtNum(round50(bmr()))} kcal`)) : null,
        h('div.group-row', h('span', 'Full days logged'), h('span.row-val', `${s.week.full} of the last 7`)),
        s.week.odd ? h('div.group-row', h('span', 'Days that look unfinished'), h('span.row-val.red-text', `${s.week.odd} · left out`)) : null),

      h('div.section-head', h('h2.section-title', 'Why it’s loose')),
      h('section.card.dc-notes',
        h('p', 'Most people under-log by 20–40% without meaning to. The coach works out your maintenance from your own log and your scale, so if you always miss the cooking oil, it’s already counted. Keep logging the way you do; consistency matters more than precision.'),
        h('p', 'Easy to miss: oil and butter, drinks, sauces and dressings, bites while cooking, and weekends.'),
        h('ul.dc-rules',
          h('li', 'Changes at most 150 kcal a week'),
          h('li', `Never goes below ${fmtNum(s.floor)} kcal for you`),
          h('li', 'Plans weight loss of 1% a week at most, and adds food if you lose faster'),
          h('li', 'Skips weeks with fewer than 4 full days logged')),
        h('p.fine', 'A general guide, not medical advice. If you have a medical condition or a history of disordered eating, talk to a professional first.')),
      c.on ? h('button.link.center-link', { onclick: () => { commit((st) => { st.goals.coach = { ...(st.goals.coach || {}), on: false }; }); toast('Coach off. Your targets stay as they are.'); } }, 'Turn off weekly check-ins') : null,
      h('div.bottom-space'));
  }
  draw();
  el.append(body);
  return { el, refresh: draw };
}

/** The one-line prompt on Nutrition: check-in due, or a way in. */
export function coachLine() {
  const due = checkInDue();
  return h('button.dc-line' + (due ? '.due' : ''), { onclick: () => push(dietCoachScreen) },
    h('span', due ? 'Weekly check-in ready' : coach().on ? 'Diet coach' : 'Try the diet coach'),
    h('span.muted', due ? ' · see this week’s targets' : coach().on ? ` · next check-in ${addDays(coach().last || ymd(), 7) <= ymd() ? 'now' : 'in ' + Math.max(1, Math.round((new Date(addDays(coach().last, 7)) - new Date(ymd())) / 864e5)) + ' days'}` : ' · loose weekly targets'));
}

