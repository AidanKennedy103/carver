// The live workout: timer, exercises and sets, rest timer, finish and summary.
// The workout in progress is saved on every change, so closing the app
// (or iOS killing it) never loses it.

import { h, fill, icon, push, pop, navBar, confirmBox, promptBox, actionSheet, sheet, toast, fmtDuration, fmtDurationWords, fmtNum, fmtSecs } from './ui.js';
import { state, commit, save, uid, exercise, previousSets, workoutStats, findPRs, toDisplay, unit, MAX_PLANS, savePlan } from './store.js';
import { exerciseCard, newSet } from './block.js';
import { pickExercises } from './picker.js';
import { beep, unlockAudio } from './sound.js';

const defaultRest = () => state.settings.restDefault ?? 90;

function greeting() {
  const hr = new Date().getHours();
  return hr < 11 ? 'Morning workout' : hr < 17 ? 'Afternoon workout' : 'Evening workout';
}

/** Start a workout, empty or from a plan. */
export async function startWorkout(plan = null) {
  if (state.active) {
    const ok = await confirmBox('A workout is already going', 'Discard it and start a new one?', { ok: 'Start new', danger: true });
    if (!ok) { openWorkout(); return; }
  }
  unlockAudio();
  const w = {
    id: uid(), name: plan ? plan.name : greeting(), planId: plan?.id || null, start: Date.now(), end: null, rest: null,
    exercises: plan ? plan.exercises.map((pe) => ({
      exId: pe.exId, note: pe.note || '', rest: pe.rest ?? defaultRest(),
      sets: (pe.sets.length ? pe.sets : [{}]).map((ps) => newSet(ps)),
    })) : [],
  };
  commit((s) => { s.active = w; });
  openWorkout();
}

/** Start again from a finished workout (History → Repeat). */
export function repeatWorkout(old) {
  startWorkout({
    id: null, name: old.name,
    exercises: old.exercises.map((e) => ({ exId: e.exId, note: '', rest: e.rest, sets: e.sets.filter((s) => s.done).map((s) => ({ type: s.type, tWeight: s.weight, tReps: s.reps, tSecs: s.secs })) })),
  });
}

export function openWorkout() {
  if (!state.active) return;
  push(workoutScreen);
}

function workoutScreen() {
  const w = state.active;
  const el = h('div.workout-screen');
  const elapsed = h('span.stat-v', '0:00');
  const volumeEl = h('span.stat-v', '0');
  const setsEl = h('span.stat-v', '0');
  const body = h('div.scroll-body');
  const restBar = h('div.rest-bar');
  let tick;

  const nav = navBar({
    back: true, backLabel: 'Hide',
    right: [h('button.btn.gold.small', { onclick: finish }, 'Finish')],
  });
  nav.querySelector('.nav-title').append(h('div.nav-title-stack', h('span', 'Workout'), elapsed));

  const title = h('input.workout-name', {
    value: w.name, enterkeyhint: 'done', 'aria-label': 'Workout name',
    oninput: (e) => { w.name = e.target.value; save(); },
    onkeydown: (e) => { if (e.key === 'Enter') e.target.blur(); },
  });

  function updateStats() {
    const st = workoutStats(w);
    elapsed.textContent = fmtDuration(Date.now() - w.start);
    volumeEl.textContent = `${fmtNum(+toDisplay(st.volume) || 0)} ${unit()}`;
    setsEl.textContent = st.sets;
  }

  function draw() {
    const y = body.scrollTop;
    fill(body, 
      title,
      h('div.stats-row',
        h('div.stat', h('span.stat-k', 'Duration'), elapsed),
        h('div.stat', h('span.stat-k', 'Volume'), volumeEl),
        h('div.stat', h('span.stat-k', 'Sets'), setsEl)),
      w.exercises.length ? null : h('div.empty',
        h('div.empty-icon', icon('dumbbell', 40)),
        h('div.empty-title', 'Get started'),
        h('div.empty-text', 'Add an exercise to start logging sets.')),
      w.exercises.map((ex, i) => exerciseCard({
        ex, index: i, count: w.exercises.length, mode: 'live',
        prev: previousSets(ex.exId, w.id),
        redraw: () => { save(); draw(); },
        save: () => { save(); updateStats(); },
        onSetDone: (e) => { updateStats(); if (e.rest) startRest(e.rest, exercise(e.exId).name); },
        onMove: (d) => { const [m] = w.exercises.splice(i, 1); w.exercises.splice(i + d, 0, m); save(); draw(); },
        onRemove: async () => {
          if (ex.sets.some((s) => s.done) && !(await confirmBox('Remove ' + exercise(ex.exId).name + '?', 'Its logged sets will be removed too.', { ok: 'Remove', danger: true }))) return;
          w.exercises.splice(i, 1); save(); draw();
        },
        onReplace: (id) => { ex.exId = id; ex.sets.forEach((s) => { s.tWeight = s.tReps = s.tSecs = null; }); save(); draw(); },
      })),
      h('button.btn.gold.wide', { onclick: addExercises }, icon('plus', 18), 'Add exercise'),
      h('div.btn-pair',
        h('button.btn.dark', { onclick: workoutMenu }, 'Options'),
        h('button.btn.danger-soft', { onclick: discard }, 'Discard workout')),
      h('div.bottom-space'),
    );
    updateStats();
    requestAnimationFrame(() => { body.scrollTop = y; });
  }

  function addExercises() {
    pickExercises((ids) => {
      ids.forEach((exId) => {
        const prev = previousSets(exId, w.id);
        const n = Math.max(prev.length, 1);
        w.exercises.push({ exId, note: '', rest: defaultRest(), sets: Array.from({ length: Math.min(n, 6) }, () => newSet()) });
      });
      save(); draw();
      setTimeout(() => body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' }), 50);
    });
  }

  function workoutMenu() {
    actionSheet('Workout options', [
      { label: 'Change start time', onClick: async () => {
        const mins = await promptBox('Started how many minutes ago?', String(Math.round((Date.now() - w.start) / 60000)), { inputmode: 'numeric' });
        if (mins != null && !isNaN(+mins)) { w.start = Date.now() - +mins * 60000; save(); updateStats(); }
      } },
      { label: 'Save as a plan', onClick: () => saveAsPlan(w) },
    ]);
  }

  async function discard() {
    const ok = await confirmBox('Discard workout?', 'Everything logged in this workout will be deleted.', { ok: 'Discard', danger: true });
    if (!ok) return;
    stopRest();
    commit((s) => { s.active = null; });
    pop();
  }

  async function finish() {
    const st = workoutStats(w);
    if (!st.sets) {
      const ok = await confirmBox('No sets completed', 'Tick off at least one set to save this workout, or discard it.', { ok: 'Discard', danger: true, cancel: 'Keep going' });
      if (ok) { commit((s) => { s.active = null; }); pop(); }
      return;
    }
    const unfinished = w.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.done).length, 0);
    if (unfinished && !(await confirmBox('Finish workout?', `${unfinished} set${unfinished > 1 ? 's are' : ' is'} not ticked off. Those will be left out.`, { ok: 'Finish' }))) return;
    stopRest();
    // Keep only completed sets; drop exercises with none
    const done = {
      ...w, end: Date.now(), rest: undefined,
      name: (w.name || '').trim() || greeting(),
      exercises: w.exercises.map((e) => ({ exId: e.exId, note: e.note, rest: e.rest, sets: e.sets.filter((s) => s.done).map(({ tWeight, tReps, tSecs, ...s }) => s) }))
        .filter((e) => e.sets.length),
    };
    const prs = findPRs(done);
    done.prs = prs.length;
    commit((s) => { s.workouts.unshift(done); s.active = null; });
    pop();
    showSummary(done, prs);
  }

  // ----- Rest timer -----
  function startRest(secs, name) {
    w.rest = { until: Date.now() + secs * 1000, total: secs, name };
    save();
    drawRest();
  }
  function stopRest() { if (w.rest) { w.rest = null; save(); } drawRest(); }
  function drawRest() {
    if (!w.rest) { restBar.classList.remove('show'); return; }
    restBar.classList.add('show');
  }
  restBar.append(
    h('button.rest-adj', { onclick: () => { if (w.rest) { w.rest.until -= 15000; w.rest.total = Math.max(1, w.rest.total - 15); save(); } } }, '−15'),
    h('div.rest-mid', h('div.rest-time', '0:00'), h('div.rest-label', 'Rest'), h('div.rest-track', h('div.rest-fill'))),
    h('button.rest-adj', { onclick: () => { if (w.rest) { w.rest.until += 15000; w.rest.total += 15; save(); } } }, '+15'),
    h('button.rest-skip', { onclick: stopRest }, 'Skip'),
  );
  function restTick() {
    if (!w.rest) return;
    const left = Math.ceil((w.rest.until - Date.now()) / 1000);
    if (left <= 0) {
      const name = w.rest.name;
      stopRest();
      beep();
      toast(`Rest's over${name ? ' · ' + name : ''}`);
      return;
    }
    restBar.querySelector('.rest-time').textContent = fmtSecs(left);
    restBar.querySelector('.rest-label').textContent = w.rest.name ? `Rest · ${w.rest.name}` : 'Rest';
    restBar.querySelector('.rest-fill').style.width = `${Math.min(100, (left / w.rest.total) * 100)}%`;
  }

  el.append(nav, body, restBar);
  draw();
  drawRest();
  return {
    el,
    onShow() { clearInterval(tick); tick = setInterval(() => { updateStats(); restTick(); }, 250); restTick(); },
    onHide() { clearInterval(tick); },
  };
}

export async function saveAsPlan(w) {
  if (state.plans.length >= MAX_PLANS) { toast(`You already have ${MAX_PLANS} plans. Delete one first.`); return; }
  const name = await promptBox('Plan name', w.name);
  if (!name) return;
  savePlan({
    id: uid(), name, created: Date.now(),
    exercises: w.exercises.map((e) => ({
      exId: e.exId, note: '', rest: e.rest ?? defaultRest(),
      sets: (e.sets.filter((s) => s.done).length ? e.sets.filter((s) => s.done) : e.sets).map((s) => ({ id: uid(), type: s.type, tWeight: s.weight ?? s.tWeight, tReps: s.reps ?? s.tReps, tSecs: s.secs ?? s.tSecs })),
    })),
  });
  toast('Saved to My plans');
}

function showSummary(w, prs) {
  const st = workoutStats(w);
  const s = sheet(h('div.summary',
    h('div.summary-burst', icon('trophy', 44)),
    h('div.summary-title', 'Workout complete'),
    h('div.summary-sub', w.name),
    h('div.stats-row.big',
      h('div.stat', h('span.stat-k', 'Duration'), h('span.stat-v', fmtDurationWords(st.duration))),
      h('div.stat', h('span.stat-k', 'Volume'), h('span.stat-v', `${fmtNum(+toDisplay(st.volume) || 0)} ${unit()}`)),
      h('div.stat', h('span.stat-k', 'Sets'), h('span.stat-v', st.sets))),
    prs.length ? h('div.pr-list',
      h('div.section-label', `${prs.length} personal record${prs.length > 1 ? 's' : ''}`),
      prs.map((p) => h('div.pr-row', icon('trophy', 18),
        h('span.pr-name', exercise(p.exId).name),
        h('span.pr-val', p.kind + ': ' + (p.kg != null ? `${toDisplay(p.kg)} ${unit()}` : `${p.reps} reps`))))) : null,
    h('button.btn.gold.wide', { onclick: () => s.close() }, 'Done'),
  ));
}
