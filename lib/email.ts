import { ensureFreshSession, getSupabaseAnonKey, getSupabaseRestBase } from './account';

export type EmailKind='welcome'|'reminder';

async function sendEmail(kind:EmailKind){
  const session=await ensureFreshSession();
  if(!session)return false;
  try{
    const response=await fetch(`${getSupabaseRestBase()}/functions/v1/send-email`,{
      method:'POST',
      headers:{apikey:getSupabaseAnonKey(),Authorization:`Bearer ${session.accessToken}`,'Content-Type':'application/json'},
      body:JSON.stringify({kind}),
    });
    return response.ok;
  }catch{return false}
}

export const sendWelcomeEmail=()=>sendEmail('welcome');
export const sendStudyReminder=()=>sendEmail('reminder');
