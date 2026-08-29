import type { MistakeRecord, StudyPlan, DailyRecommendation, ConfidenceLevel, LearningSkill, LessonJourney, LessonPayload, LessonStage, ViewName } from './types';

export const LEARNING_STATE_VERSION = 1;

export type LearningState = {
  version: number;
  mistakes: MistakeRecord[];
  studyPlan: StudyPlan;
  journeyProgress: Record<string, string[]>;
};

export const DEFAULT_STUDY_PLAN: StudyPlan = {
  dailyMinutes: 20,
  updatedAt: null,
};

export function createLearningState(): LearningState {
  return { version: LEARNING_STATE_VERSION, mistakes: [], studyPlan: DEFAULT_STUDY_PLAN, journeyProgress: {} };
}

export function normalizeConfidence(value: unknown): ConfidenceLevel {
  return value === 'guess' || value === 'unsure' || value === 'confident' ? value : 'unsure';
}

export function scoreMistake(record: MistakeRecord, now = Date.now()): number {
  const ageHours = Math.max(0, (now - new Date(record.timestamp).getTime()) / 36e5);
  const recency = Math.max(0, 36 - Math.min(36, ageHours / 6));
  const confidence = record.confidence === 'confident' ? 28 : record.confidence === 'guess' ? 20 : 16;
  const severity = record.severity === 'high' ? 34 : record.severity === 'medium' ? 22 : 12;
  const repeats = Math.min(32, Math.max(0, record.attempts - 1) * 8);
  const repairedPenalty = record.repaired ? 60 : 0;
  return Math.round(recency + confidence + severity + repeats - repairedPenalty);
}

export function getRepairQueue(records: MistakeRecord[], limit = 20): MistakeRecord[] {
  return records
    .filter(x => !x.repaired)
    .map(x => ({ record: x, score: scoreMistake(x) }))
    .sort((a, b) => b.score - a.score || b.record.timestamp.localeCompare(a.record.timestamp))
    .slice(0, limit)
    .map(x => x.record);
}

export function upsertMistake(records: MistakeRecord[], incoming: Omit<MistakeRecord, 'id' | 'attempts' | 'timestamp' | 'repaired'> & Partial<Pick<MistakeRecord, 'id' | 'attempts' | 'timestamp' | 'repaired'>>): MistakeRecord[] {
  const now = incoming.timestamp || new Date().toISOString();
  const matchIndex = records.findIndex(x => !x.repaired && x.itemId === incoming.itemId && x.skill === incoming.skill && x.questionType === incoming.questionType);
  if (matchIndex >= 0) {
    const next = [...records];
    const prev = next[matchIndex];
    next[matchIndex] = {
      ...prev,
      ...incoming,
      id: prev.id,
      timestamp: now,
      attempts: Math.max(1, Number(prev.attempts || 1) + 1),
      repaired: false,
    };
    return next.slice(0, 500);
  }
  const id = incoming.id || `${incoming.skill}:${incoming.itemId}:${Date.now().toString(36)}`;
  return [{
    ...incoming,
    id,
    timestamp: now,
    attempts: Math.max(1, Number(incoming.attempts || 1)),
    repaired: Boolean(incoming.repaired),
  }, ...records].slice(0, 500);
}

export function markMistakeRepaired(records: MistakeRecord[], id: string): MistakeRecord[] {
  const now = new Date().toISOString();
  return records.map(x => x.id === id ? { ...x, repaired: true, lastReviewed: now } : x);
}

export function weakestSkill(records: MistakeRecord[]): LearningSkill | null {
  const totals = new Map<LearningSkill, number>();
  getRepairQueue(records, 100).forEach(record => totals.set(record.skill, (totals.get(record.skill) || 0) + scoreMistake(record)));
  return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function stage(id:string, kind:LessonStage['kind'], title:string, targetView:ViewName, estimatedMinutes:number, optional=false):LessonStage {
  return { id, kind, title, targetView, estimatedMinutes, optional };
}

export function buildLessonJourney(data: LessonPayload): LessonJourney {
  const stages: LessonStage[] = [
    stage('goal','goal','Lesson goal দেখুন','vocabulary',1),
    stage('vocabulary','vocabulary','Core vocabulary শিখুন','vocabulary',6),
  ];
  if (data.content.dialogue?.length || data.content.dialogue_extended?.length) stages.push(stage('conversation','conversation','Conversation context','conversation',4));
  if (data.content.grammar?.length) stages.push(stage('grammar','grammar','Grammar pattern বুঝুন','grammar',5));
  if (data.content.dialogue?.length || data.content.dialogue_extended?.length || data.content.shadowing_chunks?.length) stages.push(stage('listening','listening','Listen → repeat → shadow','listening',5));
  if (data.content.reading || data.content.reading_extended) stages.push(stage('reading','reading','Reading comprehension','reading',4));
  if (data.kanji?.length) stages.push(stage('kanji','kanji','Kanji reinforcement','kanji',4,true));
  stages.push(stage('practice','practice','Active recall practice','srs',4));
  stages.push(stage('quiz','quiz','Lesson check','mock',5));
  stages.push(stage('repair','repair','Mistake review','srs',3,true));
  return {
    lessonId: String(data.lesson),
    level: 'N5',
    objective: data.scenario || data.content.scenario || data.title || `Lesson ${data.lesson}`,
    stages,
  };
}

type CoachInput = {
  lesson: number;
  lessonPercent: number;
  dueSrs: number;
  mistakes: MistakeRecord[];
  dailyMinutes: number;
  lastMockScore?: number;
};

export function buildDailyRecommendations(input: CoachInput): DailyRecommendation[] {
  const minutes = Math.max(5, Math.min(60, Math.round(input.dailyMinutes || 20)));
  const queue = getRepairQueue(input.mistakes, 50);
  const weak = weakestSkill(input.mistakes);
  const result: DailyRecommendation[] = [];

  if (input.dueSrs > 0) result.push({ id: 'due-srs', kind: 'srs', title: 'Due review আগে শেষ করুন', reason: `${input.dueSrs}টি card এখন review-এর জন্য ready।`, minutes: Math.min(Math.max(3, Math.ceil(input.dueSrs / 4)), Math.max(3, Math.floor(minutes * .35))), priority: 100 });
  if (queue.length > 0) result.push({ id: 'repair', kind: 'repair', title: 'সাম্প্রতিক ভুলগুলো ঠিক করুন', reason: `${queue.length}টি unresolved mistake আছে${weak ? ` · সবচেয়ে দুর্বল: ${weak}` : ''}।`, minutes: Math.max(3, Math.floor(minutes * .3)), priority: 92 });
  if (input.lessonPercent < 80) result.push({ id: 'continue-lesson', kind: 'lesson', title: `Lesson ${String(input.lesson).padStart(2, '0')} চালিয়ে যান`, reason: `বর্তমান lesson mastery ${input.lessonPercent}%।`, minutes: Math.max(5, Math.floor(minutes * .45)), priority: 82 });
  if ((input.lastMockScore ?? 100) < 70) result.push({ id: 'mock-recovery', kind: 'mock', title: 'Mock test recovery review', reason: `সর্বশেষ mock score ${input.lastMockScore}%—দুর্বল অংশ review করুন।`, minutes: Math.max(5, Math.floor(minutes * .3)), priority: 72 });
  if (!result.length) result.push({ id: 'next-lesson', kind: 'lesson', title: 'পরবর্তী শেখার ধাপ শুরু করুন', reason: 'Due review বা unresolved mistake নেই।', minutes, priority: 60 });

  let budget = minutes;
  return result.sort((a, b) => b.priority - a.priority).map(item => {
    const allocated = Math.max(2, Math.min(item.minutes, budget));
    budget = Math.max(0, budget - allocated);
    return { ...item, minutes: allocated };
  }).filter((item, index) => item.minutes > 0 && index < 4);
}
