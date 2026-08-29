'use client';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, PenLine, Shuffle, SkipForward, Volume2, XCircle } from 'lucide-react';
import type { ConfidenceLevel, LessonPayload, VocabItem } from '@/lib/types';
import { playText } from '@/lib/audio';
import { track } from '@/lib/analytics';

function shuffle<T>(a:T[]){const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
function clean(s:string){return s.normalize('NFC').replace(/[。．.！？!?]/g,'').replace(/\s+/g,'').trim()}

type Attempt = {
  itemId: number;
  lesson: number;
  userAnswer: string;
  correctAnswer: string;
  correct: boolean;
  confidence: ConfidenceLevel;
};

export default function Spelling({data,onAttempt}:{data:LessonPayload;onAttempt?:(attempt:Attempt)=>void}){
  const pool=useMemo(()=>data.vocabulary.filter(v=>v.spelling_eligible!==false&&v.spelling_text),[data]);
  const [cards]=useState<VocabItem[]>(()=>shuffle(pool));
  const [i,setI]=useState(0);
  const [answer,setAnswer]=useState('');
  const [result,setResult]=useState<'ok'|'bad'|null>(null);
  const [confidence,setConfidence]=useState<ConfidenceLevel>('unsure');
  const card=cards[i%Math.max(1,cards.length)];

  const next=()=>{setAnswer('');setResult(null);setConfidence('unsure');setI(x=>x+1)};
  const check=()=>{
    if(!card)return;
    const correctAnswer=String(card.spelling_text||card.japanese);
    const ok=clean(answer)===clean(correctAnswer);
    setResult(ok?'ok':'bad');
    onAttempt?.({itemId:card.id,lesson:data.lesson,userAnswer:answer,correctAnswer,correct:ok,confidence});
    track('practice_result',{practice_type:'spelling',result:ok?'correct':'wrong',word_id:card.id,lesson_number:data.lesson,confidence});
  };

  if(!card)return <div className="empty-state"><PenLine/><b>No spelling cards in this lesson</b></div>;
  return <div className="space-y-5"><section className="study-header tone-spell"><div><div className="section-kicker">Spelling & Writing · Confidence-aware</div><h1>Listen → Type → Check</h1><p className="font-bn">Spacing এবং sentence punctuation-এর ছোট variation answer check-এ ignore করা হবে। আপনার confidence-ও review priority-তে ধরা হবে।</p></div><PenLine className="header-big-icon"/></section><article className="practice-card"><div className="practice-top"><span><Shuffle size={14}/> Random card</span><b>{(i%pool.length)+1}/{pool.length}</b></div><div className="prompt-meaning font-bn">{card.bangla_meaning}</div><button className="audio-action mx-auto" onClick={()=>playText(card.tts_text||card.japanese,1,'word',{}, {lesson_number:data.lesson,word_id:card.id,practice_type:'spelling'})}><Volume2/> শব্দ শুনুন</button><label className="writing-field"><span>Japanese answer</span><input lang="ja" data-kana-input="Spelling answer" autoComplete="off" value={answer} onChange={e=>setAnswer(e.target.value)} onKeyDown={e=>e.key==='Enter'&&check()} placeholder="ここに かいてください…"/></label><div className="mb-3"><span className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-white/45">How sure are you?</span><div className="grid grid-cols-3 gap-2">{(['guess','unsure','confident'] as ConfidenceLevel[]).map(level=><button key={level} type="button" onClick={()=>setConfidence(level)} className={`rounded-xl border px-3 py-2 text-sm capitalize transition ${confidence===level?'border-emerald-300 bg-emerald-300/10 text-emerald-200':'border-white/10 bg-white/5 text-white/60'}`}>{level}</button>)}</div></div><div className="grid grid-cols-2 gap-2"><button className="premium-btn premium-btn-primary" onClick={check}>Check answer</button><button className="premium-btn premium-btn-secondary" onClick={()=>{track('practice_result',{practice_type:'spelling',result:'skip',word_id:card.id,lesson_number:data.lesson});next()}}><SkipForward size={16}/> Skip</button></div><AnimatePresence>{result&&<motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className={`result-box ${result}`} >{result==='ok'?<CheckCircle2/>:<XCircle/>}<div><b>{result==='ok'?'Correct':'Try again'}</b><p className="font-jp" lang="ja">{card.spelling_text||card.japanese}</p></div>{result==='ok'&&<button onClick={next}>Next →</button>}</motion.div>}</AnimatePresence></article></div>
}
