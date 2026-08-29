import { BASE } from './data';
import { track, trackError } from './analytics';

export type AudioVoiceRole='default'|'male'|'female';
export type PlaybackResult='ended'|'cancelled'|'unavailable';

let activeAudio: HTMLAudioElement | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeResolve: ((result:PlaybackResult)=>void) | null = null;
let raf = 0;
let playbackGeneration = 0;

function normalizeDisplay(text:string){
  return String(text||'').normalize('NFC').replace(/\s+/g,' ').trim();
}

function normalizeSpeech(text:string){
  let s=String(text||'').normalize('NFC').trim();
  const jp='\\u3040-\\u30ff\\u3400-\\u9fff々〆ヵヶ';
  s=s
    .replace(new RegExp(`(?<=[${jp}])\\s+(?=[${jp}])`,'g'),'')
    .replace(/[「」『』“”"']/g,'')
    .replace(new RegExp(`(?<=[${jp}])・(?=[${jp}])`,'g'),'')
    .replace(/。(?=.)/g,'、')
    .replace(/、{2,}/g,'、')
    .trim();
  return s;
}

function hashText(text:string,voiceRole:AudioVoiceRole='default'){
  const clean=normalizeDisplay(text);
  return voiceRole==='default'?clean:`${voiceRole}|${clean}`;
}

export async function sha1(text:string){
  const data=new TextEncoder().encode(normalizeDisplay(text));
  const digest=await crypto.subtle.digest('SHA-1',data);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

export async function audioUrlForText(text:string,voiceRole:AudioVoiceRole='default'){
  const hash=await sha1(hashText(text,voiceRole));
  return `${BASE}/audio/${hash}.ogg`;
}

export function stopAudio():PlaybackResult{
  playbackGeneration+=1;
  if(raf){cancelAnimationFrame(raf);raf=0}
  if(activeAudio){
    try{
      activeAudio.pause();
      activeAudio.currentTime=0;
      activeAudio.removeAttribute('src');
      activeAudio.load();
    }catch{}
    activeAudio=null;
  }
  if(typeof window!=='undefined'&&'speechSynthesis'in window){
    try{window.speechSynthesis.cancel()}catch{}
  }
  activeUtterance=null;
  const finish=activeResolve;
  activeResolve=null;
  finish?.('cancelled');
  return 'cancelled';
}

function notifyAudioError(text:string,type:string){
  if(typeof window==='undefined')return;
  try{
    window.dispatchEvent(new CustomEvent('nv:resource-error',{
      detail:{kind:'audio',path:type,message:`Audio unavailable: ${normalizeDisplay(text).slice(0,80)}`}
    }));
  }catch{}
}

export interface AudioCallbacks{
  onStart?:()=>void;
  onProgress?:(ratio:number)=>void;
  onEnd?:()=>void;
}

export async function playText(
  text:string,
  rate=1,
  type='sentence',
  cb:AudioCallbacks={},
  meta:Record<string,unknown>={},
  voiceRole:AudioVoiceRole='default'
):Promise<PlaybackResult>{
  stopAudio();
  const generation=playbackGeneration;
  const safeRate=Math.max(.75,Math.min(1,rate));
  const clean=normalizeDisplay(text);
  if(!clean)return 'unavailable';

  track('audio_play',{
    audio_type:type,
    playback_rate:safeRate,
    content_length:clean.length,
    voice_role:voiceRole,
    exclusive_audio:true,
    ...meta
  });

  try{
    const url=await audioUrlForText(clean,voiceRole);
    if(generation!==playbackGeneration)return 'cancelled';

    const audio=new Audio(url);
    activeAudio=audio;
    audio.preload='auto';
    audio.playbackRate=safeRate;
    audio.defaultPlaybackRate=safeRate;
    audio.volume=1;

    if('preservesPitch'in audio)(audio as HTMLAudioElement & {preservesPitch:boolean}).preservesPitch=true;
    if('webkitPreservesPitch'in audio)(audio as any).webkitPreservesPitch=true;

    return await new Promise<PlaybackResult>((resolve,reject)=>{
      let started=false,settled=false;
      const finish=(status:PlaybackResult)=>{
        if(settled)return;
        settled=true;
        if(activeResolve===finish)activeResolve=null;
        resolve(status);
      };
      activeResolve=finish;

      audio.addEventListener('error',()=>{
        if(generation!==playbackGeneration){finish('cancelled');return}
        reject(new Error('v7-ogg-audio-unavailable'));
      },{once:true});

      audio.addEventListener('canplay',async()=>{
        if(started)return;
        started=true;
        if(generation!==playbackGeneration||activeAudio!==audio){
          finish('cancelled');
          return;
        }
        try{
          await audio.play();
          cb.onStart?.();
          const tick=()=>{
            if(generation!==playbackGeneration||activeAudio!==audio||audio.paused||audio.ended)return;
            const ratio=audio.duration>0?Math.min(1,audio.currentTime/audio.duration):0;
            cb.onProgress?.(ratio);
            raf=requestAnimationFrame(tick);
          };
          tick();
        }catch(err){reject(err)}
      },{once:true});

      audio.addEventListener('ended',()=>{
        if(generation!==playbackGeneration){finish('cancelled');return}
        if(raf){cancelAnimationFrame(raf);raf=0}
        cb.onProgress?.(1);
        cb.onEnd?.();
        if(activeAudio===audio)activeAudio=null;
        finish('ended');
      },{once:true});

      audio.load();
    });
  }catch(err){
    if(generation!==playbackGeneration)return 'cancelled';
    trackError('audio',err);
  }

  // Do not silently replace role-specific dialogue with a random browser female/male voice.
  if(voiceRole==='male'||voiceRole==='female'){
    notifyAudioError(clean,type);
    return 'unavailable';
  }

  // Non-dialogue emergency fallback only.
  if(typeof window!=='undefined'&&'speechSynthesis'in window){
    return await new Promise<PlaybackResult>(resolve=>{
      if(generation!==playbackGeneration){resolve('cancelled');return}
      const u=new SpeechSynthesisUtterance(normalizeSpeech(clean));
      activeUtterance=u;
      u.lang='ja-JP';
      u.rate=safeRate;
      u.pitch=1;
      u.volume=1;
      u.onend=()=>{
        if(generation!==playbackGeneration){resolve('cancelled');return}
        cb.onProgress?.(1);cb.onEnd?.();activeUtterance=null;resolve('ended');
      };
      u.onerror=()=>{
        activeUtterance=null;
        notifyAudioError(clean,type);
        resolve('unavailable');
      };
      window.speechSynthesis.speak(u);
    });
  }

  notifyAudioError(clean,type);
  return 'unavailable';
}

export async function playDialogueTrack(
  lesson:number,
  rate=1,
  cb:AudioCallbacks={},
  meta:Record<string,unknown>={}
):Promise<PlaybackResult>{
  stopAudio();
  const generation=playbackGeneration;
  const safeRate=Math.max(.75,Math.min(1,rate));
  const url=`${BASE}/audio/dialogue/lesson-${String(lesson).padStart(2,'0')}.ogg`;

  track('audio_play',{
    audio_type:'conversation_full',
    playback_rate:safeRate,
    lesson_number:lesson,
    dual_voice:true,
    voice_engine:'v7-azure-multivoice-opus',
    ...meta
  });

  try{
    const audio=new Audio(url);
    activeAudio=audio;
    audio.preload='auto';
    audio.playbackRate=safeRate;
    audio.defaultPlaybackRate=safeRate;
    audio.volume=1;
    if('preservesPitch'in audio)(audio as HTMLAudioElement & {preservesPitch:boolean}).preservesPitch=true;
    if('webkitPreservesPitch'in audio)(audio as any).webkitPreservesPitch=true;

    return await new Promise<PlaybackResult>((resolve,reject)=>{
      let started=false,settled=false;
      const finish=(status:PlaybackResult)=>{
        if(settled)return;
        settled=true;
        if(activeResolve===finish)activeResolve=null;
        resolve(status);
      };
      activeResolve=finish;

      audio.addEventListener('error',()=>reject(new Error('v7-dialogue-track-unavailable')),{once:true});
      audio.addEventListener('canplay',async()=>{
        if(started)return;
        started=true;
        if(generation!==playbackGeneration||activeAudio!==audio){finish('cancelled');return}
        try{
          await audio.play();
          cb.onStart?.();
          const tick=()=>{
            if(generation!==playbackGeneration||activeAudio!==audio||audio.paused||audio.ended)return;
            cb.onProgress?.(audio.duration>0?Math.min(1,audio.currentTime/audio.duration):0);
            raf=requestAnimationFrame(tick);
          };
          tick();
        }catch(err){reject(err)}
      },{once:true});
      audio.addEventListener('ended',()=>{
        if(generation!==playbackGeneration){finish('cancelled');return}
        if(raf){cancelAnimationFrame(raf);raf=0}
        cb.onProgress?.(1);cb.onEnd?.();
        if(activeAudio===audio)activeAudio=null;
        finish('ended');
      },{once:true});
      audio.load();
    });
  }catch(err){
    if(generation!==playbackGeneration)return 'cancelled';
    trackError('audio',err);
    notifyAudioError(`Lesson ${lesson} full dialogue`,'conversation_full');
    return 'unavailable';
  }
}
