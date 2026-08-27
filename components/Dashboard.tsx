'use client';

import { motion } from 'framer-motion';
import { BookOpen, Brain, Headphones, Flame, Trophy, Sparkles, ArrowRight, TreePine, RotateCcw } from 'lucide-react';
import type { MockAttempt, StudioMeta, SrsCardState, ViewName } from '@/lib/types';
import type { ProgressMap, SrsMap } from '@/lib/storage';
import ProgressRing from './ProgressRing';
import HeroScene from './HeroScene';

function mastered(progress: ProgressMap, ids: number[]) { return ids.reduce((n, id) => n + (progress[String(id)] ? 1 : 0), 0); }

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

function trendPath(values: number[]) {
  if (!values.length) return '';
  const w = 220, h = 66, pad = 5;
  return values.map((v, i) => {
    const x = values.length === 1 ? w/2 : pad + i * (w - pad*2) / (values.length - 1);
    const y = h - pad - (Math.max(0, Math.min(100, v)) / 100) * (h - pad*2);
    return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

export default function Dashboard({
  meta, lesson, progress, srs, history, onNavigate, onLesson
}: {
  meta: StudioMeta; lesson: number; progress: ProgressMap; srs: SrsMap; history: MockAttempt[];
  onNavigate: (v: ViewName) => void; onLesson: (n: number, v?: ViewName) => void;
}) {
  const totalMastered = Object.values(progress).filter(Boolean).length;
  const overall = Math.round(totalMastered / Math.max(1, meta.vocabulary_count) * 100);
  const current = meta.lessons.find(x => x.lesson === lesson)!;
  const currentMastered = mastered(progress, current.ids || []);
  const currentPct = Math.round(currentMastered / Math.max(1, current.count) * 100);
  const health = srsHealth(srs, meta.vocabulary_count);
  const recentScores = [...history].slice(0, 8).reverse().map(x => Number(x.score || 0));
  const best = history.length ? Math.max(...history.map(x => Number(x.score || 0))) : 0;
  const achievements = [
    { ok: totalMastered >= 100, title: '100 Words', sub: 'Vocabulary milestone' },
    { ok: totalMastered >= 250, title: '250 Words', sub: 'Strong foundation' },
    { ok: health.mature >= 50, title: '50 Mature', sub: 'Long-term memory' },
    { ok: best >= 90, title: '90% Mock', sub: 'Exam readiness' },
  ];

  return (
    <div className="space-y-7 pb-8">
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="premium-hero relative isolate overflow-hidden rounded-[28px] border border-mist bg-paper shadow-premium">
        <HeroScene />
        <div className="relative z-10 max-w-[760px] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.18em] text-sakura"><Sparkles size={15}/> Premium N5 Study Studio</div>
          <h1 className="font-jp text-[34px] font-black leading-[1.08] tracking-[-.035em] text-ink sm:text-[44px] lg:text-[52px]">今日も、少しずつ。</h1>
          <p className="mt-3 max-w-[620px] text-sm leading-7 text-slatecopy sm:text-base"><b className="text-ink">Lesson {String(lesson).padStart(2,'0')} · {current.title}</b><br/><span className="font-bn">{current.scenario}</span></p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="premium-btn premium-btn-primary" onClick={() => onNavigate('vocabulary')}>Continue Lesson <ArrowRight size={17}/></button>
            <button className="premium-btn premium-btn-secondary" onClick={() => onNavigate('srs')}><RotateCcw size={16}/> Start Recall</button>
          </div>
        </div>
      </motion.section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <motion.article whileHover={{ y: -2 }} className="metric-card col-span-2 flex items-center gap-4 xl:col-span-1">
          <ProgressRing value={overall} size={92} label="N5" />
          <div><span className="metric-label">Overall mastery</span><b className="metric-value">{totalMastered}</b><small>of {meta.vocabulary_count} words</small></div>
        </motion.article>
        <motion.article whileHover={{ y: -2 }} className="metric-card"><span className="metric-icon bg-rose-50 text-sakura"><BookOpen/></span><span className="metric-label">Current lesson</span><b className="metric-value">{currentPct}%</b><small>{currentMastered}/{current.count} mastered</small></motion.article>
        <motion.article whileHover={{ y: -2 }} className="metric-card"><span className="metric-icon bg-violet-50 text-violet-700"><Brain/></span><span className="metric-label">Review due</span><b className="metric-value">{health.due}</b><small>{health.mature} mature cards</small></motion.article>
        <motion.article whileHover={{ y: -2 }} className="metric-card"><span className="metric-icon bg-sky-50 text-sky-700"><Headphones/></span><span className="metric-label">Listening</span><b className="metric-value">1×</b><small>natural-speed ceiling</small></motion.article>
        <motion.article whileHover={{ y: -2 }} className="metric-card"><span className="metric-icon bg-amber-50 text-gold"><Trophy/></span><span className="metric-label">Best mock</span><b className="metric-value">{best}%</b><small>{history.length} saved attempts</small></motion.article>
      </section>

      <section>
        <div className="section-kicker">Continue learning</div>
        <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="section-title">Pick up where you left off</h2><p className="section-subtitle">Every card opens a real study tool, not a decorative placeholder.</p></div></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { icon:<BookOpen/>, tag:`LESSON ${String(lesson).padStart(2,'0')}`, title:current.title, text:`${currentMastered}/${current.count} words mastered`, view:'vocabulary' as ViewName, cls:'tone-red' },
            { icon:<Brain/>, tag:'SRS · RECALL', title:'Memory Review', text:`${health.due} due · ${health.fresh} untouched`, view:'srs' as ViewName, cls:'tone-purple' },
            { icon:<Headphones/>, tag:'LISTENING', title:'Live Transcript', text:'Expressive Japanese · max 1×', view:'listening' as ViewName, cls:'tone-blue' },
            { icon:<TreePine/>, tag:'KANJI KLC', title:'2,300 Kanji Tree', text:`${meta.klc_edges.toLocaleString()} component relations`, view:'kanji' as ViewName, cls:'tone-green' },
          ].map((x, i) => <motion.button key={x.view} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*.05}} whileHover={{y:-3}} className={`continue-card ${x.cls}`} onClick={() => onNavigate(x.view)}><span className="continue-icon">{x.icon}</span><span className="section-kicker">{x.tag}</span><b>{x.title}</b><p>{x.text}</p><span className="continue-link">Open <ArrowRight size={15}/></span></motion.button>)}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
        <article className="premium-panel">
          <div className="flex items-end justify-between gap-3"><div><div className="section-kicker">Lesson mastery map</div><h2 className="section-title">25-lesson visual roadmap</h2></div><span className="hidden text-xs text-slatecopy sm:block">Tap any lesson → Vocabulary</span></div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {meta.lessons.map((L) => {
              const n = mastered(progress, L.ids || []); const pct = Math.round(n/Math.max(1,L.count)*100);
              return <button key={L.lesson} onClick={() => onLesson(L.lesson,'vocabulary')} className={`lesson-tile ${L.lesson===lesson?'is-current':''}`} aria-label={`Lesson ${L.lesson}, ${pct}% mastered`}>
                <div className="flex items-center justify-between"><span>L{String(L.lesson).padStart(2,'0')}</span><b>{pct}%</b></div>
                <strong>{L.title}</strong><div className="mastery-track"><i style={{width:`${pct}%`}}/></div><small>{n}/{L.count} words</small>
              </button>;
            })}
          </div>
        </article>

        <div className="space-y-4">
          <article className="premium-panel">
            <div className="section-kicker">Memory health</div><h2 className="section-title">SRS distribution</h2>
            <div className="mt-5 space-y-3">
              {[
                ['Due now',health.due,'bg-sakura'],['Learning',health.learning,'bg-violet-500'],['Growing',health.growing,'bg-sky-600'],['Mature',health.mature,'bg-sage'],['New',health.fresh,'bg-slate-300']
              ].map(([label,count,color]) => { const c=Number(count); const pct=Math.min(100, c/Math.max(1,meta.vocabulary_count)*100); return <div key={String(label)}><div className="mb-1 flex justify-between text-xs"><span className="text-slatecopy">{label}</span><b className="text-ink">{c}</b></div><div className="h-2 overflow-hidden rounded-full bg-[#eeeae3]"><i className={`block h-full rounded-full ${color}`} style={{width:`${Math.max(c?2:0,pct)}%`}}/></div></div> })}
            </div>
          </article>
          <article className="premium-panel overflow-hidden">
            <div className="section-kicker">Mock trend</div><div className="flex items-end justify-between"><h2 className="section-title">Recent scores</h2><b className="text-sm text-ink">{recentScores.length ? `${recentScores.at(-1)}%` : 'No data'}</b></div>
            {recentScores.length ? <svg viewBox="0 0 220 70" className="mt-4 h-[90px] w-full overflow-visible" aria-label="Mock score trend"><path d={trendPath(recentScores)} fill="none" stroke="#c95362" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><path d={`${trendPath(recentScores)} L215,66 L5,66 Z`} fill="#c95362" opacity=".06"/></svg> : <div className="mt-4 rounded-2xl bg-ivory p-5 text-sm text-slatecopy">Complete a mock test and your real score trend will appear here.</div>}
          </article>
        </div>
      </section>

      <section className="premium-panel">
        <div className="section-kicker">Achievements</div><h2 className="section-title">Milestones that reflect real progress</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {achievements.map((a,i)=><div key={a.title} className={`achievement ${a.ok?'unlocked':''}`}><span>{a.ok?<Flame/>:<Trophy/>}</span><b>{a.title}</b><small>{a.sub}</small></div>)}
        </div>
      </section>
    </div>
  );
}
