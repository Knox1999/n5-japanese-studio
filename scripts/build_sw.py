#!/usr/bin/env python3
from __future__ import annotations
import json, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/(sys.argv[1] if len(sys.argv)>1 else "out")
if not OUT.exists():
    raise SystemExit(f"Static export directory not found: {OUT}")

def rel(p:Path)->str:
    return "./"+p.relative_to(OUT).as_posix()

shell=[
    "./",
    "./?view=dashboard",
    "./manifest.webmanifest",
    "./data/meta.json?v=58",
    "./data/lessons/01.json?v=58",
]
static_dir=OUT/"_next"/"static"
if static_dir.exists():
    for p in sorted(static_dir.rglob("*")):
        if p.is_file() and p.suffix.lower() in {".js",".css",".woff",".woff2"}:
            shell.append(rel(p))
for name in [
    "assets/nihongo-vibes-logo.webp",
    "assets/nihongo-vibes-logo-192.png",
    "assets/nihongo-vibes-logo-512.png",
]:
    p=OUT/name
    if p.exists(): shell.append(rel(p))

shell=list(dict.fromkeys(shell))
app_shell=json.dumps(shell,ensure_ascii=False,separators=(",",":"))

sw=f"""const VERSION='v58';
const CORE_CACHE=`nihongo-vibes-${{VERSION}}-core`;
const RUNTIME_CACHE=`nihongo-vibes-${{VERSION}}-runtime`;
const AUDIO_CACHE=`nihongo-vibes-${{VERSION}}-audio`;
const APP_SHELL={app_shell};

async function precache(){{
  const cache=await caches.open(CORE_CACHE);
  await Promise.allSettled(APP_SHELL.map(async url=>{{
    try{{await cache.add(new Request(url,{{cache:'reload'}}))}}catch{{}}
  }}));
}}

self.addEventListener('install',event=>{{
  event.waitUntil(precache());
  self.skipWaiting();
}});

self.addEventListener('activate',event=>{{
  event.waitUntil(caches.keys().then(keys=>Promise.all(
    keys.filter(k=>(k.startsWith('n5-')||k.startsWith('nihongo-vibes-'))&&![CORE_CACHE,RUNTIME_CACHE,AUDIO_CACHE].includes(k))
      .map(k=>caches.delete(k))
  )).then(()=>self.clients.claim()));
}});

async function networkFirst(request,cacheName){{
  const cache=await caches.open(cacheName);
  try{{
    const response=await fetch(request);
    if(response&&response.ok)cache.put(request,response.clone());
    return response;
  }}catch{{
    return (await cache.match(request))||(await caches.match(request))||(await caches.match('./'));
  }}
}}

async function staleWhileRevalidate(request,cacheName){{
  const cache=await caches.open(cacheName);
  const cached=await cache.match(request);
  const fresh=fetch(request).then(response=>{{
    if(response&&response.ok)cache.put(request,response.clone());
    return response;
  }}).catch(()=>cached);
  return cached||fresh;
}}

async function cacheFirst(request,cacheName){{
  const cache=await caches.open(cacheName);
  const cached=await cache.match(request);
  if(cached)return cached;
  const response=await fetch(request);
  if(response&&response.ok)cache.put(request,response.clone());
  return response;
}}

self.addEventListener('fetch',event=>{{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  if(event.request.mode==='navigate'){{
    event.respondWith(networkFirst(event.request,RUNTIME_CACHE));
    return;
  }}
  if(url.pathname.endsWith('.json')){{
    event.respondWith(networkFirst(event.request,RUNTIME_CACHE));
    return;
  }}
  if(url.pathname.endsWith('.mp3')){{
    event.respondWith(cacheFirst(event.request,AUDIO_CACHE));
    return;
  }}
  if(/\\.(?:js|css|svg|png|webp|avif|woff2?)$/i.test(url.pathname)){{
    event.respondWith(staleWhileRevalidate(event.request,RUNTIME_CACHE));
  }}
}});
"""
(OUT/"sw.js").write_text(sw,encoding="utf-8")
(ROOT/"_build").mkdir(exist_ok=True)
(ROOT/"_build"/"app_shell.json").write_text(json.dumps(shell,ensure_ascii=False,indent=2),encoding="utf-8")
print(f"Generated V58 service worker with {len(shell)} app-shell resources")
