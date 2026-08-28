#!/usr/bin/env python3
from pathlib import Path
import json, sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]
def check(ok,msg):
    checks.append((bool(ok),msg))
    print(("PASS " if ok else "FAIL ")+msg)

post="--postbuild" in sys.argv

# Core datasets
klc=json.loads((ROOT/"source/data/klc-tree.json").read_text(encoding="utf-8"))
grammar=json.loads((ROOT/"source/data/grammar-visual.json").read_text(encoding="utf-8"))
check(len(klc.get("nodes",[]))==2300,"2300 KLC nodes")
check(len(klc.get("edges",[]))==4034,"4034 KLC edges")

# Existing learning foundations
kana=(ROOT/"components/KanaPad.tsx").read_text(encoding="utf-8")
kanji=(ROOT/"components/KanjiExplorer.tsx").read_text(encoding="utf-8")
spell=(ROOT/"components/Spelling.tsx").read_text(encoding="utf-8")
app=(ROOT/"components/StudioApp.tsx").read_text(encoding="utf-8")
dashboard=(ROOT/"components/Dashboard.tsx").read_text(encoding="utf-8")
srs=(ROOT/"components/SRS.tsx").read_text(encoding="utf-8")
shell=(ROOT/"components/Shell.tsx").read_text(encoding="utf-8")
audio=(ROOT/"lib/audio.ts").read_text(encoding="utf-8")
data=(ROOT/"lib/data.ts").read_text(encoding="utf-8")
layout=(ROOT/"app/layout.tsx").read_text(encoding="utf-8")
notfound=(ROOT/"app/not-found.tsx").read_text(encoding="utf-8")
sw=(ROOT/"public/sw.js").read_text(encoding="utf-8")
manifest=json.loads((ROOT/"public/manifest.webmanifest").read_text(encoding="utf-8"))
package=json.loads((ROOT/"package.json").read_text(encoding="utf-8"))
workflow=(ROOT/".github/workflows/deploy-pages.yml").read_text(encoding="utf-8")
ui58=(ROOT/"styles/v58-design-system.scss").read_text(encoding="utf-8")

check('data-kana-input="Spelling answer"' in spell,"Spelling wired to Kana Pad")
check("<KanaPad/>" in app,"Global Kana Pad mounted")
check("ひらがな" in kana and "カタカナ" in kana,"Hiragana/Katakana modes")
check("Recursive KLC Construction" in kanji and "RecursiveNode" in kanji,"Recursive KLC tree UI")

# V58 1) 404 home link
check('Link href="/?view=dashboard"' in notfound,"404 uses basePath-aware Next Link to Studio Home")
check('href="./"' not in notfound,"Broken relative 404 home link removed")

# V58 2) Global SRS
check("Global Due Queue" in srs and "startGlobal" in srs,"Global SRS due queue present")
check("dueByLesson" in srs,"Lesson-by-lesson due map present")
check("meta={meta}" in app,"StudioApp passes course metadata to SRS")

# V58 3) PWA app shell
check("const VERSION='v58'" in sw,"V58 service-worker source")
check("APP_SHELL" in sw,"PWA app-shell list present")
check((ROOT/"scripts/build_sw.py").exists(),"Post-build service-worker generator present")
check("python scripts/build_sw.py out" in workflow,"Deployment generates static app shell after Next build")
check(manifest.get("background_color")=="#031326" and manifest.get("theme_color")=="#031326","PWA manifest uses logo navy palette")

# V58 4) Retry/error states
check("maxAttempts=3" in data and "AbortController" in data,"Data loader has timeout + 3-attempt retry")
check("Search index unavailable" in shell and "Retry search" in shell,"Search has explicit retry/error state")
check("staticRetry<1" in audio and "nv:resource-error" in audio,"Audio has retry + final error notice")
check("nv:resource-error" in app and "Retry" in app,"Global resource error/retry UI present")

# V58 5) Design system
check("v58-design-system.scss" in layout,"V58 canonical design system imported")
check(layout.rfind("v58-design-system.scss")>layout.rfind("v57-signature.scss"),"V58 design system loads after compatibility layers")
check(all(x in ui58 for x in ["--nv-bg:#031326","--nv-red:#ef3f38","--nv-text:#f7fbff","--nv-touch:44px"]),"Unified navy/red/white/touch tokens encoded")

# V58 6) Mobile usability
check("@media(max-width:760px)" in ui58 and "min-height:var(--nv-touch)" in ui58,"44px mobile touch target baseline")
check("font-size:16px!important" in ui58,"Mobile inputs prevent tiny text / iOS zoom")

# V58 7) Today's Study + completion
check("TODAY'S STUDY" in dashboard,"Today's Study panel present")
check("currentPct>=80&&currentDue===0" in dashboard,"Transparent lesson completion rule encoded")
check("LESSON COMPLETION RULE" in dashboard,"Completion rule visible to learner")

# V58 8) Legacy root cleanup
check((ROOT/"scripts/repo_hygiene.py").exists(),"Safe legacy-root hygiene script present")
check("python scripts/repo_hygiene.py" in workflow,"Repo hygiene runs before build")
check(not (ROOT/"index.html").exists(),"Legacy root index.html archived/removed in build workspace")
check(not (ROOT/"sw.js").exists(),"Legacy root sw.js archived/removed in build workspace")
check(not (ROOT/"manifest.webmanifest").exists(),"Legacy root manifest archived/removed in build workspace")
check((ROOT/"docs/legacy-root").exists(),"Legacy root archive directory exists")

# V58 9) Lazy loading
check("dynamic(()=>import('./KanjiExplorer')" in app and "dynamic(()=>import('./MockTest')" in app,"Heavy Kanji/Mock modules lazy-loaded")
check((ROOT/"components/AmbientGate.tsx").exists(),"Deferred Three.js AmbientGate present")
ambient=(ROOT/"components/AmbientGate.tsx").read_text(encoding="utf-8")
check("requestIdleCallback" in ambient and "max-width: 820px" in ambient,"Three.js deferred until desktop idle time")
study=(ROOT/"components/StudyViews.tsx").read_text(encoding="utf-8")
check("dynamic(()=>import('./GrammarStudio')" in study,"Visual Grammar chunk lazy-loaded")

# V58 10) Reproducible build
check(str(package.get("version"))=="58.0.0","Package version is 58.0.0")
check((ROOT/"package-lock.json").exists(),"package-lock.json exists after hygiene step")
check("npm ci --no-audit --no-fund" in workflow,"Deployment installs from lockfile with npm ci")
check("contents: write" in workflow and "git push" in workflow,"Workflow can persist generated lockfile + archive moves")

# Existing major functionality retained
lessons=grammar.get("lessons") or {}
rules=[r for L in lessons.values() for r in (L.get("rules") or [])]
examples=[e for r in rules for e in (r.get("examples") or [])]
check(len(lessons)==25,"25 visual grammar lessons retained")
check(len(rules)>=100 and len(examples)>=500,"Visual grammar rule/example scale retained")
check(all(len(r.get("examples") or [])==5 for r in rules),"Exactly 5 grammar examples per rule")
check("G-FG3JCWGSPR" in layout,"GA4 measurement ID preserved")
check("playbackGeneration" in audio and "exclusive_audio:true" in audio,"One-audio-at-a-time mutex retained")
mock=(ROOT/"components/MockTest.tsx").read_text(encoding="utf-8")
check("20 Vocabulary + 20 Grammar/Reading + 12 Listening" in mock,"JLPT-style 52-item practice blueprint retained")

if post:
    out=ROOT/"out"
    check((out/"index.html").exists(),"Next.js static export index exists")
    check((out/".nojekyll").exists(),"Pages .nojekyll exists")
    check((out/"manifest.webmanifest").exists(),"PWA manifest exported")
    check((out/"data/grammar-visual.json").exists(),"Visual grammar data exported")
    out_sw=(out/"sw.js").read_text(encoding="utf-8") if (out/"sw.js").exists() else ""
    check("const APP_SHELL=" in out_sw,"Generated production service worker contains app shell")
    check("./_next/static/" in out_sw,"Generated app shell includes Next JS/CSS chunks")

failed=[msg for ok,msg in checks if not ok]
if failed:
    raise SystemExit("Production QA failed: "+", ".join(failed))
print(f"PRODUCTION QA COMPLETE: {len(checks)}/{len(checks)} PASS")
