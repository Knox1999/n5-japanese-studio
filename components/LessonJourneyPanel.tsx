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
    <section className="mx-auto mb-6 w-full max-w-7xl rounded-[28px] border border-white/10 bg-white/[.035] p-5 md:p-7" aria-labelledby="lesson-journey-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-cyan-300"><Map size={15}/> Guided Lesson Journey</div>
          <h2 id="lesson-journey-title" className="text-2xl font-bold">Lesson {String(journey.lessonId).padStart(2,'0')} · এক ধাপ করে এগোন</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">{journey.objective}</p>
        </div>
        <div className="min-w-[220px] rounded-2xl border border-white/10 bg-black/15 p-4">
          <div className="flex items-end justify-between"><span className="text-xs uppercase tracking-[.16em] text-white/40">Progress</span><b className="text-xl">{percent}%</b></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-300" style={{width:`${percent}%`}}/></div>
          <div className="mt-2 flex justify-between text-xs text-white/40"><span>{requiredDone}/{required.length} core stages</span><span>≈ {totalMinutes} min</span></div>
        </div>
      </div>

      <div className="mt-6 grid gap-2">
        {journey.stages.map((stage, index) => {
          const done = completed.includes(stage.id);
          const active = current?.id === stage.id;
          return <div key={stage.id} className={`flex items-center gap-3 rounded-2xl border p-3 transition ${active?'border-cyan-300/35 bg-cyan-300/[.06]':'border-white/8 bg-black/10'}`}>
            <button onClick={() => onToggleComplete(stage.id)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5" aria-label={`${stage.title} ${done?'অসম্পূর্ণ করুন':'সম্পন্ন করুন'}`}>{done?<Check size={17}/>:<Circle size={16} className="text-white/35"/>}</button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold tracking-[.16em] text-white/30">{String(index+1).padStart(2,'0')}</span><b className={done?'text-white/45 line-through':''}>{stage.title}</b>{stage.optional&&<span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/35">optional</span>}</div>
              <p className="mt-1 text-xs text-white/40">≈ {stage.estimatedMinutes || 0} min {active?'· Next recommended step':''}</p>
            </div>
            {stage.targetView&&<button onClick={()=>onOpen(stage.targetView!,stage.id)} className="flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-sm text-white/65 hover:bg-white/5">{active?<Play size={15}/>:<ChevronRight size={15}/>}<span className="hidden sm:inline">Open</span></button>}
          </div>;
        })}
      </div>
    </section>
  );
}
