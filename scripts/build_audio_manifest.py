#!/usr/bin/env python3
from __future__ import annotations
import json, shutil
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
src=ROOT/'_audio_cache'
out=ROOT/'public/audio'
out.mkdir(parents=True,exist_ok=True)
rows=json.loads((ROOT/'_build/audio_texts.json').read_text(encoding='utf-8'))
available=[]
for row in rows:
    p=src/f"{row['hash']}.mp3"
    if p.exists() and p.stat().st_size>1000:
        shutil.copy2(p,out/p.name)
        available.append(row['hash'])

profile={}
try:
    profile=json.loads((src/'_voice_profile.json').read_text(encoding='utf-8'))
except Exception:
    profile={}

(out/'manifest.json').write_text(json.dumps({
    'version':'50',
    'profile':profile.get('version','v49-natural-emotive-ja-1'),
    'voice':profile.get('voice','Kokoro Japanese'),
    'voices':profile.get('voices',{}),
    'count':len(available),
    'hashes':available
},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print('Published audio clips:',len(available))
