'use client';

import { ArrowRight, Brain, Clock3, Play, RotateCcw, Sparkles, Target } from 'lucide-react';
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
  if (kind === 'kana') return 'kana';
  if (kind === 'kanji') return 'kanji';
  if (kind === 'mock') return 'mock';
  return 'vocabulary';
}

function iconNode(kind: DailyRecommendation['kind'], size: number) {
  if (kind === 'srs') return <RotateCcw size={size}/>;
  if (kind === 'repair') return <Brain size={size}/>;
  return <Target size={size}/>;
}

export default function DailyCoachPanel({ plan, recommendations, unresolvedMistakes, onMinutes, onNavigate }: Props) {
  const primary = recommendations[0];
  const secondary = recommendations.slice(1, 4);

  return (
    <section className="daily-coach" aria-labelledby="daily-coach-title" aria-describedby="daily-coach-description">
      <div className="daily-coach__grid">
        <div className="daily-coach__intro">
          <div className="daily-coach__eyebrow"><Sparkles size={14}/> Daily Study Coach</div>
          <h2 id="daily-coach-title" className="font-bn">এখন কী পড়বেন?</h2>
          <p id="daily-coach-description" className="font-bn">সময় বাছুন। Coach আপনার due review, lesson progress এবং mistake history থেকে পরের কাজ সাজিয়ে দেবে।</p>

          <div className="daily-coach__time-picker" aria-label="আজকের পড়ার সময়">
            <span><Clock3 size={14}/> আজ সময়</span>
            {TIMES.map(minutes => {
              const selected=Number(plan.dailyMinutes)===minutes;
              return <button
                key={minutes}
                type="button"
                aria-pressed={selected}
                onClick={() => onMinutes(minutes)}
                className={selected?'is-selected':''}
              >{minutes === 45 ? '45+' : minutes}m</button>;
            })}
          </div>

          {unresolvedMistakes > 0 && (
            <button type="button" onClick={()=>onNavigate('srs')} className="daily-coach__mistakes">
              <span><Brain size={16}/><b className="font-bn">Fix My Mistakes</b></span>
              <span><strong>{unresolvedMistakes}</strong><ArrowRight size={15}/></span>
            </button>
          )}
        </div>

        <div className="daily-coach__actions">
          {primary && (
            <button type="button" onClick={() => onNavigate(targetFor(primary.kind))} className="daily-coach__primary">
              <span className="daily-coach__primary-icon">{iconNode(primary.kind,20)}</span>
              <span className="daily-coach__primary-copy">
                <small><span>Next best action</span><i/> <span>{primary.minutes} min</span></small>
                <b className="font-bn">{primary.title}</b>
                <em className="font-bn">{primary.reason}</em>
                <span className="daily-coach__start font-bn"><Play size={14} fill="currentColor"/> শুরু করুন</span>
              </span>
              <span className="daily-coach__arrow"><ArrowRight size={17}/></span>
            </button>
          )}

          {secondary.length > 0 && (
            <div className="daily-coach__secondary">
              {secondary.map((item, index) => (
                <button type="button" key={item.id} onClick={() => onNavigate(targetFor(item.kind))}>
                  <span className="daily-coach__secondary-icon">{iconNode(item.kind,15)}</span>
                  <span><b className="font-bn">{item.title}</b><small>0{index + 2} · {item.minutes} min</small></span>
                  <ArrowRight size={14}/>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
