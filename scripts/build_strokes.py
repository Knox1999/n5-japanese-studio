#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import shutil
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TREE = json.loads((ROOT / "source/data/klc-tree.json").read_text(encoding="utf-8"))
SOURCE = ROOT / "_kanjivg/kanji"
OUTPUT = ROOT / "public/assets/strokes"

SVG_NS = "http://www.w3.org/2000/svg"
ALLOWED_TAGS = {"svg", "g", "path"}
ALLOWED_ATTRIBUTES = {
    "viewBox", "id", "class", "d", "transform", "fill", "stroke",
    "stroke-width", "stroke-linecap", "stroke-linejoin", "fill-rule", "clip-rule",
}


def local_name(value: str) -> str:
    return value.rsplit("}", 1)[-1]


def sanitize_svg(source: Path, destination: Path) -> str:
    document = ET.parse(source)
    original = document.getroot()
    if local_name(original.tag) != "svg":
        raise ValueError(f"Unexpected SVG root in {source.name}")

    safe_root = ET.Element(
        f"{{{SVG_NS}}}svg",
        {"viewBox": original.attrib.get("viewBox", "0 0 109 109")},
    )

    def copy_children(parent: ET.Element, safe_parent: ET.Element) -> None:
        for child in list(parent):
            tag = local_name(child.tag)
            if tag not in ALLOWED_TAGS:
                continue
            attributes = {
                local_name(key): value
                for key, value in child.attrib.items()
                if local_name(key) in ALLOWED_ATTRIBUTES
            }
            safe_child = ET.SubElement(safe_parent, f"{{{SVG_NS}}}{tag}", attributes)
            copy_children(child, safe_child)

    copy_children(original, safe_root)
    if not list(safe_root.iter(f"{{{SVG_NS}}}path")):
        raise ValueError(f"No stroke path in {source.name}")

    ET.register_namespace("", SVG_NS)
    payload = ET.tostring(safe_root, encoding="utf-8", xml_declaration=True)
    destination.write_bytes(payload)
    return hashlib.sha256(payload).hexdigest()


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit("KanjiVG source directory is missing")
    OUTPUT.mkdir(parents=True, exist_ok=True)

    index: dict[str, str] = {}
    hashes: dict[str, str] = {}
    missing: list[str] = []
    for node in TREE.get("nodes") or []:
        if not isinstance(node, list) or len(node) < 2:
            continue
        character = str(node[1] or "").strip()
        if len(character) != 1:
            continue
        codepoint = ord(character)
        if not 0x3400 <= codepoint <= 0x9FFF:
            continue
        filename = f"{codepoint:05x}.svg"
        source = SOURCE / filename
        destination = OUTPUT / filename
        if not source.exists():
            missing.append(character)
            continue
        hashes[filename] = sanitize_svg(source, destination)
        index[character] = filename

    (OUTPUT / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    (OUTPUT / "sha256.json").write_text(
        json.dumps(hashes, ensure_ascii=False, sort_keys=True, separators=(",", ":")),
        encoding="utf-8",
    )

    license_file = ROOT / "_kanjivg/COPYING"
    if license_file.exists():
        shutil.copy2(license_file, OUTPUT / "KANJIVG_LICENSE.txt")
    (OUTPUT / "ATTRIBUTION.txt").write_text(
        "KanjiVG vector graphics — Ulrich Apel and contributors. CC BY-SA 3.0. "
        "https://github.com/KanjiVG/kanjivg\n",
        encoding="utf-8",
    )

    print("KanjiVG sanitized", len(index), "missing", len(missing))
    if len(index) < 1800:
        raise SystemExit("Too few sanitized KanjiVG assets")


if __name__ == "__main__":
    main()
