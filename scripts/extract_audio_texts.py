#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, re, unicodedata
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'source/data/studio.json').read_text(encoding='utf-8'))
grammar=json.loads((ROOT/'source/data/grammar-visual.json').read_text(encoding='utf-8'))
items={}

def norm(text): return re.sub(r'\s+',' ',unicodedata.normalize('NFC',str(text or ''))).strip()
def add(text,lesson=0,kind='misc'):
    text=norm(text)
    if not text:return
    key=hashlib.sha1(text.encode()).hexdigest()
    row=items.setdefault(key,{'hash':key,'text':text,'lessons':[],'kinds':[]})
    if lesson and lesson not in row['lessons']:row['lessons'].append(int(lesson))
    if kind not in row['kinds']:row['kinds'].append(kind)

for v in data.get('vocabulary',[]):
    L=int(v.get('lesson') or 0)
    add(v.get('tts_text') or v.get('japanese'),L,'vocab')
    add(v.get('spelling_text'),L,'spelling')
    ex=v.get('example') or {}
    add(ex.get('jp') or ex.get('japanese'),L,'sentence')

for k,L in (((data.get('content') or {}).get('lessons') or {}).items()):
    ln=int(k)
    for name in ('dialogue','dialogue_extended'):
        for turn in L.get(name) or []:
            if isinstance(turn,list) and len(turn)>1:add(turn[1],ln,'conversation')
    for name in ('reading','reading_extended'):add(L.get(name),ln,'reading_full')
    for x in L.get('shadowing_chunks') or []:add(x,ln,'shadow')
    for x in L.get('reading_extra_pairs') or []:
        if isinstance(x,list) and x:add(x[0],ln,'reading_sentence')
    for x in L.get('grammar') or []:
        if isinstance(x,list) and len(x)>2:add(x[2],ln,'grammar')

# V53: pre-generate natural Kokoro Japanese audio for all 550 visual grammar examples.
for k,L in (grammar.get('lessons') or {}).items():
    ln=int(k)
    for r in L.get('rules') or []:
        for example in r.get('examples') or []:
            add(example.get('jp'),ln,'grammar_visual')

add('こんにちは。きょうも いっしょに にほんごを れんしゅうしましょう。',0,'voice_test')
split=re.compile(r'(?<=[。！？])')
for row in list(items.values()):
    if 'reading_full' in row['kinds']:
        for s in split.split(row['text']):
            for ln in row['lessons'] or [0]:add(s,ln,'reading_sentence')

rows=sorted(items.values(),key=lambda x:x['hash'])
build=ROOT/'_build';build.mkdir(exist_ok=True)
(build/'audio_texts.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
print('Unique audio clips:',len(rows))
