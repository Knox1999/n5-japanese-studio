#!/usr/bin/env python3
from pathlib import Path
import json,sys,re
ROOT=Path(__file__).resolve().parents[1]
checks=[]
def check(ok,msg):
    checks.append((bool(ok),msg));print(('PASS ' if ok else 'FAIL ')+msg)
pre='--prebuild' in sys.argv
post='--postbuild' in sys.argv
klc=json.loads((ROOT/'source/data/klc-tree.json').read_text(encoding='utf-8'))
check(len(klc.get('nodes',[]))==2300,'2300 KLC nodes from CSV')
check(len(klc.get('edges',[]))==4034,'4034 KLC edges from CSV')
kana=(ROOT/'components/KanaPad.tsx').read_text(encoding='utf-8')
kanji=(ROOT/'components/KanjiExplorer.tsx').read_text(encoding='utf-8')
spell=(ROOT/'components/Spelling.tsx').read_text(encoding='utf-8')
app=(ROOT/'components/StudioApp.tsx').read_text(encoding='utf-8')
css=(ROOT/'styles/premium.scss').read_text(encoding='utf-8')
check('data-kana-input="Spelling answer"' in spell,'Spelling wired to Kana Pad')
check('<KanaPad/>' in app,'Global floating Kana Pad mounted')
check('ひらがな' in kana and 'カタカナ' in kana,'Hiragana/Katakana modes')
check('n5_kana_pad_position' in kana,'Kana Pad position persistence')
check('Recursive KLC Construction' in kanji and 'RecursiveNode' in kanji,'Recursive KLC tree UI')
check('Builds into' in kanji and 'reverse' in kanji,'Builds-into reverse graph')
check('data.vocabulary.flatMap' in kanji,'Lesson Kanji derived from actual vocabulary')
check('build_klc_from_csv.py' in (ROOT/'package.json').read_text(),'KLC CSV build integrated')
check('kana-pad-v42' in css and 'recursive-tree-scroll' in css,'v42 responsive styles present')
check("n5-studio-v42" in (ROOT/'public/sw.js').read_text(encoding='utf-8'),'v42 service-worker cache bust')
if post:
    out=ROOT/'out';check((out/'index.html').exists(),'Next.js static export index exists');check((out/'.nojekyll').exists(),'Pages .nojekyll exists')
failed=[m for ok,m in checks if not ok]
if failed: raise SystemExit('V42 QA failed: '+', '.join(failed))
print(f'V42 QA COMPLETE: {len(checks)}/{len(checks)} PASS')
