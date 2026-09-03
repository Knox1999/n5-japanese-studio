'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Gamepad2, Headphones, RotateCcw, Shuffle, Sparkles, Trophy, XCircle } from 'lucide-react';
import type { LearningSkill, LessonPayload } from '@/lib/types';
import { playText } from '@/lib/audio';
import { track } from '@/lib/analytics';
import { sessionXpReward } from '@/lib/gamification';
import { KANA_BASE } from './KanaAcademy';
import { useLanguage, type AppLanguage } from '@/lib/language';

type GameMode='meaning-match'|'quick-recognition'|'particle-pick'|'kanji-quiz'|'listening-challenge'|'kana-match'|'vocab-memory';
type Attempt={itemId:string;userAnswer:string;correctAnswer:string;correct:boolean;questionType:string;skill:LearningSkill};
type Props={data:LessonPayload;onAttempt?:(attempt:Attempt)=>void};

type Q={id:string;prompt:string;correct:string;options:string[];skill:LearningSkill;type:string;audio?:string};
type MemoryPair={id:string;a:string;b:string;aJp?:boolean;bJp?:boolean};
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
function buildKanjiQuiz(data:LessonPayload,language:AppLanguage):Q[]{
  // The per-lesson `data.kanji` field is unpopulated in this dataset; the kanji
  // actually taught in a lesson live inside its vocabulary's kanji spellings.
  const rows=data.vocabulary.filter(v=>v.kanji&&v.kanji!==v.japanese);
  const pool=rows.map(v=>meaning(v,language));
  return shuffle(rows).slice(0,18).map(v=>({id:`kanji:${v.id}`,prompt:v.kanji||v.japanese,correct:meaning(v,language),options:choices(meaning(v,language),pool),skill:'kanji',type:'kanji-quiz'}));
}
function buildListening(data:LessonPayload):Q[]{
  const rows=(data.content.dialogue_extended||data.content.dialogue||[]).filter(r=>r[1]&&r[2]);
  const pool=rows.map(r=>r[2]);
  return shuffle(rows).slice(0,14).map((r,i)=>({id:`listening:${i}`,prompt:r[1],audio:r[1],correct:r[2],options:choices(r[2],pool),skill:'listening',type:'listening-challenge'}));
}
function buildKanaPairs():MemoryPair[]{
  return shuffle(KANA_BASE).slice(0,8).map(k=>({id:`kana:${k.h}`,a:k.h,b:k.r,aJp:true}));
}
function buildVocabPairs(data:LessonPayload,language:AppLanguage):MemoryPair[]{
  return shuffle(data.vocabulary).slice(0,8).map(v=>({id:`vocab:${v.id}`,a:v.kanji||v.japanese,b:meaning(v,language),aJp:true}));
}

const MCQ_MODES=new Set<GameMode>(['meaning-match','quick-recognition','particle-pick','kanji-quiz','listening-challenge']);
const MEMORY_MODES=new Set<GameMode>(['kana-match','vocab-memory']);

const MODES:{id:GameMode;title:string;bn:string;desc:string;descEn:string}[]=[
  {id:'kana-match',title:'Kana Matching',bn:'কানা মিলান',desc:'Kana ও তার sound-এর জোড়া খুঁজে বের করুন।',descEn:'Find the matching pairs of kana and their sounds.'},
  {id:'vocab-memory',title:'Vocabulary Memory',bn:'শব্দ মেমরি গেম',desc:'শব্দ ও অর্থের জোড়া মনে রেখে মিলান।',descEn:'Match each word to its meaning from memory.'},
  {id:'meaning-match',title:'Meaning Match',bn:'অর্থ মিলান',desc:'Japanese word দেখে দ্রুত বাংলা অর্থ বেছে নিন।',descEn:'See a Japanese word and quickly choose its English meaning.'},
  {id:'quick-recognition',title:'Quick Recognition',bn:'দ্রুত চিনুন',desc:'অর্থ দেখে Japanese word মনে করুন।',descEn:'Recall the Japanese word from its English meaning.'},
  {id:'kanji-quiz',title:'Kanji Quiz',bn:'কাঞ্জি কুইজ',desc:'Kanji দেখে সঠিক অর্থ বেছে নিন।',descEn:'See a kanji and choose its correct meaning.'},
  {id:'listening-challenge',title:'Listening Challenge',bn:'লিসেনিং চ্যালেঞ্জ',desc:'অডিও শুনে সঠিক অর্থ বেছে নিন।',descEn:'Listen to the audio and choose the correct meaning.'},
  {id:'particle-pick',title:'Particle Pick',bn:'Particle Challenge',desc:'বাক্যের শূন্যস্থানের particle বেছে নিন।',descEn:'Choose the particle missing from the sentence.'},
];

function ResultCard({score,total,onReplay,onExit}:{score:number;total:number;onReplay:()=>void;onExit:()=>void}){
  const {language,text}=useLanguage();
  const xp=sessionXpReward(score,total);
  return <section className="arcade-result-card">
    <Trophy/><span>{text('সেশন সম্পন্ন','SESSION COMPLETE')}</span>
    <h1>{score}/{total}</h1>
    <p className={language==='bn'?'font-bn':''}>{Math.round(score/Math.max(1,total)*100)}% {text('নির্ভুলতা · ভুলগুলো রিভিশনের জন্য সংরক্ষিত হয়েছে।','accuracy · Mistakes were saved for focused review.')}</p>
    <div className="arcade-xp-pill"><Sparkles size={15}/> +{xp} XP</div>
    <div><button onClick={onReplay}><RotateCcw/> {text('আবার খেলুন','Play again')}</button><button onClick={onExit}>{text('সব গেম','All games')}</button></div>
  </section>;
}

function MemoryGame({mode,pairs,data,onAttempt,onExit}:{mode:GameMode;pairs:MemoryPair[];data:LessonPayload;onAttempt?:(a:Attempt)=>void;onExit:()=>void}){
  const {language,text}=useLanguage();
  type Card={id:string;pairId:string;label:string;jp?:boolean};
  const [cards,setCards]=useState<Card[]>([]);
  const [flipped,setFlipped]=useState<string[]>([]);
  const [matched,setMatched]=useState<Set<string>>(new Set());
  const [moves,setMoves]=useState(0);
  const [locked,setLocked]=useState(false);
  const [finished,setFinished]=useState(false);

  const reset=()=>{
    setCards(shuffle(pairs.flatMap(p=>[{id:`${p.id}:a`,pairId:p.id,label:p.a,jp:p.aJp},{id:`${p.id}:b`,pairId:p.id,label:p.b,jp:p.bJp}])));
    setFlipped([]);setMatched(new Set());setMoves(0);setLocked(false);setFinished(false);
    track('section_open',{section_name:'practice_arcade',game_mode:mode,lesson_number:data.lesson});
  };
  useEffect(reset,[pairs]); // eslint-disable-line react-hooks/exhaustive-deps

  const skill:LearningSkill=mode==='kana-match'?'kana':'game';
  const flip=(card:Card)=>{
    if(locked||finished||flipped.includes(card.id)||matched.has(card.pairId))return;
    if(!flipped.length){setFlipped([card.id]);return}
    const first=cards.find(c=>c.id===flipped[0])!;
    setFlipped([flipped[0],card.id]);
    setLocked(true);
    const ok=first.pairId===card.pairId;
    const nextMoves=moves+1;
    setMoves(nextMoves);
    window.setTimeout(()=>{
      onAttempt?.({itemId:first.pairId,userAnswer:card.label,correctAnswer:first.label,correct:ok,questionType:`${mode}`,skill});
      track('practice_result',{practice_type:`arcade_${mode}`,result:ok?'correct':'wrong',lesson_number:data.lesson});
      if(ok){
        const next=new Set(matched);next.add(first.pairId);setMatched(next);
        if(next.size===pairs.length){setFinished(true);track('game_completed',{lesson_number:data.lesson,game_mode:mode,score:pairs.length,total:pairs.length,moves:nextMoves})}
      }
      setFlipped([]);setLocked(false);
    },650);
  };

  if(finished)return <ResultCard score={pairs.length} total={pairs.length} onReplay={reset} onExit={onExit}/>;

  return <section className="arcade-runner">
    <header><div><span>{language==='bn'?MODES.find(x=>x.id===mode)?.bn:MODES.find(x=>x.id===mode)?.title}</span><b>{matched.size}/{pairs.length}</b></div><div className="arcade-score"><Sparkles/> {text(`${moves} চাল`,`${moves} moves`)}</div></header>
    <div className="arcade-progress"><i style={{width:`${(matched.size/pairs.length)*100}%`}}/></div>
    <article>
      <small>{text('জোড়া খুঁজুন','FIND THE PAIRS')}</small>
      <div className="memory-grid">{cards.map(card=>{
        const shown=flipped.includes(card.id)||matched.has(card.pairId);
        return <button key={card.id} type="button" disabled={shown} className={`memory-card ${shown?'flipped':''} ${matched.has(card.pairId)?'matched':''}`} onClick={()=>flip(card)}>
          <span className={shown?(card.jp?'font-jp':language==='bn'?'font-bn':''):''}>{shown?card.label:'?'}</span>
        </button>;
      })}</div>
    </article>
    <footer><button onClick={onExit}><Shuffle/> {text('গেম বদলান','Change game')}</button></footer>
  </section>;
}

export default function PracticeArcade({data,onAttempt}:Props){
  const {language,text}=useLanguage();
  const [mode,setMode]=useState<GameMode|null>(null);
  const [seed,setSeed]=useState(0);
  const [index,setIndex]=useState(0);
  const [score,setScore]=useState(0);
  const [choice,setChoice]=useState<string|null>(null);
  const [finished,setFinished]=useState(false);
  const questions=useMemo(()=>{
    if(!mode||!MCQ_MODES.has(mode))return[];
    const rows=mode==='meaning-match'?buildMeaning(data,language):mode==='quick-recognition'?buildRecognition(data,language):mode==='particle-pick'?buildParticles(data):mode==='kanji-quiz'?buildKanjiQuiz(data,language):buildListening(data);
    if(!rows.length)return rows;
    const offset=seed%rows.length;
    return [...rows.slice(offset),...rows.slice(0,offset)];
  },[data,language,mode,seed]);
  const memoryPairs=useMemo(()=>{
    if(mode==='kana-match')return buildKanaPairs();
    if(mode==='vocab-memory')return buildVocabPairs(data,language);
    return[];
    // `seed` intentionally forces a reshuffle on every "Play again" click.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[mode,data,language,seed]);
  const q=questions[index];
  const start=(next:GameMode)=>{setMode(next);setSeed(x=>x+1);setIndex(0);setScore(0);setChoice(null);setFinished(false);if(MCQ_MODES.has(next))track('section_open',{section_name:'practice_arcade',game_mode:next,lesson_number:data.lesson})};
  const answer=(value:string)=>{if(!q||choice)return;setChoice(value);const ok=value===q.correct;if(ok)setScore(x=>x+1);onAttempt?.({itemId:q.id,userAnswer:value,correctAnswer:q.correct,correct:ok,questionType:q.type,skill:q.skill});track('practice_result',{practice_type:`arcade_${q.type}`,result:ok?'correct':'wrong',lesson_number:data.lesson});};
  const next=()=>{if(index+1>=questions.length){setFinished(true);track('game_completed',{lesson_number:data.lesson,game_mode:mode,score,total:questions.length});return}setIndex(x=>x+1);setChoice(null)};
  useEffect(()=>{
    if(!q||!choice||choice!==q.correct)return;
    const timer=window.setTimeout(next,900);
    return()=>window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[choice]);

  if(!mode)return <div className="practice-arcade-v64 space-y-5"><section className="study-header tone-arcade"><div><div className="section-kicker">{text('প্র্যাকটিস আর্কেড','PRACTICE ARCADE')} · {text('অরিজিনাল গেম সিস্টেম','ORIGINAL GAME SYSTEM')}</div><h1>{text('ছোট গেম, বাস্তব শেখার ফল।','Short games. Real learning value.')}</h1><p className={language==='bn'?'font-bn':''}>{text('সব গেম বর্তমান লেসনের তথ্য দিয়ে তৈরি। ফলাফল ভুলের ইতিহাস ও ভবিষ্যৎ রিভিশনে কাজে লাগে—এগুলো বিচ্ছিন্ন বিনোদন নয়।','Every game uses the current lesson data. Results feed your mistake history and future repair flow, so practice stays connected to learning.')}</p></div><Gamepad2 className="header-big-icon"/></section><div className="arcade-mode-grid">{MODES.map(m=><button key={m.id} onClick={()=>start(m.id)}><div><Gamepad2/></div><h2 className={language==='bn'?'font-bn':''}>{language==='bn'?m.bn:m.title}</h2><p className={language==='bn'?'font-bn':''}>{language==='bn'?m.desc:m.descEn}</p><em>{text('গেম শুরু করুন →','Start game →')}</em></button>)}</div></div>;

  if(MEMORY_MODES.has(mode)){
    if(!memoryPairs.length)return <div className="empty-state"><Gamepad2/><b>{text('এই লেসনে এই গেমের জন্য যথেষ্ট তথ্য নেই','This lesson does not have enough data for this game')}</b><button className="premium-btn premium-btn-secondary" onClick={()=>setMode(null)}>{text('সব গেম দেখুন','View all games')}</button></div>;
    return <div className="practice-arcade-v64"><MemoryGame mode={mode} pairs={memoryPairs} data={data} onAttempt={onAttempt} onExit={()=>setMode(null)}/></div>;
  }

  if(!questions.length)return <div className="empty-state"><Gamepad2/><b>{text('এই লেসনে এই গেমের জন্য যথেষ্ট তথ্য নেই','This lesson does not have enough data for this game')}</b><button className="premium-btn premium-btn-secondary" onClick={()=>setMode(null)}>{text('সব গেম দেখুন','View all games')}</button></div>;

  if(finished)return <div className="practice-arcade-v64"><ResultCard score={score} total={questions.length} onReplay={()=>start(mode)} onExit={()=>setMode(null)}/></div>;

  return <div className="practice-arcade-v64"><section className="arcade-runner"><header><div><span>{language==='bn'?MODES.find(x=>x.id===mode)?.bn:MODES.find(x=>x.id===mode)?.title}</span><b>{index+1}/{questions.length}</b></div><div className="arcade-score"><Sparkles/> {score}</div></header><div className="arcade-progress"><i style={{width:`${((index+1)/questions.length)*100}%`}}/></div><article><small>{q.type.replaceAll('-',' ').toUpperCase()}</small>{q.audio?<div className="arcade-listen-block"><button type="button" className="arcade-listen-button" onClick={()=>playText(q.audio!,1,'arcade_listening',{},{lesson_number:data.lesson})}><Headphones size={22}/> {text('শুনুন','Play audio')}</button>{choice&&<p className="font-jp arcade-listen-transcript" lang="ja">{q.prompt}</p>}</div>:<h2 className={/[ぁ-んァ-ヶ一-龯]/.test(q.prompt)?'font-jp':language==='bn'?'font-bn':''}>{q.prompt}</h2>}<div className="arcade-options">{q.options.map(option=>{const selected=choice===option;const correct=choice&&option===q.correct;return <button key={option} disabled={!!choice} onClick={()=>answer(option)} className={`${selected?'selected':''} ${correct?'correct':''} ${selected&&!correct?'wrong':''}`}><span className={/[ぁ-んァ-ヶ一-龯]/.test(option)?'font-jp':language==='bn'?'font-bn':''}>{option}</span>{choice&&(option===q.correct?<CheckCircle2/>:selected?<XCircle/>:null)}</button>})}</div>{choice&&<div className={`arcade-feedback ${choice===q.correct?'ok':'bad'}`}><span>{choice===q.correct?text('দারুণ—গতি ধরে রাখুন।','Nice—keep the pace.'):text(`সঠিক উত্তর: ${q.correct}`,`Correct answer: ${q.correct}`)}</span><button onClick={next}>{index+1>=questions.length?text('ফল দেখুন','See result'):text('পরেরটি','Next')} →</button></div>}</article><footer><button onClick={()=>setMode(null)}><Shuffle/> {text('গেম বদলান','Change game')}</button></footer></section></div>;
}
