'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Check, ChevronRight, CircleDot, Headphones, Layers3, Search,
  Sparkles, Volume2, WandSparkles
} from 'lucide-react';
import type { LessonPayload, VocabItem } from '@/lib/types';
import type { ProgressMap } from '@/lib/storage';
import { playText } from '@/lib/audio';
import { track } from '@/lib/analytics';
import { learningMeta, type VerbGroupId } from '@/lib/linguistics';

const FILTERS=[
  ['all','সব'],
  ['verb','Verb'],
  ['group-1','Group 1'],
  ['group-2','Group 2'],
  ['group-3','Group 3'],
  ['i-adjective','い-adj'],
  ['na-adjective','な-adj'],
  ['irregular','ব্যতিক্রম'],
] as const;
type Filter=typeof FILTERS[number][0];

const GROUP_GUIDE:Array<{id:VerbGroupId;title:string;ja:string;bn:string;rule:string;example:string}>=[
  {id:'group-1',title:'Group 1',ja:'五段動詞',bn:'Godan verb',rule:'শেষ kana বদলে い-row + ます',example:'かく → かきます'},
  {id:'group-2',title:'Group 2',ja:'一段動詞',bn:'Ichidan verb',rule:'る বাদ দিয়ে ます',example:'たべる → たべます'},
  {id:'group-3',title:'Group 3',ja:'不規則動詞',bn:'Irregular verb',rule:'する / くる family',example:'する→します · くる→きます'},
];

export default function Vocabulary({data,progress,onToggle}:{data:LessonPayload;progress:ProgressMap;onToggle:(id:number)=>void}){
  const [query,setQuery]=useState('');
  const [limit,setLimit]=useState(30);
  const [hideMeaning,setHideMeaning]=useState(false);
  const [filter,setFilter]=useState<Filter>('all');

  const metaRows=useMemo(()=>data.vocabulary.map(v=>({v,m:learningMeta(v)})),[data.vocabulary]);
  const counts=useMemo(()=>metaRows.reduce((acc,{m})=>{
    acc[m.kind]=(acc[m.kind]||0)+1;
    if(m.groupId)acc[m.groupId]=(acc[m.groupId]||0)+1;
    if(m.irregular)acc.irregular=(acc.irregular||0)+1;
    return acc;
  },{} as Record<string,number>),[metaRows]);

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return metaRows.filter(({v,m})=>{
      const matchesQuery=!q||[
        v.japanese,v.kanji,v.bangla_meaning,v.english_meaning,v.pronunciation_bn,
        v.word_type,m.group,m.dictionaryForm
      ].some(x=>String(x||'').toLowerCase().includes(q));
      const matchesFilter=
        filter==='all'||
        (filter==='irregular'?m.irregular:
          filter==='group-1'||filter==='group-2'||filter==='group-3'
            ?m.groupId===filter
            :m.kind===filter);
      return matchesQuery&&matchesFilter;
    }).map(x=>x.v);
  },[metaRows,query,filter]);

  const done=data.vocabulary.filter(v=>progress[String(v.id)]).length;
  const pct=Math.round(done/Math.max(1,data.vocabulary.length)*100);
  const setActive=(id:Filter)=>{setFilter(id);setLimit(30);track('vocabulary_filter',{lesson_number:data.lesson,filter_name:id,count:counts[id]||0})};

  return <div className="space-y-5 pb-8 vocabulary-view-v48 vocabulary-view-v52">
    <section className="study-header tone-vocab">
      <div>
        <div className="section-kicker">Vocabulary Memory System · Lesson {String(data.lesson).padStart(2,'0')}</div>
        <h1>{data.title}</h1>
        <p className="font-bn">শব্দের অর্থের সাথে এখন い-adjective / な-adjective, Verb Group 1/2/3, dictionary form এবং গুরুত্বপূর্ণ ব্যতিক্রম—সবকিছু আলাদা করে memorize করা যাবে।</p>
      </div>
      <div className="header-progress"><b>{done}/{data.vocabulary.length}</b><span>Mastered</span><div><i style={{width:`${pct}%`}}/></div></div>
    </section>

    <section className="word-class-guide word-class-guide-v52" aria-label="Japanese word class memory guide">
      <button className={`word-guide-card verb ${filter==='verb'?'active':''}`} onClick={()=>setActive('verb')}>
        <span className="guide-icon"><Layers3/></span><div><b>動詞</b><strong>Verb · ক্রিয়া</strong><small>Group 1 / 2 / 3 আলাদা করে শিখুন</small></div><em>{counts.verb||0}</em>
      </button>
      <button className={`word-guide-card i-adj ${filter==='i-adjective'?'active':''}`} onClick={()=>setActive('i-adjective')}>
        <span className="guide-icon"><WandSparkles/></span><div><b>い形容詞</b><strong>い-adjective</strong><small>い → くない / かった</small></div><em>{counts['i-adjective']||0}</em>
      </button>
      <button className={`word-guide-card na-adj ${filter==='na-adjective'?'active':''}`} onClick={()=>setActive('na-adjective')}>
        <span className="guide-icon"><CircleDot/></span><div><b>な形容詞</b><strong>な-adjective</strong><small>Noun-এর আগে な</small></div><em>{counts['na-adjective']||0}</em>
      </button>
      <button className={`word-guide-card irregular ${filter==='irregular'?'active':''}`} onClick={()=>setActive('irregular')}>
        <span className="guide-icon"><AlertTriangle/></span><div><b>例外</b><strong>ব্যতিক্রম / Memory trap</strong><small>বিশেষ rule আলাদা highlight</small></div><em>{counts.irregular||0}</em>
      </button>
    </section>

    <section className="verb-group-memory" aria-label="Verb group memory map">
      <div className="verb-group-head">
        <div><span className="section-kicker">VERB GROUP MEMORY MAP</span><h2>Group 1 · Group 2 · Group 3</h2></div>
        <button onClick={()=>setActive('verb')}>সব Verb দেখুন <ChevronRight/></button>
      </div>
      <div className="verb-group-grid">
        {GROUP_GUIDE.map(g=><button key={g.id} className={`verb-group-card ${g.id} ${filter===g.id?'active':''}`} onClick={()=>setActive(g.id)}>
          <div className="verb-group-number">{g.title.replace('Group ','')}</div>
          <div><b>{g.title}</b><span className="font-jp">{g.ja}</span><small>{g.bn}</small></div>
          <strong>{counts[g.id]||0}</strong>
          <p className="font-bn">{g.rule}</p>
          <code className="font-jp">{g.example}</code>
        </button>)}
      </div>
      <div className="verb-memory-note font-bn"><AlertTriangle/><span><b>মনে রাখুন:</b> Group 3 নিজেই irregular family। এছাড়া Group 1-এর 行く → 行って, ある → ない এবং কিছু honorific verb-এর special form card-এর ভেতরে “ব্যতিক্রম” হিসেবে দেখানো হবে।</span></div>
    </section>

    <div className="toolbar-panel vocab-toolbar-v48 vocab-toolbar-v52">
      <label className="search-field"><Search size={20}/><input value={query} onChange={e=>{setQuery(e.target.value);setLimit(30)}} placeholder="Japanese / Kanji / বাংলা / English / Group…" aria-label="Search vocabulary"/></label>
      <button className={`premium-btn ${hideMeaning?'premium-btn-primary':'premium-btn-secondary'}`} onClick={()=>setHideMeaning(x=>!x)}>{hideMeaning?'Reveal meanings':'Hide meanings'}</button>
      <div className="word-filter-row" role="group" aria-label="Filter vocabulary">
        {FILTERS.map(([id,label])=><button key={id} className={filter===id?'active':''} onClick={()=>setActive(id)}>
          {label}{id!=='all'&&<small>{counts[id]||0}</small>}
        </button>)}
      </div>
    </div>

    {filter!=='all'&&<div className="active-filter-summary">
      <span>ACTIVE FILTER</span><b>{FILTERS.find(x=>x[0]===filter)?.[1]}</b><small>{filtered.length} item{filtered.length===1?'':'s'} in Lesson {String(data.lesson).padStart(2,'0')}</small>
      <button onClick={()=>setActive('all')}>Clear</button>
    </div>}

    <div className="grid gap-3 lg:grid-cols-2">
      {filtered.slice(0,limit).map((v,i)=><VocabCard key={v.id} v={v} mastered={!!progress[String(v.id)]} hideMeaning={hideMeaning} onToggle={onToggle} index={i}/>)}
    </div>

    {limit<filtered.length&&<button className="premium-btn premium-btn-secondary mx-auto flex" onClick={()=>setLimit(x=>x+30)}>Show {Math.min(30,filtered.length-limit)} more</button>}
    {!filtered.length&&<div className="empty-state vocab-empty-v52"><Sparkles/><b>এই Lesson-এ এই category নেই</b><p className="font-bn">এটা broken filter নয়—বর্তমান lesson-এর vocabulary-তে এই type নেই। “সব” নির্বাচন করুন অথবা অন্য Lesson খুলুন।</p><button className="premium-btn premium-btn-primary" onClick={()=>setActive('all')}>সব শব্দ দেখুন</button></div>}
  </div>
}

function VocabCard({v,mastered,hideMeaning,onToggle,index}:{v:VocabItem;mastered:boolean;hideMeaning:boolean;onToggle:(id:number)=>void;index:number}){
  const jp=v.kanji||v.japanese;
  const ex=v.example?.jp||v.example?.japanese||'';
  const meta=learningMeta(v);
  return <motion.article initial={{opacity:0,y:8,scale:.995}} animate={{opacity:1,y:0,scale:1}} transition={{delay:Math.min(index,10)*.018}} className={`vocab-premium-card vocab-class-${meta.tone} ${mastered?'is-mastered':''} ${meta.irregular?'has-exception':''}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="word-number">#{v.id}</span>
          <span className={`word-type word-type-${meta.tone}`}><b className="font-jp">{meta.jaLabel}</b>{meta.label}</span>
          {meta.group&&<span className={`word-group-chip ${meta.groupId||''}`}><b>{meta.group}</b>{meta.groupJa&&<small className="font-jp">{meta.groupJa}</small>}</span>}
          {meta.irregular&&<span className="exception-chip"><AlertTriangle size={13}/> ব্যতিক্রম</span>}
        </div>
        <h2 className="font-jp" lang="ja">{jp}</h2>
        {v.kanji&&v.kanji!==v.japanese&&<div className="kana-reading font-jp" lang="ja">{v.japanese}</div>}
      </div>
      <button className="icon-btn" aria-label={`Play ${v.japanese}`} onClick={()=>playText(v.tts_text||v.japanese,1,'word',{}, {lesson_number:v.lesson,word_id:v.id})}><Volume2 size={21}/></button>
    </div>

    {meta.kind==='verb'&&<div className="verb-identity-strip">
      <div><span>ます FORM</span><b className="font-jp">{v.japanese}</b></div>
      <ChevronRight/>
      <div><span>DICTIONARY</span><b className="font-jp">{meta.dictionaryForm||'—'}</b></div>
      <div className={`verb-group-badge ${meta.groupId||''}`}><span>GROUP</span><b>{meta.group?.replace(/ ·.*/,'')||'—'}</b></div>
    </div>}

    <div className="class-rule-strip"><span>{meta.kind==='verb'?'GROUP RULE':meta.kind.includes('adjective')?'ADJECTIVE RULE':'LEARNING NOTE'}</span><b className="font-bn">{meta.rule}</b></div>

    {meta.irregular&&<div className="exception-note"><AlertTriangle size={20}/><div><b className="font-bn">{meta.irregularTitle}</b><p className="font-bn">{meta.irregularNote}</p></div></div>}

    <div className={`meaning-stack ${hideMeaning?'meaning-hidden':''}`}>
      <b className="font-bn">{v.bangla_meaning}</b><span>{v.english_meaning}</span><small className="font-bn">উচ্চারণ: {v.pronunciation_bn}</small>
    </div>

    {ex&&<div className="example-block"><div className="flex items-start justify-between gap-3"><p className="font-jp" lang="ja">{ex}</p><button className="mini-audio" onClick={()=>playText(ex,1,'sentence',{}, {lesson_number:v.lesson,word_id:v.id})} aria-label="Play example sentence"><Headphones size={18}/></button></div><span className={`font-bn ${hideMeaning?'blur-sm select-none':''}`}>{v.example?.bn}</span></div>}

    <button className={`mastery-button ${mastered?'done':''}`} onClick={()=>{onToggle(v.id);track('vocabulary_mastered',{lesson_number:v.lesson,word_id:v.id,mastered:!mastered})}}><Check size={18}/>{mastered?'Mastered':'Mark mastered'}</button>
  </motion.article>
}
