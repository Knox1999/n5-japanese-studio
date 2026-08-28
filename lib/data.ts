import type { LessonPayload, StudioMeta, KLCTree, KLCMemory } from './types';

export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const DATA_VERSION = '58';

export class ResourceLoadError extends Error {
  path:string;
  attempts:number;
  status?:number;
  constructor(path:string, attempts:number, message:string, status?:number){
    super(message);
    this.name='ResourceLoadError';
    this.path=path;
    this.attempts=attempts;
    this.status=status;
  }
}

function versioned(path: string) {
  const join = path.includes('?') ? '&' : '?';
  return `${BASE}${path}${join}v=${DATA_VERSION}`;
}

const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

function notify(path:string,error:unknown){
  if(typeof window==='undefined')return;
  try{
    window.dispatchEvent(new CustomEvent('nv:resource-error',{
      detail:{kind:'data',path,message:error instanceof Error?error.message:String(error)}
    }));
  }catch{}
}

async function getJSON<T>(path: string, maxAttempts=3): Promise<T> {
  let last:unknown=null;
  for(let attempt=1;attempt<=maxAttempts;attempt++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),9000);
    try{
      const res=await fetch(versioned(path),{
        cache:'no-cache',
        signal:controller.signal,
        headers:{'Accept':'application/json'}
      });
      clearTimeout(timer);
      if(!res.ok){
        const e=new ResourceLoadError(path,attempt,`Failed to load ${path}: ${res.status}`,res.status);
        // Retry transient/server failures, but do not hammer a definite 404.
        if(res.status===404)throw e;
        last=e;
      }else{
        return await res.json() as T;
      }
    }catch(e){
      clearTimeout(timer);
      last=e;
      if(e instanceof ResourceLoadError && e.status===404)break;
    }
    if(attempt<maxAttempts)await sleep(260*Math.pow(2,attempt-1));
  }
  const err=last instanceof ResourceLoadError
    ?last
    :new ResourceLoadError(path,maxAttempts,last instanceof Error?last.message:String(last||'Unknown resource error'));
  notify(path,err);
  throw err;
}

export const loadMeta = () => getJSON<StudioMeta>('/data/meta.json');
export const loadLesson = (lesson: number) => getJSON<LessonPayload>(`/data/lessons/${String(lesson).padStart(2, '0')}.json`);
export const loadKLC = () => Promise.all([
  getJSON<KLCTree>('/data/klc-tree.json'),
  getJSON<KLCMemory>('/data/klc-memory.json'),
] as const);
export const loadSearchIndex = () => getJSON<any[]>('/data/search-index.json');
