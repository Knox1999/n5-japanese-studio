'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  BookOpen,
  BookOpenText,
  Brain,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Command,
  DatabaseBackup,
  Headphones,
  History,
  Languages,
  LayoutDashboard,
  Menu,
  MessageCircle,
  PenLine,
  Radio,
  Search,
  Share2,
  Sparkles,
  TreePine,
  X,
  type LucideIcon,
} from 'lucide-react';

import { track } from '@/lib/analytics';
import { stopAudio } from '@/lib/audio';
import { loadSearchIndex } from '@/lib/data';
import type { StudioMeta, ViewName } from '@/lib/types';

import AmbientGate from './AmbientGate';

type NavItem = {
  view: ViewName;
  label: string;
  short: string;
  icon: LucideIcon;
};

type SearchRow = {
  id: number;
  lesson: number;
  j?: string;
  k?: string;
  bn?: string;
  en?: string;
  p?: string;
};

type ShellProps = {
  meta: StudioMeta;
  lesson: number;
  view: ViewName;
  onLesson: (lesson: number, view?: ViewName) => void;
  onView: (view: ViewName) => void;
  children: ReactNode;
};

const NAV: NavItem[] = [
  { view: 'dashboard', label: 'Home', short: 'Home', icon: LayoutDashboard },
  { view: 'vocabulary', label: 'Vocabulary', short: 'Vocab', icon: BookOpen },
  { view: 'srs', label: 'Smart Recall', short: 'Recall', icon: Brain },
  { view: 'spelling', label: 'Spelling', short: 'Spell', icon: PenLine },
  { view: 'conversation', label: 'Conversation', short: 'Talk', icon: MessageCircle },
  { view: 'reading', label: 'Reading', short: 'Read', icon: BookOpenText },
  { view: 'listening', label: 'Listening', short: 'Listen', icon: Headphones },
  { view: 'grammar', label: 'Grammar', short: 'Grammar', icon: Languages },
  { view: 'kanji', label: 'Kanji Matrix', short: 'Kanji', icon: TreePine },
  { view: 'mock', label: 'JLPT Mock', short: 'Mock', icon: ClipboardCheck },
  { view: 'history', label: 'History', short: 'History', icon: History },
];

const NAV_GROUPS = [
  {
    label: 'LEARN',
    items: NAV.filter((item) =>
      ['dashboard', 'vocabulary', 'reading', 'grammar', 'kanji'].includes(item.view),
    ),
  },
  {
    label: 'PRACTICE',
    items: NAV.filter((item) =>
      ['srs', 'spelling', 'conversation', 'listening', 'mock'].includes(item.view),
    ),
  },
  {
    label: 'PROGRESS',
    items: NAV.filter((item) => item.view === 'history'),
  },
];

const PRIMARY_VIEWS: ViewName[] = [
  'dashboard',
  'vocabulary',
  'srs',
  'listening',
  'grammar',
  'kanji',
];

const MOBILE_VIEWS: ViewName[] = [
  'dashboard',
  'vocabulary',
  'srs',
  'listening',
];

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

function Brand({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="future-brand future-brand-v49 nv60-brand"
      onClick={onClick}
      aria-label="Go to The Nihongo Vibes dashboard"
    >
      <span className="future-brand-logo-wrap nv60-brand-logo">
        <img
          className="future-brand-logo"
          src={`${basePath}/assets/nihongo-vibes-logo.webp`}
          alt=""
        />
        <i className="future-brand-pulse" />
      </span>
      <span className="nv60-brand-copy">
        <strong>THE NIHONGO VIBES</strong>
        <small>日本語 · JLPT N5 STUDIO</small>
      </span>
    </button>
  );
}

export default function Shell({
  meta,
  lesson,
  view,
  onLesson,
  onView,
  children,
}: ShellProps) {
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const [lessonPicker, setLessonPicker] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  const subnavRef = useRef<HTMLDivElement | null>(null);
  const lessonRef = useRef<HTMLDivElement | null>(null);

  const currentLesson =
    meta.lessons.find((item) => item.lesson === lesson) ?? meta.lessons[0];

  const openSearch = useCallback(
    async (force = false) => {
      setSearch(true);
      setDrawer(false);
      setLessonPicker(false);

      if (results.length && !force) {
        return;
      }

      setLoading(true);
      setSearchError('');

      try {
        const index = await loadSearchIndex();
        setResults(index as SearchRow[]);
      } catch (error) {
        setSearchError(error instanceof Error ? error.message : String(error));
      } finally {
        setLoading(false);
      }
    },
    [results.length],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'k'
      ) {
        event.preventDefault();
        void openSearch();
      }

      if (event.key === 'Escape') {
        setDrawer(false);
        setSearch(false);
        setLessonPicker(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openSearch]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (
        lessonPicker &&
        lessonRef.current &&
        !lessonRef.current.contains(event.target as Node)
      ) {
        setLessonPicker(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [lessonPicker]);

  useEffect(() => {
    const locked = drawer || search;
    const html = document.documentElement;
    const body = document.body;

    html.classList.toggle('overlay-open', locked);
    body.classList.toggle('overlay-open', locked);
    body.style.overflow = locked ? 'hidden' : '';

    return () => {
      html.classList.remove('overlay-open');
      body.classList.remove('overlay-open');
      body.style.removeProperty('overflow');
    };
  }, [drawer, search]);

  useEffect(() => {
    stopAudio();
    setDrawer(false);
    setSearch(false);
    setLessonPicker(false);
  }, [view, lesson]);

  useEffect(() => {
    const active = subnavRef.current?.querySelector<HTMLButtonElement>(
      'button.active',
    );
    active?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [view]);

  const normalizedQuery = query.trim().toLowerCase();
  const shown = normalizedQuery
    ? results
        .filter((row) =>
          [row.j, row.k, row.bn, row.en, row.p]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery),
        )
        .slice(0, 30)
    : results.slice(0, 12);

  const go = (nextView: ViewName) => {
    onView(nextView);
    setDrawer(false);
    setSearch(false);
    setLessonPicker(false);
  };

  const copyCurrentLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      track('share_link', {
        section_name: view,
        lesson_number: lesson,
      });
    } catch {
      // Clipboard access can be unavailable on non-secure local origins.
    }
  };

  return (
    <div
      className="future-shell future-shell-v48 future-shell-v51 future-shell-v52 nv60-shell"
      data-view={view}
    >
      <div className="future-global-ambient" aria-hidden="true">
        <AmbientGate />
      </div>

      <header className="future-header nv60-header">
        <Brand onClick={() => go('dashboard')} />

        <nav className="future-primary-nav nv60-primary-nav" aria-label="Primary navigation">
          {PRIMARY_VIEWS.map((viewName) => {
            const item = NAV.find((entry) => entry.view === viewName);
            if (!item) {
              return null;
            }

            const Icon = item.icon;
            return (
              <button
                key={item.view}
                className={view === item.view ? 'active' : ''}
                onClick={() => go(item.view)}
                aria-current={view === item.view ? 'page' : undefined}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            className={
              PRIMARY_VIEWS.includes(view) ? '' : 'active'
            }
            onClick={() => setDrawer(true)}
            aria-label="Open all learning modules"
          >
            <Menu size={16} />
            <span>More</span>
          </button>
        </nav>

        <div className="future-header-tools nv60-header-tools">
          <button
            className="future-search-trigger nv60-search-trigger"
            onClick={() => void openSearch()}
            aria-label="Search learning content"
          >
            <Search size={18} />
            <span>Search</span>
            <kbd>⌘K</kbd>
          </button>

          <div className="lesson-picker-anchor" ref={lessonRef}>
            <button
              className={`future-header-node lesson-picker-trigger nv60-lesson-trigger ${
                lessonPicker ? 'open' : ''
              }`}
              onClick={() => {
                setLessonPicker((value) => !value);
                setSearch(false);
              }}
              aria-haspopup="listbox"
              aria-expanded={lessonPicker}
            >
              <Radio size={16} />
              <span>L{String(lesson).padStart(2, '0')}</span>
              <ChevronDown size={15} />
            </button>

            {lessonPicker && (
              <div
                className="lesson-picker-popover nv60-lesson-popover"
                role="listbox"
                aria-label="Choose lesson"
              >
                <div className="lesson-picker-title">
                  <div>
                    <span>COURSE MAP</span>
                    <b>JLPT N5 · {meta.lesson_count || 25} Lessons</b>
                  </div>
                  <button
                    onClick={() => setLessonPicker(false)}
                    aria-label="Close lesson picker"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="lesson-picker-current">
                  <small>NOW STUDYING</small>
                  <b>Lesson {String(lesson).padStart(2, '0')}</b>
                  <span>{currentLesson?.title}</span>
                </div>

                <div className="lesson-picker-list">
                  {meta.lessons.map((item) => (
                    <button
                      key={item.lesson}
                      className={item.lesson === lesson ? 'active' : ''}
                      onClick={() => {
                        onLesson(item.lesson, 'dashboard');
                        setLessonPicker(false);
                      }}
                      role="option"
                      aria-selected={item.lesson === lesson}
                    >
                      <span>{String(item.lesson).padStart(2, '0')}</span>
                      <div>
                        <b>Lesson {String(item.lesson).padStart(2, '0')}</b>
                        <small>{item.title}</small>
                      </div>
                      {item.lesson === lesson && <CheckCircle2 size={18} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            className="future-menu-trigger nv60-menu-trigger"
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
          >
            <Menu size={21} />
          </button>
        </div>
      </header>

      <div
        className="future-subnav nv60-subnav"
        ref={subnavRef}
        role="navigation"
        aria-label="Quick access"
      >
        <span>
          <Command size={15} />
          QUICK ACCESS
        </span>

        {NAV.slice(1).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.view}
              data-view={item.view}
              className={view === item.view ? 'active' : ''}
              onClick={() => go(item.view)}
              aria-current={view === item.view ? 'page' : undefined}
            >
              <Icon size={16} />
              {item.short}
            </button>
          );
        })}
      </div>

      <main className="future-main nv60-main" id="main-content">
        {children}
      </main>

      <nav className="future-mobile-dock nv60-mobile-dock" aria-label="Mobile navigation">
        {MOBILE_VIEWS.map((viewName) => {
          const item = NAV.find((entry) => entry.view === viewName);
          if (!item) {
            return null;
          }

          const Icon = item.icon;
          return (
            <button
              key={item.view}
              onClick={() => go(item.view)}
              className={view === item.view ? 'active' : ''}
              aria-current={view === item.view ? 'page' : undefined}
            >
              <Icon size={22} />
              <span>{item.short}</span>
            </button>
          );
        })}

        <button onClick={() => setDrawer(true)}>
          <Menu size={22} />
          <span>Menu</span>
        </button>
      </nav>

      {drawer && (
        <div className="future-drawer-layer" role="dialog" aria-modal="true">
          <button
            className="future-layer-backdrop"
            onClick={() => setDrawer(false)}
            aria-label="Close menu"
          />

          <aside className="future-drawer nv60-drawer" aria-label="Study navigation">
            <div className="future-drawer-head">
              <Brand onClick={() => go('dashboard')} />
              <button onClick={() => setDrawer(false)} aria-label="Close menu">
                <X size={21} />
              </button>
            </div>

            <section className="nv60-drawer-course">
              <div>
                <span>YOUR COURSE</span>
                <b>JLPT N5</b>
              </div>
              <strong>L{String(lesson).padStart(2, '0')}</strong>
              <p>{currentLesson?.title}</p>
            </section>

            <div className="future-drawer-lesson">
              <label htmlFor="nv60-drawer-lesson">CHANGE LESSON</label>
              <div>
                <select
                  id="nv60-drawer-lesson"
                  value={lesson}
                  onChange={(event) => {
                    onLesson(Number(event.target.value), 'dashboard');
                    setDrawer(false);
                  }}
                >
                  {meta.lessons.map((item) => (
                    <option value={item.lesson} key={item.lesson}>
                      Lesson {String(item.lesson).padStart(2, '0')} · {item.title}
                    </option>
                  ))}
                </select>
                <ChevronDown size={17} />
              </div>
            </div>

            <nav className="nv60-drawer-nav">
              {NAV_GROUPS.map((group) => (
                <section key={group.label}>
                  <small>{group.label}</small>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.view}
                        className={view === item.view ? 'active' : ''}
                        onClick={() => go(item.view)}
                        aria-current={view === item.view ? 'page' : undefined}
                      >
                        <Icon size={19} />
                        <span>{item.label}</span>
                        {item.view === 'kanji' && <em>2300</em>}
                      </button>
                    );
                  })}
                </section>
              ))}
            </nav>

            <div className="future-drawer-utilities">
              <button
                onClick={() =>
                  window.dispatchEvent(new Event('n5-open-vault'))
                }
              >
                <DatabaseBackup size={18} />
                <span>Backup & Restore</span>
              </button>

              <button onClick={() => void copyCurrentLink()}>
                <Share2 size={18} />
                <span>Copy current link</span>
              </button>
            </div>

            <div className="future-drawer-foot">
              <Sparkles size={17} />
              <span>Learn → Listen → Recall → Use → Review</span>
            </div>
          </aside>
        </div>
      )}

      {search && (
        <div className="future-search-layer" role="dialog" aria-modal="true">
          <button
            className="future-layer-backdrop"
            onClick={() => setSearch(false)}
            aria-label="Close search"
          />

          <section className="future-search-dialog nv60-search-dialog">
            <div className="future-search-head">
              <Search size={20} />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Japanese / Kanji / বাংলা / English…"
                aria-label="Search"
              />
              <button onClick={() => setSearch(false)} aria-label="Close search">
                <X size={21} />
              </button>
            </div>

            <div className="nv60-search-hint">
              <span>Search the whole course</span>
              <kbd>ESC</kbd>
            </div>

            <div className="future-search-results">
              {loading ? (
                <div className="nv58-search-state">
                  <Search />
                  <b>Indexing learning data…</b>
                  <span>Please wait</span>
                </div>
              ) : searchError ? (
                <div className="nv58-search-state error">
                  <Search />
                  <b>Search index unavailable</b>
                  <span>{searchError}</span>
                  <button onClick={() => void openSearch(true)}>Retry search</button>
                </div>
              ) : shown.length ? (
                shown.map((row) => (
                  <button
                    key={row.id}
                    onClick={() => {
                      onLesson(row.lesson, 'vocabulary');
                      setSearch(false);
                    }}
                  >
                    <span className="font-jp">{row.k || row.j}</span>
                    <div>
                      <b className="font-bn">{row.bn}</b>
                      <small>
                        Lesson {row.lesson} · {row.p}
                      </small>
                    </div>
                  </button>
                ))
              ) : (
                <div className="nv58-search-state">
                  <Search />
                  <b>No matching word found</b>
                  <span>Try Japanese, Kanji, বাংলা or English.</span>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
