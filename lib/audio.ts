import { BASE } from './data';
import { track, trackError } from './analytics';

export type AudioVoiceRole='default'|'male'|'female';

let activeAudio: HTMLAudioElement | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeResolve: (()=>void) | null = null;
let raf = 0;

function normalize(text: string) {
  return String(text || '').normalize('NFC').replace(/\s+/g, ' ').trim();
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

export function stopAudio() {
  if (raf) { cancelAnimationFrame(raf); raf = 0; }
  if (activeAudio) {
    try { activeAudio.pause(); activeAudio.currentTime = 0; } catch {}
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch {}
  }
  activeUtterance = null;
  const finish=activeResolve;activeResolve=null;finish?.();
}

function scoreJapaneseVoice(v: SpeechSynthesisVoice,role:AudioVoiceRole='default') {
  const name = `${v.name} ${v.voiceURI}`.toLowerCase();
  let score = /^ja(-|_)/i.test(v.lang) ? 40 : v.lang.toLowerCase().includes('ja') ? 25 : 0;
  if (/nanami|kyoko|haruka|sayaka|google.*日本語|google.*japanese|microsoft.*japanese/.test(name)) score += 32;
  if (/natural|neural|online/.test(name)) score += 22;
  if (/premium|enhanced/.test(name)) score += 12;
  if(role==='male'&&/male|otoya|ichiro|kumo|masculine/.test(name))score+=30;
  if(role==='female'&&/female|nanami|kyoko|haruka|sayaka|feminine/.test(name))score+=30;
  if (v.localService) score += 3;
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
      window.setTimeout(finish, 220);
    });
    voices = synth.getVoices();
  }
  const jp=voices.filter(v => /^ja(-|_)/i.test(v.lang) || v.lang.toLowerCase().includes('ja')).sort((a,b) => scoreJapaneseVoice(b,role) - scoreJapaneseVoice(a,role));
  if(role==='male'&&jp.length>1&&!/male|otoya|ichiro|kumo/i.test(`${jp[0].name} ${jp[0].voiceURI}`))return jp[1];
  return jp[0];
}

function naturalFallbackRate(text: string, requested: number) {
  let r = requested * .94;
  if (/[？?]$/.test(text)) r -= .025;
  if (/[…〜～]/.test(text)) r -= .02;
  if (/(ありがとうございます|ありがとうございました|すみません|おねがいします|お願いします)/.test(text)) r -= .018;
  if (/[！!]$/.test(text)) r += .015;
  return Math.max(.70, Math.min(.98, r));
}

function estimatedSpeechMs(text: string, rate: number) {
  const punctuationPauses = (text.match(/[、。！？!?…]/g) || []).length * 105;
  return Math.max(900, (text.length * 92 + punctuationPauses) / Math.max(.7, rate));
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
) {
  stopAudio();
  const safeRate = Math.max(0.75, Math.min(1, rate));
  const clean = normalize(text);
  if (!clean) return;
  track('audio_play', { audio_type: type, playback_rate: safeRate, content_length: clean.length, voice_role:voiceRole, ...meta });

  try {
    const hash = await sha1(hashText(clean,voiceRole));
    const url = `${BASE}/audio/${hash}.mp3`;
    const audio = new Audio(url);
    activeAudio = audio;
    audio.preload = 'auto';
    audio.playbackRate = safeRate;
    audio.volume = 1;
    if ('preservesPitch' in audio) (audio as HTMLAudioElement & {preservesPitch:boolean}).preservesPitch = true;
    if ('webkitPreservesPitch' in audio) (audio as any).webkitPreservesPitch = true;

    await new Promise<void>((resolve, reject) => {
      let started = false;
      let settled=false;
      const finish=()=>{if(settled)return;settled=true;if(activeResolve===finish)activeResolve=null;resolve()};
      activeResolve=finish;
      const fail = () => {if(activeResolve===finish)activeResolve=null;reject(new Error('static-audio-unavailable'))};
      audio.addEventListener('error', fail, { once: true });
      audio.addEventListener('canplay', async () => {
        if (started) return;
        started = true;
        try {
          await audio.play();
          cb.onStart?.();
          const tick = () => {
            if (!activeAudio || activeAudio !== audio || audio.paused || audio.ended) return;
            const ratio = audio.duration > 0 ? Math.min(1, audio.currentTime / audio.duration) : 0;
            cb.onProgress?.(ratio);
            raf = requestAnimationFrame(tick);
          };
          tick();
          audio.addEventListener('ended', () => {
            if (raf) { cancelAnimationFrame(raf); raf = 0; }
            cb.onProgress?.(1); cb.onEnd?.();
            if (activeAudio === audio) activeAudio = null;
            finish();
          }, { once: true });
        } catch (e) { if(activeResolve===finish)activeResolve=null;reject(e); }
      }, { once: true });
      audio.load();
    });
    return;
  } catch (e) {
    trackError('audio', e);
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    await new Promise<void>(async resolve => {
      let settled=false;
      const finish=()=>{if(settled)return;settled=true;if(activeResolve===finish)activeResolve=null;resolve()};
      activeResolve=finish;
      const u = new SpeechSynthesisUtterance(clean);
      activeUtterance = u;
      u.lang = 'ja-JP';
      const fallbackRate = naturalFallbackRate(clean, safeRate);
      u.rate = fallbackRate;
      u.pitch = voiceRole==='male'?.96:voiceRole==='female'?1.04:1.01;
      u.volume = 1;
      const v = await jpVoice(voiceRole);
      if (v) u.voice = v;
      const started = performance.now();
      const est = estimatedSpeechMs(clean, fallbackRate);
      u.onstart = () => {
        cb.onStart?.();
        const tick = () => {
          if (activeUtterance !== u) return;
          cb.onProgress?.(Math.min(.96, (performance.now() - started) / est));
          raf = requestAnimationFrame(tick);
        };
        tick();
      };
      u.onend = () => {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        cb.onProgress?.(1); cb.onEnd?.(); activeUtterance = null; finish();
      };
      u.onerror = () => {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        cb.onEnd?.(); activeUtterance = null; finish();
      };
      window.speechSynthesis.speak(u);
    });
  }
}
