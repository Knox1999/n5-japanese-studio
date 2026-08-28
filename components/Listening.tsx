'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpenText, Eye, EyeOff, Headphones, Play, SkipBack, SkipForward, Sparkles, Square, Volume2 } from 'lucide-react';
import type { LessonPayload, VocabItem } from '@/lib/types';
import { audioUrlForText, playText, stopAudio } from '@/lib/audio';
import { track } from '@/lib/analytics';

type ListeningLine={jp:string;bn:string;source:'Dialogue'|'Reading'|'Shadowing';speaker?:string;hints:Array<{jp:string;bn:string}>};

function sentenceChunks(text:string){return String(text||'').split(/(?<=[。！？])/).map(s=>s.trim()).filter(Boolean)}
function banglaChunks(text:string){return String(text||'').split(/(?<=[।!?])/).map(s=>s.trim()).filter(Boolean)}
function norm(text:string){return String(text||'').replace(/\s+/g,'').replace(/[“”‘’'"「」『』]/g,'').trim()}
function tokens(text:string){const spaced=text.trim().split(/\s+/).filter(Boolean);if(spaced.length>1)return spaced;return Array.from(text).reduce<string[]>((a,ch)=>{if(/[、。！？]/.test(ch)){if(a.length)a[a.length-1]+=ch;else a.push(ch)}else if(a.length&&a[a.length-1].length<3)a[a.length-1]+=ch;else a.push(ch);return a},[])}
function hintsFor(jp:string,vocab:VocabItem[]){const n=norm(jp);const seen=new Set<string>();return vocab.filter(v=>{const forms=[v.kanji,v.japanese].map(x=>norm(x)).filter(x=>x.length>1);return forms.some(f=>n.includes(f))}).map(v=>({jp:v.kanji||v.japanese,bn:v.bangla_meaning})).filter(x=>{const k=`${x.jp}|${x.bn}`;if(seen.has(k))return false;seen.add(k);return true}).slice(0,5)}
function addParallel(map:Map<string,string>,jpText:string,bnText:string){const ja=sentenceChunks(jpText),bn=banglaChunks(bnText);if(ja.length&&ja.length===bn.length)ja.forEach((x,i)=>map.set(norm(x),bn[i]));}

function buildListeningLines(data:LessonPayload):ListeningLine[]{
  const c=data.content;
  const meaning=new Map<string,string>();
  const source=new Map<string,ListeningLine['source']>();
  const speaker=new Map<string,string>();
  const ordered:string[]=[];
  const put=(jp:string,bn:string,src:ListeningLine['source'],sp?:string)=>{if(!jp)return;const k=norm(jp);if(!k)return;if(!ordered.some(x=>norm(x)===k))ordered.push(jp.trim());if(bn&&!meaning.has(k))meaning.set(k,bn.trim());if(!source.has(k))source.set(k,src);if(sp&&!speaker.has(k))speaker.set(k,sp)};

  const dialogue=c.dialogue_extended||c.dialogue||[];
  dialogue.forEach(r=>put(r[1],r[2]||'', 'Dialogue',r[0]));

  const reading=c.reading_extended||c.reading||'';
  const readingBn=c.reading_extended_bn||c.reading_bn||'';
  addParallel(meaning,reading,readingBn);
  sentenceChunks(reading).forEach(jp=>put(jp,meaning.get(norm(jp))||'','Reading'));

  (c.reading_extra_pairs||[]).forEach(pair=>{
    const [jp,bn]=pair; addParallel(meaning,jp,bn);
    const ja=sentenceChunks(jp),bb=banglaChunks(bn);
    if(ja.length===bb.length)ja.forEach((x,i)=>put(x,bb[i],'Reading')); else put(jp,bn,'Reading');
  });

  (c.shadowing_chunks||[]).forEach(jp=>{
    let bn=meaning.get(norm(jp))||'';
    if(!bn){
      for(const [k,v] of meaning){if(k.includes(norm(jp))||norm(jp).includes(k)){bn=v;break}}
    }
    put(jp,bn,'Shadowing');
  });

  return ordered.map(jp=>({jp,bn:meaning.get(norm(jp))||'অর্থটি lesson data-তে আলাদা line হিসেবে নেই। Context reading-এর বাংলা অনুবাদ দেখে মিলিয়ে নিন।',source:source.get(norm(jp))||'Shadowing',speaker:speaker.get(norm(jp)),hints:hintsFor(jp,data.vocabulary)}));
}

function Waveform({text,progress}:{text:string;progress:number}){
  const [peaks,setPeaks]=useState<number[]>(Array.from({length:72},(_,i)=>.25+((i*17)%13)/18));
  useEffect(()=>{let dead=false;let ctx:AudioContext|undefined;(async()=>{try{if(!text)return;const url=await audioUrlForText(text);const r=await fetch(url);if(!r.ok)return;const b=await r.arrayBuffer();ctx=new (window.AudioContext||((window as any).webkitAudioContext))();const audio=await ctx.decodeAudioData(b);const ch=audio.getChannelData(0),n=72,step=Math.max(1,Math.floor(ch.length/n));const vals=[];for(let i=0;i<n;i++){let m=0;const start=i*step,end=Math.min(ch.length,start+step);for(let j=start;j<end;j++)m=Math.max(m,Math.abs(ch[j]));vals.push(Math.max(.12,Math.min(1,m*2.3)))}if(!dead)setPeaks(vals)}catch{}finally{ctx?.close().catch(()=>{})}})();return()=>{dead=true;ctx?.close().catch(()=>{})}},[text]);
  return <div className="waveform" aria-label="Audio waveform">{peaks.map((p,i)=><i key={i} className={i/peaks.length<=progress?'played':''} style={{height:`${Math.round(12+p*36)}px`}}/> )}</div>
}

export default function Listening({data}:{data:LessonPayload}){
  const [rate,setRate]=useState<.75|.9|1>(1);
  const [active,setActive]=useState(0);
  const [progress,setProgress]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [showMeaning,setShowMeaning]=useState(true);
  const run=useRef(0);
  const activeRow=useRef<HTMLButtonElement|null>(null);
  const lines=useMemo(()=>buildListeningLines(data),[data]);
  const currentLine=lines[active];
  const current=currentLine?.jp||'';
  const currentTokens=tokens(current);
  const tokenIndex=Math.min(currentTokens.length-1,Math.floor(progress*Math.max(1,currentTokens.length)));
  const stop=()=>{run.current++;stopAudio();setPlaying(false);setProgress(0)};
  const playOne=async(index=active)=>{if(!lines[index])return;run.current++;const token=run.current;setActive(index);setPlaying(true);setProgress(0);await playText(lines[index].jp,rate,'listening',{onProgress:r=>token===run.current&&setProgress(r),onEnd:()=>token===run.current&&setPlaying(false)});};
  const playSequence=async()=>{run.current++;const token=run.current;setPlaying(true);for(let i=0;i<lines.length;i++){if(token!==run.current)break;setActive(i);setProgress(0);await playText(lines[i].jp,rate,'listening',{onProgress:r=>token===run.current&&setProgress(r)});}if(token===run.current)setPlaying(false);track('shadowing_complete',{lesson_number:data.lesson,segment_count:lines.length})};
  const selectOnly=(index:number)=>{stopAudio();run.current++;setPlaying(false);setProgress(0);setActive(Math.max(0,Math.min(lines.length-1,index)))};
  useEffect(()=>stop,[]);
  useEffect(()=>{activeRow.current?.scrollIntoView({behavior:'smooth',block:'nearest'})},[active]);

  return <div className="space-y-5 pb-8 listening-view-v48">
    <section className="study-header tone-listen">
      <div><div className="section-kicker">Meaning-assisted Listening · Lesson {String(data.lesson).padStart(2,'0')}</div><h1>Hear → Understand → Shadow</h1><p className="font-bn">জাপানি শোনার সাথে বাংলা অর্থ, line context ও গুরুত্বপূর্ণ শব্দের hint—যাতে শুনে বুঝে shadow করা সহজ হয়।</p></div>
      <Headphones className="header-big-icon"/>
    </section>
    <section className="listening-grid">
      <article className="audio-console">
        <div className="console-top"><span className="now-playing">NOW PLAYING</span><span>{Math.min(active+1,Math.max(1,lines.length))}/{lines.length}</span></div>
        <div className="natural-voice-pill"><Sparkles size={13}/><span>Natural neural voice</span><b>JA</b></div>
        <div className="current-jp font-jp">{current||'Select a transcript line'}</div>
        {currentLine&&showMeaning&&<div className="current-meaning-v48"><span><BookOpenText size={14}/> বাংলা অর্থ</span><p className="font-bn">{currentLine.bn}</p>{currentLine.hints.length>0&&<div className="listening-word-hints">{currentLine.hints.map((h,i)=><small key={`${h.jp}-${i}`}><b className="font-jp">{h.jp}</b><span className="font-bn">{h.bn}</span></small>)}</div>}</div>}
        <Waveform text={current} progress={progress}/>
        <div className="progress-time"><span>Progress</span><b>{Math.round(progress*100)}%</b></div>
        <div className="transport">
          <button className="transport-btn" onClick={()=>selectOnly(active-1)} disabled={active<=0} aria-label="Previous line"><SkipBack size={18}/></button>
          <button className="transport-main" onClick={()=>playing?stop():playOne()} disabled={!current} aria-label={playing?'Stop audio':'Play audio'}>{playing?<Square/>:<Play fill="currentColor"/>}</button>
          <button className="transport-btn" onClick={()=>selectOnly(active+1)} disabled={active>=lines.length-1} aria-label="Next line"><SkipForward size={18}/></button>
        </div>
        <div className="speed-control"><span>Playback speed</span><div>{([.75,.9,1] as const).map(x=><button key={x} onClick={()=>setRate(x)} className={rate===x?'active':''}>{x}×</button>)}</div></div>
        <div className="listening-actions"><button className="premium-btn premium-btn-secondary" onClick={()=>playOne()} disabled={!current}><Volume2 size={16}/> Current line</button><button className="premium-btn premium-btn-primary" onClick={playSequence} disabled={!lines.length}><Headphones size={16}/> Full session</button></div>
      </article>

      <article className="transcript-panel">
        <div className="sticky-transcript-head"><div><div className="section-kicker">Live transcript + meaning</div><h2>Follow what you hear</h2></div><div className="listening-head-actions"><button className="meaning-toggle" onClick={()=>setShowMeaning(x=>!x)}>{showMeaning?<EyeOff size={14}/>:<Eye size={14}/>}<span>{showMeaning?'অর্থ লুকান':'অর্থ দেখান'}</span></button><span className={`live-dot ${playing?'is-live':''}`}><i/> {playing?'LIVE':'READY'}</span></div></div>
        <div className="transcript-current font-jp" aria-live="polite">{currentTokens.map((t,i)=><span key={`${t}-${i}`} className={i===tokenIndex&&playing?'active':''}>{t}</span>)}</div>
        <div className="transcript-list transcript-list-v48">{lines.map((line,i)=><button ref={i===active?activeRow:undefined} key={`${norm(line.jp)}-${i}`} onClick={()=>playOne(i)} className={i===active?'active':''} aria-current={i===active?'true':undefined}><span className="line-no">{String(i+1).padStart(2,'0')}</span><div className="transcript-copy"><div className="line-meta"><small>{line.source}</small>{line.speaker&&<small>Speaker {line.speaker}</small>}</div><p className="font-jp">{line.jp}</p>{showMeaning&&<b className="font-bn">{line.bn}</b>}</div><Play size={14}/></button>)}</div>
      </article>
    </section>
  </div>
}
