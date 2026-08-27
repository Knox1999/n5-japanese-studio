'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight, BookOpen, Brain, Headphones, PenLine, Sparkles,
  TreePine, Trophy, RotateCcw, Play, CheckCircle2
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
  const totalMastered = Object.values(progress).filter(Boolean).length;
  const overall = Math.round(totalMastered / Math.max(1, meta.vocabulary_count) * 100);
  const current = meta.lessons.find(x => x.lesson === lesson)!;
  const currentMastered = mastered(progress, current.ids || []);
  const currentPct = Math.round(currentMastered / Math.max(1, current.count) * 100);
  const health = srsHealth(srs, meta.vocabulary_count);
  const best = history.length ? Math.max(...history.map(x => Number(x.score || 0))) : 0;

  const queue = [
    { icon: Brain, label: 'Recall', detail: `${health.due} due now`, view: 'srs' as ViewName, active: true },
    { icon: Headphones, label: 'Listening', detail: `Lesson ${String(lesson).padStart(2,'0')} live transcript`, view: 'listening' as ViewName },
    { icon: PenLine, label: 'Spelling', detail: 'Random lesson words', view: 'spelling' as ViewName },
    { icon: TreePine, label: 'Kanji Tree', detail: `${meta.klc_edges.toLocaleString()} component relations`, view: 'kanji' as ViewName },
  ];

  return (
    <div className="editorial-dashboard pb-10">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="editorial-hero"
      >
        <HeroScene />
        <div className="editorial-hero-copy">
          <div className="editorial-eyebrow"><Sparkles size={14}/> N5 NATURAL JAPANESE STUDIO</div>
          <h1 className="editorial-display font-bn">জাপানি শেখা হোক<br/>অভ্যাসে, মুখস্থে নয়।</h1>
          <p className="editorial-jp font-jp">毎日、少しずつ。</p>
          <p className="editorial-hero-note font-bn">
            Vocabulary, recall, listening, spelling, reading এবং Kanji—একই lesson rhythm-এর মধ্যে।
          </p>
          <div className="editorial-actions">
            <button className="editorial-primary" onClick={() => onNavigate('vocabulary')}>
              Continue Lesson {String(lesson).padStart(2,'0')} <ArrowRight size={16}/>
            </button>
            <button className="editorial-secondary" onClick={() => onNavigate('srs')}>
              <RotateCcw size={15}/> Start Recall
            </button>
          </div>
        </div>

        <div className="living-path" aria-label="Current learning path">
          <span className="living-path-label">THE LIVING STUDY PATH</span>
          <h2 className="editorial-display">One lesson.<br/>Five ways to remember it.</h2>
          <div className="living-path-grid">
            {[
              ['語','Vocabulary','vocabulary'],['憶','Recall','srs'],['聴','Listening','listening'],['書','Spelling','spelling'],['木','Kanji Tree','kanji']
            ].map(([glyph,label,view],i)=><button key={label} onClick={()=>onNavigate(view as ViewName)} className={i===1?'active':''}>
              <span className="font-jp">{glyph}</span><b>{label}</b>
            </button>)}
          </div>
          <p>Your next action comes from real progress, not decorative widgets.</p>
        </div>
      </motion.section>

      <section className="editorial-stat-strip" aria-label="Study statistics">
        <div><strong>{totalMastered}</strong><span>of {meta.vocabulary_count} words mastered</span></div>
        <div><strong>{overall}%</strong><span>overall N5 mastery</span></div>
        <div><strong>{health.due}</strong><span>reviews due now</span></div>
        <div><strong>{best}%</strong><span>best mock score</span></div>
      </section>

      <section className="editorial-section">
        <div className="editorial-section-head">
          <div>
            <span className="editorial-index">01 · STUDY RHYTHM</span>
            <h2 className="editorial-display">Learn → Recall → Use → Review</h2>
          </div>
          <p className="font-bn">চারটা আলাদা feature না—একই lesson-এর memory cycle।</p>
        </div>
        <div className="rhythm-grid">
          {[
            ['01','Learn','Meaning + natural context'],
            ['02','Recall','Hide Bangla. Pull from memory.'],
            ['03','Use','Spell, listen, shadow, read.'],
            ['04','Review','SRS decides what returns.']
          ].map(([n,t,d])=><article key={n}>
            <span>{n}</span><h3 className="editorial-display">{t}</h3><p>{d}</p>
          </article>)}
        </div>
      </section>

      <section className="editorial-section lesson-journey-section">
        <div className="editorial-section-head compact">
          <div><span className="editorial-index">02 · 25-LESSON JOURNEY</span><h2 className="editorial-display">See the whole road. Study one step.</h2></div>
          <p>Tap any lesson → Vocabulary</p>
        </div>
        <div className="editorial-lesson-grid">
          {meta.lessons.map(L=>{
            const n=mastered(progress,L.ids||[]);const pct=Math.round(n/Math.max(1,L.count)*100);
            return <button key={L.lesson} onClick={()=>onLesson(L.lesson,'vocabulary')} className={L.lesson===lesson?'current':''}>
              <span>L{String(L.lesson).padStart(2,'0')}</span><b>{pct}%</b>
              <strong>{L.title}</strong>
              <i><em style={{width:`${pct}%`}}/></i>
              <small>{n}/{L.count}</small>
            </button>
          })}
        </div>
      </section>

      <section className="editorial-section practice-showcase">
        <div className="editorial-section-head">
          <div><span className="editorial-index">03 · PRACTICE, NOT PAGES</span><h2 className="editorial-display">Hear it. Pull it back. Use it.</h2></div>
          <p className="font-bn">প্রতিটি module-এর একটা নির্দিষ্ট learning job আছে।</p>
        </div>

        <div className="practice-feature-grid">
          <button className="listening-feature" onClick={()=>onNavigate('listening')}>
            <div className="feature-top"><span>LISTENING LAB</span><Play size={18}/></div>
            <h3 className="editorial-display">Natural audio.<br/>Live transcript.</h3>
            <div className="mini-wave" aria-hidden="true">{[18,34,52,28,66,44,30,56,38,70,48,25,58,40,64,32,54].map((h,i)=><i key={i} style={{height:h}}/>)}</div>
            <div className="mini-transcript"><span className="font-jp">もういちど ゆっくり おねがいします。</span><small className="font-bn">আরেকবার একটু ধীরে বলবেন।</small></div>
            <div className="speed-row"><span>0.75×</span><span>0.90×</span><b>1×</b></div>
          </button>

          <div className="practice-stack">
            {queue.slice(0,3).map(({icon:Icon,label,detail,view,active})=><button key={label} className={active?'active':''} onClick={()=>onNavigate(view)}>
              <Icon size={20}/><div><span>{label}</span><small>{detail}</small></div><ArrowRight size={15}/>
            </button>)}
          </div>
        </div>
      </section>

      <section className="editorial-section kanji-signature">
        <div className="kanji-copy">
          <span className="editorial-index">04 · KLC VISUAL MEMORY</span>
          <h2 className="editorial-display">Kanji should feel constructed, not random.</h2>
          <p className="font-bn">একটা character খুললে component → build → related Kanji একই visual tree-তে দেখা যাবে।</p>
          <button className="editorial-primary" onClick={()=>onNavigate('kanji')}>Explore Kanji Tree <ArrowRight size={16}/></button>
        </div>
        <button className="kanji-demo" onClick={()=>onNavigate('kanji')} aria-label="Open Kanji Tree">
          <span className="font-jp kanji-main">休</span>
          <small>KLC visual construction</small>
          <div className="kanji-parts"><span><b className="font-jp">亻</b><small>person</small></span><span><b className="font-jp">木</b><small>tree</small></span></div>
          <strong className="font-jp">亻 + 木 → 休</strong>
          <div className="builds-into"><small>BUILDS INTO</small><span>体</span><span>保</span><span>働</span><span>仮</span></div>
        </button>
      </section>

      <section className="editorial-section progress-evidence">
        <div className="editorial-section-head">
          <div><span className="editorial-index">05 · PROGRESS THAT MEANS SOMETHING</span><h2 className="editorial-display">No fake streaks. Only evidence.</h2></div>
          <p>{currentMastered}/{current.count} mastered in Lesson {String(lesson).padStart(2,'0')}</p>
        </div>
        <div className="evidence-grid">
          <article className="mastery-evidence"><strong>{overall}%</strong><span>N5 mastery</span><i><em style={{width:`${overall}%`}}/></i><small>{totalMastered} / {meta.vocabulary_count} vocabulary</small></article>
          <article className="memory-evidence">
            {[
              ['Due now',health.due],['Learning',health.learning],['Growing',health.growing],['Mature',health.mature],['New',health.fresh]
            ].map(([label,value])=><div key={String(label)}><span>{label}</span><b>{value}</b></div>)}
          </article>
          <article className="mock-evidence"><Trophy/><strong>{best}%</strong><span>best mock</span><small>{history.length} saved attempts</small></article>
        </div>
      </section>

      <section className="editorial-closing">
        <CheckCircle2 size={18}/><span className="font-bn">আজকের কাজ শেষ করতে বড় session দরকার নেই—পরের সঠিক step-টাই যথেষ্ট।</span>
      </section>
    </div>
  );
}
