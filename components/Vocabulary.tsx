'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, BookOpenCheck, Check, ChevronRight, Headphones, Layers3,
  Search, Sparkles, Volume2, X
} from 'lucide-react';
import type { LessonPayload, VocabItem } from '@/lib/types';
import type { ProgressMap } from '@/lib/storage';
import { playText } from '@/lib/audio';
import { track } from '@/lib/analytics';
import { learningMeta, verbForms, type VerbGroupId } from '@/lib/linguistics';
import { useLanguage } from '@/lib/language';

const PRIMARY_FILTERS=[
  ['all','সব'],
  ['verb','Verb'],
  ['i-adjective','い-adj'],
  ['na-adjective','な-adj'],
] as const;
type PrimaryFilter=typeof PRIMARY_FILTERS[number][0];
type VerbFilter='all-verbs'|VerbGroupId|'exceptions';

const VERB_FILTERS:Array<[VerbFilter,string]>=[
  ['all-verbs','সব Verb'],['group-1','Group 1'],['group-2','Group 2'],['group-3','Group 3'],['exceptions','ব্যতিক্রম']
];

export default function Vocabulary({data,progress,onToggle}:{data:LessonPayload;progress:ProgressMap;onToggle:(id:number)=>void}){
  const {language,text}=useLanguage();
  const [query,setQuery]=useState('');
  const [limit,setLimit]=useState(30);
  const [hideMeaning,setHideMeaning]=useState(false);
  const [filter,setFilter]=useState<PrimaryFilter>('all');
  const [verbFilter,setVerbFilter]=useState<VerbFilter>('all-verbs');
  const [formsWord,setFormsWord]=useState<VocabItem|null>(null);

  const rows=useMemo(()=>data.vocabulary.map(v=>({v,m:learningMeta(v)})),[data.vocabulary]);
  const counts=useMemo(()=>rows.reduce((acc,{m})=>{
    acc[m.kind]=(acc[m.kind]||0)+1;
    if(m.groupId)acc[m.groupId]=(acc[m.groupId]||0)+1;
    if(m.kind==='verb'&&m.irregular)acc.exceptions=(acc.exceptions||0)+1;
    return acc;
  },{} as Record<string,number>),[rows]);

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return rows.filter(({v,m})=>{
      const queryOk=!q||[v.japanese,v.kanji,v.bangla_meaning,v.english_meaning,v.pronunciation_bn,v.word_type,m.group]
        .some(x=>String(x||'').toLowerCase().includes(q));
      if(!queryOk)return false;
      if(filter==='all')return true;
      if(filter==='i-adjective'||filter==='na-adjective')return m.kind===filter;
      if(filter==='verb'){
        if(m.kind!=='verb')return false;
        if(verbFilter==='all-verbs')return true;
        if(verbFilter==='exceptions')return m.irregular;
        return m.groupId===verbFilter;
      }
      return true;
    }).map(x=>x.v);
  },[rows,query,filter,verbFilter]);

  const done=data.vocabulary.filter(v=>progress[String(v.id)]).length;
  const pct=Math.round(done/Math.max(1,data.vocabulary.length)*100);
  const setPrimary=(id:PrimaryFilter)=>{
    setFilter(id);setLimit(30);
    if(id!=='verb')setVerbFilter('all-verbs');
    track('vocabulary_filter',{lesson_number:data.lesson,filter_name:id,count:counts[id]||0});
  };
  const setVerbMode=(id:VerbFilter)=>{
    setVerbFilter(id);setLimit(30);
    track('verb_group_filter',{lesson_number:data.lesson,filter_name:id,count:id==='all-verbs'?(counts.verb||0):(counts[id]||0)});
  };

  return <div className="space-y-5 pb-8 vocabulary-view-v48 vocabulary-view-v54">
    <section className="study-header tone-vocab">
      <div>
        <div className="section-kicker">Vocabulary · Lesson {String(data.lesson).padStart(2,'0')}</div>
        <h1>{data.title}</h1>
        <p className={language==='bn'?'font-bn':''}>{text('প্রথমে শব্দ, অর্থ, উচ্চারণ ও example—cleanভাবে শিখুন। Verb-এর চারটি core form দরকার হলে Verb mode থেকে Forms Lab খুলুন।','Learn each word with its meaning, pronunciation and example. Open Forms Lab from Verb mode for the four core conjugations.')}</p>
      </div>
      <div className="header-progress"><b>{done}/{data.vocabulary.length}</b><span className={language==='bn'?'font-bn':''}>{text('আয়ত্ত','Mastered')}</span><div><i style={{width:`${pct}%`}}/></div></div>
    </section>

    <section className="word-class-guide word-class-guide-v54" aria-label={text('শব্দভান্ডার বিভাগ','Vocabulary categories')}>
      <button className={`word-guide-card verb ${filter==='verb'?'active':''}`} onClick={()=>setPrimary('verb')}>
        <span className="guide-icon"><Layers3/></span><div><b>動詞</b><strong>Verb</strong><small>{text('চারটি core form দেখুন','View four core forms')}</small></div><em>{counts.verb||0}</em>
      </button>
      <button className={`word-guide-card i-adj ${filter==='i-adjective'?'active':''}`} onClick={()=>setPrimary('i-adjective')}>
        <span className="guide-icon">い</span><div><b>い形容詞</b><strong>い-adjective</strong><small>{text('শুধু এই lesson-এর い-adjective','Only this lesson’s い-adjectives')}</small></div><em>{counts['i-adjective']||0}</em>
      </button>
      <button className={`word-guide-card na-adj ${filter==='na-adjective'?'active':''}`} onClick={()=>setPrimary('na-adjective')}>
        <span className="guide-icon">な</span><div><b>な形容詞</b><strong>な-adjective</strong><small>{text('শুধু এই lesson-এর な-adjective','Only this lesson’s な-adjectives')}</small></div><em>{counts['na-adjective']||0}</em>
      </button>
    </section>

    {filter==='verb'&&<section className="verb-mode-bar">
      <div className="verb-mode-copy"><span>VERB MODE</span><b>{text('Group বেছে নিন → প্রয়োজনীয় Verb-এর ます・た・ない・Dictionary form খুলুন','Choose a group, then open the ます・た・ない・Dictionary forms for any verb.')}</b></div>
      <div className="verb-mode-tabs">
        {VERB_FILTERS.map(([id,label])=><button key={id} className={verbFilter===id?'active':''} onClick={()=>setVerbMode(id)}>
          {id==='all-verbs'?text('সব Verb','All verbs'):id==='exceptions'?text('ব্যতিক্রম','Exceptions'):label}<small>{id==='all-verbs'?(counts.verb||0):(counts[id]||0)}</small>
        </button>)}
      </div>
    </section>}

    <div className="toolbar-panel vocab-toolbar-v54">
      <label className="search-field"><Search size={20}/><input value={query} onChange={e=>{setQuery(e.target.value);setLimit(30)}} placeholder="Japanese / Kanji / বাংলা / English…" aria-label={text('শব্দভান্ডার খুঁজুন','Search vocabulary')}/></label>
      <button className={`premium-btn ${hideMeaning?'premium-btn-primary':'premium-btn-secondary'}`} onClick={()=>setHideMeaning(x=>!x)}>{hideMeaning?text('অর্থ দেখান','Reveal meanings'):text('অর্থ লুকান','Hide meanings')}</button>
      <div className="word-filter-row">
        {PRIMARY_FILTERS.map(([id,label])=><button key={id} className={filter===id?'active':''} onClick={()=>setPrimary(id)}>
          {id==='all'?text('সব','All'):label}{id!=='all'&&<small>{counts[id]||0}</small>}
        </button>)}
      </div>
    </div>

    <div className="grid gap-3 lg:grid-cols-2">
      {filtered.slice(0,limit).map((v,i)=><VocabCard
        key={v.id} v={v} mastered={!!progress[String(v.id)]} hideMeaning={hideMeaning}
        onToggle={onToggle} index={i} verbMode={filter==='verb'} onOpenForms={setFormsWord}
      />)}
    </div>

    {limit<filtered.length&&<button className="premium-btn premium-btn-secondary mx-auto flex" onClick={()=>setLimit(x=>x+30)}>{text(`আরও ${Math.min(30,filtered.length-limit)}টি দেখান`,`Show ${Math.min(30,filtered.length-limit)} more`)}</button>}
    {!filtered.length&&<div className="empty-state vocab-empty-v54"><Sparkles/><b>{text('এই Lesson-এ এই category নেই','This category is empty in this lesson')}</b><p className={language==='bn'?'font-bn':''}>{text('বর্তমান lesson-এর source vocabulary-তে এই type নেই। অন্য category বা lesson বেছে নিন।','The source vocabulary for this lesson has no items of this type. Choose another category or lesson.')}</p><button className="premium-btn premium-btn-primary" onClick={()=>setPrimary('all')}>{text('সব শব্দ দেখুন','Show all words')}</button></div>}

    {formsWord&&<VerbFormsLab v={formsWord} onClose={()=>setFormsWord(null)}/>}
  </div>
}

function VocabCard({v,mastered,hideMeaning,onToggle,index,verbMode,onOpenForms}:{v:VocabItem;mastered:boolean;hideMeaning:boolean;onToggle:(id:number)=>void;index:number;verbMode:boolean;onOpenForms:(v:VocabItem)=>void}){
  const {language,text}=useLanguage();
  const jp=v.kanji||v.japanese;
  const ex=v.example?.jp||v.example?.japanese||'';
  const meta=learningMeta(v);
  return <motion.article initial={{opacity:0,y:7}} animate={{opacity:1,y:0}} transition={{delay:Math.min(index,10)*.015}} className={`vocab-premium-card vocab-clean-card ${mastered?'is-mastered':''}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="word-number">#{v.id}</span>
          <span className={`word-type word-type-${meta.tone}`}><b className="font-jp">{meta.jaLabel}</b>{meta.label}</span>
          {verbMode&&meta.group&&<span className={`clean-group-chip ${meta.groupId||''}`}>{meta.group?.replace(/ ·.*/,'')}</span>}
        </div>
        <h2 className="font-jp" lang="ja">{jp}</h2>
        {v.kanji&&v.kanji!==v.japanese&&<div className="kana-reading font-jp" lang="ja">{v.japanese}</div>}
      </div>
      <button className="icon-btn" aria-label={text(`${v.japanese} শুনুন`,`Play ${v.japanese}`)} onClick={()=>playText(v.tts_text||v.japanese,1,'word',{}, {lesson_number:v.lesson,word_id:v.id})}><Volume2 size={21}/></button>
    </div>

    <div className={`meaning-stack ${hideMeaning?'meaning-hidden':''}`}>
      {language==='bn'?<><b className="font-bn">{v.bangla_meaning}</b><span>{v.english_meaning}</span></>:<><b>{v.english_meaning}</b><span className="font-bn">{v.bangla_meaning}</span></>}<small className="font-bn">{text('উচ্চারণ','Bangla pronunciation')}: {v.pronunciation_bn}</small>
    </div>

    {ex&&<div className="example-block"><div className="flex items-start justify-between gap-3"><p className="font-jp" lang="ja">{ex}</p><button className="mini-audio" aria-label={text(`${v.kanji||v.japanese} শব্দের উদাহরণ শুনুন`,`Play the example for ${v.kanji||v.japanese}`)} title={text('উদাহরণের জাপানি অডিও শুনুন','Play the Japanese example audio')} onClick={()=>playText(ex,1,'sentence',{}, {lesson_number:v.lesson,word_id:v.id})}><Headphones size={18}/></button></div><span className={`font-bn ${hideMeaning?'blur-sm select-none':''}`}>{v.example?.bn}</span></div>}

    <div className={`vocab-card-footer ${verbMode&&meta.kind==='verb'?'has-forms':''}`}>
      <button className={`mastery-button ${mastered?'done':''}`} onClick={()=>{onToggle(v.id);track('vocabulary_mastered',{lesson_number:v.lesson,word_id:v.id,mastered:!mastered})}}><Check size={18}/>{mastered?text('আয়ত্ত','Mastered'):text('আয়ত্ত হিসেবে চিহ্নিত করুন','Mark mastered')}</button>
      {verbMode&&meta.kind==='verb'&&<button className="open-forms-button" onClick={()=>{onOpenForms(v);track('verb_forms_open',{lesson_number:v.lesson,word_id:v.id,verb_group:meta.groupId})}}><BookOpenCheck/> Forms <ChevronRight/></button>}
    </div>
  </motion.article>
}

function VerbFormsLab({v,onClose}:{v:VocabItem;onClose:()=>void}){
  const {language,text}=useLanguage();
  const meta=learningMeta(v);
  const forms=verbForms(v);
  if(!forms)return null;

  const play=(text:string,label:string)=>playText(text,1,'verb_form',{}, {lesson_number:v.lesson,word_id:v.id,form_name:label,verb_group:meta.groupId});

  const families=[
    {id:'masu',eyebrow:'01 · ます FORM',title:'ます Form',note:'丁寧形',cls:'family-masu',cells:[['ます-form',forms.masu,'Polite form']]},
    {id:'ta',eyebrow:'02 · た FORM',title:'た Form',note:'過去形',cls:'family-ta',cells:[['た-form',forms.ta,'Plain past form']]},
    {id:'nai',eyebrow:'03 · ない FORM',title:'ない Form',note:'否定形',cls:'family-nai',cells:[['ない-form',forms.nai,'Plain negative form']]},
    {id:'dictionary',eyebrow:'04 · DICTIONARY FORM',title:'Dictionary Form',note:'辞書形',cls:'family-dictionary',cells:[['Dictionary',forms.dictionary,'Plain base form']]},
  ] as const;

  return <div className="verb-lab-layer" role="dialog" aria-modal="true" aria-labelledby="verb-lab-title">
    <button className="future-layer-backdrop" onClick={onClose} aria-label={text('Verb Forms Lab বন্ধ করুন','Close Verb Forms Lab')}/>
    <section className="verb-lab-dialog">
      <header className="verb-lab-head">
        <div><span>VERB FORMS LAB · {meta.groupJa}</span><h2 id="verb-lab-title" className="font-jp">{v.kanji||v.japanese}</h2><p className={language==='bn'?'font-bn':''}>{language==='bn'?v.bangla_meaning:v.english_meaning}</p></div>
        <button onClick={onClose} aria-label={text('বন্ধ করুন','Close')}><X/></button>
      </header>

      <div className="verb-lab-group"><span>{meta.group}</span><b className="font-jp">{meta.groupJa}</b></div>

      <div className="verb-family-stack">
        {families.map(f=><section className={`verb-family-box ${f.cls}`} key={f.id}>
          <header><div><span>{f.eyebrow}</span><b className="font-bn">{f.title}</b></div><span className="font-jp">{f.note}</span></header>
          <div className="verb-family-grid">
            {f.cells.map(([label,value,note])=><FormCell key={`${f.id}-${label}`} label={label} value={value} note={note} onPlay={()=>play(value,label)}/>) }
          </div>
        </section>)}
      </div>

      {meta.irregular&&<section className="verb-exception-panel">
        <AlertTriangle/><div><span>{text('কেন ব্যতিক্রম?','Why is it irregular?')}</span><b className="font-bn">{meta.irregularTitle}</b><p className="font-bn">{meta.irregularNote}</p></div>
      </section>}

      <footer className={`verb-lab-footer ${language==='bn'?'font-bn':''}`}>{text('Core conjugation: ます・た・ない・Dictionary — শুধু এই চারটি form রাখা হয়েছে।','Core conjugation: ます・た・ない・Dictionary — this lab focuses on these four forms.')}</footer>
    </section>
  </div>
}

function FormCell({label,value,note,onPlay}:{label:string;value:string;note:string;onPlay:()=>void}){
  return <article className="verb-form-cell">
    <div><span>{label}</span><b className="font-jp" lang="ja">{value}</b><small>{note}</small></div>
    <button onClick={onPlay} aria-label={`Play ${value}`}><Volume2/></button>
  </article>
}
