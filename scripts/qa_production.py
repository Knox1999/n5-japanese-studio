#!/usr/bin/env python3
from pathlib import Path
import json,re,sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]

def check(ok,msg):
    checks.append((bool(ok),msg))
    print(("PASS " if ok else "FAIL ")+msg)

post="--postbuild" in sys.argv

klc=json.loads((ROOT/"source/data/klc-tree.json").read_text(encoding="utf-8"))
grammar=json.loads((ROOT/"source/data/grammar-visual.json").read_text(encoding="utf-8"))

check(len(klc.get("nodes",[]))==2300,"2300 KLC nodes")
check(len(klc.get("edges",[]))==4034,"4034 KLC edges")

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
ui60=(ROOT/"styles/v60-ultimate.scss").read_text(encoding="utf-8")

check('data-kana-input="Spelling answer"' in spell,"Spelling wired to Kana Pad")
check("<KanaPad/>" in app,"Global Kana Pad mounted")
check("ひらがな" in kana and "カタカナ" in kana,"Hiragana/Katakana modes")
check("Recursive KLC Construction" in kanji and "RecursiveNode" in kanji,"Recursive KLC tree UI")

check('Link href="/?view=dashboard"' in notfound,"404 uses basePath-aware Next Link")
check("Global Due Queue" in srs and "startGlobal" in srs,"Global SRS due queue present")
check("dueByLesson" in srs,"Lesson-by-lesson due map present")
check("meta={meta}" in app,"StudioApp passes metadata to SRS")

check("APP_SHELL" in sw,"PWA app-shell source present")
check((ROOT/"scripts/build_sw.py").exists(),"Post-build service-worker generator present")
check("python scripts/build_sw.py out" in workflow,"Deployment generates service worker")
check(manifest.get("background_color")=="#031326" and manifest.get("theme_color")=="#031326","PWA navy palette retained")

check("maxAttempts=3" in data and "AbortController" in data,"Data retry + timeout")
check("Search index unavailable" in shell and "Retry search" in shell,"Search retry/error state")
check("nv:resource-error" in audio,"Audio final error notice")
check("nv:resource-error" in app and "Retry" in app,"Global resource error UI")

check("v58-design-system.scss" in layout,"V58 compatibility design system retained")
check("--nv-bg:#031326" in ui58 and "--nv-touch:44px" in ui58,"44px canonical base tokens")
check("@media(max-width:760px)" in ui58 and "min-height:var(--nv-touch)" in ui58,"Mobile touch target baseline")

compact_dashboard=re.sub(r"\s+","",dashboard)
check("TODAY&apos;SSTUDY" in compact_dashboard or "TODAY'SSTUDY" in compact_dashboard,"Today's Study present")
check(bool(re.search(r"currentPct\s*>=\s*80\s*&&\s*currentDue\s*===\s*0",dashboard)),"Lesson completion rule encoded")
check("80% vocabulary mastered" in dashboard and "0 due SRS card" in dashboard,"Completion rule visible")

check("বাংলায় বুঝুন" in dashboard and "জাপানিজে আত্মবিশ্বাসী হন" in dashboard,"Approved Bangla-first hero")
check("MOBILE_PRIMARY" in shell and shell.count("'dashboard','vocabulary','srs','listening'")==1,"4 primary mobile destinations + More")
check("future-subnav" not in shell,"Duplicate Quick Access subnav removed")
check("শব্দভান্ডার" in shell and "স্মার্ট রিভিউ" in shell,"Bangla-first navigation")

check((ROOT/"scripts/repo_hygiene.py").exists(),"Safe repo hygiene script present")
check("python scripts/repo_hygiene.py" in workflow,"Repo hygiene before build")
check(not (ROOT/"index.html").exists(),"Legacy root index removed in build workspace")
check(not (ROOT/"sw.js").exists(),"Legacy root sw removed in build workspace")
check(not (ROOT/"manifest.webmanifest").exists(),"Legacy root manifest removed in build workspace")
check((ROOT/"docs/legacy-root").exists(),"Legacy root archive present")

study=(ROOT/"components/StudyViews.tsx").read_text(encoding="utf-8")
check("dynamic(()=>import('./GrammarStudio')" in study,"Visual Grammar lazy-loaded")
check("playDialogueTrack" in study,"Full multi-voice dialogue binding")
check("RATES=[.75,.9,1]" in study.replace(" ",""),"Conversation 0.75/0.9/1 speed controls")

check("SpeechSynthesisUtterance" in audio and "speechSynthesis" in audio,"Browser speech synthesis runtime")
check("voiceschanged" in audio and "getVoices()" in audio,"Japanese device voice discovery")
check("ja-JP" in audio and "web-speech-api-ja-JP" in audio,"Japanese browser voice selected")
check("billed_api:false" in audio and "AZURE_SPEECH" not in workflow,"No paid speech API or credentials")
check("splitForSpeech" in audio,"Long Japanese text chunking")
check("rolePitch" in audio and "pickVoice" in audio,"Distinct dialogue role voices")
check("playDialogueTrack" in audio,"Full dialogue track helper present")

mock=(ROOT/"components/MockTest.tsx").read_text(encoding="utf-8")
check("total:10" in mock and "total:25" in mock and "total:52" in mock,"Quick 10 / Mini 25 / Full 52 modes")
check("vocabulary:20" in mock and "'grammar-reading':20" in mock and "listening:12" in mock,"Full 20/20/12 blueprint")
check("minutes:{vocabulary:20,'grammar-reading':40,listening:30}" in mock.replace(" ",""),"Full 20/40/30 timing blueprint")
check("onReviewMistakes" in mock,"Vocabulary mistakes can return to Recall")

check("/* FINAL_PRODUCTION_NEO_TORII */" in ui60,"Final Neo Torii style block applied")
check("#050D18" in ui60 and "#EF3F3A" in ui60 and "#F7F9FC" in ui60,"Final navy/red/white palette encoded")

for logo in [
    "nihongo-vibes-logo.webp",
    "nihongo-vibes-logo-192.png",
    "nihongo-vibes-logo-512.png",
]:
    p=ROOT/"public/assets"/logo
    check(p.exists() and p.stat().st_size>1000,f"Official logo asset {logo}")

lessons=grammar.get("lessons") or {}
rules=[r for L in lessons.values() for r in (L.get("rules") or [])]
examples=[e for r in rules for e in (r.get("examples") or [])]
check(len(lessons)==25,"25 visual grammar lessons")
check(len(rules)>=100 and len(examples)>=500,"Grammar rule/example scale retained")
check(all(len(r.get("examples") or [])==5 for r in rules),"Exactly 5 examples per visual grammar rule")
check("G-FG3JCWGSPR" in layout,"GA4 ID preserved")
check("playbackGeneration" in audio and "exclusive_audio:true" in audio,"One-audio-at-a-time mutex")

if post:
    out=ROOT/"out"
    check((out/"index.html").exists(),"Static export index exists")
    check((out/".nojekyll").exists(),"Pages .nojekyll exists")
    check((out/"manifest.webmanifest").exists(),"PWA manifest exported")
    check((out/"data/grammar-visual.json").exists(),"Visual grammar data exported")
    check(not (out/"audio/manifest.json").exists(),"No generated-audio manifest required")
    out_sw=(out/"sw.js").read_text(encoding="utf-8") if (out/"sw.js").exists() else ""
    check("const APP_SHELL=" in out_sw,"Generated service worker app shell")
    check("./_next/static/" in out_sw,"Next chunks in service worker")

failed=[msg for ok,msg in checks if not ok]
if failed:
    raise SystemExit("Production QA failed: "+", ".join(failed))
print(f"PRODUCTION QA COMPLETE: {len(checks)}/{len(checks)} PASS")
