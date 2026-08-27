'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { GitBranch, Loader2, Play, Search, Sparkles, TreePine } from 'lucide-react';
import type { KLCMemory, KLCNodeRaw, KLCTree, LessonPayload } from '@/lib/types';
import { BASE, loadKLC } from '@/lib/data';
import { trackError } from '@/lib/analytics';

function nodeObj(n:KLCNodeRaw){return{no:n[0],kanji:n[1],meaning:n[2],onyomi:n[3],kunyomi:n[4],decomp:n[5],components:n[6],visual:n[7],kind:n[8],status:n[9],note:n[10]}}

function ComponentTree({node,edges}:{node:ReturnType<typeof nodeObj>;edges:any[]}){
 const parts=edges.slice(0,6); const w=640,h=250; const positions=parts.map((_:any,i:number)=>({x:70+i*(500/Math.max(1,parts.length-1)),y:58}));
 return <svg viewBox={`0 0 ${w} ${h}`} className="component-tree" role="img" aria-label={`Visual construction of ${node.kanji}`}>
   <defs><linearGradient id="treeNode" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fffdf9"/><stop offset="1" stopColor="#f6f1e8"/></linearGradient></defs>
   {positions.map((p,i)=><path key={`l${i}`} d={`M${p.x},92 C${p.x},145 320,132 320,174`} fill="none" stroke="#c9bbaa" strokeWidth="2" strokeDasharray="4 5"/>)}
   {parts.map((e:any,i:number)=><g key={i} transform={`translate(${positions[i].x-43} 28)`}><rect width="86" height="66" rx="17" fill="url(#treeNode)" stroke="#e3dbd0"/><text x="43" y="34" textAnchor="middle" fontSize="25" fill="#182c3d">{e[2]}</text><text x="43" y="53" textAnchor="middle" fontSize="8" fill="#788590">{String(e[3]||e[4]||'component').slice(0,12)}</text></g>)}
   <g transform="translate(265 166)"><rect width="110" height="70" rx="20" fill="#142f46"/><text x="55" y="45" textAnchor="middle" fontSize="35" fill="#fffdfa">{node.kanji}</text></g>
 </svg>
}

function StrokeOrder({kanji}:{kanji:string}){
 const host=useRef<HTMLDivElement>(null);const [available,setAvailable]=useState(false);const [loading,setLoading]=useState(true);const raw=useRef('');
 const draw=()=>{const el=host.current;if(!el||!raw.current)return;el.innerHTML=raw.current;const svg=el.querySelector('svg');if(svg){svg.removeAttribute('width');svg.removeAttribute('height');svg.setAttribute('viewBox',svg.getAttribute('viewBox')||'0 0 109 109');svg.setAttribute('aria-label',`${kanji} stroke order`)}const paths=[...el.querySelectorAll('path')];paths.forEach((p:any,i)=>{let len=300;try{len=p.getTotalLength()}catch{}p.style.strokeDasharray=String(len);p.style.strokeDashoffset=String(len);p.style.animation=`kanjiStroke .48s ${i*.34}s cubic-bezier(.4,0,.2,1) forwards`;});};
 useEffect(()=>{let dead=false;setLoading(true);setAvailable(false);(async()=>{try{const idx=await fetch(`${BASE}/assets/strokes/index.json`).then(r=>r.ok?r.json():{});const fn=idx[kanji];if(!fn)return;const text=await fetch(`${BASE}/assets/strokes/${fn}`).then(r=>r.ok?r.text():'');if(!text)return;raw.current=text;if(!dead){setAvailable(true);setTimeout(draw,30)}}catch(e){trackError('resource',e)}finally{if(!dead)setLoading(false)}})();return()=>{dead=true}},[kanji]);
 if(loading)return <div className="stroke-empty"><Loader2 className="animate-spin"/> Loading stroke vector…</div>;
 if(!available)return <div className="stroke-empty"><Sparkles/> Stroke-order SVG will appear after the GitHub Actions KanjiVG build.</div>;
 return <div className="stroke-studio"><div ref={host} className="stroke-svg"/><button className="premium-btn premium-btn-secondary" onClick={draw}><Play size={15}/> Replay strokes</button></div>
}

export default function KanjiExplorer({data}:{data:LessonPayload}){
 const [tree,setTree]=useState<KLCTree|null>(null);const [memory,setMemory]=useState<KLCMemory>({});const [query,setQuery]=useState('');const [selected,setSelected]=useState<number>(0);const [limit,setLimit]=useState(80);
 useEffect(()=>{let dead=false;loadKLC().then(([t,m])=>{if(dead)return;setTree(t);setMemory(m);const lessonFirst=data.kanji[0]?.character;const found=t.nodes.find(n=>n[1]===lessonFirst);setSelected(found?.[0]||1)}).catch(e=>trackError('resource',e));return()=>{dead=true}},[data.lesson]);
 const nodes=tree?.nodes||[];const byNo=useMemo(()=>new Map(nodes.map(n=>[n[0],n])),[nodes]);const selectedRaw=byNo.get(selected)||nodes[0];const node=selectedRaw?nodeObj(selectedRaw):null;const edges=useMemo(()=>tree?.edges.filter(e=>e[0]===selected)||[],[tree,selected]);
 const results=useMemo(()=>{const q=query.trim().toLowerCase();if(!q)return nodes;return nodes.filter(n=>[n[1],n[2],n[3],n[4],n[5],String(n[0])].some(x=>String(x||'').toLowerCase().includes(q)))},[nodes,query]);
 if(!tree||!node)return <div className="kanji-loading"><Loader2 className="animate-spin"/><b>Loading 2,300-character KLC visual graph…</b></div>;
 const mem=memory[String(node.no)]||['','',[]];
 return <div className="space-y-5 pb-8"><section className="study-header tone-kanji"><div><div className="section-kicker">KLC Visual Kanji Studio</div><h1>2,300 Kanji · {tree.edges.length.toLocaleString()} relationships</h1><p className="font-bn">Visual construction ≠ historical etymology. এটি recognition ও memory system.</p></div><TreePine className="header-big-icon"/></section>
   {data.kanji.length>0&&<section className="lesson-kanji-strip"><div><span className="section-kicker">Current lesson kanji</span><b>Lesson {String(data.lesson).padStart(2,'0')}</b></div><div className="kanji-chip-scroll">{data.kanji.map(k=><button key={k.character} onClick={()=>{const found=nodes.find(n=>n[1]===k.character);if(found)setSelected(found[0])}}><span>{k.character}</span><small className="font-bn">{k.meaning}</small></button>)}</div></section>}
   <div className="kanji-layout"><aside className="kanji-browser"><label className="search-field"><Search size={17}/><input value={query} onChange={e=>{setQuery(e.target.value);setLimit(80)}} placeholder="Kanji / KLC no / meaning / reading…"/></label><div className="kanji-result-grid">{results.slice(0,limit).map(n=><button key={n[0]} className={n[0]===selected?'active':''} onClick={()=>setSelected(n[0])}><span>{n[1]}</span><small>#{n[0]}</small></button>)}</div>{limit<results.length&&<button className="premium-btn premium-btn-secondary w-full" onClick={()=>setLimit(x=>x+80)}>Load more</button>}</aside>
     <main className="kanji-detail"><motion.article key={node.no} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="kanji-identity"><div className="kanji-glyph">{node.kanji}</div><div><span className="section-kicker">KLC #{node.no}</span><h2>{node.meaning}</h2>{mem[0]&&<p className="font-bn text-lg font-bold text-sakura">{mem[0]}</p>}<div className="reading-pills"><span>音 {node.onyomi||'—'}</span><span>訓 {node.kunyomi||'—'}</span></div></div></motion.article>
       <section className="premium-panel"><div className="section-kicker">Visual construction</div><h2 className="section-title">Component map</h2><ComponentTree node={node} edges={edges}/><div className="decomp-line font-jp"><GitBranch size={17}/>{node.decomp||node.kanji}</div>{mem[1]&&<div className="memory-story font-bn"><b>Memory story</b><p>{mem[1]}</p></div>}</section>
       <section className="premium-panel"><div className="section-kicker">Stroke order</div><h2 className="section-title">Animated KanjiVG studio</h2><StrokeOrder kanji={node.kanji}/></section>
     </main>
   </div>
 </div>
}
