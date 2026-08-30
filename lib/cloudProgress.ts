import { createBackup, importBackup, KEYS, type StudioBackup } from './storage';
import { ensureFreshSession, getSupabaseAnonKey, getSupabaseRestBase, type AccountSession } from './account';

type CloudProgressRow={
  user_id:string;
  backup:StudioBackup;
  updated_at:string;
  device_label?:string|null;
};

const LAST_ACCOUNT_KEY='nihongo_vibes_last_account_id_v1';

function headers(session:AccountSession,prefer?:string){
  const out:Record<string,string>={
    apikey:getSupabaseAnonKey(),
    Authorization:`Bearer ${session.accessToken}`,
    'Content-Type':'application/json',
  };
  if(prefer)out.Prefer=prefer;
  return out;
}

async function sessionOrThrow(){
  const session=await ensureFreshSession();
  if(!session)throw new Error('Please sign in again.');
  return session;
}

export function readLastAccountId(){
  if(typeof window==='undefined')return null;
  try{return window.localStorage.getItem(LAST_ACCOUNT_KEY)}catch{return null;}
}

export function rememberAccountId(userId:string){
  if(typeof window==='undefined')return;
  try{window.localStorage.setItem(LAST_ACCOUNT_KEY,userId)}catch{}
}

export function clearLocalStudyDataForAccountSwitch(){
  if(typeof window==='undefined')return;
  for(const key of Object.values(KEYS)){
    try{window.localStorage.removeItem(key)}catch{}
  }
}

export async function pushProgressToCloud(deviceLabel?:string){
  const session=await sessionOrThrow();
  const backup=createBackup();
  const body:CloudProgressRow={
    user_id:session.user.id,
    backup,
    updated_at:new Date().toISOString(),
    device_label:deviceLabel||null,
  };
  const response=await fetch(`${getSupabaseRestBase()}/rest/v1/user_progress?on_conflict=user_id`,{
    method:'POST',
    headers:headers(session,'resolution=merge-duplicates,return=minimal'),
    body:JSON.stringify(body),
  });
  if(!response.ok)throw new Error(`Progress sync failed (${response.status})`);
  return body.updated_at;
}

export async function readCloudProgress(){
  const session=await sessionOrThrow();
  const response=await fetch(`${getSupabaseRestBase()}/rest/v1/user_progress?user_id=eq.${encodeURIComponent(session.user.id)}&select=user_id,backup,updated_at,device_label&limit=1`,{
    headers:headers(session),
    cache:'no-store',
  });
  if(!response.ok)throw new Error(`Progress download failed (${response.status})`);
  const rows=await response.json() as CloudProgressRow[];
  return rows[0]||null;
}

export async function restoreProgressFromCloud(){
  const row=await readCloudProgress();
  if(!row)return false;
  importBackup(row.backup);
  return true;
}

export async function prepareAccountWorkspace(userId:string){
  const previousUserId=readLastAccountId();
  const remote=await readCloudProgress();

  if(previousUserId&&previousUserId!==userId){
    clearLocalStudyDataForAccountSwitch();
  }

  if(remote){
    importBackup(remote.backup);
    rememberAccountId(userId);
    return {source:'cloud' as const,updatedAt:remote.updated_at};
  }

  if(!previousUserId||previousUserId===userId){
    const updatedAt=await pushProgressToCloud(previousUserId===userId?'same-account-recovery':'first-account-migration');
    rememberAccountId(userId);
    return {source:'local-migrated' as const,updatedAt};
  }

  clearLocalStudyDataForAccountSwitch();
  const updatedAt=await pushProgressToCloud('new-account-workspace');
  rememberAccountId(userId);
  return {source:'new-empty' as const,updatedAt};
}
