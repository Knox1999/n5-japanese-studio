'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Headphones,
  Languages,
  MessageCircle,
  PenLine,
  RotateCcw,
  TreePine,
  Waves,
  type LucideIcon,
} from 'lucide-react';

import type { MockAttempt, SrsCardState, StudioMeta, ViewName } from '@/lib/types';
import type { ProgressMap, SrsMap } from '@/lib/storage';
import LearningLabLauncher from './LearningLabLauncher';

type DashboardProps = {
  meta: StudioMeta;
  lesson: number;
  progress: ProgressMap;
  srs: SrsMap;
  history: MockAttempt[];
  onNavigate: (view: ViewName) => void;
  onLesson: (lesson: number, view?: ViewName) => void;
};

type Module = {
  view: ViewName;
  glyph: string;
  title: string;
  bangla: string;
  detailBn: string;
  icon: LucideIcon;
};

const MODULES: Module[] = [
  {view:'vocabulary',glyph:'語',title:'Vocabulary',bangla:'শব্দভান্ডার',detailBn:'অর্থ, উচ্চারণ, example এবং mastery একসাথে শিখুন।',icon:BookOpen},
  {view:'srs',glyph:'憶',title:'Smart Recall',bangla:'স্মার্ট রিভিউ',detailBn:'Due শব্দ spaced recall দিয়ে দীর্ঘমেয়াদে মনে রাখুন।',icon:Brain},
  {view:'listening',glyph:'聴',title:'Listening',bangla:'শোনা ও শ্যাডোয়িং',detailBn:'Natural Japanese শুনুন, line ধরে repeat ও shadow করুন।',icon:Headphones},
  {view:'conversation',glyph:'話',title:'Conversation',bangla:'কথোপকথন',detailBn:'A/B role ধরে everyday Japanese context practice করুন।',icon:MessageCircle},
  {view:'spelling',glyph:'書',title:'Active Output',bangla:'শুনে লিখুন',detailBn:'শুনুন, recall করুন, লিখুন, তারপর answer check করুন।',icon:PenLine},
  {view:'reading',glyph:'読',title:'Reading',bangla:'রিডিং',detailBn:'পরিষ্কার Japanese passage পড়ুন; দরকারে বাংলা support নিন।',icon:BookOpenText},
  {view:'grammar',glyph:'文',title:'Grammar Studio',bangla:'গ্রামার',detailBn:'Pattern, meaning, formula ও examples visualভাবে বুঝুন।',icon:Languages},
  {view:'kanji',glyph:'漢',title:'Kanji Explorer',bangla:'কাঞ্জি',detailBn:'Beginner recognition থেকে KLC construction পর্যন্ত explore করুন।',icon:TreePine},
  {view:'mock',glyph:'試',title:'JLPT Practice',bangla:'মক টেস্ট',detailBn:'Quick, Mini এবং Full practice দিয়ে readiness যাচাই করুন।',icon:ClipboardCheck},
];

function mastered(progress: ProgressMap, ids: number[]) {
  return ids.reduce((count,id)=>count+(progress[String(id)]?1:0),0);
}

function getSrsHealth(srs:SrsMap,total:number) {
  const now=Date.now();
  let due=0;
  let mature=0;
  Object.values(srs).forEach((state:SrsCardState)=>{
    if(state.due_at && new Date(state.due_at).getTime()<=now) due+=1;
    if((state.repetitions||0)>=5 || Number(state.interval_days||0)>=7) mature+=1;
  });
  return {due,mature,fresh:Math.max(0,total-Object.keys(srs).length)};
}

export default function Dashboard({meta,lesson,progress,srs,history,onNavigate,onLesson}:DashboardProps) {
  const totalMastered=Object.values(progress).filter(Boolean).length;
  const overall=Math.round(totalMastered/Math.max(1,meta.vocabulary_count)*100);
  const current=meta.lessons.find(x=>x.lesson===lesson)??meta.lessons[0];
  const currentMastered=mastered(progress,current?.ids||[]);
  const currentPct=Math.round(currentMastered/Math.max(1,current?.count||1)*100);
  const health=getSrsHealth(srs,meta.vocabulary_count);
  const best=history.length?Math.max(...history.map(x=>Number(x.score||0))):0;

  const lessonMap=useMemo(()=>meta.lessons.map(item=>{
    const count=mastered(progress,item.ids||[]);
    const pct=Math.round(count/Math.max(1,item.count||1)*100);
    return {lesson:item.lesson,title:item.title,scenario:item.scenario,pct,complete:pct>=80,active:item.lesson===lesson};
  }),[lesson,meta.lessons,progress]);

  return (
    <div className="v67-dashboard-core">
      <section className="v67-course-pulse" aria-labelledby="course-pulse-title">
        <div className="v67-pulse-main">
          <div className="v67-pulse-kicker"><Waves size={15}/><span>COURSE PULSE</span></div>
          <div className="v67-pulse-title">
            <span>{String(lesson).padStart(2,'0')}</span>
            <div><small>CURRENT LESSON</small><h2 id="course-pulse-title">{current?.title}</h2><p className="font-bn">{current?.scenario}</p></div>
          </div>
          <div className="v67-pulse-progress"><div><span>Lesson mastery</span><b>{currentPct}%</b></div><i><em style={{width:`${Math.max(2,currentPct)}%`}}/></i></div>
          <div className="v67-pulse-actions"><button onClick={()=>onLesson(lesson,'vocabulary')}><BookOpen size={17}/><span className="font-bn">Lesson খুলুন</span><ArrowRight size={16}/></button><button onClick={()=>onNavigate('srs')}><RotateCcw size={16}/><span className="font-bn">{health.due?`${health.due} due review`:'Smart Recall'}</span></button></div>
        </div>
        <div className="v67-pulse-stats">
          <article><span>Course mastery</span><b>{overall}%</b><small>{totalMastered}/{meta.vocabulary_count} words</small></article>
          <article><span>Due now</span><b>{health.due}</b><small>review cards</small></article>
          <article><span>Mature</span><b>{health.mature}</b><small>memory cards</small></article>
          <article><span>Best mock</span><b>{best}%</b><small>saved score</small></article>
        </div>
      </section>

      <section id="course-map" className="v67-course-map" aria-label="25 lesson course path">
        <header className="v67-section-head"><div><span>COURSE PATH</span><h2 className="font-bn">২৫টি lesson · এক নজরে পুরো progression</h2></div><p className="font-bn">Current lesson, completed lesson এবং next destination—একই জায়গা থেকে দেখুন।</p></header>
        <div className="v67-lesson-grid">
          {lessonMap.map(item=><button key={item.lesson} className={[item.active?'active':'',item.complete?'complete':''].filter(Boolean).join(' ')} onClick={()=>onLesson(item.lesson,'vocabulary')} aria-label={`Lesson ${item.lesson}: ${item.title}, ${item.pct}% mastered`}>
            <span className="v67-lesson-no">{String(item.lesson).padStart(2,'0')}</span>
            <div><small>LESSON</small><b>{item.title}</b><em className="font-bn">{item.scenario||'Japanese foundation'}</em></div>
            <strong>{item.complete?<CheckCircle2 size={15}/>:`${item.pct}%`}</strong>
            <i><em style={{width:`${Math.max(3,item.pct)}%`}}/></i>
          </button>)}
        </div>
      </section>

      <LearningLabLauncher onNavigate={onNavigate}/>

      <section className="v67-module-section">
        <header className="v67-section-head"><div><span>LEARNING STUDIO</span><h2 className="font-bn">এক lesson · সব core skill connected</h2></div><p className="font-bn">শেখা, শোনা, বলা, পড়া, লেখা, recall এবং test—সব একই progress system-এর অংশ।</p></header>
        <div className="v67-module-grid">
          {MODULES.map(({view:moduleView,glyph,title,bangla,detailBn,icon:Icon},index)=><motion.button key={moduleView} onClick={()=>onNavigate(moduleView)} initial={{opacity:0,y:8}} whileInView={{opacity:1,y:0}} viewport={{once:true,margin:'-30px'}} transition={{delay:Math.min(index,6)*.02}}>
            <div className="v67-module-top"><span className="font-jp">{glyph}</span><Icon size={17}/></div>
            <small>{String(index+1).padStart(2,'0')} · {title}</small>
            <h3 className="font-bn">{bangla}</h3>
            <p className="font-bn">{detailBn}</p>
            <em>Open <ArrowRight size={14}/></em>
          </motion.button>)}
        </div>
      </section>
    </div>
  );
}
