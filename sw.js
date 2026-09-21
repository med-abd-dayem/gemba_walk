/* Gemba Walk — Service Worker (mode hors ligne) — v2 modulaire */
const CACHE = 'gemba-v10';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/vendor/firebase-app-compat.js',
  './js/vendor/firebase-auth-compat.js',
  './js/vendor/firebase-firestore-compat.js',
  './js/00-firebase-config.js',
  './js/00b-screen-login.js',
  './js/01-utils.js',
  './js/02-store.js',
  './js/03-calc.js',
  './js/04-core.js',
  './js/05-screen-home.js',
  './js/06-screen-visit.js',
  './js/07-screen-history.js',
  './js/08-reports.js',
  './js/09-screen-actions.js',
  './js/10-screen-settings.js',
  './js/11-app.js',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetched = fetch(e.request).then(res => {
        if (res && res.status === 200 && e.request.url.startsWith(self.location.origin)) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
