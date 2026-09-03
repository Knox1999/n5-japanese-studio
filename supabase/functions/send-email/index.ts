import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

// Transactional email via Resend — welcome + study-reminder messages.
// RESEND_API_KEY lives only in this function's environment (a Supabase
// secret). It is never sent to, or readable from, the client. Every request
// must carry a valid Supabase session JWT, the email always goes to that
// user's own verified address, and sends are capped per user per day.
//
// Signup verification email is handled by Supabase Auth's built-in GoTrue
// flow (configure SMTP with Resend in the Supabase dashboard); this function
// does not reissue verification links, to avoid a second, weaker token path.

const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
};

const DAILY_LIMIT=5;
const FROM='The Nihongo Vibes <onboarding@resend.dev>';

type EmailRequest={kind?:'welcome'|'reminder'};

function template(kind:'welcome'|'reminder',displayName:string){
  const name=displayName||'শিক্ষার্থী';
  if(kind==='welcome')return {
    subject:'The Nihongo Vibes-এ স্বাগতম! Welcome 🎌',
    html:`<p>প্রিয় ${name},</p><p>The Nihongo Vibes-এ আপনাকে স্বাগতম! আপনার JLPT N5 journey শুরু হয়ে গেছে — vocabulary, grammar, listening ও mock test সব এক জায়গায়।</p><p>এখনই আজকের lesson শুরু করুন।</p><p>শুভকামনা,<br/>The Nihongo Vibes টিম</p>`,
  };
  return {
    subject:'আজকের study reminder — The Nihongo Vibes',
    html:`<p>প্রিয় ${name},</p><p>আজ মাত্র কয়েক মিনিট পড়াশোনা করে আপনার streak চালু রাখুন!</p><p>Dashboard-এ ফিরে আজকের due review ও lesson দেখুন।</p><p>শুভকামনা,<br/>The Nihongo Vibes টিম</p>`,
  };
}

Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405,headers:corsHeaders});

  const authorization=request.headers.get('Authorization');
  if(!authorization?.startsWith('Bearer '))return Response.json({error:'Authentication required'},{status:401,headers:corsHeaders});

  const url=Deno.env.get('SUPABASE_URL');
  const anonKey=Deno.env.get('SUPABASE_ANON_KEY');
  const resendKey=Deno.env.get('RESEND_API_KEY');
  if(!url||!anonKey||!resendKey)return Response.json({error:'Server configuration is incomplete'},{status:500,headers:corsHeaders});

  const userClient=createClient(url,anonKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
  const {data:{user},error:userError}=await userClient.auth.getUser();
  if(userError||!user||!user.email)return Response.json({error:'Session is invalid or expired'},{status:401,headers:corsHeaders});

  const body=await request.json().catch(()=>null) as EmailRequest|null;
  const kind=body?.kind==='welcome'||body?.kind==='reminder'?body.kind:null;
  if(!kind)return Response.json({error:'A valid email kind is required'},{status:400,headers:corsHeaders});

  const {error:usageError}=await userClient.rpc('increment_email_usage',{
    target_user_id:user.id,daily_limit:DAILY_LIMIT,
  });
  if(usageError){
    const limited=usageError.code==='42501'||/limit/i.test(usageError.message||'');
    return Response.json(
      {error:limited?'Daily email limit reached.':'Usage check failed'},
      {status:limited?429:500,headers:corsHeaders},
    );
  }

  const displayName=String(user.user_metadata?.display_name||'').trim();
  const {subject,html}=template(kind,displayName);

  let sent:Response;
  try{
    sent=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{'content-type':'application/json',authorization:`Bearer ${resendKey}`},
      body:JSON.stringify({from:FROM,to:user.email,subject,html}),
    });
  }catch{
    return Response.json({error:'Email is temporarily unavailable'},{status:502,headers:corsHeaders});
  }
  if(!sent.ok)return Response.json({error:'Email is temporarily unavailable'},{status:502,headers:corsHeaders});

  return Response.json({ok:true},{headers:corsHeaders});
});
