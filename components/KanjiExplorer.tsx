'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronRight, Loader2, Play, Search, Sparkles, TreePine } from 'lucide-react';
import type { KLCMemory, KLCNodeRaw, KLCTree, LessonPayload } from '@/lib/types';
import { BASE, loadKLC } from '@/lib/data';
import { trackError } from '@/lib/analytics';
import { useLanguage } from '@/lib/language';

type Edge=[number,number,string,string,string,number|null,string];
const nodeObj=(n:KLCNodeRaw)=>({no:n[0],kanji:n[1],meaning:n[2],onyomi:n[3],kunyomi:n[4],oneLevel:n[5],leaf:n[6],leafRad:n[7],status:n[8],verification:n[9],note:n[10]});
const splitTokens=(s:string)=>String(s||'').split(/[+,、，\s]+/).map(x=>x.trim()).filter(Boolean);
const typeLabel=(s:string)=>({KLC:'KLC Kanji',RAD:'Radical / Primitive',SUP:'Supplemental',OTR:'Other'} as Record<string,string>)[s]||s;
const relationLabel=(s:string)=>({PRIMITIVE_OR_NONKLC:'Primitive / non-KLC',EARLIER_OR_SAME_KLC:'Earlier / same KLC',LATER_KLC_MNEMONIC_REF:'Later mnemonic reference'} as Record<string,string>)[s]||s;

function safeStrokeSvg(raw:string):SVGSVGElement|null {
  const doc=new DOMParser().parseFromString(raw,'image/svg+xml');
  if(doc.querySelector('parsererror')) return null;
  const source=doc.documentElement;
  if(source.localName!=='svg') return null;

  const allowedElements=new Set(['svg','g','path']);
  const allowedAttributes=new Set([
    'viewBox','id','class','d','transform','fill','stroke','stroke-width',
    'stroke-linecap','stroke-linejoin','fill-rule','clip-rule'
  ]);
  for(const element of [...source.querySelectorAll('*')]){
    if(!allowedElements.has(element.localName)){
      element.remove();
      continue;
    }
    for(const attribute of [...element.attributes]){
      if(!allowedAttributes.has(attribute.name)) element.removeAttribute(attribute.name);
    }
  }
  for(const attribute of [...source.attributes]){
    if(!allowedAttributes.has(attribute.name) && attribute.name!=='xmlns') source.removeAttribute(attribute.name);
  }
  return document.importNode(source,true) as unknown as SVGSVGElement;
}

function StrokeOrder({kanji}:{kanji:string}){
  const {text:label}=useLanguage();
  const host=useRef<HTMLDivElement>(null),raw=useRef('');
  const [available,setAvailable]=useState(false),[loading,setLoading]=useState(true);
  const draw=()=>{
    const el=host.current;
    if(!el||!raw.current) return;
    const svg=safeStrokeSvg(raw.current);
    if(!svg) return;
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.setAttribute('viewBox',svg.getAttribute('viewBox')||'0 0 109 109');
    el.replaceChildren(svg);
    const paths=[...svg.querySelectorAll('path')];
    paths.forEach((path,i)=>{
      let length=300;
      try{length=path.getTotalLength()}catch{}
      path.style.strokeDasharray=String(length);
      path.style.strokeDashoffset=String(length);
      path.style.animation=`kanjiStroke .48s ${i*.34}s cubic-bezier(.4,0,.2,1) forwards`;
    });
  };
  useEffect(()=>{
    let dead=false;
    setLoading(true);
    setAvailable(false);
    (async()=>{
      try{
        const idx:Record<string,string>=await fetch(`${BASE}/assets/strokes/index.json`).then(async response=>response.ok?((await response.json()) as Record<string,string>):({}));
        const filename=idx[kanji];
        if(!filename) return;
        const text=await fetch(`${BASE}/assets/strokes/${filename}`).then(response=>response.ok?response.text():'');
        if(!text||!safeStrokeSvg(text)) return;
        raw.current=text;
        if(!dead){setAvailable(true);setTimeout(draw,30)}
      }catch(error){trackError('resource',error)}
      finally{if(!dead)setLoading(false)}
    })();
    return()=>{dead=true};
  },[kanji]);
  if(loading) return <div className="stroke-empty"><Loader2 className="animate-spin"/> {label('স্ট্রোক ভেক্টর লোড হচ্ছে…','Loading stroke vector…')}</div>;
  if(!available) return <div className="stroke-empty"><Sparkles/> {label('এই অক্ষরের জন্য stroke-order SVG নেই।','Stroke-order SVG unavailable for this character.')}</div>;
  return <div className="stroke-studio"><div ref={host} className="stroke-svg"/><button className="premium-btn premium-btn-secondary" onClick={draw}><Play size={15}/> {label('আবার দেখুন','Replay strokes')}</button></div>;
}

function RecursiveNode({no,depth,maxDepth,byNo,byParent,onOpen,seen=new Set<number>()}:{no:number;depth:number;maxDepth:number;byNo:Map<number,KLCNodeRaw>;byParent:Map<number,Edge[]>;onOpen:(n:number)=>void;seen?:Set<number>}){const raw=byNo.get(no);if(!raw)return null;const n=nodeObj(raw);const cyc=seen.has(no);const next=new Set(seen);next.add(no);const edges=(byParent.get(no)||[]).slice().sort((a,b)=>a[1]-b[1]);return <div className={`recursive-node depth-${Math.min(depth,4)}`}><button className="tree-root-card" onClick={()=>onOpen(no)}><span className="font-jp">{n.kanji}</span><div><b>KLC {n.no}</b><small>{n.meaning}</small></div></button>{!cyc&&depth<maxDepth&&edges.length>0&&<div className="tree-children">{edges.map((e,i)=>{const child=e[5];const recurse=e[4]==='KLC'&&child&&e[6]!=='LATER_KLC_MNEMONIC_REF';return <div className={`tree-child ${e[6]==='LATER_KLC_MNEMONIC_REF'?'later-ref':''}`} key={`${e[0]}-${e[1]}-${i}`}><span className="tree-rail"/><button className={`tree-leaf-card ${child?'clickable':''}`} onClick={()=>child&&onOpen(child)}><span className="font-jp">{e[2]}</span><div><b>{e[3]||'component'}</b><small>{typeLabel(e[4])} · {relationLabel(e[6])}</small></div></button>{recurse&&<RecursiveNode no={child as number} depth={depth+1} maxDepth={maxDepth} byNo={byNo} byParent={byParent} onOpen={onOpen} seen={next}/>}</div>})}</div>}</div>}

export default function KanjiExplorer({data}:{data:LessonPayload}){
 const {language,text}=useLanguage();
 const [tree,setTree]=useState<KLCTree|null>(null),[memory,setMemory]=useState<KLCMemory>({}),[query,setQuery]=useState(''),[selected,setSelected]=useState(1),[limit,setLimit]=useState(96),[depth,setDepth]=useState(3),[browserOpen,setBrowserOpen]=useState(false);
 const dragState=useRef({down:false,moved:false,startX:0,startScroll:0});
 useEffect(()=>{let dead=false;loadKLC().then(([t,m])=>{if(dead)return;setTree(t);setMemory(m);const chars=[...new Set(data.vocabulary.flatMap(v=>(v.kanji||'').match(/[\u3400-\u9fff]/g)||[]))];const first=t.nodes.find(n=>chars.includes(n[1]))||t.nodes[0];setSelected(first?.[0]||1)}).catch(e=>trackError('resource',e));return()=>{dead=true}},[data.lesson,data.vocabulary]);
 const nodes=useMemo(()=>tree?.nodes||[],[tree]);const byNo=useMemo(()=>new Map<number,KLCNodeRaw>(nodes.map(n=>[n[0],n])),[nodes]);const byChar=useMemo(()=>new Map<string,KLCNodeRaw>(nodes.map(n=>[n[1],n])),[nodes]);const byParent=useMemo(()=>{const m=new Map<number,Edge[]>();for(const e of (tree?.edges||[]) as Edge[]){if(!m.has(e[0]))m.set(e[0],[]);m.get(e[0])!.push(e)}return m},[tree]);const reverse=useMemo(()=>{const m=new Map<number,Set<number>>();for(const e of (tree?.edges||[]) as Edge[]){if(e[5]){if(!m.has(e[5]))m.set(e[5],new Set());m.get(e[5])!.add(e[0])}}return m},[tree]);
 const raw=byNo.get(selected)||nodes[0],node=raw?nodeObj(raw):null,edges=(byParent.get(selected)||[]).slice().sort((a,b)=>a[1]-b[1]);const mem=node?(memory[String(node.no)]||['','',[]]):['','',[]] as [string,string,string[]];
 const lessonChars=useMemo(()=>[...new Set(data.vocabulary.flatMap(v=>(v.kanji||'').match(/[\u3400-\u9fff]/g)||[]))],[data.vocabulary]);const lessonNodes=lessonChars.map(ch=>byChar.get(ch)).filter(Boolean) as KLCNodeRaw[];const missing=lessonChars.filter(ch=>!byChar.has(ch));
 const results=useMemo(()=>{const q=query.trim().toLowerCase();const all=q?nodes.filter(n=>[n[1],n[2],n[3],n[4],n[5],String(n[0])].some(x=>String(x||'').toLowerCase().includes(q))):nodes;return all.slice(0,limit)},[nodes,query,limit]);const builds=[...(reverse.get(selected)||[])].map(n=>byNo.get(n)).filter(Boolean).slice(0,48) as KLCNodeRaw[];
 if(!tree||!node)return <div className="kanji-loading"><Loader2 className="animate-spin"/><b>{text('KLC construction tree লোড হচ্ছে…','Loading KLC construction tree…')}</b></div>;
 const open=(n:number)=>{setSelected(n);requestAnimationFrame(()=>document.querySelector('.kanji-identity')?.scrollIntoView({behavior:'smooth',block:'start'}))};
 const drag=dragState.current;
 const startDrag=(e:React.MouseEvent<HTMLDivElement>)=>{
   drag.down=true;drag.moved=false;drag.startX=e.pageX;drag.startScroll=e.currentTarget.scrollLeft;
   e.currentTarget.classList.add('is-dragging');
 };
 const duringDrag=(e:React.MouseEvent<HTMLDivElement>)=>{
   if(!drag.down)return;
   const delta=e.pageX-drag.startX;
   if(Math.abs(delta)>3)drag.moved=true;
   e.currentTarget.scrollLeft=drag.startScroll-delta;
 };
 const endDrag=(e:React.MouseEvent<HTMLDivElement>)=>{
   if(!drag.down)return;
   drag.down=false;
   e.currentTarget.classList.remove('is-dragging');
 };
 const clickAfterDrag=(e:React.MouseEvent<HTMLDivElement>)=>{if(drag.moved){e.preventDefault();e.stopPropagation()}};
 return <div className="space-y-5 pb-8"><section className="study-header tone-kanji"><div><div className="section-kicker">JLPT N5 · LESSON {String(data.lesson).padStart(2,'0')} KANJI</div><h1>{text(`${lessonChars.length}টি lesson-focused Kanji`,`${lessonChars.length} lesson-focused kanji`)}</h1><p className={language==='bn'?'font-bn':''}>{text('প্রথমে এই lesson-এর Kanji, reading, অর্থ, মনে রাখার গল্প ও stroke order শিখুন। ২,৩০০ Kanji-এর advanced explorer প্রয়োজন হলে আলাদাভাবে খুলুন।','Start with this lesson’s kanji, readings, meanings, memory stories and stroke order. Open the advanced 2,300-kanji explorer only when you need it.')}</p></div><TreePine className="header-big-icon"/></section>
 <section className="klc-dataset-stats"><div><b>{tree.stats.nodes||2300}</b><span>KLC nodes</span></div><div><b>{tree.stats.edges||4034}</b><span>Component edges</span></div><div><b>{tree.stats.atomic_or_root||0}</b><span>Atomic / root</span></div><div><b>{tree.stats.klc_component_edges||0}</b><span>KLC→KLC links</span></div></section>
 <section className="lesson-kanji-strip"><div><span className="section-kicker">Lesson {String(data.lesson).padStart(2,'0')} Kanji</span><b>{lessonNodes.length}/{lessonChars.length} mapped</b></div><div className="kanji-chip-scroll" onWheel={e=>{
   if(e.deltaY===0)return;
   const el=e.currentTarget;
   const atLeftEdge=el.scrollLeft<=0;
   const atRightEdge=el.scrollLeft+el.clientWidth>=el.scrollWidth-1;
   if((e.deltaY<0&&atLeftEdge)||(e.deltaY>0&&atRightEdge))return;
   e.preventDefault();
   el.scrollLeft+=e.deltaY;
 }} onMouseDown={startDrag} onMouseMove={duringDrag} onMouseUp={endDrag} onMouseLeave={endDrag} onClickCapture={clickAfterDrag}>{lessonNodes.map(n=><button key={n[0]} className={n[0]===selected?'active':''} onClick={()=>open(n[0])}><span>{n[1]}</span><small>{n[2]}</small></button>)}{missing.map(ch=><button key={ch} disabled><span>{ch}</span><small>Not in KLC 2300</small></button>)}</div></section>
 <button className="kanji-browser-toggle premium-btn premium-btn-secondary" onClick={()=>setBrowserOpen(v=>!v)}>{browserOpen?<ChevronDown/>:<ChevronRight/>} {browserOpen?text('Advanced explorer বন্ধ করুন','Close advanced explorer'):text('Advanced 2,300-Kanji explorer খুলুন','Open advanced 2,300-kanji explorer')}</button>
 <div className="kanji-layout"><AnimatePresence initial={false}>{browserOpen&&<motion.aside initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-8}} className="kanji-browser"><label className="search-field"><Search size={17}/><input value={query} onChange={e=>{setQuery(e.target.value);setLimit(96)}} placeholder="Kanji / KLC no / meaning / reading…" aria-label={text('সব Kanji-তে খুঁজুন','Search all kanji')}/></label><div className="kanji-result-grid">{results.map(n=><button key={n[0]} className={n[0]===selected?'active':''} onClick={()=>open(n[0])} aria-label={`KLC ${n[0]} · ${n[1]} · ${n[2]}`}><span>{n[1]}</span><small>#{n[0]}</small></button>)}</div>{limit<nodes.length&&<button className="premium-btn premium-btn-secondary w-full" onClick={()=>setLimit(x=>x+96)}>{text('আরও দেখুন','Load more')}</button>}</motion.aside>}</AnimatePresence>
 <main className="kanji-detail"><motion.article key={node.no} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="kanji-identity"><div className="kanji-glyph">{node.kanji}</div><div><span className="section-kicker">KANJI STUDY CARD · KLC #{node.no}</span><h2>{node.meaning}</h2>{mem[0]&&<p className="font-bn text-lg font-bold text-sakura">{mem[0]}</p>}<div className="reading-pills"><span>音 {node.onyomi||'—'}</span><span>訓 {node.kunyomi||'—'}</span><span>Reviewed structure</span></div></div></motion.article>
 <section className="premium-panel"><div className="section-kicker">Exact one-level construction</div><h2 className="section-title">{node.oneLevel||node.kanji}</h2>{edges.length?<div className="component-card-grid">{edges.map((e,i)=><button key={`${e[1]}-${i}`} onClick={()=>e[5]&&open(e[5])} className={e[6]==='LATER_KLC_MNEMONIC_REF'?'later-ref':''}><span className="position">{e[1]}</span><strong className="font-jp">{e[2]}</strong><div><b>{e[3]}</b><small>{typeLabel(e[4])}</small><em>{relationLabel(e[6])}</em></div></button>)}</div>:<div className="atomic-note">{text('Atomic / root record — immediate component edge নেই।','Atomic / root record — no immediate component edge.')}</div>}{mem[1]&&<div className="memory-story font-bn"><b>{text('মনে রাখার ১-লাইন গল্প','One-line memory story')}</b><p>{mem[1]}</p><small>{text('Visual memory aid — true etymology নয়','Visual memory aid — not historical etymology')}</small></div>}</section>
 <section className="premium-panel recursive-tree-panel"><div className="tree-panel-head"><div><div className="section-kicker">Recursive KLC Construction</div><h2 className="section-title">True expandable component tree</h2><p className="section-subtitle">{text('Explicit KLC→KLC links recursively expand; RAD/primitive components leaf node হিসেবে থাকে।','Explicit KLC→KLC links expand recursively; RAD/primitive components remain leaf nodes.')}</p></div><label>Depth<select value={depth} onChange={e=>setDepth(Number(e.target.value))}>{[1,2,3,4].map(x=><option key={x}>{x}</option>)}</select></label></div><div className="recursive-tree-scroll"><RecursiveNode no={selected} depth={0} maxDepth={depth} byNo={byNo} byParent={byParent} onOpen={open}/></div></section>
 <div className="klc-info-grid-v42"><section className="premium-panel"><div className="section-kicker">SMALLEST VISUAL PARTS</div><div className="klc-token-row-v42">{splitTokens(node.leaf).map(x=><span key={x}>{x}</span>)}</div><div className="section-kicker mt-4">RADICAL / PRIMITIVE PARTS</div><div className="klc-token-row-v42 rad">{splitTokens(node.leafRad).map(x=><span key={x}>{x}</span>)}</div></section><section className="premium-panel"><div className="section-kicker">RELATED KANJI</div><h2 className="section-title">{text('এই অংশ দিয়ে তৈরি Kanji','Kanji built with this component')}</h2><div className="builds-grid">{builds.length?builds.map(n=><button key={n[0]} onClick={()=>open(n[0])}><span>{n[1]}</span><small>Card {n[0]}</small><b>{n[2]}</b></button>):<p className="section-subtitle">{text('এই অংশের কোনো পরবর্তী Kanji link নেই।','No later kanji links use this component.')}</p>}</div></section></div>
 <section className="premium-panel"><div className="section-kicker">Stroke order</div><h2 className="section-title">Animated KanjiVG studio</h2><StrokeOrder kanji={node.kanji}/></section>
 </main></div></div>
}
