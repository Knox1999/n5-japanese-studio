import type { VocabItem } from './types';

export type LearningKind = 'verb' | 'i-adjective' | 'na-adjective' | 'noun' | 'expression' | 'other';
export type VerbGroupId = 'group-1' | 'group-2' | 'group-3';

export interface LearningMeta {
  kind: LearningKind;
  label: string;
  jaLabel: string;
  tone: string;
  rule: string;
  group?: string;
  groupId?: VerbGroupId;
  groupJa?: string;
  dictionaryForm?: string;
  irregular: boolean;
  irregularTitle?: string;
  irregularNote?: string;
  sourceType: string;
}

const clean=(value:unknown)=>String(value||'').trim();
const compact=(value:unknown)=>clean(value).replace(/[\s・~～]/g,'');
const stripNotation=(value:unknown)=>clean(value)
  .replace(/[［\[].*?[］\]]/g,'')
  .replace(/[（(].*?[）)]/g,'')
  .replace(/\s+/g,'')
  .trim();

const NA_MEMORY = new Set([
  'きれい','綺麗','ゆうめい','有名','しずか','静か','にぎやか','げんき','元気',
  'ひま','暇','べんり','便利','すてき','好き','すき','きらい','嫌い','じょうず','上手',
  'へた','下手','かんたん','簡単','しんせつ','親切','しんぱい','心配','あんぜん','安全',
  'だいじょうぶ','大丈夫','たいへん','大変','らく','楽','まじめ','真面目','ていねい','丁寧'
]);

const ICHIDAN_MASU = new Set([
  'います','みます','見ます','おきます','起きます','ねます','寝ます','たべます','食べます',
  'あびます','浴びます','かります','借ります','できます','出来ます','着ます',
  'あけます','開けます','しめます','閉めます','つけます','付けます','とめます','止めます',
  'みせます','見せます','おしえます','教えます','はじめます','始めます','わすれます','忘れます',
  'あつめます','集めます','すてます','捨てます','かえます','変えます','換えます','いれます','入れます',
  'でます','出ます','でかけます','出かけます','うまれます','生まれます','つかれます','疲れます',
  'まけます','負けます','たります','足ります','なれます','慣れます','かんがえます','考えます',
  'きめます','決めます','みつけます','見つけます','しらべます','調べます','おぼえます','覚えます'
]);

const SURU_MASU = new Set([
  'します','べんきょうします','けんきゅうします','けっこんします','かいものします','しょくじします',
  'さんぽします','コピーします','そうじします','せんたくします','しゅうりします','でんわします',
  'よやくします','けんがくします','れんしゅうします','うんどうします','せつめいします',
  'しゅっちょうします','ざんぎょうします','しんぱいします','りょこうします','りゅうがくします',
  'そうだんします','れんらくします','じゅんびします','しょうかいします','あんないします'
]);

const GROUP1_SPECIAL:Record<string,{title:string;note:string}> = {
  'いきます':{title:'Group 1 · て/た-form ব্যতিক্রম',note:'行く → 行って / 行った। সাধারণ く-ending rule অনুযায়ী 行いて / 行いた হয় না।'},
  '行きます':{title:'Group 1 · て/た-form ব্যতিক্রম',note:'行く → 行って / 行った। সাধারণ く-ending rule অনুযায়ী 行いて / 行いた হয় না।'},
  'あります':{title:'Group 1 · Negative ব্যতিক্রম',note:'ある-এর negative হলো ない। × あらない নয়।'},
  'くださいます':{title:'Group 1 · Polite stem ব্যতিক্রম',note:'くださる → くださいます। Honorific -る verb হলেও ます-form বিশেষভাবে বদলে যায়।'},
  'いらっしゃいます':{title:'Group 1 · Polite stem ব্যতিক্রম',note:'いらっしゃる → いらっしゃいます। এই honorific verb-এর ます-form আলাদা করে মনে রাখুন।'},
  'おっしゃいます':{title:'Group 1 · Polite stem ব্যতিক্রম',note:'おっしゃる → おっしゃいます। এই honorific verb-এর ます-form আলাদা করে মনে রাখুন।'},
  'なさいます':{title:'Group 1 · Polite stem ব্যতিক্রম',note:'なさる → なさいます। এই honorific verb-এর ます-form আলাদা করে মনে রাখুন。'},
};

const I_ROW = new Set(['い','き','ぎ','し','じ','ち','に','ひ','び','ぴ','み','り']);
const E_ROW = new Set(['え','け','げ','せ','ぜ','て','で','ね','へ','べ','ぺ','め','れ']);
const GODAN_TO_U:Record<string,string>={ 'い':'う','き':'く','ぎ':'ぐ','し':'す','ち':'つ','に':'ぬ','び':'ぶ','み':'む','り':'る' };

function containsNaMarker(v:VocabItem){
  const all=`${clean(v.japanese)}|${clean(v.kanji)}|${clean(v.tts_text)}`;
  return /[［\[]\s*な\s*[］\]]/.test(all);
}

function inferredKind(v:VocabItem):LearningKind{
  const type=clean(v.word_type);
  const t=type.toLowerCase().replace(/[–—_]/g,'-');
  const jp=stripNotation(v.japanese);
  const kj=stripNotation(v.kanji);
  const both=`${jp}|${kj}`;

  if(/\bverb\b|動詞|ক্রিয়া|ক্রিয়া/.test(t)) return 'verb';
  if(/i[- ]?adjective|い[- ]?adjective|い形容詞|i-adj/.test(t)) return 'i-adjective';
  if(/na[- ]?adjective|な[- ]?adjective|な形容詞|na-adj/.test(t)) return 'na-adjective';

  if(containsNaMarker(v)||NA_MEMORY.has(jp)||NA_MEMORY.has(kj)) return 'na-adjective';

  if(/adjective|形容詞|বিশেষণ/.test(t)){
    if(/[いイ]$/.test(jp)||/[いイ]$/.test(kj)) return 'i-adjective';
    return 'na-adjective';
  }

  if(/noun|people|place|time|counter|number/.test(t)) return 'noun';
  if(/expression|phrase|greeting|pattern|question|suffix/.test(t)) return 'expression';

  // Some source rows are typed only as "Vocabulary". Surface notation still lets us
  // safely identify common N5 adjective classes.
  if(containsNaMarker(v)||NA_MEMORY.has(jp)||NA_MEMORY.has(kj)) return 'na-adjective';

  return 'other';
}

function looksLikeSuru(surface:string,kanji:string){
  if(SURU_MASU.has(surface)) return true;
  if(!surface.endsWith('します')) return false;
  const prefix=surface.slice(0,-3);
  if(!prefix) return true;
  if(/[ァ-ヶー]/.test(prefix)) return true;
  const kanjiPrefix=stripNotation(kanji).replace(/します$/,'');
  const cjk=(kanjiPrefix.match(/[\u3400-\u9FFF]/g)||[]).length;
  return cjk>=2;
}

function verbMeta(v:VocabItem){
  const kana=stripNotation(v.japanese);
  const kanji=stripNotation(v.kanji);
  const surface=kana||kanji;

  if((/来ます/.test(kanji)&&/きます$/.test(kana))||kana==='きます'&&kanji.startsWith('来')){
    return {groupId:'group-3' as const,group:'Group 3 · Irregular',groupJa:'不規則動詞',dictionaryForm:'くる'};
  }

  if(looksLikeSuru(surface,kanji)){
    const dict=surface==='します'?'する':surface.replace(/します$/,'する');
    return {groupId:'group-3' as const,group:'Group 3 · Irregular',groupJa:'不規則動詞',dictionaryForm:dict};
  }

  if(!surface.endsWith('ます')){
    return {groupId:undefined,group:undefined,groupJa:undefined,dictionaryForm:surface||undefined};
  }

  const stem=surface.slice(0,-2);
  const last=Array.from(stem).at(-1)||'';
  const explicitIchidan=ICHIDAN_MASU.has(surface)||ICHIDAN_MASU.has(kanji)||(/降ります/.test(kanji)&&surface==='おります');
  const group2=explicitIchidan||E_ROW.has(last);

  if(group2){
    return {groupId:'group-2' as const,group:'Group 2 · Ichidan',groupJa:'一段動詞',dictionaryForm:`${stem}る`};
  }

  const dict=GODAN_TO_U[last]?`${stem.slice(0,-1)}${GODAN_TO_U[last]}`:surface;
  return {groupId:'group-1' as const,group:'Group 1 · Godan',groupJa:'五段動詞',dictionaryForm:dict};
}

function exceptionFor(v:VocabItem,kind:LearningKind,groupId?:VerbGroupId){
  const jp=stripNotation(v.japanese), kj=stripNotation(v.kanji);
  const both=`${jp}|${kj}`;

  if(kind==='verb'){
    const special=GROUP1_SPECIAL[jp]||GROUP1_SPECIAL[kj];
    if(special) return special;
    if(groupId==='group-3') return {
      title:'Group 3 · অনিয়মিত Verb',
      note:'する এবং 来る（くる）family নিয়মিত Group 1/2 pattern অনুসরণ করে না—এগুলোর form আলাদা করে memorize করুন।'
    };
  }

  if(kind==='i-adjective'&&/(^|[|])(?:いい|よい|良い)(?:$|[|])/.test(both)){
    return {title:'い-adjective ব্যতিক্রম',note:'いい / 良い conjugation-এ よ- stem ব্যবহার হয়: よくない / よかった / よくなかった।'};
  }

  if(kind==='na-adjective'&&/(きれい|綺麗|ゆうめい|有名|きらい|嫌い)/.test(both)){
    return {title:'দেখতে い-ending, কিন্তু な-adjective',note:'শেষে い দেখা গেলেও এটি い-adjective নয়। Noun-এর আগে な লাগে; যেমন きれいな へや。'};
  }
  return null;
}

export function learningMeta(v:VocabItem):LearningMeta{
  const sourceType=clean(v.word_type)||'Vocabulary';
  const kind=inferredKind(v);
  const ext=v as VocabItem & {usage_notation?:string;naturalness_note?:string};
  const verb=kind==='verb'?verbMeta(v):null;
  const exception=exceptionFor(v,kind,verb?.groupId);

  let label=sourceType,jaLabel='語彙',tone='neutral',rule='Meaning → example → natural use';
  if(kind==='verb'){
    label='Verb · ক্রিয়া';jaLabel='動詞';tone='verb';
    rule=verb?.groupId==='group-1'
      ?'Godan: dictionary ending বদলে い-row + ます'
      :verb?.groupId==='group-2'
        ?'Ichidan: dictionary る বাদ দিয়ে ます'
        :'Irregular: する / くる family আলাদা form';
  }else if(kind==='i-adjective'){
    label='い-adjective · い বিশেষণ';jaLabel='い形容詞';tone='i-adj';
    rule='〜い → 〜くない / 〜かった / 〜くなかった';
  }else if(kind==='na-adjective'){
    label='な-adjective · な বিশেষণ';jaLabel='な形容詞';tone='na-adj';
    rule='Noun-এর আগে な · 〜です → 〜じゃない / 〜でした';
  }else if(kind==='noun'){
    label=sourceType==='Vocabulary'?'Noun / Vocabulary':sourceType;jaLabel='名詞';tone='noun';
  }else if(kind==='expression'){
    jaLabel='表現';tone='expression';
  }

  const extra=[clean(ext.usage_notation),clean(ext.naturalness_note)].filter(Boolean).join(' · ');
  const irregularNote=[exception?.note,extra].filter(Boolean).join(' ');

  return {
    kind,label,jaLabel,tone,rule,
    group:verb?.group,groupId:verb?.groupId,groupJa:verb?.groupJa,dictionaryForm:verb?.dictionaryForm,
    irregular:Boolean(exception||extra),
    irregularTitle:exception?.title||(extra?'Usage note':undefined),
    irregularNote:irregularNote||undefined,
    sourceType,
  };
}
