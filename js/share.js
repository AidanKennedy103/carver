// Share a workout as a link. The workout travels inside the link itself (after the #,
// which browsers never send to a server), so nothing is uploaded and nobody needs an
// account. Anyone can open a link in the Carver app or on the web; sending one needs the
// installed app, which nudges people to add Carver to their Home Screen.

import { h, sheet, toast, fmtSecs } from './ui.js';
import { state, uid, exercise, allExercises, addCustomExercise, savePlan, toDisplay, unit, MAX_PLANS } from './store.js';
import { startWorkout } from './session.js';

/** Running as the installed app (from the Home Screen), not in a browser tab. */
export const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

const b64 = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const squeeze = async (bytes, how) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(how)).arrayBuffer());

/** A plan or a finished workout, boiled down: name, exercises, target sets, and any custom exercises it uses. */
function pack(src) {
  const done = !!src.end;   // a finished workout: its done sets become the targets
  const custom = {};
  const ex = src.exercises.map((e) => {
    const info = exercise(e.exId);
    if (info.custom) custom[e.exId] = { n: info.name, m: info.muscle, q: info.equipment, t: info.type, ...(info.uni ? { u: 1 } : {}) };
    const sets = (done ? e.sets.filter((s) => s.done) : e.sets).map((s) => [s.type || 'n', done ? s.weight ?? null : s.tWeight ?? null, done ? s.reps ?? null : s.tReps ?? null, done ? s.secs ?? null : s.tSecs ?? null]);
    return [e.exId, sets, e.rest ?? null, e.note || ''];
  }).filter((e) => e[1].length);
  return { v: 1, n: src.name || 'Workout', e: ex, ...(Object.keys(custom).length ? { c: custom } : {}) };
}

export async function linkFor(src) {
  const data = b64(await squeeze(new TextEncoder().encode(JSON.stringify(pack(src))), new CompressionStream('deflate-raw')));
  return `${location.origin}${location.pathname}#w=${data}`;
}

/** Share a plan or a workout from History. */
export async function shareWorkout(src) {
  if (!installed()) {
    const s = sheet(h('div.form.share-sheet',
      h('div.sheet-head', h('span'), h('div.sheet-title', 'Share from the app'), h('button.link.strong', { onclick: () => s.close() }, 'OK')),
      h('p', 'Sharing workouts works in the Carver app. Add it to your Home Screen: tap Share in Safari, then Add to Home Screen, and open Carver from there.'),
      h('p.fine', 'Anyone you send a workout to can open it in the app or right here on the web.')));
    return;
  }
  let url;
  try { url = await linkFor(src); } catch { toast('Sharing isn’t supported on this phone yet'); return; }
  const name = src.name || 'Workout';
  if (navigator.share) {
    try { await navigator.share({ title: name, text: `${name}: a workout from Carver`, url }); } catch (err) { if (err.name !== 'AbortError') toast('Could not share'); }
    return;
  }
  try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { toast('Could not copy the link'); }
}

/** Challenge a friend to a popular workout (Cindy, Murph…), with your score if you have one. */
export async function shareChallenge(c, score) {
  if (!installed()) { shareWorkout({ name: c.name, exercises: [] }); return; }
  const from = state.profile.name?.trim() || '';
  const url = `${location.origin}${location.pathname}#c=${encodeURIComponent(c.id)}${score ? `&s=${encodeURIComponent(score)}` : ''}${from ? `&f=${encodeURIComponent(from)}` : ''}`;
  const text = score ? `I did ${c.name}: ${score}. Think you can beat it?` : `Try ${c.name} with me on Carver.`;
  if (navigator.share) { try { await navigator.share({ title: c.name, text, url }); } catch (err) { if (err.name !== 'AbortError') toast('Could not share'); } return; }
  try { await navigator.clipboard.writeText(`${text} ${url}`); toast('Link copied'); } catch { toast('Could not copy the link'); }
}

/** Turn a shared link's data back into a plan (custom exercises are added to yours). */
function unpack(d) {
  const ids = new Set(allExercises().map((e) => e.id));
  const map = {};
  for (const [id, c] of Object.entries(d.c || {})) {
    const same = state.customExercises.find((x) => x.name.toLowerCase() === c.n.toLowerCase());
    map[id] = same ? same.id : null;
    if (!same) map[id] = { name: c.n, muscle: c.m, equipment: c.q, type: c.t, ...(c.u ? { uni: true } : {}) };
  }
  const exercises = d.e.filter(([exId]) => ids.has(exId) || map[exId]).map(([exId, sets, rest, note]) => ({
    exId, note: note || '', rest: rest ?? state.settings.restDefault ?? 90,
    sets: sets.map(([type, w, r, s]) => ({ id: uid(), type, tWeight: w, tReps: r, tSecs: s })),
  }));
  return { plan: { id: uid(), name: String(d.n).slice(0, 60), created: Date.now(), exercises }, map };
}
/** Add the custom exercises a shared plan needs, and point the plan at them. */
function adopt({ plan, map }) {
  for (const e of plan.exercises) {
    const m = map[e.exId];
    if (m && typeof m === 'object') { const made = addCustomExercise(m); map[e.exId] = made.id; }
    if (map[e.exId]) e.exId = map[e.exId];
  }
  return plan;
}

const setText = (info, s) => info.type === 'time' ? (s.tSecs ? fmtSecs(s.tSecs) : 'timed')
  : info.type === 'bw' ? `${s.tReps ?? '–'} reps` : `${s.tWeight ? `${toDisplay(s.tWeight)} ${unit()} × ` : ''}${s.tReps ?? '–'}`;

/** Opened from a shared link: show the workout, then save it or start it. */
export async function openShared() {
  const ch = location.hash.match(/^#c=([^&]+)(.*)$/);
  if (ch) {
    history.replaceState(null, '', location.pathname + location.search);
    const q = new URLSearchParams(ch[2].replace(/^&/, ''));
    const [{ CHALLENGES }, { openGuided }] = await Promise.all([import('./coach.js'), import('./guided.js')]);
    const c = CHALLENGES.find((x) => x.id === decodeURIComponent(ch[1]));
    if (c) openGuided(c, { from: (q.get('f') || '').slice(0, 30), score: (q.get('s') || '').slice(0, 30) });
    return;
  }
  const m = location.hash.match(/^#w=([A-Za-z0-9_-]+)/);
  if (!m) return;
  history.replaceState(null, '', location.pathname + location.search);
  let got;
  try { got = unpack(JSON.parse(new TextDecoder().decode(await squeeze(unb64(m[1]), new DecompressionStream('deflate-raw'))))); } catch { toast('That workout link looks broken'); return; }
  const { plan, map } = got;
  if (!plan.exercises.length) { toast('That workout link is empty'); return; }
  const name = (exId) => (typeof map[exId] === 'object' && map[exId] ? map[exId].name : exercise(map[exId] || exId).name);
  const info = (exId) => (typeof map[exId] === 'object' && map[exId] ? map[exId] : exercise(map[exId] || exId));
  const full = state.plans.length >= MAX_PLANS;
  const s = sheet(h('div.form.share-sheet',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Close'), h('div.sheet-title', 'Shared workout'), h('span')),
    h('h2.share-name', plan.name),
    h('section.card.share-list', plan.exercises.map((e) => h('div.share-ex',
      h('span.share-ex-name', name(e.exId)),
      h('span.share-ex-sets', e.sets.length === 1 || e.sets.every((x) => setText(info(e.exId), x) === setText(info(e.exId), e.sets[0]))
        ? `${e.sets.length} × ${setText(info(e.exId), e.sets[0])}` : e.sets.map((x) => setText(info(e.exId), x)).join(', '))))),
    h('button.btn.gold.wide', { onclick: () => { s.close(); startWorkout(adopt(got)); } }, 'Start it now'),
    h('button.btn.dark.wide', {
      onclick: () => {
        if (full) { toast(`You already have ${MAX_PLANS} plans. Delete one first.`); return; }
        s.close(); savePlan(adopt(got)); toast('Saved to Your plans');
      },
    }, 'Save to my plans'),
    installed() ? null : h('p.fine.center', 'Tip: add Carver to your Home Screen (Share, then Add to Home Screen) to keep your workouts and share your own.')));
}
