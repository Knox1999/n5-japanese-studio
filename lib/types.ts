export type ViewName =
  | 'dashboard' | 'vocabulary' | 'srs' | 'spelling' | 'conversation'
  | 'reading' | 'listening' | 'grammar' | 'kanji' | 'mock' | 'history';

export interface VocabItem {
  id: number;
  lesson: number;
  japanese: string;
  pronunciation_bn: string;
  kanji?: string;
  english_meaning: string;
  bangla_meaning: string;
  word_type?: string;
  tts_text?: string;
  spelling_text?: string;
  spelling_eligible?: boolean;
  example?: { jp?: string; japanese?: string; bn?: string; note?: string };
}

export interface LessonContent {
  title?: string;
  scenario?: string;
  grammar?: [string, string, string][];
  dialogue?: [string, string, string][];
  dialogue_extended?: [string, string, string][];
  reading?: string;
  reading_bn?: string;
  reading_extended?: string;
  reading_extended_bn?: string;
  reading_extra_pairs?: [string, string][];
  shadowing_chunks?: string[];
}

export interface CuratedKanji {
  lesson: number;
  character: string;
  reading: string;
  meaning: string;
  parts?: string[];
  story?: string;
}

export interface LessonPayload {
  lesson: number;
  title: string;
  scenario: string;
  vocabulary: VocabItem[];
  content: LessonContent;
  kanji: CuratedKanji[];
}

export interface MetaLesson {
  lesson: number;
  title: string;
  scenario: string;
  count: number;
  kanji_count: number;
  ids: number[];
}

export interface StudioMeta {
  version: string;
  source_version?: string;
  vocabulary_count: number;
  lesson_count: number;
  klc_nodes: number;
  klc_edges: number;
  lessons: MetaLesson[];
}

export type KLCNodeRaw = [number, string, string, string, string, string, string, string, string, string, string];
export type KLCEdgeRaw = [number, number, string, string, string, number | null, string];
export interface KLCTree { nodes: KLCNodeRaw[]; edges: KLCEdgeRaw[]; stats: Record<string, number>; }
export type KLCMemory = Record<string, [string, string, string[]]>;

export interface SrsCardState {
  phase?: 'learn' | 'recall' | 'use' | 'review';
  repetitions?: number;
  lapses?: number;
  ease?: number;
  interval_days?: number;
  due_at?: string | null;
  last_rating?: string | null;
  recall_count?: number;
  use_count?: number;
}

export interface MockAttempt {
  lesson: number;
  scope?: 'lesson' | 'n5-full';
  label?: string;
  score: number;
  correct: number;
  total: number;
  date: string;
  breakdown?: Record<string, { correct: number; total: number }>;
}
