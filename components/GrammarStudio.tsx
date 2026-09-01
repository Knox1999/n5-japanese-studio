'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowRight, BookOpenCheck, CheckCircle2, Eye, EyeOff,
  FileText, Headphones, Languages, Lightbulb, Loader2, Network, NotebookTabs,
  PlayCircle, Sparkles, Table2, Volume2
} from 'lucide-react';
import type { LessonPayload } from '@/lib/types';
import { BASE } from '@/lib/data';
import { playText } from '@/lib/audio';
import { track, trackError } from '@/lib/analytics';
import { useLanguage } from '@/lib/language';

type Example={jp:string;bn:string};
type Rule={
  id:string; title:string; pattern:string; meaningBn:string;
  visual:'formula'|'flow'|'branch'|'transform'|'compare'|'table'|'timeline';
  parts:string[]; noteBn?:string; steps?:string[]; warningBn?:string;
  examples:Example[]; origin:'note'|'verified';
};
type Matrix={title:string;headers:string[];rows:string[][]};
type GrammarLesson={
  lesson:number;title:string;notePages:number[];origin:'note'|'verified-expansion';
  summaryBn:string;rules:Rule[];matrix?:Matrix;
};
type GrammarVisualPayload={version:string;title:string;description:string;lessons:Record<string,GrammarLesson>};

function tokenTone(text:string){
  if(/^(は|が|を|に|で|へ|と|も|の|から|まで|より|て|で|か|な|とき|ことが)$/.test(text))return 'particle';
  if(/です|ます|ない|た|て|る|なります|できます|ください|いいです|いけません|おもいます|いいます/.test(text))return 'form';
  if(/→|↔|←|\+|−|\/|＋/.test(text))return 'operator';
  if(/N|V|Adj|Place|Person|Time|Number|Counter|Subject|Condition|Result|Plain|Quote|Tool|Vehicle|Language|Duration|Period|Category|Position|ME|Someone|Action|State/.test(text))return 'slot';
  return 'word';
}

function VisualFormula({rule}:{rule:Rule}){
  const steps=rule.steps??[];
  return <div className={`grammar-visual grammar-visual-${rule.visual}`}>
    <div className="grammar-visual-label">
      {rule.visual==='table'?<Table2/>:rule.visual==='branch'?<Network/>:<Sparkles/>}
      <span>VISUAL FORMULA</span>
    </div>
    <div className="grammar-formula-board" aria-label={rule.pattern}>
      {rule.parts.map((part,i)=><div className="grammar-formula-unit" key={`${part}-${i}`}>
        <span className={`grammar-token tone-${tokenTone(part)}`}>{part}</span>
        {i<rule.parts.length-1&&<ArrowRight className="grammar-arrow" aria-hidden="true"/>}
      </div>)}
    </div>
    {steps.length>0&&<div className="grammar-step-flow">{steps.map((step,i)=><div key={step}><span>{String(i+1).padStart(2,'0')}</span><b className="font-jp" lang="ja">{step}</b>{i<steps.length-1&&<ArrowDown/>}</div>)}</div>}
  </div>
}

function MatrixBoard({matrix}:{matrix:Matrix}){
  return <section className="grammar-matrix">
    <div className="grammar-matrix-title"><Table2/><div><span>MASTER TABLE</span><h2>{matrix.title}</h2></div></div>
    <div className="grammar-matrix-scroll">
      <table>
        <thead><tr>{matrix.headers.map(h=><th key={h}>{h}</th>)}</tr></thead>
        <tbody>{matrix.rows.map((row,i)=><tr key={i}>{row.map((x,j)=><td key={j} className={j>0?'font-jp':''}>{x}</td>)}</tr>)}</tbody>
      </table>
    </div>
  </section>
}

export default function GrammarStudio({data}:{data:LessonPayload}){
  const {language,text}=useLanguage();
  const [payload,setPayload]=useState<GrammarVisualPayload|null>(null);
  const [error,setError]=useState('');
  const [hideBn,setHideBn]=useState(false);
  const [practice,setPractice]=useState(false);

  useEffect(()=>{
    let dead=false;
    fetch(`${BASE}/data/grammar-visual.json?v=56`,{cache:'no-cache'})
      .then(r=>{if(!r.ok)throw new Error(`Grammar data ${r.status}`);return r.json()})
      .then(x=>!dead&&setPayload(x))
      .catch(e=>{if(!dead){setError(String(e));trackError('grammar_data',e)}});
    return()=>{dead=true};
  },[]);

  const lesson=payload?.lessons?.[String(data.lesson)];
  const noteSource=lesson?.origin==='note';
  const learnerSummary=lesson?.summaryBn
    .replace(/আপনার scan-এ[^।]*।?/gi,'')
    .replace(/location grammar verified expansion হিসেবে যোগ করা।?/gi,'স্থান ও অবস্থান বোঝানোর প্রয়োজনীয় grammar এই lesson-এ অনুশীলন করুন।')
    .trim();

  const ruleStats=useMemo(()=>({
    rules:lesson?.rules.length||0,
    examples:lesson?.rules.reduce((n,r)=>n+r.examples.length,0)||0
  }),[lesson]);

  const jump=(id:string)=>{
    document.getElementById(`grammar-${id}`)?.scrollIntoView({behavior:'smooth',block:'start'});
    track('grammar_rule_open',{lesson_number:data.lesson,rule_id:id});
  };

  if(error)return <div className="empty-state"><AlertTriangle/><b>Grammar visual data could not load</b><p>{error}</p></div>;
  if(!lesson)return <div className="grammar-boot"><Loader2 className="animate-spin"/><b>Visual Grammar Notebook</b><span>Loading Lesson {String(data.lesson).padStart(2,'0')}…</span></div>;

  return <div className="grammar-studio space-y-5">
    <section className="study-header tone-grammar grammar-hero-v53">
      <div>
        <div className="section-kicker">VISUAL GRAMMAR NOTEBOOK · LESSON {String(data.lesson).padStart(2,'0')}</div>
        <h1>{lesson.title}</h1>
        <p className={language==='bn'?'font-bn':''}>{language==='bn'?(learnerSummary||'Pattern বুঝুন, example শুনুন এবং নিজে sentence তৈরি করে practice করুন।'):'Understand each pattern, listen to examples and practise building your own sentences.'}</p>
        <div className="grammar-source-row">
          <span className={noteSource?'source-note':'source-verified'}>
            {noteSource?<FileText/>:<CheckCircle2/>}
            {noteSource?text('লেসন নোট থেকে','LESSON GUIDE'):text('সম্পূরক N5 অনুশীলন','EXPANDED N5 PRACTICE')}
          </span>
          <small>{text('শেখার জন্য সংক্ষিপ্ত ও যাচাইকৃত ব্যাখ্যা','Learner-focused, reviewed explanation')}</small>
        </div>
      </div>
      <Languages className="header-big-icon"/>
    </section>

    <section className="grammar-command-bar">
      <div className="grammar-command-stat"><NotebookTabs/><span>RULES</span><b>{ruleStats.rules}</b></div>
      <div className="grammar-command-stat"><BookOpenCheck/><span>EXAMPLES</span><b>{ruleStats.examples}</b></div>
      <div className="grammar-command-actions">
        <button className={hideBn?'active':''} onClick={()=>{setHideBn(x=>!x);track('grammar_display_toggle',{lesson_number:data.lesson,toggle:'bangla',hidden:!hideBn})}}>
          {hideBn?<Eye/>:<EyeOff/>}{hideBn?text('বাংলা দেখান','Show Bangla'):text('বাংলা লুকান','Hide Bangla')}
        </button>
        <button className={practice?'active':''} onClick={()=>{setPractice(x=>!x);track('grammar_practice_mode',{lesson_number:data.lesson,enabled:!practice})}}>
          <Lightbulb/>{practice?'Practice ON':'Practice'}
        </button>
      </div>
    </section>

    <nav className="grammar-rule-rail" aria-label="Grammar rule index">
      {lesson.rules.map((r,i)=><button key={r.id} onClick={()=>jump(r.id)}>
        <span>{String(i+1).padStart(2,'0')}</span><div><b className="font-jp" lang="ja">{r.pattern}</b><small>{r.title}</small></div><ArrowRight/>
      </button>)}
    </nav>

    {lesson.matrix&&<MatrixBoard matrix={lesson.matrix}/>}

    <div className="grammar-note-stack">
      {lesson.rules.map((r,i)=><article className={`grammar-note-card visual-${r.visual}`} id={`grammar-${r.id}`} key={r.id}>
        <div className="grammar-note-topline">
          <span className="grammar-rule-number">{String(i+1).padStart(2,'0')}</span>
          <div><small>RULE {String(i+1).padStart(2,'0')}</small><h2>{r.title}</h2></div>
          <span className={`grammar-origin ${r.origin==='note'?'note':'verified'}`}>{r.origin==='note'?text('লেসন রুল','LESSON RULE'):text('সম্পূরক রুল','EXTRA PRACTICE')}</span>
        </div>

        <div className="grammar-pattern-title font-jp" lang="ja">{r.pattern}</div>
        <VisualFormula rule={r}/>

        <div className="grammar-explain-grid">
          <div className="grammar-meaning-panel">
            <span>{text('কী বোঝায়','Meaning')}</span>
            <p className={`font-bn ${practice?'practice-conceal':''}`}>{r.meaningBn}</p>
          </div>
          {r.noteBn&&<div className="grammar-note-panel"><span>NOTE</span><p className={`font-bn ${practice?'practice-conceal':''}`}>{r.noteBn}</p></div>}
        </div>

        {r.warningBn&&<div className="grammar-warning"><AlertTriangle/><div><b>{text('ব্যতিক্রম / সাবধান','Exception / caution')}</b><p className={`font-bn ${practice?'practice-conceal':''}`}>{r.warningBn}</p></div></div>}

        <section className="grammar-examples">
          <div className="grammar-examples-head"><div><span>PRACTICE SENTENCES</span><h3>{text('৫টি Example Sentence','5 example sentences')}</h3></div><small>Tap 🔊 for Japanese audio</small></div>
          <div className="grammar-example-grid">
            {r.examples.map((e,j)=><article key={j} className="grammar-example-card">
              <span className="grammar-example-no">{j+1}</span>
              <div><p className="font-jp" lang="ja">{e.jp}</p><b className={`font-bn ${hideBn||practice?'grammar-hidden-answer':''}`}>{e.bn}</b></div>
              <button aria-label="Play Japanese example" onClick={()=>playText(e.jp,1,'grammar_visual',{},{
                lesson_number:data.lesson,rule_id:r.id,example_number:j+1
              })}><Volume2/></button>
              {(hideBn||practice)&&<button className="grammar-reveal" onClick={ev=>{
                const card=ev.currentTarget.closest('.grammar-example-card');
                card?.classList.toggle('revealed');
              }}>Reveal</button>}
            </article>)}
          </div>
        </section>
      </article>)}
    </div>

    <section className="grammar-footer-lab">
      <PlayCircle/>
      <div><b>Visual → Pattern → 5 Examples → Audio → Recall</b><p className={language==='bn'?'font-bn':''}>{text('ছবির বদলে সব diagram, arrow, table এবং formula HTML/CSS/React দিয়ে live render হচ্ছে।','Every diagram, arrow, table and formula is rendered as accessible live interface content.')}</p></div>
      <Headphones/>
    </section>
  </div>
}
