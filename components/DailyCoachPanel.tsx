'use client';

import { ArrowRight, Brain, Clock3, Play, RotateCcw, Sparkles, Target } from 'lucide-react';
import type { DailyRecommendation, StudyPlan, ViewName } from '@/lib/types';
import { useLanguage } from '@/lib/language';

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
  const {language,text}=useLanguage();
  const primary = recommendations[0];
  const secondary = recommendations.slice(1, 4);

  return (
    <section className="daily-coach" aria-labelledby="daily-coach-title" aria-describedby="daily-coach-description">
      <div className="daily-coach__grid">
        <div className="daily-coach__intro">
          <div className="daily-coach__eyebrow"><Sparkles size={14}/> {text('ডেইলি স্টাডি কোচ','Daily Study Coach')}</div>
          <h2 id="daily-coach-title" className={language==='bn'?'font-bn':''}>{text('এখন কী পড়বেন?','What should you study now?')}</h2>
          <p id="daily-coach-description" className={language==='bn'?'font-bn':''}>{text('সময় বাছুন। Coach আপনার due review, lesson progress এবং mistake history থেকে পরের কাজ সাজিয়ে দেবে।','Choose your available time. The coach prioritizes your due reviews, lesson progress and mistake history.')}</p>

          <div className="daily-coach__time-picker" aria-label={text('আজকের পড়ার সময়','Study time today')}>
            <span><Clock3 size={14}/> {text('আজ সময়','Time today')}</span>
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
              <span><Brain size={16}/><b>{text('আমার ভুলগুলো ঠিক করুন','Fix My Mistakes')}</b></span>
              <span><strong>{unresolvedMistakes}</strong><ArrowRight size={15}/></span>
            </button>
          )}
        </div>

        <div className="daily-coach__actions">
          {primary && (
            <button type="button" onClick={() => onNavigate(targetFor(primary.kind))} className="daily-coach__primary">
              <span className="daily-coach__primary-icon">{iconNode(primary.kind,20)}</span>
              <span className="daily-coach__primary-copy">
                <small><span>{text('পরের সেরা কাজ','Next best action')}</span><i/> <span>{primary.minutes} min</span></small>
                <b className={language==='bn'?'font-bn':''}>{language==='bn'?primary.title:primary.titleEn||primary.title}</b>
                <em className={language==='bn'?'font-bn':''}>{language==='bn'?primary.reason:primary.reasonEn||primary.reason}</em>
                <span className={`daily-coach__start ${language==='bn'?'font-bn':''}`}><Play size={14} fill="currentColor"/> {text('শুরু করুন','Start')}</span>
              </span>
              <span className="daily-coach__arrow"><ArrowRight size={17}/></span>
            </button>
          )}

          {secondary.length > 0 && (
            <div className="daily-coach__secondary">
              {secondary.map((item, index) => (
                <button type="button" key={item.id} onClick={() => onNavigate(targetFor(item.kind))}>
                  <span className="daily-coach__secondary-icon">{iconNode(item.kind,15)}</span>
                  <span><b className={language==='bn'?'font-bn':''}>{language==='bn'?item.title:item.titleEn||item.title}</b><small>0{index + 2} · {item.minutes} min</small></span>
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
