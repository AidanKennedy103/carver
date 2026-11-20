// Carver's notification server (a Supabase Edge Function named "carver-push").
//
// It's called three ways:
//   { event: <id> }   by a database trigger for each new group post: notify the
//                     other members' phones (once per post).
//   { cron: true }    every hour: for each person whose local time is 8 am or later,
//                     post yesterday's missed daily goals, and on Mondays last week's
//                     summary. Posts are unique per day/week, so running it again
//                     does nothing new; each new post then notifies through the trigger.
//   { test: <endpoint> }  send one test notification to that phone.
//   { reply: { table, event, user, text } }  a kudos or comment: tell the post's owner.
//
// Secrets (Edge Functions → Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
// Turn OFF "Enforce JWT verification" for this function: the database calls it without a login.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
// Keys are base64url; drop quotes, spaces or line breaks pasted along with them
const key = (name: string) => (Deno.env.get(name) || '').replace(/[^A-Za-z0-9_-]/g, '');
const VAPID = { publicKey: key('VAPID_PUBLIC_KEY'), privateKey: key('VAPID_PRIVATE_KEY'), subject: (Deno.env.get('VAPID_SUBJECT') || 'mailto:carver@example.com').trim().replace(/^["']|["']$/g, '') };

const CARDIO: Record<string, string> = { run: 'run', walk: 'walk', cycle: 'ride', hike: 'hike', swim: 'swim', row: 'row', elliptical: 'elliptical session', hiit: 'HIIT session', sport: 'sport session', yoga: 'yoga session' };

// The app calls the test from the browser, which first asks whether that's allowed (CORS)
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const body = await req.json().catch(() => ({}));
  try {
    if (body.event) await notify(String(body.event));
    else if (body.reply) await reply(body.reply);
    else if (body.cron) { await sweep(); await remind(); }
    else if (body.test) return Response.json(await test(String(body.test)), { headers: CORS });
    return new Response('ok', { headers: CORS });
  } catch (e) {
    console.error(e);
    return new Response(String(e), { status: 500, headers: CORS });
  }
});

// ---------- Web Push, with Web Crypto only ----------
// Encrypts the message for one phone (RFC 8291, aes128gcm) and signs the request
// with the VAPID key (RFC 8292). No library: Node-style ones can hang here.

const enc = new TextEncoder();
const b64u = {
  decode: (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0)),
  encode: (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
};
const concat = (...parts: Uint8Array[]) => { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let i = 0; for (const p of parts) { out.set(p, i); i += p.length; } return out; };
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8));
}

/** The encrypted body for one subscription. */
export async function encryptPayload(p256dh: string, authSecret: string, payload: string, salt = crypto.getRandomValues(new Uint8Array(16)), local?: CryptoKeyPair) {
  const uaPublic = b64u.decode(p256dh), auth = b64u.decode(authSecret);
  const pair = local || await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, pair.privateKey, 256));
  const ikm = await hkdf(auth, shared, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(enc.encode(payload), new Uint8Array([2]))));
  const header = new Uint8Array(21 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPublic.length;
  header.set(asPublic, 21);
  return concat(header, cipher);
}

const signers = new Map<string, CryptoKey>();
/** "vapid t=…, k=…" for the push service at this endpoint. */
async function vapidAuth(endpoint: string, v: { publicKey: string; privateKey: string; subject: string }) {
  const pub = b64u.decode(v.publicKey);
  let key = signers.get(v.privateKey);
  if (!key) {
    key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', d: v.privateKey, x: b64u.encode(pub.slice(1, 33)), y: b64u.encode(pub.slice(33, 65)), ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    signers.set(v.privateKey, key);
  }
  const head = b64u.encode(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u.encode(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: v.subject })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${head}.${claims}`));
  return `vapid t=${head}.${claims}.${b64u.encode(sig)}, k=${v.publicKey}`;
}

/** Send one notification. Gives up after 10 seconds. */
export async function webPush(sub: { endpoint: string; p256dh: string; auth: string }, payload: string, v: { publicKey: string; privateKey: string; subject: string }, opts: { ttl?: number; urgency?: string } = {}) {
  const body = await encryptPayload(sub.p256dh, sub.auth, payload);
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuth(sub.endpoint, v),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(opts.ttl ?? 43200),
      Urgency: opts.urgency || 'normal',
    },
    body,
    signal: AbortSignal.timeout(10000),
  });
  return { ok: res.ok, status: res.status, body: res.ok ? '' : await res.text().catch(() => '') };
}

// ---------- Sending ----------

type Sub = { endpoint: string; p256dh: string; auth: string };

/** Send to each phone. Returns what happened to each (for the test button). */
async function send(subs: Sub[], msg: { title: string; body: string; tag?: string }) {
  return await Promise.all(subs.map(async (s) => {
    try {
      const r = await webPush(s, JSON.stringify(msg), VAPID, { ttl: 60 * 60 * 12, urgency: 'high' });
      if (r.ok) return { ok: true, status: r.status };
      // The phone unsubscribed or the app was removed: forget it
      if (r.status === 404 || r.status === 410) await db.from('carver_push').delete().eq('endpoint', s.endpoint);
      console.error('push refused', r.status, r.body);
      return { ok: false, status: r.status, error: r.body.slice(0, 200) };
    } catch (e) {
      console.error('push failed', e);
      return { ok: false, status: 0, error: String(e?.message || e).slice(0, 200) };
    }
  }));
}

async function test(endpoint: string) {
  if (VAPID.privateKey.length < 40 || VAPID.publicKey.length < 80) return { ok: false, reason: 'secrets' };
  const { data, error } = await db.from('carver_push').select('endpoint, p256dh, auth').eq('endpoint', endpoint);
  if (error) return { ok: false, reason: 'db', error: error.message };
  if (!data?.length) return { ok: false, reason: 'not-registered' };
  const [r] = await send(data, { title: 'Carver', body: 'Notifications work. 💪', tag: 'test' });
  return r.ok ? { ok: true, status: r.status } : { ok: false, reason: 'apple', status: r.status, error: r.error };
}

/** What the notification says about a post. */
function text(kind: string, who: string, d: any): string | null {
  switch (kind) {
    case 'workout': return `${who} finished ${d.name || 'a workout'}${d.prs?.length ? ` · ${d.prs.length} PR${d.prs.length > 1 ? 's' : ''} 🏆` : ''}`;
    case 'cardio': return `${who} did a ${CARDIO[d.type] || 'workout'}${d.mins ? ` (${d.mins} min)` : ''}`;
    case 'habit': return `${who} did ${d.name} ✅`;
    case 'missed': return `${who} missed ${d.name} yesterday`;
    case 'week': return `${who} closed their weekly gym goal 🔥`;
    case 'photo': return `${who} shared a progress photo`;
    case 'challenge': return `${who} started a challenge: ${d.title} 🏁`;
    case 'gym': return `${who} is heading to the gym ${d.when || 'now'}. Join them?`;
    case 'note': return `${who}: ${String(d.text || '').slice(0, 140)}`;
    case 'weekly': {
      const bits = [];
      if (d.workouts) bits.push(`${d.workouts.n}/${d.workouts.goal} workouts`);
      if (d.protein) bits.push(`protein ${d.protein.days}/${d.protein.of} days`);
      if (d.kcal) bits.push(`calories ${d.kcal.days}/${d.kcal.of} days`);
      for (const h of d.habits || []) bits.push(`${h.name} ${h.days}/${h.of}`);
      return `${who}'s week: ${bits.join(', ') || 'nothing logged'}`;
    }
    default: return null;
  }
}

/** Tell everyone else in the group about a new post (once). */
async function notify(id: string) {
  // Claim it, so a repeated call can't notify twice
  const { data: claimed } = await db.from('carver_events').update({ pushed_at: new Date().toISOString() })
    .eq('id', id).is('pushed_at', null).select('group_id, user_id, kind, data, created_at');
  const ev = claimed?.[0];
  if (!ev || Date.now() - Date.parse(ev.created_at) > 6 * 36e5) return;   // old posts (e.g. after being offline) stay quiet

  const [{ data: members }, { data: group }] = await Promise.all([
    db.from('carver_members').select('user_id, name').eq('group_id', ev.group_id),
    db.from('carver_groups').select('name').eq('id', ev.group_id).maybeSingle(),
  ]);
  const who = members?.find((m) => m.user_id === ev.user_id)?.name || 'Someone';
  const body = text(ev.kind, who, ev.data || {});
  const others = (members || []).map((m) => m.user_id).filter((u) => u !== ev.user_id);
  if (!body || !others.length) return;
  const { data: subs } = await db.from('carver_push').select('endpoint, p256dh, auth').in('user_id', others);
  if (subs?.length) await send(subs, { title: group?.name || 'Carver', body, tag: `${ev.kind}-${id}` });
}

/** Someone gave kudos or commented: tell the post's owner (not themselves). */
async function reply(r: { table: string; event: string; user: string; text?: string | null }) {
  const { data: ev } = await db.from('carver_events').select('group_id, user_id, kind, data').eq('id', r.event).maybeSingle();
  if (!ev || ev.user_id === r.user) return;
  const { data: m } = await db.from('carver_members').select('name').eq('group_id', ev.group_id).eq('user_id', r.user).maybeSingle();
  const who = m?.name || 'Someone';
  const what = ev.kind === 'workout' ? (ev.data?.name || 'your workout') : ev.kind === 'cardio' ? `your ${CARDIO[ev.data?.type] || 'workout'}` : 'your post';
  const body = r.table === 'carver_comments' ? `${who} on ${what}: ${String(r.text || '').slice(0, 120)}` : `${who} gave you kudos for ${what}`;
  const { data: subs } = await db.from('carver_push').select('endpoint, p256dh, auth').eq('user_id', ev.user_id);
  if (subs?.length) await send(subs, { title: 'Carver', body, tag: `reply-${r.event}` });
}

// ---------- The hourly check ----------

/** Daily goal reminders: at the hour someone picked, if that goal isn't done yet today. */
async function remind() {
  const { data: subs } = await db.from('carver_push').select('user_id, endpoint, p256dh, auth');
  if (!subs?.length) return;
  const users = [...new Set(subs.map((x) => x.user_id))];
  const { data: states } = await db.from('carver_state').select('user_id, data').in('user_id', users);
  const now = Date.now();
  for (const st of states || []) {
    const data = st.data || {};
    const tz = validTz(data.profile?.tz) ? data.profile.tz : 'America/Toronto';
    const hour = hourIn(now, tz), today = keyIn(now, tz);
    const due = (data.goals?.custom || []).filter((h: Habit & { remind?: number }) => h.remind === hour && !habitDone(data, h, today));
    if (!due.length) continue;
    const mine = subs.filter((x) => x.user_id === st.user_id);
    const names = due.map((h: Habit) => h.name);
    await send(mine, { title: 'Carver', body: `Reminder: ${names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]} ${names.length === 1 ? 'isn’t' : 'aren’t'} done yet today`, tag: `remind-${today}-${hour}` });
  }
}

const keyIn = (ts: number, tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ts);
const hourIn = (ts: number, tz: string) => +new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(ts);
const addDays = (key: string, n: number) => { const d = new Date(key + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const weekday = (key: string) => (new Date(key + 'T12:00:00Z').getUTCDay() + 6) % 7;   // 0 = Monday
const validTz = (tz: string) => { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; } };

type Habit = { id: string; name: string; since?: string; target?: number };
const habitDone = (data: any, h: Habit, day: string) => (data.checks?.[day]?.[h.id] || 0) >= (h.target || 1);

async function sweep() {
  const { data: members } = await db.from('carver_members').select('group_id, user_id, shares');
  if (!members?.length) return;
  const users = [...new Set(members.map((m) => m.user_id))];
  const { data: states } = await db.from('carver_state').select('user_id, data').in('user_id', users);
  const now = Date.now();
  const rows: any[] = [];

  for (const st of states || []) {
    const data = st.data || {};
    const tz = validTz(data.profile?.tz) ? data.profile.tz : 'America/Toronto';
    if (hourIn(now, tz) < 8) continue;   // not 8 am there yet
    const today = keyIn(now, tz), yesterday = addDays(today, -1);
    const habits: Habit[] = data.goals?.custom || [];
    // A daily goal counts from when it was added, or when they joined Carver if that's later
    const joined = data.profile?.joined ? keyIn(data.profile.joined, tz) : '';
    const startOf = (h: Habit) => (h.since && h.since > joined ? h.since : joined);
    const groups = members.filter((m) => m.user_id === st.user_id);
    const post = (share: string, kind: string, ref: string, d: any) => {
      for (const g of groups) if (g.shares?.[share] !== false) rows.push({ group_id: g.group_id, user_id: st.user_id, kind, ref, data: d });
    };

    // Yesterday's missed daily goals
    for (const h of habits) {
      if (startOf(h) > yesterday) continue;   // added today (or joined Carver today)
      if (!habitDone(data, h, yesterday)) post('habits', 'missed', `m:${h.id}:${yesterday}`, { name: h.name, day: yesterday });
    }

    // Monday: last week's summary
    if (weekday(today) === 0) {
      const mon = addDays(today, -7);
      const days = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
      const g = data.goals || {};
      const workouts = (data.workouts || []).filter((w: any) => days.includes(keyIn(w.start, tz))).length;
      const food = new Map<string, { p: number; kcal: number }>();
      for (const e of data.food?.log || []) {
        if (!days.includes(e.date)) continue;
        const t = food.get(e.date) || { p: 0, kcal: 0 };
        t.p += e.n?.p || 0; t.kcal += e.n?.kcal || 0;
        food.set(e.date, t);
      }
      const sum: any = { week: mon, workouts: { n: workouts, goal: g.workoutsPerWeek || 3 }, habits: [] };
      if (food.size) {
        const vals = [...food.values()];
        if (g.p) sum.protein = { days: vals.filter((t) => t.p >= g.p).length, of: 7 };
        // Same rule as the app: building = the goal is a minimum, cutting = a maximum, else within 10%
        const m = data.monthly?.[mon.slice(0, 7)]?.goals || [];
        const aim = g.aim || (m.includes('Build muscle') && !m.includes('Lose fat') ? 'build' : m.includes('Lose fat') && !m.includes('Build muscle') ? 'cut' : 'maintain');
        const hit = (v: number) => { const r = v / g.kcal; return aim === 'build' ? r >= 1 : aim === 'cut' ? r <= 1 && r >= 0.5 : r >= 0.9 && r <= 1.1; };
        if (g.kcal) sum.kcal = { days: vals.filter((t) => hit(t.kcal)).length, of: 7 };
      }
      for (const h of habits) {
        const counted = days.filter((d) => startOf(h) <= d);
        if (counted.length) sum.habits.push({ name: h.name, days: counted.filter((d) => habitDone(data, h, d)).length, of: counted.length });
      }
      for (const gr of groups) {
        if (gr.shares?.weekly === false) continue;
        const d = { ...sum };
        if (gr.shares?.protein === false) delete d.protein;
        if (gr.shares?.kcal === false) delete d.kcal;
        if (gr.shares?.habits === false) d.habits = [];
        rows.push({ group_id: gr.group_id, user_id: st.user_id, kind: 'weekly', ref: `ws:${mon}`, data: d });
      }
    }
  }
  // Each one posts once; new ones notify the group through the trigger
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from('carver_events').upsert(rows.slice(i, i + 200), { onConflict: 'group_id,user_id,ref', ignoreDuplicates: true });
    if (error) console.error(error);
  }
}
