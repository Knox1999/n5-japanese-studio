'use client';

import Script from 'next/script';
import { useState, useSyncExternalStore } from 'react';
import { ShieldCheck, X } from 'lucide-react';

const STORAGE_KEY='nv_analytics_consent_v1';
type Consent='unknown'|'accepted'|'declined';

function getConsent():Consent{
  try{
    const saved=localStorage.getItem(STORAGE_KEY);
    return saved==='accepted'||saved==='declined'?saved:'unknown';
  }catch{return 'unknown'}
}

function subscribe(onChange:()=>void){
  window.addEventListener('storage',onChange);
  window.addEventListener('nv:analytics-consent',onChange);
  window.addEventListener('nihongo:language-change',onChange);
  return()=>{
    window.removeEventListener('storage',onChange);
    window.removeEventListener('nv:analytics-consent',onChange);
    window.removeEventListener('nihongo:language-change',onChange);
  };
}

function getLanguage(){try{return localStorage.getItem('nihongo_vibes_language_v1')==='en'?'en':'bn'}catch{return'bn'}}

function saveConsent(value:'accepted'|'declined'){
  try{localStorage.setItem(STORAGE_KEY,value)}catch{}
  window.dispatchEvent(new Event('nv:analytics-consent'));
}

export default function AnalyticsConsent({gaId}:{gaId:string}){
  const consent=useSyncExternalStore(subscribe,getConsent,()=> 'unknown');
  const language=useSyncExternalStore(subscribe,getLanguage,()=> 'bn');
  const [settingsOpen,setSettingsOpen]=useState(false);
  const text=(bn:string,en:string)=>language==='bn'?bn:en;

  return <>
    {consent==='accepted'&&<><Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="lazyOnload"/>
    <Script id="ga4-consented" strategy="lazyOnload">
      {`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments)}
        window.gtag = gtag;
        gtag('js', new Date());
        gtag('config', '${gaId}', {
          send_page_view: false,
          anonymize_ip: true
        });
      `}
    </Script></>}
    {(consent==='unknown'||settingsOpen)?<section className="analytics-consent" role="dialog" aria-modal="false" aria-labelledby="analytics-consent-title">
      <ShieldCheck/><div><b id="analytics-consent-title">{text('ঐচ্ছিক Analytics','Optional analytics')}</b><p>{text('আপনার অনুমতি পেলে anonymized usage data দিয়ে learning experience উন্নত করব। অনুমতি না দিলেও সব feature কাজ করবে।','With your permission, anonymized usage data helps improve the learning experience. Every feature works if you decline.')}</p><a href={`${process.env.NEXT_PUBLIC_BASE_PATH||''}/privacy/`}>{text('বিস্তারিত গোপনীয়তা নীতি','Read the privacy policy')}</a></div>
      <div><button type="button" className="accept" onClick={()=>{saveConsent('accepted');setSettingsOpen(false)}}>{text('অনুমতি দিন','Allow')}</button><button type="button" onClick={()=>{saveConsent('declined');setSettingsOpen(false)}}>{text('না, ধন্যবাদ','Decline')}</button>{consent!=='unknown'&&<button type="button" aria-label={text('বন্ধ করুন','Close')} onClick={()=>setSettingsOpen(false)}><X/></button>}</div>
    </section>:<button className="analytics-settings" type="button" onClick={()=>setSettingsOpen(true)}>{text('Privacy settings','Privacy settings')}</button>}
  </>;
}
