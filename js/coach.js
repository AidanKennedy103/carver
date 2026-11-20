// Coach: ready-made programs, run either ongoing or as a training block.
//
// Ongoing: "double progression". Each exercise has a rep range; hit the top of
// it on every set and the next workout adds weight (5 lb upper body, 10 lb
// lower; 2.5 / 5 kg), otherwise it keeps the weight. Miss the bottom of the
// range three times in a row and it eases off 10%.
//
// Block (8, 12 or 16 weeks): the main lifts follow a plan worked out ahead of
// time from a training max (90% of your estimated one-rep max). Every 4 weeks
// is a phase: three working weeks that get a little heavier each week, then an
// easy deload week. Phases go Build → Strength → Heavy → Peak, and the last
// week of the block is a test week: one all-out set that measures your new max.
// Accessories use double progression with a rep range that suits the phase.
// Miss the target reps on a main lift two workouts in a row and its training
// max drops 5% so the plan stays doable.
//
// state.program = { kind: 'coach', id, mode: 'ongoing'|'block', weeks, start (Monday),
//   tm: { exId: kg }, tm0, applied, miss, result, plans: [ids], log: [] }

import { h, fill, push, pop, sheet, toast, confirmBox, navBar, fmtDate, icon } from './ui.js';
import { state, commit, uid, exercise, e1rm, e1rmHistory, toDisplay, fromDisplay, unit, LB_PER_KG, MAX_PLANS, weekStart } from './store.js';
import { program as program531, programCard, setup531 } from './program531.js';
import { goalsButton } from './goals.js';
import { startWorkout } from './session.js';
import { planEditor, lastDone } from './workout.js';
import { pickExercises } from './picker.js';

// [exId, sets, low reps, high reps]; M() marks a main lift (follows the block's plan)
const E = (exId, sets, lo, hi = lo) => ({ exId, sets, lo, hi });
const M = (exId, sets, lo, hi = lo) => ({ ...E(exId, sets, lo, hi), main: true });

export const PROGRAMS = [
  {
    id: 'fb3', name: 'Full Body', days: 3, minutes: '45–60', level: 'Beginner', schedule: 'Mon, Wed, Fri',
    summary: 'Three full-body days a week on the big lifts, alternating A and B.',
    pros: ['Every muscle trained every session: the fastest way to learn the lifts and get stronger', 'A short list of exercises that’s easy to run', 'Miss a day and the next workout still covers everything'],
    cons: ['Little time for arms and shoulder isolation work', 'Squats get tiring as the weights climb', 'Less variety than a split'],
    bestFor: 'Your first year of lifting, or coming back after a break.',
    plans: [
      { name: 'Full Body A', ex: [M('squat', 3, 5), M('bench', 3, 5), E('bb-row', 3, 8, 10), E('plank', 3, 0)] },
      { name: 'Full Body B', ex: [M('ohp', 3, 5), E('db-rdl', 3, 8, 10), E('lat-pulldown', 3, 8, 12), E('lying-curl', 3, 10, 12), E('hanging-knee-raise', 3, 10, 15)] },
    ],
  },
  {
    id: 'ul4', name: 'Upper / Lower', days: 4, minutes: '60', level: 'Intermediate', schedule: 'Mon, Tue, Thu, Fri',
    summary: 'Two upper and two lower days: one heavier and one lighter for each.',
    pros: ['Every muscle twice a week, the sweet spot for building muscle', 'Heavy and lighter days balance strength and size', 'Fits a normal work week'],
    cons: ['Four days a week; missing one throws off the balance', 'Lower days are long and tiring', 'Less arm work than a body-part split'],
    bestFor: 'Lifters past the beginner stage who can train four days a week.',
    plans: [
      { name: 'Upper A', ex: [M('bench', 4, 6, 8), M('bb-row', 4, 6, 8), E('ohp', 3, 8, 10), E('lat-pulldown', 3, 10, 12), E('db-curl', 2, 10, 12), E('tri-pushdown', 2, 10, 12)] },
      { name: 'Lower A', ex: [M('squat', 4, 6, 8), E('rdl', 3, 8, 10), E('leg-ext', 3, 10, 12), E('seated-curl', 3, 10, 12), E('calf-raise', 3, 10, 15)] },
      { name: 'Upper B', ex: [E('db-incline', 3, 8, 10), E('chest-row', 3, 8, 10), E('db-shoulder', 3, 10, 12), E('cable-fly', 2, 12, 15), E('lat-raise', 3, 12, 15), E('hammer-curl', 2, 10, 12), E('rope-pushdown', 2, 10, 12)] },
      { name: 'Lower B', ex: [M('deadlift', 3, 5), E('bss', 3, 8, 10), E('leg-press', 3, 10, 12), E('lying-curl', 3, 10, 12), E('hip-thrust', 3, 8, 12), E('seated-calf', 3, 12, 15)] },
    ],
  },
  {
    id: 'ppl', name: 'Push Pull Legs', days: 6, minutes: '60–75', level: 'Intermediate', schedule: 'Push, pull, legs, repeat; one day off',
    summary: 'Push (chest, shoulders, triceps), pull (back, biceps) and legs. Run it twice a week, or once through for three days.',
    pros: ['Lots of volume for every muscle', 'Each day has one clear focus', 'Works at three or six days a week'],
    cons: ['Six days a week is a big time commitment', 'At three days, each muscle is only trained once a week', 'Needs a full gym'],
    bestFor: 'Experienced lifters who like training most days and want maximum muscle.',
    plans: [
      { name: 'Push', ex: [M('bench', 3, 6, 8), E('db-incline', 3, 8, 12), E('db-shoulder', 3, 8, 12), E('lat-raise', 3, 12, 15), E('tri-pushdown', 3, 10, 12), E('oh-tri-ext', 2, 10, 12)] },
      { name: 'Pull', ex: [M('bb-row', 3, 6, 8), E('lat-pulldown', 3, 8, 12), E('seated-row', 3, 10, 12), E('face-pull', 3, 12, 15), E('db-curl', 3, 10, 12), E('hammer-curl', 2, 10, 12)] },
      { name: 'Legs', ex: [M('squat', 3, 6, 8), E('rdl', 3, 8, 10), E('leg-press', 3, 10, 12), E('lying-curl', 3, 10, 12), E('hip-adduction', 2, 12, 15), E('calf-raise', 4, 10, 15)] },
    ],
  },
  {
    id: 'bw3', name: 'Bodyweight', days: 3, minutes: '30–45', level: 'Any level', schedule: 'Mon, Wed, Fri', ongoingOnly: true,
    summary: 'Three full-body days at home with no equipment. A pull-up bar or a sturdy table helps for pulling.',
    pros: ['Train anywhere, no gym or weights', 'Short sessions that fit a busy day', 'Builds control, endurance and a solid base'],
    cons: ['Legs are hard to keep progressing without weight', 'Pulling needs a bar or a sturdy table', 'Strength builds slower than with weights'],
    bestFor: 'Home training, travel, or getting started.',
    plans: [
      { name: 'Bodyweight A', ex: [E('pushup', 3, 8, 15), E('inverted-row', 3, 6, 12), E('bw-squat', 3, 15, 25), E('glute-bridge', 3, 12, 20), E('plank', 3, 0)] },
      { name: 'Bodyweight B', ex: [E('pike-pushup', 3, 6, 12), E('chinup', 3, 3, 8), E('bw-lunge', 3, 10, 15), E('sl-glute-bridge', 3, 8, 12), E('hollow-hold', 3, 0)] },
    ],
  },
  {
    id: 'min3', name: 'Time-Efficient', days: 3, minutes: '30', level: 'Any level', schedule: 'Mon, Wed, Fri', ongoingOnly: true,
    summary: 'Four big moves, two hard sets each, done in pairs with short rests. Research on minimal training (Iversen et al., 2021) shows this keeps most of the gains in a fraction of the time.',
    pros: ['About 30 minutes, start to finish', 'Two sets taken close to failure build nearly as much as many easy ones', 'Easy to keep up through busy weeks'],
    cons: ['Every set has to be hard to work', 'Little room for arm and shoulder isolation', 'Less total volume than a longer program for advanced lifters'],
    bestFor: 'Busy schedules, or anyone who’d rather train short and often.',
    plans: [
      { name: 'Quick A', ex: [E('leg-press', 2, 8, 12), E('db-bench', 2, 8, 12), E('lat-pulldown', 2, 8, 12), E('lying-curl', 2, 10, 15)] },
      { name: 'Quick B', ex: [E('rdl', 2, 8, 10), E('db-incline', 2, 8, 12), E('seated-row', 2, 8, 12), E('lat-raise', 2, 12, 15)] },
    ],
  },
  {
    id: 'db3', name: 'Dumbbells Only', days: 3, minutes: '45', level: 'Any level', schedule: 'Mon, Wed, Fri',
    summary: 'Three full-body days that only need a pair of dumbbells and a bench.',
    pros: ['Train at home, in a hotel, or in a busy gym', 'Easy on the joints, and each side works on its own', 'Short, simple sessions'],
    cons: ['Legs outgrow heavy dumbbells as you get strong', 'Big lifts are harder to load', 'Strength builds slower than with a barbell'],
    bestFor: 'Home gyms, travel, or anyone who prefers dumbbells.',
    plans: [
      { name: 'Dumbbell A', ex: [M('db-bench', 3, 8, 12), E('db-row', 3, 8, 12), E('goblet-squat', 3, 10, 15), E('db-rdl', 3, 8, 12), E('lat-raise', 2, 12, 15), E('db-curl', 2, 10, 12)] },
      { name: 'Dumbbell B', ex: [M('db-shoulder', 3, 8, 12), E('db-incline', 3, 8, 12), E('bss', 3, 8, 12), E('sl-rdl', 3, 8, 12), E('rear-delt-fly', 2, 12, 15), E('kickback', 2, 10, 12)] },
    ],
  },
];

/** 5/3/1 has its own engine (program531.js); this is its page in the builder. */
export const T531 = {
  id: '531', name: '5/3/1', days: 4, minutes: '45–60', level: 'Intermediate', schedule: 'Mon, Tue, Thu, Fri', ongoingOnly: true,
  summary: 'One main lift a day (squat, bench, deadlift, press) off a training max, plus two assistance moves. Four-week cycles: 5s, 3s, 5/3/1, deload.',
  pros: ['Slow, steady strength gains that keep coming for years', 'The last set is as many reps as you can, so strong days count', 'Short, focused sessions'],
  cons: ['Weights climb slowly by design', 'Less muscle-building volume unless you add the 5×10', 'Built around barbell lifts'],
  bestFor: 'Lifters who know the big four and want long-term strength.',
  lengthText: 'Runs in 4-week cycles with no end date. After each cycle the training maxes go up (5 lb on bench and press, 10 lb on squat and deadlift).',
  plans: [
    { name: 'Squat day', ex: [{ exId: 'squat', v: '5s · 3s · 5/3/1', tag: true }, E('lying-curl', 3, 10), E('hanging-leg-raise', 3, 12)] },
    { name: 'Bench day', ex: [{ exId: 'bench', v: '5s · 3s · 5/3/1', tag: true }, E('db-row', 3, 10), E('tri-pushdown', 3, 12)] },
    { name: 'Deadlift day', ex: [{ exId: 'deadlift', v: '5s · 3s · 5/3/1', tag: true }, E('back-ext', 3, 12), E('ab-wheel', 3, 10)] },
    { name: 'Press day', ex: [{ exId: 'ohp', v: '5s · 3s · 5/3/1', tag: true }, E('chinup', 3, 8), E('dips', 3, 10)] },
  ],
};
/** Ready-made programs, easiest to most demanding. */
const ORDER = ['fb3', 'min3', 'db3', 'bw3', 'ul4', '531', 'ppl'];

// ---------- Block phases ----------

const PHASES = {
  build: { name: 'Build', about: 'Higher reps to add muscle and work capacity.', sets: 4, reps: 10, pct: [0.65, 0.675, 0.70], acc: [10, 15] },
  strength: { name: 'Strength', about: 'Fewer reps, heavier weights.', sets: 4, reps: 6, pct: [0.75, 0.775, 0.80], acc: [8, 12] },
  heavy: { name: 'Heavy', about: 'Low reps close to your max.', sets: 5, reps: 3, pct: [0.825, 0.85, 0.875], acc: [6, 10] },
  peak: { name: 'Peak', about: 'Doubles at the top of your strength, then test.', sets: 4, reps: 2, pct: [0.88, 0.91, 0.94], acc: [6, 8] },
};
const BLOCKS = { 8: ['build', 'strength'], 12: ['build', 'strength', 'heavy'], 16: ['build', 'strength', 'heavy', 'peak'] };
export const LENGTHS = [['ongoing', 'Ongoing'], [8, '8 weeks'], [12, '12 weeks'], [16, '16 weeks']];
const LOWER = new Set(['Quads', 'Hamstrings', 'Glutes', 'Adductors', 'Abductors', 'Lower back']);
const WEEK = 7 * 864e5;

/** What week `w` of a block is: its phase, and whether it's a working, deload or test week. */
function weekInfo(weeks, w) {
  const phases = BLOCKS[weeks];
  const pi = Math.min(phases.length - 1, Math.floor((w - 1) / 4)), wk = (w - 1) % 4;
  const kind = wk < 3 ? 'work' : w === weeks ? 'test' : 'deload';
  return { key: phases[pi], phase: PHASES[phases[pi]], wk, kind, label: kind === 'work' ? `${PHASES[phases[pi]].name} · week ${wk + 1}` : kind === 'test' ? 'Test week' : 'Deload week' };
}

// ---------- Build your own block: periodization styles ----------

export const STYLES = {
  linear: {
    name: 'Linear', short: 'Heavier with fewer reps, week after week.',
    about: 'Start lighter with more reps. Each working week the weight goes up and the reps come down, ending heavy.',
    pros: ['Simple, proven, easy to follow', 'Ends at your strongest: good before a test or meet', 'Every week has a clear target'],
    cons: ['The higher-rep work from early weeks fades by the end', 'The last weeks get grindy', 'One lift, one rep target per week'],
  },
  dup: {
    name: 'Undulating', short: 'Heavy, medium and light days every week.',
    about: 'Each time a lift comes up in the week it gets a different target: heavy, medium or light. All three rise a little each week.',
    pros: ['Builds strength and size at the same time', 'Variety keeps sessions fresh', 'Great when you train a lift 2–3 times a week'],
    cons: ['Needs the lift in 2–3 of your plans', 'Harder to recover from', 'More numbers to keep track of (Carver does it)'],
  },
  wave: {
    name: 'Wave', short: 'Short waves that climb, each starting a bit higher.',
    about: 'Waves of 3 or 4 weeks get heavier with fewer reps. Each new wave starts a bit higher than the last.',
    pros: ['Built-in easier weeks help recovery', 'Steady progress over long blocks', 'A favourite for intermediate lifters'],
    cons: ['Slower than linear at the start', 'Needs patience', 'Waves can feel repetitive'],
  },
  rpe: {
    name: 'RPE', short: 'Weights set from how strong you are right now.',
    about: 'Pick reps and an effort level (RPE 10 = nothing left, 8 = two reps left). Carver sets each weight from your latest sets.',
    pros: ['Adapts to good days and bad days', 'Uses your real current strength, no exact maxes needed', 'Hard to under- or over-shoot for long'],
    cons: ['Needs honest effort ratings', 'Targets move around more', 'Works best once you can judge reps in reserve'],
  },
};
export const DEFAULT_CUSTOM = {
  style: 'linear', name: '', weeks: 12, deload: 4, test: true, sets: 4, tmPct: 0.9, lifts: [],
  r0: 10, r1: 3, p0: 0.65, p1: 0.9,
  days: [{ name: 'Heavy', sets: 5, reps: 3, pct: 0.85 }, { name: 'Medium', sets: 4, reps: 6, pct: 0.75 }, { name: 'Light', sets: 3, reps: 10, pct: 0.65 }], step: 0.015,
  wave: 3, w0: 0.7, inWave: 0.05, waveStep: 0.025,
  reps: 5, rpe0: 7, rpe1: 9,
};
const WAVE_REPS = { 3: [8, 6, 4], 4: [10, 8, 6, 4] };

/** Week w of a custom block: work (with its index among working weeks), deload or test. */
function customWeek(c, w) {
  const isTest = (i) => c.test && i === c.weeks;
  const isDeload = (i) => !isTest(i) && c.deload && i % c.deload === 0;
  if (isTest(w)) return { kind: 'test', key: 'test', label: 'Test week' };
  if (isDeload(w)) return { kind: 'deload', key: 'deload', label: 'Deload week' };
  let idx = 0, total = 0;
  for (let i = 1; i <= c.weeks; i++) if (!isTest(i) && !isDeload(i)) { total++; if (i < w) idx++; }
  return { kind: 'work', key: c.style, idx, total, label: `${STYLES[c.style].name} · week ${w}`, about: STYLES[c.style].short };
}
/** Either kind of block: { kind, key, label, about, … } for week w. */
export function blockWeek(p, w) {
  if (p.custom) return customWeek(p.custom, w);
  const i = weekInfo(p.weeks, w);
  return { ...i, about: i.phase.about };
}

export const coachProgram = () => (state.program?.kind === 'coach' ? state.program : null);
const template = (id) => PROGRAMS.find((p) => p.id === id);
/** The program as you started it (with your edits). */
const progTemplate = (cp) => { const b = template(cp.id); return b && cp.tpl ? { ...b, plans: cp.tpl } : b; };
export const currentWeek = (p) => Math.floor((weekStart() - p.start) / WEEK) + 1;

/** Round to what you can load: 5 lb or 2.5 kg (stored in kg). */
const plate = (kg) => (unit() === 'lb' ? (Math.round((kg * LB_PER_KG) / 5) * 5) / LB_PER_KG : Math.round(kg / 2.5) * 2.5);
function stepKg(exId) {
  const ex = exercise(exId);
  const big = LOWER.has(ex.muscle) && ex.equipment !== 'Dumbbell';
  return unit() === 'lb' ? (big ? 10 : 5) / LB_PER_KG : big ? 5 : 2.5;
}
const fmtW = (kg) => (kg ? `${toDisplay(kg)} ${unit()}` : '');
/** Weight for `to` reps that feels like `kg` for `from` reps (Epley). */
const convert = (kg, from, to) => (kg ? plate((kg * (1 + from / 30)) / (1 + to / 30)) : kg);

/** Best set in the last 6 months: { weight, reps, max } or null. */
function bestSet(exId) {
  const since = Date.now() - 180 * 864e5;
  const list = e1rmHistory(exId).filter((x) => x.x >= since);
  if (!list.length) return null;
  const b = list.reduce((a, x) => (x.y > a.y ? x : a));
  return { weight: b.weight, reps: b.reps, max: b.y };
}

// ---------- Sets for one week ----------

const set = (type, kg, reps, extra = {}) => ({ id: uid(), type, tWeight: kg ? plate(kg) : null, tReps: reps, tSecs: null, ...extra });

/** Latest estimated max for RPE blocks: your most recent best set, else the starting number. */
function liveMax(p, exId) {
  const recent = e1rmHistory(exId).filter((x) => x.x >= Date.now() - 42 * 864e5);
  return recent.length ? recent[recent.length - 1].y : (p.tm[exId] || 0) / (p.custom?.tmPct || 0.9);
}
const pctText = (x) => `${Math.round(x * 1000) / 10}%`;

/**
 * A main lift's sets for week `w` of a block. `slot` = which time this lift comes
 * up in the week (for undulating blocks). Returns { sets, text, reps, top, test }.
 */
export function mainSets(p, exId, w, slot = 0) {
  const info = blockWeek(p, w);
  const tm = p.tm[exId];
  const c = p.custom;
  const warm = (kg) => [set('w', kg * 0.5, 5), set('w', kg * 0.75, 3)];
  const work = (n, kg, reps, extra = '') => ({
    sets: [...(kg ? warm(kg) : []), ...Array.from({ length: n }, () => set('n', kg, reps))],
    text: `${n} × ${reps}${extra}${kg ? ` · ${fmtW(plate(kg))}` : ''}`, reps, top: kg ? plate(kg) : null,
  });
  const base = c?.style === 'rpe' ? liveMax(p, exId) * 0.9 : tm;
  if (info.kind === 'deload') return { ...work(3, base ? base * 0.6 : null, 5), sets: Array.from({ length: 3 }, () => set('n', base ? base * 0.6 : null, 5)) };
  if (info.kind === 'test') {
    const kg = base ? base * 0.95 : null;
    return { sets: kg ? [set('w', kg * 0.55, 5), set('w', kg * 0.75, 3), set('w', kg * 0.9, 1), set('n', kg, 1)] : [set('n', null, 1)], text: `1 × max reps${kg ? ` · ${fmtW(plate(kg))}` : ''}`, reps: 1, top: kg ? plate(kg) : null, test: true };
  }
  if (!c) { const ph = info.phase; return work(ph.sets, tm ? tm * ph.pct[info.wk] : null, ph.reps); }
  const t = info.total > 1 ? info.idx / (info.total - 1) : 0;
  if (c.style === 'linear') {
    const reps = Math.round(c.r0 + (c.r1 - c.r0) * t), pct = c.p0 + (c.p1 - c.p0) * t;
    return work(c.sets, tm ? tm * pct : null, reps);
  }
  if (c.style === 'dup') {
    const d = c.days[slot % c.days.length];
    return work(d.sets, tm ? tm * (d.pct + c.step * info.idx) : null, d.reps, ` ${d.name.toLowerCase()}`);
  }
  if (c.style === 'wave') {
    const reps = WAVE_REPS[c.wave], L = reps.length;
    const wi = Math.floor(info.idx / L), pos = info.idx % L;
    return work(c.sets, tm ? tm * (c.w0 + pos * c.inWave + wi * c.waveStep) : null, reps[pos]);
  }
  // RPE: weight from your latest estimated max, for these reps at this effort
  const rpe = Math.round((c.rpe0 + (c.rpe1 - c.rpe0) * t) * 2) / 2;
  const max = liveMax(p, exId);
  const kg = max ? max / (1 + (c.reps + (10 - rpe)) / 30) : null;
  return work(c.sets, kg, c.reps, ` @ RPE ${rpe}`);
}

/** Rewrite the program's plans for this week (block) — keeps exercises you added yourself. */
function applyWeek(s, p) {
  const w = Math.max(1, currentWeek(p));
  if (p.mode !== 'block' || w > p.weeks) return;
  const info = blockWeek(p, w);
  const plans = s.plans.filter((x) => p.plans.includes(x.id));
  if (p.custom) markLifts(plans, p.custom.lifts);
  for (const plan of plans) {
    for (const pe of plan.exercises) {
      if (!pe.coach) continue;
      if (pe.main) {
        const ms = mainSets(p, pe.exId, w, pe.slot || 0);
        pe.sets = ms.sets;
        pe.note = ms.test ? 'Test week: warm up, then one set of as many good reps as you can. Carver works out your new max from it.'
          : info.kind === 'deload' ? 'Deload: light and easy, so you start the next phase fresh.'
            : p.custom?.style === 'rpe' ? `${ms.text.split(' · ')[0]}. The weight is a starting point: adjust it so the last rep feels like that effort.`
              : `${info.label}. Hit ${ms.reps} reps on every set.`;
        pe.rest = ms.reps <= 3 ? 210 : ms.reps <= 6 ? 180 : 120;
      } else if (!p.custom && exercise(pe.exId).type === 'wr') {
        const [lo, hi] = info.phase.acc;
        const was = pe.rng?.[0];
        const kg = pe.sets.find((x) => x.type !== 'w')?.tWeight ?? null;
        const n = info.kind === 'work' ? pe.base : Math.max(1, pe.base - 1);
        const next = info.kind === 'deload' && kg ? plate(kg * 0.8) : was && was !== lo ? convert(kg, was, lo) : kg;
        if (info.kind !== 'deload') pe.rng = [lo, hi];
        pe.sets = Array.from({ length: n }, () => set('n', next, info.kind === 'deload' ? hi : lo));
        pe.note = info.kind === 'deload' ? 'Deload: lighter and easy.' : `${lo}–${hi} reps. Hit ${hi} on every set and the weight goes up next time.`;
      }
    }
    plan.updated = Date.now();
  }
  p.applied = w;
}

/** Flag the lifts a custom block controls in your plans, and number each one's slot in the week (for undulating). */
function markLifts(plans, lifts) {
  const seen = {};
  for (const plan of plans) for (const pe of plan.exercises) {
    if (lifts.includes(pe.exId)) { pe.coach = true; pe.main = true; pe.slot = seen[pe.exId] = (seen[pe.exId] ?? -1) + 1; }
    else if (pe.main && !plan.coach) { delete pe.coach; delete pe.main; delete pe.slot; }
  }
}

/** Keep a running block's plans on the right week. Call when the app opens and before showing workouts. */
export function syncCoach() {
  const p = coachProgram();
  if (!p || p.mode !== 'block') return;
  const w = currentWeek(p);
  if (w === p.applied || w > p.weeks || w < 1) return;
  commit((s) => applyWeek(s, s.program));
}

// ---------- Starting a program ----------

function planFrom(t, pl, maxes) {
  return {
    id: uid(), name: pl.name, created: Date.now(), coach: t.id,
    exercises: pl.ex.map((e) => {
      const info = exercise(e.exId);
      const max = maxes[e.exId] || bestSet(e.exId)?.max || 0;
      const w = info.type === 'wr' && max ? plate((max / (1 + Math.min(e.hi + 2, 12) / 30)) * 0.95) : null;
      return {
        exId: e.exId, coach: true, main: !!e.main, base: e.sets,
        note: e.lo !== e.hi ? `${e.lo}–${e.hi} reps. Hit ${e.hi} on every set and the weight goes up next time.` : e.lo ? `${e.lo} reps. Get them all and the weight goes up next time.` : '',
        rest: info.type === 'wr' ? (e.hi <= 6 ? 180 : 120) : 60, rng: e.lo ? [e.lo, e.hi] : null,
        sets: Array.from({ length: e.sets }, () => set('n', w, info.type === 'time' ? null : e.lo || null, { tSecs: info.type === 'time' ? 45 : null })),
      };
    }),
  };
}
const mainLifts = (t) => [...new Set(t.plans.flatMap((p) => p.ex.filter((e) => e.main).map((e) => e.exId)))];

async function startProgram(t, length, maxes) {
  if (program531() || coachProgram()) {
    if (!(await confirmBox('Switch programs?', 'Your current program stops. Its plans are replaced by the new ones.', { ok: 'Switch' }))) return false;
  }
  const keep = state.plans.filter((p) => !p.coach);
  let replace = false;
  if (keep.length + t.plans.length > MAX_PLANS) {
    if (!(await confirmBox('Make room?', `${t.name} uses ${t.plans.length} plans and you have ${keep.length} of your own (${MAX_PLANS} fit). Your plans will be removed; your workouts stay in History.`, { ok: 'Replace plans', danger: true }))) return false;
    replace = true;
  }
  const plans = t.plans.map((pl) => planFrom(t, pl, maxes));
  const tm = Object.fromEntries(Object.entries(maxes).filter(([, v]) => v > 0).map(([k, v]) => [k, v * 0.9]));
  commit((s) => {
    s.plans = [...(replace ? [] : s.plans.filter((p) => !p.coach)), ...plans];
    s.program = { kind: 'coach', id: t.id, ...(JSON.stringify(t.plans) !== JSON.stringify(template(t.id)?.plans) ? { tpl: t.plans } : {}), mode: length === 'ongoing' ? 'ongoing' : 'block', weeks: length === 'ongoing' ? null : length, start: weekStart(), since: Date.now(),
      tm, tm0: { ...tm }, miss: {}, result: {}, plans: plans.map((p) => p.id), log: [] };
    s.goals.workoutsPerWeek = t.days;
    s.settings.program = { ...(s.settings.program || {}), ...Object.fromEntries(plans.map((p) => [p.id, t.days / t.plans.length >= 2 ? 2 : 1])) };
    applyWeek(s, s.program);
  });
  toast(length === 'ongoing' ? `${t.name} is set` : `${t.name}: ${length}-week block, week 1`);
  return true;
}

// ---------- After a workout ----------

/**
 * Move the weights of the plan a workout came from.
 * Returns what changed, for the summary: [{ exId, from, to, kind: 'up'|'down'|'max' }].
 */
export function progressAfter(w) {
  const prog = coachProgram();
  if (!prog || !w.planId || !prog.plans.includes(w.planId)) return [];
  const changes = [];
  const block = prog.mode === 'block';
  const week = block ? currentWeek(prog) : 0;
  const info = block && week >= 1 && week <= prog.weeks ? blockWeek(prog, week) : null;
  commit((s) => {
    const p = s.program, plan = s.plans.find((x) => x.id === w.planId);
    if (!plan) return;
    p.miss = p.miss || {}; p.result = p.result || {};
    for (const pe of plan.exercises) {
      if (exercise(pe.exId).type === 'bw' && pe.rng) {
        const sets = w.exercises.find((e) => e.exId === pe.exId)?.sets.filter((x) => x.done && x.type !== 'w') || [];
        const target = pe.sets.find((x) => x.type !== 'w')?.tReps ?? pe.rng[0];
        if (sets.length >= pe.sets.filter((x) => x.type !== 'w').length && sets.every((x) => (x.reps || 0) >= target)) {
          const next = Math.min(pe.rng[1], target + 1);
          if (next > target) { for (const x of pe.sets) if (x.type !== 'w') x.tReps = next; changes.push({ exId: pe.exId, from: target, to: next, kind: 'up', reps: true, ts: Date.now() }); }
          else if (!pe.maxed) { pe.maxed = true; pe.note = `Top of the range: try a harder version (slower reps, a pause, or one leg / one arm).`; }
        }
        continue;
      }
      if (exercise(pe.exId).type !== 'wr') continue;
      const done = w.exercises.find((e) => e.exId === pe.exId)?.sets.filter((x) => x.done && x.type !== 'w') || [];
      if (!done.length) continue;

      // Block main lifts follow the plan; the test week sets a new max, and repeated misses ease the training max
      if (block && pe.main && info) {
        if (info.kind === 'test') {
          const best = Math.max(...done.map((x) => e1rm(x.weight, x.reps)));
          if (best) { p.result[pe.exId] = best; changes.push({ exId: pe.exId, from: (p.tm0[pe.exId] || 0) / 0.9 || null, to: best, kind: 'max', ts: Date.now() }); }
        } else if (p.custom?.style === 'rpe') {
          p.applied = null;   // next weights come from these sets
        } else if (info.kind === 'work' && p.tm[pe.exId]) {
          const ms = mainSets(p, pe.exId, week, pe.slot || 0);
          const target = ms.reps;
          const short = done.filter((x) => (x.reps || 0) < target).length;
          if (short * 2 >= done.length) {
            p.miss[pe.exId] = (p.miss[pe.exId] || 0) + 1;
            if (p.miss[pe.exId] >= 2) {
              const before = ms.top;
              p.tm[pe.exId] *= 0.95; p.miss[pe.exId] = 0;
              changes.push({ exId: pe.exId, from: before, to: mainSets(p, pe.exId, week, pe.slot || 0).top, kind: 'down', ts: Date.now() });
              p.applied = null;
            }
          } else p.miss[pe.exId] = 0;
        }
        continue;
      }

      // Everything else: double progression in its rep range
      if (!pe.rng) continue;
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
      if (before != null && Math.abs(next - before) > 0.01) changes.push({ exId: pe.exId, from: before, to: next, kind: next < before ? 'down' : 'up', ts: Date.now() });
    }
    p.log = [...changes, ...(p.log || [])].slice(0, 40);
    plan.updated = Date.now();
    if (p.applied == null) applyWeek(s, p);
  });
  return changes;
}

// ---------- Program graphics: one simple shape per program ----------
//
// Splits are a ring cut into their day types (whole for full body, halves for
// upper/lower, thirds for push/pull/legs), with days a week in the middle.
// 5/3/1 is three rising bars; the custom block is three sliders.

const SHADES = ['url(#pg-a)', 'url(#pg-b)', 'url(#pg-c)'];
const GRAPHICS = {
  fb3: { ring: [[0, 360, 0]], center: '3', sub: 'Full body', week: [1, 0, 1, 0, 1, 0, 0] },
  ul4: { ring: [[270, 90, 0], [90, 270, 1]], center: '4', sub: 'Upper · Lower', week: [1, 1, 0, 1, 1, 0, 0] },
  ppl: { ring: [[0, 120, 0], [120, 240, 1], [240, 360, 2]], center: '6', sub: 'Push · Pull · Legs', week: [1, 1, 1, 1, 1, 1, 0] },
  bw3: { ring: [[0, 360, 1]], center: 'home', sub: 'No equipment', week: [1, 0, 1, 0, 1, 0, 0] },
  db3: { ring: [[180, 360, 0], [0, 180, 1]], center: 'db', sub: 'Dumbbells A · B', week: [1, 0, 1, 0, 1, 0, 0] },
  min3: { ring: [[0, 180, 0]], center: '30', centerLabel: 'MIN', sub: '2 hard sets each', week: [1, 0, 1, 0, 1, 0, 0] },
  531: { bars: true, sub: '5s · 3s · 1s', week: [1, 1, 0, 1, 1, 0, 0] },
  custom: { sliders: true, sub: 'Linear · DUP · Wave · RPE', week: null },
  plan: { list: true, sub: 'Your exercises', week: null },
};

const pt = (a, r) => [50 + r * Math.sin((a * Math.PI) / 180), 50 - r * Math.cos((a * Math.PI) / 180)];
/** An arc of the ring from angle a0 to a1 (degrees clockwise from 12 o'clock). */
function arc(a0, a1, r = 36) {
  if (a1 - a0 >= 360) return `<circle cx="50" cy="50" r="${r}"/>`;
  const gap = 30, s = a0 + gap / 2, e = (a1 < a0 ? a1 + 360 : a1) - gap / 2;
  const [x0, y0] = pt(s, r), [x1, y1] = pt(e, r);
  return `<path d="M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}"/>`;
}

function graphicSvg(g) {
  let out = '';
  if (g.ring) {
    out += `<circle cx="50" cy="50" r="36" fill="none" stroke="#232326" stroke-width="13"/>`;
    for (const [a0, a1, tone] of g.ring) out += `<g fill="none" stroke="${SHADES[tone]}" stroke-width="13" stroke-linecap="round">${arc(a0, a1)}</g>`;
    out += g.center === 'home'
      ? '<path d="M37 51 50 40l13 11v12H37z" fill="#e3b04b"/><rect x="46.5" y="55" width="7" height="8" rx="1.5" fill="#141312"/>'
      : g.center === 'db'
      ? `<g transform="translate(36 43)" fill="#e3b04b"><rect x="0" y="2" width="4" height="10" rx="1.5"/><rect x="4.5" y="3.5" width="2.5" height="7" rx="1"/><rect x="7" y="6" width="14" height="2" rx="1"/><rect x="21" y="3.5" width="2.5" height="7" rx="1"/><rect x="24" y="2" width="4" height="10" rx="1.5"/></g>`
      : `<text x="50" y="52" text-anchor="middle" font-size="24" font-weight="800" fill="#f2e3bd">${g.center}</text><text x="50" y="64" text-anchor="middle" font-size="8" font-weight="600" fill="#8e8e93" letter-spacing=".5">${g.centerLabel || 'DAYS'}</text>`;
  } else if (g.bars) {
    [[22, 0.42, 2], [44, 0.66, 1], [66, 0.9, 0]].forEach(([x, v, tone]) => {
      const hgt = 70 * v;
      out += `<rect x="${x - 8}" y="${86 - hgt}" width="16" height="${hgt}" rx="8" fill="${SHADES[tone]}"/>`;
    });
  } else if (g.list) {
    [[30, 1], [50, 0.8], [70, 0.6]].forEach(([y, v], i) => {
      out += `<circle cx="24" cy="${y}" r="7" fill="${SHADES[i]}"/><rect x="38" y="${y - 4.5}" width="${46 * v}" height="9" rx="4.5" fill="#2c2b2e"/>`;
    });
  } else {
    [[30, 0.35], [50, 0.75], [70, 0.5]].forEach(([x, v]) => {
      const ky = 84 - 68 * v;
      out += `<rect x="${x - 2.5}" y="16" width="5" height="68" rx="2.5" fill="#232326"/><rect x="${x - 2.5}" y="${ky}" width="5" height="${84 - ky}" rx="2.5" fill="url(#pg-a)"/>`;
      out += `<circle cx="${x}" cy="${ky}" r="8" fill="#f2e3bd"/>`;
    });
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs>
    <linearGradient id="pg-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6d27a"/><stop offset="1" stop-color="#d49a35"/></linearGradient>
    <linearGradient id="pg-b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c8922f"/><stop offset="1" stop-color="#9c7024"/></linearGradient>
    <linearGradient id="pg-c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8c6a2a"/><stop offset="1" stop-color="#5f4719"/></linearGradient>
  </defs>${out}</svg>`;
}

/** The graphic at the top of a program tile (or, wide, of its page, with the week below). */
export function programFigure(id, { wide = false } = {}) {
  const ch = CHALLENGES.find((x) => x.id === id);
  if (ch) return h('div.pgfx.nums' + (wide ? '.wide' : ''), h('div.pgfx-nums' + (ch.nums.length > 11 ? '.long' : ''), ch.nums));
  const g = GRAPHICS[id] || GRAPHICS.custom;
  const art = h('div.pgfx-art'); art.innerHTML = graphicSvg(g);
  return h('div.pgfx' + (wide ? '.wide' : ''),
    art,
    h('div.pgfx-sub', g.sub),
    wide && g.week ? h('div.pbadge-week', g.week.map((on, i) => h('span.pbadge-day' + (on ? '.on' : ''), 'MTWTFSS'[i]))) : null);
}

// ---------- Popular workouts: one-off challenges ----------
// sets: [exId, reps or seconds, how many sets]; Carver fills the workout in so
// you just tick sets off. Unticked sets are left out when you finish.

const R = (exId, reps, sets = 1) => ({ exId, reps, sets });
export const CHALLENGES = [
  {
    id: 'cindy', name: 'Cindy', nums: '5 · 10 · 15', line: '20-min AMRAP', tag: 'Bodyweight',
    about: 'As many rounds as you can in 20 minutes of 5 pull-ups, 10 push-ups and 15 air squats. 20+ rounds is strong.',
    how: ['The 20-minute timer starts when you tap Start.', 'One round is 5 pull-ups, 10 push-ups and 15 squats. Carver shows each move: tap Done after each, or Add round after a whole round.', 'Keep going until time’s up. Your score is rounds plus extra reps.'],
    scale: 'Swap pull-ups for inverted rows or band-assisted pull-ups, and do push-ups on your knees or a bench.',
    ex: [R('pullup', 5, 20), R('pushup', 10, 20), R('bw-squat', 15, 20)], timer: { kind: 'amrap', secs: 1200 },
    guide: [{ type: 'rounds', items: [{ exId: 'pullup', reps: 5 }, { exId: 'pushup', reps: 10 }, { exId: 'bw-squat', reps: 15 }] }],
  },
  {
    id: 'murph', name: 'Murph', nums: '100 · 200 · 300', line: 'Hero workout · for time', tag: 'Hard',
    about: 'A 1-mile run, 100 pull-ups, 200 push-ups, 300 squats, then another 1-mile run, for time. The classic Memorial Day hero workout, traditionally done in a 20 lb vest.',
    how: ['Run 1 mile.', 'Then 100 pull-ups, 200 push-ups and 300 squats, split however you like. Carver asks for as many of each as you can, then the next, and keeps count of what’s left.', 'Run 1 more mile and the clock stops.'],
    scale: 'Half Murph: half a mile, 50 / 100 / 150. Skip the vest until the whole thing is under an hour.',
    ex: [R('treadmill', 600, 1), R('pullup', 5, 20), R('pushup', 10, 20), R('bw-squat', 15, 20), R('treadmill', 600, 1)], timer: { kind: 'fortime' },
    guide: [
      { type: 'task', exId: 'treadmill', label: 'Run 1 mile', sub: 'Tap Done when you’re back.' },
      { type: 'pool', items: [{ exId: 'pullup', total: 100, chunk: 5 }, { exId: 'pushup', total: 200, chunk: 10 }, { exId: 'bw-squat', total: 300, chunk: 15 }] },
      { type: 'task', exId: 'treadmill', label: 'Run the last mile', sub: 'The clock stops when you tap Done.' },
    ],
  },
  {
    id: 'nickels', name: 'Nickels and Dimes', nums: '5 · 10', line: 'Pull-ups & push-ups', tag: 'Bodyweight',
    about: '5 pull-ups then 10 push-ups, over and over. The pull-ups are the nickels, the push-ups the dimes.',
    how: ['Pick 20 or 30 minutes.', 'One round is 5 pull-ups then 10 push-ups. Tap Done after each, or Add round after both.', 'Rest as little as you can until time’s up.'],
    scale: 'Keep the 1-to-2 ratio with smaller numbers: 3 pull-ups and 6 push-ups.',
    ex: [R('pullup', 5, 15), R('pushup', 10, 15)], timer: { kind: 'amrap', secs: 1800 }, choose: [20, 30],
    guide: [{ type: 'rounds', items: [{ exId: 'pullup', reps: 5 }, { exId: 'pushup', reps: 10 }] }],
  },
  {
    id: '1230', name: '12-3-30', nums: '12 · 3 · 30', line: 'Incline walk', tag: 'Cardio',
    about: 'Treadmill at a 12% incline, 3 mph, for 30 minutes. A low-impact walk: slower than running, but a steady, fat-burning effort.',
    how: ['Set the treadmill to 12% incline and 3 mph.', 'Walk for 30 minutes without holding the rails.'],
    scale: 'Start at 8–10% incline or 20 minutes and build up.',
    ex: [R('treadmill', 1800, 1)], timer: { kind: 'countdown', secs: 1800 },
    guide: [{ type: 'task', exId: 'treadmill', label: 'Walk: 12% incline, 3 mph', sub: 'No holding the rails. Tap Done if you stop early.' }],
  },
  {
    id: 'fran', name: 'Fran', nums: '21 · 15 · 9', line: 'Thrusters & pull-ups · for time', tag: 'Sprint',
    about: '21-15-9 reps of barbell thrusters (95 lb / 65 lb) and pull-ups, for time. Short and brutal: most people finish in 4–10 minutes.',
    how: ['21 thrusters, then 21 pull-ups.', '15 thrusters, then 15 pull-ups.', '9 thrusters, then 9 pull-ups. Carver shows each step and stops the clock after the last one.'],
    scale: 'Lighter bar (45–65 lb), and band-assisted pull-ups or inverted rows.',
    ex: [{ exId: 'thruster', reps: [21, 15, 9] }, { exId: 'pullup', reps: [21, 15, 9] }], timer: { kind: 'fortime' },
    guide: [21, 15, 9].flatMap((n) => [{ type: 'reps', exId: 'thruster', total: n }, { type: 'reps', exId: 'pullup', total: n }]),
  },
];

/** What one challenge looks like as a workout to start. */
function challengePlan(c, mins = null) {
  return {
    id: null, name: c.name, timer: c.timer ? { ...c.timer, ...(mins ? { secs: mins * 60 } : {}) } : null,
    exercises: c.ex.map((e) => {
      const time = exercise(e.exId).type === 'time';
      const reps = Array.isArray(e.reps) ? e.reps : Array.from({ length: e.sets }, () => e.reps);
      return { exId: e.exId, note: '', rest: 0, sets: reps.map((r) => ({ type: 'n', tReps: time ? null : r, tSecs: time ? r : null })) };
    }),
  };
}

function challengeSheet(c) {
  if (c.guide) { import('./guided.js').then((m) => m.openGuided(c)); return; }
  let mins = c.choose ? c.choose[c.choose.length - 1] : null;
  const pick = c.choose ? h('div.segment.chal-mins') : null;
  const drawPick = () => pick && fill(pick, c.choose.map((m) => h('button' + (m === mins ? '.on' : ''), { onclick: () => { mins = m; drawPick(); } }, `${m} min`)));
  drawPick();
  const s0 = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s0.close() }, 'Close'), h('div.sheet-title', c.name), h('span')),
    h('div.chal-nums', c.nums),
    h('p.coach-summary', c.about),
    h('label.form-label', 'How'),
    h('ol.chal-how', c.how.map((x) => h('li', x))),
    h('label.form-label', 'Easier'),
    h('p.fine', c.scale),
    pick ? [h('label.form-label', 'How long'), pick] : null,
    h('button.btn.gold.wide.coach-go', { onclick: () => { s0.close(); startWorkout(challengePlan(c, mins)); } }, icon('play', 16), `Start ${c.name}`),
    h('p.fine.center', c.timer?.kind === 'fortime' ? 'A stopwatch is built in: tap Stop when you finish.' : 'A timer is built in. Tick off each round as you go.')));
}

/** A square program tile for the grid. */
function tile({ id, name, line, tag, onclick, wide = false, span = false }) {
  return h('button.ptile' + (wide ? '.wide' : '') + (span ? '.span2' : ''), { onclick },
    programFigure(id, { wide }),
    h('span.ptile-text',
      h('span.ptile-name', name),
      h('span.ptile-line', line),
      tag ? h('span.ptile-tag', tag) : null));
}

// ---------- Pieces of UI ----------

const meta = (t) => `${t.days} days a week · ${t.minutes} min · ${t.level}`;

/** Block timeline: one bar per week (deloads and the test week marked), the current week outlined. */
function timeline(p, current = 0) {
  const labels = p.custom ? [[STYLES[p.custom.style].name, p.weeks]] : BLOCKS[p.weeks].map((k) => [PHASES[k].name, 4]);
  return h('div.blk',
    h('div.blk-bar', Array.from({ length: p.weeks }, (_, i) => {
      const info = blockWeek(p, i + 1);
      return h('i.blk-wk.' + (info.kind === 'work' ? info.key : info.kind) + (i + 1 < current ? '.past' : '') + (i + 1 === current ? '.now' : ''), { title: `Week ${i + 1}: ${info.label}` });
    })),
    h('div.blk-labels', labels.map(([l, n]) => h('span', { style: { flex: String(n) } }, l))));
}

function lengthText(length) {
  if (length === 'ongoing') return 'No end date. Weights go up when you hit the top of the rep range.';
  const ph = BLOCKS[length].map((k) => PHASES[k].name.toLowerCase());
  return `${length / 4} phases of 4 weeks (${ph.join(', ')}): 3 working weeks, then a deload. Week ${length} tests your new max. Carver sets every main-lift weight.`;
}

/** "185 lb × 5" inputs for each main lift, with the estimated max beside them. */
function maxInputs(lifts, current = {}) {
  const rows = lifts.map((exId) => {
    const b = current[exId] ? { weight: current[exId] / (1 + 5 / 30), reps: 5 } : bestSet(exId);
    const wIn = h('input.field.coach-in', { inputmode: 'decimal', placeholder: '0', value: b ? toDisplay(plate(b.weight)) : '', 'aria-label': `${exercise(exId).name} weight` });
    const rIn = h('input.field.coach-in.reps', { inputmode: 'numeric', placeholder: '5', value: b ? String(Math.min(b.reps, 12)) : '', 'aria-label': `${exercise(exId).name} reps` });
    const est = h('span.coach-est');
    const calc = () => { const kg = fromDisplay(wIn.value), r = Math.round(+rIn.value) || 0; const m = kg && r ? e1rm(kg, Math.min(r, 12)) : 0; est.textContent = m ? `max ≈ ${toDisplay(plate(m))}` : ''; return m; };
    wIn.oninput = calc; rIn.oninput = calc; calc();
    return { exId, calc, el: h('div.coach-max', h('span.coach-max-name', exercise(exId).name), h('span.coach-max-in', wIn, h('span.coach-x', `${unit()} ×`), rIn), est) };
  });
  return { el: h('div.card.coach-maxes', rows.map((r) => r.el)), read: () => Object.fromEntries(rows.map((r) => [r.exId, r.calc()])) };
}

// ---------- Program detail ----------

function programScreen(t0) {
  const t = structuredClone(t0);   // your copy: edit the days before you start
  let length = t.ongoingOnly ? 'ongoing' : 12;
  let lifts = mainLifts(t);
  let maxes = maxInputs(lifts);
  const edited = () => JSON.stringify(t.plans) !== JSON.stringify(t0.plans);
  const canEdit = t.id !== '531';
  const el = h('div.page');
  const body = h('div.scroll-body');
  const running = t.id === '531' ? !!program531() : coachProgram()?.id === t.id;
  function draw() {
    if (mainLifts(t).join() !== lifts.join()) { lifts = mainLifts(t); maxes = maxInputs(lifts); }
    const preview = length === 'ongoing' ? null : { tm: Object.fromEntries(Object.entries(maxes.read()).map(([k, v]) => [k, v * 0.9])), weeks: length };
    fill(body,
      programFigure(t.id, { wide: true }),
      h('div.coach-head',
        h('h1.coach-title', t.name),
        h('div.coach-pills', [`${t.days} days a week`, `${t.minutes} min`, t.level].map((x) => h('span.coach-pill', x))),
        h('p.coach-summary', t.summary)),

      h('div.coach-pc',
        h('section.card.coach-list',
          h('div.coach-list-head', 'Pros'),
          t.pros.map((x) => h('div.coach-li', h('span.coach-mark.pro', icon('check', 14)), h('span', x)))),
        h('section.card.coach-list',
          h('div.coach-list-head', 'Cons'),
          t.cons.map((x) => h('div.coach-li', h('span.coach-mark.con', icon('minus', 14)), h('span', x))))),
      h('div.coach-best', h('b', 'Best for '), t.bestFor),

      h('div.section-head', h('h2.section-title', 'Length')),
      t.ongoingOnly ? null : h('div.segment.coach-len', LENGTHS.map(([v, l]) => h('button' + (length === v ? '.on' : ''), { onclick: () => { length = v; draw(); } }, l))),
      length !== 'ongoing' ? timeline({ weeks: length }) : null,
      h('p.fine', t.lengthText || lengthText(length)),

      h('div.section-head', h('h2.section-title', 'Each week'), h('span.section-count', t.schedule)),
      canEdit ? h('p.fine', edited() ? 'Edited. Your changes are used when you start.' : 'Tap Edit on a day to swap, add or remove exercises before you start.') : null,
      t.plans.map((pl, di) => h('section.card.coach-day',
        h('div.coach-day-top', h('div.coach-day-name', pl.name), canEdit && !running ? h('button.link.small-link', { onclick: () => editDay(di) }, 'Edit') : null),
        pl.ex.map((e) => h('div.coach-ex',
          h('span', exercise(e.exId).name, e.tag || (e.main && length !== 'ongoing') ? h('span.coach-tag', 'main') : null),
          h('span.coach-ex-v', e.v ? e.v : e.main && preview ? mainSets(preview, e.exId, 1).text.split(' · ')[0] + ' in week 1'
            : exercise(e.exId).type === 'time' ? `${e.sets} sets` : `${e.sets} × ${e.lo === e.hi ? e.lo : `${e.lo}–${e.hi}`}`))))),

      lifts.length ? [
        h('div.section-head', h('h2.section-title', 'Starting numbers')),
        h('p.fine', 'Filled in from your history when possible.'),
        maxes.el,
      ] : null,

      edited() && !running ? h('button.link.center-link', { onclick: () => { t.plans = structuredClone(t0.plans); draw(); } }, 'Undo my changes') : null,
      running ? h('p.fine.center', 'You’re running this program.')
        : h('button.btn.gold.wide.coach-go', { onclick: go }, t.id === '531' ? 'Set up 5/3/1' : length === 'ongoing' ? `Start ${t.name}` : `Start ${length}-week block`),
      h('div.bottom-space'),
    );
  }
  /** Change one day: swap, remove or add exercises, and sets and reps. */
  function editDay(di) {
    const pl = t.plans[di];
    const box = h('div');
    const redraw = () => fill(box,
      pl.ex.map((e, i) => {
        const info = exercise(e.exId), time = info.type === 'time';
        const num = (key, label) => h('input.field.ed-num', { value: e[key] ?? '', inputmode: 'numeric', 'aria-label': label,
          onchange: (ev) => { const v = Math.max(1, Math.min(50, parseInt(ev.target.value, 10) || 1)); e[key] = v; if (key === 'lo' && e.hi < v) e.hi = v; if (key === 'hi' && e.lo > v) e.lo = v; redraw(); } });
        return h('div.ed-row',
          h('div.ed-top',
            h('button.ed-name', { onclick: () => pickExercises(([id]) => { const was = e.main; e.exId = id; e.main = was && exercise(id).type === 'wr'; redraw(); }, { single: true, title: 'Swap for' }) }, info.name, h('span.ed-swap', 'Swap')),
            h('button.icon-btn.ed-del', { onclick: () => { pl.ex.splice(i, 1); redraw(); }, 'aria-label': `Remove ${info.name}` }, icon('close', 16))),
          h('div.ed-nums',
            h('button.gd-pm.small', { onclick: () => { e.sets = Math.max(1, e.sets - 1); redraw(); }, 'aria-label': 'One fewer set' }, icon('minus', 14)),
            h('span.ed-sets', `${e.sets} set${e.sets === 1 ? '' : 's'}`),
            h('button.gd-pm.small', { onclick: () => { e.sets = Math.min(10, e.sets + 1); redraw(); }, 'aria-label': 'One more set' }, icon('plus', 14)),
            time ? null : [h('span.ed-x', '×'), num('lo', 'Fewest reps'), h('span.ed-x', '–'), num('hi', 'Most reps'), h('span.ed-x', 'reps')]),
          e.main ? h('div.fine.ed-main', 'Main lift: its weights follow the block.') : null);
      }),
      h('button.btn.dark.wide', { onclick: () => pickExercises((ids) => { ids.forEach((id) => pl.ex.push(exercise(id).type === 'time' ? { exId: id, sets: 3, lo: 0, hi: 0 } : { exId: id, sets: 3, lo: 8, hi: 12 })); redraw(); }, { title: `Add to ${pl.name}` }) }, icon('plus', 16), 'Add exercise'));
    redraw();
    const s = sheet(h('div.form',
      h('div.sheet-head', h('span'), h('div.sheet-title', pl.name), h('button.link.strong', { onclick: () => s.close() }, 'Done')),
      box), { onClose: draw });
  }

  async function go() {
    if (t.id === '531') { setup531(); return; }
    const m = maxes.read();
    if (length !== 'ongoing') {
      const missing = lifts.filter((k) => !m[k]);
      if (missing.length && !(await confirmBox('Missing starting numbers', `Without a set for ${missing.map((k) => exercise(k).name).join(', ')}, Carver can’t work out those weights; you’d pick them yourself.`, { ok: 'Start anyway' }))) return;
    }
    if (await startProgram(t, length, m)) pop();
  }
  draw();
  el.append(navBar({ title: t.name, backLabel: 'Programs' }), body);
  return { el };
}

// ---------- The Coach tab ----------

const doneThisWeek = (p) => new Set(state.workouts.filter((w) => w.start >= weekStart() && p.plans.includes(w.planId)).map((w) => w.planId));

function nextPlan(p) {
  const plans = state.plans.filter((x) => p.plans.includes(x.id));
  const last = state.workouts.find((w) => p.plans.includes(w.planId));
  const i = last ? plans.findIndex((x) => x.id === last.planId) : -1;
  return plans[(i + 1) % plans.length] || null;
}

/** "4 × 6 · 165 lb", "3 × 10–15 · 40 lb" for a plan exercise as it stands now. */
function targetText(pe) {
  const info = exercise(pe.exId);
  const work = pe.sets.filter((x) => x.type !== 'w');
  if (info.type === 'time') return `${work.length} sets`;
  const reps = pe.main || !pe.rng ? (work[0]?.tReps ?? '') : pe.rng[0] === pe.rng[1] ? pe.rng[0] : `${pe.rng[0]}–${pe.rng[1]}`;
  const kg = work[0]?.tWeight;
  const isTest = pe.main && work.length === 1 && work[0].tReps === 1;
  return `${isTest ? '1 × max reps' : `${work.length} × ${reps}`}${kg ? ` · ${fmtW(kg)}` : info.type === 'wr' ? ' · pick a weight' : ''}`;
}

/** Program builder. Opened from the Workout tab (it's a back-button page, not a tab). */
export function coachPage() {
  const el = h('div.page');
  const body = h('div.scroll-body');
  let viewWeek = null, view = 'programs';
  function draw() {
    syncCoach();
    const cp = coachProgram(), t = cp && (cp.custom ? customTemplate(cp) : progTemplate(cp)), p531 = program531();
    fill(body,
      navBar({ title: 'Program builder', backLabel: 'Workout', large: true, right: [goalsButton('workout')] }),
      h('div.segment.pb-switch', [['programs', 'Programs'], ['mine', 'My workouts']].map(([v, l]) => h('button' + (view === v ? '.on' : ''), { onclick: () => { view = v; draw(); } }, l))),
      view === 'mine' ? myWorkouts() : programsView(cp, t, p531),
      h('div.bottom-space'),
    );
  }

  /** Your own plans: no block, no automatic progression. */
  function myWorkouts() {
    const plans = state.plans;
    const full = plans.length >= MAX_PLANS;
    return [
      h('p.coach-intro', 'Your own workouts, no automatic progression.'),
      h('div.btn-pair.pb-new',
        h('button.btn.gold', { onclick: () => (full ? toast(`You can keep ${MAX_PLANS} plans. Delete one to make room.`) : push(() => planEditor())) }, icon('plus', 16), 'New workout'),
        h('button.btn.dark', { onclick: () => startWorkout() }, icon('bolt', 16), 'Freestyle')),
      h('div.section-head', h('h2.section-title', 'Your workouts', h('span.section-count', `${plans.length} of ${MAX_PLANS}`))),
      plans.length ? h('section.card.list-card', plans.map((p) => {
        const last = lastDone(p);
        const inProgram = coachProgram()?.plans.includes(p.id) || program531()?.plans && Object.values(program531().plans).includes(p.id);
        return h('div.pb-row',
          h('button.pb-main', { onclick: () => push(() => planEditor(p)), 'aria-label': `Edit ${p.name}` },
            h('span.pb-name', p.name, inProgram ? h('span.coach-tag', 'Program') : null),
            h('span.pb-meta', [`${p.exercises.length} exercise${p.exercises.length === 1 ? '' : 's'}`, last ? `last ${fmtDate(last.start, { month: 'short', day: 'numeric' })}` : 'not done yet'].join(' · '))),
          h('button.play-btn', { 'aria-label': `Start ${p.name}`, onclick: () => startWorkout(p), disabled: !p.exercises.length }, icon('play', 16)));
      })) : h('div.feed-empty.card', 'No workouts yet. Tap New workout to build one, or Freestyle to make it up as you go.'),
    ];
  }

  function programsView(cp, t, p531) {
    return [
      cp && t ? running(cp, t) : p531 ? [h('div.section-head', h('h2.section-title', 'Your program')), programCard()]
        : h('p.coach-intro', 'Ready-made plans with the weights worked out.'),

      h('div.section-head', h('h2.section-title', cp || p531 ? 'Other programs' : 'Ready-made programs')),
      h('div.pgrid', ...(() => {
        const list = ORDER.map((id) => (id === '531' ? (p531 ? null : T531) : PROGRAMS.find((x) => x.id === id))).filter((x) => x && x.id !== cp?.id);
        return list.map((x, i) => tile({ id: x.id, name: x.name, line: `${x.days} days · ${x.minutes} min`, tag: x.level, span: i === list.length - 1 && list.length % 2 === 1, onclick: () => push(() => programScreen(x)) }));
      })()),

      h('div.section-head', h('h2.section-title', 'Build your own')),
      h('div.pgrid',
        tile({ id: 'custom', name: 'Custom block', line: 'Periodized, your rules', tag: 'Advanced', onclick: () => push(() => customScreen(cp?.custom || null)) }),
        tile({ id: 'plan', name: 'Simple plan', line: 'Pick exercises, no block', tag: 'Any level', onclick: () => (state.plans.length >= MAX_PLANS ? toast(`You can keep ${MAX_PLANS} plans. Delete one to make room.`) : push(() => planEditor())) })),

      h('div.section-head', h('h2.section-title', 'Popular workouts')),
      h('p.fine.pw-note', 'Guided step by step. Post your score and challenge friends to beat it.'),
      h('div.pgrid', CHALLENGES.map((c, i) => tile({ id: c.id, name: c.name, line: c.line, tag: c.tag, span: i === CHALLENGES.length - 1 && CHALLENGES.length % 2 === 1, onclick: () => challengeSheet(c) }))),
    ];
  }

  function running(p, t) {
    const block = p.mode === 'block';
    const week = currentWeek(p);
    const finished = block && week > p.weeks;
    const info = block && !finished ? blockWeek(p, Math.max(1, week)) : null;
    const plans = state.plans.filter((x) => p.plans.includes(x.id));
    const done = doneThisWeek(p);
    const next = nextPlan(p);
    if (viewWeek == null || viewWeek > (p.weeks || 0)) viewWeek = Math.min(Math.max(1, week), p.weeks || 1);
    return [
      h('section.card.coach-now',
        h('div.coach-now-label', block ? (finished ? 'Block complete' : `Week ${week} of ${p.weeks}`) : 'Ongoing'),
        h('div.coach-now-name', t.name),
        h('div.coach-now-sub', finished ? 'Nice work. See your results below.' : info ? `${info.label}${info.kind === 'work' ? ` · ${info.about}` : ''}` : `${state.workouts.filter((w) => p.plans.includes(w.planId)).length} workouts so far`),
        block ? timeline(p, finished ? p.weeks + 1 : week) : null,
        h('div.coach-week', plans.map((pl) => h('span.coach-day' + (done.has(pl.id) ? '.done' : ''), done.has(pl.id) ? icon('check', 12) : null, pl.name)))),

      finished ? results(p, t) : next ? [
        h('div.section-head', h('h2.section-title', 'Next workout'), h('span.section-count', next.name)),
        h('section.card.coach-next',
          next.exercises.map((pe) => h('div.coach-ex', h('span', exercise(pe.exId).name), h('span.coach-ex-v', targetText(pe)))),
          h('button.btn.gold.wide', { onclick: () => startWorkout(next) }, icon('play', 16), `Start ${next.name}`)),
      ] : null,

      block && !finished ? [
        h('div.section-head', h('h2.section-title', 'The plan'), h('span.section-count', 'main lifts')),
        h('div.chips.no-drag.coach-weeks', Array.from({ length: p.weeks }, (_, i) => {
          const wi = blockWeek(p, i + 1);
          return h('button.chip' + (viewWeek === i + 1 ? '.on' : '') + (i + 1 === week ? '.now' : ''), { onclick: () => { viewWeek = i + 1; draw(); } }, `W${i + 1}${wi.kind === 'deload' ? ' · D' : wi.kind === 'test' ? ' · T' : ''}`);
        })),
        h('section.card.coach-plan',
          h('div.coach-plan-week', `Week ${viewWeek}: ${blockWeek(p, viewWeek).label}`),
          plans.map((pl) => {
            const mains = pl.exercises.filter((pe) => pe.main);
            return mains.length ? h('div.coach-plan-day', h('div.coach-plan-dn', pl.name),
              mains.map((pe) => h('div.coach-ex', h('span', exercise(pe.exId).name), h('span.coach-ex-v', p.tm[pe.exId] || p.custom?.style === 'rpe' ? mainSets(p, pe.exId, viewWeek, pe.slot || 0).text : 'add a starting number')))) : null;
          }),
          h('p.fine', p.custom ? (p.custom.style === 'rpe' ? 'RPE weights update after every workout from your latest sets. Other exercises in your plans are left as you set them.' : 'Other exercises in your plans are left as you set them.') : 'Accessories aren’t planned ahead: their weight goes up when you hit the top of the rep range.')),
      ] : null,

      (p.log || []).length ? [
        h('div.section-head', h('h2.section-title', 'Recent changes')),
        h('section.card.list-card', p.log.slice(0, 6).map((c) => h('div.group-row.coach-log',
          h('span', exercise(c.exId).name),
          h('span.row-val', c.kind === 'max' ? `new max ≈ ${fmtW(plate(c.to))}` : c.reps ? `${c.from} → ${c.to} reps` : `${fmtW(c.from)} → ${fmtW(c.to)}`)))),
      ] : null,

      h('section.card.list-card.coach-actions',
        block && !finished ? h('button.group-row', { onclick: () => commit((s) => { s.program.start += WEEK; s.program.applied = null; }) }, h('span', 'Repeat this week'), h('span.row-val', 'missed some days')) : null,
        block ? h('button.group-row', { onclick: () => editMaxes(p, t) }, h('span', 'Change starting numbers'), h('span.card-go', '›')) : null,
        h('button.group-row', { onclick: () => push(() => (p.custom ? customScreen(p.custom) : programScreen(t))) }, h('span', p.custom ? 'Block settings' : 'About this program'), h('span.card-go', '›')),
        h('button.group-row.danger', { onclick: async () => { if (await confirmBox(`End ${t.name}?`, 'The plans stay in Your plans; Carver stops changing the weights.', { ok: 'End', danger: true })) commit((s) => { if (s.program.custom) for (const pl of s.plans) for (const pe of pl.exercises) if (pe.main && !pl.coach) { delete pe.coach; delete pe.main; delete pe.slot; } s.program = null; }); } }, h('span', 'End program'))),
    ];
  }

  function results(p, t) {
    const lifts = Object.keys(p.tm0 || {});
    return [
      h('div.section-head', h('h2.section-title', 'Results')),
      h('section.card.list-card', lifts.map((k) => {
        const before = p.tm0[k] / (p.custom?.tmPct || 0.9), after = p.result?.[k] || bestSet(k)?.max;
        const d = after && before ? after - before : null;
        return h('div.group-row', h('span', exercise(k).name), h('span.row-val', `${fmtW(plate(before))} → ${after ? fmtW(plate(after)) : '—'}${d ? ` (${d > 0 ? '+' : '−'}${toDisplay(Math.abs(d))})` : ''}`));
      })),
      h('div.btn-pair',
        h('button.btn.gold', { onclick: () => nextBlock(p, t) }, 'Start another block'),
        h('button.btn.dark', { onclick: () => commit((s) => { s.program.mode = 'ongoing'; s.program.weeks = null; }) }, 'Go ongoing')),
    ];
  }

  function nextBlock(p, t) {
    commit((s) => {
      const q = s.program;
      for (const k of Object.keys(q.tm)) if (q.result?.[k]) q.tm[k] = q.result[k] * (q.custom?.tmPct || 0.9);
      q.tm0 = { ...q.tm }; q.result = {}; q.miss = {}; q.start = weekStart(); q.applied = null;
      applyWeek(s, q);
    });
    toast(`New ${p.weeks}-week block, from your new maxes`);
  }

  function editMaxes(p, t) {
    const lifts = p.custom ? p.custom.lifts : mainLifts(t);
    const cur = Object.fromEntries(lifts.map((k) => [k, (p.tm[k] || 0) / (p.custom?.tmPct || 0.9)]));
    const m = maxInputs(lifts, cur);
    const s = sheet(h('div.form',
      h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', 'Starting numbers'), h('button.link.strong', {
        onclick: () => {
          const v = m.read();
          commit((st) => { for (const [k, x] of Object.entries(v)) if (x) st.program.tm[k] = x * (st.program.custom?.tmPct || 0.9); st.program.applied = null; applyWeek(st, st.program); });
          s.close(); toast('Targets updated');
        },
      }, 'Save')),
      h('p.fine', 'Every week’s targets are worked out from these.'),
      m.el));
  }

  draw();
  el.append(body);
  return { el, refresh: draw };
}

// ---------- Build your own block ----------

const customTemplate = (p) => ({ id: 'custom', name: p.custom.name || `${STYLES[p.custom.style].name} block` });

/** A small − value + control. */
function stepper(value, { step = 1, min = 0, max = 99, fmt = (v) => v, onChange }) {
  const out = h('span.stp-v', fmt(value));
  const set = (v) => { value = Math.round(Math.min(max, Math.max(min, v)) * 1000) / 1000; out.textContent = fmt(value); onChange(value); };
  return h('span.stp',
    h('button', { 'aria-label': 'Less', onclick: () => set(value - step) }, icon('minus', 14)), out,
    h('button', { 'aria-label': 'More', onclick: () => set(value + step) }, icon('plus', 14)));
}
const row = (label, control, sub) => h('div.cb-row', h('span.cb-label', label, sub ? h('span.cb-sub', sub) : null), control);
const seg = (opts, cur, onPick) => h('div.segment.cb-seg', opts.map(([v, l]) => h('button' + (cur === v ? '.on' : ''), { onclick: () => onPick(v) }, l)));

/** Lifts in your plans that take weight, most used first. */
function planLifts() {
  const n = new Map();
  for (const pl of state.plans) for (const pe of pl.exercises) if (exercise(pe.exId).type === 'wr') n.set(pe.exId, (n.get(pe.exId) || 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
}

function customScreen(existing) {
  const editing = !!existing && coachProgram()?.custom;
  const c = structuredClone(existing || DEFAULT_CUSTOM);
  if (!c.lifts.length) c.lifts = planLifts().filter((k) => ['squat', 'bench', 'deadlift', 'ohp'].includes(k)).slice(0, 4);
  let maxes = null, maxKey = null, previewWeek = 1;
  const el = h('div.page');
  const body = h('div.scroll-body');
  const upd = (k) => (v) => { c[k] = v; draw(); };
  const lifts = planLifts();

  function draw() {
    const st = STYLES[c.style];
    // Starting-number inputs: rebuilt only when the lifts change, keeping what you typed
    if (!maxes || c.lifts.join() !== maxKey) {
      const prev = maxes ? maxes.read() : {}, run = editing ? coachProgram() : null, start = {};
      for (const k of c.lifts) { if (prev[k]) start[k] = prev[k]; else if (run?.tm[k]) start[k] = run.tm[k] / (run.custom.tmPct || 0.9); }
      maxes = maxInputs(c.lifts, start); maxKey = c.lifts.join();
      maxes.el.addEventListener('change', () => draw());
    }
    previewWeek = Math.min(previewWeek, c.weeks);
    const read = maxes.read();
    const preview = { custom: c, weeks: c.weeks, tm: Object.fromEntries(c.lifts.map((k) => [k, (read[k] || 0) * c.tmPct])) };
    const slots = {};
    const plans = state.plans.filter((pl) => pl.exercises.some((pe) => c.lifts.includes(pe.exId)));

    fill(body,
      programFigure('custom', { wide: true }),
      h('div.coach-head', h('h1.coach-title', 'Custom training block'),
        h('p.coach-summary', 'Run your own plans as a periodized block. Pick the style and numbers; Carver sets every main-lift weight. Other exercises stay as you set them.')),

      h('div.section-head', h('h2.section-title', 'Style')),
      h('section.card.list-card.cb-styles', Object.entries(STYLES).map(([k, x]) => h('button.cb-style' + (c.style === k ? '.on' : ''), { onclick: () => { c.style = k; draw(); } },
        h('span.cb-radio'), h('span.coach-row-text', h('span.coach-row-name', x.name), h('span.coach-row-sum', x.short))))),
      h('p.fine', st.about),
      h('div.coach-pc',
        h('section.card.coach-list', h('div.coach-list-head', 'Pros'), st.pros.map((x) => h('div.coach-li', h('span.coach-mark.pro', icon('check', 14)), h('span', x)))),
        h('section.card.coach-list', h('div.coach-list-head', 'Cons'), st.cons.map((x) => h('div.coach-li', h('span.coach-mark.con', icon('minus', 14)), h('span', x))))),

      h('div.section-head', h('h2.section-title', 'Lifts it controls')),
      lifts.length ? h('div.chips.tight.no-drag', lifts.map((k) => h('button.chip' + (c.lifts.includes(k) ? '.on' : ''), {
        onclick: () => { c.lifts = c.lifts.includes(k) ? c.lifts.filter((x) => x !== k) : [...c.lifts, k]; draw(); },
      }, exercise(k).name)))
        : h('p.fine', 'Make your plans on the Workout tab first, then pick the lifts here.'),
      c.style === 'dup' && c.lifts.length ? h('p.fine', `Day types follow your plan order: ${c.days.map((d) => d.name).join(', ')}. A lift in only one plan always gets the first.`) : null,

      h('div.section-head', h('h2.section-title', 'Structure')),
      h('section.card.cb-card',
        row('Length', stepper(c.weeks, { min: 4, max: 24, fmt: (v) => `${v} weeks`, onChange: upd('weeks') })),
        row('Deload', seg([[0, 'None'], [3, '3'], [4, '4'], [5, '5'], [6, '6']], c.deload, upd('deload')), c.deload ? `every ${c.deload} weeks` : 'no easy weeks'),
        row('Test week at the end', seg([[true, 'Yes'], [false, 'No']], c.test, upd('test')), 'one all-out set for a new max'),
        c.style !== 'rpe' ? row('Training max', seg([[0.85, '85%'], [0.9, '90%'], [0.95, '95%']], c.tmPct, upd('tmPct')), 'of your one-rep max') : null,
        c.style !== 'dup' ? row('Working sets', stepper(c.sets, { min: 1, max: 10, onChange: upd('sets') })) : null),

      h('div.section-head', h('h2.section-title', 'Progression')),
      h('section.card.cb-card',
        c.style === 'linear' ? [
          row('Reps', h('span.cb-pair', stepper(c.r0, { min: 1, max: 20, onChange: upd('r0') }), h('span.cb-to', 'to'), stepper(c.r1, { min: 1, max: 20, onChange: upd('r1') })), 'first week → last'),
          row('Intensity', h('span.cb-pair', stepper(c.p0, { step: 0.025, min: 0.4, max: 1.05, fmt: pctText, onChange: upd('p0') }), h('span.cb-to', 'to'), stepper(c.p1, { step: 0.025, min: 0.4, max: 1.05, fmt: pctText, onChange: upd('p1') })), 'of training max'),
        ] : c.style === 'dup' ? [
          c.days.map((d, i) => row(d.name, h('span.cb-pair',
            stepper(d.sets, { min: 1, max: 10, fmt: (v) => `${v}×`, onChange: (v) => { c.days[i].sets = v; draw(); } }),
            stepper(d.reps, { min: 1, max: 20, onChange: (v) => { c.days[i].reps = v; draw(); } }),
            stepper(d.pct, { step: 0.025, min: 0.4, max: 1.05, fmt: pctText, onChange: (v) => { c.days[i].pct = v; draw(); } })), 'sets · reps · % of TM')),
          row('Each week adds', seg([[0.01, '1%'], [0.015, '1.5%'], [0.02, '2%'], [0.025, '2.5%']], c.step, upd('step'))),
        ] : c.style === 'wave' ? [
          row('Wave length', seg([[3, '3 weeks'], [4, '4 weeks']], c.wave, upd('wave')), `reps ${WAVE_REPS[c.wave].join(', ')}`),
          row('First week', stepper(c.w0, { step: 0.025, min: 0.4, max: 1, fmt: pctText, onChange: upd('w0') }), 'of training max'),
          row('Within a wave', seg([[0.025, '+2.5%'], [0.05, '+5%'], [0.075, '+7.5%']], c.inWave, upd('inWave')), 'each week'),
          row('Each new wave', seg([[0.025, '+2.5%'], [0.05, '+5%']], c.waveStep, upd('waveStep')), 'starts this much higher'),
        ] : [
          row('Reps', stepper(c.reps, { min: 1, max: 15, onChange: upd('reps') })),
          row('Effort', h('span.cb-pair', stepper(c.rpe0, { step: 0.5, min: 5, max: 10, fmt: (v) => `RPE ${v}`, onChange: upd('rpe0') }), h('span.cb-to', 'to'), stepper(c.rpe1, { step: 0.5, min: 5, max: 10, fmt: (v) => `RPE ${v}`, onChange: upd('rpe1') })), 'first week → last'),
        ]),

      c.lifts.length ? [
        h('div.section-head', h('h2.section-title', 'Starting numbers')),
        h('p.fine', c.style === 'rpe' ? 'Only used until Carver has your recent sets. After that, every workout’s weight comes from your latest performance.' : 'A recent hard set for each lift: weight and reps. Your training max is worked out from it.'),
        maxes.el,

        h('div.section-head', h('h2.section-title', 'Preview')),
        timeline(preview),
        h('div.chips.no-drag.coach-weeks', Array.from({ length: c.weeks }, (_, i) => {
          const wi = blockWeek(preview, i + 1);
          return h('button.chip' + (previewWeek === i + 1 ? '.on' : ''), { onclick: () => { previewWeek = i + 1; draw(); } }, `W${i + 1}${wi.kind === 'deload' ? ' · D' : wi.kind === 'test' ? ' · T' : ''}`);
        })),
        h('section.card.coach-plan',
          h('div.coach-plan-week', `Week ${previewWeek}: ${blockWeek(preview, previewWeek).label}`),
          plans.length ? plans.map((pl) => h('div.coach-plan-day', h('div.coach-plan-dn', pl.name),
            pl.exercises.filter((pe) => c.lifts.includes(pe.exId)).map((pe) => {
              const slot = slots[pe.exId] = (slots[pe.exId] ?? -1) + 1;
              return h('div.coach-ex', h('span', exercise(pe.exId).name), h('span.coach-ex-v', mainSets(preview, pe.exId, previewWeek, slot).text));
            }))) : h('p.fine', 'None of your plans have these lifts yet.')),
      ] : null,

      h('div.section-head', h('h2.section-title', 'Name')),
      h('input.field', { value: c.name, placeholder: `${STYLES[c.style].name} block`, maxlength: 40, oninput: (e) => { c.name = e.target.value; } }),
      h('button.btn.gold.wide.coach-go', { onclick: go, disabled: !c.lifts.length }, editing ? 'Save changes' : `Start ${c.weeks}-week block`),
      h('div.bottom-space'),
    );
  }

  async function go() {
    const m = maxes.read();
    const missing = c.lifts.filter((k) => !m[k]);
    if (missing.length && c.style !== 'rpe' && !(await confirmBox('Missing starting numbers', `Without a set for ${missing.map((k) => exercise(k).name).join(', ')}, Carver can’t work out those weights.`, { ok: 'Continue' }))) return;
    const tm = Object.fromEntries(c.lifts.filter((k) => m[k]).map((k) => [k, m[k] * c.tmPct]));
    const plans = state.plans.filter((pl) => pl.exercises.some((pe) => c.lifts.includes(pe.exId))).map((pl) => pl.id);
    if (editing) {
      commit((s) => { Object.assign(s.program, { custom: c, weeks: c.weeks, tm: { ...s.program.tm, ...tm }, plans, applied: null }); applyWeek(s, s.program); });
      toast('Block updated'); pop(); return;
    }
    if (program531() || coachProgram()) {
      if (!(await confirmBox('Switch programs?', 'Your current program stops. Your plans stay.', { ok: 'Switch' }))) return;
    }
    commit((s) => {
      s.program = { kind: 'coach', id: 'custom', custom: c, mode: 'block', weeks: c.weeks, start: weekStart(), since: Date.now(), tm, tm0: { ...tm }, miss: {}, result: {}, plans, log: [] };
      applyWeek(s, s.program);
    });
    toast(`${c.weeks}-week ${STYLES[c.style].name.toLowerCase()} block started`);
    pop();
  }

  draw();
  el.append(navBar({ title: 'Custom block', backLabel: 'Programs' }), body);
  return { el };
}
