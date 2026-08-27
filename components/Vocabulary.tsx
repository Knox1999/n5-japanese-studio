'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Headphones, Search, Volume2, Sparkles } from 'lucide-react';
import type { LessonPayload, VocabItem } from '@/lib/types';
import type { ProgressMap } from '@/lib/storage';
import { playText } from '@/lib/audio';
import { track } from '@/lib/analytics';

export default function Vocabulary({ data, progress, onToggle }: { data: LessonPayload; progress: ProgressMap; onToggle: (id:number)=>void }) {
  const [query,setQuery]=useState('');
  const [limit,setLimit]=useState(30);
  const [hideMeaning,setHideMeaning]=useState(false);
  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q) return data.vocabulary;
    return data.vocabulary.filter(v=>[v.japanese,v.kanji,v.bangla_meaning,v.english_meaning,v.pronunciation_bn].some(x=>String(x||'').toLowerCase().includes(q)));
  },[data.vocabulary,query]);
  const done=data.vocabulary.filter(v=>progress[String(v.id)]).length;
  const pct=Math.round(done/Math.max(1,data.vocabulary.length)*100);

  return <div className="space-y-5 pb-8">
    <section className="study-header tone-vocab">
      <div><div className="section-kicker">Vocabulary · Lesson {String(data.lesson).padStart(2,'0')}</div><h1>{data.title}</h1><p className="font-bn">শব্দ → প্রাকৃতিক বাক্য → অডিও → Mastery</p></div>
      <div className="header-progress"><b>{done}/{data.vocabulary.length}</b><span>Mastered</span><div><i style={{width:`${pct}%`}}/></div></div>
    </section>

    <div className="toolbar-panel">
      <label className="search-field"><Search size={18}/><input value={query} onChange={e=>{setQuery(e.target.value);setLimit(30)}} placeholder="Japanese / Kanji / বাংলা / English…" /></label>
      <button className={`premium-btn ${hideMeaning?'premium-btn-primary':'premium-btn-secondary'}`} onClick={()=>setHideMeaning(x=>!x)}>{hideMeaning?'Reveal meanings':'Hide meanings'}</button>
    </div>

    <div className="grid gap-3 lg:grid-cols-2">
      {filtered.slice(0,limit).map((v,i)=><VocabCard key={v.id} v={v} mastered={!!progress[String(v.id)]} hideMeaning={hideMeaning} onToggle={onToggle} index={i}/>) }
    </div>
    {limit<filtered.length&&<button className="premium-btn premium-btn-secondary mx-auto flex" onClick={()=>setLimit(x=>x+30)}>Show {Math.min(30,filtered.length-limit)} more</button>}
    {!filtered.length&&<div className="empty-state"><Sparkles/><b>No matching vocabulary</b><p>Search using Japanese, Kanji, Bangla pronunciation, Bangla meaning, or English.</p></div>}
  </div>
}

function VocabCard({v,mastered,hideMeaning,onToggle,index}:{v:VocabItem;mastered:boolean;hideMeaning:boolean;onToggle:(id:number)=>void;index:number}){
  const jp=v.kanji||v.japanese;
  const ex=v.example?.jp||v.example?.japanese||'';
  return <motion.article initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:Math.min(index,10)*.025}} className={`vocab-premium-card ${mastered?'is-mastered':''}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="word-number">#{v.id}</span><span className="word-type">{v.word_type||'Vocabulary'}</span></div><h2 className="font-jp">{jp}</h2>{v.kanji&&v.kanji!==v.japanese&&<div className="kana-reading font-jp">{v.japanese}</div>}</div>
      <button className="icon-btn" aria-label={`Play ${v.japanese}`} onClick={()=>playText(v.tts_text||v.japanese,1,'word')}><Volume2 size={19}/></button>
    </div>
    <div className={`meaning-stack ${hideMeaning?'meaning-hidden':''}`}>
      <b className="font-bn">{v.bangla_meaning}</b><span>{v.english_meaning}</span><small className="font-bn">উচ্চারণ: {v.pronunciation_bn}</small>
    </div>
    {ex&&<div className="example-block"><div className="flex items-start justify-between gap-3"><p className="font-jp">{ex}</p><button className="mini-audio" onClick={()=>playText(ex,1,'sentence')} aria-label="Play example sentence"><Headphones size={16}/></button></div><span className={`font-bn ${hideMeaning?'blur-sm select-none':''}`}>{v.example?.bn}</span></div>}
    <button className={`mastery-button ${mastered?'done':''}`} onClick={()=>{onToggle(v.id);track('vocabulary_mastered',{lesson_number:v.lesson,word_id:v.id,mastered:!mastered})}}><Check size={17}/>{mastered?'Mastered':'Mark mastered'}</button>
  </motion.article>
}
