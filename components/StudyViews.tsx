'use client';

import { useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { BookOpenText, MessageCircle, Volume2, Eye, EyeOff, UserRound, Play, Pause, Sparkles } from 'lucide-react';
import type { LessonPayload } from '@/lib/types';
import { playText, playDialogueTrack, stopAudio, type AudioVoiceRole } from '@/lib/audio';
import { track } from '@/lib/analytics';
import { useLanguage } from '@/lib/language';

const GrammarStudio=dynamic(()=>import('./GrammarStudio'),{
  ssr:false,
  loading:()=> <div className="nv58-view-loading">Loading Visual Grammar…</div>
});

const RATES=[.75,.9,1] as const;

export function Conversation({data}:{data:LessonPayload}){
  const {language,text}=useLanguage();
  const rows=useMemo(()=>data.content.dialogue_extended||data.content.dialogue||[],[data.content.dialogue_extended,data.content.dialogue]);
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
  const [rate,setRate]=useState<(typeof RATES)[number]>(1);
  const playRun=useRef(0);

  const selectRate=(next:(typeof RATES)[number])=>{
    playRun.current+=1;
    stopAudio();
    setPlayingAll(false);
    setActiveLine(null);
    setRate(next);
    track('audio_playback_rate_change',{lesson_number:data.lesson,playback_rate:next,screen:'conversation'});
  };

  const playLine=async(text:string,index:number,speaker:string,roleplay=false)=>{
    const voice=voiceMap[speaker]||'default';
    setActiveLine(index);
    return await playText(text,rate,'conversation',{
      onEnd:()=>setActiveLine(x=>x===index?null:x)
    },{lesson_number:data.lesson,segment_number:index+1,speaker,voice_role:voice,roleplay},voice);
  };

  const playFull=async()=>{
    if(playingAll){
      playRun.current+=1;
      stopAudio();
      setPlayingAll(false);
      setActiveLine(null);
      return;
    }

    const run=++playRun.current;
    const sequence=rows.filter(r=>r?.[1]).map(r=>({
      text:r[1],
      speaker:r[0],
      voiceRole:voiceMap[r[0]]||'default'
    }));
    setPlayingAll(true);
    setActiveLine(null);
    track('conversation_full_play',{
      lesson_number:data.lesson,
      segments:sequence.length,
      dual_voice:true,
      voice_engine:'web-speech-api-ja-JP',
      billed_api:false,
      playback_rate:rate
    });

    try{
      await playDialogueTrack(sequence,rate,{
        onEnd:()=>{if(run===playRun.current)setPlayingAll(false)}
      },{lesson_number:data.lesson,segments:sequence.length});
    }finally{
      if(run===playRun.current)setPlayingAll(false);
    }
  };

  return <div className="space-y-5 conversation-view-v57">
    <section className="study-header tone-conversation">
      <div>
        <div className="section-kicker">FREE JAPANESE DEVICE VOICES · LESSON {String(data.lesson).padStart(2,'0')}</div>
        <h1>Listen like a real conversation</h1>
        <p className={language==='bn'?'font-bn':''}>{text('আপনার browser বা Windows-এর Japanese voice দিয়ে A/B role আলাদা স্বরে চলে। কোনো paid API বা key লাগে না।','A/B roles use distinct Japanese voices available in your browser or operating system. No paid API or key is required.')}</p>
      </div>
      <MessageCircle className="header-big-icon"/>
    </section>

    <section className="conversation-control-v57">
      <div className="conversation-personas-v57">
        {speakers.slice(0,2).map((s,i)=><div className={`persona-card-v57 ${i===0?'male':'female'}`} key={s}>
          <span className="persona-avatar-v57">{i===0?'A':'B'}</span>
          <div>
            <small>{i===0?'JAPANESE VOICE · A':'JAPANESE VOICE · B'}</small>
            <b>Speaker {s}</b>
            <span>Browser/OS Japanese voice · free</span>
          </div>
        </div>)}
      </div>

      <div>
        <button className="conversation-master-play-v57" onClick={playFull}>
          {playingAll?<Pause fill="currentColor"/>:<Play fill="currentColor"/>}
          <span><small>FULL DIALOGUE</small><b>{playingAll?'Stop A ↔ B':'Play A ↔ B'}</b></span>
        </button>
        <div className="conversation-rate-v7" aria-label="Playback speed">
          {RATES.map(x=><button key={x} className={rate===x?'active':''} onClick={()=>selectRate(x)}>{x}×</button>)}
        </div>
      </div>
    </section>

    <div className="conversation-role-tabs-v57">
      <button className={role==='all'?'active':''} onClick={()=>{setRole('all');setRevealed({})}}>Full dialogue</button>
      {speakers.map((s,i)=><button key={s} className={role===s?'active':''} onClick={()=>{
        playRun.current+=1;stopAudio();setPlayingAll(false);setActiveLine(null);
        setRole(s);setRevealed({});
        track('conversation_roleplay',{lesson_number:data.lesson,speaker:s,voice_role:voiceMap[s]})
      }}>
        <UserRound/> Shadow {s}<small>{i%2===0?'A · Male':'B · Female'}</small>
      </button>)}
    </div>

    <article className="conversation-stage-v57">
      {rows.map((r,i)=>{
        const mine=role!=='all'&&role===r[0];
        const show=!mine||revealed[i];
        const voice=voiceMap[r[0]]||'default';
        const side=voice==='male'?'male':'female';
        const isPlaying=activeLine===i;
        return <div key={i} className={`conversation-turn-v57 ${side} ${mine?'roleplay-turn':''} ${isPlaying?'is-playing':''}`}>
          <div className="turn-identity-v57"><span>{side==='male'?'A':'B'}</span><small>{side==='male'?'MALE':'FEMALE'}</small></div>
          <div className="turn-card-v57">
            <header>
              <div><small>SPEAKER {r[0]}</small><b>{side==='male'?'Voice A':'Voice B'}</b></div>
              <button onClick={()=>{
                playRun.current+=1;setPlayingAll(false);
                playLine(r[1],i,r[0],role!=='all')
              }} aria-label={`Play speaker ${r[0]}`}><Volume2/></button>
            </header>
            {show
              ?<p className="font-jp" lang="ja">{r[1]}</p>
              :<button className={`conversation-reveal-v57 ${language==='bn'?'font-bn':''}`} onClick={()=>setRevealed(x=>({...x,[i]:true}))}><Sparkles/> {text('আগে নিজে বলুন · তারপর Reveal','Say it yourself, then reveal')}</button>}
            <span className="font-bn turn-meaning-v57">{r[2]}</span>
            {isPlaying&&<div className="turn-playing-line-v57"><i/><span>VOICE PLAYING · {rate}×</span></div>}
          </div>
        </div>
      })}
    </article>
  </div>
}

export function Reading({data}:{data:LessonPayload}){
  const {language,text:label}=useLanguage();
  const [showBn,setShowBn]=useState(true);
  const text=data.content.reading_extended||data.content.reading||'';
  const bn=data.content.reading_extended_bn||data.content.reading_bn||'';
  const paras=text.split(/(?<=[。！？])/).map(s=>s.trim()).filter(Boolean);
  const words=useMemo(()=>data.vocabulary.filter(v=>{
    const jp=v.kanji||v.japanese;
    return jp&&jp.length>1&&text.includes(jp);
  }).slice(0,18),[data.vocabulary,text]);

  return <div className="space-y-5 reading-view-v57">
    <section className="study-header tone-reading">
      <div>
        <div className="section-kicker">FOCUSED READING · LESSON {String(data.lesson).padStart(2,'0')}</div>
        <h1>Read without visual noise</h1>
        <p className={language==='bn'?'font-bn':''}>{label('Japanese passage আগে পড়ুন। দরকার হলে বাংলা অর্থ ও passage vocabulary খুলুন।','Read the Japanese passage first. Reveal the Bangla translation and passage vocabulary when needed.')}</p>
      </div>
      <BookOpenText className="header-big-icon"/>
    </section>
    <div className="reading-toolbar-v57">
      <button onClick={()=>playText(text,1,'reading',{}, {lesson_number:data.lesson,reading_mode:'full'})}><Volume2/> Natural full passage</button>
      <button onClick={()=>setShowBn(x=>!x)}>{showBn?<EyeOff/>:<Eye/>} {showBn?label('বাংলা লুকান','Hide Bangla'):label('বাংলা দেখান','Show Bangla')}</button>
    </div>
    <article className="reading-paper reading-paper-v57">
      <div className="paper-mark">読</div>
      {paras.map((p,i)=><p className="font-jp" lang="ja" key={i}>{p}</p>)}
      {showBn&&<div className="reading-translation font-bn"><b>{label('বাংলা অর্থ','Bangla translation')}</b><p>{bn}</p></div>}
    </article>
    {words.length>0&&<section className="reading-vocab-panel-v57">
      <div><span className="section-kicker">PASSAGE VOCABULARY</span><h2>{label('গুরুত্বপূর্ণ শব্দ','Key words')}</h2></div>
      <div className="reading-vocab-grid-v57">
        {words.map(v=><button key={v.id} onClick={()=>playText(v.tts_text||v.japanese,1,'reading_word',{}, {lesson_number:data.lesson,word_id:v.id})}>
          <div><b className="font-jp" lang="ja">{v.kanji||v.japanese}</b><span className={language==='bn'?'font-bn':''}>{language==='bn'?v.bangla_meaning:v.english_meaning}</span></div><Volume2/>
        </button>)}
      </div>
    </section>}
  </div>
}

export function Grammar({data}:{data:LessonPayload}){
  return <GrammarStudio data={data}/>;
}
