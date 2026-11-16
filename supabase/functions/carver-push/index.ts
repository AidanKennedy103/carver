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
//
// Secrets (Edge Functions → Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
// Turn OFF "Enforce JWT verification" for this function: the database calls it without a login.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import webpush from 'npm:web-push@3.6.7';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || 'mailto:carver@example.com', Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);

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
    else if (body.cron) await sweep();
    else if (body.test) return Response.json(await test(String(body.test)), { headers: CORS });
    return new Response('ok', { headers: CORS });
  } catch (e) {
    console.error(e);
    return new Response(String(e), { status: 500, headers: CORS });
  }
});

// ---------- Sending ----------

type Sub = { endpoint: string; p256dh: string; auth: string };

/** Send to each phone. Returns what happened to each (for the test button). */
async function send(subs: Sub[], msg: { title: string; body: string; tag?: string }) {
  return await Promise.all(subs.map(async (s) => {
    try {
      const r = await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 60 * 60 * 12, urgency: 'high' });
      return { ok: true, status: r?.statusCode };
    } catch (e) {
      // The phone unsubscribed or the app was removed: forget it
      if (e?.statusCode === 404 || e?.statusCode === 410) await db.from('carver_push').delete().eq('endpoint', s.endpoint);
      console.error('push failed', e?.statusCode, e?.body || e?.message);
      return { ok: false, status: e?.statusCode, error: String(e?.body || e?.message || e).slice(0, 200) };
    }
  }));
}

async function test(endpoint: string) {
  if (!Deno.env.get('VAPID_PRIVATE_KEY') || !Deno.env.get('VAPID_PUBLIC_KEY')) return { ok: false, reason: 'secrets' };
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

// ---------- The hourly check ----------

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
    const groups = members.filter((m) => m.user_id === st.user_id);
    const post = (share: string, kind: string, ref: string, d: any) => {
      for (const g of groups) if (g.shares?.[share] !== false) rows.push({ group_id: g.group_id, user_id: st.user_id, kind, ref, data: d });
    };

    // Yesterday's missed daily goals
    for (const h of habits) {
      if (h.since && h.since > yesterday) continue;   // added today
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
        if (g.kcal) sum.kcal = { days: vals.filter((t) => t.kcal >= g.kcal * 0.9 && t.kcal <= g.kcal * 1.1).length, of: 7 };
      }
      for (const h of habits) {
        const counted = days.filter((d) => !h.since || h.since <= d);
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
