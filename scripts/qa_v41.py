#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, re, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def ok(cond,msg):
    if not cond: raise AssertionError(msg)
    print('PASS',msg)

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--prebuild',action='store_true');ap.add_argument('--postbuild',action='store_true');a=ap.parse_args()
    meta=json.loads((ROOT/'public/data/meta.json').read_text(encoding='utf-8'))
    tree=json.loads((ROOT/'public/data/klc-tree.json').read_text(encoding='utf-8'))
    memory=json.loads((ROOT/'public/data/klc-memory.json').read_text(encoding='utf-8'))
    ok(meta['vocabulary_count']==1011,'1011 vocabulary')
    ok(meta['lesson_count']==25 and len(meta['lessons'])==25,'25 lessons')
    ok(meta['klc_nodes']==2300 and len(tree['nodes'])==2300,'2300 KLC nodes')
    ok(meta['klc_edges']==4034 and len(tree['edges'])==4034,'4034 KLC edges')
    ok(len(memory)==2300,'2300 Bangla memory stories')
    ok(sum(x['count'] for x in meta['lessons'])==1011,'lesson vocabulary counts sum to 1011')
    pkg=json.loads((ROOT/'package.json').read_text())
    deps={**pkg.get('dependencies',{}),**pkg.get('devDependencies',{})}
    for dep in ['next','react','tailwindcss','sass','framer-motion','gsap','three','lucide-react']:
        ok(dep in deps,f'{dep} included')
    nc=(ROOT/'next.config.mjs').read_text();ok("output: 'export'" in nc,'Next.js static export')
    listening=(ROOT/'components/Listening.tsx').read_text(encoding='utf-8')
    ok("([.75,.9,1] as const)" in listening,'Listening speed controls are 0.75x / 0.90x / 1x')
    ok('1.25' not in listening and '1.5' not in listening and '2×' not in listening,'No >1x listening control')
    app=(ROOT/'components/StudioApp.tsx').read_text(encoding='utf-8')
    for view in ['dashboard','vocabulary','srs','spelling','conversation','reading','listening','grammar','kanji','mock','history']:
        ok(f"case'{view}'" in app,f'{view} view wired')
    storage=(ROOT/'lib/storage.ts').read_text();
    for key in ['n5_offline_lesson','n5_offline_progress','n5_offline_history','n5_offline_srs_v8','n5_offline_spelling_v12']:
        ok(key in storage,f'legacy progress key preserved: {key}')
    css=(ROOT/'styles/premium.scss').read_text(encoding='utf-8')
    ok('@media(max-width:360px)' in css,'360px mobile reflow')
    ok('prefers-contrast:more' in css,'high-contrast preference')
    globalcss=(ROOT/'app/globals.css').read_text(encoding='utf-8')
    ok('prefers-reduced-motion:reduce' in globalcss,'reduced-motion support')
    wf=(ROOT/'.github/workflows/deploy-pages.yml').read_text(encoding='utf-8')
    for token in ['actions/setup-python','actions/setup-node','kokoro','KanjiVG','npm run build','actions/deploy-pages']:
        ok(token.lower() in wf.lower(),f'workflow contains {token}')
    if a.postbuild:
        out=ROOT/'out';ok((out/'index.html').exists(),'Next export produced index.html')
        ok((out/'data/meta.json').exists(),'export contains study data')
        audio=list((out/'audio').glob('*.mp3')) if (out/'audio').exists() else []
        ok(len(audio)>=2000,f'export contains neural audio clips ({len(audio)})')
        idx=out/'assets/strokes/index.json';ok(idx.exists(),'stroke index exported')
        strokes=json.loads(idx.read_text(encoding='utf-8'));ok(len(strokes)>=1800,f'KanjiVG assets exported ({len(strokes)})')
        ok((out/'.nojekyll').exists(),'.nojekyll present')
    print('V41 QA COMPLETE')
if __name__=='__main__':
    try:main()
    except Exception as e:
        print('FAIL',e,file=sys.stderr);raise
