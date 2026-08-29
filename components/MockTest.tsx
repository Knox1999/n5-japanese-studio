'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BookOpenText,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Headphones,
  Loader2,
  RotateCcw,
  Trophy,
  Volume2,
} from 'lucide-react';

import type {
  LessonPayload,
  MockAttempt,
  VocabItem,
} from '@/lib/types';
import { loadLesson } from '@/lib/data';
import { playText, stopAudio, type AudioVoiceRole } from '@/lib/audio';
import { track } from '@/lib/analytics';

type SectionId='vocabulary'|'grammar-reading'|'listening';
type ModeId='quick'|'mini'|'full';

type Q={
  id:string;
  section:SectionId;
  itemType:string;
  prompt:string;
  correct:string;
  options:string[];
  wordId?:number;
  audioText?:string;
  audioRole?:AudioVoiceRole;
};

const ORDER:SectionId[]=['vocabulary','grammar-reading','listening'];

const SECTIONS:Record<SectionId,{
  titleBn:string;
  titleEn:string;
  jp:string;
  icon:any;
  types:string[];
}>={
  vocabulary:{
    titleBn:'শব্দ ও কাঞ্জি',
    titleEn:'Vocabulary',
    jp:'言語知識（文字・語彙）',
    icon:ClipboardCheck,
    types:['Kanji reading','Orthography','Context','Paraphrase'],
  },
  'grammar-reading':{
    titleBn:'গ্রামার ও রিডিং',
    titleEn:'Grammar · Reading',
    jp:'言語知識（文法）・読解',
    icon:BookOpenText,
    types:['Grammar form','Sentence composition','Text grammar','Reading'],
  },
  listening:{
    titleBn:'লিসেনিং',
    titleEn:'Listening',
    jp:'聴解',
    icon:Headphones,
    types:['Task-based','Key points','Expressions','Quick response'],
  },
};

const MODES:Record<ModeId,{
  title:string;
  titleBn:string;
  total:number;
  counts:Record<SectionId,number>;
  minutes:Record<SectionId,number>;
  allLessons:boolean;
}>={
  quick:{
    title:'Quick Quiz',
    titleBn:'কুইক কুইজ',
    total:10,
    counts:{vocabulary:4,'grammar-reading':4,listening:2},
    minutes:{vocabulary:5,'grammar-reading':6,listening:4},
    allLessons:false,
  },
  mini:{
    title:'Mini Mock',
    titleBn:'মিনি মক',
    total:25,
    counts:{vocabulary:10,'grammar-reading':10,listening:5},
    minutes:{vocabulary:12,'grammar-reading':20,listening:10},
    allLessons:true,
  },
  full:{
    title:'Full JLPT N5 Mock',
    titleBn:'ফুল JLPT N5 মক',
    total:52,
    counts:{vocabulary:20,'grammar-reading':20,listening:12},
    minutes:{vocabulary:20,'grammar-reading':40,listening:30},
    allLessons:true,
  },
};

function shuffle<T>(a:T[]){
  const x=[...a];
  for(let i=x.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [x[i],x[j]]=[x[j],x[i]];
  }
  return x;
}

function opts(correct:string,pool:string[]){
  const unique=Array.from(new Set(pool.filter(x=>x&&x!==correct)));
  return shuffle([correct,...shuffle(unique).slice(0,3)]);
}

function cycle<T>(rows:T[],n:number){
  if(!rows.length)return[];
  const s=shuffle(rows);
  return Array.from({length:n},(_,i)=>s[i%s.length]);
}

function buildBanks(lessons:LessonPayload[]){
  const vocab=lessons.flatMap(L=>L.vocabulary);
  const withKanji=vocab.filter(v=>v.kanji&&v.kanji!==v.japanese);
  const withEx=vocab.filter(v=>(v.example?.jp||v.example?.japanese)&&v.example?.bn);

  const vocabQs:Q[]=[];
  cycle(withKanji,12).forEach((v,i)=>vocabQs.push({
    id:`vk-${i}-${v.id}`,
    section:'vocabulary',
    itemType:'Kanji reading',
    prompt:v.kanji||v.japanese,
    correct:v.japanese,
    options:opts(v.japanese,withKanji.map(x=>x.japanese)),
    wordId:v.id,
  }));
  cycle(withKanji,12).forEach((v,i)=>vocabQs.push({
    id:`vo-${i}-${v.id}`,
    section:'vocabulary',
    itemType:'Orthography',
    prompt:v.japanese,
    correct:v.kanji||v.japanese,
    options:opts(v.kanji||v.japanese,withKanji.map(x=>x.kanji||x.japanese)),
    wordId:v.id,
  }));
  cycle(withEx,12).forEach((v,i)=>{
    const ex=v.example!;
    const jp=ex.jp||ex.japanese||'';
    const bn=ex.bn||v.bangla_meaning;
    vocabQs.push({
      id:`vc-${i}-${v.id}`,
      section:'vocabulary',
      itemType:'Context',
      prompt:jp,
      correct:bn,
      options:opts(bn,withEx.map(x=>x.example?.bn||x.bangla_meaning)),
      wordId:v.id,
    });
  });
  cycle(vocab,12).forEach((v,i)=>vocabQs.push({
    id:`vp-${i}-${v.id}`,
    section:'vocabulary',
    itemType:'Paraphrase',
    prompt:v.kanji||v.japanese,
    correct:v.bangla_meaning,
    options:opts(v.bangla_meaning,vocab.map(x=>x.bangla_meaning)),
    wordId:v.id,
  }));

  const grammar=lessons.flatMap(L=>
    (L.content.grammar||[]).map((g,i)=>({
      id:`${L.lesson}-${i}`,
      pattern:String(g[0]||''),
      meaning:String(g[1]||''),
      example:String(g[2]||''),
    }))
  ).filter(x=>x.pattern&&x.example);

  const pairs=lessons.flatMap(L=>
    (L.content.reading_extra_pairs||[]).map((p,i)=>({
      id:`${L.lesson}-${i}`,
      jp:String(p[0]||''),
      bn:String(p[1]||''),
    }))
  ).filter(x=>x.jp&&x.bn);

  const readings=lessons.map(L=>({
    lesson:L.lesson,
    jp:L.content.reading_extended||L.content.reading||'',
    bn:L.content.reading_extended_bn||L.content.reading_bn||'',
  })).filter(x=>x.jp&&x.bn);

  const grammarQs:Q[]=[];
  cycle(grammar,18).forEach((g,i)=>grammarQs.push({
    id:`gf-${i}-${g.id}`,
    section:'grammar-reading',
    itemType:'Grammar form',
    prompt:g.example,
    correct:g.pattern,
    options:opts(g.pattern,grammar.map(x=>x.pattern)),
  }));
  cycle(grammar,12).forEach((g,i)=>grammarQs.push({
    id:`gs-${i}-${g.id}`,
    section:'grammar-reading',
    itemType:'Sentence composition',
    prompt:g.meaning||'সঠিক Japanese sentence বেছে নিন',
    correct:g.example,
    options:opts(g.example,grammar.map(x=>x.example)),
  }));
  cycle(grammar,10).forEach((g,i)=>grammarQs.push({
    id:`gt-${i}-${g.id}`,
    section:'grammar-reading',
    itemType:'Text grammar',
    prompt:g.pattern,
    correct:g.meaning||g.example,
    options:opts(g.meaning||g.example,grammar.map(x=>x.meaning||x.example)),
  }));

  const readingPool=pairs.length
    ? pairs
    : withEx.map(v=>({
        id:String(v.id),
        jp:v.example?.jp||v.example?.japanese||v.japanese,
        bn:v.example?.bn||v.bangla_meaning,
      }));

  cycle(readingPool,12).forEach((r:any,i)=>grammarQs.push({
    id:`rs-${i}-${r.id}`,
    section:'grammar-reading',
    itemType:'Short reading',
    prompt:r.jp,
    correct:r.bn,
    options:opts(r.bn,readingPool.map((x:any)=>x.bn)),
  }));

  cycle(readings,8).forEach((r,i)=>grammarQs.push({
    id:`rm-${i}-${r.lesson}`,
    section:'grammar-reading',
    itemType:'Mid reading',
    prompt:r.jp.slice(0,420),
    correct:r.bn,
    options:opts(r.bn,readings.map(x=>x.bn)),
  }));

  const turns:{
    id:string;
    lesson:number;
    speaker:string;
    jp:string;
    bn:string;
    role:AudioVoiceRole;
    nextJp?:string;
  }[]=[];

  lessons.forEach(L=>{
    const rows=L.content.dialogue_extended||L.content.dialogue||[];
    const speakers=Array.from(new Set(rows.map(r=>r[0]).filter(Boolean)));
    rows.forEach((r,i)=>turns.push({
      id:`${L.lesson}-${i}`,
      lesson:L.lesson,
      speaker:r[0],
      jp:r[1],
      bn:r[2],
      role:speakers.indexOf(r[0])%2===0?'male':'female',
      nextJp:rows[i+1]?.[1],
    }));
  });

  const listeningQs:Q[]=[];
  cycle(turns.filter(x=>x.jp&&x.bn),12).forEach((t,i)=>listeningQs.push({
    id:`lt-${i}-${t.id}`,
    section:'listening',
    itemType:'Task-based comprehension',
    prompt:'Audio শুনে সবচেয়ে উপযুক্ত অর্থ বেছে নিন।',
    correct:t.bn,
    options:opts(t.bn,turns.map(x=>x.bn)),
    audioText:t.jp,
    audioRole:t.role,
  }));
  cycle(turns.filter(x=>x.jp&&x.bn),12).forEach((t,i)=>listeningQs.push({
    id:`lk-${i}-${t.id}`,
    section:'listening',
    itemType:'Key points',
    prompt:'Audio-র মূল বক্তব্যটি বেছে নিন।',
    correct:t.bn,
    options:opts(t.bn,turns.map(x=>x.bn)),
    audioText:t.jp,
    audioRole:t.role,
  }));
  cycle(turns.filter(x=>x.jp),12).forEach((t,i)=>listeningQs.push({
    id:`lv-${i}-${t.id}`,
    section:'listening',
    itemType:'Verbal expressions',
    prompt:'যে Japanese expressionটি শুনেছেন সেটি বেছে নিন।',
    correct:t.jp,
    options:opts(t.jp,turns.map(x=>x.jp)),
    audioText:t.jp,
    audioRole:t.role,
  }));
  const responseTurns=turns.filter(x=>x.nextJp);
  cycle(responseTurns,12).forEach((t,i)=>listeningQs.push({
    id:`lq-${i}-${t.id}`,
    section:'listening',
    itemType:'Quick response',
    prompt:'Audio-র পর সবচেয়ে natural response কোনটি?',
    correct:t.nextJp||'',
    options:opts(t.nextJp||'',responseTurns.map(x=>x.nextJp||'')),
    audioText:t.jp,
    audioRole:t.role,
  }));

  return {
    vocabulary:shuffle(vocabQs),
    'grammar-reading':shuffle(grammarQs),
    listening:shuffle(listeningQs),
  };
}

function buildQuestions(lessons:LessonPayload[],mode:ModeId){
  const banks=buildBanks(lessons);
  const cfg=MODES[mode];
  return ORDER.flatMap(section=>
    cycle(banks[section],cfg.counts[section])
  );
}

function mmss(seconds:number){
  const m=Math.floor(seconds/60);
  const s=seconds%60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export default function MockTest({
  data,onSave,onReviewMistakes
}:{
  data:LessonPayload;
  onSave:(a:MockAttempt)=>void;
  onReviewMistakes:(ids:number[])=>void;
}) {
  const [mode,setMode]=useState<ModeId|null>(null);
  const [questions,setQuestions]=useState<Q[]>([]);
  const [i,setI]=useState(0);
  const [answers,setAnswers]=useState<Record<string,string>>({});
  const [result,setResult]=useState<MockAttempt|null>(null);
  const [wrongIds,setWrongIds]=useState<number[]>([]);
  const [sent,setSent]=useState(false);
  const [loading,setLoading]=useState(false);
  const [secondsLeft,setSecondsLeft]=useState(0);

  const q=questions[i];
  const cfg=mode?MODES[mode]:null;
  const selected=q?answers[q.id]:undefined;
  const sectionIndex=q
    ? questions.slice(0,i+1).filter(x=>x.section===q.section).length
    : 0;
  const sectionTotal=q&&cfg?cfg.counts[q.section]:0;

  useEffect(()=>{
    if(!q||!cfg)return;
    setSecondsLeft(cfg.minutes[q.section]*60);
  },[q?.section,mode]);

  useEffect(()=>{
    if(!q||secondsLeft<=0)return;
    const id=window.setInterval(()=>setSecondsLeft(x=>Math.max(0,x-1)),1000);
    return()=>window.clearInterval(id);
  },[q?.section,secondsLeft<=0]);

  useEffect(()=>()=>{ stopAudio(); },[]);

  const start=async(nextMode:ModeId)=>{
    stopAudio();
    setLoading(true);
    setResult(null);
    setSent(false);
    setWrongIds([]);
    setAnswers({});
    setI(0);
    setMode(nextMode);

    try {
      const source=MODES[nextMode].allLessons
        ? await Promise.all(Array.from({length:25},(_,idx)=>loadLesson(idx+1)))
        : [data];
      const built=buildQuestions(source,nextMode);
      setQuestions(built);
      track('quiz_event',{
        quiz_action:'start',
        quiz_type:nextMode,
        question_count:built.length,
      });
    } catch {
      const built=buildQuestions([data],nextMode);
      setQuestions(built);
    } finally {
      setLoading(false);
    }
  };

  const choose=(answer:string)=>{
    if(!q)return;
    setAnswers(old=>({...old,[q.id]:answer}));
    track('quiz_event',{
      quiz_action:'answer',
      quiz_type:mode,
      question_number:i+1,
      question_type:q.itemType,
      section_name:q.section,
    });
  };

  const finish=()=>{
    if(!mode||!questions.length)return;

    const breakdown:Record<string,{correct:number;total:number}>={};
    let correct=0;
    const wrongWords:number[]=[];

    questions.forEach(question=>{
      const ok=answers[question.id]===question.correct;
      if(ok)correct+=1;
      if(!ok&&question.wordId)wrongWords.push(question.wordId);
      const prev=breakdown[question.section]||{correct:0,total:0};
      breakdown[question.section]={
        correct:prev.correct+(ok?1:0),
        total:prev.total+1,
      };
    });

    const total=questions.length;
    const score=Math.round(correct/Math.max(1,total)*100);
    const attempt:MockAttempt={
      lesson:data.lesson,
      scope:mode==='full'?'n5-full':'lesson',
      label:MODES[mode].title,
      score,
      correct,
      total,
      date:new Date().toISOString(),
      breakdown,
    };
    setResult(attempt);
    setWrongIds(Array.from(new Set(wrongWords)));
    setQuestions([]);
    onSave(attempt);
    track('quiz_event',{
      quiz_action:'complete',
      quiz_type:mode,
      score_percent:score,
      correct_count:correct,
      wrong_count:total-correct,
    });
  };

  const next=()=>{
    stopAudio();
    if(i+1>=questions.length)finish();
    else setI(x=>x+1);
  };

  if(result&&mode){
    return (
      <div className="space-y-5">
        <section className="study-header tone-mock">
          <div>
            <div className="section-kicker">{MODES[mode].title}</div>
            <h1>{result.score}%</h1>
            <p className="font-bn">{result.correct}/{result.total} সঠিক উত্তর</p>
          </div>
          <Trophy className="header-big-icon"/>
        </section>

        <article className="premium-panel">
          <div className="result-hero">
            <div className="score-orb">{result.score}%</div>
            <div>
              <h2 className="font-bn">
                {result.score>=90?'দারুণ ফলাফল':result.score>=70?'ভালো অগ্রগতি':'আরও রিভিউ দরকার'}
              </h2>
              <p className="font-bn">
                Section breakdown দেখে দুর্বল অংশে ফিরে practice করুন।
              </p>
            </div>
          </div>

          <div className="mock-result-section">
            {ORDER.map(id=>{
              const row=result.breakdown?.[id]||{correct:0,total:0};
              return (
                <div key={id}>
                  <span className="font-bn">{SECTIONS[id].titleBn}</span>
                  <b>{Math.round(row.correct/Math.max(1,row.total)*100)}%</b>
                  <small>{row.correct}/{row.total}</small>
                </div>
              );
            })}
          </div>

          <div className="mock-result-actions">
            <button className="premium-btn premium-btn-primary" onClick={()=>start(mode)}>
              <RotateCcw size={16}/> আবার দিন
            </button>
            {wrongIds.length>0&&(
              <button
                className="premium-btn premium-btn-secondary"
                disabled={sent}
                onClick={()=>{
                  onReviewMistakes(wrongIds);
                  setSent(true);
                }}
              >
                <Brain size={16}/>
                {sent?'Recall-এ যোগ হয়েছে':`${wrongIds.length}টি Vocabulary mistake → Recall`}
              </button>
            )}
            <button
              className="premium-btn premium-btn-secondary"
              onClick={()=>{setResult(null);setMode(null)}}
            >
              সব mode দেখুন
            </button>
          </div>
        </article>
      </div>
    );
  }

  if(!q){
    return (
      <div className="jlpt-mock-home">
        <section className="study-header tone-mock">
          <div>
            <div className="section-kicker">JLPT N5 · PRACTICE SYSTEM</div>
            <h1 className="font-bn">সময় অনুযায়ী practice বেছে নিন</h1>
            <p className="font-bn">
              Quick 10, Mini 25 অথবা Full 52—তিনটি mode-ই একই N5 data থেকে তৈরি হয়।
            </p>
          </div>
          <ClipboardCheck className="header-big-icon"/>
        </section>

        <div className="jlpt-blueprint nv-final-mock-modes">
          {(Object.keys(MODES) as ModeId[]).map(id=>{
            const m=MODES[id];
            const Icon=id==='full'?Trophy:id==='mini'?BookOpenText:ClipboardCheck;
            return (
              <article className={`jlpt-section-card ${id}`} key={id}>
                <span>{id.toUpperCase()}</span>
                <Icon size={22}/>
                <h3>{m.title}</h3>
                <small className="font-bn">{m.titleBn}</small>
                <b><Clock3 size={17}/> {Object.values(m.minutes).reduce((a,b)=>a+b,0)} min target</b>
                <p className="font-bn">
                  {m.counts.vocabulary} Vocabulary + {m.counts['grammar-reading']} Grammar/Reading + {m.counts.listening} Listening
                </p>
                <strong>{m.total} প্রশ্ন</strong>
                <button
                  className="premium-btn premium-btn-primary"
                  onClick={()=>void start(id)}
                  disabled={loading}
                >
                  {loading?<><Loader2 className="animate-spin"/> Loading…</>:`${m.titleBn} শুরু করুন`}
                </button>
              </article>
            );
          })}
        </div>

        <div className="jlpt-launch">
          <div>
            <b>Full Mock blueprint · 52 practice items</b>
            <p className="font-bn">
              Vocabulary 20 + Grammar/Reading 20 + Listening 12 · 20/40/30 minute section targets.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const section=SECTIONS[q.section];
  const SectionIcon=section.icon;
  const currentAnswer=answers[q.id];

  return (
    <div className="mock-runner">
      <header className="mock-sticky-head nv-final-mock-head">
        <div>
          <span>{cfg?.title}</span>
          <b>{section.titleBn}</b>
          <small className="font-jp">{section.jp}</small>
        </div>
        <div>
          <small>SECTION</small>
          <b>{sectionIndex}/{sectionTotal}</b>
        </div>
        <div className={secondsLeft<=120?'warning':''}>
          <Clock3 size={16}/>
          <b>{mmss(secondsLeft)}</b>
        </div>
      </header>

      <div className="mock-progress">
        <i style={{width:`${((i+1)/questions.length)*100}%`}}/>
      </div>

      <article className="mock-question premium-panel">
        <div className="mock-q-meta">
          <span>Q{i+1}/{questions.length}</span>
          <b>{q.itemType}</b>
          <em><SectionIcon size={15}/>{section.titleEn}</em>
        </div>

        {q.audioText&&(
          <button
            className="mock-audio-button"
            onClick={()=>playText(
              q.audioText!,
              1,
              'mock_listening',
              {},
              {quiz_type:mode,section:q.section,question_number:i+1},
              q.audioRole||'default'
            )}
          >
            <Volume2/>
            <span className="font-bn">Audio শুনুন</span>
          </button>
        )}

        <h2 className={/[ぁ-んァ-ヶ一-龯]/.test(q.prompt)?'font-jp':'font-bn'}>
          {q.prompt}
        </h2>

        <div className="mock-options">
          {q.options.map((option,idx)=>(
            <button
              key={`${q.id}-${option}-${idx}`}
              className={currentAnswer===option?'selected':''}
              onClick={()=>choose(option)}
            >
              <span>{String.fromCharCode(65+idx)}</span>
              <b className={/[ぁ-んァ-ヶ一-龯]/.test(option)?'font-jp':'font-bn'}>
                {option}
              </b>
            </button>
          ))}
        </div>

        <div className="mock-next-row">
          <button className="premium-btn premium-btn-secondary" onClick={next}>
            {currentAnswer?'পরের প্রশ্ন':'Skip'}
          </button>
        </div>
      </article>
    </div>
  );
}
