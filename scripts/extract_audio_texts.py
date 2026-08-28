#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, re, unicodedata
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'source/data/studio.json').read_text(encoding='utf-8'))
grammar=json.loads((ROOT/'source/data/grammar-visual.json').read_text(encoding='utf-8'))
items={}

def norm(text): return re.sub(r'\s+',' ',unicodedata.normalize('NFC',str(text or ''))).strip()
def add(text,lesson=0,kind='misc',voice_role='default'):
    text=norm(text)
    if not text:return
    voice_role=voice_role if voice_role in {'default','male','female'} else 'default'
    raw=text if voice_role=='default' else f'{voice_role}|{text}'
    key=hashlib.sha1(raw.encode()).hexdigest()
    row=items.setdefault(key,{'hash':key,'text':text,'voice_role':voice_role,'lessons':[],'kinds':[]})
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
    # Dialogue: first unique speaker = male, second = female, then alternate.
    for name in ('dialogue','dialogue_extended'):
        turns=L.get(name) or []
        speakers=[]
        for turn in turns:
            if isinstance(turn,list) and len(turn)>1 and turn[0] not in speakers:speakers.append(turn[0])
        voice_map={s:('male' if i%2==0 else 'female') for i,s in enumerate(speakers)}
        for turn in turns:
            if isinstance(turn,list) and len(turn)>1:
                add(turn[1],ln,'conversation',voice_map.get(turn[0],'default'))
    for name in ('reading','reading_extended'):add(L.get(name),ln,'reading_full')
    for x in L.get('shadowing_chunks') or []:add(x,ln,'shadow')
    for x in L.get('reading_extra_pairs') or []:
        if isinstance(x,list) and x:add(x[0],ln,'reading_sentence')
    for x in L.get('grammar') or []:
        if isinstance(x,list) and len(x)>2:add(x[2],ln,'grammar')

for k,L in (grammar.get('lessons') or {}).items():
    ln=int(k)
    for r in L.get('rules') or []:
        for example in r.get('examples') or []:
            add(example.get('jp'),ln,'grammar_visual')

add('こんにちは。きょうも いっしょに にほんごを れんしゅうしましょう。',0,'voice_test')
split=re.compile(r'(?<=[。！？])')
for row in list(items.values()):
    if row.get('voice_role')=='default' and 'reading_full' in row['kinds']:
        for sentence in split.split(row['text']):
            for ln in row['lessons'] or [0]:add(sentence,ln,'reading_sentence')

rows=sorted(items.values(),key=lambda x:x['hash'])
build=ROOT/'_build';build.mkdir(exist_ok=True)
(build/'audio_texts.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
print('Unique audio clips:',len(rows),'dual-voice clips:',sum(1 for r in rows if r.get('voice_role')!='default'))
