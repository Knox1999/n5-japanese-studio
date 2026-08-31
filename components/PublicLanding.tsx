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
import styles from './PublicLanding.module.css';

type Props = {
  onLogin: () => void;
  onJoin: () => void;
};

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const features = [
  { icon: BookOpen, label: 'Vocabulary', copy: 'Lesson-by-lesson words, examples and active recall.' },
  { icon: Brain, label: 'Smart Review', copy: 'SRS review that brings weak items back at the right time.' },
  { icon: Languages, label: 'Grammar', copy: 'Clear explanations with guided practice inside each lesson.' },
  { icon: TreePine, label: 'Kanji', copy: 'Meaning, readings and focused kanji practice in one place.' },
  { icon: Headphones, label: 'Listening', copy: 'Low-latency Japanese voice practice for steady N5 comprehension.' },
  { icon: Target, label: 'Mock Test', copy: 'Timed practice and progress history for exam readiness.' },
];

const journey = [
  ['01', 'Learn', 'Open a lesson and understand the core words, grammar and kanji.'],
  ['02', 'Practice', 'Use recall, listening, writing and targeted exercises.'],
  ['03', 'Review', 'Let SRS and your mistake queue bring weak points back.'],
  ['04', 'Test', 'Check readiness with lesson progress and mock tests.'],
];

export default function PublicLanding({ onLogin, onJoin }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const goTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <button className={styles.brand} type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className={styles.logoWrap}>
              <Image src={`${basePath}/assets/nihongo-vibes-logo-96.png`} alt="" width={48} height={48} priority />
            </span>
            <span className={styles.brandCopy}>
              <strong>THE NIHONGO VIBES</strong>
              <small>JLPT N5 STUDY STUDIO</small>
            </span>
          </button>

          <nav className={styles.desktopNav} aria-label="Public navigation">
            <button type="button" onClick={() => goTo('public-features')}>Features</button>
            <button type="button" onClick={() => goTo('public-journey')}>How it works</button>
            <button type="button" onClick={() => goTo('public-preview')}>Study flow</button>
          </nav>

          <div className={styles.headerActions}>
            <button className={styles.loginButton} type="button" onClick={onLogin}>Login</button>
            <button className={styles.joinButton} type="button" onClick={onJoin}>Start learning <ArrowRight size={16} /></button>
          </div>

          <button className={styles.menuButton} type="button" onClick={() => setMenuOpen(value => !value)} aria-label="Toggle navigation" aria-expanded={menuOpen}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <div className={styles.mobileMenu}>
            <button type="button" onClick={() => goTo('public-features')}>Features</button>
            <button type="button" onClick={() => goTo('public-journey')}>How it works</button>
            <button type="button" onClick={() => goTo('public-preview')}>Study flow</button>
            <div className={styles.mobileMenuActions}>
              <button type="button" onClick={onLogin}>Login</button>
              <button type="button" onClick={onJoin}>Start learning</button>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <div className={styles.eyebrow}><Sparkles size={15} /> One focused path to JLPT N5</div>
              <h1>Build Japanese skills <span>step by step.</span></h1>
              <p>Vocabulary, grammar, kanji, listening, SRS and mock tests work together in one guided study workspace.</p>
              <div className={styles.heroActions}>
                <button className={styles.primaryCta} type="button" onClick={onJoin}>Start learning <ArrowRight size={18} /></button>
                <button className={styles.secondaryCta} type="button" onClick={() => goTo('public-preview')}>See the study flow <ChevronRight size={17} /></button>
              </div>
              <div className={styles.trustRow}>
                <span><Check size={15} /> All learning tools unlocked after login</span>
                <span><Check size={15} /> Built for focused N5 practice</span>
              </div>
            </div>

            <div className={styles.heroVisual} aria-label="Study dashboard preview">
              <div className={styles.previewTopbar}>
                <span className={styles.previewLogo}>日</span>
                <div><small>TODAY&apos;S STUDY</small><strong>Lesson 08 · Guided Journey</strong></div>
                <span className={styles.progressPill}>64%</span>
              </div>
              <div className={styles.previewBody}>
                <div className={styles.streakCard}>
                  <span>Daily target</span>
                  <strong>20 min</strong>
                  <div><i style={{ width: '72%' }} /></div>
                  <small>14 min completed</small>
                </div>
                <div className={styles.nextCard}>
                  <span>CONTINUE</span>
                  <strong>Smart Review</strong>
                  <p>12 cards are ready for recall.</p>
                  <button type="button" onClick={onJoin}>Open study <ArrowRight size={15} /></button>
                </div>
                <div className={styles.miniGrid}>
                  <div><BookOpen size={18} /><span>Words</span><strong>36</strong></div>
                  <div><Brain size={18} /><span>Review</span><strong>12</strong></div>
                  <div><Headphones size={18} /><span>Listen</span><strong>08</strong></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.featureSection} id="public-features">
          <div className={styles.sectionHeading}>
            <span>ONE CONNECTED STUDIO</span>
            <h2>Everything needed for daily N5 study</h2>
            <p>Each tool has a clear job, while progress and review stay connected across the learning journey.</p>
          </div>
          <div className={styles.featureGrid}>
            {features.map(({ icon: Icon, label, copy }) => (
              <article className={styles.featureCard} key={label}>
                <span className={styles.featureIcon}><Icon size={22} /></span>
                <h3>{label}</h3>
                <p>{copy}</p>
                <span className={styles.cardLink}>Included <Check size={15} /></span>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.journeySection} id="public-journey">
          <div className={styles.journeyInner}>
            <div className={styles.sectionHeadingLeft}>
              <span>GUIDED STUDY</span>
              <h2>A simple rhythm you can repeat every day</h2>
              <p>The app turns a large syllabus into a short sequence of useful next steps.</p>
            </div>
            <div className={styles.journeyList}>
              {journey.map(([number, title, copy]) => (
                <article key={number}>
                  <span>{number}</span>
                  <div><h3>{title}</h3><p>{copy}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.previewSection} id="public-preview">
          <div className={styles.previewInner}>
            <div className={styles.previewCopy}>
              <span>YOUR WORKSPACE</span>
              <h2>Know what to study next, not just what exists.</h2>
              <p>The authenticated studio keeps lessons, progress, review and mistakes together so the next useful action stays obvious.</p>
              <ul>
                <li><ShieldCheck size={18} /> Personal progress workspace</li>
                <li><ShieldCheck size={18} /> Lesson journey and daily recommendations</li>
                <li><ShieldCheck size={18} /> SRS, mistakes and mock history in one flow</li>
              </ul>
              <button type="button" onClick={onJoin}>Create your workspace <ArrowRight size={17} /></button>
            </div>
            <div className={styles.lessonStack}>
              <div className={styles.lessonCardActive}><small>NEXT STEP</small><strong>Vocabulary recall</strong><span>8 minutes · Lesson 08</span><i /></div>
              <div className={styles.lessonCard}><span>02</span><div><strong>Grammar practice</strong><small>2 patterns ready</small></div><ChevronRight size={18} /></div>
              <div className={styles.lessonCard}><span>03</span><div><strong>Listening check</strong><small>Short audio drill</small></div><ChevronRight size={18} /></div>
              <div className={styles.lessonCard}><span>04</span><div><strong>Review mistakes</strong><small>5 weak items</small></div><ChevronRight size={18} /></div>
            </div>
          </div>
        </section>

        <section className={styles.finalCta}>
          <div>
            <span>READY WHEN YOU ARE</span>
            <h2>Open your N5 study workspace.</h2>
            <p>Sign in and continue with every learning module available in one place.</p>
          </div>
          <button type="button" onClick={onJoin}>Start learning <ArrowRight size={18} /></button>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <span className={styles.logoWrap}><Image src={`${basePath}/assets/nihongo-vibes-logo-96.png`} alt="" width={42} height={42} /></span>
          <div><strong>THE NIHONGO VIBES</strong><small>JLPT N5 STUDY STUDIO</small></div>
        </div>
        <p>A focused Japanese-learning workspace built around consistent daily practice.</p>
        <button type="button" onClick={onLogin}>Login to your workspace <ArrowRight size={15} /></button>
      </footer>
    </div>
  );
}
