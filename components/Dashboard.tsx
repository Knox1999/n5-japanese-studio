'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  Brain,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Headphones,
  Languages,
  MessageCircle,
  PenLine,
  RotateCcw,
  Sparkles,
  Target,
  TreePine,
  Waves,
  type LucideIcon,
} from 'lucide-react';

import type {
  MockAttempt,
  SrsCardState,
  StudioMeta,
  ViewName,
} from '@/lib/types';
import type { ProgressMap, SrsMap } from '@/lib/storage';

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
  {view:'vocabulary',glyph:'語',title:'Vocabulary',bangla:'শব্দভান্ডার',detailBn:'অর্থ, উচ্চারণ, word class এবং mastery একসাথে।',icon:BookOpen},
  {view:'srs',glyph:'憶',title:'Smart Recall',bangla:'স্মার্ট রিভিউ',detailBn:'Due শব্দ spaced recall দিয়ে মনে রাখুন।',icon:Brain},
  {view:'listening',glyph:'聴',title:'Listening',bangla:'শোনা ও শ্যাডোয়িং',detailBn:'Natural Japanese audio শুনুন, repeat করুন, shadow করুন।',icon:Headphones},
  {view:'conversation',glyph:'話',title:'Conversation',bangla:'কথোপকথন',detailBn:'A/B role ধরে বাস্তব কথোপকথন অনুশীলন করুন।',icon:MessageCircle},
  {view:'spelling',glyph:'書',title:'Active Output',bangla:'শুনে লিখুন',detailBn:'শুনুন, মনে করুন, লিখুন, তারপর মিলিয়ে দেখুন।',icon:PenLine},
  {view:'reading',glyph:'読',title:'Reading',bangla:'রিডিং',detailBn:'পরিষ্কার Japanese passage পড়ুন; প্রয়োজনে বাংলা support নিন।',icon:BookOpenText},
  {view:'grammar',glyph:'文',title:'Visual Grammar',bangla:'গ্রামার',detailBn:'Formula, pattern ও example visualভাবে বুঝুন।',icon:Languages},
  {view:'kanji',glyph:'漢',title:'Kanji',bangla:'কাঞ্জি',detailBn:'KLC component, construction, memory এবং stroke order দেখুন।',icon:TreePine},
  {view:'mock',glyph:'試',title:'JLPT Practice',bangla:'মক টেস্ট',detailBn:'Quick 10, Mini 25 এবং Full 52 দিয়ে exam practice করুন।',icon:ClipboardCheck},
];

function mastered(progress:ProgressMap,ids:number[]) {
  return ids.reduce((count,id)=>count+(progress[String(id)]?1:0),0);
}

function getSrsHealth(srs:SrsMap,total:number,now:number) {
  let due=0;
  let mature=0;
  Object.values(srs).forEach((state:SrsCardState)=>{
    if(state.due_at && new Date(state.due_at).getTime()<=now) due+=1;
    if((state.repetitions||0)>=5 || Number(state.interval_days||0)>=7) mature+=1;
  });
  return {
    due,
    mature,
    fresh:Math.max(0,total-Object.keys(srs).length),
  };
}

export default function Dashboard({
  meta,lesson,progress,srs,history,onNavigate,onLesson
}:DashboardProps) {
  const totalMastered=Object.values(progress).filter(Boolean).length;
  const overall=Math.round(totalMastered/Math.max(1,meta.vocabulary_count)*100);
  const current=meta.lessons.find(x=>x.lesson===lesson)??meta.lessons[0];
  const currentMastered=mastered(progress,current?.ids||[]);
  const currentPct=Math.round(currentMastered/Math.max(1,current?.count||1)*100);
  const [now]=useState(()=>Date.now());
  const currentDue=(current?.ids||[]).reduce((count,id)=>{
    const state=srs[String(id)];
    return count+(state?.due_at && new Date(state.due_at).getTime()<=now?1:0);
  },0);

  const completionTarget=Math.ceil((current?.count||0)*.8);
  const remainingToCompletion=Math.max(0,completionTarget-currentMastered);
  const lessonComplete=currentPct>=80 && currentDue===0;
  const health=getSrsHealth(srs,meta.vocabulary_count,now);
  const best=history.length?Math.max(...history.map(x=>Number(x.score||0))):0;

  const resume=useMemo(()=>health.due>0
    ? {label:`আজকের ${health.due}টি রিভিউ শেষ করুন`,view:'srs' as ViewName,icon:RotateCcw}
    : {label:`Lesson ${String(lesson).padStart(2,'0')} চালিয়ে যান`,view:'vocabulary' as ViewName,icon:BookOpen}
  ,[health.due,lesson]);

  const lessonMap=useMemo(()=>meta.lessons.map(item=>{
    const count=mastered(progress,item.ids||[]);
    const pct=Math.round(count/Math.max(1,item.count||1)*100);
    return {
      lesson:item.lesson,
      title:item.title,
      pct,
      complete:pct>=80,
      active:item.lesson===lesson,
    };
  }),[lesson,meta.lessons,progress]);

  const ResumeIcon=resume.icon;
  const ring={
    '--nv60-progress':`${Math.max(0,Math.min(100,overall))*3.6}deg`
  } as CSSProperties;

  return (
    <div className="home-v57 nv60-home nv-final-home">
      <motion.section
        className="home-hero-v57 nv60-hero nv-final-hero"
        initial={{opacity:0,y:8}}
        animate={{opacity:1,y:0}}
        transition={{duration:.38}}
      >
        <div className="home-hero-grid-v57 nv60-hero-grid" aria-hidden="true"/>

        <div className="home-copy-v57 nv60-hero-copy">
          <div className="nv60-eyebrow">
            <i/>
            <span>THE NIHONGO VIBES · JLPT N5</span>
          </div>

          <h1 className="font-bn">
            বাংলায় বুঝুন।
            <br/>
            <em>জাপানিজে আত্মবিশ্বাসী হন।</em>
          </h1>

          <p className="home-jp-v57 font-jp" lang="ja">
            毎日、少しずつ。確実に前へ。
          </p>

          <p className="home-lead-v57 font-bn">
            Vocabulary, listening, conversation, grammar, Kanji এবং recall—
            একই lesson-এর data দিয়ে সাজানো একটি focused Japanese learning system।
          </p>

          <div className="home-actions-v57 nv60-hero-actions">
            <button className="primary" onClick={()=>onNavigate(resume.view)}>
              <ResumeIcon size={19}/>
              <span className="font-bn">{resume.label}</span>
              <ArrowRight size={18}/>
            </button>

            <button
              onClick={()=>document.getElementById('course-map')?.scrollIntoView({
                behavior:'smooth',block:'start'
              })}
            >
              <Waves size={18}/>
              <span className="font-bn">আমার শেখার রোডম্যাপ</span>
            </button>
          </div>

          <div className="home-microstats-v57 nv60-hero-stats">
            <div><span>শব্দ</span><b>{meta.vocabulary_count.toLocaleString()}</b></div>
            <div><span>Lesson</span><b>{meta.lesson_count||25}</b></div>
            <div><span>KLC Links</span><b>{meta.klc_edges.toLocaleString()}</b></div>
            <div><span>Best Mock</span><b>{best}%</b></div>
          </div>
        </div>

        <aside className="home-command-v57 nv60-progress-card">
          <header className="nv60-progress-head">
            <div>
              <span><Waves size={16}/> আপনার অগ্রগতি</span>
              <b>JLPT N5</b>
            </div>
            <strong>{lessonComplete?'READY':'KEEP GOING'}</strong>
          </header>

          <div className="nv60-ring-wrap">
            <div className="home-ring-v57 nv60-ring" style={ring}>
              <div>
                <small>OVERALL</small>
                <strong>{overall}%</strong>
                <span>mastery</span>
              </div>
            </div>

            <div className="nv60-ring-copy">
              <span>বর্তমান LESSON</span>
              <h2>{String(lesson).padStart(2,'0')} · {current?.title}</h2>
              <p className="font-bn">
                {lessonComplete
                  ? 'এই lesson-এর mastery target এবং due review সম্পন্ন।'
                  : `80% target-এ যেতে আরও ${remainingToCompletion}টি word mastery দরকার।`}
              </p>
            </div>
          </div>

          <div className="home-bar-v57 nv60-progress-bar">
            <i style={{width:`${currentPct}%`}}/>
          </div>

          <div className="home-current-grid-v57 nv60-progress-metrics">
            <div><CheckCircle2 size={18}/><span>শেখা হয়েছে</span><b>{currentMastered}</b></div>
            <div><RotateCcw size={18}/><span>Due এখন</span><b>{health.due}</b></div>
            <div><Target size={18}/><span>Mature</span><b>{health.mature}</b></div>
          </div>

          <button
            className="nv60-open-lesson"
            onClick={()=>onLesson(lesson,'vocabulary')}
          >
            <span className="font-bn">বর্তমান lesson খুলুন</span>
            <ChevronRight size={17}/>
          </button>
        </aside>
      </motion.section>

      <section className="today-study-v58 nv60-today">
        <header>
          <div>
            <span>TODAY&apos;S STUDY</span>
            <h2 className="font-bn">আজকের সবচেয়ে দরকারি ৩টি কাজ</h2>
          </div>
          <strong className={lessonComplete?'done':''}>
            {lessonComplete?'LESSON READY':'FOCUSED PLAN'}
          </strong>
        </header>

        <div className="today-study-grid-v58 nv60-today-grid">
          <button onClick={()=>onNavigate('srs')}>
            <span>01</span><RotateCcw/>
            <div>
              <b className="font-bn">Due শব্দ আগে রিভিউ করুন</b>
              <p className="font-bn">
                {health.due>0
                  ? `${health.due}টি due card আগে শেষ করুন।`
                  : 'আজ due card নেই—নতুন শব্দ শিখতে পারেন।'}
              </p>
            </div>
            <em>{health.due}</em>
          </button>

          <button onClick={()=>onNavigate('vocabulary')}>
            <span>02</span><BookOpen/>
            <div>
              <b className="font-bn">Lesson mastery বাড়ান</b>
              <p className="font-bn">
                {remainingToCompletion>0
                  ? `80% target-এর জন্য আরও ${remainingToCompletion}টি word mastery করুন।`
                  : 'Vocabulary mastery target পূরণ হয়েছে।'}
              </p>
            </div>
            <em>{currentPct}%</em>
          </button>

          <button onClick={()=>onNavigate('listening')}>
            <span>03</span><Headphones/>
            <div>
              <b className="font-bn">শুনুন + Shadow করুন</b>
              <p className="font-bn">
                Dialogue একবার শুনে অন্তত একটি shadowing pass করুন।
              </p>
            </div>
            <em>1×</em>
          </button>
        </div>

        <div className={`lesson-completion-v58 nv60-completion ${lessonComplete?'complete':''}`}>
          <div>
            <CheckCircle2/>
            <span>
              <small>LESSON GOAL</small>
              <b className="font-bn">≥80% vocabulary mastered + current lesson-এ 0 due SRS card</b>
            </span>
          </div>
          <strong>{lessonComplete?'COMPLETE':`${currentPct}% · ${currentDue} due`}</strong>
        </div>
      </section>

      <section id="course-map" className="nv60-course-map" aria-label="Course progress">
        <header>
          <div>
            <span>COURSE MAP</span>
            <h2 className="font-bn">২৫টি lesson, একটাই পরিষ্কার পথ</h2>
          </div>
          <p className="font-bn">
            Current lesson দেখুন, completed lesson চিনুন এবং যেকোনো lesson-এ সরাসরি যান।
          </p>
        </header>

        <div className="nv60-lesson-track">
          {lessonMap.map(item=>(
            <button
              key={item.lesson}
              className={[item.active?'active':'',item.complete?'complete':''].filter(Boolean).join(' ')}
              onClick={()=>onLesson(item.lesson,'vocabulary')}
              title={`Lesson ${item.lesson}: ${item.title} · ${item.pct}%`}
              aria-label={`Lesson ${item.lesson} খুলুন, ${item.pct}% mastered`}
            >
              <span>{String(item.lesson).padStart(2,'0')}</span>
              <i style={{height:`${Math.max(6,item.pct)}%`}}/>
            </button>
          ))}
        </div>
      </section>

      <section className="home-flow-v57 nv60-learning-flow" aria-label="Learning flow">
        {[
          ['01','LEARN','শব্দ বুঝুন'],
          ['02','LISTEN','স্বাভাবিক উচ্চারণ শুনুন'],
          ['03','SHADOW','সাথে সাথে বলুন'],
          ['04','USE','বাক্যে ব্যবহার করুন'],
          ['05','RECALL','মনে থেকে ফিরিয়ে আনুন'],
        ].map(([number,title,bangla],index)=>(
          <div key={title}>
            <span>{number}</span>
            <b>{title}</b>
            <small className="font-bn">{bangla}</small>
            {index<4&&<ArrowRight/>}
          </div>
        ))}
      </section>

      <section className="home-section-v57 nv60-modules-section">
        <header className="home-section-head-v57 nv60-section-head">
          <div>
            <span>LEARNING MODULES</span>
            <h2 className="font-bn">এক জায়গায় পুরো N5 learning system</h2>
          </div>
          <p className="font-bn">
            শেখা, শোনা, বলা, পড়া, লেখা এবং recall—সব mode একই lesson-এর সাথে connected।
          </p>
        </header>

        <div className="home-modules-v57 nv60-modules">
          {MODULES.map(({view:moduleView,glyph,title,bangla,detailBn,icon:Icon},index)=>(
            <motion.button
              key={moduleView}
              onClick={()=>onNavigate(moduleView)}
              initial={{opacity:0,y:8}}
              whileInView={{opacity:1,y:0}}
              viewport={{once:true,margin:'-40px'}}
              transition={{delay:Math.min(index,6)*.03}}
            >
              <div className="module-top-v57">
                <span className="font-jp">{glyph}</span><Icon/>
              </div>
              <small>{String(index+1).padStart(2,'0')} · {title}</small>
              <h3 className="font-bn">{bangla}</h3>
              <p className="font-bn">{detailBn}</p>
              <em>খুলুন <ArrowRight/></em>
            </motion.button>
          ))}
        </div>
      </section>

      <section className="home-lesson-strip-v57 nv60-next-step">
        <div>
          <Sparkles/>
          <span>
            <small>NEXT STEP</small>
            <b className="font-bn">Lesson {String(lesson).padStart(2,'0')} mastery চালিয়ে যান</b>
          </span>
        </div>

        <button onClick={()=>onLesson(Math.min(meta.lesson_count||25,lesson+1),'vocabulary')}>
          <span className="font-bn">পরের lesson</span><ArrowRight/>
        </button>
      </section>
    </div>
  );
}
