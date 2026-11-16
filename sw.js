// Service worker: opens the installed app quickly and works offline (gyms often
// have bad signal). Network first so updates arrive straight away; the saved copy
// is used only when the network fails. Bump CACHE when you change the file list.

const CACHE = 'carver-v23';
const APP_FILES = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/app.js', 'js/ui.js', 'js/tabs.js', 'js/home.js', 'js/charts.js', 'js/onerm.js', 'js/foods.js', 'js/nutrition.js', 'js/goals.js', 'js/barcode.js', 'js/photos.js', 'js/body.js', 'js/fitness.js', 'js/progress.js', 'js/monthly.js', 'js/trends.js', 'js/store.js', 'js/exercises.js', 'js/picker.js', 'js/block.js', 'js/session.js', 'js/sound.js', 'js/workout.js', 'js/settings.js', 'js/cloud.js', 'js/account.js', 'js/groups.js', 'js/volume.js', 'js/cronometer.js', 'js/food-util.js', 'js/quickadd.js', 'js/foodpicker.js', 'js/recipes.js', 'js/nutrition-report.js', 'js/config.js',
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
