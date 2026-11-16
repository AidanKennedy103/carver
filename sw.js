// Service worker: opens the installed app quickly and works offline (gyms often
// have bad signal). Network first so updates arrive straight away; the saved copy
// is used only when the network fails. Bump CACHE when you change the file list.

const CACHE = 'carver-v5';
const APP_FILES = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/app.js', 'js/ui.js', 'js/tabs.js', 'js/home.js', 'js/charts.js', 'js/onerm.js', 'js/foods.js', 'js/nutrition.js', 'js/goals.js', 'js/barcode.js', 'js/store.js', 'js/exercises.js', 'js/picker.js', 'js/block.js', 'js/session.js', 'js/sound.js', 'js/workout.js', 'js/settings.js',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
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
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); }
        return res;
      })
      .catch(() => caches.match(request).then((hit) => hit || Response.error())),
  );
});
