// StudyMate GH - Offline-First Service Worker
// v8: About Page Author & Co-Engineer Update
const CACHE_NAME = 'studymate-gh-v8';
const APP_VERSION = '1.2.1'; // bump this string on every release

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon.svg',
  './lottie.min.js',
  './man-repairing-motherboard.json',
  './notification.json',
  './successfully-done.json',
  './People working on Brain Research Insight.png',
  './achimota_admin.jpg'
];

// ── Install: cache assets but DO NOT skipWaiting yet ──────────────────────────
// The new SW stays in "waiting" state so we can notify the user first.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching core offline bundle v6');
      return cache.addAll(ASSETS_TO_CACHE);
    })
    // NOTE: no self.skipWaiting() here — user triggers it via the banner
  );
});

// ── Activate: clean up old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => {
      self.clients.claim();
      // Tell all open tabs that the new version is now live
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) =>
          client.postMessage({ type: 'SW_ACTIVATED', version: APP_VERSION })
        );
      });
    })
  );
});

// ── Fetch: Cache First, fallback to Network ───────────────────────────────────
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// ── Message: allow page to trigger skipWaiting ────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
