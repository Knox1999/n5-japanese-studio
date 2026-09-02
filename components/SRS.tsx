'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain, Globe2, Headphones, Loader2, RotateCcw, Shuffle, Volume2 } from 'lucide-react';
import type { LessonPayload, StudioMeta, VocabItem, SrsCardState } from '@/lib/types';
import type { ProgressMap, SrsMap } from '@/lib/storage';
import { loadLesson } from '@/lib/data';
import { playText } from '@/lib/audio';
import { track, trackError } from '@/lib/analytics';
import { useLanguage } from '@/lib/language';

const DAY=86400000;
type ReviewRating='again'|'hard'|'good'|'easy';
type ReviewResult={itemId:number;lesson:number;rating:ReviewRating;correctAnswer:string};
function def():SrsCardState{return{phase:'learn',repetitions:0,lapses:0,ease:2.3,interval_days:0,due_at:null,last_rating:null,recall_count:0,use_count:0}}
function shuffled<T>(a:T[]){const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
function dueNow(st?:SrsCardState){return !!st?.due_at&&new Date(st.due_at).getTime()<=Date.now()}

export default function SRS({data,meta,srs,progress,onSrsChange,onProgressChange,onReviewResult,autoStart}:{
  data:LessonPayload;meta:StudioMeta;srs:SrsMap;progress:ProgressMap;
  onSrsChange:(v:SrsMap)=>void;onProgressChange:(v:ProgressMap)=>void;
  onReviewResult?:(result:ReviewResult)=>void;
  autoStart?:'smart'|'due'|null;
}){
  const {language,text}=useLanguage();
  const [session,setSession]=useState<VocabItem[]>([]);
  const [idx,setIdx]=useState(0);
  const [reveal,setReveal]=useState(false);
  const [scope,setScope]=useState<'lesson'|'global'>('lesson');
  const [globalLoading,setGlobalLoading]=useState(false);
  const [globalError,setGlobalError]=useState('');

  const rows=data.vocabulary;
  const stats=useMemo(()=>{
    let due=0,started=0,mature=0;
    rows.forEach(v=>{const st=srs[String(v.id)];if(st){started++;if(dueNow(st))due++;if((st.interval_days||0)>=7||(st.repetitions||0)>=5)mature++}});
    return{due,new:rows.length-started,started,mature}
  },[rows,srs]);

  const globalDueIds=useMemo(()=>new Set(
    Object.entries(srs).filter(([,st])=>dueNow(st)).map(([id])=>Number(id)).filter(Number.isFinite)
  ),[srs]);

  const dueByLesson=useMemo(()=>meta.lessons.map(L=>({
    lesson:L.lesson,
    title:L.title,
    due:(L.ids||[]).reduce((n,id)=>n+(globalDueIds.has(Number(id))?1:0),0)
  })).filter(x=>x.due>0),[meta.lessons,globalDueIds]);

  const startLesson=(dueOnly=false)=>{
    const due=rows.filter(v=>dueNow(srs[String(v.id)]));
    const fresh=rows.filter(v=>!srs[String(v.id)]);
    const future=rows.filter(v=>srs[String(v.id)]&&!dueNow(srs[String(v.id)]));
    let pick=dueOnly?shuffled(due):[...shuffled(due),...shuffled(fresh).slice(0,8),...shuffled(future)].slice(0,20);
    if(!pick.length)pick=shuffled(rows).slice(0,Math.min(12,rows.length));
    setScope('lesson');setSession(pick);setIdx(0);setReveal(false);
    track('section_open',{section_name:'srs_session',lesson_number:data.lesson,queue_scope:'lesson',due_only:dueOnly})
  };

  const startGlobal=async()=>{
    if(!globalDueIds.size){setGlobalError(text('Global due queue এখন খালি।','The global due queue is empty.'));return}
    setGlobalLoading(true);setGlobalError('');
    try{
      const targetLessons=meta.lessons.filter(L=>(L.ids||[]).some(id=>globalDueIds.has(Number(id))));
      const payloads=await Promise.all(targetLessons.map(L=>loadLesson(L.lesson)));
      const all=payloads.flatMap(p=>p.vocabulary.filter(v=>globalDueIds.has(Number(v.id))));
      const pick=shuffled(all).slice(0,80);
      if(!pick.length)throw new Error('Due words were not found in lesson data.');
      setScope('global');setSession(pick);setIdx(0);setReveal(false);
      track('section_open',{section_name:'srs_global_session',global_due:globalDueIds.size,batch_size:pick.length})
    }catch(e){
      setGlobalError(e instanceof Error?e.message:String(e));trackError('resource',e)
    }finally{setGlobalLoading(false)}
  };

  const autoStartFired=useRef(false);
  useEffect(()=>{
    if(autoStart&&!autoStartFired.current){autoStartFired.current=true;startLesson(autoStart==='due')}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[autoStart]);

  const card=session[idx];

  const rate=(rating:ReviewRating)=>{
    if(!card)return;
    const old=srs[String(card.id)]||def();
    let ease=Number(old.ease||2.3),interval=Number(old.interval_days||0),reps=Number(old.repetitions||0),lapses=Number(old.lapses||0),next=old.phase||'learn';
    const phase=old.phase||'learn';
    if(rating==='again'){ease=Math.max(1.3,ease-.2);lapses++;interval=10/1440;next='recall'}
    else if(rating==='hard'){ease=Math.max(1.3,ease-.05);if(phase==='learn'){interval=10/1440;next='recall'}else if(phase==='recall'){interval=Math.max(30/1440,interval*1.15);next='recall'}else if(phase==='use'){interval=Math.max(.25,interval*1.15);next='use'}else{interval=Math.max(1,interval*1.2);next='review'}}
    else if(rating==='good'){reps++;if(phase==='learn'){interval=10/1440;next='recall'}else if(phase==='recall'){interval=.25;next='use'}else if(phase==='use'){interval=1;next='review'}else{interval=Math.max(1,interval?interval*ease:1);next='review'}}
    else{reps++;ease=Math.min(3,ease+.15);if(phase==='learn'){interval=.25;next='recall'}else if(phase==='recall'){interval=1;next='use'}else if(phase==='use'){interval=3;next='review'}else{interval=Math.max(3,interval?interval*ease*1.6:3);next='review'}}
    const nextS={...srs,[String(card.id)]:{...old,phase:next,repetitions:reps,lapses,ease,interval_days:interval,due_at:new Date(Date.now()+interval*DAY).toISOString(),last_rating:rating}};
    onSrsChange(nextS);
    if(interval>=7||reps>=5)onProgressChange({...progress,[String(card.id)]:true});
    onReviewResult?.({itemId:card.id,lesson:card.lesson||data.lesson,rating,correctAnswer:card.kanji||card.japanese});
    track('practice_result',{practice_type:'srs',result:rating,word_id:card.id,lesson_number:card.lesson||data.lesson,queue_scope:scope});
    setReveal(false);
    if(idx+1>=session.length){setSession([]);setIdx(0)}else setIdx(x=>x+1)
  };

  if(card){
    const ex=card.example?.jp||card.example?.japanese||'';
    return <div className="srs-shell">
      <section className="study-header tone-srs">
        <div>
          <div className="section-kicker">{scope==='global'?'Global SRS Queue':'Lesson SRS Queue'}</div>
          <h1 className={language==='bn'?'font-bn':''}>{text('শিখুন → মনে রাখুন → ব্যবহার করুন → রিভিউ করুন','Learn → Recall → Use → Review')}</h1>
          <p className={language==='bn'?'font-bn':''}>{scope==='global'?text('সব ২৫ lesson-এর due word এক queue-তে review হচ্ছে।','Due words from all 25 lessons are being reviewed in one queue.'):text(`Lesson ${data.lesson}-এর adaptive review session।`,`Adaptive review session for Lesson ${data.lesson}.`)}</p>
        </div>
        <button className="premium-btn premium-btn-secondary" onClick={()=>setSession([])}>{text('সেশন শেষ করুন','End session')}</button>
      </section>
      <div className="srs-counter-row">
        <span className="phase-pill">{(srs[String(card.id)]?.phase||'learn').toUpperCase()}</span>
        <span><Shuffle size={14}/> {scope==='global'?text('সব lesson থেকে randomized','Global randomized'):text('এই lesson থেকে randomized','Lesson randomized')}</span>
        <b>{idx+1}/{session.length}</b>
      </div>
      <AnimatePresence mode="wait"><motion.article key={`${card.id}-${idx}`} initial={{opacity:0,y:12,scale:.99}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-8}} className="srs-card-premium">
        <div className="text-center">
          <span className="section-kicker">ACTIVE RECALL · L{String(card.lesson||data.lesson).padStart(2,'0')}</span>
          <h2 className="font-jp">{card.kanji||card.japanese}</h2>
          {card.kanji&&<p className="font-jp text-slatecopy">{card.japanese}</p>}
        </div>
        {ex&&<div className="srs-sentence font-jp">{ex}</div>}
        <div className="grid grid-cols-2 gap-2">
          <button className="audio-action" onClick={()=>playText(card.tts_text||card.japanese,1,'word',{}, {word_id:card.id,lesson_number:card.lesson||data.lesson})}><Volume2/> {text('শব্দের audio','Word audio')}</button>
          <button className="audio-action" disabled={!ex} onClick={()=>ex&&playText(ex,1,'sentence',{}, {word_id:card.id,lesson_number:card.lesson||data.lesson})}><Headphones/> {text('বাক্যের audio','Sentence audio')}</button>
        </div>
        {!reveal?<button className="reveal-button" onClick={()=>setReveal(true)}>{text('উত্তর দেখুন','Reveal answer')}</button>:<motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} className="revealed-answer">
          {language==='bn'?<><b className="font-bn">{card.bangla_meaning}</b><span>{card.english_meaning}</span></>:<><b>{card.english_meaning}</b><span className="font-bn">{card.bangla_meaning}</span></>}
          <small className="font-bn">{text('উচ্চারণ','Bangla pronunciation')}: {card.pronunciation_bn}</small>{card.example?.bn&&<p className="font-bn">{card.example.bn}</p>}
        </motion.div>}
        {reveal&&<div className="rating-grid">
          <button onClick={()=>rate('again')} className="rating again">{text('আবার','Again')}<small>{text('১০মি','10m')}</small></button>
          <button onClick={()=>rate('hard')} className="rating hard">{text('কঠিন','Hard')}<small>{text('অল্প','short')}</small></button>
          <button onClick={()=>rate('good')} className="rating good">{text('ভালো','Good')}<small>{text('স্বাভাবিক','normal')}</small></button>
          <button onClick={()=>rate('easy')} className="rating easy">{text('সহজ','Easy')}<small>{text('দীর্ঘ','long')}</small></button>
        </div>}
      </motion.article></AnimatePresence>
    </div>
  }

  return <div className="space-y-5">
    <section className="study-header tone-srs">
      <div>
        <div className="section-kicker">Adaptive spaced repetition</div>
        <h1 className={language==='bn'?'font-bn':''}>{text('স্মার্ট রিভিউ','Memory Review')}</h1>
        <p className={language==='bn'?'font-bn':''}>{text('Current lesson review এবং পুরো course-এর Global Due Queue—দুইভাবেই review করতে পারবেন।','Review the current lesson or use one Global Due Queue for the entire course.')}</p>
      </div><Brain className="header-big-icon"/>
    </section>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {[
        [text('সব lesson due','Global due'),globalDueIds.size],
        [text(`L${String(data.lesson).padStart(2,'0')} due`,`L${String(data.lesson).padStart(2,'0')} due`),stats.due],
        [text('নতুন','New'),stats.new],[text('শুরু হয়েছে','Started'),stats.started],[text('পাকা','Mature'),stats.mature]
      ].map(([a,b])=><article className="metric-card" key={String(a)}><span className="metric-label">{a}</span><b className="metric-value">{b}</b></article>)}
    </section>

    {dueByLesson.length>0&&<section className="nv58-due-map">
      <header><div><span>GLOBAL DUE MAP</span><b>{text('কোন lesson-এ কত review বাকি','Reviews remaining by lesson')}</b></div><strong>{globalDueIds.size}</strong></header>
      <div>{dueByLesson.map(x=><span key={x.lesson}><b>L{String(x.lesson).padStart(2,'0')}</b><em>{x.due}</em></span>)}</div>
    </section>}

    <section className="grid gap-3 md:grid-cols-3">
      <button onClick={()=>startLesson(false)} className="action-panel"><RotateCcw/><div><b className={language==='bn'?'font-bn':''}>{text('Lesson Smart Session','Lesson Smart Session')}</b><p className={language==='bn'?'font-bn':''}>{text('বর্তমান lesson-এর due ও নতুন শব্দ।','Current lesson due + new words.')}</p></div></button>
      <button onClick={()=>startLesson(true)} className="action-panel"><Brain/><div><b className={language==='bn'?'font-bn':''}>{text('বর্তমান Lesson Due','Current Lesson Due')}</b><p className={language==='bn'?'font-bn':''}>{text(`শুধু Lesson ${data.lesson}-এর due card।`,`Only due cards from Lesson ${data.lesson}.`)}</p></div></button>
      <button onClick={startGlobal} className="action-panel nv58-global-srs" disabled={globalLoading}>
        {globalLoading?<Loader2 className="animate-spin"/>:<Globe2/>}<div><b className={language==='bn'?'font-bn':''}>{text('গ্লোবাল Due Queue','Global Due Queue')}</b><p className={language==='bn'?'font-bn':''}>{globalDueIds.size?text(`সব lesson মিলিয়ে ${globalDueIds.size}টি due card review করুন।`,`Review ${globalDueIds.size} due cards across all lessons.`):text('পুরো course-এ কিছুই due নেই।','Nothing due across the course.')}</p></div>
      </button>
    </section>
    {globalError&&<div className="nv58-inline-error"><span>{globalError}</span><button onClick={startGlobal}>{text('আবার চেষ্টা করুন','Retry')}</button></div>}
  </div>
}
