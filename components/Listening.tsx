'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpenText, CheckCircle2, Eye, EyeOff, Gauge, Headphones, MessageCircle,
  Mic2, Play, Repeat2, SkipBack, SkipForward, Square, UserRound, Waves
} from 'lucide-react';
import type { LessonPayload, VocabItem } from '@/lib/types';
import { playText, prefetchAudio, stopAudio, type AudioBoundary, type AudioVoiceRole, type PlaybackResult } from '@/lib/audio';
import { track } from '@/lib/analytics';
import { useLanguage } from '@/lib/language';

type Source='Dialogue'|'Reading'|'Shadowing';
type ListeningLine={jp:string;bn:string;source:Source;speaker?:string;voiceRole:AudioVoiceRole;hints:Array<{jp:string;bn:string}>};
type Filter='All'|Source;
type SegmentRange={text:string;start:number;end:number;wordLike:boolean};
type ActiveRange={start:number;end:number}|null;

function sentenceChunks(text:string){return String(text||'').split(/(?<=[。！？])/).map(s=>s.trim()).filter(Boolean)}
function banglaChunks(text:string){return String(text||'').split(/(?<=[।!?])/).map(s=>s.trim()).filter(Boolean)}
function norm(text?:string){return String(text||'').replace(/\s+/g,'').replace(/[“”‘’'"「」『』]/g,'').trim()}
function wait(ms:number){return new Promise(resolve=>window.setTimeout(resolve,ms))}
function hintsFor(jp:string,vocab:VocabItem[]){
  const n=norm(jp);const seen=new Set<string>();
  return vocab.filter(v=>[v.kanji,v.japanese].map(x=>norm(x)).filter(x=>x.length>1).some(f=>n.includes(f)))
    .map(v=>({jp:v.kanji||v.japanese,bn:v.bangla_meaning}))
    .filter(x=>{const k=`${x.jp}|${x.bn}`;if(seen.has(k))return false;seen.add(k);return true}).slice(0,5);
}

function buildListeningLines(data:LessonPayload):ListeningLine[]{
  const c=data.content;const meaning=new Map<string,string>();const dialogue=c.dialogue_extended||c.dialogue||[];
  const speakers:string[]=[];dialogue.forEach(r=>{if(r[0]&&!speakers.includes(r[0]))speakers.push(r[0])});
  const voiceMap:Record<string,AudioVoiceRole>={};speakers.forEach((s,i)=>voiceMap[s]=i%2===0?'male':'female');
  const rows:ListeningLine[]=[];
  dialogue.forEach(r=>{if(!r?.[1])return;if(r[2])meaning.set(norm(r[1]),r[2]);rows.push({jp:r[1],bn:r[2]||'',source:'Dialogue',speaker:r[0],voiceRole:voiceMap[r[0]]||'default',hints:hintsFor(r[1],data.vocabulary)})});

  const reading=c.reading_extended||c.reading||'';const readingBn=c.reading_extended_bn||c.reading_bn||'';
  const ja=sentenceChunks(reading),bn=banglaChunks(readingBn);
  ja.forEach((jp,i)=>{const b=ja.length===bn.length?(bn[i]||''):'';if(b)meaning.set(norm(jp),b);rows.push({jp,bn:b,source:'Reading',voiceRole:'default',hints:hintsFor(jp,data.vocabulary)})});
  (c.reading_extra_pairs||[]).forEach(pair=>{const [jpText,bnText]=pair;const jps=sentenceChunks(jpText),bns=banglaChunks(bnText);if(jps.length&&jps.length===bns.length){jps.forEach((jp,i)=>rows.push({jp,bn:bns[i],source:'Reading',voiceRole:'default',hints:hintsFor(jp,data.vocabulary)}))}else if(jpText){rows.push({jp:jpText,bn:bnText||'',source:'Reading',voiceRole:'default',hints:hintsFor(jpText,data.vocabulary)})}});
  (c.shadowing_chunks||[]).forEach(jp=>{let b=meaning.get(norm(jp))||'';if(!b){for(const [k,v] of meaning){if(k.includes(norm(jp))||norm(jp).includes(k)){b=v;break}}}rows.push({jp,bn:b,source:'Shadowing',voiceRole:'female',hints:hintsFor(jp,data.vocabulary)})});
  return rows.map(x=>({...x,bn:x.bn||'এই line-এর আলাদা বাংলা অর্থ lesson data-তে নেই। Context দেখে practice করুন।'}));
}

// Segmentation runs on every playback progress/boundary tick (up to ~20x/sec while
// audio plays), so results are cached per exact line text to avoid re-running
// Intl.Segmenter or the regex fallback on the hot path.
const segmentCache=new Map<string,SegmentRange[]>();
function segmentJapanese(text:string):SegmentRange[]{
  if(!text)return[];
  const cached=segmentCache.get(text);
  if(cached)return cached;
  let result:SegmentRange[]|null=null;
  try{
    const Segmenter=(Intl as typeof Intl & {Segmenter?:new(locales?:string|string[],options?:{granularity?:string})=>{segment:(input:string)=>Iterable<{segment:string;index:number;isWordLike?:boolean}>}}).Segmenter;
    if(Segmenter){const rows=[...new Segmenter('ja',{granularity:'word'}).segment(text)];if(rows.length)result=rows.map((row,index)=>({text:row.segment,start:row.index,end:index+1<rows.length?rows[index+1].index:text.length,wordLike:row.isWordLike!==false&&!/^\s+$/.test(row.segment)&&!(/^[、。！？,.!?]$/.test(row.segment))}))}
  }catch{}
  if(!result){
    const ranges:SegmentRange[]=[];const regex=/[一-龯々〆ヵヶ]+|[ぁ-ゖー]+|[ァ-ヺー]+|[A-Za-z0-9]+|\s+|[^\s]/g;let match:RegExpExecArray|null;
    while((match=regex.exec(text)))ranges.push({text:match[0],start:match.index,end:match.index+match[0].length,wordLike:!/^\s+$/.test(match[0])&&!/^[、。！？,.!?]$/.test(match[0])});
    result=ranges.length?ranges:[{text,start:0,end:text.length,wordLike:true}];
  }
  segmentCache.set(text,result);
  return result;
}

function wordRanges(text:string){return segmentJapanese(text).filter(x=>x.wordLike)}
function rangeFromProgress(text:string,progress:number,minimumIndex=0){
  const words=wordRanges(text);if(!words.length)return{range:null as ActiveRange,index:0};
  const normalized=Math.max(0,Math.min(.999,Number.isFinite(progress)?progress:0));
  const estimated=Math.min(words.length-1,Math.floor(normalized*words.length));
  const index=Math.max(Math.min(words.length-1,minimumIndex),estimated);
  const word=words[index];
  return{range:{start:word.start,end:word.end} as ActiveRange,index};
}
function rangeFromCharIndex(text:string,charIndex:number,minimumIndex=0){
  const words=wordRanges(text);if(!words.length)return{range:null as ActiveRange,index:0};
  const safe=Math.max(0,Math.min(text.length-1,Number.isFinite(charIndex)?charIndex:0));
  let exact=words.findIndex(word=>safe>=word.start&&safe<word.end);
  if(exact<0)exact=words.findIndex(word=>word.start>=safe);
  if(exact<0)exact=words.length-1;
  const index=Math.max(Math.min(words.length-1,minimumIndex),exact);
  const word=words[index];
  return{range:{start:word.start,end:word.end} as ActiveRange,index};
}

function Waveform({text,progress}:{text:string;progress:number}){
  const {text:t}=useLanguage();
  const peaks=useMemo(()=>Array.from({length:72},(_,i)=>{const code=text.charCodeAt(i%Math.max(1,text.length))||31;const envelope=.62+.38*Math.sin((i/71)*Math.PI);return Math.max(.18,Math.min(1,((.22+((code*(i+9))%73)/100)*envelope))) }),[text]);
  const played=Math.round(progress*100);
  return <div className="shadow-wave-shell-v82" aria-label={t(`অডিও প্রগ্রেস ${played}%`,`Audio progress ${played}%`)}><div className="shadow-wave-v57">{peaks.map((p,i)=><i key={i} className={i/peaks.length<=progress?'played':''} style={{height:`${Math.round(10+p*38)}px`}}/>)}</div><div className="shadow-wave-readout-v82"><span>{t('ভয়েস সিগন্যাল','VOICE SIGNAL')}</span><b>{played}%</b></div></div>;
}

function Transcript({text,playing,activeRange}:{text:string;playing:boolean;activeRange:ActiveRange}){
  const {text:label}=useLanguage();
  const segments=useMemo(()=>segmentJapanese(text),[text]);
  return <div className="shadow-token-line-v57 font-jp" lang="ja" aria-live="off">{segments.length?segments.map((segment,index)=>{
    const isActive=!!activeRange&&playing&&segment.wordLike&&segment.start<activeRange.end&&segment.end>activeRange.start;
    const isSpoken=!!activeRange&&playing&&segment.wordLike&&segment.end<=activeRange.start;
    return <span key={`${segment.start}-${index}`} className={`${isActive?'active':''} ${isSpoken?'spoken':''}`}>{segment.text}</span>;
  }):label('একটি transcript line বেছে নিন','Select a transcript line')}</div>;
}

export default function Listening({data}:{data:LessonPayload}){
  const {language,text}=useLanguage();
  const [rate,setRate]=useState<.75|.9|1>(1);const [active,setActive]=useState(0);const [progress,setProgress]=useState(0);const [playing,setPlaying]=useState(false);const [showMeaning,setShowMeaning]=useState(false);const [filter,setFilter]=useState<Filter>('All');const [completed,setCompleted]=useState<Record<number,boolean>>({});const [activeRange,setActiveRange]=useState<ActiveRange>(null);const [mode,setMode]=useState<'listen'|'repeat'|'session'>('listen');
  const run=useRef(0);const lastBoundaryAt=useRef(0);const highlightWordIndex=useRef(0);const highestProgress=useRef(0);
  const lines=useMemo(()=>buildListeningLines(data),[data]);const currentLine=lines[active];const current=currentLine?.jp||'';
  const counts=useMemo(()=>({Dialogue:lines.filter(x=>x.source==='Dialogue').length,Reading:lines.filter(x=>x.source==='Reading').length,Shadowing:lines.filter(x=>x.source==='Shadowing').length}),[lines]);
  const visible=useMemo(()=>lines.map((line,index)=>({line,index})).filter(x=>filter==='All'||x.line.source===filter),[lines,filter]);

  const resetSync=()=>{setActiveRange(null);lastBoundaryAt.current=0;highlightWordIndex.current=0;highestProgress.current=0};
  const stop=()=>{run.current++;stopAudio();setPlaying(false);setProgress(0);resetSync();setMode('listen')};
  const applyEstimatedHighlight=(text:string,nextProgress:number)=>{
    const safeProgress=Math.max(highestProgress.current,Math.max(0,Math.min(1,nextProgress)));
    highestProgress.current=safeProgress;
    const mapped=rangeFromProgress(text,safeProgress,highlightWordIndex.current);
    highlightWordIndex.current=mapped.index;
    setActiveRange(mapped.range);
    setProgress(safeProgress);
  };
  const applyBoundaryHighlight=(text:string,boundary:AudioBoundary)=>{
    const mapped=rangeFromCharIndex(text,boundary.charIndex,highlightWordIndex.current);
    highlightWordIndex.current=mapped.index;
    highestProgress.current=Math.max(highestProgress.current,boundary.progress);
    setActiveRange(mapped.range);
    setProgress(prev=>Math.max(prev,boundary.progress));
  };

  const speakLine=async(line:ListeningLine,index:number,token:number,sessionMode:string):Promise<PlaybackResult>=>{
    lastBoundaryAt.current=0;highlightWordIndex.current=0;highestProgress.current=0;
    setActiveRange(rangeFromProgress(line.jp,0,0).range);
    const next=lines[index+1];
    if(next)void prefetchAudio(next.jp,next.voiceRole);
    return playText(line.jp,rate,'listening',{
      onBoundary:(boundary:AudioBoundary)=>{
        if(token!==run.current)return;
        lastBoundaryAt.current=performance.now();
        applyBoundaryHighlight(line.jp,boundary);
      },
      onProgress:r=>{
        if(token!==run.current)return;
        const now=performance.now();
        // Engines without reliable boundary events still get a monotonic visual
        // fallback. Exact browser boundaries always take precedence when present.
        if(!lastBoundaryAt.current||now-lastBoundaryAt.current>850)applyEstimatedHighlight(line.jp,r);
        else setProgress(prev=>Math.max(prev,r));
      },
    },{lesson_number:data.lesson,segment_number:index+1,source:line.source,session_mode:sessionMode,synchronized_transcript:true,natural_full_sentence:true},line.voiceRole);
  };

  const playOne=async(index=active)=>{if(!lines[index])return;stopAudio();run.current+=1;const token=run.current;setMode('listen');setActive(index);setPlaying(true);setProgress(0);resetSync();const result=await speakLine(lines[index],index,token,'listen_once');if(token!==run.current)return;setPlaying(false);setActiveRange(null);if(result==='ended')setCompleted(x=>({...x,[index]:true}))};

  const repeatThree=async()=>{if(!currentLine)return;stopAudio();run.current+=1;const token=run.current;setMode('repeat');setPlaying(true);for(let pass=0;pass<3;pass++){if(token!==run.current)return;setProgress(0);resetSync();const result=await speakLine(currentLine,active,token,`shadow_repeat_${pass+1}`);if(result!=='ended'||token!==run.current){setPlaying(false);return}if(pass<2)await wait(950)}if(token===run.current){setPlaying(false);setProgress(1);setActiveRange(null);setCompleted(x=>({...x,[active]:true}));track('shadowing_complete',{lesson_number:data.lesson,segment_count:1,repetitions:3})}};

  const playSequence=async()=>{stopAudio();run.current+=1;const token=run.current;setMode('session');setPlaying(true);setProgress(0);resetSync();const sequence=filter==='All'?lines.map((_,i)=>i):visible.map(x=>x.index);let completedRun=true;for(const index of sequence){if(token!==run.current){completedRun=false;break}setActive(index);setProgress(0);resetSync();const result=await speakLine(lines[index],index,token,'full_shadowing');if(result!=='ended'){completedRun=false;break}if(token===run.current)setCompleted(x=>({...x,[index]:true}));await wait(900)}if(token===run.current){setPlaying(false);setProgress(completedRun?1:0);resetSync();setMode('listen')}track(completedRun?'shadowing_complete':'shadowing_cancelled',{lesson_number:data.lesson,segment_count:sequence.length})};

  const selectOnly=(index:number)=>{stopAudio();run.current++;setPlaying(false);setProgress(0);resetSync();setMode('listen');const safe=Math.max(0,Math.min(lines.length-1,index));setActive(safe);const target=lines[safe];if(target)void prefetchAudio(target.jp,target.voiceRole)};
  useEffect(()=>()=>{run.current+=1;stopAudio()},[]);
  // Warm the HTTP cache for the first couple of clips so the very first "Play"
  // has near-zero loading delay instead of paying the initial fetch cost.
  useEffect(()=>{
    if(lines[0])void prefetchAudio(lines[0].jp,lines[0].voiceRole);
    if(lines[1])void prefetchAudio(lines[1].jp,lines[1].voiceRole);
  },[lines]);
  const persona=currentLine?.voiceRole==='male'?'A · MALE':currentLine?.voiceRole==='female'?'B · FEMALE':'NARRATOR';

  return <div className="space-y-5 pb-8 shadowing-view-v57 listening-v82 listening-v89">
    <section className="study-header tone-listen"><div><div className="section-kicker">{text('জাপানিজ লিসেনিং','JAPANESE LISTENING')} · {text('লেসন','LESSON')} {String(data.lesson).padStart(2,'0')}</div><h1>{text('শুনুন → বুঝুন → শ্যাডো করুন','Hear → Understand → Shadow')}</h1><p className={language==='bn'?'font-bn':''}>{text('অর্থ লুকানো অবস্থায় প্রথমে natural Japanese শুনুন ও বুঝতে চেষ্টা করুন। তারপর অর্থ মিলিয়ে একই rhythm-এ তিনবার shadow করুন।','First listen to natural Japanese with the meaning hidden. Check your understanding, then shadow the same rhythm three times.')}</p></div><Headphones className="header-big-icon"/></section>
    <section className="shadowing-summary-v57"><div><MessageCircle/><span>{text('কথোপকথন','Dialogue')}</span><b>{counts.Dialogue}</b></div><div><BookOpenText/><span>{text('রিডিং','Reading')}</span><b>{counts.Reading}</b></div><div><Mic2/><span>{text('শ্যাডো','Shadow')}</span><b>{counts.Shadowing}</b></div><div><CheckCircle2/><span>{text('সম্পন্ন','Completed')}</span><b>{Object.keys(completed).length}</b></div></section>

    <section className="shadow-workbench-v57">
      <article className="shadow-player-v57">
        <header className="shadow-player-head-v57"><div><small>{text('এখন প্র্যাকটিস করছেন','NOW PRACTICING')}</small><b>{currentLine?.source||text('একটি line বেছে নিন','Select a line')}</b></div><span className={`shadow-persona-pill-v57 ${currentLine?.voiceRole||'default'}`}><UserRound/>{persona}</span></header>
        <div className="shadow-current-v57"><Transcript text={current} playing={playing} activeRange={activeRange}/>{showMeaning&&currentLine&&<p className="font-bn">{currentLine.bn}{language==='en'&&<small> · Bangla source translation</small>}</p>}</div>
        <Waveform text={current} progress={progress}/><div className="shadow-progress-v57"><i style={{width:`${Math.round(progress*100)}%`}}/><span>{Math.round(progress*100)}%</span></div>
        <div className="shadow-transport-v57"><button onClick={()=>selectOnly(active-1)} disabled={active<=0} aria-label={text('আগেরটি','Previous')}><SkipBack/></button><button className="main" onClick={()=>playing?stop():playOne()} disabled={!current} aria-label={playing?text('থামান','Stop'):text('চালান','Play')}>{playing?<Square fill="currentColor"/>:<Play fill="currentColor"/>}</button><button onClick={()=>selectOnly(active+1)} disabled={active>=lines.length-1} aria-label={text('পরেরটি','Next')}><SkipForward/></button></div>
        <div className="shadow-practice-modes-v89"><button className={mode==='listen'?'active':''} onClick={()=>playOne()} disabled={playing||!current}><Play/> {text('একবার শুনুন','Listen once')}</button><button className={mode==='repeat'?'active':''} onClick={repeatThree} disabled={playing||!current}><Repeat2/> {text('শ্যাডো ×৩','Shadow ×3')}</button><button className={mode==='session'?'active':''} onClick={playSequence} disabled={playing||!lines.length}><Waves/> {text('পুরো সেশন','Full session')}</button></div>
        <div className="shadow-speed-v57"><span><Gauge/> {text('গতি','Speed')}</span><div>{([.75,.9,1] as const).map(x=><button key={x} onClick={()=>setRate(x)} className={rate===x?'active':''}>{x}×</button>)}</div></div>
        {currentLine?.hints?.length>0&&<div className="shadow-hints-v57"><small>{text('শব্দের ইঙ্গিত','WORD HINTS')}</small><div>{currentLine.hints.map((h,i)=><span key={`${h.jp}-${i}`}><b className="font-jp">{h.jp}</b><em className="font-bn">{h.bn}</em></span>)}</div></div>}
      </article>

      <article className="shadow-library-v57"><header><div><span>{text('শ্যাডোয়িং লাইব্রেরি','SHADOWING LIBRARY')}</span><h2>{text('স্বাভাবিকভাবে শুনুন, একই ছন্দে repeat করুন।','Listen naturally. Repeat with rhythm.')}</h2><p className={language==='bn'?'font-bn':''}>{text('একটি line বাছুন, natural voice শুনুন, live phrase follow করুন, তারপর তিনবার imitate করুন।','Choose a line, listen to the natural voice, follow the live phrase highlighting, then imitate it three times.')}</p></div><button onClick={()=>setShowMeaning(x=>!x)}>{showMeaning?<EyeOff/>:<Eye/>}<span>{showMeaning?text('অর্থ লুকান','Hide meaning'):text('অর্থ দেখান','Show meaning')}</span></button></header><div className="shadow-filters-v57">{(['All','Dialogue','Reading','Shadowing'] as Filter[]).map(f=><button key={f} className={filter===f?'active':''} onClick={()=>setFilter(f)}>{f==='All'?text('সব','All'):f==='Dialogue'?text('কথোপকথন','Dialogue'):f==='Reading'?text('রিডিং','Reading'):text('শ্যাডো','Shadowing')}<span>{f==='All'?lines.length:counts[f]}</span></button>)}</div><div className="shadow-list-v57">{visible.map(({line,index})=><button key={`${line.source}-${index}-${norm(line.jp)}`} className={`${index===active?'active':''} ${completed[index]?'done':''}`} onClick={()=>playOne(index)}><span className={`shadow-list-avatar-v57 ${line.voiceRole}`}>{line.voiceRole==='male'?'A':line.voiceRole==='female'?'B':'読'}</span><div><small>{line.source}{line.speaker?` · Speaker ${line.speaker}`:''}</small><p className="font-jp" lang="ja">{line.jp}</p>{showMeaning&&<b className="font-bn">{line.bn}</b>}</div><span className="shadow-list-play-v57">{completed[index]?<CheckCircle2/>:<Play fill="currentColor"/>}</span></button>)}</div></article>
    </section>
  </div>;
}
