'use client';

import Script from 'next/script';
import { useSyncExternalStore } from 'react';
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
  return()=>{
    window.removeEventListener('storage',onChange);
    window.removeEventListener('nv:analytics-consent',onChange);
  };
}

export default function AnalyticsConsent({gaId}:{gaId:string}){
  const consent=useSyncExternalStore(subscribe,getConsent,()=> 'unknown');

  const choose=(value:Exclude<Consent,'unknown'>)=>{
    try{localStorage.setItem(STORAGE_KEY,value)}catch{}
    window.dispatchEvent(new Event('nv:analytics-consent'));
  };

  return <>
    {consent==='accepted'&&<>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive"/>
      <Script id="ga4-consented" strategy="afterInteractive">
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
      </Script>
    </>}
    {consent==='unknown'&&(
      <aside className="privacy-consent" aria-label="Analytics পছন্দ" aria-live="polite">
        <ShieldCheck aria-hidden="true"/>
        <div>
          <b className="font-bn">আপনার privacy আপনার নিয়ন্ত্রণে</b>
          <p className="font-bn">শুধু আপনার অনুমতি পেলে anonymous usage analytics চালু হবে। শেখার progress এই device-এই থাকে।</p>
          <a href={`${process.env.NEXT_PUBLIC_BASE_PATH||''}/privacy/`}>বিস্তারিত গোপনীয়তা নীতি</a>
        </div>
        <div className="privacy-consent-actions">
          <button className="accept" onClick={()=>choose('accepted')}>অনুমতি দিন</button>
          <button onClick={()=>choose('declined')}>না, ধন্যবাদ</button>
        </div>
        <button className="privacy-consent-close" onClick={()=>choose('declined')} aria-label="Analytics অনুমতি বন্ধ করুন"><X/></button>
      </aside>
    )}
  </>;
}
