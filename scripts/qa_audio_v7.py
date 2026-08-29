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
    if data.get("extension")!="ogg":
        errors.append("audio manifest extension must be ogg")
    if "azure" not in str(data.get("profile","")).lower():
        errors.append("V7 Azure profile missing")

if list(audio.glob("*.mp3")):
    errors.append("MP3 files found in public/audio")

oggs=list(audio.glob("*.ogg"))
if not oggs:
    errors.append("No OGG files generated")

for p in oggs:
    if p.stat().st_size<800:
        errors.append(f"Too-small OGG: {p.name}")

if errors:
    for e in errors:
        print("FAIL",e)
    sys.exit(1)

print("PASS V7 audio QA",len(oggs),"OGG files")
