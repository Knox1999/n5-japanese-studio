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
  Sparkles,
  Target,
  TreePine,
  Waves,
  type LucideIcon,
} from 'lucide-react';

import type { MockAttempt, SrsCardState, StudioMeta, ViewName } from '@/lib/types';
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
  const completionTarget=Math.ceil((current?.count||0)*.8);
  const remaining=Math.max(0,completionTarget-currentMastered);

  const lessonMap=useMemo(()=>meta.lessons.map(item=>{
    const count=mastered(progress,item.ids||[]);
    const pct=Math.round(count/Math.max(1,item.count||1)*100);
    return {lesson:item.lesson,title:item.title,scenario:item.scenario,pct,complete:pct>=80,active:item.lesson===lesson};
  }),[lesson,meta.lessons,progress]);

  const nextLesson=Math.min(meta.lesson_count||25,lesson+1);

  return (
    <div className="v63-dashboard">
      <section className="v63-course-overview" aria-labelledby="course-overview-title">
        <div className="v63-overview-copy">
          <div className="v63-overview-kicker"><Waves size={15}/><span>YOUR N5 JOURNEY</span></div>
          <div className="v63-overview-titleline">
            <span className="v63-lesson-seal">{String(lesson).padStart(2,'0')}</span>
            <div>
              <small>CURRENT LESSON</small>
              <h2 id="course-overview-title">{current?.title}</h2>
              <p className="font-bn">{current?.scenario||'আজকের lesson-এর vocabulary, grammar এবং listening একসাথে practice করুন।'}</p>
            </div>
          </div>

          <div className="v63-current-progress">
            <div><span>Lesson mastery</span><b>{currentPct}%</b></div>
            <div className="v63-progress-track"><i style={{width:`${Math.max(2,currentPct)}%`}}/></div>
            <p className="font-bn">{remaining>0?`80% mastery target-এ যেতে আরও ${remaining}টি vocabulary item বাকি।`:'এই lesson-এর vocabulary mastery target পূরণ হয়েছে।'}</p>
          </div>

          <div className="v63-overview-actions">
            <button className="primary" onClick={()=>onLesson(lesson,'vocabulary')}>
              <BookOpen size={18}/><span className="font-bn">Lesson চালিয়ে যান</span><ArrowRight size={17}/>
            </button>
            <button onClick={()=>onNavigate('srs')}>
              <RotateCcw size={17}/><span className="font-bn">{health.due?`${health.due}টি due review`:'Smart Recall খুলুন'}</span>
            </button>
          </div>
        </div>

        <aside className="v63-overview-stats" aria-label="Course overview statistics">
          <div className="v63-orbit">
            <div><small>COURSE</small><strong>{overall}%</strong><span>mastery</span></div>
          </div>
          <div className="v63-stat-grid">
            <div><span>Mastered</span><b>{totalMastered}</b><small>{meta.vocabulary_count} words</small></div>
            <div><span>Due now</span><b>{health.due}</b><small>review cards</small></div>
            <div><span>Mature</span><b>{health.mature}</b><small>memory cards</small></div>
            <div><span>Best mock</span><b>{best}%</b><small>practice score</small></div>
          </div>
        </aside>
      </section>

      <section id="course-map" className="v63-course-map" aria-label="25 lesson course path">
        <header className="v63-section-heading">
          <div>
            <span>COURSE PATH</span>
            <h2 className="font-bn">২৫টি lesson · একটাই পরিষ্কার progression</h2>
          </div>
          <p className="font-bn">কোন lesson-এ আছেন, কতটুকু শেষ হয়েছে এবং এরপর কোথায় যাবেন—এক নজরে দেখুন।</p>
        </header>

        <div className="v63-lesson-grid">
          {lessonMap.map(item=>(
            <button
              key={item.lesson}
              className={[item.active?'active':'',item.complete?'complete':''].filter(Boolean).join(' ')}
              onClick={()=>onLesson(item.lesson,'vocabulary')}
              aria-label={`Lesson ${item.lesson}: ${item.title}, ${item.pct}% mastered`}
            >
              <span className="v63-lesson-number">{String(item.lesson).padStart(2,'0')}</span>
              <div className="v63-lesson-copy"><small>LESSON</small><b>{item.title}</b><em className="font-bn">{item.scenario||'Japanese foundation'}</em></div>
              <div className="v63-lesson-progress"><i style={{width:`${Math.max(3,item.pct)}%`}}/></div>
              <strong>{item.complete?<CheckCircle2 size={16}/>:`${item.pct}%`}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="v63-module-section">
        <header className="v63-section-heading">
          <div>
            <span>LEARNING STUDIO</span>
            <h2 className="font-bn">এক lesson · অনেক skill · একই progress system</h2>
          </div>
          <p className="font-bn">যে skill practice করবেন, সেটাই আপনার journey, mistakes এবং review loop-এর সাথে connected থাকবে।</p>
        </header>

        <div className="v63-module-grid">
          {MODULES.map(({view:moduleView,glyph,title,bangla,detailBn,icon:Icon},index)=>(
            <motion.button
              key={moduleView}
              onClick={()=>onNavigate(moduleView)}
              initial={{opacity:0,y:10}}
              whileInView={{opacity:1,y:0}}
              viewport={{once:true,margin:'-30px'}}
              transition={{delay:Math.min(index,6)*.025}}
            >
              <div className="v63-module-top"><span className="font-jp">{glyph}</span><Icon size={18}/></div>
              <small>{String(index+1).padStart(2,'0')} · {title}</small>
              <h3 className="font-bn">{bangla}</h3>
              <p className="font-bn">{detailBn}</p>
              <em>Open studio <ArrowRight size={15}/></em>
            </motion.button>
          ))}
        </div>
      </section>

      <section className="v63-learning-loop" aria-label="Connected learning loop">
        <div className="v63-loop-intro"><Sparkles/><span><small>THE NIHONGO VIBES METHOD</small><b className="font-bn">শুধু পড়া নয়—শেখা থেকে repair পর্যন্ত এক continuous loop</b></span></div>
        <div className="v63-loop-steps">
          {[
            ['01','LEARN','বুঝুন'],
            ['02','PRACTICE','চর্চা করুন'],
            ['03','REPAIR','ভুল ঠিক করুন'],
            ['04','RECALL','মনে করুন'],
            ['05','USE','বাস্তবে ব্যবহার করুন'],
            ['06','TEST','নিজেকে যাচাই করুন'],
          ].map(([n,en,bn],index)=><div key={en}><span>{n}</span><b>{en}</b><small className="font-bn">{bn}</small>{index<5&&<ArrowRight/>}</div>)}
        </div>
      </section>

      <section className="v63-next-lesson">
        <div><Target/><span><small>NEXT MILESTONE</small><b className="font-bn">Lesson {String(lesson).padStart(2,'0')} শেষ হলে Lesson {String(nextLesson).padStart(2,'0')} প্রস্তুত</b></span></div>
        <button onClick={()=>onLesson(nextLesson,'vocabulary')}><span className="font-bn">পরের lesson দেখুন</span><ArrowRight/></button>
      </section>
    </div>
  );
}
