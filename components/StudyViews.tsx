'use client';

import { useMemo, useRef, useState } from 'react';
import { BookOpenText, MessageCircle, Volume2, Eye, EyeOff, UserRound, Play, Loader2 } from 'lucide-react';
import type { LessonPayload } from '@/lib/types';
import { playText, stopAudio, type AudioVoiceRole } from '@/lib/audio';
import { track } from '@/lib/analytics';
import GrammarStudio from './GrammarStudio';

export function Conversation({data}:{data:LessonPayload}){
  const rows=data.content.dialogue_extended||data.content.dialogue||[];
  const speakers=useMemo(()=>Array.from(new Set(rows.map(r=>r[0]).filter(Boolean))).slice(0,4),[rows]);
  const voiceMap=useMemo(()=>{
    const map:Record<string,AudioVoiceRole>={};
    speakers.forEach((s,i)=>{map[s]=i%2===0?'male':'female'});
    return map;
  },[speakers]);
  const [role,setRole]=useState<string>('all');
  const [revealed,setRevealed]=useState<Record<number,boolean>>({});
  const [playingAll,setPlayingAll]=useState(false);
  const playRun=useRef(0);

  const playLine=async(text:string,index:number,speaker:string,roleplay=false)=>{
    const voice=voiceMap[speaker]||'default';
    await playText(text,1,'conversation',{}, {lesson_number:data.lesson,segment_number:index+1,speaker,voice_role:voice,roleplay},voice);
  };
  const playFull=async()=>{
    if(playingAll){playRun.current+=1;stopAudio();setPlayingAll(false);return}
    const run=++playRun.current;
    setPlayingAll(true);
    track('conversation_full_play',{lesson_number:data.lesson,segments:rows.length,dual_voice:true});
    try{
      for(let i=0;i<rows.length;i++){
        if(run!==playRun.current)break;
        if(!rows[i]?.[1])continue;
        await playLine(rows[i][1],i,rows[i][0],false);
      }
    } finally {if(run===playRun.current)setPlayingAll(false)}
  };

  return <div className="space-y-5 conversation-view-v56">
    <section className="study-header tone-conversation"><div><div className="section-kicker">Two-Voice Conversation · Lesson {String(data.lesson).padStart(2,'0')}</div><h1>Speak in context</h1><p className="font-bn">A/B dialogue-এ দুইটি আলাদা Japanese voice ব্যবহার হবে—একটি male, একটি female। শুনুন, pause করুন, তারপর নিজের role shadow করুন।</p></div><MessageCircle className="header-big-icon"/></section>
    <div className="toolbar-panel conversation-rolebar">
      <button className={`premium-btn ${role==='all'?'premium-btn-primary':'premium-btn-secondary'}`} onClick={()=>setRole('all')}>Full dialogue</button>
      {speakers.map((s,i)=><button key={s} className={`premium-btn ${role===s?'premium-btn-primary':'premium-btn-secondary'}`} onClick={()=>{setRole(s);setRevealed({});track('conversation_roleplay',{lesson_number:data.lesson,speaker:s,voice_role:voiceMap[s]})}}><UserRound size={15}/> Shadow {s} · {i%2===0?'Male':'Female'}</button>)}
      <button className="premium-btn premium-btn-secondary conversation-play-all" onClick={playFull}>{playingAll?<Loader2 className="animate-spin" size={16}/>:<Play size={16}/>} {playingAll?'Playing A ↔ B…':'Play full A ↔ B'}</button>
    </div>
    <article className="premium-panel conversation-stage">{rows.map((r,i)=>{
      const mine=role!=='all'&&role===r[0]; const show=!mine||revealed[i]; const voice=voiceMap[r[0]]||'default';
      return <div key={i} className={`dialogue-row ${i%2?'right':''} ${mine?'roleplay-turn':''} voice-${voice}`}>
        <div className="speaker">{r[0]}</div>
        <div className="dialogue-bubble">
          <div className="dialogue-voice-label"><UserRound size={12}/>{voice==='male'?'MALE JAPANESE VOICE':'FEMALE JAPANESE VOICE'}</div>
          <div className="flex items-start justify-between gap-3">
            {show?<p className="font-jp" lang="ja">{r[1]}</p>:<button className="roleplay-reveal font-bn" onClick={()=>setRevealed(x=>({...x,[i]:true}))}>আপনার line — আগে নিজে বলুন, তারপর Reveal করুন</button>}
            <button className="mini-audio" onClick={()=>{playRun.current+=1;setPlayingAll(false);playLine(r[1],i,r[0],role!=='all')}} aria-label={`Play speaker ${r[0]} with ${voice} voice`}><Volume2 size={16}/></button>
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
  return <GrammarStudio data={data}/>;
}
