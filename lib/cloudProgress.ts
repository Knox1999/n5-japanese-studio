import { createBackup, importBackup, type StudioBackup } from './storage';
import { ensureFreshSession, getSupabaseAnonKey, getSupabaseRestBase, type AccountSession } from './account';

type CloudProgressRow={
  user_id:string;
  backup:StudioBackup;
  updated_at:string;
  device_label?:string|null;
};

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

export async function migrateLocalProgressToAccount(){
  const remote=await readCloudProgress();
  if(remote)return {uploaded:false,remoteExists:true,updatedAt:remote.updated_at};
  const updatedAt=await pushProgressToCloud('first-account-migration');
  return {uploaded:true,remoteExists:false,updatedAt};
}
