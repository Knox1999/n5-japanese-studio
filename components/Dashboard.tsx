'use client';

import Image from 'next/image';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ArrowRight, BookOpen, Brain, CheckCircle2, ChevronDown, Headphones,
  Languages, MessageCircle, PenLine, TreePine, BookOpenText, ClipboardCheck,
  AudioLines, Sparkles, Target, type LucideIcon,
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
const basePath=process.env.NEXT_PUBLIC_BASE_PATH||'';
const ROTATING_SKILLS=[
  {bn:'হিরাগানা',jp:'ひらがな'},
  {bn:'কাতাকানা',jp:'カタカナ'},
  {bn:'কাঞ্জি',jp:'漢字'},
  {bn:'কথোপকথন',jp:'会話'},
  {bn:'JLPT N5',jp:'日本語'},
] as const;
const HERO_TOOLS:[ViewName,string,string][]=[
  ['vocabulary','ভোকাবুলারি','語彙'],
  ['grammar','গ্রামার','文法'],
  ['kanji','কাঞ্জি','漢字'],
  ['listening','লিসেনিং','聴解'],
  ['conversation','স্পিকিং','会話'],
];

function mastered(progress:ProgressMap,ids:number[]){return ids.reduce((n,id)=>n+(progress[String(id)]?1:0),0)}
function getSrsHealth(srs:SrsMap){const now=Date.now();let due=0;Object.values(srs).forEach((state:SrsCardState)=>{if(state.due_at&&new Date(state.due_at).getTime()<=now)due+=1});return{due}}
function relativeTime(value:string){const ms=Date.now()-new Date(value).getTime();if(!Number.isFinite(ms)||ms<60000)return'এখনই';const mins=Math.floor(ms/60000);if(mins<60)return`${mins}m আগে`;const hours=Math.floor(mins/60);if(hours<24)return`${hours}h আগে`;return`${Math.floor(hours/24)}d আগে`}
function clampPct(value:number){return Math.max(0,Math.min(100,value))}

function RotatingSkill(){
  const [skillIndex,setSkillIndex]=useState(0);
  const [inView,setInView]=useState(true);
  const [pageVisible,setPageVisible]=useState(true);
  const root=useRef<HTMLDivElement>(null);
  const reduceMotion=useReducedMotion();

  useEffect(()=>{
    const node=root.current;
    if(!node||typeof IntersectionObserver==='undefined')return;
    const observer=new IntersectionObserver(([entry])=>setInView(entry.isIntersecting),{rootMargin:'120px'});
    observer.observe(node);
    return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const sync=()=>setPageVisible(document.visibilityState==='visible');
    sync();
    document.addEventListener('visibilitychange',sync);
    return()=>document.removeEventListener('visibilitychange',sync);
  },[]);
  useEffect(()=>{
    if(reduceMotion||!inView||!pageVisible)return;
    const timer=window.setInterval(()=>setSkillIndex(index=>(index+1)%ROTATING_SKILLS.length),2400);
    return()=>window.clearInterval(timer);
  },[inView,pageVisible,reduceMotion]);

  const activeSkill=ROTATING_SKILLS[skillIndex];
  return <div ref={root} className="home-motion-rotate" aria-hidden="true">
    <span className="font-bn">শিখুন</span>
    <span className="home-motion-word-frame">
      <AnimatePresence mode="wait" initial={false}>
        <motion.strong
          key={activeSkill.bn}
          className="home-motion-word font-bn"
          initial={reduceMotion?false:{opacity:0,y:16}}
          animate={{opacity:1,y:0}}
          exit={reduceMotion?undefined:{opacity:0,y:-14}}
          transition={{duration:.34,ease:'easeOut'}}
        >
          {activeSkill.bn}<small className="font-jp" lang="ja">{activeSkill.jp}</small>
        </motion.strong>
      </AnimatePresence>
    </span>
    <i/>
  </div>;
}

export default function Dashboard({meta,lesson,progress,srs,history,onNavigate,onLesson,coach,journey}:DashboardProps){
  const [activity,setActivity]=useState<StudyActivityState>(()=>({version:1,entries:{}}));
  const heroRef=useRef<HTMLElement>(null);
  const reduceMotion=useReducedMotion();
  const heroInView=useInView(heroRef,{amount:.05});
  useEffect(()=>{const refresh=()=>setActivity(readStudyActivity());refresh();window.addEventListener('nv:study-activity',refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener('nv:study-activity',refresh);window.removeEventListener('storage',refresh)}},[]);

  const current=meta.lessons.find(x=>x.lesson===lesson)??meta.lessons[0];
  const currentMastered=mastered(progress,current?.ids||[]);
  const currentPct=clampPct(Math.round(currentMastered/Math.max(1,current?.count||1)*100));
  const totalMastered=Object.values(progress).filter(Boolean).length;
  const overall=clampPct(Math.round(totalMastered/Math.max(1,meta.vocabulary_count)*100));
  const health=getSrsHealth(srs);
  const best=history.length?Math.max(...history.map(x=>Number(x.score||0))):0;
  const recent=latestActivity(activity,lesson);
  const lessonMap=useMemo(()=>meta.lessons.map(item=>{const count=mastered(progress,item.ids||[]);const pct=Math.round(count/Math.max(1,item.count||1)*100);return{lesson:item.lesson,title:item.title,pct,complete:pct>=80,active:item.lesson===lesson}}),[lesson,meta.lessons,progress]);
  const dialStyle={'--home-motion-progress':`${Math.max(0,Math.min(100,overall))*3.6}deg`} as CSSProperties;
  const scrollToCoach=()=>{
    const title=document.getElementById('daily-coach-title');
    (title?.closest('section')??title)?.scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'start'});
  };

  return <div className="home-simple home-motion">
    <motion.section
      ref={heroRef}
      className="home-motion-hero"
      data-motion-active={heroInView&&!reduceMotion?'true':'false'}
      aria-labelledby="home-title"
      initial={reduceMotion?false:{opacity:0,y:16}}
      animate={{opacity:1,y:0}}
      transition={{duration:.64,ease:[.2,.8,.2,1]}}
    >
      <div className="home-motion-grid" aria-hidden="true"/>
      <div className="home-motion-orb home-motion-orb-a" aria-hidden="true"/>
      <div className="home-motion-orb home-motion-orb-b" aria-hidden="true"/>
      <div className="home-motion-glyphs font-jp" aria-hidden="true"><span>あ</span><span>語</span><span>日</span></div>

      <div className="home-motion-copy">
        <div className="home-motion-trust">
          <Sparkles size={14}/>
          <span className="font-bn">ফ্রি · {meta.lesson_count||25}টি GUIDED LESSON · JLPT N5</span>
        </div>

        <h1 id="home-title" className="font-bn">
          জাপানিজ শেখা হোক <span>আনন্দে!</span>
        </h1>

        <RotatingSkill/>
        <span className="sr-only">শিখুন হিরাগানা, কাতাকানা, কাঞ্জি, কথোপকথন এবং JLPT N5</span>

        <p className="home-motion-lead font-bn">
          বাংলায় বুঝুন, Japanese-এ ব্যবহার করুন—Vocabulary থেকে Mock Test পর্যন্ত
          একই connected learning studio-তে নিজের গতিতে এগিয়ে যান।
        </p>

        <div className="home-motion-tools" role="group" aria-label="দ্রুত learning tools">
          {HERO_TOOLS.map(([view,label,jp],index)=><motion.button
            key={view}
            type="button"
            onClick={()=>onNavigate(view)}
            initial={reduceMotion?false:{opacity:0,y:10}}
            animate={{opacity:1,y:0}}
            transition={{delay:.22+index*.07,duration:.36}}
          ><span className="font-bn">{label}</span><small className="font-jp" lang="ja">{jp}</small></motion.button>)}
        </div>

        <div className="home-motion-actions">
          <button type="button" className="home-motion-primary" onClick={()=>onLesson(lesson,'vocabulary')}>
            <BookOpen/><span className="font-bn">Lesson {String(lesson).padStart(2,'0')} চালিয়ে যান</span><ArrowRight/>
          </button>
          <button type="button" className="home-motion-secondary" onClick={scrollToCoach}>
            <Target/><span className="font-bn">আজ কী পড়ব?</span>
          </button>
        </div>

        <div className="home-motion-facts">
          <span><CheckCircle2/> Guest হিসেবেই শুরু</span>
          <span><AudioLines/> Free device voice</span>
          <span><Sparkles/> Progress এই device-এ</span>
        </div>
      </div>

      <aside className="home-motion-progress-card" aria-label="আপনার JLPT N5 অগ্রগতি">
        <header>
          <Image src={`${basePath}/assets/nihongo-vibes-logo-96.png`} alt="" width={96} height={96}/>
          <div><small>THE NIHONGO VIBES</small><b>YOUR N5 JOURNEY</b></div>
          <span>LIVE</span>
        </header>

        <div className="home-motion-dial-wrap">
          <div className="home-motion-dial" style={dialStyle} role="progressbar" aria-label="সামগ্রিক vocabulary mastery" aria-valuemin={0} aria-valuemax={100} aria-valuenow={overall}>
            <div><small>OVERALL</small><strong>{overall}%</strong><span>mastery</span></div>
          </div>
          <div className="home-motion-current">
            <small>বর্তমান LESSON</small>
            <h2>{String(lesson).padStart(2,'0')} · {current?.title}</h2>
            <p className="font-bn">{current?.scenario||'আজকের lesson-এর vocabulary, listening ও recall একসাথে শেষ করুন।'}</p>
          </div>
        </div>

        <div className="home-current-progress home-motion-current-progress">
          <div><span>এই lesson-এর vocabulary</span><b>{currentPct}%</b></div>
          <i role="progressbar" aria-label="এই lesson-এর vocabulary mastery" aria-valuemin={0} aria-valuemax={100} aria-valuenow={currentPct}><em style={{width:`${Math.max(0,currentPct)}%`}}/></i>
        </div>

        <div className="home-motion-card-stats">
          <div><span>শব্দ</span><b>{meta.vocabulary_count.toLocaleString()}</b></div>
          <div><span>Due</span><b>{health.due}</b></div>
          <div><span>Best mock</span><b>{best}%</b></div>
        </div>
        {recent&&<small className="home-last-activity">শেষ activity: {VIEW_LABEL[recent.view]||recent.view} · {relativeTime(recent.lastAt)}</small>}
      </aside>
    </motion.section>

    {coach&&<motion.div
      className="home-motion-reveal"
      initial={reduceMotion?false:{opacity:0,y:22}}
      whileInView={{opacity:1,y:0}}
      viewport={{once:true,amount:.12}}
      transition={{duration:.52,ease:[.2,.8,.2,1]}}
    >{coach}</motion.div>}
    {journey&&<motion.div
      className="home-motion-reveal"
      initial={reduceMotion?false:{opacity:0,y:22}}
      whileInView={{opacity:1,y:0}}
      viewport={{once:true,amount:.1}}
      transition={{duration:.56,ease:[.2,.8,.2,1]}}
    >{journey}</motion.div>}

    <motion.section
      className="home-compact-stats"
      aria-label="Course progress summary"
      initial={reduceMotion?false:{opacity:0,y:18}}
      whileInView={{opacity:1,y:0}}
      viewport={{once:true,amount:.24}}
      transition={{duration:.48,ease:[.2,.8,.2,1]}}
    >
      <article><span>Course vocabulary</span><b>{overall}%</b></article>
      <article><span>Due review</span><b>{health.due}</b></article>
      <article><span>Best mock</span><b>{best}%</b></article>
    </motion.section>

    <motion.details
      className="home-explore"
      initial={reduceMotion?false:{opacity:0,y:18}}
      whileInView={{opacity:1,y:0}}
      viewport={{once:true,amount:.18}}
      transition={{duration:.48,ease:[.2,.8,.2,1]}}
    >
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
    </motion.details>
  </div>;
}
