'use client';

import { useMemo, useState } from 'react';

type Language = 'bn' | 'en';
type AppTab = 'home' | 'learn' | 'practice' | 'review' | 'progress';

const courses = [
  { mark: 'あ', tag: 'FOUNDATION', title: 'Kana Foundation', sub: 'Hiragana + Katakana', copy: 'শুরু থেকে অক্ষর চিনুন, sound শুনুন এবং stroke practice করুন।' },
  { mark: 'N5', tag: 'JLPT PATH', title: 'JLPT N5 Journey', sub: 'Beginner', copy: 'Vocabulary, grammar, kanji, listening এবং mock—একটি guided flow-তে।' },
  { mark: 'N4', tag: 'NEXT LEVEL', title: 'JLPT N4 Journey', sub: 'Elementary', copy: 'N5 foundation-এর পর আরও grammar, vocabulary এবং listening depth।' },
  { mark: 'N3', tag: 'INTERMEDIATE', title: 'JLPT N3 Journey', sub: 'Intermediate', copy: 'Reading speed, natural listening এবং broader kanji/vocabulary practice।' },
];

const lessons = Array.from({ length: 25 }, (_, i) => ({
  n: i + 1,
  title: ['はじめまして', 'これ・それ・あれ', 'ここ・そこ・あそこ', 'いま なんじですか', 'わたしの まいにち'][i % 5],
}));

const kana = [
  ['あ', 'a'], ['い', 'i'], ['う', 'u'], ['え', 'e'], ['お', 'o'],
  ['か', 'ka'], ['き', 'ki'], ['く', 'ku'], ['け', 'ke'], ['こ', 'ko'],
];

const modules = [
  ['語', 'Vocabulary', 'শব্দভান্ডার'],
  ['文', 'Grammar', 'গ্রামার'],
  ['漢', 'Kanji', 'কাঞ্জি'],
  ['聴', 'Listening', 'লিসেনিং'],
  ['復', 'Smart Review', 'রিভিউ'],
  ['試', 'Mock Test', 'মক টেস্ট'],
];

export default function Experience() {
  const [language, setLanguage] = useState<Language>('bn');
  const [workspace, setWorkspace] = useState(false);
  const [tab, setTab] = useState<AppTab>('home');
  const [selectedKana, setSelectedKana] = useState(0);
  const [quiz, setQuiz] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [lesson, setLesson] = useState(1);

  const t = (bn: string, en: string) => language === 'bn' ? bn : en;
  const selected = kana[selectedKana];
  const completed = useMemo(() => Math.max(1, Math.round(lesson * 2.8)), [lesson]);

  if (workspace) {
    return (
      <div className="app-shell">
        <aside className="sidebar">
          <button className="brand" onClick={() => setTab('home')}><span className="brand-mark">日</span><span><b>THE NIHONGO VIBES</b><small>JLPT STUDY STUDIO</small></span></button>
          <nav>
            {(['home','learn','practice','review','progress'] as AppTab[]).map(item => (
              <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>
                <span>{item === 'home' ? '⌂' : item === 'learn' ? '学' : item === 'practice' ? '練' : item === 'review' ? '復' : '進'}</span>
                {t(item === 'home' ? 'হোম' : item === 'learn' ? 'শিখুন' : item === 'practice' ? 'প্র্যাকটিস' : item === 'review' ? 'রিভিউ' : 'অগ্রগতি', item[0].toUpperCase() + item.slice(1))}
              </button>
            ))}
          </nav>
          <div className="sidebar-foot"><button onClick={() => setWorkspace(false)}>← {t('ওয়েবসাইটে ফিরুন','Back to website')}</button></div>
        </aside>

        <div className="app-main">
          <header className="app-header">
            <div><small>{t('আজকের স্টাডি','TODAY')}</small><b>{t('আপনার শেখার workspace','Your learning workspace')}</b></div>
            <div className="header-actions">
              <button className="language" onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}>{language === 'bn' ? 'EN' : 'বাংলা'}</button>
              <button className="lesson-pill">L{String(lesson).padStart(2,'0')}</button>
            </div>
          </header>

          <main className="workspace-content">
            {tab === 'home' && <>
              <section className="workspace-hero">
                <div><span className="eyebrow">DAILY STUDY COACH</span><h1>{t('আজ কী পড়বেন?','What should you study today?')}</h1><p>{t('Review, lesson progress এবং weak points দেখে পরের useful action সাজানো হয়েছে।','Your next useful actions are arranged from review, lesson progress and weak points.')}</p><div className="hero-buttons"><button className="primary" onClick={() => setTab('learn')}>{t('আজকের সেশন শুরু করুন','Start today’s session')} →</button><button onClick={() => setTab('review')}>{t('ভুলগুলো রিভিউ করুন','Review mistakes')}</button></div></div>
                <div className="journey-card"><div className="journey-head"><span>YOUR N5 JOURNEY</span><b>{completed}%</b></div><div className="ring" style={{ '--p': `${completed * 3.6}deg` } as React.CSSProperties}><span>{completed}%<small>progress</small></span></div><div className="journey-meta"><div><small>{t('বর্তমান লেসন','Current lesson')}</small><b>Lesson {String(lesson).padStart(2,'0')}</b></div><button onClick={() => setTab('learn')}>Continue →</button></div></div>
              </section>

              <section className="today-grid">
                <article className="next-action"><span>01 · NEXT BEST ACTION</span><h2>{t('Vocabulary recall','Vocabulary recall')}</h2><p>{t('১২টি শব্দ quick recall-এর জন্য প্রস্তুত।','12 words are ready for quick recall.')}</p><button onClick={() => setTab('review')}>8 min · {t('শুরু করুন','Start')} →</button></article>
                <article><span>02</span><h3>{t('Grammar practice','Grammar practice')}</h3><p>2 patterns · 10 min</p></article>
                <article><span>03</span><h3>{t('Listening check','Listening check')}</h3><p>1 dialogue · 6 min</p></article>
              </section>

              <section className="module-grid">
                {modules.map(([mark,en,bn]) => <button key={en} onClick={() => setTab(en === 'Smart Review' ? 'review' : 'learn')}><span>{mark}</span><div><b>{t(bn,en)}</b><small>{en}</small></div><i>→</i></button>)}
              </section>
            </>}

            {tab === 'learn' && <>
              <section className="section-head"><span>LEARN</span><h1>{t('একটি পরিষ্কার learning path','A clear learning path')}</h1><p>{t('Kana থেকে lesson-based N5 পর্যন্ত এক ধাপ করে এগিয়ে যান।','Move step by step from Kana to lesson-based N5 study.')}</p></section>
              <div className="lesson-selector"><button onClick={() => setLesson(Math.max(1, lesson - 1))}>←</button><div><small>CURRENT LESSON</small><b>Lesson {String(lesson).padStart(2,'0')} · {lessons[lesson-1].title}</b></div><button onClick={() => setLesson(Math.min(25, lesson + 1))}>→</button></div>
              <section className="kana-academy"><div className="kana-path"><span>BEGINNER KANA ACADEMY</span><h2>{t('Learn → Recognise → Trace','Learn → Recognise → Trace')}</h2><div className="path-line">{kana.slice(0,5).map((item,index) => <button key={item[0]} className={selectedKana === index ? 'active' : index < selectedKana ? 'done' : ''} onClick={() => setSelectedKana(index)}><b>{item[0]}</b><small>{item[1]}</small></button>)}</div></div><div className="kana-focus"><div className="kana-glyph">{selected[0]}</div><div><span>CHARACTER</span><h2>{selected[1]}</h2><p>{t('অক্ষরটি দেখুন, উচ্চারণ বলুন এবং নিচের row থেকে পরের character বেছে নিন।','See the character, say the sound, then choose the next character from the row.')}</p><div className="kana-row">{kana.map((item,index) => <button key={item[0]} className={selectedKana === index ? 'active' : ''} onClick={() => setSelectedKana(index)}>{item[0]}<small>{item[1]}</small></button>)}</div></div></div></section>
            </>}

            {tab === 'practice' && <>
              <section className="section-head"><span>PRACTICE</span><h1>{t('ছোট ছোট interactive drill','Short interactive drills')}</h1><p>{t('কম animation, দ্রুত feedback এবং clear next step।','Minimal motion, fast feedback and a clear next step.')}</p></section>
              <div className="practice-grid"><article className="flip-card" onClick={() => setFlipped(!flipped)}><span>KANJI FLIP</span><div>{flipped ? <><b>水</b><p>みず · {t('পানি','water')}</p></> : <><b>水</b><p>{t('অর্থ দেখতে ট্যাপ করুন','Tap to reveal meaning')}</p></>}</div></article><article className="particle-quiz"><span>QUICK QUIZ</span><h2>わたし＿がくせいです。</h2><p>{t('সঠিক particle বেছে নিন।','Choose the correct particle.')}</p><div>{['は','が','へ'].map(x => <button className={quiz ? (x === 'は' ? 'correct' : quiz === x ? 'wrong' : '') : ''} key={x} onClick={() => setQuiz(x)}>{x}</button>)}</div>{quiz && <small>{quiz === 'は' ? t('সঠিক!','Correct!') : t('আবার চেষ্টা করুন—সঠিক উত্তর は।','Try again—the correct answer is は.')}</small>}</article></div>
            </>}

            {tab === 'review' && <>
              <section className="section-head"><span>SMART REVIEW</span><h1>{t('Weak points আবার সামনে আনুন','Bring weak points back')}</h1><p>{t('ভুল এবং confidence অনুযায়ী review queue তৈরি হবে।','The review queue is organized by mistakes and confidence.')}</p></section>
              <div className="review-card"><span>VOCABULARY · DUE NOW</span><h2>みず</h2><p>{t('অর্থ মনে আছে?','Do you remember the meaning?')}</p><div className="rating-row"><button>Again</button><button>Hard</button><button>Good</button><button>Easy</button></div></div>
            </>}

            {tab === 'progress' && <>
              <section className="section-head"><span>PROGRESS</span><h1>{t('আপনার শেখার অগ্রগতি','Your learning progress')}</h1><p>{t('Mastery, review এবং lesson completion এক জায়গায়।','Mastery, review and lesson completion in one place.')}</p></section>
              <div className="stats"><article><span>N5</span><b>{completed}%</b><small>{t('Overall journey','Overall journey')}</small></article><article><span>語</span><b>148</b><small>{t('শব্দ mastered','Words mastered')}</small></article><article><span>復</span><b>12</b><small>{t('Review due','Review due')}</small></article><article><span>試</span><b>82%</b><small>{t('Best mock','Best mock')}</small></article></div>
              <div className="lesson-map">{lessons.map(item => <button key={item.n} className={item.n === lesson ? 'active' : item.n < lesson ? 'done' : ''} onClick={() => setLesson(item.n)}><span>{String(item.n).padStart(2,'0')}</span><div><b>{item.title}</b><small>{item.n < lesson ? t('Completed','Completed') : item.n === lesson ? t('Current','Current') : t('Upcoming','Upcoming')}</small></div></button>)}</div>
            </>}
          </main>
        </div>

        <nav className="mobile-dock">
          {(['home','learn','practice','review','progress'] as AppTab[]).map(item => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}><b>{item === 'home' ? '⌂' : item === 'learn' ? '学' : item === 'practice' ? '練' : item === 'review' ? '復' : '進'}</b><small>{t(item === 'home' ? 'হোম' : item === 'learn' ? 'শিখুন' : item === 'practice' ? 'প্র্যাকটিস' : item === 'review' ? 'রিভিউ' : 'অগ্রগতি', item)}</small></button>)}
        </nav>
      </div>
    );
  }

  return (
    <div className="site-shell">
      <header className="site-header"><button className="brand" onClick={() => window.scrollTo({top:0,behavior:'smooth'})}><span className="brand-mark">日</span><span><b>THE NIHONGO VIBES</b><small>JAPANESE LEARNING STUDIO</small></span></button><nav><a href="#courses">{t('কোর্স','Courses')}</a><a href="#practice">{t('প্র্যাকটিস','Practice')}</a><a href="#syllabus">{t('সিলেবাস','Syllabus')}</a></nav><div className="header-actions"><button className="language" onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}>{language === 'bn' ? 'EN' : 'বাংলা'}</button><button className="ghost" onClick={() => setWorkspace(true)}>{t('লগইন','Login')}</button><button className="primary" onClick={() => setWorkspace(true)}>{t('শেখা শুরু করুন','Start learning')} →</button></div></header>

      <main>
        <section className="public-hero"><div className="hero-copy"><div className="trust">🎌 {t('বাংলা ভাষায় Japanese শেখার guided platform','A guided Japanese-learning platform for Bangla speakers')}</div><h1>{t('জাপানি শেখা হোক','Learn Japanese')} <em>{t('আনন্দে!','with clarity.')}</em></h1><div className="rotating-word"><span>{t('শিখুন','Learn')}</span><b>ひらがな</b></div><p>{t('Kana থেকে JLPT N5, N4 ও N3—lesson, practice, listening, review এবং mock test এক connected learning experience-এ।','From Kana to JLPT N5, N4 and N3—lessons, practice, listening, review and mock tests in one connected experience.')}</p><div className="hero-buttons"><button className="primary" onClick={() => setWorkspace(true)}>{t('ফ্রি শুরু করুন','Start learning')} →</button><a className="button-link" href="#courses">{t('পাথ দেখুন','Explore paths')}</a></div><div className="hero-facts"><span>✓ {t('লগইনের পর সব learning tools','All learning tools after login')}</span><span>✓ {t('বাংলা / English UI','Bangla / English UI')}</span></div></div><div className="hero-preview"><div className="preview-top"><span className="brand-mark">日</span><div><small>TODAY'S STUDY</small><b>Lesson 08 · Guided Journey</b></div><strong>64%</strong></div><div className="preview-grid"><article><span>DAILY TARGET</span><b>20 min</b><i><em/></i><small>14 min completed</small></article><article className="accent"><span>CONTINUE</span><b>Smart Review</b><p>12 cards ready</p><button onClick={() => setWorkspace(true)}>Open study →</button></article></div><div className="preview-stats"><span><b>36</b> Words</span><span><b>12</b> Review</span><span><b>08</b> Listen</span></div></div></section>

        <section className="course-section" id="courses"><div className="section-title"><span>LEARNING PATHS</span><h2>{t('নিজের learning path বেছে নিন','Choose your learning path')}</h2><p>{t('Foundation থেকে intermediate পর্যন্ত একই visual system ও progress model।','One visual system and progress model from foundation to intermediate.')}</p></div><div className="course-grid">{courses.map(course => <article key={course.title}><div className="course-top"><span>{course.mark}</span><small>{course.tag}</small></div><h3>{course.title}</h3><b>{course.sub}</b><p>{language === 'bn' ? course.copy : 'Structured lessons, practice and progress in one guided experience.'}</p><button onClick={() => setWorkspace(true)}>{t('শুরু করুন','Open path')} →</button></article>)}</div></section>

        <section className="features"><div className="section-title"><span>ONE CONNECTED STUDIO</span><h2>{t('প্রতিদিনের পড়ার জন্য যা দরকার','Everything needed for daily study')}</h2></div><div className="feature-grid">{modules.concat([['✎','Writing','লেখা'],['↗','Progress','অগ্রগতি']]).map(([mark,en,bn]) => <article key={en}><span>{mark}</span><h3>{t(bn,en)}</h3><p>{t('একই progress system-এর সাথে connected।','Connected to the same progress system.')}</p></article>)}</div></section>

        <section className="public-practice" id="practice"><div className="section-title left"><span>INTERACTIVE PRACTICE</span><h2>{t('ওয়েবসাইটেই একটু practice করে দেখুন','Try a little practice right on the website')}</h2><p>{t('Reference-এর মতো tactile interaction, কিন্তু content ও branding সম্পূর্ণ নিজের।','Tactile interaction inspired by the reference experience, with original content and branding.')}</p></div><div className="practice-grid"><article className="flip-card" onClick={() => setFlipped(!flipped)}><span>KANJI FLIP</span><div>{flipped ? <><b>水</b><p>みず · {t('পানি','water')}</p></> : <><b>水</b><p>{t('অর্থ দেখতে ট্যাপ করুন','Tap to reveal meaning')}</p></>}</div></article><article className="particle-quiz"><span>30 SECOND QUIZ</span><h2>わたし＿がくせいです。</h2><p>{t('সঠিক particle বেছে নিন।','Choose the correct particle.')}</p><div>{['は','が','へ'].map(x => <button className={quiz ? (x === 'は' ? 'correct' : quiz === x ? 'wrong' : '') : ''} key={x} onClick={() => setQuiz(x)}>{x}</button>)}</div>{quiz && <small>{quiz === 'は' ? t('সঠিক!','Correct!') : t('সঠিক উত্তর は।','The correct answer is は.')}</small>}</article></div></section>

        <section className="syllabus" id="syllabus"><div className="section-title"><span>GUIDED SYLLABUS</span><h2>{t('২৫টি lesson · এক ধাপ করে এগোন','25 lessons · move one step at a time')}</h2></div><div className="lesson-dots">{lessons.map(item => <button key={item.n} className={lesson === item.n ? 'active' : ''} onClick={() => setLesson(item.n)}>{item.n}</button>)}</div><div className="syllabus-card"><span>LESSON {String(lesson).padStart(2,'0')}</span><h3>{lessons[lesson-1].title}</h3><p>{t('Vocabulary · Grammar · Listening · Recall · Mini Test','Vocabulary · Grammar · Listening · Recall · Mini Test')}</p><button className="primary" onClick={() => setWorkspace(true)}>{t('এই lesson খুলুন','Open this lesson')} →</button></div></section>

        <section className="final-cta"><div><span>READY WHEN YOU ARE</span><h2>{t('আপনার Japanese learning workspace খুলুন।','Open your Japanese learning workspace.')}</h2><p>{t('Login-এর পরে learning tools unlocked—কোনো premium lesson gate নেই।','Learning tools are available after login without premium lesson gates.')}</p></div><button className="primary" onClick={() => setWorkspace(true)}>{t('শুরু করুন','Start learning')} →</button></section>
      </main>
      <footer><div className="brand"><span className="brand-mark">日</span><span><b>THE NIHONGO VIBES</b><small>JAPANESE LEARNING STUDIO</small></span></div><p>{t('বাংলা-প্রথম Japanese learning experience.','A Bangla-first Japanese learning experience.')}</p></footer>
    </div>
  );
}
