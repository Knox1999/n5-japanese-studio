import type { VocabItem } from './types';

export type LearningKind = 'verb' | 'i-adjective' | 'na-adjective' | 'noun' | 'expression' | 'other';

export interface LearningMeta {
  kind: LearningKind;
  label: string;
  jaLabel: string;
  tone: string;
  rule: string;
  group?: string;
  irregular: boolean;
  irregularTitle?: string;
  irregularNote?: string;
  sourceType: string;
}

const clean = (value: unknown) => String(value || '').trim();
const compact = (value: unknown) => clean(value).replace(/[\s・~～［］\[\]()（）]/g, '');

function typeKind(type: string): LearningKind {
  const t = type.toLowerCase().replace(/[–—_]/g, '-');
  if (/\bverb\b|動詞|ক্রিয়া|ক্রিয়া/.test(t)) return 'verb';
  if (/i[- ]?adjective|い[- ]?adjective|い形容詞|i-adj/.test(t)) return 'i-adjective';
  if (/na[- ]?adjective|な[- ]?adjective|な形容詞|na-adj/.test(t)) return 'na-adjective';
  if (/adjective/.test(t) && /\bna\b/.test(t)) return 'na-adjective';
  if (/adjective/.test(t) && /\bi\b/.test(t)) return 'i-adjective';
  if (/noun|people|place|time|counter|number/.test(t)) return 'noun';
  if (/expression|phrase|greeting|pattern|question|suffix/.test(t)) return 'expression';
  return 'other';
}

function exceptionFor(v: VocabItem, kind: LearningKind) {
  const jp = compact(v.kanji || v.japanese);
  const kana = compact(v.japanese);
  const both = `${jp}|${kana}`;

  if (kind === 'verb') {
    if (/する$/.test(kana) || /する$/.test(jp)) {
      return { group: 'Group 3 · Irregular', title: 'ব্যতিক্রম Verb', note: 'する → します / しない / して / した — এটি নিয়মিত Group 1/2 pattern অনুসরণ করে না।' };
    }
    if (/(来る|くる)/.test(both)) {
      return { group: 'Group 3 · Irregular', title: 'ব্যতিক্রম Verb', note: '来る（くる）→ きます / こない / きて / きた — stem বদলে যায়, তাই আলাদা করে মনে রাখুন।' };
    }
    if (/(行く|いく)/.test(both)) {
      return { group: 'Group 1 · Special て/た', title: 'て-form ব্যতিক্রম', note: '行く → 行って / 行った; সাধারণ く-ending rule-এর いて / いた হয় না।' };
    }
    if (/(^|[^ぁ-ん])ある$/.test(kana) || jp === 'ある') {
      return { group: 'Group 1 · Special negative', title: 'Negative ব্যতিক্রম', note: 'ある-এর negative হলো ない; × あらない নয়।' };
    }
  }

  if (kind === 'i-adjective' && /(良い|いい|よい)/.test(both)) {
    return { title: 'い-adjective ব্যতিক্রম', note: 'いい / 良い conjugation-এ よ- stem ব্যবহার হয়: よくない / よかった / よくなかった।' };
  }

  if (kind === 'na-adjective' && /(きれい|綺麗|ゆうめい|有名|きらい|嫌い)/.test(both)) {
    return { title: 'দেখতে い-ending, কিন্তু な-adjective', note: 'শব্দের শেষে い দেখা গেলেও এটি い-adjective নয়। Noun-এর আগে な লাগে; যেমন きれいな へや।' };
  }
  return null;
}

export function learningMeta(v: VocabItem): LearningMeta {
  const sourceType = clean(v.word_type) || 'Vocabulary';
  const kind = typeKind(sourceType);
  const ext = v as VocabItem & { usage_notation?: string; naturalness_note?: string };
  const exception = exceptionFor(v, kind);

  let label = sourceType;
  let jaLabel = '語彙';
  let tone = 'neutral';
  let rule = 'Meaning → example → natural use';
  let group: string | undefined;

  if (kind === 'verb') {
    label = 'Verb · ক্রিয়া'; jaLabel = '動詞'; tone = 'verb';
    group = exception?.group || (/(group|গ্রুপ)\s*[123]/i.exec(sourceType)?.[0] ?? undefined);
    rule = 'Dictionary form → ます → て → ない';
  } else if (kind === 'i-adjective') {
    label = 'い-adjective · い বিশেষণ'; jaLabel = 'い形容詞'; tone = 'i-adj';
    rule = '〜い → 〜くない / 〜かった / 〜くなかった';
  } else if (kind === 'na-adjective') {
    label = 'な-adjective · な বিশেষণ'; jaLabel = 'な形容詞'; tone = 'na-adj';
    rule = 'Noun-এর আগে な · 〜です → 〜じゃない / 〜でした';
  } else if (kind === 'noun') {
    label = sourceType === 'Vocabulary' ? 'Noun / Vocabulary' : sourceType; jaLabel = '名詞'; tone = 'noun';
  } else if (kind === 'expression') {
    jaLabel = '表現'; tone = 'expression';
  }

  const extra = [clean(ext.usage_notation), clean(ext.naturalness_note)].filter(Boolean).join(' · ');
  const irregularNote = [exception?.note, extra].filter(Boolean).join(' ');
  return {
    kind, label, jaLabel, tone, rule, group,
    irregular: Boolean(exception || extra),
    irregularTitle: exception?.title || (extra ? 'Usage note' : undefined),
    irregularNote: irregularNote || undefined,
    sourceType,
  };
}
