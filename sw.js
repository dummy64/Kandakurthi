const CACHE = 'museum-v28';
const SHELL = ['./', './index.html', './css/styles.css', './js/api.js', './js/audio.js', './js/ui.js', './js/app.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = request.url;

  // Skip: non-GET, non-http, google APIs, chrome extensions, and ALL media files
  if (request.method !== 'GET' ||
      !url.startsWith('http') ||
      url.includes('google.com') ||
      url.includes('googleapis.com') ||
      url.includes('chrome-extension') ||
      /\.(mp3|mp4|mpeg|ogg|wav|aac|webm|m4a)(\?|$)/i.test(url) ||
      request.headers.get('range')) {
    return;
  }

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
