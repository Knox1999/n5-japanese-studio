'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Image from 'next/image';
import {
  BookOpen,
  BookOpenText,
  Brain,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  DatabaseBackup,
  Gamepad2,
  GraduationCap,
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
import { useLanguage } from '@/lib/language';

type NavItem = {
  view: ViewName;
  labelBn: string;
  labelEn: string;
  shortBn: string;
  shortEn: string;
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
  { view:'dashboard', labelBn:'হোম', labelEn:'Home', shortBn:'হোম', shortEn:'Home', icon:LayoutDashboard },
  { view:'kana', labelBn:'কানা একাডেমি', labelEn:'Kana Academy', shortBn:'কানা', shortEn:'Kana', icon:GraduationCap },
  { view:'vocabulary', labelBn:'শব্দভান্ডার', labelEn:'Vocabulary', shortBn:'শব্দ', shortEn:'Words', icon:BookOpen },
  { view:'srs', labelBn:'স্মার্ট রিভিউ', labelEn:'Smart Recall', shortBn:'রিভিউ', shortEn:'Recall', icon:Brain },
  { view:'spelling', labelBn:'অ্যাকটিভ আউটপুট', labelEn:'Spelling', shortBn:'লিখুন', shortEn:'Write', icon:PenLine },
  { view:'conversation', labelBn:'কথোপকথন', labelEn:'Conversation', shortBn:'কথা', shortEn:'Talk', icon:MessageCircle },
  { view:'reading', labelBn:'রিডিং', labelEn:'Reading', shortBn:'পড়ুন', shortEn:'Read', icon:BookOpenText },
  { view:'listening', labelBn:'শোনা', labelEn:'Listening', shortBn:'শোনা', shortEn:'Listen', icon:Headphones },
  { view:'grammar', labelBn:'গ্রামার', labelEn:'Grammar', shortBn:'গ্রামার', shortEn:'Grammar', icon:Languages },
  { view:'kanji', labelBn:'কাঞ্জি', labelEn:'Kanji', shortBn:'কাঞ্জি', shortEn:'Kanji', icon:TreePine },
  { view:'mock', labelBn:'মক টেস্ট', labelEn:'JLPT Mock', shortBn:'মক', shortEn:'Mock', icon:ClipboardCheck },
  { view:'arcade', labelBn:'প্র্যাকটিস আর্কেড', labelEn:'Practice Arcade', shortBn:'গেম', shortEn:'Games', icon:Gamepad2 },
  { view:'history', labelBn:'অগ্রগতি', labelEn:'History', shortBn:'অগ্রগতি', shortEn:'History', icon:History },
];

const DESKTOP_PRIMARY: ViewName[] = [
  'dashboard',
  'vocabulary',
  'srs',
  'listening',
  'grammar',
  'kanji'
];

const MOBILE_PRIMARY: ViewName[] = [
  'dashboard','vocabulary','srs','listening'
];

const DRAWER_GROUPS = [
  {
    labelBn:'শিখুন',labelEn:'Learn',
    items:['dashboard','kana','vocabulary','reading','grammar','kanji'] as ViewName[],
  },
  {
    labelBn:'অনুশীলন',labelEn:'Practice',
    items:['srs','spelling','conversation','listening','mock','arcade'] as ViewName[],
  },
  {
    labelBn:'অগ্রগতি',labelEn:'Progress',
    items:['history'] as ViewName[],
  },
];

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

function Brand({onClick}:{onClick:()=>void}) {
  const {text}=useLanguage();
  return (
    <button
      className="future-brand nv60-brand nv-final-brand"
      onClick={onClick}
      aria-label={text('The Nihongo Vibes হোমে যান','Go to The Nihongo Vibes home')}
    >
      <span className="future-brand-logo-wrap nv60-brand-logo nv-final-brand-logo">
        <Image
          className="future-brand-logo"
          src={`${basePath}/assets/nihongo-vibes-logo-96.png`}
          alt=""
          width={96}
          height={96}
        />
      </span>
      <span className="nv60-brand-copy">
        <strong>THE NIHONGO VIBES</strong>
        <small>日本語 · JLPT N5 STUDIO</small>
      </span>
    </button>
  );
}

export default function Shell({
  meta, lesson, view, onLesson, onView, children
}:ShellProps) {
  const {language,text}=useLanguage();
  const [drawer,setDrawer]=useState(false);
  const [search,setSearch]=useState(false);
  const [lessonPicker,setLessonPicker]=useState(false);
  const [query,setQuery]=useState('');
  const [results,setResults]=useState<SearchRow[]>([]);
  const [loading,setLoading]=useState(false);
  const [searchError,setSearchError]=useState('');
  const previousFocus=useRef<HTMLElement|null>(null);

  const currentLesson =
    meta.lessons.find(item=>item.lesson===lesson) ?? meta.lessons[0];

  const openSearch = useCallback(async(force=false)=>{
    setSearch(true);
    setDrawer(false);
    setLessonPicker(false);

    if(results.length && !force) return;

    setLoading(true);
    setSearchError('');
    try {
      const index=await loadSearchIndex();
      setResults(index as SearchRow[]);
    } catch(error) {
      setSearchError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  },[results.length]);

  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if((event.ctrlKey||event.metaKey) && event.key.toLowerCase()==='k') {
        event.preventDefault();
        void openSearch();
      }
      if(event.key==='Escape') {
        setDrawer(false);
        setSearch(false);
        setLessonPicker(false);
      }
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[openSearch]);

  useEffect(()=>{
    const locked=drawer||search;
    document.documentElement.classList.toggle('overlay-open',locked);
    document.body.classList.toggle('overlay-open',locked);
    document.body.style.overflow=locked?'hidden':'';
    return()=>{
      document.documentElement.classList.remove('overlay-open');
      document.body.classList.remove('overlay-open');
      document.body.style.removeProperty('overflow');
    };
  },[drawer,search]);

  const activeOverlay=search?'search':drawer?'drawer':null;
  useEffect(()=>{
    if(!activeOverlay){
      const target=previousFocus.current;
      previousFocus.current=null;
      if(target) requestAnimationFrame(()=>target.focus({preventScroll:true}));
      return;
    }

    if(!previousFocus.current && document.activeElement instanceof HTMLElement){
      previousFocus.current=document.activeElement;
    }

    const selector=activeOverlay==='search'?'.future-search-layer':'.future-drawer-layer';
    const frame=requestAnimationFrame(()=>{
      const root=document.querySelector<HTMLElement>(selector);
      const first=root?.querySelector<HTMLElement>('[data-overlay-autofocus]')
        ?? root?.querySelector<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href]');
      first?.focus({preventScroll:true});
    });

    const trap=(event:KeyboardEvent)=>{
      if(event.key!=='Tab') return;
      const root=document.querySelector<HTMLElement>(selector);
      if(!root) return;
      const focusable=[...root.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')]
        .filter(element=>element.offsetParent!==null);
      if(!focusable.length){event.preventDefault();return;}
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',trap);
    return()=>{cancelAnimationFrame(frame);document.removeEventListener('keydown',trap)};
  },[activeOverlay]);

  useEffect(()=>{
    stopAudio();
    setDrawer(false);
    setSearch(false);
    setLessonPicker(false);
  },[view,lesson]);

  const normalized=query.trim().toLowerCase();
  const shown=normalized
    ? results.filter(row=>
        [row.j,row.k,row.bn,row.en,row.p]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalized)
      ).slice(0,30)
    : results.slice(0,12);

  const go=(next:ViewName)=>{
    onView(next);
    setDrawer(false);
    setSearch(false);
    setLessonPicker(false);
  };

  const itemFor=(v:ViewName)=>NAV.find(x=>x.view===v)!;

  const copyCurrentLink=async()=>{
    try {
      await navigator.clipboard.writeText(window.location.href);
      track('share_link',{section_name:view,lesson_number:lesson});
    } catch {}
  };

  return (
    <div className="future-shell nv60-shell nv-final-shell" data-view={view}>
      <header className="future-header nv60-header nv-final-header">
        <Brand onClick={()=>go('dashboard')}/>

        <nav
          className="future-primary-nav nv60-primary-nav nv-final-primary-nav"
          aria-label={text('প্রধান নেভিগেশন','Primary navigation')}
        >
          {DESKTOP_PRIMARY.map(v=>{
            const item=itemFor(v);
            const Icon=item.icon;
            return (
              <button
                key={v}
                className={view===v?'active':''}
                onClick={()=>go(v)}
                aria-current={view===v?'page':undefined}
                title={item.labelEn}
              >
                <Icon size={16}/>
                <span className={language==='bn'?'font-bn':''}>{language==='bn'?item.labelBn:item.labelEn}</span>
              </button>
            );
          })}
          <button
            className={DESKTOP_PRIMARY.includes(view)?'':'active'}
            onClick={()=>setDrawer(true)}
            aria-label={text('সব বিভাগ খুলুন','Open all sections')}
          >
            <Menu size={16}/>
            <span className={language==='bn'?'font-bn':''}>{text('আরও','More')}</span>
          </button>
        </nav>

        <div className="future-header-tools nv60-header-tools">
          <button
            className="future-search-trigger nv60-search-trigger"
            onClick={()=>void openSearch()}
            aria-label={text('কোর্সে খুঁজুন','Search the course')}
          >
            <Search size={18}/>
            <span className={language==='bn'?'font-bn':''}>{text('খুঁজুন','Search')}</span>
            <kbd>⌘K</kbd>
          </button>

          <div className="lesson-picker-anchor">
            <button
              className={`future-header-node lesson-picker-trigger nv60-lesson-trigger ${lessonPicker?'open':''}`}
              onClick={()=>{
                setLessonPicker(v=>!v);
                setSearch(false);
              }}
              aria-haspopup="listbox"
              aria-expanded={lessonPicker}
            >
              <Radio size={16}/>
              <span>L{String(lesson).padStart(2,'0')}</span>
              <ChevronDown size={15}/>
            </button>

            {lessonPicker&&(
              <div
                className="lesson-picker-popover nv60-lesson-popover"
                role="listbox"
                aria-label={text('Lesson নির্বাচন','Choose a lesson')}
              >
                <div className="lesson-picker-title">
                  <div>
                    <span>LESSON MAP</span>
                    <b className={language==='bn'?'font-bn':''}>{text('২৫টি lesson-এর পথ','Your 25-lesson path')}</b>
                  </div>
                  <button onClick={()=>setLessonPicker(false)} aria-label={text('বন্ধ করুন','Close')}>
                    <X size={18}/>
                  </button>
                </div>

                <div className="lesson-picker-current">
                  <small>{text('এখন পড়ছেন','CURRENT LESSON')}</small>
                  <b>Lesson {String(lesson).padStart(2,'0')}</b>
                  <span>{currentLesson?.title}</span>
                </div>

                <div className="lesson-picker-list">
                  {meta.lessons.map(item=>(
                    <button
                      key={item.lesson}
                      className={item.lesson===lesson?'active':''}
                      onClick={()=>{
                        onLesson(item.lesson,view);
                        setLessonPicker(false);
                      }}
                      role="option"
                      aria-selected={item.lesson===lesson}
                    >
                      <span>{String(item.lesson).padStart(2,'0')}</span>
                      <div>
                        <b>Lesson {String(item.lesson).padStart(2,'0')}</b>
                        <small>{item.title}</small>
                      </div>
                      {item.lesson===lesson&&<CheckCircle2 size={18}/>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            className="future-menu-trigger nv60-menu-trigger"
            onClick={()=>setDrawer(true)}
            aria-label={text('মেনু খুলুন','Open menu')}
          >
            <Menu size={21}/>
          </button>
        </div>
      </header>

      <main className="future-main nv60-main nv-final-main" id="main-content">
        {children}
      </main>

      <footer className="site-footer">
        <span>© {new Date().getFullYear()} The Nihongo Vibes</span>
        <a href={`${basePath}/privacy/`}>{text('গোপনীয়তা ও Analytics','Privacy & Analytics')}</a>
        <a href={`${basePath}/terms/`}>{text('ব্যবহারের শর্ত','Terms')}</a>
        <span>{text('Progress account-এ sync হয়; export ও deletion আপনার নিয়ন্ত্রণে।','Progress syncs to your account; export and deletion stay in your control.')}</span>
      </footer>

      <nav
        className="future-mobile-dock nv60-mobile-dock nv-final-mobile-dock"
        aria-label={text('মোবাইল নেভিগেশন','Mobile navigation')}
      >
        {MOBILE_PRIMARY.map(v=>{
          const item=itemFor(v);
          const Icon=item.icon;
          return (
            <button
              key={v}
              onClick={()=>go(v)}
              className={view===v?'active':''}
              aria-current={view===v?'page':undefined}
            >
              <Icon size={22}/>
              <span className={language==='bn'?'font-bn':''}>{language==='bn'?item.shortBn:item.shortEn}</span>
            </button>
          );
        })}
        <button onClick={()=>setDrawer(true)} aria-label={text('আরও বিভাগ খুলুন','Open more sections')}>
          <Menu size={22}/>
          <span className={language==='bn'?'font-bn':''}>{text('আরও','More')}</span>
        </button>
      </nav>

      {drawer&&(
        <div className="future-drawer-layer" role="dialog" aria-modal="true" aria-labelledby="course-menu-title">
          <button
            className="future-layer-backdrop"
            onClick={()=>setDrawer(false)}
            aria-label={text('মেনু বন্ধ করুন','Close menu')}
          />
          <aside className="future-drawer nv60-drawer nv-final-drawer">
            <h2 id="course-menu-title" className="sr-only">{text('কোর্স মেনু','Course menu')}</h2>
            <div className="future-drawer-head">
              <Brand onClick={()=>go('dashboard')}/>
              <button onClick={()=>setDrawer(false)} aria-label={text('বন্ধ করুন','Close')}>
                <X size={21}/>
              </button>
            </div>

            <section className="nv60-drawer-course">
              <div>
                <span>{text('আপনার কোর্স','YOUR COURSE')}</span>
                <b>JLPT N5</b>
              </div>
              <strong>L{String(lesson).padStart(2,'0')}</strong>
              <p>{currentLesson?.title}</p>
            </section>

            <button
              className="future-drawer-search"
              onClick={()=>void openSearch()}
              data-overlay-autofocus
            >
              <Search size={18}/>
              <span className={language==='bn'?'font-bn':''}>{text('পুরো কোর্সে খুঁজুন','Search the full course')}</span>
            </button>

            <div className="future-drawer-lesson">
              <label htmlFor="nv-final-drawer-lesson">{text('LESSON পরিবর্তন','CHANGE LESSON')}</label>
              <div>
                <select
                  id="nv-final-drawer-lesson"
                  value={lesson}
                  onChange={e=>{
                    onLesson(Number(e.target.value),view);
                    setDrawer(false);
                  }}
                >
                  {meta.lessons.map(item=>(
                    <option value={item.lesson} key={item.lesson}>
                      Lesson {String(item.lesson).padStart(2,'0')} · {item.title}
                    </option>
                  ))}
                </select>
                <ChevronDown size={17}/>
              </div>
            </div>

            <nav className="nv60-drawer-nav">
              {DRAWER_GROUPS.map(group=>(
                <section key={group.labelEn}>
                  <small className={language==='bn'?'font-bn':''}>{language==='bn'?group.labelBn:group.labelEn}</small>
                  {group.items.map(v=>{
                    const item=itemFor(v);
                    const Icon=item.icon;
                    return (
                      <button
                        key={v}
                        className={view===v?'active':''}
                        onClick={()=>go(v)}
                        aria-current={view===v?'page':undefined}
                      >
                        <Icon size={19}/>
                        <span className={language==='bn'?'font-bn':''}>{language==='bn'?item.labelBn:item.labelEn}</span>
                        <em>{language==='bn'?item.labelEn:item.labelBn}</em>
                      </button>
                    );
                  })}
                </section>
              ))}
            </nav>

            <div className="future-drawer-utilities">
              <button onClick={()=>window.dispatchEvent(new Event('n5-open-vault'))}>
                <DatabaseBackup size={18}/>
                <span className={language==='bn'?'font-bn':''}>{text('ব্যাকআপ ও রিস্টোর','Backup / Restore')}</span>
              </button>
              <button onClick={()=>void copyCurrentLink()}>
                <Share2 size={18}/>
                <span className={language==='bn'?'font-bn':''}>{text('বর্তমান লিংক কপি করুন','Copy current link')}</span>
              </button>
            </div>

            <div className="future-drawer-foot">
              <Sparkles size={17}/>
              <span>Learn → Listen → Shadow → Use → Recall</span>
            </div>
          </aside>
        </div>
      )}

      {search&&(
        <div className="future-search-layer" role="dialog" aria-modal="true" aria-labelledby="course-search-title">
          <button
            className="future-layer-backdrop"
            onClick={()=>setSearch(false)}
            aria-label={text('Search বন্ধ করুন','Close search')}
          />
          <section className="future-search-dialog nv60-search-dialog nv-final-search-dialog">
            <h2 id="course-search-title" className="sr-only">{text('পুরো কোর্সে খুঁজুন','Search the full course')}</h2>
            <div className="future-search-head">
              <Search size={20}/>
              <input
                autoFocus
                value={query}
                onChange={e=>setQuery(e.target.value)}
                placeholder="Japanese / Kanji / বাংলা / English…"
                aria-label={text('খুঁজুন','Search')}
                data-overlay-autofocus
              />
              <button onClick={()=>setSearch(false)} aria-label={text('বন্ধ করুন','Close')}>
                <X size={21}/>
              </button>
            </div>

            <div className="nv60-search-hint">
              <span className={language==='bn'?'font-bn':''}>{text('পুরো কোর্সে খুঁজুন','Search the full course')}</span>
              <kbd>ESC</kbd>
            </div>

            <div className="future-search-results">
              {loading?(
                <div className="nv58-search-state">
                  <Search/><b className={language==='bn'?'font-bn':''}>{text('Search data প্রস্তুত হচ্ছে…','Preparing search data…')}</b>
                </div>
              ):searchError?(
                <div className="nv58-search-state error">
                  <Search/>
                  <b className={language==='bn'?'font-bn':''}>{text('Search index পাওয়া যায়নি','Search index unavailable')}</b>
                  <span>{searchError}</span>
                  <button onClick={()=>void openSearch(true)}>{text('আবার চেষ্টা করুন','Retry search')}</button>
                </div>
              ):shown.length?(
                shown.map(row=>(
                  <button
                    key={`${row.lesson}-${row.id}`}
                    onClick={()=>{
                      onLesson(row.lesson,'vocabulary');
                      setSearch(false);
                    }}
                  >
                    <span className="font-jp">{row.k||row.j}</span>
                    <div>
                      <b className={language==='bn'?'font-bn':''}>{language==='bn'?row.bn:row.en||row.bn}</b>
                      <small>Lesson {row.lesson} · {row.p}</small>
                    </div>
                  </button>
                ))
              ):(
                <div className="nv58-search-state">
                  <Search/>
                  <b className={language==='bn'?'font-bn':''}>{text('কিছু পাওয়া যায়নি','No results found')}</b>
                  <span>{text('Japanese, Kanji, বাংলা বা English দিয়ে চেষ্টা করুন।','Try Japanese, Kanji, Bangla or English.')}</span>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
