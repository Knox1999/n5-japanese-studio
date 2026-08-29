'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Gamepad2, RotateCcw, Shuffle, Sparkles, Trophy, XCircle } from 'lucide-react';
import type { LessonPayload } from '@/lib/types';
import { track } from '@/lib/analytics';

type GameMode='meaning-match'|'quick-recognition'|'particle-pick';
type Attempt={itemId:string;userAnswer:string;correctAnswer:string;correct:boolean;questionType:string;skill:'game'|'particles'};
type Props={data:LessonPayload;onAttempt?:(attempt:Attempt)=>void};

type Q={id:string;prompt:string;correct:string;options:string[];skill:'game'|'particles';type:string};
const shuffle=<T,>(rows:T[])=>{const x=[...rows];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x};
function choices(correct:string,pool:string[]){return shuffle([correct,...shuffle(Array.from(new Set(pool.filter(x=>x&&x!==correct)))).slice(0,3)]);}

function buildMeaning(data:LessonPayload):Q[]{
  return shuffle(data.vocabulary).slice(0,18).map(v=>({id:`meaning:${v.id}`,prompt:v.kanji||v.japanese,correct:v.bangla_meaning,options:choices(v.bangla_meaning,data.vocabulary.map(x=>x.bangla_meaning)),skill:'game',type:'meaning-match'}));
}
function buildRecognition(data:LessonPayload):Q[]{
  return shuffle(data.vocabulary).slice(0,18).map(v=>({id:`recognition:${v.id}`,prompt:v.bangla_meaning,correct:v.kanji||v.japanese,options:choices(v.kanji||v.japanese,data.vocabulary.map(x=>x.kanji||x.japanese)),skill:'game',type:'quick-recognition'}));
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

const MODES:{id:GameMode;title:string;bn:string;desc:string}[]=[
  {id:'meaning-match',title:'Meaning Match',bn:'অর্থ মিলান',desc:'Japanese word দেখে দ্রুত বাংলা meaning বেছে নিন।'},
  {id:'quick-recognition',title:'Quick Recognition',bn:'দ্রুত চিনুন',desc:'Meaning থেকে Japanese word recall করুন।'},
  {id:'particle-pick',title:'Particle Pick',bn:'Particle Challenge',desc:'Sentence-এর missing particle বেছে নিন।'},
];

export default function PracticeArcade({data,onAttempt}:Props){
  const [mode,setMode]=useState<GameMode|null>(null);
  const [seed,setSeed]=useState(0);
  const [index,setIndex]=useState(0);
  const [score,setScore]=useState(0);
  const [choice,setChoice]=useState<string|null>(null);
  const [finished,setFinished]=useState(false);
  const questions=useMemo(()=>{
    const rows=mode==='meaning-match'?buildMeaning(data):mode==='quick-recognition'?buildRecognition(data):mode==='particle-pick'?buildParticles(data):[];
    if(!rows.length)return rows;
    const offset=seed%rows.length;
    return [...rows.slice(offset),...rows.slice(0,offset)];
  },[data,mode,seed]);
  const q=questions[index];
  const start=(next:GameMode)=>{setMode(next);setSeed(x=>x+1);setIndex(0);setScore(0);setChoice(null);setFinished(false);track('section_open',{section_name:'practice_arcade',game_mode:next,lesson_number:data.lesson})};
  const answer=(value:string)=>{if(!q||choice)return;setChoice(value);const ok=value===q.correct;if(ok)setScore(x=>x+1);onAttempt?.({itemId:q.id,userAnswer:value,correctAnswer:q.correct,correct:ok,questionType:q.type,skill:q.skill});track('practice_result',{practice_type:`arcade_${q.type}`,result:ok?'correct':'wrong',lesson_number:data.lesson});};
  const next=()=>{if(index+1>=questions.length){setFinished(true);track('game_completed',{lesson_number:data.lesson,game_mode:mode,score,total:questions.length});return}setIndex(x=>x+1);setChoice(null)};

  if(!mode)return <div className="practice-arcade-v64 space-y-5"><section className="study-header tone-arcade"><div><div className="section-kicker">PRACTICE ARCADE · ORIGINAL GAME SYSTEM</div><h1>Short games. Real learning value.</h1><p className="font-bn">সব game existing lesson data থেকে তৈরি হয়। Result mistake history এবং future repair flow-তে ব্যবহার করা যায়—এগুলো disconnected entertainment নয়।</p></div><Gamepad2 className="header-big-icon"/></section><div className="arcade-mode-grid">{MODES.map(m=><button key={m.id} onClick={()=>start(m.id)}><div><Gamepad2/><span>{m.title}</span></div><h2 className="font-bn">{m.bn}</h2><p className="font-bn">{m.desc}</p><em>Start game →</em></button>)}</div></div>;

  if(!questions.length)return <div className="empty-state"><Gamepad2/><b>এই lesson-এ এই game-এর জন্য যথেষ্ট data নেই</b><button className="premium-btn premium-btn-secondary" onClick={()=>setMode(null)}>সব game দেখুন</button></div>;

  if(finished)return <div className="practice-arcade-v64"><section className="arcade-result-card"><Trophy/><span>SESSION COMPLETE</span><h1>{score}/{questions.length}</h1><p className="font-bn">{Math.round(score/questions.length*100)}% accuracy · ভুলগুলো repair candidate হিসেবে record হয়েছে।</p><div><button onClick={()=>start(mode)}><RotateCcw/> Play again</button><button onClick={()=>setMode(null)}>All games</button></div></section></div>;

  return <div className="practice-arcade-v64"><section className="arcade-runner"><header><div><span>{MODES.find(x=>x.id===mode)?.title}</span><b>{index+1}/{questions.length}</b></div><div className="arcade-score"><Sparkles/> {score}</div></header><div className="arcade-progress"><i style={{width:`${((index+1)/questions.length)*100}%`}}/></div><article><small>{q.type.replaceAll('-',' ').toUpperCase()}</small><h2 className={/[ぁ-んァ-ヶ一-龯]/.test(q.prompt)?'font-jp':'font-bn'}>{q.prompt}</h2><div className="arcade-options">{q.options.map(option=>{const selected=choice===option;const correct=choice&&option===q.correct;return <button key={option} disabled={!!choice} onClick={()=>answer(option)} className={`${selected?'selected':''} ${correct?'correct':''} ${selected&&!correct?'wrong':''}`}><span className={/[ぁ-んァ-ヶ一-龯]/.test(option)?'font-jp':'font-bn'}>{option}</span>{choice&&(option===q.correct?<CheckCircle2/>:selected?<XCircle/>:null)}</button>})}</div>{choice&&<div className={`arcade-feedback ${choice===q.correct?'ok':'bad'}`}><span>{choice===q.correct?'Nice — keep the pace.':`Correct answer: ${q.correct}`}</span><button onClick={next}>{index+1>=questions.length?'See result':'Next'} →</button></div>}</article><footer><button onClick={()=>setMode(null)}><Shuffle/> Change game</button></footer></section></div>;
}
