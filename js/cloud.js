// Accounts and sync (Supabase). Off until config.js has a project.
//
// Sync keeps a copy of what was last synced (the "base"). When both devices
// changed things, it merges them: lists like workouts, food and weights are
// joined item by item, so nothing logged on either phone is lost, and a delete
// on one phone removes the item on the other. If both changed the same setting,
// the phone doing the sync keeps its own.

import { CONFIG } from './config.js';
import { state, onSaved, replaceState, setSharedFoods, sharedFoods } from './store.js';

export const enabled = () => !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);

let clientP = null;
function client() {
  if (clientP) return clientP;
  if (!enabled()) return Promise.resolve(null);
  return (clientP = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm')
    .then(({ createClient }) => createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'carver.auth' } }))
    .catch((e) => { clientP = null; throw e; }));
}

// ---------- Account ----------

let user = null;
const status = { syncing: false, last: +localStorage.getItem('carver.synced') || 0, error: '' };
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
  user = data.user;
  tell();
  await sync();
  pullFoods();
  return user;
}

export async function signOut() {
  const db = await client();
  await db.auth.signOut();
  user = null;
  for (const k of ['carver.base', 'carver.synced', 'carver.photoUp']) localStorage.removeItem(k);
  status.last = 0;
  tell();
}

function friendly(e) {
  const m = e.message || String(e);
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
      for (let tries = 0; tries < 4; tries++) if (await syncOnce()) break;
      status.last = Date.now();
      localStorage.setItem('carver.synced', String(status.last));
      syncPhotos().catch(() => {});
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
  timer = setTimeout(() => sync(), ms);
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

export async function initCloud() {
  if (!enabled()) return;
  onSaved(() => { if (applying) return; localVersion++; if (user) schedule(); });
  pullFoods();
  try {
    const db = await client();
    const { data } = await db.auth.getSession();
    user = data.session?.user || null;
    db.auth.onAuthStateChange((_e, session) => { const was = user?.id; user = session?.user || null; if (user && user.id !== was) sync(); tell(); });
    tell();
    if (user) sync();
  } catch { /* offline: try again when the app comes back */ }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { if (user) sync(); pullFoods(); } });
  addEventListener('online', () => user && sync());
  setInterval(() => { if (user && document.visibilityState === 'visible') sync(); }, 60000);
}

// For tests only: use a stand-in database.
export const _test = { use(c, u) { clientP = Promise.resolve(c); user = u; } };
