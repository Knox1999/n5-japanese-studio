'use client';

import { Brain, Clock3, RotateCcw, Sparkles, Target } from 'lucide-react';
import type { DailyRecommendation, StudyPlan, ViewName } from '@/lib/types';

type Props = {
  plan: StudyPlan;
  recommendations: DailyRecommendation[];
  unresolvedMistakes: number;
  onMinutes: (minutes: number) => void;
  onNavigate: (view: ViewName) => void;
};

const TIMES = [5, 10, 20, 30, 45];

function targetFor(kind: DailyRecommendation['kind']): ViewName {
  if (kind === 'srs' || kind === 'repair') return 'srs';
  if (kind === 'listening') return 'listening';
  if (kind === 'grammar') return 'grammar';
  if (kind === 'kanji') return 'kanji';
  if (kind === 'mock') return 'mock';
  return 'vocabulary';
}

export default function DailyCoachPanel({ plan, recommendations, unresolvedMistakes, onMinutes, onNavigate }: Props) {
  return (
    <section className="mx-auto mb-6 w-full max-w-7xl rounded-[28px] border border-white/10 bg-black/20 p-5 shadow-2xl backdrop-blur-xl md:p-7" aria-labelledby="daily-coach-title">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-emerald-300"><Sparkles size={15}/> Daily Study Coach</div>
          <h2 id="daily-coach-title" className="text-2xl font-bold md:text-3xl">এখন কী পড়বেন?</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/65">আপনার due review, বর্তমান lesson progress এবং ভুলের history দেখে local device-এই আজকের realistic study plan সাজানো হয়েছে।</p>
        </div>
        <div className="min-w-[260px]">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Clock3 size={16}/> আজ সময় আছে</div>
          <div className="flex flex-wrap gap-2">
            {TIMES.map(minutes => <button key={minutes} onClick={() => onMinutes(minutes)} className={`rounded-full border px-3 py-2 text-sm transition ${Number(plan.dailyMinutes) === minutes ? 'border-emerald-300 bg-emerald-300/15 text-emerald-200' : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'}`}>{minutes === 45 ? '45+' : minutes} min</button>)}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        {recommendations.slice(0, 3).map((item, index) => {
          const Icon = item.kind === 'srs' ? RotateCcw : item.kind === 'repair' ? Brain : Target;
          return <button key={item.id} onClick={() => onNavigate(targetFor(item.kind))} className="group rounded-2xl border border-white/10 bg-white/[.045] p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-300/35 hover:bg-white/[.075]">
            <div className="mb-4 flex items-center justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-200"><Icon size={18}/></span><span className="text-xs font-bold tracking-[.16em] text-white/35">0{index + 1} · {item.minutes} MIN</span></div>
            <b className="block text-base">{item.title}</b>
            <p className="mt-1.5 text-sm leading-6 text-white/55">{item.reason}</p>
          </button>;
        })}
      </div>

      {unresolvedMistakes > 0 && <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-300/15 bg-amber-300/[.06] px-4 py-3 text-sm text-white/65"><Brain size={17}/><span><b className="text-white">Fix My Mistakes:</b> {unresolvedMistakes}টি item repair queue-তে আছে। Review করলে priority ধীরে ধীরে কমবে।</span></div>}
    </section>
  );
}
