'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, Headphones, Search, Sparkles, Volume2 } from 'lucide-react';
import type { LessonPayload, VocabItem } from '@/lib/types';
import type { ProgressMap } from '@/lib/storage';
import { playText } from '@/lib/audio';
import { track } from '@/lib/analytics';
import { learningMeta } from '@/lib/linguistics';

const FILTERS = [
  ['all','সব'], ['verb','Verb'], ['i-adjective','い-adj'], ['na-adjective','な-adj'], ['irregular','ব্যতিক্রম'],
] as const;

type Filter = typeof FILTERS[number][0];

export default function Vocabulary({ data, progress, onToggle }: { data: LessonPayload; progress: ProgressMap; onToggle: (id:number)=>void }) {
  const [query,setQuery]=useState('');
  const [limit,setLimit]=useState(30);
  const [hideMeaning,setHideMeaning]=useState(false);
  const [filter,setFilter]=useState<Filter>('all');
  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return data.vocabulary.filter(v=>{
      const meta=learningMeta(v);
      const matchesQuery=!q||[v.japanese,v.kanji,v.bangla_meaning,v.english_meaning,v.pronunciation_bn,v.word_type].some(x=>String(x||'').toLowerCase().includes(q));
      const matchesFilter=filter==='all'||(filter==='irregular'?meta.irregular:meta.kind===filter);
      return matchesQuery&&matchesFilter;
    });
  },[data.vocabulary,query,filter]);
  const done=data.vocabulary.filter(v=>progress[String(v.id)]).length;
  const pct=Math.round(done/Math.max(1,data.vocabulary.length)*100);
  const counts=useMemo(()=>data.vocabulary.reduce((acc,v)=>{const m=learningMeta(v);acc[m.kind]=(acc[m.kind]||0)+1;if(m.irregular)acc.irregular=(acc.irregular||0)+1;return acc},{} as Record<string,number>),[data.vocabulary]);
  return <div className="space-y-5 pb-8 vocabulary-view-v48">
    <section className="study-header tone-vocab">
      <div><div className="section-kicker">Vocabulary Intelligence · Lesson {String(data.lesson).padStart(2,'0')}</div><h1>{data.title}</h1><p className="font-bn">শব্দের অর্থের সাথে এখন Verb / い-adjective / な-adjective type এবং ব্যতিক্রম rule-ও স্পষ্টভাবে দেখা যাবে।</p></div>
      <div className="header-progress"><b>{done}/{data.vocabulary.length}</b><span>Mastered</span><div><i style={{width:`${pct}%`}}/></div></div>
    </section>

    <section className="word-class-guide" aria-label="Japanese word type guide">
      <div className="word-guide-card verb"><b>動詞</b><span>Verb · ক্রিয়া</span><small>ます / て / ない form</small></div>
      <div className="word-guide-card i-adj"><b>い形容詞</b><span>い-adjective</span><small>い → くない / かった</small></div>
      <div className="word-guide-card na-adj"><b>な形容詞</b><span>な-adjective</span><small>Noun-এর আগে な</small></div>
      <div className="word-guide-card irregular"><AlertTriangle size={17}/><span>ব্যতিক্রম</span><small>বিশেষ rule আলাদা highlight</small></div>
    </section>

    <div className="toolbar-panel vocab-toolbar-v48">
      <label className="search-field"><Search size={18}/><input value={query} onChange={e=>{setQuery(e.target.value);setLimit(30)}} placeholder="Japanese / Kanji / বাংলা / English…" /></label>
      <button className={`premium-btn ${hideMeaning?'premium-btn-primary':'premium-btn-secondary'}`} onClick={()=>setHideMeaning(x=>!x)}>{hideMeaning?'Reveal meanings':'Hide meanings'}</button>
      <div className="word-filter-row" role="group" aria-label="Filter by word class">{FILTERS.map(([id,label])=><button key={id} className={filter===id?'active':''} onClick={()=>{setFilter(id);setLimit(30)}}>{label}{id!=='all'&&<small>{counts[id]||0}</small>}</button>)}</div>
    </div>

    <div className="grid gap-3 lg:grid-cols-2">
      {filtered.slice(0,limit).map((v,i)=><VocabCard key={v.id} v={v} mastered={!!progress[String(v.id)]} hideMeaning={hideMeaning} onToggle={onToggle} index={i}/>) }
    </div>
    {limit<filtered.length&&<button className="premium-btn premium-btn-secondary mx-auto flex" onClick={()=>setLimit(x=>x+30)}>Show {Math.min(30,filtered.length-limit)} more</button>}
    {!filtered.length&&<div className="empty-state"><Sparkles/><b>No matching vocabulary</b><p>Search or switch the word-type filter.</p></div>}
  </div>
}

function VocabCard({v,mastered,hideMeaning,onToggle,index}:{v:VocabItem;mastered:boolean;hideMeaning:boolean;onToggle:(id:number)=>void;index:number}){
  const jp=v.kanji||v.japanese;
  const ex=v.example?.jp||v.example?.japanese||'';
  const meta=learningMeta(v);
  return <motion.article initial={{opacity:0,y:8,scale:.995}} animate={{opacity:1,y:0,scale:1}} transition={{delay:Math.min(index,10)*.022}} className={`vocab-premium-card vocab-class-${meta.tone} ${mastered?'is-mastered':''} ${meta.irregular?'has-exception':''}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="word-number">#{v.id}</span>
          <span className={`word-type word-type-${meta.tone}`}><b className="font-jp">{meta.jaLabel}</b>{meta.label}</span>
          {meta.group&&<span className="word-group-chip">{meta.group}</span>}
          {meta.irregular&&<span className="exception-chip"><AlertTriangle size={12}/> ব্যতিক্রম / NOTE</span>}
        </div>
        <h2 className="font-jp">{jp}</h2>{v.kanji&&v.kanji!==v.japanese&&<div className="kana-reading font-jp">{v.japanese}</div>}
      </div>
      <button className="icon-btn" aria-label={`Play ${v.japanese}`} onClick={()=>playText(v.tts_text||v.japanese,1,'word')}><Volume2 size={19}/></button>
    </div>
    <div className="class-rule-strip"><span>{meta.kind==='verb'?'CONJUGATION':meta.kind.includes('adjective')?'ADJECTIVE RULE':'LEARNING NOTE'}</span><b className="font-bn">{meta.rule}</b></div>
    {meta.irregular&&<div className="exception-note"><AlertTriangle size={18}/><div><b className="font-bn">{meta.irregularTitle}</b><p className="font-bn">{meta.irregularNote}</p></div></div>}
    <div className={`meaning-stack ${hideMeaning?'meaning-hidden':''}`}>
      <b className="font-bn">{v.bangla_meaning}</b><span>{v.english_meaning}</span><small className="font-bn">উচ্চারণ: {v.pronunciation_bn}</small>
    </div>
    {ex&&<div className="example-block"><div className="flex items-start justify-between gap-3"><p className="font-jp">{ex}</p><button className="mini-audio" onClick={()=>playText(ex,1,'sentence')} aria-label="Play example sentence"><Headphones size={16}/></button></div><span className={`font-bn ${hideMeaning?'blur-sm select-none':''}`}>{v.example?.bn}</span></div>}
    <button className={`mastery-button ${mastered?'done':''}`} onClick={()=>{onToggle(v.id);track('vocabulary_mastered',{lesson_number:v.lesson,word_id:v.id,mastered:!mastered})}}><Check size={17}/>{mastered?'Mastered':'Mark mastered'}</button>
  </motion.article>
}
