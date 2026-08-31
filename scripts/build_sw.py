#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / (sys.argv[1] if len(sys.argv) > 1 else "out")
if not OUT.exists():
    raise SystemExit(f"Static export directory not found: {OUT}")


def rel(path: Path) -> str:
    return "./" + path.relative_to(OUT).as_posix()


package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
release = os.getenv("GITHUB_SHA", package.get("version", "dev"))[:12]
data_version = str(package.get("version", "60")).split(".")[0]

shell = [
    "./",
    "./?view=dashboard",
    "./manifest.webmanifest",
    f"./data/meta.json?v={data_version}",
    f"./data/lessons/01.json?v={data_version}",
]
static_dir = OUT / "_next" / "static"
if static_dir.exists():
    for path in sorted(static_dir.rglob("*")):
        if path.is_file() and path.suffix.lower() in {".js", ".css", ".woff", ".woff2"}:
            shell.append(rel(path))
for name in [
    "assets/nihongo-vibes-logo-96.png",
    "assets/nihongo-vibes-logo-192.png",
    "assets/nihongo-vibes-logo-512.png",
    "assets/nihongo-vibes-logo-maskable-512.png",
]:
    path = OUT / name
    if path.exists():
        shell.append(rel(path))

shell = list(dict.fromkeys(shell))
app_shell = json.dumps(shell, ensure_ascii=False, separators=(",", ":"))

sw = f"""const VERSION='build-{release}';
const CORE_CACHE=`nihongo-vibes-${{VERSION}}-core`;
const RUNTIME_CACHE=`nihongo-vibes-${{VERSION}}-runtime`;
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
    keys.filter(key=>(key.startsWith('n5-')||key.startsWith('nihongo-vibes-'))&&![CORE_CACHE,RUNTIME_CACHE].includes(key))
      .map(key=>caches.delete(key))
  )).then(()=>self.clients.claim()));
}});

async function navigationNetworkFirst(request){{
  const cache=await caches.open(RUNTIME_CACHE);
  try{{
    const response=await fetch(request);
    if(response&&response.ok)cache.put(request,response.clone());
    return response;
  }}catch{{
    return (await cache.match(request))||(await caches.match(request))||(await caches.match('./'))||new Response('Offline',{{status:503,headers:{{'Content-Type':'text/plain; charset=utf-8'}}}});
  }}
}}

async function dataNetworkFirst(request){{
  const cache=await caches.open(RUNTIME_CACHE);
  try{{
    const response=await fetch(request);
    if(response&&response.ok){{cache.put(request,response.clone());return response}}
    const cached=await cache.match(request);
    return cached||response;
  }}catch{{
    const cached=(await cache.match(request))||(await caches.match(request));
    return cached||new Response(JSON.stringify({{error:'offline',resource:new URL(request.url).pathname}}),{{status:503,headers:{{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}}}});
  }}
}}

async function staleWhileRevalidate(request){{
  const cache=await caches.open(RUNTIME_CACHE);
  const cached=await cache.match(request);
  const fresh=fetch(request).then(response=>{{
    if(response&&response.ok)cache.put(request,response.clone());
    return response;
  }}).catch(()=>cached);
  return cached||fresh||new Response('',{{status:504}});
}}

self.addEventListener('fetch',event=>{{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  if(event.request.mode==='navigate'){{
    event.respondWith(navigationNetworkFirst(event.request));
    return;
  }}
  if(url.pathname.endsWith('.json')){{
    event.respondWith(dataNetworkFirst(event.request));
    return;
  }}
  if(/\\.(?:js|css|svg|png|webp|avif|mp3|woff2?)$/i.test(url.pathname)){{
    event.respondWith(staleWhileRevalidate(event.request));
  }}
}});
"""
(OUT / "sw.js").write_text(sw, encoding="utf-8")
(ROOT / "_build").mkdir(exist_ok=True)
(ROOT / "_build/app_shell.json").write_text(
    json.dumps(shell, ensure_ascii=False, indent=2),
    encoding="utf-8",
)
print(f"Generated service worker {release} with {len(shell)} app-shell resources")
