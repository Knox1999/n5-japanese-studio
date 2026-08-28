#!/usr/bin/env python3
from pathlib import Path
import json, sys

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
sw=(ROOT/"public/sw.js").read_text(encoding="utf-8")
manifest=json.loads((ROOT/"public/manifest.webmanifest").read_text(encoding="utf-8"))
package=json.loads((ROOT/"package.json").read_text(encoding="utf-8"))

check('data-kana-input="Spelling answer"' in spell,"Spelling wired to Kana Pad")
check("<KanaPad/>" in app,"Global Kana Pad mounted")
check("ひらがな" in kana and "カタカナ" in kana,"Hiragana/Katakana modes")
check("n5_kana_pad_position" in kana,"Kana Pad position persistence")
check("Recursive KLC Construction" in kanji and "RecursiveNode" in kanji,"Recursive KLC tree UI")
check("Builds into" in kanji and "reverse" in kanji,"Builds-into reverse graph")
check("data.vocabulary.flatMap" in kanji,"Lesson Kanji derived from vocabulary")

check("const VERSION='v56'" in sw,"V56 service-worker cache version")
check("nihongo-vibes-" in sw,"The Nihongo Vibes cache namespace")
check(manifest.get("short_name")=="Nihongo Vibes","PWA brand is Nihongo Vibes")
check(str(package.get("version"))=="56.0.0","Package version is 56.0.0")
check((ROOT/"styles/v50-production.scss").exists(),"V50 production stylesheet present")
check((ROOT/"components/DataVault.tsx").exists(),"Backup/restore Data Vault present")
check((ROOT/"public/robots.txt").exists(),"robots.txt present")
check((ROOT/"public/sitemap.xml").exists(),"sitemap.xml present")

# V53 visual grammar QA
lessons=grammar.get("lessons") or {}
rules=[r for L in lessons.values() for r in (L.get("rules") or [])]
examples=[e for r in rules for e in (r.get("examples") or [])]
check(grammar.get("version")=="53","V53 grammar dataset")
check(len(lessons)==25,"25 visual grammar lessons")
check(len(rules)>=100,"100+ visual grammar rules")
check(all(len(r.get("examples") or [])==5 for r in rules),"Exactly 5 examples per grammar rule")
check(len(examples)>=500,"500+ grammar practice examples")
check((ROOT/"components/GrammarStudio.tsx").exists(),"GrammarStudio component present")
check((ROOT/"styles/v53-visual-grammar.scss").exists(),"V53 visual grammar stylesheet present")
check("v53-visual-grammar.scss" in (ROOT/"app/layout.tsx").read_text(encoding="utf-8"),"V53 stylesheet imported")
check("grammar-visual.json" in (ROOT/"scripts/build_data.py").read_text(encoding="utf-8"),"Grammar data exported during build")
check("grammar_visual" in (ROOT/"scripts/extract_audio_texts.py").read_text(encoding="utf-8"),"Grammar examples included in audio extraction")
check("G-FG3JCWGSPR" in (ROOT/"app/layout.tsx").read_text(encoding="utf-8"),"GA4 measurement ID preserved")

grammar_component=(ROOT/"components/GrammarStudio.tsx").read_text(encoding="utf-8")
vocab_component=(ROOT/"components/Vocabulary.tsx").read_text(encoding="utf-8")
check("const steps=rule.steps??[];" in grammar_component,"Grammar optional steps TypeScript guard present")
check("rule.steps.map" not in grammar_component,"Unsafe optional steps access removed")
check("VerbFormsLab" in vocab_component,"Clean Verb Forms Lab present")
check("verb-group-memory" not in vocab_component,"Always-visible Verb Group Memory Map removed")
check(all(x in vocab_component for x in ["01 · ます FORM","02 · た FORM","03 · ない FORM","04 · DICTIONARY FORM","05 · て FORM"]),"Verb form families ordered and boxed")

# V56 unified UI / mobile / dual-voice / JLPT-style mock QA
layout=(ROOT/"app/layout.tsx").read_text(encoding="utf-8")
ui=(ROOT/"styles/v56-unified-ui.scss").read_text(encoding="utf-8")
conversation=(ROOT/"components/StudyViews.tsx").read_text(encoding="utf-8")
audio=(ROOT/"lib/audio.ts").read_text(encoding="utf-8")
extract=(ROOT/"scripts/extract_audio_texts.py").read_text(encoding="utf-8")
generator=(ROOT/"scripts/generate_audio.py").read_text(encoding="utf-8")
mock=(ROOT/"components/MockTest.tsx").read_text(encoding="utf-8")
check("v56-unified-ui.scss" in layout,"V56 unified stylesheet imported last")
check("--f-bg:#041326" in ui and "#071311" not in ui,"Legacy green palette removed from V56 design layer")
check("@media(max-width:760px)" in ui and ".future-brand{display:flex!important" in ui,"Mobile header keeps logo/brand visible")
check("overflow-y:auto!important" in ui,"Page scrolling explicitly preserved")
check("voice-${voice}" in conversation and "Male" in conversation and "Female" in conversation and "Play full A ↔ B" in conversation,"Two-person conversation UI")
check("AudioVoiceRole" in audio and "voiceRole==='default'" in audio,"Role-aware audio API present")
check("voice_role" in extract and "male" in extract and "female" in extract,"Dual-voice dialogue clips extracted")
check("jm_kumo" in generator and "jf_tebukuro" in generator,"Japanese male/female Kokoro voices configured")
check("20 Vocabulary + 20 Grammar/Reading + 12 Listening" in mock,"52-item JLPT-style practice blueprint")
check(all(x in mock for x in ["minutes:20","minutes:40","minutes:30"]),"Current N5 section times encoded")
check(all(x in mock for x in ["Kanji reading","Orthography","Sentential grammar","Quick response"]),"JLPT N5 item-type families represented")

if post:
    out=ROOT/"out"
    check((out/"index.html").exists(),"Next.js static export index exists")
    check((out/".nojekyll").exists(),"Pages .nojekyll exists")
    check((out/"manifest.webmanifest").exists(),"PWA manifest exported")
    check((out/"data/grammar-visual.json").exists(),"Visual grammar data exported")

failed=[msg for ok,msg in checks if not ok]
if failed: raise SystemExit("Production QA failed: "+", ".join(failed))
print(f"PRODUCTION QA COMPLETE: {len(checks)}/{len(checks)} PASS")
