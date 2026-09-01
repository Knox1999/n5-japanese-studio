'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Gamepad2, RotateCcw, Shuffle, Sparkles, Trophy, XCircle } from 'lucide-react';
import type { LessonPayload } from '@/lib/types';
import { track } from '@/lib/analytics';
import { useLanguage, type AppLanguage } from '@/lib/language';

type GameMode='meaning-match'|'quick-recognition'|'particle-pick';
type Attempt={itemId:string;userAnswer:string;correctAnswer:string;correct:boolean;questionType:string;skill:'game'|'particles'};
type Props={data:LessonPayload;onAttempt?:(attempt:Attempt)=>void};

type Q={id:string;prompt:string;correct:string;options:string[];skill:'game'|'particles';type:string};
const shuffle=<T,>(rows:T[])=>{const x=[...rows];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x};
function choices(correct:string,pool:string[]){return shuffle([correct,...shuffle(Array.from(new Set(pool.filter(x=>x&&x!==correct)))).slice(0,3)]);}

function meaning(v:LessonPayload['vocabulary'][number],language:AppLanguage){return language==='bn'?v.bangla_meaning:v.english_meaning}
function buildMeaning(data:LessonPayload,language:AppLanguage):Q[]{
  return shuffle(data.vocabulary).slice(0,18).map(v=>({id:`meaning:${v.id}`,prompt:v.kanji||v.japanese,correct:meaning(v,language),options:choices(meaning(v,language),data.vocabulary.map(x=>meaning(x,language))),skill:'game',type:'meaning-match'}));
}
function buildRecognition(data:LessonPayload,language:AppLanguage):Q[]{
  return shuffle(data.vocabulary).slice(0,18).map(v=>({id:`recognition:${v.id}`,prompt:meaning(v,language),correct:v.kanji||v.japanese,options:choices(v.kanji||v.japanese,data.vocabulary.map(x=>x.kanji||x.japanese)),skill:'game',type:'quick-recognition'}));
}
function buildParticles(data:LessonPayload):Q[]{
  const particles=['は','が','を','に','で','へ','と','も','の'];
  const rows=(data.content.grammar||[]).flatMap((g,i)=>{
    const ex=String(g[2]||'');
    const found=particles.find(p=>ex.includes(p));
    if(!found)return[];
    const prompt=ex.replace(found,'＿');
    return [{id:`particle:${i}:${found}`,prompt,correct:found,options:choices(found,particles),skill:'particles' as const,type:'particle-pick'}];
  });
  return shuffle(rows).slice(0,18);
}

const MODES:{id:GameMode;title:string;bn:string;desc:string;descEn:string}[]=[
  {id:'meaning-match',title:'Meaning Match',bn:'অর্থ মিলান',desc:'Japanese word দেখে দ্রুত বাংলা অর্থ বেছে নিন।',descEn:'See a Japanese word and quickly choose its English meaning.'},
  {id:'quick-recognition',title:'Quick Recognition',bn:'দ্রুত চিনুন',desc:'অর্থ দেখে Japanese word মনে করুন।',descEn:'Recall the Japanese word from its English meaning.'},
  {id:'particle-pick',title:'Particle Pick',bn:'Particle Challenge',desc:'বাক্যের শূন্যস্থানের particle বেছে নিন।',descEn:'Choose the particle missing from the sentence.'},
];

export default function PracticeArcade({data,onAttempt}:Props){
  const {language,text}=useLanguage();
  const [mode,setMode]=useState<GameMode|null>(null);
  const [seed,setSeed]=useState(0);
  const [index,setIndex]=useState(0);
  const [score,setScore]=useState(0);
  const [choice,setChoice]=useState<string|null>(null);
  const [finished,setFinished]=useState(false);
  const questions=useMemo(()=>{
    const rows=mode==='meaning-match'?buildMeaning(data,language):mode==='quick-recognition'?buildRecognition(data,language):mode==='particle-pick'?buildParticles(data):[];
    if(!rows.length)return rows;
    const offset=seed%rows.length;
    return [...rows.slice(offset),...rows.slice(0,offset)];
  },[data,language,mode,seed]);
  const q=questions[index];
  const start=(next:GameMode)=>{setMode(next);setSeed(x=>x+1);setIndex(0);setScore(0);setChoice(null);setFinished(false);track('section_open',{section_name:'practice_arcade',game_mode:next,lesson_number:data.lesson})};
  const answer=(value:string)=>{if(!q||choice)return;setChoice(value);const ok=value===q.correct;if(ok)setScore(x=>x+1);onAttempt?.({itemId:q.id,userAnswer:value,correctAnswer:q.correct,correct:ok,questionType:q.type,skill:q.skill});track('practice_result',{practice_type:`arcade_${q.type}`,result:ok?'correct':'wrong',lesson_number:data.lesson});};
  const next=()=>{if(index+1>=questions.length){setFinished(true);track('game_completed',{lesson_number:data.lesson,game_mode:mode,score,total:questions.length});return}setIndex(x=>x+1);setChoice(null)};

  if(!mode)return <div className="practice-arcade-v64 space-y-5"><section className="study-header tone-arcade"><div><div className="section-kicker">PRACTICE ARCADE · ORIGINAL GAME SYSTEM</div><h1>{text('ছোট গেম, বাস্তব শেখার ফল।','Short games. Real learning value.')}</h1><p className={language==='bn'?'font-bn':''}>{text('সব গেম বর্তমান লেসনের তথ্য দিয়ে তৈরি। ফলাফল ভুলের ইতিহাস ও ভবিষ্যৎ রিভিশনে কাজে লাগে—এগুলো বিচ্ছিন্ন বিনোদন নয়।','Every game uses the current lesson data. Results feed your mistake history and future repair flow, so practice stays connected to learning.')}</p></div><Gamepad2 className="header-big-icon"/></section><div className="arcade-mode-grid">{MODES.map(m=><button key={m.id} onClick={()=>start(m.id)}><div><Gamepad2/><span>{m.title}</span></div><h2 className={language==='bn'?'font-bn':''}>{language==='bn'?m.bn:m.title}</h2><p className={language==='bn'?'font-bn':''}>{language==='bn'?m.desc:m.descEn}</p><em>{text('গেম শুরু করুন →','Start game →')}</em></button>)}</div></div>;

  if(!questions.length)return <div className="empty-state"><Gamepad2/><b>{text('এই লেসনে এই গেমের জন্য যথেষ্ট তথ্য নেই','This lesson does not have enough data for this game')}</b><button className="premium-btn premium-btn-secondary" onClick={()=>setMode(null)}>{text('সব গেম দেখুন','View all games')}</button></div>;

  if(finished)return <div className="practice-arcade-v64"><section className="arcade-result-card"><Trophy/><span>{text('সেশন সম্পন্ন','SESSION COMPLETE')}</span><h1>{score}/{questions.length}</h1><p className={language==='bn'?'font-bn':''}>{Math.round(score/questions.length*100)}% {text('নির্ভুলতা · ভুলগুলো রিভিশনের জন্য সংরক্ষিত হয়েছে।','accuracy · Mistakes were saved for focused review.')}</p><div><button onClick={()=>start(mode)}><RotateCcw/> {text('আবার খেলুন','Play again')}</button><button onClick={()=>setMode(null)}>{text('সব গেম','All games')}</button></div></section></div>;

  return <div className="practice-arcade-v64"><section className="arcade-runner"><header><div><span>{language==='bn'?MODES.find(x=>x.id===mode)?.bn:MODES.find(x=>x.id===mode)?.title}</span><b>{index+1}/{questions.length}</b></div><div className="arcade-score"><Sparkles/> {score}</div></header><div className="arcade-progress"><i style={{width:`${((index+1)/questions.length)*100}%`}}/></div><article><small>{q.type.replaceAll('-',' ').toUpperCase()}</small><h2 className={/[ぁ-んァ-ヶ一-龯]/.test(q.prompt)?'font-jp':language==='bn'?'font-bn':''}>{q.prompt}</h2><div className="arcade-options">{q.options.map(option=>{const selected=choice===option;const correct=choice&&option===q.correct;return <button key={option} disabled={!!choice} onClick={()=>answer(option)} className={`${selected?'selected':''} ${correct?'correct':''} ${selected&&!correct?'wrong':''}`}><span className={/[ぁ-んァ-ヶ一-龯]/.test(option)?'font-jp':language==='bn'?'font-bn':''}>{option}</span>{choice&&(option===q.correct?<CheckCircle2/>:selected?<XCircle/>:null)}</button>})}</div>{choice&&<div className={`arcade-feedback ${choice===q.correct?'ok':'bad'}`}><span>{choice===q.correct?text('দারুণ—গতি ধরে রাখুন।','Nice—keep the pace.'):text(`সঠিক উত্তর: ${q.correct}`,`Correct answer: ${q.correct}`)}</span><button onClick={next}>{index+1>=questions.length?text('ফল দেখুন','See result'):text('পরেরটি','Next')} →</button></div>}</article><footer><button onClick={()=>setMode(null)}><Shuffle/> {text('গেম বদলান','Change game')}</button></footer></section></div>;
}
