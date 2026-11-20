// Guided challenges (Cindy, Murph, Fran…): a briefing first, then one step at a time.
// "Do 5 pull-ups" → enter what you did → "Do 10 push-ups" … with the timer on top.
//
// Step kinds (challenge.guide):
//   { type: 'task', exId, label }               a run or walk: tap Done (its time is logged)
//   { type: 'reps', exId, total }               do this many (enter fewer and it asks for the rest)
//   { type: 'pool', items: [{ exId, total }] }  as many as you can of each in turn, until all are done (Murph)
//   { type: 'rounds', items: [{ exId, reps }] } a round of each, again and again until time's up (Cindy);
//                                               "Add round" logs a whole round in one tap

import { h, fill, icon, navBar, pop, push, toast, confirmBox, fmtSecs, actionSheet } from './ui.js';
import { commit, uid, exercise, findPRs } from './store.js';
import { beep, unlockAudio } from './sound.js';
import { showSummary } from './session.js';
import { howTo } from './howto.js';

const lower = (exId) => exercise(exId).name.toLowerCase();
const plural = (n, exId) => { const nm = lower(exId); return n === 1 ? nm.replace(/s$/, '') : /s$/.test(nm) ? nm : nm + 's'; };

export function guidedScreen(c, mins = null, invite = null) {
  let adjust = false;   // rounds: show the number box to enter a different count
  const el = h('div.page');
  const body = h('div.scroll-body.guided');
  const timer = c.timer ? { ...c.timer, ...(mins ? { secs: mins * 60 } : {}) } : { kind: 'fortime' };
  let phase = 'brief', started = 0, ended = 0, tick = 0, buzzed = false;
  const log = [];                                  // [{ exId, reps?, secs? }]
  let si = 0;                                      // which step of the guide
  let rounds = 0, ri = 0;                          // rounds: finished rounds, place in the round
  let left = null, pi = 0, taskStart = 0;          // reps/pool: what's left; pool: whose turn
  let value = 0;                                   // the number in the box

  const secsGone = () => Math.floor(((ended || Date.now()) - started) / 1000);
  const remaining = () => (timer.secs ? timer.secs - secsGone() : null);
  const step = () => c.guide[si];
  const amrap = timer.kind === 'amrap';

  function enter() {                               // set up the step we just moved to
    const s = step();
    if (!s) { done(); return; }
    if (s.type === 'reps') left = left ?? s.total;
    if (s.type === 'pool') { left = left ?? s.items.map((x) => x.total); pi = left.findIndex((n) => n > 0); }
    if (s.type === 'task') taskStart = Date.now();
    value = target();
    draw();
  }
  function target() {
    const s = step();
    if (!s) return 0;
    if (s.type === 'reps') return left;
    if (s.type === 'pool') return Math.min(left[pi], s.items[pi].chunk || left[pi]);
    if (s.type === 'rounds') return s.items[ri].reps;
    return 0;
  }
  const nextStep = () => { si++; left = null; pi = 0; enter(); };

  function doneStep() {
    unlockAudio();
    const s = step();
    if (s.type === 'task') { log.push({ exId: s.exId, secs: Math.round((Date.now() - taskStart) / 1000) }); nextStep(); return; }
    const n = Math.max(0, Math.round(value));
    if (s.type === 'reps') {
      if (n) log.push({ exId: s.exId, reps: n });
      left = Math.max(0, left - n);
      if (!left) nextStep(); else { value = left; draw(); }
      return;
    }
    if (s.type === 'pool') {
      if (n) log.push({ exId: s.items[pi].exId, reps: n });
      left[pi] = Math.max(0, left[pi] - n);
      if (left.every((x) => x === 0)) { nextStep(); return; }
      do pi = (pi + 1) % left.length; while (left[pi] === 0);   // next exercise with some left
      value = target(); draw();
      return;
    }
    if (s.type === 'rounds') {
      if (n) log.push({ exId: s.items[ri].exId, reps: n });
      ri++;
      if (ri >= s.items.length) { ri = 0; rounds++; if (!amrap && s.times && rounds >= s.times) { nextStep(); return; } }
      value = target(); draw();
    }
  }
  /** Rounds: log a whole round at once (from where you are in it). */
  function addRound() {
    unlockAudio();
    const s = step();
    for (let i = ri; i < s.items.length; i++) log.push({ exId: s.items[i].exId, reps: s.items[i].reps });
    ri = 0; rounds++;
    navigator.vibrate?.(15);
    value = target(); draw();
  }

  function start() {
    unlockAudio();
    phase = 'go'; started = Date.now();
    tick = setInterval(onTick, 250);
    enter();
  }
  function onTick() {
    const t = el.querySelector('.gd-time');
    if (t) t.textContent = timer.secs ? fmtSecs(Math.max(0, remaining())) : fmtSecs(secsGone());
    if (timer.secs && remaining() <= 0 && !buzzed) {
      buzzed = true; beep(); navigator.vibrate?.([200, 100, 200]);
      done();
    }
  }
  function result() {
    if (amrap) { const extra = ri ? ` + ${log.slice(-ri).reduce((a, x) => a + (x.reps || 0), 0)} reps` : ''; return `${rounds} round${rounds === 1 ? '' : 's'}${extra}`; }
    if (timer.kind === 'countdown') return `${Math.round(secsGone() / 60)} min`;
    return fmtSecs(secsGone());
  }
  function done() {
    if (phase === 'done') return;
    ended = Date.now(); clearInterval(tick);
    phase = 'done'; draw();
  }
  function save() {
    if (!log.length) { pop(); return; }
    const byEx = [];
    for (const x of log) {
      let e = byEx.find((y) => y.exId === x.exId && (x.secs != null) === (y.time === true));
      if (!e || x.secs != null) { e = { exId: x.exId, note: '', rest: 0, sets: [], time: x.secs != null }; byEx.push(e); }
      e.sets.push({ id: uid(), type: 'n', weight: null, reps: x.reps ?? null, secs: x.secs ?? null, done: true });
    }
    const w = { id: uid(), name: `${c.name} · ${result()}`, start: started, end: ended, challenge: c.id, exercises: byEx.map(({ time, ...e }) => e) };
    const prs = findPRs(w);
    w.prs = prs.length; w.prList = prs;
    commit((s) => { s.workouts.unshift(w); s.workouts.sort((a, b) => b.start - a.start); });
    pop();
    showSummary(w, prs);
  }

  // ---------- Drawing ----------

  const exLink = (exId, label) => h('button.gd-ex', { onclick: () => howTo(exId) }, label, h('span.ex-howto', '?'));

  function brief() {
    return [
      invite ? h('section.card.gd-invite', icon('flag', 18), h('span', h('b', invite.from || 'A friend'), ' challenged you', invite.score ? [' · score to beat: ', h('b', invite.score)] : '')) : null,
      h('div.chal-nums', c.nums),
      h('p.coach-summary', c.about),
      h('label.form-label', 'How it works'),
      h('ol.chal-how', c.how.map((x) => h('li', x))),
      h('label.form-label', 'The moves'),
      h('section.card.list-card', [...new Set(c.ex.map((e) => e.exId))].map((id) => h('button.group-row', { onclick: () => howTo(id) },
        h('span', exercise(id).name), h('span.row-val', 'How to ›')))),
      h('label.form-label', 'Make it easier'),
      h('p.fine', c.scale),
      c.choose ? [h('label.form-label', 'How long'), h('div.segment', c.choose.map((m) => h('button' + (m === (mins ?? c.choose[c.choose.length - 1]) ? '.on' : ''), { onclick: () => { mins = m; timer.secs = m * 60; draw(); } }, `${m} min`)))] : null,
      h('button.btn.gold.wide.coach-go', { onclick: start }, icon('play', 16), 'Start'),
      h('button.btn.dark.wide.gd-challenge', { onclick: () => challengeFriends(c, null) }, icon('users', 16), 'Challenge friends'),
      h('p.fine.center', amrap ? 'The timer starts when you tap Start. Carver tells you each move as you go.' : timer.kind === 'countdown' ? 'The timer starts when you tap Start.' : 'The clock runs until the last move is done.'),
    ];
  }

  function stepCard() {
    const s = step();
    if (!s) return null;
    const stepper = h('div.gd-stepper',
      h('button.gd-pm', { onclick: () => { value = Math.max(0, value - 1); draw(); }, 'aria-label': 'One fewer' }, icon('minus', 18)),
      h('input.gd-num', { type: 'number', inputmode: 'numeric', value, oninput: (e) => { value = +e.target.value || 0; } }),
      h('button.gd-pm', { onclick: () => { value += 1; draw(); }, 'aria-label': 'One more' }, icon('plus', 18)));
    if (s.type === 'task') return h('section.card.gd-step',
      h('div.gd-kicker', 'Now'), h('div.gd-what', s.label),
      s.sub ? h('div.gd-sub', s.sub) : null,
      h('button.btn.gold.wide.gd-done', { onclick: doneStep }, 'Done'));
    if (s.type === 'reps') return h('section.card.gd-step',
      h('div.gd-kicker', left < s.total ? `${left} left` : 'Now'),
      h('div.gd-what', exLink(s.exId, `${left} ${plural(left, s.exId)}`)),
      h('div.gd-sub', 'Break it up however you need. Enter what you did.'),
      stepper, h('button.btn.gold.wide.gd-done', { onclick: doneStep }, 'Done'));
    if (s.type === 'pool') {
      const it = s.items[pi];
      return h('section.card.gd-step',
        h('div.gd-kicker', `${left[pi]} ${plural(left[pi], it.exId)} left`),
        h('div.gd-what', exLink(it.exId, `As many ${plural(2, it.exId)} as you can`)),
        h('div.gd-sub', 'Do a set, then enter how many.'),
        stepper, h('button.btn.gold.wide.gd-done', { onclick: doneStep }, 'Done'),
        h('div.gd-pool', s.items.map((x, i) => h('span' + (i === pi ? '.on' : '') + (left[i] === 0 ? '.zero' : ''), h('b', left[i]), ` ${plural(2, x.exId)}`))));
    }
    if (s.type === 'rounds') {
      const it = s.items[ri];
      return h('section.card.gd-step',
        h('div.gd-kicker', `Round ${rounds + 1}${s.times ? ` of ${s.times}` : ''}`),
        h('div.gd-round', s.items.map((x, i) => h('span' + (i === ri ? '.on' : i < ri ? '.past' : ''), `${x.reps} ${plural(x.reps, x.exId)}`))),
        h('div.gd-what', exLink(it.exId, `${it.reps} ${plural(it.reps, it.exId)}`)),
        adjust ? stepper : null,
        h('button.btn.gold.wide.gd-big', { onclick: () => { if (!adjust) value = it.reps; adjust = false; doneStep(); } }, adjust ? 'Done' : `Done ${plural(2, it.exId)}`),
        h('div.text-actions.gd-links',
          adjust ? null : h('button.link.small-link', { onclick: () => { adjust = true; value = it.reps; draw(); } }, 'Did a different number?'),
          h('button.link.small-link', { onclick: addRound }, ri ? 'Rest of the round done' : 'Whole round done')));
    }
    return null;
  }

  function draw() {
    const head = phase === 'brief' ? null : h('div.gd-clock' + (phase === 'done' ? '.done' : ''),
      h('div.gd-time', timer.secs ? fmtSecs(Math.max(0, remaining())) : fmtSecs(secsGone())),
      h('div.gd-clock-k', phase === 'done' ? (timer.secs && remaining() <= 0 ? 'Time’s up' : 'Finished') : timer.secs ? 'left' : 'elapsed'),
      amrap ? h('div.gd-rounds', h('b', rounds), ` round${rounds === 1 ? '' : 's'}`) : null);
    fill(body,
      navBar({ title: c.name, back: false, right: phase === 'go' ? [h('button.link', { onclick: async () => { if (await confirmBox('Finish now?', 'Stops the clock and saves what you’ve done.', { ok: 'Finish' })) done(); } }, 'Finish')] : [] }),
      head,
      phase === 'brief' ? brief() : phase === 'go' ? stepCard() : h('section.card.gd-step.gd-result',
        h('div.gd-kicker', 'Your result'), h('div.gd-what', result()),
        h('div.gd-sub', `${log.filter((x) => x.reps).reduce((a, x) => a + x.reps, 0)} reps in total`),
        invite?.score ? h('div.gd-sub', `${invite.from || 'Your friend'}’s score: ${invite.score}`) : null,
        h('button.btn.gold.wide.gd-done', { onclick: save }, 'Save workout'),
        h('button.btn.dark.wide.gd-challenge', { onclick: () => challengeFriends(c, result()) }, icon('users', 16), 'Challenge friends to beat it'),
        h('button.link.center-link', { onclick: async () => { if (await confirmBox('Discard this?', 'Nothing is saved.', { ok: 'Discard', danger: true })) pop(); } }, 'Discard')),
      h('div.bottom-space'));
    const back = h('button.link', { onclick: async () => { if (phase !== 'go' || await confirmBox('Leave the workout?', 'Your progress here is lost.', { ok: 'Leave', danger: true })) { clearInterval(tick); pop(); } } }, phase === 'brief' ? 'Close' : 'Cancel');
    body.querySelector('.nav-left')?.append(back);
  }

  draw();
  el.append(body);
  return { el, onHide: () => {}, refresh: () => {} };
}

export const openGuided = (c, invite = null) => push(() => guidedScreen(c, null, invite));

/** Send a link, or post a week-long challenge to one of your groups (with a leaderboard there). */
export async function challengeFriends(c, score) {
  const [{ myGroups }, { account, client }, share, { addDays, ymd }] = await Promise.all([import('./groups.js'), import('./cloud.js'), import('./share.js'), import('./store.js')]);
  const groups = account() ? myGroups() : [];
  actionSheet(score ? `Challenge friends to beat ${score}` : `Challenge friends to ${c.name}`, [
    { label: 'Send a link', onClick: () => share.shareChallenge(c, score) },
    ...groups.map((g) => ({ label: `Post to ${g.name} (one week)`, onClick: async () => {
      try {
        const db = await client();
        const { error } = await db.from('carver_events').insert({ group_id: g.id, user_id: account().id, kind: 'challenge', ref: 'c:' + uid(),
          data: { title: score ? `${c.name}: beat ${score}` : c.name, wod: c.id, score: score || null, start: ymd(), end: addDays(ymd(), 6) } });
        if (error) throw error;
        toast(`Challenge posted to ${g.name}`);
      } catch { toast('Couldn’t post it. Are you online?'); }
    } })),
  ]);
}
