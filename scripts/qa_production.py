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
daily=(ROOT/"components/DailyCoachPanel.tsx").read_text(encoding="utf-8")
journey=(ROOT/"components/LessonJourneyPanel.tsx").read_text(encoding="utf-8")
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
consent=(ROOT/"components/AnalyticsConsent.tsx").read_text(encoding="utf-8")
style_index=(ROOT/"styles/index.scss").read_text(encoding="utf-8")
tokens=(ROOT/"styles/tokens.scss").read_text(encoding="utf-8")
ui58=(ROOT/"styles/foundation/design-system.scss").read_text(encoding="utf-8")
ui60=(ROOT/"styles/foundation/platform.scss").read_text(encoding="utf-8")
tests=(ROOT/"tests/site.spec.ts").read_text(encoding="utf-8")

check('data-kana-input="Spelling answer"' in spell,"Spelling wired to Kana Pad")
check("<KanaPad/>" in app,"Global Kana Pad mounted")
check("ひらがな" in kana and "カタカナ" in kana,"Hiragana/Katakana modes")
check("Recursive KLC Construction" in kanji and "RecursiveNode" in kanji,"Recursive KLC tree UI")

check("NEXT_PUBLIC_BASE_PATH" in notfound and 'href={`${basePath}/?view=dashboard`}' in notfound,"404 uses basePath-aware Next Link")
check("Global Due Queue" in srs and "startGlobal" in srs,"Global SRS due queue present")
check("dueByLesson" in srs,"Lesson-by-lesson due map present")
check("meta={meta}" in app,"StudioApp passes metadata to SRS")

check("APP_SHELL" in sw,"PWA app-shell source present")
check((ROOT/"scripts/build_sw.py").exists(),"Post-build service-worker generator present")
check("python scripts/build_sw.py out" in workflow,"Deployment generates service worker")
check(manifest.get("background_color")=="#06172d" and manifest.get("theme_color")=="#06172d","PWA semantic navy palette retained")
check("dataNetworkFirst" in (ROOT/"scripts/build_sw.py").read_text(encoding="utf-8"),"JSON offline fallback cannot return HTML shell")

check("maxAttempts=3" in data and "AbortController" in data,"Data retry + timeout")
check("Search index unavailable" in shell and "Retry search" in shell,"Search retry/error state")
check('aria-labelledby="course-menu-title"' in shell and 'aria-labelledby="course-search-title"' in shell,"Drawer/search dialogs have accessible names")
check("data-overlay-autofocus" in shell and "previousFocus" in shell,"Overlay focus management present")
check("future-drawer-search" in shell,"Mobile drawer exposes global search")
check("aria-label={`${v.kanji||v.japanese} শব্দের উদাহরণ শুনুন`}" in (ROOT/"components/Vocabulary.tsx").read_text(encoding="utf-8"),"Vocabulary example audio has accessible name")
check("nv:resource-error" in audio,"Audio final error notice")
check("nv:resource-error" in app and "Retry" in app,"Global resource error UI")

check("@/styles/index.scss" in layout,"Single semantic production stylesheet entrypoint")
check(not re.search(r"v\d+[\w-]*\.scss",layout),"Versioned stylesheet patches removed from production layout")
check("./foundation/design-system" in style_index and "./modules/listening" in style_index and "./system/accessibility" in style_index,"Semantic style architecture loaded")
check("--nv-bg:#06172d" in tokens and "--nv-touch:44px" in tokens,"Canonical semantic design tokens")
check("@media(max-width:760px)" in ui58 and "min-height:var(--nv-touch)" in ui58,"Mobile touch target baseline retained")
check((ROOT/"styles/system/mobile.scss").exists() and "./system/mobile" in style_index,"True mobile app layout loaded")
check((ROOT/"styles/system/phone.scss").exists() and "./system/phone" in style_index,"Universal phone compatibility layer loaded")

check("Daily Study Coach" in daily and "এখন কী পড়বেন?" in daily and "Next best action" in daily,"Daily Study Coach present")
check("Guided Lesson Journey" in journey and "Lesson progress" in journey,"Guided lesson journey present")
check("readStudyActivity" in dashboard and "coach" in dashboard and "journey" in dashboard,"Reactive dashboard uses connected guidance")
check("complete:pct>=80" in dashboard.replace(" ","") and "এই lesson-এর vocabulary" in dashboard,"Vocabulary mastery completion semantics retained")
check("আরও explore করুন" in dashboard and "Learning tools" in dashboard,"Secondary tools progressively disclosed")
check("buildDailyRecommendations" in app and "buildLessonJourney" in app and "getRepairQueue" in app,"Shared learning state drives dashboard guidance")

check("MOBILE_PRIMARY" in shell and shell.count("'dashboard','vocabulary','srs','listening'")==1,"4 primary mobile destinations + More")
check("future-subnav" not in shell,"Duplicate Quick Access subnav removed")
check("শব্দভান্ডার" in shell and "স্মার্ট রিভিউ" in shell,"Bangla-first navigation")

check((ROOT/"scripts/repo_hygiene.py").exists(),"Safe repo hygiene script present")
check("python scripts/repo_hygiene.py" in workflow,"Repo hygiene before build")
check("contents: read" in workflow and "contents: write" not in workflow,"Deployment uses least-privilege repository permission")
check("npm install --package-lock-only" not in workflow and "npm ci" in workflow,"Deployment uses committed lockfile deterministically")
check("KANJIVG_COMMIT" in workflow and "build_strokes.py" in workflow,"KanjiVG source revision pinned")
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
check("splitSpeech" in audio and "speechToDisplay" in audio,"Long Japanese text chunking with display-boundary mapping")
check("rolePitch" in audio and "pickVoice" in audio,"Distinct dialogue role voices")
check("playDialogueTrack" in audio,"Full dialogue track helper present")
check("innerHTML" not in kanji and "safeStrokeSvg" in kanji and "replaceChildren" in kanji,"Kanji SVG runtime injection hardened")

mock=(ROOT/"components/MockTest.tsx").read_text(encoding="utf-8")
check("total:10" in mock and "total:25" in mock and "total:52" in mock,"Quick 10 / Mini 25 / Full 52 modes")
check("vocabulary:20" in mock and "'grammar-reading':20" in mock and "listening:12" in mock,"Full 20/20/12 blueprint")
check("minutes:{vocabulary:20,'grammar-reading':40,listening:30}" in mock.replace(" ",""),"Full 20/40/30 timing blueprint")
check("onReviewMistakes" in mock,"Vocabulary mistakes can return to Recall")

check("/* FINAL_PRODUCTION_NEO_TORII */" in ui60,"Final Neo Torii style foundation retained")
check("#050D18" in ui60 and "#EF3F3A" in ui60 and "#F7F9FC" in ui60,"Navy/red/white brand foundation retained")

for logo in [
    "nihongo-vibes-logo-96.png",
    "nihongo-vibes-logo-192.png",
    "nihongo-vibes-logo-512.png",
    "nihongo-vibes-logo-maskable-512.png",
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
check("AnalyticsConsent" in layout and "if(consent!=='accepted') return null" in consent and "gtag('config'" in consent,"Analytics remains explicit opt-in")
check((ROOT/"app/privacy/page.tsx").exists(),"Privacy page present")
check("playbackGeneration" in audio and "exclusive_audio:true" in audio,"One-audio-at-a-time mutex")
check(package.get("version")=="61.0.0","V61 storage-compatible release metadata retained")
check(package.get("dependencies",{}).get("next")=="16.3.3","Patched Next.js release")
check("AUDIO_CACHE" not in sw and "source-v61" in sw,"Obsolete audio cache removed from source service worker")
check((ROOT/"tests/site.spec.ts").exists() and "test:e2e" in package.get("scripts",{}),"Responsive accessibility E2E suite present")
check("disableRules(['color-contrast'])" not in tests and 'new AxeBuilder({page}).analyze()' in tests,"Accessibility tests include color contrast")
check("mobile-webkit" in (ROOT/"playwright.config.ts").read_text(encoding="utf-8"),"Mobile WebKit regression project present")

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
    check("AUDIO_CACHE" not in out_sw and "build-" in out_sw,"Build-scoped service-worker caches")

failed=[msg for ok,msg in checks if not ok]
if failed:
    raise SystemExit("Production QA failed: "+", ".join(failed))
print(f"PRODUCTION QA COMPLETE: {len(checks)}/{len(checks)} PASS")
