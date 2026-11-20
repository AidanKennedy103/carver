// Automatic Apple Health sync for the web app. A web app can't read Health, but the
// Shortcuts app can: a daily automation sends the day's numbers (with your private
// sync key) to Carver's server, and the app picks them up whenever it opens.
// The Health Auto Export app can send to the same address.
//
// Formats accepted (anything else is ignored):
//   Shortcut:           { date?, steps, active, sleep (hours, or minutes), rhr, hrv, weight, weightUnit?, fat, vo2 }
//   Health Auto Export: { data: { metrics: [{ name, units, data: [{ date, qty | asleep | totalSleep… }] }], workouts: [...] } }

import { h, fill, navBar, toast, push } from './ui.js';
import { state, commit, ymd, LB_PER_KG, bodyUnit } from './store.js';
import { client, account } from './cloud.js';
import { CONFIG } from './config.js';
import { saveHealth } from './health.js';

const num = (v) => { if (v == null) return null; const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, '').replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : null; };
// A day's totals keep the calendar date they were sent with (no time-zone shifting)
const dayOf = (s) => { if (!s) return null; if (/^\d{4}-\d\d-\d\d/.test(String(s))) return String(s).slice(0, 10); const t = Date.parse(String(s)); return Number.isFinite(t) ? ymd(t) : null; };
const toKg = (v, u) => (/lb/i.test(u || '') ? v / LB_PER_KG : v);

/** One payload → { days, weights, fats, workouts } (what saveHealth takes). */
export function parsePayload(p, receivedAt = Date.now()) {
  const out = { days: {}, weights: [], fats: [], workouts: [] };
  const day = (k) => (out.days[k] ??= {});
  if (p?.data?.metrics || p?.data?.workouts) {   // Health Auto Export
    for (const m of p.data.metrics || []) {
      const name = String(m.name || '').toLowerCase();
      for (const d of m.data || []) {
        const k = dayOf(d.date) || ymd(receivedAt);
        const q = num(d.qty ?? d.Avg ?? d.avg);
        if (name === 'step_count' && q != null) day(k).steps = Math.round((day(k).steps || 0) + q);
        else if (name === 'active_energy' && q != null) day(k).active = Math.round((day(k).active || 0) + (/kj/i.test(m.units) ? q * 0.239 : q));
        else if (name === 'resting_heart_rate' && q != null) day(k).rhr = Math.round(q);
        else if (name === 'heart_rate_variability' && q != null) day(k).hrv = Math.round(q);
        else if (name === 'vo2_max' && q != null) day(k).vo2 = Math.round(q * 10) / 10;
        else if (name === 'sleep_analysis') {
          const hrs = num(d.asleep ?? d.totalSleep ?? d.qty);
          if (hrs) { day(k).sleep = Math.round(hrs * 10) / 10; if (num(d.deep)) day(k).deep = Math.round(num(d.deep) * 10) / 10; if (num(d.rem)) day(k).rem = Math.round(num(d.rem) * 10) / 10; }
        } else if ((name === 'weight_body_mass' || name === 'body_mass') && q) out.weights.push({ ts: Date.parse(String(d.date).replace(' ', 'T').replace(/ ([+-]\d\d)(\d\d)$/, '$1:$2')) || receivedAt, kg: toKg(q, m.units) });
        else if (name === 'body_fat_percentage' && q) out.fats.push({ ts: Date.parse(String(d.date).replace(' ', 'T').replace(/ ([+-]\d\d)(\d\d)$/, '$1:$2')) || receivedAt, fat: q <= 1 ? q * 100 : q });
      }
    }
    for (const w of p.data.workouts || []) {
      const start = Date.parse(String(w.start || '').replace(' ', 'T').replace(/ ([+-]\d\d)(\d\d)$/, '$1:$2'));
      const dur = num(w.duration) || 0;
      if (!start || !dur) continue;
      const dist = w.distance ? num(w.distance.qty ?? w.distance) * (/mi/i.test(w.distance.units || '') ? 1609.344 : /^m$/i.test(w.distance.units || '') ? 1 : 1000) : null;
      const e = w.activeEnergyBurned ?? w.activeEnergy;
      out.workouts.push({ name: String(w.name || 'Workout'), start, dur: dur * 1000, dist, kcal: e ? num(e.qty ?? e) * (/kj/i.test(e.units || '') ? 0.239 : 1) : null,
        hrAvg: num(w.avgHeartRate?.qty ?? w.heartRate?.avg?.qty) || undefined, hrMax: num(w.maxHeartRate?.qty ?? w.heartRate?.max?.qty) || undefined });
    }
    return out;
  }
  // The Carver Shortcut: one day of numbers
  const k = dayOf(p.date) || ymd(receivedAt);
  const d = day(k);
  // Each field can be one number, or the raw list of samples (a JSON array, or text with one per line):
  // lists are added up (steps, energy, sleep) or averaged (heart rate, HRV), so Calculate Statistics is optional.
  const many = (v) => {
    if (v == null) return [];
    if (Array.isArray(v)) return v.map((x) => num(typeof x === 'object' && x ? x.value ?? x.quantity ?? x.qty : x)).filter((x) => x != null);
    const s = String(v);
    return /[\n;]/.test(s) || (s.match(/\d[\d,]*(\.\d+)?/g) || []).length > 1 && /\n|, /.test(s)
      ? s.split(/[\n;]+/).map(num).filter((x) => x != null) : [num(v)].filter((x) => x != null);
  };
  const sum = (v) => { const a = many(v); return a.length ? a.reduce((x, y) => x + y, 0) : null; };
  const mean = (v) => { const a = many(v); return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; };
  const steps = sum(p.steps), active = sum(p.active), sleep = sum(p.sleep), rhr = mean(p.rhr), hrv = mean(p.hrv), vo2 = mean(p.vo2);
  if (steps != null) d.steps = Math.round(steps);
  if (active != null) d.active = Math.round(active);
  if (sleep) d.sleep = Math.round((sleep > 1440 ? sleep / 3600 : sleep > 24 ? sleep / 60 : sleep) * 10) / 10;   // seconds, minutes or hours
  if (rhr) d.rhr = Math.round(rhr);
  if (hrv) d.hrv = Math.round(hrv);
  if (vo2) d.vo2 = Math.round(vo2 * 10) / 10;
  if (!Object.keys(d).length) delete out.days[k];
  const wt = many(p.weight)[0] ?? null;
  if (wt) out.weights.push({ ts: receivedAt, kg: toKg(wt, p.weightUnit || bodyUnit()) });
  const fat = num(p.fat);
  if (fat) out.fats.push({ ts: receivedAt, fat: fat <= 1 ? fat * 100 : fat });
  return out;
}

let pulling = false, lastPull = 0;
/** Collect what the Shortcut sent, merge it in, and clear the inbox. */
export async function pullHealth({ force = false } = {}) {
  if (!account() || pulling || (!force && Date.now() - lastPull < 5 * 6e4)) return 0;
  pulling = true; lastPull = Date.now();
  try {
    const db = await client();
    const { data, error } = await db.from('carver_health_inbox').select('id, payload, created_at').order('id').limit(200);
    if (error || !data?.length) return 0;
    const all = { days: {}, weights: [], fats: [], workouts: [] };
    for (const r of data) {
      const got = parsePayload(r.payload, Date.parse(r.created_at));
      for (const [k, v] of Object.entries(got.days)) all.days[k] = { ...(all.days[k] || {}), ...v };
      all.weights.push(...got.weights); all.fats.push(...got.fats); all.workouts.push(...got.workouts);
    }
    // Merge with what each day already has (a day's sleep and steps can arrive separately)
    for (const [k, v] of Object.entries(all.days)) all.days[k] = { ...(state.health?.days?.[k] || {}), ...v };
    saveHealth(all);
    commit((s) => { s.health.auto = Date.now(); });
    await db.from('carver_health_inbox').delete().in('id', data.map((r) => r.id));
    return data.length;
  } catch { return 0; } finally { pulling = false; }
}

// ---------- Your sync key ----------

const KEY_CACHE = 'carver.healthKey';
async function getKey(make = false) {
  const db = await client();
  const { data } = await db.from('carver_health_keys').select('key').eq('user_id', account().id).limit(1);
  if (data?.[0]?.key && !make) return data[0].key;
  if (!make) return null;
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const key = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await db.from('carver_health_keys').delete().eq('user_id', account().id);
  const { error } = await db.from('carver_health_keys').insert({ key });
  if (error) throw error;
  try { localStorage.setItem(KEY_CACHE, key); } catch { /* fine */ }
  return key;
}
export const syncUrl = (key) => `${CONFIG.SUPABASE_URL}/functions/v1/carver-push?key=${key}`;

async function copy(text, what) {
  try { await navigator.clipboard.writeText(text); toast(`${what} copied`); } catch { toast('Couldn’t copy. Press and hold to copy instead.'); }
}

/** Settings → Apple Health sync: your address, and how to set up the Shortcut. */
export function healthSyncScreen() {
  const el = h('div.page');
  const body = h('div.scroll-body');
  let key = null, busy = true, err = null;
  async function load(make = false) {
    busy = true; draw();
    try { key = await getKey(make); err = null; } catch (e) { err = /relation|does not exist|schema/i.test(e?.message || '') ? 'server' : 'offline'; }
    busy = false; draw();
  }
  const step = (n, ...text) => h('li', h('b', `${n}. `), ...text);
  function draw() {
    const url = key ? syncUrl(key) : '';
    fill(body,
      navBar({ title: 'Apple Health sync', backLabel: 'Back' }),
      h('p.coach-intro', 'Web apps can’t read Health, but the Shortcuts app can. Set up a daily automation once and your steps, sleep, heart data and weight arrive on their own.'),
      !account() ? h('div.feed-empty.card', 'Sign in first (Settings), so the data has an account to go to.')
        : busy ? h('div.feed-empty.card', 'Loading…')
          : err === 'server' ? h('div.feed-empty.card', 'This needs a quick server update: run supabase/health.sql, then redeploy carver-push (see the README).')
            : err ? h('div.feed-empty.card', 'Couldn’t reach the server. Are you online?')
              : !key ? h('button.btn.gold.wide', { onclick: () => load(true) }, 'Make my sync address')
                : [
                  h('label.form-label', 'Your sync address'),
                  h('div.sync-url', url),
                  h('div.btn-pair', h('button.btn.gold', { onclick: () => copy(url, 'Address') }, 'Copy address'), h('button.btn.dark', { onclick: async () => { const n = await pullHealth({ force: true }); toast(n ? `Synced ${n} update${n === 1 ? '' : 's'}` : 'Nothing new yet'); } }, 'Check now')),
                  h('p.fine', 'Private to you: anyone with this address can add data to your Carver, so don’t share it. ', h('button.link.small-link', { onclick: async () => { const { confirmBox } = await import('./ui.js'); if (await confirmBox('Make a new address?', 'The old one stops working. Update your Shortcut with the new one.', { ok: 'Make new' })) load(true); } }, 'Make a new one')),
                  state.health?.auto ? h('p.fine', `Last synced ${new Date(state.health.auto).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.`) : null,

                  h('div.section-head', h('h2.section-title', 'Set up the Shortcut (5 minutes, once)')),
                  h('ol.sync-steps',
                    step(1, 'Open ', h('b', 'Shortcuts'), ' → ', h('b', 'Automation'), ' → ', h('b', '+'), ' → ', h('b', 'Time of Day'), '. Pick ', h('b', '11:55 PM'), ', ', h('b', 'Daily'), ', and ', h('b', 'Run Immediately'), '. Then ', h('b', 'New Blank Automation'), '.'),
                    step(2, 'Add ', h('b', 'Find Health Samples'), ': Type ', h('b', 'Steps'), ', Start Date ', h('b', 'is today'), '. (Optional: add ', h('b', 'Calculate Statistics'), ' → Sum. Carver adds them up either way.)'),
                    step(3, 'Add three more ', h('b', 'Find Health Samples'), ' the same way: ', h('b', 'Active Energy'), ', ', h('b', 'Resting Heart Rate'), ' and ', h('b', 'Heart Rate Variability'), '.'),
                    step(4, 'Sleep is fiddly in Shortcuts, so it’s optional: ', h('b', 'Find Health Samples'), ', Type ', h('b', 'Sleep Analysis'), ', End Date ', h('b', 'is today'), ', then ', h('b', 'Get Details of Health Samples'), ' → ', h('b', 'Duration'), '. (Health Auto Export below handles sleep for you.)'),
                    step(5, 'Optional, weight: ', h('b', 'Find Health Samples'), ', Type ', h('b', 'Weight'), ', Start Date ', h('b', 'is today'), ', Sort by ', h('b', 'Start Date'), ', Latest First, Limit 1.'),
                    step(6, 'Add ', h('b', 'Get Contents of URL'), '. Paste your address. Tap ', h('b', 'Show More'), ': Method ', h('b', 'POST'), ', Request Body ', h('b', 'JSON'), '. Add ', h('b', 'Text'), ' fields named ', h('b', 'steps, active, rhr, hrv, sleep, weight'), ' and set each to the matching Health Samples (tap the field, then pick the variable).'),
                    step(7, 'Tap ', h('b', 'Done'), '. To test, run it once by hand, then tap ', h('b', 'Check now'), ' here.')),
                  h('p.fine', 'Leave out anything you don’t track. Can’t find Calculate Statistics? Skip it: Carver adds up steps and energy and averages heart rate itself. Sleep can be in hours, minutes or seconds. Weight uses your weight unit in Carver unless you add a text field weightUnit set to kg or lb.'),

                  h('div.section-head', h('h2.section-title', 'Or use Health Auto Export')),
                  h('p.fine', 'The Health Auto Export app (App Store) can send automatically with no Shortcut: add a REST API automation, paste your address as the URL, choose JSON, aggregate by day, and pick Steps, Active Energy, Sleep, Resting Heart Rate, HRV, Weight, Body Fat and Workouts.'),
                ],
      h('div.bottom-space'));
  }
  draw();
  if (account()) load(); else { busy = false; draw(); }
  el.append(body);
  return { el };
}

export const openHealthSync = () => push(healthSyncScreen);
