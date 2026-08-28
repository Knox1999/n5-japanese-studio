#!/usr/bin/env python3
from pathlib import Path
import json, sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]
def check(ok,msg):
    checks.append((bool(ok),msg));print(("PASS " if ok else "FAIL ")+msg)

post="--postbuild" in sys.argv
klc=json.loads((ROOT/"source/data/klc-tree.json").read_text(encoding="utf-8"))
grammar=json.loads((ROOT/"source/data/grammar-visual.json").read_text(encoding="utf-8"))
check(len(klc.get("nodes",[]))==2300,"2300 KLC nodes")
check(len(klc.get("edges",[]))==4034,"4034 KLC edges")

kana=(ROOT/"components/KanaPad.tsx").read_text(encoding="utf-8")
kanji=(ROOT/"components/KanjiExplorer.tsx").read_text(encoding="utf-8")
spell=(ROOT/"components/Spelling.tsx").read_text(encoding="utf-8")
app=(ROOT/"components/StudioApp.tsx").read_text(encoding="utf-8")
sw=(ROOT/"public/sw.js").read_text(encoding="utf-8")
manifest=json.loads((ROOT/"public/manifest.webmanifest").read_text(encoding="utf-8"))
package=json.loads((ROOT/"package.json").read_text(encoding="utf-8"))
layout=(ROOT/"app/layout.tsx").read_text(encoding="utf-8")

check('data-kana-input="Spelling answer"' in spell,"Spelling wired to Kana Pad")
check("<KanaPad/>" in app,"Global Kana Pad mounted")
check("ひらがな" in kana and "カタカナ" in kana,"Hiragana/Katakana modes")
check("n5_kana_pad_position" in kana,"Kana Pad position persistence")
check("Recursive KLC Construction" in kanji and "RecursiveNode" in kanji,"Recursive KLC tree UI")
check("Builds into" in kanji and "reverse" in kanji,"Builds-into reverse graph")
check("data.vocabulary.flatMap" in kanji,"Lesson Kanji derived from vocabulary")

check("const VERSION='v57'" in sw,"V57 service-worker cache version")
check("nihongo-vibes-" in sw,"The Nihongo Vibes cache namespace")
check(manifest.get("short_name")=="Nihongo Vibes","PWA brand is Nihongo Vibes")
check(str(package.get("version"))=="57.0.0","Package version is 57.0.0")
check((ROOT/"styles/v50-production.scss").exists(),"V50 production foundation present")
check((ROOT/"components/DataVault.tsx").exists(),"Backup/restore Data Vault present")
check((ROOT/"public/robots.txt").exists(),"robots.txt present")
check((ROOT/"public/sitemap.xml").exists(),"sitemap.xml present")

# Visual grammar remains intact.
lessons=grammar.get("lessons") or {}
rules=[r for L in lessons.values() for r in (L.get("rules") or [])]
examples=[e for r in rules for e in (r.get("examples") or [])]
check(grammar.get("version")=="53","V53 visual grammar dataset retained")
check(len(lessons)==25,"25 visual grammar lessons")
check(len(rules)>=100,"100+ visual grammar rules")
check(all(len(r.get("examples") or [])==5 for r in rules),"Exactly 5 examples per grammar rule")
check(len(examples)>=500,"500+ grammar practice examples")
check((ROOT/"components/GrammarStudio.tsx").exists(),"GrammarStudio component present")
check("G-FG3JCWGSPR" in layout,"GA4 measurement ID preserved")

# Clean Vocabulary / Verb Forms Lab.
vocab=(ROOT/"components/Vocabulary.tsx").read_text(encoding="utf-8")
check("VerbFormsLab" in vocab,"Clean Verb Forms Lab present")
check("verb-group-memory" not in vocab,"Always-visible Verb Group Memory Map removed")
check(all(x in vocab for x in ["01 · ます FORM","02 · た FORM","03 · ない FORM","04 · DICTIONARY FORM","05 · て FORM"]),"Verb form families ordered and boxed")
check("f.cells.length===3" not in vocab,"Verb Forms TypeScript narrowing fixed")

# V57 signature design + mobile.
ui=(ROOT/"styles/v57-signature.scss").read_text(encoding="utf-8")
dashboard=(ROOT/"components/Dashboard.tsx").read_text(encoding="utf-8")
shell=(ROOT/"components/Shell.tsx").read_text(encoding="utf-8")
check("v57-signature.scss" in layout,"V57 signature stylesheet imported last")
check(all(x in ui for x in ["--nv57-bg:#031326","--nv57-red:#ef3f38","--nv57-white:#f7fbff"]),"Logo navy-red-white palette encoded")
check(".module-green" in ui and "--f-green:var(--nv57-steel)" in ui,"Legacy green theme neutralized")
check("home-hero-v57" in dashboard and "nihongo-vibes-logo.webp" in dashboard,"V57 clean logo-led homepage")
check("@media(max-width:760px)" in ui and ".future-brand{display:flex!important" in ui,"Mobile header keeps logo/brand visible")
check("overflow-y:auto!important" in ui and "future-global-ambient" in ui,"Desktop/mobile root scrolling hardened")
check("document.addEventListener('wheel',onWheel,{passive:false})" in shell,"Horizontal-bar mouse-wheel rescue present")
check("stopAudio();setDrawer(false)" in shell,"Page navigation stops audio and releases UI state")

# V57 listening/conversation redesign.
listening=(ROOT/"components/Listening.tsx").read_text(encoding="utf-8")
conversation=(ROOT/"components/StudyViews.tsx").read_text(encoding="utf-8")
check("shadow-workbench-v57" in listening and "shadow-list-v57" in listening,"V57 shadowing workbench UI present")
check("conversation-stage-v57" in conversation and "Play A ↔ B" in conversation,"V57 two-person dialogue UI present")
check("voiceMap" in listening and "voiceMap" in conversation,"Dialogue uses distinct male/female voice roles")

# V57 natural neural voice pipeline.
audio=(ROOT/"lib/audio.ts").read_text(encoding="utf-8")
extract=(ROOT/"scripts/extract_audio_texts.py").read_text(encoding="utf-8")
generator=(ROOT/"scripts/generate_audio.py").read_text(encoding="utf-8")
workflow=(ROOT/".github/workflows/deploy-pages.yml").read_text(encoding="utf-8")
check("edge_tts" in generator and "ja-JP-NanamiNeural" in generator and "ja-JP-KeitaNeural" in generator,"V57 Microsoft Japanese neural voice profiles configured")
check("edge-tts>=7.0,<8.0" in workflow and "kokoro" not in workflow.lower(),"Deployment switched away from Kokoro toolchain")
check("voice_role" in extract and "male" in extract and "female" in extract,"Role-specific dialogue/shadowing audio extracted")

# Critical: one audio at a time site-wide.
check("playbackGeneration" in audio,"Global playback generation mutex present")
check("removeAttribute('src')" in audio,"Cancelled HTML audio is fully detached")
check("requestGeneration!==playbackGeneration" in audio,"Stale async audio cannot restart")
check("exclusive_audio:true" in audio,"Exclusive-audio analytics marker present")
check("result!=='ended'" in listening and "result!=='ended'" in conversation,"Full sessions stop when another audio interrupts")

# JLPT style mock retained.
mock=(ROOT/"components/MockTest.tsx").read_text(encoding="utf-8")
check("20 Vocabulary + 20 Grammar/Reading + 12 Listening" in mock,"52-item JLPT-style practice blueprint retained")
check(all(x in mock for x in ["minutes:20","minutes:40","minutes:30"]),"N5 section times encoded")

if post:
    out=ROOT/"out"
    check((out/"index.html").exists(),"Next.js static export index exists")
    check((out/".nojekyll").exists(),"Pages .nojekyll exists")
    check((out/"manifest.webmanifest").exists(),"PWA manifest exported")
    check((out/"data/grammar-visual.json").exists(),"Visual grammar data exported")

failed=[msg for ok,msg in checks if not ok]
if failed:raise SystemExit("Production QA failed: "+", ".join(failed))
print(f"PRODUCTION QA COMPLETE: {len(checks)}/{len(checks)} PASS")
