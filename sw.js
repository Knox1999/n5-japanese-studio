const CACHE = "n5-japanese-studio-v18";
const CORE = [
  "./",
  "./index.html",
  "./404.html",
  "./manifest.webmanifest",
  "./static/styles.css",
  "./offline/offline_data.js",
  "./offline/klc_tree_data.js",
  "./offline/klc_memory_bn.js",
  "./offline/offline_app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(()=>{});
        return response;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
