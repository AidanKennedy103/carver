// Groups: friends keeping each other accountable.
//
// Carver posts to your groups on its own after each sync: finished workouts
// (with PRs), runs and other cardio, finished daily goals, hitting your protein
// or calorie goal, and closing your weekly gym goal. The server adds the rest
// (supabase/functions/carver-push): missed daily goals at 8 am the next day and a
// summary every Monday morning, and sends phone notifications for all of it.
// Each person picks what they share with each group.

import { h, fill, icon, push, navBar, sheet, toast, actionSheet, confirmBox, promptBox, fmtDate, fmtNum, fmtDurationWords, swipe } from './ui.js';
import { state, commit, ymd, addDays, dayTotals, weekStart, workoutStats, exercise, toDisplay, unit, DAY_SHORT, kcalHit, foodAim, tabOn } from './store.js';
import { client, enabled, account } from './cloud.js';
import { signInSheet } from './account.js';
import { activityType } from './fitness.js';
import { habits, isDone } from './habits.js';
import { pushRow, pushNudge } from './push.js';
import { goalsButton } from './goals.js';

export const SHARES = [
  { k: 'gym', label: 'At the gym', sub: 'When you start a workout' },
  { k: 'workouts', label: 'Finished workouts', sub: 'Name, time and sets' },
  { k: 'prs', label: 'Personal records', sub: 'Shown with the workout' },
  { k: 'cardio', label: 'Runs, rides and other cardio', sub: 'From the Fitness tab' },
  { k: 'protein', label: 'Hitting your protein goal' },
  { k: 'kcal', label: 'Hitting your calorie goal' },
  { k: 'week', label: 'Closing your weekly gym goal' },
  { k: 'habits', label: 'Daily goals', sub: 'When you finish one, and at 8 am if you missed one yesterday' },
  { k: 'weekly', label: 'Weekly summary', sub: 'Monday morning: workouts, protein, calories and daily goals' },
];
const RECENT = 36 * 36e5;   // only things from the last day and a half get posted

// ---------- Data ----------

const cache = (k, v) => {
  try {
    if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null');
    localStorage.setItem(k, JSON.stringify(v));
  } catch { /* storage full or blocked */ }
  return v;
};
/** Your groups: [{ id, name, code, owner, myName, shares }] (cached for offline). */
export const myGroups = () => cache('carver.groups') || [];
export const cachedFeed = () => cache('carver.feed') || [];

export async function loadGroups() {
  const u = account();
  if (!u) return [];
  const db = await client();
  const { data, error } = await db.from('carver_members').select('name, shares, carver_groups(id, name, code, created_by)').eq('user_id', u.id);
  if (error) throw error;
  const list = (data || []).filter((r) => r.carver_groups).map((r) => ({
    id: r.carver_groups.id, name: r.carver_groups.name, code: r.carver_groups.code,
    owner: r.carver_groups.created_by === u.id, myName: r.name, shares: r.shares || {},
  })).sort((a, b) => a.name.localeCompare(b.name));
  return cache('carver.groups', list);
}

/** Recent posts from your groups, newest first, with each poster's name. */
export async function loadFeed(groupIds = myGroups().map((g) => g.id)) {
  if (!groupIds.length || !account()) return [];
  const db = await client();
  const [ev, mem] = await Promise.all([
    db.from('carver_events').select('id, group_id, user_id, kind, data, created_at').in('group_id', groupIds).order('created_at', { ascending: false }).limit(80),
    db.from('carver_members').select('group_id, user_id, name, joined_at').in('group_id', groupIds),
  ]);
  if (ev.error) throw ev.error;
  const names = new Map((mem.data || []).map((m) => [m.group_id + m.user_id, m.name]));
  const ids = (ev.data || []).map((e) => e.id);
  let kudos = [], comments = [];
  if (ids.length) {
    const [r, c] = await Promise.all([
      db.from('carver_reactions').select('event_id, user_id, kind').in('event_id', ids),
      db.from('carver_comments').select('id, event_id, user_id, body, created_at').in('event_id', ids).order('created_at'),
    ]);
    kudos = r.data || []; comments = c.data || [];
  }
  const members = new Map();
  for (const m of mem.data || []) members.set(m.group_id, [...(members.get(m.group_id) || []), m]);
  cache('carver.members', Object.fromEntries(members));
  const feed = (ev.data || []).map((e) => ({
    ...e, who: names.get(e.group_id + e.user_id) || 'Someone', me: e.user_id === account().id,
    reacts: kudos.filter((k) => k.event_id === e.id).map((k) => ({ u: k.user_id, k: k.kind })),
    comments: comments.filter((c) => c.event_id === e.id).map((c) => ({ ...c, who: names.get(e.group_id + c.user_id) || 'Someone', me: c.user_id === account().id })),
  }));
  if (groupIds.length === myGroups().length) cache('carver.feed', feed.slice(0, 40));
  prAlert(feed);
  return feed;
}
/** A friend hit a PR you haven't seen: a gold banner slides in (once per post). */
export function prAlert(feed) {
  const seen = cache('carver.prSeen');
  const fresh = feed.filter((e) => e.kind === 'workout' && e.data?.prs?.length && !e.me && Date.now() - Date.parse(e.created_at) < 24 * 36e5);
  if (!seen) { cache('carver.prSeen', fresh.map((e) => e.id)); return; }   // first time: don't replay old ones
  const show = fresh.filter((e) => !seen.includes(e.id));
  if (!show.length) return;
  cache('carver.prSeen', [...seen, ...show.map((e) => e.id)].slice(-200));
  const e = show[0], p = e.data.prs[0];
  const more = show.length - 1 + (e.data.prs.length - 1);
  document.querySelector('.pr-toast')?.remove();
  const el = h('button.pr-toast', { onclick: () => { el.remove(); openSocial(); } },
    h('span.pr-toast-ico', icon('trophy', 20)),
    h('span.pr-toast-text',
      h('span.pr-toast-k', 'New PR'),
      h('b', `${e.who} hit a PR`),
      h('span', `${p.ex}${p.kg != null ? ` · ${toDisplay(p.kg)} ${unit()}` : p.reps ? ` · ${p.reps} reps` : ''}${more > 0 ? ` · +${more} more` : ''}`)));
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 400); }, 6500);
}

export const groupMembers = (gid) => (cache('carver.members') || {})[gid] || [];

const defaultName = () => state.profile.name?.trim() || account()?.email?.split('@')[0] || 'Me';

async function askName() {
  if (state.profile.name?.trim()) return state.profile.name.trim();
  const n = await promptBox('Your name in groups', defaultName(), { placeholder: 'First name' });
  if (!n?.trim()) return null;
  commit((s) => { s.profile.name = n.trim(); });
  return n.trim();
}

export async function createGroup() {
  const name = await promptBox('Name your group', '', { placeholder: 'e.g. Gym crew' });
  if (!name?.trim()) return null;
  const me = await askName();
  if (!me) return null;
  const db = await client();
  const { data, error } = await db.rpc('carver_create_group', { group_name: name.trim().slice(0, 40), member_name: me.slice(0, 30) });
  if (error) { toast(error.message || 'Couldn’t make the group'); return null; }
  await loadGroups();
  publish();
  return data;
}

export async function joinGroup() {
  const code = await promptBox('Join a group', '', { placeholder: 'Invite code, e.g. K7Q2XM' });
  if (!code?.trim()) return null;
  const me = await askName();
  if (!me) return null;
  const db = await client();
  const { data, error } = await db.rpc('carver_join_group', { invite: code.trim().toUpperCase(), member_name: me.slice(0, 30) });
  if (error) { toast(/No group/i.test(error.message) ? 'No group with that code' : error.message); return null; }
  await loadGroups();
  publish();
  toast(`Joined ${data.name}`);
  return data;
}

async function updateMe(gid, changes) {
  const db = await client();
  const { error } = await db.from('carver_members').update(changes).eq('group_id', gid).eq('user_id', account().id);
  if (error) throw error;
  await loadGroups();
}

async function leaveGroup(g) {
  if (!(await confirmBox(`Leave ${g.name}?`, g.owner ? 'You made this group. It keeps going for everyone else.' : 'You can join again with the invite code.', { ok: 'Leave', danger: true }))) return false;
  const db = await client();
  const { error } = await db.from('carver_members').delete().eq('group_id', g.id).eq('user_id', account().id);
  if (error) { toast('Couldn’t leave. Try again.'); return false; }
  await loadGroups();
  return true;
}

// ---------- Posting ----------

/** What happened lately that's worth telling your groups. */
function happenings() {
  const now = Date.now(), out = [];
  const a = state.active;
  if (a && !a.past && a.start > now - 3 * 36e5) out.push({ kind: 'started', ref: 's:' + a.id, share: 'gym', data: { name: a.name || 'Workout' } });
  for (const w of state.workouts) {
    if ((w.end || w.start) < now - RECENT) break;   // newest first
    if (w.imported) continue;                         // history brought in from another app isn't news
    const st = workoutStats(w);
    out.push({
      kind: 'workout', ref: 'w:' + w.id, share: 'workouts',
      data: {
        name: w.name || 'Workout', mins: Math.round(st.duration / 6e4), sets: st.sets, kg: Math.round(st.volume),
        prs: (w.prList || []).slice(0, 5).map((p) => ({ ex: exercise(p.exId).name, kind: p.kind, kg: p.kg, reps: p.reps })),
      },
    });
  }
  for (const a of state.activities || []) {
    if (a.start < now - RECENT) break;
    out.push({ kind: 'cardio', ref: 'a:' + a.id, share: 'cardio', data: { type: a.type, mins: Math.round(a.dur / 6e4), m: a.dist ? Math.round(a.dist) : null, kcal: a.kcal || null } });
  }
  const g = state.goals;
  for (const day of [addDays(ymd(), -1), ymd()]) {
    const t = dayTotals(day);
    if (!t.entries) continue;
    if (t.p >= g.p) out.push({ kind: 'protein', ref: 'p:' + day, share: 'protein', data: { g: Math.round(t.p), goal: g.p, day } });
    // A maximum (losing fat) can still be broken later in the day, so only finished days are shared
    if (kcalHit(t.kcal, g.kcal, day) && (foodAim() !== 'cut' || day < ymd())) out.push({ kind: 'kcal', ref: 'k:' + day, share: 'kcal', data: { kcal: Math.round(t.kcal), goal: g.kcal, day } });
  }
  for (const day of [addDays(ymd(), -1), ymd()]) {
    for (const hb of habits()) if (isDone(hb, day)) out.push({ kind: 'habit', ref: `h:${hb.id}:${day}`, share: 'habits', data: { name: hb.name, day } });
  }
  const n = state.workouts.filter((w) => w.start >= weekStart()).length;
  if (n >= g.workoutsPerWeek) out.push({ kind: 'week', ref: 'wk:' + ymd(weekStart()), share: 'week', data: { n, goal: g.workoutsPerWeek } });
  return out;
}

let posting = false;
/** Post anything new to each group you share it with. Safe to call often: each thing posts once. */
export async function publish() {
  if (!enabled() || !account() || posting) return;
  posting = true;
  try {
    const groups = myGroups().length ? myGroups() : await loadGroups();
    if (!groups.length) return;
    const done = new Set(cache('carver.posted') || []);
    const rows = [];
    for (const item of happenings()) {
      for (const gr of groups) {
        if (gr.shares[item.share] === false) continue;
        const key = gr.id + '|' + item.ref;
        if (done.has(key)) continue;
        const data = item.kind === 'workout' && gr.shares.prs === false ? { ...item.data, prs: [] } : item.data;
        rows.push({ key, row: { group_id: gr.id, user_id: account().id, kind: item.kind, ref: item.ref, data } });
      }
    }
    if (!rows.length) return;
    const db = await client();
    const { error } = await db.from('carver_events').upsert(rows.map((r) => r.row), { onConflict: 'group_id,user_id,ref', ignoreDuplicates: true });
    if (error) return;
    rows.forEach((r) => done.add(r.key));
    cache('carver.posted', [...done].slice(-400));
  } catch { /* offline: next sync tries again */ } finally { posting = false; }
}

/** What a finished workout looks like as a group post. */
function workoutPost(w) {
  const st = workoutStats(w);
  return { name: w.name || 'Workout', mins: Math.round(st.duration / 6e4), sets: st.sets, kg: Math.round(st.volume),
    prs: (w.prList || []).slice(0, 5).map((p) => ({ ex: exercise(p.exId).name, kind: p.kind, kg: p.kg, reps: p.reps })) };
}

/** Post one workout to a group you pick (even if that group doesn't get workouts automatically). */
export async function postWorkout(w, only = null) {
  if (!account()) { signInSheet(); return; }
  const groups = myGroups().length ? myGroups() : await loadGroups().catch(() => []);
  if (!groups.length) { toast('Make or join a group first (Social)'); return; }
  const send = async (list) => {
    try {
      const db = await client();
      const rows = list.map((g) => ({ group_id: g.id, user_id: account().id, kind: 'workout', ref: 'w:' + w.id, data: workoutPost(w) }));
      const { error } = await db.from('carver_events').upsert(rows, { onConflict: 'group_id,user_id,ref', ignoreDuplicates: true });
      if (error) throw error;
      toast(list.length === 1 ? `Posted to ${list[0].name}` : `Posted to ${list.length} groups`);
    } catch { toast('Couldn’t post. Are you online?'); }
  };
  if (only) { send([only]); return; }
  actionSheet('Post this workout', [
    ...groups.map((g) => ({ label: g.name, onClick: () => send([g]) })),
    ...(groups.length > 1 ? [{ label: 'All my groups', onClick: () => send(groups) }] : []),
  ]);
}

/**
 * After a popular workout (Cindy, Murph…): make sure each group you share workouts with has a
 * leaderboard for it this week. Your result reaches it as a normal workout post.
 */
export async function postChallengeBoard(c, score) {
  if (!enabled() || !account()) return;
  try {
    const groups = myGroups().length ? myGroups() : await loadGroups();
    const db = await client();
    const since = new Date(Date.now() - 7 * 864e5).toISOString();
    for (const g of groups.filter((x) => x.shares.workouts !== false)) {
      const { data } = await db.from('carver_events').select('id, data').eq('group_id', g.id).eq('kind', 'challenge').gte('created_at', since);
      if ((data || []).some((e) => e.data?.wod === c.id && e.data?.end >= ymd())) continue;
      await db.from('carver_events').insert({ group_id: g.id, user_id: account().id, kind: 'challenge', ref: 'c:' + c.id + ':' + ymd(),
        data: { title: `${c.name}: beat ${score}`, wod: c.id, score, start: ymd(), end: addDays(ymd(), 6) } });
    }
    await publish();
  } catch { /* offline: the workout still posts on the next sync */ }
}

/** Take back a post in every group (you unchecked a daily goal). */
export async function unpublish(ref) {
  const done = new Set(cache('carver.posted') || []);
  for (const k of [...done]) if (k.endsWith('|' + ref)) done.delete(k);
  cache('carver.posted', [...done]);
  if (!account()) return;
  try { const db = await client(); await db.from('carver_events').delete().eq('user_id', account().id).eq('ref', ref); } catch { /* offline */ }
}

// ---------- Showing posts ----------

const ago = (iso) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 6e4);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return fmtDate(Date.parse(iso), { month: 'short', day: 'numeric' });
};
const MI = 1609.344;
const dist = (m) => (unit() === 'kg' ? `${(m / 1000).toFixed(1)} km` : `${(m / MI).toFixed(1)} mi`);

function describe(e) {
  const d = e.data || {};
  const list = (names) => names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  switch (e.kind) {
    case 'photo': return { ico: 'camera', text: 'shared a progress photo', photo: d.path };
    case 'challenge': return { ico: 'flag', text: `started a challenge: ${d.title}`, sub: d.end ? `Until ${fmtDate(Date.parse(d.end + 'T12:00'), { month: 'short', day: 'numeric' })}` : '' };
    case 'started': return { ico: 'pin', text: 'is at the gym', sub: d.name && d.name !== 'Workout' ? `Started ${d.name}` : '' };
    case 'gym': return { ico: 'pin', text: `is heading to the gym ${d.when || 'now'}`, sub: d.note || 'Join them?' };
    case 'note': return { ico: 'chat', text: 'posted', quote: d.text };
    case 'workout': return {
      ico: 'dumbbell', text: `finished ${d.name}`,
      sub: [d.mins ? fmtDurationWords(d.mins * 6e4) : '', d.sets ? `${d.sets} sets` : '', d.kg ? `${fmtNum(+toDisplay(d.kg))} ${unit()}` : ''].filter(Boolean).join(' · '),
      prs: (d.prs || []).map((p) => ({ ex: p.ex, what: `${p.kind}${p.kg != null ? ` · ${toDisplay(p.kg)} ${unit()}` : p.reps ? ` · ${p.reps} reps` : ''}` })),
    };
    case 'cardio': { const t = activityType(d.type); return { ico: t.icon, text: `did a ${t.name.toLowerCase()}`, sub: [d.m ? dist(d.m) : '', d.mins ? fmtDurationWords(d.mins * 6e4) : '', d.kcal ? `${fmtNum(d.kcal)} kcal` : ''].filter(Boolean).join(' · ') }; }
    case 'protein': return { ico: 'check', text: 'hit their protein goal', sub: `${d.g} of ${d.goal} g` };
    case 'kcal': return { ico: 'target', text: 'hit their calorie goal', sub: `${fmtNum(d.kcal)} kcal` };
    case 'week': return { ico: 'flame', text: 'closed their weekly gym goal', sub: `${d.n} workout${d.n === 1 ? '' : 's'} this week` };
    case 'habit': return { ico: 'check', text: `did ${list(d.names || [d.name])}`, sub: d.day && e.created_at && d.day < ymd(Date.parse(e.created_at)) ? `for ${fmtDate(Date.parse(d.day + 'T12:00'), { weekday: 'long' })}` : '' };
    case 'missed': return { ico: 'close', text: `missed ${list(d.names || [d.name])}`, sub: d.day ? `on ${fmtDate(Date.parse(d.day + 'T12:00'), { weekday: 'long' })}` : '', bad: true };
    case 'weekly': return { ico: 'calendar', text: 'weekly summary', sub: d.week ? `Week of ${fmtDate(Date.parse(d.week + 'T12:00'), { month: 'short', day: 'numeric' })}` : '', lines: weeklyLines(d) };
    default: return { ico: '•', text: 'did something' };
  }
}

/** "Workouts 5/5", "Protein 5/7 days"… for a weekly summary. */
export function weeklyLines(d) {
  const out = [];
  if (d.workouts) out.push([null, 'Workouts', `${d.workouts.n}/${d.workouts.goal}`, d.workouts.n >= d.workouts.goal]);
  if (d.protein) out.push([null, 'Protein goal', `${d.protein.days}/${d.protein.of}`, d.protein.days >= d.protein.of - 1]);
  if (d.kcal) out.push([null, 'Calorie goal', `${d.kcal.days}/${d.kcal.of}`, d.kcal.days >= d.kcal.of - 1]);
  for (const x of d.habits || []) out.push([null, x.name, `${x.days}/${x.of}`, x.days >= x.of]);
  return out;
}

// Each person keeps one color everywhere
const AV_COLORS = ['#b8862a', '#16917f', '#c2493a', '#7d57c9', '#2e7fc4', '#b4527a', '#4f8f35', '#b06a2a'];
const avColor = (id = '') => AV_COLORS[[...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7) % AV_COLORS.length];
export const avatar = (name, id, badge) => h('span.av', { style: { background: avColor(id) }, 'data-uid': id || '', 'data-name': name || '' }, (name || '?').trim()[0]?.toUpperCase() || '?', badge ? h('span.av-badge', typeof badge === 'string' && /^[a-z]+$/.test(badge) ? icon(badge, 11) : badge) : null);

/**
 * Make the feed read like a story, not a list of alerts: one line per person
 * per day for daily goals (done, or missed), and "at the gym" disappears once
 * that workout is posted.
 */
export function tidyFeed(feed) {
  const out = [], merged = new Map();
  for (const e of [...feed].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))) {   // newest first
    if (e.kind === 'started' && (Date.now() - Date.parse(e.created_at) > 4 * 36e5 || feed.some((x) => x.kind === 'workout' && x.user_id === e.user_id && x.group_id === e.group_id && x.created_at > e.created_at))) continue;
    if (e.kind === 'habit' || e.kind === 'missed') {
      const key = [e.group_id, e.user_id, e.kind, e.data?.day].join('|');
      const m = merged.get(key);
      if (m) { m.data.names.push(e.data.name); m.merged = true; continue; }
      const copy = { ...e, data: { ...e.data, names: [e.data?.name] } };
      merged.set(key, copy);
      out.push(copy);
      continue;
    }
    out.push(e);
  }
  return out;
}

const clock = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const CAN_REACT = new Set(['workout', 'cardio', 'week', 'photo', 'habit', 'challenge', 'gym', 'protein', 'kcal', 'weekly', 'note']);

// Reactions: a few emojis you can pin to a post (one of each per person). Older 'kudos' show as a clap.
export const REACTS = [['fire', '🔥'], ['strong', '💪'], ['clap', '👏'], ['heart', '❤️'], ['laugh', '😂'], ['wow', '😮']];
const emojiOf = (k) => (REACTS.find((r) => r[0] === k) || REACTS[2])[1];

/** Add or take back one of your reactions on a post. */
async function toggleReact(e, kind, redraw) {
  const me = account().id;
  const mine = (e.reacts || []).some((r) => r.u === me && r.k === kind);
  e.reacts = mine ? e.reacts.filter((r) => !(r.u === me && r.k === kind)) : [...(e.reacts || []), { u: me, k: kind }];
  redraw();
  try {
    const db = await client();
    const q = mine ? db.from('carver_reactions').delete().eq('event_id', e.id).eq('user_id', me).eq('kind', kind) : db.from('carver_reactions').insert({ event_id: e.id, kind });
    const { error } = await q;
    if (error) throw error;
  } catch { toast('Reactions need the latest server update (supabase/social4.sql).'); }
}

/** The emoji picker that pops up from React. */
function reactPicker(e, redraw, anchor) {
  document.querySelector('.react-pop')?.remove();
  const me = account().id;
  const pop = h('div.react-pop', REACTS.map(([k, em]) => h('button.react-opt' + ((e.reacts || []).some((r) => r.u === me && r.k === k) ? '.on' : ''), {
    onclick: (ev) => { ev.stopPropagation(); pop.remove(); toggleReact(e, k, redraw); }, 'aria-label': `React ${k}`,
  }, em)));
  anchor.after(pop);
  setTimeout(() => document.addEventListener('click', function off(ev) { if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener('click', off, true); } }, true), 0);
}

/** Comments on a post, and a box to add one. */
function commentsSheet(e, redraw) {
  const list = h('div.cm-list');
  const input = h('input.field.cm-in', { placeholder: 'Add a comment', maxlength: 280, enterkeyhint: 'send', onkeydown: (ev) => { if (ev.key === 'Enter') send(); } });
  const draw = () => fill(list, (e.comments || []).length ? e.comments.map((c) => h('div.cm',
    avatar(c.who, c.user_id),
    h('div.cm-text', h('b', c.me ? 'You' : c.who), h('span', c.body)),
    c.me ? h('button.link.small-link', { onclick: () => remove(c) }, 'Delete') : null)) : h('p.fine.center', 'No comments yet.'));
  async function send() {
    const body = input.value.trim();
    if (!body) return;
    input.value = '';
    const c = { id: 'tmp', event_id: e.id, user_id: account().id, body, who: 'You', me: true };
    e.comments = [...(e.comments || []), c];
    draw(); redraw();
    try {
      const db = await client();
      const { data, error } = await db.from('carver_comments').insert({ event_id: e.id, body }).select('id').single();
      if (error) throw error;
      c.id = data.id;
    } catch { toast('Comments need the latest server update (see README).'); e.comments = e.comments.filter((x) => x !== c); draw(); redraw(); }
  }
  async function remove(c) {
    e.comments = e.comments.filter((x) => x !== c); draw(); redraw();
    try { const db = await client(); await db.from('carver_comments').delete().eq('id', c.id); } catch { /* offline */ }
  }
  draw();
  const s = sheet(h('div.form.cm-sheet',
    h('div.sheet-head', h('span'), h('div.sheet-title', 'Comments'), h('button.link.strong', { onclick: () => s.close() }, 'Done')),
    h('div.cm-post', eventRow(e, { time: 'ago' })),
    list,
    h('div.cm-bar', input, h('button.btn.gold.small', { onclick: send }, 'Send'))));
  setTimeout(() => input.focus(), 300);
}

/** Reactions, comments (and Remove on your own posts) under a post. */
function postActions(e, redraw, onRemove) {
  if (!CAN_REACT.has(e.kind)) return e.me && onRemove ? h('div.post-acts', h('button.post-act.right', { onclick: onRemove }, 'Remove')) : null;
  const me = account()?.id, c = e.comments?.length || 0;
  const counts = new Map();
  for (const r of e.reacts || []) { const k = r.k === 'kudos' ? 'clap' : r.k; counts.set(k, { n: (counts.get(k)?.n || 0) + 1, mine: counts.get(k)?.mine || r.u === me }); }
  const reactBtn = h('button.post-act', { onclick: () => reactPicker(e, redraw, reactBtn), 'aria-label': 'React' }, icon('plus', 13), 'React');
  return h('div.post-acts',
    [...counts].map(([k, v]) => h('button.react-chip' + (v.mine ? '.on' : ''), { onclick: () => toggleReact(e, k, redraw), 'aria-label': `${v.n} ${k}` }, emojiOf(k), h('b', v.n))),
    reactBtn,
    h('button.post-act', { onclick: () => commentsSheet(e, redraw) }, icon('chat', 15), c ? `${c}` : 'Comment'),
    e.me && onRemove ? h('button.post-act.right', { onclick: onRemove }, 'Remove') : null);
}

export function eventRow(e, { showGroup = false, time = 'ago', actions = null } = {}) {
  const x = describe(e);
  const grp = showGroup ? myGroups().find((g) => g.id === e.group_id)?.name : null;
  const last = actions && e.comments?.length ? e.comments[e.comments.length - 1] : null;
  return h('div.feed-row' + (x.bad ? '.bad' : '') + (e.kind === 'weekly' ? '.weekly' : '') + (x.prs?.length ? '.has-pr' : ''),
    avatar(e.who, e.user_id, x.ico),
    h('div.feed-text',
      e.kind === 'weekly'
        ? h('div.feed-line', h('b', e.me ? 'Your' : `${e.who}’s`), ' week')
        : h('div.feed-line', h('b', e.me ? 'You' : e.who), ' ', x.text),
      x.sub || grp ? h('div.feed-sub', [x.sub, grp].filter(Boolean).join(' · ')) : null,
      (x.extra || []).map((t) => h('div.feed-pr', t)),
      x.prs?.length ? h('div.pr-burst',
        h('span.pr-ribbon', icon('trophy', 12), x.prs.length > 1 ? `${x.prs.length} new PRs` : 'New PR'),
        x.prs.map((p) => h('div.pr-line', h('b', p.ex), h('span', p.what)))) : null,
      x.lines ? h('div.week-lines', x.lines.map(([ico, label, val, good]) => h('div.week-line' + (good ? '.good' : ''), h('span.wl-dot'), h('span.wl-name', label), h('b', val)))) : null,
      x.quote ? h('div.feed-quote', x.quote) : null,
      x.photo ? groupPhoto(x.photo) : null,
      last ? h('div.cm-last', h('b', last.me ? 'You' : last.who), ' ', last.body) : null,
      actions ? postActions(e, actions.redraw, actions.remove) : null),
    h('span.feed-when', time === 'clock' ? clock(e.created_at) : ago(e.created_at)));
}

/** "Heading to the gym": tell this group when you're going. */
async function gymPing(g, after) {
  const at = (mins) => new Date(Date.now() + mins * 6e4).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const post = async (when) => {
    try {
      const db = await client();
      const { error } = await db.from('carver_events').insert({ group_id: g.id, kind: 'gym', ref: 'gym:' + Date.now(), data: { when } });
      if (error) throw error;
      toast(`Told ${g.name}`); after?.();
    } catch { toast('Gym pings need the latest server update (see README).'); }
  };
  actionSheet('Heading to the gym', [
    { label: 'Now', onClick: () => post('now') },
    { label: `In 30 minutes (${at(30)})`, onClick: () => post(`at ${at(30)}`) },
    { label: `In an hour (${at(60)})`, onClick: () => post(`at ${at(60)}`) },
    { label: 'Pick a time…', onClick: async () => { const t = (await promptBox('When are you going?', '', { placeholder: 'e.g. 6 pm, tomorrow 7 am' }))?.trim(); if (t) post(/^(at|tomorrow|tonight|in )/i.test(t) ? t : `at ${t}`); } },
  ]);
}

/** "Today", "Yesterday", "Monday, Nov 10" */
const dayHead = (iso) => {
  const k = ymd(Date.parse(iso));
  return k === ymd() ? 'Today' : k === addDays(ymd(), -1) ? 'Yesterday' : fmtDate(Date.parse(iso), { weekday: 'long', month: 'short', day: 'numeric' });
};

/** This week for everyone in the group: days trained, workouts, daily goals done and missed. */
function weekBoard(g, feed, members) {
  const mon = ymd(weekStart()), today = ymd();
  const days = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  const people = (members.length ? members : [{ user_id: account()?.id, name: g.myName }]).map((m) => {
    const mine = feed.filter((e) => e.user_id === m.user_id && e.group_id === g.id);
    const trained = new Set(mine.filter((e) => (e.kind === 'workout' || e.kind === 'cardio') && ymd(Date.parse(e.created_at)) >= mon).map((e) => ymd(Date.parse(e.created_at))));
    return {
      ...m, me: m.user_id === account()?.id, trained,
      workouts: mine.filter((e) => e.kind === 'workout' && ymd(Date.parse(e.created_at)) >= mon).length,
      done: mine.filter((e) => e.kind === 'habit' && (e.data?.day || '') >= mon).length,
      missed: mine.filter((e) => e.kind === 'missed' && (e.data?.day || '') >= mon).length,
    };
  }).sort((a, b) => b.workouts - a.workouts || b.done - a.done || a.missed - b.missed);
  return h('section.card.board',
    h('div.board-days', h('span'), days.map((k) => h('span' + (k === today ? '.today' : ''), DAY_SHORT[days.indexOf(k)][0]))),
    people.map((p) => h('div.board-row',
      h('div.board-who', avatar(p.name, p.user_id), h('div.board-name', h('b', p.me ? 'You' : p.name),
        h('span', [`${p.workouts} workout${p.workouts === 1 ? '' : 's'}`, p.done ? `${p.done} goal${p.done === 1 ? '' : 's'} done` : null, p.missed ? `${p.missed} missed` : null].filter(Boolean).join(' · ')))),
      h('div.board-dots', days.map((k) => h('i' + (p.trained.has(k) ? '.on' : k > today ? '.later' : '')))))),
  );
}

const signed = new Map();
/** A shared progress photo, loaded through a short-lived private link. */
function groupPhoto(path) {
  const img = h('img.feed-photo', { alt: 'Progress photo', loading: 'lazy' });
  const show = (u) => { img.src = u; };
  const hit = signed.get(path);
  if (hit && hit.until > Date.now()) show(hit.url);
  else client().then((db) => db.storage.from('carver-photos').createSignedUrl(path, 3600)).then(({ data }) => {
    if (data?.signedUrl) { signed.set(path, { url: data.signedUrl, until: Date.now() + 50 * 6e4 }); show(data.signedUrl); }
  }).catch(() => {});
  return img;
}

/** Share one of your progress photos with a group (asks which one). */
export async function sharePhoto(photo) {
  if (!account()) { signInSheet(); return; }
  const groups = myGroups().length ? myGroups() : await loadGroups().catch(() => []);
  if (!groups.length) { toast('Make or join a group first (Home → Groups)'); return; }
  const go = async (g) => {
    if (!(await confirmBox(`Share with ${g.name}?`, 'Everyone in the group can see this photo. You can delete it from the group later.', { ok: 'Share' }))) return;
    try {
      const { getRecord } = await import('./photos.js');
      const rec = await getRecord(photo.id);
      if (!rec) throw new Error('missing');
      const db = await client();
      const path = `groups/${g.id}/${account().id}-${photo.id}.jpg`;
      const up = await db.storage.from('carver-photos').upload(path, rec.full, { upsert: true, contentType: 'image/jpeg' });
      if (up.error) throw up.error;
      const { error } = await db.from('carver_events').upsert({ group_id: g.id, user_id: account().id, kind: 'photo', ref: 'ph:' + photo.id, data: { path, ts: photo.ts } }, { onConflict: 'group_id,user_id,ref', ignoreDuplicates: true });
      if (error) throw error;
      toast(`Shared with ${g.name}`);
    } catch { toast('Couldn’t share it. Check your connection.'); }
  };
  if (groups.length === 1) go(groups[0]);
  else actionSheet('Share with', groups.map((g) => ({ label: g.name, onClick: () => go(g) })));
}

/** Remove one of your own posts (and its photo) from a group. */
async function deletePost(e) {
  if (!(await confirmBox('Remove this post?', 'It disappears for everyone in the group.', { ok: 'Remove', danger: true }))) return false;
  const db = await client();
  if (e.kind === 'photo' && e.data?.path) await db.storage.from('carver-photos').remove([e.data.path]).catch(() => {});
  const { error } = await db.from('carver_events').delete().eq('id', e.id);
  if (error) { toast('Couldn’t remove it'); return false; }
  return true;
}

// ---------- Home card ----------

let lastFetch = 0;
/** The Groups card on Home. Fills in from the cache, then refreshes. */
/** Social: the tab if you have it, otherwise the same page pushed over Home. */
async function openSocial() {
  const [{ socialPage }, { goTab }] = await Promise.all([import('./social.js'), import('./tabs.js')]);
  if (tabOn('social')) goTab('social'); else push(() => socialPage({ tab: false }));
}

export function groupsCard() {
  if (!enabled()) return null;
  const box = h('div');
  const draw = (feed = cachedFeed()) => {
    if (!account()) {
      fill(box, h('button.card.prompt', { onclick: signInSheet },
        h('span.prompt-ico', icon('users', 20)), h('span.today-text', h('span.today-k.strong', 'Train with friends'), h('span.today-v', 'Sign in to make a group and see each other’s workouts')), h('span.prompt-go', icon('back', 16))));
      return;
    }
    if (!myGroups().length) {
      fill(box, h('button.card.prompt', { onclick: openSocial },
        h('span.prompt-ico', icon('users', 20)), h('span.today-text', h('span.today-k.strong', 'Make a group'), h('span.today-v', 'Friends see when you train and hit your goals')), h('span.prompt-go', icon('back', 16))));
      return;
    }
    fill(box, h('button.card.list-card.feed-card', { onclick: openSocial },
      feed.length ? tidyFeed(feed).slice(0, 3).map((e) => eventRow(e, { showGroup: myGroups().length > 1 })) : h('div.feed-empty', 'Nothing yet. Finish a workout and your group sees it here.'),
      h('div.feed-more', myGroups().length === 1 ? `Open ${myGroups()[0].name}` : 'Open groups', icon('back', 14))));
  };
  draw();
  // Home redraws often; only ask the server once a minute
  if (account() && Date.now() - lastFetch > 60000) {
    lastFetch = Date.now();
    loadGroups().then(() => loadFeed()).then((f) => { if (box.isConnected) draw(f); }).catch(() => {});
  }
  return box;
}

// ---------- Groups screen ----------

let selected = null;
let gtab = 'feed';   // inside a group: feed, week, challenges or members

/** The groups screen. tab: shown as the Social tab (no back button). sections(g, members, redraw): extra cards after This week. */
export function groupsScreen({ tab = false, sections = null, only = null } = {}) {
  const el = h('div.page');
  const body = h('div.scroll-body');
  let feed = cachedFeed(), loading = true;
  if (only) selected = only;

  async function refresh() {
    loading = true;
    try { await loadGroups(); feed = await loadFeed(); } catch { toast('Offline. Showing what Carver saved.'); }
    loading = false;
    draw();
  }

  /** Your groups as cards: tap one to open it. */
  function listView(groups) {
    const mon = ymd(weekStart());
    return [
      h('div.section-head', h('h2.section-title', 'Your groups'), h('span.section-count', groups.length)),
      groups.map((g) => {
        const posts = tidyFeed(feed.filter((e) => e.group_id === g.id));
        const members = groupMembers(g.id);
        const week = feed.filter((e) => e.group_id === g.id && (e.kind === 'workout' || e.kind === 'cardio') && ymd(Date.parse(e.created_at)) >= mon).length;
        const latest = posts[0];
        return h('button.card.group-card', { onclick: () => push(() => groupsScreen({ sections, only: g.id })) },
          h('div.group-card-top',
            h('div', h('div.group-title', g.name), h('div.group-meta', `${members.length || 1} member${(members.length || 1) === 1 ? '' : 's'} · ${week} workout${week === 1 ? '' : 's'} this week`)),
            h('span.card-go', '›')),
          h('div.av-stack', (members.length ? members : [{ user_id: account().id, name: g.myName }]).slice(0, 8).map((m) => avatar(m.name, m.user_id))),
          (() => {
            const mine = feed.filter((e) => e.group_id === g.id);
            const today = mine.filter((e) => ymd(Date.parse(e.created_at)) === ymd() && e.kind !== 'weekly').length;
            const tally = new Map();
            for (const e of mine) if ((e.kind === 'workout' || e.kind === 'cardio') && ymd(Date.parse(e.created_at)) >= mon) tally.set(e.user_id, { who: e.me ? 'You' : e.who, n: (tally.get(e.user_id)?.n || 0) + 1 });
            const lead = [...tally.values()].sort((a, b) => b.n - a.n)[0];
            const ch = mine.find((e) => e.kind === 'challenge' && e.data?.end >= ymd());
            return h('div.group-card-stats',
              h('span', h('b', today), ' today'),
              lead ? h('span', 'Leading: ', h('b', lead.who), ` (${lead.n})`) : null,
              ch ? h('span.gc-ch', icon('flag', 12), ch.data.title) : null);
          })(),
          latest ? h('div.group-card-last', h('b', latest.me ? 'You' : latest.who), ' ', describe(latest).text, h('span.muted', ` · ${ago(latest.created_at)}`)) : null);
      }),
      h('div.section-head', h('h2.section-title', 'Latest')),
      feed.length ? h('section.card.list-card.feed-list', tidyFeed(feed).slice(0, 6).map((e) => eventRow(e, { showGroup: true, actions: { redraw: draw } }))) : h('div.feed-empty.card', loading ? 'Loading…' : 'Nothing yet.'),
      h('div.btn-pair.groups-more', h('button.btn.dark', { onclick: () => createGroup().then((x) => x && refresh()) }, 'Make a group'), h('button.btn.dark', { onclick: () => joinGroup().then((x) => x && refresh()) }, 'Join with code')),
    ];
  }

  function draw() {
    const groups = myGroups();
    if (!only && account() && groups.length > 1) {
      fill(body,
        navBar({ title: tab ? 'Social' : 'Groups', back: !tab, backLabel: 'Home', large: true, wip: true, right: [tab ? goalsButton() : null, h('button.icon-btn.gold-text', { onclick: addMenu, 'aria-label': 'Make or join a group' }, icon('plus', 24))] }),
        pushNudge(), listView(groups), h('div.bottom-space'));
      return;
    }
    if (!groups.some((g) => g.id === selected)) selected = groups[0]?.id || null;
    const g = groups.find((x) => x.id === selected);
    const raw = feed.filter((e) => e.group_id === selected);
    const members = g ? groupMembers(g.id) : [];

    // Activity, by day
    const days = [];
    for (const e of tidyFeed(raw)) {
      const label = dayHead(e.created_at);
      if (days[days.length - 1]?.label !== label) days.push({ label, items: [] });
      days[days.length - 1].items.push(e);
    }
    const row = (e) => eventRow(e, { time: 'clock', actions: { redraw: draw, remove: e.me && !e.merged ? () => deletePost(e).then((ok) => ok && refresh()) : null } });

    fill(body,
      only ? navBar({ title: '', backLabel: tab ? 'Social' : 'Groups' })
        : navBar({ title: tab ? 'Social' : 'Groups', back: !tab, backLabel: 'Home', large: true, wip: true, right: [tab ? goalsButton() : null, h('button.icon-btn.gold-text', { onclick: addMenu, 'aria-label': 'Make or join a group' }, icon('plus', 24))] }),
      !account()
        ? h('button.card.empty-plan', { onclick: signInSheet }, h('div.empty-title', 'Sign in first'), h('div.empty-text', 'Groups need an account so friends can see your posts.'))
        : !groups.length
          ? h('div.empty-groups',
            h('div.empty-title', 'Keep each other honest'),
            h('div.empty-text', 'Make a group and share the invite code, or join a friend’s. They see your finished workouts and daily goals, plus a Monday summary. You choose what each group sees.'),
            h('div.btn-pair', h('button.btn.gold', { onclick: () => createGroup().then((x) => { if (x) { selected = x.id; refresh(); } }) }, 'Make a group'), h('button.btn.dark', { onclick: () => joinGroup().then((x) => { if (x) { selected = x.id; refresh(); } }) }, 'Join with code')))
          : groupSpace(g, raw, members, days, row),
      h('div.bottom-space'),
    );
  }
  /** Inside a group: a small header, the gym banner when someone's going, then Feed / Wins / Members. One + button does the rest. */
  function groupSpace(g, raw, members, days, row) {
    const me = account().id;
    const people = members.length ? members : [{ user_id: me, name: g.myName }];
    const today = ymd();
    const activeToday = new Set(raw.filter((e) => ymd(Date.parse(e.created_at)) === today && e.kind !== 'weekly').map((e) => e.user_id));
    const atGym = [...new Map(raw.filter((e) => (e.kind === 'started' || e.kind === 'gym') && Date.now() - Date.parse(e.created_at) < 3 * 36e5).map((e) => [e.user_id, e])).values()];
    const extra = sections ? sections(g, members, draw) : null;
    const winsPart = Array.isArray(extra) ? extra[0] : extra?.week;
    const chPart = Array.isArray(extra) ? extra[1] : extra?.challenges;
    const names = (list) => { const n = list.map((e) => (e.user_id === me ? 'You' : e.who)); return n.length <= 2 ? n.join(' and ') : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`; };
    const thisWeek = (uid) => raw.filter((e) => e.user_id === uid && (e.kind === 'workout' || e.kind === 'cardio') && ymd(Date.parse(e.created_at)) >= ymd(weekStart())).length;
    const tabs = [['feed', 'Feed'], ['wins', 'Wins'], ['members', 'Members']];
    if (!tabs.some(([v]) => v === gtab)) gtab = 'feed';
    let content;
    if (gtab === 'wins') content = [winsPart || weekBoard(g, raw, members), chPart || null];
    else if (gtab === 'members') content = h('section.card.list-card.gs-members', people.map((m) => h('button.gs-member', { onclick: () => profileSheet(m.user_id, m.name) },
      avatar(m.name, m.user_id),
      h('span.gs-member-text', h('b', m.user_id === me ? `${m.name} (you)` : m.name), h('span', [m.joined_at ? `Joined ${fmtDate(Date.parse(m.joined_at), { month: 'short', year: 'numeric' })}` : null, `${thisWeek(m.user_id)} this week`].filter(Boolean).join(' · '))),
      activeToday.has(m.user_id) ? h('span.gs-active', 'Active today') : h('span.card-go', '›'))));
    else content = [
      days[0]?.label === 'Today' ? days[0].items.map((e) => h('section.card.post-card' + (e.data?.prs?.length ? '.pr' : ''), row(e)))
        : h('div.feed-empty.card', loading ? 'Loading…' : 'Nothing yet today. Tap + to post, or finish a workout and it shows up here.'),
      days.some((d) => d.label !== 'Today') ? h('button.btn.dark.wide.hist-more', { onclick: () => push(() => activityScreen(g, days.filter((d) => d.label !== 'Today'), row)) }, 'See earlier posts') : null,
    ];
    const shown = people.slice(0, 4);
    return [
      h('div.gs-head',
        h('div.gs-head-text', h('div.gs-name', g.name),
          h('button.gs-faces', { onclick: () => { gtab = 'members'; draw(); }, 'aria-label': 'Members' },
            h('span.gs-stack', shown.map((m) => avatar(m.name, m.user_id))),
            h('span.gs-meta', `${people.length} member${people.length === 1 ? '' : 's'}${activeToday.size ? ` · ${activeToday.size} active today` : ''}`))),
        h('button.icon-btn', { onclick: () => groupSettings(g, refresh), 'aria-label': 'Group settings' }, icon('gear'))),
      atGym.length ? h('button.card.gs-live', { onclick: () => gymPing(g, refresh) },
        h('span.gs-dot'), h('span.gs-live-text', h('b', names(atGym)), atGym.length === 1 && atGym[0].user_id !== me ? ' is' : ' are', ' heading to the gym'), h('span.gs-join', 'Join')) : null,
      pushNudge(),
      h('div.segment.gs-tabs', tabs.map(([v, l]) => h('button' + (gtab === v ? '.on' : ''), { onclick: () => { gtab = v; draw(); } }, l))),
      content,
      h('div.group-foot',
        h('button.link.small-link', { onclick: () => invite(g) }, 'Invite friends'),
        only ? null : h('button.link.small-link', { onclick: addMenu }, 'Make or join another group')),
      h('button.gs-fab', { onclick: () => plusMenu(g), 'aria-label': 'Post, share or challenge' }, icon('plus', 26)),
    ];
  }
  /** The + button: everything you can share with the group. */
  function plusMenu(g) {
    actionSheet(g.name, [
      { label: 'Write a post', onClick: () => writePost(g, refresh) },
      { label: 'Heading to the gym', onClick: () => gymPing(g, refresh) },
      { label: 'Share a workout', onClick: () => {
        const recent = state.workouts.slice(0, 5);
        if (!recent.length) { toast('Finish a workout first'); return; }
        actionSheet(`Share to ${g.name}`, recent.map((w) => ({ label: `${w.name} · ${fmtDate(w.start, { weekday: 'short', month: 'short', day: 'numeric' })}`, onClick: () => postWorkout(w, g).then(refresh) })));
      } },
      { label: 'Share a progress photo', onClick: async () => { const { photos } = await import('./photos.js'); const p = photos()[0]; if (p) sharePhoto(p); else toast('Take a progress photo first (Physical Metrics)'); } },
      { label: 'Start a challenge', onClick: () => challengeMenu(g) },
    ]);
  }
  /** Challenge the group: a popular workout (with a leaderboard) or a goal like 12 workouts in 30 days. */
  async function challengeMenu(g) {
    const { CHALLENGES } = await import('./coach.js');
    actionSheet(`Challenge ${g.name}`, [
      ...CHALLENGES.map((c) => ({ label: `${c.name} · ${c.line}`, onClick: async () => {
        try {
          const db = await client();
          const { error } = await db.from('carver_events').insert({ group_id: g.id, kind: 'challenge', ref: 'c:' + c.id + ':' + Date.now(), data: { title: c.name, wod: c.id, score: null, start: ymd(), end: addDays(ymd(), 6) } });
          if (error) throw error;
          toast(`${c.name} challenge posted`); gtab = 'wins'; refresh();
        } catch { toast('Couldn’t post it. Are you online?'); }
      } })),
      { label: 'A goal: workouts, daily goals…', onClick: () => { gtab = 'wins'; draw(); toast('Tap + New under Challenges'); } },
    ]);
  }

  function addMenu() {
    if (!account()) { signInSheet(); return; }
    actionSheet('Groups', [
      { label: 'Make a group', onClick: () => createGroup().then((x) => { if (x) { selected = x.id; refresh(); } }) },
      { label: 'Join with an invite code', onClick: () => joinGroup().then((x) => { if (x) { selected = x.id; refresh(); } }) },
    ]);
  }
  draw();
  if (account()) refresh();
  body.addEventListener('click', (e) => {
    const a = e.target.closest('.av[data-uid]');
    if (!a || !a.dataset.uid || !account()) return;
    e.stopPropagation();
    profileSheet(a.dataset.uid, a.dataset.name);
  }, true);
  swipe(body, {
    left: () => { const gs = myGroups(), i = gs.findIndex((x) => x.id === selected); if (!gs[i + 1]) return false; selected = gs[i + 1].id; draw(); },
    right: () => { const gs = myGroups(), i = gs.findIndex((x) => x.id === selected); if (i < 1) return false; selected = gs[i - 1].id; draw(); },
  });
  el.append(body);
  return { el, refresh: draw };
}

/**
 * Someone's profile: general things only (member since, workouts, total lifted, cardio,
 * daily goals). Never their lifts or maxes, so nobody feels judged.
 */
export async function profileSheet(uid, name) {
  const body = h('div.prof-body', h('p.fine.center', 'Loading…'));
  const s = sheet(h('div.form.prof-sheet',
    h('div.sheet-head', h('span'), h('div.sheet-title', ''), h('button.link.strong', { onclick: () => s.close() }, 'Done')),
    h('div.prof-head', avatar(name, uid), h('div.prof-name', uid === account()?.id ? `${name} (you)` : name)),
    body));
  try {
    const db = await client();
    const ids = myGroups().map((g) => g.id);
    const [mem, ev] = await Promise.all([
      db.from('carver_members').select('group_id, joined_at').eq('user_id', uid).in('group_id', ids),
      db.from('carver_events').select('kind, data, created_at').eq('user_id', uid).in('group_id', ids).in('kind', ['workout', 'cardio', 'habit', 'week']).order('created_at', { ascending: false }).limit(1000),
    ]);
    const joined = (mem.data || []).map((m) => Date.parse(m.joined_at)).sort((a, b) => a - b)[0];
    const seen = new Set(), rows = (ev.data || []).filter((e) => { const k = e.kind + JSON.stringify(e.data) + e.created_at.slice(0, 13); if (seen.has(k)) return false; seen.add(k); return true; });   // the same post in two groups counts once
    const workouts = rows.filter((e) => e.kind === 'workout');
    const kg = workouts.reduce((n, e) => n + (e.data?.kg || 0), 0);
    const weeks = new Set(workouts.map((e) => ymd(weekStart(Date.parse(e.created_at)))));
    let w = weekStart(), streak = 0;
    if (!weeks.has(ymd(w))) w = weekStart(w - 3 * 864e5);   // this week isn't over yet
    while (weeks.has(ymd(w))) { streak++; w = weekStart(w - 3 * 864e5); }
    const shared = myGroups().filter((g) => (mem.data || []).some((m) => m.group_id === g.id)).map((g) => g.name);
    const stat = (v, k) => h('div.prof-stat', h('b', v), h('span', k));
    fill(body,
      h('div.prof-since', joined ? `Member since ${fmtDate(joined, { month: 'long', year: 'numeric' })}` : ''),
      h('div.prof-grid',
        stat(fmtNum(workouts.length), 'workouts'),
        stat(kg ? `${fmtNum(Math.round(+toDisplay(kg) / 1000))}k` : '0', `${unit()} lifted in total`),
        stat(fmtNum(rows.filter((e) => e.kind === 'cardio').length), 'runs, rides and cardio'),
        stat(streak ? `${streak} wk` : '–', 'training streak'),
        stat(fmtNum(rows.filter((e) => e.kind === 'habit').length), 'daily goals done'),
        stat(fmtNum(rows.filter((e) => e.kind === 'week').length), 'weekly goals hit')),
      shared.length ? h('p.fine.center', `In ${shared.join(', ')} with you`) : null,
      h('p.fine.center', 'Counted from what they share with your groups. Lifts and maxes stay private.'));
  } catch { fill(body, h('p.fine.center', 'Couldn’t load this profile. Are you online?')); }
}

/** Write a short post to a group. */
function writePost(g, after) {
  const ta = h('textarea.field.post-in', { rows: 4, maxlength: 280, placeholder: 'Leg day was rough. Who’s training tomorrow?' });
  const count = h('span.fine', '0 / 280');
  ta.addEventListener('input', () => { count.textContent = `${ta.value.length} / 280`; });
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', g.name), h('button.link.strong', { onclick: send }, 'Post')),
    ta, count));
  setTimeout(() => ta.focus(), 300);
  async function send() {
    const text = ta.value.trim();
    if (!text) return;
    try {
      const db = await client();
      const { error } = await db.from('carver_events').insert({ group_id: g.id, kind: 'note', ref: 'n:' + Date.now(), data: { text } });
      if (error) throw error;
      s.close(); toast('Posted'); after?.();
    } catch (e) { toast(/check constraint/i.test(e?.message || '') ? 'Posts need the latest server update (supabase/social3.sql).' : 'Couldn’t post. Are you online?'); }
  }
}

/** Everything a group has posted lately, by day. */
function activityScreen(g, days, row) {
  const el = h('div.page');
  el.append(h('div.scroll-body',
    navBar({ title: 'Activity', backLabel: g.name }),
    days.map((d) => h('div.feed-day', h('div.feed-day-head', d.label), h('section.card.list-card.feed-list', d.items.map(row)))),
    h('div.bottom-space')));
  return { el };
}

/** Invite code, what I share, notifications, leaving. */
function groupSettings(g, after) {
  const s = sheet(h('div.form',
    h('div.sheet-head', h('span'), h('div.sheet-title', g.name), h('button.link.strong', { onclick: () => s.close() }, 'Done')),
    h('div.group',
      h('div.group-row', h('span', 'Invite code'), h('b.gold-text.code-big', g.code)),
      h('button.group-row', { onclick: () => invite(g) }, h('span', 'Send an invite'), h('span.row-val', '›')),
      h('button.group-row', { onclick: () => { s.close(); sharesSheet(g, after); } }, h('span', 'What I share'), h('span.row-val', '›'))),
    h('label.form-label', 'Notifications'),
    h('section.card.push-card', pushRow()),
    h('button.link.red-text.leave', { onclick: () => { s.close(); leaveGroup(g).then((ok) => ok && after()); } }, 'Leave group'),
  ));
}

async function invite(g) {
  const text = `Join my group “${g.name}” on Carver. Open ${location.origin}, sign in, then Home → Groups → + → Join with code: ${g.code}`;
  if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(text); toast('Invite copied'); } catch { toast(`Invite code: ${g.code}`); }
}

function sharesSheet(g, after) {
  const shares = { ...g.shares };
  const nameIn = h('input.field.goal-input.wide', { value: g.myName, maxlength: 30, 'aria-label': 'Your name in this group' });
  const save = async () => {
    const name = nameIn.value.trim() || g.myName;
    try { await updateMe(g.id, { shares, name }); s.close(); toast('Saved'); after?.(); publish(); }
    catch { toast('Couldn’t save. Check your connection.'); }
  };
  const s = sheet(h('div.form',
    h('div.sheet-head', h('button.link', { onclick: () => s.close() }, 'Cancel'), h('div.sheet-title', 'What I share'), h('button.link.strong', { onclick: save }, 'Save')),
    h('p.fine', `What ${g.name} sees. Turning one off doesn’t remove past posts.`),
    h('div.group', SHARES.map((x) => h('label.goal-row.share-row',
      h('span', x.label, x.sub ? h('span.share-sub', x.sub) : null),
      h('input.toggle', { type: 'checkbox', checked: shares[x.k] !== false, onchange: (e) => { shares[x.k] = e.target.checked; } })))),
    h('label.form-label', 'Your name in this group'),
    h('div.group', h('label.goal-row', h('span', 'Name'), h('span.goal-field', nameIn))),
  ));
}
