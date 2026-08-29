#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / "source/data/studio.json").read_text(encoding="utf-8"))
grammar = json.loads((ROOT / "source/data/grammar-visual.json").read_text(encoding="utf-8"))

PROFILE_VERSION = "v7-azure-ja-natural-opus-1"
VALID_ROLES = {"default", "male", "female"}
items: dict[str, dict] = {}

JP = r"\u3040-\u30ff\u3400-\u9fff々〆ヵヶ"

def display_norm(text: object) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", str(text or ""))).strip()

def speech_norm(text: object) -> str:
    s = unicodedata.normalize("NFC", str(text or "")).strip()

    # Learning UI spacing is valuable on screen but harmful to Japanese TTS.
    s = re.sub(fr"(?<=[{JP}])\s+(?=[{JP}])", "", s)

    # Remove quote marks from speech input.
    s = re.sub(r"[「」『』“”\"']", "", s)

    # Pedagogical syllable segmentation: りょ・こ・う -> りょこう
    s = re.sub(fr"(?<=[{JP}])・(?=[{JP}])", "", s)

    # Internal hard sentence stops often create an exaggerated pause in short dialogue.
    # Keep the final sentence stop, soften only internal stops.
    s = re.sub(r"。(?=.)", "、", s)

    # Normalize duplicated punctuation.
    s = re.sub(r"、{2,}", "、", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def logical_hash(text: str, voice_role: str) -> str:
    raw = text if voice_role == "default" else f"{voice_role}|{text}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()

def add(text, lesson=0, kind="misc", voice_role="default"):
    display = display_norm(text)
    if not display:
        return
    voice_role = voice_role if voice_role in VALID_ROLES else "default"
    key = logical_hash(display, voice_role)
    row = items.setdefault(
        key,
        {
            "hash": key,
            "profile": PROFILE_VERSION,
            "text": display,
            "speech_text": speech_norm(display),
            "voice_role": voice_role,
            "lessons": [],
            "kinds": [],
        },
    )
    if lesson and lesson not in row["lessons"]:
        row["lessons"].append(int(lesson))
    if kind not in row["kinds"]:
        row["kinds"].append(kind)

for v in data.get("vocabulary", []):
    L = int(v.get("lesson") or 0)
    add(v.get("tts_text") or v.get("japanese"), L, "vocab")
    add(v.get("spelling_text"), L, "spelling")
    ex = v.get("example") or {}
    add(ex.get("jp") or ex.get("japanese"), L, "sentence")

lessons = ((data.get("content") or {}).get("lessons") or {})
for k, lesson in lessons.items():
    ln = int(k)

    for name in ("dialogue", "dialogue_extended"):
        turns = lesson.get(name) or []
        speakers = []
        for turn in turns:
            if isinstance(turn, list) and len(turn) > 1 and turn[0] not in speakers:
                speakers.append(turn[0])
        voice_map = {s: ("male" if i % 2 == 0 else "female") for i, s in enumerate(speakers)}
        for turn in turns:
            if isinstance(turn, list) and len(turn) > 1:
                add(turn[1], ln, "conversation", voice_map.get(turn[0], "default"))

    for name in ("reading", "reading_extended"):
        add(lesson.get(name), ln, "reading_full")

    for x in lesson.get("shadowing_chunks") or []:
        add(x, ln, "shadow", "female")

    for x in lesson.get("reading_extra_pairs") or []:
        if isinstance(x, list) and x:
            add(x[0], ln, "reading_sentence")

    for x in lesson.get("grammar") or []:
        if isinstance(x, list) and len(x) > 2:
            add(x[2], ln, "grammar")

for k, lesson in (grammar.get("lessons") or {}).items():
    ln = int(k)
    for rule in lesson.get("rules") or []:
        for example in rule.get("examples") or []:
            add(example.get("jp"), ln, "grammar_visual")

build = ROOT / "_build"
build.mkdir(exist_ok=True)

rows = sorted(items.values(), key=lambda x: x["hash"])
(build / "audio_texts.json").write_text(
    json.dumps(rows, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

print(
    "Unique audio clips:",
    len(rows),
    "role-specific:",
    sum(1 for r in rows if r["voice_role"] != "default"),
)
