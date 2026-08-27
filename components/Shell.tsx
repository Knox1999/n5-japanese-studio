'use client';

import { useEffect, useState } from 'react';
import {
  LayoutDashboard, BookOpen, PenLine, Brain, MessageCircle, BookOpenText, Headphones, Languages,
  TreePine, ClipboardCheck, History, Menu, X, Search, Sparkles, ChevronDown
} from 'lucide-react';
import type { StudioMeta, ViewName } from '@/lib/types';
import { loadSearchIndex } from '@/lib/data';

type NavItem={view:ViewName;label:string;short:string;icon:any};
const NAV:NavItem[]=[
 {view:'dashboard',label:'Home',short:'Home',icon:LayoutDashboard},
 {view:'vocabulary',label:'Vocabulary',short:'Vocab',icon:BookOpen},
 {view:'srs',label:'Smart Recall',short:'Recall',icon:Brain},
 {view:'spelling',label:'Spelling',short:'Spell',icon:PenLine},
 {view:'conversation',label:'Conversation',short:'Talk',icon:MessageCircle},
 {view:'reading',label:'Reading',short:'Read',icon:BookOpenText},
 {view:'listening',label:'Listening',short:'Listen',icon:Headphones},
 {view:'grammar',label:'Grammar',short:'Grammar',icon:Languages},
 {view:'kanji',label:'Kanji Tree',short:'Kanji',icon:TreePine},
 {view:'mock',label:'Mock Test',short:'Mock',icon:ClipboardCheck},
 {view:'history',label:'History',short:'History',icon:History},
];

export default function Shell({meta,lesson,view,onLesson,onView,children}:{meta:StudioMeta;lesson:number;view:ViewName;onLesson:(n:number,v?:ViewName)=>void;onView:(v:ViewName)=>void;children:React.ReactNode}){
 const [drawer,setDrawer]=useState(false);
 const [search,setSearch]=useState(false);
 const [q,setQ]=useState('');
 const [results,setResults]=useState<any[]>([]);
 const [loading,setLoading]=useState(false);

 const openSearch=async()=>{setSearch(true);if(results.length)return;setLoading(true);try{setResults(await loadSearchIndex())}finally{setLoading(false)}};
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[results.length]);
 const shown=q.trim()?results.filter(x=>[x.j,x.k,x.bn,x.en,x.p].some((v:any)=>String(v||'').toLowerCase().includes(q.toLowerCase()))).slice(0,30):results.slice(0,12);
 const go=(v:ViewName)=>{onView(v);setDrawer(false)};

 const Brand=()=> <button className="academy-brand" onClick={()=>go('dashboard')}>
   <span className="academy-brand-seal font-jp">日</span>
   <span><b>N5 Natural Japanese</b><small>STUDY STUDIO</small></span>
 </button>;

 const MobileMenu=()=> <aside className="academy-mobile-menu">
   <div className="mobile-menu-top"><Brand/><button onClick={()=>setDrawer(false)} aria-label="Close menu"><X/></button></div>
   <div className="academy-mobile-lesson">
     <label>Current lesson</label>
     <div><select value={lesson} onChange={e=>{onLesson(Number(e.target.value),'dashboard');setDrawer(false)}}>{meta.lessons.map(L=><option value={L.lesson} key={L.lesson}>Lesson {String(L.lesson).padStart(2,'0')} · {L.title}</option>)}</select><ChevronDown size={15}/></div>
   </div>
   <nav>{NAV.map(x=>{const I=x.icon;return <button key={x.view} className={view===x.view?'active':''} onClick={()=>go(x.view)}><I size={18}/><span>{x.label}</span>{x.view==='kanji'&&<small>2300</small>}</button>})}</nav>
   <div className="academy-mobile-foot"><Sparkles size={16}/><span>Learn → Listen → Recall → Use → Review</span></div>
 </aside>;

 return <div className="academy-shell">
   <header className="academy-header">
     <Brand/>
     <nav className="academy-primary-nav">
       {NAV.slice(0,8).map(x=><button key={x.view} className={view===x.view?'active':''} onClick={()=>go(x.view)}>{x.label}</button>)}
       <button className={['kanji','mock','history'].includes(view)?'active more-active':''} onClick={()=>setDrawer(true)}>More <ChevronDown size={13}/></button>
     </nav>
     <div className="academy-header-tools">
       <button className="academy-search-trigger" onClick={openSearch} aria-label="Search"><Search size={17}/><span>Search</span><kbd>⌘K</kbd></button>
       <div className="academy-lesson-select"><span>L{String(lesson).padStart(2,'0')}</span><select value={lesson} onChange={e=>onLesson(Number(e.target.value),'dashboard')} aria-label="Current lesson">{meta.lessons.map(L=><option value={L.lesson} key={L.lesson}>Lesson {String(L.lesson).padStart(2,'0')} · {L.title}</option>)}</select><ChevronDown size={14}/></div>
       <button className="academy-menu-trigger" onClick={()=>setDrawer(true)} aria-label="Open menu"><Menu/></button>
     </div>
   </header>

   <div className="academy-subnav">
     <span className="subnav-label">PRACTICE</span>
     {NAV.slice(1).map(x=>{const I=x.icon;return <button key={x.view} className={view===x.view?'active':''} onClick={()=>go(x.view)}><I size={14}/>{x.short}</button>})}
   </div>

   <main className="academy-main">{children}</main>

   <nav className="academy-mobile-dock">
     {([NAV[0],NAV[1],NAV[2],NAV[6]] as NavItem[]).map(x=>{const I=x.icon;return <button key={x.view} onClick={()=>go(x.view)} className={view===x.view?'active':''}><I/><span>{x.short}</span></button>})}
     <button onClick={()=>setDrawer(true)}><Menu/><span>Menu</span></button>
   </nav>

   {drawer&&<div className="academy-drawer-layer" role="dialog" aria-modal="true">
     <button className="academy-drawer-backdrop" onClick={()=>setDrawer(false)} aria-label="Close menu"/>
     <MobileMenu/>
   </div>}

   {search&&<div className="academy-search-layer" role="dialog" aria-modal="true">
     <button className="academy-search-backdrop" onClick={()=>setSearch(false)} aria-label="Close search"/>
     <section className="academy-search-dialog">
       <div className="academy-search-head"><Search/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Japanese / Kanji / বাংলা / English…"/><button onClick={()=>setSearch(false)}><X/></button></div>
       <div className="academy-search-results">{loading?<p>Loading search index…</p>:shown.map(x=><button key={x.id} onClick={()=>{onLesson(x.lesson,'vocabulary');setSearch(false)}}><span className="font-jp">{x.k||x.j}</span><div><b className="font-bn">{x.bn}</b><small>Lesson {x.lesson} · {x.p}</small></div></button>)}</div>
     </section>
   </div>}
 </div>
}
