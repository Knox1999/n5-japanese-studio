const VERSION='v57';
const CORE_CACHE=`nihongo-vibes-${VERSION}-core`;
const RUNTIME_CACHE=`nihongo-vibes-${VERSION}-runtime`;
const AUDIO_CACHE=`nihongo-vibes-${VERSION}-audio`;
const CORE=['./','./?view=dashboard','./data/meta.json?v=57','./manifest.webmanifest'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CORE_CACHE).then(cache=>cache.addAll(CORE)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(
    keys.filter(k=>(k.startsWith('n5-')||k.startsWith('nihongo-vibes-'))&&![
      CORE_CACHE,RUNTIME_CACHE,AUDIO_CACHE
    ].includes(k)).map(k=>caches.delete(k))
  )).then(()=>self.clients.claim()));
});
async function networkFirst(request,cacheName){
  const cache=await caches.open(cacheName);
  try{const response=await fetch(request);if(response&&response.ok)cache.put(request,response.clone());return response}
  catch{return (await cache.match(request))||(await caches.match('./'))}
}
async function staleWhileRevalidate(request,cacheName){
  const cache=await caches.open(cacheName);const cached=await cache.match(request);
  const fresh=fetch(request).then(response=>{if(response&&response.ok)cache.put(request,response.clone());return response}).catch(()=>cached);
  return cached||fresh;
}
async function cacheFirst(request,cacheName){
  const cache=await caches.open(cacheName);const cached=await cache.match(request);if(cached)return cached;
  const response=await fetch(request);if(response&&response.ok)cache.put(request,response.clone());return response;
}
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);if(url.origin!==location.origin)return;
  if(event.request.mode==='navigate'){event.respondWith(networkFirst(event.request,RUNTIME_CACHE));return}
  if(url.pathname.endsWith('.json')){event.respondWith(networkFirst(event.request,RUNTIME_CACHE));return}
  if(url.pathname.endsWith('.mp3')){event.respondWith(cacheFirst(event.request,AUDIO_CACHE));return}
  if(/\.(?:js|css|svg|png|webp|avif|woff2?)$/i.test(url.pathname))event.respondWith(staleWhileRevalidate(event.request,RUNTIME_CACHE));
});
