#!/usr/bin/env python3
from __future__ import annotations
import json, hashlib, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "source" / "data"
OUT = ROOT / "public" / "data"
LESSONS = OUT / "lessons"
OUT.mkdir(parents=True, exist_ok=True)
LESSONS.mkdir(parents=True, exist_ok=True)

studio = json.loads((SRC / "studio.json").read_text(encoding="utf-8"))
klc = json.loads((SRC / "klc-tree.json").read_text(encoding="utf-8"))
memory = json.loads((SRC / "klc-memory.json").read_text(encoding="utf-8"))
grammar_visual = json.loads((SRC / "grammar-visual.json").read_text(encoding="utf-8"))

vocab = studio.get("vocabulary") or []
lesson_content = ((studio.get("content") or {}).get("lessons") or {})
curated_kanji = studio.get("kanji") or []

if len(vocab) != 1011:
    raise SystemExit(f"Expected 1011 vocabulary rows, found {len(vocab)}")
if len(lesson_content) != 25:
    raise SystemExit(f"Expected 25 lessons, found {len(lesson_content)}")
if len(klc.get("nodes") or []) != 2300:
    raise SystemExit(f"Expected 2300 KLC nodes, found {len(klc.get('nodes') or [])}")
if len(grammar_visual.get("lessons") or {}) != 25:
    raise SystemExit("Expected 25 visual grammar lessons")

summary = []
search = []
for lesson in range(1, 26):
    rows = [x for x in vocab if int(x.get("lesson") or 0) == lesson]
    content = lesson_content.get(str(lesson)) or {}
    lesson_kanji = [x for x in curated_kanji if int(x.get("lesson") or 0) == lesson]
    payload = {
        "lesson": lesson,
        "title": content.get("title") or f"Lesson {lesson}",
        "scenario": content.get("scenario") or "",
        "vocabulary": rows,
        "content": content,
        "kanji": lesson_kanji,
    }
    (LESSONS / f"{lesson:02d}.json").write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    summary.append({
        "lesson": lesson,
        "title": payload["title"],
        "scenario": payload["scenario"],
        "count": len(rows),
        "kanji_count": len(lesson_kanji),
        "ids": [int(x.get("id") or 0) for x in rows],
    })
    for v in rows:
        search.append({
            "id": v.get("id"), "lesson": lesson,
            "j": v.get("japanese") or "", "k": v.get("kanji") or "",
            "bn": v.get("bangla_meaning") or "", "en": v.get("english_meaning") or "",
            "p": v.get("pronunciation_bn") or "", "t": v.get("word_type") or "",
        })

meta = {
    "version": "61",
    "source_version": studio.get("version"),
    "vocabulary_count": len(vocab),
    "lesson_count": 25,
    "klc_nodes": len(klc.get("nodes") or []),
    "klc_edges": len(klc.get("edges") or []),
    "lessons": summary,
}
(OUT / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
(OUT / "search-index.json").write_text(json.dumps(search, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
(OUT / "klc-tree.json").write_text(json.dumps(klc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
(OUT / "klc-memory.json").write_text(json.dumps(memory, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
(OUT / "grammar-visual.json").write_text(
    json.dumps(grammar_visual, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
)

h = hashlib.sha256()
for p in [SRC / "studio.json", SRC / "klc-tree.json", SRC / "klc-memory.json", SRC / "grammar-visual.json"]:
    h.update(p.read_bytes())
(OUT / "build.json").write_text(
    json.dumps({"version":"61","fingerprint":h.hexdigest()[:16]}, separators=(",", ":")), encoding="utf-8"
)
rules=sum(len(v.get("rules") or []) for v in (grammar_visual.get("lessons") or {}).values())
examples=sum(len(r.get("examples") or []) for v in (grammar_visual.get("lessons") or {}).values() for r in (v.get("rules") or []))
print(f"Built {len(summary)} lesson files, {len(search)} search records, {len(klc['nodes'])} KLC nodes, {rules} grammar rules, {examples} grammar examples")
