'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  ExternalLink,
  Headphones,
  LibraryBig,
  Play,
  RefreshCcw,
  Sparkles,
} from 'lucide-react';

import { playText, stopAudio } from '@/lib/audio';
import { JLPT_N5_RESOURCES } from '@/lib/jlptResources';
import styles from './PublicLanding.module.css';

export type PublicLanguage='bn'|'en';
type TabId='starter'|'listening'|'quiz'|'resources';

const words=[
  {jp:'おはようございます',reading:'ohayou gozaimasu',bn:'সুপ্রভাত',en:'Good morning'},
  {jp:'ありがとうございます',reading:'arigatou gozaimasu',bn:'অনেক ধন্যবাদ',en:'Thank you very much'},
  {jp:'すみません',reading:'sumimasen',bn:'মাফ করবেন / দুঃখিত',en:'Excuse me / Sorry'},
  {jp:'いくらですか',reading:'ikura desu ka',bn:'দাম কত?',en:'How much is it?'},
  {jp:'わかりません',reading:'wakarimasen',bn:'আমি বুঝতে পারছি না',en:"I don't understand"},
  {jp:'もういちど おねがいします',reading:'mou ichido onegaishimasu',bn:'আরেকবার বলবেন',en:'Please say it once more'},
];

const grammar=[
  {pattern:'A は B です',example:'わたしは がくせいです。',bn:'আমি একজন শিক্ষার্থী।',en:'I am a student.'},
  {pattern:'N を Vます',example:'みずを のみます。',bn:'পানি পান করি।',en:'I drink water.'},
  {pattern:'N に いきます',example:'がっこうに いきます。',bn:'স্কুলে যাই।',en:'I go to school.'},
];

const listening=[
  {jp:'あした、がっこうへ いきます。',bn:'আগামীকাল স্কুলে যাব।',en:'I will go to school tomorrow.'},
  {jp:'コーヒーを ひとつ おねがいします。',bn:'একটি কফি দিন, অনুগ্রহ করে।',en:'One coffee, please.'},
  {jp:'でんしゃは なんじに きますか。',bn:'ট্রেন কয়টায় আসবে?',en:'What time will the train come?'},
];

const quiz=[
  {id:'q1',prompt:'「みず」 মানে কী?',promptEn:'What does 「みず」 mean?',bn:['পানি','বই','স্টেশন','বন্ধু'],en:['Water','Book','Station','Friend'],correct:0,exBn:'みず (mizu) অর্থ পানি।',exEn:'みず (mizu) means water.'},
  {id:'q2',prompt:'「わたし___がくせいです」—সঠিক particle কোনটি?',promptEn:'Choose the correct particle: 「わたし___がくせいです」',bn:['は','を','に','で'],en:['は','を','に','で'],correct:0,exBn:'は বাক্যের topic “わたし” চিহ্নিত করে।',exEn:'は marks わたし as the topic of the sentence.'},
  {id:'q3',prompt:'「やま」-এর সঠিক kanji কোনটি?',promptEn:'Which kanji means 「やま」?',bn:['川','山','日','本'],en:['川','山','日','本'],correct:1,exBn:'山-এর reading やま এবং অর্থ পাহাড়।',exEn:'山 is read やま and means mountain.'},
  {id:'q4',prompt:'「ありがとう」 কখন বলা হয়?',promptEn:'When do you say 「ありがとう」?',bn:['ধন্যবাদ দিতে','বিদায় বলতে','সময় জানতে','দুঃখ প্রকাশে'],en:['To thank someone','To say goodbye','To ask the time','To apologise'],correct:0,exBn:'ありがとう কৃতজ্ঞতা বা ধন্যবাদ প্রকাশ করে।',exEn:'ありがとう expresses thanks or gratitude.'},
  {id:'q5',prompt:'「きょう」 মানে কী?',promptEn:'What does 「きょう」 mean?',bn:['আজ','আগামীকাল','গতকাল','সকাল'],en:['Today','Tomorrow','Yesterday','Morning'],correct:0,exBn:'きょう (今日) অর্থ আজ।',exEn:'きょう (今日) means today.'},
];

const label=(language:PublicLanguage,bn:string,en:string)=>language==='bn'?bn:en;

export default function PublicFreeLab({language,onJoin}:{language:PublicLanguage;onJoin:()=>void}){
  const [tab,setTab]=useState<TabId>('starter');
  const [answers,setAnswers]=useState<Record<string,number>>({});
  const [submitted,setSubmitted]=useState(false);
  const [revealedListening,setRevealedListening]=useState<Record<number,boolean>>({});
  const score=useMemo(()=>quiz.filter(q=>answers[q.id]===q.correct).length,[answers]);

  useEffect(()=>()=>{stopAudio()},[]);

  const tabs:{id:TabId;bn:string;en:string;icon:typeof Sparkles}[]=[
    {id:'starter',bn:'স্টার্টার লেসন',en:'Starter lesson',icon:BookOpenCheck},
    {id:'listening',bn:'ফ্রি লিসেনিং',en:'Free listening',icon:Headphones},
    {id:'quiz',bn:'ফ্রি কুইজ',en:'Free quiz',icon:Sparkles},
    {id:'resources',bn:'মক রিসোর্স',en:'Mock resources',icon:LibraryBig},
  ];

  return <section className={styles.freeSection} id="public-free" aria-labelledby="public-free-title">
    <div className={styles.freeHeading}>
      <div>
        <span><Sparkles size={15}/>{label(language,'লগইন ছাড়াই ব্যবহার করুন','USE BEFORE YOU SIGN IN')}</span>
        <h2 id="public-free-title">{label(language,'আগে শিখুন, শুনুন ও নিজের লেভেল যাচাই করুন।','Learn, listen and check your level first.')}</h2>
        <p>{label(language,'কোনো account ছাড়াই এই starter lesson, listening practice, N5 quiz এবং verified free mock directory ব্যবহার করুন।','Use this starter lesson, listening practice, N5 quiz and verified free mock directory without an account.')}</p>
      </div>
      <div className={styles.freePromise}>
        <Check size={17}/><span>{label(language,'ফ্রি · কোনো লগইন নয়','Free · no login')}</span>
      </div>
    </div>

    <div className={styles.freeTabs} role="tablist" aria-label={label(language,'ফ্রি লার্নিং বিভাগ','Free learning sections')}>
      {tabs.map(({id,bn,en,icon:Icon})=><button key={id} type="button" role="tab" aria-selected={tab===id} className={tab===id?styles.freeTabActive:''} onClick={()=>{stopAudio();setTab(id)}}>
        <Icon size={17}/><span>{label(language,bn,en)}</span>
      </button>)}
    </div>

    <div className={styles.freePanel} role="tabpanel">
      {tab==='starter'&&<div className={styles.starterLayout}>
        <div>
          <div className={styles.panelKicker}>01 · {label(language,'দৈনন্দিন দরকারি শব্দ','Everyday essentials')}</div>
          <h3>{label(language,'আজই ব্যবহার করা যায় এমন ৬টি Japanese expression','Six Japanese expressions you can use today')}</h3>
          <div className={styles.wordGrid}>
            {words.map(word=><article key={word.jp}>
              <button type="button" aria-label={label(language,`${word.jp} শুনুন`,`Play ${word.jp}`)} onClick={()=>void playText(word.jp,.92,'public_free_phrase')}><Play size={15}/></button>
              <strong className="font-jp" lang="ja">{word.jp}</strong>
              <small>{word.reading}</small>
              <p className={language==='bn'?'font-bn':''}>{language==='bn'?word.bn:word.en}</p>
            </article>)}
          </div>
        </div>
        <aside className={styles.grammarSample}>
          <div className={styles.panelKicker}>02 · {label(language,'বেসিক গ্রামার','Basic grammar')}</div>
          <h3>{label(language,'তিনটি core sentence pattern','Three core sentence patterns')}</h3>
          {grammar.map(row=><article key={row.pattern}>
            <span className="font-jp">{row.pattern}</span>
            <strong className="font-jp" lang="ja">{row.example}</strong>
            <p className={language==='bn'?'font-bn':''}>{language==='bn'?row.bn:row.en}</p>
          </article>)}
        </aside>
      </div>}

      {tab==='listening'&&<div className={styles.listeningLab}>
        <div className={styles.panelKicker}>N5 · {label(language,'শুনে অর্থ ধরুন','LISTEN FOR MEANING')}</div>
        <h3>{label(language,'Audio চালান, তারপর অর্থ মিলিয়ে দেখুন','Play the audio, then check the meaning')}</h3>
        <p>{label(language,'প্রতিটি বাক্য natural Japanese neural voice-এ শোনা যাবে।','Each sentence uses the same low-latency Japanese voice system as the studio.')}</p>
        <div className={styles.listeningGrid}>
          {listening.map((row,index)=><article key={row.jp}>
            <button type="button" onClick={async()=>{const result=await playText(row.jp,.9,'public_free_listening');if(result==='ended')setRevealedListening(old=>({...old,[index]:true}))}} aria-label={label(language,`${index+1} নম্বর Japanese বাক্য শুনুন`,`Play Japanese sentence ${index+1}`)}><Headphones size={20}/><span>{label(language,'শুনুন','Play')}</span></button>
            <div><small>TRACK {String(index+1).padStart(2,'0')}</small><strong className="font-jp" lang="ja">{row.jp}</strong>{revealedListening[index]?<p className={language==='bn'?'font-bn':''}>{language==='bn'?row.bn:row.en}</p>:<button type="button" className={styles.revealMeaning} onClick={()=>setRevealedListening(old=>({...old,[index]:true}))}>{label(language,'অর্থ দেখুন','Reveal meaning')}</button>}</div>
          </article>)}
        </div>
      </div>}

      {tab==='quiz'&&<div className={styles.publicQuiz}>
        <div className={styles.quizIntro}>
          <div className={styles.panelKicker}>5 QUESTIONS · {label(language,'ফ্রি ডায়াগনস্টিক','FREE DIAGNOSTIC')}</div>
          <h3>{label(language,'আপনার N5 foundation এখনই যাচাই করুন','Check your N5 foundation now')}</h3>
          <p>{label(language,'Vocabulary, particle, kanji ও everyday expression—সব মিলিয়ে ছোট একটি check।','A short check across vocabulary, particles, kanji and everyday expressions.')}</p>
        </div>
        <div className={styles.quizQuestions}>
          {quiz.map((question,index)=><fieldset key={question.id}>
            <legend><span>{String(index+1).padStart(2,'0')}</span>{language==='bn'?question.prompt:question.promptEn}</legend>
            <div>{(language==='bn'?question.bn:question.en).map((option,optionIndex)=><button type="button" key={`${question.id}-${optionIndex}`} className={answers[question.id]===optionIndex?styles.quizOptionSelected:''} aria-pressed={answers[question.id]===optionIndex} onClick={()=>{setSubmitted(false);setAnswers(old=>({...old,[question.id]:optionIndex}))}}>{option}</button>)}</div>
            {submitted&&<p className={answers[question.id]===question.correct?styles.quizExplanationCorrect:styles.quizExplanationWrong}>{answers[question.id]===question.correct?label(language,'সঠিক।','Correct.'):label(language,`সঠিক উত্তর: ${(question.bn)[question.correct]}।`,`Correct answer: ${(question.en)[question.correct]}.`)} {language==='bn'?question.exBn:question.exEn}</p>}
          </fieldset>)}
        </div>
        <div className={styles.quizResult}>
          {submitted?<div aria-live="polite"><strong>{score}/5</strong><span>{score>=4?label(language,'দারুণ foundation!','Strong foundation!'):score>=2?label(language,'ভালো শুরু—আরও একটু practice করুন।','Good start—keep practising.'):label(language,'Starter lesson থেকে আরেকবার চেষ্টা করুন।','Review the starter lesson and try again.')}</span></div>:<p>{label(language,`${Object.keys(answers).length}/5টির উত্তর দেওয়া হয়েছে`,`${Object.keys(answers).length}/5 answered`)}</p>}
          <button type="button" disabled={Object.keys(answers).length<quiz.length} onClick={()=>setSubmitted(true)}>{label(language,'ফলাফল দেখুন','See result')}<ArrowRight size={16}/></button>
          {(submitted||Object.keys(answers).length>0)&&<button className={styles.resetQuiz} type="button" onClick={()=>{setAnswers({});setSubmitted(false)}}><RefreshCcw size={15}/>{label(language,'আবার শুরু','Reset')}</button>}
        </div>
      </div>}

      {tab==='resources'&&<div className={styles.resourceLab}>
        <div className={styles.resourceIntro}>
          <div className={styles.panelKicker}>VERIFIED · 01 SEP 2026</div>
          <h3>{label(language,'বিশ্বস্ত free JLPT N5 mock ও practice directory','Trusted free JLPT N5 mock and practice directory')}</h3>
          <p>{label(language,'Official materials কপি করা হয়নি—প্রতিটি card আপনাকে মূল provider-এর free resource-এ নিয়ে যাবে।','Official materials are not copied; every card opens the original provider’s free resource.')}</p>
        </div>
        <div className={styles.resourceGrid}>
          {JLPT_N5_RESOURCES.map(resource=><a key={resource.id} href={resource.url} target="_blank" rel="noreferrer noopener">
            <span className={styles.resourceType}>{resource.kind==='official'?'OFFICIAL':resource.kind==='full-mock'?'FULL MOCK':'PRACTICE BANK'}</span>
            <small>{resource.provider}</small>
            <h4>{resource.name}</h4>
            <p className={language==='bn'?'font-bn':''}>{language==='bn'?resource.summaryBn:resource.summaryEn}</p>
            <b>{resource.detail}</b>
            <em>{resource.freeAccess}<ExternalLink size={14}/></em>
          </a>)}
        </div>
      </div>}
    </div>

    <div className={styles.freeFooter}>
      <div><strong>{label(language,'ফ্রি অংশ ভালো লেগেছে?','Like the free experience?')}</strong><span>{label(language,'Account খুললে progress, SRS, ২৫টি lesson এবং mock history save হবে।','Create an account to save progress, SRS, 25 lessons and mock history.')}</span></div>
      <button type="button" onClick={onJoin}>{label(language,'ফ্রি account তৈরি করুন','Create free account')}<ArrowRight size={17}/></button>
    </div>
  </section>;
}
