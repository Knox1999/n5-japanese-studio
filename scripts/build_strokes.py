#!/usr/bin/env python3
from __future__ import annotations
import json, shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];tree=json.loads((ROOT/'source/data/klc-tree.json').read_text(encoding='utf-8'));src=ROOT/'_kanjivg/kanji';out=ROOT/'public/assets/strokes';out.mkdir(parents=True,exist_ok=True);idx={};missing=[]
for n in tree.get('nodes') or []:
    if not isinstance(n,list) or len(n)<2:continue
    ch=str(n[1] or '').strip()
    if len(ch)!=1:continue
    cp=ord(ch)
    if not 0x3400<=cp<=0x9fff:continue
    fn=f'{cp:05x}.svg';p=src/fn
    if p.exists():shutil.copy2(p,out/fn);idx[ch]=fn
    else:missing.append(ch)
(out/'index.json').write_text(json.dumps(idx,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
lic=ROOT/'_kanjivg/COPYING'
if lic.exists():shutil.copy2(lic,out/'KANJIVG_LICENSE.txt')
(out/'ATTRIBUTION.txt').write_text('KanjiVG vector graphics — Ulrich Apel and contributors. CC BY-SA 3.0. https://github.com/KanjiVG/kanjivg\n',encoding='utf-8')
print('KanjiVG copied',len(idx),'missing',len(missing))
if len(idx)<1800:raise SystemExit('Too few KanjiVG assets')
