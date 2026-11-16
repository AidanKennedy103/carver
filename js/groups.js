// Groups: friends who see each other's workouts and goal hits.
//
// Carver posts to your groups on its own after each sync: finished workouts
// (with PRs), runs and other cardio, hitting your protein or calorie goal, and
// closing your weekly gym goal. Each person picks what they share with each group.

import { h, fill, icon, push, navBar, sheet, toast, actionSheet, confirmBox, promptBox, fmtDate, fmtNum, fmtDurationWords } from './ui.js';
import { state, commit, ymd, addDays, dayTotals, weekStart, workoutStats, exercise, toDisplay, unit } from './store.js';
import { client, enabled, account } from './cloud.js';
import { signInSheet } from './account.js';
import { activityType } from './fitness.js';

export const SHARES = [
  { k: 'gym', label: 'At the gym', sub: 'When you start a workout' },
  { k: 'workouts', label: 'Finished workouts', sub: 'Name, time and sets' },
  { k: 'prs', label: 'Personal records', sub: 'Shown with the workout' },
  { k: 'cardio', label: 'Runs, rides and other cardio', sub: 'From the Fitness tab' },
  { k: 'protein', label: 'Hitting your protein goal' },
  { k: 'kcal', label: 'Hitting your calorie goal' },
  { k: 'week', label: 'Closing your weekly gym goal' },
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
    db.from('carver_members').select('group_id, user_id, name').in('group_id', groupIds),
  ]);
  if (ev.error) throw ev.error;
  const names = new Map((mem.data || []).map((m) => [m.group_id + m.user_id, m.name]));
  const members = new Map();
  for (const m of mem.data || []) members.set(m.group_id, [...(members.get(m.group_id) || []), m]);
  cache('carver.members', Object.fromEntries(members));
  const feed = (ev.data || []).map((e) => ({ ...e, who: names.get(e.group_id + e.user_id) || 'Someone', me: e.user_id === account().id }));
  if (groupIds.length === myGroups().length) cache('carver.feed', feed.slice(0, 40));
  return feed;
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
  if (a && a.start > now - 3 * 36e5) out.push({ kind: 'started', ref: 's:' + a.id, share: 'gym', data: { name: a.name || 'Workout' } });
  for (const w of state.workouts) {
    if ((w.end || w.start) < now - RECENT) break;   // newest first
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
    if (t.kcal >= g.kcal * 0.9 && t.kcal <= g.kcal * 1.1) out.push({ kind: 'kcal', ref: 'k:' + day, share: 'kcal', data: { kcal: Math.round(t.kcal), goal: g.kcal, day } });
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
const dayWord = (d) => (d === ymd() ? 'today' : d === addDays(ymd(), -1) ? 'yesterday' : '');

function describe(e) {
  const d = e.data || {};
  switch (e.kind) {
    case 'photo': return { ico: '📸', text: 'shared a progress photo', sub: d.ts ? fmtDate(d.ts, { month: 'short', day: 'numeric' }) : '', photo: d.path };
    case 'started': return { ico: '📍', text: 'is at the gym', sub: d.name && d.name !== 'Workout' ? `Started ${d.name}` : 'Started a workout' };
    case 'workout': return {
      ico: '🏋️', text: `finished ${d.name}`,
      sub: [d.mins ? fmtDurationWords(d.mins * 6e4) : '', d.sets ? `${d.sets} sets` : '', d.kg ? `${fmtNum(+toDisplay(d.kg))} ${unit()} lifted` : ''].filter(Boolean).join(' · '),
      extra: (d.prs || []).map((p) => `🏆 ${p.ex} · ${p.kind}${p.kg != null ? ` ${toDisplay(p.kg)} ${unit()}` : p.reps ? ` ${p.reps} reps` : ''}`),
    };
    case 'cardio': { const t = activityType(d.type); return { ico: t.icon, text: `did a ${t.name.toLowerCase()}`, sub: [d.m ? dist(d.m) : '', d.mins ? fmtDurationWords(d.mins * 6e4) : '', d.kcal ? `${fmtNum(d.kcal)} kcal` : ''].filter(Boolean).join(' · ') }; }
    case 'protein': return { ico: '💪', text: `hit their protein goal${dayWord(d.day) ? ' ' + dayWord(d.day) : ''}`, sub: `${d.g} g of ${d.goal} g` };
    case 'kcal': return { ico: '🎯', text: `hit their calorie goal${dayWord(d.day) ? ' ' + dayWord(d.day) : ''}`, sub: `${fmtNum(d.kcal)} kcal` };
    case 'week': return { ico: '🔥', text: 'closed their weekly gym goal', sub: `${d.n} workout${d.n === 1 ? '' : 's'} this week` };
    default: return { ico: '•', text: 'did something', sub: '' };
  }
}

export function eventRow(e, { showGroup = false } = {}) {
  const x = describe(e);
  const grp = showGroup ? myGroups().find((g) => g.id === e.group_id)?.name : null;
  return h('div.feed-row',
    h('span.feed-av', (e.who || '?')[0].toUpperCase()),
    h('div.feed-text',
      h('div.feed-line', h('b', e.me ? 'You' : e.who), ' ', x.ico, ' ', x.text),
      x.sub ? h('div.feed-sub', x.sub) : null,
      (x.extra || []).map((t) => h('div.feed-pr', t)),
      x.photo ? groupPhoto(x.photo) : null,
      grp ? h('div.feed-sub', grp) : null),
    h('span.feed-when', ago(e.created_at)));
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
export function groupsCard() {
  if (!enabled()) return null;
  const box = h('div');
  const draw = (feed = cachedFeed()) => {
    if (!account()) {
      fill(box, h('button.card.prompt', { onclick: signInSheet },
        h('span.prompt-ico', '👥'), h('span.today-text', h('span.today-k.strong', 'Train with friends'), h('span.today-v', 'Sign in to make a group and see each other’s workouts')), h('span.prompt-go', icon('back', 16))));
      return;
    }
    if (!myGroups().length) {
      fill(box, h('button.card.prompt', { onclick: () => push(groupsScreen) },
        h('span.prompt-ico', '👥'), h('span.today-text', h('span.today-k.strong', 'Make a group'), h('span.today-v', 'Friends see when you train and hit your goals')), h('span.prompt-go', icon('back', 16))));
      return;
    }
    fill(box, h('button.card.list-card.feed-card', { onclick: () => push(groupsScreen) },
      feed.length ? feed.slice(0, 3).map((e) => eventRow(e, { showGroup: myGroups().length > 1 })) : h('div.feed-empty', 'Nothing yet. Finish a workout and your group sees it here.'),
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

export function groupsScreen() {
  const el = h('div.page');
  const body = h('div.scroll-body');
  let feed = cachedFeed(), loading = true;

  async function refresh() {
    loading = true;
    try { await loadGroups(); feed = await loadFeed(); } catch { toast('Offline. Showing what Carver saved.'); }
    loading = false;
    draw();
  }

  function draw() {
    const groups = myGroups();
    if (!groups.some((g) => g.id === selected)) selected = groups[0]?.id || null;
    const g = groups.find((x) => x.id === selected);
    const list = feed.filter((e) => e.group_id === selected);
    const members = g ? groupMembers(g.id) : [];
    fill(body,
      navBar({ title: 'Groups', backLabel: 'Home', large: true, right: [h('button.icon-btn.gold-text', { onclick: addMenu, 'aria-label': 'Make or join a group' }, icon('plus', 24))] }),
      !account()
        ? h('button.card.empty-plan', { onclick: signInSheet }, h('div.empty-title', 'Sign in first'), h('div.empty-text', 'Groups need an account so friends can see your posts.'))
        : !groups.length
          ? h('div.empty-groups',
            h('div.empty-title', 'Train with friends'),
            h('div.empty-text', 'Make a group and share its invite code, or join a friend’s. Carver posts when you finish a workout, set a PR, go for a run, or hit your protein or calorie goal. You choose what each group sees.'),
            h('div.btn-pair', h('button.btn.gold', { onclick: () => createGroup().then((x) => { if (x) { selected = x.id; refresh(); } }) }, 'Make a group'), h('button.btn.dark', { onclick: () => joinGroup().then((x) => { if (x) { selected = x.id; refresh(); } }) }, 'Join with code')))
          : [
            groups.length > 1 ? h('div.chips.tight', groups.map((x) => h('button.chip' + (x.id === selected ? '.on' : ''), { onclick: () => { selected = x.id; draw(); } }, x.name))) : null,
            h('section.card.group-head',
              h('div.group-title', g.name),
              h('div.group-meta', `${members.length || 1} member${members.length === 1 ? '' : 's'}${members.length ? ': ' + members.map((m) => m.name).join(', ') : ''}`),
              h('div.group-code', 'Invite code ', h('b', g.code)),
              h('div.btn-pair',
                h('button.btn.gold-soft', { onclick: () => invite(g) }, 'Invite friends'),
                h('button.btn.dark', { onclick: () => sharesSheet(g, draw) }, 'What I share'))),
            h('div.section-head', h('h2.section-title', 'Activity'), loading ? h('span.section-count', 'Updating…') : null),
            list.length ? h('section.card.list-card', list.map((e) => (e.me ? h('button.own-post', { onclick: () => deletePost(e).then((ok) => ok && refresh()), 'aria-label': 'Your post. Tap to remove it.' }, eventRow(e)) : eventRow(e)))) : h('div.feed-empty.card', loading ? 'Loading…' : 'Nothing here yet. Posts show up as people train and hit goals.'),
            list.some((e) => e.me) ? h('p.fine', 'Tap one of your own posts to remove it.') : null,
            h('button.link.red-text.leave', { onclick: () => leaveGroup(g).then((ok) => ok && refresh()) }, 'Leave group'),
          ],
      h('div.bottom-space'),
    );
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
  el.append(body);
  return { el, refresh: draw };
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
    h('p.fine', `What ${g.name} sees when it happens. Only new things are posted; turning one off doesn’t remove past posts.`),
    h('div.group', SHARES.map((x) => h('label.goal-row.share-row',
      h('span', x.label, x.sub ? h('span.share-sub', x.sub) : null),
      h('input.toggle', { type: 'checkbox', checked: shares[x.k] !== false, onchange: (e) => { shares[x.k] = e.target.checked; } })))),
    h('label.form-label', 'Your name in this group'),
    h('div.group', h('label.goal-row', h('span', 'Name'), h('span.goal-field', nameIn))),
  ));
}
