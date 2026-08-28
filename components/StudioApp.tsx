'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import type { LessonPayload, MockAttempt, StudioMeta, ViewName } from '@/lib/types';
import { loadLesson, loadMeta } from '@/lib/data';
import { readHistory, readLesson, readProgress, readSrs, saveHistory, saveProgress, saveSrs, writeLesson, type ProgressMap, type SrsMap } from '@/lib/storage';
import { track, trackError, trackVirtualPage } from '@/lib/analytics';
import Shell from './Shell';
import Dashboard from './Dashboard';
import Vocabulary from './Vocabulary';
import SRS from './SRS';
import Spelling from './Spelling';
import Listening from './Listening';
import KanjiExplorer from './KanjiExplorer';
import MockTest from './MockTest';
import HistoryView from './HistoryView';
import { Conversation, Grammar, Reading } from './StudyViews';
import KanaPad from './KanaPad';
import DataVault from './DataVault';

const VIEWS:ViewName[]=['dashboard','vocabulary','srs','spelling','conversation','reading','listening','grammar','kanji','mock','history'];
const isView=(x:string|null):x is ViewName=>!!x&&VIEWS.includes(x as ViewName);

function urlState(){
  if(typeof window==='undefined')return {lesson:1,view:'dashboard' as ViewName};
  const p=new URLSearchParams(location.search);
  const n=Math.max(1,Math.min(25,Number(p.get('lesson')||readLesson()||1)));
  return {lesson:Number.isFinite(n)?n:1,view:isView(p.get('view'))?p.get('view') as ViewName:'dashboard'};
}

function syncUrl(lesson:number,view:ViewName,replace=false){
  if(typeof window==='undefined')return;
  const u=new URL(location.href);
  u.searchParams.set('lesson',String(lesson));
  u.searchParams.set('view',view);
  const next=`${u.pathname}?${u.searchParams.toString()}${u.hash}`;
  if(replace)history.replaceState({lesson,view},'',next);else history.pushState({lesson,view},'',next);
}

export default function StudioApp(){
 const [meta,setMeta]=useState<StudioMeta|null>(null);const [lesson,setLessonState]=useState(1);const [data,setData]=useState<LessonPayload|null>(null);const [view,setView]=useState<ViewName>('dashboard');const [progress,setProgress]=useState<ProgressMap>({});const [srs,setSrs]=useState<SrsMap>({});const [historyRows,setHistory]=useState<MockAttempt[]>([]);const [error,setError]=useState('');

 useEffect(()=>{const s=urlState();setLessonState(s.lesson);setView(s.view);writeLesson(s.lesson);setProgress(readProgress());setSrs(readSrs());setHistory(readHistory());syncUrl(s.lesson,s.view,true);loadMeta().then(setMeta).catch(e=>{setError(String(e));trackError('resource',e)})},[]);
 useEffect(()=>{if('serviceWorker' in navigator){navigator.serviceWorker.register(`${process.env.NEXT_PUBLIC_BASE_PATH||''}/sw.js`,{updateViaCache:'none'}).catch(()=>{})}},[]);
 useEffect(()=>{const onErr=(e:ErrorEvent)=>trackError('javascript',e.message||e.error);const onRej=(e:PromiseRejectionEvent)=>trackError('javascript',e.reason);window.addEventListener('error',onErr);window.addEventListener('unhandledrejection',onRej);return()=>{window.removeEventListener('error',onErr);window.removeEventListener('unhandledrejection',onRej)}},[]);
 useEffect(()=>{const pop=()=>{const s=urlState();setLessonState(s.lesson);setView(s.view);writeLesson(s.lesson)};window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop)},[]);
 useEffect(()=>{if(!meta)return;setData(null);loadLesson(lesson).then(setData).catch(e=>{setError(String(e));trackError('resource',e)});track('lesson_open',{lesson_number:lesson,open_source:'app',section_name:view})},[lesson,meta]);
 useEffect(()=>{if(!meta)return;trackVirtualPage(view,lesson);if(view==='vocabulary')track('vocabulary_open',{lesson_number:lesson});},[view,lesson,meta]);

 const changeLesson=useCallback((n:number,v:ViewName='dashboard')=>{const safe=Math.max(1,Math.min(25,n));setLessonState(safe);writeLesson(safe);setView(v);syncUrl(safe,v)},[]);
 const changeView=(v:ViewName)=>{setView(v);syncUrl(lesson,v);track('section_open',{section_name:v,lesson_number:lesson})};
 const toggleMastery=(id:number)=>{setProgress(p=>{const n={...p,[String(id)]:!p[String(id)]};if(!n[String(id)])delete n[String(id)];saveProgress(n);return n})};
 const updateSrs=(n:SrsMap)=>{setSrs(n);saveSrs(n)};const updateProgress=(n:ProgressMap)=>{setProgress(n);saveProgress(n)};const addHistory=(a:MockAttempt)=>{setHistory(h=>{const n=[a,...h];saveHistory(n);return n})};

 const queueMockMistakes=(ids:number[])=>{
   if(!ids.length)return;
   setSrs(prev=>{
     const now=new Date().toISOString();const next={...prev};
     ids.forEach(id=>{const old=next[String(id)]||{};next[String(id)]={...old,phase:'recall',due_at:now,last_rating:'again',lapses:Number(old.lapses||0)+1}});
     saveSrs(next);return next;
   });
   track('mock_mistakes_to_srs',{lesson_number:lesson,mistake_count:ids.length});
 };

 if(error)return <div className="fatal-state"><b>Study app could not load.</b><p>{error}</p><button onClick={()=>location.reload()}>Reload</button></div>;
 if(!meta||!data)return <div className="boot-screen"><div className="boot-seal">日</div><Loader2 className="animate-spin"/><b>The Nihongo Vibes</b><span>Preparing your Japanese learning workspace…</span></div>;
 const content=(()=>{switch(view){case'dashboard':return <Dashboard meta={meta} lesson={lesson} progress={progress} srs={srs} history={historyRows} onNavigate={changeView} onLesson={changeLesson}/>;case'vocabulary':return <Vocabulary data={data} progress={progress} onToggle={toggleMastery}/>;case'srs':return <SRS data={data} srs={srs} progress={progress} onSrsChange={updateSrs} onProgressChange={updateProgress}/>;case'spelling':return <Spelling data={data}/>;case'conversation':return <Conversation data={data}/>;case'reading':return <Reading data={data}/>;case'listening':return <Listening data={data}/>;case'grammar':return <Grammar data={data}/>;case'kanji':return <KanjiExplorer data={data}/>;case'mock':return <MockTest data={data} onSave={addHistory} onReviewMistakes={queueMockMistakes}/>;case'history':return <HistoryView history={historyRows}/>;default:return null}})();
 return <><Shell meta={meta} lesson={lesson} view={view} onLesson={changeLesson} onView={changeView}><AnimatePresence mode="wait"><motion.div key={`${view}-${lesson}`} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:.2,ease:[.2,.8,.2,1]}}>{content}</motion.div></AnimatePresence></Shell><KanaPad/><DataVault/></>
}
