import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

// AI Japanese Tutor — grammar explanation endpoint.
// The Anthropic API key lives only in this function's environment (a Supabase
// secret set via `supabase secrets set`). It is never sent to, or readable
// from, the client. Every request must carry a valid Supabase session JWT and
// is subject to a per-user daily cap enforced in Postgres.

const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
};

const DAILY_LIMIT=30;
const MODEL='claude-haiku-4-5-20251001';
const MAX_QUESTION_LEN=400;

type TutorRequest={
  ruleId?:string;
  pattern?:string;
  meaningBn?:string;
  examples?:Array<{jp?:string;bn?:string}>;
  question?:string;
  language?:'bn'|'en';
};

function clean(value:unknown,max:number){
  return String(value||'').replace(/[\r\n]+/g,' ').trim().slice(0,max);
}

function buildSystemPrompt(language:'bn'|'en'){
  return [
    'You are the in-app AI tutor for The Nihongo Vibes, a JLPT N5 study product for Bangla-speaking beginners.',
    'You explain ONLY the specific grammar rule given in the context below — never introduce N4+ grammar, unrelated patterns, or claims not supported by the given examples.',
    'If the learner asks something outside this rule’s scope, say so briefly and redirect them to the relevant lesson instead of guessing.',
    `Reply in ${language==='bn'?'Bangla (light English is fine for Japanese/grammar terms)':'English'}.`,
    'Keep replies short: 2-4 sentences, plus one short original example sentence in Japanese with a translation if it helps.',
    'Never claim to be a certified teacher or official JLPT authority; you are a study aid.',
  ].join(' ');
}

Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405,headers:corsHeaders});

  const authorization=request.headers.get('Authorization');
  if(!authorization?.startsWith('Bearer '))return Response.json({error:'Authentication required'},{status:401,headers:corsHeaders});

  const url=Deno.env.get('SUPABASE_URL');
  const anonKey=Deno.env.get('SUPABASE_ANON_KEY');
  const anthropicKey=Deno.env.get('ANTHROPIC_API_KEY');
  if(!url||!anonKey||!anthropicKey)return Response.json({error:'Server configuration is incomplete'},{status:500,headers:corsHeaders});

  const userClient=createClient(url,anonKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
  const {data:{user},error:userError}=await userClient.auth.getUser();
  if(userError||!user)return Response.json({error:'Session is invalid or expired'},{status:401,headers:corsHeaders});

  const body=await request.json().catch(()=>null) as TutorRequest|null;
  const pattern=clean(body?.pattern,120);
  const question=clean(body?.question,MAX_QUESTION_LEN);
  if(!body||!pattern||!question)return Response.json({error:'A rule pattern and question are required'},{status:400,headers:corsHeaders});

  const language:'bn'|'en'=body.language==='en'?'en':'bn';
  const meaningBn=clean(body.meaningBn,200);
  const examples=Array.isArray(body.examples)
    ?body.examples.slice(0,5).map(e=>`- ${clean(e?.jp,140)} (${clean(e?.bn,140)})`).join('\n')
    :'';

  const {data:usageCount,error:usageError}=await userClient.rpc('increment_tutor_usage',{
    target_user_id:user.id,daily_limit:DAILY_LIMIT,
  });
  if(usageError){
    const limited=usageError.code==='42501'||/limit/i.test(usageError.message||'');
    return Response.json(
      {error:limited?'Daily tutor limit reached. Try again tomorrow.':'Usage check failed'},
      {status:limited?429:500,headers:corsHeaders},
    );
  }

  const userMessage=[
    `Grammar rule: ${pattern}`,
    meaningBn?`Meaning: ${meaningBn}`:'',
    examples?`Examples:\n${examples}`:'',
    `Learner's question: ${question}`,
  ].filter(Boolean).join('\n\n');

  let aiResponse:Response;
  try{
    aiResponse=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{
        'content-type':'application/json',
        'x-api-key':anthropicKey,
        'anthropic-version':'2023-06-01',
      },
      body:JSON.stringify({
        model:MODEL,
        max_tokens:400,
        system:buildSystemPrompt(language),
        messages:[{role:'user',content:userMessage}],
      }),
    });
  }catch{
    return Response.json({error:'Tutor is temporarily unavailable'},{status:502,headers:corsHeaders});
  }

  if(!aiResponse.ok){
    return Response.json({error:'Tutor is temporarily unavailable'},{status:502,headers:corsHeaders});
  }
  const payload=await aiResponse.json().catch(()=>null) as {content?:Array<{type:string;text?:string}>}|null;
  const answer=payload?.content?.find(block=>block.type==='text')?.text?.trim();
  if(!answer)return Response.json({error:'Tutor is temporarily unavailable'},{status:502,headers:corsHeaders});

  return Response.json({answer,ruleId:body.ruleId||null,remaining:Math.max(0,DAILY_LIMIT-(usageCount??DAILY_LIMIT))},{headers:corsHeaders});
});
