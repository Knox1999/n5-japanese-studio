#!/usr/bin/env python3
"""Generate cached Japanese neural audio with a warmer, more human delivery.

V47 changes:
- prefers a clarity + warmth Japanese Kokoro voice blend when supported;
- punctuation/politeness-aware pacing instead of one flat speed;
- explicit cache profile invalidation so old robotic V46 MP3s are regenerated;
- inference_mode + automatic CUDA selection for faster CI generation;
- gentle loudness normalization for consistent listening volume.
"""
from __future__ import annotations

import json
import os
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
from kokoro import KPipeline

ROOT = Path(__file__).resolve().parents[1]
ROWS = json.loads((ROOT / '_build/audio_texts.json').read_text(encoding='utf-8'))
OUT = ROOT / '_audio_cache'
OUT.mkdir(exist_ok=True)

SR = 24000
BASE_SPEED = float(os.getenv('N5_TTS_SPEED', '0.93'))
PROFILE_VERSION = 'v47-natural-ja-2'
PROFILE_FILE = OUT / '_voice_profile.json'
VOICE_ENV = os.getenv('N5_TTS_VOICE', '').strip()
VOICE_CANDIDATES = [x for x in [VOICE_ENV, 'jf_alpha,jf_tebukuro', 'jf_tebukuro', 'jf_alpha'] if x]


def expressive_speed(text: str) -> float:
    """Small prosody changes while staying learner-friendly and intelligible."""
    t = str(text or '').strip()
    speed = BASE_SPEED
    if t.endswith(('？', '?')):
        speed -= 0.035
    if t.endswith(('！', '!')):
        speed += 0.025
    if '…' in t or '〜' in t or '～' in t:
        speed -= 0.025
    if any(x in t for x in ('すみません', 'おねがいします', 'お願いします', 'ありがとうございます', 'ありがとうございました')):
        speed -= 0.018
    if len(t) <= 5:
        speed -= 0.012
    elif len(t) >= 35:
        speed += 0.01
    return max(0.84, min(1.0, speed))


def pause_seconds(text: str) -> float:
    t = str(text or '').strip()
    if t.endswith(('？', '?')):
        return 0.15
    if t.endswith(('。', '！', '!')):
        return 0.13
    if t.endswith(('…',)):
        return 0.18
    return 0.105


def load_profile() -> dict:
    try:
        return json.loads(PROFILE_FILE.read_text(encoding='utf-8'))
    except Exception:
        return {}


def save_profile(voice: str) -> None:
    PROFILE_FILE.write_text(json.dumps({
        'version': PROFILE_VERSION,
        'voice': voice,
        'base_speed': BASE_SPEED,
        'sample_rate': SR,
    }, ensure_ascii=False, indent=2), encoding='utf-8')


def select_voice(pipeline: KPipeline) -> str:
    errors = []
    for voice in dict.fromkeys(VOICE_CANDIDATES):
        try:
            # Kokoro supports comma-separated voice averaging on current KPipeline.
            pipeline.load_voice(voice)
            return voice
        except Exception as exc:
            errors.append(f'{voice}: {exc!r}')
    raise RuntimeError('No Japanese Kokoro voice could be loaded: ' + ' | '.join(errors))


def encode_mp3(wav: Path, mp3: Path) -> None:
    # Mild mastering only: keep the neural timbre intact while normalizing level.
    subprocess.run([
        'ffmpeg', '-loglevel', 'error', '-y', '-i', str(wav),
        '-af', 'highpass=f=45,lowpass=f=11500,loudnorm=I=-18:TP=-1.5:LRA=11',
        '-ac', '1', '-ar', str(SR), '-codec:a', 'libmp3lame', '-b:a', '80k', str(mp3)
    ], check=True)


def main() -> None:
    torch.set_num_threads(max(1, os.cpu_count() or 2))
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    pipeline = KPipeline(lang_code='j', device=device)
    voice = select_voice(pipeline)

    old_profile = load_profile()
    current_profile = {'version': PROFILE_VERSION, 'voice': voice, 'base_speed': BASE_SPEED, 'sample_rate': SR}
    regenerate = old_profile != current_profile
    if regenerate:
        print('TTS profile changed; regenerating cached Japanese audio:', current_profile, flush=True)

    generated = reused = 0
    failed: list[tuple[str, str, str]] = []

    for i, row in enumerate(ROWS, 1):
        final = OUT / f"{row['hash']}.mp3"
        if not regenerate and final.exists() and final.stat().st_size > 1000:
            reused += 1
            continue

        try:
            parts: list[np.ndarray] = []
            with torch.inference_mode():
                for _, _, audio in pipeline(row['text'], voice=voice, speed=expressive_speed(row['text'])):
                    if audio is None:
                        continue
                    if hasattr(audio, 'detach'):
                        audio = audio.detach().cpu().numpy()
                    chunk = np.asarray(audio, dtype=np.float32).reshape(-1)
                    if chunk.size:
                        parts.append(chunk)
            if not parts:
                raise RuntimeError('no audio')

            pause = np.zeros(int(SR * pause_seconds(row['text'])), dtype=np.float32)
            joined: list[np.ndarray] = []
            for j, part in enumerate(parts):
                if j:
                    joined.append(pause)
                joined.append(part)
            merged = np.concatenate(joined)

            # Guard against clipping before FFmpeg normalization.
            peak = float(np.max(np.abs(merged))) if merged.size else 0.0
            if peak > 0.985:
                merged = merged * (0.985 / peak)

            with tempfile.TemporaryDirectory() as td:
                wav = Path(td) / 'a.wav'
                mp3 = Path(td) / 'a.mp3'
                sf.write(wav, merged, SR, subtype='PCM_16')
                encode_mp3(wav, mp3)
                mp3.replace(final)
            generated += 1
        except Exception as exc:
            failed.append((row['hash'], row['text'], repr(exc)))

        if i % 50 == 0:
            print(i, '/', len(ROWS), 'generated', generated, 'reused', reused, 'failed', len(failed), 'device', device, flush=True)

    if failed:
        (ROOT / '_build/audio_failures.json').write_text(
            json.dumps(failed, ensure_ascii=False, indent=2), encoding='utf-8'
        )
    if len(failed) > 20:
        raise SystemExit(f'Too many audio failures: {len(failed)}')

    save_profile(voice)
    print({'generated': generated, 'reused': reused, 'failed': len(failed), 'voice': voice, 'device': device})


if __name__ == '__main__':
    main()
