'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  LayoutDashboard, BookOpen, PenLine, Brain, MessageCircle, BookOpenText, Headphones, Languages,
  TreePine, ClipboardCheck, History, Menu, X, Search, Sparkles, ChevronDown, Command, Radio, DatabaseBackup, Share2
} from 'lucide-react';
import type { StudioMeta, ViewName } from '@/lib/types';
import { loadSearchIndex } from '@/lib/data';
import { track } from '@/lib/analytics';
import AmbientCanvas from './AmbientCanvas';

type NavItem={view:ViewName;label:string;short:string;icon:any};
const NAV:NavItem[]=[
 {view:'dashboard',label:'Home',short:'Home',icon:LayoutDashboard},
 {view:'vocabulary',label:'Vocabulary',short:'Vocab',icon:BookOpen},
 {view:'srs',label:'Recall',short:'Recall',icon:Brain},
 {view:'spelling',label:'Spelling',short:'Spell',icon:PenLine},
 {view:'conversation',label:'Conversation',short:'Talk',icon:MessageCircle},
 {view:'reading',label:'Reading',short:'Read',icon:BookOpenText},
 {view:'listening',label:'Listening',short:'Listen',icon:Headphones},
 {view:'grammar',label:'Grammar',short:'Grammar',icon:Languages},
 {view:'kanji',label:'Kanji Matrix',short:'Kanji',icon:TreePine},
 {view:'mock',label:'Mock',short:'Mock',icon:ClipboardCheck},
 {view:'history',label:'History',short:'History',icon:History},
];

export default function Shell({meta,lesson,view,onLesson,onView,children}:{meta:StudioMeta;lesson:number;view:ViewName;onLesson:(n:number,v?:ViewName)=>void;onView:(v:ViewName)=>void;children:React.ReactNode}){
 const [drawer,setDrawer]=useState(false);
 const [search,setSearch]=useState(false);
 const [q,setQ]=useState('');
 const [results,setResults]=useState<any[]>([]);
 const [loading,setLoading]=useState(false);
 const subnavRef=useRef<HTMLDivElement|null>(null);
 const mainRef=useRef<HTMLElement|null>(null);

 const openSearch=async()=>{setSearch(true);if(results.length)return;setLoading(true);try{setResults(await loadSearchIndex())}finally{setLoading(false)}};
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}if(e.key==='Escape'){setDrawer(false);setSearch(false)}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[results.length]);
 useEffect(()=>{const locked=drawer||search;if(!locked)return;const prev=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=prev}},[drawer,search]);
 useEffect(()=>{const root=subnavRef.current;if(!root)return;const active=root.querySelector<HTMLButtonElement>('button.active');active?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'})},[view]);
 useLayoutEffect(()=>{const el=mainRef.current;if(!el||typeof window==='undefined'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;let ctx:any;(async()=>{try{const {gsap}=await import('gsap');ctx=gsap.context(()=>{
   const mobile=window.matchMedia('(max-width: 700px)').matches;
   gsap.fromTo(el,{opacity:.72,y:mobile?5:10,filter:mobile?'none':'blur(3px)'},{opacity:1,y:0,filter:'blur(0px)',duration:mobile?.32:.48,ease:'power3.out',clearProps:'filter'});
   gsap.fromTo('.future-subnav button.active',{scale:.94},{scale:1,duration:.34,ease:'back.out(1.7)'});
   const hero=el.querySelectorAll('.study-header,.future-page-hero');
   if(hero.length)gsap.fromTo(hero,{opacity:.55,y:mobile?5:12},{opacity:1,y:0,duration:mobile?.34:.55,ease:'power3.out'});
   const cards=el.querySelectorAll('.vocab-premium-card,.metric-card,.action-panel,.grammar-premium-card,.dialogue-row,.reading-paper,.audio-console,.transcript-panel,.srs-card-premium,.practice-card,.premium-panel,.mock-start,.mock-question,.history-card,.lesson-kanji-strip,.kanji-identity');
   if(cards.length)gsap.fromTo(cards,{opacity:0,y:mobile?5:12},{opacity:1,y:0,duration:mobile?.28:.44,stagger:mobile?.015:.035,ease:'power2.out',clearProps:'transform'});
 },el)}catch{}})();return()=>ctx?.revert?.()},[view,lesson]);

 const shown=q.trim()?results.filter(x=>[x.j,x.k,x.bn,x.en,x.p].some((v:any)=>String(v||'').toLowerCase().includes(q.toLowerCase()))).slice(0,30):results.slice(0,12);
 const go=(v:ViewName)=>{onView(v);setDrawer(false)};

 const Brand=()=> <button className="future-brand future-brand-v49" onClick={()=>go('dashboard')} aria-label="Go to The Nihongo Vibes dashboard">
   <span className="future-brand-logo-wrap">
     <img className="future-brand-logo" src={`${process.env.NEXT_PUBLIC_BASE_PATH||''}/assets/nihongo-vibes-logo.webp`} alt="" />
     <i className="future-brand-pulse"/>
   </span>
   <span><strong>THE NIHONGO VIBES</strong><small>N5 FUTURE LEARNING STUDIO</small></span>
 </button>;

 const LessonNode=({drawerMode=false}:{drawerMode?:boolean})=> drawerMode ? null : <div className="future-header-node" title={`Current lesson: ${lesson}`}>
   <Radio size={13}/><span>L{String(lesson).padStart(2,'0')}</span>
   <select value={lesson} onChange={e=>onLesson(Number(e.target.value),'dashboard')} aria-label="Current lesson">{meta.lessons.map(L=><option value={L.lesson} key={L.lesson}>Lesson {String(L.lesson).padStart(2,'0')} · {L.title}</option>)}</select><ChevronDown size={13}/>
 </div>;

 const Drawer=()=> <aside className="future-drawer" aria-label="Study navigation">
   <div className="future-drawer-head"><Brand/><button onClick={()=>setDrawer(false)} aria-label="Close menu"><X/></button></div>
   <div className="future-drawer-status"><i/><span>SYSTEM ONLINE</span><b>LESSON {String(lesson).padStart(2,'0')}</b></div>
   <div className="future-drawer-lesson"><label>CURRENT LESSON</label><div><select value={lesson} onChange={e=>{onLesson(Number(e.target.value),'dashboard');setDrawer(false)}}>{meta.lessons.map(L=><option value={L.lesson} key={L.lesson}>Lesson {String(L.lesson).padStart(2,'0')} · {L.title}</option>)}</select><ChevronDown size={15}/></div></div>
   <nav>{NAV.map(x=>{const I=x.icon;return <button key={x.view} className={view===x.view?'active':''} onClick={()=>go(x.view)} aria-current={view===x.view?'page':undefined}><I size={18}/><span>{x.label}</span>{x.view==='kanji'&&<small>2300</small>}</button>})}</nav>
   <div className="future-drawer-utilities">
     <button onClick={()=>window.dispatchEvent(new Event('n5-open-vault'))}><DatabaseBackup size={16}/><span>Backup & Restore</span></button>
     <button onClick={async()=>{try{await navigator.clipboard.writeText(location.href);track('share_link',{section_name:view,lesson_number:lesson})}catch{}}}><Share2 size={16}/><span>Copy current link</span></button>
   </div>
   <div className="future-drawer-foot"><Sparkles size={16}/><span>Learn → Listen → Recall → Use → Review</span></div>
 </aside>;

 return <div className="future-shell future-shell-v48" data-view={view}>
   <div className="future-global-ambient" aria-hidden="true"><AmbientCanvas/></div>
   <header className="future-header">
     <Brand/>
     <nav className="future-primary-nav" aria-label="Primary navigation">
       {NAV.slice(0,8).map(x=><button key={x.view} className={view===x.view?'active':''} onClick={()=>go(x.view)} aria-current={view===x.view?'page':undefined}>{x.label}</button>)}
       <button className={['kanji','mock','history'].includes(view)?'active':''} onClick={()=>setDrawer(true)}>More <ChevronDown size={13}/></button>
     </nav>
     <div className="future-header-tools">
       <button className="future-search-trigger" onClick={openSearch} aria-label="Search learning content"><Search size={16}/><span>Search</span><kbd>⌘K</kbd></button>
       <LessonNode/>
       <button className="future-menu-trigger" onClick={()=>setDrawer(true)} aria-label="Open menu"><Menu/></button>
     </div>
   </header>

   <div className="future-subnav" ref={subnavRef} role="navigation" aria-label="Quick access">
     <span><Command size={13}/> QUICK ACCESS</span>
     {NAV.slice(1).map(x=>{const I=x.icon;return <button key={x.view} data-view={x.view} className={view===x.view?'active':''} onClick={()=>go(x.view)} aria-current={view===x.view?'page':undefined}><I size={14}/>{x.short}</button>})}
   </div>

   <main ref={mainRef} className="future-main" id="main-content">{children}</main>

   <nav className="future-mobile-dock" aria-label="Mobile navigation">
     {([NAV[0],NAV[1],NAV[2],NAV[6]] as NavItem[]).map(x=>{const I=x.icon;return <button key={x.view} onClick={()=>go(x.view)} className={view===x.view?'active':''} aria-current={view===x.view?'page':undefined}><I/><span>{x.short}</span></button>})}
     <button onClick={()=>setDrawer(true)} aria-label="Open all navigation"><Menu/><span>Menu</span></button>
   </nav>

   {drawer&&<div className="future-drawer-layer" role="dialog" aria-modal="true" aria-label="Navigation menu"><button className="future-layer-backdrop" onClick={()=>setDrawer(false)} aria-label="Close menu"/><Drawer/></div>}

   {search&&<div className="future-search-layer" role="dialog" aria-modal="true" aria-label="Search learning content">
     <button className="future-layer-backdrop" onClick={()=>setSearch(false)} aria-label="Close search"/>
     <section className="future-search-dialog">
       <div className="future-search-head"><Search/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Japanese / Kanji / বাংলা / English…" aria-label="Search"/><button onClick={()=>setSearch(false)} aria-label="Close search"><X/></button></div>
       <div className="future-search-results">{loading?<p>Indexing learning data…</p>:shown.map(x=><button key={x.id} onClick={()=>{onLesson(x.lesson,'vocabulary');setSearch(false)}}><span className="font-jp">{x.k||x.j}</span><div><b className="font-bn">{x.bn}</b><small>Lesson {x.lesson} · {x.p}</small></div></button>)}</div>
     </section>
   </div>}
 </div>
}
