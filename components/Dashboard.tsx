'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRight, BookOpen, Brain, CheckCircle2, ChevronDown, Headphones,
  Languages, MessageCircle, PenLine, TreePine, BookOpenText, ClipboardCheck,
  type LucideIcon,
} from 'lucide-react';

import type { MockAttempt, SrsCardState, StudioMeta, ViewName } from '@/lib/types';
import type { ProgressMap, SrsMap } from '@/lib/storage';
import { latestActivity, readStudyActivity, type StudyActivityState } from '@/lib/studyActivity';

type DashboardProps = {
  meta: StudioMeta;
  lesson: number;
  progress: ProgressMap;
  srs: SrsMap;
  history: MockAttempt[];
  onNavigate: (view: ViewName) => void;
  onLesson: (lesson: number, view?: ViewName) => void;
  coach?: ReactNode;
  journey?: ReactNode;
};

type Module = { view:ViewName; title:string; bangla:string; icon:LucideIcon };
const MODULES:Module[]=[
  {view:'vocabulary',title:'Vocabulary',bangla:'শব্দভান্ডার',icon:BookOpen},
  {view:'srs',title:'Smart Recall',bangla:'রিভিউ',icon:Brain},
  {view:'listening',title:'Listening',bangla:'শোনা',icon:Headphones},
  {view:'conversation',title:'Conversation',bangla:'কথোপকথন',icon:MessageCircle},
  {view:'spelling',title:'Active Output',bangla:'শুনে লিখুন',icon:PenLine},
  {view:'reading',title:'Reading',bangla:'রিডিং',icon:BookOpenText},
  {view:'grammar',title:'Grammar',bangla:'গ্রামার',icon:Languages},
  {view:'kanji',title:'Kanji',bangla:'কাঞ্জি',icon:TreePine},
  {view:'mock',title:'JLPT Mock',bangla:'মক টেস্ট',icon:ClipboardCheck},
];
const VIEW_LABEL:Partial<Record<ViewName,string>>={vocabulary:'Vocabulary',srs:'Smart Recall',listening:'Listening',conversation:'Conversation',spelling:'Active Output',reading:'Reading',grammar:'Grammar',kanji:'Kanji',kana:'Kana',arcade:'Arcade',mock:'Mock Test'};

function mastered(progress:ProgressMap,ids:number[]){return ids.reduce((n,id)=>n+(progress[String(id)]?1:0),0)}
function getSrsHealth(srs:SrsMap){const now=Date.now();let due=0;Object.values(srs).forEach((state:SrsCardState)=>{if(state.due_at&&new Date(state.due_at).getTime()<=now)due+=1});return{due}}
function relativeTime(value:string){const ms=Date.now()-new Date(value).getTime();if(!Number.isFinite(ms)||ms<60000)return'এখনই';const mins=Math.floor(ms/60000);if(mins<60)return`${mins}m আগে`;const hours=Math.floor(mins/60);if(hours<24)return`${hours}h আগে`;return`${Math.floor(hours/24)}d আগে`}

export default function Dashboard({meta,lesson,progress,srs,history,onNavigate,onLesson,coach,journey}:DashboardProps){
  const [activity,setActivity]=useState<StudyActivityState>(()=>({version:1,entries:{}}));
  useEffect(()=>{const refresh=()=>setActivity(readStudyActivity());refresh();window.addEventListener('nv:study-activity',refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener('nv:study-activity',refresh);window.removeEventListener('storage',refresh)}},[]);

  const current=meta.lessons.find(x=>x.lesson===lesson)??meta.lessons[0];
  const currentMastered=mastered(progress,current?.ids||[]);
  const currentPct=Math.round(currentMastered/Math.max(1,current?.count||1)*100);
  const totalMastered=Object.values(progress).filter(Boolean).length;
  const overall=Math.round(totalMastered/Math.max(1,meta.vocabulary_count)*100);
  const health=getSrsHealth(srs);
  const best=history.length?Math.max(...history.map(x=>Number(x.score||0))):0;
  const recent=latestActivity(activity,lesson);
  const lessonMap=useMemo(()=>meta.lessons.map(item=>{const count=mastered(progress,item.ids||[]);const pct=Math.round(count/Math.max(1,item.count||1)*100);return{lesson:item.lesson,title:item.title,pct,complete:pct>=80,active:item.lesson===lesson}}),[lesson,meta.lessons,progress]);

  return <div className="home-simple">
    <section className="home-simple-hero" aria-labelledby="home-title">
      <div className="home-simple-copy">
        <span className="home-eyebrow">LESSON {String(lesson).padStart(2,'0')} · CONTINUE LEARNING</span>
        <h1 id="home-title" className="font-bn">আজ এখান থেকেই শুরু করুন</h1>
        <p className="font-bn">{current?.title}{current?.scenario?` · ${current.scenario}`:''}</p>
        <div className="home-current-progress"><div><span>এই lesson-এর vocabulary</span><b>{currentPct}%</b></div><i><em style={{width:`${Math.max(2,currentPct)}%`}}/></i></div>
        {recent&&<small className="home-last-activity">শেষ activity: {VIEW_LABEL[recent.view]||recent.view} · {relativeTime(recent.lastAt)}</small>}
        <button className="home-primary-cta" onClick={()=>onLesson(lesson,'vocabulary')}><BookOpen/><span className="font-bn">Lesson চালিয়ে যান</span><ArrowRight/></button>
      </div>
    </section>

    {coach}
    {journey}

    <section className="home-compact-stats" aria-label="Course progress summary">
      <article><span>Course vocabulary</span><b>{overall}%</b></article>
      <article><span>Due review</span><b>{health.due}</b></article>
      <article><span>Best mock</span><b>{best}%</b></article>
    </section>

    <details className="home-explore">
      <summary><div><b className="font-bn">আরও explore করুন</b><span>সব skill ও ২৫টি lesson</span></div><ChevronDown/></summary>
      <div className="home-explore-body">
        <section>
          <h2 className="font-bn">Learning tools</h2>
          <div className="home-tool-grid">{MODULES.map(({view,title,bangla,icon:Icon})=><button key={view} onClick={()=>onNavigate(view)}><Icon/><span><b className="font-bn">{bangla}</b><small>{title}</small></span><ArrowRight/></button>)}</div>
        </section>
        <section>
          <h2 className="font-bn">২৫টি lesson</h2>
          <div className="home-lesson-list">{lessonMap.map(item=><button key={item.lesson} className={item.active?'active':''} onClick={()=>onLesson(item.lesson,'vocabulary')}><span>{String(item.lesson).padStart(2,'0')}</span><div><b>{item.title}</b><small>{item.pct}% vocabulary</small></div><strong>{item.complete?<CheckCircle2/>:`${item.pct}%`}</strong></button>)}</div>
        </section>
      </div>
    </details>
  </div>;
}
