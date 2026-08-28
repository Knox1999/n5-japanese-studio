import { BASE } from './data';
import { track, trackError } from './analytics';

let activeAudio: HTMLAudioElement | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let raf = 0;

function normalize(text: string) {
  return String(text || '').normalize('NFC').replace(/\s+/g, ' ').trim();
}

export async function sha1(text: string) {
  const data = new TextEncoder().encode(normalize(text));
  const digest = await crypto.subtle.digest('SHA-1', data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function audioUrlForText(text: string) {
  const hash = await sha1(normalize(text));
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
}

function scoreJapaneseVoice(v: SpeechSynthesisVoice) {
  const name = `${v.name} ${v.voiceURI}`.toLowerCase();
  let score = /^ja(-|_)/i.test(v.lang) ? 40 : v.lang.toLowerCase().includes('ja') ? 25 : 0;
  // Prefer the most natural Japanese voices commonly shipped by modern OS/browser engines.
  if (/nanami|kyoko|haruka|sayaka|google.*日本語|google.*japanese|microsoft.*japanese/.test(name)) score += 32;
  if (/natural|neural|online/.test(name)) score += 22;
  if (/premium|enhanced/.test(name)) score += 12;
  if (v.localService) score += 3;
  return score;
}

async function jpVoice() {
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
  return voices
    .filter(v => /^ja(-|_)/i.test(v.lang) || v.lang.toLowerCase().includes('ja'))
    .sort((a,b) => scoreJapaneseVoice(b) - scoreJapaneseVoice(a))[0];
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

export async function playText(text: string, rate = 1, type = 'sentence', cb: AudioCallbacks = {}) {
  stopAudio();
  const safeRate = Math.max(0.75, Math.min(1, rate));
  const clean = normalize(text);
  if (!clean) return;
  track('audio_play', { audio_type: type, playback_rate: safeRate });

  // Primary path: pre-generated Kokoro neural MP3. Keeping pitch preserved is important
  // when the learner chooses 0.75x / 0.90x so the voice does not become artificial.
  try {
    const hash = await sha1(clean);
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
      const fail = () => reject(new Error('static-audio-unavailable'));
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
            resolve();
          }, { once: true });
        } catch (e) { reject(e); }
      }, { once: true });
      audio.load();
    });
    return;
  } catch (e) {
    trackError('audio', e);
  }

  // Fallback for local preview/cache misses. We rank installed Japanese voices instead
  // of taking the first ja-JP voice, then use a slightly warmer, punctuation-aware pace.
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    await new Promise<void>(async resolve => {
      const u = new SpeechSynthesisUtterance(clean);
      activeUtterance = u;
      u.lang = 'ja-JP';
      const fallbackRate = naturalFallbackRate(clean, safeRate);
      u.rate = fallbackRate;
      u.pitch = 1.01;
      u.volume = 1;
      const v = await jpVoice();
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
        cb.onProgress?.(1); cb.onEnd?.(); activeUtterance = null; resolve();
      };
      u.onerror = () => {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        cb.onEnd?.(); activeUtterance = null; resolve();
      };
      window.speechSynthesis.speak(u);
    });
  }
}
