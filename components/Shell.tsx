'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  LayoutDashboard, BookOpen, PenLine, Brain, MessageCircle, BookOpenText, Headphones, Languages,
  TreePine, ClipboardCheck, History, Menu, X, Search, Sparkles, ChevronDown, Command, Radio,
  DatabaseBackup, Share2, CheckCircle2
} from 'lucide-react';
import type { StudioMeta, ViewName } from '@/lib/types';
import { loadSearchIndex } from '@/lib/data';
import { track } from '@/lib/analytics';
import AmbientCanvas from './AmbientCanvas';

type NavItem={view:ViewName;label:string;short:string;icon:any};
const NAV:NavItem[]=[
 {view:'dashboard',label:'Home',short:'Home',icon:LayoutDashboard},{view:'vocabulary',label:'Vocabulary',short:'Vocab',icon:BookOpen},
 {view:'srs',label:'Recall',short:'Recall',icon:Brain},{view:'spelling',label:'Spelling',short:'Spell',icon:PenLine},
 {view:'conversation',label:'Conversation',short:'Talk',icon:MessageCircle},{view:'reading',label:'Reading',short:'Read',icon:BookOpenText},
 {view:'listening',label:'Listening',short:'Listen',icon:Headphones},{view:'grammar',label:'Grammar',short:'Grammar',icon:Languages},
 {view:'kanji',label:'Kanji Matrix',short:'Kanji',icon:TreePine},{view:'mock',label:'Mock',short:'Mock',icon:ClipboardCheck},
 {view:'history',label:'History',short:'History',icon:History},
];

export default function Shell({meta,lesson,view,onLesson,onView,children}:{meta:StudioMeta;lesson:number;view:ViewName;onLesson:(n:number,v?:ViewName)=>void;onView:(v:ViewName)=>void;children:React.ReactNode}){
 const [drawer,setDrawer]=useState(false),[search,setSearch]=useState(false),[lessonPicker,setLessonPicker]=useState(false);
 const [q,setQ]=useState(''),[results,setResults]=useState<any[]>([]),[loading,setLoading]=useState(false);
 const subnavRef=useRef<HTMLDivElement|null>(null),mainRef=useRef<HTMLElement|null>(null),lessonRef=useRef<HTMLDivElement|null>(null);

 const openSearch=async()=>{setSearch(true);setLessonPicker(false);if(results.length)return;setLoading(true);try{setResults(await loadSearchIndex())}finally{setLoading(false)}};
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}if(e.key==='Escape'){setDrawer(false);setSearch(false);setLessonPicker(false)}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[results.length]);
 useEffect(()=>{const onPointer=(e:PointerEvent)=>{if(lessonPicker&&lessonRef.current&&!lessonRef.current.contains(e.target as Node))setLessonPicker(false)};document.addEventListener('pointerdown',onPointer);return()=>document.removeEventListener('pointerdown',onPointer)},[lessonPicker]);
 useEffect(()=>{const html=document.documentElement,body=document.body;const locked=drawer||search;body.style.removeProperty('overflow');html.style.removeProperty('overflow');html.classList.toggle('overlay-open',locked);body.classList.toggle('overlay-open',locked);return()=>{html.classList.remove('overlay-open');body.classList.remove('overlay-open');body.style.removeProperty('overflow');html.style.removeProperty('overflow')}},[drawer,search]);
 useEffect(()=>{const root=subnavRef.current;if(!root)return;root.querySelector<HTMLButtonElement>('button.active')?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'})},[view]);
 useLayoutEffect(()=>{const el=mainRef.current;if(!el||typeof window==='undefined'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;let ctx:any;(async()=>{try{const {gsap}=await import('gsap');ctx=gsap.context(()=>{const mobile=window.matchMedia('(max-width:700px)').matches;gsap.fromTo(el,{opacity:.8,y:mobile?3:7},{opacity:1,y:0,duration:mobile?.22:.36,ease:'power3.out'});const cards=el.querySelectorAll('.vocab-premium-card,.metric-card,.action-panel,.grammar-premium-card,.dialogue-row,.reading-paper,.audio-console,.transcript-panel,.srs-card-premium,.practice-card,.premium-panel,.mock-start,.mock-question,.history-card,.lesson-kanji-strip,.kanji-identity');if(cards.length)gsap.fromTo(cards,{opacity:.65,y:mobile?2:6},{opacity:1,y:0,duration:mobile?.2:.3,stagger:mobile?.008:.016,ease:'power2.out',clearProps:'transform'})},el)}catch{}})();return()=>ctx?.revert?.()},[view,lesson]);

 const shown=q.trim()?results.filter(x=>[x.j,x.k,x.bn,x.en,x.p].some((v:any)=>String(v||'').toLowerCase().includes(q.toLowerCase()))).slice(0,30):results.slice(0,12);
 const go=(v:ViewName)=>{onView(v);setDrawer(false)};
 const currentLesson=meta.lessons.find(x=>x.lesson===lesson);

 const Brand=()=> <button className="future-brand future-brand-v49" onClick={()=>go('dashboard')} aria-label="Go to The Nihongo Vibes dashboard"><span className="future-brand-logo-wrap"><img className="future-brand-logo" src={`${process.env.NEXT_PUBLIC_BASE_PATH||''}/assets/nihongo-vibes-logo.webp`} alt=""/><i className="future-brand-pulse"/></span><span><strong>THE NIHONGO VIBES</strong><small>日本語 · FUTURE LEARNING STUDIO</small></span></button>;

 const LessonNode=()=> <div className="lesson-picker-anchor" ref={lessonRef}>
   <button className={`future-header-node lesson-picker-trigger ${lessonPicker?'open':''}`} onClick={()=>{setLessonPicker(x=>!x);setSearch(false)}} aria-haspopup="listbox" aria-expanded={lessonPicker}>
     <Radio size={17}/><span>L{String(lesson).padStart(2,'0')}</span><ChevronDown size={16}/>
   </button>
   {lessonPicker&&<div className="lesson-picker-popover" role="listbox" aria-label="Choose lesson">
     <div className="lesson-picker-title"><div><span>CURRENT COURSE</span><b>JLPT N5 · 25 Lessons</b></div><button onClick={()=>setLessonPicker(false)} aria-label="Close lesson picker"><X/></button></div>
     <div className="lesson-picker-current"><small>NOW STUDYING</small><b>Lesson {String(lesson).padStart(2,'0')}</b><span>{currentLesson?.title}</span></div>
     <div className="lesson-picker-list">{meta.lessons.map(L=><button key={L.lesson} className={L.lesson===lesson?'active':''} onClick={()=>{onLesson(L.lesson,'dashboard');setLessonPicker(false)}} role="option" aria-selected={L.lesson===lesson}><span>{String(L.lesson).padStart(2,'0')}</span><div><b>Lesson {String(L.lesson).padStart(2,'0')}</b><small>{L.title}</small></div>{L.lesson===lesson&&<CheckCircle2/>}</button>)}</div>
   </div>}
 </div>;

 const Drawer=()=> <aside className="future-drawer" aria-label="Study navigation"><div className="future-drawer-head"><Brand/><button onClick={()=>setDrawer(false)} aria-label="Close menu"><X size={22}/></button></div><div className="future-drawer-status"><i/><span>SYSTEM ONLINE</span><b>LESSON {String(lesson).padStart(2,'0')}</b></div><div className="future-drawer-lesson"><label>CURRENT LESSON</label><div><select value={lesson} onChange={e=>{onLesson(Number(e.target.value),'dashboard');setDrawer(false)}}>{meta.lessons.map(L=><option value={L.lesson} key={L.lesson}>Lesson {String(L.lesson).padStart(2,'0')} · {L.title}</option>)}</select><ChevronDown size={18}/></div></div><nav>{NAV.map(x=>{const I=x.icon;return <button key={x.view} className={view===x.view?'active':''} onClick={()=>go(x.view)} aria-current={view===x.view?'page':undefined}><I size={21}/><span>{x.label}</span>{x.view==='kanji'&&<small>2300</small>}</button>})}</nav><div className="future-drawer-utilities"><button onClick={()=>window.dispatchEvent(new Event('n5-open-vault'))}><DatabaseBackup size={20}/><span>Backup & Restore</span></button><button onClick={async()=>{try{await navigator.clipboard.writeText(location.href);track('share_link',{section_name:view,lesson_number:lesson})}catch{}}}><Share2 size={20}/><span>Copy current link</span></button></div><div className="future-drawer-foot"><Sparkles size={18}/><span>Learn → Listen → Recall → Use → Review</span></div></aside>;

 return <div className="future-shell future-shell-v48 future-shell-v51 future-shell-v52" data-view={view}>
   <div className="future-global-ambient" aria-hidden="true"><AmbientCanvas/></div>
   <header className="future-header"><Brand/><nav className="future-primary-nav" aria-label="Primary navigation">{NAV.slice(0,8).map(x=><button key={x.view} className={view===x.view?'active':''} onClick={()=>go(x.view)} aria-current={view===x.view?'page':undefined}>{x.label}</button>)}<button className={['kanji','mock','history'].includes(view)?'active':''} onClick={()=>setDrawer(true)}>More <ChevronDown size={15}/></button></nav><div className="future-header-tools"><button className="future-search-trigger" onClick={openSearch} aria-label="Search learning content"><Search size={20}/><span>Search</span><kbd>⌘K</kbd></button><LessonNode/><button className="future-menu-trigger" onClick={()=>setDrawer(true)} aria-label="Open menu"><Menu size={23}/></button></div></header>
   <div className="future-subnav" ref={subnavRef} role="navigation" aria-label="Quick access"><span><Command size={16}/> QUICK ACCESS</span>{NAV.slice(1).map(x=>{const I=x.icon;return <button key={x.view} data-view={x.view} className={view===x.view?'active':''} onClick={()=>go(x.view)} aria-current={view===x.view?'page':undefined}><I size={18}/>{x.short}</button>})}</div>
   <main ref={mainRef} className="future-main" id="main-content">{children}</main>
   <nav className="future-mobile-dock" aria-label="Mobile navigation">{([NAV[0],NAV[1],NAV[2],NAV[6]] as NavItem[]).map(x=>{const I=x.icon;return <button key={x.view} onClick={()=>go(x.view)} className={view===x.view?'active':''}><I size={24}/><span>{x.short}</span></button>})}<button onClick={()=>setDrawer(true)}><Menu size={24}/><span>Menu</span></button></nav>
   {drawer&&<div className="future-drawer-layer" role="dialog" aria-modal="true"><button className="future-layer-backdrop" onClick={()=>setDrawer(false)} aria-label="Close menu"/><Drawer/></div>}
   {search&&<div className="future-search-layer" role="dialog" aria-modal="true"><button className="future-layer-backdrop" onClick={()=>setSearch(false)} aria-label="Close search"/><section className="future-search-dialog"><div className="future-search-head"><Search size={21}/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Japanese / Kanji / বাংলা / English…" aria-label="Search"/><button onClick={()=>setSearch(false)}><X size={22}/></button></div><div className="future-search-results">{loading?<p>Indexing learning data…</p>:shown.map(x=><button key={x.id} onClick={()=>{onLesson(x.lesson,'vocabulary');setSearch(false)}}><span className="font-jp">{x.k||x.j}</span><div><b className="font-bn">{x.bn}</b><small>Lesson {x.lesson} · {x.p}</small></div></button>)}</div></section></div>}
 </div>
}
