import type { MockAttempt, SrsCardState } from './types';
import { createLearningState, LEARNING_STATE_VERSION, normalizeDailyMinutes, type LearningState } from './learning';

export const STORAGE_VERSION = 61;
export const STUDY_STATE_EVENT='nihongo:vibes-study-state-changed';
export const KEYS = {
  lesson: 'n5_offline_lesson',
  progress: 'n5_offline_progress',
  history: 'n5_offline_history',
  srs: 'n5_offline_srs_v8',
  spelling: 'n5_offline_spelling_v12',
  learning: 'nihongo_vibes_learning_v1',
};

function announceStudyStateChange(){
  if(typeof window==='undefined')return;
  window.dispatchEvent(new Event(STUDY_STATE_EVENT));
}

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
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    announceStudyStateChange();
  } catch {}
}

export function readLesson(): number {
  if (typeof window === 'undefined') return 1;
  const n = Number(window.localStorage.getItem(KEYS.lesson) || 1);
  return Number.isFinite(n) ? Math.min(25, Math.max(1, n)) : 1;
}

export function writeLesson(n: number) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEYS.lesson, String(Math.min(25, Math.max(1, Math.round(n)))));
    announceStudyStateChange();
  } catch {}
}

export type ProgressMap = Record<string, boolean | number>;
export type SrsMap = Record<string, SrsCardState>;

export const readProgress = () => readJSON<ProgressMap>(KEYS.progress, {});
export const saveProgress = (v: ProgressMap) => writeJSON(KEYS.progress, v);
export const readSrs = () => readJSON<SrsMap>(KEYS.srs, {});
export const saveSrs = (v: SrsMap) => writeJSON(KEYS.srs, v);
export const readHistory = () => readJSON<MockAttempt[]>(KEYS.history, []);
export const saveHistory = (v: MockAttempt[]) => writeJSON(KEYS.history, v.slice(0, 100));

export function readLearningState(): LearningState {
  const fallback = createLearningState();
  const raw = readJSON<Partial<LearningState>>(KEYS.learning, fallback);
  return {
    version: LEARNING_STATE_VERSION,
    mistakes: Array.isArray(raw.mistakes) ? raw.mistakes : [],
    studyPlan: raw.studyPlan && typeof raw.studyPlan === 'object'
      ? {
          dailyMinutes: normalizeDailyMinutes(raw.studyPlan.dailyMinutes),
          updatedAt: raw.studyPlan.updatedAt || null,
        }
      : fallback.studyPlan,
    journeyProgress: raw.journeyProgress && typeof raw.journeyProgress === 'object'
      ? raw.journeyProgress
      : fallback.journeyProgress,
  };
}

export function saveLearningState(value: LearningState) {
  writeJSON(KEYS.learning, {
    ...value,
    version: LEARNING_STATE_VERSION,
    studyPlan: {
      ...value.studyPlan,
      dailyMinutes: normalizeDailyMinutes(value.studyPlan.dailyMinutes),
    },
  });
}

export interface StudioBackup {
  app: 'the-nihongo-vibes';
  version: number;
  exported_at: string;
  lesson: number;
  progress: ProgressMap;
  srs: SrsMap;
  history: MockAttempt[];
  learning?: LearningState;
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
    learning: readLearningState(),
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
  if (b.learning && typeof b.learning === 'object') {
    const fallback = createLearningState();
    saveLearningState({
      version: LEARNING_STATE_VERSION,
      mistakes: Array.isArray(b.learning.mistakes) ? b.learning.mistakes : [],
      studyPlan: b.learning.studyPlan && typeof b.learning.studyPlan === 'object'
        ? {
            dailyMinutes: normalizeDailyMinutes(b.learning.studyPlan.dailyMinutes),
            updatedAt: b.learning.studyPlan.updatedAt || null,
          }
        : fallback.studyPlan,
      journeyProgress: b.learning.journeyProgress && typeof b.learning.journeyProgress === 'object'
        ? b.learning.journeyProgress
        : fallback.journeyProgress,
    });
  }
}
