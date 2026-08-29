'use client';

import { useMemo } from 'react';
import { BarChart3, CalendarDays, Target, Trophy } from 'lucide-react';
import type { MockAttempt } from '@/lib/types';

export default function HistoryView({history}:{history:MockAttempt[]}){
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
        <h1>Progress you can actually use</h1>
        <p className="font-bn">এই browser-এ save থাকা real mock attempt থেকে আপনার trend, best score এবং recent performance দেখানো হচ্ছে।</p>
      </div>
      <BarChart3 className="header-big-icon"/>
    </section>

    {history.length>0&&<section className="history-metrics-v65">
      <article><Trophy/><span>Best score</span><b>{stats.best}%</b><small>highest attempt</small></article>
      <article><Target/><span>Average</span><b>{stats.average}%</b><small>all attempts</small></article>
      <article><BarChart3/><span>Attempts</span><b>{stats.attempts}</b><small>saved locally</small></article>
      <article><CalendarDays/><span>Latest</span><b>{stats.last}%</b><small>most recent score</small></article>
    </section>}

    {!history.length
      ?<div className="empty-state history-empty-v65"><Trophy/><b>No mock history yet</b><p className="font-bn">একটি Quick, Mini অথবা Full mock শেষ করলে এখানে performance trend তৈরি হবে।</p></div>
      :<section className="history-list-v65">
        <header><div><span>ATTEMPT TIMELINE</span><h2 className="font-bn">সাম্প্রতিক ফলাফল</h2></div><small>{history.length} saved attempt{history.length===1?'':'s'}</small></header>
        <div>
          {history.map((x,i)=>{
            const label=x.label||(x.scope==='n5-full'?'JLPT N5 Full Simulation':`Lesson ${String(x.lesson).padStart(2,'0')}`);
            const date=new Date(x.date);
            return <article className="history-card-v65" key={`${x.date}-${i}`}>
              <div className="history-score-v65"><strong>{x.score}%</strong><span>{x.score>=80?'Strong':x.score>=60?'Developing':'Review'}</span></div>
              <div className="history-copy-v65"><small>{x.scope==='n5-full'?'FULL N5':'LESSON PRACTICE'}</small><b>{label}</b><p className="font-bn">{x.correct}/{x.total} সঠিক · {date.toLocaleDateString()} · {date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</p></div>
              <div className="history-progress-v65"><i style={{width:`${Math.max(2,x.score)}%`}}/></div>
            </article>;
          })}
        </div>
      </section>}
  </div>;
}
