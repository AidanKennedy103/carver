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

import { h, fill, navBar, toast, fmtNum, push } from './ui.js';
import { state, commit, ymd, addDays, foodAim, bodyDisplay, bodyUnit, daySkipped } from './store.js';
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

/** This week's suggestion: { kcal, lo, hi, protein, change, reason, hold, ... } */
export function suggestion() {
  const aim = foodAim(), c = coach();
  const pace = (PACES[aim].find((p) => p[0] === c.pace) || PACES[aim][0]);
  const kg = latestWeight()?.kg;
  const cur = state.goals.kcal;
  const m = metabolism(28);
  const week = loggedWeek();
  const rate = weeklyRate();
  const floor = Math.max(1200, round50((kg || 70) * 18));
  const protein = kg ? Math.round(kg * (aim === 'cut' ? 2 : 1.8) / 5) * 5 : state.goals.p;
  const base = { aim, pace, kg, cur, m, week, rate, floor, protein };

  if (!kg) return { ...base, hold: 'Log your weight a few times a week so the coach can see your trend.' };
  if (!m.ready) return { ...base, hold: `Still learning: ${[m.need.food ? `${m.need.food} more day${m.need.food === 1 ? '' : 's'} of food` : null, m.need.weigh ? `${m.need.weigh} more weigh-in${m.need.weigh === 1 ? '' : 's'}` : null, m.need.spread ? `${m.need.spread} more day${m.need.spread === 1 ? '' : 's'} between weigh-ins` : null].filter(Boolean).join(', ')}. Until then, keep your current target.` };

  const margin = m.confidence === 'High' ? 100 : m.confidence === 'Medium' ? 200 : 300;
  const goalRate = aim === 'cut' ? -pace[2] * kg : pace[2] * kg;   // kg a week
  let ideal = m.tdee + (goalRate * KCAL_PER_KG) / 7;
  let reason = aim === 'maintain' ? 'Matches your estimated maintenance.' : `Maintenance ${fmtNum(round50(m.tdee))} ${aim === 'cut' ? '−' : '+'} ${fmtNum(Math.abs(round50((goalRate * KCAL_PER_KG) / 7)))} for your pace.`;
  // Losing faster than 1% a week (or much faster than planned): eat more, whatever the log says
  if (rate != null && aim !== 'build' && rate < -Math.max(0.01 * kg, Math.abs(goalRate) * 1.5)) { ideal = Math.max(ideal, cur + 150); reason = 'You’re losing faster than planned, so the coach is adding food to protect muscle.'; }
  if (week.full < 4) return { ...base, hold: `Only ${week.full} fully logged day${week.full === 1 ? '' : 's'} this week. The coach needs 4 to suggest a change, so keep your target for now.` };
  const step = m.confidence === 'Low' ? 100 : 150;
  let kcal = round50(Math.min(cur + step, Math.max(cur - step, ideal)));
  let floored = false;
  if (kcal < floor) { kcal = floor; floored = true; }
  return { ...base, kcal, lo: round50(kcal - margin / 2), hi: round50(kcal + margin / 2), change: kcal - cur, ideal: round50(ideal), reason, floored, margin };
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

export function dietCoachScreen() {
  const el = h('div.page');
  const body = h('div.scroll-body');
  function draw() {
    const s = suggestion(), aim = s.aim, c = coach();
    const L = (kg) => `${kg > 0 ? '+' : kg < 0 ? '−' : ''}${bodyDisplay(Math.abs(kg))} ${bodyUnit()}`;
    fill(body,
      navBar({ title: 'Diet coach', backLabel: 'Nutrition' }),
      h('p.coach-intro', 'A weekly guide for calories and protein. Loose on purpose: it reads your scale as well as your log.'),

      h('label.form-label', 'Goal'),
      h('div.segment', AIMS.map(([v, l]) => h('button' + (aim === v ? '.on' : ''), { onclick: () => { commit((st) => { st.goals.aim = v; st.goals.coach = { ...(st.goals.coach || {}), pace: PACES[v][0][0] }; }); } }, l))),
      PACES[aim].length > 1 ? [h('label.form-label', 'Pace'),
        h('div.segment', PACES[aim].map(([v, l]) => h('button' + (s.pace[0] === v ? '.on' : ''), { onclick: () => commit((st) => { st.goals.coach = { ...(st.goals.coach || {}), pace: v }; }) }, l))),
        h('p.fine', s.pace[3])] : null,

      h('section.card.dc-card',
        h('div.dc-label', c.last ? `Last check-in ${c.last === ymd() ? 'today' : c.last}` : 'This week'),
        s.hold ? [h('div.dc-hold', s.hold), h('div.dc-now', `Current target: ${fmtNum(s.cur)} kcal · ${state.goals.p} g protein`)]
          : [
            h('div.dc-big', h('b', `${fmtNum(s.lo)}–${fmtNum(s.hi)}`), h('span', ' kcal a day')),
            h('div.dc-sub', `Protein about ${s.protein} g`, h('span.muted', ` · now ${fmtNum(s.cur)} kcal${s.change ? ` (${s.change > 0 ? '+' : '−'}${fmtNum(Math.abs(s.change))})` : ', no change'}`)),
            h('p.dc-why', s.reason, s.floored ? ' It won’t go lower than this.' : '', s.ideal !== s.kcal && !s.floored ? ` Moving there gradually (${s.m.confidence === 'Low' ? 100 : 150} kcal a week).` : ''),
            h('button.btn.gold.wide', { onclick: () => { apply(s); draw(); } }, s.change ? 'Use these targets' : 'Keep these targets'),
          ]),

      h('div.section-head', h('h2.section-title', 'What it sees')),
      h('section.card.list-card',
        h('div.group-row', h('span', 'Weight trend'), h('span.row-val', s.rate != null ? `${L(s.rate)} a week` : 'needs more weigh-ins')),
        h('div.group-row', h('span', 'Maintenance'), h('span.row-val', s.m.ready ? `about ${fmtNum(round50(s.m.tdee))} kcal · ${s.m.confidence.toLowerCase()} confidence` : 'still learning')),
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

