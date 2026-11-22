// Build your own program: pick a split, a goal (stronger, bigger or both) and what to
// focus on, and Carver writes a full program and runs every lift.
//
// The numbers come from the research most well-regarded programs are built on:
//   - Volume: at least 10 hard sets per muscle per week, 10–20 for most people
//     (Schoenfeld, Ogborn & Krieger 2017, dose-response meta-analysis; Baz-Valle et al. 2022).
//     Focus muscles get about 16.
//   - Frequency: each muscle at least twice a week (Schoenfeld, Ogborn & Krieger 2016 meta-analysis).
//   - Effort: 1–3 reps short of failure (Helms et al. 2016 RIR scale; Refalo et al. 2023).
//   - Reps: muscle grows similarly across rep ranges when sets are hard (Schoenfeld et al. 2017),
//     so 6–10 on compounds and 10–15 on isolation work; strength comes from heavy sets of 3–6
//     (Schoenfeld et al. 2017), and periodized blocks beat non-periodized training for it
//     (Williams et al. 2017 meta-analysis).
//   - Focus: what you do first in a session improves most (Nunes et al. 2021), so focus lifts lead their day.
//   - Progression: main lifts follow the block's percentages; everything else uses double
//     progression (hit the top of the rep range on every set, then add weight).

import { h, fill, navBar, push, toast, icon } from './ui.js';
import { exercise } from './store.js';
import { tally } from './volume.js';

// A day is a list of exercises, best first. kind: 'c' compound, 'i' isolation.
const X = (exId, kind = 'i') => ({ exId, kind });
const DAYS = {
  push: { name: 'Push', ex: [X('bench', 'c'), X('db-incline', 'c'), X('db-shoulder', 'c'), X('lat-raise'), X('tri-pushdown'), X('oh-tri-ext')] },
  pull: { name: 'Pull', ex: [X('lat-pulldown', 'c'), X('bb-row', 'c'), X('seated-row', 'c'), X('face-pull'), X('db-curl'), X('hammer-curl')] },
  legs: { name: 'Legs', ex: [X('squat', 'c'), X('rdl', 'c'), X('leg-press', 'c'), X('lying-curl'), X('leg-ext'), X('calf-raise')] },
  upperA: { name: 'Upper A', ex: [X('bench', 'c'), X('bb-row', 'c'), X('ohp', 'c'), X('lat-pulldown', 'c'), X('db-curl'), X('tri-pushdown')] },
  lowerA: { name: 'Lower A', ex: [X('squat', 'c'), X('rdl', 'c'), X('leg-ext'), X('lying-curl'), X('calf-raise'), X('hanging-knee-raise')] },
  upperB: { name: 'Upper B', ex: [X('db-incline', 'c'), X('chest-row', 'c'), X('db-shoulder', 'c'), X('lat-raise'), X('hammer-curl'), X('oh-tri-ext')] },
  lowerB: { name: 'Lower B', ex: [X('deadlift', 'c'), X('bss', 'c'), X('leg-press', 'c'), X('seated-curl'), X('seated-calf'), X('cable-crunch')] },
  fullA: { name: 'Full Body A', ex: [X('squat', 'c'), X('bench', 'c'), X('bb-row', 'c'), X('lat-raise'), X('db-curl')] },
  fullB: { name: 'Full Body B', ex: [X('deadlift', 'c'), X('ohp', 'c'), X('lat-pulldown', 'c'), X('leg-ext'), X('tri-pushdown')] },
  fullC: { name: 'Full Body C', ex: [X('leg-press', 'c'), X('db-incline', 'c'), X('seated-row', 'c'), X('lying-curl'), X('calf-raise')] },
};
export const SPLITS = {
  ppl6: { name: 'Push Pull Legs', short: 'PPL', days: ['push', 'pull', 'legs'], perWeek: 6, sub: '6 days · each muscle twice a week' },
  ppl3: { name: 'Push Pull Legs', short: 'PPL', days: ['push', 'pull', 'legs'], perWeek: 3, sub: '3 days · bigger days, once a week each' },
  ul4: { name: 'Upper / Lower', short: 'Upper/Lower', days: ['upperA', 'lowerA', 'upperB', 'lowerB'], perWeek: 4, sub: '4 days · each muscle twice a week' },
  fb3: { name: 'Full Body', short: 'Full Body', days: ['fullA', 'fullB', 'fullC'], perWeek: 3, sub: '3 days · everything, three times a week' },
};
export const GOALS = {
  strength: { name: 'Stronger', sub: 'Heavy main lifts in periodized blocks, enough volume to keep growing' },
  size: { name: 'Bigger', sub: 'Hard sets of 6–15 reps, 10–20 sets per muscle a week' },
  both: { name: 'Both', sub: 'A heavy lift to start each day, muscle-building work after' },
};
export const FOCUS_LIFTS = [['bench', 'Bench press'], ['squat', 'Squat'], ['deadlift', 'Deadlift'], ['ohp', 'Overhead press'], ['pullup', 'Pull-up'], ['bb-row', 'Row'], ['hip-thrust', 'Hip thrust']];
export const FOCUS_MUSCLES = [['Chest'], ['Back'], ['Shoulders'], ['Arms', ['Biceps', 'Triceps']], ['Quads'], ['Hamstrings'], ['Glutes'], ['Calves']];
export const MAJOR = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves'];
// Weekly hard-set targets: maintenance needs far less than growth (about a third: Bickel et al. 2011);
// 10–20 grows most people; 20 is a specialization dose for one or two muscles at a time.
export const VOLUME = [[6, 'Maintain'], [10, 'Grow'], [12, 'Grow+'], [16, 'Focus'], [20, 'Specialize']];
export const RIR = { '0-1': 'Reps in reserve 0–1: right to the edge', '1-2': 'Reps in reserve 1–2: the usual sweet spot', '2-3': 'Reps in reserve 2–3: more recovery, good for big compounds' };
export const defaultVolume = (focusMuscles = []) => Object.fromEntries(MAJOR.map((m) => [m, focusMuscles.includes(m) ? 16 : 12]));
const BIG_LIFTS = new Set(['squat', 'bench', 'deadlift', 'ohp', 'bb-row']);
// When a muscle has no direct work in the split, this is the isolation move Carver adds (and the kind of day it goes on)
const ADD = { Chest: ['cable-fly', 'push'], Back: ['seated-row', 'pull'], Shoulders: ['lat-raise', 'push'], Biceps: ['cable-curl', 'pull'], Triceps: ['skullcrusher', 'push'],
  Quads: ['leg-ext', 'legs'], Hamstrings: ['seated-curl', 'legs'], Glutes: ['hip-thrust', 'legs'], Calves: ['calf-raise', 'legs'] };
const dayArea = (name) => (/Push/.test(name) ? 'push' : /Pull/.test(name) ? 'pull' : /Legs|Lower/.test(name) ? 'legs' : /Upper/.test(name) ? 'upper' : 'full');
const fits = (area, name) => { const d = dayArea(name); return d === 'full' || d === area || (d === 'upper' && area !== 'legs'); };

/** Weekly sets per muscle for a program (helping muscles count half). */
export function weeklySets(plans, perWeek) {
  const times = perWeek / plans.length;
  return tally(plans.flatMap((d) => d.ex.map((e) => ({ exId: e.exId, sets: e.sets * times }))));
}

/**
 * Write a program. opts: { split, goal, lifts: [exId], muscles: [name], ownDays }.
 * Returns a template the program page can show, edit and start.
 */
export function buildProgram({ split, goal, lifts = [], muscles = [], ownDays = 4, volume = null, rir = '1-2', cap = 0 }) {
  const own = split === 'own';
  const s = own ? { name: 'My split', short: 'My split', days: [], perWeek: ownDays } : SPLITS[split];
  let days = own
    ? Array.from({ length: ownDays }, (_, i) => ({ name: `Day ${'ABCDEF'[i]}`, ex: [] }))
    : s.days.map((k) => ({ name: DAYS[k].name, ex: DAYS[k].ex.map((x) => ({ ...x })) }));

  // Sets and reps for the goal
  const scheme = (x, first) => {
    const t = exercise(x.exId).type;
    if (t === 'time') return { sets: 3, lo: 0, hi: 0 };
    if (goal === 'strength') return x.kind === 'c' && BIG_LIFTS.has(x.exId) ? { sets: 4, lo: 3, hi: 5, main: true } : x.kind === 'c' ? { sets: 3, lo: 6, hi: 8 } : { sets: 3, lo: 8, hi: 12 };
    if (goal === 'both' && first && x.kind === 'c' && BIG_LIFTS.has(x.exId)) return { sets: 4, lo: 4, hi: 6, main: true };
    return x.kind === 'c' ? { sets: 3, lo: 6, hi: 10 } : { sets: 3, lo: 10, hi: 15 };
  };

  // Focus lifts: put them first on their day (add them where they fit if they're missing), and on a second day if there is one
  const muscleOf = (id) => exercise(id).muscle;
  for (const id of [...lifts].reverse()) {
    if (own) break;
    let home = days.findIndex((d) => d.ex.some((e) => e.exId === id));
    if (home < 0) home = days.map((d, i) => [i, d.ex.filter((e) => muscleOf(e.exId) === muscleOf(id)).length]).sort((a, b) => b[1] - a[1])[0][0];
    const d = days[home];
    d.ex = [{ exId: id, kind: 'c', focus: true }, ...d.ex.filter((e) => e.exId !== id)];
    // A second exposure for once-a-week splits and same-type days (Upper B, Lower B…)
    const twin = days.findIndex((x, i) => i !== home && x.ex.some((e) => muscleOf(e.exId) === muscleOf(id)) && !x.ex.some((e) => e.exId === id));
    if (twin >= 0 && s.perWeek / days.length < 2) days[twin].ex.splice(1, 0, { exId: id, kind: 'c', focus: true, second: true });
  }

  days = days.map((d) => ({ name: d.name, ex: d.ex.map((x, i) => {
    const sc = scheme(x, i === 0);
    const out = { exId: x.exId, sets: sc.sets, lo: sc.lo, hi: sc.hi, kind: x.kind };
    if (sc.main && !x.second) out.main = true;
    if (x.second) { out.lo = Math.max(out.lo, 6); out.hi = Math.max(out.hi, 10); }   // the lighter, higher-rep day
    if (x.focus) { out.focus = true; if (!x.second) out.sets += 1; }
    out.rir = rir;
    if (exercise(x.exId).type === 'bw') delete out.main;
    return out;
  }) }));

  // Volume: every major muscle gets at least 10 sets a week, focus muscles about 16
  const focusM = new Set(muscles.flatMap((m) => FOCUS_MUSCLES.find((f) => f[0] === m)?.[1] || [m]));
  const target = volume || defaultVolume([...focusM]);
  const stuck = new Set();
  if (!own) for (let guard = 0; guard < 120; guard++) {
    const t = weeklySets(days, s.perWeek);
    const short = MAJOR.find((m) => !stuck.has(m) && t[m].total < target[m] - 1);
    if (!short) break;
    // add a set to the exercise for that muscle with the fewest sets (isolation first: less fatigue per set)
    const cands = days.flatMap((d) => d.ex.filter((e) => muscleOf(e.exId) === short && e.sets < 5));
    if (cands.length) { cands.sort((a, b) => a.sets - b.sets || (a.kind === 'i' ? -1 : 1))[0].sets += 1; continue; }
    // no direct work for it at all: add an isolation move to the lightest day it fits on
    const [id, area] = ADD[short];
    const day = days.filter((d) => fits(area, d.name) && !d.ex.some((e) => e.exId === id)).sort((a, b) => a.ex.reduce((n, e) => n + e.sets, 0) - b.ex.reduce((n, e) => n + e.sets, 0))[0];
    if (!day) { stuck.add(short); continue; }
    const sc = scheme({ exId: id, kind: 'i' }, false);
    day.ex.push({ exId: id, sets: 2, lo: sc.lo, hi: sc.hi, kind: 'i', rir, added: true });
  }
  // Well over target (maintenance muscles, or helpers piling up): trim isolation, then compound sets
  stuck.clear();
  if (!own) for (let guard = 0; guard < 120; guard++) {
    const t = weeklySets(days, s.perWeek);
    const over = MAJOR.find((m) => !stuck.has(m) && t[m].total > target[m] + 3);
    if (!over) break;
    // isolation first, then the later moves in a day: the first lift of a session keeps its sets
    const pool = days.flatMap((d) => d.ex.map((e, i) => [e, i]).filter(([e]) => muscleOf(e.exId) === over && !e.main && !e.focus && e.sets > (e.kind === 'i' && target[over] <= 6 ? 1 : 2)));
    const c = pool.sort(([a, ai], [b, bi]) => (a.kind === 'i' ? -1 : 1) - (b.kind === 'i' ? -1 : 1) || bi - ai || b.sets - a.sets)[0]?.[0];
    if (!c) {
      // Everything is at its floor: drop a whole extra move for that muscle, but only one whose loss leaves every muscle on target
      const others = days.flatMap((d) => d.ex.filter((e) => muscleOf(e.exId) === over && !e.main && !e.focus).map((e) => [d, e]));
      const direct = days.reduce((n, d) => n + d.ex.filter((e) => muscleOf(e.exId) === over).length, 0);
      const pick = direct > 1 && others.map(([d, e]) => {
        const after = weeklySets(days.map((x) => (x === d ? { ...x, ex: x.ex.filter((y) => y !== e) } : x)), s.perWeek);
        return MAJOR.every((m) => after[m].total >= Math.min(target[m] - 1, t[m].total)) ? [d, e, after[over].total] : null;
      }).filter(Boolean).sort((a, b) => (a[1].kind === 'c' ? -1 : 1) - (b[1].kind === 'c' ? -1 : 1) || b[2] - a[2])[0];
      if (!pick) { stuck.add(over); continue; }
      pick[0].ex = pick[0].ex.filter((y) => y !== pick[1]);
      stuck.add(over);   // one move at most: the rest is helper work from compounds, which is fine
      continue;
    }
    c.sets -= 1;
    if (c.sets === 1 && c.kind === 'i' && target[over] <= 6) for (const d of days) d.ex = d.ex.filter((e) => e !== c);   // maintenance: drop the extra isolation move
  }
  // Session cap: trim the longest days, isolation first, never below 2 sets or the focus work
  if (!own && cap) for (const d of days) {
    for (let guard = 0; guard < 40 && d.ex.reduce((n, e) => n + e.sets, 0) > cap; guard++) {
      const c = d.ex.filter((e) => !e.main && !e.focus && e.sets > 2).sort((a, b) => (a.kind === 'i' ? -1 : 1) - (b.kind === 'i' ? -1 : 1) || b.sets - a.sets)[0];
      if (!c) break;
      c.sets -= 1;
    }
  }

  const goalWord = { strength: 'stronger', size: 'bigger', both: 'stronger and bigger' }[goal];
  const focusText = [...lifts.map((id) => FOCUS_LIFTS.find((f) => f[0] === id)?.[1] || exercise(id).name), ...muscles].join(', ');
  const sets = (d) => d.ex.reduce((n, e) => n + e.sets, 0);
  const longest = Math.max(0, ...days.map(sets));
  return {
    id: 'built', bid: Date.now(), generated: true, perWeek: s.perWeek,
    name: own ? 'My program' : `My ${s.short}`,
    days: s.perWeek, minutes: own ? null : `${Math.round(longest * 3 / 5) * 5}–${Math.round(longest * 3.6 / 5) * 5}`,
    level: GOALS[goal].name, schedule: own ? `${s.perWeek} days a week` : s.sub.split(' · ')[0],
    summary: own ? `Your own ${s.perWeek}-day split. Add exercises to each day; Carver runs the progression.`
      : `${s.name}, ${s.sub.split(' · ')[1]}, built to make you ${goalWord}${focusText ? `, with extra focus on ${focusText}` : ''}.`,
    pros: [
      own ? 'Weekly sets per muscle are checked against your targets as you build' : `Weekly sets per muscle match your targets (${Math.min(...Object.values(target))}–${Math.max(...Object.values(target))}), the range research links to growth`,
      focusText ? `Focus lifts come first in their session, with extra sets for focus muscles` : 'Balanced: no muscle is left behind',
      goal === 'size' ? 'Weights go up when you hit the top of the rep range' : 'Main lifts follow periodized blocks that build to new maxes',
    ],
    cons: [s.perWeek >= 6 ? 'Six days a week is a big commitment' : s.perWeek <= 3 && split === 'ppl3' ? 'Each muscle trained once a week; twice is a little better' : 'Sessions need about an hour', `Every set should end ${rir.replace('-', '–')} reps short of failure`],
    bestFor: 'You, built from your answers. Tap Edit on any day to change it.',
    focusMuscles: [...focusM], target, rir, cap,
    plans: days.map((d) => ({ name: d.name, ex: d.ex.map(({ kind, focus, added, ...e }) => e) })),
  };
}

// ---------- The builder ----------

export function builderScreen(openProgram, openAdvanced) {
  const el = h('div.page');
  const body = h('div.scroll-body');
  const st = { split: 'ul4', goal: 'both', lifts: [], muscles: [], ownDays: 4, volume: null, rir: '1-2', cap: 0 };
  const focusSet = () => new Set(st.muscles.flatMap((m) => FOCUS_MUSCLES.find((f) => f[0] === m)?.[1] || [m]));
  const card = (on, title, sub, onclick) => h('button.bb-opt' + (on ? '.on' : ''), { onclick }, h('span.cb-radio'), h('span.coach-row-text', h('span.coach-row-name', title), h('span.coach-row-sum', sub)));
  const toggle = (arr, v, max = 3) => (arr.includes(v) ? arr.filter((x) => x !== v) : arr.length >= max ? (toast(`Pick up to ${max}`), arr) : [...arr, v]);
  function draw() {
    const focusN = st.lifts.length + st.muscles.length;
    fill(body,
      navBar({ title: 'Build your program', backLabel: 'Programs' }),
      h('p.coach-intro', 'Six steps. Carver writes the program from training research and runs every lift; you stay in control of every number.'),

      h('div.section-head', h('h2.section-title', h('span.bb-n', '1'), 'Split')),
      h('section.card.list-card.bb-list',
        Object.entries(SPLITS).map(([k, x]) => card(st.split === k, x.name, x.sub, () => { st.split = k; draw(); })),
        card(st.split === 'own', 'Make your own', 'Your days, your exercises; Carver runs the progression', () => { st.split = 'own'; draw(); })),
      st.split === 'own' ? h('div.segment.bb-days', [2, 3, 4, 5, 6].map((n) => h('button' + (st.ownDays === n ? '.on' : ''), { onclick: () => { st.ownDays = n; draw(); } }, `${n} days`))) : null,

      h('div.section-head', h('h2.section-title', h('span.bb-n', '2'), 'Goal')),
      h('section.card.list-card.bb-list', Object.entries(GOALS).map(([k, x]) => card(st.goal === k, x.name, x.sub, () => { st.goal = k; draw(); }))),

      h('div.section-head', h('h2.section-title', h('span.bb-n', '3'), 'Focus'), h('span.section-count', focusN ? `${focusN} of 3` : 'optional')),
      h('p.fine', 'Up to 3. Focus lifts go first in their day with extra sets; focus muscles get about 16 sets a week instead of 10–12.'),
      h('label.form-label', 'Lifts'),
      h('div.chips.tight.no-drag', FOCUS_LIFTS.map(([id, l]) => h('button.chip' + (st.lifts.includes(id) ? '.on' : ''), { onclick: () => { if (st.lifts.includes(id) || focusN < 3) st.lifts = toggle(st.lifts, id); else toast('Pick up to 3'); draw(); } }, l))),
      h('label.form-label', 'Muscles'),
      h('div.chips.tight.no-drag', FOCUS_MUSCLES.map(([m]) => h('button.chip' + (st.muscles.includes(m) ? '.on' : ''), { onclick: () => { if (st.muscles.includes(m) || focusN < 3) st.muscles = toggle(st.muscles, m); else toast('Pick up to 3'); st.volume = null; draw(); } }, m))),

      h('div.section-head', h('h2.section-title', h('span.bb-n', '4'), 'Weekly volume'), h('span.section-count', 'hard sets per muscle')),
      h('p.fine', 'Set from your focus; change any muscle. Maintain holds what you have with about a third of the work; 10–20 grows most people; 20 is a specialization dose, best for one or two muscles at a time.'),
      h('section.card.list-card.bb-vol', MAJOR.map((m) => {
        const vol = st.volume || defaultVolume([...focusSet()]);
        return h('div.bb-vol-row', h('span.bb-vol-name', m, focusSet().has(m) ? h('span.coach-tag', 'focus') : null),
          h('div.segment.mini.bb-vol-seg', VOLUME.map(([v, l]) => h('button' + (vol[m] === v ? '.on' : ''), { onclick: () => { st.volume = { ...vol, [m]: v }; draw(); }, 'aria-label': `${m}: ${l}` }, v))));
      })),
      h('p.fine.bb-legend', VOLUME.map(([v, l]) => `${v} ${l.toLowerCase()}`).join(' · ')),

      h('div.section-head', h('h2.section-title', h('span.bb-n', '5'), 'Effort')),
      h('section.card.list-card.bb-list', Object.entries(RIR).map(([k, l]) => card(st.rir === k, `RIR ${k.replace('-', '–')}`, l.split(': ')[1], () => { st.rir = k; draw(); }))),
      h('p.fine', 'How many good reps you’d have left at the end of each set. Main lifts in strength blocks follow their own percentages.'),

      h('div.section-head', h('h2.section-title', h('span.bb-n', '6'), 'Session length')),
      h('div.segment', [[0, 'No cap'], [24, '24 sets'], [20, '20 sets'], [16, '16 sets']].map(([v, l]) => h('button' + (st.cap === v ? '.on' : ''), { onclick: () => { st.cap = v; draw(); } }, l))),
      h('p.fine', 'Most sets per session. About 3 minutes per set with rest, so 20 sets is roughly an hour. Carver trims isolation work first, never your main or focus lifts.'),

      h('button.btn.gold.wide.coach-go', { onclick: () => openProgram(buildProgram(st)) }, icon('bolt', 16), 'Build my program'),

      h('details.howto.bb-how',
        h('summary', 'How it’s built'),
        h('ul',
          h('li', 'At least 10 hard sets per muscle each week, 10–20 for most people; about 16 for focus muscles (Schoenfeld 2017; Baz-Valle 2022).'),
          h('li', 'Each muscle trained twice a week where the split allows (Schoenfeld 2016).'),
          h('li', 'Every set ends 1–3 reps short of failure: that’s where growth happens without wrecking recovery (Helms 2016; Refalo 2023).'),
          h('li', 'Bigger: 6–10 reps on compounds, 10–15 on isolation. Stronger: main lifts heavy at 3–5 reps in periodized blocks (Schoenfeld 2017; Williams 2017).'),
          h('li', 'Focus lifts come first in their session, when you’re freshest (Nunes 2021).'),
          h('li', 'Progression: main lifts follow the block; everything else goes up once you hit the top of the rep range on every set.'))),
      h('button.link.center-link', { onclick: openAdvanced }, 'Advanced: periodization styles for your own plans'),
      h('div.bottom-space'));
  }
  draw();
  el.append(body);
  return { el };
}

export const openBuilder = (openProgram, openAdvanced) => push(() => builderScreen(openProgram, openAdvanced));
