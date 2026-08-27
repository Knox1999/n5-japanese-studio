#!/usr/bin/env python3
from __future__ import annotations
import json, shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];src=ROOT/'_audio_cache';out=ROOT/'public/audio';out.mkdir(parents=True,exist_ok=True)
rows=json.loads((ROOT/'_build/audio_texts.json').read_text(encoding='utf-8'))
available=[]
for row in rows:
    p=src/f"{row['hash']}.mp3"
    if p.exists() and p.stat().st_size>1000:
        shutil.copy2(p,out/p.name);available.append(row['hash'])
(out/'manifest.json').write_text(json.dumps({'version':'41','voice':'Kokoro jf_alpha','count':len(available),'hashes':available},separators=(',',':')),encoding='utf-8')
print('Published audio clips:',len(available))
