'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Eraser, GraduationCap, PencilLine, RotateCcw, Shuffle, Sparkles, Volume2, XCircle } from 'lucide-react';
import { playText } from '@/lib/audio';
import { track } from '@/lib/analytics';
import { useLanguage } from '@/lib/language';

type ScriptMode='hiragana'|'katakana';
export type KanaItem={h:string;r:string;group:string};
type Attempt={itemId:string;userAnswer:string;correctAnswer:string;correct:boolean;questionType:string};
type Props={onAttempt?:(attempt:Attempt)=>void};

export const KANA_BASE:KanaItem[]=[
  ['あ','a','Vowels'],['い','i','Vowels'],['う','u','Vowels'],['え','e','Vowels'],['お','o','Vowels'],
  ['か','ka','K row'],['き','ki','K row'],['く','ku','K row'],['け','ke','K row'],['こ','ko','K row'],
  ['さ','sa','S row'],['し','shi','S row'],['す','su','S row'],['せ','se','S row'],['そ','so','S row'],
  ['た','ta','T row'],['ち','chi','T row'],['つ','tsu','T row'],['て','te','T row'],['と','to','T row'],
  ['な','na','N row'],['に','ni','N row'],['ぬ','nu','N row'],['ね','ne','N row'],['の','no','N row'],
  ['は','ha','H row'],['ひ','hi','H row'],['ふ','fu','H row'],['へ','he','H row'],['ほ','ho','H row'],
  ['ま','ma','M row'],['み','mi','M row'],['む','mu','M row'],['め','me','M row'],['も','mo','M row'],
  ['や','ya','Y row'],['ゆ','yu','Y row'],['よ','yo','Y row'],
  ['ら','ra','R row'],['り','ri','R row'],['る','ru','R row'],['れ','re','R row'],['ろ','ro','R row'],
  ['わ','wa','W / N'],['を','wo','W / N'],['ん','n','W / N'],
  ['が','ga','Dakuten'],['ぎ','gi','Dakuten'],['ぐ','gu','Dakuten'],['げ','ge','Dakuten'],['ご','go','Dakuten'],
  ['ざ','za','Dakuten'],['じ','ji','Dakuten'],['ず','zu','Dakuten'],['ぜ','ze','Dakuten'],['ぞ','zo','Dakuten'],
  ['だ','da','Dakuten'],['ぢ','ji','Dakuten'],['づ','zu','Dakuten'],['で','de','Dakuten'],['ど','do','Dakuten'],
  ['ば','ba','Dakuten'],['び','bi','Dakuten'],['ぶ','bu','Dakuten'],['べ','be','Dakuten'],['ぼ','bo','Dakuten'],
  ['ぱ','pa','Handakuten'],['ぴ','pi','Handakuten'],['ぷ','pu','Handakuten'],['ぺ','pe','Handakuten'],['ぽ','po','Handakuten'],
  ['きゃ','kya','Combinations'],['きゅ','kyu','Combinations'],['きょ','kyo','Combinations'],
  ['しゃ','sha','Combinations'],['しゅ','shu','Combinations'],['しょ','sho','Combinations'],
  ['ちゃ','cha','Combinations'],['ちゅ','chu','Combinations'],['ちょ','cho','Combinations'],
  ['にゃ','nya','Combinations'],['にゅ','nyu','Combinations'],['にょ','nyo','Combinations'],
  ['ひゃ','hya','Combinations'],['ひゅ','hyu','Combinations'],['ひょ','hyo','Combinations'],
  ['みゃ','mya','Combinations'],['みゅ','myu','Combinations'],['みょ','myo','Combinations'],
  ['りゃ','rya','Combinations'],['りゅ','ryu','Combinations'],['りょ','ryo','Combinations'],
  ['ぎゃ','gya','Combinations'],['ぎゅ','gyu','Combinations'],['ぎょ','gyo','Combinations'],
  ['じゃ','ja','Combinations'],['じゅ','ju','Combinations'],['じょ','jo','Combinations'],
  ['びゃ','bya','Combinations'],['びゅ','byu','Combinations'],['びょ','byo','Combinations'],
  ['ぴゃ','pya','Combinations'],['ぴゅ','pyu','Combinations'],['ぴょ','pyo','Combinations'],
  ['っ','small tsu','Small っ'],
].map(([h,r,group])=>({h,r,group}));

const GROUPS=['Vowels','K row','S row','T row','N row','H row','M row','Y row','R row','W / N','Dakuten','Handakuten','Combinations','Small っ'];
export const hiraToKata=(s:string)=>s.replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+0x60));
const shuffle=<T,>(rows:T[])=>{const x=[...rows];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x};

function TracePad({character,clearLabel}:{character:string;clearLabel:string}){
  const canvas=useRef<HTMLCanvasElement>(null);
  const drawing=useRef(false);
  const clear=()=>{const c=canvas.current;if(!c)return;const ctx=c.getContext('2d');ctx?.clearRect(0,0,c.width,c.height)};
  const point=(e:React.PointerEvent<HTMLCanvasElement>)=>{const c=canvas.current!;const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*(c.width/r.width),y:(e.clientY-r.top)*(c.height/r.height)}};
  const down=(e:React.PointerEvent<HTMLCanvasElement>)=>{drawing.current=true;const c=canvas.current!,ctx=c.getContext('2d');if(!ctx)return;const p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y);c.setPointerCapture?.(e.pointerId)};
  const move=(e:React.PointerEvent<HTMLCanvasElement>)=>{if(!drawing.current)return;const c=canvas.current!,ctx=c.getContext('2d');if(!ctx)return;const p=point(e);ctx.lineWidth=12;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='rgba(238,245,248,.9)';ctx.lineTo(p.x,p.y);ctx.stroke()};
  return <div className="kana-trace-pad"><div className="kana-trace-stage"><span className="font-jp">{character}</span><canvas aria-label={`${character} tracing canvas`} ref={canvas} width={480} height={480} onPointerDown={down} onPointerMove={move} onPointerUp={()=>drawing.current=false} onPointerCancel={()=>drawing.current=false}/></div><button onClick={clear}><Eraser size={16}/> {clearLabel}</button></div>;
}

export default function KanaAcademy({onAttempt}:Props){
  const {language,text}=useLanguage();
  const [script,setScript]=useState<ScriptMode>('hiragana');
  const [group,setGroup]=useState('Vowels');
  const [selected,setSelected]=useState(0);
  const [quizSeed,setQuizSeed]=useState(0);
  const [choice,setChoice]=useState<string|null>(null);
  const [done,setDone]=useState<Record<string,boolean>>({});

  useEffect(()=>{try{setDone(JSON.parse(localStorage.getItem('nihongo_kana_academy_v1')||'{}'))}catch{}},[]);
  const items=useMemo(()=>KANA_BASE.map(x=>({...x,char:script==='hiragana'?x.h:hiraToKata(x.h)})),[script]);
  const groupItems=items.filter(x=>x.group===group);
  const card=groupItems[Math.min(selected,Math.max(0,groupItems.length-1))]||items[0];
  const quiz=useMemo(()=>{const rows=shuffle(items);return rows[quizSeed%Math.max(1,rows.length)]||items[0]},[items,quizSeed]);
  const options=useMemo(()=>shuffle([quiz.r,...shuffle(items.filter(x=>x.r!==quiz.r).map(x=>x.r)).slice(0,3)]),[items,quiz]);
  const completed=Object.keys(done).filter(k=>k.startsWith(`${script}:`)&&done[k]).length;
  const total=items.length;
  const markDone=()=>{const key=`${script}:${card.h}`;setDone(prev=>{const next={...prev,[key]:true};try{localStorage.setItem('nihongo_kana_academy_v1',JSON.stringify(next))}catch{};return next})};
  const answer=(value:string)=>{if(choice)return;setChoice(value);const ok=value===quiz.r;onAttempt?.({itemId:`${script}:${quiz.h}`,userAnswer:value,correctAnswer:quiz.r,correct:ok,questionType:'kana-character-to-sound'});track('practice_result',{practice_type:'kana_recognition',result:ok?'correct':'wrong',script,character:quiz.char});};
  const nextQuiz=()=>{setChoice(null);setQuizSeed(x=>x+1)};
  useEffect(()=>{
    if(!choice||choice!==quiz.r)return;
    const timer=window.setTimeout(nextQuiz,900);
    return()=>window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[choice]);

  return <div className="kana-academy-v64 space-y-5">
    <section className="study-header tone-kana">
      <div><div className="section-kicker">{text('বিগিনার কানা একাডেমি','BEGINNER KANA ACADEMY')}</div><h1>{text('Kana শিখুন → চিনুন → ট্রেস করুন','Learn Kana → Recognise → Trace')}</h1><p className={language==='bn'?'font-bn':''}>{text('KanaPad হলো typing tool। এখানে Hiragana ও Katakana ধাপে ধাপে শিখুন, sound শুনুন, recognition practice করুন এবং motor-memory tracing করুন।','KanaPad is a typing tool. Here you can learn Hiragana and Katakana step by step, hear each sound, practise recognition, and build motor memory through tracing.')}</p></div><GraduationCap className="header-big-icon"/>
    </section>

    <section className="kana-academy-command">
      <div className="kana-script-tabs"><button className={script==='hiragana'?'active':''} onClick={()=>{setScript('hiragana');setSelected(0)}}>ひらがな <span>Hiragana</span></button><button className={script==='katakana'?'active':''} onClick={()=>{setScript('katakana');setSelected(0)}}>カタカナ <span>Katakana</span></button></div>
      <div className="kana-academy-progress"><div><span>{text('অগ্রগতি','Progress')}</span><b>{completed}/{total}</b></div><i><em style={{width:`${Math.round(completed/Math.max(1,total)*100)}%`}}/></i></div>
    </section>

    <section className="kana-academy-layout">
      <aside className="kana-group-rail">{GROUPS.map(name=>{const count=items.filter(x=>x.group===name).length;return <button key={name} className={group===name?'active':''} onClick={()=>{setGroup(name);setSelected(0)}}><span>{name}</span><small>{count}</small></button>})}</aside>
      <div className="kana-learn-panel">
        <div className="kana-card-browser">{groupItems.map((item,index)=><button key={item.h} className={selected===index?'active':''} onClick={()=>setSelected(index)}><b className="font-jp">{item.char}</b><span>{item.r}</span>{done[`${script}:${item.h}`]&&<CheckCircle2/>}</button>)}</div>
        <article className="kana-focus-card"><div className="kana-focus-glyph font-jp">{card.char}</div><div className="kana-focus-copy"><span>{group}</span><h2>{card.r}</h2><p className={language==='bn'?'font-bn':''}>{text('চরিত্রটি দেখে sound বলুন, তারপর audio শুনে মিলিয়ে নিন।','Say the sound from the character, then listen to the audio and compare.')}</p><div><button aria-label={text(`${card.char} এর উচ্চারণ শুনুন`,`Listen to ${card.char}`)} onClick={()=>playText(card.char,1,'kana',{}, {script,character:card.char})}><Volume2/> {text('শুনুন','Listen')}</button><button onClick={markDone}><CheckCircle2/> {text('শেখা হয়েছে','Mark learned')}</button></div></div></article>
        <div className="kana-trace-section"><header><div><span>{text('ট্রেস প্র্যাকটিস','TRACE PRACTICE')}</span><h3 className={language==='bn'?'font-bn':''}>{text('হাতের movement দিয়ে shape মনে রাখুন','Remember the shape through hand movement')}</h3></div><PencilLine/></header><TracePad character={card.char} clearLabel={text('ট্রেস মুছুন','Clear tracing')}/><small className={language==='bn'?'font-bn':''}>{text('এটি tracing practice; এখানে handwriting recognition score দাবি করা হচ্ছে না।','This is tracing practice; it does not claim to score handwriting recognition.')}</small></div>
      </div>
    </section>

    <section className="kana-recognition-lab">
      <header><div><span>{text('দ্রুত রিকগনিশন','QUICK RECOGNITION')}</span><h2 className={language==='bn'?'font-bn':''}>{text('এই Kana-র sound কোনটি?','Which sound belongs to this Kana?')}</h2></div><Shuffle/></header>
      <div className="kana-quiz-glyph font-jp">{quiz.char}</div>
      <div className="kana-quiz-options">{options.map(option=>{const chosen=choice===option;const correct=choice&&option===quiz.r;return <button key={option} className={`${chosen?'chosen':''} ${correct?'correct':''} ${chosen&&!correct?'wrong':''}`} onClick={()=>answer(option)} disabled={!!choice}>{option}{choice&&(option===quiz.r?<CheckCircle2/>:chosen?<XCircle/>:null)}</button>})}</div>
      {choice&&<div className={`kana-quiz-result ${choice===quiz.r?'ok':'bad'}`}><div>{choice===quiz.r?<CheckCircle2/>:<RotateCcw/>}<span><b>{choice===quiz.r?text('সঠিক','Correct'):text('Kana-টি আবার দেখুন','Review this Kana')}</b><small>{quiz.char} = {quiz.r}</small></span></div><button onClick={nextQuiz}>{text('পরেরটি','Next')} <Sparkles size={15}/></button></div>}
    </section>
  </div>;
}
