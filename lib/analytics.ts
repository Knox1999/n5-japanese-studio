import { captureStudyEvent } from './studyActivity';
import { captureError } from './errorMonitoring';

declare global { interface Window { gtag?: (...args: unknown[]) => void; } }

const CONSENT_KEY='nv_analytics_consent_v1';
const POSTHOG_KEY=process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST=process.env.NEXT_PUBLIC_POSTHOG_HOST||'https://us.i.posthog.com';
const POSTHOG_ID_KEY='nv_ph_id';

function hasAnalyticsConsent(){
  try{return localStorage.getItem(CONSENT_KEY)==='accepted'}catch{return false}
}

function posthogDistinctId(){
  try{
    let id=localStorage.getItem(POSTHOG_ID_KEY);
    if(!id){id=crypto.randomUUID();localStorage.setItem(POSTHOG_ID_KEY,id)}
    return id;
  }catch{return 'anonymous'}
}

function posthogCapture(event:string,params:Record<string,unknown>){
  if(!POSTHOG_KEY||!hasAnalyticsConsent())return;
  try{
    fetch(`${POSTHOG_HOST}/capture/`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({api_key:POSTHOG_KEY,event,properties:{...params,distinct_id:posthogDistinctId()}}),
      keepalive:true,
    }).catch(()=>{});
  }catch{}
}

export function track(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  // Local study state is product functionality, not third-party analytics.
  // It is recorded on-device even when GA consent is absent.
  try { captureStudyEvent(event, params); } catch {}
  try { window.gtag?.('event', event, params); } catch {}
  posthogCapture(event, params);
}

export function trackVirtualPage(view: string, lesson: number) {
  if (typeof window === 'undefined') return;
  const pagePath = `${location.pathname}?lesson=${lesson}&view=${encodeURIComponent(view)}`;
  track('page_view', {
    page_title: `The Nihongo Vibes · ${view} · Lesson ${lesson}`,
    page_location: location.origin + pagePath,
    page_path: pagePath,
    section_name: view,
    lesson_number: lesson,
  });
}

export function trackError(errorType: string, message: unknown) {
  const clean = String(message ?? 'unknown').replace(/[\r\n]+/g, ' ').slice(0, 160);
  track('app_error', { error_type: errorType, error_message: clean });
  try { captureError(message instanceof Error ? message : new Error(`${errorType}: ${clean}`)); } catch {}
}
