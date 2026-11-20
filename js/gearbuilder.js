// "My equipment": tick what you have, and Carver builds two full-body days from it.
// Everything starts from bodyweight; each piece of gear unlocks better options
// (a pull-up bar → pull-ups, dumbbells → goblet squats and rows, a bench → presses…).

import { h, fill, navBar, toast, icon, pop } from './ui.js';
import { state, commit, uid, exercise, savePlan, MAX_PLANS } from './store.js';
import { startWorkout } from './session.js';
import { howTo } from './howto.js';

export const GEAR = [
  ['bar', 'Pull-up bar'], ['db', 'Dumbbells'], ['bench', 'Bench'], ['kb', 'Kettlebell'],
  ['band', 'Bands'], ['barbell', 'Barbell & rack'], ['cable', 'Cable machine'], ['machine', 'Gym machines'],
];

// For each slot, the best option first; each needs all the gear listed (none = bodyweight)
const SLOTS = {
  squat: [['squat', 'barbell'], ['leg-press', 'machine'], ['goblet-squat', 'db'], ['goblet-squat', 'kb'], ['bw-squat']],
  single: [['bss', 'db'], ['reverse-lunge', 'db'], ['bw-lunge']],
  hpush: [['bench', 'barbell', 'bench'], ['db-bench', 'db', 'bench'], ['chest-press', 'machine'], ['pushup']],
  vpush: [['ohp', 'barbell'], ['db-shoulder', 'db'], ['shoulder-press-m', 'machine'], ['pike-pushup']],
  vpull: [['pullup', 'bar'], ['lat-pulldown', 'cable'], ['inverted-row']],
  hpull: [['db-row', 'db'], ['seated-row', 'cable'], ['chest-row', 'machine'], ['bb-row', 'barbell'], ['inverted-row']],
  hinge: [['rdl', 'barbell'], ['db-rdl', 'db'], ['kb-swing', 'kb'], ['glute-bridge']],
  glute: [['hip-thrust', 'barbell', 'bench'], ['sl-rdl', 'db'], ['sl-glute-bridge']],
  core: [['hanging-knee-raise', 'bar'], ['plank']],
  core2: [['dead-bug']],
  arms: [['db-curl', 'db'], ['band-pushdown', 'band'], ['tri-pushdown', 'cable']],
};
const DAYS = [['Day A', ['squat', 'hpush', 'vpull', 'hinge', 'core']], ['Day B', ['single', 'vpush', 'hpull', 'glute', 'core2', 'arms']]];

const pick = (slot, have) => SLOTS[slot].find(([, ...need]) => need.every((g) => have.has(g)))?.[0] || null;
/** Two days of [{ exId, sets, lo, hi }] for the gear you have. */
export function buildDays(gear) {
  const have = new Set(gear);
  return DAYS.map(([name, slots]) => ({
    name, ex: slots.map((s) => pick(s, have)).filter(Boolean).filter((id, i, a) => a.indexOf(id) === i).map((exId) => {
      const t = exercise(exId).type;
      return { exId, sets: 3, lo: t === 'time' ? 0 : 8, hi: t === 'time' ? 0 : t === 'bw' ? 15 : 12 };
    }),
  }));
}

const toPlan = (d, label) => ({
  id: uid(), name: label, created: Date.now(),
  exercises: d.ex.map((e) => ({ exId: e.exId, note: e.lo ? `${e.lo}–${e.hi} reps` : '', rest: 75,
    sets: Array.from({ length: e.sets }, () => ({ id: uid(), type: 'n', tReps: e.lo || null, tSecs: e.lo ? null : 40 })) })),
});

export function gearScreen() {
  const el = h('div.page');
  const body = h('div.scroll-body');
  const gear = new Set(state.settings.gear || []);
  function draw() {
    const days = buildDays([...gear]);
    fill(body,
      navBar({ title: 'My equipment', backLabel: 'Programs' }),
      h('p.coach-intro', 'Tick what you have. Everything starts from bodyweight; each piece of gear swaps in a better option.'),
      h('div.gear-grid', GEAR.map(([k, l]) => h('button.gear' + (gear.has(k) ? '.on' : ''), {
        onclick: () => { if (gear.has(k)) gear.delete(k); else gear.add(k); commit((s) => { s.settings.gear = [...gear]; }); draw(); },
      }, h('span.gear-check', gear.has(k) ? icon('check', 14) : null), l))),
      h('div.section-head', h('h2.section-title', 'Your workout'), h('span.section-count', '3 days a week, A and B in turn')),
      days.map((d) => h('section.card.coach-day',
        h('div.coach-day-name', d.name),
        d.ex.map((e) => h('button.coach-ex.gear-ex', { onclick: () => howTo(e.exId) },
          h('span', exercise(e.exId).name),
          h('span.coach-ex-v', e.lo ? `${e.sets} × ${e.lo}–${e.hi}` : `${e.sets} × 40 s`))))),
      h('button.btn.gold.wide.coach-go', { onclick: save }, 'Save as 2 plans'),
      h('button.btn.dark.wide', { onclick: () => startWorkout(toPlan(days[0], `${label()} A`)) }, icon('play', 16), 'Just start Day A'),
      h('p.fine.center', 'Saved plans land in Your plans, where you can change anything.'),
      h('div.bottom-space'));
  }
  const label = () => (gear.size ? 'Home' : 'Bodyweight');
  function save() {
    if (state.plans.length + 2 > MAX_PLANS) { toast(`You can keep ${MAX_PLANS} plans. Delete two to make room.`); return; }
    const days = buildDays([...gear]);
    savePlan(toPlan(days[0], `${label()} A`));
    savePlan(toPlan(days[1], `${label()} B`));
    toast('Saved to Your plans');
    pop();
  }
  draw();
  el.append(body);
  return { el };
}
