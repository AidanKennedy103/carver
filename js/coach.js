// Coach: ready-made programs. Pick one and Carver writes its plans, then moves
// the weights up as you get stronger.
//
// How the weights move ("double progression"): each exercise has a rep range,
// like 8–12. When every working set reaches the top of the range, the next
// workout adds weight (5 lb on upper-body lifts, 10 lb on lower body; 2.5 / 5 kg)
// and drops back to the bottom of the range. Otherwise it keeps the weight you
// used. Miss the bottom of the range three times in a row and it eases off 10%.
// 5/3/1 has its own rules (program531.js).

import { h, fill, sheet, toast, confirmBox, navBar, fmtDate } from './ui.js';
import { state, commit, uid, exercise, e1rmHistory, toDisplay, unit, LB_PER_KG, MAX_PLANS } from './store.js';
import { program as program531, programCard, setup531 } from './program531.js';
import { goalsButton } from './goals.js';
import { startWorkout } from './session.js';

// [exId, sets, low reps, high reps] — time/bodyweight lifts keep their sets and just log
const E = (exId, sets, lo, hi = lo) => ({ exId, sets, lo, hi });

export const PROGRAMS = [
  {
    id: 'fb3', name: 'Full Body 3×', days: 3, level: 'Beginner', emoji: '🌱',
    about: 'Three full-body days a week on the big lifts, alternating A and B. Simple, fast progress for your first year of lifting.',
    plans: [
      { name: 'Full Body A', ex: [E('squat', 3, 5), E('bench', 3, 5), E('bb-row', 3, 8, 10), E('plank', 3, 0)] },
      { name: 'Full Body B', ex: [E('squat', 3, 5), E('ohp', 3, 5), E('deadlift', 1, 5), E('lat-pulldown', 3, 8, 12), E('hanging-knee-raise', 3, 10, 15)] },
    ],
  },
  {
    id: 'ul4', name: 'Upper / Lower', days: 4, level: 'Intermediate', emoji: '⚖️',
    about: 'Four days: two upper, two lower. One heavier day and one higher-rep day for each, so every muscle gets hit twice a week.',
    plans: [
      { name: 'Upper A', ex: [E('bench', 4, 6, 8), E('bb-row', 4, 6, 8), E('ohp', 3, 8, 10), E('lat-pulldown', 3, 10, 12), E('db-curl', 2, 10, 12), E('tri-pushdown', 2, 10, 12)] },
      { name: 'Lower A', ex: [E('squat', 4, 6, 8), E('rdl', 3, 8, 10), E('leg-ext', 3, 10, 12), E('seated-curl', 3, 10, 12), E('calf-raise', 3, 10, 15)] },
      { name: 'Upper B', ex: [E('db-incline', 3, 8, 10), E('chest-row', 3, 8, 10), E('db-shoulder', 3, 10, 12), E('cable-fly', 2, 12, 15), E('lat-raise', 3, 12, 15), E('hammer-curl', 2, 10, 12), E('rope-pushdown', 2, 10, 12)] },
      { name: 'Lower B', ex: [E('deadlift', 3, 5), E('bss', 3, 8, 10), E('leg-press', 3, 10, 12), E('lying-curl', 3, 10, 12), E('hip-thrust', 3, 8, 12), E('seated-calf', 3, 12, 15)] },
    ],
  },
  {
    id: 'ppl', name: 'Push Pull Legs', days: 6, level: 'Intermediate', emoji: '🔁',
    about: 'Push (chest, shoulders, triceps), pull (back, biceps), legs. Run it twice a week for six days, or once through for three.',
    plans: [
      { name: 'Push', ex: [E('bench', 3, 6, 8), E('db-incline', 3, 8, 12), E('db-shoulder', 3, 8, 12), E('lat-raise', 3, 12, 15), E('tri-pushdown', 3, 10, 12), E('oh-tri-ext', 2, 10, 12)] },
      { name: 'Pull', ex: [E('bb-row', 3, 6, 8), E('lat-pulldown', 3, 8, 12), E('seated-row', 3, 10, 12), E('face-pull', 3, 12, 15), E('db-curl', 3, 10, 12), E('hammer-curl', 2, 10, 12)] },
      { name: 'Legs', ex: [E('squat', 3, 6, 8), E('rdl', 3, 8, 10), E('leg-press', 3, 10, 12), E('lying-curl', 3, 10, 12), E('hip-adduction', 2, 12, 15), E('calf-raise', 4, 10, 15)] },
    ],
  },
  {
    id: 'db3', name: 'Dumbbells Only', days: 3, level: 'Any level', emoji: '🏠',
    about: 'Three full-body days that only need a pair of dumbbells and a bench. Good for a home gym or a busy hotel gym.',
    plans: [
      { name: 'Dumbbell A', ex: [E('db-bench', 3, 8, 12), E('db-row', 3, 8, 12), E('goblet-squat', 3, 10, 15), E('db-rdl', 3, 8, 12), E('lat-raise', 2, 12, 15), E('db-curl', 2, 10, 12)] },
      { name: 'Dumbbell B', ex: [E('db-incline', 3, 8, 12), E('db-shoulder', 3, 8, 12), E('bss', 3, 8, 12), E('sl-rdl', 3, 8, 12), E('rear-delt-fly', 2, 12, 15), E('kickback', 2, 10, 12)] },
    ],
  },
];
const LOWER = new Set(['Quads', 'Hamstrings', 'Glutes', 'Adductors', 'Abductors', 'Lower back']);

export const coachProgram = () => (state.program?.kind === 'coach' ? state.program : null);
const template = (id) => PROGRAMS.find((p) => p.id === id);

/** Round to what you can load: 5 lb or 2.5 kg (stored in kg). */
const plate = (kg) => (unit() === 'lb' ? (Math.round((kg * LB_PER_KG) / 5) * 5) / LB_PER_KG : Math.round(kg / 2.5) * 2.5);
/** How much to add: 5 / 10 lb, 2.5 / 5 kg (halved for dumbbells, since that's per hand). */
function stepKg(exId) {
  const ex = exercise(exId);
  const big = LOWER.has(ex.muscle) && ex.equipment !== 'Dumbbell';
  return unit() === 'lb' ? (big ? 10 : 5) / LB_PER_KG : big ? 5 : 2.5;
}

/** A first weight from your history: what you could do for the top of the range, with a rep or two to spare. */
function startWeight(exId, reps) {
  const since = Date.now() - 180 * 864e5;
  const best = Math.max(0, ...e1rmHistory(exId).filter((x) => x.x >= since).map((x) => x.y));
  if (!best) return null;
  return plate((best / (1 + Math.min(reps + 2, 12) / 30)) * 0.95);
}

function planFrom(t, p) {
  return {
    id: uid(), name: p.name, created: Date.now(), coach: t.id,
    exercises: p.ex.map((e) => {
      const info = exercise(e.exId);
      const w = info.type === 'wr' ? startWeight(e.exId, e.hi) : null;
      return {
        exId: e.exId, note: e.lo !== e.hi ? `${e.lo}–${e.hi} reps. Hit ${e.hi} on every set and Carver adds weight next time.` : e.lo ? `${e.lo} reps. Get them all and Carver adds weight next time.` : '',
        rest: info.type === 'wr' ? (e.hi <= 6 ? 180 : 120) : 60, rng: e.lo ? [e.lo, e.hi] : null,
        sets: Array.from({ length: e.sets }, () => ({ id: uid(), type: 'n', tWeight: w, tReps: info.type === 'time' ? null : e.lo || null, tSecs: info.type === 'time' ? 45 : null })),
      };
    }),
  };
}

async function startProgram(t) {
  if (program531() || coachProgram()) {
    if (!(await confirmBox('Switch programs?', 'Your current program stops. Its plans stay in Your plans unless they need the room.', { ok: 'Switch' }))) return;
  }
  const keep = state.plans.filter((p) => !p.coach);
  let replace = false;
  if (keep.length + t.plans.length > MAX_PLANS) {
    if (!(await confirmBox('Make room?', `${t.name} uses ${t.plans.length} plans and you have ${keep.length} of your own (${MAX_PLANS} fit). Your plans will be removed; your workouts stay in History.`, { ok: 'Replace plans', danger: true }))) return;
    replace = true;
  }
  const plans = t.plans.map((p) => planFrom(t, p));
  commit((s) => {
    s.plans = [...(replace ? [] : s.plans.filter((p) => !p.coach)), ...plans];
    s.program = { kind: 'coach', id: t.id, since: Date.now(), plans: plans.map((p) => p.id), log: [] };
    s.goals.workoutsPerWeek = t.days;
    s.settings.program = { ...(s.settings.program || {}), ...Object.fromEntries(plans.map((p) => [p.id, t.days / t.plans.length >= 2 ? 2 : 1])) };
  });
  toast(`${t.name} is set: ${t.plans.length} plans, ${t.days} days a week`);
}

/**
 * After a workout: move the weights of the plan it came from.
 * Returns what changed, for the summary: [{ exId, from, to, kind: 'up'|'down' }].
 */
export function progressAfter(w) {
  const prog = coachProgram();
  if (!prog || !w.planId || !prog.plans.includes(w.planId)) return [];
  const changes = [];
  commit((s) => {
    const plan = s.plans.find((p) => p.id === w.planId);
    if (!plan) return;
    for (const pe of plan.exercises) {
      if (!pe.rng || exercise(pe.exId).type !== 'wr') continue;
      const done = w.exercises.find((e) => e.exId === pe.exId)?.sets.filter((x) => x.done && x.type !== 'w') || [];
      if (!done.length) continue;
      const [lo, hi] = pe.rng;
      const used = Math.max(...done.map((x) => x.weight || 0));
      const top = done.filter((x) => (x.weight || 0) >= used - 1e-6);
      const before = pe.sets.find((x) => x.type !== 'w')?.tWeight ?? null;
      let next = used, reps = null;
      if (done.length >= pe.sets.filter((x) => x.type !== 'w').length && top.every((x) => (x.reps || 0) >= hi)) {
        next = plate(used + stepKg(pe.exId)); reps = lo; pe.stall = 0;
      } else if (done.every((x) => (x.reps || 0) < lo)) {
        pe.stall = (pe.stall || 0) + 1;
        if (pe.stall >= 3) { next = plate(used * 0.9); reps = lo; pe.stall = 0; }
      } else pe.stall = 0;
      for (const x of pe.sets) if (x.type !== 'w') { x.tWeight = next; if (reps) x.tReps = reps; delete x.weight; delete x.reps; }
      if (before == null || Math.abs(next - before) > 0.01) {
        const c = { exId: pe.exId, from: before, to: next, kind: before != null && next < before ? 'down' : 'up', ts: Date.now() };
        if (before != null) { changes.push(c); s.program.log = [c, ...(s.program.log || [])].slice(0, 40); }
      }
    }
    plan.updated = Date.now();
  });
  return changes;
}

// ---------- The Coach tab ----------

export function coachPage() {
  const el = h('div.page');
  const body = h('div.scroll-body');
  function draw() {
    const cp = coachProgram(), t = cp && template(cp.id), p531 = program531();
    const plans = cp ? state.plans.filter((p) => cp.plans.includes(p.id)) : [];
    const done = cp ? state.workouts.filter((w) => w.start >= cp.since && cp.plans.includes(w.planId)).length : 0;
    const weeks = cp ? Math.floor((Date.now() - cp.since) / (7 * 864e5)) + 1 : 0;
    const fmtW = (kg) => `${toDisplay(kg)} ${unit()}`;
    fill(body,
      navBar({ title: 'Coach', back: false, large: true, right: [goalsButton('workout')] }),
      cp && t ? [
        h('section.card.hero',
          h('div.hero-label', 'Your program'),
          h('div.hero-name', `${t.emoji} ${t.name}`),
          h('div.hero-meta', `Week ${weeks} · ${done} workout${done === 1 ? '' : 's'} done · ${t.days} days a week`),
          h('div.chips.tight.static', plans.map((p) => h('span.chip', p.name))),
          plans[0] ? h('button.btn.gold.wide.hero-go', { onclick: () => { const last = state.workouts.find((w) => cp.plans.includes(w.planId)); const i = last ? plans.findIndex((p) => p.id === last.planId) : -1; startWorkout(plans[(i + 1) % plans.length]); } }, 'Start next workout') : null),
        h('div.section-head', h('h2.section-title', 'Weights going up')),
        (cp.log || []).length
          ? h('section.card.list-card', cp.log.slice(0, 8).map((c) => h('div.group-row.coach-log',
            h('span', `${c.kind === 'up' ? '📈' : '↘️'} ${exercise(c.exId).name}`),
            h('span.row-val', `${fmtW(c.from)} → ${fmtW(c.to)} · ${fmtDate(c.ts, { month: 'short', day: 'numeric' })}`))))
          : h('div.feed-empty.card', 'Hit the top of an exercise’s rep range on every set and its weight goes up next time. Changes show here.'),
        h('p.fine', 'Each exercise’s note says its rep range. The first time, pick a weight you can do for the bottom of the range with a couple of reps to spare; Carver fills in what it can from your history.'),
        h('button.btn.dark.wide', { onclick: async () => { if (await confirmBox(`Stop ${t.name}?`, 'The plans stay in Your plans; Carver just stops changing the weights.', { ok: 'Stop', danger: true })) commit((s) => { s.program = null; }); } }, 'Stop program'),
      ] : p531 ? [
        h('div.section-head', h('h2.section-title', 'Your program')),
        programCard(),
      ] : h('p.coach-intro', 'Pick a program and Carver writes the plans, puts them in order, and adds weight when you’ve earned it. You can still edit any plan.'),

      h('div.section-head', h('h2.section-title', cp || p531 ? 'Other programs' : 'Programs')),
      [...PROGRAMS.filter((x) => x.id !== cp?.id).map((x) => h('button.card.coach-card', { onclick: () => programSheet(x) },
        h('div.coach-top', h('span.coach-emoji', x.emoji), h('div', h('div.coach-name', x.name), h('div.coach-meta', `${x.days} days a week · ${x.level}`)), h('span.card-go', '›')),
        h('div.coach-about', x.about))),
      p531 ? null : h('button.card.coach-card', { onclick: setup531 },
        h('div.coach-top', h('span.coach-emoji', '📐'), h('div', h('div.coach-name', '5/3/1'), h('div.coach-meta', '4 days a week · Strength')), h('span.card-go', '›')),
        h('div.coach-about', 'Jim Wendler’s classic: squat, bench, deadlift and press off a training max, with a new top set to beat every week.'))],
      h('div.bottom-space'),
    );
  }
  draw();
  el.append(body);
  return { el, refresh: draw };
}

function programSheet(t) {
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', t.name), h('span')),
    h('p.fine', t.about),
    t.plans.map((p) => h('section.card.coach-plan',
      h('div.coach-plan-name', p.name),
      p.ex.map((e) => h('div.coach-ex', h('span', exercise(e.exId).name), h('span.row-val', exercise(e.exId).type === 'time' ? `${e.sets} sets` : `${e.sets} × ${e.lo === e.hi ? e.lo : `${e.lo}–${e.hi}`}`))))),
    h('p.fine', `Sets your goal to ${t.days} workouts a week. Weights start from your history where Carver has it.`),
    h('button.btn.gold.wide', { onclick: () => { s.close(); startProgram(t); } }, `Start ${t.name}`)));
}
