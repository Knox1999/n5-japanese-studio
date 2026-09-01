'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Brain,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  FileCheck2,
  Headphones,
  Loader2,
  Flag,
  RotateCcw,
  ShieldCheck,
  Trophy,
  Volume2,
  type LucideIcon,
} from 'lucide-react';

import type {
  LessonPayload,
  MockAttempt,
  MockQuestionReview,
} from '@/lib/types';
import { loadLesson } from '@/lib/data';
import { playText, stopAudio, type AudioVoiceRole } from '@/lib/audio';
import { track } from '@/lib/analytics';
import { JLPT_N5_RESOURCES, JLPT_RESOURCE_REVIEWED } from '@/lib/jlptResources';
import { KEYS } from '@/lib/storage';
import { useLanguage } from '@/lib/language';

type SectionId='vocabulary'|'grammar-reading'|'listening';
type ModeId='quick'|'lesson'|'mini'|'full';

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
  icon:LucideIcon;
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
  descriptionBn:string;
  descriptionEn:string;
  label:string;
}>={
  quick:{
    title:'Quick Check',
    titleBn:'কুইক চেক',
    total:6,
    counts:{vocabulary:2,'grammar-reading':2,listening:2},
    minutes:{vocabulary:3,'grammar-reading':4,listening:3},
    allLessons:false,
    descriptionBn:'বর্তমান lesson থেকে ১০ মিনিটের দ্রুত readiness check।',
    descriptionEn:'A fast 10-minute readiness check using the current lesson.',
    label:'CURRENT LESSON',
  },
  lesson:{
    title:'Lesson Mock',
    titleBn:'লেসন মক',
    total:15,
    counts:{vocabulary:6,'grammar-reading':6,listening:3},
    minutes:{vocabulary:7,'grammar-reading':10,listening:5},
    allLessons:false,
    descriptionBn:'নির্বাচিত lesson-এর Vocabulary, Grammar/Reading ও Listening একসাথে যাচাই করুন।',
    descriptionEn:'Check vocabulary, grammar/reading and listening from the selected lesson.',
    label:'LESSON FOCUS',
  },
  mini:{
    title:'Mini Mock',
    titleBn:'মিনি মক',
    total:30,
    counts:{vocabulary:12,'grammar-reading':12,listening:6},
    minutes:{vocabulary:12,'grammar-reading':20,listening:10},
    allLessons:true,
    descriptionBn:'২৫টি lesson থেকে balanced ৪২-মিনিটের mixed practice।',
    descriptionEn:'A balanced 42-minute mixed practice drawn from all 25 lessons.',
    label:'ALL LESSONS',
  },
  full:{
    title:'Full JLPT N5 Mock',
    titleBn:'ফুল JLPT N5 মক',
    total:67,
    counts:{vocabulary:21,'grammar-reading':22,listening:24},
    minutes:{vocabulary:20,'grammar-reading':40,listening:30},
    allLessons:true,
    descriptionBn:'Official ২০/৪০/৩০-minute section timing ধরে ৬৭-item exam-style practice।',
    descriptionEn:'A 67-item exam-style practice using the official 20/40/30-minute section timing.',
    label:'EXAM SIMULATION',
  },
};

type ActiveMockRun={
  version:1;
  lesson:number;
  mode:ModeId;
  questions:Q[];
  index:number;
  answers:Record<string,string>;
  flagged:Record<string,boolean>;
  sectionSeconds:Record<SectionId,number>;
  lockedSections:SectionId[];
  startedAt:string;
  seed:number;
};

let questionRandom=()=>Math.random();
function seededRandom(seed:number){let value=seed>>>0;return()=>{value+=0x6D2B79F5;let result=value;result=Math.imul(result^(result>>>15),result|1);result^=result+Math.imul(result^(result>>>7),result|61);return((result^(result>>>14))>>>0)/4294967296}}

function shuffle<T>(a:T[]){
  const x=[...a];
  for(let i=x.length-1;i>0;i--){
    const j=Math.floor(questionRandom()*(i+1));
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

  cycle(readingPool,12).forEach((r,i)=>grammarQs.push({
    id:`rs-${i}-${r.id}`,
    section:'grammar-reading',
    itemType:'Short reading',
    prompt:r.jp,
    correct:r.bn,
    options:opts(r.bn,readingPool.map(x=>x.bn)),
  }));

  cycle(readings,8).forEach((r,i)=>grammarQs.push({
    id:`rm-${i}-${r.lesson}`,
    section:'grammar-reading',
    itemType:'Mid reading',
    prompt:r.jp.slice(0,420),
    correct:r.bn,
    options:opts(r.bn,readings.map(x=>x.bn)),
  }));

  const notices=[
    {id:'library',prompt:'【としょかん】月よう日は やすみです。火よう日から 金よう日は 9じから 6じまでです。土よう日は 5じまでです。土よう日は なんじまでですか。',correct:'5じまでです',options:['5じまでです','6じまでです','9じまでです','やすみです']},
    {id:'class',prompt:'【日本ごクラス】火よう日と 木よう日、7じから 8じ30ぷんまで。きょうは 木よう日です。クラスは なんじからですか。',correct:'7じからです',options:['7じからです','8じ30ぷんからです','火よう日からです','ありません']},
    {id:'shop',prompt:'【みどりスーパー】あさ 10じから よる 8じまで。日よう日は 7じに しまります。日よう日は なんじに しまりますか。',correct:'7じです',options:['7じです','8じです','10じです','あさです']},
    {id:'bus',prompt:'【えきまえバス】びょういんへ いくバスは 10じ15ふん、10じ45ふん、11じ15ふんです。10じ30ぷんの つぎは なんじですか。',correct:'10じ45ふんです',options:['10じ15ふんです','10じ30ぷんです','10じ45ふんです','11じ45ふんです']},
  ];
  cycle(notices,8).forEach((notice,i)=>grammarQs.push({
    id:`ri-${i}-${notice.id}`,
    section:'grammar-reading',
    itemType:'Information retrieval',
    prompt:notice.prompt,
    correct:notice.correct,
    options:shuffle(notice.options),
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

function buildQuestions(lessons:LessonPayload[],mode:ModeId,seed:number){
  const previous=questionRandom;questionRandom=seededRandom(seed);
  try{
    const banks=buildBanks(lessons);const cfg=MODES[mode];
    return ORDER.flatMap(section=>cycle(banks[section],cfg.counts[section]));
  }finally{questionRandom=previous}
}

function mmss(seconds:number){
  const m=Math.floor(seconds/60);
  const s=seconds%60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function createAttemptSeed(){
  return (Date.now()^Math.floor(Math.random()*0x7fffffff))>>>0;
}

export default function MockTest({
  data,onSave,onReviewMistakes
}:{
  data:LessonPayload;
  onSave:(a:MockAttempt)=>void;
  onReviewMistakes:(ids:number[])=>void;
}) {
  const {language,text}=useLanguage();
  const [mode,setMode]=useState<ModeId|null>(null);
  const [questions,setQuestions]=useState<Q[]>([]);
  const [i,setI]=useState(0);
  const [answers,setAnswers]=useState<Record<string,string>>({});
  const [result,setResult]=useState<MockAttempt|null>(null);
  const [wrongIds,setWrongIds]=useState<number[]>([]);
  const [sent,setSent]=useState(false);
  const [loading,setLoading]=useState(false);
  const [sectionSeconds,setSectionSeconds]=useState<Record<SectionId,number>>({vocabulary:0,'grammar-reading':0,listening:0});
  const [lockedSections,setLockedSections]=useState<SectionId[]>([]);
  const [flagged,setFlagged]=useState<Record<string,boolean>>({});
  const [startedAt,setStartedAt]=useState('');
  const [seed,setSeed]=useState(0);
  const [savedRun,setSavedRun]=useState<ActiveMockRun|null>(null);

  const q=questions[i];
  const cfg=mode?MODES[mode]:null;
  const currentSectionId=q?.section;
  const secondsLeft=currentSectionId?sectionSeconds[currentSectionId]:0;
  const sectionIndex=q
    ? questions.slice(0,i+1).filter(x=>x.section===q.section).length
    : 0;
  const sectionTotal=q&&cfg?cfg.counts[q.section]:0;

  useEffect(()=>{
    if(!currentSectionId||result||lockedSections.includes(currentSectionId))return;
    const id=window.setInterval(()=>setSectionSeconds(old=>({...old,[currentSectionId]:Math.max(0,old[currentSectionId]-1)})),1000);
    return()=>window.clearInterval(id);
  },[currentSectionId,lockedSections,result]);

  useEffect(()=>{
    try{
      const raw=window.localStorage.getItem(KEYS.activeMock);if(!raw)return;
      const saved=JSON.parse(raw) as ActiveMockRun;
      if(saved?.version!==1||saved.lesson!==data.lesson||!saved.questions?.length)return;
      setSavedRun(saved);setMode(saved.mode);setQuestions(saved.questions);setI(Math.min(saved.index,saved.questions.length-1));setAnswers(saved.answers||{});setFlagged(saved.flagged||{});setSectionSeconds(saved.sectionSeconds);setLockedSections(saved.lockedSections||[]);setStartedAt(saved.startedAt);setSeed(saved.seed);
    }catch{}
  },[data.lesson]);

  useEffect(()=>{
    if(!mode||!questions.length||result)return;
    const run:ActiveMockRun={version:1,lesson:data.lesson,mode,questions,index:i,answers,flagged,sectionSeconds,lockedSections,startedAt,seed};
    try{window.localStorage.setItem(KEYS.activeMock,JSON.stringify(run))}catch{}
  },[answers,data.lesson,flagged,i,lockedSections,mode,questions,result,sectionSeconds,seed,startedAt]);

  useEffect(()=>()=>{ stopAudio(); },[]);

  const start=async(nextMode:ModeId)=>{
    stopAudio();
    setLoading(true);
    setResult(null);
    setSent(false);
    setWrongIds([]);
    setAnswers({});
    setFlagged({});setLockedSections([]);setSavedRun(null);
    setI(0);
    setMode(nextMode);
    const nextSeed=createAttemptSeed();
    const nextStartedAt=new Date().toISOString();
    setSeed(nextSeed);setStartedAt(nextStartedAt);
    setSectionSeconds({
      vocabulary:MODES[nextMode].minutes.vocabulary*60,
      'grammar-reading':MODES[nextMode].minutes['grammar-reading']*60,
      listening:MODES[nextMode].minutes.listening*60,
    });
    try{window.localStorage.removeItem(KEYS.activeMock);window.localStorage.setItem(KEYS.modifiedAt,nextStartedAt)}catch{}

    try {
      const source=MODES[nextMode].allLessons
        ? await Promise.all(Array.from({length:25},(_,idx)=>loadLesson(idx+1)))
        : [data];
      const built=buildQuestions(source,nextMode,nextSeed);
      setQuestions(built);
      track('quiz_event',{
        quiz_action:'start',
        quiz_type:nextMode,
        question_count:built.length,
      });
    } catch {
      const built=buildQuestions([data],nextMode,nextSeed);
      setQuestions(built);
    } finally {
      setLoading(false);
    }
  };

  const choose=(answer:string)=>{
    if(!q)return;
    setAnswers(old=>({...old,[q.id]:answer}));
    try{window.localStorage.setItem(KEYS.modifiedAt,new Date().toISOString())}catch{}
    track('quiz_event',{
      quiz_action:'answer',
      quiz_type:mode,
      question_number:i+1,
      question_type:q.itemType,
      section_name:q.section,
    });
  };

  const finish=(reason:'completed'|'time-expired'='completed')=>{
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
    const responses:MockQuestionReview[]=questions.map(question=>({
      id:question.id,section:question.section,itemType:question.itemType,prompt:question.prompt,
      options:question.options,userAnswer:answers[question.id],correctAnswer:question.correct,
      correct:answers[question.id]===question.correct,
      explanation:`সঠিক উত্তর / Correct answer: ${question.correct}`,
      wordId:question.wordId,audioText:question.audioText,
    }));
    const completedAt=new Date().toISOString();
    const attempt:MockAttempt={
      id:`mock-${seed}-${Date.now()}`,
      lesson:data.lesson,
      scope:mode==='full'?'n5-full':mode==='mini'?'n5-mini':'lesson',
      mode,
      label:MODES[mode].title,
      score,
      correct,
      total,
      date:completedAt,
      durationSeconds:Math.max(0,Math.round((Date.parse(completedAt)-Date.parse(startedAt||completedAt))/1000)),
      seed,
      breakdown,
      responses,
    };
    setResult(attempt);
    setWrongIds(Array.from(new Set(wrongWords)));
    setQuestions([]);
    setSavedRun(null);
    try{window.localStorage.removeItem(KEYS.activeMock);window.localStorage.setItem(KEYS.modifiedAt,completedAt)}catch{}
    onSave(attempt);
    track('quiz_event',{
      quiz_action:'complete',
      quiz_type:mode,
      score_percent:score,
      correct_count:correct,
      wrong_count:total-correct,
      completion_reason:reason,
    });
  };

  const next=()=>{
    stopAudio();
    if(i+1>=questions.length)finish();
    else{
      const nextQuestion=questions[i+1];
      if(nextQuestion.section!==q.section)setLockedSections(old=>Array.from(new Set([...old,q.section])));
      setI(x=>x+1);
    }
  };

  const saveAndExit=()=>{
    if(!mode||!questions.length)return;
    const run:ActiveMockRun={version:1,lesson:data.lesson,mode,questions,index:i,answers,flagged,sectionSeconds,lockedSections,startedAt,seed};
    try{window.localStorage.setItem(KEYS.activeMock,JSON.stringify(run))}catch{}
    setSavedRun(run);stopAudio();setQuestions([]);setMode(null);setI(0);
  };

  const resumeSaved=()=>{
    if(!savedRun)return;
    setMode(savedRun.mode);setQuestions(savedRun.questions);setI(savedRun.index);setAnswers(savedRun.answers);setFlagged(savedRun.flagged);setSectionSeconds(savedRun.sectionSeconds);setLockedSections(savedRun.lockedSections);setStartedAt(savedRun.startedAt);setSeed(savedRun.seed);
  };

  useEffect(()=>{
    if(!q||secondsLeft>0||lockedSections.includes(q.section)||!questions.length)return;
    stopAudio();setLockedSections(old=>Array.from(new Set([...old,q.section])));
    const nextSectionIndex=questions.findIndex((question,index)=>index>i&&question.section!==q.section&&!lockedSections.includes(question.section));
    if(nextSectionIndex>=0)setI(nextSectionIndex);else finish('time-expired');
    // Only run when the active section reaches zero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[secondsLeft]);

  if(result&&mode){
    return (
      <div className="space-y-5">
        <section className="study-header tone-mock">
          <div>
            <div className="section-kicker">{MODES[mode].title}</div>
            <h1>{result.score}%</h1>
            <p className={language==='bn'?'font-bn':''}>{result.correct}/{result.total} {text('সঠিক উত্তর','correct answers')}</p>
          </div>
          <Trophy className="header-big-icon"/>
        </section>

        <article className="premium-panel">
          <div className="result-hero">
            <div className="score-orb">{result.score}%</div>
            <div>
              <h2 className={language==='bn'?'font-bn':''}>
                {result.score>=90?text('দারুণ ফলাফল','Excellent result'):result.score>=70?text('ভালো অগ্রগতি','Good progress'):text('আরও রিভিউ দরকার','More review needed')}
              </h2>
              <p className={language==='bn'?'font-bn':''}>
                {text('Section breakdown দেখে দুর্বল অংশে ফিরে practice করুন।','Use the section breakdown to revisit weaker areas.')}
              </p>
            </div>
          </div>

          <p className={`mock-score-note ${language==='bn'?'font-bn':''}`}>
            {text('এটি raw practice percentage—official JLPT scaled score নয়। Official N5 pass rule হলো মোট 80/180, Language Knowledge/Reading-এ অন্তত 38/120 এবং Listening-এ অন্তত 19/60।','This is a raw practice percentage, not an official JLPT scaled score. The official N5 pass rules are 80/180 overall, at least 38/120 in Language Knowledge/Reading, and at least 19/60 in Listening.')}
          </p>

          <div className="mock-result-section">
            {ORDER.map(id=>{
              const row=result.breakdown?.[id]||{correct:0,total:0};
              return (
                <div key={id}>
                  <span className={language==='bn'?'font-bn':''}>{language==='bn'?SECTIONS[id].titleBn:SECTIONS[id].titleEn}</span>
                  <b>{Math.round(row.correct/Math.max(1,row.total)*100)}%</b>
                  <small>{row.correct}/{row.total}</small>
                </div>
              );
            })}
          </div>

          <details className="mock-answer-review" open={result.score<80}>
            <summary>{text('প্রতিটি উত্তর ও ব্যাখ্যা দেখুন','Review every answer and explanation')}</summary>
            <div>{result.responses?.map((response,index)=><article key={response.id} className={response.correct?'correct':'wrong'}>
              <header><span>Q{index+1}</span><b>{response.itemType}</b><em>{response.correct?text('সঠিক','Correct'):text('ভুল','Incorrect')}</em></header>
              {response.audioText&&<button type="button" onClick={()=>void playText(response.audioText!,1,'mock_review')}><Volume2/>{text('Audio আবার শুনুন','Replay audio')}</button>}
              <p className={/[ぁ-んァ-ヶ一-龯]/.test(response.prompt)?'font-jp':'font-bn'}>{response.prompt}</p>
              <dl><div><dt>{text('আপনার উত্তর','Your answer')}</dt><dd>{response.userAnswer||text('উত্তর দেওয়া হয়নি','Not answered')}</dd></div><div><dt>{text('সঠিক উত্তর','Correct answer')}</dt><dd>{response.correctAnswer}</dd></div></dl>
              <small>{response.explanation}</small>
            </article>)}</div>
          </details>

          <div className="mock-result-actions">
            <button className="premium-btn premium-btn-primary" onClick={()=>start(mode)}>
              <RotateCcw size={16}/> {text('আবার দিন','Try again')}
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
                {sent?text('Recall-এ যোগ হয়েছে','Added to Recall'):text(`${wrongIds.length}টি Vocabulary mistake → Recall`,`${wrongIds.length} vocabulary mistakes → Recall`)}
              </button>
            )}
            <button
              className="premium-btn premium-btn-secondary"
              onClick={()=>{setResult(null);setMode(null)}}
            >
              {text('সব mode দেখুন','View all modes')}
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
            <h1 className={language==='bn'?'font-bn':''}>{text('লক্ষ্য ও সময় অনুযায়ী মক বেছে নিন','Choose a mock for your goal and available time')}</h1>
            <p className={language==='bn'?'font-bn':''}>
              {text('Quick Check, Lesson Mock, Mini Mock অথবা ৯০-মিনিটের Full Mock—প্রতিটি mode original N5 lesson data থেকে তৈরি হয়।','Choose a Quick Check, Lesson Mock, Mini Mock or 90-minute Full Mock. Every mode is built from the original N5 lesson data.')}
            </p>
          </div>
          <ClipboardCheck className="header-big-icon"/>
        </section>

        {savedRun&&<section className="mock-resume-card" aria-label={text('সংরক্ষিত মক টেস্ট','Saved mock test')}>
          <Clock3/><div><small>{text('চলমান attempt','IN-PROGRESS ATTEMPT')}</small><b>{MODES[savedRun.mode].title}</b><span>{text(`${savedRun.index+1}/${savedRun.questions.length} প্রশ্ন পর্যন্ত`,`Resume from question ${savedRun.index+1} of ${savedRun.questions.length}`)}</span></div>
          <button className="premium-btn premium-btn-primary" type="button" onClick={resumeSaved}>{text('আবার শুরু করুন','Resume test')}<ArrowRight/></button>
          <button type="button" onClick={()=>{try{window.localStorage.removeItem(KEYS.activeMock)}catch{}setSavedRun(null)}}>{text('মুছুন','Discard')}</button>
        </section>}

        <div className="jlpt-blueprint nv-final-mock-modes">
          {(Object.keys(MODES) as ModeId[]).map(id=>{
            const m=MODES[id];
            const Icon=id==='full'?Trophy:id==='mini'?BookOpenText:id==='lesson'?FileCheck2:ClipboardCheck;
            return (
              <article className={`jlpt-section-card ${id}`} key={id}>
                <span>{m.label}</span>
                <Icon size={22}/>
                <h3>{m.title}</h3>
                <small className={language==='bn'?'font-bn':''}>{language==='bn'?m.titleBn:m.label}</small>
                <b><Clock3 size={17}/> {Object.values(m.minutes).reduce((a,b)=>a+b,0)} min target</b>
                <p className={language==='bn'?'font-bn':''}>{language==='bn'?m.descriptionBn:m.descriptionEn}</p>
                <div className="mock-mode-breakdown">
                  <span>{m.counts.vocabulary}<small>Vocab</small></span>
                  <span>{m.counts['grammar-reading']}<small>Grammar/Reading</small></span>
                  <span>{m.counts.listening}<small>Listening</small></span>
                </div>
                <strong>{m.total} {text('প্রশ্ন','questions')}</strong>
                <button
                  className="premium-btn premium-btn-primary"
                  onClick={()=>void start(id)}
                  disabled={loading}
                >
                  {loading?<><Loader2 className="animate-spin"/> Loading…</>:text(`${m.titleBn} শুরু করুন`,`Start ${m.title}`)}
                </button>
              </article>
            );
          })}
        </div>

        <div className="jlpt-launch">
          <div>
            <b>Full Mock practice blueprint · 67 original items</b>
            <p className="font-bn">
              Vocabulary 21 + Grammar/Reading 22 + Listening 24 · official 20/40/30-minute section timing.
            </p>
          </div>
          <button className="premium-btn premium-btn-primary" onClick={()=>void start('full')} disabled={loading}>
            <Trophy size={17}/> {text('Full Mock শুরু করুন','Start Full Mock')}
          </button>
        </div>

        <section className="mock-official-guide" aria-labelledby="mock-official-title">
          <div>
            <span><ShieldCheck size={16}/> OFFICIAL N5 REFERENCE</span>
            <h2 id="mock-official-title" className={language==='bn'?'font-bn':''}>{text('Official structure ধরে practice, কিন্তু score নিয়ে পরিষ্কার ব্যাখ্যা','Practice the official structure with honest scoring')}</h2>
            <p className={language==='bn'?'font-bn':''}>{text('N5-এ Vocabulary ২০ মিনিট, Grammar/Reading ৪০ মিনিট এবং Listening ৩০ মিনিট। Official pass mark মোট 80/180; Language Knowledge/Reading-এ 38/120 এবং Listening-এ 19/60 minimum দরকার। এই app raw percentage দেখায়—official scaled score দাবি করে না।','N5 uses 20 minutes for Vocabulary, 40 for Grammar/Reading and 30 for Listening. The official pass mark is 80/180 overall, with minimums of 38/120 for Language Knowledge/Reading and 19/60 for Listening. This app reports a raw practice percentage, not an official scaled score.')}</p>
          </div>
          <div className="mock-official-stats">
            <article><strong>20</strong><span>Vocabulary</span></article>
            <article><strong>40</strong><span>Grammar · Reading</span></article>
            <article><strong>30</strong><span>Listening</span></article>
          </div>
        </section>

        <section className="mock-resource-library" aria-labelledby="mock-resource-title">
          <header>
            <div><span>FREE ONLINE DIRECTORY · REVIEWED {JLPT_RESOURCE_REVIEWED}</span><h2 id="mock-resource-title" className={language==='bn'?'font-bn':''}>{text('আরও free JLPT N5 mock ও practice resource','More free JLPT N5 mocks and practice resources')}</h2></div>
            <p className={language==='bn'?'font-bn':''}>{text('Copyrighted প্রশ্ন কপি করা হয়নি—link খুললে original provider-এর resource ব্যবহার করবেন।','Copyrighted questions are not copied here; each link opens the original provider’s resource.')}</p>
          </header>
          <div>
            {JLPT_N5_RESOURCES.map(resource=><a key={resource.id} href={resource.url} target="_blank" rel="noreferrer noopener">
              <span>{resource.kind==='official'?'OFFICIAL':resource.kind==='full-mock'?'FULL MOCK':'PRACTICE BANK'}</span>
              <small>{resource.provider}</small>
              <h3>{resource.name}</h3>
              <p className={language==='bn'?'font-bn':''}>{language==='bn'?resource.summaryBn:resource.summaryEn}</p>
              <b>{resource.detail}</b>
              <em>{resource.freeAccess}<ExternalLink size={14}/></em>
            </a>)}
          </div>
        </section>
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
          <b className={language==='bn'?'font-bn':''}>{language==='bn'?section.titleBn:section.titleEn}</b>
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
          <small>{Object.keys(answers).length} {text('টির উত্তর দেওয়া','answered')}</small>
        </div>

        <div className="mock-question-tools">
          <button type="button" className={flagged[q.id]?'flagged':''} aria-pressed={!!flagged[q.id]} onClick={()=>setFlagged(old=>({...old,[q.id]:!old[q.id]}))}><Flag/>{flagged[q.id]?text('Flag সরান','Remove flag'):text('Review-এর জন্য flag করুন','Flag for review')}</button>
          <span>{Object.values(flagged).filter(Boolean).length} {text('টি flagged','flagged')}</span>
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
            <span className={language==='bn'?'font-bn':''}>{text('Audio শুনুন','Play audio')}</span>
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

        <nav className="mock-question-navigator" aria-label={text('প্রশ্ন নেভিগেটর','Question navigator')}>
          {questions.map((question,index)=><button key={question.id} type="button" disabled={lockedSections.includes(question.section)&&index!==i} className={`${index===i?'current':''} ${answers[question.id]?'answered':''} ${flagged[question.id]?'flagged':''}`} onClick={()=>{stopAudio();setI(index)}} aria-label={text(`প্রশ্ন ${index+1}${answers[question.id]?' উত্তর দেওয়া':''}${flagged[question.id]?' flagged':''}`,`Question ${index+1}${answers[question.id]?' answered':''}${flagged[question.id]?' flagged':''}`)}>{index+1}</button>)}
        </nav>

        <div className="mock-next-row">
          <button className="premium-btn premium-btn-secondary" disabled={i===0||lockedSections.includes(questions[i-1]?.section)} onClick={()=>{stopAudio();setI(value=>Math.max(0,value-1))}}>
            <ArrowLeft size={16}/> {text('আগের প্রশ্ন','Previous')}
          </button>
          <button className="mock-exit-button" type="button" onClick={saveAndExit}>
            {text('Save করে বের হন','Save & exit')}
          </button>
          <button className="premium-btn premium-btn-primary" onClick={next}>
            {i+1>=questions.length?text('ফলাফল দেখুন','See result'):currentAnswer?text('পরের প্রশ্ন','Next question'):text('Skip করুন','Skip')}<ArrowRight size={16}/>
          </button>
        </div>
      </article>
    </div>
  );
}
