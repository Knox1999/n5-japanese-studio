import type { LessonPayload, StudioMeta, KLCTree, KLCMemory } from './types';

export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const DATA_VERSION = '55';

function versioned(path: string) {
  const join = path.includes('?') ? '&' : '?';
  return `${BASE}${path}${join}v=${DATA_VERSION}`;
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(versioned(path), { cache: 'no-cache' });
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
