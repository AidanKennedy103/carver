// 5/3/1: four plans (squat, bench, deadlift, press) whose weights come from a
// training max of about 90% of your one-rep max. Each four-week cycle goes
// 5s, 3s, 5/3/1, then an easy deload week; after it the training max goes up
// (5 lb on bench and press, 10 lb on squat and deadlift). The last set of each
// week is "as many reps as you can". Carver rewrites the plans' sets each week.

import { h, fill, sheet, toast, confirmBox } from './ui.js';
import { state, commit, uid, e1rmHistory, exercise, toDisplay, fromDisplay, unit, LB_PER_KG, MAX_PLANS } from './store.js';

export const LIFTS = [
  { k: 'squat', exId: 'squat', name: 'Squat', step: 10 },
  { k: 'bench', exId: 'bench', name: 'Bench', step: 5 },
  { k: 'deadlift', exId: 'deadlift', name: 'Deadlift', step: 10 },
  { k: 'press', exId: 'ohp', name: 'Press', step: 5 },
];
// [percent of training max, reps] for the three work sets; the last one is "or more" (except deload)
const WEEKS = [
  { name: '5s week', sets: [[0.65, 5], [0.75, 5], [0.85, 5]], plus: true },
  { name: '3s week', sets: [[0.70, 3], [0.80, 3], [0.90, 3]], plus: true },
  { name: '5/3/1 week', sets: [[0.75, 5], [0.85, 3], [0.95, 1]], plus: true },
  { name: 'Deload week', sets: [[0.40, 5], [0.50, 5], [0.60, 5]], plus: false },
];
const WARMUP = [[0.40, 5], [0.50, 5], [0.60, 3]];

export const program = () => (state.program?.kind === '531' ? state.program : null);

/** Round to plates: 5 lb or 2.5 kg, in kg. */
const plate = (kg) => (unit() === 'lb' ? (Math.round((kg * LB_PER_KG) / 5) * 5) / LB_PER_KG : Math.round(kg / 2.5) * 2.5);
const set = (type, kg, reps) => ({ id: uid(), type, weight: Math.round(plate(kg) * 100) / 100, reps, secs: null, done: false });

/** The main lift's (and optional 5×10's) sets for this week. */
function liftExercises(p, lift) {
  const tm = p.tm[lift.k], wk = WEEKS[p.week - 1];
  const main = {
    exId: lift.exId, prog: 'main', rest: 180,
    note: wk.plus ? `${wk.name}, cycle ${p.cycle}. Last set: as many good reps as you can (at least ${wk.sets[2][1]}).` : `${wk.name}, cycle ${p.cycle}. Keep it easy.`,
    sets: [...(wk.plus ? WARMUP.map(([pc, r]) => set('w', tm * pc, r)) : []), ...wk.sets.map(([pc, r]) => set('n', tm * pc, r))],
  };
  const extra = p.extra && wk.plus ? { exId: lift.exId, prog: 'extra', rest: 90, note: '5 sets of 10 at half your training max.', sets: Array.from({ length: 5 }, () => set('n', tm * 0.5, 10)) } : null;
  return [main, extra].filter(Boolean);
}

/** Write this week's numbers into the four plans, keeping any exercises you added. */
function applyWeek(s) {
  const p = s.program;
  for (const lift of LIFTS) {
    const plan = s.plans.find((x) => x.id === p.plans[lift.k]);
    if (!plan) continue;
    const mine = plan.exercises.filter((e) => !e.prog);
    plan.exercises = [...liftExercises(p, lift), ...mine];
    plan.updated = Date.now();
  }
}

/** Plans of the program still in your list. */
const planIds = (p) => LIFTS.map((l) => p.plans[l.k]).filter((id) => state.plans.some((x) => x.id === id));

/** Which of this week's days are done (workouts from the plans since the week started). */
function doneThisWeek(p) {
  const ids = new Set(planIds(p));
  return new Set(state.workouts.filter((w) => w.start >= p.since && ids.has(w.planId)).map((w) => w.planId));
}

function nextWeek() {
  commit((s) => {
    const p = s.program;
    if (p.week === 4) {
      p.week = 1; p.cycle++;
      for (const l of LIFTS) p.tm[l.k] += unit() === 'lb' ? l.step / LB_PER_KG : l.step / 2;   // 5/10 lb or 2.5/5 kg
    } else p.week++;
    p.since = Date.now();
    applyWeek(s);
  });
  const p = program();
  toast(p.week === 1 ? `Cycle ${p.cycle}: training maxes went up` : `${WEEKS[p.week - 1].name} is set`);
}

/** The card on the Workout tab while the program runs. */
export function programCard() {
  const p = program();
  if (!p) return null;
  const ids = planIds(p);
  if (!ids.length) return null;
  const done = doneThisWeek(p);
  const all = ids.every((id) => done.has(id));
  return h('section.card.prog-card',
    h('div.prog-head',
      h('div', h('div.hero-label', '5/3/1'), h('div.prog-week', `Week ${p.week} of 4 · ${WEEKS[p.week - 1].name}`)),
      h('button.link', { onclick: setup531 }, 'Maxes')),
    h('div.prog-days', LIFTS.filter((l) => ids.includes(p.plans[l.k])).map((l) =>
      h('span.chip.small' + (done.has(p.plans[l.k]) ? '.on' : ''), (done.has(p.plans[l.k]) ? '✓ ' : '') + l.name))),
    h('div.prog-tm', LIFTS.map((l) => `${l.name} ${toDisplay(p.tm[l.k])}`).join(' · ') + ` ${unit()} training max`),
    all ? h('button.btn.gold.wide', { onclick: nextWeek }, p.week === 4 ? `Start cycle ${p.cycle + 1}` : `Start week ${p.week + 1}`)
      : h('button.link.prog-skip', { onclick: async () => { if (await confirmBox('Move on to next week?', 'The plans switch to next week’s weights now.', { ok: 'Next week' })) nextWeek(); } }, 'Skip to next week'));
}

/** Set up (or change the maxes of) the program. */
export function setup531() {
  const p = program();
  const best = (exId) => {
    const since = Date.now() - 180 * 864e5;
    return Math.max(0, ...e1rmHistory(exId).filter((x) => x.x >= since).map((x) => x.y));
  };
  const inputs = {};
  const rows = LIFTS.map((l) => {
    const tm = p ? p.tm[l.k] : best(l.exId) * 0.9;
    inputs[l.k] = h('input.field.goal-input', { value: tm ? toDisplay(plate(tm)) : '', inputmode: 'decimal', placeholder: '0', 'aria-label': `${l.name} training max` });
    return h('label.goal-row', h('span', exercise(l.exId).name), h('span.goal-field', inputs[l.k], h('span.goal-unit', unit())));
  });
  let extra = p ? p.extra : true;
  const extraBtn = h('div.segment');
  const drawExtra = () => fill(extraBtn, [[true, 'Add 5×10'], [false, 'Main lift only']].map(([v, l]) => h('button' + (extra === v ? '.on' : ''), { onclick: () => { extra = v; drawExtra(); } }, l)));
  drawExtra();

  async function go() {
    const tm = {};
    for (const l of LIFTS) {
      const kg = fromDisplay(inputs[l.k].value);
      if (!kg) { toast(`Add a training max for ${l.name.toLowerCase()}`); return; }
      tm[l.k] = kg;
    }
    if (p) {
      commit((s) => { Object.assign(s.program, { tm, extra }); applyWeek(s); });
      s.close(); toast('5/3/1 updated'); return;
    }
    const others = state.plans.length;
    if (others + LIFTS.length > MAX_PLANS) {
      if (!(await confirmBox('Make room for 5/3/1?', `It uses ${LIFTS.length} of your ${MAX_PLANS} plans. Your current plans will be removed (your workouts stay in History).`, { ok: 'Replace plans', danger: true }))) return;
    }
    commit((st) => {
      if (others + LIFTS.length > MAX_PLANS) st.plans = [];
      const plans = {};
      for (const l of LIFTS) {
        const plan = { id: uid(), name: `5/3/1 ${l.name}`, created: Date.now(), exercises: [] };
        st.plans.push(plan); plans[l.k] = plan.id;
      }
      st.program = { kind: '531', tm, extra, week: 1, cycle: 1, since: Date.now(), plans };
      applyWeek(st);
    });
    s.close();
    toast('5/3/1 is set: four plans, week 1');
  }

  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', '5/3/1'), h('button.link.strong', { onclick: go }, p ? 'Save' : 'Start')),
    h('p.fine', 'Four days: squat, bench, deadlift and press. Each lift works off a training max, about 90% of your one-rep max. Weeks go 5s, 3s, then 5/3/1, then an easy deload; after that your maxes go up and the next cycle starts.'),
    h('label.form-label', 'Training maxes'),
    h('div.group', rows),
    h('p.fine', p ? 'Changing these rewrites this week’s weights.' : 'Filled in from your lifts in the last 6 months (90% of your estimated max). Blank means Carver has none yet: enter about 90% of what you could lift once.'),
    h('label.form-label', 'After the main lift'), extraBtn,
    h('p.fine', '5 sets of 10 at half the training max builds size. Add any other exercises to the plans yourself; Carver keeps them when the weeks change.'),
    p ? h('div.group', h('button.group-row.danger', {
      onclick: async () => {
        if (!(await confirmBox('Stop 5/3/1?', 'The plans stay as they are now; Carver just stops changing them each week.', { ok: 'Stop', danger: true }))) return;
        commit((st) => { st.program = null; }); s.close();
      },
    }, h('span', 'Stop the program'))) : null,
  ));
}
