import type { VocabItem } from './types';

export type LearningKind = 'verb' | 'i-adjective' | 'na-adjective' | 'noun' | 'expression' | 'other';
export type VerbGroupId = 'group-1' | 'group-2' | 'group-3';

export interface LearningMeta {
  kind: LearningKind;
  label: string;
  jaLabel: string;
  tone: string;
  group?: string;
  groupId?: VerbGroupId;
  groupJa?: string;
  irregular: boolean;
  irregularTitle?: string;
  irregularNote?: string;
  sourceType: string;
}

export interface VerbForms {
  masu: string;
  masen: string;
  mashita: string;
  masenDeshita: string;
  dictionary: string;
  nai: string;
  nakatta: string;
  te: string;
  ta: string;
}

const clean=(value:unknown)=>String(value||'').trim();
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
  'あびます','浴びます','かります','借ります','できます','出来ます','着ます','おります','降ります',
  'あけます','開けます','しめます','閉めます','つけます','付けます','とめます','止めます',
  'みせます','見せます','おしえます','教えます','はじめます','始めます','わすれます','忘れます',
  'おぼえます','覚えます','あつめます','集めます','すてます','捨てます','かえます','変えます',
  '換えます','いれます','入れます','でます','出ます','でかけます','出かけます',
  'うまれます','生まれます','つかれます','疲れます','まけます','負けます','たります','足ります',
  'なれます','慣れます','かんがえます','考えます','きめます','決めます','みつけます','見つけます',
  'しらべます','調べます','やめます','むかえます','迎えます','かけます','ほめます','褒めます',
  'みえます','見えます','きこえます','聞こえます'
]);

const SURU_MASU = new Set([
  'します','べんきょうします','けんきゅうします','けっこんします','かいものします','しょくじします',
  'さんぽします','コピーします','そうじします','せんたくします','しゅうりします','でんわします',
  'よやくします','けんがくします','れんしゅうします','うんどうします','せつめいします',
  'しゅっちょうします','ざんぎょうします','しんぱいします','りょこうします','りゅうがくします',
  'そうだんします','れんらくします','じゅんびします','しょうかいします','あんないします'
]);

const GROUP1_SPECIAL:Record<string,{title:string;note:string}> = {
  'いきます':{title:'行く · て/た-form ব্যতিক্রম',note:'行く → 行って / 行った। く-ending-এর সাধারণ いて / いた rule এখানে প্রযোজ্য নয়।'},
  '行きます':{title:'行く · て/た-form ব্যতিক্রম',note:'行く → 行って / 行った। く-ending-এর সাধারণ いて / いた rule এখানে প্রযোজ্য নয়।'},
  'あります':{title:'ある · Negative ব্যতিক্রম',note:'ある-এর negative হলো ない এবং past negative なかった। × あらない নয়।'},
  'くださいます':{title:'くださる · Polite stem ব্যতিক্রম',note:'くださる → くださいます। Honorific -る verb হলেও ます-form বিশেষভাবে বদলে যায়।'},
  'いらっしゃいます':{title:'いらっしゃる · Polite stem ব্যতিক্রম',note:'いらっしゃる → いらっしゃいます। এই honorific verb-এর polite stem আলাদা করে মনে রাখুন।'},
  'おっしゃいます':{title:'おっしゃる · Polite stem ব্যতিক্রম',note:'おっしゃる → おっしゃいます। এই honorific verb-এর polite stem আলাদা করে মনে রাখুন।'},
  'なさいます':{title:'なさる · Polite stem ব্যতিক্রম',note:'なさる → なさいます। এই honorific verb-এর polite stem আলাদা করে মনে রাখুন。'},
};

const E_ROW = new Set(['え','け','げ','せ','ぜ','て','で','ね','へ','べ','ぺ','め','れ']);
const GODAN_TO_U:Record<string,string>={ 'い':'う','き':'く','ぎ':'ぐ','し':'す','ち':'つ','に':'ぬ','び':'ぶ','み':'む','り':'る' };
const GODAN_TO_A:Record<string,string>={ 'い':'わ','き':'か','ぎ':'が','し':'さ','ち':'た','に':'な','び':'ば','み':'ま','り':'ら' };

function containsNaMarker(v:VocabItem){
  const all=`${clean(v.japanese)}|${clean(v.kanji)}|${clean(v.tts_text)}`;
  return /[［\[]\s*な\s*[］\]]/.test(all);
}

function inferredKind(v:VocabItem):LearningKind{
  const type=clean(v.word_type);
  const t=type.toLowerCase().replace(/[–—_]/g,'-');
  const jp=stripNotation(v.japanese);
  const kj=stripNotation(v.kanji);

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
  return (kanjiPrefix.match(/[\u3400-\u9FFF]/g)||[]).length>=2;
}

function verbMeta(v:VocabItem){
  const kana=stripNotation(v.japanese);
  const kanji=stripNotation(v.kanji);
  const surface=kana||kanji;

  if(/来ます$/.test(kanji)&&/きます$/.test(kana)){
    return {groupId:'group-3' as const,group:'Group 3 · Irregular',groupJa:'不規則動詞'};
  }
  if(looksLikeSuru(surface,kanji)){
    return {groupId:'group-3' as const,group:'Group 3 · Irregular',groupJa:'不規則動詞'};
  }
  if(!surface.endsWith('ます')) return {groupId:undefined,group:undefined,groupJa:undefined};

  const stem=surface.slice(0,-2);
  const last=Array.from(stem).at(-1)||'';
  const group2=ICHIDAN_MASU.has(surface)||ICHIDAN_MASU.has(kanji)||E_ROW.has(last);
  if(group2) return {groupId:'group-2' as const,group:'Group 2 · Ichidan',groupJa:'一段動詞'};
  return {groupId:'group-1' as const,group:'Group 1 · Godan',groupJa:'五段動詞'};
}

function exceptionFor(v:VocabItem,kind:LearningKind,groupId?:VerbGroupId){
  const jp=stripNotation(v.japanese),kj=stripNotation(v.kanji);
  if(kind==='verb'){
    const special=GROUP1_SPECIAL[jp]||GROUP1_SPECIAL[kj];
    if(special) return special;
    if(groupId==='group-3') return {
      title:'Group 3 · অনিয়মিত Verb',
      note:'する এবং 来る（くる）family নিয়মিত Group 1/2 conjugation pattern অনুসরণ করে না।'
    };
  }
  if(kind==='i-adjective'&&/(いい|よい|良い)/.test(`${jp}|${kj}`)){
    return {title:'い-adjective ব্যতিক্রম',note:'いい / 良い conjugation-এ よ- stem ব্যবহার হয়: よくない / よかった / よくなかった。'};
  }
  if(kind==='na-adjective'&&/(きれい|綺麗|ゆうめい|有名|きらい|嫌い)/.test(`${jp}|${kj}`)){
    return {title:'দেখতে い-ending, কিন্তু な-adjective',note:'শেষে い দেখা গেলেও এটি い-adjective নয়। Noun-এর আগে な লাগে।'};
  }
  return null;
}

function godanTeTa(dictionary:string){
  if(dictionary==='いく') return {te:'いって',ta:'いった'};
  const chars=Array.from(dictionary);
  const last=chars.at(-1)||'';
  const base=chars.slice(0,-1).join('');
  if(['う','つ','る'].includes(last)) return {te:`${base}って`,ta:`${base}った`};
  if(['む','ぶ','ぬ'].includes(last)) return {te:`${base}んで`,ta:`${base}んだ`};
  if(last==='く') return {te:`${base}いて`,ta:`${base}いた`};
  if(last==='ぐ') return {te:`${base}いで`,ta:`${base}いだ`};
  if(last==='す') return {te:`${base}して`,ta:`${base}した`};
  return {te:dictionary,ta:dictionary};
}

export function learningMeta(v:VocabItem):LearningMeta{
  const sourceType=clean(v.word_type)||'Vocabulary';
  const kind=inferredKind(v);
  const verb=kind==='verb'?verbMeta(v):null;
  const exception=exceptionFor(v,kind,verb?.groupId);
  let label=sourceType,jaLabel='語彙',tone='neutral';
  if(kind==='verb'){label='Verb · ক্রিয়া';jaLabel='動詞';tone='verb'}
  else if(kind==='i-adjective'){label='い-adjective';jaLabel='い形容詞';tone='i-adj'}
  else if(kind==='na-adjective'){label='な-adjective';jaLabel='な形容詞';tone='na-adj'}
  else if(kind==='noun'){jaLabel='名詞';tone='noun'}
  else if(kind==='expression'){jaLabel='表現';tone='expression'}
  return {
    kind,label,jaLabel,tone,
    group:verb?.group,groupId:verb?.groupId,groupJa:verb?.groupJa,
    irregular:Boolean(exception),
    irregularTitle:exception?.title,irregularNote:exception?.note,
    sourceType,
  };
}

export function verbForms(v:VocabItem):VerbForms|null{
  const meta=learningMeta(v);
  if(meta.kind!=='verb'||!meta.groupId) return null;
  const surface=stripNotation(v.japanese);
  const kanji=stripNotation(v.kanji);
  if(!surface.endsWith('ます')) return null;

  const stem=surface.slice(0,-2);
  const polite={
    masu:surface,
    masen:`${stem}ません`,
    mashita:`${stem}ました`,
    masenDeshita:`${stem}ませんでした`,
  };

  if(meta.groupId==='group-3'){
    if(/来ます$/.test(kanji)&&/きます$/.test(surface)){
      const prefix=surface.slice(0,-3);
      return {...polite,dictionary:`${prefix}くる`,nai:`${prefix}こない`,nakatta:`${prefix}こなかった`,te:`${prefix}きて`,ta:`${prefix}きた`};
    }
    if(surface.endsWith('します')){
      const prefix=surface.slice(0,-3);
      return {...polite,dictionary:`${prefix}する`,nai:`${prefix}しない`,nakatta:`${prefix}しなかった`,te:`${prefix}して`,ta:`${prefix}した`};
    }
  }

  if(meta.groupId==='group-2'){
    return {...polite,dictionary:`${stem}る`,nai:`${stem}ない`,nakatta:`${stem}なかった`,te:`${stem}て`,ta:`${stem}た`};
  }

  const last=Array.from(stem).at(-1)||'';
  const base=Array.from(stem).slice(0,-1).join('');
  const dictionary=GODAN_TO_U[last]?`${base}${GODAN_TO_U[last]}`:surface;
  let nai=GODAN_TO_A[last]?`${base}${GODAN_TO_A[last]}ない`:`${dictionary}ない`;
  let nakatta=nai.endsWith('ない')?`${nai.slice(0,-2)}なかった`:`${nai}なかった`;

  if(surface==='あります'||kanji==='有ります'){
    nai='ない';nakatta='なかった';
  }
  const {te,ta}=godanTeTa(dictionary);
  return {...polite,dictionary,nai,nakatta,te,ta};
}
