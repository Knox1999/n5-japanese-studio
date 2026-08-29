#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import os
from pathlib import Path
import shutil
import subprocess
import sys

PACKAGE=Path(__file__).resolve().parent
PATCH=PACKAGE/"PATCH"
MARK_START="/* FINAL_PRODUCTION_NEO_TORII */"
MARK_END="/* END_FINAL_PRODUCTION_NEO_TORII */"

def run(cmd,cwd,check=True):
    print("+"," ".join(cmd))
    return subprocess.run(cmd,cwd=cwd,check=check,text=True)

def ensure_repo(repo:Path):
    required=[
        repo/"package.json",
        repo/"components/StudioApp.tsx",
        repo/"styles/v60-ultimate.scss",
        repo/".git",
    ]
    missing=[str(x) for x in required if not x.exists()]
    if missing:
        raise SystemExit("Not the expected n5-japanese-studio repo. Missing: "+", ".join(missing))

def backup_and_copy(src:Path,dst:Path,backup_root:Path):
    rel=dst.relative_to(repo_root)
    if dst.exists():
        b=backup_root/rel
        b.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(dst,b)
    dst.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(src,dst)

def patch_v60(repo:Path,backup_root:Path):
    target=repo/"styles/v60-ultimate.scss"
    backup=backup_root/"styles/v60-ultimate.scss"
    backup.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(target,backup)

    text=target.read_text(encoding="utf-8")
    if MARK_START in text and MARK_END in text:
        before=text.split(MARK_START,1)[0].rstrip()
        after=text.split(MARK_END,1)[1].lstrip()
        text=before+"\n\n"+after

    block=(PATCH/"styles/_FINAL_V60_BLOCK.scss").read_text(encoding="utf-8").strip()
    target.write_text(text.rstrip()+"\n\n"+block+"\n",encoding="utf-8")

def main():
    global repo_root
    ap=argparse.ArgumentParser()
    ap.add_argument("--repo",default=".",help="Path to n5-japanese-studio")
    ap.add_argument("--push",action="store_true",help="Commit and push after validation")
    ap.add_argument("--skip-build",action="store_true")
    args=ap.parse_args()

    repo_root=Path(args.repo).expanduser().resolve()
    ensure_repo(repo_root)

    stamp=dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_root=repo_root/f".final-production-backup-{stamp}"
    backup_root.mkdir(parents=True,exist_ok=True)

    for src in PATCH.rglob("*"):
        if not src.is_file():
            continue
        rel=src.relative_to(PATCH)
        if rel.as_posix()=="styles/_FINAL_V60_BLOCK.scss":
            continue
        dst=repo_root/rel
        backup_and_copy(src,dst,backup_root)

    patch_v60(repo_root,backup_root)

    print("\nApplied final production files.")
    print("Backup:",backup_root)

    # Fast checks that do not require downloading dependencies.
    run([sys.executable,"scripts/qa_production.py","--prebuild"],repo_root)

    if not args.skip_build:
        # Use existing node_modules when available; otherwise npm ci will install.
        if not (repo_root/"node_modules").exists():
            run(["npm","ci","--no-audit","--no-fund"],repo_root)
        run(["npm","run","lint:types"],repo_root)

        # Local build does not have GitHub Azure secrets by default.
        # Next build itself can still validate the frontend; workflow generates audio in CI.
        run(["npm","run","build"],repo_root)

    if args.push:
        # Refuse to push if GitHub Action secrets cannot be checked locally.
        print("\nIMPORTANT: Ensure AZURE_SPEECH_KEY and AZURE_SPEECH_REGION are configured in GitHub Actions.")
        run(["git","add","-A"],repo_root)
        status=subprocess.run(["git","status","--porcelain"],cwd=repo_root,text=True,capture_output=True,check=True).stdout
        if not status.strip():
            print("No changes to commit.")
            return
        run(["git","commit","-m","feat: publish approved final production redesign"],repo_root)
        run(["git","push","origin","main"],repo_root)
        print("\nPushed. GitHub Pages workflow should start automatically.")
    else:
        print("\nValidation complete. To commit/push:")
        print("  git add -A")
        print('  git commit -m "feat: publish approved final production redesign"')
        print("  git push origin main")

if __name__=="__main__":
    main()
