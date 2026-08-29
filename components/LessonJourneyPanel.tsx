'use client';

import { Check, ChevronRight, Circle, Map, Play } from 'lucide-react';
import type { LessonJourney, ViewName } from '@/lib/types';

type Props = {
  journey: LessonJourney;
  completed: string[];
  onOpen: (view: ViewName, stageId: string) => void;
  onToggleComplete: (stageId: string) => void;
};

export default function LessonJourneyPanel({ journey, completed, onOpen, onToggleComplete }: Props) {
  const required = journey.stages.filter(x => !x.optional);
  const requiredDone = required.filter(x => completed.includes(x.id)).length;
  const percent = Math.round(requiredDone / Math.max(1, required.length) * 100);
  const current = journey.stages.find(x => !completed.includes(x.id) && !x.optional) || journey.stages.find(x => !completed.includes(x.id)) || journey.stages[journey.stages.length - 1];
  const totalMinutes = journey.stages.reduce((sum, x) => sum + Number(x.estimatedMinutes || 0), 0);

  return (
    <section className="lesson-journey-v85 mx-auto mb-5 w-full max-w-7xl rounded-[26px] border border-white/10 bg-white/[.028] p-4 sm:p-5 lg:p-6" aria-labelledby="lesson-journey-title">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,.72fr)_minmax(0,1.28fr)] lg:items-start">
        <div className="lg:sticky lg:top-24">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.2em] text-cyan-300"><Map size={14}/> Guided Lesson Journey</div>
          <h2 id="lesson-journey-title" className="font-bn text-[clamp(1.45rem,2vw,1.95rem)] font-bold leading-tight">Lesson {String(journey.lessonId).padStart(2,'0')} · এক ধাপ করে এগোন</h2>
          <p className="font-bn mt-2 max-w-xl text-sm leading-6 text-white/50">{journey.objective}</p>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-3.5">
            <div className="flex items-center justify-between gap-4"><span className="text-[10px] font-bold uppercase tracking-[.16em] text-white/35">Lesson progress</span><b className="text-lg">{percent}%</b></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-300 transition-all" style={{width:`${percent}%`}}/></div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/35"><span>{requiredDone}/{required.length} core stages</span><span>≈ {totalMinutes} min total</span></div>
          </div>

          {current && (
            <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/[.045] p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-[.16em] text-cyan-200/60">Up next</span>
              <div className="mt-1 flex items-center justify-between gap-3">
                <div className="min-w-0"><b className="font-bn block text-sm">{current.title}</b><span className="text-xs text-white/35">≈ {current.estimatedMinutes || 0} min</span></div>
                {current.targetView && <button type="button" onClick={()=>onOpen(current.targetView!,current.id)} className="journey-open-primary-v85 flex shrink-0 items-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-bold text-cyan-100"><Play size={14} fill="currentColor"/><span className="font-bn">শুরু করুন</span></button>}
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {journey.stages.map((stage, index) => {
            const done = completed.includes(stage.id);
            const active = current?.id === stage.id;
            return (
              <article key={stage.id} className={`journey-stage-v85 group min-w-0 rounded-2xl border p-3.5 transition ${active?'border-cyan-300/30 bg-cyan-300/[.05] shadow-[0_10px_30px_rgba(0,0,0,.12)]':'border-white/10 bg-black/[.08] hover:border-white/18 hover:bg-white/[.025]'}`}>
                <div className="flex items-start gap-3">
                  <button type="button" onClick={() => onToggleComplete(stage.id)} className={`journey-done-v85 mt-0.5 flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1.5 text-[10px] font-bold transition ${done?'border-emerald-300/30 bg-emerald-300/10 text-emerald-200':'border-white/15 bg-white/[.035] text-white/45'}`} aria-pressed={done} aria-label={`${stage.title} ${done?'অসম্পূর্ণ করুন':'সম্পন্ন করুন'}`}>{done?<Check size={13}/>:<Circle size={12}/>}<span className="font-bn">{done?'Done':'শেষ?'}</span></button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold tracking-[.16em] text-white/25">{String(index+1).padStart(2,'0')}</span>{active&&<span className="rounded-full border border-cyan-300/20 bg-cyan-300/[.06] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-200/70">next</span>}{stage.optional&&<span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/30">optional</span>}</div>
                    <b className={`font-bn mt-1 block text-sm leading-5 ${done?'text-white/35 line-through':'text-white/80'}`}>{stage.title}</b>
                    <p className="mt-1 text-[11px] text-white/30">≈ {stage.estimatedMinutes || 0} min</p>
                  </div>
                  {stage.targetView&&<button type="button" onClick={()=>onOpen(stage.targetView!,stage.id)} className="journey-open-v85 flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 px-2.5 py-2 text-[10px] font-bold text-white/45 transition group-hover:border-cyan-300/20 group-hover:text-cyan-100" aria-label={`${stage.title} খুলুন`}>{active?<Play size={13}/>:<ChevronRight size={13}/>}<span className="font-bn">খুলুন</span></button>}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
