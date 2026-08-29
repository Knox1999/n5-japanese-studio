'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, BookOpen, Loader2, RefreshCcw, WifiOff, X } from 'lucide-react';
import type { ConfidenceLevel, LessonPayload, LearningSkill, MockAttempt, StudioMeta, ViewName } from '@/lib/types';
import { loadLesson, loadMeta } from '@/lib/data';
import { readHistory, readLearningState, readLesson, readProgress, readSrs, saveHistory, saveLearningState, saveProgress, saveSrs, writeLesson, type ProgressMap, type SrsMap } from '@/lib/storage';
import { buildDailyRecommendations, buildLessonJourney, getRepairQueue, normalizeDailyMinutes, upsertMistake, type LearningState } from '@/lib/learning';
import { track, trackError, trackVirtualPage } from '@/lib/analytics';
import { stopAudio } from '@/lib/audio';
import Shell from './Shell';
import Dashboard from './Dashboard';
import DailyCoachPanel from './DailyCoachPanel';
import LessonJourneyPanel from './LessonJourneyPanel';
import Vocabulary from './Vocabulary';
import KanaPad from './KanaPad';
import DataVault from './DataVault';

const LoadingView=()=> <div className="nv58-view-loading" role="status" aria-live="polite"><Loader2 className="animate-spin"/><b>Loading study module…</b></div>;

const SRS=dynamic(()=>import('./SRS'),{ssr:false,loading:LoadingView});
const Spelling=dynamic(()=>import('./Spelling'),{ssr:false,loading:LoadingView});
const Listening=dynamic(()=>import('./Listening'),{ssr:false,loading:LoadingView});
const KanjiExplorer=dynamic(()=>import('./KanjiExplorer'),{ssr:false,loading:LoadingView});
const KanaAcademy=dynamic(()=>import('./KanaAcademy'),{ssr:false,loading:LoadingView});
const PracticeArcade=dynamic(()=>import('./PracticeArcade'),{ssr:false,loading:LoadingView});
const MockTest=dynamic(()=>import('./MockTest'),{ssr:false,loading:LoadingView});
const HistoryView=dynamic(()=>import('./HistoryView'),{ssr:false,loading:LoadingView});
const Conversation=dynamic(()=>import('./StudyViews').then(m=>m.Conversation),{ssr:false,loading:LoadingView});
const Reading=dynamic(()=>import('./StudyViews').then(m=>m.Reading),{ssr:false,loading:LoadingView});
const Grammar=dynamic(()=>import('./StudyViews').then(m=>m.Grammar),{ssr:false,loading:LoadingView});

const VIEWS:ViewName[]=['dashboard','vocabulary','srs','spelling','conversation','reading','listening','grammar','kanji','kana','arcade','mock','history'];
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

type FatalState={scope:'meta'|'lesson';message:string}|null;
type ResourceNotice={kind:string;path?:string;message:string}|null;
type SpellingAttempt={itemId:number;lesson:number;userAnswer:string;correctAnswer:string;correct:boolean;confidence:ConfidenceLevel};
type LearningAttempt={itemId:string;userAnswer:string;correctAnswer:string;correct:boolean;questionType:string;skill?:LearningSkill};

function WorkspaceBoot({online}:{online:boolean}){
  return <main className="boot-screen boot-screen-v2" id="main-content" aria-busy="true" aria-labelledby="boot-title">
    <div className="boot-workspace-card">
      <div className="boot-brand-row"><div className="boot-seal">日</div><div><span>THE NIHONGO VIBES</span><h1 id="boot-title" className="font-bn">আপনার study workspace প্রস্তুত হচ্ছে</h1></div></div>
      <p className="font-bn">{online?'Lesson progress ও আজকের next step প্রস্তুত করছি…':'Cached lesson ও progress খোলা হচ্ছে…'}</p>
      <div className="boot-skeleton-grid" aria-hidden="true"><i/><i/><i/></div>
      <div className="boot-loading-line"><Loader2 className="animate-spin"/><span>{online?'Loading lesson data':'Offline mode'}</span></div>
    </div>
  </main>;
}

export default function StudioApp(){
 const [meta,setMeta]=useState<StudioMeta|null>(null);
 const [lesson,setLessonState]=useState(1);
 const [data,setData]=useState<LessonPayload|null>(null);
 const [view,setView]=useState<ViewName>('dashboard');
 const [progress,setProgress]=useState<ProgressMap>({});
 const [srs,setSrs]=useState<SrsMap>({});
 const [historyRows,setHistory]=useState<MockAttempt[]>([]);
 const [learning,setLearning]=useState<LearningState>(()=>({version:1,mistakes:[],studyPlan:{dailyMinutes:20,updatedAt:null},journeyProgress:{}}));
 const [fatal,setFatal]=useState<FatalState>(null);
 const [resourceNotice,setResourceNotice]=useState<ResourceNotice>(null);
 const [metaNonce,setMetaNonce]=useState(0);
 const [lessonNonce,setLessonNonce]=useState(0);
 const [online,setOnline]=useState(true);

 useEffect(()=>{
   const s=urlState();
   setLessonState(s.lesson);setView(s.view);writeLesson(s.lesson);
   setProgress(readProgress());setSrs(readSrs());setHistory(readHistory());setLearning(readLearningState());
   syncUrl(s.lesson,s.view,true);
 },[]);

 useEffect(()=>{
   let dead=false;
   setFatal(null);
   loadMeta().then(x=>{if(!dead)setMeta(x)}).catch(e=>{
     if(dead)return;setFatal({scope:'meta',message:e instanceof Error?e.message:String(e)});trackError('resource',e)
   });
   return()=>{dead=true};
 },[metaNonce]);

 // Lesson payload does not depend on meta.json. Loading both resources concurrently
 // removes an unnecessary network waterfall during first launch and lesson changes.
 useEffect(()=>{
   let dead=false;
   setData(null);setFatal(null);
   loadLesson(lesson).then(x=>{if(!dead)setData(x)}).catch(e=>{
     if(dead)return;setFatal({scope:'lesson',message:e instanceof Error?e.message:String(e)});trackError('resource',e)
   });
   track('lesson_open',{lesson_number:lesson,open_source:'app'});
   return()=>{dead=true};
 },[lesson,lessonNonce]);

 useEffect(()=>{
   if('serviceWorker' in navigator){
     navigator.serviceWorker.register(`${process.env.NEXT_PUBLIC_BASE_PATH||''}/sw.js`,{updateViaCache:'none'})
       .catch(e=>trackError('service_worker',e));
   }
 },[]);

 useEffect(()=>{
   const onErr=(e:ErrorEvent)=>trackError('javascript',e.message||e.error);
   const onRej=(e:PromiseRejectionEvent)=>trackError('javascript',e.reason);
   const onResource=(e:Event)=>{
     const d=(e as CustomEvent).detail||{};
     setResourceNotice({kind:String(d.kind||'resource'),path:d.path,message:String(d.message||'Resource unavailable')});
   };
   const onOnline=()=>setOnline(navigator.onLine);
   window.addEventListener('error',onErr);
   window.addEventListener('unhandledrejection',onRej);
   window.addEventListener('nv:resource-error',onResource as EventListener);
   window.addEventListener('online',onOnline);window.addEventListener('offline',onOnline);
   setOnline(navigator.onLine);
   return()=>{
     window.removeEventListener('error',onErr);
     window.removeEventListener('unhandledrejection',onRej);
     window.removeEventListener('nv:resource-error',onResource as EventListener);
     window.removeEventListener('online',onOnline);window.removeEventListener('offline',onOnline);
   };
 },[]);

 useEffect(()=>{
   const pop=()=>{const s=urlState();stopAudio();setLessonState(s.lesson);setView(s.view);writeLesson(s.lesson)};
   window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop)
 },[]);

 useEffect(()=>{if(!meta)return;trackVirtualPage(view,lesson);if(view==='vocabulary')track('vocabulary_open',{lesson_number:lesson});},[view,lesson,meta]);

 const changeLesson=useCallback((n:number,v:ViewName='dashboard')=>{
   stopAudio();
   const safe=Math.max(1,Math.min(25,n));setLessonState(safe);writeLesson(safe);setView(v);syncUrl(safe,v)
 },[]);
 const changeView=(v:ViewName)=>{stopAudio();setView(v);syncUrl(lesson,v);track('section_open',{section_name:v,lesson_number:lesson})};
 const toggleMastery=(id:number)=>{setProgress(p=>{const n={...p,[String(id)]:!p[String(id)]};if(!n[String(id)])delete n[String(id)];saveProgress(n);return n})};
 const updateSrs=(n:SrsMap)=>{setSrs(n);saveSrs(n)};
 const updateProgress=(n:ProgressMap)=>{setProgress(n);saveProgress(n)};
 const addHistory=(a:MockAttempt)=>{setHistory(h=>{const n=[a,...h];saveHistory(n);return n})};

 const updateLearning=(recipe:(prev:LearningState)=>LearningState)=>{
   setLearning(prev=>{const next=recipe(prev);saveLearningState(next);return next});
 };

 const queueMockMistakes=(ids:number[])=>{
   if(!ids.length)return;
   setSrs(prev=>{
     const now=new Date().toISOString();const next={...prev};
     ids.forEach(id=>{const old=next[String(id)]||{};next[String(id)]={...old,phase:'recall',due_at:now,last_rating:'again',lapses:Number(old.lapses||0)+1}});
     saveSrs(next);return next;
   });
   updateLearning(prev=>({
     ...prev,
     mistakes:ids.reduce((rows,id)=>upsertMistake(rows,{
       itemId:String(id),lessonId:String(lesson),level:'N5',skill:'mock',questionType:'mock-vocabulary',confidence:'unsure',severity:'high',sourceId:'mock-test'
     }),prev.mistakes),
   }));
   track('mock_mistakes_to_srs',{lesson_number:lesson,mistake_count:ids.length});
   track('mistake_recorded',{lesson_number:lesson,mistake_count:ids.length,source:'mock'});
 };

 const recordSpellingAttempt=(attempt:SpellingAttempt)=>{
   const shouldRepair=!attempt.correct || attempt.confidence==='guess';
   if(!shouldRepair)return;
   updateLearning(prev=>({
     ...prev,
     mistakes:upsertMistake(prev.mistakes,{
       itemId:String(attempt.itemId),lessonId:String(attempt.lesson),level:'N5',skill:'spelling',questionType:'listen-type',userAnswer:attempt.userAnswer,correctAnswer:attempt.correctAnswer,confidence:attempt.confidence,severity:!attempt.correct&&attempt.confidence==='confident'?'high':attempt.correct?'low':'medium',sourceId:'spelling'
     }),
   }));
   track('mistake_recorded',{lesson_number:attempt.lesson,item_id:attempt.itemId,source:'spelling',confidence:attempt.confidence,was_correct:attempt.correct});
 };

 const recordLearningAttempt=(attempt:LearningAttempt,source:'kana'|'arcade')=>{
   if(attempt.correct)return;
   const skill=attempt.skill|| (source==='kana'?'kana':'game');
   updateLearning(prev=>({
     ...prev,
     mistakes:upsertMistake(prev.mistakes,{
       itemId:attempt.itemId,lessonId:String(lesson),level:'N5',skill,questionType:attempt.questionType,userAnswer:attempt.userAnswer,correctAnswer:attempt.correctAnswer,confidence:'unsure',severity:'medium',sourceId:source
     }),
   }));
   track('mistake_recorded',{lesson_number:lesson,item_id:attempt.itemId,source,skill});
 };

 const currentMeta=meta?.lessons.find(x=>x.lesson===lesson);
 const currentMastered=(currentMeta?.ids||[]).reduce((count,id)=>count+(progress[String(id)]?1:0),0);
 const lessonPct=Math.round(currentMastered/Math.max(1,currentMeta?.count||1)*100);
 const dueSrs=useMemo(()=>{
   const now=Date.now();
   return Object.values(srs).reduce((count,state)=>count+(state.due_at&&new Date(state.due_at).getTime()<=now?1:0),0);
 },[srs]);
 const lastMockScore=historyRows[0]?.score;
 const recommendations=useMemo(()=>buildDailyRecommendations({lesson,lessonPercent:lessonPct,dueSrs,mistakes:learning.mistakes,dailyMinutes:learning.studyPlan.dailyMinutes,lastMockScore}),[lesson,lessonPct,dueSrs,learning.mistakes,learning.studyPlan.dailyMinutes,lastMockScore]);
 const repairCount=useMemo(()=>getRepairQueue(learning.mistakes,500).length,[learning.mistakes]);
 const journey=useMemo(()=>data?buildLessonJourney(data):null,[data]);
 const completedJourney=learning.journeyProgress[String(lesson)]||[];
 const setDailyMinutes=(dailyMinutes:number)=>updateLearning(prev=>({...prev,studyPlan:{dailyMinutes:normalizeDailyMinutes(dailyMinutes),updatedAt:new Date().toISOString()}}));
 const toggleJourneyStage=(stageId:string)=>updateLearning(prev=>{
   const key=String(lesson);const rows=prev.journeyProgress[key]||[];const done=rows.includes(stageId);
   const nextRows=done?rows.filter(x=>x!==stageId):[...rows,stageId];
   track(done?'lesson_stage_reopened':'lesson_stage_completed',{lesson_number:lesson,stage_id:stageId});
   return {...prev,journeyProgress:{...prev.journeyProgress,[key]:nextRows}};
 });
 const openJourneyStage=(target:ViewName,stageId:string)=>{
   track('lesson_stage_open',{lesson_number:lesson,stage_id:stageId,target_view:target});
   changeView(target);
 };

 if(fatal){
   return <main className="nv58-fatal" id="main-content">
     <div className="nv58-fatal-card" role="alert">
       {online?<AlertTriangle/>:<WifiOff/>}
       <span>{online?'RESOURCE ERROR':'YOU ARE OFFLINE'}</span>
       <h1>{fatal.scope==='meta'?'Studio data could not load':'Lesson could not load'}</h1>
       <p>{fatal.message}</p>
       <div>
         <button onClick={()=>fatal.scope==='meta'?setMetaNonce(x=>x+1):setLessonNonce(x=>x+1)}><RefreshCcw/> Retry</button>
         <button onClick={()=>{setFatal(null);changeLesson(1,'dashboard')}}><BookOpen/> Go Home</button>
       </div>
     </div>
   </main>;
 }

 if(!meta||!data)return <WorkspaceBoot online={online}/>;

 const content=(()=>{
   switch(view){
     case'dashboard':return <div className="home-page-v67"><Dashboard
       meta={meta}
       lesson={lesson}
       progress={progress}
       srs={srs}
       history={historyRows}
       onNavigate={changeView}
       onLesson={changeLesson}
       coach={<DailyCoachPanel plan={learning.studyPlan} recommendations={recommendations} unresolvedMistakes={repairCount} onMinutes={setDailyMinutes} onNavigate={changeView}/>}
       journey={journey?<LessonJourneyPanel journey={journey} completed={completedJourney} onOpen={openJourneyStage} onToggleComplete={toggleJourneyStage}/>:null}
     /></div>;
     case'vocabulary':return <Vocabulary data={data} progress={progress} onToggle={toggleMastery}/>;
     case'srs':return <SRS data={data} meta={meta} srs={srs} progress={progress} onSrsChange={updateSrs} onProgressChange={updateProgress}/>;
     case'spelling':return <Spelling data={data} onAttempt={recordSpellingAttempt}/>;
     case'conversation':return <Conversation data={data}/>;
     case'reading':return <Reading data={data}/>;
     case'listening':return <Listening data={data}/>;
     case'grammar':return <Grammar data={data}/>;
     case'kanji':return <KanjiExplorer data={data}/>;
     case'kana':return <KanaAcademy onAttempt={attempt=>recordLearningAttempt({...attempt,skill:'kana'},'kana')}/>;
     case'arcade':return <PracticeArcade data={data} onAttempt={attempt=>recordLearningAttempt(attempt,'arcade')}/>;
     case'mock':return <MockTest data={data} onSave={addHistory} onReviewMistakes={queueMockMistakes}/>;
     case'history':return <HistoryView history={historyRows}/>;
     default:return null
   }
 })();

 return <>
   <Shell meta={meta} lesson={lesson} view={view} onLesson={changeLesson} onView={changeView}>
     <AnimatePresence mode="wait"><motion.div key={`${view}-${lesson}`} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:.2,ease:[.2,.8,.2,1]}}>{content}</motion.div></AnimatePresence>
   </Shell>
   <KanaPad/><DataVault/>
   {!online&&<div className="nv58-offline-pill" role="status"><WifiOff/> Offline · cached content only</div>}
   {resourceNotice&&<div className="nv58-resource-toast" role="status">
     <AlertTriangle/><div><b>{resourceNotice.kind==='audio'?'Audio unavailable':'Resource could not load'}</b><span>{resourceNotice.path||resourceNotice.message}</span></div>
     <button onClick={()=>location.reload()}><RefreshCcw/> Retry</button>
     <button onClick={()=>setResourceNotice(null)} aria-label="Dismiss"><X/></button>
   </div>}
 </>;
}
