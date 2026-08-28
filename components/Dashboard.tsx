'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight, BookOpen, Brain, CheckCircle2, Headphones, Languages,
  MessageCircle, PenLine, Play, RotateCcw, Search, Sparkles, TreePine,
  Trophy, BookOpenText, ClipboardCheck, Volume2, Zap, Orbit, Radio,
  ScanLine, Target, Activity
} from 'lucide-react';
import type { MockAttempt, StudioMeta, SrsCardState, ViewName } from '@/lib/types';
import type { ProgressMap, SrsMap } from '@/lib/storage';
import FutureBackdrop from './FutureBackdrop';

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

const MODES: Array<{
  view: ViewName;
  glyph: string;
  title: string;
  bn: string;
  detail: string;
  icon: any;
  tone: string;
}> = [
  {view:'vocabulary',glyph:'語',title:'Vocabulary Core',bn:'শব্দভান্ডার',detail:'Meaning · word class · exception · voice · mastery',icon:BookOpen,tone:'cyan'},
  {view:'srs',glyph:'憶',title:'Memory Recall',bn:'স্মার্ট রিভিউ',detail:'Adaptive review from your real progress',icon:Brain,tone:'violet'},
  {view:'listening',glyph:'聴',title:'Listening Lab',bn:'শোনা + শ্যাডোয়িং',detail:'Waveform · বাংলা meaning · word hints · 0.75×–1×',icon:Headphones,tone:'blue'},
  {view:'spelling',glyph:'書',title:'Active Output',bn:'স্পেলিং প্র্যাকটিস',detail:'Recall the word, then produce it',icon:PenLine,tone:'green'},
  {view:'kanji',glyph:'木',title:'Kanji Matrix',bn:'ভিজ্যুয়াল কাঞ্জি ট্রি',detail:'Component → construction → related forms',icon:TreePine,tone:'gold'},
  {view:'mock',glyph:'試',title:'Exam Simulator',bn:'মক টেস্ট',detail:'Attempt · score · review · retry',icon:ClipboardCheck,tone:'rose'},
  {view:'conversation',glyph:'話',title:'Conversation',bn:'কথোপকথন',detail:'Natural lesson dialogue and use',icon:MessageCircle,tone:'orange'},
  {view:'reading',glyph:'読',title:'Reading Deck',bn:'রিডিং',detail:'Context reading from the lesson',icon:BookOpenText,tone:'teal'},
  {view:'grammar',glyph:'文',title:'Grammar Logic',bn:'গ্রামার',detail:'Pattern · explanation · examples',icon:Languages,tone:'slate'},
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
  const [kanjiFlip, setKanjiFlip] = useState(false);

  const totalMastered = Object.values(progress).filter(Boolean).length;
  const overall = Math.round(totalMastered / Math.max(1, meta.vocabulary_count) * 100);
  const current = meta.lessons.find(x => x.lesson === lesson)!;
  const currentMastered = mastered(progress, current.ids || []);
  const currentPct = Math.round(currentMastered / Math.max(1, current.count) * 100);
  const health = srsHealth(srs, meta.vocabulary_count);
  const best = history.length ? Math.max(...history.map(x => Number(x.score || 0))) : 0;

  const resume = useMemo(() => {
    if (health.due > 0) return {label:`Recall ${health.due} due words`,view:'srs' as ViewName,icon:RotateCcw};
    if (currentPct < 100) return {label:`Continue Lesson ${String(lesson).padStart(2,'0')}`,view:'vocabulary' as ViewName,icon:BookOpen};
    return {label:'Start Listening Lab',view:'listening' as ViewName,icon:Headphones};
  },[health.due,currentPct,lesson]);

  const ResumeIcon = resume.icon;
  const ringStyle = {'--future-ring': `${Math.max(0,Math.min(100,overall))*3.6}deg`} as CSSProperties;
  const quizCorrect = quizChoice === 'は';

  return (
    <div className="future-home">
      <motion.section
        className="future-hero"
        initial={{opacity:0,y:10}}
        animate={{opacity:1,y:0}}
        transition={{duration:.45,ease:[.2,.8,.2,1]}}
      >
        <FutureBackdrop/>

        <div className="future-hero-copy">
          <div className="future-status-pill"><i/><span>LEARNING SYSTEM ONLINE</span><b>N5</b></div>
          <div className="future-hero-brand-v49">
            <img src={`${process.env.NEXT_PUBLIC_BASE_PATH||''}/assets/nihongo-vibes-logo.webp`} alt="The Nihongo Vibes" />
            <div><b>THE NIHONGO VIBES</b><span>Japanese Learning Studio</span></div>
          </div>
          <div className="future-eyebrow"><Sparkles size={14}/> N5 JAPANESE · THREE.JS · GSAP · FUTURE LEARNING OS</div>
          <h1 className="future-display font-bn">
            জাপানি শেখার<br/><em>নতুন ইন্টারফেস।</em>
          </h1>
          <p className="future-jp font-jp">毎日、少しずつ。未来の学び方。</p>
          <p className="future-lead font-bn">
            Vocabulary, recall, listening, spelling, reading, grammar, conversation,
            Kanji এবং mock—সবকিছু আপনার ২৫টি lesson-এর সাথে এক connected system-এ।
          </p>

          <div className="future-actions">
            <button className="future-btn primary" onClick={()=>onNavigate(resume.view)}>
              <ResumeIcon size={17}/>{resume.label}<ArrowRight size={16}/>
            </button>
            <button className="future-btn glass" onClick={()=>onNavigate('listening')}>
              <Radio size={16}/> Open Listening Lab
            </button>
          </div>

          <div className="future-data-row">
            <div><span>VOCABULARY</span><strong>{meta.vocabulary_count}</strong></div>
            <div><span>LESSONS</span><strong>25</strong></div>
            <div><span>KANJI LINKS</span><strong>{meta.klc_edges.toLocaleString()}</strong></div>
            <div><span>MOCK RUNS</span><strong>{history.length}</strong></div>
          </div>
        </div>

        <aside className="future-orbit-panel">
          <div className="panel-label"><Orbit size={14}/> MEMORY ORBIT</div>
          <div className="future-radial" style={ringStyle}>
            <div className="future-radial-core">
              <span>OVERALL</span>
              <strong>{overall}%</strong>
              <small>N5 mastery</small>
            </div>
            <i className="satellite sat-a"/><i className="satellite sat-b"/><i className="satellite sat-c"/>
          </div>

          <div className="future-current">
            <div><span>CURRENT NODE</span><strong>Lesson {String(lesson).padStart(2,'0')} · {current.title}</strong></div>
            <b>{currentPct}%</b>
          </div>
          <div className="future-progress"><i style={{width:`${currentPct}%`}}/></div>

          <div className="future-mini-grid">
            <div><Activity/><b>{currentMastered}</b><span>Mastered</span></div>
            <div><RotateCcw/><b>{health.due}</b><span>Due now</span></div>
            <div><Trophy/><b>{best}%</b><span>Best mock</span></div>
          </div>

          <button className="future-panel-cta" onClick={()=>onNavigate('vocabulary')}>
            Enter current lesson <ArrowRight size={15}/>
          </button>
        </aside>
      </motion.section>

      <section className="future-protocol">
        <span><b>01</b> LEARN</span><i>→</i>
        <span><b>02</b> LISTEN</span><i>→</i>
        <span><b>03</b> RECALL</span><i>→</i>
        <span><b>04</b> USE</span><i>→</i>
        <span><b>05</b> REVIEW</span><i>→</i>
        <strong>MASTER</strong>
      </section>

      <section className="future-section">
        <div className="future-section-head">
          <div><span className="future-kicker">01 · LEARNING MODULES</span><h2 className="future-display">একই lesson. নয়টি learning mode.</h2></div>
          <p className="font-bn">আপনার existing material-ই core data; interface শুধু সেই data-কে smarter practice modes-এ ব্যবহার করবে।</p>
        </div>

        <div className="future-bento">
          {MODES.map(({view,glyph,title,bn,detail,icon:Icon,tone},i)=>(
            <motion.button
              key={view}
              className={`future-module module-${tone} ${i===2||i===4?'wide':''}`}
              onClick={()=>onNavigate(view)}
              initial={{opacity:0,y:8}}
              whileInView={{opacity:1,y:0}}
              viewport={{once:true}}
              transition={{delay:Math.min(i,7)*.04}}
            >
              <div className="future-module-glow"/>
              <div className="future-module-top"><span className="font-jp">{glyph}</span><Icon size={18}/></div>
              <div className="future-module-copy"><small>{String(i+1).padStart(2,'0')} / MODULE</small><h3>{title}</h3><b className="font-bn">{bn}</b><p>{detail}</p></div>
              <span className="future-module-link">Launch module <ArrowRight size={14}/></span>
            </motion.button>
          ))}
        </div>
      </section>

      <section className="future-section future-lab-section">
        <div className="future-section-head">
          <div><span className="future-kicker">02 · INTERACTIVE LAB</span><h2 className="future-display">Homepage-এই real interaction.</h2></div>
          <p className="font-bn">শুধু feature card নয়—visitor সঙ্গে সঙ্গে Kanji, grammar এবং listening experience করতে পারবে।</p>
        </div>

        <div className="future-lab-grid">
          <article className="future-kanji-lab">
            <div className="future-card-label"><ScanLine size={14}/> KANJI SCAN</div>
            <button className={`future-kanji-chip ${kanjiFlip?'flipped':''}`} onClick={()=>setKanjiFlip(x=>!x)}>
              <span className="front font-jp">日</span>
              <span className="back"><b className="font-jp">にち・ひ</b><strong className="font-bn">দিন / সূর্য</strong><small>tap to rotate</small></span>
            </button>
            <div className="future-kanji-meta"><span>COMPONENT</span><b className="font-jp">日</b><i>→</i><span>READING</span><b className="font-jp">にち</b></div>
            <button className="future-text-link" onClick={()=>onNavigate('kanji')}>Open Kanji Matrix <ArrowRight size={14}/></button>
          </article>

          <article className="future-quiz-lab">
            <div className="future-card-label"><Target size={14}/> QUICK LOGIC TEST</div>
            <h3 className="font-jp">わたし ＿ がくせいです。</h3>
            <p className="font-bn">সঠিক particle বেছে নিন।</p>
            <div className="future-quiz-options">
              {['は','が','へ'].map(x=><button key={x} className={quizChoice===x?'active':''} onClick={()=>{setQuizChoice(x);setQuizChecked(false)}}>{x}</button>)}
            </div>
            <button className="future-btn primary check" disabled={!quizChoice} onClick={()=>setQuizChecked(true)}>Validate answer</button>
            {quizChecked&&<div className={`future-feedback ${quizCorrect?'ok':'no'}`}>
              {quizCorrect?<CheckCircle2 size={17}/>:<RotateCcw size={17}/>}
              <span className="font-bn">{quizCorrect?'সঠিক — 「は」 এখানে topic marker।':'আবার চেষ্টা করুন — “আমি” এখানে topic হিসেবে এসেছে।'}</span>
            </div>}
          </article>

          <button className="future-listen-lab" onClick={()=>onNavigate('listening')}>
            <div className="future-card-label"><Radio size={14}/> LIVE LISTENING</div>
            <div className="future-wave-shell">
              <div className="future-wave">{[22,48,31,78,44,61,27,84,50,70,35,64,42,76,38,55,28,68,46,82,34,60,24,74].map((h,i)=><i key={i} style={{height:h}}/>)}</div>
              <div className="future-wave-line"/>
            </div>
            <h3 className="future-display">Hear → Follow → Shadow</h3>
            <div className="future-live-transcript">
              <b className="font-jp">もういちど ゆっくり おねがいします。</b>
              <span className="font-bn">আরেকবার একটু ধীরে বলবেন।</span>
            </div>
            <div className="future-speed-row"><span>0.75×</span><span>0.90×</span><b>1.00×</b></div>
            <span className="future-listen-cta"><Volume2 size={15}/> Launch full lab <ArrowRight size={14}/></span>
          </button>
        </div>
      </section>

      <section className="future-section future-roadmap-section">
        <div className="future-section-head">
          <div><span className="future-kicker">03 · MISSION MAP</span><h2 className="future-display">২৫টি lesson. এক visual route.</h2></div>
          <p className="font-bn">যে lesson node-এ ক্লিক করবেন, সেই lesson-এর Vocabulary-তে সরাসরি যাবে।</p>
        </div>

        <div className="future-roadmap">
          <div className="future-route-line"/>
          {meta.lessons.map((L,i)=>{
            const n=mastered(progress,L.ids||[]);
            const pct=Math.round(n/Math.max(1,L.count)*100);
            const currentNode=L.lesson===lesson;
            return <button
              key={L.lesson}
              className={`future-node ${currentNode?'current':''} ${pct===100?'complete':''}`}
              onClick={()=>onLesson(L.lesson,'vocabulary')}
              style={{'--node-delay':`${i*14}ms`} as CSSProperties}
            >
              <span className="node-index">L{String(L.lesson).padStart(2,'0')}</span>
              <div className="node-core"><b>{pct}%</b></div>
              <strong>{L.title}</strong>
              <small>{n}/{L.count}</small>
            </button>
          })}
        </div>
      </section>

      <section className="future-section future-kanji-system">
        <div className="future-kanji-copy">
          <span className="future-kicker">04 · KANJI CONSTELLATION</span>
          <h2 className="future-display">Kanji random নয়—structure হিসেবে দেখুন.</h2>
          <p className="font-bn">আপনার KLC visual tree-তে component, construction এবং related Kanji-কে futuristic relationship map হিসেবে দেখা যাবে।</p>
          <button className="future-btn primary" onClick={()=>onNavigate('kanji')}>Explore Kanji Matrix <ArrowRight size={16}/></button>
        </div>
        <button className="future-constellation" onClick={()=>onNavigate('kanji')} aria-label="Open Kanji Matrix">
          <svg viewBox="0 0 620 380" role="img" aria-label="Kanji relationship constellation">
            <defs><linearGradient id="fg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#55d7d0"/><stop offset="1" stopColor="#d0a45f"/></linearGradient></defs>
            <g className="const-lines" fill="none" stroke="url(#fg)" strokeOpacity=".45">
              <path d="M310 190 L150 92 M310 190 L470 87 M310 190 L108 267 M310 190 L492 278 M310 190 L310 44 M310 190 L318 337"/>
              <path d="M150 92 L78 48 M150 92 L79 148 M470 87 L548 42 M470 87 L558 152 M108 267 L45 310 M492 278 L572 322"/>
            </g>
            {[
              [310,190,'休'],[150,92,'亻'],[470,87,'木'],[108,267,'体'],[492,278,'保'],[310,44,'人'],[318,337,'本'],
              [78,48,'住'],[79,148,'何'],[548,42,'林'],[558,152,'森'],[45,310,'仁'],[572,322,'働']
            ].map(([x,y,t],idx)=><g key={String(t)} className={`const-node n${idx}`}><circle cx={Number(x)} cy={Number(y)} r={idx===0?36:24}/><text x={Number(x)} y={Number(y)+7} textAnchor="middle">{t}</text></g>)}
          </svg>
          <span>KLC relationship map · {meta.klc_edges.toLocaleString()} links</span>
        </button>
      </section>

      <section className="future-section future-evidence">
        <div className="future-section-head">
          <div><span className="future-kicker">05 · LIVE PROGRESS DATA</span><h2 className="future-display">Progress decoration নয়—evidence.</h2></div>
          <p className="font-bn">আপনার real mastery, SRS health এবং mock history থেকে dashboard তৈরি হচ্ছে।</p>
        </div>
        <div className="future-evidence-grid">
          <article><span>VOCAB MASTERY</span><strong>{overall}%</strong><p>{totalMastered} / {meta.vocabulary_count} words</p><i><em style={{width:`${overall}%`}}/></i></article>
          <article><span>MEMORY QUEUE</span><strong>{health.due}</strong><p>{health.learning} learning · {health.growing} growing · {health.mature} mature</p></article>
          <article><span>CURRENT LESSON</span><strong>{currentPct}%</strong><p>Lesson {String(lesson).padStart(2,'0')} · {currentMastered}/{current.count}</p></article>
          <article><span>EXAM SIGNAL</span><strong>{best}%</strong><p>{history.length} saved mock attempts</p></article>
        </div>
      </section>

      <section className="future-closing">
        <div><span className="future-kicker">NEXT ACTION GENERATED FROM YOUR PROGRESS</span><h2 className="future-display">আজকের ছোট step. আগামীকালের natural Japanese.</h2></div>
        <button className="future-btn primary" onClick={()=>onNavigate(resume.view)}><Zap size={17}/>{resume.label}<ArrowRight size={16}/></button>
      </section>
    </div>
  );
}
