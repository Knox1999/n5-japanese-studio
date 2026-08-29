'use client';

import { ArrowRight, Brain, Clock3, RotateCcw, Sparkles, Target } from 'lucide-react';
import type { DailyRecommendation, StudyPlan, ViewName } from '@/lib/types';
import LearningLabLauncher from './LearningLabLauncher';

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
  if (kind === 'kana') return 'kana';
  if (kind === 'kanji') return 'kanji';
  if (kind === 'mock') return 'mock';
  return 'vocabulary';
}

function iconFor(kind: DailyRecommendation['kind']) {
  if (kind === 'srs') return RotateCcw;
  if (kind === 'repair') return Brain;
  return Target;
}

export default function DailyCoachPanel({ plan, recommendations, unresolvedMistakes, onMinutes, onNavigate }: Props) {
  const primary = recommendations[0];
  const secondary = recommendations.slice(1, 4);
  const PrimaryIcon = primary ? iconFor(primary.kind) : Target;

  return <>
    <section className="mx-auto mb-4 w-full max-w-7xl overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(135deg,rgba(78,186,199,.08),rgba(6,23,45,.78)_42%,rgba(240,68,62,.04))] shadow-[0_20px_60px_rgba(0,0,0,.18)]" aria-labelledby="daily-coach-title">
      <div className="grid lg:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)]">
        <div className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r lg:p-6">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.2em] text-emerald-300"><Sparkles size={14}/> Daily Study Coach</div>
          <h2 id="daily-coach-title" className="font-bn text-[clamp(1.65rem,2.2vw,2.15rem)] font-bold leading-tight">এখন কী পড়বেন?</h2>
          <p className="font-bn mt-2 max-w-xl text-sm leading-6 text-white/55">আপনার due review, lesson progress এবং mistake history থেকে আজকের সবচেয়ে দরকারি কাজটি আগে দেখানো হচ্ছে।</p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-white/50"><Clock3 size={14}/> আজ সময়</span>
            {TIMES.map(minutes => (
              <button
                key={minutes}
                onClick={() => onMinutes(minutes)}
                className={`min-w-12 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${Number(plan.dailyMinutes) === minutes ? 'border-emerald-300/70 bg-emerald-300/15 text-emerald-200 shadow-[0_0_22px_rgba(110,231,183,.08)]' : 'border-white/10 bg-white/[.035] text-white/50 hover:border-white/20 hover:text-white/75'}`}
              >
                {minutes === 45 ? '45+' : minutes}m
              </button>
            ))}
          </div>

          {unresolvedMistakes > 0 && (
            <button onClick={()=>onNavigate('srs')} className="mt-4 flex w-full items-center justify-between rounded-2xl border border-amber-300/15 bg-amber-300/[.055] px-3.5 py-2.5 text-left transition hover:bg-amber-300/[.09]">
              <span className="flex items-center gap-2 text-xs text-white/60"><Brain size={15} className="text-amber-200"/><b className="font-bn text-white/80">Fix My Mistakes</b></span>
              <span className="rounded-full bg-amber-200/10 px-2 py-0.5 text-xs font-bold text-amber-100">{unresolvedMistakes}</span>
            </button>
          )}
        </div>

        <div className="p-4 sm:p-5 lg:p-6">
          {primary ? (
            <button onClick={() => onNavigate(targetFor(primary.kind))} className="group relative w-full overflow-hidden rounded-[22px] border border-emerald-300/20 bg-white/[.045] p-4 text-left transition hover:border-emerald-300/40 hover:bg-white/[.065] sm:p-5">
              <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-300 to-cyan-300"/>
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-200"><PrimaryIcon size={20}/></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-emerald-200/70"><span>Next best action</span><span className="h-1 w-1 rounded-full bg-white/20"/><span>{primary.minutes} min</span></div>
                  <h3 className="font-bn mt-1.5 text-lg font-bold sm:text-xl">{primary.title}</h3>
                  <p className="font-bn mt-1 text-sm leading-6 text-white/50">{primary.reason}</p>
                </div>
                <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/45 transition group-hover:border-emerald-300/30 group-hover:text-emerald-200"><ArrowRight size={17}/></span>
              </div>
            </button>
          ) : null}

          {secondary.length > 0 && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {secondary.map((item, index) => {
                const Icon = iconFor(item.kind);
                return (
                  <button key={item.id} onClick={() => onNavigate(targetFor(item.kind))} className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-3 py-3 text-left transition hover:border-white/20 hover:bg-white/[.04]">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[.055] text-white/55"><Icon size={15}/></span>
                    <span className="min-w-0 flex-1"><b className="font-bn block truncate text-sm text-white/75">{item.title}</b><small className="text-[10px] uppercase tracking-[.12em] text-white/30">0{index + 2} · {item.minutes} min</small></span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
    <LearningLabLauncher onNavigate={onNavigate}/>
  </>;
}
