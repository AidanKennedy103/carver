// Service worker: opens the installed app quickly and works offline (gyms often
// have bad signal). Network first so updates arrive straight away; the saved copy
// is used only when the network fails. Bump CACHE when you change the file list.

const CACHE = 'carver-v89';
const APP_FILES = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/app.js', 'js/ui.js', 'js/tabs.js', 'js/home.js', 'js/charts.js', 'js/onerm.js', 'js/foods.js', 'js/foods-more.js', 'js/foods-extra.js', 'js/foods-usda.js', 'js/foods-usda-fill.js', 'js/nutrition.js', 'js/goals.js', 'js/barcode.js', 'js/photos.js', 'js/body.js', 'js/fitness.js', 'js/progress.js', 'js/monthly.js', 'js/trends.js', 'js/store.js', 'js/exercises.js', 'js/picker.js', 'js/block.js', 'js/session.js', 'js/sound.js', 'js/workout.js', 'js/settings.js', 'js/cloud.js', 'js/account.js', 'js/groups.js', 'js/volume.js', 'js/cronometer.js', 'js/imports.js', 'js/program531.js', 'js/food-util.js', 'js/quickadd.js', 'js/foodpicker.js', 'js/recipes.js', 'js/copyfood.js', 'js/social.js', 'js/coach.js', 'js/recovery.js', 'js/bodycomp.js', 'js/nutrition-report.js', 'js/food-icons.js', 'js/about.js', 'js/config.js', 'js/habits.js', 'js/push.js',
  'icons/icon.svg?v=3', 'icons/icon-180.png?v=3', 'icons/icon-192.png?v=3', 'icons/icon-512.png?v=3',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  // The barcode scanner library (iPhone has no built-in one): keep it so scanning works offline
  if (request.url.startsWith('https://unpkg.com/@zxing/library@')) {
    event.respondWith(caches.match(request).then((hit) => hit || fetch(request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); }
      return res;
    })));
    return;
  }
  if (!request.url.startsWith(self.location.origin)) return;
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); }
        return res;
      })
      .catch(() => caches.match(request).then((hit) => hit || Response.error())),
  );
});

// Phone notifications from your groups (sent by supabase/functions/carver-push)
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { body: event.data?.text() }; }
  event.waitUntil(self.registration.showNotification(d.title || 'Carver', {
    body: d.body || '',
    icon: 'icons/icon-192.png?v=3',
    badge: 'icons/icon-192.png?v=3',
    tag: d.tag,
    data: { url: d.url || './' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || './', self.location.href).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => c.url.startsWith(self.location.origin));
    if (open) { open.navigate?.(url).catch(() => {}); return open.focus(); }
    return self.clients.openWindow(url);
  }));
});
