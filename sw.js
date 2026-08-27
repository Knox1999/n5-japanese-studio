const CACHE = 'n5-japanese-studio-v44';
const CORE = ['./', './manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const req = event.request;
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy)).catch(()=>{});
        return response;
      }).catch(() => caches.match(req).then(r => r || caches.match('./')))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy)).catch(()=>{});
      }
      return response;
    }))
  );
});
