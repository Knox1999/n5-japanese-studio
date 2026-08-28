import type { MockAttempt, SrsCardState } from './types';

export const STORAGE_VERSION = 58;
export const KEYS = {
  lesson: 'n5_offline_lesson',
  progress: 'n5_offline_progress',
  history: 'n5_offline_history',
  srs: 'n5_offline_srs_v8',
  spelling: 'n5_offline_spelling_v12',
};

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function readLesson(): number {
  if (typeof window === 'undefined') return 1;
  const n = Number(window.localStorage.getItem(KEYS.lesson) || 1);
  return Number.isFinite(n) ? Math.min(25, Math.max(1, n)) : 1;
}

export function writeLesson(n: number) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEYS.lesson, String(n));
}

export type ProgressMap = Record<string, boolean | number>;
export type SrsMap = Record<string, SrsCardState>;

export const readProgress = () => readJSON<ProgressMap>(KEYS.progress, {});
export const saveProgress = (v: ProgressMap) => writeJSON(KEYS.progress, v);
export const readSrs = () => readJSON<SrsMap>(KEYS.srs, {});
export const saveSrs = (v: SrsMap) => writeJSON(KEYS.srs, v);
export const readHistory = () => readJSON<MockAttempt[]>(KEYS.history, []);
export const saveHistory = (v: MockAttempt[]) => writeJSON(KEYS.history, v.slice(0, 100));

export interface StudioBackup {
  app: 'the-nihongo-vibes';
  version: number;
  exported_at: string;
  lesson: number;
  progress: ProgressMap;
  srs: SrsMap;
  history: MockAttempt[];
}

export function createBackup(): StudioBackup {
  return {
    app: 'the-nihongo-vibes',
    version: STORAGE_VERSION,
    exported_at: new Date().toISOString(),
    lesson: readLesson(),
    progress: readProgress(),
    srs: readSrs(),
    history: readHistory(),
  };
}

export function importBackup(value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('Invalid backup file');
  const b = value as Partial<StudioBackup>;
  if (b.app !== 'the-nihongo-vibes') throw new Error('This is not a The Nihongo Vibes backup');
  const lesson = Math.max(1, Math.min(25, Number(b.lesson || 1)));
  writeLesson(lesson);
  saveProgress((b.progress && typeof b.progress === 'object' ? b.progress : {}) as ProgressMap);
  saveSrs((b.srs && typeof b.srs === 'object' ? b.srs : {}) as SrsMap);
  saveHistory(Array.isArray(b.history) ? b.history : []);
}
