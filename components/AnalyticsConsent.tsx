'use client';

import Script from 'next/script';
import { useSyncExternalStore } from 'react';

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

  // No intrusive consent banner in the learning experience. Analytics remains
  // off by default and is only loaded when an existing explicit opt-in exists.
  if(consent!=='accepted') return null;

  return <>
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
  </>;
}
