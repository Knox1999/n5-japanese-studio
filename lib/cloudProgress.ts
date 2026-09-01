import { createBackup, importBackup, KEYS, type StudioBackup } from './storage';
import { ensureFreshSession, getSupabaseAnonKey, getSupabaseRestBase, type AccountSession } from './account';

type CloudProgressRow={user_id:string;backup:StudioBackup;updated_at:string;device_label?:string|null};
const LAST_ACCOUNT_KEY='nihongo_vibes_last_account_id_v1';

function headers(session:AccountSession,prefer?:string){
  const out:Record<string,string>={apikey:getSupabaseAnonKey(),Authorization:`Bearer ${session.accessToken}`,'Content-Type':'application/json'};
  if(prefer)out.Prefer=prefer;
  return out;
}
async function sessionOrThrow(){const session=await ensureFreshSession();if(!session)throw new Error('Please sign in again.');return session}
function time(value?:string|null){const parsed=Date.parse(String(value||''));return Number.isFinite(parsed)?parsed:0}
function backupTime(backup:StudioBackup,cloudUpdatedAt?:string){
  if(backup.modified_at&&Number.isFinite(Date.parse(backup.modified_at)))return Date.parse(backup.modified_at);
  if(backup.exported_at&&Number.isFinite(Date.parse(backup.exported_at)))return Date.parse(backup.exported_at);
  return time(cloudUpdatedAt);
}

function srsActivity(card:StudioBackup['srs'][string]){
  return Number(card?.repetitions||0)+Number(card?.lapses||0)+Number(card?.recall_count||0)+Number(card?.use_count||0);
}

function mergeSrs(local:StudioBackup['srs'],remote:StudioBackup['srs'],preferLocal:boolean){
  const merged:StudioBackup['srs']={};
  const keys=new Set([...Object.keys(local||{}),...Object.keys(remote||{})]);
  keys.forEach(key=>{
    const localCard=local?.[key],remoteCard=remote?.[key];
    if(!localCard){merged[key]=remoteCard;return}
    if(!remoteCard){merged[key]=localCard;return}
    const localActivity=srsActivity(localCard),remoteActivity=srsActivity(remoteCard);
    merged[key]=localActivity===remoteActivity?(preferLocal?localCard:remoteCard):(localActivity>remoteActivity?localCard:remoteCard);
  });
  return merged;
}

function mergeBackups(local:StudioBackup,remote:StudioBackup,remoteUpdatedAt?:string):StudioBackup{
  const localTime=backupTime(local),remoteTime=backupTime(remote,remoteUpdatedAt);
  const newer=localTime>=remoteTime?local:remote,older=newer===local?remote:local;
  const progress={...older.progress};
  for(const [key,value] of Object.entries(newer.progress||{})){
    const previous=progress[key];
    progress[key]=typeof value==='number'&&typeof previous==='number'?Math.max(previous,value):Boolean(previous)||Boolean(value);
  }
  const history=[...(local.history||[]),...(remote.history||[])]
    .filter((row,index,rows)=>rows.findIndex(other=>`${other.date}|${other.label}|${other.scope}|${other.lesson}`===`${row.date}|${row.label}|${row.scope}|${row.lesson}`)===index)
    .sort((a,b)=>time(b.date)-time(a.date)).slice(0,100);
  const localLearning=local.learning,remoteLearning=remote.learning;
  const mistakeRows=[...(localLearning?.mistakes||[]),...(remoteLearning?.mistakes||[])];
  const mistakes=[...new Map(mistakeRows.sort((a,b)=>time(a.timestamp)-time(b.timestamp)).map(row=>[row.id,row])).values()];
  const journeyKeys=new Set([...Object.keys(localLearning?.journeyProgress||{}),...Object.keys(remoteLearning?.journeyProgress||{})]);
  const journeyProgress:Record<string,string[]>={};
  journeyKeys.forEach(key=>journeyProgress[key]=Array.from(new Set([...(remoteLearning?.journeyProgress?.[key]||[]),...(localLearning?.journeyProgress?.[key]||[])])));
  const localPlanTime=time(localLearning?.studyPlan?.updatedAt),remotePlanTime=time(remoteLearning?.studyPlan?.updatedAt);
  const learning=localLearning||remoteLearning?{
    ...(newer.learning||older.learning)!,mistakes,
    studyPlan:localPlanTime>=remotePlanTime?(localLearning?.studyPlan||remoteLearning!.studyPlan):(remoteLearning?.studyPlan||localLearning!.studyPlan),
    journeyProgress,
  }:undefined;
  const activeMock=Object.prototype.hasOwnProperty.call(newer,'active_mock')?newer.active_mock:older.active_mock;
  return {...newer,app:'the-nihongo-vibes',version:Math.max(Number(local.version||0),Number(remote.version||0)),exported_at:new Date().toISOString(),modified_at:new Date(Math.max(localTime,remoteTime)).toISOString(),lesson:newer.lesson,progress,srs:mergeSrs(local.srs||{},remote.srs||{},newer===local),history,learning,active_mock:activeMock};
}

function sameContent(a:StudioBackup,b:StudioBackup){
  const normalize=(value:StudioBackup)=>JSON.stringify({...value,exported_at:''});
  return normalize(a)===normalize(b);
}
async function readCloudProgressWithSession(session:AccountSession){
  const response=await fetch(`${getSupabaseRestBase()}/rest/v1/user_progress?user_id=eq.${encodeURIComponent(session.user.id)}&select=user_id,backup,updated_at,device_label&limit=1`,{headers:headers(session),cache:'no-store'});
  if(!response.ok)throw new Error(`Progress download failed (${response.status})`);
  const rows=await response.json() as CloudProgressRow[];return rows[0]||null;
}

export function readLastAccountId(){if(typeof window==='undefined')return null;try{return window.localStorage.getItem(LAST_ACCOUNT_KEY)}catch{return null}}
export function rememberAccountId(userId:string){if(typeof window==='undefined')return;try{window.localStorage.setItem(LAST_ACCOUNT_KEY,userId)}catch{}}
export function clearLocalStudyDataForAccountSwitch(){if(typeof window==='undefined')return;for(const key of Object.values(KEYS))try{window.localStorage.removeItem(key)}catch{}}

export async function pushProgressToCloud(deviceLabel?:string){
  const session=await sessionOrThrow();
  for(let attempt=0;attempt<2;attempt+=1){
    const remote=await readCloudProgressWithSession(session),local=createBackup();
    const backup=remote?mergeBackups(local,remote.backup,remote.updated_at):local;
    if(remote&&sameContent(backup,remote.backup))return remote.updated_at;
    const updatedAt=new Date().toISOString();
    const body:CloudProgressRow={user_id:session.user.id,backup,updated_at:updatedAt,device_label:deviceLabel||null};
    const url=remote
      ?`${getSupabaseRestBase()}/rest/v1/user_progress?user_id=eq.${encodeURIComponent(session.user.id)}&updated_at=eq.${encodeURIComponent(remote.updated_at)}&select=updated_at`
      :`${getSupabaseRestBase()}/rest/v1/user_progress?on_conflict=user_id&select=updated_at`;
    const response=await fetch(url,{method:remote?'PATCH':'POST',headers:headers(session,remote?'return=representation':'resolution=ignore-duplicates,return=representation'),body:JSON.stringify(body)});
    if(!response.ok)throw new Error(`Progress sync failed (${response.status})`);
    const rows=await response.json().catch(()=>[]) as Array<{updated_at?:string}>;
    if(rows.length){if(!sameContent(local,backup))importBackup(backup);return rows[0].updated_at||updatedAt}
  }
  throw new Error('Progress changed on another device. Please retry sync.');
}

export async function readCloudProgress(){return readCloudProgressWithSession(await sessionOrThrow())}
export async function restoreProgressFromCloud(){const row=await readCloudProgress();if(!row)return false;importBackup(mergeBackups(createBackup(),row.backup,row.updated_at));return true}

export async function prepareAccountWorkspace(userId:string){
  const previousUserId=readLastAccountId();
  if(previousUserId&&previousUserId!==userId)clearLocalStudyDataForAccountSwitch();
  const remote=await readCloudProgress();
  if(remote){
    importBackup(mergeBackups(createBackup(),remote.backup,remote.updated_at));rememberAccountId(userId);
    const updatedAt=await pushProgressToCloud(previousUserId===userId?'same-account-merge':'account-workspace-merge');
    return {source:'merged' as const,updatedAt};
  }
  const updatedAt=await pushProgressToCloud(previousUserId===userId?'same-account-recovery':'first-account-migration');
  rememberAccountId(userId);return {source:'local-migrated' as const,updatedAt};
}
