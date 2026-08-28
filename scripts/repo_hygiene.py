#!/usr/bin/env python3
from pathlib import Path
import shutil

ROOT=Path(__file__).resolve().parents[1]
legacy_root=ROOT/"docs"/"legacy-root"
legacy_releases=ROOT/"docs"/"legacy-releases"
legacy_root.mkdir(parents=True,exist_ok=True)
legacy_releases.mkdir(parents=True,exist_ok=True)

moves={
    ROOT/"index.html":legacy_root/"index-v44-single-file.html",
    ROOT/"sw.js":legacy_root/"sw-v44.js",
    ROOT/"manifest.webmanifest":legacy_root/"manifest-v44.webmanifest",
}
for src,dst in moves.items():
    if src.exists() and not dst.exists():
        shutil.move(str(src),str(dst))
        print("Archived",src.name,"->",dst.relative_to(ROOT))

for name in ["V51_INSTALL_BN.txt","V51_QA.txt","V52_INSTALL_BN.txt","V52_QA.txt"]:
    src=ROOT/name
    if src.exists():
        dst=legacy_releases/name
        if dst.exists(): src.unlink()
        else: shutil.move(str(src),str(dst))
        print("Moved legacy release note:",name)

readme=legacy_root/"README.md"
if not readme.exists():
    readme.write_text(
        "# Legacy root artifacts\n\n"
        "These files belonged to the old single-file/GitHub Pages build and are archived only for history. "
        "The production site is generated from the Next.js `app/` source and `public/` assets.\n",
        encoding="utf-8"
    )
