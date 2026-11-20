// The live workout: timer, exercises and sets, rest timer, finish and summary.
// The workout in progress is saved on every change, so closing the app
// (or iOS killing it) never loses it.

import { h, fill, icon, push, pop, navBar, confirmBox, promptBox, actionSheet, sheet, toast, fmtDuration, fmtDurationWords, fmtNum, fmtSecs } from './ui.js';
import { state, commit, save, uid, exercise, previousSets, workoutStats, findPRs, toDisplay, unit, MAX_PLANS, savePlan } from './store.js';
import { exerciseCard, newSet } from './block.js';
import { pickExercises } from './picker.js';
import { progressAfter } from './coach.js';
import { beep, unlockAudio } from './sound.js';

const defaultRest = () => state.settings.restDefault ?? 90;

function greeting(ts = Date.now()) {
  const hr = new Date(ts).getHours();
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
    ...(plan?.timer ? { timer: { ...plan.timer, started: null, result: null } } : {}),
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

// ---------- Past workouts ----------
// Logging one you forgot (or fixing a finished one) uses the same screen, with
// a date and length you pick instead of a running clock. w.past = { dur, editOf? }.

const pad = (n) => String(n).padStart(2, '0');
const dateVal = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const timeVal = (ts) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const shortDay = (ts) => new Date(ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

/** Day, start time and length (and, for a new one, what to start from). onSave({ start, dur, from }). */
export function whenSheet({ start, dur, title = 'When was it?', ok = 'Next', choose = false }, onSave) {
  const dateIn = h('input.field', { type: 'date', value: dateVal(start), max: dateVal(Date.now()) });
  const timeIn = h('input.field', { type: 'time', value: timeVal(start) });
  const durIn = h('input.field.goal-input', { value: String(Math.round(dur / 6e4)), inputmode: 'numeric', 'aria-label': 'Length in minutes' });
  const fromSel = choose ? h('select.field',
    h('option', { value: '' }, 'Empty: add exercises yourself'),
    state.plans.map((p) => h('option', { value: 'p:' + p.id }, `Plan: ${p.name}`)),
    state.workouts.slice(0, 10).map((w) => h('option', { value: 'w:' + w.id }, `Same as ${w.name} (${shortDay(w.start)})`))) : null;
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', title), h('button.link.strong', { onclick: go }, ok)),
    h('label.form-label', 'Day'), dateIn,
    h('label.form-label', 'Started at'), timeIn,
    h('div.group', h('label.goal-row', h('span', 'How long'), h('span.goal-field', durIn, h('span.goal-unit', 'min')))),
    choose ? [h('label.form-label', 'Start from'), fromSel,
      h('p.fine', 'Fill in the sets you did; empty ones are skipped.')] : null,
  ));
  function go() {
    const [y, m, d] = dateIn.value.split('-').map(Number);
    const [hh, mm] = (timeIn.value || '12:00').split(':').map(Number);
    if (!y) { toast('Pick a day'); return; }
    const t = new Date(y, m - 1, d, hh || 0, mm || 0).getTime();
    if (t > Date.now()) { toast('That’s in the future'); return; }
    const mins = Math.max(1, Math.min(600, Math.round(+durIn.value) || 60));
    s.close();
    const v = fromSel?.value || '';
    const from = v.startsWith('w:') ? { workout: state.workouts.find((w) => 'w:' + w.id === v) }
      : v.startsWith('p:') ? { plan: state.plans.find((p) => 'p:' + p.id === v) } : {};
    onSave({ start: t, dur: mins * 6e4, from });
  }
}

/** Log a workout you did earlier, empty, from a plan, or like a past one. */
export function logPastWorkout(plan = null) {
  if (state.active) { toast('Finish or discard the workout in progress first'); openWorkout(); return; }
  const y = new Date(); y.setDate(y.getDate() - 1); y.setHours(18, 0, 0, 0);
  whenSheet({ start: y.getTime(), dur: 60 * 6e4, title: 'Log a past workout', choose: !plan }, ({ start, dur, from }) => {
    const p = plan || from.plan, old = from.workout;
    const exercises = old
      ? old.exercises.map((e) => ({ exId: e.exId, note: '', rest: e.rest, sets: e.sets.map((x) => newSet({ type: x.type, tWeight: x.weight, tReps: x.reps, tSecs: x.secs })) }))
      : p ? p.exercises.map((pe) => ({ exId: pe.exId, note: pe.note || '', rest: pe.rest ?? defaultRest(), sets: (pe.sets.length ? pe.sets : [{}]).map((ps) => newSet(ps)) }))
        : [];
    commit((s) => {
      s.active = { id: uid(), name: (p || old)?.name || greeting(start), planId: p?.id || old?.planId || null, start, end: null, rest: null, past: { dur }, exercises };
    });
    openWorkout();
  });
}

/** Open a finished workout to change it. */
export function editWorkout(old) {
  if (state.active) { toast('Finish or discard the workout in progress first'); return; }
  const w = structuredClone(old);
  w.past = { dur: Math.max(6e4, (old.end || old.start) - old.start), editOf: old.id };
  delete w.prs; delete w.prList;
  w.exercises.forEach((e) => e.sets.forEach((x) => { x.done = true; }));
  commit((s) => { s.active = w; });
  openWorkout();
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
  const progress = h('i');
  const body = h('div.scroll-body');
  const restBar = h('div.rest-bar');
  let tick;

  const nav = navBar({
    back: true, backLabel: 'Hide',
    right: [h('button.btn.gold.small', { onclick: finish }, w.past ? 'Save' : 'Finish')],
  });
  nav.querySelector('.nav-title').textContent = w.past?.editOf ? 'Edit workout' : w.past ? 'Past workout' : 'Workout';

  // A past workout shows its day and length (tap to change) instead of a clock
  const whenBtn = w.past ? h('button.past-when', { onclick: changeWhen }) : null;
  const drawWhen = () => whenBtn && fill(whenBtn, icon('calendar', 15),
    h('span', `${shortDay(w.start)} · ${new Date(w.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · ${fmtDurationWords(w.past.dur)}`),
    h('span.past-change', 'Change'));
  function changeWhen() { whenSheet({ start: w.start, dur: w.past.dur, ok: 'Done' }, ({ start, dur }) => { w.start = start; w.past.dur = dur; save(); drawWhen(); updateStats(); }); }
  drawWhen();

  const title = h('input.workout-name', {
    value: w.name, enterkeyhint: 'done', 'aria-label': 'Workout name',
    oninput: (e) => { w.name = e.target.value; save(); },
    onkeydown: (e) => { if (e.key === 'Enter') e.target.blur(); },
  });

  // ----- Challenge timer: a countdown with rounds (AMRAP), or a stopwatch (for time) -----
  const timerEl = h('section.wt');
  const roundsDone = () => Math.min(...w.exercises.filter((e) => e.sets.length).map((e) => e.sets.filter((x) => x.done).length), 999) || 0;
  const tLeft = () => w.timer.secs - Math.floor((Date.now() - w.timer.started) / 1000);
  function drawTimer() {
    const t = w.timer;
    if (!t) return;
    if (!t.started) {
      fill(timerEl,
        h('div.wt-big', t.kind === 'fortime' ? '0:00' : fmtSecs(t.secs)),
        h('div.wt-label', t.kind === 'fortime' ? 'For time' : t.kind === 'amrap' ? `As many rounds as you can in ${Math.round(t.secs / 60)} min` : `${Math.round(t.secs / 60)} minutes`),
        h('button.btn.gold.wide', { onclick: () => { t.started = Date.now(); save(); drawTimer(); } }, icon('play', 16), 'Start timer'));
      return;
    }
    const over = t.kind !== 'fortime' && tLeft() <= 0;
    const big = t.kind === 'fortime' ? fmtSecs(t.result ?? Math.floor((Date.now() - t.started) / 1000)) : over ? '0:00' : fmtSecs(tLeft());
    fill(timerEl,
      h('div.wt-big' + (over || t.result != null ? '.done' : ''), big),
      h('div.wt-label', t.kind === 'fortime' ? (t.result != null ? 'Your time' : 'Running') : over ? 'Time’s up' : 'Left'),
      t.kind === 'amrap' ? h('div.wt-rounds', h('b', roundsDone()), ` round${roundsDone() === 1 ? '' : 's'}`) : null,
      t.kind === 'fortime' && t.result == null ? h('button.btn.gold.wide', { onclick: () => { t.result = Math.floor((Date.now() - t.started) / 1000); save(); drawTimer(); } }, 'Stop: I’m done') : null);
  }
  let buzzed = false;
  function timerTick() {
    const t = w.timer;
    if (!t?.started) return;
    if (t.kind !== 'fortime' && tLeft() <= 0 && !buzzed && !t.buzzed) {
      buzzed = t.buzzed = true; save();
      beep(); navigator.vibrate?.([200, 100, 200]);
      toast(t.kind === 'amrap' ? `Time! ${roundsDone()} rounds` : 'Time!');
    }
    const big = timerEl.querySelector('.wt-big'), rounds = timerEl.querySelector('.wt-rounds b');
    if (big && (t.kind !== 'fortime' || t.result == null)) {
      if (t.kind !== 'fortime' && tLeft() <= 0 && !big.classList.contains('done')) drawTimer();
      else big.textContent = t.kind === 'fortime' ? fmtSecs(Math.floor((Date.now() - t.started) / 1000)) : fmtSecs(Math.max(0, tLeft()));
    }
    if (rounds) rounds.textContent = roundsDone();
  }

  function updateStats() {
    const st = workoutStats(w);
    elapsed.textContent = w.past ? fmtDurationWords(w.past.dur) : fmtDuration(Date.now() - w.start);
    volumeEl.textContent = `${fmtNum(+toDisplay(st.volume) || 0)} ${unit()}`;
    const total = w.exercises.reduce((n, e) => n + e.sets.length, 0);
    setsEl.textContent = total ? `${st.sets}/${total}` : String(st.sets);
    progress.style.width = (total ? (st.sets / total) * 100 : 0) + '%';
  }

  function draw() {
    const y = body.scrollTop;
    fill(body,
      title,
      whenBtn,
      h('div.live-stats',
        h('div.stat.time', h('span.stat-k', 'Time'), elapsed),
        h('div.stat', h('span.stat-k', 'Volume'), volumeEl),
        h('div.stat', h('span.stat-k', 'Sets'), setsEl),
        h('div.live-progress', progress)),
      w.timer ? timerEl : null,
      w.exercises.length ? null : h('div.empty',
        h('div.empty-icon', icon('dumbbell', 40)),
        h('div.empty-title', w.past ? 'What did you do?' : 'Freestyle workout'),
        h('div.empty-text', w.past ? 'Add the exercises you did, then type in your sets.'
          : 'Add exercises as you go. Save it as a plan when you finish.')),
      w.exercises.map((ex, i) => exerciseCard({
        ex, index: i, count: w.exercises.length, mode: 'live', current: i === w.exercises.findIndex((e) => e.sets.some((x) => !x.done)),
        prev: previousSets(ex.exId, w.id),
        redraw: () => { save(); draw(); },
        save: () => { save(); updateStats(); },
        onSetDone: (e) => { updateStats(); if (e.rest && !w.past && state.settings.restOn !== false) startRest(e.rest, exercise(e.exId).name); },
        onMove: (d) => { const [m] = w.exercises.splice(i, 1); w.exercises.splice(i + d, 0, m); save(); draw(); },
        onRemove: async () => {
          if (ex.sets.some((s) => s.done) && !(await confirmBox('Remove ' + exercise(ex.exId).name + '?', 'Its logged sets will be removed too.', { ok: 'Remove', danger: true }))) return;
          w.exercises.splice(i, 1); save(); draw();
        },
        onReplace: (id) => { ex.exId = id; ex.sets.forEach((s) => { s.tWeight = s.tReps = s.tSecs = null; }); save(); draw(); },
      })),
      h('button.btn.gold.wide', { onclick: addExercises }, icon('plus', 18), 'Add exercise'),
      h('div.text-actions',
        h('button.link.plain', { onclick: workoutMenu }, 'Workout options'),
        h('button.link.red', { onclick: discard }, 'Discard workout')),
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
      w.past ? { label: 'Change day, time or length', onClick: changeWhen } : { label: 'Change start time', onClick: async () => {
        const mins = await promptBox('Started how many minutes ago?', String(Math.round((Date.now() - w.start) / 60000)), { inputmode: 'numeric' });
        if (mins != null && !isNaN(+mins)) { w.start = Date.now() - +mins * 60000; save(); updateStats(); }
      } },
      { label: 'Save as a plan', onClick: () => saveAsPlan(w) },
    ]);
  }

  async function discard() {
    const ok = w.past?.editOf ? await confirmBox('Discard changes?', 'The workout stays as it was.', { ok: 'Discard', danger: true })
      : await confirmBox('Discard workout?', 'Everything logged in this workout will be deleted.', { ok: 'Discard', danger: true });
    if (!ok) return;
    stopRest();
    commit((s) => { s.active = null; });
    pop();
  }

  async function finish() {
    if (w.past) { savePast(); return; }
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
    const tr = timerResult();
    const done = {
      ...w, end: Date.now(), rest: undefined,
      name: ((w.name || '').trim() || greeting()) + (tr ? ` · ${tr}` : ''),
      exercises: w.exercises.map((e) => ({ exId: e.exId, note: e.note, rest: e.rest, sets: e.sets.filter((s) => s.done).map(({ tWeight, tReps, tSecs, ...s }) => s) }))
        .filter((e) => e.sets.length),
    };
    const prs = findPRs(done);
    done.prs = prs.length;
    done.prList = prs;
    commit((s) => { s.workouts.unshift(done); s.active = null; });
    pop();
    showSummary(done, prs, progressAfter(done));
  }

  // A past workout: sets you ticked or filled in count, empty ones are left out
  function savePast() {
    const filled = (info, x) => (info.type === 'time' ? x.secs != null : x.reps != null);
    const exercises = w.exercises.map((e) => {
      const info = exercise(e.exId);
      return {
        exId: e.exId, note: e.note, rest: e.rest,
        sets: e.sets.filter((x) => x.done || filled(info, x)).map(({ tWeight, tReps, tSecs, ...x }) => ({ ...x, weight: info.type === 'wr' ? x.weight ?? 0 : x.weight, done: true })),
      };
    }).filter((e) => e.sets.length);
    if (!exercises.length) { toast('Fill in at least one set'); return; }
    const { past, rest, ...base } = w;
    const done = { ...base, id: past.editOf || w.id, name: (w.name || '').trim() || greeting(w.start), end: w.start + past.dur, exercises };
    commit((s) => {
      s.workouts = s.workouts.filter((x) => x.id !== done.id);   // editing: the old copy goes, so PRs compare against the rest
      const prs = findPRs(done);
      done.prs = prs.length; done.prList = prs;
      s.workouts.push(done);
      s.workouts.sort((a, b) => b.start - a.start);
      s.active = null;
    });
    pop();
    toast(past.editOf ? 'Workout saved' : `Logged ${done.name} on ${shortDay(done.start)}`);
  }

  /** "18 rounds" or "6:42" for a challenge with a timer. */
  function timerResult() {
    const t = w.timer;
    if (!t?.started) return '';
    if (t.kind === 'amrap') return `${roundsDone()} round${roundsDone() === 1 ? '' : 's'}`;
    if (t.kind === 'fortime') return fmtSecs(t.result ?? Math.floor((Date.now() - t.started) / 1000));
    return '';
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
    if (left <= 0) { restOver(); drawRest(); return; }
    restBar.querySelector('.rest-time').textContent = fmtSecs(left);
    restBar.querySelector('.rest-label').textContent = w.rest.name ? `Rest · ${w.rest.name}` : 'Rest';
    restBar.querySelector('.rest-fill').style.width = `${Math.min(100, (left / w.rest.total) * 100)}%`;
  }

  el.append(nav, body, restBar);
  draw();
  drawRest();
  return {
    el,
    onShow() { clearInterval(tick); tick = setInterval(() => { updateStats(); restTick(); timerTick(); }, 250); restTick(); drawTimer(); },
    onHide() { clearInterval(tick); },
  };
}

/** Rest has run out: chime (if on), say so, clear it. Runs from the workout screen or any tab. */
export function restOver() {
  const w = state.active;
  if (!w?.rest) return;
  const name = w.rest.name;
  commit((s) => { s.active.rest = null; });
  beep();
  toast(`Rest's over${name ? ' · ' + name : ''}`);
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

/** Save how a finished workout felt: effort 1 easy, 2 just right, 3 too much; joints 0 fine, 1 achy. */
export function setFeel(id, feel) {
  commit((s) => { const x = s.workouts.find((y) => y.id === id); if (x) x.feel = { ...(x.feel || {}), ...feel }; });
}
export const EFFORT = ['Easy', 'Just right', 'Too much'];

/** Two quick taps: how hard it was, and how your joints feel. */
export function feelPicker(w, after) {
  const box = h('div.feel');
  const f = { ...(w.feel || {}) };
  const draw = () => fill(box,
    h('div.feel-q', 'How did that feel?'),
    h('div.segment.feel-seg', EFFORT.map((l, i) => h('button' + (f.effort === i + 1 ? '.on' : ''), { onclick: () => { f.effort = i + 1; setFeel(w.id, { effort: f.effort }); draw(); after?.(); } }, l))),
    h('div.feel-q', 'Joints'),
    h('div.segment.feel-seg', [['Fine', 0], ['Achy', 1], ['Painful', 2]].map(([l, v]) => h('button' + (f.joints === v ? '.on' : ''), { onclick: () => { f.joints = v; setFeel(w.id, { joints: v }); draw(); after?.(); } }, l))));
  draw();
  return box;
}

export function showSummary(w, prs, changes = []) {
  const st = workoutStats(w);
  const s = sheet(h('div.summary',
    h('div.summary-burst', icon('trophy', 44)),
    h('div.summary-title', 'Workout complete'),
    h('div.summary-sub', w.name),
    h('div.stats-row.big',
      h('div.stat', h('span.stat-k', 'Duration'), h('span.stat-v', fmtDurationWords(st.duration))),
      h('div.stat', h('span.stat-k', 'Volume'), h('span.stat-v', `${fmtNum(+toDisplay(st.volume) || 0)} ${unit()}`)),
      h('div.stat', h('span.stat-k', 'Sets'), h('span.stat-v', st.sets))),
    changes.length ? h('div.pr-list',
      h('div.section-label', 'Next time (your program)'),
      changes.map((c) => h('div.pr-row', h('span.chg.' + c.kind, icon(c.kind === 'down' ? 'down' : 'up', 16)),
        h('span.pr-name', exercise(c.exId).name),
        h('span.pr-val', c.reps ? `${c.from} → ${c.to} reps` : `${toDisplay(c.from)} → ${toDisplay(c.to)} ${unit()}`)))) : null,
    prs.length ? h('div.pr-list',
      h('div.section-label', `${prs.length} personal record${prs.length > 1 ? 's' : ''}`),
      prs.map((p) => h('div.pr-row', icon('trophy', 18),
        h('span.pr-name', exercise(p.exId).name),
        h('span.pr-val', p.kind + ': ' + (p.kg != null ? `${toDisplay(p.kg)} ${unit()}` : `${p.reps} reps`))))) : null,
    w.past ? null : feelPicker(w),
    h('button.btn.gold.wide', { onclick: () => s.close() }, 'Done'),
    h('button.btn.dark.wide.summary-plan', { onclick: () => import('./groups.js').then((m) => m.postWorkout(w)) }, icon('users', 16), 'Post to a group'),
    w.planId ? null : h('button.btn.dark.wide.summary-plan', { onclick: () => { s.close(); saveAsPlan(w); } }, 'Save as a plan to repeat it'),
  ));
}
