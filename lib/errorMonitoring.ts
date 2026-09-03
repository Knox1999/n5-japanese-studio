// Lightweight Sentry integration via the raw envelope HTTP API — no SDK
// dependency (matches this project's fetch-only style). The DSN's public key
// is designed to be shipped to the browser (Sentry's own security model);
// nothing secret is exposed here.

const DSN=process.env.NEXT_PUBLIC_SENTRY_DSN;

type ParsedDsn={publicKey:string;host:string;projectId:string};

function parseDsn(dsn:string):ParsedDsn|null{
  try{
    const u=new URL(dsn);
    const projectId=u.pathname.replace(/^\//,'');
    if(!u.username||!projectId)return null;
    return {publicKey:u.username,host:u.host,projectId};
  }catch{return null}
}

let parsed:ParsedDsn|null=null;
let initialized=false;

function send(message:string,stack?:string){
  if(!parsed)return;
  const event={
    event_id:crypto.randomUUID().replace(/-/g,''),
    timestamp:Date.now()/1000,
    platform:'javascript',
    level:'error',
    message:{formatted:message},
    exception:stack?{values:[{type:'Error',value:message,stacktrace:{frames:stack.split('\n').slice(0,20).map(line=>({filename:line.trim()}))}}]}:undefined,
    tags:{app:'the-nihongo-vibes'},
    request:{url:typeof location==='undefined'?undefined:location.href},
  };
  try{
    fetch(`https://${parsed.host}/api/${parsed.projectId}/store/`,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'X-Sentry-Auth':`Sentry sentry_version=7, sentry_key=${parsed.publicKey}, sentry_client=nihongo-vibes-fetch/1.0`,
      },
      body:JSON.stringify(event),
      keepalive:true,
    }).catch(()=>{});
  }catch{}
}

export function captureError(err:unknown){
  if(!parsed)return;
  const message=String(err instanceof Error?err.message:err ?? 'unknown').replace(/[\r\n]+/g,' ').slice(0,300);
  const stack=err instanceof Error?String(err.stack||''):undefined;
  send(message,stack);
}

export function initErrorMonitoring(){
  if(initialized||typeof window==='undefined'||!DSN)return;
  parsed=parseDsn(DSN);
  if(!parsed)return;
  initialized=true;
  window.addEventListener('error',e=>captureError(e.error||e.message));
  window.addEventListener('unhandledrejection',e=>captureError(e.reason));
}
