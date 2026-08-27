'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight, BookOpen, Brain, CheckCircle2, Headphones, Languages,
  MessageCircle, PenLine, Play, RotateCcw, Sparkles, TreePine,
  Trophy, BookOpenText, ClipboardCheck, Volume2
} from 'lucide-react';
import type { MockAttempt, StudioMeta, SrsCardState, ViewName } from '@/lib/types';
import type { ProgressMap, SrsMap } from '@/lib/storage';
import HeroScene from './HeroScene';

function mastered(progress: ProgressMap, ids: number[]) {
  return ids.reduce((n, id) => n + (progress[String(id)] ? 1 : 0), 0);
}

function srsHealth(srs: SrsMap, total: number) {
  const now = Date.now();
  let due = 0, learning = 0, growing = 0, mature = 0;
  Object.values(srs).forEach((st: SrsCardState) => {
    const interval = Number(st.interval_days || 0);
    if (st.due_at && new Date(st.due_at).getTime() <= now) due++;
    if ((st.repetitions || 0) >= 5 || interval >= 7) mature++;
    else if (interval >= 1 || (st.repetitions || 0) >= 2) growing++;
    else learning++;
  });
  return { due, learning, growing, mature, fresh: Math.max(0, total - Object.keys(srs).length) };
}

const modules: Array<{
  view: ViewName; glyph: string; title: string; bn: string; note: string; icon: any; tone: string;
}> = [
  { view:'vocabulary', glyph:'語', title:'Vocabulary', bn:'শব্দভান্ডার', note:'Meaning · sentence · audio · mastery', icon:BookOpen, tone:'rose' },
  { view:'srs', glyph:'憶', title:'Smart Recall', bn:'মেমরি রিভিউ', note:'Due words return at the right time', icon:Brain, tone:'gold' },
  { view:'listening', glyph:'聴', title:'Listening Lab', bn:'লিসেনিং + শ্যাডোয়িং', note:'Waveform · transcript · 0.75×–1×', icon:Headphones, tone:'blue' },
  { view:'spelling', glyph:'書', title:'Spelling', bn:'লিখে মনে রাখা', note:'Hear or read, then produce the word', icon:PenLine, tone:'green' },
  { view:'kanji', glyph:'木', title:'Kanji Tree', bn:'ভিজ্যুয়াল কাঞ্জি', note:'Component → construction → related forms', icon:TreePine, tone:'ink' },
  { view:'mock', glyph:'試', title:'Mock Test', bn:'পরীক্ষা প্রস্তুতি', note:'Practice → score → history → retry', icon:ClipboardCheck, tone:'violet' },
  { view:'conversation', glyph:'話', title:'Conversation', bn:'কথোপকথন', note:'Natural lesson dialogue and usage', icon:MessageCircle, tone:'orange' },
  { view:'reading', glyph:'読', title:'Reading', bn:'রিডিং প্র্যাকটিস', note:'Read lesson context with confidence', icon:BookOpenText, tone:'teal' },
  { view:'grammar', glyph:'文', title:'Grammar', bn:'গ্রামার', note:'Pattern → explanation → example', icon:Languages, tone:'slate' },
];

export default function Dashboard({
  meta, lesson, progress, srs, history, onNavigate, onLesson
}: {
  meta: StudioMeta;
  lesson: number;
  progress: ProgressMap;
  srs: SrsMap;
  history: MockAttempt[];
  onNavigate: (v: ViewName) => void;
  onLesson: (n: number, v?: ViewName) => void;
}) {
  const [quizChoice, setQuizChoice] = useState('');
  const [quizChecked, setQuizChecked] = useState(false);
  const [kanjiFlipped, setKanjiFlipped] = useState(false);

  const totalMastered = Object.values(progress).filter(Boolean).length;
  const overall = Math.round(totalMastered / Math.max(1, meta.vocabulary_count) * 100);
  const current = meta.lessons.find(x => x.lesson === lesson)!;
  const currentMastered = mastered(progress, current.ids || []);
  const currentPct = Math.round(currentMastered / Math.max(1, current.count) * 100);
  const health = srsHealth(srs, meta.vocabulary_count);
  const best = history.length ? Math.max(...history.map(x => Number(x.score || 0))) : 0;

  const nextAction = useMemo(() => {
    if (health.due > 0) return { label:`${health.due} reviews due`, view:'srs' as ViewName, icon:RotateCcw };
    if (currentPct < 100) return { label:`Continue Lesson ${String(lesson).padStart(2,'0')}`, view:'vocabulary' as ViewName, icon:BookOpen };
    return { label:'Start Listening', view:'listening' as ViewName, icon:Headphones };
  }, [health.due, currentPct, lesson]);

  const NextIcon = nextAction.icon;
  const quizCorrect = quizChoice === 'は';

  return (
    <div className="academy-home">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="academy-hero"
      >
        <HeroScene />
        <div className="academy-hero-copy">
          <div className="academy-eyebrow"><Sparkles size={14}/> N5 NATURAL JAPANESE STUDIO</div>
          <h1 className="academy-display font-bn">জাপানি শেখা হোক<br/><em>প্র্যাকটিসে, প্রতিদিন।</em></h1>
          <p className="academy-jp font-jp">毎日、少しずつ。自然に身につく。</p>
          <p className="academy-lead font-bn">
            আপনার ২৫টি lesson, vocabulary, listening, recall, spelling, grammar,
            reading, conversation, Kanji এবং mock—একটা connected learning journey-তে।
          </p>
          <div className="academy-hero-actions">
            <button className="academy-btn primary" onClick={() => onNavigate(nextAction.view)}>
              <NextIcon size={17}/>{nextAction.label}<ArrowRight size={16}/>
            </button>
            <button className="academy-btn ghost" onClick={() => onNavigate('listening')}>
              <Play size={16}/> Listening Lab
            </button>
          </div>
          <div className="academy-proof-row">
            <div><strong>{meta.vocabulary_count}</strong><span>Vocabulary</span></div>
            <div><strong>25</strong><span>Lessons</span></div>
            <div><strong>{meta.klc_edges.toLocaleString()}</strong><span>Kanji links</span></div>
            <div><strong>{history.length}</strong><span>Mock attempts</span></div>
          </div>
        </div>

        <aside className="academy-progress-card">
          <span className="mini-label">TODAY'S STUDY</span>
          <div className="academy-ring" style={{'--p': `${overall * 3.6}deg`} as React.CSSProperties}>
            <div><strong>{overall}%</strong><span>N5 mastery</span></div>
          </div>
          <div className="current-lesson-row">
            <div><span>Lesson {String(lesson).padStart(2,'0')}</span><strong>{current.title}</strong></div>
            <b>{currentPct}%</b>
          </div>
          <div className="thin-progress"><i style={{width:`${currentPct}%`}}/></div>
          <div className="academy-mini-stats">
            <span><b>{currentMastered}</b> mastered</span>
            <span><b>{health.due}</b> due</span>
            <span><b>{best}%</b> best mock</span>
          </div>
          <button onClick={() => onNavigate('vocabulary')}>Open current lesson <ArrowRight size={15}/></button>
        </aside>
      </motion.section>

      <section className="academy-trust-strip">
        <span>LEARN</span><i>→</i><span>LISTEN</span><i>→</i><span>RECALL</span><i>→</i>
        <span>USE</span><i>→</i><span>REVIEW</span><i>→</i><b>MASTER</b>
      </section>

      <section className="academy-section">
        <div className="academy-section-head">
          <div><span className="academy-kicker">01 · LEARNING MODES</span><h2 className="academy-display">এক lesson, অনেকভাবে practice.</h2></div>
          <p className="font-bn">একই material বারবার নতুনভাবে ব্যবহার হবে—এটাই connected learning formula।</p>
        </div>
        <div className="academy-module-grid">
          {modules.map(({view,glyph,title,bn,note,icon:Icon,tone}, i) => (
            <motion.button
              key={view}
              initial={{opacity:0,y:8}}
              whileInView={{opacity:1,y:0}}
              viewport={{once:true}}
              transition={{delay:Math.min(i,6)*.04}}
              className={`academy-module tone-${tone}`}
              onClick={()=>onNavigate(view)}
            >
              <div className="module-top"><span className="module-glyph font-jp">{glyph}</span><Icon size={19}/></div>
              <h3>{title}</h3><b className="font-bn">{bn}</b><p>{note}</p>
              <span className="module-link">Practice now <ArrowRight size={14}/></span>
            </motion.button>
          ))}
        </div>
      </section>

      <section className="academy-section academy-demo-section">
        <div className="academy-section-head">
          <div><span className="academy-kicker">02 · TRY IT NOW</span><h2 className="academy-display">Homepage-এই শেখা শুরু.</h2></div>
          <p className="font-bn">শুধু feature দেখানো না—visitor যেন সঙ্গে সঙ্গে practice করতে পারে।</p>
        </div>
        <div className="academy-demo-grid">
          <article className="academy-kanji-demo">
            <div className="demo-label">KANJI FLIP</div>
            <button className={`flip-card ${kanjiFlipped?'flipped':''}`} onClick={()=>setKanjiFlipped(x=>!x)}>
              <span className="flip-front font-jp">日</span>
              <span className="flip-back"><b className="font-jp">にち・ひ</b><strong className="font-bn">দিন / সূর্য</strong><small>Tap again to flip</small></span>
            </button>
            <p className="font-bn">কাঞ্জি → reading → বাংলা অর্থ। পরে আপনার KLC Tree-তে deep dive করুন।</p>
            <button className="text-link" onClick={()=>onNavigate('kanji')}>Open Kanji Tree <ArrowRight size={14}/></button>
          </article>

          <article className="academy-quiz-demo">
            <div className="demo-label">30-SECOND QUIZ</div>
            <h3 className="font-jp">わたし ＿ がくせいです。</h3>
            <p className="font-bn">সঠিক particle বেছে নিন।</p>
            <div className="quiz-choice-row">
              {['は','が','へ'].map(x=><button key={x} className={quizChoice===x?'selected':''} onClick={()=>{setQuizChoice(x);setQuizChecked(false)}}>{x}</button>)}
            </div>
            <button className="academy-btn primary quiz-check" disabled={!quizChoice} onClick={()=>setQuizChecked(true)}>Check answer</button>
            {quizChecked && <div className={`quiz-feedback ${quizCorrect?'good':'bad'}`}>
              {quizCorrect?<><CheckCircle2 size={18}/><span className="font-bn">সঠিক! 「は」 topic marker হিসেবে এখানে ব্যবহার হবে।</span></>:<><RotateCcw size={18}/><span className="font-bn">আরেকবার চেষ্টা করুন। Hint: “আমি” এখানে topic।</span></>}
            </div>}
          </article>

          <button className="academy-listen-demo" onClick={()=>onNavigate('listening')}>
            <div className="demo-label">LISTENING SPOTLIGHT</div>
            <Headphones size={30}/>
            <h3 className="academy-display">Hear → Follow → Shadow</h3>
            <div className="academy-wave" aria-hidden="true">{[22,46,34,72,40,58,30,82,52,68,34,62,44,76,36,54,28,70].map((h,i)=><i key={i} style={{height:h}}/>)}</div>
            <div className="academy-transcript"><b className="font-jp">もういちど ゆっくり おねがいします。</b><span className="font-bn">আরেকবার একটু ধীরে বলবেন।</span></div>
            <span className="listen-cta"><Volume2 size={15}/> Open full listening lab</span>
          </button>
        </div>
      </section>

      <section className="academy-section academy-roadmap">
        <div className="academy-section-head">
          <div><span className="academy-kicker">03 · 25-LESSON ROADMAP</span><h2 className="academy-display">পুরো পথ চোখের সামনে.</h2></div>
          <p className="font-bn">যে lesson-এ ক্লিক করবেন, সেই lesson-এর Vocabulary-তে সরাসরি যাবে।</p>
        </div>
        <div className="academy-lesson-grid">
          {meta.lessons.map(L=>{
            const n=mastered(progress,L.ids||[]);
            const pct=Math.round(n/Math.max(1,L.count)*100);
            const isCurrent=L.lesson===lesson;
            return <button key={L.lesson} onClick={()=>onLesson(L.lesson,'vocabulary')} className={isCurrent?'current':''}>
              <span className="lesson-no">L{String(L.lesson).padStart(2,'0')}</span>
              <b>{pct}%</b>
              <strong>{L.title}</strong>
              <div className="lesson-line"><i style={{width:`${pct}%`}}/></div>
              <small>{n}/{L.count} mastered</small>
            </button>
          })}
        </div>
      </section>

      <section className="academy-section academy-system">
        <div className="academy-system-copy">
          <span className="academy-kicker">04 · YOUR LEARNING ENGINE</span>
          <h2 className="academy-display">Content একবার। Practice অনেকভাবে।</h2>
          <p className="font-bn">
            আপনার existing vocabulary/lesson data-ই core থাকবে। সেই একই data থেকে
            Vocabulary Card, SRS, Spelling, Listening, Conversation, Reading, Grammar,
            Kanji এবং Mock—সব interconnected হবে।
          </p>
          <div className="system-flow">
            {['Lesson Data','Vocabulary','Audio','Recall','Practice','Mock'].map((x,i)=><span key={x}>{x}{i<5&&<i>→</i>}</span>)}
          </div>
        </div>
        <div className="academy-evidence-grid">
          <article><Brain/><strong>{health.due}</strong><span>Reviews due now</span></article>
          <article><BookOpen/><strong>{totalMastered}</strong><span>Words mastered</span></article>
          <article><Trophy/><strong>{best}%</strong><span>Best mock score</span></article>
          <article><TreePine/><strong>{meta.klc_edges.toLocaleString()}</strong><span>Kanji relationships</span></article>
        </div>
      </section>

      <section className="academy-closing">
        <div><span className="academy-kicker">READY FOR THE NEXT STEP?</span><h2 className="academy-display">আজকের ছোট practice-টাই আগামীকালের natural Japanese.</h2></div>
        <button className="academy-btn primary" onClick={()=>onNavigate(nextAction.view)}><NextIcon size={17}/>{nextAction.label}<ArrowRight size={16}/></button>
      </section>
    </div>
  );
}
