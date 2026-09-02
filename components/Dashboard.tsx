'use client';

import Image from 'next/image';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ArrowRight, BookOpen, Brain, CheckCircle2, ChevronDown, Headphones,
  Languages, MessageCircle, PenLine, TreePine, BookOpenText, ClipboardCheck,
  AudioLines, Sparkles, Target, Sunrise, Sun, Moon, type LucideIcon,
} from 'lucide-react';

import type { MockAttempt, SrsCardState, StudioMeta, ViewName } from '@/lib/types';
import type { ProgressMap, SrsMap } from '@/lib/storage';
import { latestActivity, readStudyActivity, type StudyActivityState } from '@/lib/studyActivity';
import { useLanguage } from '@/lib/language';

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
  {bn:'হিরাগানা',en:'Hiragana',jp:'ひらがな'},
  {bn:'কাতাকানা',en:'Katakana',jp:'カタカナ'},
  {bn:'কাঞ্জি',en:'Kanji',jp:'漢字'},
  {bn:'কথোপকথন',en:'Conversation',jp:'会話'},
  {bn:'JLPT N5',en:'JLPT N5',jp:'日本語'},
] as const;
const HERO_TOOLS:[ViewName,string,string,string][]=[
  ['vocabulary','ভোকাবুলারি','Vocabulary','語彙'],
  ['grammar','গ্রামার','Grammar','文法'],
  ['kanji','কাঞ্জি','Kanji','漢字'],
  ['listening','লিসেনিং','Listening','聴解'],
  ['conversation','স্পিকিং','Speaking','会話'],
];

function timeGreeting(hour:number){
  if(hour>=5&&hour<=11)return{icon:Sunrise,jp:'おはよう',en:'Good morning',bn:'শুভ সকাল'};
  if(hour>=12&&hour<=17)return{icon:Sun,jp:'こんにちは',en:'Good afternoon',bn:'শুভ অপরাহ্ন'};
  return{icon:Moon,jp:'こんばんは',en:'Good evening',bn:'শুভ সন্ধ্যা'};
}
function mastered(progress:ProgressMap,ids:number[]){return ids.reduce((n,id)=>n+(progress[String(id)]?1:0),0)}
function getSrsHealth(srs:SrsMap){const now=Date.now();let due=0;Object.values(srs).forEach((state:SrsCardState)=>{if(state.due_at&&new Date(state.due_at).getTime()<=now)due+=1});return{due}}
function relativeTime(value:string,language:'bn'|'en'){const ms=Date.now()-new Date(value).getTime();if(!Number.isFinite(ms)||ms<60000)return language==='bn'?'এখনই':'just now';const mins=Math.floor(ms/60000);if(mins<60)return language==='bn'?`${mins}m আগে`:`${mins}m ago`;const hours=Math.floor(mins/60);if(hours<24)return language==='bn'?`${hours}h আগে`:`${hours}h ago`;const days=Math.floor(hours/24);return language==='bn'?`${days}d আগে`:`${days}d ago`}
function clampPct(value:number){return Math.max(0,Math.min(100,value))}

function RotatingSkill({language}:{language:'bn'|'en'}){
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
    <span className={language==='bn'?'font-bn':''}>{language==='bn'?'শিখুন':'Learn'}</span>
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
          {language==='bn'?activeSkill.bn:activeSkill.en}<small className="font-jp" lang="ja">{activeSkill.jp}</small>
        </motion.strong>
      </AnimatePresence>
    </span>
    <i/>
  </div>;
}

export default function Dashboard({meta,lesson,progress,srs,history,onNavigate,onLesson,coach,journey}:DashboardProps){
  const {language,text}=useLanguage();
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
  const greeting=useMemo(()=>timeGreeting(new Date().getHours()),[]);
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
        <div className="home-motion-greeting">
          <greeting.icon size={14}/>
          <span className="font-jp" lang="ja">{greeting.jp}</span>
          <span className={language==='bn'?'font-bn':''}>· {text(`${greeting.bn}!`,`${greeting.en}!`)}</span>
        </div>
        <div className="home-motion-trust">
          <Sparkles size={14}/>
          <span className={language==='bn'?'font-bn':''}>{text(`ফ্রি · ${meta.lesson_count||25}টি GUIDED LESSON · JLPT N5`,`FREE · ${meta.lesson_count||25} GUIDED LESSONS · JLPT N5`)}</span>
        </div>

        <h1 id="home-title" className={language==='bn'?'font-bn':''}>
          {text('জাপানিজ শেখা হোক ','Build Japanese skills ')}<span>{text('আনন্দে!','with confidence.')}</span>
        </h1>

        <RotatingSkill language={language}/>
        <span className="sr-only">{text('শিখুন হিরাগানা, কাতাকানা, কাঞ্জি, কথোপকথন এবং JLPT N5','Learn Hiragana, Katakana, Kanji, conversation and JLPT N5')}</span>

        <p className={`home-motion-lead ${language==='bn'?'font-bn':''}`}>
          {text('বাংলায় বুঝুন, Japanese-এ ব্যবহার করুন—Vocabulary থেকে Mock Test পর্যন্ত একই connected learning studio-তে নিজের গতিতে এগিয়ে যান।','Learn, practise and review Japanese—from vocabulary to full mock tests—in one connected studio.')}
        </p>

        <div className="home-motion-tools" role="group" aria-label={text('দ্রুত learning tools','Quick learning tools')}>
          {HERO_TOOLS.map(([view,labelBn,labelEn,jp],index)=><motion.button
            key={view}
            type="button"
            onClick={()=>onNavigate(view)}
            initial={reduceMotion?false:{opacity:0,y:10}}
            animate={{opacity:1,y:0}}
            transition={{delay:.22+index*.07,duration:.36}}
          ><span className={language==='bn'?'font-bn':''}>{language==='bn'?labelBn:labelEn}</span><small className="font-jp" lang="ja">{jp}</small></motion.button>)}
        </div>

        <div className="home-motion-actions">
          <button type="button" className="home-motion-primary" onClick={()=>onLesson(lesson,'vocabulary')}>
            <BookOpen/><span className={language==='bn'?'font-bn':''}>{text(`Lesson ${String(lesson).padStart(2,'0')} চালিয়ে যান`,`Continue Lesson ${String(lesson).padStart(2,'0')}`)}</span><ArrowRight/>
          </button>
          <button type="button" className="home-motion-secondary" onClick={scrollToCoach}>
            <Target/><span className={language==='bn'?'font-bn':''}>{text('আজ কী পড়ব?','What should I study today?')}</span>
          </button>
        </div>

        <div className="home-motion-facts">
          <span><CheckCircle2/> {text('ব্যক্তিগত account workspace','Personal account workspace')}</span>
          <span><AudioLines/> {text('দ্রুত static audio + device fallback','Fast audio + device fallback')}</span>
          <span><Sparkles/> {text('Cloud sync, export ও deletion control','Cloud sync, export & deletion controls')}</span>
        </div>
      </div>

      <aside className="home-motion-progress-card" aria-label={text('আপনার JLPT N5 অগ্রগতি','Your JLPT N5 progress')}>
        <header>
          <Image src={`${basePath}/assets/nihongo-vibes-logo-96.png`} alt="" width={96} height={96}/>
          <div><small>THE NIHONGO VIBES</small><b>YOUR N5 JOURNEY</b></div>
          <span>LIVE</span>
        </header>

        <div className="home-motion-dial-wrap">
          <div className="home-motion-dial" style={dialStyle} role="progressbar" aria-label={text('সামগ্রিক vocabulary mastery','Overall vocabulary mastery')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={overall}>
            <div><small>OVERALL</small><strong>{overall}%</strong><span>mastery</span></div>
          </div>
          <div className="home-motion-current">
            <small>{text('বর্তমান LESSON','CURRENT LESSON')}</small>
            <h2>{String(lesson).padStart(2,'0')} · {current?.title}</h2>
            <p className={language==='bn'?'font-bn':''}>{language==='bn'?(current?.scenario||'আজকের lesson-এর vocabulary, listening ও recall একসাথে শেষ করুন।'):'Complete this lesson’s vocabulary, listening and recall in one focused path.'}</p>
          </div>
        </div>

        <div className="home-current-progress home-motion-current-progress">
          <div><span>{text('এই lesson-এর vocabulary','This lesson’s vocabulary')}</span><b>{currentPct}%</b></div>
          <i role="progressbar" aria-label={text('এই lesson-এর vocabulary mastery','This lesson’s vocabulary mastery')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={currentPct}><em style={{width:`${Math.max(0,currentPct)}%`}}/></i>
        </div>

        <div className="home-motion-card-stats">
          <div><span>{text('শব্দ','Words')}</span><b>{meta.vocabulary_count.toLocaleString()}</b></div>
          <div><span>{text('রিভিউ বাকি','Due')}</span><b>{health.due}</b></div>
          <div><span className={language==='bn'?'font-bn':''}>{text('সেরা mock','Best mock')}</span><b>{best}%</b></div>
        </div>
        {recent&&<small className="home-last-activity">{text('শেষ activity','Last activity')}: {VIEW_LABEL[recent.view]||recent.view} · {relativeTime(recent.lastAt,language)}</small>}
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
      aria-label={text('কোর্স অগ্রগতির সারাংশ','Course progress summary')}
      initial={reduceMotion?false:{opacity:0,y:18}}
      whileInView={{opacity:1,y:0}}
      viewport={{once:true,amount:.24}}
      transition={{duration:.48,ease:[.2,.8,.2,1]}}
    >
      <article><span className={language==='bn'?'font-bn':''}>{text('কোর্স vocabulary','Course vocabulary')}</span><b>{overall}%</b></article>
      <article><span className={language==='bn'?'font-bn':''}>{text('রিভিউ বাকি','Due review')}</span><b>{health.due}</b></article>
      <article><span className={language==='bn'?'font-bn':''}>{text('সেরা mock','Best mock')}</span><b>{best}%</b></article>
    </motion.section>

    <motion.details
      className="home-explore"
      initial={reduceMotion?false:{opacity:0,y:18}}
      whileInView={{opacity:1,y:0}}
      viewport={{once:true,amount:.18}}
      transition={{duration:.48,ease:[.2,.8,.2,1]}}
    >
      <summary><div><b className={language==='bn'?'font-bn':''}>{text('আরও explore করুন','Explore more')}</b><span>{text('সব skill ও ২৫টি lesson','All skills and 25 lessons')}</span></div><ChevronDown/></summary>
      <div className="home-explore-body">
        <section>
          <h2 className={language==='bn'?'font-bn':''}>{text('লার্নিং টুলস','Learning tools')}</h2>
          <div className="home-tool-grid">{MODULES.map(({view,title,bangla,icon:Icon})=><button key={view} onClick={()=>onNavigate(view)}><Icon/><span><b className={language==='bn'?'font-bn':''}>{language==='bn'?bangla:title}</b><small>{language==='bn'?title:'JLPT N5'}</small></span><ArrowRight/></button>)}</div>
        </section>
        <section>
          <h2 className={language==='bn'?'font-bn':''}>{text('২৫টি lesson','25 lessons')}</h2>
          <div className="home-lesson-list">{lessonMap.map(item=><button key={item.lesson} className={item.active?'active':''} onClick={()=>onLesson(item.lesson,'vocabulary')}><span>{String(item.lesson).padStart(2,'0')}</span><div><b>{item.title}</b><small className={language==='bn'?'font-bn':''}>{text(`${item.pct}% শব্দভান্ডার`,`${item.pct}% vocabulary`)}</small></div><strong>{item.complete?<CheckCircle2/>:`${item.pct}%`}</strong></button>)}</div>
        </section>
      </div>
    </motion.details>
  </div>;
}
