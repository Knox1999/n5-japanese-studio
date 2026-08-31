#!/usr/bin/env python3
from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
src = ROOT / "_audio_cache"
out = ROOT / "public/audio"

if out.exists():
    shutil.rmtree(out)
out.mkdir(parents=True, exist_ok=True)

rows = json.loads((ROOT / "_build/audio_texts.json").read_text(encoding="utf-8"))
available = []

for row in rows:
    p = src / f"{row['hash']}.mp3"
    if p.exists() and p.stat().st_size > 1200:
        shutil.copy2(p, out / p.name)
        available.append(row["hash"])

profile = json.loads((src / "_voice_profile.json").read_text(encoding="utf-8"))

(out / "manifest.json").write_text(
    json.dumps(
        {
            "version": "v61-static-neural-1",
            "profile": profile,
            "extension": "mp3",
            "count": len(available),
            "hashes": available,
        },
        ensure_ascii=False,
        separators=(",", ":"),
    ),
    encoding="utf-8",
)

print("Published static neural MP3 clips:", len(available))
