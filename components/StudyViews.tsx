'use client';

import { useMemo, useRef, useState } from 'react';
import { BookOpenText, MessageCircle, Volume2, Eye, EyeOff, UserRound, Play, Pause, Sparkles } from 'lucide-react';
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
  const [activeLine,setActiveLine]=useState<number|null>(null);
  const playRun=useRef(0);

  const playLine=async(text:string,index:number,speaker:string,roleplay=false)=>{
    const voice=voiceMap[speaker]||'default';
    setActiveLine(index);
    return await playText(text,1,'conversation',{
      onEnd:()=>setActiveLine(x=>x===index?null:x)
    },{lesson_number:data.lesson,segment_number:index+1,speaker,voice_role:voice,roleplay},voice);
  };
  const playFull=async()=>{
    if(playingAll){playRun.current+=1;stopAudio();setPlayingAll(false);setActiveLine(null);return}
    const run=++playRun.current;
    setPlayingAll(true);
    track('conversation_full_play',{lesson_number:data.lesson,segments:rows.length,dual_voice:true,voice_engine:'v57'});
    try{
      for(let i=0;i<rows.length;i++){
        if(run!==playRun.current)break;
        if(!rows[i]?.[1])continue;
        const result=await playLine(rows[i][1],i,rows[i][0],false);
        if(result!=='ended')break;
      }
    } finally {
      if(run===playRun.current){setPlayingAll(false);setActiveLine(null)}
    }
  };

  return <div className="space-y-5 conversation-view-v57">
    <section className="study-header tone-conversation">
      <div><div className="section-kicker">NATURAL TWO-VOICE DIALOGUE · LESSON {String(data.lesson).padStart(2,'0')}</div><h1>Listen like a real conversation</h1><p className="font-bn">দুইটি আলাদা natural Japanese persona—A male, B female। প্রথমে শুনুন, তারপর নিজের role লুকিয়ে shadow করুন।</p></div>
      <MessageCircle className="header-big-icon"/>
    </section>

    <section className="conversation-control-v57">
      <div className="conversation-personas-v57">
        {speakers.slice(0,2).map((s,i)=><div className={`persona-card-v57 ${i===0?'male':'female'}`} key={s}>
          <span className="persona-avatar-v57">{i===0?'A':'B'}</span>
          <div><small>{i===0?'YOUNG ADULT MALE':'YOUNG ADULT FEMALE'}</small><b>Speaker {s}</b><span>Natural Japanese voice</span></div>
        </div>)}
      </div>
      <button className="conversation-master-play-v57" onClick={playFull}>
        {playingAll?<Pause fill="currentColor"/>:<Play fill="currentColor"/>}
        <span><small>FULL DIALOGUE</small><b>{playingAll?'Stop A ↔ B':'Play A ↔ B'}</b></span>
      </button>
    </section>

    <div className="conversation-role-tabs-v57">
      <button className={role==='all'?'active':''} onClick={()=>{setRole('all');setRevealed({})}}>Full dialogue</button>
      {speakers.map((s,i)=><button key={s} className={role===s?'active':''} onClick={()=>{setRole(s);setRevealed({});track('conversation_roleplay',{lesson_number:data.lesson,speaker:s,voice_role:voiceMap[s]})}}>
        <UserRound/> Shadow {s}<small>{i%2===0?'A · Male':'B · Female'}</small>
      </button>)}
    </div>

    <article className="conversation-stage-v57">{rows.map((r,i)=>{
      const mine=role!=='all'&&role===r[0];
      const show=!mine||revealed[i];
      const voice=voiceMap[r[0]]||'default';
      const side=voice==='male'?'male':'female';
      const isPlaying=activeLine===i;
      return <div key={i} className={`conversation-turn-v57 ${side} ${mine?'roleplay-turn':''} ${isPlaying?'is-playing':''}`}>
        <div className="turn-identity-v57"><span>{side==='male'?'A':'B'}</span><small>{side==='male'?'MALE':'FEMALE'}</small></div>
        <div className="turn-card-v57">
          <header><div><small>SPEAKER {r[0]}</small><b>{side==='male'?'Voice A':'Voice B'}</b></div><button onClick={()=>{playRun.current+=1;setPlayingAll(false);playLine(r[1],i,r[0],role!=='all')}} aria-label={`Play speaker ${r[0]}`}><Volume2/></button></header>
          {show?<p className="font-jp" lang="ja">{r[1]}</p>:<button className="conversation-reveal-v57 font-bn" onClick={()=>setRevealed(x=>({...x,[i]:true}))}><Sparkles/> আগে নিজে বলুন · তারপর Reveal</button>}
          <span className="font-bn turn-meaning-v57">{r[2]}</span>
          {isPlaying&&<div className="turn-playing-line-v57"><i/><span>VOICE PLAYING</span></div>}
        </div>
      </div>
    })}</article>
  </div>
}

export function Reading({data}:{data:LessonPayload}){
  const [showBn,setShowBn]=useState(true);
  const text=data.content.reading_extended||data.content.reading||'';
  const bn=data.content.reading_extended_bn||data.content.reading_bn||'';
  const paras=text.split(/(?<=[。！？])/).map(s=>s.trim()).filter(Boolean);
  const words=useMemo(()=>data.vocabulary.filter(v=>{const jp=v.kanji||v.japanese;return jp&&jp.length>1&&text.includes(jp)}).slice(0,18),[data.vocabulary,text]);
  return <div className="space-y-5 reading-view-v57">
    <section className="study-header tone-reading"><div><div className="section-kicker">FOCUSED READING · LESSON {String(data.lesson).padStart(2,'0')}</div><h1>Read without visual noise</h1><p className="font-bn">Japanese passage আগে পড়ুন। দরকার হলে বাংলা অর্থ ও passage vocabulary খুলুন—সবকিছু একই clean reading surface-এ।</p></div><BookOpenText className="header-big-icon"/></section>
    <div className="reading-toolbar-v57"><button onClick={()=>playText(text,1,'reading',{}, {lesson_number:data.lesson,reading_mode:'full'})}><Volume2/> Natural full passage</button><button onClick={()=>setShowBn(x=>!x)}>{showBn?<EyeOff/>:<Eye/>} {showBn?'বাংলা লুকান':'বাংলা দেখান'}</button></div>
    <article className="reading-paper reading-paper-v57"><div className="paper-mark">読</div>{paras.map((p,i)=><p className="font-jp" lang="ja" key={i}>{p}</p>)}{showBn&&<div className="reading-translation font-bn"><b>বাংলা অর্থ</b><p>{bn}</p></div>}</article>
    {words.length>0&&<section className="reading-vocab-panel-v57"><div><span className="section-kicker">PASSAGE VOCABULARY</span><h2>গুরুত্বপূর্ণ শব্দ</h2></div><div className="reading-vocab-grid-v57">{words.map(v=><button key={v.id} onClick={()=>playText(v.tts_text||v.japanese,1,'reading_word',{}, {lesson_number:data.lesson,word_id:v.id})}><div><b className="font-jp" lang="ja">{v.kanji||v.japanese}</b><span className="font-bn">{v.bangla_meaning}</span></div><Volume2/></button>)}</div></section>}
  </div>
}

export function Grammar({data}:{data:LessonPayload}){
  return <GrammarStudio data={data}/>;
}
