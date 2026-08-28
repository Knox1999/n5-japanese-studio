'use client';

import { useMemo, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight, BookOpen, Brain, Headphones, Languages, MessageCircle, PenLine,
  TreePine, BookOpenText, ClipboardCheck, RotateCcw, Radio, Sparkles,
  CheckCircle2, Target, Waves, ChevronRight
} from 'lucide-react';
import type { MockAttempt, StudioMeta, SrsCardState, ViewName } from '@/lib/types';
import type { ProgressMap, SrsMap } from '@/lib/storage';

function mastered(progress:ProgressMap,ids:number[]){return ids.reduce((n,id)=>n+(progress[String(id)]?1:0),0)}
function srsHealth(srs:SrsMap,total:number){
  const now=Date.now();let due=0,mature=0;
  Object.values(srs).forEach((st:SrsCardState)=>{if(st.due_at&&new Date(st.due_at).getTime()<=now)due++;if((st.repetitions||0)>=5||Number(st.interval_days||0)>=7)mature++});
  return {due,mature,fresh:Math.max(0,total-Object.keys(srs).length)};
}

const MODULES:Array<{view:ViewName;glyph:string;title:string;bn:string;detail:string;icon:any}>=[
  {view:'vocabulary',glyph:'語',title:'Vocabulary',bn:'শব্দভান্ডার',detail:'Clean cards · meaning · audio · mastery',icon:BookOpen},
  {view:'srs',glyph:'憶',title:'Smart Recall',bn:'স্মার্ট রিভিউ',detail:'Due words · spaced recall · retention',icon:Brain},
  {view:'listening',glyph:'聴',title:'Listening & Shadowing',bn:'শোনা ও শ্যাডোয়িং',detail:'Natural voice · transcript · repeat',icon:Headphones},
  {view:'conversation',glyph:'話',title:'Conversation',bn:'কথোপকথন',detail:'A/B male-female dialogue practice',icon:MessageCircle},
  {view:'spelling',glyph:'書',title:'Active Output',bn:'স্পেলিং',detail:'Hear · recall · type · verify',icon:PenLine},
  {view:'reading',glyph:'読',title:'Reading',bn:'রিডিং',detail:'Focused Japanese passage practice',icon:BookOpenText},
  {view:'grammar',glyph:'文',title:'Visual Grammar',bn:'গ্রামার',detail:'Formula · flow · examples · recall',icon:Languages},
  {view:'kanji',glyph:'漢',title:'Kanji Matrix',bn:'কাঞ্জি',detail:'Components · construction · memory',icon:TreePine},
  {view:'mock',glyph:'試',title:'JLPT Practice',bn:'মক টেস্ট',detail:'Section-based N5 exam practice',icon:ClipboardCheck},
];

export default function Dashboard({meta,lesson,progress,srs,history,onNavigate,onLesson}:{
  meta:StudioMeta;lesson:number;progress:ProgressMap;srs:SrsMap;history:MockAttempt[];
  onNavigate:(v:ViewName)=>void;onLesson:(n:number,v?:ViewName)=>void;
}){
  const totalMastered=Object.values(progress).filter(Boolean).length;
  const overall=Math.round(totalMastered/Math.max(1,meta.vocabulary_count)*100);
  const current=meta.lessons.find(x=>x.lesson===lesson)||meta.lessons[0];
  const currentMastered=mastered(progress,current?.ids||[]);
  const currentPct=Math.round(currentMastered/Math.max(1,current?.count||1)*100);
  const now=Date.now();
  const currentDue=(current?.ids||[]).reduce((n,id)=>{
    const st=srs[String(id)];
    return n+(st?.due_at&&new Date(st.due_at).getTime()<=now?1:0);
  },0);
  const completionTarget=Math.ceil((current?.count||0)*.8);
  const remainingToCompletion=Math.max(0,completionTarget-currentMastered);
  const lessonComplete=currentPct>=80&&currentDue===0;
  const health=srsHealth(srs,meta.vocabulary_count);
  const best=history.length?Math.max(...history.map(x=>Number(x.score||0))):0;
  const ring={'--nv57-progress':`${Math.max(0,Math.min(100,overall))*3.6}deg`} as CSSProperties;
  const resume=useMemo(()=>health.due>0?{label:`Recall ${health.due} due words`,view:'srs' as ViewName,icon:RotateCcw}:{label:`Continue Lesson ${String(lesson).padStart(2,'0')}`,view:'vocabulary' as ViewName,icon:BookOpen},[health.due,lesson]);
  const ResumeIcon=resume.icon;

  return <div className="home-v57">
    <motion.section className="home-hero-v57" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:.42}}>
      <div className="home-hero-grid-v57" aria-hidden="true"/>
      <div className="home-copy-v57">
        <div className="home-brand-lockup-v57">
          <img src={`${process.env.NEXT_PUBLIC_BASE_PATH||''}/assets/nihongo-vibes-logo.webp`} alt="The Nihongo Vibes"/>
          <div><small>JLPT N5 · FUTURE LEARNING STUDIO</small><b>THE NIHONGO VIBES</b></div>
        </div>
        <div className="home-kicker-v57"><span/> JAPANESE LEARNING · ONE CONNECTED SYSTEM</div>
        <h1 className="font-bn">শিখুন পরিষ্কারভাবে।<br/><em>মনে রাখুন দীর্ঘদিন।</em></h1>
        <p className="home-jp-v57 font-jp" lang="ja">毎日、少しずつ。自然に、確実に。</p>
        <p className="home-lead-v57 font-bn">Vocabulary থেকে listening, shadowing, conversation, grammar, Kanji এবং JLPT practice—একই lesson-এর data দিয়ে একটি clean, focused learning flow।</p>
        <div className="home-actions-v57">
          <button className="primary" onClick={()=>onNavigate(resume.view)}><ResumeIcon/>{resume.label}<ArrowRight/></button>
          <button onClick={()=>onNavigate('listening')}><Radio/>Listening Lab</button>
        </div>
        <div className="home-microstats-v57">
          <div><span>WORDS</span><b>{meta.vocabulary_count.toLocaleString()}</b></div>
          <div><span>LESSONS</span><b>{meta.lesson_count||25}</b></div>
          <div><span>KANJI LINKS</span><b>{meta.klc_edges.toLocaleString()}</b></div>
          <div><span>BEST MOCK</span><b>{best}%</b></div>
        </div>
      </div>

      <aside className="home-command-v57">
        <div className="home-command-head-v57"><span><Waves/>LEARNING STATUS</span><b>N5</b></div>
        <div className="home-ring-v57" style={ring}><div><small>OVERALL</small><strong>{overall}%</strong><span>mastery</span></div></div>
        <div className="home-current-v57">
          <header><div><small>CURRENT LESSON</small><b>{String(lesson).padStart(2,'0')} · {current?.title}</b></div><strong>{currentPct}%</strong></header>
          <div className="home-bar-v57"><i style={{width:`${currentPct}%`}}/></div>
          <div className="home-current-grid-v57">
            <div><CheckCircle2/><span>Mastered</span><b>{currentMastered}</b></div>
            <div><RotateCcw/><span>Due now</span><b>{health.due}</b></div>
            <div><Target/><span>Mature</span><b>{health.mature}</b></div>
          </div>
          <button onClick={()=>onLesson(lesson,'vocabulary')}>Open current lesson <ChevronRight/></button>
        </div>
      </aside>
    </motion.section>

    <section className="today-study-v58">
      <header>
        <div><span>TODAY'S STUDY</span><h2 className="font-bn">আজ কী করবেন—এক নজরে</h2></div>
        <strong className={lessonComplete?'done':''}>{lessonComplete?'LESSON READY':'3-STEP PLAN'}</strong>
      </header>
      <div className="today-study-grid-v58">
        <button onClick={()=>onNavigate('srs')}>
          <span>01</span><RotateCcw/><div><b>Review due words</b><p className="font-bn">{health.due>0?`পুরো course-এ ${health.due}টি due card আছে।`:'আজ কোনো due card নেই।'}</p></div><em>{health.due}</em>
        </button>
        <button onClick={()=>onNavigate('vocabulary')}>
          <span>02</span><BookOpen/><div><b>Learn current lesson</b><p className="font-bn">{remainingToCompletion>0?`Lesson complete করতে আরও ${remainingToCompletion}টি word mastery দরকার।`:'Vocabulary target পূরণ হয়েছে।'}</p></div><em>{currentPct}%</em>
        </button>
        <button onClick={()=>onNavigate('listening')}>
          <span>03</span><Headphones/><div><b>Listen + shadow once</b><p className="font-bn">Current lesson-এর dialogue শুনে অন্তত একটি shadowing pass করুন।</p></div><em>1×</em>
        </button>
      </div>
      <div className={`lesson-completion-v58 ${lessonComplete?'complete':''}`}>
        <div><CheckCircle2/><span><small>LESSON COMPLETION RULE</small><b className="font-bn">≥80% vocabulary mastered + current lesson-এ 0 due SRS card</b></span></div>
        <strong>{lessonComplete?'COMPLETE':`${currentPct}% · ${currentDue} due`}</strong>
      </div>
    </section>

    <section className="home-flow-v57" aria-label="Learning flow">
      {['LEARN','LISTEN','SHADOW','USE','RECALL'].map((x,i)=><div key={x}><span>{String(i+1).padStart(2,'0')}</span><b>{x}</b>{i<4&&<ArrowRight/>}</div>)}
    </section>

    <section className="home-section-v57">
      <header className="home-section-head-v57"><div><span>LEARNING MODULES</span><h2 className="font-bn">একই visual language. নয়টি focused mode.</h2></div><p className="font-bn">প্রতিটি page একই navy-red-white design system অনুসরণ করে—অপ্রয়োজনীয় color switching নেই।</p></header>
      <div className="home-modules-v57">{MODULES.map(({view,glyph,title,bn,detail,icon:Icon},i)=><motion.button key={view} onClick={()=>onNavigate(view)} initial={{opacity:0,y:6}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:Math.min(i,6)*.035}}>
        <div className="module-top-v57"><span className="font-jp">{glyph}</span><Icon/></div>
        <small>{String(i+1).padStart(2,'0')} · MODULE</small><h3>{title}</h3><b className="font-bn">{bn}</b><p>{detail}</p><em>OPEN <ArrowRight/></em>
      </motion.button>)}</div>
    </section>

    <section className="home-lesson-strip-v57">
      <div><Sparkles/><span><small>YOUR CURRENT PATH</small><b>Lesson {String(lesson).padStart(2,'0')} → mastery</b></span></div>
      <button onClick={()=>onLesson(Math.min(25,lesson+1),'vocabulary')}>Next lesson <ArrowRight/></button>
    </section>
  </div>
}
