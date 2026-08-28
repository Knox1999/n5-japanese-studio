import { BASE } from './data';
import { track, trackError } from './analytics';

export type AudioVoiceRole='default'|'male'|'female';
export type PlaybackResult='ended'|'cancelled'|'unavailable';

let activeAudio: HTMLAudioElement | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeResolve: ((result:PlaybackResult)=>void) | null = null;
let raf = 0;
let playbackGeneration = 0;

function normalize(text: string) {
  return String(text || '').normalize('NFC').replace(/\s+/g, ' ').trim();
}


function notifyAudioError(text:string,type:string){
  if(typeof window==='undefined')return;
  try{
    window.dispatchEvent(new CustomEvent('nv:resource-error',{
      detail:{kind:'audio',path:type,message:`Audio unavailable: ${normalize(text).slice(0,80)}`}
    }));
  }catch{}
}

function hashText(text:string,voiceRole:AudioVoiceRole='default'){
  const clean=normalize(text);
  return voiceRole==='default'?clean:`${voiceRole}|${clean}`;
}

export async function sha1(text: string) {
  const data = new TextEncoder().encode(normalize(text));
  const digest = await crypto.subtle.digest('SHA-1', data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function audioUrlForText(text: string,voiceRole:AudioVoiceRole='default') {
  const hash = await sha1(hashText(text,voiceRole));
  return `${BASE}/audio/${hash}.mp3`;
}

/**
 * Global audio mutex.
 * Every stop/new play invalidates all older async audio loads so a stale
 * canplay event can never restart a previous clip. This guarantees that the
 * site has at most ONE audible voice at any moment.
 */
export function stopAudio():PlaybackResult {
  playbackGeneration += 1;
  if (raf) { cancelAnimationFrame(raf); raf = 0; }
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio.removeAttribute('src');
      activeAudio.load();
    } catch {}
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch {}
  }
  activeUtterance = null;
  const finish=activeResolve;
  activeResolve=null;
  finish?.('cancelled');
  return 'cancelled';
}

function scoreJapaneseVoice(v: SpeechSynthesisVoice,role:AudioVoiceRole='default') {
  const name = `${v.name} ${v.voiceURI}`.toLowerCase();
  let score = /^ja(-|_)/i.test(v.lang) ? 45 : v.lang.toLowerCase().includes('ja') ? 25 : 0;
  if (/nanami|aoi|shiori|mayu|keita|naoki|daichi/.test(name)) score += 42;
  if (/natural|neural|online/.test(name)) score += 25;
  if (/microsoft/.test(name)) score += 14;
  if(role==='male'&&/keita|naoki|daichi|male|masculine/.test(name))score+=45;
  if(role==='female'&&/nanami|aoi|shiori|mayu|female|feminine/.test(name))score+=45;
  if(role==='default'&&/nanami|aoi|shiori/.test(name))score+=24;
  if (v.localService) score += 2;
  return score;
}

async function jpVoice(role:AudioVoiceRole='default') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
  const synth = window.speechSynthesis;
  let voices = synth.getVoices();
  if (!voices.length) {
    await new Promise<void>(resolve => {
      let done = false;
      const finish = () => { if (done) return; done = true; synth.removeEventListener?.('voiceschanged', finish); resolve(); };
      synth.addEventListener?.('voiceschanged', finish, { once: true });
      window.setTimeout(finish, 260);
    });
    voices = synth.getVoices();
  }
  return voices
    .filter(v => /^ja(-|_)/i.test(v.lang) || v.lang.toLowerCase().includes('ja'))
    .sort((a,b) => scoreJapaneseVoice(b,role) - scoreJapaneseVoice(a,role))[0];
}

function naturalFallbackRate(text: string, requested: number) {
  let r = requested * .96;
  if (/[？?]$/.test(text)) r -= .015;
  if (/[…〜～]/.test(text)) r -= .018;
  if (/(ありがとうございます|ありがとうございました|すみません|おねがいします|お願いします)/.test(text)) r -= .012;
  if (/[！!]$/.test(text)) r += .01;
  return Math.max(.76, Math.min(1.02, r));
}

function estimatedSpeechMs(text: string, rate: number) {
  const punctuationPauses = (text.match(/[、。！？!?…]/g) || []).length * 90;
  return Math.max(800, (text.length * 88 + punctuationPauses) / Math.max(.72, rate));
}

export interface AudioCallbacks {
  onStart?: () => void;
  onProgress?: (ratio: number) => void;
  onEnd?: () => void;
}

export async function playText(
  text: string,
  rate = 1,
  type = 'sentence',
  cb: AudioCallbacks = {},
  meta: Record<string, unknown> = {},
  voiceRole:AudioVoiceRole='default'
):Promise<PlaybackResult> {
  // Cancel the currently playing/loading voice FIRST. The generation captured
  // below becomes the sole owner of audio output until another play/stop call.
  stopAudio();
  const requestGeneration=playbackGeneration;
  const safeRate = Math.max(0.72, Math.min(1.05, rate));
  const clean = normalize(text);
  if (!clean) return 'unavailable';
  track('audio_play', { audio_type: type, playback_rate: safeRate, content_length: clean.length, voice_role:voiceRole, exclusive_audio:true, ...meta });

  try {
    const hash = await sha1(hashText(clean,voiceRole));
    if(requestGeneration!==playbackGeneration)return 'cancelled';
    const url = `${BASE}/audio/${hash}.mp3`;
    const audio = new Audio(url);
    if(requestGeneration!==playbackGeneration)return 'cancelled';
    activeAudio = audio;
    audio.preload = 'auto';
    audio.playbackRate = safeRate;
    audio.volume = 1;
    if ('preservesPitch' in audio) (audio as HTMLAudioElement & {preservesPitch:boolean}).preservesPitch = true;
    if ('webkitPreservesPitch' in audio) (audio as any).webkitPreservesPitch = true;

    const result=await new Promise<PlaybackResult>((resolve, reject) => {
      let started = false;
      let settled=false;
      const finish=(status:PlaybackResult)=>{if(settled)return;settled=true;if(activeResolve===finish)activeResolve=null;resolve(status)};
      activeResolve=finish;
      let staticRetry=0;
      const fail = () => {
        if(requestGeneration!==playbackGeneration){finish('cancelled');return}
        if(staticRetry<1){
          staticRetry+=1;
          try{
            audio.src=`${url}?retry=${staticRetry}`;
            audio.load();
            return;
          }catch{}
        }
        if(activeResolve===finish)activeResolve=null;
        reject(new Error('static-audio-unavailable-after-retry'));
      };
      audio.addEventListener('error', fail);
      audio.addEventListener('canplay', async () => {
        if (started) return;
        started = true;
        if(requestGeneration!==playbackGeneration||activeAudio!==audio){
          try{audio.pause();audio.removeAttribute('src');audio.load()}catch{}
          finish('cancelled');
          return;
        }
        try {
          await audio.play();
          if(requestGeneration!==playbackGeneration||activeAudio!==audio){
            try{audio.pause()}catch{}
            finish('cancelled');
            return;
          }
          cb.onStart?.();
          const tick = () => {
            if (requestGeneration!==playbackGeneration || !activeAudio || activeAudio !== audio || audio.paused || audio.ended) return;
            const ratio = audio.duration > 0 ? Math.min(1, audio.currentTime / audio.duration) : 0;
            cb.onProgress?.(ratio);
            raf = requestAnimationFrame(tick);
          };
          tick();
          audio.addEventListener('ended', () => {
            if(requestGeneration!==playbackGeneration){finish('cancelled');return}
            if (raf) { cancelAnimationFrame(raf); raf = 0; }
            cb.onProgress?.(1); cb.onEnd?.();
            if (activeAudio === audio) activeAudio = null;
            finish('ended');
          }, { once: true });
        } catch (e) {
          if(requestGeneration!==playbackGeneration){finish('cancelled');return}
          if(activeResolve===finish)activeResolve=null;
          reject(e);
        }
      }, { once: true });
      audio.load();
    });
    return result;
  } catch (e) {
    if(requestGeneration!==playbackGeneration)return 'cancelled';
    trackError('audio', e);
  }

  // Browser fallback. This is also protected by the global playback generation.
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return await new Promise<PlaybackResult>(async resolve => {
      let settled=false;
      const finish=(status:PlaybackResult)=>{if(settled)return;settled=true;if(activeResolve===finish)activeResolve=null;resolve(status)};
      activeResolve=finish;
      if(requestGeneration!==playbackGeneration){finish('cancelled');return}
      const u = new SpeechSynthesisUtterance(clean);
      activeUtterance = u;
      u.lang = 'ja-JP';
      const fallbackRate = naturalFallbackRate(clean, safeRate);
      u.rate = fallbackRate;
      // Tiny differences only: young-adult feel without cartoon pitch-shifting.
      u.pitch = voiceRole==='male'?.98:voiceRole==='female'?1.01:1;
      u.volume = 1;
      const v = await jpVoice(voiceRole);
      if(requestGeneration!==playbackGeneration){finish('cancelled');return}
      if (v) u.voice = v;
      const started = performance.now();
      const est = estimatedSpeechMs(clean, fallbackRate);
      u.onstart = () => {
        if(requestGeneration!==playbackGeneration){try{window.speechSynthesis.cancel()}catch{};finish('cancelled');return}
        cb.onStart?.();
        const tick = () => {
          if (requestGeneration!==playbackGeneration || activeUtterance !== u) return;
          cb.onProgress?.(Math.min(.96, (performance.now() - started) / est));
          raf = requestAnimationFrame(tick);
        };
        tick();
      };
      u.onend = () => {
        if(requestGeneration!==playbackGeneration){finish('cancelled');return}
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        cb.onProgress?.(1); cb.onEnd?.(); activeUtterance = null; finish('ended');
      };
      u.onerror = () => {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        if(requestGeneration===playbackGeneration){cb.onEnd?.();notifyAudioError(clean,type)}
        activeUtterance = null;
        finish(requestGeneration===playbackGeneration?'unavailable':'cancelled');
      };
      if(requestGeneration!==playbackGeneration){finish('cancelled');return}
      window.speechSynthesis.speak(u);
    });
  }
  notifyAudioError(clean,type);
  return 'unavailable';
}
