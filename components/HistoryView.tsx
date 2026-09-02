'use client';

import { useMemo } from 'react';
import { BarChart3, Brain, CalendarDays, Headphones, RotateCcw, Target, Trophy } from 'lucide-react';
import type { MockAttempt } from '@/lib/types';
import { playText } from '@/lib/audio';
import { useLanguage } from '@/lib/language';

export default function HistoryView({history,onReviewMistakes,onStartMock}:{history:MockAttempt[];onReviewMistakes:(ids:number[])=>void;onStartMock:()=>void}){
  const {language,text}=useLanguage();
  const stats=useMemo(()=>{
    if(!history.length)return {best:0,average:0,attempts:0,last:0};
    const scores=history.map(x=>Number(x.score||0));
    return {
      best:Math.max(...scores),
      average:Math.round(scores.reduce((a,b)=>a+b,0)/scores.length),
      attempts:history.length,
      last:scores[0]||0,
    };
  },[history]);

  return <div className="history-view-v65 space-y-5">
    <section className="study-header tone-history">
      <div>
        <div className="section-kicker">Performance History</div>
        <h1>{text('কাজে লাগে এমন অগ্রগতি','Progress you can actually use')}</h1>
        <p className={language==='bn'?'font-bn':''}>{text('Account workspace-এ sync হওয়া real mock attempt থেকে trend, best score, recent answers ও ভুলের review দেখুন।','Use your synced mock attempts to review trends, recent answers and every mistake.')}</p>
      </div>
      <BarChart3 className="header-big-icon"/>
    </section>

    {history.length>0&&<section className="history-metrics-v65">
      <article><Trophy/><span>{text('সেরা স্কোর','Best score')}</span><b>{stats.best}%</b><small>{text('সর্বোচ্চ attempt','highest attempt')}</small></article>
      <article><Target/><span>{text('গড়','Average')}</span><b>{stats.average}%</b><small>{text('সব attempt','all attempts')}</small></article>
      <article><BarChart3/><span>{text('মোট attempt','Attempts')}</span><b>{stats.attempts}</b><small>{text('account-এ synced','synced to account')}</small></article>
      <article><CalendarDays/><span>{text('সর্বশেষ','Latest')}</span><b>{stats.last}%</b><small>{text('সাম্প্রতিক স্কোর','most recent score')}</small></article>
    </section>}

    {!history.length
      ?<div className="empty-state history-empty-v65"><Trophy/><b className={language==='bn'?'font-bn':''}>{text('এখনো কোনো mock history নেই','No mock history yet')}</b><p className={language==='bn'?'font-bn':''}>{text('একটি Quick, Mini অথবা Full mock শেষ করলে এখানে performance trend তৈরি হবে।','Complete a Quick, Mini or Full mock to build your performance trend here.')}</p></div>
      :<section className="history-list-v65">
        <header><div><span>ATTEMPT TIMELINE</span><h2 className={language==='bn'?'font-bn':''}>{text('সাম্প্রতিক ফলাফল','Recent results')}</h2></div><small>{history.length} saved attempt{history.length===1?'':'s'}</small></header>
        <div>
          {history.map((x,i)=>{
            const label=x.label||(x.scope==='n5-full'?'JLPT N5 Full Simulation':x.scope==='n5-mini'?'JLPT N5 Mini Mock':`Lesson ${String(x.lesson).padStart(2,'0')}`);
            const date=new Date(x.date);const wrong=x.responses?.filter(row=>!row.correct)||[];const wrongWordIds=Array.from(new Set(wrong.map(row=>row.wordId).filter((id):id is number=>typeof id==='number')));
            return <article className="history-card-v65" key={`${x.date}-${i}`}>
              <div className="history-score-v65"><strong>{x.score}%</strong><span>{x.score>=80?text('চমৎকার','Strong'):x.score>=60?text('উন্নতি হচ্ছে','Developing'):text('রিভিউ দরকার','Review')}</span></div>
              <div className="history-copy-v65"><small>{x.scope==='n5-full'?text('ফুল N5','FULL N5'):x.scope==='n5-mini'?text('মিনি N5','MINI N5'):text('লেসন প্র্যাকটিস','LESSON PRACTICE')}</small><b>{label}</b><p className={language==='bn'?'font-bn':''}>{x.correct}/{x.total} {text('সঠিক','correct')} · {date.toLocaleDateString(language==='bn'?'bn-BD':'en-BD')} · {date.toLocaleTimeString(language==='bn'?'bn-BD':'en-BD',{hour:'2-digit',minute:'2-digit'})}{x.durationSeconds?` · ${Math.round(x.durationSeconds/60)} min`:''}</p></div>
              <div className="history-progress-v65"><i style={{width:`${Math.max(2,x.score)}%`}}/></div>
              {x.responses?.length?<details className="history-answer-review"><summary>{text(`${wrong.length}টি ভুলসহ সব উত্তর দেখুন`,`Review all answers · ${wrong.length} incorrect`)}</summary><div>
                {x.responses.map((response,index)=><article key={`${x.id||x.date}-${response.id}`} className={response.correct?'correct':'wrong'}><header><span>Q{index+1}</span><b>{response.itemType}</b><em>{response.correct?text('সঠিক','Correct'):text('ভুল','Incorrect')}</em></header>{response.audioText&&<button type="button" onClick={()=>void playText(response.audioText!,1,'history_review')}><Headphones/>{text('শুনুন','Replay')}</button>}<p className={/[ぁ-んァ-ヶ一-龯]/.test(response.prompt)?'font-jp':'font-bn'}>{response.prompt}</p><small>{text('আপনার উত্তর','Your answer')}: {response.userAnswer||text('দেওয়া হয়নি','Not answered')}</small><strong>{text('সঠিক উত্তর','Correct answer')}: {response.correctAnswer}</strong></article>)}
                <div className="history-review-actions">{wrongWordIds.length>0&&<button type="button" onClick={()=>onReviewMistakes(wrongWordIds)}><Brain/>{text('ভুল vocabulary Recall-এ দিন','Send vocabulary mistakes to Recall')}</button>}<button type="button" onClick={onStartMock}><RotateCcw/>{text('আরেকটি mock দিন','Start another mock')}</button></div>
              </div></details>:<p className="history-legacy-note">{text('এই পুরোনো attempt-এ question-level data save হয়নি। নতুন attempt থেকে পূর্ণ review পাওয়া যাবে।','This older attempt did not save question-level data. New attempts include complete review.')}</p>}
            </article>;
          })}
        </div>
      </section>}
  </div>;
}
