// Phone notifications (Web Push) for group posts: workouts, daily goals done or
// missed, and the Monday summary. On iPhone this needs iOS 16.4+ and Carver
// added to the Home Screen. The server side is supabase/functions/carver-push.

import { h, fill, toast } from './ui.js';
import { CONFIG } from './config.js';
import { client, account } from './cloud.js';

const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const iOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** 'on' | 'off' | 'denied' | 'install' (iPhone: add to Home Screen first) | 'unsupported' */
export async function pushState() {
  if (!CONFIG.VAPID_PUBLIC_KEY) return 'unsupported';
  if (iOS() && !standalone()) return 'install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

const keyBytes = (b64) => Uint8Array.from(atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));

async function save(sub) {
  const j = sub.toJSON();
  const db = await client();
  const { error } = await db.from('carver_push').upsert({ endpoint: j.endpoint, user_id: account().id, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: 'endpoint' });
  if (error) throw error;
}

/** Ask for permission (must come from a tap) and register this phone. */
export async function enablePush() {
  if (!account()) throw new Error('Sign in first');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error(perm === 'denied' ? 'Notifications are blocked. Turn them on in Settings → Notifications → Carver.' : 'Notifications weren’t turned on.');
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(CONFIG.VAPID_PUBLIC_KEY) });
  await save(sub);
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  try { const db = await client(); await db.from('carver_push').delete().eq('endpoint', sub.endpoint); } catch { /* offline: the server drops dead ones */ }
  await sub.unsubscribe();
}

/** Ask the server to send this phone a test notification. */
export async function testPush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) throw new Error('Turn notifications on first');
  const db = await client();
  const { error } = await db.functions.invoke('carver-push', { body: { test: sub.endpoint } });
  if (error) throw new Error('The notification server isn’t set up yet (see README: Notifications).');
}

/** After signing in (or on a new account), make sure the server knows this phone. */
export async function refreshPush() {
  try {
    if (!account() || (await pushState()) !== 'on') return;
    const sub = await (await navigator.serviceWorker.getRegistration()).pushManager.getSubscription();
    await save(sub);
  } catch { /* try next time */ }
}

/** The Notifications row for the Groups screen and Settings. */
export function pushRow() {
  if (!account() || !CONFIG.VAPID_PUBLIC_KEY) return null;
  const box = h('div.push-row');
  const draw = async () => {
    const st = await pushState().catch(() => 'unsupported');
    const msg = {
      on: 'Notifications are on for this phone. You hear when your groups train, finish or miss a daily goal, and their Monday summary.',
      off: 'Get a notification when someone in your groups trains, finishes or misses a daily goal, and on Monday mornings.',
      denied: 'Notifications are blocked for Carver. Turn them on in your phone’s Settings → Notifications → Carver.',
      install: 'To get notifications on iPhone, add Carver to your Home Screen (Share → Add to Home Screen) and open it from there.',
      unsupported: 'This browser can’t show notifications.',
    }[st];
    fill(box,
      h('div.push-text', h('b', '🔔 Notifications'), h('span', msg)),
      st === 'off' ? h('button.btn.gold.small', { onclick: async () => { try { await enablePush(); toast('Notifications on'); } catch (e) { toast(e.message); } draw(); } }, 'Turn on') : null,
      st === 'on' ? h('div.btn-pair',
        h('button.btn.dark.small', { onclick: async () => { try { await testPush(); toast('Sent. It should arrive in a few seconds.'); } catch (e) { toast(e.message); } } }, 'Send a test'),
        h('button.btn.dark.small', { onclick: async () => { await disablePush(); toast('Notifications off'); draw(); } }, 'Turn off')) : null,
    );
  };
  draw();
  return box;
}
