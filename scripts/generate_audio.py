#!/usr/bin/env python3
from __future__ import annotations
import json, os, subprocess, tempfile
from pathlib import Path
import numpy as np
import soundfile as sf
import torch
from kokoro import KPipeline
ROOT=Path(__file__).resolve().parents[1]
rows=json.loads((ROOT/'_build/audio_texts.json').read_text(encoding='utf-8'));out=ROOT/'_audio_cache';out.mkdir(exist_ok=True)
VOICE='jf_alpha';BASE_SPEED=.94;SR=24000
def expressive_speed(t):
    s=BASE_SPEED
    if '？' in t or '?' in t:s-=.04
    if '！' in t or '!' in t:s+=.03
    if '…' in t:s-=.03
    if any(x in t for x in ['すみません','おねがいします','ありがとうございます','ありがとうございました']):s-=.02
    return max(.84,min(1.02,s))
torch.set_num_threads(max(1,os.cpu_count() or 2)); pipeline=KPipeline(lang_code='j');generated=reused=0;failed=[]
for i,row in enumerate(rows,1):
    final=out/f"{row['hash']}.mp3"
    if final.exists() and final.stat().st_size>1000:reused+=1;continue
    try:
        parts=[]
        for _,_,audio in pipeline(row['text'],voice=VOICE,speed=expressive_speed(row['text'])):
            if hasattr(audio,'detach'):audio=audio.detach().cpu().numpy()
            a=np.asarray(audio,dtype=np.float32).reshape(-1)
            if a.size:parts.append(a)
        if not parts:raise RuntimeError('no audio')
        pause=np.zeros(int(SR*.12),dtype=np.float32);joined=[]
        for j,p in enumerate(parts):
            if j:joined.append(pause)
            joined.append(p)
        merged=np.concatenate(joined)
        with tempfile.TemporaryDirectory() as td:
            wav=Path(td)/'a.wav';mp3=Path(td)/'a.mp3';sf.write(wav,merged,SR,subtype='PCM_16')
            subprocess.run(['ffmpeg','-loglevel','error','-y','-i',str(wav),'-ac','1','-ar','24000','-codec:a','libmp3lame','-b:a','64k',str(mp3)],check=True)
            mp3.replace(final)
        generated+=1
    except Exception as e:failed.append((row['hash'],row['text'],repr(e)))
    if i%50==0:print(i,'/',len(rows),'generated',generated,'reused',reused,'failed',len(failed),flush=True)
if failed:(ROOT/'_build/audio_failures.json').write_text(json.dumps(failed,ensure_ascii=False,indent=2),encoding='utf-8')
if len(failed)>20:raise SystemExit(f'Too many audio failures: {len(failed)}')
print({'generated':generated,'reused':reused,'failed':len(failed)})
