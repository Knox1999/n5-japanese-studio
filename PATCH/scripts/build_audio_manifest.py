#!/usr/bin/env python3
from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
src = ROOT / "_audio_cache_v7"
out = ROOT / "public/audio"

if out.exists():
    shutil.rmtree(out)
out.mkdir(parents=True, exist_ok=True)
(out / "dialogue").mkdir(exist_ok=True)

rows = json.loads((ROOT / "_build/audio_texts.json").read_text(encoding="utf-8"))
available = []

for row in rows:
    p = src / f"{row['hash']}.ogg"
    if p.exists() and p.stat().st_size > 800:
        shutil.copy2(p, out / p.name)
        available.append(row["hash"])

dialogue_tracks = []
for p in sorted((src / "dialogue").glob("lesson-*.ogg")):
    if p.stat().st_size > 800:
        shutil.copy2(p, out / "dialogue" / p.name)
        dialogue_tracks.append(p.stem)

profile = json.loads((src / "_voice_profile.json").read_text(encoding="utf-8"))

(out / "manifest.json").write_text(
    json.dumps(
        {
            "version": "v7",
            "profile": profile,
            "extension": "ogg",
            "count": len(available),
            "hashes": available,
            "dialogue_tracks": dialogue_tracks,
        },
        ensure_ascii=False,
        separators=(",", ":"),
    ),
    encoding="utf-8",
)

print("Published V7 OGG/Opus clips:", len(available), "dialogue tracks:", len(dialogue_tracks))
