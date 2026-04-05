// ===== sw.js — Service Worker for offline caching =====
const CACHE = 'museum-v1';
const SHELL = ['./', './index.html', './css/styles.css', './js/api.js', './js/audio.js', './js/ui.js', './js/app.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const { request } = e;
  // Network-first for API calls, cache-first for static assets
  if (request.url.includes('google.com') || request.method !== 'GET') return;

  e.respondWith(
    caches.match(request).then(cached => {
      const fetched = fetch(request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
