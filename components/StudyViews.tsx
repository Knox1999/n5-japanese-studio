'use client';

import { useMemo, useState } from 'react';
import { BookOpenText, Languages, MessageCircle, Volume2, Eye, EyeOff, UserRound, Sparkles } from 'lucide-react';
import type { LessonPayload } from '@/lib/types';
import { playText } from '@/lib/audio';
import { track } from '@/lib/analytics';

export function Conversation({data}:{data:LessonPayload}){
  const rows=data.content.dialogue_extended||data.content.dialogue||[];
  const speakers=useMemo(()=>Array.from(new Set(rows.map(r=>r[0]).filter(Boolean))).slice(0,4),[rows]);
  const [role,setRole]=useState<string>('all');
  const [revealed,setRevealed]=useState<Record<number,boolean>>({});
  return <div className="space-y-5">
    <section className="study-header tone-conversation"><div><div className="section-kicker">Natural Conversation · Lesson {String(data.lesson).padStart(2,'0')}</div><h1>Speak in context</h1><p className="font-bn">প্রতিটি line শুনুন, pause করুন, তারপর role-play mode-এ নিজের অংশ নিজে বলুন।</p></div><MessageCircle className="header-big-icon"/></section>
    <div className="toolbar-panel conversation-rolebar">
      <button className={`premium-btn ${role==='all'?'premium-btn-primary':'premium-btn-secondary'}`} onClick={()=>setRole('all')}>Full dialogue</button>
      {speakers.map(s=><button key={s} className={`premium-btn ${role===s?'premium-btn-primary':'premium-btn-secondary'}`} onClick={()=>{setRole(s);setRevealed({});track('conversation_roleplay',{lesson_number:data.lesson,speaker:s})}}><UserRound size={15}/> Shadow {s}</button>)}
    </div>
    <article className="premium-panel conversation-stage">{rows.map((r,i)=>{
      const mine=role!=='all'&&role===r[0]; const show=!mine||revealed[i];
      return <div key={i} className={`dialogue-row ${i%2?'right':''} ${mine?'roleplay-turn':''}`}>
        <div className="speaker">{r[0]}</div>
        <div className="dialogue-bubble">
          <div className="flex items-start justify-between gap-3">
            {show?<p className="font-jp" lang="ja">{r[1]}</p>:<button className="roleplay-reveal font-bn" onClick={()=>setRevealed(x=>({...x,[i]:true}))}>আপনার line — আগে নিজে বলুন, তারপর Reveal করুন</button>}
            <button className="mini-audio" onClick={()=>playText(r[1],1,'conversation',{}, {lesson_number:data.lesson,segment_number:i+1,speaker:r[0],roleplay:role!=='all'})} aria-label={`Play speaker ${r[0]}`}><Volume2 size={16}/></button>
          </div>
          <span className="font-bn">{r[2]}</span>
        </div>
      </div>
    })}</article>
  </div>
}

export function Reading({data}:{data:LessonPayload}){
  const [showBn,setShowBn]=useState(true);const text=data.content.reading_extended||data.content.reading||'';const bn=data.content.reading_extended_bn||data.content.reading_bn||'';const paras=text.split(/(?<=[。！？])/).map(s=>s.trim()).filter(Boolean);
  const words=useMemo(()=>data.vocabulary.filter(v=>{const jp=v.kanji||v.japanese;return jp&&jp.length>1&&text.includes(jp)}).slice(0,18),[data.vocabulary,text]);
  return <div className="space-y-5">
    <section className="study-header tone-reading"><div><div className="section-kicker">Long-form Reading</div><h1>Read with breathing space</h1><p className="font-bn">Japanese passage আগে পড়ুন; প্রয়োজন হলে বাংলা সহায়তা এবং passage vocabulary খুলুন।</p></div><BookOpenText className="header-big-icon"/></section>
    <div className="toolbar-panel"><button className="premium-btn premium-btn-primary" onClick={()=>playText(text,1,'reading',{}, {lesson_number:data.lesson,reading_mode:'full'})}><Volume2 size={16}/> Full passage</button><button className="premium-btn premium-btn-secondary" onClick={()=>setShowBn(x=>!x)}>{showBn?<EyeOff size={16}/>:<Eye size={16}/>} {showBn?'Hide Bangla':'Show Bangla'}</button></div>
    <article className="reading-paper"><div className="paper-mark">読</div>{paras.map((p,i)=><p className="font-jp" lang="ja" key={i}>{p}</p>)}{showBn&&<div className="reading-translation font-bn"><b>বাংলা অর্থ</b><p>{bn}</p></div>}</article>
    {words.length>0&&<section className="premium-panel reading-vocab-panel"><div><span className="section-kicker">PASSAGE VOCABULARY</span><h2 className="section-title">Reading-এ থাকা গুরুত্বপূর্ণ শব্দ</h2></div><div className="reading-vocab-grid">{words.map(v=><button key={v.id} onClick={()=>playText(v.tts_text||v.japanese,1,'reading_word',{}, {lesson_number:data.lesson,word_id:v.id})}><b className="font-jp" lang="ja">{v.kanji||v.japanese}</b><span className="font-bn">{v.bangla_meaning}</span><Volume2 size={14}/></button>)}</div></section>}
  </div>
}

export function Grammar({data}:{data:LessonPayload}){
  const rows=data.content.grammar||[];
  return <div className="space-y-5"><section className="study-header tone-grammar"><div><div className="section-kicker">Grammar Patterns</div><h1>Pattern → Meaning → Natural Example</h1><p className="font-bn">Source lesson-এ থাকা grammar-কে pattern, অর্থ এবং example হিসেবে পরিষ্কার hierarchy-তে সাজানো হয়েছে।</p></div><Languages className="header-big-icon"/></section><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.map((g,i)=><article key={i} className="grammar-premium-card"><span>{String(i+1).padStart(2,'0')}</span><small className="grammar-label">PATTERN</small><h2 className="font-jp" lang="ja">{g[0]}</h2><small className="grammar-label">MEANING</small><p className="font-bn">{g[1]}</p><div className="grammar-example"><div><small className="grammar-label">EXAMPLE</small><b className="font-jp" lang="ja">{g[2]}</b></div><button className="mini-audio" onClick={()=>playText(g[2],1,'grammar',{}, {lesson_number:data.lesson,grammar_index:i+1})}><Volume2 size={16}/></button></div></article>)}</div>{!rows.length&&<div className="empty-state"><Sparkles/><b>No grammar records in this lesson source</b></div>}</div>
}
