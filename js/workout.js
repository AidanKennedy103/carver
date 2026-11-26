// The Workout page: what's up next (or the workout in progress), this week,
// your plans (up to 10), and History by week.
// Also the plan editor and the workout detail screen.

import { h, fill, icon, push, pop, navBar, actionSheet, confirmBox, promptBox, toast, fmtDate, fmtDurationWords, fmtNum, fmtSecs, holdToDrag, swipeRow } from './ui.js';
import { state, commit, save, uid, exercise, savePlan, deletePlan, splitPlans, setSplit, inSplit, workoutStats, toDisplay, unit, e1rm, MAX_PLANS, ymd, addDays, dayStart, weekStart, dayPlan, workoutDays, restNote, DAY_SHORT, previousSets, gymWorkouts, wtypes, typeOf, addType, isGym } from './store.js';
import { startWorkout, repeatWorkout, saveAsPlan, openWorkout, logPastWorkout, editWorkout } from './session.js';
import { exerciseCard, newSet, exerciseList, groupNew } from './block.js';
import { pickExercises } from './picker.js';
import { openSettings } from './settings.js';
import { volumeCard, tally, MUSCLE_ORDER, ALL_MUSCLES } from './volume.js';
import { programCard, setup531, program } from './program531.js';
import { coachPage, coachProgram, currentWeek, blockWeek, PROGRAMS } from './coach.js';
import { goalsButton } from './goals.js';
import { shareWorkout } from './share.js';

export function workoutPage() {
  const el = h('div.page');
  const body = h('div.scroll-body');

  const nav = navBar({
    title: 'Workout', back: false, large: true,
    right: [goalsButton('workout'), h('button.icon-btn', { onclick: openSettings, 'aria-label': 'Settings' }, icon('gear'))],
  });

  function draw() {
    const plansFull = state.plans.length >= MAX_PLANS;
    const next = nextPlan();
    fill(body,
      nav,
      // 1. Working out: start (or resume) a workout that's logged as you go
      state.active ? activeCard(state.active) : [
        next ? upNext(next) : freestyleHero()],
      weekStrip(),
      programCard(),
      coachProgram() ? builderCard() : null,

      // 2. Plans: routines you save for later. Making one doesn't log anything.
      h('div.section-head',
        h('h2.section-title', 'Your split', h('span.section-count', `${splitPlans().length}${state.plans.length > splitPlans().length ? ` of ${state.plans.length}` : ''}`)),
        h('span.head-links',
          state.plans.length ? h('button.link', { onclick: () => push(() => coachPage({ view: 'mine' })) }, 'All workouts') : null,
          h('button.link' + (plansFull ? '.off' : ''), {
            onclick: () => plansFull ? toast(`You can keep ${MAX_PLANS} plans. Delete one to make room.`) : push(() => planEditor()),
          }, icon('plus', 16), 'New'))),
      splitPlans().length ? holdToDrag(h('section.card.list-card.plan-list.swipey', splitPlans().map((p) => { const r = swipeRow(planRow(p, p === next), [{ label: 'Delete', danger: true, onClick: () => removePlan(p, draw) }]); r.classList.add('dg-item'); r.dataset.id = p.id; return r; })), { onDrop: reorderSplit })
        : state.plans.length ? h('button.card.empty-plan-row', { onclick: () => push(() => coachPage({ view: 'mine' })) }, icon('plus', 18), h('span', 'Pick the workouts in your split'))
          : h('button.card.empty-plan-row', { onclick: () => push(() => planEditor()) }, icon('plus', 18), h('span', 'Make your first plan')),
      typeSections(),
      state.plans.length || state.workouts.length ? volumeCard() : null,

      // 3. Build a program, then the other ways to work out
      h('button.btn.gold.wide.build-btn', { onclick: () => push(coachPage) }, icon('trophy', 18), 'Build a program'),
      state.active ? null : startOptions(next),

      h('div.section-head', h('h2.section-title', 'History'), state.workouts.length > 3 ? h('button.link', { onclick: () => push(historyScreen) }, `See all ${state.workouts.length}`) : null),
      state.workouts.length ? h('section.card.list-card', state.workouts.slice(0, 3).map(historyCard)) : h('div.empty-small', 'Finished workouts show up here.'),
      state.workouts.length > 3 ? h('button.btn.dark.wide.hist-more', { onclick: () => push(historyScreen) }, 'See more') : null,
      h('div.bottom-space'),
    );
  }

  /** The workout going on right now. */
  function activeCard(a) {
    const total = a.exercises.reduce((n, e) => n + e.sets.length, 0);
    const done = a.exercises.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0);
    return h('section.card.hero.start-hero.live',
      h('div.hero-label', a.past ? null : h('span.pulse'), a.past?.editOf ? 'Editing a workout' : a.past ? 'Logging a past workout' : 'In progress'),
      h('div.hero-name', a.name || 'Workout'),
      h('div.hero-meta', a.past ? `${fmtDate(a.start)} · ${total} sets` : `Started ${fmtDurationWords(Date.now() - a.start)} ago · ${done} of ${total} sets`),
      h('div.hero-progress', h('i', { style: { width: (total ? (done / total) * 100 : 0) + '%' } })),
      h('button.btn.gold.wide.hero-go', { onclick: () => openWorkout() }, icon('play', 16), 'Resume'));
  }

  /** The plan that's up next (the one after the plan you did last), ready to start. */
  function upNext(p) {
    const muscles = topMuscles(p);
    return h('section.card.hero.start-hero',
      h('div.hero-label', 'Next workout'),
      h('button.hero-name', { onclick: () => push(() => planEditor(p)) }, p.name),
      muscles.length ? h('div.hero-chips', muscles.map((m) => h('span.chip.small', m))) : null,
      restLine(),
      h('button.btn.gold.wide.hero-go', { onclick: () => startWorkout(p), disabled: !p.exercises.length }, icon('play', 16), `Start ${p.name}`));
  }

  /** On a rest day: how the week is going, read just before the Start button. */
  function restLine() {
    const rn = restNote();
    return rn ? h('div.hero-rest.' + rn.tone, h('b', rn.title)) : null;
  }

  function freestyleHero() {
    return h('section.card.hero.start-hero',
      h('div.hero-label', 'Start a workout'),
      h('div.hero-name', 'Freestyle'),
      h('div.hero-meta', 'Add exercises as you go. The timer starts when you tap Start.'),
      restLine(),
      h('button.btn.gold.wide.hero-go', { onclick: () => startWorkout() }, icon('play', 16), 'Start freestyle workout'));
  }

  /** The other ways to work out, under the big Start button. */
  function startOptions(next) {
    const opt = (ico, title, sub, onclick) => h('button.start-opt', { onclick },
      h('span.start-ico', ico), h('span.start-text', h('span.start-title', title), h('span.start-sub', sub)), h('span.card-go', '›'));
    const others = state.plans.filter((p) => p !== next && p.exercises.length);
    return h('section.card.list-card.start-opts.below',
      next ? opt(icon('bolt', 18), 'Freestyle workout', 'Make it up as you go, no plan', () => startWorkout()) : null,
      others.length ? opt('▶', 'Start a different plan', others.map((p) => p.name).slice(0, 3).join(', ') + (others.length > 3 ? '…' : ''),
        () => actionSheet('Start which plan?', others.map((p) => ({ label: p.name, onClick: () => startWorkout(p) })))) : null,
      opt(icon('calendar', 18), 'Log a past workout', 'One you did but didn’t track', () => logPastWorkout()));
  }

  /** The program you're running (opens Program builder). */
  function builderCard() {
    const cp = coachProgram();
    const name = cp.custom ? (cp.custom.name || 'Custom block') : PROGRAMS.find((x) => x.id === cp.id)?.name || 'Program';
    const w = currentWeek(cp);
    const sub = cp.mode === 'block' ? (w > cp.weeks ? 'Block complete' : `Week ${Math.max(1, w)} of ${cp.weeks} · ${blockWeek(cp, Math.max(1, w)).label}`) : 'Ongoing';
    return h('button.card.pb-entry', { onclick: () => push(coachPage) },
      h('span.pb-entry-ico', icon('trophy', 20)),
      h('span.pb-entry-text', h('span.pb-entry-name', name), h('span.pb-entry-sub', sub)),
      h('span.card-go', '›'));
  }

  /** Monday to Sunday: workouts done, days you planned, today. */
  function weekStrip() {
    const mon = ymd(weekStart()), today = ymd();
    const n = gymWorkouts().filter((w) => w.start >= weekStart()).length;
    const goal = state.goals.workoutsPerWeek;
    const did = new Set(gymWorkouts().filter((w) => w.start >= weekStart()).map((w) => ymd(w.start)));
    if (state.active) did.add(today);
    return h('section.card.wk-card',
      h('div.wk-days', DAY_SHORT.map((d, i) => {
        const k = addDays(mon, i);
        const cls = did.has(k) ? '.did' : dayPlan(k) === 'planned' && k >= today ? '.plan' : '';
        return h('div.wk-col' + cls + (k === today ? '.today' : ''), h('span.wk-d', d[0]), h('span.wk-dot', did.has(k) ? icon('check', 14) : null));
      })),
      h('div.wk-sum', h('b', `${n} of ${goal}`), n >= goal ? ' this week · goal hit' : ' workouts this week'));
  }

  /** Your split in a new order: the plans swap places in your list (others stay put). */
  function reorderSplit(els) {
    const ids = els.map((x) => x.dataset.id);
    commit((s) => {
      const queue = ids.map((id) => s.plans.find((p) => p.id === id)).filter(Boolean);
      s.plans = s.plans.map((p) => (ids.includes(p.id) ? queue.shift() : p));
    });
  }

  /** Your own workout types (Physio, Mobility…): each gets its own list, apart from your gym split. */
  function typeSections() {
    const full = () => { if (state.plans.length < MAX_PLANS) return false; toast(`You can keep ${MAX_PLANS} plans. Delete one to make room.`); return true; };
    return [
      wtypes().map((t) => {
        const plans = state.plans.filter((p) => p.type === t.id);
        return [
          h('div.section-head.type-head',
            h('h2.section-title', h('i.type-dot', { style: { background: t.color } }), t.name, h('span.section-count', String(plans.length))),
            h('span.head-links',
              h('button.link', { onclick: () => typeMenu(t) }, 'Edit'),
              h('button.link', { onclick: () => { if (!full()) push(() => planEditor(null, { type: t.id })); } }, icon('plus', 16), 'New'))),
          plans.length ? h('section.card.list-card.plan-list.swipey', plans.map((p) => swipeRow(planRow(p, false), [{ label: 'Delete', danger: true, onClick: () => removePlan(p, draw) }])))
            : h('button.card.empty-plan-row', { onclick: () => { if (!full()) push(() => planEditor(null, { type: t.id })); } }, icon('plus', 18), h('span', `Make your first ${t.name} workout`)),
        ];
      }),
      h('button.link.add-type', { onclick: async () => {
        const n = (await promptBox('New workout type', '', { placeholder: 'e.g. Physio, Mobility, Core' }))?.trim();
        if (!n) return;
        if (wtypes().some((t) => t.name.toLowerCase() === n.toLowerCase())) { toast(`You already have ${n}`); return; }
        const t = addType(n);
        toast(`${t.name} added. Its workouts don’t count toward your gym stats.`);
        if (!full()) push(() => planEditor(null, { type: t.id }));
      } }, icon('plus', 15), wtypes().length ? 'Another workout type' : 'Add a workout type (physio, mobility, core…)'),
    ];
  }

  function typeMenu(t) {
    actionSheet(t.name, [
      { label: 'Rename', onClick: async () => { const n = (await promptBox('Rename', t.name))?.trim(); if (n) commit((s) => { const x = s.settings.wtypes.find((y) => y.id === t.id); if (x) x.name = n; }); } },
      { label: `Delete ${t.name}`, danger: true, onClick: async () => {
        if (!(await confirmBox(`Delete ${t.name}?`, `Its plans and past workouts stay, but count as gym workouts again.`, { ok: 'Delete', danger: true }))) return;
        commit((s) => { s.settings.wtypes = s.settings.wtypes.filter((y) => y.id !== t.id); });
      } },
    ]);
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

  draw();
  return {
    el: (el.append(body), el),
    refresh: draw,
  };
}

/** A workout's options (the ⋯ button), on the Workout tab and in My workouts. after() redraws the list. */
export function planMenu(p, after = () => {}) {
  const on = inSplit(p);
  actionSheet(p.name, [
    { label: 'Start', onClick: () => startWorkout(p) },
    { label: 'Log it as a past workout', onClick: () => logPastWorkout(p) },
    { label: 'Edit plan', onClick: () => push(() => planEditor(p)) },
    { label: on ? 'Take out of my split' : 'Put in my split', onClick: () => { setSplit(p.id, !on); toast(on ? `${p.name} is out of your split. It’s still in My workouts.` : `${p.name} is in your split`); after(); } },
    { label: 'Share', onClick: () => shareWorkout(p) },
    { label: 'Rename', onClick: async () => { const n = await promptBox('Rename plan', p.name); if (n) { savePlan({ ...p, name: n }); after(); } } },
    { label: 'Duplicate', onClick: () => {
      if (state.plans.length >= MAX_PLANS) { toast(`You can keep ${MAX_PLANS} plans.`); return; }
      savePlan({ ...structuredClone(p), id: uid(), name: p.name + ' copy', created: Date.now() });
      after();
    } },
    { label: 'Delete plan', danger: true, onClick: async () => { if (await confirmBox(`Delete “${p.name}”?`, 'Your past workouts stay in History.', { ok: 'Delete', danger: true })) { deletePlan(p.id); after(); } } },
  ]);
}

/** Delete a plan; Undo puts it back where it was. A day of your running program asks first. */
export async function removePlan(p, after = () => {}) {
  const inProgram = coachProgram()?.plans.includes(p.id) || Object.values(program()?.plans || {}).includes(p.id);
  if (inProgram && !(await confirmBox(`Delete “${p.name}”?`, 'It’s a day of your program, which will run without it. Your past workouts stay in History.', { ok: 'Delete', danger: true }))) return;
  const at = state.plans.findIndex((x) => x.id === p.id);
  commit((s) => { s.plans = s.plans.filter((x) => x.id !== p.id); });
  after();
  toast(`Deleted ${p.name}`, { action: 'Undo', onAction: () => { commit((s) => { if (!s.plans.some((x) => x.id === p.id)) s.plans.splice(at, 0, p); }); after(); } });
}

/** The last finished workout from a plan. */
export const lastDone = (p) => state.workouts.find((w) => w.planId === p.id || (!w.planId && w.name === p.name));

/** The plan after the one you did most recently (plans rotate in order). */
export function nextPlan() {
  const plans = splitPlans().filter((p) => p.exercises.length);
  if (!plans.length) return splitPlans()[0] || null;
  const lastW = state.workouts.find((w) => plans.some((p) => p.id === w.planId));
  if (!lastW) return plans[0];
  return plans[(plans.findIndex((p) => p.id === lastW.planId) + 1) % plans.length];
}

/** Working sets per muscle in one plan (helping muscles count half). */
function planMuscles(plan) {
  const t = tally(plan.exercises.map((e) => ({ exId: e.exId, sets: e.sets.filter((s) => s.type !== 'w').length })));
  const list = ALL_MUSCLES.filter((m) => t[m].total > 0).sort((a, b) => t[b].total - t[a].total);
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

/** Every workout, by week. */
function historyScreen() {
  const el = h('div.page');
  const body = h('div.scroll-body');
  const draw = () => fill(body,
    navBar({ title: 'History', backLabel: 'Workout' }),
    state.workouts.length ? historyByWeek(state.workouts) : h('div.empty-small', 'Finished workouts show up here.'),
    h('div.bottom-space'));
  draw();
  el.append(body);
  return { el, refresh: draw };
}

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
      h('span.hist-name', w.name, typeOf(w.type) ? h('span.type-tag', { style: { color: typeOf(w.type).color, borderColor: typeOf(w.type).color } }, typeOf(w.type).name) : null, w.prs ? h('span.hist-pr', icon('trophy', 12), w.prs) : null),
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
          { label: 'Edit workout', onClick: () => { pop(); editWorkout(w); } },
          { label: 'Repeat this workout', onClick: () => { pop(); repeatWorkout(w); } },
          { label: 'Save as a plan', onClick: () => saveAsPlan(w) },
          { label: 'Share', onClick: () => shareWorkout(w) },
          { label: 'Post to a group', onClick: () => import('./groups.js').then((m) => m.postWorkout(w)) },
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

export function planEditor(existing = null, { type = null } = {}) {
  const plan = existing ? structuredClone(existing) : { id: uid(), name: '', created: Date.now(), exercises: [], ...(type ? { type } : {}) };
  // Empty sets start from what you did last time (real numbers you can keep or change)
  const fromLast = (ex) => {
    const prev = previousSets(ex.exId);
    if (!prev.length) return;
    ex.sets.forEach((s, i) => {
      if (s.tWeight != null || s.tReps != null || s.tSecs != null) return;
      const p = prev[i] || prev[prev.length - 1];
      s.tWeight = p.weight ?? null; s.tReps = p.reps ?? null; s.tSecs = p.secs ?? null;
    });
  };
  plan.exercises.forEach(fromLast);
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
    right: [h('button.btn.gold.small', { onclick: doSave }, 'Save plan')],
  });
  const planNote = h('div.plan-note', icon('edit', 15), h('span', 'You’re ', h('b', existing ? 'editing a plan' : 'making a plan'), ': a routine saved for later. Nothing is logged here. To work out, start it from the Workout tab.'));
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

  // Gym, or one of your own types (Physio…), which keeps it out of your gym stats
  const typeRow = h('div.chips.type-pick');
  const drawTypes = () => fill(typeRow,
    [{ id: null, name: 'Gym' }, ...wtypes()].map((t) => h('button.chip' + ((plan.type && typeOf(plan.type) ? plan.type : null) === t.id ? '.on' : ''), {
      onclick: () => { if (t.id) plan.type = t.id; else delete plan.type; touch(); drawTypes(); },
    }, t.color ? h('i.type-dot', { style: { background: t.color } }) : null, t.name)),
    h('button.chip.add', { onclick: async () => {
      const n = (await promptBox('New workout type', '', { placeholder: 'e.g. Physio, Mobility, Core' }))?.trim();
      if (!n) return;
      plan.type = (wtypes().find((t) => t.name.toLowerCase() === n.toLowerCase()) || addType(n)).id; touch(); drawTypes();
    } }, icon('plus', 13), 'Type'));
  drawTypes();

  function draw() {
    const y = body.scrollTop;
    fill(body,
      planNote,
      nameIn,
      typeRow,
      plan.exercises.length ? null : h('div.empty',
        h('div.empty-icon', icon('dumbbell', 40)),
        h('div.empty-title', 'Add exercises'),
        h('div.empty-text', 'Add exercises and set the weight and reps you’re aiming for.')),
      exerciseList(plan.exercises, (ex, i, extra) => ({
        ex, index: i, count: plan.exercises.length, mode: 'plan', prev: previousSets(ex.exId), ...extra,
        redraw: () => { touch(); draw(); },
        save: touch,
        onMove: (d) => { const [m] = plan.exercises.splice(i, 1); plan.exercises.splice(i + d, 0, m); touch(); draw(); },
        onRemove: () => { plan.exercises.splice(i, 1); touch(); draw(); },
        onReplace: (id) => { ex.exId = id; touch(); draw(); },
      }), (order) => { plan.exercises.splice(0, plan.exercises.length, ...order); touch(); draw(); }),
      plan.exercises.length > 1 ? h('p.fine.center.drag-hint', 'Hold an exercise to drag it.') : null,
      h('button.btn.gold.wide', {
        onclick: () => pickExercises((ids, kind) => {
          const added = ids.map((exId) => ({ exId, note: '', rest: state.settings.restDefault ?? 90, sets: [newSet(), newSet(), newSet()] }));
          added.forEach(fromLast);
          plan.exercises.push(...groupNew(added, kind));
          touch(); draw();
          setTimeout(() => body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' }), 50);
        }, { groups: true }),
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
