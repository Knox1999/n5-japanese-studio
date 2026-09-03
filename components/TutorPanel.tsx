'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Bot, Loader2, Send, X } from 'lucide-react';
import { askGrammarTutor, hasTutorConsent, setTutorConsent, type TutorExample } from '@/lib/tutor';
import { track } from '@/lib/analytics';
import { useLanguage } from '@/lib/language';

type Props={
  ruleId:string;
  pattern:string;
  meaningBn?:string;
  examples?:TutorExample[];
  onClose:()=>void;
};

export default function TutorPanel({ruleId,pattern,meaningBn,examples,onClose}:Props){
  const {language,text}=useLanguage();
  const [mounted,setMounted]=useState(false);
  const [consented,setConsented]=useState(hasTutorConsent());
  useEffect(()=>setMounted(true),[]);
  const [question,setQuestion]=useState('');
  const [answer,setAnswer]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');

  const accept=()=>{setTutorConsent(true);setConsented(true);track('tutor_consent',{accepted:true})};
  const decline=()=>{setTutorConsent(false);track('tutor_consent',{accepted:false});onClose()};

  const ask=async(e:FormEvent)=>{
    e.preventDefault();
    if(!question.trim()||loading)return;
    setLoading(true);setError('');
    try{
      const result=await askGrammarTutor({ruleId,pattern,meaningBn,examples,question:question.trim(),language});
      setAnswer(result.answer);
      track('tutor_question',{rule_id:ruleId,remaining:result.remaining});
    }catch(err){
      setError(err instanceof Error?err.message:'Tutor request failed');
    }finally{setLoading(false)}
  };

  if(!mounted)return null;
  return createPortal(<div className="verb-lab-layer" role="dialog" aria-modal="true" aria-labelledby="tutor-panel-title">
    <button className="future-layer-backdrop" onClick={onClose} aria-label={text('বন্ধ করুন','Close')}/>
    <section className="tutor-panel-dialog">
      <header className="tutor-panel-head">
        <div><span>{text('AI টিউটর','AI TUTOR')}</span><h2 id="tutor-panel-title" className="font-jp">{pattern}</h2></div>
        <button onClick={onClose} aria-label={text('বন্ধ করুন','Close')}><X/></button>
      </header>

      {!consented?<div className="tutor-consent">
        <Bot size={28}/>
        <p className={language==='bn'?'font-bn':''}>{text(
          'আপনার প্রশ্ন ও এই grammar rule-এর তথ্য ব্যাখ্যা তৈরির জন্য Anthropic-এর AI model-এ পাঠানো হবে। আপনার email বা account পরিচয় পাঠানো হয় না।',
          'Your question and this rule’s details are sent to Anthropic’s AI model to generate an explanation. Your email or account identity is never sent.',
        )}</p>
        <div>
          <button className="premium-btn premium-btn-primary" onClick={accept}>{text('সম্মত ও চালিয়ে যান','Agree and continue')}</button>
          <button className="premium-btn premium-btn-secondary" onClick={decline}>{text('বাতিল','Cancel')}</button>
        </div>
      </div>:<>
        <form onSubmit={ask} className="tutor-question-form">
          <input
            value={question}
            onChange={e=>setQuestion(e.target.value)}
            placeholder={text('এই rule নিয়ে প্রশ্ন করুন…','Ask about this rule…')}
            maxLength={400}
            disabled={loading}
            aria-label={text('AI টিউটরকে প্রশ্ন করুন','Ask the AI tutor')}
          />
          <button type="submit" disabled={loading||!question.trim()} aria-label={text('জিজ্ঞাসা করুন','Ask')}>
            {loading?<Loader2 className="animate-spin"/>:<Send/>}
          </button>
        </form>
        {error&&<p className="tutor-error" role="alert">{error}</p>}
        {answer&&<div className="tutor-answer"><Bot size={16}/><p className={language==='bn'?'font-bn':''}>{answer}</p></div>}
        <small className="tutor-disclaimer">{text('AI ব্যাখ্যা ভুল হতে পারে—lesson-এর official rule সবসময় নির্ভরযোগ্য।','AI explanations can be imperfect — the lesson’s own rule text is always the source of truth.')}</small>
      </>}
    </section>
  </div>,document.body);
}
