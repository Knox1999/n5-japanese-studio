import type { MockAttempt } from './types';
import type { SrsMap } from './storage';

// Gamification is fully derived from existing learning-progress data (mastery,
// mock history, SRS reviews, repaired mistakes, streak) — nothing new is
// persisted here; unlocking is recomputed from real state on every render.

export type XpInput = {
  totalMastered: number;
  completedLessons: number;
  history: MockAttempt[];
  srs: SrsMap;
  repairedMistakes: number;
  arcadeCompletions: number;
};

export function computeBaseXp({ totalMastered, completedLessons, history, srs, repairedMistakes, arcadeCompletions }: XpInput): number {
  const mockPoints = history.reduce((n, h) => n + Math.round(Number(h.score || 0) / 5), 0);
  const reviewPoints = Object.values(srs).reduce((n, s) => n + Number(s.repetitions || 0), 0) * 3;
  const repairPoints = repairedMistakes * 5;
  const arcadePoints = arcadeCompletions * 15;
  return totalMastered * 4 + completedLessons * 50 + mockPoints + reviewPoints + repairPoints + arcadePoints;
}

export type Level = { level: number; xp: number; bn: string; en: string; jp: string };
export const LEVELS: Level[] = [
  { level: 1, xp: 0, bn: 'নতুন শিক্ষার্থী', en: 'Beginner', jp: 'はじめて' },
  { level: 2, xp: 150, bn: 'শিক্ষার্থী', en: 'Learner', jp: '学習者' },
  { level: 3, xp: 400, bn: 'শব্দ শিকারি', en: 'Word Hunter', jp: '単語ハンター' },
  { level: 4, xp: 800, bn: 'গ্রামার অভিযাত্রী', en: 'Grammar Explorer', jp: '文法探検家' },
  { level: 5, xp: 1400, bn: 'কাঞ্জি শিক্ষানবিশ', en: 'Kanji Apprentice', jp: '漢字見習い' },
  { level: 6, xp: 2200, bn: 'কথোপকথন বিশেষজ্ঞ', en: 'Conversation Pro', jp: '会話の達人' },
  { level: 7, xp: 3200, bn: 'N5 চ্যাম্পিয়ন', en: 'N5 Champion', jp: 'N5チャンピオン' },
  { level: 8, xp: 4500, bn: 'কিংবদন্তি শিক্ষার্থী', en: 'Legendary Learner', jp: '伝説の学習者' },
];

export function currentLevel(xp: number): Level {
  return [...LEVELS].reverse().find(l => xp >= l.xp) || LEVELS[0];
}

export function levelProgress(xp: number) {
  const level = currentLevel(xp);
  const next = LEVELS.find(l => l.level === level.level + 1) || null;
  if (!next) return { level, next, pct: 100, xpIntoLevel: xp - level.xp, xpForNext: 0 };
  const span = next.xp - level.xp;
  const into = Math.max(0, xp - level.xp);
  return { level, next, pct: Math.max(0, Math.min(100, Math.round((into / span) * 100))), xpIntoLevel: into, xpForNext: next.xp - xp };
}

export type AchievementContext = {
  totalMastered: number;
  vocabularyTotal: number;
  completedLessons: number;
  totalLessons: number;
  streak: number;
  bestMockScore: number;
  mockAttempts: number;
  srsRepetitions: number;
  repairedMistakes: number;
};

export type AchievementIcon = 'seedling'|'book'|'trophy'|'flame'|'target'|'brain'|'medal'|'crown';
export type Achievement = {
  id: string; bn: string; en: string; descBn: string; descEn: string;
  icon: AchievementIcon; xpReward: number; check: (ctx: AchievementContext) => boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-word', bn: 'প্রথম পদক্ষেপ', en: 'First Steps', descBn: 'প্রথম শব্দটি আয়ত্ত করুন', descEn: 'Master your first word', icon: 'seedling', xpReward: 10, check: c => c.totalMastered >= 1 },
  { id: 'vocab-50', bn: 'শব্দভান্ডার নির্মাতা', en: 'Vocabulary Builder', descBn: '৫০টি শব্দ আয়ত্ত করুন', descEn: 'Master 50 words', icon: 'book', xpReward: 40, check: c => c.totalMastered >= 50 },
  { id: 'vocab-all', bn: 'শব্দভান্ডার মাস্টার', en: 'Vocabulary Master', descBn: 'সব শব্দ আয়ত্ত করুন', descEn: 'Master every word', icon: 'crown', xpReward: 150, check: c => c.vocabularyTotal > 0 && c.totalMastered >= c.vocabularyTotal },
  { id: 'lesson-1', bn: 'লেসন সম্পন্ন', en: 'Lesson Finisher', descBn: 'প্রথম lesson সম্পন্ন করুন', descEn: 'Finish your first lesson', icon: 'target', xpReward: 20, check: c => c.completedLessons >= 1 },
  { id: 'lesson-half', bn: 'অর্ধেক পথ', en: 'Halfway There', descBn: 'অর্ধেক course সম্পন্ন করুন', descEn: 'Complete half the course', icon: 'target', xpReward: 80, check: c => c.totalLessons > 0 && c.completedLessons >= Math.ceil(c.totalLessons / 2) },
  { id: 'lesson-all', bn: 'কোর্স সম্পন্ন', en: 'Course Complete', descBn: 'সব ২৫টি lesson সম্পন্ন করুন', descEn: 'Complete all 25 lessons', icon: 'crown', xpReward: 200, check: c => c.totalLessons > 0 && c.completedLessons >= c.totalLessons },
  { id: 'streak-3', bn: '৩ দিনের স্ট্রিক', en: '3-Day Streak', descBn: 'টানা ৩ দিন পড়ুন', descEn: 'Study 3 days in a row', icon: 'flame', xpReward: 15, check: c => c.streak >= 3 },
  { id: 'streak-7', bn: 'সাপ্তাহিক যোদ্ধা', en: 'Week Warrior', descBn: 'টানা ৭ দিন পড়ুন', descEn: 'Study 7 days in a row', icon: 'flame', xpReward: 50, check: c => c.streak >= 7 },
  { id: 'streak-30', bn: 'অবিচল', en: 'Unstoppable', descBn: 'টানা ৩০ দিন পড়ুন', descEn: 'Study 30 days in a row', icon: 'flame', xpReward: 250, check: c => c.streak >= 30 },
  { id: 'mock-90', bn: 'মক টেস্ট এইস', en: 'Mock Ace', descBn: 'একটি mock-এ ৯০%+ score করুন', descEn: 'Score 90%+ on a mock test', icon: 'trophy', xpReward: 60, check: c => c.bestMockScore >= 90 },
  { id: 'mock-5', bn: 'পরীক্ষার্থী', en: 'Test Taker', descBn: '৫টি mock test দিন', descEn: 'Take 5 mock tests', icon: 'medal', xpReward: 30, check: c => c.mockAttempts >= 5 },
  { id: 'repair-10', bn: 'ভুল সংশোধক', en: 'Mistake Slayer', descBn: '১০টি ভুল সংশোধন করুন', descEn: 'Repair 10 mistakes', icon: 'brain', xpReward: 40, check: c => c.repairedMistakes >= 10 },
  { id: 'review-100', bn: 'নিবেদিত পর্যালোচক', en: 'Dedicated Reviewer', descBn: '১০০টি SRS review সম্পন্ন করুন', descEn: 'Complete 100 SRS reviews', icon: 'brain', xpReward: 50, check: c => c.srsRepetitions >= 100 },
];

export function splitAchievements(ctx: AchievementContext) {
  const unlocked: Achievement[] = [];
  const locked: Achievement[] = [];
  for (const a of ACHIEVEMENTS) (a.check(ctx) ? unlocked : locked).push(a);
  return { unlocked, locked };
}

export function computeXp(ctx: AchievementContext & XpInput): number {
  const base = computeBaseXp(ctx);
  const bonus = splitAchievements(ctx).unlocked.reduce((n, a) => n + a.xpReward, 0);
  return base + bonus;
}

/** Immediate per-session reward shown at the end of an arcade game. The
 *  persistent total XP grows separately via `arcadeCompletions` in computeBaseXp
 *  once the completion is recorded, so this is presentational, not a second ledger. */
export function sessionXpReward(score: number, total: number): number {
  if (total <= 0) return 0;
  const accuracy = Math.max(0, Math.min(1, score / total));
  return 15 + Math.round(accuracy * 30);
}
