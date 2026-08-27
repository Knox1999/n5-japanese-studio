import { BASE } from './data';
import { track, trackError } from './analytics';

let activeAudio: HTMLAudioElement | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let raf = 0;

function normalize(text: string) { return String(text || '').normalize('NFC').replace(/\s+/g, ' ').trim(); }

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

function jpVoice() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
  const voices = window.speechSynthesis.getVoices();
  return voices.find(v => /^ja(-|_)/i.test(v.lang)) || voices.find(v => v.lang.toLowerCase().includes('ja'));
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

  try {
    const hash = await sha1(clean);
    const url = `${BASE}/audio/${hash}.mp3`;
    const audio = new Audio(url);
    activeAudio = audio;
    audio.preload = 'auto';
    audio.playbackRate = safeRate;

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
          audio.addEventListener('ended', () => { cb.onProgress?.(1); cb.onEnd?.(); resolve(); }, { once: true });
        } catch (e) { reject(e); }
      }, { once: true });
      audio.load();
    });
    return;
  } catch (e) {
    trackError('audio', e);
  }

  // Lightweight fallback for local preview or an audio cache miss.
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    await new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(clean);
      activeUtterance = u;
      u.lang = 'ja-JP';
      u.rate = Math.max(0.7, Math.min(1, safeRate));
      const v = jpVoice(); if (v) u.voice = v;
      const started = performance.now();
      const est = Math.max(900, clean.length * 95 / safeRate);
      u.onstart = () => {
        cb.onStart?.();
        const tick = () => {
          if (activeUtterance !== u) return;
          cb.onProgress?.(Math.min(.96, (performance.now() - started) / est));
          raf = requestAnimationFrame(tick);
        };
        tick();
      };
      u.onend = () => { cb.onProgress?.(1); cb.onEnd?.(); activeUtterance = null; resolve(); };
      u.onerror = () => { cb.onEnd?.(); activeUtterance = null; resolve(); };
      window.speechSynthesis.speak(u);
    });
  }
}
