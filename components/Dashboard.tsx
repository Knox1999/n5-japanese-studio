'use client';

import { useMemo, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  Brain,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Headphones,
  Languages,
  MessageCircle,
  PenLine,
  Radio,
  RotateCcw,
  Sparkles,
  Target,
  TreePine,
  Waves,
  type LucideIcon,
} from 'lucide-react';

import type {
  MockAttempt,
  SrsCardState,
  StudioMeta,
  ViewName,
} from '@/lib/types';
import type { ProgressMap, SrsMap } from '@/lib/storage';

type DashboardProps = {
  meta: StudioMeta;
  lesson: number;
  progress: ProgressMap;
  srs: SrsMap;
  history: MockAttempt[];
  onNavigate: (view: ViewName) => void;
  onLesson: (lesson: number, view?: ViewName) => void;
};

type Module = {
  view: ViewName;
  glyph: string;
  title: string;
  bangla: string;
  detail: string;
  icon: LucideIcon;
};

const MODULES: Module[] = [
  {
    view: 'vocabulary',
    glyph: '語',
    title: 'Vocabulary',
    bangla: 'শব্দভান্ডার',
    detail: 'Meaning, audio, word class and mastery in one focused workspace.',
    icon: BookOpen,
  },
  {
    view: 'srs',
    glyph: '憶',
    title: 'Smart Recall',
    bangla: 'স্মার্ট রিভিউ',
    detail: 'Review due words with spaced recall and retention tracking.',
    icon: Brain,
  },
  {
    view: 'listening',
    glyph: '聴',
    title: 'Listening',
    bangla: 'শোনা ও শ্যাডোয়িং',
    detail: 'Natural audio, transcript, repeat and shadowing practice.',
    icon: Headphones,
  },
  {
    view: 'conversation',
    glyph: '話',
    title: 'Conversation',
    bangla: 'কথোপকথন',
    detail: 'Practice lesson dialogue by role and build speaking confidence.',
    icon: MessageCircle,
  },
  {
    view: 'spelling',
    glyph: '書',
    title: 'Active Output',
    bangla: 'স্পেলিং',
    detail: 'Hear, recall, type and verify Japanese from memory.',
    icon: PenLine,
  },
  {
    view: 'reading',
    glyph: '読',
    title: 'Reading',
    bangla: 'রিডিং',
    detail: 'Read clean Japanese passages with optional support.',
    icon: BookOpenText,
  },
  {
    view: 'grammar',
    glyph: '文',
    title: 'Visual Grammar',
    bangla: 'গ্রামার',
    detail: 'See formulas, patterns, examples and recall cues visually.',
    icon: Languages,
  },
  {
    view: 'kanji',
    glyph: '漢',
    title: 'Kanji Matrix',
    bangla: 'কাঞ্জি',
    detail: 'Explore components, construction, memory links and KLC data.',
    icon: TreePine,
  },
  {
    view: 'mock',
    glyph: '試',
    title: 'JLPT Practice',
    bangla: 'মক টেস্ট',
    detail: 'Practice N5-style sections and send mistakes back to recall.',
    icon: ClipboardCheck,
  },
];

function mastered(progress: ProgressMap, ids: number[]) {
  return ids.reduce(
    (count, id) => count + (progress[String(id)] ? 1 : 0),
    0,
  );
}

function getSrsHealth(srs: SrsMap, total: number) {
  const now = Date.now();
  let due = 0;
  let mature = 0;

  Object.values(srs).forEach((state: SrsCardState) => {
    if (
      state.due_at &&
      new Date(state.due_at).getTime() <= now
    ) {
      due += 1;
    }

    if (
      (state.repetitions || 0) >= 5 ||
      Number(state.interval_days || 0) >= 7
    ) {
      mature += 1;
    }
  });

  return {
    due,
    mature,
    fresh: Math.max(0, total - Object.keys(srs).length),
  };
}

export default function Dashboard({
  meta,
  lesson,
  progress,
  srs,
  history,
  onNavigate,
  onLesson,
}: DashboardProps) {
  const totalMastered = Object.values(progress).filter(Boolean).length;
  const overall = Math.round(
    (totalMastered / Math.max(1, meta.vocabulary_count)) * 100,
  );

  const current =
    meta.lessons.find((item) => item.lesson === lesson) ?? meta.lessons[0];

  const currentMastered = mastered(progress, current?.ids || []);
  const currentPct = Math.round(
    (currentMastered / Math.max(1, current?.count || 1)) * 100,
  );

  const now = Date.now();
  const currentDue = (current?.ids || []).reduce((count, id) => {
    const state = srs[String(id)];
    return (
      count +
      (state?.due_at && new Date(state.due_at).getTime() <= now ? 1 : 0)
    );
  }, 0);

  const completionTarget = Math.ceil((current?.count || 0) * 0.8);
  const remainingToCompletion = Math.max(
    0,
    completionTarget - currentMastered,
  );
  const lessonComplete = currentPct >= 80 && currentDue === 0;
  const health = getSrsHealth(srs, meta.vocabulary_count);
  const best = history.length
    ? Math.max(...history.map((attempt) => Number(attempt.score || 0)))
    : 0;

  const resume = useMemo(
    () =>
      health.due > 0
        ? {
            label: `Recall ${health.due} due words`,
            view: 'srs' as ViewName,
            icon: RotateCcw,
          }
        : {
            label: `Continue Lesson ${String(lesson).padStart(2, '0')}`,
            view: 'vocabulary' as ViewName,
            icon: BookOpen,
          },
    [health.due, lesson],
  );

  const lessonMap = useMemo(
    () =>
      meta.lessons.map((item) => {
        const count = mastered(progress, item.ids || []);
        const pct = Math.round(
          (count / Math.max(1, item.count || 1)) * 100,
        );

        return {
          lesson: item.lesson,
          title: item.title,
          pct,
          complete: pct >= 80,
          active: item.lesson === lesson,
        };
      }),
    [lesson, meta.lessons, progress],
  );

  const ResumeIcon = resume.icon;
  const ring = {
    '--nv60-progress': `${Math.max(0, Math.min(100, overall)) * 3.6}deg`,
  } as CSSProperties;

  return (
    <div className="home-v57 nv60-home">
      <motion.section
        className="home-hero-v57 nv60-hero"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42 }}
      >
        <div className="home-hero-grid-v57 nv60-hero-grid" aria-hidden="true" />

        <div className="home-copy-v57 nv60-hero-copy">
          <div className="nv60-eyebrow">
            <i />
            <span>JLPT N5 · PERSONAL JAPANESE STUDIO</span>
          </div>

          <h1 className="font-bn">
            প্রতিদিন একটু করে।
            <br />
            <em>জাপানিজ হবে স্বাভাবিক।</em>
          </h1>

          <p className="home-jp-v57 font-jp" lang="ja">
            毎日、少しずつ。自然に、確実に。
          </p>

          <p className="home-lead-v57 font-bn">
            Vocabulary, listening, speaking, grammar, Kanji এবং recall—একই
            lesson-এর data দিয়ে সাজানো একটি focused learning system।
          </p>

          <div className="home-actions-v57 nv60-hero-actions">
            <button
              className="primary"
              onClick={() => onNavigate(resume.view)}
            >
              <ResumeIcon size={19} />
              <span>{resume.label}</span>
              <ArrowRight size={18} />
            </button>

            <button onClick={() => onNavigate('listening')}>
              <Radio size={18} />
              <span>Start Listening</span>
            </button>
          </div>

          <div className="home-microstats-v57 nv60-hero-stats">
            <div>
              <span>WORDS</span>
              <b>{meta.vocabulary_count.toLocaleString()}</b>
            </div>
            <div>
              <span>LESSONS</span>
              <b>{meta.lesson_count || 25}</b>
            </div>
            <div>
              <span>KANJI LINKS</span>
              <b>{meta.klc_edges.toLocaleString()}</b>
            </div>
            <div>
              <span>BEST MOCK</span>
              <b>{best}%</b>
            </div>
          </div>
        </div>

        <aside className="home-command-v57 nv60-progress-card">
          <header className="nv60-progress-head">
            <div>
              <span>
                <Waves size={16} />
                YOUR PROGRESS
              </span>
              <b>JLPT N5</b>
            </div>
            <strong>{lessonComplete ? 'ON TRACK' : 'KEEP GOING'}</strong>
          </header>

          <div className="nv60-ring-wrap">
            <div className="home-ring-v57 nv60-ring" style={ring}>
              <div>
                <small>OVERALL</small>
                <strong>{overall}%</strong>
                <span>mastery</span>
              </div>
            </div>

            <div className="nv60-ring-copy">
              <span>CURRENT LESSON</span>
              <h2>
                {String(lesson).padStart(2, '0')} · {current?.title}
              </h2>
              <p className="font-bn">
                {lessonComplete
                  ? 'এই lesson-এর vocabulary target এবং due review সম্পন্ন।'
                  : `Completion target-এ যেতে আরও ${remainingToCompletion}টি word mastery দরকার।`}
              </p>
            </div>
          </div>

          <div className="home-bar-v57 nv60-progress-bar">
            <i style={{ width: `${currentPct}%` }} />
          </div>

          <div className="home-current-grid-v57 nv60-progress-metrics">
            <div>
              <CheckCircle2 size={18} />
              <span>Mastered</span>
              <b>{currentMastered}</b>
            </div>
            <div>
              <RotateCcw size={18} />
              <span>Due now</span>
              <b>{health.due}</b>
            </div>
            <div>
              <Target size={18} />
              <span>Mature</span>
              <b>{health.mature}</b>
            </div>
          </div>

          <button
            className="nv60-open-lesson"
            onClick={() => onLesson(lesson, 'vocabulary')}
          >
            Open current lesson
            <ChevronRight size={17} />
          </button>
        </aside>
      </motion.section>

      <section className="today-study-v58 nv60-today">
        <header>
          <div>
            <span>TODAY&apos;S STUDY</span>
            <h2 className="font-bn">আজকের সবচেয়ে দরকারি ৩টি কাজ</h2>
          </div>
          <strong className={lessonComplete ? 'done' : ''}>
            {lessonComplete ? 'LESSON READY' : 'FOCUSED PLAN'}
          </strong>
        </header>

        <div className="today-study-grid-v58 nv60-today-grid">
          <button onClick={() => onNavigate('srs')}>
            <span>01</span>
            <RotateCcw />
            <div>
              <b>Review due words</b>
              <p className="font-bn">
                {health.due > 0
                  ? `${health.due}টি due card আগে শেষ করুন।`
                  : 'আজ কোনো due card নেই—নতুন word শিখতে পারেন।'}
              </p>
            </div>
            <em>{health.due}</em>
          </button>

          <button onClick={() => onNavigate('vocabulary')}>
            <span>02</span>
            <BookOpen />
            <div>
              <b>Build lesson mastery</b>
              <p className="font-bn">
                {remainingToCompletion > 0
                  ? `80% target-এর জন্য আরও ${remainingToCompletion}টি word mastery করুন।`
                  : 'Vocabulary mastery target পূরণ হয়েছে।'}
              </p>
            </div>
            <em>{currentPct}%</em>
          </button>

          <button onClick={() => onNavigate('listening')}>
            <span>03</span>
            <Headphones />
            <div>
              <b>Listen + shadow</b>
              <p className="font-bn">
                Dialogue একবার শুনে অন্তত একটি shadowing pass করুন।
              </p>
            </div>
            <em>1×</em>
          </button>
        </div>

        <div
          className={`lesson-completion-v58 nv60-completion ${
            lessonComplete ? 'complete' : ''
          }`}
        >
          <div>
            <CheckCircle2 />
            <span>
              <small>LESSON GOAL</small>
              <b className="font-bn">
                ≥80% vocabulary mastered + current lesson-এ 0 due SRS card
              </b>
            </span>
          </div>
          <strong>
            {lessonComplete ? 'COMPLETE' : `${currentPct}% · ${currentDue} due`}
          </strong>
        </div>
      </section>

      <section className="nv60-course-map" aria-label="Course progress">
        <header>
          <div>
            <span>COURSE MAP</span>
            <h2 className="font-bn">২৫টি lesson, একটাই পরিষ্কার পথ</h2>
          </div>
          <p className="font-bn">
            Current lesson দেখুন, completed lesson চিনুন, আর যেকোনো lesson-এ
            সরাসরি চলে যান।
          </p>
        </header>

        <div className="nv60-lesson-track">
          {lessonMap.map((item) => (
            <button
              key={item.lesson}
              className={[
                item.active ? 'active' : '',
                item.complete ? 'complete' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onLesson(item.lesson, 'vocabulary')}
              title={`Lesson ${item.lesson}: ${item.title} · ${item.pct}%`}
              aria-label={`Open lesson ${item.lesson}, ${item.pct}% mastered`}
            >
              <span>{String(item.lesson).padStart(2, '0')}</span>
              <i style={{ height: `${Math.max(6, item.pct)}%` }} />
            </button>
          ))}
        </div>

        <footer>
          <span>
            <i className="current" /> Current
          </span>
          <span>
            <i className="complete" /> ≥80%
          </span>
          <span>
            <i /> In progress
          </span>
        </footer>
      </section>

      <section className="home-flow-v57 nv60-learning-flow" aria-label="Learning flow">
        {[
          ['01', 'LEARN', 'শব্দ বুঝুন'],
          ['02', 'LISTEN', 'স্বাভাবিক উচ্চারণ শুনুন'],
          ['03', 'SHADOW', 'সাথে সাথে বলুন'],
          ['04', 'USE', 'বাক্যে ব্যবহার করুন'],
          ['05', 'RECALL', 'মনে থেকে ফিরিয়ে আনুন'],
        ].map(([number, title, bangla], index) => (
          <div key={title}>
            <span>{number}</span>
            <b>{title}</b>
            <small className="font-bn">{bangla}</small>
            {index < 4 && <ArrowRight />}
          </div>
        ))}
      </section>

      <section className="home-section-v57 nv60-modules-section">
        <header className="home-section-head-v57 nv60-section-head">
          <div>
            <span>LEARNING MODULES</span>
            <h2 className="font-bn">
              এক জায়গায় পুরো N5 learning system
            </h2>
          </div>
          <p className="font-bn">
            প্রতিটি mode একই lesson-এর সাথে connected—তাই শেখা, শোনা, বলা,
            লেখা আর recall আলাদা আলাদা app মনে হবে না।
          </p>
        </header>

        <div className="home-modules-v57 nv60-modules">
          {MODULES.map(
            ({ view: moduleView, glyph, title, bangla, detail, icon: Icon }, index) => (
              <motion.button
                key={moduleView}
                onClick={() => onNavigate(moduleView)}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: Math.min(index, 6) * 0.035 }}
              >
                <div className="module-top-v57">
                  <span className="font-jp">{glyph}</span>
                  <Icon />
                </div>
                <small>{String(index + 1).padStart(2, '0')} · MODULE</small>
                <h3>{title}</h3>
                <b className="font-bn">{bangla}</b>
                <p>{detail}</p>
                <em>
                  OPEN
                  <ArrowRight />
                </em>
              </motion.button>
            ),
          )}
        </div>
      </section>

      <section className="home-lesson-strip-v57 nv60-next-step">
        <div>
          <Sparkles />
          <span>
            <small>NEXT STEP</small>
            <b>
              Lesson {String(lesson).padStart(2, '0')} → mastery
            </b>
          </span>
        </div>

        <button
          onClick={() =>
            onLesson(
              Math.min(meta.lesson_count || 25, lesson + 1),
              'vocabulary',
            )
          }
        >
          Next lesson
          <ArrowRight />
        </button>
      </section>
    </div>
  );
}
