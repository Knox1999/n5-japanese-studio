#!/usr/bin/env python3
from __future__ import annotations
import csv, json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'source'/'klc'
OUT=ROOT/'source'/'data'/'klc-tree.json'
NODES=SRC/'KLC_Kanji_Tree_2300_IMPORT_READY.csv'
EDGES=SRC/'KLC_Kanji_Tree_EDGES.csv'

def clean(v):
    if v is None: return ''
    s=str(v).strip()
    return '' if s.lower()=='nan' else s

def num(v):
    s=clean(v)
    if not s:return None
    try:return int(float(s))
    except:return None

nodes=[]
with NODES.open(encoding='utf-8-sig',newline='') as f:
    for r in csv.DictReader(f):
        nodes.append([
            int(r['KLC_No']), clean(r['Kanji']), clean(r['Display_Meaning']), clean(r['Onyomi']), clean(r['Kunyomi']),
            clean(r['One_Level_Tree']), clean(r['Leaf_Components']), clean(r['Leaf_RAD_Components']),
            clean(r['KLC_Sequence_Status']), clean(r['Verification']), clean(r['Verification_Notes'])
        ])

edges=[]
with EDGES.open(encoding='utf-8-sig',newline='') as f:
    for r in csv.DictReader(f):
        edges.append([
            int(r['Parent_KLC_No']), int(r['Component_Position']), clean(r['Component_Character']),
            clean(r['Component_Meaning']), clean(r['Component_Type']), num(r['Component_KLC_No']), clean(r['Sequence_Relation'])
        ])

stats={
    'nodes':len(nodes),'edges':len(edges),
    'atomic_or_root':sum(1 for n in nodes if n[8]=='ATOMIC_OR_ROOT_RECORD'),
    'constructed':sum(1 for n in nodes if n[8]!='ATOMIC_OR_ROOT_RECORD'),
    'pass':sum(1 for n in nodes if n[9]=='PASS'),
    'pass_with_notes':sum(1 for n in nodes if n[9]=='PASS_WITH_NOTES'),
    'later_mnemonic_refs':sum(1 for e in edges if e[6]=='LATER_KLC_MNEMONIC_REF'),
    'klc_component_edges':sum(1 for e in edges if e[4]=='KLC'),
}
if len(nodes)!=2300: raise SystemExit(f'Expected 2300 KLC nodes, found {len(nodes)}')
if len(edges)!=4034: raise SystemExit(f'Expected 4034 KLC edges, found {len(edges)}')
OUT.write_text(json.dumps({'nodes':nodes,'edges':edges,'stats':stats},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(f'KLC CSV build PASS: {len(nodes)} nodes / {len(edges)} edges')
