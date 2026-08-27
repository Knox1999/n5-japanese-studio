'use client';

import { useEffect, useState } from 'react';
import {
  LayoutDashboard, BookOpen, PenLine, Brain, MessageCircle, BookOpenText, Headphones, Languages,
  TreePine, ClipboardCheck, History, Menu, X, Search, Sparkles, ChevronDown
} from 'lucide-react';
import type { StudioMeta, ViewName } from '@/lib/types';
import { loadSearchIndex } from '@/lib/data';

type NavItem={view:ViewName;label:string;icon:any};
const NAV:NavItem[]=[
 {view:'dashboard',label:'Dashboard',icon:LayoutDashboard},{view:'vocabulary',label:'Vocabulary',icon:BookOpen},{view:'srs',label:'SRS Recall',icon:Brain},{view:'spelling',label:'Spelling',icon:PenLine},{view:'conversation',label:'Conversation',icon:MessageCircle},{view:'reading',label:'Reading',icon:BookOpenText},{view:'listening',label:'Listening',icon:Headphones},{view:'grammar',label:'Grammar',icon:Languages},{view:'kanji',label:'Kanji Tree (KLC)',icon:TreePine},{view:'mock',label:'Mock Test',icon:ClipboardCheck},{view:'history',label:'History',icon:History},
];

export default function Shell({meta,lesson,view,onLesson,onView,children}:{meta:StudioMeta;lesson:number;view:ViewName;onLesson:(n:number,v?:ViewName)=>void;onView:(v:ViewName)=>void;children:React.ReactNode}){
 const [drawer,setDrawer]=useState(false);const [search,setSearch]=useState(false);const [q,setQ]=useState('');const [results,setResults]=useState<any[]>([]);const [loading,setLoading]=useState(false);
 const openSearch=async()=>{setSearch(true);if(results.length)return;setLoading(true);try{setResults(await loadSearchIndex())}finally{setLoading(false)}};
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[results.length]);
 const shown=q.trim()?results.filter(x=>[x.j,x.k,x.bn,x.en,x.p].some((v:any)=>String(v||'').toLowerCase().includes(q.toLowerCase()))).slice(0,30):results.slice(0,12);
 const go=(v:ViewName)=>{onView(v);setDrawer(false)};
 const Side=()=> <><div className="brand-lockup"><div className="brand-seal">日</div><div><b>N5 Natural Japanese</b><span>PREMIUM STUDY STUDIO</span></div></div><div className="lesson-control"><label>Current lesson</label><div><select value={lesson} onChange={e=>onLesson(Number(e.target.value),'dashboard')}>{meta.lessons.map(L=><option value={L.lesson} key={L.lesson}>Lesson {String(L.lesson).padStart(2,'0')} · {L.title}</option>)}</select><ChevronDown size={15}/></div></div><nav className="side-nav">{NAV.map(x=>{const I=x.icon;return <button key={x.view} className={view===x.view?'active':''} onClick={()=>go(x.view)}><I size={18}/><span>{x.label}</span>{x.view==='kanji'&&<small>2300</small>}</button>})}</nav><div className="sidebar-foot"><Sparkles size={16}/><div><b>Learn → Recall → Use</b><span>Review → Repeat</span></div></div></>;
 return <div className="studio-shell">
   <aside className="desktop-sidebar"><Side/></aside>
   <header className="topbar-v41"><button className="mobile-menu" onClick={()=>setDrawer(true)} aria-label="Open menu"><Menu/></button><button className="global-search" onClick={openSearch}><Search size={18}/><span>Search 1,011 words, Kanji, meanings…</span><kbd>Ctrl K</kbd></button><div className="top-lesson"><span>Lesson</span><b>{String(lesson).padStart(2,'0')}</b></div></header>
   <main className="studio-main">{children}</main>
   <nav className="mobile-dock-v41">{([{view:'dashboard',label:'Home',icon:LayoutDashboard},{view:'vocabulary',label:'Vocab',icon:BookOpen},{view:'srs',label:'SRS',icon:Brain},{view:'listening',label:'Listen',icon:Headphones}] as NavItem[]).map(x=>{const I=x.icon;return <button key={x.view} onClick={()=>go(x.view)} className={view===x.view?'active':''}><I/><span>{x.label}</span></button>})}<button onClick={()=>setDrawer(true)}><Menu/><span>Menu</span></button></nav>
   {drawer&&<div className="drawer-layer" role="dialog" aria-modal="true"><button className="drawer-backdrop" onClick={()=>setDrawer(false)} aria-label="Close menu"/><aside className="mobile-drawer"><button className="drawer-close" onClick={()=>setDrawer(false)}><X/></button><Side/></aside></div>}
   {search&&<div className="search-layer" role="dialog" aria-modal="true"><button className="search-backdrop" onClick={()=>setSearch(false)} aria-label="Close search"/><section className="search-dialog"><div className="search-dialog-head"><Search/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Japanese / Kanji / বাংলা / English…"/><button onClick={()=>setSearch(false)}><X/></button></div><div className="search-results-v41">{loading?<p>Loading search index…</p>:shown.map(x=><button key={x.id} onClick={()=>{onLesson(x.lesson,'vocabulary');setSearch(false)}}><span className="font-jp">{x.k||x.j}</span><div><b className="font-bn">{x.bn}</b><small>Lesson {x.lesson} · {x.p}</small></div></button>)}</div></section></div>}
 </div>
}
