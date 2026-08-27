'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import type { LessonPayload, MockAttempt, StudioMeta, ViewName } from '@/lib/types';
import { loadLesson, loadMeta } from '@/lib/data';
import { readHistory, readLesson, readProgress, readSrs, saveHistory, saveProgress, saveSrs, writeLesson, type ProgressMap, type SrsMap } from '@/lib/storage';
import { track, trackError } from '@/lib/analytics';
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

export default function StudioApp(){
 const [meta,setMeta]=useState<StudioMeta|null>(null);const [lesson,setLessonState]=useState(1);const [data,setData]=useState<LessonPayload|null>(null);const [view,setView]=useState<ViewName>('dashboard');const [progress,setProgress]=useState<ProgressMap>({});const [srs,setSrs]=useState<SrsMap>({});const [history,setHistory]=useState<MockAttempt[]>([]);const [error,setError]=useState('');
 useEffect(()=>{setLessonState(readLesson());setProgress(readProgress());setSrs(readSrs());setHistory(readHistory());loadMeta().then(setMeta).catch(e=>{setError(String(e));trackError('resource',e)})},[]);
 useEffect(()=>{if('serviceWorker' in navigator){navigator.serviceWorker.register(`${process.env.NEXT_PUBLIC_BASE_PATH||''}/sw.js`).catch(()=>{})}},[]);
 useEffect(()=>{const onErr=(e:ErrorEvent)=>trackError('javascript',e.message||e.error);const onRej=(e:PromiseRejectionEvent)=>trackError('javascript',e.reason);window.addEventListener('error',onErr);window.addEventListener('unhandledrejection',onRej);return()=>{window.removeEventListener('error',onErr);window.removeEventListener('unhandledrejection',onRej)}},[]);
 useEffect(()=>{if(!meta)return;setData(null);loadLesson(lesson).then(setData).catch(e=>{setError(String(e));trackError('resource',e)});track('lesson_open',{lesson_number:lesson,open_source:'app'})},[lesson,meta]);
 const changeLesson=useCallback((n:number,v:ViewName='dashboard')=>{const safe=Math.max(1,Math.min(25,n));setLessonState(safe);writeLesson(safe);setView(v)},[]);
 const changeView=(v:ViewName)=>{setView(v);track('section_open',{section_name:v,lesson_number:lesson})};
 const toggleMastery=(id:number)=>{setProgress(p=>{const n={...p,[String(id)]:!p[String(id)]};if(!n[String(id)])delete n[String(id)];saveProgress(n);return n})};
 const updateSrs=(n:SrsMap)=>{setSrs(n);saveSrs(n)};const updateProgress=(n:ProgressMap)=>{setProgress(n);saveProgress(n)};const addHistory=(a:MockAttempt)=>{setHistory(h=>{const n=[a,...h];saveHistory(n);return n})};
 if(error)return <div className="fatal-state"><b>Study app could not load.</b><p>{error}</p><button onClick={()=>location.reload()}>Reload</button></div>;
 if(!meta||!data)return <div className="boot-screen"><div className="boot-seal">日</div><Loader2 className="animate-spin"/><b>N5 Natural Japanese Studio</b><span>Preparing premium study workspace…</span></div>;
 const content=(()=>{switch(view){case'dashboard':return <Dashboard meta={meta} lesson={lesson} progress={progress} srs={srs} history={history} onNavigate={changeView} onLesson={changeLesson}/>;case'vocabulary':return <Vocabulary data={data} progress={progress} onToggle={toggleMastery}/>;case'srs':return <SRS data={data} srs={srs} progress={progress} onSrsChange={updateSrs} onProgressChange={updateProgress}/>;case'spelling':return <Spelling data={data}/>;case'conversation':return <Conversation data={data}/>;case'reading':return <Reading data={data}/>;case'listening':return <Listening data={data}/>;case'grammar':return <Grammar data={data}/>;case'kanji':return <KanjiExplorer data={data}/>;case'mock':return <MockTest data={data} onSave={addHistory}/>;case'history':return <HistoryView history={history}/>;default:return null}})();
 return <Shell meta={meta} lesson={lesson} view={view} onLesson={changeLesson} onView={changeView}><AnimatePresence mode="wait"><motion.div key={`${view}-${lesson}`} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:.2,ease:[.2,.8,.2,1]}}>{content}</motion.div></AnimatePresence></Shell>
}
