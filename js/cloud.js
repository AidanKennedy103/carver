// Accounts and sync (Supabase). Off until config.js has a project.
//
// Sync keeps a copy of what was last synced (the "base"). When both devices
// changed things, it merges them: lists like workouts, food and weights are
// joined item by item, so nothing logged on either phone is lost, and a delete
// on one phone removes the item on the other. If both changed the same setting,
// the phone doing the sync keeps its own.

import { CONFIG } from './config.js';
import { state, commit, onSaved, replaceState, setSharedFoods, sharedFoods } from './store.js';

export const enabled = () => !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);

let clientP = null;
export function client() {
  if (clientP) return clientP;
  if (!enabled()) return Promise.resolve(null);
  return (clientP = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm')
    .then(({ createClient }) => createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'carver.auth' } }))
    .catch((e) => { clientP = null; throw e; }));
}

// ---------- Account ----------

// Start signed in if this device has a saved session (Supabase keeps it under
// 'carver.auth'), so you show as signed in right away, even offline, before the
// sign-in library has loaded. It checks the session properly once it loads.
let user = null;
try { user = JSON.parse(localStorage.getItem('carver.auth'))?.user || null; } catch { /* none */ }
let lastSynced = 0;
try { lastSynced = +localStorage.getItem('carver.synced') || 0; } catch { /* storage blocked */ }
const status = { syncing: false, last: lastSynced, error: '' };
const statusListeners = new Set();
export const onStatus = (fn) => { statusListeners.add(fn); return () => statusListeners.delete(fn); };
const tell = () => statusListeners.forEach((f) => f());
export const account = () => user;
export const syncStatus = () => status;

/**
 * Email sign-in, no password: Supabase emails a code, you type it in the app.
 * (A link wouldn't work: on iPhone it opens Safari, which can't reach the home-screen app's storage.)
 * New emails get an account automatically.
 */
export async function sendCode(email) {
  const db = await client();
  const { error } = await db.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw new Error(friendly(error));
}

export async function verifyCode(email, code) {
  const db = await client();
  const { data, error } = await db.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) throw new Error(friendly(error));
  return signedIn(data.user);
}

/**
 * Sign in with the link from the email, pasted into the app (press and hold the
 * link, Copy). Tapping it would open Safari, which on iPhone has separate storage
 * from the home-screen app. Accepts the email's link or the page it leads to.
 */
export async function verifyLink(text) {
  const raw = String(text).match(/https?:\/\/\S+/)?.[0];
  if (!raw) throw new Error('Paste the whole link from the email.');
  let url;
  try { url = new URL(raw); } catch { throw new Error('That link didn’t work. Copy it again from the email.'); }
  const q = url.searchParams, hash = new URLSearchParams(url.hash.slice(1));
  const db = await client();
  let res;
  if (hash.get('access_token') && hash.get('refresh_token')) {
    res = await db.auth.setSession({ access_token: hash.get('access_token'), refresh_token: hash.get('refresh_token') });
  } else if (q.get('token_hash') || q.get('token')) {
    res = await db.auth.verifyOtp({ token_hash: q.get('token_hash') || q.get('token'), type: q.get('type') || 'magiclink' });
  } else throw new Error('That isn’t a sign-in link. Copy the link from the Carver email.');
  if (res.error) throw new Error(/expired|invalid|token/i.test(res.error.message || '')
    ? 'That link was already used or has expired (each one works once, so don’t tap it first). Send a new one.'
    : friendly(res.error));
  return signedIn(res.data.user || res.data.session?.user);
}

async function signedIn(u) {
  user = u;
  tell();
  await sync();
  pullFoods();
  import('./push.js').then((m) => m.refreshPush()).catch(() => {});
  return user;
}

export async function signOut() {
  const db = await client();
  const { error } = await db.auth.signOut();
  if (error) throw new Error(friendly(error));
  user = null;
  for (const k of ['carver.base', 'carver.synced', 'carver.photoUp', 'carver.groups', 'carver.feed', 'carver.members', 'carver.posted']) { try { localStorage.removeItem(k); } catch { /* fine */ } }
  status.last = 0;
  tell();
}

/**
 * Delete the account and everything in it: photos in storage (yours and any you
 * shared to groups), then the account itself, which removes synced data, group
 * memberships and posts. Foods you shared stay in the database without your name.
 */
export async function deleteAccount() {
  const db = await client();
  if (!user) throw new Error('Sign in first');
  const bucket = db.storage.from('carver-photos');
  const mine = await bucket.list(user.id, { limit: 1000 });
  if (mine.data?.length) await bucket.remove(mine.data.map((f) => `${user.id}/${f.name}`));
  const groups = await db.from('carver_members').select('group_id').eq('user_id', user.id);
  for (const g of groups.data || []) {
    const files = await bucket.list(`groups/${g.group_id}`, { limit: 1000, search: user.id });
    const own = (files.data || []).filter((f) => f.name.startsWith(user.id + '-')).map((f) => `groups/${g.group_id}/${f.name}`);
    if (own.length) await bucket.remove(own);
  }
  const { error } = await db.rpc('carver_delete_account');
  if (error) throw new Error(friendly(error));
  await db.auth.signOut().catch(() => {});
  user = null;
  for (const k of ['carver.base', 'carver.synced', 'carver.photoUp', 'carver.groups', 'carver.feed', 'carver.members', 'carver.posted']) { try { localStorage.removeItem(k); } catch { /* fine */ } }
  status.last = 0;
  tell();
}

function friendly(e) {
  const m = e.message || String(e);
  if (/sending|smtp|email.*(send|deliver)/i.test(m)) return 'Carver couldn’t send the email right now (a problem with its email setup, not your address). Try again later.';
  if (/expired|invalid|token/i.test(m)) return 'That code didn’t work. Check the newest email, or send a new code.';
  const secs = m.match(/after (\d+) seconds?/i);
  if (secs) return `Wait ${secs[1]} seconds before asking for another code.`;
  if (/rate limit|too many/i.test(m)) return 'Carver’s email sender has hit its hourly limit (a few emails an hour). Try again in an hour.';
  if (/fetch|network/i.test(m)) return 'No connection. Try again.';
  return m;
}

// ---------- Merging ----------

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const idList = (a) => Array.isArray(a) && a.every((x) => isObj(x) && x.id != null);

/** Three-way merge: what changed on this phone since base, plus what changed on the other. */
export function merge3(base, local, remote, preferRemote = false) {
  if (same(local, remote)) return local;
  if (base !== undefined && same(base, local)) return remote;
  if (base !== undefined && same(base, remote)) return local;
  if (idList(local) && idList(remote) && (local.length || remote.length)) return mergeById(base, local, remote, preferRemote);
  if (isObj(local) && isObj(remote)) {
    const out = {};
    for (const k of new Set([...Object.keys(local), ...Object.keys(remote)])) {
      const v = merge3(isObj(base) ? base[k] : undefined, local[k], remote[k], preferRemote);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  // Both changed the same thing: this phone wins (or the account, the first time a phone joins it)
  if (preferRemote && remote !== undefined) return remote;
  return local;
}

function mergeById(base, local, remote, preferRemote) {
  const B = new Map((Array.isArray(base) ? base : []).filter(isObj).map((x) => [x.id, x]));
  const L = new Map(local.map((x) => [x.id, x]));
  const R = new Map(remote.map((x) => [x.id, x]));
  const out = [];
  for (const id of [...L.keys(), ...[...R.keys()].filter((k) => !L.has(k))]) {
    const b = B.get(id), l = L.get(id), r = R.get(id);
    if (l && r) out.push(merge3(b, l, r, preferRemote));
    else if (l) { if (!(b && same(b, l))) out.push(l); }   // gone from the other phone: deleted there unless edited here
    else if (!(b && same(b, r))) out.push(r);
  }
  return out;
}

/** Keep lists in the order the app expects after a merge. */
function tidy(d) {
  const by = (k, dir = 1) => (a, b) => dir * ((a[k] || 0) - (b[k] || 0));
  d.workouts?.sort(by('start', -1));
  d.activities?.sort(by('start', -1));
  d.food?.log?.sort(by('ts'));
  d.body?.weights?.sort(by('ts'));
  d.body?.photos?.sort(by('ts', -1));
  return d;
}

const hasData = (d) => !!(d.workouts?.length || d.plans?.length || d.food?.log?.length || d.body?.weights?.length || d.activities?.length || d.body?.photos?.length);

// ---------- Sync ----------

let localVersion = 0, applying = false, timer = 0, running = null, again = false;

const loadBase = () => { try { return JSON.parse(localStorage.getItem('carver.base')); } catch { return null; } };
const saveBase = (rev, data) => { try { localStorage.setItem('carver.base', JSON.stringify({ rev, data })); } catch { /* storage full: next sync merges without it */ } };

/** Sync now (or right after the one that's running). */
export function sync() {
  if (!user) return Promise.resolve();
  if (running) { again = true; return running; }
  running = (async () => {
    status.syncing = true; status.error = ''; tell();
    try {
      let ok = false;
      for (let tries = 0; tries < 4 && !ok; tries++) ok = await syncOnce();
      if (!ok) throw new Error('Busy syncing. Will try again shortly.');
      status.last = Date.now();
      localStorage.setItem('carver.synced', String(status.last));
      syncPhotos().catch(() => {});
      import('./groups.js').then((g) => g.publish()).catch(() => {});
    } catch (e) {
      status.error = /fetch|network|Failed/i.test(e.message || '') ? 'Offline. Will sync when you’re back online.' : (e.message || 'Sync failed');
    } finally {
      status.syncing = false; running = null; tell();
      if (again) { again = false; schedule(300); }
    }
  })();
  return running;
}

/** One round: read the account, merge, write back. False means another phone saved meanwhile (try again). */
async function syncOnce() {
  const db = await client();
  const v0 = localVersion;
  const { data: row, error } = await db.from('carver_state').select('data, rev').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  if (localVersion !== v0) return false;                    // you changed something while it loaded
  const local = JSON.parse(JSON.stringify(state));
  const base = loadBase();
  let merged;
  if (!row) merged = local;
  else if (base && base.rev === row.rev) merged = local;     // nothing new from other phones
  else if (!base && !hasData(local)) merged = row.data;      // new phone: take the account as it is
  else merged = tidy(merge3(base?.data, local, row.data, !base));

  if (!same(merged, local)) {
    applying = true;
    try { replaceState(merged); } finally { applying = false; }
  }
  if (!row) {
    const { error: e } = await db.from('carver_state').insert({ user_id: user.id, data: merged, rev: 1 });
    if (e) { if (e.code === '23505') return false; throw e; }   // another phone made it first
    saveBase(1, merged);
  } else if (!same(merged, row.data)) {
    const { data: upd, error: e } = await db.from('carver_state')
      .update({ data: merged, rev: row.rev + 1, updated_at: new Date().toISOString() })
      .eq('user_id', user.id).eq('rev', row.rev).select('rev');
    if (e) throw e;
    if (!upd?.length) return false;                           // another phone saved first: merge again
    saveBase(row.rev + 1, merged);
  } else saveBase(row.rev, merged);
  return true;
}

function schedule(ms = 1500) {
  clearTimeout(timer);
  timer = setTimeout(() => { timer = 0; sync(); }, ms);
}

// ---------- Progress photos ----------
// Photos live in IndexedDB on each phone and in a private storage folder per account.

const upKey = 'carver.photoUp';
const uploaded = () => new Set(JSON.parse(localStorage.getItem(upKey) || '[]'));
const setUploaded = (s) => localStorage.setItem(upKey, JSON.stringify([...s]));

async function syncPhotos() {
  if (!user) return;
  const { getRecord, putRecord } = await import('./photos.js');
  const db = await client();
  const bucket = db.storage.from('carver-photos');
  const up = uploaded();
  let changed = false;
  const ids = new Set((state.body.photos || []).map((p) => p.id));
  for (const p of state.body.photos || []) {
    const rec = await getRecord(p.id);
    const path = `${user.id}/${p.id}`;
    if (rec && !up.has(p.id)) {
      const a = await bucket.upload(`${path}.jpg`, rec.full, { upsert: true, contentType: 'image/jpeg' });
      const b = await bucket.upload(`${path}_t.jpg`, rec.thumb, { upsert: true, contentType: 'image/jpeg' });
      if (!a.error && !b.error) { up.add(p.id); setUploaded(up); }
    } else if (!rec) {
      const [full, thumb] = await Promise.all([bucket.download(`${path}.jpg`), bucket.download(`${path}_t.jpg`)]);
      if (full.data && thumb.data) { await putRecord({ id: p.id, ts: p.ts, full: full.data, thumb: thumb.data }); up.add(p.id); setUploaded(up); changed = true; }
    }
  }
  // Deleted on a phone: remove from the account too
  const gone = [...up].filter((id) => !ids.has(id));
  if (gone.length) {
    await bucket.remove(gone.flatMap((id) => [`${user.id}/${id}.jpg`, `${user.id}/${id}_t.jpg`]));
    gone.forEach((id) => up.delete(id));
    setUploaded(up);
  }
  if (changed) (await import('./ui.js')).refreshAll();
}

// ---------- Shared food database ----------

/** Load foods other people added. Works without signing in. */
export async function pullFoods() {
  if (!enabled()) return;
  try {
    const db = await client();
    const { data, error } = await db.from('carver_foods').select('id, data').order('created_at', { ascending: false }).limit(5000);
    if (error || !data) return;
    setSharedFoods(data.map((r) => ({ ...r.data, id: r.id, shared: true, custom: false, cat: 'Community' })));
  } catch { /* offline: keep the cached list */ }
}

/** Add a food to the shared database (signed in only). Returns true if it was sent. */
export async function shareFood(f) {
  if (!user) return false;
  try {
    const db = await client();
    const { custom, shared, scanned, ...data } = f;
    const { error } = await db.from('carver_foods').upsert({ id: f.id, barcode: f.barcode || null, name: f.name.slice(0, 120), data }, { onConflict: 'id', ignoreDuplicates: true });
    if (error) return false;
    setSharedFoods([{ ...data, shared: true, cat: 'Community' }, ...sharedFoods().filter((x) => x.id !== f.id)]);
    return true;
  } catch { return false; }
}

/** A food with this barcode in the shared database, or null. */
export async function sharedByBarcode(code) {
  const cached = sharedFoods().find((f) => f.barcode === code);
  if (cached) return cached;
  if (!enabled()) return null;
  try {
    const db = await client();
    const { data } = await db.from('carver_foods').select('id, data').eq('barcode', code).limit(1);
    return data?.[0] ? { ...data[0].data, id: data[0].id, shared: true } : null;
  } catch { return null; }
}

// ---------- Start ----------

let connected = false;
/** Load the sign-in library and check the saved session. Retried until it works (it needs a connection the first time). */
async function connect() {
  if (connected) return;
  try {
    const db = await client();
    const { data, error } = await db.auth.getSession();
    if (error && /fetch|network/i.test(error.message || '')) return;   // offline: keep the saved sign-in, try later
    connected = true;
    user = data.session?.user || null;
    db.auth.onAuthStateChange((_e, session) => { const was = user?.id; user = session?.user || null; if (user && user.id !== was) sync(); tell(); });
    tell();
    if (user) { sync(); import('./push.js').then((m) => m.refreshPush()).catch(() => {}); }
  } catch { /* offline: try again when the app comes back */ }
}

export async function initCloud() {
  if (!enabled()) return;
  // The server posts missed daily goals at 8 am your time, so it needs your time zone
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz && state.profile.tz !== tz) commit((s) => { s.profile.tz = tz; });
  onSaved(() => { if (applying) return; localVersion++; if (user) schedule(); });
  pullFoods();
  await connect();
  const wake = () => (connected ? user && sync() : connect());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { wake(); pullFoods(); }
    else if (user && timer) { clearTimeout(timer); timer = 0; sync(); }   // leaving the app: send what's waiting now
  });
  addEventListener('online', wake);
  setInterval(() => { if (document.visibilityState === 'visible') wake(); }, 60000);
}

// For tests only: use a stand-in database.
export const _test = { use(c, u) { clientP = Promise.resolve(c); user = u; } };
