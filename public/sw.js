const CACHE='n5-studio-v42';
const CORE=['./','./data/meta.json','./manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);if(url.origin!==location.origin)return;
  if(e.request.mode==='navigate'||url.pathname.endsWith('.json')){
    e.respondWith(fetch(e.request).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r}).catch(()=>caches.match(e.request).then(x=>x||caches.match('./'))));return;
  }
  if(/\.(?:js|css|svg|png|webp|avif|mp3)$/.test(url.pathname)){
    e.respondWith(caches.match(e.request).then(hit=>{const fresh=fetch(e.request).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r}).catch(()=>hit);return hit||fresh}));
  }
});
