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

check("const VERSION='v50'" in sw,"V50 service-worker cache version")
check("nihongo-vibes-" in sw,"The Nihongo Vibes cache namespace")
check(manifest.get("short_name")=="Nihongo Vibes","PWA brand is Nihongo Vibes")
check(str(package.get("version"))=="50.0.0","Package version is 50.0.0")
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

if post:
    out=ROOT/"out"
    check((out/"index.html").exists(),"Next.js static export index exists")
    check((out/".nojekyll").exists(),"Pages .nojekyll exists")
    check((out/"manifest.webmanifest").exists(),"PWA manifest exported")
    check((out/"data/grammar-visual.json").exists(),"Visual grammar data exported")

failed=[msg for ok,msg in checks if not ok]
if failed: raise SystemExit("Production QA failed: "+", ".join(failed))
print(f"PRODUCTION QA COMPLETE: {len(checks)}/{len(checks)} PASS")
