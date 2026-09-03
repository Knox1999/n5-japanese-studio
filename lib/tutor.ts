import { ensureFreshSession, getSupabaseAnonKey, getSupabaseRestBase } from './account';

export type TutorExample={jp:string;bn:string};
export type TutorQuestionInput={
  ruleId:string;
  pattern:string;
  meaningBn?:string;
  examples?:TutorExample[];
  question:string;
  language:'bn'|'en';
};
export type TutorAnswer={answer:string;ruleId:string|null;remaining:number};

const CONSENT_KEY='nihongo_vibes_tutor_consent_v1';

export function hasTutorConsent(){
  if(typeof window==='undefined')return false;
  try{return window.localStorage.getItem(CONSENT_KEY)==='accepted'}catch{return false}
}

export function setTutorConsent(accepted:boolean){
  if(typeof window==='undefined')return;
  try{window.localStorage.setItem(CONSENT_KEY,accepted?'accepted':'declined')}catch{}
}

export async function askGrammarTutor(input:TutorQuestionInput):Promise<TutorAnswer>{
  const session=await ensureFreshSession();
  if(!session)throw new Error('Please sign in to use the AI tutor.');

  const response=await fetch(`${getSupabaseRestBase()}/functions/v1/tutor`,{
    method:'POST',
    headers:{
      apikey:getSupabaseAnonKey(),
      Authorization:`Bearer ${session.accessToken}`,
      'Content-Type':'application/json',
    },
    body:JSON.stringify(input),
  });
  const body=await response.json().catch(()=>({})) as Partial<TutorAnswer>&{error?:string};
  if(!response.ok||!body.answer)throw new Error(body.error||`Tutor request failed (${response.status})`);
  return {answer:body.answer,ruleId:body.ruleId??null,remaining:Number(body.remaining??0)};
}
