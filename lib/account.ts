export type AccountUser={
  id:string;
  email:string;
  createdAt?:string;
  displayName?:string;
  role?:'student'|'admin';
};

export type AccountSession={
  accessToken:string;
  refreshToken:string;
  expiresAt:number;
  user:AccountUser;
};

type SupabaseUser={
  id:string;
  email?:string;
  created_at?:string;
  user_metadata?:{display_name?:string};
};

type AuthResponse={
  access_token?:string;
  refresh_token?:string;
  expires_in?:number;
  user?:SupabaseUser;
  error?:string;
  error_description?:string;
  msg?:string;
};

const SESSION_KEY='nihongo_vibes_account_session_v1';
const SUPABASE_URL=(process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/$/,'');
const SUPABASE_ANON_KEY=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';

export const accountCloudConfigured=Boolean(SUPABASE_URL&&SUPABASE_ANON_KEY);

function authHeaders(token?:string){
  const headers:Record<string,string>={
    apikey:SUPABASE_ANON_KEY,
    'Content-Type':'application/json',
  };
  if(token)headers.Authorization=`Bearer ${token}`;
  else if(SUPABASE_ANON_KEY)headers.Authorization=`Bearer ${SUPABASE_ANON_KEY}`;
  return headers;
}

function toUser(user:SupabaseUser):AccountUser{
  return {
    id:user.id,
    email:user.email||'',
    createdAt:user.created_at,
    displayName:user.user_metadata?.display_name,
  };
}

function assertConfigured(){
  if(!accountCloudConfigured)throw new Error('Cloud accounts are not configured yet.');
}

async function parseAuth(response:Response){
  const body=await response.json().catch(()=>({})) as AuthResponse;
  if(!response.ok){
    throw new Error(body.msg||body.error_description||body.error||`Authentication failed (${response.status})`);
  }
  return body;
}

export function readAccountSession():AccountSession|null{
  if(typeof window==='undefined')return null;
  try{
    const raw=window.localStorage.getItem(SESSION_KEY);
    if(!raw)return null;
    const parsed=JSON.parse(raw) as AccountSession;
    if(!parsed?.accessToken||!parsed?.refreshToken||!parsed?.user?.id)return null;
    return parsed;
  }catch{return null;}
}

export function saveAccountSession(session:AccountSession|null){
  if(typeof window==='undefined')return;
  try{
    if(session)window.localStorage.setItem(SESSION_KEY,JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  }catch{}
}

function sessionFrom(body:AuthResponse):AccountSession{
  if(!body.access_token||!body.refresh_token||!body.user)throw new Error('Authentication response was incomplete.');
  return {
    accessToken:body.access_token,
    refreshToken:body.refresh_token,
    expiresAt:Date.now()+Math.max(60,Number(body.expires_in||3600))*1000,
    user:toUser(body.user),
  };
}

export async function signUp(email:string,password:string,displayName:string){
  assertConfigured();
  const response=await fetch(`${SUPABASE_URL}/auth/v1/signup`,{
    method:'POST',headers:authHeaders(),
    body:JSON.stringify({email,password,data:{display_name:displayName.trim()}}),
  });
  const body=await parseAuth(response);
  if(body.access_token&&body.refresh_token&&body.user){
    const session=sessionFrom(body);saveAccountSession(session);return session;
  }
  return null;
}

export async function signIn(email:string,password:string){
  assertConfigured();
  const response=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{
    method:'POST',headers:authHeaders(),body:JSON.stringify({email,password}),
  });
  const session=sessionFrom(await parseAuth(response));
  saveAccountSession(session);
  return session;
}

export async function refreshAccountSession(session:AccountSession){
  assertConfigured();
  const response=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{
    method:'POST',headers:authHeaders(),body:JSON.stringify({refresh_token:session.refreshToken}),
  });
  const next=sessionFrom(await parseAuth(response));
  saveAccountSession(next);
  return next;
}

export async function ensureFreshSession(){
  const session=readAccountSession();
  if(!session)return null;
  if(session.expiresAt-Date.now()>120_000)return session;
  try{return await refreshAccountSession(session)}catch{saveAccountSession(null);return null;}
}

export async function requestPasswordReset(email:string){
  assertConfigured();
  const redirectTo=typeof window==='undefined'?undefined:`${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH||''}/`;
  const response=await fetch(`${SUPABASE_URL}/auth/v1/recover`,{
    method:'POST',headers:authHeaders(),body:JSON.stringify({email,redirect_to:redirectTo}),
  });
  await parseAuth(response);
}

export async function signOut(session?:AccountSession|null){
  const current=session||readAccountSession();
  if(accountCloudConfigured&&current?.accessToken){
    await fetch(`${SUPABASE_URL}/auth/v1/logout`,{method:'POST',headers:authHeaders(current.accessToken)}).catch(()=>undefined);
  }
  saveAccountSession(null);
}

export async function upsertAccountProfile(session:AccountSession){
  assertConfigured();
  const response=await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?on_conflict=user_id`,{
    method:'POST',
    headers:{...authHeaders(session.accessToken),Prefer:'resolution=merge-duplicates,return=minimal'},
    body:JSON.stringify({
      user_id:session.user.id,
      email:session.user.email,
      display_name:session.user.displayName||null,
      last_active_at:new Date().toISOString(),
      status:'active',
    }),
  });
  if(!response.ok)throw new Error(`Profile sync failed (${response.status})`);
}

export function getSupabaseRestBase(){
  assertConfigured();
  return SUPABASE_URL;
}

export function getSupabaseAnonKey(){
  assertConfigured();
  return SUPABASE_ANON_KEY;
}
