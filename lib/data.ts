import type { LessonPayload, StudioMeta, KLCTree, KLCMemory } from './types';

export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export const loadMeta = () => getJSON<StudioMeta>('/data/meta.json');
export const loadLesson = (lesson: number) => getJSON<LessonPayload>(`/data/lessons/${String(lesson).padStart(2, '0')}.json`);
export const loadKLC = () => Promise.all([
  getJSON<KLCTree>('/data/klc-tree.json'),
  getJSON<KLCMemory>('/data/klc-memory.json'),
] as const);
export const loadSearchIndex = () => getJSON<any[]>('/data/search-index.json');
