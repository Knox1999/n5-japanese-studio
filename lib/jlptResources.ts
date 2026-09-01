export type JlptResourceKind='official'|'full-mock'|'practice-bank';

export type JlptResource={
  id:string;
  kind:JlptResourceKind;
  name:string;
  provider:string;
  url:string;
  freeAccess:string;
  summaryBn:string;
  summaryEn:string;
  detail:string;
};

export const JLPT_RESOURCE_REVIEWED='2026-09-01';

export const JLPT_N5_RESOURCES:JlptResource[]=[
  {
    id:'official-samples',
    kind:'official',
    name:'JLPT Sample Questions',
    provider:'Official JLPT',
    url:'https://www.jlpt.jp/e/samples/forlearners.html',
    freeAccess:'No account · official format samples',
    summaryBn:'প্রতিটি N5 question type কেমন হয়—official sample দিয়ে আগে বুঝে নিন।',
    summaryEn:'See one official sample for every N5 question type before practising.',
    detail:'Official item-format reference',
  },
  {
    id:'official-workbooks',
    kind:'official',
    name:'Official Practice Workbooks',
    provider:'Official JLPT',
    url:'https://www.jlpt.jp/e/samples/sampleindex.html',
    freeAccess:'PDF · answers · listening files',
    summaryBn:'২০১২ ও ২০১৮ official workbook-এর N5 প্রশ্ন, answer sheet, answer ও listening script।',
    summaryEn:'N5 files from the 2012 and 2018 official workbooks, with answers and listening.',
    detail:'Two official practice volumes',
  },
  {
    id:'bunpro',
    kind:'full-mock',
    name:'Five N5 Full Mocks',
    provider:'Bunpro',
    url:'https://bunpro.jp/jlpt_practice_tests',
    freeAccess:'No email · results and explanations',
    summaryBn:'৫টি ৯০-মিনিটের full N5 mock; প্রতিটিতে ৬৭টি প্রশ্ন, audio ও explanation আছে।',
    summaryEn:'Five 90-minute N5 mocks with 67 items, audio, results and explanations.',
    detail:'5 full tests · 335 items',
  },
  {
    id:'conjugaizen',
    kind:'full-mock',
    name:'Two No-login N5 Mocks',
    provider:'Conjugaizen',
    url:'https://conjugaizen.com/jlpt-n5-practice-test/',
    freeAccess:'No login · full answer review',
    summaryBn:'২টি ৬৭-question full mock; login ছাড়াই listening ও answer review ব্যবহার করা যায়।',
    summaryEn:'Two 67-question full mocks with listening and answer review, without sign-up.',
    detail:'2 full tests · 134 items',
  },
  {
    id:'unagibun',
    kind:'full-mock',
    name:'N5 Online Simulation',
    provider:'Unagibun',
    url:'https://www.unagibun.com/jlpt-online/',
    freeAccess:'Free result · email required',
    summaryBn:'Section lock, timer ও break-সহ ২০/৪০/৩০ মিনিটের exam-style simulation।',
    summaryEn:'An exam-style 20/40/30-minute simulation with section locks and breaks.',
    detail:'Timed full simulation',
  },
  {
    id:'jtest4you',
    kind:'practice-bank',
    name:'N5 Practice Bank',
    provider:'JTest4You',
    url:'https://japanesetest4you.com/',
    freeAccess:'Open practice pages',
    summaryBn:'Grammar, kanji, reading, vocabulary ও listening মিলিয়ে ১২৬টি N5 practice set।',
    summaryEn:'126 N5 practice sets across grammar, kanji, reading, vocabulary and listening.',
    detail:'126 section-focused sets',
  },
];
