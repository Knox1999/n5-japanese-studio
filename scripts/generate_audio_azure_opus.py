#!/usr/bin/env python3
from __future__ import annotations

import html
import json
import os
import re
import time
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ROWS = json.loads((ROOT / "_build/audio_texts.json").read_text(encoding="utf-8"))
STUDIO = json.loads((ROOT / "source/data/studio.json").read_text(encoding="utf-8"))

OUT = ROOT / "_audio_cache_v7"
OUT.mkdir(exist_ok=True)
(OUT / "dialogue").mkdir(exist_ok=True)

PROFILE_VERSION = "v7-azure-ja-natural-opus-2"

KEY = os.getenv("AZURE_SPEECH_KEY", "").strip()
REGION = os.getenv("AZURE_SPEECH_REGION", "").strip()

if not KEY or not REGION:
    raise SystemExit(
        "Azure Speech credentials are required. "
        "Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in GitHub Actions secrets."
    )

ENDPOINT = f"https://{REGION}.tts.speech.microsoft.com/cognitiveservices/v1"
OUTPUT_FORMAT = "ogg-48khz-16bit-mono-opus"

VOICES = {
    "male": "ja-JP-KeitaNeural",
    "female": "ja-JP-NanamiNeural",
    "default": "ja-JP-NanamiNeural",
}

JP = r"\u3040-\u30ff\u3400-\u9fff々〆ヵヶ"

def speech_norm(text: object) -> str:
    s = unicodedata.normalize("NFC", str(text or "")).strip()
    s = re.sub(fr"(?<=[{JP}])\s+(?=[{JP}])", "", s)
    s = re.sub(r"[「」『』“”\"']", "", s)
    s = re.sub(fr"(?<=[{JP}])・(?=[{JP}])", "", s)
    s = re.sub(r"。(?=.)", "、", s)
    s = re.sub(r"、{2,}", "、", s)
    return s.strip()

def role_body(text: str, role: str, kinds: set[str]) -> str:
    safe = html.escape(text)
    if role == "female" and "conversation" in kinds:
        return f'<mstts:express-as style="chat" styledegree="1.0">{safe}</mstts:express-as>'
    return safe

def voice_block(text: str, role: str, kinds: set[str]) -> str:
    voice = VOICES.get(role, VOICES["default"])
    # Explicit small punctuation pauses prevent the service from choosing a long,
    # unnatural break for short learner dialogue.
    silence = (
        '<mstts:silence type="comma-exact" value="60ms"/>'
        '<mstts:silence type="Sentenceboundary" value="140ms"/>'
    )
    return f'<voice name="{voice}">{silence}{role_body(text, role, kinds)}</voice>'

def wrap_ssml(body: str) -> str:
    return (
        '<speak version="1.0" '
        'xmlns="http://www.w3.org/2001/10/synthesis" '
        'xmlns:mstts="https://www.w3.org/2001/mstts" '
        'xml:lang="ja-JP">'
        f"{body}</speak>"
    )

def ssml_for(row: dict) -> str:
    role = str(row.get("voice_role") or "default")
    kinds = set(row.get("kinds") or [])
    text = str(row.get("speech_text") or row.get("text") or "")
    return wrap_ssml(voice_block(text, role, kinds))

def dialogue_ssml(turns: list) -> str:
    speakers: list[str] = []
    for turn in turns:
        if isinstance(turn, list) and len(turn) > 1 and turn[0] not in speakers:
            speakers.append(turn[0])
    voice_map = {s: ("male" if i % 2 == 0 else "female") for i, s in enumerate(speakers)}

    blocks: list[str] = []
    valid = [t for t in turns if isinstance(t, list) and len(t) > 1 and t[1]]
    for i, turn in enumerate(valid):
        role = voice_map.get(turn[0], "default")
        text = speech_norm(turn[1])
        blocks.append(voice_block(text, role, {"conversation"}))
        if i < len(valid) - 1:
            blocks.append('<break time="90ms"/>')
    return wrap_ssml("".join(blocks))

def synthesize_ssml(ssml: str, dst: Path) -> None:
    req = urllib.request.Request(
        ENDPOINT,
        data=ssml.encode("utf-8"),
        method="POST",
        headers={
            "Ocp-Apim-Subscription-Key": KEY,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": OUTPUT_FORMAT,
            "User-Agent": "The-Nihongo-Vibes-V7",
        },
    )
    with urllib.request.urlopen(req, timeout=90) as res:
        payload = res.read()
    if len(payload) < 800:
        raise RuntimeError("Azure Speech returned an empty/short audio payload")
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(payload)

def retry_synthesis(ssml: str, dst: Path) -> None:
    for attempt in range(1, 4):
        try:
            synthesize_ssml(ssml, dst)
            return
        except (urllib.error.URLError, TimeoutError, RuntimeError):
            if attempt >= 3:
                raise
            time.sleep(1.0 + attempt * 0.7)

generated = reused = failed = 0
failures = []

# Individual clips for vocabulary, line replay, roleplay, reading and shadowing.
for i, row in enumerate(ROWS, 1):
    dst = OUT / f"{row['hash']}.ogg"
    if dst.exists() and dst.stat().st_size > 800:
        reused += 1
        continue
    try:
        retry_synthesis(ssml_for(row), dst)
        generated += 1
    except Exception as exc:
        failed += 1
        failures.append({
            "kind": "clip",
            "hash": row.get("hash"),
            "text": row.get("text"),
            "speech_text": row.get("speech_text"),
            "role": row.get("voice_role"),
            "error": repr(exc),
        })
    if i % 100 == 0:
        print(i, "/", len(ROWS), "generated", generated, "reused", reused, "failed", failed)

# Full lesson dialogues generated as ONE multi-voice SSML request.
dialogue_tracks = []
lessons = ((STUDIO.get("content") or {}).get("lessons") or {})
for lesson_key, lesson in lessons.items():
    lesson_no = int(lesson_key)
    turns = lesson.get("dialogue_extended") or lesson.get("dialogue") or []
    turns = [t for t in turns if isinstance(t, list) and len(t) > 1 and t[1]]
    if not turns:
        continue
    dst = OUT / "dialogue" / f"lesson-{lesson_no:02d}.ogg"
    try:
        if not (dst.exists() and dst.stat().st_size > 800):
            retry_synthesis(dialogue_ssml(turns), dst)
        dialogue_tracks.append(lesson_no)
    except Exception as exc:
        failed += 1
        failures.append({
            "kind": "dialogue_track",
            "lesson": lesson_no,
            "error": repr(exc),
        })

profile = {
    "version": PROFILE_VERSION,
    "engine": "Azure Speech REST",
    "format": OUTPUT_FORMAT,
    "voices": VOICES,
    "female_conversation_style": "chat",
    "comma_pause_ms": 60,
    "sentence_boundary_ms": 140,
    "speaker_transition_ms": 90,
    "speech_text_separated_from_display_text": True,
    "full_dialogue_multi_voice_ssml": True,
    "dialogue_tracks": dialogue_tracks,
}
(OUT / "_voice_profile.json").write_text(
    json.dumps(profile, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

build = ROOT / "_build"
if failures:
    (build / "audio_failures_v7.json").write_text(
        json.dumps(failures, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

if failed:
    raise SystemExit(f"V7 audio generation failed for {failed} outputs.")

print({
    "generated": generated,
    "reused": reused,
    "failed": failed,
    "dialogue_tracks": len(dialogue_tracks),
    "profile": profile,
})
