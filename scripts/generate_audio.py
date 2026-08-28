#!/usr/bin/env python3
"""Generate cached Japanese neural audio for V56.

V56 dialogue profile:
- male dialogue voice: jm_kumo
- female dialogue voice: jf_tebukuro (fallback jf_alpha)
- default learning voice remains clear/warm Japanese
- role is encoded in the audio hash, so A/B can use the same text with different voices.
"""
from __future__ import annotations
import json, os, subprocess, tempfile
from pathlib import Path
import numpy as np
import soundfile as sf
import torch
from kokoro import KPipeline

ROOT=Path(__file__).resolve().parents[1]
ROWS=json.loads((ROOT/'_build/audio_texts.json').read_text(encoding='utf-8'))
OUT=ROOT/'_audio_cache';OUT.mkdir(exist_ok=True)
SR=24000
BASE_SPEED=float(os.getenv('N5_TTS_SPEED','0.93'))
PROFILE_VERSION='v56-dual-dialogue-ja-1'
PROFILE_FILE=OUT/'_voice_profile.json'

VOICE_CANDIDATES={
    'default':['jf_alpha,jf_tebukuro','jf_alpha','jf_tebukuro'],
    'clear':['jf_alpha','jf_alpha,jf_tebukuro','jf_tebukuro'],
    'dialogue':['jf_tebukuro','jf_alpha'],
    'female':['jf_tebukuro','jf_alpha','jf_gongitsune'],
    'male':['jm_kumo'],
}

def expressive_speed(text:str)->float:
    t=str(text or '').strip();speed=BASE_SPEED
    if t.endswith(('？','?')):speed-=.035
    if t.endswith(('！','!')):speed+=.025
    if '…' in t or '〜' in t or '～' in t:speed-=.025
    if any(x in t for x in ('すみません','おねがいします','お願いします','ありがとうございます','ありがとうございました')):speed-=.018
    if len(t)<=5:speed-=.012
    elif len(t)>=35:speed+=.01
    return max(.84,min(1.0,speed))

def contextual_speed(row:dict)->float:
    speed=expressive_speed(row.get('text',''));kinds=set(row.get('kinds') or [])
    if 'shadow' in kinds:speed-=.018
    if 'conversation' in kinds:speed-=.010
    if 'vocab' in kinds and len(row.get('text',''))<=10:speed-=.018
    return max(.82,min(1.0,speed))

def contextual_pause(row:dict)->float:
    t=str(row.get('text') or '');p=.105
    if t.endswith(('？','?')):p=.15
    elif t.endswith(('。','！','!')):p=.13
    elif t.endswith('…'):p=.18
    if 'conversation' in set(row.get('kinds') or []):p+=.025
    if 'shadow' in set(row.get('kinds') or []):p+=.035
    return min(.24,p)

def load_profile():
    try:return json.loads(PROFILE_FILE.read_text(encoding='utf-8'))
    except Exception:return {}

def load_first(pipeline:KPipeline,candidates:list[str],fallback:str|None=None)->str:
    for voice in candidates:
        try:pipeline.load_voice(voice);return voice
        except Exception:pass
    if fallback:return fallback
    raise RuntimeError('No Japanese Kokoro voice could be loaded from '+repr(candidates))

def encode_mp3(wav:Path,mp3:Path):
    subprocess.run(['ffmpeg','-loglevel','error','-y','-i',str(wav),'-af','highpass=f=45,lowpass=f=11500,loudnorm=I=-18:TP=-1.5:LRA=11','-ac','1','-ar',str(SR),'-codec:a','libmp3lame','-b:a','80k',str(mp3)],check=True)

def main():
    torch.set_num_threads(max(1,os.cpu_count() or 2));device='cuda' if torch.cuda.is_available() else 'cpu'
    pipeline=KPipeline(lang_code='j',device=device)
    voices={}
    voices['default']=load_first(pipeline,VOICE_CANDIDATES['default'])
    for key in ('clear','dialogue','female','male'):
        voices[key]=load_first(pipeline,VOICE_CANDIDATES[key],voices['default'])
    profile={'version':PROFILE_VERSION,'voices':voices,'base_speed':BASE_SPEED,'sample_rate':SR}
    profile_changed=load_profile()!=profile
    if profile_changed:print('TTS profile updated; preserving compatible cached clips and generating new dual-voice clips:',profile,flush=True)

    generated=reused=0;failed=[]
    for i,row in enumerate(ROWS,1):
        final=OUT/f"{row['hash']}.mp3"
        if final.exists() and final.stat().st_size>1000:
            reused+=1;continue
        try:
            role=row.get('voice_role','default')
            kinds=set(row.get('kinds') or [])
            if role in ('male','female'):voice=voices[role]
            elif kinds.intersection({'conversation','shadow'}):voice=voices['dialogue']
            elif kinds.intersection({'vocab','spelling','grammar','grammar_visual'}):voice=voices['clear']
            else:voice=voices['default']
            parts=[]
            with torch.inference_mode():
                for _,_,audio in pipeline(row['text'],voice=voice,speed=contextual_speed(row)):
                    if audio is None:continue
                    if hasattr(audio,'detach'):audio=audio.detach().cpu().numpy()
                    chunk=np.asarray(audio,dtype=np.float32).reshape(-1)
                    if chunk.size:parts.append(chunk)
            if not parts:raise RuntimeError('no audio')
            pause=np.zeros(int(SR*contextual_pause(row)),dtype=np.float32);joined=[]
            for j,part in enumerate(parts):
                if j:joined.append(pause)
                joined.append(part)
            merged=np.concatenate(joined);peak=float(np.max(np.abs(merged))) if merged.size else 0
            if peak>.985:merged*=.985/peak
            with tempfile.TemporaryDirectory() as td:
                wav=Path(td)/'a.wav';mp3=Path(td)/'a.mp3';sf.write(wav,merged,SR,subtype='PCM_16');encode_mp3(wav,mp3);mp3.replace(final)
            generated+=1
        except Exception as exc:failed.append((row['hash'],row.get('voice_role'),row['text'],repr(exc)))
        if i%50==0:print(i,'/',len(ROWS),'generated',generated,'reused',reused,'failed',len(failed),flush=True)
    if failed:(ROOT/'_build/audio_failures.json').write_text(json.dumps(failed,ensure_ascii=False,indent=2),encoding='utf-8')
    if len(failed)>20:raise SystemExit(f'Too many audio failures: {len(failed)}')
    PROFILE_FILE.write_text(json.dumps(profile,ensure_ascii=False,indent=2),encoding='utf-8')
    print({'generated':generated,'reused':reused,'failed':len(failed),'voices':voices,'device':device})

if __name__=='__main__':main()
