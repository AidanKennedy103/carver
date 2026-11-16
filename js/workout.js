// The Workout page: quick start, My plans (up to 5), and History.
// Also the plan editor and the workout detail screen.

import { h, fill, icon, push, pop, navBar, actionSheet, confirmBox, promptBox, toast, fmtDate, fmtDurationWords, fmtDuration, fmtNum, fmtSecs } from './ui.js';
import { state, commit, save, uid, exercise, savePlan, deletePlan, workoutStats, toDisplay, unit, e1rm, MAX_PLANS } from './store.js';
import { startWorkout, openWorkout, repeatWorkout, saveAsPlan } from './session.js';
import { exerciseCard, newSet } from './block.js';
import { pickExercises } from './picker.js';
import { openSettings } from './settings.js';

export function workoutPage() {
  const el = h('div.page');
  const body = h('div.scroll-body');

  const nav = navBar({
    title: 'Workout', back: false, large: true,
    right: [h('button.icon-btn', { onclick: openSettings, 'aria-label': 'Settings' }, icon('gear'))],
  });

  function draw() {
    const a = state.active;
    const plansFull = state.plans.length >= MAX_PLANS;
    fill(body, 
      nav,

      a ? null : h('button.quick-start', { onclick: () => startWorkout() }, icon('plus', 18), 'Start empty workout'),

      h('div.section-head',
        h('h2.section-title', 'Plans', h('span.section-count', `${state.plans.length} of ${MAX_PLANS}`)),
        h('button.link' + (plansFull ? '.off' : ''), {
          onclick: () => plansFull ? toast(`You can keep ${MAX_PLANS} plans. Delete one to make room.`) : push(() => planEditor()),
        }, icon('plus', 16), 'New')),
      state.plans.length ? h('div.plan-grid', state.plans.map(planCard)) : h('button.card.empty-plan', { onclick: () => push(() => planEditor()) },
        h('div.empty-title', 'Make your first plan'),
        h('div.empty-text', 'Save up to 5 routines, like Push, Pull and Legs, and start them in one tap.')),

      h('div.section-head', h('h2.section-title', 'History')),
      state.workouts.length ? h('div.history', state.workouts.map(historyCard))
        : h('div.empty-small', 'Finished workouts show up here.'),
      h('div.bottom-space'),
    );
  }

  function planCard(p) {
    const names = p.exercises.map((e) => exercise(e.exId).name);
    const sets = p.exercises.reduce((n, e) => n + e.sets.length, 0);
    return h('div.card.plan-card',
      h('div.plan-top',
        h('button.plan-name', { onclick: () => push(() => planEditor(p)) }, p.name),
        h('button.icon-btn', {
          'aria-label': 'Plan options',
          onclick: () => actionSheet(p.name, [
            { label: 'Edit plan', onClick: () => push(() => planEditor(p)) },
            { label: 'Rename', onClick: async () => { const n = await promptBox('Rename plan', p.name); if (n) savePlan({ ...p, name: n }); } },
            { label: 'Duplicate', onClick: () => {
              if (state.plans.length >= MAX_PLANS) { toast(`You can keep ${MAX_PLANS} plans.`); return; }
              savePlan({ ...structuredClone(p), id: uid(), name: p.name + ' copy', created: Date.now() });
            } },
            { label: 'Delete plan', danger: true, onClick: async () => { if (await confirmBox(`Delete “${p.name}”?`, 'Your past workouts stay in History.', { ok: 'Delete', danger: true })) deletePlan(p.id); } },
          ]),
        }, icon('more'))),
      h('div.plan-meta', `${names.length} exercise${names.length === 1 ? '' : 's'} · ${sets} sets`),
      h('div.plan-ex', names.length ? names.join(' · ') : 'No exercises yet'),
      h('button.btn.gold-soft.plan-start', { onclick: () => startWorkout(p), disabled: !names.length }, 'Start'),
    );
  }

  draw();
  return {
    el: (el.append(body), el),
    refresh: draw,
  };
}

export function historyCard(w) {
  const st = workoutStats(w);
  return h('button.card.hist-card', { onclick: () => push(() => workoutDetail(w)) },
    h('div.hist-top', h('span.hist-name', w.name), h('span.hist-date', fmtDate(w.start))),
    h('div.hist-stats',
      h('span', fmtDurationWords(st.duration)),
      st.volume ? h('span', `${fmtNum(+toDisplay(st.volume))} ${unit()}`) : null,
      h('span', `${st.sets} sets`),
      w.prs ? h('span.gold-text', icon('trophy', 13), `${w.prs} PR${w.prs > 1 ? 's' : ''}`) : null),
    h('div.hist-ex', w.exercises.map((e) => exercise(e.exId).name).join(' · ')),
  );
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
          { label: 'Rename', onClick: async () => { const n = await promptBox('Rename workout', w.name); if (n) { commit(() => { w.name = n; }); pop(); } } },
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
      h('div.bottom-space'),
    );
    requestAnimationFrame(() => { body.scrollTop = y; });
  }
  draw();
  if (!existing) setTimeout(() => nameIn.focus(), 400);
  el.append(nav, body);
  return { el };
}
