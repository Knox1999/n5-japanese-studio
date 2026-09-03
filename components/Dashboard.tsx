'use client';

import Image from 'next/image';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ArrowRight, BookOpen, Brain, CheckCircle2, ChevronDown, Headphones,
  Languages, MessageCircle, PenLine, TreePine, BookOpenText, ClipboardCheck,
  AudioLines, Sparkles, Target, Sunrise, Sun, Moon, Flame, Trophy, Layers, UserRound,
  Crown, Gamepad2, GraduationCap, Lock, Mail, Medal, type LucideIcon,
} from 'lucide-react';

import type { MistakeRecord, MockAttempt, SrsCardState, StudioMeta, ViewName } from '@/lib/types';
import type { ProgressMap, SrsMap } from '@/lib/storage';
import { latestActivity, readStudyActivity, type StudyActivityState } from '@/lib/studyActivity';
import { weakSkills } from '@/lib/learning';
import { ensureFreshSession, getAccountProfile, type AccountProfile } from '@/lib/account';
import { sendStudyReminder } from '@/lib/email';
import { computeXp, levelProgress, splitAchievements, type AchievementContext, type AchievementIcon } from '@/lib/gamification';
import { useLanguage } from '@/lib/language';

const ACHIEVEMENT_ICON:Record<AchievementIcon,LucideIcon>={
  seedling:Sparkles,book:BookOpen,trophy:Trophy,flame:Flame,target:Target,brain:Brain,medal:Medal,crown:Crown,
};

type DashboardProps = {
  meta: StudioMeta;
  lesson: number;
  progress: ProgressMap;
  srs: SrsMap;
  history: MockAttempt[];
  mistakes: MistakeRecord[];
  onNavigate: (view: ViewName) => void;
  onLesson: (lesson: number, view?: ViewName) => void;
  coach?: ReactNode;
  journey?: ReactNode;
};

const SKILL_LABEL:Record<string,[string,string]>={
  vocabulary:['শব্দভান্ডার','Vocabulary'],srs:['স্মার্ট রিভিউ','Smart Recall'],kana:['কানা','Kana'],
  kanji:['কাঞ্জি','Kanji'],grammar:['গ্রামার','Grammar'],listening:['লিসেনিং','Listening'],
  particles:['পার্টিকেল','Particles'],reading:['রিডিং','Reading'],spelling:['স্পেলিং','Spelling'],
  conversation:['কথোপকথন','Conversation'],mock:['মক টেস্ট','Mock test'],game:['আর্কেড','Arcade'],
};

function dateKey(value:string|number|Date){const d=new Date(value);return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):''}
function computeStreak(activityDays:Set<string>){
  if(!activityDays.size)return 0;
  const today=new Date();
  let cursor=dateKey(today);
  if(!activityDays.has(cursor)){
    const yesterday=new Date(today);yesterday.setDate(yesterday.getDate()-1);
    cursor=dateKey(yesterday);
    if(!activityDays.has(cursor))return 0;
  }
  let streak=0;
  const day=new Date(cursor);
  while(activityDays.has(dateKey(day))){streak+=1;day.setDate(day.getDate()-1)}
  return streak;
}

type Module = { view:ViewName; title:string; bangla:string; icon:LucideIcon };
const MODULES:Module[]=[
  {view:'kana',title:'Kana Academy',bangla:'কানা একাডেমি',icon:GraduationCap},
  {view:'vocabulary',title:'Vocabulary',bangla:'শব্দভান্ডার',icon:BookOpen},
  {view:'srs',title:'Smart Recall',bangla:'রিভিউ',icon:Brain},
  {view:'listening',title:'Listening',bangla:'শোনা',icon:Headphones},
  {view:'conversation',title:'Conversation',bangla:'কথোপকথন',icon:MessageCircle},
  {view:'spelling',title:'Active Output',bangla:'শুনে লিখুন',icon:PenLine},
  {view:'reading',title:'Reading',bangla:'রিডিং',icon:BookOpenText},
  {view:'grammar',title:'Grammar',bangla:'গ্রামার',icon:Languages},
  {view:'kanji',title:'Kanji',bangla:'কাঞ্জি',icon:TreePine},
  {view:'mock',title:'JLPT Mock',bangla:'মক টেস্ট',icon:ClipboardCheck},
  {view:'arcade',title:'Practice Arcade',bangla:'প্র্যাকটিস আর্কেড',icon:Gamepad2},
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

export default function Dashboard({meta,lesson,progress,srs,history,mistakes,onNavigate,onLesson,coach,journey}:DashboardProps){
  const {language,text}=useLanguage();
  const [activity,setActivity]=useState<StudyActivityState>(()=>({version:1,entries:{}}));
  const [profile,setProfile]=useState<AccountProfile|null>(null);
  const [reminderState,setReminderState]=useState<'idle'|'sending'|'sent'>('idle');
  const heroRef=useRef<HTMLElement>(null);
  const reduceMotion=useReducedMotion();
  const heroInView=useInView(heroRef,{amount:.05});
  useEffect(()=>{const refresh=()=>setActivity(readStudyActivity());refresh();window.addEventListener('nv:study-activity',refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener('nv:study-activity',refresh);window.removeEventListener('storage',refresh)}},[]);
  useEffect(()=>{let dead=false;(async()=>{try{const session=await ensureFreshSession();if(!session||dead)return;const row=await getAccountProfile(session);if(!dead)setProfile(row)}catch{}})();return()=>{dead=true}},[]);

  const current=meta.lessons.find(x=>x.lesson===lesson)??meta.lessons[0];
  const currentMastered=mastered(progress,current?.ids||[]);
  const currentPct=clampPct(Math.round(currentMastered/Math.max(1,current?.count||1)*100));
  const totalMastered=Object.values(progress).filter(Boolean).length;
  const overall=clampPct(Math.round(totalMastered/Math.max(1,meta.vocabulary_count)*100));
  const health=getSrsHealth(srs);
  const best=history.length?Math.max(...history.map(x=>Number(x.score||0))):0;
  const recent=latestActivity(activity,lesson);
  const lessonMap=useMemo(()=>meta.lessons.map(item=>{const count=mastered(progress,item.ids||[]);const pct=Math.round(count/Math.max(1,item.count||1)*100);return{lesson:item.lesson,title:item.title,pct,complete:pct>=80,active:item.lesson===lesson}}),[lesson,meta.lessons,progress]);
  const completedLessons=useMemo(()=>lessonMap.filter(x=>x.complete).length,[lessonMap]);
  const activityDays=useMemo(()=>{
    const days=new Set<string>();
    Object.values(activity.entries).forEach(row=>{if(row.lastAt)days.add(dateKey(row.lastAt))});
    history.forEach(h=>{if(h.date)days.add(dateKey(h.date))});
    return days;
  },[activity,history]);
  const streak=useMemo(()=>computeStreak(activityDays),[activityDays]);
  const repairedMistakes=useMemo(()=>mistakes.filter(m=>m.repaired).length,[mistakes]);
  const srsRepetitions=useMemo(()=>Object.values(srs).reduce((n,s)=>n+Number(s.repetitions||0),0),[srs]);
  const arcadeCompletions=useMemo(()=>Object.values(activity.entries).filter(e=>e.view==='arcade').reduce((n,e)=>n+e.completions,0),[activity]);
  const achievementCtx=useMemo<AchievementContext>(()=>({
    totalMastered,vocabularyTotal:meta.vocabulary_count,completedLessons,totalLessons:meta.lessons.length,
    streak,bestMockScore:best,mockAttempts:history.length,srsRepetitions,repairedMistakes,
  }),[totalMastered,meta.vocabulary_count,completedLessons,meta.lessons.length,streak,best,history.length,srsRepetitions,repairedMistakes]);
  const xp=useMemo(()=>computeXp({...achievementCtx,totalMastered,completedLessons,history,srs,repairedMistakes,arcadeCompletions}),[achievementCtx,totalMastered,completedLessons,history,srs,repairedMistakes,arcadeCompletions]);
  const level=useMemo(()=>levelProgress(xp),[xp]);
  const achievements=useMemo(()=>splitAchievements(achievementCtx),[achievementCtx]);
  const weakAreas=useMemo(()=>weakSkills(mistakes,3),[mistakes]);
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

    <motion.section
      className="student-dashboard-panel"
      aria-labelledby="student-dashboard-title"
      initial={reduceMotion?false:{opacity:0,y:18}}
      whileInView={{opacity:1,y:0}}
      viewport={{once:true,amount:.15}}
      transition={{duration:.5,ease:[.2,.8,.2,1]}}
    >
      <header className="student-dashboard-head">
        <div className="student-profile-row">
          <span className="student-avatar" aria-hidden="true">{profile?.display_name?.trim()?.[0]?.toUpperCase()||<UserRound size={18}/>}</span>
          <div>
            <b>{profile?.display_name||text('শিক্ষার্থী','Learner')}</b>
            {profile?.email&&<small>{profile.email}</small>}
            {profile?.joined_at&&<small className="student-since">{text('যোগদান','Member since')} {new Date(profile.joined_at).toLocaleDateString(language==='bn'?'bn-BD':'en-US',{year:'numeric',month:'short'})}</small>}
          </div>
          {profile&&<button
            type="button"
            className="student-reminder-btn"
            disabled={reminderState!=='idle'}
            onClick={async()=>{setReminderState('sending');const ok=await sendStudyReminder();setReminderState(ok?'sent':'idle')}}
          ><Mail size={14}/>{reminderState==='sent'?text('পাঠানো হয়েছে','Sent'):text('Study reminder পাঠান','Email me a reminder')}</button>}
        </div>
        <h2 id="student-dashboard-title" className={language==='bn'?'font-bn':''}>{text('আপনার শেখার ড্যাশবোর্ড','Your learning dashboard')}</h2>
      </header>

      <div className="level-banner">
        <span className="level-badge"><Crown size={20}/><b>{level.level.level}</b></span>
        <div className="level-copy">
          <b className={language==='bn'?'font-bn':''}>{language==='bn'?level.level.bn:level.level.en}<small className="font-jp"> · {level.level.jp}</small></b>
          <div className="level-bar" role="progressbar" aria-label={text('পরবর্তী level পর্যন্ত অগ্রগতি','Progress to next level')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={level.pct}><i style={{width:`${level.pct}%`}}/></div>
          <span>{level.next?text(`পরবর্তী level-এ আর ${level.xpForNext} XP দরকার`,`${level.xpForNext} XP to next level`):text('সর্বোচ্চ level অর্জিত!','Max level reached!')}</span>
        </div>
      </div>

      <div className="student-stat-grid">
        <article className="metric-card"><span className="metric-icon"><Target size={18}/></span><span className="metric-label">{text('JLPT N5 অগ্রগতি','JLPT N5 progress')}</span><b className="metric-value">{overall}%</b></article>
        <article className="metric-card"><span className="metric-icon"><Layers size={18}/></span><span className="metric-label">{text('সম্পন্ন lesson','Completed lessons')}</span><b className="metric-value">{completedLessons}/{meta.lessons.length}</b></article>
        <article className="metric-card"><span className="metric-icon"><Trophy size={18}/></span><span className="metric-label">XP</span><b className="metric-value">{xp.toLocaleString()}</b></article>
        <article className="metric-card"><span className="metric-icon"><Flame size={18}/></span><span className="metric-label">{text('স্ট্রিক','Streak')}</span><b className="metric-value">{streak} {text('দিন','d')}</b></article>
      </div>

      <div className="student-weak-areas">
        <span className="section-kicker">{text('দুর্বল ক্ষেত্র','Weak areas')}</span>
        {weakAreas.length?<div className="weak-area-chips">{weakAreas.map(w=><button key={w.skill} type="button" onClick={()=>onNavigate(w.skill as ViewName)}>
          <b className={language==='bn'?'font-bn':''}>{language==='bn'?(SKILL_LABEL[w.skill]?.[0]||w.skill):(SKILL_LABEL[w.skill]?.[1]||w.skill)}</b>
          <small>{w.count} {text('টি ভুল','mistakes')}</small>
        </button>)}</div>:
        <p className={language==='bn'?'font-bn':''}>{text('এখনো কোনো দুর্বল ক্ষেত্র নেই—দারুণ চলছে!','No weak areas yet—keep it up!')}</p>}
      </div>

      <div className="student-achievements">
        <span className="section-kicker">{text('অ্যাচিভমেন্ট','Achievements')} <b>{achievements.unlocked.length}/{achievements.unlocked.length+achievements.locked.length}</b></span>
        <div className="achievement-grid">
          {achievements.unlocked.map(a=>{const Icon=ACHIEVEMENT_ICON[a.icon];return <article key={a.id} className="achievement-badge unlocked" title={language==='bn'?a.descBn:a.descEn}>
            <span className="achievement-icon"><Icon size={18}/></span>
            <b className={language==='bn'?'font-bn':''}>{language==='bn'?a.bn:a.en}</b>
            <small>+{a.xpReward} XP</small>
          </article>})}
          {achievements.locked.map(a=><article key={a.id} className="achievement-badge locked" title={language==='bn'?a.descBn:a.descEn}>
            <span className="achievement-icon"><Lock size={16}/></span>
            <b className={language==='bn'?'font-bn':''}>{language==='bn'?a.bn:a.en}</b>
            <small>{language==='bn'?a.descBn:a.descEn}</small>
          </article>)}
        </div>
      </div>
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
