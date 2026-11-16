// The Workout page: what's up next (or the workout in progress), this week,
// your plans (up to 5), and History by week.
// Also the plan editor and the workout detail screen.

import { h, fill, icon, push, pop, navBar, actionSheet, confirmBox, promptBox, toast, fmtDate, fmtDurationWords, fmtNum, fmtSecs } from './ui.js';
import { state, commit, save, uid, exercise, savePlan, deletePlan, workoutStats, toDisplay, unit, e1rm, MAX_PLANS, ymd, addDays, dayStart, weekStart, dayPlan, DAY_SHORT } from './store.js';
import { startWorkout, repeatWorkout, saveAsPlan, openWorkout } from './session.js';
import { exerciseCard, newSet } from './block.js';
import { pickExercises } from './picker.js';
import { openSettings } from './settings.js';
import { volumeCard, tally, MUSCLE_ORDER } from './volume.js';

export function workoutPage() {
  const el = h('div.page');
  const body = h('div.scroll-body');
  let showAll = false;

  const nav = navBar({
    title: 'Workout', back: false, large: true,
    right: [h('button.icon-btn', { onclick: openSettings, 'aria-label': 'Settings' }, icon('gear'))],
  });

  function draw() {
    const plansFull = state.plans.length >= MAX_PLANS;
    const next = nextPlan();
    fill(body,
      nav,
      state.active ? activeCard(state.active) : next ? upNext(next) : firstPlanCard(),
      weekStrip(),

      h('div.section-head',
        h('h2.section-title', 'Plans', h('span.section-count', `${state.plans.length} of ${MAX_PLANS}`)),
        h('button.link' + (plansFull ? '.off' : ''), {
          onclick: () => plansFull ? toast(`You can keep ${MAX_PLANS} plans. Delete one to make room.`) : push(() => planEditor()),
        }, icon('plus', 16), 'New')),
      state.plans.length ? h('section.card.list-card.plan-list', state.plans.map((p) => planRow(p, p === next))) : null,
      state.active ? null : h('button.quick-start', { onclick: () => startWorkout() }, icon('plus', 18), h('span', 'Empty workout'), h('span.quick-sub', 'Add exercises as you go')),
      state.plans.length || state.workouts.length ? volumeCard() : null,

      h('div.section-head', h('h2.section-title', 'History'), state.workouts.length ? h('span.section-count', `${state.workouts.length} workout${state.workouts.length === 1 ? '' : 's'}`) : null),
      state.workouts.length ? historyByWeek(showAll ? state.workouts : state.workouts.slice(0, 12)) : h('div.empty-small', 'Finished workouts show up here.'),
      !showAll && state.workouts.length > 12 ? h('button.btn.dark.wide', { onclick: () => { showAll = true; draw(); } }, `Show all ${state.workouts.length}`) : null,
      h('div.bottom-space'),
    );
  }

  /** The workout going on right now. */
  function activeCard(a) {
    const total = a.exercises.reduce((n, e) => n + e.sets.length, 0);
    const done = a.exercises.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0);
    return h('section.card.hero.live',
      h('div.hero-label', h('span.pulse'), 'In progress'),
      h('div.hero-name', a.name || 'Workout'),
      h('div.hero-meta', `Started ${fmtDurationWords(Date.now() - a.start)} ago · ${done} of ${total} sets`),
      h('div.hero-progress', h('i', { style: { width: (total ? (done / total) * 100 : 0) + '%' } })),
      h('button.btn.gold.wide.hero-go', { onclick: () => openWorkout() }, icon('play', 16), 'Resume'));
  }

  /** The plan that's up next (the one after the plan you did last), ready to start. */
  function upNext(p) {
    const last = lastDone(p);
    const muscles = topMuscles(p);
    const sets = p.exercises.reduce((n, e) => n + e.sets.length, 0);
    const mins = last ? Math.round(workoutStats(last).duration / 6e4) : null;
    return h('section.card.hero',
      h('div.hero-label', 'Up next'),
      h('button.hero-name', { onclick: () => push(() => planEditor(p)) }, p.name),
      muscles.length ? h('div.hero-chips', muscles.map((m) => h('span.chip.small', m))) : null,
      h('div.hero-meta', [`${p.exercises.length} exercise${p.exercises.length === 1 ? '' : 's'}`, `${sets} sets`, mins ? `about ${mins} min` : null, last ? `last ${ago(last.start)}` : 'not done yet'].filter(Boolean).join(' · ')),
      h('button.btn.gold.wide.hero-go', { onclick: () => startWorkout(p), disabled: !p.exercises.length }, icon('play', 16), `Start ${p.name}`));
  }

  function firstPlanCard() {
    return h('button.card.hero.empty-hero', { onclick: () => push(() => planEditor()) },
      h('div.hero-label', 'Get set up'),
      h('div.hero-name', 'Make your first plan'),
      h('div.hero-meta', 'Save up to 5 routines, like Push, Pull and Legs. Carver keeps them in order and has the next one ready to start.'),
      h('span.btn.gold.wide.hero-go', icon('plus', 16), 'New plan'));
  }

  /** Monday to Sunday: workouts done, days you planned, today. */
  function weekStrip() {
    const mon = ymd(weekStart()), today = ymd();
    const n = state.workouts.filter((w) => w.start >= weekStart()).length;
    const goal = state.goals.workoutsPerWeek;
    const did = new Set(state.workouts.filter((w) => w.start >= weekStart()).map((w) => ymd(w.start)));
    if (state.active) did.add(today);
    return h('section.card.wk-card',
      h('div.wk-days', DAY_SHORT.map((d, i) => {
        const k = addDays(mon, i);
        const cls = did.has(k) ? '.did' : dayPlan(k) === 'planned' && k >= today ? '.plan' : '';
        return h('div.wk-col' + cls + (k === today ? '.today' : ''), h('span.wk-d', d[0]), h('span.wk-dot', did.has(k) ? icon('check', 14) : null));
      })),
      h('div.wk-sum', h('b', `${n} of ${goal}`), n >= goal ? ' this week · goal hit 🔥' : ' workouts this week'));
  }

  function planRow(p, isNext) {
    const last = lastDone(p);
    return h('div.plan-row',
      h('button.plan-main', { onclick: () => push(() => planEditor(p)), 'aria-label': `Edit ${p.name}` },
        h('span.plan-badge' + (isNext ? '.next' : ''), p.name.trim()[0]?.toUpperCase() || '•'),
        h('span.plan-text',
          h('span.plan-name', p.name),
          h('span.plan-meta', [`${p.exercises.length} exercise${p.exercises.length === 1 ? '' : 's'}`, last ? `last ${ago(last.start)}` : 'not done yet'].join(' · ')))),
      h('button.icon-btn', { 'aria-label': `${p.name} options`, onclick: () => planMenu(p) }, icon('more')),
      h('button.play-btn', { 'aria-label': `Start ${p.name}`, onclick: () => startWorkout(p), disabled: !p.exercises.length }, icon('play', 16)));
  }

  function planMenu(p) {
    actionSheet(p.name, [
      { label: 'Start', onClick: () => startWorkout(p) },
      { label: 'Edit plan', onClick: () => push(() => planEditor(p)) },
      { label: 'Rename', onClick: async () => { const n = await promptBox('Rename plan', p.name); if (n) savePlan({ ...p, name: n }); } },
      { label: 'Duplicate', onClick: () => {
        if (state.plans.length >= MAX_PLANS) { toast(`You can keep ${MAX_PLANS} plans.`); return; }
        savePlan({ ...structuredClone(p), id: uid(), name: p.name + ' copy', created: Date.now() });
      } },
      { label: 'Delete plan', danger: true, onClick: async () => { if (await confirmBox(`Delete “${p.name}”?`, 'Your past workouts stay in History.', { ok: 'Delete', danger: true })) deletePlan(p.id); } },
    ]);
  }

  draw();
  return {
    el: (el.append(body), el),
    refresh: draw,
  };
}

/** The last finished workout from a plan. */
const lastDone = (p) => state.workouts.find((w) => w.planId === p.id || (!w.planId && w.name === p.name));

/** The plan after the one you did most recently (plans rotate in order). */
function nextPlan() {
  const plans = state.plans.filter((p) => p.exercises.length);
  if (!plans.length) return state.plans[0] || null;
  const lastW = state.workouts.find((w) => plans.some((p) => p.id === w.planId));
  if (!lastW) return plans[0];
  return plans[(plans.findIndex((p) => p.id === lastW.planId) + 1) % plans.length];
}

/** Working sets per muscle in one plan (helping muscles count half). */
function planMuscles(plan) {
  const t = tally(plan.exercises.map((e) => ({ exId: e.exId, sets: e.sets.filter((s) => s.type !== 'w').length })));
  const list = MUSCLE_ORDER.filter((m) => t[m].total > 0).sort((a, b) => t[b].total - t[a].total);
  if (!list.length) return null;
  return h('div.plan-muscles',
    h('div.form-label', 'Sets per muscle in this plan'),
    h('div.chips.tight.static', list.map((m) => h('span.chip', `${m} ${Math.round(t[m].total * 10) / 10}`))));
}

function topMuscles(p) {
  const t = tally(p.exercises.map((e) => ({ exId: e.exId, sets: e.sets.filter((s) => s.type !== 'w').length })));
  return MUSCLE_ORDER.filter((m) => t[m].total >= 1).sort((a, b) => t[b].total - t[a].total).slice(0, 4);
}

const ago = (ts) => {
  const d = Math.round((dayStart(ymd()) - dayStart(ymd(ts))) / 864e5);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 7 ? `${d} days ago` : fmtDate(ts, { month: 'short', day: 'numeric' });
};

/** History in weeks: "This week · 3 workouts · 24,500 lb", then each workout. */
function historyByWeek(list) {
  const weeks = [];
  for (const w of list) {
    const ws = weekStart(w.start);
    let g = weeks[weeks.length - 1];
    if (!g || g.ws !== ws) weeks.push(g = { ws, items: [] });
    g.items.push(w);
  }
  const thisWeek = weekStart(), lastWeek = weekStart(thisWeek - 3 * 864e5);
  return weeks.map((g) => {
    const vol = g.items.reduce((n, w) => n + workoutStats(w).volume, 0);
    const label = g.ws === thisWeek ? 'This week' : g.ws === lastWeek ? 'Last week'
      : `${fmtDate(g.ws, { month: 'short', day: 'numeric' })} – ${fmtDate(g.ws + 6 * 864e5, { month: 'short', day: 'numeric' })}`;
    return h('div.hist-week',
      h('div.hist-week-head', h('span', label), h('span', `${g.items.length} workout${g.items.length === 1 ? '' : 's'}${vol ? ` · ${fmtNum(+toDisplay(vol))} ${unit()}` : ''}`)),
      h('section.card.list-card', g.items.map(historyCard)));
  });
}

export function historyCard(w) {
  const st = workoutStats(w);
  const d = new Date(w.start);
  return h('button.hist-row', { onclick: () => push(() => workoutDetail(w)) },
    h('span.hist-date-box', h('span', d.toLocaleDateString(undefined, { weekday: 'short' })), h('b', d.getDate())),
    h('span.hist-text',
      h('span.hist-name', w.name, w.prs ? h('span.hist-pr', icon('trophy', 12), w.prs) : null),
      h('span.hist-stats', [fmtDurationWords(st.duration), `${st.sets} sets`, st.volume ? `${fmtNum(+toDisplay(st.volume))} ${unit()}` : null].filter(Boolean).join(' · ')),
      h('span.hist-ex', w.exercises.map((e) => exercise(e.exId).name).join(', '))),
    h('span.card-go', '›'));
}

// ---------- Workout detail ----------

export function workoutDetail(w) {
  const st = workoutStats(w);
  const el = h('div.page');
  const fmtSet = (info, s) => info.type === 'wr' ? `${toDisplay(s.weight)} ${unit()} × ${s.reps}` : info.type === 'bw' ? `${s.reps} reps` : fmtSecs(s.secs || 0);
  el.append(
    navBar({
      title: 'Workout', backLabel: 'Workout',
      right: [h('button.icon-btn', {
        'aria-label': 'Options',
        onclick: () => actionSheet(w.name, [
          { label: 'Repeat this workout', onClick: () => { pop(); repeatWorkout(w); } },
          { label: 'Save as a plan', onClick: () => saveAsPlan(w) },
          { label: 'Rename', onClick: async () => { const n = await promptBox('Rename workout', w.name); if (n) { commit((s) => { const x = s.workouts.find((y) => y.id === w.id); if (x) x.name = n; }); pop(); } } },
          { label: 'Delete workout', danger: true, onClick: async () => {
            if (await confirmBox('Delete this workout?', 'This cannot be undone.', { ok: 'Delete', danger: true })) { commit((s) => { s.workouts = s.workouts.filter((x) => x.id !== w.id); }); pop(); }
          } },
        ]),
      }, icon('more'))],
    }),
    h('div.scroll-body',
      h('h2.detail-title', w.name),
      h('div.detail-date', fmtDate(w.start, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) + ' · ' + new Date(w.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })),
      h('div.stats-row',
        h('div.stat', h('span.stat-k', 'Duration'), h('span.stat-v', fmtDurationWords(st.duration))),
        h('div.stat', h('span.stat-k', 'Volume'), h('span.stat-v', `${fmtNum(+toDisplay(st.volume) || 0)} ${unit()}`)),
        h('div.stat', h('span.stat-k', 'Sets'), h('span.stat-v', st.sets))),
      w.exercises.map((e) => {
        const info = exercise(e.exId);
        let n = 0;
        const best = info.type === 'wr' ? Math.max(...e.sets.map((s) => e1rm(s.weight, s.reps))) : 0;
        return h('section.card.detail-card',
          h('div.ex-title', info.name),
          e.note ? h('div.detail-note', e.note) : null,
          e.sets.map((s) => h('div.detail-set',
            h('span.set-num.t-' + s.type, s.type === 'n' ? ++n : s.type.toUpperCase()),
            h('span', fmtSet(info, s)))),
          best ? h('div.detail-best', `Best est. 1RM: ${toDisplay(best)} ${unit()}`) : null,
        );
      }),
      h('button.btn.gold.wide', { onclick: () => { pop(); repeatWorkout(w); } }, icon('play', 16), 'Repeat this workout'),
      h('div.bottom-space'),
    ),
  );
  return { el };
}

// ---------- Plan editor ----------

function planEditor(existing = null) {
  const plan = existing ? structuredClone(existing) : { id: uid(), name: '', created: Date.now(), exercises: [] };
  const el = h('div.page');
  const body = h('div.scroll-body');
  let dirty = false;
  const touch = () => { dirty = true; };

  const nameIn = h('input.workout-name', {
    value: plan.name, placeholder: 'Plan name, e.g. Push day', enterkeyhint: 'done',
    oninput: (e) => { plan.name = e.target.value; touch(); },
    onkeydown: (e) => { if (e.key === 'Enter') e.target.blur(); },
  });

  const nav = navBar({
    title: existing ? 'Edit plan' : 'New plan', back: false,
    right: [h('button.btn.gold.small', { onclick: doSave }, 'Save')],
  });
  nav.querySelector('.nav-left').append(h('button.link', {
    onclick: async () => {
      if (dirty && !(await confirmBox('Discard changes?', null, { ok: 'Discard', danger: true, cancel: 'Keep editing' }))) return;
      pop();
    },
  }, 'Cancel'));

  function doSave() {
    plan.name = plan.name.trim();
    if (!plan.name) { toast('Give your plan a name'); nameIn.focus(); return; }
    if (!plan.exercises.length) { toast('Add at least one exercise'); return; }
    if (!existing && state.plans.length >= MAX_PLANS) { toast(`You can keep ${MAX_PLANS} plans.`); return; }
    savePlan(plan);
    pop();
    toast(existing ? 'Plan saved' : 'Plan created');
  }

  function draw() {
    const y = body.scrollTop;
    fill(body, 
      nameIn,
      plan.exercises.length ? null : h('div.empty',
        h('div.empty-icon', icon('dumbbell', 40)),
        h('div.empty-title', 'Add exercises'),
        h('div.empty-text', 'Set how many sets, and the weight and reps you’re aiming for. They show as grey hints when you start the plan.')),
      plan.exercises.map((ex, i) => exerciseCard({
        ex, index: i, count: plan.exercises.length, mode: 'plan',
        redraw: () => { touch(); draw(); },
        save: touch,
        onMove: (d) => { const [m] = plan.exercises.splice(i, 1); plan.exercises.splice(i + d, 0, m); touch(); draw(); },
        onRemove: () => { plan.exercises.splice(i, 1); touch(); draw(); },
        onReplace: (id) => { ex.exId = id; touch(); draw(); },
      })),
      h('button.btn.gold.wide', {
        onclick: () => pickExercises((ids) => {
          ids.forEach((exId) => plan.exercises.push({ exId, note: '', rest: state.settings.restDefault ?? 90, sets: [newSet(), newSet(), newSet()] }));
          touch(); draw();
          setTimeout(() => body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' }), 50);
        }),
      }, icon('plus', 18), 'Add exercise'),
      planMuscles(plan),
      h('div.bottom-space'),
    );
    requestAnimationFrame(() => { body.scrollTop = y; });
  }
  draw();
  if (!existing) setTimeout(() => nameIn.focus(), 400);
  el.append(nav, body);
  return { el };
}
