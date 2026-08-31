#!/usr/bin/env python3
from pathlib import Path
import json, sys

ROOT=Path(__file__).resolve().parents[1]
audio=ROOT/"public/audio"
manifest=audio/"manifest.json"

errors=[]

if not manifest.exists():
    errors.append("public/audio/manifest.json missing")
else:
    data=json.loads(manifest.read_text(encoding="utf-8"))
    if data.get("extension")!="mp3":
        errors.append("audio manifest extension must be mp3")
    if "edge-tts" not in str(data.get("profile","")).lower():
        errors.append("Static neural edge-tts profile missing")
    if int(data.get("count") or 0)<3000:
        errors.append("Static audio manifest is missing too many clips")

mp3s=list(audio.glob("*.mp3"))
if not mp3s:
    errors.append("No MP3 files generated")

for p in mp3s:
    if p.stat().st_size<1200:
        errors.append(f"Too-small MP3: {p.name}")

if errors:
    for e in errors:
        print("FAIL",e)
    sys.exit(1)

print("PASS static neural audio QA",len(mp3s),"MP3 files")
