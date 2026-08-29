'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpenText, Eye, EyeOff, Headphones, Play, SkipBack, SkipForward,
  Square, MessageCircle, Mic2, Waves, UserRound, Gauge, CheckCircle2
} from 'lucide-react';
import type { LessonPayload, VocabItem } from '@/lib/types';
import { playText, stopAudio, type AudioVoiceRole, type PlaybackResult } from '@/lib/audio';
import { track } from '@/lib/analytics';

type Source='Dialogue'|'Reading'|'Shadowing';
type ListeningLine={jp:string;bn:string;source:Source;speaker?:string;voiceRole:AudioVoiceRole;hints:Array<{jp:string;bn:string}>};
type Filter='All'|Source;
type SegmentRange={text:string;start:number;end:number;wordLike:boolean};
type SpeechCue={speech:string;start:number;end:number};

function sentenceChunks(text:string){return String(text||'').split(/(?<=[。！？])/).map(s=>s.trim()).filter(Boolean)}
function banglaChunks(text:string){return String(text||'').split(/(?<=[।!?])/).map(s=>s.trim()).filter(Boolean)}
function norm(text?:string){return String(text||'').replace(/\s+/g,'').replace(/[“”‘’'"「」『』]/g,'').trim()}
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
    }else if(jpText){
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

function segmentJapanese(text:string):SegmentRange[]{
  if(!text)return[];
  try{
    const Segmenter=(Intl as typeof Intl & {Segmenter?:new(locales?:string|string[],options?:{granularity?:string})=>{segment:(input:string)=>Iterable<{segment:string;index:number;isWordLike?:boolean}>}}).Segmenter;
    if(Segmenter){
      const rows=[...new Segmenter('ja',{granularity:'word'}).segment(text)];
      if(rows.length){
        return rows.map((row,index)=>({
          text:row.segment,
          start:row.index,
          end:index+1<rows.length?rows[index+1].index:text.length,
          wordLike:row.isWordLike!==false&&!/^\s+$/.test(row.segment)&&!(/^[、。！？,.!?]$/.test(row.segment)),
        }));
      }
    }
  }catch{}

  const ranges:SegmentRange[]=[];
  const regex=/[一-龯々〆ヵヶ]+|[ぁ-ゖー]+|[ァ-ヺー]+|[A-Za-z0-9]+|\s+|[^\s]/g;
  let match:RegExpExecArray|null;
  while((match=regex.exec(text))){
    ranges.push({text:match[0],start:match.index,end:match.index+match[0].length,wordLike:!/^\s+$/.test(match[0])&&!/^[、。！？,.!?]$/.test(match[0])});
  }
  return ranges.length?ranges:[{text,start:0,end:text.length,wordLike:true}];
}

function speechCues(text:string):SpeechCue[]{
  const segments=segmentJapanese(text);
  const words=segments.filter(segment=>segment.wordLike);
  if(!words.length)return text?[{speech:text,start:0,end:text.length}]:[];
  return words.map((word,index)=>{
    const next=words[index+1];
    const end=next?.start??text.length;
    const speech=text.slice(word.start,end).trim()||word.text;
    return {speech,start:word.start,end};
  });
}

function Waveform({text,progress}:{text:string;progress:number}){
  const peaks=useMemo(()=>Array.from({length:72},(_,i)=>{
    const code=text.charCodeAt(i%Math.max(1,text.length))||31;
    const envelope=.62+.38*Math.sin((i/71)*Math.PI);
    return Math.max(.18,Math.min(1,((.22+((code*(i+9))%73)/100)*envelope)));
  }),[text]);
  const played=Math.round(progress*100);
  return <div className="shadow-wave-shell-v82" aria-label={`Audio progress ${played}%`}>
    <div className="shadow-wave-v57">{peaks.map((p,i)=><i key={i} className={i/peaks.length<=progress?'played':''} style={{height:`${Math.round(10+p*38)}px`}}/>)}</div>
    <div className="shadow-wave-readout-v82"><span>VOICE SIGNAL</span><b>{played}%</b></div>
  </div>
}

function Transcript({text,playing,activeCue}:{text:string;playing:boolean;activeCue:number|null}){
  const segments=useMemo(()=>segmentJapanese(text),[text]);
  const cues=useMemo(()=>speechCues(text),[text]);
  const cue=activeCue===null?null:cues[activeCue];
  return <div className="shadow-token-line-v57 font-jp" lang="ja" aria-live="off">
    {segments.length?segments.map((segment,index)=>{
      const isActive=!!cue&&playing&&segment.wordLike&&segment.start>=cue.start&&segment.start<cue.end;
      const isSpoken=!!cue&&playing&&segment.wordLike&&segment.end<=cue.start;
      return <span key={`${segment.start}-${index}`} className={`${isActive?'active':''} ${isSpoken?'spoken':''}`}>{segment.text}</span>;
    }):'Select a transcript line'}
  </div>;
}

export default function Listening({data}:{data:LessonPayload}){
  const [rate,setRate]=useState<.75|.9|1>(1);
  const [active,setActive]=useState(0);
  const [progress,setProgress]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [showMeaning,setShowMeaning]=useState(true);
  const [filter,setFilter]=useState<Filter>('All');
  const [completed,setCompleted]=useState<Record<number,boolean>>({});
  const [activeCue,setActiveCue]=useState<number|null>(null);
  const run=useRef(0);

  const lines=useMemo(()=>buildListeningLines(data),[data]);
  const currentLine=lines[active];
  const current=currentLine?.jp||'';
  const counts=useMemo(()=>({Dialogue:lines.filter(x=>x.source==='Dialogue').length,Reading:lines.filter(x=>x.source==='Reading').length,Shadowing:lines.filter(x=>x.source==='Shadowing').length}),[lines]);
  const visible=useMemo(()=>lines.map((line,index)=>({line,index})).filter(x=>filter==='All'||x.line.source===filter),[lines,filter]);

  const resetSync=()=>setActiveCue(null);
  const stop=()=>{run.current++;stopAudio();setPlaying(false);setProgress(0);resetSync()};

  const speakLine=async(line:ListeningLine,index:number,token:number,sessionMode='single'):Promise<PlaybackResult>=>{
    const cues=speechCues(line.jp);
    if(!cues.length)return'unavailable';
    for(let cueIndex=0;cueIndex<cues.length;cueIndex+=1){
      if(token!==run.current)return'cancelled';
      const cue=cues[cueIndex];
      setActiveCue(cueIndex);
      const result=await playText(cue.speech,rate,'listening',{
        onProgress:r=>{
          if(token!==run.current)return;
          setProgress(Math.min(.999,(cueIndex+r)/cues.length));
        },
      },{
        lesson_number:data.lesson,
        segment_number:index+1,
        source:line.source,
        session_mode:sessionMode,
        cue_number:cueIndex+1,
        cue_count:cues.length,
        synchronized_transcript:true,
      },line.voiceRole);
      if(result!=='ended')return result;
    }
    if(token===run.current){setProgress(1);setActiveCue(null)}
    return'ended';
  };

  const playOne=async(index=active)=>{
    if(!lines[index])return;
    stopAudio();
    run.current+=1;const token=run.current;
    setActive(index);setPlaying(true);setProgress(0);resetSync();
    const line=lines[index];
    const result=await speakLine(line,index,token,'single');
    if(token!==run.current)return;
    setPlaying(false);resetSync();
    if(result==='ended')setCompleted(x=>({...x,[index]:true}));
  };

  const playSequence=async()=>{
    stopAudio();
    run.current+=1;const token=run.current;
    setPlaying(true);setProgress(0);resetSync();
    const sequence=filter==='All'?lines.map((_,i)=>i):visible.map(x=>x.index);
    let completedRun=true;
    for(const index of sequence){
      if(token!==run.current){completedRun=false;break}
      setActive(index);setProgress(0);resetSync();
      const result=await speakLine(lines[index],index,token,'full_shadowing');
      if(result!=='ended'){completedRun=false;break}
      if(token===run.current)setCompleted(x=>({...x,[index]:true}));
    }
    if(token===run.current){setPlaying(false);setProgress(completedRun?1:0);resetSync()}
    track(completedRun?'shadowing_complete':'shadowing_cancelled',{lesson_number:data.lesson,segment_count:sequence.length});
  };

  const selectOnly=(index:number)=>{stopAudio();run.current++;setPlaying(false);setProgress(0);resetSync();setActive(Math.max(0,Math.min(lines.length-1,index)))};
  useEffect(()=>stop,[]);

  const persona=currentLine?.voiceRole==='male'?'A · MALE':currentLine?.voiceRole==='female'?'B · FEMALE':'NARRATOR';

  return <div className="space-y-5 pb-8 shadowing-view-v57 listening-v82">
    <section className="study-header tone-listen">
      <div><div className="section-kicker">JAPANESE LISTENING · LESSON {String(data.lesson).padStart(2,'0')}</div><h1>Hear → Follow → Shadow</h1><p className="font-bn">শুনুন, যে অংশটি voice বলছে ঠিক সেটাই follow করুন, তারপর একই rhythm-এ shadow করুন।</p></div>
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
          <Transcript text={current} playing={playing} activeCue={activeCue}/>
          {showMeaning&&currentLine&&<p className="font-bn">{currentLine.bn}</p>}
        </div>

        <Waveform text={current} progress={progress}/>
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
        <header><div><span>SHADOWING LIBRARY</span><h2>Pick one line. Repeat it well.</h2><p className="font-bn">একটি line বাছুন, live cue follow করুন, তারপর imitate করুন।</p></div><button onClick={()=>setShowMeaning(x=>!x)}>{showMeaning?<EyeOff/>:<Eye/>}<span>{showMeaning?'অর্থ লুকান':'অর্থ দেখান'}</span></button></header>
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
