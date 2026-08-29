'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpenText, Eye, EyeOff, Headphones, Play, SkipBack, SkipForward,
  Square, Volume2, MessageCircle, Mic2, Waves, UserRound, Gauge, CheckCircle2
} from 'lucide-react';
import type { LessonPayload, VocabItem } from '@/lib/types';
import { playText, stopAudio, type AudioVoiceRole } from '@/lib/audio';
import { track } from '@/lib/analytics';

type Source='Dialogue'|'Reading'|'Shadowing';
type ListeningLine={jp:string;bn:string;source:Source;speaker?:string;voiceRole:AudioVoiceRole;hints:Array<{jp:string;bn:string}>};
type Filter='All'|Source;

function sentenceChunks(text:string){return String(text||'').split(/(?<=[。！？])/).map(s=>s.trim()).filter(Boolean)}
function banglaChunks(text:string){return String(text||'').split(/(?<=[।!?])/).map(s=>s.trim()).filter(Boolean)}
function norm(text?:string){return String(text||'').replace(/\s+/g,'').replace(/[“”‘’'"「」『』]/g,'').trim()}
function tokens(text:string){const spaced=text.trim().split(/\s+/).filter(Boolean);if(spaced.length>1)return spaced;return Array.from(text).reduce<string[]>((a,ch)=>{if(/[、。！？]/.test(ch)){if(a.length)a[a.length-1]+=ch;else a.push(ch)}else if(a.length&&a[a.length-1].length<3)a[a.length-1]+=ch;else a.push(ch);return a},[])}
function hintsFor(jp:string,vocab:VocabItem[]){const n=norm(jp);const seen=new Set<string>();return vocab.filter(v=>{const forms=[v.kanji,v.japanese].map(x=>norm(x)).filter(x=>x.length>1);return forms.some(f=>n.includes(f))}).map(v=>({jp:v.kanji||v.japanese,bn:v.bangla_meaning})).filter(x=>{const k=`${x.jp}|${x.bn}`;if(seen.has(k))return false;seen.add(k);return true}).slice(0,5)}

function buildListeningLines(data:LessonPayload):ListeningLine[]{
  const c=data.content;
  const meaning=new Map<string,string>();
  const dialogue=c.dialogue_extended||c.dialogue||[];
  const speakers:Array<string>=[];
  dialogue.forEach(r=>{if(r[0]&&!speakers.includes(r[0]))speakers.push(r[0])});
  const voiceMap:Record<string,AudioVoiceRole>={};
  speakers.forEach((s,i)=>voiceMap[s]=i%2===0?'male':'female');

  const rows:ListeningLine[]=[];
  dialogue.forEach(r=>{
    if(!r?.[1])return;
    if(r[2])meaning.set(norm(r[1]),r[2]);
    rows.push({jp:r[1],bn:r[2]||'',source:'Dialogue',speaker:r[0],voiceRole:voiceMap[r[0]]||'default',hints:hintsFor(r[1],data.vocabulary)});
  });

  const reading=c.reading_extended||c.reading||'';
  const readingBn=c.reading_extended_bn||c.reading_bn||'';
  const ja=sentenceChunks(reading),bn=banglaChunks(readingBn);
  ja.forEach((jp,i)=>{
    const b=ja.length===bn.length?(bn[i]||''):'';
    if(b)meaning.set(norm(jp),b);
    rows.push({jp,bn:b,source:'Reading',voiceRole:'default',hints:hintsFor(jp,data.vocabulary)});
  });
  (c.reading_extra_pairs||[]).forEach(pair=>{
    const [jpText,bnText]=pair;
    const jps=sentenceChunks(jpText),bns=banglaChunks(bnText);
    if(jps.length&&jps.length===bns.length){
      jps.forEach((jp,i)=>rows.push({jp,bn:bns[i],source:'Reading',voiceRole:'default',hints:hintsFor(jp,data.vocabulary)}));
    } else if(jpText){
      rows.push({jp:jpText,bn:bnText||'',source:'Reading',voiceRole:'default',hints:hintsFor(jpText,data.vocabulary)});
    }
  });

  (c.shadowing_chunks||[]).forEach(jp=>{
    let b=meaning.get(norm(jp))||'';
    if(!b){for(const [k,v] of meaning){if(k.includes(norm(jp))||norm(jp).includes(k)){b=v;break}}}
    rows.push({jp,bn:b,source:'Shadowing',voiceRole:'female',hints:hintsFor(jp,data.vocabulary)});
  });

  return rows.map(x=>({...x,bn:x.bn||'এই line-এর আলাদা বাংলা অর্থ lesson data-তে নেই। Context দেখে practice করুন।'}));
}

function Waveform({text,progress,voiceRole}:{text:string;progress:number;voiceRole:AudioVoiceRole}){
  const peaks=useMemo(()=>Array.from({length:64},(_,i)=>{
    const code=text.charCodeAt(i%Math.max(1,text.length))||31;
    const roleOffset=voiceRole==='male'?7:voiceRole==='female'?13:3;
    return .18+((code*(i+roleOffset))%67)/100;
  }),[text,voiceRole]);
  return <div className="shadow-wave-v57" aria-label="Audio waveform">{peaks.map((p,i)=><i key={i} className={i/peaks.length<=progress?'played':''} style={{height:`${Math.round(9+p*32)}px`}}/>)}</div>
}

export default function Listening({data}:{data:LessonPayload}){
  const [rate,setRate]=useState<.75|.9|1>(1);
  const [active,setActive]=useState(0);
  const [progress,setProgress]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [showMeaning,setShowMeaning]=useState(true);
  const [filter,setFilter]=useState<Filter>('All');
  const [completed,setCompleted]=useState<Record<number,boolean>>({});
  const run=useRef(0);

  const lines=useMemo(()=>buildListeningLines(data),[data]);
  const currentLine=lines[active];
  const current=currentLine?.jp||'';
  const currentTokens=tokens(current);
  const tokenIndex=Math.min(currentTokens.length-1,Math.floor(progress*Math.max(1,currentTokens.length)));
  const counts=useMemo(()=>({Dialogue:lines.filter(x=>x.source==='Dialogue').length,Reading:lines.filter(x=>x.source==='Reading').length,Shadowing:lines.filter(x=>x.source==='Shadowing').length}),[lines]);
  const visible=useMemo(()=>lines.map((line,index)=>({line,index})).filter(x=>filter==='All'||x.line.source===filter),[lines,filter]);
  const stop=()=>{run.current++;stopAudio();setPlaying(false);setProgress(0)};
  const playOne=async(index=active)=>{
    if(!lines[index])return;
    run.current++;const token=run.current;
    setActive(index);setPlaying(true);setProgress(0);
    await playText(lines[index].jp,rate,'listening',{onProgress:r=>token===run.current&&setProgress(r),onEnd:()=>{if(token===run.current){setPlaying(false);setCompleted(x=>({...x,[index]:true}))}}},{lesson_number:data.lesson,segment_number:index+1,source:lines[index].source},lines[index].voiceRole);
  };
  const playSequence=async()=>{
    run.current++;const token=run.current;setPlaying(true);
    const sequence=filter==='All'?lines.map((_,i)=>i):visible.map(x=>x.index);
    let completedRun=true;
    for(const index of sequence){
      if(token!==run.current){completedRun=false;break}
      setActive(index);setProgress(0);
      const result=await playText(lines[index].jp,rate,'listening',{onProgress:r=>token===run.current&&setProgress(r)},{lesson_number:data.lesson,segment_number:index+1,source:lines[index].source,session_mode:'full_shadowing'},lines[index].voiceRole);
      if(result!=='ended'){completedRun=false;break}
      if(token===run.current)setCompleted(x=>({...x,[index]:true}));
    }
    if(token===run.current)setPlaying(false);
    track(completedRun?'shadowing_complete':'shadowing_cancelled',{lesson_number:data.lesson,segment_count:sequence.length});
  };
  const selectOnly=(index:number)=>{stopAudio();run.current++;setPlaying(false);setProgress(0);setActive(Math.max(0,Math.min(lines.length-1,index)))};
  useEffect(()=>stop,[]);

  const persona=currentLine?.voiceRole==='male'?'A · MALE':currentLine?.voiceRole==='female'?'B · FEMALE':'NARRATOR';

  return <div className="space-y-5 pb-8 shadowing-view-v57">
    <section className="study-header tone-listen">
      <div><div className="section-kicker">FREE JAPANESE LISTENING · LESSON {String(data.lesson).padStart(2,'0')}</div><h1>Hear → Follow → Shadow</h1><p className="font-bn">Browser/Windows-এর Japanese voice, বাংলা support এবং একটাই focused practice flow—কোনো paid API ছাড়াই।</p></div>
      <Headphones className="header-big-icon"/>
    </section>

    <section className="shadowing-summary-v57">
      <div><MessageCircle/><span>Dialogue</span><b>{counts.Dialogue}</b></div>
      <div><BookOpenText/><span>Reading</span><b>{counts.Reading}</b></div>
      <div><Mic2/><span>Shadow</span><b>{counts.Shadowing}</b></div>
      <div><CheckCircle2/><span>Completed</span><b>{Object.keys(completed).length}</b></div>
    </section>

    <section className="shadow-workbench-v57">
      <article className="shadow-player-v57">
        <header className="shadow-player-head-v57">
          <div><small>NOW PRACTICING</small><b>{currentLine?.source||'Select a line'}</b></div>
          <span className={`shadow-persona-pill-v57 ${currentLine?.voiceRole||'default'}`}><UserRound/>{persona}</span>
        </header>

        <div className="shadow-current-v57">
          <div className="shadow-token-line-v57 font-jp" lang="ja">{currentTokens.length?currentTokens.map((t,i)=><span key={`${t}-${i}`} className={i===tokenIndex&&playing?'active':''}>{t}</span>):'Select a transcript line'}</div>
          {showMeaning&&currentLine&&<p className="font-bn">{currentLine.bn}</p>}
        </div>

        <Waveform text={current} progress={progress} voiceRole={currentLine?.voiceRole||'default'}/>
        <div className="shadow-progress-v57"><i style={{width:`${Math.round(progress*100)}%`}}/><span>{Math.round(progress*100)}%</span></div>

        <div className="shadow-transport-v57">
          <button onClick={()=>selectOnly(active-1)} disabled={active<=0} aria-label="Previous"><SkipBack/></button>
          <button className="main" onClick={()=>playing?stop():playOne()} disabled={!current} aria-label={playing?'Stop':'Play'}>{playing?<Square fill="currentColor"/>:<Play fill="currentColor"/>}</button>
          <button onClick={()=>selectOnly(active+1)} disabled={active>=lines.length-1} aria-label="Next"><SkipForward/></button>
        </div>

        <div className="shadow-speed-v57"><span><Gauge/> Speed</span><div>{([.75,.9,1] as const).map(x=><button key={x} onClick={()=>setRate(x)} className={rate===x?'active':''}>{x}×</button>)}</div></div>

        {currentLine?.hints?.length>0&&<div className="shadow-hints-v57"><small>WORD HINTS</small><div>{currentLine.hints.map((h,i)=><span key={`${h.jp}-${i}`}><b className="font-jp">{h.jp}</b><em className="font-bn">{h.bn}</em></span>)}</div></div>}

        <button className="shadow-session-btn-v57" onClick={playSequence} disabled={!lines.length}><Waves/> {playing?'Session playing…':'Start full shadowing session'}</button>
      </article>

      <article className="shadow-library-v57">
        <header><div><span>SHADOWING LIBRARY</span><h2>Pick one line. Repeat it well.</h2><p className="font-bn">একই স্ক্রিনে অতিরিক্ত panel নয়—line বাছুন, শুনুন, imitate করুন।</p></div><button onClick={()=>setShowMeaning(x=>!x)}>{showMeaning?<EyeOff/>:<Eye/>}<span>{showMeaning?'অর্থ লুকান':'অর্থ দেখান'}</span></button></header>
        <div className="shadow-filters-v57">{(['All','Dialogue','Reading','Shadowing'] as Filter[]).map(f=><button key={f} className={filter===f?'active':''} onClick={()=>setFilter(f)}>{f}<span>{f==='All'?lines.length:counts[f]}</span></button>)}</div>
        <div className="shadow-list-v57">{visible.map(({line,index})=><button key={`${line.source}-${index}-${norm(line.jp)}`} className={`${index===active?'active':''} ${completed[index]?'done':''}`} onClick={()=>playOne(index)}>
          <span className={`shadow-list-avatar-v57 ${line.voiceRole}`}>{line.voiceRole==='male'?'A':line.voiceRole==='female'?'B':'読'}</span>
          <div><small>{line.source}{line.speaker?` · Speaker ${line.speaker}`:''}</small><p className="font-jp" lang="ja">{line.jp}</p>{showMeaning&&<b className="font-bn">{line.bn}</b>}</div>
          <span className="shadow-list-play-v57">{completed[index]?<CheckCircle2/>:<Play fill="currentColor"/>}</span>
        </button>)}</div>
      </article>
    </section>
  </div>
}
