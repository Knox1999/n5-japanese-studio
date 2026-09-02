'use client';

import Image from 'next/image';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Headphones,
  Languages,
  Menu,
  Quote,
  ShieldCheck,
  Sparkles,
  Target,
  TreePine,
  X,
} from 'lucide-react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';

import PublicFreeLab from './PublicFreeLab';
import { useLanguage } from '@/lib/language';
import styles from './PublicLanding.module.css';

type Props={onLogin:()=>void;onJoin:()=>void};

const basePath=process.env.NEXT_PUBLIC_BASE_PATH||'';

const journey=[
  ['01','Learn','শব্দ, grammar ও kanji বুঝে নিন।','Understand the core words, grammar and kanji.'],
  ['02','Practice','Listening, recall ও targeted exercise করুন।','Use listening, recall and targeted exercises.'],
  ['03','Review','SRS ও mistake queue দিয়ে দুর্বলতা ঠিক করুন।','Repair weak points with SRS and the mistake queue.'],
  ['04','Test','Lesson থেকে Full mock—সময় ধরে প্রস্তুতি যাচাই করুন।','Check readiness from lesson tests to a timed full mock.'],
];

type ModuleSection={
  id:string;icon:typeof BookOpen;kicker:string;
  titleBn:string;titleEn:string;bodyBn:string;bodyEn:string;
  pointsBn:string[];pointsEn:string[];mock:'vocabulary'|'grammar'|'kanji'|'listening'|'mock';
};

const moduleSections:ModuleSection[]=[
  {
    id:'public-vocabulary',icon:BookOpen,kicker:'MODULE 01 · VOCABULARY',mock:'vocabulary',
    titleBn:'Lesson অনুযায়ী শব্দভান্ডার, উচ্চারণ শুনে শুনে',titleEn:'Lesson-by-lesson vocabulary, learned by ear',
    bodyBn:'প্রতিটি lesson-এর শব্দ Japanese audio, উদাহরণ বাক্য এবং active recall প্রশ্নসহ সাজানো—তাই একবার দেখলেই থেমে থাকতে হয় না।',
    bodyEn:'Every lesson’s words come with Japanese audio, example sentences and active-recall prompts, so a first look is never the last.',
    pointsBn:['২৫টি lesson জুড়ে সাজানো core vocabulary','প্রতিটি শব্দে native-style audio ও reading','Mastery tracking—কোন শব্দ পাকা, কোনটা বাকি'],
    pointsEn:['Core vocabulary organised across 25 lessons','Native-style audio and reading on every word','Mastery tracking for what is solid and what is left'],
  },
  {
    id:'public-grammar',icon:Languages,kicker:'MODULE 02 · GRAMMAR',mock:'grammar',
    titleBn:'বাংলা ব্যাখ্যাসহ N5 grammar pattern',titleEn:'N5 grammar patterns, explained in Bangla',
    bodyBn:'প্রতিটি pattern-এর গঠন, বাংলা ব্যাখ্যা এবং guided practice একসাথে—তাই particle ও sentence structure নিয়ে দ্বিধা কমে আসে।',
    bodyEn:'Each pattern pairs its structure with a Bangla explanation and guided practice, so particles and sentence order stop feeling like guesswork.',
    pointsBn:['কোর N5 sentence pattern, বাংলা ব্যাখ্যাসহ','প্রতিটি pattern-এ real example বাক্য','Guided practice দিয়ে সাথে সাথে যাচাই'],
    pointsEn:['Core N5 sentence patterns with Bangla explanations','Real example sentences for every pattern','Guided practice to check understanding right away'],
  },
  {
    id:'public-kanji',icon:TreePine,kicker:'MODULE 03 · KANJI',mock:'kanji',
    titleBn:'Meaning, reading ও stroke order—একই জায়গায়',titleEn:'Meaning, readings and stroke order in one view',
    bodyBn:'KLC Kanji Matrix থেকে প্রতিটি kanji-র meaning, reading ও memory story দেখে, stroke order অনুসরণ করে practice করা যায়।',
    bodyEn:'The KLC Kanji Matrix surfaces each kanji’s meaning, readings and a memory story, with stroke order you can follow while you practise.',
    pointsBn:['N5 kanji set, memory story-সহ','Stroke order অনুসরণ করে লেখার practice','Reading ও meaning একসাথে recall test'],
    pointsEn:['The full N5 kanji set with memory stories','Stroke-order practice you can follow along with','Combined reading and meaning recall checks'],
  },
  {
    id:'public-listening',icon:Headphones,kicker:'MODULE 04 · LISTENING',mock:'listening',
    titleBn:'দ্রুত Japanese audio ও shadowing practice',titleEn:'Low-latency Japanese audio and shadowing',
    bodyBn:'প্রতিটি track শোনার পর অর্থ মিলিয়ে দেখা যায়, আর shadowing mode দিয়ে নিজের উচ্চারণ practice করা যায়।',
    bodyEn:'Play a track, check the meaning afterwards, and use shadowing mode to practise your own pronunciation against it.',
    pointsBn:['Low-latency neural Japanese audio','Shadowing mode দিয়ে উচ্চারণ practice','Comprehension check প্রতিটি track-এর পর'],
    pointsEn:['Low-latency neural Japanese audio','Shadowing mode for pronunciation practice','A comprehension check after every track'],
  },
  {
    id:'public-mock',icon:Target,kicker:'MODULE 05 · MOCK TEST',mock:'mock',
    titleBn:'Quick, Lesson, Mini থেকে পূর্ণাঙ্গ ৬৭-item mock',titleEn:'Quick, Lesson and Mini tests up to a full 67-item mock',
    bodyBn:'প্রস্তুতির ধাপ অনুযায়ী ছোট checkpoint থেকে সময় ধরে পূর্ণাঙ্গ mock দেওয়া যায়, এবং প্রতিটি ভুল history-তে review করা যায়।',
    bodyEn:'Take a short checkpoint or a full timed mock depending on how far you are, and review every mistake afterwards in your history.',
    pointsBn:['Quick, Lesson, Mini ও Full (৬৭-item) mock','সময় ধরে পরীক্ষা—আসল পরিবেশের কাছাকাছি','প্রতিটি ভুল history থেকে review'],
    pointsEn:['Quick, Lesson, Mini and Full (67-item) mocks','Timed practice that mirrors real conditions','Every mistake stays reviewable in your history'],
  },
];

const trustHighlights=[
  {
    icon:BookOpen,
    quoteBn:'একটি independent Bangla-first studio হিসেবে আমরা official JLPT affiliation দাবি করি না—শুধু পরিষ্কার, lesson-based curriculum দিই।',
    quoteEn:'As an independent Bangla-first studio, we do not claim official JLPT affiliation—just a clear, lesson-based curriculum.',
    attributionBn:'স্টুডিও নীতি','attributionEn':'Studio principle',
  },
  {
    icon:ShieldCheck,
    quoteBn:'Progress cloud-এ sync হয়, কিন্তু JSON export এবং permanent account deletion সবসময় আপনার হাতে থাকে।',
    quoteEn:'Progress syncs to the cloud, but JSON export and permanent account deletion stay in your hands at all times.',
    attributionBn:'ডেটা নীতি','attributionEn':'Data principle',
  },
  {
    icon:Target,
    quoteBn:'Practice percentage-কে কখনও official scaled score হিসেবে দেখানো হয় না; প্রতিটি ভুল খোলাখুলি review করা যায়।',
    quoteEn:'Practice percentages are never presented as an official scaled score; every mistake stays open for honest review.',
    attributionBn:'স্কোরিং নীতি','attributionEn':'Scoring principle',
  },
];

const faqItems=[
  {
    qBn:'পুরো studio ব্যবহার করতে কি টাকা লাগে?',qEn:'Does using the full studio cost anything?',
    aBn:'না। Account তৈরি করা এবং Vocabulary, SRS, Listening, Grammar, Kanji, Kana ও Mock Test সহ পুরো learning studio সম্পূর্ণ ফ্রি—কোনো locked lesson বা premium badge নেই।',
    aEn:'No. Creating an account and using the full studio—Vocabulary, SRS, Listening, Grammar, Kanji, Kana and Mock Test—is completely free, with no locked lessons or premium badges.',
  },
  {
    qBn:'Account ছাড়াই কী কী ব্যবহার করা যায়?',qEn:'What can I use without creating an account?',
    aBn:'Starter lesson, Japanese listening, একটি diagnostic quiz এবং verified free mock-resource directory—এই অংশগুলো login ছাড়াই ব্যবহার করা যায়।',
    aEn:'The starter lesson, Japanese listening, a diagnostic quiz and the verified free mock-resource directory are all usable without logging in.',
  },
  {
    qBn:'এটা কি official JLPT পরীক্ষা বা certificate?',qEn:'Is this an official JLPT exam or certificate?',
    aBn:'না। এটি একটি independent self-study studio। Mock test-গুলো practice-এর জন্য এবং কখনও official scaled score হিসেবে দেখানো হয় না।',
    aEn:'No. This is an independent self-study studio. The mock tests are for practice and are never presented as an official scaled score.',
  },
  {
    qBn:'আমার progress কোথায় থাকে?',qEn:'Where does my progress live?',
    aBn:'Progress ব্রাউজারে থাকে এবং account থাকলে cloud-এ sync হয়। যেকোনো সময় JSON export করা যায়, আর Backup ও Restore থেকে data নিজের হাতে রাখা যায়।',
    aEn:'Progress lives in your browser and syncs to the cloud when you have an account. You can export it as JSON any time, and Backup & Restore keeps your data in your own hands.',
  },
  {
    qBn:'বাংলা আর English—দুটোতেই কি পড়া যায়?',qEn:'Can I study in both Bangla and English?',
    aBn:'হ্যাঁ। উপরের ভাষা switcher থেকে যেকোনো সময় বাংলা ও English-এর মধ্যে পরিবর্তন করা যায়—পুরো interface সাথে সাথে বদলে যায়।',
    aEn:'Yes. The language switcher at the top lets you move between Bangla and English at any time, and the whole interface updates immediately.',
  },
];

const heroContainer:Variants={hidden:{},visible:{transition:{staggerChildren:.14,delayChildren:.05}}};
const heroItem:Variants={hidden:{opacity:0,y:26},visible:{opacity:1,y:0,transition:{duration:.62,ease:[.2,.8,.2,1]}}};
const heroHeadline:Variants={hidden:{opacity:0,clipPath:'inset(-25% 100% -25% -2%)'},visible:{opacity:1,clipPath:'inset(-25% 0% -25% -2%)',transition:{duration:.9,ease:[.16,1,.3,1]}}};
const heroHighlightPop:Variants={hidden:{opacity:0,scale:.82,y:8},visible:{opacity:1,scale:1,y:0,transition:{duration:.6,delay:.5,ease:[.34,1.56,.64,1]}}};

function Reveal({children,className,delay=0,as='div'}:{children:ReactNode;className?:string;delay?:number;as?:'div'|'article'}){
  const reduceMotion=useReducedMotion();
  const variants:Variants={hidden:{opacity:0,y:26},visible:{opacity:1,y:0,transition:{duration:.55,delay,ease:[.2,.8,.2,1]}}};
  if(reduceMotion)return as==='article'?<article className={className}>{children}</article>:<div className={className}>{children}</div>;
  const MotionTag=as==='article'?motion.article:motion.div;
  return <MotionTag className={className} initial="hidden" whileInView="visible" viewport={{once:true,margin:'-70px'}} variants={variants}>{children}</MotionTag>;
}

const TIME_GREETINGS=[
  {from:5,to:11,jp:'おはよう',reading:'ohayou',en:'Good morning',bn:'সুপ্রভাত'},
  {from:12,to:17,jp:'こんにちは',reading:'konnichiwa',en:'Good afternoon',bn:'শুভ অপরাহ্ন'},
  {from:18,to:23,jp:'こんばんは',reading:'konbanwa',en:'Good evening',bn:'শুভ সন্ধ্যা'},
  {from:0,to:4,jp:'こんばんは',reading:'konbanwa',en:'Good evening',bn:'শুভ সন্ধ্যা'},
] as const;

function greetingForHour(hour:number){
  return TIME_GREETINGS.find(g=>hour>=g.from&&hour<=g.to)??TIME_GREETINGS[0];
}

function ModuleMock({kind}:{kind:ModuleSection['mock']}){
  const [greeting,setGreeting]=useState<typeof TIME_GREETINGS[number]>(TIME_GREETINGS[0]);
  useEffect(()=>{if(kind==='vocabulary')setGreeting(greetingForHour(new Date().getHours()))},[kind]);

  if(kind==='vocabulary')return <div className={styles.mockCard}>
    <div className={styles.mockRow}><span className="font-jp">{greeting.jp}</span><small>{greeting.reading}</small></div>
    <p>{greeting.en} · {greeting.bn}</p>
    <div className={styles.mockMeter}><i style={{width:'82%'}}/></div>
    <span className={styles.mockTag}>Mastered 82%</span>
  </div>;
  if(kind==='grammar')return <div className={styles.mockCard}>
    <span className={styles.mockPattern}>A は B です</span>
    <strong className="font-jp">わたしは がくせいです。</strong>
    <p>I am a student.</p>
  </div>;
  if(kind==='kanji')return <div className={styles.mockCard}>
    <div className={styles.mockKanjiRow}><span className="font-jp">山</span><div><strong>やま</strong><small>mountain</small></div></div>
    <div className={styles.mockStrokeRow}>{[1,2,3].map(step=><i key={step}>{step}</i>)}</div>
  </div>;
  if(kind==='listening')return <div className={styles.mockCard}>
    <div className={styles.mockWave}>{Array.from({length:14}).map((_,index)=><i key={index} style={{height:`${18+((index*7)%26)}px`}}/>)}</div>
    <span className={styles.mockTag}>TRACK 03 · 0:18</span>
  </div>;
  return <div className={styles.mockCard}>
    <div className={styles.mockTimer}><span>08:42</span><small>remaining</small></div>
    <div className={styles.mockProgressDots}>{Array.from({length:5}).map((_,index)=><i key={index} className={index<3?styles.mockDotDone:''}/>)}</div>
  </div>;
}

export default function PublicLanding({onLogin,onJoin}:Props){
  const [menuOpen,setMenuOpen]=useState(false);
  const [scrolled,setScrolled]=useState(false);
  const [openFaq,setOpenFaq]=useState<number|null>(0);
  const {language,setLanguage,text}=useLanguage();
  const reduceMotion=useReducedMotion();

  useEffect(()=>{
    const onScroll=()=>setScrolled(window.scrollY>24);
    onScroll();
    window.addEventListener('scroll',onScroll,{passive:true});
    return()=>window.removeEventListener('scroll',onScroll);
  },[]);

  const chooseLanguage=(next:'bn'|'en')=>{
    setLanguage(next);
    const target=next==='en'?`${basePath}/en/`:`${basePath}/`;
    if(window.location.pathname!==target)window.history.replaceState(window.history.state,'',target);
  };

  const goTo=(id:string)=>{
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});
  };

  return <div className={`${styles.page} ${language==='bn'?styles.banglaPage:''}`}>
    <header className={`${styles.header} ${scrolled?styles.headerScrolled:''}`}>
      <div className={styles.headerInner}>
        <button className={styles.brand} type="button" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>
          <span className={styles.logoWrap}><Image src={`${basePath}/assets/nihongo-vibes-logo-96.png`} alt="" width={48} height={48} priority/></span>
          <span className={styles.brandCopy}><strong>THE NIHONGO VIBES</strong><small>JLPT N5 STUDY STUDIO</small></span>
        </button>

        <nav className={styles.desktopNav} aria-label={text('পাবলিক নেভিগেশন','Public navigation')}>
          <button type="button" onClick={()=>goTo('public-free')}>{text('ফ্রি শেখা','Free learning')}</button>
          <button type="button" onClick={()=>goTo('public-vocabulary')}>{text('মডিউল','Modules')}</button>
          <button type="button" onClick={()=>goTo('public-journey')}>{text('কীভাবে কাজ করে','How it works')}</button>
          <button type="button" onClick={()=>goTo('public-dashboard')}>{text('ড্যাশবোর্ড','Dashboard')}</button>
          <button type="button" onClick={()=>goTo('public-faq')}>FAQ</button>
        </nav>

        <div className={styles.languageSwitch} role="group" aria-label="Language / ভাষা">
          <button type="button" className={language==='bn'?styles.languageActive:''} aria-pressed={language==='bn'} onClick={()=>chooseLanguage('bn')}>বাংলা</button>
          <button type="button" className={language==='en'?styles.languageActive:''} aria-pressed={language==='en'} onClick={()=>chooseLanguage('en')}>EN</button>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.loginButton} type="button" onClick={onLogin}>{text('লগইন','Login')}</button>
          <button className={styles.joinButton} type="button" onClick={onJoin}>{text('ফ্রি account','Free account')}<ArrowRight size={16}/></button>
        </div>

        <button className={styles.menuButton} type="button" onClick={()=>setMenuOpen(value=>!value)} aria-label={text('নেভিগেশন খুলুন','Toggle navigation')} aria-expanded={menuOpen}>
          {menuOpen?<X size={22}/>:<Menu size={22}/>}
        </button>
      </div>

      {menuOpen&&<div className={styles.mobileMenu}>
        <button type="button" onClick={()=>goTo('public-free')}>{text('ফ্রি শেখা','Free learning')}</button>
        <button type="button" onClick={()=>goTo('public-vocabulary')}>{text('সব মডিউল','All modules')}</button>
        <button type="button" onClick={()=>goTo('public-journey')}>{text('কীভাবে কাজ করে','How it works')}</button>
        <button type="button" onClick={()=>goTo('public-dashboard')}>{text('ড্যাশবোর্ড প্রিভিউ','Dashboard preview')}</button>
        <button type="button" onClick={()=>goTo('public-faq')}>FAQ</button>
        <div className={styles.mobileMenuActions}>
          <button type="button" onClick={onLogin}>{text('লগইন','Login')}</button>
          <button type="button" onClick={onJoin}>{text('ফ্রি account','Free account')}</button>
        </div>
      </div>}
    </header>

    <main id="main-content">
      <section className={styles.hero}>
        <div className={styles.floatLayer} aria-hidden="true">
          <span className={`${styles.floatChar} ${styles.floatCharOne}`}>学</span>
          <span className={`${styles.floatChar} ${styles.floatCharTwo}`}>あ</span>
          <span className={`${styles.floatChar} ${styles.floatCharThree}`}>字</span>
        </div>
        <div className={styles.heroInner}>
          {reduceMotion?<div className={styles.heroCopy}>
            <div className={styles.eyebrow}><Sparkles size={15}/>{text('বাংলায় বুঝুন · Japanese-এ এগিয়ে যান','ONE FOCUSED PATH TO JLPT N5')}</div>
            <h1>{text('লগইনের আগেই JLPT N5','Start learning JLPT N5')} <span>{text('শেখা শুরু করুন।','before you sign in.')}</span></h1>
            <p className={language==='bn'?'font-bn':''}>{text('ফ্রি starter lesson, Japanese listening, diagnostic quiz এবং mock-test directory ব্যবহার করে আগে নিজেই যাচাই করুন—এই studio আপনার জন্য কতটা কাজে দেয়।','Try the free starter lesson, Japanese listening, diagnostic quiz and mock-test directory first. Create an account only when the studio has earned your trust.')}</p>
            <div className={styles.heroActions}>
              <button className={styles.primaryCta} type="button" onClick={()=>goTo('public-free')}>{text('ফ্রি শেখা শুরু করুন','Start free learning')}<ArrowRight size={18}/></button>
              <button className={styles.secondaryCta} type="button" onClick={()=>goTo('public-dashboard')}>{text('স্টুডিও দেখুন','Explore the studio')}<ChevronRight size={17}/></button>
            </div>
            <div className={styles.trustRow}>
              <span><Check size={15}/>{text('ফ্রি অংশে কোনো login লাগবে না','No login for free materials')}</span>
              <span><Check size={15}/>{text('লগইনের পর সবকিছু আনলকড—কোনো paywall নেই','Everything unlocked after login—no paywalls')}</span>
            </div>
          </div>:<motion.div className={styles.heroCopy} initial="hidden" animate="visible" variants={heroContainer}>
            <motion.div className={styles.eyebrow} variants={heroItem}><Sparkles size={15}/>{text('বাংলায় বুঝুন · Japanese-এ এগিয়ে যান','ONE FOCUSED PATH TO JLPT N5')}</motion.div>
            <motion.h1 variants={heroHeadline}>{text('বাংলাতেই জাপানি শেখা,','Learn Japanese in Bangla —')} <span className={styles.heroHighlightWrap}><motion.span className={styles.heroHighlight} variants={heroHighlightPop}>{text('আর মনে হবে না কঠিন!','It won’t feel hard.')}</motion.span></span></motion.h1>
            <motion.p className={language==='bn'?'font-bn':''} variants={heroItem}>{text('ফ্রি starter lesson, Japanese listening, diagnostic quiz এবং mock-test directory দিয়ে লগইনের আগেই নিজেই যাচাই করুন—এই studio আপনার জন্য কতটা কাজে দেয়।','Try the free starter lesson, Japanese listening, diagnostic quiz and mock-test directory before you even sign in—see for yourself what this studio can do.')}</motion.p>
            <motion.div className={styles.heroActions} variants={heroItem}>
              <motion.button className={styles.primaryCta} type="button" onClick={()=>goTo('public-free')} whileHover={{y:-2,scale:1.02}} whileTap={{scale:.97}}>{text('ফ্রি শেখা শুরু করুন','Start free learning')}<ArrowRight size={18}/></motion.button>
              <motion.button className={styles.secondaryCta} type="button" onClick={()=>goTo('public-dashboard')} whileHover={{y:-2,scale:1.02}} whileTap={{scale:.97}}>{text('স্টুডিও দেখুন','Explore the studio')}<ChevronRight size={17}/></motion.button>
            </motion.div>
            <motion.div className={styles.trustRow} variants={heroItem}>
              <span><Check size={15}/>{text('ফ্রি অংশে কোনো login লাগবে না','No login for free materials')}</span>
              <span><Check size={15}/>{text('লগইনের পর সবকিছু আনলকড—কোনো paywall নেই','Everything unlocked after login—no paywalls')}</span>
            </motion.div>
          </motion.div>}

          <div className={styles.heroVisual} role="group" aria-label={text('স্টাডি ড্যাশবোর্ড প্রিভিউ','Study dashboard preview')}>
            <div className={styles.previewTopbar}>
              <span className={styles.previewLogo}><Image src={`${basePath}/assets/nihongo-vibes-logo-96.png`} alt="" width={26} height={26}/></span>
              <div><small>{text('আজকের স্টাডি','TODAY’S STUDY')}</small><strong>{text('লেসন ০৮ · গাইডেড জার্নি','Lesson 08 · Guided Journey')}</strong></div>
              <span className={styles.progressPill}>64%</span>
            </div>
            <div className={styles.previewBody}>
              <div className={styles.streakCard}><span>{text('আজকের লক্ষ্য','Daily target')}</span><strong>20 min</strong><div><i style={{width:'72%'}}/></div><small>{text('১৪ মিনিট সম্পন্ন','14 min completed')}</small></div>
              <div className={styles.nextCard}><span>{text('পরের কাজ','CONTINUE')}</span><strong>{text('স্মার্ট রিভিউ','Smart Review')}</strong><p>{text('১২টি card recall-এর জন্য ready।','12 cards are ready for recall.')}</p><button type="button" onClick={onJoin}>{text('স্টাডি খুলুন','Open study')}<ArrowRight size={15}/></button></div>
              <div className={styles.miniGrid}>
                <div><BookOpen size={18}/><span>{text('শব্দ','Words')}</span><strong>36</strong></div>
                <div><Brain size={18}/><span>{text('রিভিউ','Review')}</span><strong>12</strong></div>
                <div><Headphones size={18}/><span>{text('শুনুন','Listen')}</span><strong>08</strong></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.journeySection} id="public-journey">
        <div className={styles.journeyInner}>
          <div className={styles.sectionHeadingLeft}><span>{text('গাইডেড স্টাডি','GUIDED STUDY')}</span><h2>{text('প্রতিদিন অনুসরণ করার সহজ একটি rhythm','A simple rhythm you can repeat every day')}</h2><p className={language==='bn'?'font-bn':''}>{text('বড় syllabus-কে ছোট, পরিষ্কার এবং কাজে লাগে এমন next step-এ ভাগ করা হয়েছে।','The app turns a large syllabus into a short sequence of useful next steps.')}</p></div>
          <div className={styles.journeyList}>{journey.map(([number,title,bn,en],index)=><Reveal as="article" key={number} delay={index*0.07}><span>{number}</span><div><h3>{title}</h3><p className={language==='bn'?'font-bn':''}>{language==='bn'?bn:en}</p></div></Reveal>)}</div>
        </div>
      </section>

      <PublicFreeLab language={language} onJoin={onJoin}/>

      {moduleSections.map((mod,index)=><section className={styles.moduleSection} id={mod.id} key={mod.id}>
        <div className={`${styles.moduleInner} ${index%2===1?styles.moduleReverse:''}`}>
          <Reveal className={styles.moduleCopy}>
            <span className={styles.moduleKicker}><mod.icon size={15}/>{mod.kicker}</span>
            <h2>{text(mod.titleBn,mod.titleEn)}</h2>
            <p className={language==='bn'?'font-bn':''}>{text(mod.bodyBn,mod.bodyEn)}</p>
            <ul className={styles.modulePoints}>{(language==='bn'?mod.pointsBn:mod.pointsEn).map(point=><li key={point}><Check size={16}/>{point}</li>)}</ul>
          </Reveal>
          <Reveal className={styles.moduleVisual} delay={.08}><ModuleMock kind={mod.mock}/></Reveal>
        </div>
      </section>)}

      <section className={styles.previewSection} id="public-dashboard">
        <div className={styles.previewInner}>
          <Reveal className={styles.previewCopy}>
            <span>{text('আপনার নিজের workspace','YOUR WORKSPACE')}</span>
            <h2>{text('কী আছে শুধু নয়—এরপর কী পড়বেন, সেটাও জানুন।','Know what to study next, not just what exists.')}</h2>
            <p className={language==='bn'?'font-bn':''}>{text('Account workspace lesson, progress, review ও mistakes একসাথে রাখে—তাই পরের দরকারি কাজটি সবসময় পরিষ্কার থাকে। Login করার পর পুরো studio সম্পূর্ণ আনলকড থাকে, কোনো hidden fee ছাড়াই।','Your account keeps lessons, progress, review and mistakes together so the next useful action stays obvious. The full studio unlocks after login, with no hidden fees.')}</p>
            <ul>
              <li><ShieldCheck size={18}/>{text('Personal progress workspace','Personal progress workspace')}</li>
              <li><ShieldCheck size={18}/>{text('২৫টি lesson ও daily recommendation','25 lessons and daily recommendations')}</li>
              <li><ShieldCheck size={18}/>{text('SRS, mistake queue ও mock history','SRS, mistakes and mock history')}</li>
            </ul>
            <button type="button" onClick={onJoin}>{text('ফ্রি workspace তৈরি করুন','Create your free workspace')}<ArrowRight size={17}/></button>
          </Reveal>
          <Reveal className={styles.lessonStack} delay={.1}>
            <div className={styles.lessonCardActive}><small>{text('পরের ধাপ','NEXT STEP')}</small><strong>{text('Vocabulary recall','Vocabulary recall')}</strong><span>{text('৮ মিনিট · লেসন ০৮','8 minutes · Lesson 08')}</span><i/></div>
            <div className={styles.lessonCard}><span>02</span><div><strong>{text('Grammar practice','Grammar practice')}</strong><small>{text('২টি pattern ready','2 patterns ready')}</small></div><ChevronRight size={18}/></div>
            <div className={styles.lessonCard}><span>03</span><div><strong>{text('Listening check','Listening check')}</strong><small>{text('ছোট audio drill','Short audio drill')}</small></div><ChevronRight size={18}/></div>
            <div className={styles.lessonCard}><span>04</span><div><strong>{text('Mistake review','Review mistakes')}</strong><small>{text('৫টি দুর্বল item','5 weak items')}</small></div><ChevronRight size={18}/></div>
          </Reveal>
        </div>
      </section>

      <section className={styles.featureSection} id="public-trust">
        <Reveal className={styles.sectionHeading}><span>{text('সত্যিকারের feature, কাল্পনিক review নয়','REAL FEATURES, NOT FABRICATED REVIEWS')}</span><h2>{text('কী শিখবেন, data কোথায় থাকে এবং score কী বোঝায়—সব পরিষ্কার।','Clear learning scope, data controls and honest scoring.')}</h2><p className={language==='bn'?'font-bn':''}>{text('এটি একটি independent Bangla-first self-study studio; official JLPT affiliation দাবি করে না এবং fabricated testimonial ব্যবহার করে না।','This is an independent Bangla-first self-study studio. It does not claim official JLPT affiliation or use fabricated testimonials.')}</p></Reveal>
        <div className={styles.featureGrid}>
          {trustHighlights.map((item,index)=><Reveal as="article" className={styles.quoteCard} key={item.attributionEn} delay={index*0.08}>
            <Quote size={22} className={styles.quoteIcon}/>
            <p className={language==='bn'?'font-bn':''}>{text(item.quoteBn,item.quoteEn)}</p>
            <span className={styles.quoteAttribution}><item.icon size={14}/>{text(item.attributionBn,item.attributionEn)}</span>
          </Reveal>)}
        </div>
      </section>

      <section className={styles.faqSection} id="public-faq">
        <Reveal className={styles.sectionHeading}><span>{text('প্রশ্ন থাকলে জেনে নিন','COMMON QUESTIONS')}</span><h2>{text('সবচেয়ে বেশি জিজ্ঞাসিত প্রশ্ন','Frequently asked questions')}</h2></Reveal>
        <div className={styles.faqList}>
          {faqItems.map((item,index)=>{
            const open=openFaq===index;
            return <div className={`${styles.faqItem} ${open?styles.faqItemOpen:''}`} key={item.qEn}>
              <button type="button" className={styles.faqQuestion} aria-expanded={open} onClick={()=>setOpenFaq(open?null:index)}>
                <span>{text(item.qBn,item.qEn)}</span><ChevronDown size={18}/>
              </button>
              {open&&<p className={`${styles.faqAnswer} ${language==='bn'?'font-bn':''}`}>{text(item.aBn,item.aEn)}</p>}
            </div>;
          })}
        </div>
      </section>

      <section className={styles.finalCta}>
        <div><span>{text('যখন প্রস্তুত','READY WHEN YOU ARE')}</span><h2>{text('আপনার N5 study workspace খুলুন।','Open your N5 study workspace.')}</h2><p className={language==='bn'?'font-bn':''}>{text('ফ্রি materials ব্যবহার করার পর account খুলে পুরো learning system চালিয়ে যান—কোনো paywall ছাড়াই।','After trying the free materials, create an account and continue with the full learning system—no paywalls.')}</p></div>
        <button type="button" onClick={onJoin}>{text('ফ্রি account তৈরি করুন','Create free account')}<ArrowRight size={18}/></button>
      </section>
    </main>

    <footer className={styles.footer}>
      <div className={styles.footerBrand}><span className={styles.logoWrap}><Image src={`${basePath}/assets/nihongo-vibes-logo-96.png`} alt="" width={42} height={42}/></span><div><strong>THE NIHONGO VIBES</strong><small>JLPT N5 STUDY STUDIO</small></div></div>
      <p className={language==='bn'?'font-bn':''}>{text('বাংলাভাষীদের জন্য একটি focused Japanese-learning workspace।','A focused Japanese-learning workspace for consistent daily practice.')}</p>
      <nav aria-label={text('সহায়তা ও নীতিমালা','Support and policies')}><a href={`${basePath}/privacy/`}>{text('গোপনীয়তা','Privacy')}</a><a href={`${basePath}/terms/`}>{text('ব্যবহারের শর্ত','Terms')}</a><a href="https://github.com/Knox1999/n5-japanese-studio/issues" target="_blank" rel="noreferrer noopener">{text('সহায়তা','Support')}</a></nav>
      <button type="button" onClick={onLogin}>{text('Workspace-এ লগইন করুন','Login to your workspace')}<ArrowRight size={15}/></button>
    </footer>
  </div>;
}
