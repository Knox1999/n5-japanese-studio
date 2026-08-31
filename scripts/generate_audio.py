#!/usr/bin/env python3
"""Generate young-adult, natural Japanese neural audio for V57.

V57 replaces the previous local Kokoro profile with Microsoft Japanese neural
voices accessed through edge-tts. The goal is a conversational young-adult
presentation rather than an obviously synthetic/character voice.

Profiles:
- default: warm neutral Japanese voice used by vocabulary/grammar/reading
- female: dialogue/shadowing female speaker
- male: dialogue male speaker

The UI hashes male/female dialogue separately, so identical text can exist with
both voices without collisions.
"""
from __future__ import annotations

import asyncio
import json
import os
import random
import subprocess
import tempfile
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
ROWS = json.loads((ROOT / "_build/audio_texts.json").read_text(encoding="utf-8"))
OUT = ROOT / "_audio_cache"
OUT.mkdir(exist_ok=True)
PROFILE_FILE = OUT / "_voice_profile.json"
PROFILE_VERSION = "v57-edge-ja-youngadult-2"
CONCURRENCY = max(1, min(6, int(os.getenv("N5_TTS_CONCURRENCY", "4"))))

PREFERRED = {
    "default": [
        "ja-JP-NanamiNeural",
        "ja-JP-AoiNeural",
        "ja-JP-ShioriNeural",
        "ja-JP-MayuNeural",
    ],
    "female": [
        "ja-JP-NanamiNeural",
        "ja-JP-ShioriNeural",
        "ja-JP-AoiNeural",
        "ja-JP-MayuNeural",
    ],
    "male": [
        "ja-JP-KeitaNeural",
        "ja-JP-NaokiNeural",
        "ja-JP-DaichiNeural",
    ],
}


def prosody(row: dict, role: str) -> tuple[str, str, str]:
    """Small prosody adjustments only; avoid cartoonish pitch changes."""
    text = str(row.get("text") or "").strip()
    kinds = set(row.get("kinds") or [])

    # Stay close to the voice model's native cadence; heavy slowing sounds synthetic.
    rate = 0
    if "shadow" in kinds:
        rate -= 4
    elif "conversation" in kinds:
        rate += 0
    elif "vocab" in kinds and len(text) <= 10:
        rate -= 2
    elif "reading_full" in kinds:
        rate -= 1

    if text.endswith(("？", "?")):
        rate -= 1
    elif text.endswith(("！", "!")):
        rate += 1
    if "…" in text or "〜" in text or "～" in text:
        rate -= 2

    rate = max(-10, min(2, rate))
    pitch = -1 if role == "male" else 0
    volume = 0
    return f"{rate:+d}%", f"{pitch:+d}Hz", f"{volume:+d}%"


async def available_voices() -> set[str]:
    try:
        voices = await edge_tts.list_voices()
        return {str(v.get("ShortName") or "") for v in voices}
    except Exception as exc:
        print("Voice list lookup failed; using preferred names directly:", repr(exc), flush=True)
        return set()


def choose_voice(role: str, available: set[str]) -> str:
    choices = PREFERRED.get(role) or PREFERRED["default"]
    if available:
        for voice in choices:
            if voice in available:
                return voice
    return choices[0]


def normalize_mp3(src: Path, dst: Path) -> None:
    subprocess.run(
        [
            "ffmpeg", "-loglevel", "error", "-y", "-i", str(src),
            "-af", "highpass=f=45,lowpass=f=12000,loudnorm=I=-17:TP=-1.3:LRA=8",
            "-ac", "1", "-ar", "24000", "-codec:a", "libmp3lame", "-b:a", "96k", str(dst),
        ],
        check=True,
    )


async def synth_one(row: dict, voices: dict[str, str], semaphore: asyncio.Semaphore) -> tuple[str, str | None]:
    final = OUT / f"{row['hash']}.mp3"
    if final.exists() and final.stat().st_size > 1200:
        return "reused", None

    role = str(row.get("voice_role") or "default")
    if role not in {"default", "male", "female"}:
        role = "default"
    voice = voices[role]
    rate, pitch, volume = prosody(row, role)

    async with semaphore:
        for attempt in range(1, 5):
            try:
                with tempfile.TemporaryDirectory() as td:
                    raw = Path(td) / "raw.mp3"
                    fixed = Path(td) / "fixed.mp3"
                    communicator = edge_tts.Communicate(
                        text=str(row.get("speech_text") or row["text"]),
                        voice=voice,
                        rate=rate,
                        pitch=pitch,
                        volume=volume,
                    )
                    await communicator.save(str(raw))
                    if not raw.exists() or raw.stat().st_size < 800:
                        raise RuntimeError("edge-tts returned an empty/short audio file")
                    normalize_mp3(raw, fixed)
                    fixed.replace(final)
                return "generated", None
            except Exception as exc:
                if attempt >= 4:
                    return "failed", repr(exc)
                await asyncio.sleep((1.1 ** attempt) + random.random() * 0.7)
    return "failed", "unexpected synthesis exit"


async def main_async() -> None:
    available = await available_voices()
    voices = {role: choose_voice(role, available) for role in ("default", "female", "male")}
    profile = {
        "version": PROFILE_VERSION,
        "engine": "edge-tts",
        "voices": voices,
        "concurrency": CONCURRENCY,
        "intent": "natural young-adult conversational Japanese",
    }
    PROFILE_FILE.write_text(json.dumps(profile, ensure_ascii=False, indent=2), encoding="utf-8")
    print("V57 voice profile:", profile, flush=True)

    semaphore = asyncio.Semaphore(CONCURRENCY)
    generated = reused = 0
    failures: list[dict] = []

    # Small batches avoid opening thousands of sockets simultaneously.
    batch_size = max(CONCURRENCY * 4, 12)
    for start in range(0, len(ROWS), batch_size):
        batch = ROWS[start:start + batch_size]
        results = await asyncio.gather(*(synth_one(row, voices, semaphore) for row in batch))
        for row, (status, error) in zip(batch, results):
            if status == "generated":
                generated += 1
            elif status == "reused":
                reused += 1
            else:
                failures.append({
                    "hash": row.get("hash"),
                    "text": row.get("text"),
                    "voice_role": row.get("voice_role"),
                    "error": error,
                })
        done = min(len(ROWS), start + len(batch))
        print(done, "/", len(ROWS), "generated", generated, "reused", reused, "failed", len(failures), flush=True)

    build = ROOT / "_build"
    build.mkdir(exist_ok=True)
    if failures:
        (build / "audio_failures.json").write_text(json.dumps(failures, ensure_ascii=False, indent=2), encoding="utf-8")

    # Keep deployment usable if a handful of remote TTS requests fail; browser fallback handles them.
    max_failures = max(20, int(len(ROWS) * 0.03))
    if len(failures) > max_failures:
        raise SystemExit(f"Too many V57 neural TTS failures: {len(failures)} > {max_failures}")

    print({"generated": generated, "reused": reused, "failed": len(failures), "voices": voices})


if __name__ == "__main__":
    asyncio.run(main_async())
