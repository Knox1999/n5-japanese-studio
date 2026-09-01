'use client';

import Image from 'next/image';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  ChevronRight,
  Headphones,
  Languages,
  Menu,
  ShieldCheck,
  Sparkles,
  Target,
  TreePine,
  X,
} from 'lucide-react';
import { useState } from 'react';

import PublicFreeLab, { type PublicLanguage } from './PublicFreeLab';
import styles from './PublicLanding.module.css';

type Props={onLogin:()=>void;onJoin:()=>void};

const basePath=process.env.NEXT_PUBLIC_BASE_PATH||'';
const text=(language:PublicLanguage,bn:string,en:string)=>language==='bn'?bn:en;

const features=[
  {icon:BookOpen,label:'Vocabulary',bn:'Lesson অনুযায়ী শব্দ, উদাহরণ ও active recall।',en:'Lesson-by-lesson words, examples and active recall.'},
  {icon:Brain,label:'Smart Review',bn:'দুর্বল শব্দ সঠিক সময়ে ফিরিয়ে আনে এমন SRS review।',en:'SRS review that brings weak items back at the right time.'},
  {icon:Languages,label:'Grammar',bn:'বাংলা explanation এবং guided practice-সহ N5 grammar।',en:'Clear explanations with guided practice inside each lesson.'},
  {icon:TreePine,label:'Kanji',bn:'Meaning, reading, memory story ও focused kanji practice।',en:'Meaning, readings, memory stories and focused kanji practice.'},
  {icon:Headphones,label:'Listening',bn:'দ্রুত Japanese audio, shadowing ও comprehension practice।',en:'Low-latency Japanese audio, shadowing and comprehension practice.'},
  {icon:Target,label:'Mock Test',bn:'Lesson, Quick, Mini, Full mock এবং verified free resource hub।',en:'Lesson, Quick, Mini and Full mocks plus a verified free resource hub.'},
];

const journey=[
  ['01','Learn','শব্দ, grammar ও kanji বুঝে নিন।','Understand the core words, grammar and kanji.'],
  ['02','Practice','Listening, recall ও targeted exercise করুন।','Use listening, recall and targeted exercises.'],
  ['03','Review','SRS ও mistake queue দিয়ে দুর্বলতা ঠিক করুন।','Repair weak points with SRS and the mistake queue.'],
  ['04','Test','Lesson থেকে Full mock—সময় ধরে প্রস্তুতি যাচাই করুন।','Check readiness from lesson tests to a timed full mock.'],
];

export default function PublicLanding({onLogin,onJoin}:Props){
  const [menuOpen,setMenuOpen]=useState(false);
  const [language,setLanguage]=useState<PublicLanguage>('bn');

  const goTo=(id:string)=>{
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});
  };

  return <div className={`${styles.page} ${language==='bn'?styles.banglaPage:''}`}>
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <button className={styles.brand} type="button" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>
          <span className={styles.logoWrap}><Image src={`${basePath}/assets/nihongo-vibes-logo-96.png`} alt="" width={48} height={48} priority/></span>
          <span className={styles.brandCopy}><strong>THE NIHONGO VIBES</strong><small>JLPT N5 STUDY STUDIO</small></span>
        </button>

        <nav className={styles.desktopNav} aria-label={text(language,'পাবলিক নেভিগেশন','Public navigation')}>
          <button type="button" onClick={()=>goTo('public-free')}>{text(language,'ফ্রি শেখা','Free learning')}</button>
          <button type="button" onClick={()=>goTo('public-features')}>{text(language,'ফিচার','Features')}</button>
          <button type="button" onClick={()=>goTo('public-journey')}>{text(language,'কীভাবে কাজ করে','How it works')}</button>
          <button type="button" onClick={()=>goTo('public-preview')}>{text(language,'স্টাডি ফ্লো','Study flow')}</button>
        </nav>

        <div className={styles.languageSwitch} role="group" aria-label="Language / ভাষা">
          <button type="button" className={language==='bn'?styles.languageActive:''} aria-pressed={language==='bn'} onClick={()=>setLanguage('bn')}>বাংলা</button>
          <button type="button" className={language==='en'?styles.languageActive:''} aria-pressed={language==='en'} onClick={()=>setLanguage('en')}>EN</button>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.loginButton} type="button" onClick={onLogin}>{text(language,'লগইন','Login')}</button>
          <button className={styles.joinButton} type="button" onClick={onJoin}>{text(language,'ফ্রি account','Free account')}<ArrowRight size={16}/></button>
        </div>

        <button className={styles.menuButton} type="button" onClick={()=>setMenuOpen(value=>!value)} aria-label={text(language,'নেভিগেশন খুলুন','Toggle navigation')} aria-expanded={menuOpen}>
          {menuOpen?<X size={22}/>:<Menu size={22}/>}
        </button>
      </div>

      {menuOpen&&<div className={styles.mobileMenu}>
        <button type="button" onClick={()=>goTo('public-free')}>{text(language,'ফ্রি শেখা','Free learning')}</button>
        <button type="button" onClick={()=>goTo('public-features')}>{text(language,'সব ফিচার','Features')}</button>
        <button type="button" onClick={()=>goTo('public-journey')}>{text(language,'কীভাবে কাজ করে','How it works')}</button>
        <button type="button" onClick={()=>goTo('public-preview')}>{text(language,'স্টাডি ফ্লো','Study flow')}</button>
        <div className={styles.mobileMenuActions}>
          <button type="button" onClick={onLogin}>{text(language,'লগইন','Login')}</button>
          <button type="button" onClick={onJoin}>{text(language,'ফ্রি account','Free account')}</button>
        </div>
      </div>}
    </header>

    <main id="main-content">
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}><Sparkles size={15}/>{text(language,'বাংলায় বুঝুন · Japanese-এ এগিয়ে যান','ONE FOCUSED PATH TO JLPT N5')}</div>
            <h1>{text(language,'লগইনের আগেই JLPT N5','Start learning JLPT N5')} <span>{text(language,'শেখা শুরু করুন।','before you sign in.')}</span></h1>
            <p className={language==='bn'?'font-bn':''}>{text(language,'ফ্রি starter lesson, Japanese listening, diagnostic quiz এবং mock-test directory ব্যবহার করে আগে নিজেই যাচাই করুন—এই studio আপনার জন্য কতটা কাজে দেয়।','Try the free starter lesson, Japanese listening, diagnostic quiz and mock-test directory first. Create an account only when the studio has earned your trust.')}</p>
            <div className={styles.heroActions}>
              <button className={styles.primaryCta} type="button" onClick={()=>goTo('public-free')}>{text(language,'ফ্রি শেখা শুরু করুন','Start free learning')}<ArrowRight size={18}/></button>
              <button className={styles.secondaryCta} type="button" onClick={()=>goTo('public-preview')}>{text(language,'স্টুডিও দেখুন','Explore the studio')}<ChevronRight size={17}/></button>
            </div>
            <div className={styles.trustRow}>
              <span><Check size={15}/>{text(language,'ফ্রি অংশে কোনো login লাগবে না','No login for free materials')}</span>
              <span><Check size={15}/>{text(language,'বাংলা ও English—দুই ভাষা','Bangla and English')}</span>
            </div>
          </div>

          <div className={styles.heroVisual} aria-label={text(language,'স্টাডি ড্যাশবোর্ড প্রিভিউ','Study dashboard preview')}>
            <div className={styles.previewTopbar}>
              <span className={styles.previewLogo}>日</span>
              <div><small>{text(language,'আজকের স্টাডি','TODAY’S STUDY')}</small><strong>{text(language,'লেসন ০৮ · গাইডেড জার্নি','Lesson 08 · Guided Journey')}</strong></div>
              <span className={styles.progressPill}>64%</span>
            </div>
            <div className={styles.previewBody}>
              <div className={styles.streakCard}><span>{text(language,'আজকের লক্ষ্য','Daily target')}</span><strong>20 min</strong><div><i style={{width:'72%'}}/></div><small>{text(language,'১৪ মিনিট সম্পন্ন','14 min completed')}</small></div>
              <div className={styles.nextCard}><span>{text(language,'পরের কাজ','CONTINUE')}</span><strong>{text(language,'স্মার্ট রিভিউ','Smart Review')}</strong><p>{text(language,'১২টি card recall-এর জন্য ready।','12 cards are ready for recall.')}</p><button type="button" onClick={onJoin}>{text(language,'স্টাডি খুলুন','Open study')}<ArrowRight size={15}/></button></div>
              <div className={styles.miniGrid}>
                <div><BookOpen size={18}/><span>{text(language,'শব্দ','Words')}</span><strong>36</strong></div>
                <div><Brain size={18}/><span>{text(language,'রিভিউ','Review')}</span><strong>12</strong></div>
                <div><Headphones size={18}/><span>{text(language,'শুনুন','Listen')}</span><strong>08</strong></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFreeLab language={language} onJoin={onJoin}/>

      <section className={styles.featureSection} id="public-features">
        <div className={styles.sectionHeading}>
          <span>{text(language,'একটি সংযুক্ত স্টুডিও','ONE CONNECTED STUDIO')}</span>
          <h2>{text(language,'প্রতিদিনের N5 প্রস্তুতির সবকিছু এক জায়গায়','Everything needed for daily N5 study')}</h2>
          <p className={language==='bn'?'font-bn':''}>{text(language,'প্রতিটি tool-এর আলাদা কাজ আছে, কিন্তু progress ও review একই learning journey-তে যুক্ত থাকে।','Each tool has a clear job, while progress and review stay connected across the learning journey.')}</p>
        </div>
        <div className={styles.featureGrid}>
          {features.map(({icon:Icon,label,bn,en})=><article className={styles.featureCard} key={label}>
            <span className={styles.featureIcon}><Icon size={22}/></span><h3>{label}</h3><p className={language==='bn'?'font-bn':''}>{language==='bn'?bn:en}</p><span className={styles.cardLink}>{text(language,'Account-এ অন্তর্ভুক্ত','Included with account')}<Check size={15}/></span>
          </article>)}
        </div>
      </section>

      <section className={styles.journeySection} id="public-journey">
        <div className={styles.journeyInner}>
          <div className={styles.sectionHeadingLeft}><span>{text(language,'গাইডেড স্টাডি','GUIDED STUDY')}</span><h2>{text(language,'প্রতিদিন অনুসরণ করার সহজ একটি rhythm','A simple rhythm you can repeat every day')}</h2><p className={language==='bn'?'font-bn':''}>{text(language,'বড় syllabus-কে ছোট, পরিষ্কার এবং কাজে লাগে এমন next step-এ ভাগ করা হয়েছে।','The app turns a large syllabus into a short sequence of useful next steps.')}</p></div>
          <div className={styles.journeyList}>{journey.map(([number,title,bn,en])=><article key={number}><span>{number}</span><div><h3>{title}</h3><p className={language==='bn'?'font-bn':''}>{language==='bn'?bn:en}</p></div></article>)}</div>
        </div>
      </section>

      <section className={styles.previewSection} id="public-preview">
        <div className={styles.previewInner}>
          <div className={styles.previewCopy}>
            <span>{text(language,'আপনার নিজের workspace','YOUR WORKSPACE')}</span>
            <h2>{text(language,'কী আছে শুধু নয়—এরপর কী পড়বেন, সেটাও জানুন।','Know what to study next, not just what exists.')}</h2>
            <p className={language==='bn'?'font-bn':''}>{text(language,'Account workspace lesson, progress, review ও mistakes একসাথে রাখে—তাই পরের দরকারি কাজটি সবসময় পরিষ্কার থাকে।','Your account keeps lessons, progress, review and mistakes together so the next useful action stays obvious.')}</p>
            <ul>
              <li><ShieldCheck size={18}/>{text(language,'Personal progress workspace','Personal progress workspace')}</li>
              <li><ShieldCheck size={18}/>{text(language,'২৫টি lesson ও daily recommendation','25 lessons and daily recommendations')}</li>
              <li><ShieldCheck size={18}/>{text(language,'SRS, mistake queue ও mock history','SRS, mistakes and mock history')}</li>
            </ul>
            <button type="button" onClick={onJoin}>{text(language,'ফ্রি workspace তৈরি করুন','Create your free workspace')}<ArrowRight size={17}/></button>
          </div>
          <div className={styles.lessonStack}>
            <div className={styles.lessonCardActive}><small>{text(language,'পরের ধাপ','NEXT STEP')}</small><strong>{text(language,'Vocabulary recall','Vocabulary recall')}</strong><span>{text(language,'৮ মিনিট · লেসন ০৮','8 minutes · Lesson 08')}</span><i/></div>
            <div className={styles.lessonCard}><span>02</span><div><strong>{text(language,'Grammar practice','Grammar practice')}</strong><small>{text(language,'২টি pattern ready','2 patterns ready')}</small></div><ChevronRight size={18}/></div>
            <div className={styles.lessonCard}><span>03</span><div><strong>{text(language,'Listening check','Listening check')}</strong><small>{text(language,'ছোট audio drill','Short audio drill')}</small></div><ChevronRight size={18}/></div>
            <div className={styles.lessonCard}><span>04</span><div><strong>{text(language,'Mistake review','Review mistakes')}</strong><small>{text(language,'৫টি দুর্বল item','5 weak items')}</small></div><ChevronRight size={18}/></div>
          </div>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div><span>{text(language,'যখন প্রস্তুত','READY WHEN YOU ARE')}</span><h2>{text(language,'আপনার N5 study workspace খুলুন।','Open your N5 study workspace.')}</h2><p className={language==='bn'?'font-bn':''}>{text(language,'ফ্রি materials ব্যবহার করার পর account খুলে পুরো learning system চালিয়ে যান।','After trying the free materials, create an account and continue with the full learning system.')}</p></div>
        <button type="button" onClick={onJoin}>{text(language,'ফ্রি account তৈরি করুন','Create free account')}<ArrowRight size={18}/></button>
      </section>
    </main>

    <footer className={styles.footer}>
      <div className={styles.footerBrand}><span className={styles.logoWrap}><Image src={`${basePath}/assets/nihongo-vibes-logo-96.png`} alt="" width={42} height={42}/></span><div><strong>THE NIHONGO VIBES</strong><small>JLPT N5 STUDY STUDIO</small></div></div>
      <p className={language==='bn'?'font-bn':''}>{text(language,'বাংলাভাষীদের জন্য একটি focused Japanese-learning workspace।','A focused Japanese-learning workspace for consistent daily practice.')}</p>
      <button type="button" onClick={onLogin}>{text(language,'Workspace-এ লগইন করুন','Login to your workspace')}<ArrowRight size={15}/></button>
    </footer>
  </div>;
}
