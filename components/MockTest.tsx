'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpenText, Brain, CheckCircle2, ClipboardCheck, Clock3, Headphones, Languages, Loader2, RotateCcw, Trophy, Volume2, XCircle } from 'lucide-react';
import type { LessonPayload, MockAttempt, VocabItem } from '@/lib/types';
import { loadLesson } from '@/lib/data';
import { playText, type AudioVoiceRole } from '@/lib/audio';
import { track } from '@/lib/analytics';

type SectionId='vocabulary'|'grammar-reading'|'listening';
type Q={id:string;section:SectionId;itemType:string;prompt:string;correct:string;options:string[];wordId?:number;audioText?:string;audioRole?:AudioVoiceRole};

const SECTIONS:Record<SectionId,{title:string;jp:string;minutes:number;icon:any;practice:number;types:string[]}>= {
  vocabulary:{title:'Language Knowledge · Vocabulary',jp:'言語知識（文字・語彙）',minutes:20,icon:ClipboardCheck,practice:20,types:['Kanji reading','Orthography','Context','Paraphrase']},
  'grammar-reading':{title:'Grammar · Reading',jp:'言語知識（文法）・読解',minutes:40,icon:BookOpenText,practice:20,types:['Grammar form','Sentence composition','Text grammar','Short reading','Mid reading','Information retrieval']},
  listening:{title:'Listening',jp:'聴解',minutes:30,icon:Headphones,practice:12,types:['Task-based','Key points','Verbal expressions','Quick response']},
};
const ORDER:SectionId[]=['vocabulary','grammar-reading','listening'];

function shuffle<T>(a:T[]){const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
function opts(correct:string,pool:string[]){const u=Array.from(new Set(pool.filter(x=>x&&x!==correct)));return shuffle([correct,...shuffle(u).slice(0,3)])}
function cycle<T>(rows:T[],n:number){if(!rows.length)return[];const s=shuffle(rows);return Array.from({length:n},(_,i)=>s[i%s.length])}
function jpText(s:string){return /[ぁ-んァ-ヶ一-龯]/.test(s)}

function buildFull(lessons:LessonPayload[]):Q[]{
  const vocab=lessons.flatMap(L=>L.vocabulary);
  const withKanji=vocab.filter(v=>v.kanji&&v.kanji!==v.japanese);
  const vocabQs:Q[]=[];
  cycle(withKanji,5).forEach((v,i)=>vocabQs.push({id:`vk-${i}-${v.id}`,section:'vocabulary',itemType:'Kanji reading',prompt:v.kanji||v.japanese,correct:v.japanese,options:opts(v.japanese,withKanji.map(x=>x.japanese)),wordId:v.id}));
  cycle(withKanji,5).forEach((v,i)=>vocabQs.push({id:`vo-${i}-${v.id}`,section:'vocabulary',itemType:'Orthography',prompt:v.japanese,correct:v.kanji||v.japanese,options:opts(v.kanji||v.japanese,withKanji.map(x=>x.kanji||x.japanese)),wordId:v.id}));
  const withEx=vocab.filter(v=>(v.example?.jp||v.example?.japanese)&&v.example?.bn);
  cycle(withEx,5).forEach((v,i)=>{const ex=v.example!;const jp=ex.jp||ex.japanese||'';const bn=ex.bn||v.bangla_meaning;vocabQs.push({id:`vc-${i}-${v.id}`,section:'vocabulary',itemType:'Contextually-defined expression',prompt:jp,correct:bn,options:opts(bn,withEx.map(x=>x.example?.bn||x.bangla_meaning)),wordId:v.id})});
  cycle(vocab,5).forEach((v,i)=>vocabQs.push({id:`vp-${i}-${v.id}`,section:'vocabulary',itemType:'Paraphrase / nearest meaning',prompt:v.kanji||v.japanese,correct:v.bangla_meaning,options:opts(v.bangla_meaning,vocab.map(x=>x.bangla_meaning)),wordId:v.id}));

  const grammar=lessons.flatMap(L=>(L.content.grammar||[]).map((g,i)=>({lesson:L.lesson,id:`${L.lesson}-${i}`,pattern:String(g[0]||''),meaning:String(g[1]||''),example:String(g[2]||'')}))).filter(x=>x.pattern&&x.example);
  const grammarQs:Q[]=[];
  cycle(grammar,6).forEach((g,i)=>grammarQs.push({id:`gf-${i}-${g.id}`,section:'grammar-reading',itemType:'Sentential grammar · selecting form',prompt:g.example,correct:g.pattern,options:opts(g.pattern,grammar.map(x=>x.pattern))}));
  cycle(grammar,4).forEach((g,i)=>grammarQs.push({id:`gs-${i}-${g.id}`,section:'grammar-reading',itemType:'Sentential grammar · sentence composition',prompt:g.meaning||'সঠিক Japanese sentence বেছে নিন',correct:g.example,options:opts(g.example,grammar.map(x=>x.example))}));
  cycle(grammar,3).forEach((g,i)=>grammarQs.push({id:`gt-${i}-${g.id}`,section:'grammar-reading',itemType:'Text grammar',prompt:g.pattern,correct:g.meaning||g.example,options:opts(g.meaning||g.example,grammar.map(x=>x.meaning||x.example))}));

  const pairs=lessons.flatMap(L=>(L.content.reading_extra_pairs||[]).map((p,i)=>({id:`${L.lesson}-${i}`,jp:String(p[0]||''),bn:String(p[1]||'')}))).filter(x=>x.jp&&x.bn);
  const readings=lessons.map(L=>({lesson:L.lesson,jp:L.content.reading_extended||L.content.reading||'',bn:L.content.reading_extended_bn||L.content.reading_bn||''})).filter(x=>x.jp&&x.bn);
  cycle(pairs.length?pairs:withEx.map(v=>({id:String(v.id),jp:v.example?.jp||v.example?.japanese||v.japanese,bn:v.example?.bn||v.bangla_meaning})),3).forEach((r:any,i)=>grammarQs.push({id:`rs-${i}-${r.id}`,section:'grammar-reading',itemType:'Comprehension · short passage',prompt:r.jp,correct:r.bn,options:opts(r.bn,(pairs.length?pairs:[]).map(x=>x.bn).concat(withEx.map(x=>x.example?.bn||x.bangla_meaning)))}));
  cycle(readings,2).forEach((r,i)=>grammarQs.push({id:`rm-${i}-${r.lesson}`,section:'grammar-reading',itemType:'Comprehension · mid-size passage',prompt:r.jp.slice(0,420),correct:r.bn,options:opts(r.bn,readings.map(x=>x.bn))}));
  cycle(readings,2).forEach((r,i)=>grammarQs.push({id:`ri-${i}-${r.lesson}`,section:'grammar-reading',itemType:'Information retrieval practice',prompt:r.jp.slice(0,280),correct:r.bn,options:opts(r.bn,readings.map(x=>x.bn))}));

  const turns:{id:string;lesson:number;speaker:string;jp:string;bn:string;role:AudioVoiceRole;nextJp?:string}[]=[];
  lessons.forEach(L=>{
    const rows=L.content.dialogue_extended||L.content.dialogue||[];
    const speakers=Array.from(new Set(rows.map(r=>r[0]).filter(Boolean)));
    rows.forEach((r,i)=>turns.push({id:`${L.lesson}-${i}`,lesson:L.lesson,speaker:r[0],jp:r[1],bn:r[2],role:(speakers.indexOf(r[0])%2===0?'male':'female'),nextJp:rows[i+1]?.[1]}));
  });
  const listeningQs:Q[]=[];
  cycle(turns.filter(x=>x.jp&&x.bn),3).forEach((t,i)=>listeningQs.push({id:`lt-${i}-${t.id}`,section:'listening',itemType:'Task-based comprehension',prompt:'Audio শুনে সবচেয়ে উপযুক্ত অর্থ বেছে নিন।',correct:t.bn,options:opts(t.bn,turns.map(x=>x.bn)),audioText:t.jp,audioRole:t.role}));
  cycle(turns.filter(x=>x.jp&&x.bn),3).forEach((t,i)=>listeningQs.push({id:`lk-${i}-${t.id}`,section:'listening',itemType:'Comprehension of key points',prompt:'মূল বক্তব্যটি বেছে নিন।',correct:t.bn,options:opts(t.bn,turns.map(x=>x.bn)),audioText:t.jp,audioRole:t.role}));
  cycle(turns.filter(x=>x.jp),3).forEach((t,i)=>listeningQs.push({id:`lv-${i}-${t.id}`,section:'listening',itemType:'Verbal expressions practice',prompt:'যে Japanese expressionটি শুনেছেন সেটি বেছে নিন।',correct:t.jp,options:opts(t.jp,turns.map(x=>x.jp)),audioText:t.jp,audioRole:t.role}));
  const responseTurns=turns.filter(x=>x.nextJp);
  cycle(responseTurns,3).forEach((t,i)=>listeningQs.push({id:`lq-${i}-${t.id}`,section:'listening',itemType:'Quick response',prompt:'Audio-র পর সবচেয়ে natural response কোনটি?',correct:t.nextJp||'',options:opts(t.nextJp||'',responseTurns.map(x=>x.nextJp||'')),audioText:t.jp,audioRole:t.role}));

  return [...shuffle(vocabQs).slice(0,20),...shuffle(grammarQs).slice(0,20),...shuffle(listeningQs).slice(0,12)];
}

export default function MockTest({data,onSave,onReviewMistakes}:{data:LessonPayload;onSave:(a:MockAttempt)=>void;onReviewMistakes:(ids:number[])=>void}){
  const [questions,setQuestions]=useState<Q[]>([]);const [i,setI]=useState(0);const [selected,setSelected]=useState<string|null>(null);const [correct,setCorrect]=useState(0);const [breakdown,setBreakdown]=useState<Record<string,{correct:number,total:number}>>({});const [result,setResult]=useState<MockAttempt|null>(null);const [wrongIds,setWrongIds]=useState<number[]>([]);const [sent,setSent]=useState(false);const [loading,setLoading]=useState(false);
  const q=questions[i];
  const sectionCounts=useMemo(()=>questions.reduce((a,x)=>{a[x.section]=(a[x.section]||0)+1;return a},{} as Record<string,number>),[questions]);
  const sectionIndex=q?questions.slice(0,i+1).filter(x=>x.section===q.section).length:0;
  const sectionNo=q?ORDER.indexOf(q.section)+1:1;

  const start=async()=>{
    setLoading(true);setResult(null);setSent(false);setWrongIds([]);setCorrect(0);setBreakdown({});setSelected(null);setI(0);
    try{
      const lessons=await Promise.all(Array.from({length:25},(_,idx)=>loadLesson(idx+1)));
      const built=buildFull(lessons);setQuestions(built);
      track('quiz_start',{quiz_type:'jlpt_n5_full_simulation',question_count:built.length,sections:3,official_time_minutes:90});
      track('quiz_event',{quiz_action:'start',quiz_type:'jlpt_n5_full_simulation',question_count:built.length});
    }catch{
      const built=buildFull([data]);setQuestions(built);
      track('quiz_start',{quiz_type:'jlpt_n5_fallback_simulation',lesson_number:data.lesson,question_count:built.length});
    }finally{setLoading(false)}
  };
  const choose=(x:string)=>{if(selected||!q)return;setSelected(x);const ok=x===q.correct;if(ok)setCorrect(c=>c+1);else if(q.wordId)setWrongIds(ids=>ids.includes(q.wordId!)?ids:[...ids,q.wordId!]);setBreakdown(b=>({...b,[q.section]:{correct:(b[q.section]?.correct||0)+(ok?1:0),total:(b[q.section]?.total||0)+1}}));track('quiz_answer',{question_number:i+1,question_type:q.itemType,section_name:q.section,correct:ok})};
  const next=()=>{if(!selected)return;if(i+1>=questions.length){const total=questions.length;const score=Math.round(correct/Math.max(1,total)*100);const a:MockAttempt={lesson:data.lesson,scope:'n5-full',label:'JLPT N5 Full Simulation',score,correct,total,date:new Date().toISOString(),breakdown};setResult(a);onSave(a);setQuestions([]);track('quiz_complete',{quiz_type:'jlpt_n5_full_simulation',score_percent:score,correct_count:correct,wrong_count:total-correct})}else{setI(x=>x+1);setSelected(null)}};

  if(result)return <div className="space-y-5"><section className="study-header tone-mock"><div><div className="section-kicker">JLPT N5 Simulation Complete</div><h1>{result.score}%</h1><p className="font-bn">{result.correct}/{result.total} correct · তিনটি official-style section</p></div><Trophy className="header-big-icon"/></section><article className="premium-panel"><div className="result-hero"><div className="score-orb">{result.score}%</div><div><h2>{result.score>=90?'Excellent work':result.score>=70?'Strong progress':'Keep reviewing'}</h2><p className="font-bn">Section breakdown দেখে দুর্বল অংশে ফিরে practice করুন। Vocabulary ভুলগুলো Recall queue-তে পাঠানো যাবে।</p></div></div><div className="mock-result-section">{ORDER.map(id=><div key={id}><span>{SECTIONS[id].title}</span><b>{Math.round((result.breakdown?.[id]?.correct||0)/Math.max(1,result.breakdown?.[id]?.total||0)*100)}%</b><small>{result.breakdown?.[id]?.correct||0}/{result.breakdown?.[id]?.total||0}</small></div>)}</div><div className="mock-result-actions"><button className="premium-btn premium-btn-primary" onClick={start}><RotateCcw size={16}/> New N5 simulation</button>{wrongIds.length>0&&<button className="premium-btn premium-btn-secondary" disabled={sent} onClick={()=>{onReviewMistakes(wrongIds);setSent(true)}}><Brain size={16}/>{sent?'Mistakes added to Recall':`Send ${wrongIds.length} vocab mistakes to Recall`}</button>}</div></article></div>;

  if(!q)return <div className="jlpt-mock-home"><section className="study-header tone-mock"><div><div className="section-kicker">JLPT N5 · Exam-Style Simulator</div><h1>Three sections. Clean exam flow.</h1><p className="font-bn">পুরনো 100 random question বাদ। এখন N5-এর official section structure ও item-type logic অনুযায়ী practice simulation সাজানো হয়েছে।</p></div><ClipboardCheck className="header-big-icon"/></section><div className="jlpt-blueprint">{ORDER.map((id,idx)=>{const c=SECTIONS[id],Icon=c.icon;return <article className="jlpt-section-card" key={id}><span>SECTION {idx+1}</span><Icon size={22}/><h3>{c.title}</h3><small className="font-jp">{c.jp}</small><b><Clock3 size={17}/> {c.minutes} min</b><p>এই app simulation-এ {c.practice} practice item থাকবে।</p><div className="jlpt-item-tags">{c.types.map(x=><small key={x}>{x}</small>)}</div></article>})}</div><div className="jlpt-launch"><div><b>Full N5 Simulation · 52 practice items</b><p className="font-bn">20 Vocabulary + 20 Grammar/Reading + 12 Listening. প্রশ্নসংখ্যা app practice blueprint; official পরীক্ষায় actual item count কিছুটা পরিবর্তিত হতে পারে।</p></div><button className="premium-btn premium-btn-primary" disabled={loading} onClick={start}>{loading?<Loader2 className="animate-spin" size={17}/>:<ClipboardCheck size={17}/>} {loading?'Preparing 25 lessons…':'Start Full Simulation'}</button></div><p className="jlpt-disclaimer font-bn">এই simulator official JLPT paper নয়। Section timing এবং item-type organization JLPT N5 structure অনুসরণ করে; প্রশ্নগুলো আপনার study materials থেকে তৈরি হয়।</p></div>;

  const cfg=SECTIONS[q.section];const pct=Math.round(i/Math.max(1,questions.length)*100);
  return <div className="mock-session mock-session-v56"><div className="mock-exam-bar"><div><span>SECTION {sectionNo}/3 · {cfg.jp}</span><b>{cfg.title} · {q.itemType}</b></div><strong>{sectionIndex}/{sectionCounts[q.section]||0} · {cfg.minutes} min section</strong></div><div className="mock-progress"><i style={{width:`${pct}%`}}/></div><AnimatePresence mode="wait"><motion.article key={q.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} className="mock-question"><span className="section-kicker">{q.itemType}</span>{q.audioText?<div className="mock-audio-prompt"><button onClick={()=>playText(q.audioText!,1,'mock_listening',{}, {question_number:i+1,item_type:q.itemType},q.audioRole||'default')} aria-label="Play listening question"><Volume2 size={28}/></button><b className="font-bn">Audio শুনে উত্তর দিন</b><small>{q.prompt}</small></div>:<h2 className={jpText(q.prompt)?'font-jp':'font-bn'} lang={jpText(q.prompt)?'ja':undefined}>{q.prompt}</h2>}<div className="mock-options">{q.options.map(x=>{let cls='';if(selected){if(x===q.correct)cls='correct';else if(x===selected)cls='wrong'}return <button disabled={!!selected} onClick={()=>choose(x)} className={cls} key={x}><span>{cls==='correct'?<CheckCircle2/>:cls==='wrong'?<XCircle/>:null}</span><b className={jpText(x)?'font-jp':'font-bn'}>{x}</b></button>})}</div>{selected&&<button className="premium-btn premium-btn-primary mt-5" onClick={next}>{i===questions.length-1?'Finish Simulation':'Next Question →'}</button>}</motion.article></AnimatePresence></div>;
}
